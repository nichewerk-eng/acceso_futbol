"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatNumber, mediaKit } from "@/config/mediaKit";

const SECTIONS = [
  { id: "portada", num: "01", label: "Portada" },
  { id: "alcance", num: "02", label: "Alcance" },
  { id: "plataformas", num: "03", label: "Plataformas" },
  { id: "audiencia", num: "04", label: "Audiencia" },
  { id: "geografia", num: "05", label: "Geografía" },
  { id: "contenido", num: "06", label: "Contenido" },
  { id: "resultados", num: "07", label: "Resultados" },
  { id: "alianzas", num: "08", label: "Alianzas" },
] as const;

export default function MediaKitView() {
  const [active, setActive] = useState<string>(SECTIONS[0].id);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const elements = SECTIONS.map((s) => sectionRefs.current[s.id]).filter(
      (el): el is HTMLElement => Boolean(el),
    );
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-15% 0px -55% 0px", threshold: [0.1, 0.25, 0.5, 0.75] },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  function handleDownload() {
    window.print();
  }

  return (
    <div className="min-h-screen bg-white font-display text-gray-900">
      <MediaKitNav active={active} onDownload={handleDownload} />

      <main>
        <CoverSection setRef={sectionRefs} onDownload={handleDownload} />
        <ReachSection setRef={sectionRefs} />
        <PlatformsSection setRef={sectionRefs} />
        <AudienceSection setRef={sectionRefs} />
        <GeographySection setRef={sectionRefs} />
        <ContentSection setRef={sectionRefs} />
        <ProofSection setRef={sectionRefs} />
        <PartnerSection setRef={sectionRefs} onDownload={handleDownload} />
      </main>
    </div>
  );
}

type SetRef = React.MutableRefObject<Record<string, HTMLElement | null>>;

/* ---------------------------------------------------------------------- */
/* Nav                                                                     */
/* ---------------------------------------------------------------------- */

function MediaKitNav({
  active,
  onDownload,
}: {
  active: string;
  onDownload: () => void;
}) {
  return (
    <nav className="print:hidden sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-2 overflow-x-auto px-4 py-2.5 sm:px-6">
        <Link href="/" className="mr-2 shrink-0">
          <Image
            src="/logo-dark.png"
            alt="Acceso Futbol"
            width={512}
            height={331}
            className="h-6 w-auto object-contain sm:h-7"
          />
        </Link>

        <div className="flex shrink-0 items-center gap-1">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={[
                "px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider transition whitespace-nowrap",
                active === s.id
                  ? "text-brand-orange"
                  : "text-gray-400 hover:text-gray-900",
              ].join(" ")}
            >
              <span className="opacity-50">{s.num}</span> {s.label}
            </a>
          ))}
        </div>

        <div className="flex-1" />

        <button
          onClick={onDownload}
          className="ml-2 flex shrink-0 items-center gap-2 border border-brand-orange bg-brand-orange px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-white hover:text-brand-orange"
        >
          <DownloadIcon />
          <span className="hidden sm:inline">Descargar PDF</span>
        </button>
      </div>
    </nav>
  );
}

/* ---------------------------------------------------------------------- */
/* Shared bits                                                             */
/* ---------------------------------------------------------------------- */

function SectionShell({
  id,
  setRef,
  tone = "1",
  className = "",
  children,
}: {
  id: string;
  setRef: SetRef;
  tone?: "1" | "3";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      ref={(el) => {
        setRef.current[id] = el;
      }}
      className={`mediakit-page relative scroll-mt-16 border-b border-gray-200 px-6 py-20 print:min-h-0 print:border-0 print:px-14 print:py-12 sm:px-10 ${
        tone === "3" ? "bg-[#f0f6f6]" : "bg-white"
      } ${className}`}
    >
      <div className="relative mx-auto w-full max-w-5xl">{children}</div>
    </section>
  );
}

function Kicker({ num, label }: { num: string; label: string }) {
  return (
    <p className="mb-6 font-display text-xs font-bold uppercase tracking-[0.35em] text-gray-400">
      {num} <span className="text-brand-orange">/</span> {label}
    </p>
  );
}

function BigStat({
  value,
  label,
  size = "lg",
  accent = false,
}: {
  value: string;
  label: string;
  size?: "lg" | "md";
  accent?: boolean;
}) {
  return (
    <div>
      <p
        className={`font-display font-bold leading-none tracking-tight ${
          accent ? "text-brand-orange" : "text-gray-900"
        } ${size === "lg" ? "text-5xl sm:text-7xl" : "text-3xl sm:text-4xl"}`}
      >
        {value}
      </p>
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 sm:text-sm">
        {label}
      </p>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="border border-gray-300 px-3.5 py-1.5 text-sm text-gray-700">
      {children}
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
/* 01 · Cover                                                              */
/* ---------------------------------------------------------------------- */

function CoverSection({
  setRef,
  onDownload,
}: {
  setRef: SetRef;
  onDownload: () => void;
}) {
  return (
    <SectionShell id="portada" setRef={setRef} className="print:pt-8">
      <div className="flex min-h-[70vh] flex-col justify-center print:min-h-0">
        <Reveal>
          <Image
            src="/logo-dark.png"
            alt="Acceso Futbol"
            width={512}
            height={331}
            className="h-16 w-auto object-contain sm:h-20"
            priority
          />

          <h1 className="mt-8 font-display text-5xl font-bold uppercase leading-[0.95] tracking-[0.02em] sm:text-7xl">
            Acceso <span className="text-brand-orange">Futbol</span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-gray-600 sm:text-xl">
            Marca de medios en español enfocada en Liga MX y la Selección
            Mexicana, hecha para la afición mexicana y latina en Estados
            Unidos.
          </p>
        </Reveal>

        <Reveal delay={120} className="mt-10 flex flex-wrap items-end gap-x-10 gap-y-6">
          <BigStat
            value={formatNumber(mediaKit.headline.totalReach)}
            label="Impresiones + vistas combinadas, 4 plataformas"
            accent
          />
        </Reveal>

        <Reveal delay={220} className="mt-12 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-gray-200 pt-6 text-sm text-gray-500">
          <span className="font-semibold text-gray-900">
            Media Kit · {mediaKit.meta.updated}
          </span>
          <span className="text-gray-300">/</span>
          <span>{mediaKit.contact.site}</span>
          <span className="text-gray-300">/</span>
          <a
            href={mediaKit.contact.tiktokUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="transition hover:text-brand-orange"
          >
            {mediaKit.contact.handle}
          </a>
        </Reveal>

        <Reveal delay={300}>
          <button
            onClick={onDownload}
            className="print:hidden mt-10 inline-flex w-fit items-center gap-2 border border-brand-orange bg-brand-orange px-6 py-3 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-white hover:text-brand-orange"
          >
            <DownloadIcon />
            Descargar PDF
          </button>
        </Reveal>
      </div>
    </SectionShell>
  );
}

/* ---------------------------------------------------------------------- */
/* 02 · Reach                                                              */
/* ---------------------------------------------------------------------- */

function ReachSection({ setRef }: { setRef: SetRef }) {
  const { headline, window: windowInfo } = mediaKit;

  return (
    <SectionShell id="alcance" setRef={setRef} tone="3">
      <Reveal>
        <Kicker num="02" label="Alcance en un vistazo" />
        <h2 className="text-3xl font-bold uppercase tracking-tight sm:text-4xl">
          {windowInfo.label}
        </h2>
      </Reveal>

      <Reveal delay={100} className="mt-10">
        <BigStat value={formatNumber(headline.totalReach)} label="Impresiones + vistas combinadas, 4 plataformas" accent />
        <p className="mt-3 max-w-xl text-xs leading-relaxed text-gray-400">{headline.methodologyNote}</p>
      </Reveal>

      <Reveal delay={180} className="mt-8 grid gap-8 sm:grid-cols-2">
        <BigStat size="md" value={formatNumber(headline.combinedAudience)} label="Seguidores combinados, 4 plataformas" />
        <BigStat size="md" value={`+${formatNumber(headline.netNewFollowers)}`} label="Nuevos seguidores netos" />
      </Reveal>

      <Reveal delay={260} className="mt-10 inline-flex items-center gap-2 border border-brand-orange/50 bg-brand-orange/5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-brand-orange">
        {headline.creatorRewards}
      </Reveal>

      <Reveal delay={320}>
        <p className="mt-10 max-w-3xl border-l-2 border-gray-300 pl-4 text-sm leading-relaxed text-gray-500">
          {windowInfo.note}
        </p>
      </Reveal>
    </SectionShell>
  );
}

/* ---------------------------------------------------------------------- */
/* 03 · Platforms                                                          */
/* ---------------------------------------------------------------------- */

function PlatformsSection({ setRef }: { setRef: SetRef }) {
  return (
    <SectionShell id="plataformas" setRef={setRef}>
      <Reveal>
        <Kicker num="03" label="Cuatro plataformas, cuatro audiencias" />
        <h2 className="max-w-2xl text-3xl font-bold uppercase tracking-tight sm:text-4xl">
          Cada plataforma llega a un mercado distinto
        </h2>
        <p className="mt-4 max-w-2xl text-gray-600">
          Las campañas pueden dirigirse a una plataforma específica en vez de
          mezclarse en un solo número.
        </p>
        <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
          {mediaKit.window.label}
        </p>
      </Reveal>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {mediaKit.platforms.map((p, i) => (
          <Reveal key={p.id} delay={i * 90} className="border border-gray-200 bg-gray-50 p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span style={{ color: PLATFORM_COLORS[p.id] }}>
                  <PlatformIcon id={p.id} />
                </span>
                <div>
                  <p className="font-bold uppercase tracking-wide text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-400">{p.handle}</p>
                </div>
              </div>
              {p.badge && (
                <span className="border border-brand-orange/50 bg-brand-orange/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-orange">
                  {p.badge}
                </span>
              )}
            </div>

            <div className="mt-5 flex items-end gap-2">
              <p className="font-display text-4xl font-bold text-gray-900">
                {formatNumber(p.metricValue)}
              </p>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
                {p.metricLabel}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-gray-200 pt-4 text-sm">
              <span className="text-gray-600">
                <strong className="text-gray-900">{formatNumber(p.followers)}</strong> {p.followersLabel}
              </span>
              <span className="text-gray-600">
                +{formatNumber(p.growth)} {p.growthLabel}
              </span>
              {p.secondaryMetric && (
                <span className="text-gray-600">
                  <strong className="text-gray-900">{p.secondaryMetric.value}</strong>{" "}
                  {p.secondaryMetric.label}
                </span>
              )}
            </div>
          </Reveal>
        ))}
      </div>
    </SectionShell>
  );
}

/* ---------------------------------------------------------------------- */
/* 04 · Audience                                                           */
/* ---------------------------------------------------------------------- */

function AudienceSection({ setRef }: { setRef: SetRef }) {
  const { demographics: d } = mediaKit;

  return (
    <SectionShell id="audiencia" setRef={setRef} tone="3">
      <Reveal>
        <Kicker num="04" label="Quién nos ve" />
        <h2 className="max-w-2xl text-3xl font-bold uppercase tracking-tight sm:text-4xl">
          {d.summary}
        </h2>
      </Reveal>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <Reveal delay={0}>
          <DemoCard title="Facebook" rows={[
            ["Hombres", `${d.facebook.men}%`],
            ["35 años o más", `${d.facebook.age35Plus}%`],
            ["México", `${d.facebook.mexico}%`],
          ]} />
        </Reveal>
        <Reveal delay={100}>
          <DemoCard title="TikTok" rows={[
            ["Hombres", `${d.tiktok.men}%`],
            ["35 años o más", `${d.tiktok.age35Plus}%`],
            ["Estados Unidos", `${d.tiktok.unitedStates}%`],
          ]} />
        </Reveal>
        <Reveal delay={200}>
          <DemoCard title="Instagram" rows={[
            ["25 a 54 años", `${d.instagram.age25to54}%`],
            ["México / EE. UU.", d.instagram.splitNote],
          ]} />
        </Reveal>
      </div>

      <Reveal delay={280} className="mt-10">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
          Sectores con mejor encaje
        </p>
        <div className="flex flex-wrap gap-2">
          {d.verticals.map((v) => (
            <Tag key={v}>{v}</Tag>
          ))}
        </div>
      </Reveal>
    </SectionShell>
  );
}

function DemoCard({
  title,
  rows,
}: {
  title: string;
  rows: [string, string][];
}) {
  return (
    <div className="border border-gray-200 bg-white p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-gray-500">{title}</p>
      <div className="mt-4 space-y-3">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-3">
            <span className="text-xs text-gray-500">{label}</span>
            <span className="text-right text-sm font-bold text-gray-900">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* 05 · Geography                                                          */
/* ---------------------------------------------------------------------- */

function GeographySection({ setRef }: { setRef: SetRef }) {
  const { geography: g } = mediaKit;

  return (
    <SectionShell id="geografia" setRef={setRef}>
      <Reveal>
        <Kicker num="05" label="Dónde nos ven" />
        <h2 className="max-w-2xl text-3xl font-bold uppercase tracking-tight sm:text-4xl">
          Concentración geográfica
        </h2>
      </Reveal>

      <Reveal delay={100} className="mt-10 grid gap-8 sm:grid-cols-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">México</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {g.mexicoMetros.map((m) => (
              <Tag key={m}>{m}</Tag>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Estados Unidos</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {g.usMetros.map((m) => (
              <Tag key={m}>{m}</Tag>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal delay={200} className="mt-10 border border-gray-200 bg-gray-50 p-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-orange">Foco: Austin</p>
        <div className="mt-4 grid gap-6 sm:grid-cols-3">
          <BigStat size="md" value={`${g.austin.igShare}%`} label="Audiencia de Instagram" />
          <BigStat size="md" value={`${g.austin.texasShare}%`} label="De la audiencia total es Texas" />
          <BigStat size="md" value={`#${g.austin.tiktokRank}`} label="Ciudad TikTok a nivel mundial" />
        </div>
        <p className="mt-5 text-sm text-gray-600">{g.activationNote}</p>
      </Reveal>
    </SectionShell>
  );
}

/* ---------------------------------------------------------------------- */
/* 06 · Content                                                            */
/* ---------------------------------------------------------------------- */

function ContentSection({ setRef }: { setRef: SetRef }) {
  const { content: c } = mediaKit;

  return (
    <SectionShell id="contenido" setRef={setRef} tone="3">
      <Reveal>
        <Kicker num="06" label="Lo que producimos" />
        <h2 className="max-w-2xl text-3xl font-bold uppercase tracking-tight sm:text-4xl">
          Formatos y cadencia
        </h2>
      </Reveal>

      <div className="mt-10 grid gap-3">
        {c.formats.map((f, i) => (
          <Reveal key={f} delay={i * 70} className="flex items-start gap-3 border border-gray-200 bg-white px-5 py-4">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 bg-brand-orange" />
            <span className="text-gray-700">{f}</span>
          </Reveal>
        ))}
      </div>

      <Reveal delay={c.formats.length * 70 + 60} className="mt-8 flex flex-wrap gap-4">
        <div className="border border-gray-200 bg-white px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Cadencia</p>
          <p className="mt-1 font-semibold text-gray-900">{c.cadence}</p>
        </div>
        <div className="border border-gray-200 bg-white px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Formato</p>
          <p className="mt-1 font-semibold text-gray-900">{c.formatNote}</p>
        </div>
      </Reveal>
    </SectionShell>
  );
}

/* ---------------------------------------------------------------------- */
/* 07 · Proof                                                              */
/* ---------------------------------------------------------------------- */

function ProofSection({ setRef }: { setRef: SetRef }) {
  return (
    <SectionShell id="resultados" setRef={setRef}>
      <Reveal>
        <Kicker num="07" label="Prueba de resultados" />
        <h2 className="max-w-2xl text-3xl font-bold uppercase tracking-tight sm:text-4xl">
          Resultados seleccionados
        </h2>
      </Reveal>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {mediaKit.proof.map((p, i) => (
          <Reveal key={p.label} delay={i * 90} className="border border-gray-200 bg-gray-50 p-6">
            {p.tag && (
              <span className="mb-3 inline-block border border-brand-orange/50 bg-brand-orange/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-orange">
                {p.tag}
              </span>
            )}
            <p className="font-display text-3xl font-bold text-gray-900 sm:text-4xl">{p.value}</p>
            <p className="mt-2 text-sm font-bold uppercase tracking-wide text-gray-700">{p.label}</p>
            <p className="mt-1 text-sm text-gray-500">{p.detail}</p>
          </Reveal>
        ))}
      </div>

      <Reveal delay={mediaKit.proof.length * 90 + 60}>
        <p className="mt-8 text-sm font-semibold uppercase tracking-wider text-gray-500">
          {mediaKit.proofNote}
        </p>
      </Reveal>
    </SectionShell>
  );
}

/* ---------------------------------------------------------------------- */
/* 08 · Partners                                                           */
/* ---------------------------------------------------------------------- */

function PartnerSection({
  setRef,
  onDownload,
}: {
  setRef: SetRef;
  onDownload: () => void;
}) {
  const { partners: p, contact } = mediaKit;

  return (
    <SectionShell id="alianzas" setRef={setRef} tone="3" className="print:border-b-0">
      <Reveal>
        <Kicker num="08" label="Trabajemos juntos" />
        <h2 className="max-w-2xl text-3xl font-bold uppercase tracking-tight sm:text-4xl">
          Alianzas y formatos disponibles
        </h2>
      </Reveal>

      <Reveal delay={100} className="mt-10 grid gap-8 sm:grid-cols-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
            Marcas aliadas
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {p.past.map((name) => (
              <Tag key={name}>{name}</Tag>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
            Formatos disponibles
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {p.formats.map((f) => (
              <Tag key={f}>{f}</Tag>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal delay={180}>
        <p className="mt-8 max-w-2xl text-gray-600">{p.openInventory}</p>
      </Reveal>

      <Reveal delay={260} className="mt-12 border border-gray-200 bg-white p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-orange">Contacto</p>
        <a
          href={`mailto:${contact.email}`}
          className="mt-2 block text-2xl font-bold text-gray-900 transition hover:text-brand-orange sm:text-3xl"
        >
          {contact.email}
        </a>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-500">
          <span>{contact.site}</span>
          <span>{contact.handle}</span>
        </div>

        <button
          onClick={onDownload}
          className="print:hidden mt-8 inline-flex items-center gap-2 border border-brand-orange bg-brand-orange px-6 py-3 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-white hover:text-brand-orange"
        >
          <DownloadIcon />
          Descargar PDF
        </button>
      </Reveal>
    </SectionShell>
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
function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0l-4-4m4 4l4-4M4 19h16" />
    </svg>
  );
}
