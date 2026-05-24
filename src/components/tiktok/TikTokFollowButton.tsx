type TikTokFollowButtonProps = {
  username: string;
  profileUrl: string;
  className?: string;
  size?: "default" | "large";
};

export function TikTokFollowButton({
  username,
  profileUrl,
  className = "",
  size = "default",
}: TikTokFollowButtonProps) {
  const sizeClasses =
    size === "large"
      ? "px-8 py-4 text-base sm:text-lg tracking-[0.15em]"
      : "px-6 py-3 text-sm tracking-[0.12em]";

  return (
    <a
      href={profileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center gap-3 rounded-sm bg-brand-orange font-display font-bold uppercase text-white shadow-[0_0_32px_rgba(240,120,32,0.35)] transition hover:bg-brand-orange-dark hover:shadow-[0_0_40px_rgba(240,120,32,0.5)] ${sizeClasses} ${className}`}
    >
      <TikTokIcon />
      Seguir @{username}
    </a>
  );
}

function TikTokIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5 shrink-0 fill-current"
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z" />
    </svg>
  );
}
