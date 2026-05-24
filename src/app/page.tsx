import { BrandLogo } from "@/components/BrandLogo";
import { BroadcastTicker } from "@/components/home/BroadcastTicker";
import { FinalCta } from "@/components/home/FinalCta";
import { HeroSection } from "@/components/home/HeroSection";
import { SiteFooter } from "@/components/home/SiteFooter";
import { siteConfig } from "@/config/site";
import { TikTokFollowButton } from "@/components/tiktok/TikTokFollowButton";
import { TikTokSection } from "@/components/tiktok/TikTokSection";

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
            <TikTokFollowButton username={username} profileUrl={profileUrl} />
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
