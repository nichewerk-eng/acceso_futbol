"use client";

import "flag-icons/css/flag-icons.min.css";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatNumber, mediaKit } from "@/config/mediaKit";

export default function MediaKitView() {
  function handleDownload() {
    window.print();
  }

  return (
    <div className="min-h-screen bg-white font-display text-brand-blue">
      <TopBar onDownload={handleDownload} />

      <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-12 print:max-w-none print:px-10 print:py-6">
        <HeroBand onDownload={handleDownload} />
        <Divider />
        <PlatformsGrid />
        <Divider />
        <AudienceGeoRow />
        <Divider />
        <ContentProofRow />
        <Divider />
        <RateCardSection onDownload={handleDownload} />
        <Footer />
      </main>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Shared bits                                                             */
/* ---------------------------------------------------------------------- */

function TopBar({ onDownload }: { onDownload: () => void }) {
  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-md print:hidden">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-3 sm:px-8">
        <Link href="/" className="shrink-0">
          <Image
            src="/logo-dark.png"
            alt="Acceso Futbol"
            width={512}
            height={331}
            className="h-7 w-auto object-contain sm:h-8"
          />
        </Link>
        <span className="hidden text-xs font-bold uppercase tracking-[0.2em] text-gray-400 sm:inline">
          Media Kit · {mediaKit.meta.updated}
        </span>
        <div className="flex-1" />
        <a
          href={`mailto:${mediaKit.contact.email}`}
          className="hidden text-xs font-semibold text-gray-500 transition hover:text-brand-orange sm:inline"
        >
          {mediaKit.contact.email}
        </a>
        <button
          onClick={onDownload}
          className="flex shrink-0 items-center gap-2 border border-brand-orange bg-brand-orange px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-white hover:text-brand-orange"
        >
          <DownloadIcon />
          <span className="hidden sm:inline">Descargar PDF</span>
        </button>
      </div>
    </nav>
  );
}

function Divider() {
  return <div className="my-10 border-t border-gray-200 print:my-5" />;
}

function Kicker({ label }: { label: string }) {
  return (
    <p className="mb-3 font-display text-[11px] font-bold uppercase tracking-[0.3em] text-gray-400">
      {label}
    </p>
  );
}

function StatBlock({
  value,
  label,
  size = "md",
  accent = false,
}: {
  value: string;
  label: string;
  size?: "lg" | "md" | "sm";
  accent?: boolean;
}) {
  const sizeClass =
    size === "lg"
      ? "text-2xl sm:text-3xl lg:text-4xl"
      : size === "sm"
        ? "text-xl sm:text-2xl"
        : "text-2xl sm:text-3xl";
  return (
    <div className="min-w-0">
      <p
        className={`truncate font-display font-bold leading-none tracking-tight ${sizeClass} ${
          accent ? "text-brand-orange" : "text-brand-blue"
        }`}
      >
        {value}
      </p>
      <p className="mt-2 text-[11px] font-semibold uppercase leading-snug tracking-[0.14em] text-gray-500 sm:text-xs">
        {label}
      </p>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="border border-gray-300 px-3 py-1 text-xs text-gray-700">
      {children}
    </span>
  );
}

function EngagementBadge({ value, label }: { value: string; label: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 border border-brand-orange/40 bg-brand-orange/5 px-3 py-1.5">
      <span className="font-display text-base font-bold text-brand-orange sm:text-lg">{value}</span>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-600 sm:text-[11px]">{label}</span>
    </span>
  );
}

function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2, rootMargin: "0px 0px -10% 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${visible ? "is-visible" : ""} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Hero                                                                    */
/* ---------------------------------------------------------------------- */

function HeroBand({ onDownload }: { onDownload: () => void }) {
  const { headline } = mediaKit;

  return (
    <section>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-center">
        <div>
          <Reveal>
            <div className="flex items-center justify-between gap-4">
              <Image
                src="/logo-dark.png"
                alt="Acceso Futbol"
                width={512}
                height={331}
                className="h-12 w-auto object-contain sm:h-14"
                priority
              />
              <button
                onClick={onDownload}
                className="hidden shrink-0 items-center gap-2 border border-brand-orange bg-brand-orange px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-white hover:text-brand-orange print:hidden sm:flex"
              >
                <DownloadIcon />
                Descargar PDF
              </button>
            </div>

            <h1 className="mt-6 font-display text-4xl font-bold uppercase leading-[0.95] tracking-[0.01em] sm:text-5xl">
              Acceso <span className="text-brand-orange">Futbol</span>
            </h1>

            <p className="mt-3 max-w-2xl text-base leading-relaxed text-gray-600 sm:text-lg">
              Marca de medios en español enfocada en Liga MX y la Selección Mexicana,
              hecha para la afición mexicana y latina en Estados Unidos y México.
            </p>
          </Reveal>

          <Reveal delay={40} className="mt-6 print:hidden sm:hidden">
            <HeroContentShowcaseMobile />
          </Reveal>

          <Reveal delay={80} className="mt-8 grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4">
            <StatBlock
              size="lg"
              value={headline.combinedContentViewsDisplay}
              label={headline.combinedContentViewsLabel}
              accent
            />
            <StatBlock size="lg" value={formatNumber(headline.facebookReach)} label={headline.facebookReachLabel} />
            <StatBlock size="lg" value={formatNumber(headline.totalAudience)} label={headline.totalAudienceLabel} />
            <StatBlock
              size="lg"
              value={`+${formatNumber(headline.netNewFollowers)}`}
              label={`${headline.netNewFollowersLabel} · ${headline.facebookGrowthShare}% vía Facebook`}
            />
          </Reveal>

          <Reveal delay={140} className="mt-6 flex flex-wrap items-center gap-2">
            {headline.engagementBadges.map((b) => (
              <EngagementBadge key={b.label} value={b.value} label={b.label} />
            ))}
            <span className="ml-1 inline-flex items-center gap-2 border border-gray-200 bg-gray-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              {headline.creatorRewards}
            </span>
          </Reveal>

          <Reveal delay={180} className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
            <span className="font-semibold text-brand-blue">{mediaKit.window.label}</span>
            <span className="hidden sm:inline text-gray-300">/</span>
            <span className="max-w-2xl leading-relaxed">{mediaKit.window.note}</span>
          </Reveal>

          <div className="mt-6 sm:hidden">
            <button
              onClick={onDownload}
              className="flex w-full items-center justify-center gap-2 border border-brand-orange bg-brand-orange px-6 py-3 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-white hover:text-brand-orange print:hidden"
            >
              <DownloadIcon />
              Descargar PDF
            </button>
          </div>
        </div>

        <HeroContentShowcase />
      </div>
    </section>
  );
}

function HeroContentShowcase() {
  return (
    <div className="relative mx-auto hidden h-[220px] w-full max-w-[240px] print:hidden sm:block">
      <HeroContentCard
        src="/luis.jpg"
        alt="Clip de Acceso Futbol sobre la Liga MX en Austin, Texas"
        className="absolute left-0 top-4 w-[58%] -rotate-6"
      />
      <HeroContentCard
        src="/jonathang.jpg"
        alt="Clip de Acceso Futbol: rumbo al título del Mundial 2026"
        className="absolute right-0 top-0 w-[58%] rotate-4"
        priority
      />
    </div>
  );
}

function HeroContentShowcaseMobile() {
  return (
    <div className="flex gap-3">
      <HeroContentCard
        src="/luis.jpg"
        alt="Clip de Acceso Futbol sobre la Liga MX en Austin, Texas"
        className="w-1/2 -rotate-2"
      />
      <HeroContentCard
        src="/jonathang.jpg"
        alt="Clip de Acceso Futbol: rumbo al título del Mundial 2026"
        className="w-1/2 rotate-2"
        priority
      />
    </div>
  );
}

function HeroContentCard({
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
      className={`overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_16px_36px_rgba(15,23,42,0.16)] transition duration-500 hover:-translate-y-1 hover:rotate-0 ${className}`}
    >
      <div className="relative aspect-[1320/2626] w-full">
        <Image
          src={src}
          alt={alt}
          fill
          sizes="160px"
          className="object-cover"
          priority={priority}
        />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Platforms                                                               */
/* ---------------------------------------------------------------------- */

function PlatformsGrid() {
  return (
    <section>
      <Reveal className="print:break-inside-avoid print:break-after-avoid">
        <Kicker label="Cuatro plataformas, cuatro audiencias" />
        <h2 className="max-w-2xl text-xl font-bold uppercase tracking-tight sm:text-2xl">
          Cada plataforma llega a un mercado distinto
        </h2>
      </Reveal>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {mediaKit.platforms.map((p, i) => (
          <Reveal key={p.id} delay={i * 60} className="flex flex-col border border-gray-200 bg-gray-50 p-4 print:break-inside-avoid">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span style={{ color: PLATFORM_COLORS[p.id] }}>
                  <PlatformIcon id={p.id} />
                </span>
                <div>
                  <p className="text-sm font-bold uppercase tracking-wide text-brand-blue">{p.name}</p>
                  <p className="text-[11px] text-gray-400">{p.handle}</p>
                </div>
              </div>
              {p.badge && (
                <span className="border border-brand-orange/50 bg-brand-orange/5 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brand-orange">
                  {p.badge}
                </span>
              )}
            </div>

            <div className="mt-4 flex items-end gap-1.5">
              <p className="font-display text-2xl font-bold text-brand-blue sm:text-3xl">
                {p.approxMetric && "~"}
                {formatNumber(p.metricValue)}
              </p>
              <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                {p.metricLabel}
              </p>
            </div>

            {p.reachValue && (
              <p className="mt-1 text-xs text-gray-500">
                <strong className="text-brand-blue">{formatNumber(p.reachValue)}</strong> {p.reachLabel}
              </p>
            )}

            <div className="mt-3 flex flex-col gap-1 border-t border-gray-200 pt-3 text-xs">
              <span className="text-gray-600">
                <strong className="text-brand-blue">{formatNumber(p.followers)}</strong> {p.followersLabel}
                <span className="text-gray-400"> · +{formatNumber(p.growth)} {p.growthLabel}</span>
              </span>
              {p.secondaryMetric && (
                <span className="text-gray-600">
                  <strong className="text-brand-blue">{p.secondaryMetric.value}</strong> {p.secondaryMetric.label}
                </span>
              )}
            </div>

            <p className="mt-3 border-t border-gray-200 pt-3 text-xs leading-snug text-gray-600">
              {p.positioning}
            </p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------- */
/* Audience + Geography                                                    */
/* ---------------------------------------------------------------------- */

function AudienceGeoRow() {
  const { demographics: d, geography: g } = mediaKit;

  return (
    <section className="grid gap-10 print:block lg:grid-cols-2">
      <div>
        <Reveal className="print:break-inside-avoid print:break-after-avoid">
          <Kicker label="Quién nos ve" />
          <h2 className="text-xl font-bold uppercase tracking-tight sm:text-2xl">{d.summary}</h2>
        </Reveal>

        <Reveal delay={80} className="mt-5 overflow-hidden border border-gray-200 print:break-inside-avoid">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                <th className="px-3 py-2">Plataforma</th>
                <th className="px-3 py-2">Hombres</th>
                <th className="px-3 py-2">35+</th>
                <th className="px-3 py-2">País principal</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="px-3 py-2.5 font-bold text-brand-blue">Facebook</td>
                <td className="px-3 py-2.5 text-gray-700">{d.facebook.men}%</td>
                <td className="px-3 py-2.5 text-gray-700">{d.facebook.age35Plus}%</td>
                <td className="px-3 py-2.5 text-gray-700">México {d.facebook.mexico}%</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="px-3 py-2.5 font-bold text-brand-blue">TikTok</td>
                <td className="px-3 py-2.5 text-gray-700">{d.tiktok.men}%</td>
                <td className="px-3 py-2.5 text-gray-700">{d.tiktok.age35Plus}%</td>
                <td className="px-3 py-2.5 text-gray-700">EE. UU. {d.tiktok.unitedStates}%</td>
              </tr>
              <tr>
                <td className="px-3 py-2.5 font-bold text-brand-blue">Instagram</td>
                <td className="px-3 py-2.5 text-gray-400">25 a 54 años</td>
                <td className="px-3 py-2.5 text-gray-700">{d.instagram.age25to54}%</td>
                <td className="px-3 py-2.5 text-gray-700">{d.instagram.splitNote}</td>
              </tr>
            </tbody>
          </table>
        </Reveal>

        <Reveal delay={140} className="mt-6">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">
            Sectores con mejor encaje
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {d.verticals.map((v, i) => (
              <div key={v.name} className="flex items-start gap-2.5 border border-gray-200 bg-white p-3 print:break-inside-avoid">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-gray-200 text-gray-500">
                  <VerticalIcon index={i} />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-brand-blue">{v.name}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-gray-500">{v.rationale}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>

      <div className="print:mt-8">
        <Reveal className="print:break-inside-avoid print:break-after-avoid">
          <Kicker label="Dónde nos ven" />
          <h2 className="text-xl font-bold uppercase tracking-tight sm:text-2xl">Concentración geográfica</h2>
        </Reveal>

        <Reveal delay={80} className="mt-5 grid gap-4 sm:grid-cols-2 print:break-inside-avoid">
          <RankedMetroList countryCode="mx" title="México" items={g.mexicoMetros} />
          <RankedMetroList countryCode="us" title="Estados Unidos" items={g.usMetros} />
        </Reveal>

        <Reveal delay={160} className="mt-4 border border-gray-200 bg-gray-50 p-4 print:break-inside-avoid">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-orange">Foco: Texas</p>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <StatBlock size="sm" value={`${g.austin.texasShare}%`} label="Audiencia total es Texas" />
            <StatBlock size="sm" value={g.austin.texasCitiesInTop5} label="Top 5 ciudades EE. UU. son de Texas" />
            <StatBlock size="sm" value={`${g.austin.igShare}%`} label="Audiencia IG en Austin" />
          </div>
          <p className="mt-4 border-t border-gray-200 pt-3 text-xs font-semibold leading-relaxed text-gray-800">
            {g.proofStat}
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function RankedMetroList({
  countryCode,
  title,
  items,
}: {
  countryCode: string;
  title: string;
  items: readonly string[];
}) {
  return (
    <div>
      <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">
        <span aria-hidden className={`fi fi-${countryCode} rounded-[1px]`} /> {title}
      </p>
      <div className="mt-2 border border-gray-200 bg-white">
        {items.map((item, i) => (
          <div
            key={item}
            className={`flex items-center gap-3 px-3 py-1.5 ${
              i !== items.length - 1 ? "border-b border-gray-100" : ""
            }`}
          >
            <span
              className={`shrink-0 font-display font-bold tabular-nums ${
                i === 0 ? "text-sm text-brand-orange" : "text-xs text-gray-300"
              }`}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className={`text-xs ${i === 0 ? "font-bold text-brand-blue" : "text-gray-600"}`}>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Content + Proof                                                         */
/* ---------------------------------------------------------------------- */

function ContentProofRow() {
  const { content: c } = mediaKit;

  return (
    <section className="grid gap-10 print:block lg:grid-cols-2">
      <div>
        <Reveal className="print:break-inside-avoid print:break-after-avoid">
          <Kicker label="Lo que producimos" />
          <h2 className="text-xl font-bold uppercase tracking-tight sm:text-2xl">Formatos y cadencia</h2>
        </Reveal>

        <div className="mt-5 grid gap-2">
          {c.formats.map((f, i) => (
            <Reveal key={f} delay={i * 50} className="flex items-center gap-2.5 border border-gray-200 bg-white px-3.5 py-2.5 print:break-inside-avoid">
              <span className="h-1.5 w-1.5 shrink-0 self-center bg-brand-orange" />
              <span className="text-xs leading-snug text-gray-700 sm:text-sm">{f}</span>
            </Reveal>
          ))}
        </div>

        <Reveal delay={c.formats.length * 50 + 40} className="mt-4 flex flex-wrap gap-3">
          <div className="border border-gray-200 bg-white px-3.5 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Cadencia</p>
            <p className="mt-0.5 text-xs font-semibold text-brand-blue sm:text-sm">{c.cadence}</p>
          </div>
          <div className="border border-gray-200 bg-white px-3.5 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Formato</p>
            <p className="mt-0.5 text-xs font-semibold text-brand-blue sm:text-sm">{c.formatNote}</p>
          </div>
        </Reveal>
      </div>

      <div className="print:mt-8">
        <Reveal className="print:break-inside-avoid print:break-after-avoid">
          <Kicker label="Prueba de resultados" />
          <h2 className="text-xl font-bold uppercase tracking-tight sm:text-2xl">Resultados seleccionados</h2>
        </Reveal>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {mediaKit.proof.map((p, i) => (
            <Reveal key={p.label} delay={i * 60} className="border border-gray-200 bg-gray-50 p-3.5 print:break-inside-avoid">
              {p.tag && (
                <span className="mb-1.5 inline-block border border-brand-orange/50 bg-brand-orange/5 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brand-orange">
                  {p.tag}
                </span>
              )}
              <p className="font-display text-xl font-bold text-brand-blue sm:text-2xl">{p.value}</p>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-gray-700">{p.label}</p>
              <p className="mt-0.5 text-[11px] leading-snug text-gray-500">{p.detail}</p>
            </Reveal>
          ))}
        </div>

        <Reveal delay={mediaKit.proof.length * 60 + 40} className="mt-3">
          <CaseStudy />
        </Reveal>
      </div>
    </section>
  );
}

function CaseStudy() {
  const { caseStudy } = mediaKit;
  return (
    <div className="border border-gray-200 bg-white p-4 print:break-inside-avoid">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-sm font-bold uppercase tracking-tight text-brand-blue">
          {caseStudy.title}
        </h3>
        <span className="border border-brand-orange/50 bg-brand-orange/5 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brand-orange">
          {caseStudy.tag}
        </span>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-400">Objetivo</p>
          <p className="mt-1 text-[11px] leading-snug text-gray-700">{caseStudy.objective}</p>
        </div>
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-400">Qué producimos</p>
          <p className="mt-1 text-[11px] leading-snug text-gray-700">{caseStudy.produced}</p>
        </div>
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-brand-orange">Resultado</p>
          <p className="mt-1 text-[11px] font-semibold leading-snug text-brand-blue">{caseStudy.result}</p>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Rate card + Contact                                                     */
/* ---------------------------------------------------------------------- */

function RateCardSection({ onDownload }: { onDownload: () => void }) {
  const { rateCard, contact, partners: p } = mediaKit;

  return (
    <section>
      <Reveal className="print:break-inside-avoid print:break-after-avoid">
        <Kicker label="Trabajemos juntos" />
        <h2 className="text-xl font-bold uppercase tracking-tight sm:text-2xl">Qué puedes patrocinar</h2>
      </Reveal>

      <Reveal delay={60} className="mt-5 overflow-hidden border border-gray-200 print:break-inside-avoid">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              <th className="px-3.5 py-2.5">Paquete</th>
              <th className="hidden px-3.5 py-2.5 sm:table-cell">Incluye</th>
              <th className="px-3.5 py-2.5">Alcance de referencia</th>
            </tr>
          </thead>
          <tbody>
            {rateCard.packages.map((pkg, i) => (
              <tr key={pkg.name} className={i !== rateCard.packages.length - 1 ? "border-b border-gray-100" : ""}>
                <td className="px-3.5 py-3 align-top">
                  <div className="flex items-start gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center border border-gray-200 bg-gray-50 text-brand-orange">
                      <RateIcon index={i} />
                    </span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-brand-blue sm:text-sm">{pkg.name}</p>
                      <p className="mt-0.5 text-[11px] leading-snug text-gray-500 sm:hidden">{pkg.includes}</p>
                    </div>
                  </div>
                </td>
                <td className="hidden px-3.5 py-3 align-top text-xs leading-snug text-gray-600 sm:table-cell">
                  {pkg.includes}
                </td>
                <td className="px-3.5 py-3 align-top text-xs font-semibold text-brand-orange sm:text-sm">
                  {pkg.reach}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Reveal>

      <Reveal delay={120} className="mt-4 flex flex-wrap items-center justify-between gap-4 border border-gray-200 bg-gray-50 px-4 py-3">
        <p className="max-w-md text-xs text-gray-500 sm:text-sm">{rateCard.note}</p>
        <a
          href={`mailto:${contact.email}?subject=Tarifa%20Acceso%20Futbol`}
          className="inline-flex shrink-0 items-center gap-2 border border-brand-orange bg-brand-orange px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-white hover:text-brand-orange"
        >
          Solicita tarifa
        </a>
      </Reveal>

      <Reveal delay={160} className="mt-6 flex flex-wrap gap-x-8 gap-y-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Marcas aliadas</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {p.past.map((name) => (
              <Tag key={name}>{name}</Tag>
            ))}
          </div>
        </div>
        <div className="max-w-md">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Inventario abierto</p>
          <p className="mt-2 text-sm text-gray-600">{p.openInventory}</p>
        </div>
      </Reveal>
    </section>
  );
}

function Footer() {
  const { contact, dataCaveats } = mediaKit;
  return (
    <>
      <Divider />
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-orange">Contacto</p>
          <a
            href={`mailto:${contact.email}`}
            className="mt-1 block text-xl font-bold text-brand-blue transition hover:text-brand-orange sm:text-2xl"
          >
            {contact.email}
          </a>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
            <span>{contact.site}</span>
            <a href={contact.tiktokUrl} target="_blank" rel="noopener noreferrer" className="transition hover:text-brand-orange">
              {contact.handle}
            </a>
          </div>
        </div>
        <p className="text-xs text-gray-400">Media Kit · {mediaKit.meta.updated}</p>
      </div>

      <div className="mt-6 space-y-1 border-t border-gray-100 pt-4">
        {dataCaveats.map((note) => (
          <p key={note} className="text-[10px] leading-relaxed text-gray-400">
            {note}
          </p>
        ))}
      </div>
    </>
  );
}

/* ---------------------------------------------------------------------- */
/* Icons                                                                   */
/* ---------------------------------------------------------------------- */

const PLATFORM_COLORS: Record<"facebook" | "tiktok" | "youtube" | "instagram", string> = {
  facebook: "#1877F2",
  tiktok: "#000000",
  youtube: "#FF0000",
  instagram: "#E4405F",
};

function PlatformIcon({ id }: { id: "facebook" | "tiktok" | "youtube" | "instagram" }) {
  switch (id) {
    case "facebook":
      return <FacebookIcon />;
    case "tiktok":
      return <TikTokIcon />;
    case "youtube":
      return <YouTubeIcon />;
    case "instagram":
      return <InstagramIcon />;
  }
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 fill-current" aria-hidden>
      <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z" />
    </svg>
  );
}
function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 fill-current" aria-hidden>
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  );
}
function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 fill-current" aria-hidden>
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}
function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 fill-current" aria-hidden>
      <path d="M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077" />
    </svg>
  );
}
function VerticalIcon({ index }: { index: number }) {
  const icons = [BettingIcon, MugIcon, SignalIcon, CarIcon, BankIcon];
  const IconComponent = icons[index % icons.length];
  return <IconComponent />;
}

function BettingIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}
function MugIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 8h11v9a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V8Z" />
      <path d="M16 10h1.5a2 2 0 0 1 2 2v1.5a2 2 0 0 1-2 2H16" />
      <path d="M8.2 5.2c-.2-.9.4-1.4.6-2M11.2 5.2c-.2-.9.4-1.4.6-2" />
    </svg>
  );
}
function SignalIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden>
      <path d="M5 19v-3.2M10.3 19V11M15.7 19V7M21 19V4" />
    </svg>
  );
}
function CarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 16.5V11l2-5h12l2 5v5.5" />
      <path d="M4 16.5h16M6 16.5v2M18 16.5v2" />
      <circle cx="7.4" cy="16.5" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="16.6" cy="16.5" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}
function BankIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 10.5 12 4l9 6.5" />
      <path d="M5 10.5V19M10 10.5V19M14 10.5V19M19 10.5V19" />
      <path d="M3 20.5h18" />
    </svg>
  );
}
function RateIcon({ index }: { index: number }) {
  const icons = [PlayIcon, EventIcon, BroadcastIcon, CreatorIcon, BracketIcon];
  const IconComponent = icons[index % icons.length];
  return <IconComponent />;
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="14" rx="1" />
      <path d="M3 18v2M21 18v2" />
      <path d="M10 8.5v5l4.5-2.5z" fill="currentColor" stroke="none" />
    </svg>
  );
}
function EventIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3.5" y="5" width="17" height="16" rx="1" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
      <path d="M12 13.5l1.1 2.2 2.4.35-1.75 1.7.4 2.4-2.15-1.13-2.15 1.13.4-2.4-1.75-1.7 2.4-.35z" fill="currentColor" stroke="none" />
    </svg>
  );
}
function BroadcastIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="5.5" width="18" height="12" rx="1" />
      <path d="M8 21h8M12 17.5V21" />
      <path d="M7.5 12l2.2-2.5M16.5 12l-2.2-2.5" />
    </svg>
  );
}
function CreatorIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="9" y="3" width="6" height="10" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
      <path d="M12 17.5V21M8.5 21h7" />
    </svg>
  );
}
function BracketIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 5h4v4H4zM4 15h4v4H4z" />
      <path d="M8 7h4v10H8" />
      <path d="M12 12h4v-5h4M12 12h4v5h4" />
    </svg>
  );
}
function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0l-4-4m4 4l4-4M4 19h16" />
    </svg>
  );
}
