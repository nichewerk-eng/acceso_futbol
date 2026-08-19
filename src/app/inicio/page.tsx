import type { Metadata } from "next";
import { BroadcastTicker } from "@/components/home/BroadcastTicker";
import { FinalCta } from "@/components/home/FinalCta";
import { HeroSection } from "@/components/home/HeroSection";
import { SiteFooter } from "@/components/home/SiteFooter";
import { JsonLd } from "@/components/seo/JsonLd";
import { siteConfig } from "@/config/site";
import { TikTokSection } from "@/components/tiktok/TikTokSection";
import { absoluteUrl, organizationJsonLd } from "@/lib/seo";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Landing · fútbol mexicano sin filtro",
  description: siteConfig.description,
  alternates: { canonical: absoluteUrl("/") },
  robots: { index: false, follow: true },
  openGraph: {
    title: "Acceso Futbol · el fútbol mexicano no espera",
    description: siteConfig.description,
    url: absoluteUrl("/"),
  },
};

export default function Home() {
  const { username, profileUrl } = siteConfig.tiktok;

  return (
    <>
      <JsonLd data={organizationJsonLd()} />

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-50 bg-bg-1/95 backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 py-3">

            {/* Wordmark logo */}
            <Link href="/" className="shrink-0">
              <Image
                src="/logo.png"
                alt="Acceso Futbol"
                width={512}
                height={331}
                className="h-9 w-auto object-contain sm:h-11"
                priority
              />
            </Link>

            {/* Nav items */}
            <nav className="flex items-center gap-2">
              <Link
                href="/liga-mx"
                className="flex items-center gap-2 rounded-lg border border-brand-orange px-3 py-2 text-xs font-bold tracking-wider uppercase text-brand-orange transition hover:bg-brand-orange hover:text-white"
              >
                <StandingsIcon />
                <span className="hidden sm:inline">Liga MX</span>
              </Link>

              {/* TikTok CTA */}
              <a
                href={profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg bg-brand-orange px-3 sm:px-4 py-2 text-xs font-bold tracking-wider uppercase text-white shadow-[0_0_20px_rgba(245,79,27,0.3)] transition hover:bg-brand-orange-dark hover:shadow-[0_0_28px_rgba(245,79,27,0.45)]"
              >
                <TikTokIcon />
                <span className="hidden sm:inline">Seguir</span>
                <span className="sm:hidden">@{username}</span>
              </a>

            </nav>
          </div>

          {/* Brand-gradient bottom rule */}
          <div
            className="h-px"
            style={{ background: 'linear-gradient(to right, rgba(245,79,27,0.6), rgba(255,255,255,0.05), rgba(3,83,82,0.6))' }}
          />
        </header>

        <BroadcastTicker />

        <main className="flex-1">
          <HeroSection />
          <TikTokSection />
          <FinalCta />
        </main>

        <SiteFooter />
      </div>
    </>
  );
}

function StandingsIcon() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18M10 6h4M10 18h4" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-current">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z" />
    </svg>
  );
}
