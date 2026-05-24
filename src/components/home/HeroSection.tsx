import { BrandLogo } from "@/components/BrandLogo";
import { TikTokFollowButton } from "@/components/tiktok/TikTokFollowButton";
import { siteConfig } from "@/config/site";

export function HeroSection() {
  const { username, profileUrl } = siteConfig.tiktok;

  return (
    <section className="relative overflow-hidden border-b border-white/10">
      <div className="pointer-events-none absolute inset-0 broadcast-glow" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(3,15,16,0.4)_60%,#030f10_100%)]" />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-16 sm:py-24">
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
    </section>
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
