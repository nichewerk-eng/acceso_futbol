import Image from "next/image";
import { BrandLogo } from "@/components/BrandLogo";
import { TikTokFollowButton } from "@/components/tiktok/TikTokFollowButton";
import { siteConfig } from "@/config/site";

export function HeroSection() {
  const { username, profileUrl } = siteConfig.tiktok;

  return (
    <section className="relative overflow-hidden border-b border-white/10">
      <div className="pointer-events-none absolute inset-0 broadcast-glow" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(3,15,16,0.4)_60%,#030f10_100%)]" />

      <div className="relative mx-auto grid w-full max-w-6xl gap-12 px-6 py-16 sm:py-24 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-center lg:gap-8">
        <div className="flex flex-col gap-10">
          <BrandLogo size="lg" className="self-start" />

          <div className="max-w-4xl">
            <p className="mb-5 font-display text-sm font-semibold uppercase tracking-[0.3em] text-brand-teal">
              Liga MX · Selección Mexicana · Mundial 2026
            </p>

            <h1 className="font-display text-4xl font-bold uppercase leading-[0.95] tracking-[0.04em] sm:text-6xl lg:text-7xl">
              <span className="block text-white">El fútbol mexicano</span>
              <span className="brand-gradient-text block">no espera.</span>
            </h1>

            <p className="mt-4 font-display text-lg font-medium uppercase tracking-[0.12em] text-white/70 sm:text-xl">
              {siteConfig.taglineEn}
            </p>

            <HeroContentShowcaseMobile />

            <p className="mt-8 max-w-2xl text-base leading-7 text-white/85 sm:text-lg sm:leading-8">
              Opinión caliente, micro-análisis y polémica real — todo en vertical,
              todo en español.{" "}
              <strong className="font-semibold text-brand-orange">
                {siteConfig.worldCup.headline} el {siteConfig.worldCup.date}
              </strong>{" "}
              en el {siteConfig.worldCup.venue}. No te lo cuenten: síguenos en
              TikTok y entra al partido antes que nadie.
            </p>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <TikTokFollowButton
              username={username}
              profileUrl={profileUrl}
              size="large"
            />
            <a
              href="#tiktok"
              className="inline-flex items-center justify-center rounded-sm border border-white/20 px-8 py-4 font-display text-sm font-semibold uppercase tracking-[0.15em] text-white transition hover:border-brand-teal hover:text-brand-teal"
            >
              Ver contenido
            </a>
          </div>

          <div className="grid gap-4 border-t border-white/10 pt-8 sm:grid-cols-3">
            <Stat label="Enfoque" value="Liga MX + El Tri" />
            <Stat label="Formato" value="30 seg. de pura pasión" />
            <Stat label="Urgencia" value="Mundial 2026" accent />
          </div>
        </div>

        <HeroContentShowcase />
      </div>
    </section>
  );
}

function HeroContentShowcase() {
  return (
    <div className="relative mx-auto hidden h-[420px] w-full max-w-[340px] sm:block lg:h-[480px]">
      <ContentCard
        src="/luis.jpg"
        alt="Clip de Acceso Futbol sobre la Liga MX en Austin, Texas"
        className="absolute left-0 top-6 w-[62%] -rotate-6"
      />
      <ContentCard
        src="/jonathang.jpg"
        alt="Clip de Acceso Futbol: rumbo al título del Mundial 2026"
        className="absolute right-0 top-0 w-[62%] rotate-4"
        priority
      />
    </div>
  );
}

function HeroContentShowcaseMobile() {
  return (
    <div className="mt-6 flex gap-4 sm:hidden">
      <ContentCard
        src="/luis.jpg"
        alt="Clip de Acceso Futbol sobre la Liga MX en Austin, Texas"
        className="w-1/2 -rotate-2"
      />
      <ContentCard
        src="/jonathang.jpg"
        alt="Clip de Acceso Futbol: rumbo al título del Mundial 2026"
        className="w-1/2 rotate-2"
        priority
      />
    </div>
  );
}

function ContentCard({
  src,
  alt,
  className = "",
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-white/15 bg-bg-2 shadow-[0_20px_50px_rgba(0,0,0,0.55)] ring-1 ring-black/20 transition duration-500 hover:-translate-y-1 hover:rotate-0 ${className}`}
    >
      <div className="relative aspect-[1320/2626] w-full">
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(min-width: 1024px) 220px, 200px"
          className="object-cover"
          priority={priority}
        />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-sm border border-white/10 bg-bg-2/60 px-5 py-4">
      <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
        {label}
      </p>
      <p
        className={`mt-1 font-display text-lg font-bold uppercase tracking-[0.08em] ${accent ? "text-brand-orange" : "text-white"}`}
      >
        {value}
      </p>
    </div>
  );
}
