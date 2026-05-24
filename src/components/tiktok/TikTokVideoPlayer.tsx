type TikTokVideoPlayerProps = {
  videoId: string;
  title?: string;
  className?: string;
};

export function TikTokVideoPlayer({
  videoId,
  title = "Video de TikTok",
  className = "",
}: TikTokVideoPlayerProps) {
  const src = `https://www.tiktok.com/player/v1/${videoId}?music_info=1&description=1`;

  return (
    <iframe
      src={src}
      title={title}
      width={325}
      height={740}
      allow="fullscreen"
      loading="lazy"
      className={`rounded-2xl border-0 shadow-lg ${className}`}
    />
  );
}
