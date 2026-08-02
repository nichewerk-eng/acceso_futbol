import type { Metadata } from "next";
import { IBM_Plex_Mono, Oswald } from "next/font/google";
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

export const metadata: Metadata = {
  title: {
    default: "Acceso Futbol | Liga MX, Selección Mexicana y Mundial 2026",
    template: `%s | Acceso Futbol`,
  },
  description: siteConfig.description,
  keywords: [...siteConfig.seoKeywords],
  metadataBase: new URL(siteConfig.url),
  alternates: {
    canonical: siteConfig.url,
  },
  themeColor: '#f6f5f2',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Acceso Futbol' },
  openGraph: {
    title: "Acceso Futbol | Liga MX y El Tri en TikTok",
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    locale: "es_MX",
    type: "website",
    images: [
      { url: "/logo.png", width: 512, height: 331, alt: siteConfig.name },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Acceso Futbol | Liga MX y Mundial 2026",
    description: siteConfig.description,
    images: ["/logo.png"],
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
      </body>
    </html>
  );
}
