import { siteConfig } from '@/config/site';

const BEATS = [
  { code: '01', label: 'Toma', line: 'Opinión caliente. Sin diplomacia de mesa.' },
  { code: '02', label: 'Corte', line: 'Micro-análisis de Liga MX y El Tri en vertical.' },
  { code: '03', label: 'Puente', line: 'Misma cabina para México y el otro lado.' },
];

export function ShowStrip() {
  const { profileUrl, username } = siteConfig.tiktok;

  return (
    <section
      id="show"
      data-testid="section-show"
      className="af-ink border-b border-foreground/20 px-4 py-12 sm:px-6 sm:py-16"
    >
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end lg:gap-14">
          <div>
            <p className="af-tele text-[#f6f5f2]">
              <span className="text-signal">AF</span>
              ://SHOW
            </p>
            <h2
              className="mt-3 font-display text-[clamp(2.75rem,12vw,6.5rem)] font-bold uppercase leading-[0.82] tracking-[-0.04em] text-[#f6f5f2]"
              data-testid="show-title"
            >
              Acceso
              <br />
              en vertical
            </h2>
            <p className="mt-5 max-w-md text-sm leading-6 text-white/55 sm:text-base">
              El show vive en el feed. Aquí es la señal: qué somos, por qué
              volver, y el tap directo a la cabina vertical.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a
                href={profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hoy-cta"
                data-testid="show-tiktok"
              >
                @{username}
              </a>
              <span className="af-tele text-white/40">TikTok · diario</span>
            </div>
          </div>

          <ul className="border-t border-white/10" data-testid="show-beats">
            {BEATS.map((b) => (
              <li
                key={b.code}
                data-testid={`show-beat-${b.code}`}
                className="grid grid-cols-[2.5rem_1fr] gap-3 border-b border-white/10 py-4"
              >
                <span className="af-tele text-signal">{b.code}</span>
                <div>
                  <p className="font-display text-xl font-bold uppercase tracking-wide text-[#f6f5f2]">
                    {b.label}
                  </p>
                  <p className="mt-1 text-sm leading-5 text-white/50">{b.line}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
