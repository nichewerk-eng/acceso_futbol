import type { Metadata } from "next";
import { Oswald } from "next/font/google";
import { siteConfig } from "@/config/site";
import "./globals.css";

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
  openGraph: {
    title: "Acceso Futbol | Liga MX y El Tri en TikTok",
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    locale: "es_MX",
    type: "website",
    images: [
      { url: "/logo.png", width: 512, height: 512, alt: siteConfig.name },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Acceso Futbol | Liga MX y Mundial 2026",
    description: siteConfig.description,
    images: ["/logo.png"],
  },
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "32x32" }],
    apple: [{ url: "/logo.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${oswald.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-bg-1 font-display text-white">
        {children}
      </body>
    </html>
  );
}
