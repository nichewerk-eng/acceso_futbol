'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { formatNumber, mailtoHref, mediaKit } from '@/config/mediaKit';
import { trackClient } from '@/lib/analytics/trackClient';

const button = 'inline-flex min-h-12 items-center justify-center rounded-sm bg-brand-orange-dark px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-blue focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-orange';
// Phones: swipeable snap carousel (keeps the page short). sm+ and print: regular grid.
const carousel = '-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-5 px-5 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:snap-none sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 print:mx-0 print:grid print:overflow-visible print:px-0 print:pb-0';
const slide = 'w-[80%] shrink-0 snap-center sm:w-auto sm:shrink print:w-auto';
const swipeHint = 'mt-1 text-xs text-slate-500 sm:hidden print:hidden';
const sectionTitle = 'font-display text-2xl font-semibold leading-tight sm:text-4xl print:text-2xl';

const totalViews = mediaKit.platforms.reduce((sum, p) => sum + p.views, 0);
const totalFollowers = mediaKit.platforms.reduce((sum, p) => sum + p.followers, 0);

// Keep the PDF compact and legible: Letter, narrow margins, exact brand colours,
// and every collapsed block (FAQ) expanded before the print dialog opens.
const printCss = `@media print {
  @page { size: letter; margin: 0.45in; }
  html { font-size: 85% !important; }
  html, body { background: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  a { text-decoration: none; }
}`;

export default function MediaKitView() {
  const viewed = useRef(false);

  useEffect(() => {
    if (!viewed.current) {
      viewed.current = true;
      trackClient('mediakit_view', { edition: '2026-09' });
    }
    // <details> content is omitted from print when closed; open everything for the PDF.
    const reopen: HTMLDetailsElement[] = [];
    const before = () => document.querySelectorAll('details').forEach(d => { if (!d.open) { d.open = true; reopen.push(d); } });
    const after = () => { reopen.splice(0).forEach(d => { d.open = false; }); };
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => { window.removeEventListener('beforeprint', before); window.removeEventListener('afterprint', after); };
  }, []);

  function proposal(placement: string, packageName?: string) {
    trackClient('mediakit_proposal_click', { placement, package: packageName ?? 'Por definir' });
  }

  function printKit() {
    trackClient('mediakit_print_click', { edition: '2026-09' });
    window.print();
  }

  return (
    <div className="min-h-screen bg-[#f7f6f2] font-sans text-brand-blue print:bg-white print:text-[13px]">
      <style>{printCss}</style>
      <nav aria-label="Media kit" className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3 sm:px-8">
          <Link href="/" aria-label="Acceso Futbol, inicio"><Image src="/logo-dark.png" alt="Acceso Futbol" width={512} height={331} className="h-9 w-auto" /></Link>
          <div className="flex items-center gap-4">
            <button onClick={printKit} className="hidden text-sm font-semibold underline underline-offset-4 sm:block">Guardar PDF</button>
            <a href={mailtoHref()} className={button} onClick={() => proposal('navigation')}>Solicitar propuesta</a>
          </div>
        </div>
      </nav>

      <main>
        <section className="bg-brand-blue text-white print:bg-white print:text-brand-blue">
          <div className="mx-auto hidden max-w-6xl items-center justify-between px-5 pt-4 sm:px-8 print:flex print:px-0">
            <Image src="/logo-dark.png" alt="Acceso Futbol" width={512} height={331} className="h-10 w-auto" />
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">Media kit · {mediaKit.meta.updated}</p>
          </div>
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-10 sm:px-8 sm:py-20 lg:grid-cols-[1.4fr_1fr] lg:items-center print:grid-cols-[1.4fr_1fr] print:gap-6 print:px-0 print:py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#56dbc1] print:text-[#157c72]">Patrocinios · Liga MX · El Tri</p>
              <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.07] sm:mt-5 sm:text-6xl print:mt-2 print:text-4xl">Tu marca en la conversación del fútbol mexicano.</h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-slate-200 sm:mt-6 sm:text-lg sm:leading-8 print:mt-3 print:text-sm print:leading-6 print:text-slate-700">Conecta con la afición de México y Estados Unidos a través de historias, previas y opinión en español. Creamos y distribuimos tu campaña en Facebook, TikTok, Instagram y YouTube.</p>
              <a href={mailtoHref()} onClick={() => proposal('hero')} className={`${button} mt-6 w-full hover:bg-white hover:text-brand-blue sm:mt-8 sm:w-auto print:hidden`}>Solicitar propuesta</a>
              <p className="mt-3 text-sm text-slate-300 print:hidden">Escríbenos tu objetivo. Recibe opciones de campaña y cotización.</p>
              <div className="mt-8 flex justify-center gap-4 sm:mt-8 sm:justify-start sm:gap-3 print:mt-3 print:justify-start">
                {mediaKit.clips.map((clip, i) => (
                  <div key={clip.src} className={`w-[42%] max-w-40 overflow-hidden rounded-xl border border-white/20 bg-white shadow-lg sm:w-28 sm:max-w-none print:w-20 print:border-slate-300 print:shadow-none ${i === 0 ? '-rotate-3' : 'rotate-3'}`}>
                    <div className="relative aspect-[1320/2626] w-full">
                      <Image src={clip.src} alt={clip.alt} fill sizes="(max-width: 640px) 160px, 112px" className="object-cover" priority={i === 1} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="border border-white/20 p-5 sm:p-6 print:border-slate-300 print:p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-300 print:text-slate-600">Resultados reportados · septiembre 2026</p>
              <p className="mt-3 font-display text-5xl font-semibold text-[#56dbc1] sm:mt-4 sm:text-6xl print:mt-2 print:text-5xl print:text-brand-blue">{formatNumber(totalViews)}</p>
              <p className="mt-2 text-base print:text-sm">vistas reportadas en las 4 plataformas</p>
              <p className="mt-2 text-xs leading-5 text-slate-300 print:text-slate-600">Facebook e Instagram: 1–30 septiembre. TikTok: 1–29. YouTube: 1–28. Suma de vistas reportadas; incluye repeticiones y stories de Instagram.</p>
              <div className="mt-6 grid grid-cols-2 gap-6 border-t border-white/20 pt-6 print:mt-3 print:gap-3 print:border-slate-300 print:pt-3">
                <div><p className="font-display text-3xl font-semibold print:text-2xl">{formatNumber(totalFollowers)}</p><p className="mt-2 text-sm text-slate-300 print:mt-1 print:text-xs print:text-slate-600">seguidores y suscriptores sumados al cierre reportado</p></div>
                <div><p className="font-display text-3xl font-semibold print:text-2xl">{mediaKit.platforms.length} plataformas</p><p className="mt-2 text-sm text-slate-300 print:mt-1 print:text-xs print:text-slate-600">para distribuir tu campaña</p></div>
              </div>
              <p className="mt-5 text-xs leading-5 text-slate-300 print:mt-3 print:text-slate-600">{mediaKit.notes.followers}</p>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-6xl space-y-12 px-5 py-10 sm:space-y-16 sm:px-8 sm:py-14 print:space-y-6 print:px-0 print:py-4">
          <section>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-orange-dark">Cómo trabaja tu marca con AF</p>
            <h2 className={`${sectionTitle} mt-3 print:mt-1`}>Una campaña que encaje en la vida del fan.</h2>
            <div className="mt-7 grid gap-5 md:grid-cols-3 print:mt-3 print:grid-cols-3 print:gap-4">
              {mediaKit.pillars.map(p => <article key={p.title} className="border-t-2 border-[#157c72] pt-5 print:break-inside-avoid print:pt-2"><h3 className="text-lg font-bold print:text-sm">{p.title}</h3><p className="mt-3 text-sm leading-7 text-slate-600 print:mt-1 print:text-xs print:leading-5">{p.copy}</p></article>)}
            </div>
          </section>

          <section id="paquetes" className="print:break-inside-avoid">
            <h2 className={sectionTitle}>Elige cómo empezar.</h2>
            <p className="mt-3 max-w-2xl leading-7 text-slate-600 print:text-xs print:leading-5">Estas opciones son el punto de partida. Ajustamos el brief, calendario e inversión a tu objetivo.</p>
            <div className={`mt-6 sm:mt-7 sm:grid-cols-1 lg:grid-cols-3 lg:gap-5 print:mt-3 print:grid-cols-3 print:gap-3 ${carousel}`}>
              {mediaKit.packages.map((p) => <article key={p.id} className={`${slide} flex flex-col border bg-white p-5 sm:p-6 print:break-inside-avoid print:p-3 ${p.id === 'mensual' ? 'border-[#157c72] border-t-4' : 'border-slate-200'}`}>
                <p className="text-xs font-bold uppercase tracking-wider text-[#157c72]">{p.duration}</p>
                <h3 className="mt-3 font-display text-2xl font-semibold print:mt-1 print:text-lg">{p.name}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600 print:mt-1 print:text-xs print:leading-5">{p.benefit}</p>
                <ul className="my-5 list-disc space-y-3 pl-5 text-sm leading-6 print:my-2 print:space-y-1 print:text-xs print:leading-5">{p.deliverables.map(d => <li key={d}>{d}</li>)}</ul>
                <p className="mb-5 text-xs leading-6 text-slate-600 print:mb-0 print:mt-auto">{p.bestFor}</p>
                <a href={mailtoHref(p.name)} className={`${button} mt-auto print:hidden`} onClick={() => proposal('package', p.name)}>Consultar esta campaña</a>
              </article>)}
            </div>
            <p className={swipeHint}>Desliza para ver las 3 opciones →</p>
            <p className="mt-4 text-sm leading-6 text-slate-600 print:text-xs print:leading-5">{mediaKit.notes.terms}</p>
          </section>

          <section id="resultados">
            <h2 className={sectionTitle}>Septiembre, plataforma por plataforma.</h2>
            <p className="mt-3 leading-7 text-slate-600 print:text-xs print:leading-5">Resultados del contenido de AF. Las vistas e impresiones son métricas distintas y pueden incluir varias exposiciones de una misma persona.</p>
            <div className={`mt-6 sm:mt-7 sm:grid-cols-2 lg:grid-cols-4 print:mt-3 print:grid-cols-4 print:gap-2 ${carousel}`}>
              {mediaKit.platforms.map(p => <article key={p.id} className={`${slide} border border-slate-200 bg-white p-5 print:break-inside-avoid print:p-3`}>
                <h3 className="font-display text-xl font-semibold print:text-base">{p.name}</h3><p className="mt-1 text-xs text-slate-500">{p.period} de 2026</p>
                <p className="mt-5 font-display text-3xl font-semibold print:mt-2 print:text-xl">{formatNumber(p.views)}</p><p className="mt-1 text-xs text-slate-600">{p.metric}</p>
                <p className="mt-5 text-sm font-semibold print:mt-2 print:text-xs">{formatNumber(p.followers)} {p.followerLabel}</p><p className="mt-1 text-xs text-slate-500">{p.growth}</p>
                <div className="mt-5 border-t border-slate-200 pt-4 print:mt-2 print:pt-2"><p className="text-xs font-bold uppercase text-[#157c72]">Mediana por pieza</p><p className="mt-2 text-xl font-bold print:mt-1 print:text-base">{formatNumber(p.median)}</p><p className="text-xs leading-5 text-slate-600">{p.medianLabel}</p></div>
                <p className="mt-4 text-sm leading-6 text-slate-600 print:mt-2 print:text-xs print:leading-4">{p.detail}</p>
              </article>)}
            </div>
            <p className={swipeHint}>Desliza para ver las 4 plataformas →</p>
            <p className="mt-4 text-xs leading-6 text-slate-500">{mediaKit.notes.medians}</p>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1fr_1.3fr] print:grid-cols-[1fr_1.3fr] print:gap-4 print:break-inside-avoid">
            <div><h2 className={sectionTitle}>Una afición que cruza fronteras.</h2><p className="mt-4 text-base leading-7 text-slate-600 print:mt-2 print:text-xs print:leading-5">Cobertura en español de Liga MX y El Tri para fans que siguen el fútbol mexicano desde México y Estados Unidos.</p><p className="mt-4 text-sm leading-7 text-slate-600 print:mt-2 print:text-xs print:leading-5">Contenido para marcas de streaming, conectividad, retail deportivo, restaurantes y experiencias para aficionados.</p></div>
            <div className="overflow-x-auto border border-slate-200 bg-white">
              <table className="w-full text-left text-sm"><caption className="px-5 py-4 text-left font-bold print:py-2">Distribución por país</caption><thead className="bg-slate-50"><tr><th className="px-4 py-3 print:py-1">Base medida</th><th className="px-4 py-3 print:py-1">México</th><th className="px-4 py-3 print:py-1">EE. UU.</th></tr></thead><tbody>{mediaKit.geography.map(g => <tr key={g.platform} className="border-t border-slate-200"><th scope="row" className="px-4 py-4 font-normal print:py-2"><span className="font-bold">{g.platform}</span><span className="mt-1 block text-xs text-slate-500">{g.population}</span></th><td className="px-4 py-4 print:py-2">{g.mexico}</td><td className="px-4 py-4 print:py-2">{g.us}</td></tr>)}</tbody></table>
              <p className="px-4 pb-4 text-xs leading-6 text-slate-500">{mediaKit.notes.geography}</p>
            </div>
          </section>

          <section className="print:break-inside-avoid">
            <h2 className={sectionTitle}>Mira el contenido que puede acompañar tu marca.</h2>
            <div className={`mt-6 sm:mt-7 sm:grid-cols-3 sm:gap-5 print:mt-3 print:grid-cols-3 print:gap-3 ${carousel}`}>{mediaKit.proof.map(p => <article key={p.platform} className={`${slide} border border-slate-200 bg-white p-5 sm:p-6 print:break-inside-avoid print:p-3`}><p className="text-xs font-bold uppercase tracking-wider text-[#157c72]">{p.platform}</p><h3 className="mt-3 text-lg font-bold print:mt-1 print:text-sm">{p.title}</h3><p className="mt-4 font-display text-4xl font-semibold print:mt-1 print:text-2xl">{formatNumber(p.value)}</p><p className="mt-1 text-xs text-slate-500">{p.metric}</p><p className="mt-4 text-sm leading-7 text-slate-600 print:mt-2 print:text-xs print:leading-5">{p.detail}</p><a href={p.url} target="_blank" rel="noopener noreferrer" className="mt-5 inline-block text-sm font-bold text-brand-orange-dark underline underline-offset-4 print:hidden" onClick={() => trackClient('mediakit_example_click', { platform: p.platform })}>Ver publicación ↗</a></article>)}</div>
            <p className={swipeHint}>Desliza para ver más ejemplos →</p>
            <p className="mt-4 text-xs leading-6 text-slate-500">{mediaKit.notes.proof}</p>
          </section>

          <section className="print:break-inside-avoid"><h2 className={sectionTitle}>Antes de lanzar tu campaña.</h2><div className="mt-6 divide-y divide-slate-200 border-y border-slate-200 print:mt-3">{mediaKit.faqs.map(f => <details key={f.question} className="py-3 sm:py-5 print:break-inside-avoid print:py-2"><summary className="flex min-h-11 cursor-pointer items-center text-base font-bold print:text-sm">{f.question}</summary><p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 print:mt-1 print:text-xs print:leading-5">{f.answer}</p></details>)}</div></section>

          <section id="propuesta" className="scroll-mt-28 border-t-4 border-[#157c72] bg-white p-5 sm:p-9 print:border-t-2 print:p-0 print:pt-3 print:break-inside-avoid">
            <p className="text-xs font-bold uppercase tracking-wider text-[#157c72]">Tu próxima campaña</p>
            <h2 className={`${sectionTitle} mt-3 print:mt-1`}>Hablemos de tu marca.</h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 print:mt-2 print:text-xs print:leading-5">Cuéntanos tu objetivo, fechas y la campaña que te interesa. Te responderemos con formatos, entregables e inversión.</p>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 print:mt-3">
              <a href={mailtoHref()} onClick={() => trackClient('mediakit_email_click')} className={`${button} w-full break-all sm:w-auto print:min-h-0 print:bg-transparent print:p-0 print:text-base print:text-brand-orange-dark`}>{mediaKit.contact.email}</a>
              <p className="text-sm text-slate-600 print:text-xs">Escríbenos con el nombre de tu marca y el objetivo de la campaña.</p>
            </div>
          </section>
          <footer className="flex flex-wrap items-center justify-between gap-5 border-t border-slate-200 pt-7 text-xs text-slate-500 print:pt-2"><p>Acceso Futbol · Media kit · {mediaKit.meta.updated} · {mediaKit.contact.email}</p><div className="flex gap-5 print:hidden"><Link href="/nosotros" className="underline">Conoce AF</Link><Link href="/liga-mx" className="underline">Liga MX</Link><button onClick={printKit} className="underline">Guardar PDF</button></div></footer>
        </div>
      </main>
    </div>
  );
}
