import { siteConfig } from "@/config/site";
import { TikTokFollowButton } from "./TikTokFollowButton";
import { TikTokProfileEmbed } from "./TikTokProfileEmbed";
import { TikTokVideoPlayer } from "./TikTokVideoPlayer";

type TikTokSectionProps = {
  compact?: boolean;
};

export function TikTokSection({ compact = false }: TikTokSectionProps) {
  const { username, videoIds, profileUrl } = siteConfig.tiktok;

  return (
    <section
      id="tiktok"
      className={`mx-auto w-full max-w-6xl ${compact ? "px-4 py-8" : "px-6 py-16 sm:py-20"}`}
    >
      {!compact && (
        <div className="mb-10 text-center">
          <p className="mb-3 font-display text-sm font-semibold uppercase tracking-[0.25em] text-brand-teal">
            TikTok
          </p>
          <h2 className="font-display text-3xl font-bold uppercase tracking-[0.06em] text-white sm:text-4xl">
            Así se ve el show
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/70">
            Clips de Liga MX, Selección Mexicana y todo lo que viene con el
            Mundial 2026. Dale follow — un tap y ya estás adentro.
          </p>
          <div className="mt-6">
            <TikTokFollowButton username={username} profileUrl={profileUrl} />
          </div>
        </div>
      )}

      <div
        className={`grid gap-8 ${videoIds.length > 0 ? "lg:grid-cols-[minmax(0,1fr)_auto]" : "place-items-center"}`}
      >
        <div className="w-full rounded-sm border border-white/10 bg-bg-2/40 p-4">
          <TikTokProfileEmbed username={username} />
        </div>

        {videoIds.length > 0 && (
          <div className="flex flex-wrap justify-center gap-6 lg:justify-end">
            {videoIds.map((videoId) => (
              <TikTokVideoPlayer
                key={videoId}
                videoId={videoId}
                title={`@${username} en TikTok`}
              />
            ))}
          </div>
        )}
      </div>

      {compact && (
        <div className="mt-6 flex justify-center">
          <TikTokFollowButton username={username} profileUrl={profileUrl} />
        </div>
      )}
    </section>
  );
}
