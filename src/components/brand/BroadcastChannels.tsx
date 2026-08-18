'use client';

import { TV_CHANNELS, type TvChannelId } from '@/config/dondeVer';

type Props = {
  mx?: TvChannelId[];
  us?: TvChannelId[];
  mxLabel?: string;
  usLabel?: string;
  /** Paper (light) vs ink (dark) surface for white marks */
  surface?: 'paper' | 'ink';
  className?: string;
  compact?: boolean;
  /**
   * Single-line logo strip (no Dónde ver label / MX·US rows).
   * For match rows on narrow screens — keeps row height flat.
   */
  inline?: boolean;
  /** Cap logos in inline mode (keeps hero / dense rows calm). */
  maxMarks?: number;
};

function ChannelMark({
  id,
  surface,
  compact,
}: {
  id: TvChannelId;
  surface: 'paper' | 'ink';
  compact?: boolean;
}) {
  const ch = TV_CHANNELS[id];
  if (!ch) return null;
  const invert = ch.onDark && surface === 'paper';
  const src = surface === 'ink' && ch.srcInk ? ch.srcInk : ch.src;
  const className = ['tv-channel', compact ? 'tv-channel-compact' : '']
    .filter(Boolean)
    .join(' ');
  const mark = src ? (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={ch.label}
        className={['tv-channel-logo', invert ? 'tv-channel-logo-invert' : '']
          .filter(Boolean)
          .join(' ')}
        loading="lazy"
        decoding="async"
      />
      <span className="sr-only">{ch.label}</span>
    </>
  ) : (
    <span className="tv-channel-text">{ch.label}</span>
  );

  if (ch.href) {
    return (
      <a
        href={ch.href}
        className={className}
        data-channel={id}
        title={ch.label}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
      >
        {mark}
      </a>
    );
  }

  return (
    <span className={className} data-channel={id} title={ch.label}>
      {mark}
    </span>
  );
}

function RegionRow({
  region,
  channels,
  fallback,
  surface,
  compact,
}: {
  region: string;
  channels?: TvChannelId[];
  fallback?: string;
  surface: 'paper' | 'ink';
  compact?: boolean;
}) {
  const list = channels?.filter((id) => TV_CHANNELS[id]) ?? [];
  if (list.length === 0 && !fallback) return null;

  return (
    <div className="tv-region" data-testid={`donde-ver-${region.toLowerCase()}`}>
      <span className="tv-region-key">{region}</span>
      {list.length > 0 ? (
        <span className="tv-region-logos">
          {list.map((id) => (
            <ChannelMark key={id} id={id} surface={surface} compact={compact} />
          ))}
        </span>
      ) : (
        <span className="tv-region-fallback">{fallback}</span>
      )}
    </div>
  );
}

function uniqueChannels(mx?: TvChannelId[], us?: TvChannelId[]): TvChannelId[] {
  const out: TvChannelId[] = [];
  const seen = new Set<TvChannelId>();
  for (const id of [...(mx ?? []), ...(us ?? [])]) {
    if (!TV_CHANNELS[id] || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/** MX ↔ US broadcast strip with channel marks. */
export function BroadcastChannels({
  mx,
  us,
  mxLabel,
  usLabel,
  surface = 'paper',
  className = '',
  compact = false,
  inline = false,
  maxMarks,
}: Props) {
  if ((!mx || mx.length === 0) && (!us || us.length === 0) && !mxLabel && !usLabel) {
    return null;
  }

  if (inline) {
    const all = uniqueChannels(mx, us);
    const marks =
      typeof maxMarks === 'number' && maxMarks > 0 ? all.slice(0, maxMarks) : all;
    const title = [mxLabel, usLabel].filter(Boolean).join(' · ') || 'Dónde ver';
    if (marks.length === 0) {
      const fallback = title === 'Dónde ver' ? '' : title;
      if (!fallback) return null;
      return (
        <span
          className={['inline-flex items-center tv-inline', className]
            .filter(Boolean)
            .join(' ')}
          data-testid="donde-ver"
          title={fallback}
        >
          <span className="tv-inline-fallback">{fallback}</span>
        </span>
      );
    }
    return (
      <span
        className={['inline-flex items-center tv-inline', className]
          .filter(Boolean)
          .join(' ')}
        data-testid="donde-ver"
        title={title}
      >
        {marks.map((id) => (
          <ChannelMark key={id} id={id} surface={surface} compact />
        ))}
      </span>
    );
  }

  return (
    <div
      className={['tv-donde', compact ? 'tv-donde-compact' : '', className].filter(Boolean).join(' ')}
      data-testid="donde-ver"
    >
      <p className="tv-donde-label">Dónde ver</p>
      <div className="tv-donde-rows">
        <RegionRow region="MX" channels={mx} fallback={mxLabel} surface={surface} compact={compact} />
        <RegionRow region="US" channels={us} fallback={usLabel} surface={surface} compact={compact} />
      </div>
    </div>
  );
}
