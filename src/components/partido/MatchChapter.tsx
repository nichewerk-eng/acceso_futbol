'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { BroadcastChannels } from '@/components/brand/BroadcastChannels';
import { ClubLogo } from '@/components/brand/ClubLogo';
import { LeaguesCupMark } from '@/components/brand/LeaguesCupMark';
import { LigaMxMark } from '@/components/brand/LigaMxMark';
import { PulseNav } from '@/components/living-room/PulseNav';
import type { LigaMXEntry, LigaMXTable } from '@/app/api/ligamx/standings/route';
import type {
  FormMatch,
  FormResult,
  HeadToHeadSummary,
  MatchSnapshot,
  TeamLineup,
} from '@/lib/sports';
import { startLivePoll } from '@/lib/client/livePoll';
import type { FreshPace } from '@/lib/sports/freshness';
import { scheduleAbbr } from '@/lib/sports/ligaMxAbbr';
import { localizeStatus } from '@/lib/sports/localizeEs';
import { mergeMatchSnapshot } from '@/lib/sports/mergeMatchSnapshot';
import { MatchChapterSkeleton } from '@/components/partido/MatchChapterSkeleton';
import { MatchShare } from '@/components/partido/MatchShare';

type Props = { league: string; id: string; initialMatch?: MatchSnapshot | null };
type TabId = 'contexto' | 'momentos' | 'alineacion' | 'datos' | 'radio';
type FeedFilter = 'clave' | 'completa';

type TimelineRow = {
  id: string;
  clock: string;
  text: string;
  label: string;
  teamAbbr?: string;
  peak: boolean;
  kind: 'goal' | 'card' | 'sub' | 'var' | 'play';
};

type HeadlineLine = {
  id: string;
  clock: string;
  name: string;
  side: 'home' | 'away' | 'unknown';
  tag?: string;
};

type KeyStat = {
  key: string;
  label: string;
  home: string;
  away: string;
  homeNum: number;
  awayNum: number;
};

const KEY_STAT_ORDER: { match: RegExp; label: string }[] = [
  { match: /ball possession|possession/i, label: 'Posesión' },
  { match: /shots total|^shots$/i, label: 'Tiros' },
  { match: /on goal|on target|shots on target/i, label: 'A puerta' },
  { match: /corner/i, label: 'Corners' },
  { match: /^fouls?$/i, label: 'Faltas' },
  { match: /yellow/i, label: 'Amarillas' },
  { match: /red card/i, label: 'Rojas' },
];

function hasContexto(m: MatchSnapshot | null) {
  if (!m) return false;
  return (
    (m.form?.home.length ?? 0) + (m.form?.away.length ?? 0) > 0 ||
    (m.headToHead?.meetings.length ?? 0) > 0
  );
}

const FORM_LETTER: Record<FormResult, string> = { W: 'G', D: 'E', L: 'P' };
const FORM_TITLE: Record<FormResult, string> = {
  W: 'Ganó',
  D: 'Empató',
  L: 'Perdió',
};

function buildKeyEvents(match: MatchSnapshot): TimelineRow[] {
  return (match.events ?? [])
    .filter((e) => e.kind && e.kind !== 'other')
    .map((e) => {
      const kind: TimelineRow['kind'] =
        e.kind === 'goal' || e.kind === 'penalty' || e.kind === 'own_goal'
          ? 'goal'
          : e.kind === 'yellow' || e.kind === 'red'
            ? 'card'
            : e.kind === 'sub'
              ? 'sub'
              : e.kind === 'var'
                ? 'var'
                : 'play';
      return {
        id: `e-${e.id}`,
        clock: e.clock,
        label: e.type,
        text: e.text,
        teamAbbr: e.teamAbbr,
        peak: kind === 'goal' || e.kind === 'red',
        kind,
      };
    });
}

function buildFullCronica(match: MatchSnapshot): TimelineRow[] {
  const comments = (match.comments ?? [])
    .filter((c) => c.text?.trim())
    .map((c) => {
      const text = c.text.trim();
      const isGoal = Boolean(c.isGoal) || /\b(goal|gol)\b/i.test(text);
      const isRed = /\broja\b|\bred card\b/i.test(text);
      const isCard = isRed || /\bamarilla\b|\byellow card\b/i.test(text);
      return {
        id: `c-${c.id}`,
        clock:
          c.clock?.trim() ||
          (c.minute !== undefined && c.minute !== null ? `${c.minute}'` : ''),
        label: isGoal ? 'Gol' : isRed ? 'Roja' : isCard ? 'Amarilla' : '',
        text,
        peak: isGoal || isRed,
        kind: (isGoal ? 'goal' : isCard ? 'card' : 'play') as TimelineRow['kind'],
        sort: (c.order ?? 0) * 10 + (c.minute ?? 0),
      };
    })
    .sort((a, b) => a.sort - b.sort)
    .map(({ id, clock, label, text, peak, kind }) => ({ id, clock, label, text, peak, kind }));

  return comments.length ? comments : buildKeyEvents(match);
}

function headlineLines(match: MatchSnapshot): HeadlineLine[] {
  const fromApi = (match.scorers ?? []).map((s, i) => ({
    id: `sc-${i}`,
    clock: s.minute.includes("'") ? s.minute : `${s.minute}'`,
    name: s.name,
    side: s.side as HeadlineLine['side'],
    tag: s.pen ? 'PEN' : s.og ? 'AG' : undefined,
  }));
  if (fromApi.length) {
    const reds = (match.events ?? [])
      .filter((e) => e.kind === 'red')
      .map((e) => ({
        id: `red-${e.id}`,
        clock: e.clock,
        name: e.playerName || e.text,
        side: (e.side ?? 'unknown') as HeadlineLine['side'],
        tag: 'Roja',
      }));
    return [...fromApi, ...reds].sort((a, b) => {
      const na = Number(String(a.clock).replace(/[^\d].*$/, '')) || 0;
      const nb = Number(String(b.clock).replace(/[^\d].*$/, '')) || 0;
      return na - nb;
    });
  }
  return [];
}

function pickKeyStats(match: MatchSnapshot): KeyStat[] {
  const stats = match.stats ?? [];
  const used = new Set<string>();
  const out: KeyStat[] = [];
  for (const rule of KEY_STAT_ORDER) {
    const hit = stats.find((s) => rule.match.test(s.label) && !used.has(s.label));
    if (!hit) continue;
    used.add(hit.label);
    out.push({
      key: hit.label,
      label: rule.label,
      home: hit.home,
      away: hit.away,
      homeNum: Number(String(hit.home).replace('%', '')) || 0,
      awayNum: Number(String(hit.away).replace('%', '')) || 0,
    });
  }
  return out;
}

function statusCopy(match: MatchSnapshot): string {
  if (match.state === 'in') {
    const clock = match.clock?.trim();
    if (clock === 'HT' || /descanso|half\s*time/i.test(match.statusLabel || '')) {
      return 'Descanso';
    }
    if (clock === 'PEN' || /penal/i.test(match.statusLabel || '')) return 'Penales';
    if (clock?.startsWith('ET') || /extra/i.test(match.statusLabel || '')) {
      return clock && clock !== 'ET' ? clock : 'Tiempo extra';
    }
    return clock ? `En vivo · ${clock}` : 'En vivo';
  }
  return localizeStatus(match.statusLabel, match.state);
}

function kickoffCopy(iso: string, tz: string): { day: string; time: string } {
  try {
    const d = new Date(iso);
    return {
      day: d.toLocaleDateString('es-MX', {
        timeZone: tz,
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }),
      time: d.toLocaleTimeString('es-MX', {
        timeZone: tz,
        hour: 'numeric',
        minute: '2-digit',
      }),
    };
  } catch {
    return { day: '', time: '' };
  }
}

function formatMeetingShort(iso: string, tz: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-MX', {
      timeZone: tz,
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return '';
  }
}

function chapterKicker(match: MatchSnapshot): string {
  if (match.state === 'pre') return 'Antes del silbatazo';
  if (match.state === 'in') return 'Capítulo en vivo';
  return 'Capítulo cerrado';
}

function FormRow({
  label,
  abbr,
  form,
}: {
  label: string;
  abbr: string;
  form: FormMatch[];
}) {
  return (
    <div className="match-form-row">
      <div className="match-form-team">
        <ClubLogo abbr={abbr} size="sm" />
        <span>{label}</span>
      </div>
      <div className="match-form-marks" aria-label={`Últimos ${form.length} de ${label}`}>
        {form.length === 0 ? (
          <span className="match-form-empty">Sin datos</span>
        ) : (
          form.map((f) => (
            <span
              key={f.id}
              className={`match-form-mark is-${f.result.toLowerCase()}`}
              title={`${FORM_TITLE[f.result]} · ${f.playedHome ? 'Local' : 'Visita'} vs ${f.opponentAbbr} ${f.homeScore}-${f.awayScore}`}
            >
              {FORM_LETTER[f.result]}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

function FormDetail({ side, form }: { side: string; form: FormMatch[] }) {
  if (!form.length) return null;
  return (
    <div className="match-form-detail">
      <div className="match-form-detail-head">
        <ClubLogo abbr={side} size="sm" />
        <span className="match-form-detail-abbr">{side}</span>
        <div className="match-form-marks" aria-hidden>
          {form.map((f) => (
            <span key={f.id} className={`match-form-mark is-${f.result.toLowerCase()}`}>
              {FORM_LETTER[f.result]}
            </span>
          ))}
        </div>
      </div>
      <ul>
        {form.map((f) => (
          <li key={f.id} title={`${FORM_TITLE[f.result]} · ${f.opponentName}`}>
            <span className={`match-form-mark is-${f.result.toLowerCase()}`}>
              {FORM_LETTER[f.result]}
            </span>
            <span className="match-form-detail-opp">vs {f.opponentAbbr}</span>
            <span className="match-form-detail-score tabular-nums">
              {f.homeScore}–{f.awayScore}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function H2HBlock({
  h2h,
  homeAbbr,
  awayAbbr,
  tz,
}: {
  h2h: HeadToHeadSummary;
  homeAbbr: string;
  awayAbbr: string;
  tz: string;
}) {
  const total = h2h.homeWins + h2h.draws + h2h.awayWins || 1;
  return (
    <section className="match-h2h">
      <p className="af-tele match-contexto-label">Cara a cara · últimos {h2h.played}</p>
      <div className="match-h2h-board" aria-label={`${homeAbbr} ${h2h.homeWins}, ${h2h.draws} empates, ${awayAbbr} ${h2h.awayWins}`}>
        <div className="match-h2h-stat">
          <strong>{h2h.homeWins}</strong>
          <span>{homeAbbr}</span>
        </div>
        <div className="match-h2h-stat is-draw">
          <strong>{h2h.draws}</strong>
          <span>Emp</span>
        </div>
        <div className="match-h2h-stat">
          <strong>{h2h.awayWins}</strong>
          <span>{awayAbbr}</span>
        </div>
      </div>
      <div className="match-h2h-bar" aria-hidden>
        <i className="is-home" style={{ width: `${(h2h.homeWins / total) * 100}%` }} />
        <i className="is-draw" style={{ width: `${(h2h.draws / total) * 100}%` }} />
        <i className="is-away" style={{ width: `${(h2h.awayWins / total) * 100}%` }} />
      </div>
      <ul className="match-h2h-list">
        {h2h.meetings.slice(0, 4).map((m) => {
          const hs = Number(m.homeScore);
          const as = Number(m.awayScore);
          const tip =
            Number.isFinite(hs) && Number.isFinite(as) && hs !== as
              ? hs > as
                ? m.homeAbbr
                : m.awayAbbr
              : null;
          return (
            <li key={m.id} className={tip === homeAbbr ? 'is-home-win' : tip === awayAbbr ? 'is-away-win' : ''}>
              <span className="match-h2h-score tabular-nums">
                {m.homeScore}–{m.awayScore}
              </span>
              <span className="match-h2h-pair">
                {m.homeAbbr} <span aria-hidden>·</span> {m.awayAbbr}
              </span>
              <span className="match-h2h-day">{formatMeetingShort(m.date, tz)}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function MatchTabla({
  entries,
  homeAbbr,
  awayAbbr,
}: {
  entries: LigaMXEntry[];
  homeAbbr: string;
  awayAbbr: string;
}) {
  const home = scheduleAbbr(homeAbbr);
  const away = scheduleAbbr(awayAbbr);

  return (
    <aside className="match-tabla" aria-label="Tabla Liga MX">
      <div className="match-tabla-head">
        <p className="af-tele match-contexto-label">Tabla</p>
        <Link href="/liga-mx" className="match-tabla-link">
          Completa →
        </Link>
      </div>
      <div className="match-tabla-grid match-tabla-cols" aria-hidden>
        <span>#</span>
        <span>Club</span>
        <span>PJ</span>
        <span>Pts</span>
        <span>DG</span>
      </div>
      <ul className="match-tabla-list">
        {entries.map((e) => {
          const abbr = scheduleAbbr(e.team.abbreviation);
          const side = abbr === home ? 'home' : abbr === away ? 'away' : null;
          return (
            <li
              key={e.team.id}
              className={['match-tabla-row', side ? `is-${side}` : ''].filter(Boolean).join(' ')}
            >
              <span className="match-tabla-pos tabular-nums">{e.position}</span>
              <span className="match-tabla-club">
                <ClubLogo abbr={abbr} size="xs" />
                <span>{abbr}</span>
              </span>
              <span className="tabular-nums">{e.gp}</span>
              <span className="match-tabla-pts tabular-nums">{e.pts}</span>
              <span className="tabular-nums match-tabla-gd">{e.gd}</span>
            </li>
          );
        })}
      </ul>
      <p className="match-tabla-legend">
        <span className="is-home">{home}</span>
        <span className="is-away">{away}</span>
      </p>
    </aside>
  );
}

function PlayerFace({ src, name }: { src?: string; name: string }) {
  if (!src) return <span className="match-player-face is-empty" aria-hidden />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" title={name} className="match-player-face" loading="lazy" decoding="async" />
  );
}

function LineupSide({ team }: { team: TeamLineup }) {
  return (
    <div className="match-lineup-side">
      <div className="match-lineup-side-head">
        <p className="font-display text-lg uppercase tracking-wide">{team.teamName}</p>
        <p className="af-tele">
          {team.abbreviation}
          {team.formation ? ` · ${team.formation}` : ''}
        </p>
      </div>
      <p className="match-lineup-label">Titulares</p>
      <ul className="match-lineup-list">
        {team.starters.map((p) => (
          <li key={p.id}>
            <PlayerFace src={p.photo} name={p.name} />
            <span className="match-jersey">{p.jersey ?? '-'}</span>
            <span className="match-player-name">{p.name}</span>
            <span className="match-player-pos">{p.positionLabel}</span>
          </li>
        ))}
      </ul>
      {team.bench.length > 0 && (
        <>
          <p className="match-lineup-label">Banca</p>
          <ul className="match-lineup-list is-bench">
            {team.bench.map((p) => (
              <li key={p.id}>
                <PlayerFace src={p.photo} name={p.name} />
                <span className="match-jersey">{p.jersey ?? '-'}</span>
                <span className="match-player-name">{p.name}</span>
                <span className="match-player-pos">{p.positionLabel}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function DatosPanel({ match, keyStats }: { match: MatchSnapshot; keyStats: KeyStat[] }) {
  const rows =
    keyStats.length > 0
      ? [
          ...keyStats,
          ...(match.stats ?? [])
            .filter((s) => !keyStats.some((k) => k.key === s.label))
            .filter((s) => !/ball safe|attacks$|passes$|accurate/i.test(s.label))
            .slice(0, 6)
            .map((s) => ({
              key: s.label,
              label: s.label,
              home: s.home,
              away: s.away,
              homeNum: Number(String(s.home).replace('%', '')) || 0,
              awayNum: Number(String(s.away).replace('%', '')) || 0,
            })),
        ]
      : (match.stats ?? []).slice(0, 12).map((s) => ({
          key: s.label,
          label: s.label,
          home: s.home,
          away: s.away,
          homeNum: Number(String(s.home).replace('%', '')) || 0,
          awayNum: Number(String(s.away).replace('%', '')) || 0,
        }));

  if (!rows.length) return <p className="match-empty">Estadísticas no disponibles.</p>;

  return (
    <section className="match-datos">
      <p className="af-kicker">
        <span className="af-tele">Lectura del partido</span>
      </p>
      <div className="match-datos-teams">
        <span>{match.home.abbreviation}</span>
        <span>{match.away.abbreviation}</span>
      </div>
      <ul className="match-datos-list">
        {rows.map((s) => {
          const total = s.homeNum + s.awayNum || 1;
          const homePct = Math.round((s.homeNum / total) * 100);
          return (
            <li key={s.key}>
              <div className="match-datos-head">
                <span className="tabular-nums font-semibold">{s.home}</span>
                <span>{s.label}</span>
                <span className="tabular-nums font-semibold">{s.away}</span>
              </div>
              <div className="match-datos-bar" aria-hidden>
                <i style={{ width: `${homePct}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function MatchChapter({ league, id, initialMatch = null }: Props) {
  const [match, setMatch] = useState<MatchSnapshot | null>(initialMatch);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<TabId | null>(
    initialMatch ? (initialMatch.state === 'pre' ? 'contexto' : 'momentos') : null
  );
  const [feed, setFeed] = useState<FeedFilter>('clave');
  const [userTz, setUserTz] = useState('America/Mexico_City');
  const [tabla, setTabla] = useState<LigaMXEntry[] | null>(null);
  const [richReady, setRichReady] = useState(() => hasContexto(initialMatch));

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) setUserTz(tz);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let pace: FreshPace = 'near';
    let es: EventSource | null = null;
    const q =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('tab')
        : null;
    const tabFromQuery =
      q === 'momentos' || q === 'contexto' || q === 'alineacion' || q === 'datos'
        ? q
        : null;
    setMatch(initialMatch);
    setError(false);
    setRichReady(hasContexto(initialMatch));
    setTab(
      tabFromQuery ??
        (initialMatch ? (initialMatch.state === 'pre' ? 'contexto' : 'momentos') : null)
    );

    let pendingCtx: {
      form: NonNullable<MatchSnapshot['form']>;
      headToHead: MatchSnapshot['headToHead'];
    } | null = null;

    const apply = (d: MatchSnapshot) => {
      if (cancelled) return;
      pace = d.state === 'in' ? 'live' : d.state === 'pre' ? 'near' : 'idle';
      const next = pendingCtx
        ? { ...d, form: pendingCtx.form, headToHead: pendingCtx.headToHead }
        : d;
      setMatch((prev) => mergeMatchSnapshot(prev, next));
      setError(false);
      setTab((prev) => {
        if (prev) return prev;
        return d.state === 'pre' ? 'contexto' : 'momentos';
      });
    };

    const loadDetail = () =>
      fetch(`/api/sports/match/${league}/${id}`)
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((d: MatchSnapshot) => apply(d));

    const loadTick = () =>
      fetch(`/api/sports/match/${league}/${id}/tick`)
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((d: MatchSnapshot) => apply(d));

    const applyContexto = (d: NonNullable<typeof pendingCtx>) => {
      if (cancelled) return;
      pendingCtx = d;
      setMatch((prev) => (prev ? { ...prev, form: d.form, headToHead: d.headToHead } : prev));
      setRichReady(true);
    };

    const loadContexto = () =>
      fetch(`/api/sports/match/${league}/${id}/contexto`)
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((d: NonNullable<typeof pendingCtx>) => applyContexto(d));

    const startSse = () => {
      if (cancelled || pace !== 'live' || typeof EventSource === 'undefined' || es) return;
      es = new EventSource(`/api/sports/match/${league}/${id}/stream`);
      es.onmessage = (ev) => {
        try {
          apply(JSON.parse(ev.data) as MatchSnapshot);
        } catch {
          /* ignore bad frames */
        }
      };
      es.onerror = () => {
        es?.close();
        es = null;
      };
    };

    const loadDetailRetry = async () => {
      for (let i = 0; i < 3; i++) {
        try {
          await loadDetail();
          return;
        } catch {
          if (cancelled) return;
          await new Promise((r) => setTimeout(r, 700 * (i + 1)));
        }
      }
    };

    const loadContextoRetry = async () => {
      for (let i = 0; i < 3; i++) {
        try {
          await loadContexto();
          return;
        } catch {
          if (cancelled) return;
          await new Promise((r) => setTimeout(r, 600 * (i + 1)));
        }
      }
      if (!cancelled) setRichReady(true);
    };

    const tickP = loadTick().then(() => startSse());
    const detailP = loadDetailRetry();
    void loadContextoRetry();
    void Promise.allSettled([tickP, detailP]).then((results) => {
      if (cancelled) return;
      if (results.every((r) => r.status === 'rejected')) setError(true);
    });

    const stop = startLivePoll(
      () => {
        if (es && pace === 'live') return; // SSE owns live updates
        if (pace === 'live') void loadTick().catch(() => loadDetail());
        else void loadDetail().catch(() => {
          if (!cancelled) setError(true);
        });
      },
      { getPace: () => pace }
    );

    return () => {
      cancelled = true;
      es?.close();
      stop();
    };
  }, [league, id]);

  useEffect(() => {
    if (league !== 'liga-mx') {
      setTabla(null);
      return;
    }
    let cancelled = false;
    fetch('/api/ligamx/standings')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: LigaMXTable) => {
        if (!cancelled && Array.isArray(d.entries)) setTabla(d.entries);
      })
      .catch(() => {
        if (!cancelled) setTabla(null);
      });
    return () => {
      cancelled = true;
    };
  }, [league]);

  const back =
    league === 'leagues-cup'
      ? '/leagues-cup'
      : league === 'liga-mx' || league === 'seleccion'
        ? '/#jornada'
        : '/';
  const backLabel =
    league === 'seleccion'
      ? 'El Tri'
      : league === 'leagues-cup'
        ? 'Leagues Cup'
        : league === 'liga-mx'
          ? 'Liga MX'
          : 'Pulso';

  const tabs = useMemo(() => {
    if (!match) return [] as { id: TabId; label: string }[];
    if (match.state === 'pre') {
      return [
        { id: 'contexto' as const, label: 'Contexto' },
        { id: 'alineacion' as const, label: 'Alineación' },
      ];
    }
    return [
      { id: 'momentos' as const, label: 'Momentos' },
      { id: 'contexto' as const, label: 'Contexto' },
      { id: 'alineacion' as const, label: 'Alineación' },
      { id: 'datos' as const, label: 'Datos' },
    ];
  }, [match]);

  if (error && !match) {
    return (
      <div className="min-h-screen bg-bg-1 text-foreground">
        <PulseNav />
        <div className="mx-auto max-w-3xl px-4 py-20 text-center">
          <p className="text-sm text-muted">No se pudo cargar el partido.</p>
          <Link href={back} className="mt-4 inline-block text-[11px] font-semibold uppercase tracking-[0.16em] text-signal">
            Volver
          </Link>
        </div>
      </div>
    );
  }

  const waitingForChapter =
    !match || !tab || (match.state === 'pre' && !richReady);

  if (waitingForChapter || !match || !tab) {
    return <MatchChapterSkeleton />;
  }

  const live = match.state === 'in';
  const pre = match.state === 'pre';
  // Leagues Cup: venue-local wall clock (matches ESPN listings). Else viewer TZ.
  const kick = kickoffCopy(match.date, match.venueTz || userTz);
  const headlines = headlineLines(match);
  const homeLines = headlines.filter((s) => s.side === 'home');
  const awayLines = headlines.filter((s) => s.side === 'away');
  const keyStats = pickKeyStats(match);
  const keyEvents = buildKeyEvents(match);
  const fullCronica = buildFullCronica(match);
  const feedRows = feed === 'clave' ? keyEvents : fullCronica;
  const homeForm = match.form?.home ?? [];
  const awayForm = match.form?.away ?? [];
  const h2h = match.headToHead;

  return (
    <div className="match-chapter" data-state={match.state}>
      <PulseNav />

      <section className="match-hero">
        <div className="match-hero-atmosphere" aria-hidden />
        <div className="match-hero-inner">
          <div className="match-hero-meta">
            <Link href={back} className="match-back">
              ← {backLabel}
            </Link>
            <div className="match-hero-meta-end">
              {league === 'leagues-cup' ? (
                <LeaguesCupMark size="sm" surface="ink" className="match-hero-lc-mark" />
              ) : null}
              {league === 'liga-mx' ? (
                <LigaMxMark size="sm" className="match-hero-lm-mark" />
              ) : null}
              <p className="af-tele match-hero-path">
                AF://CAPÍTULO
                {match.jornada ? ` · ${match.jornada}` : ''}
              </p>
            </div>
          </div>

          <h1 className="sr-only">
            {match.home.name} vs {match.away.name}
            {!pre && match.home.score != null && match.away.score != null
              ? ` ${match.home.score}-${match.away.score}`
              : ''}
            {league === 'leagues-cup'
              ? ' · Leagues Cup'
              : league === 'liga-mx'
                ? ' · Liga MX'
                : league === 'seleccion'
                  ? ' · El Tri'
                  : ''}
          </h1>
          <p className="match-chapter-kicker" aria-hidden>
            {chapterKicker(match)}
          </p>

          <div className="match-scoreboard">
            <div className="match-side">
              <div className="match-side-mark">
                <ClubLogo
                  abbr={match.home.abbreviation}
                  clubId={match.home.id}
                  name={match.home.name}
                  logoUrl={match.home.logo}
                  size="xl"
                  className="match-crest"
                />
                <p className="match-abbr" title={match.home.name}>
                  {match.home.abbreviation}
                </p>
              </div>
              <p className="match-club" title={match.home.name}>
                {match.home.name}
              </p>
              {!pre && homeLines.length > 0 && (
                <ul className="match-scorers">
                  {homeLines.map((s) => (
                    <li key={s.id}>
                      {s.name} {s.clock}
                      {s.tag ? ` · ${s.tag}` : ''}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="match-score-center">
              <p className={`match-status ${live ? 'is-live' : ''}`}>
                {live && <span className="match-live-dot" aria-hidden />}
                {statusCopy(match)}
              </p>
              {pre ? (
                <>
                  <p className="match-kick-time">{kick.time || 'VS'}</p>
                  <p className="match-kick-day">{kick.day}</p>
                </>
              ) : (
                <p className="match-score" data-testid="match-score">
                  <span>{match.home.score ?? 0}</span>
                  <span className="match-score-sep">–</span>
                  <span>{match.away.score ?? 0}</span>
                </p>
              )}
              {(match.venue || match.city) && (
                <p className="match-venue">{[match.venue, match.city].filter(Boolean).join(' · ')}</p>
              )}
            </div>

            <div className="match-side match-side-away">
              <div className="match-side-mark">
                <ClubLogo
                  abbr={match.away.abbreviation}
                  clubId={match.away.id}
                  name={match.away.name}
                  logoUrl={match.away.logo}
                  size="xl"
                  className="match-crest"
                />
                <p className="match-abbr" title={match.away.name}>
                  {match.away.abbreviation}
                </p>
              </div>
              <p className="match-club" title={match.away.name}>
                {match.away.name}
              </p>
              {!pre && awayLines.length > 0 && (
                <ul className="match-scorers">
                  {awayLines.map((s) => (
                    <li key={s.id}>
                      {s.name} {s.clock}
                      {s.tag ? ` · ${s.tag}` : ''}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {(homeForm.length > 0 || awayForm.length > 0 || (h2h && h2h.played > 0)) && (
            <div className="match-form-strip" aria-label="Forma y cara a cara">
              {(homeForm.length > 0 || awayForm.length > 0) && (
                <>
                  <p className="af-tele match-form-strip-label">
                    <span className="match-form-strip-label-full">Últimos 5 · G ganó · E empató · P perdió</span>
                    <span className="match-form-strip-label-short">Últimos 5 · G / E / P</span>
                  </p>
                  <FormRow label={match.home.abbreviation} abbr={match.home.abbreviation} form={homeForm} />
                  <FormRow label={match.away.abbreviation} abbr={match.away.abbreviation} form={awayForm} />
                </>
              )}
              {h2h && h2h.played > 0 && (
                <button
                  type="button"
                  className="match-h2h-tease"
                  onClick={() => setTab('contexto')}
                >
                  <span className="af-tele">Cara a cara</span>
                  <span className="match-h2h-tease-score">
                    {match.home.abbreviation} {h2h.homeWins} · {h2h.draws}E · {h2h.awayWins}{' '}
                    {match.away.abbreviation}
                  </span>
                  <span className="match-h2h-tease-more">Ver historial →</span>
                </button>
              )}
            </div>
          )}

          <div className="match-hero-actions">
            <div className="match-donde">
              <p className="af-tele">Dónde ver · MX ↔ US</p>
              <BroadcastChannels
                mx={match.dondeVer?.mxChannels}
                us={match.dondeVer?.usChannels}
                mxLabel={match.dondeVer?.mx ?? 'Streaming / TV local'}
                usLabel={match.dondeVer?.us ?? 'TUDN · ViX'}
                surface="ink"
                compact
              />
            </div>
            <MatchShare match={match} league={league} />
          </div>
        </div>
      </section>

      {!pre && keyStats.length > 0 && (
        <section className="match-pulse" aria-label="Datos clave">
          <div className="match-pulse-inner">
            {keyStats.slice(0, 4).map((s) => {
              const total = s.homeNum + s.awayNum || 1;
              const homePct = Math.round((s.homeNum / total) * 100);
              return (
                <div key={s.key} className="match-pulse-stat">
                  <div className="match-pulse-head">
                    <span className="tabular-nums">{s.home}</span>
                    <span>{s.label}</span>
                    <span className="tabular-nums">{s.away}</span>
                  </div>
                  <div className="match-pulse-bar" aria-hidden>
                    <i style={{ width: `${homePct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="match-body">
        <div className="match-tabs" role="tablist" aria-label="Capítulo">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={['match-tab', tab === t.id ? 'is-active' : ''].filter(Boolean).join(' ')}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="match-panel">
          {tab === 'contexto' && (
            <div className={['match-contexto', tabla?.length ? 'has-tabla' : ''].filter(Boolean).join(' ')}>
              <div className="match-contexto-main">
                {h2h && h2h.meetings.length > 0 && (
                  <H2HBlock
                    h2h={h2h}
                    homeAbbr={match.home.abbreviation}
                    awayAbbr={match.away.abbreviation}
                    tz={userTz}
                  />
                )}

                {(homeForm.length > 0 || awayForm.length > 0) && (
                  <section className="match-form-section">
                    <p className="af-tele match-contexto-label">Forma · últimos 5</p>
                    <div className="match-form-panels">
                      <FormDetail side={match.home.abbreviation} form={homeForm} />
                      <FormDetail side={match.away.abbreviation} form={awayForm} />
                    </div>
                  </section>
                )}

                {!h2h?.meetings.length && homeForm.length === 0 && awayForm.length === 0 && (
                  <p className="match-empty">
                    {richReady
                      ? 'Sin historial ni forma aún para este duelo.'
                      : 'Cargando forma y cara a cara…'}
                  </p>
                )}
              </div>

              {tabla && tabla.length > 0 && (
                <MatchTabla
                  entries={tabla}
                  homeAbbr={match.home.abbreviation}
                  awayAbbr={match.away.abbreviation}
                />
              )}
            </div>
          )}

          {tab === 'momentos' && (
            <div className="match-momentos match-momentos-single">
              <section className="match-timeline-block">
                <div className="match-feed-head">
                  <p className="af-kicker">
                    <span className="af-tele">Crónica</span>
                  </p>
                  <div className="match-feed-filters" role="group" aria-label="Filtro de crónica">
                    <button
                      type="button"
                      className={feed === 'clave' ? 'is-active' : undefined}
                      onClick={() => setFeed('clave')}
                    >
                      Clave
                    </button>
                    <button
                      type="button"
                      className={feed === 'completa' ? 'is-active' : undefined}
                      onClick={() => setFeed('completa')}
                    >
                      Completa
                    </button>
                  </div>
                </div>
                <p className="match-feed-hint">
                  {feed === 'clave'
                    ? 'Goles, tarjetas, cambios y VAR.'
                    : 'Narración completa del partido.'}
                </p>
                {feedRows.length === 0 ? (
                  <p className="match-empty">Sin crónica aún. Vuelve cuando arranque el partido.</p>
                ) : (
                  <ul className="match-timeline">
                    {feedRows.map((row) => (
                      <li
                        key={row.id}
                        className={[
                          row.peak ? 'is-peak' : '',
                          row.kind === 'card' && row.label === 'Roja' ? 'is-red' : '',
                          `is-${row.kind}`,
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        <span className="match-timeline-clock">{row.clock || '·'}</span>
                        <span className="match-timeline-body">
                          <span className="match-timeline-meta">
                            {row.label ? <span className="match-event-tag">{row.label}</span> : null}
                            {row.teamAbbr ? <span className="match-event-team">{row.teamAbbr}</span> : null}
                          </span>
                          <span className="match-timeline-text">{row.text}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}

          {tab === 'alineacion' && (
            <section className="match-lineups">
              <p className="af-kicker">
                <span className="af-tele">Alineaciones</span>
              </p>
              {match.referee && (
                <p className="match-referee-inline">
                  Árbitro · <strong>{match.referee}</strong>
                </p>
              )}
              {(match.lineups ?? []).length === 0 ? (
                <p className="match-empty">
                  {pre
                    ? 'Alineaciones cuando el club confirme. Mientras tanto, revisa el contexto.'
                    : 'Alineaciones no disponibles.'}
                </p>
              ) : (
                <div className="match-lineup-grid">
                  {(match.lineups ?? []).map((t) => (
                    <LineupSide key={t.side} team={t} />
                  ))}
                </div>
              )}
            </section>
          )}

          {tab === 'datos' && <DatosPanel match={match} keyStats={keyStats} />}
        </div>
      </div>
    </div>
  );
}
