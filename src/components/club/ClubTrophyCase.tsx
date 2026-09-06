import { ClubLogo } from '@/components/brand/ClubLogo';
import { getClubIdentity } from '@/config/clubIdentity';
import {
  internationalTitlesFor,
  nationalTitlesFor,
  type ClubCabinet,
} from '@/config/clubTitles';

function VitrinaFrame({
  clubId,
  clubName,
  plate,
  cabinet,
}: {
  clubId: string;
  clubName?: string;
  plate: string;
  cabinet: ClubCabinet;
}) {
  const countLine = cabinet.total === 1 ? '1 título' : `${cabinet.total} títulos`;
  return (
    <div className="club-vitrina-frame">
      <div className="club-vitrina-plate">
        <span className="club-vitrina-plate-name">{plate}</span>
        <span className="club-vitrina-plate-crest">
          <ClubLogo clubId={clubId} name={clubName} size="sm" />
        </span>
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
                <span className="club-vitrina-n">×{shelf.wins.length}</span>
              </p>
              <div className="club-vitrina-stage">
                <ul className="club-vitrina-row">
                  {shelf.wins.map((win) => (
                    <li
                      key={win.name}
                      className="club-vitrina-cup"
                      title={win.name}
                      aria-label={win.name}
                    >
                      <img
                        src={shelf.logo}
                        alt=""
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
  );
}

export function ClubTrophyCase({
  clubId,
  embedded = false,
}: {
  clubId: string;
  embedded?: boolean;
}) {
  const national = nationalTitlesFor(clubId);
  const international = internationalTitlesFor(clubId);
  if (!national && !international) return null;

  const club = getClubIdentity(clubId);
  const dek = international ? 'Era profesional · FMF · CONCACAF' : 'Era profesional · FMF';

  return (
    <section
      className={['club-vitrina', embedded ? 'is-embed' : ''].join(' ')}
      data-testid="club-vitrina"
    >
      <div className="club-vitrina-inner">
        {!embedded && (
          <p className="af-tele club-vitrina-tele">
            <span className="text-signal">AF</span>
            ://VITRINA
          </p>
        )}

        {national ? (
          <VitrinaFrame
            clubId={clubId}
            clubName={club?.name}
            plate="Nacionales"
            cabinet={national}
          />
        ) : null}
        {international ? (
          <VitrinaFrame
            clubId={clubId}
            clubName={club?.name}
            plate="Internacionales"
            cabinet={international}
          />
        ) : null}

        {!embedded && <p className="club-vitrina-dek">{dek}</p>}
      </div>
    </section>
  );
}
