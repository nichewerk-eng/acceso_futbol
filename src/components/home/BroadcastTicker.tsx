import { siteConfig } from "@/config/site";

const tickerItems = [
  "MUNDIAL 2026",
  siteConfig.worldCup.headline.toUpperCase(),
  `${siteConfig.worldCup.date.toUpperCase()} · ${siteConfig.worldCup.venue.toUpperCase()}`,
  "LIGA MX · SELECCIÓN MEXICANA",
  `@${siteConfig.tiktok.username.toUpperCase()} EN TIKTOK`,
];

export function BroadcastTicker() {
  const items = [...tickerItems, ...tickerItems];

  return (
    <div className="overflow-hidden border-y border-brand-teal/30 bg-bg-3">
      <div className="flex whitespace-nowrap">
        <div className="ticker-scroll flex items-center gap-8 py-2.5">
          {items.map((item, index) => (
            <span
              key={`${item}-${index}`}
              className="inline-flex items-center gap-8 font-display text-xs font-semibold uppercase tracking-[0.25em] text-brand-orange"
            >
              {item}
              <span aria-hidden="true" className="text-brand-teal">
                ◆
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
