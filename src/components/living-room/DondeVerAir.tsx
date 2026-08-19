import { TV_CHANNELS, type TvChannelId } from '@/config/dondeVer';

function uniqChannels(ids?: TvChannelId[]): TvChannelId[] {
  const out: TvChannelId[] = [];
  const seen = new Set<TvChannelId>();
  for (const id of ids ?? []) {
    if (!TV_CHANNELS[id] || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function AirCell({
  region,
  ids,
  fallback,
}: {
  region: string;
  ids?: TvChannelId[];
  fallback?: string;
}) {
  const list = uniqChannels(ids);
  return (
    <div className="dv-air">
      <span className="dv-air-key">{region}</span>
      {list.length ? (
        <ul className="dv-air-list">
          {list.map((id) => {
            const ch = TV_CHANNELS[id];
            const invert = Boolean(ch.onDark);
            return (
              <li
                key={id}
                className={['dv-chip', invert ? 'is-invert' : ''].join(' ')}
                title={ch.label}
              >
                {ch.src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ch.src} alt={ch.label} />
                ) : (
                  <span className="dv-chip-text">{ch.label}</span>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <span className="dv-air-empty">{fallback || 'Por confirmar'}</span>
      )}
    </div>
  );
}

export function DondeVerAir({
  mx,
  us,
  mxLabel,
  usLabel,
}: {
  mx?: TvChannelId[];
  us?: TvChannelId[];
  mxLabel?: string;
  usLabel?: string;
}) {
  const hasMx = uniqChannels(mx).length > 0 || Boolean(mxLabel);
  const hasUs = uniqChannels(us).length > 0 || Boolean(usLabel);
  if (!hasMx && !hasUs) {
    return <p className="dv-pending">Por confirmar · MX ↔ US</p>;
  }
  return (
    <div className="dv-air-block">
      <AirCell region="MX" ids={mx} fallback={mxLabel} />
      <AirCell region="US" ids={us} fallback={usLabel} />
    </div>
  );
}
