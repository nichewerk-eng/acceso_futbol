import Link from "next/link";
import { siteConfig } from "@/config/site";

export function SiteFooter() {
  const { username, profileUrl } = siteConfig.tiktok;

  return (
    <footer className="border-t border-line bg-bg-3">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-display text-lg font-bold uppercase tracking-[0.1em] text-foreground">
            {siteConfig.name}
          </p>
          <p className="mt-1 text-sm text-muted">{siteConfig.legalName}</p>
          <p className="mt-1 text-sm text-muted">
            Fundado {siteConfig.founded}
          </p>
          <Link
            href="/mediakit"
            className="mt-3 inline-block text-sm font-semibold text-muted transition hover:text-signal"
          >
            Media Kit →
          </Link>
        </div>

        <div className="flex flex-col gap-2 text-sm text-muted sm:items-end">
          <a
            href={`mailto:${siteConfig.email}`}
            className="transition hover:text-signal"
          >
            {siteConfig.email}
          </a>
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="transition hover:text-signal"
          >
            @{username} en TikTok
          </a>
          <p className="text-muted/70">
            © {new Date().getFullYear()} {siteConfig.legalName}
          </p>
        </div>
      </div>
    </footer>
  );
}
