import { BrandLogo } from "@/components/BrandLogo";
import { BroadcastTicker } from "@/components/home/BroadcastTicker";
import { FinalCta } from "@/components/home/FinalCta";
import { HeroSection } from "@/components/home/HeroSection";
import { SiteFooter } from "@/components/home/SiteFooter";
import { siteConfig } from "@/config/site";
import { TikTokFollowButton } from "@/components/tiktok/TikTokFollowButton";
import { TikTokSection } from "@/components/tiktok/TikTokSection";
import Link from "next/link";

export default function Home() {
  const { username, profileUrl } = siteConfig.tiktok;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    legalName: siteConfig.legalName,
    url: siteConfig.url,
    email: siteConfig.email,
    foundingDate: String(siteConfig.founded),
    description: siteConfig.description,
    sameAs: [siteConfig.tiktok.profileUrl],
    areaServed: ["MX", "US"],
    knowsAbout: [
      "Liga MX",
      "Selección Mexicana",
      "FIFA World Cup 2026",
      "Mexican soccer",
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-50 border-b border-white/10 bg-bg-1/90 backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-3">
            <BrandLogo size="sm" showName />
            <nav className="flex items-center gap-3">
              <Link
                href="/tabla"
                className="rounded-lg border border-white/[0.08] px-3.5 py-1.5 text-xs font-bold tracking-wider uppercase text-white/70 transition hover:border-brand-orange/50 hover:text-brand-orange"
              >
                ⚽ Tabla
              </Link>
              <TikTokFollowButton username={username} profileUrl={profileUrl} />
            </nav>
          </div>
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
