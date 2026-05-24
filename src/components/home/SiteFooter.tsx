import { siteConfig } from "@/config/site";

export function SiteFooter() {
  const { username, profileUrl } = siteConfig.tiktok;

  return (
    <footer className="border-t border-white/10 bg-bg-3">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-display text-lg font-bold uppercase tracking-[0.1em] text-white">
            {siteConfig.name}
          </p>
          <p className="mt-1 text-sm text-white/50">{siteConfig.legalName}</p>
          <p className="mt-1 text-sm text-white/50">
            Fundado {siteConfig.founded}
          </p>
        </div>

        <div className="flex flex-col gap-2 text-sm text-white/60 sm:items-end">
          <a
            href={`mailto:${siteConfig.email}`}
            className="transition hover:text-brand-orange"
          >
            {siteConfig.email}
          </a>
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="transition hover:text-brand-orange"
          >
            @{username} en TikTok
          </a>
          <p className="text-white/40">
            © {new Date().getFullYear()} {siteConfig.legalName}
          </p>
        </div>
      </div>
    </footer>
  );
}
