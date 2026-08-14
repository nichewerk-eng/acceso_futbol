import { PulseNav } from '@/components/living-room/PulseNav';

/** Instant partido fallback — used by `loading.tsx` and while tick + contexto resolve. */
export function MatchChapterSkeleton() {
  return (
    <div
      className="match-chapter match-chapter-loading"
      aria-busy="true"
      aria-live="polite"
    >
      <PulseNav />
      <p className="sr-only">Cargando el capítulo del partido</p>
      <section className="match-hero">
        <div className="match-hero-atmosphere" aria-hidden />
        <div className="match-hero-inner">
          <div className="match-hero-meta">
            <span className="match-skel match-skel-back" />
            <p className="af-tele match-hero-path">AF://CAPÍTULO</p>
          </div>

          <div className="match-scoreboard">
            <div className="match-side">
              <span className="match-skel match-skel-crest" />
              <span className="match-skel match-skel-abbr" />
              <span className="match-skel match-skel-name" />
            </div>
            <div className="match-score-center">
              <span className="match-skel-spinner" aria-hidden />
              <p className="match-skel-copy">Abriendo cabina…</p>
            </div>
            <div className="match-side match-side-away">
              <span className="match-skel match-skel-crest" />
              <span className="match-skel match-skel-abbr" />
              <span className="match-skel match-skel-name" />
            </div>
          </div>
        </div>
      </section>

      <div className="match-body">
        <div className="match-tabs" aria-hidden>
          <span className="match-skel match-skel-tab" />
          <span className="match-skel match-skel-tab" />
        </div>
        <div className="match-panel match-skel-panel">
          <span className="match-skel match-skel-label" />
          <span className="match-skel match-skel-h2h" />
          <span className="match-skel match-skel-block" />
          <span className="match-skel match-skel-block" />
        </div>
      </div>
    </div>
  );
}
