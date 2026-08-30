import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Oswald } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { CityPulse } from "@/components/analytics/CityPulse";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { siteConfig } from "@/config/site";
import { GravityProvider } from "@/contexts/GravityContext";
import { TeamProvider } from "@/contexts/TeamContext";
import "./globals.css";

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const viewport: Viewport = {
  themeColor: "#f6f5f2",
  width: "device-width",
  initialScale: 1,
};

const googleVerification = process.env.GOOGLE_SITE_VERIFICATION;

export const metadata: Metadata = {
  title: {
    default: "Acceso Futbol | Liga MX, Leagues Cup y El Tri",
    template: `%s | Acceso Futbol`,
  },
  description: siteConfig.description,
  keywords: [...siteConfig.seoKeywords],
  metadataBase: new URL(siteConfig.url),
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.name, url: siteConfig.url }],
  creator: siteConfig.name,
  publisher: siteConfig.legalName,
  category: "sports",
  ...(googleVerification ? { verification: { google: googleVerification } } : {}),
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Acceso Futbol" },
  icons: {
    icon: [{ url: "/logo-dark.png", type: "image/png" }],
    apple: [{ url: "/logo-dark.png", type: "image/png" }],
  },
  openGraph: {
    title: "Acceso Futbol | Liga MX, Leagues Cup y El Tri",
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    locale: "es_MX",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Acceso Futbol | Liga MX y Mundial 2026",
    description: siteConfig.description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${oswald.variable} ${plexMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-bg-1 font-display text-foreground">
        <TeamProvider>
          <GravityProvider>
            {children}
          </GravityProvider>
        </TeamProvider>
        <Analytics />
        <CityPulse />
        <GoogleAnalytics />
      </body>
    </html>
  );
}
