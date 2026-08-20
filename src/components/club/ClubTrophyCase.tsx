import { nationalTitlesFor } from '@/config/clubTitles';

export function ClubTrophyCase({ clubId }: { clubId: string }) {
  const cabinet = nationalTitlesFor(clubId);
  if (!cabinet) return null;

  const countLine = cabinet.total === 1 ? '1 título' : `${cabinet.total} títulos`;

  return (
    <section className="club-vitrina" data-testid="club-vitrina">
      <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-8">
        <p className="af-tele club-vitrina-tele">
          <span className="text-signal">AF</span>
          ://VITRINA
        </p>

        <div className="club-vitrina-frame">
          <div className="club-vitrina-plate">
            <span className="club-vitrina-plate-name">Nacionales</span>
            <span className="club-vitrina-plate-count">{countLine}</span>
          </div>

          <div className="club-vitrina-glass">
            <div className="club-vitrina-lights" aria-hidden>
              <i />
              <i />
              <i />
            </div>

            <div className="club-vitrina-bays">
              {cabinet.shelves.map((shelf) => (
                <div
                  key={shelf.comp}
                  className={[
                    'club-vitrina-bay',
                    shelf.wins.length >= 7 ? 'is-wide' : 'is-compact',
                  ].join(' ')}
                  data-testid={`club-vitrina-${shelf.comp}`}
                >
                  <p className="club-vitrina-bay-label">
                    <span>{shelf.title}</span>
                    <span aria-hidden>×{shelf.wins.length}</span>
                  </p>
                  <div className="club-vitrina-stage">
                    <ul className="club-vitrina-row">
                      {shelf.wins.map((win) => (
                        <li key={win.name} className="club-vitrina-cup" title={win.name}>
                          <img
                            src={shelf.logo}
                            alt={win.name}
                            width={72}
                            height={96}
                            loading="lazy"
                            decoding="async"
                          />
                          <span className="club-vitrina-tag">{win.label}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="club-vitrina-ledge" aria-hidden>
                      <span className="club-vitrina-ledge-top" />
                      <span className="club-vitrina-ledge-front" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="club-vitrina-floor" aria-hidden />
            <div className="club-vitrina-shine" aria-hidden />
          </div>
        </div>

        <p className="club-vitrina-dek">Era profesional · FMF</p>
      </div>
    </section>
  );
}
