import { TikTokFollowButton } from "@/components/tiktok/TikTokFollowButton";
import { siteConfig } from "@/config/site";

export function FinalCta() {
  const { username, profileUrl } = siteConfig.tiktok;

  return (
    <section className="relative overflow-hidden py-16 sm:py-20">
      <div className="pointer-events-none absolute inset-0 brand-gradient opacity-90" />
      <div className="pointer-events-none absolute inset-0 bg-bg-1/30" />

      <div className="relative mx-auto w-full max-w-4xl px-6 text-center">
        <p className="font-display text-sm font-semibold uppercase tracking-[0.3em] text-white/80">
          {siteConfig.worldCup.date} · {siteConfig.worldCup.venue}
        </p>
        <h2 className="mt-4 font-display text-3xl font-bold uppercase leading-tight tracking-[0.06em] text-white sm:text-5xl">
          El Tri abre el Mundial.
          <span className="block">¿Vas a verlo sin contexto?</span>
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-white/90 sm:text-lg">
          Síguenos en TikTok. Opinión, análisis y debate — en tu idioma, en tu
          feed, antes del pitazo inicial.
        </p>
        <div className="mt-8 flex justify-center">
          <TikTokFollowButton
            username={username}
            profileUrl={profileUrl}
            size="large"
            className="bg-bg-1 shadow-[0_0_40px_rgba(0,0,0,0.4)] hover:bg-bg-3"
          />
        </div>
      </div>
    </section>
  );
}
