'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { BroadcastChannels } from '@/components/brand/BroadcastChannels';
import { ClubLogo } from '@/components/brand/ClubLogo';
import { PulseNav } from '@/components/living-room/PulseNav';
import { RadioCompanion } from '@/components/radio/RadioCompanion';
import type {
  FormMatch,
  FormResult,
  HeadToHeadSummary,
  MatchSnapshot,
  TeamLineup,
} from '@/lib/sports';
import { localizeStatus } from '@/lib/sports/localizeEs';

type Props = { league: string; id: string };
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
        clock: c.minute !== undefined && c.minute !== null ? `${c.minute}'` : '',
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
    return match.clock ? `En vivo · ${match.clock}` : 'En vivo';
  }
  return localizeStatus(match.statusLabel, match.state);
}

function kickoffCopy(iso: string): { day: string; time: string } {
  try {
    const d = new Date(iso);
    return {
      day: d.toLocaleDateString('es-MX', {
        timeZone: 'America/Mexico_City',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }),
      time: d.toLocaleTimeString('es-MX', {
        timeZone: 'America/Mexico_City',
        hour: 'numeric',
        minute: '2-digit',
      }),
    };
  } catch {
    return { day: '', time: '' };
  }
}

function formatMeetingDay(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-MX', {
      timeZone: 'America/Mexico_City',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
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
      <p className="af-tele">{side}</p>
      <ul>
        {form.map((f) => (
          <li key={f.id}>
            <span className={`match-form-mark is-${f.result.toLowerCase()}`}>
              {FORM_LETTER[f.result]}
            </span>
            <span className="match-form-detail-score">
              {f.playedHome
                ? `${side} ${f.homeScore}–${f.awayScore} ${f.opponentAbbr}`
                : `${f.opponentAbbr} ${f.homeScore}–${f.awayScore} ${side}`}
            </span>
            <span className="match-form-detail-day">{formatMeetingDay(f.date)}</span>
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
}: {
  h2h: HeadToHeadSummary;
  homeAbbr: string;
  awayAbbr: string;
}) {
  const total = h2h.homeWins + h2h.draws + h2h.awayWins || 1;
  return (
    <section className="match-h2h">
      <p className="af-kicker">
        <span className="af-tele">Cara a cara</span>
      </p>
      <p className="match-h2h-record">
        <span>
          <strong>{h2h.homeWins}</strong> {homeAbbr}
        </span>
        <span className="match-h2h-draws">
          <strong>{h2h.draws}</strong> empates
        </span>
        <span>
          <strong>{h2h.awayWins}</strong> {awayAbbr}
        </span>
      </p>
      <div className="match-h2h-bar" aria-hidden>
        <i className="is-home" style={{ width: `${(h2h.homeWins / total) * 100}%` }} />
        <i className="is-draw" style={{ width: `${(h2h.draws / total) * 100}%` }} />
        <i className="is-away" style={{ width: `${(h2h.awayWins / total) * 100}%` }} />
      </div>
      <ul className="match-h2h-list">
        {h2h.meetings.slice(0, 5).map((m) => (
          <li key={m.id}>
            <span className="match-h2h-day">{formatMeetingDay(m.date)}</span>
            <span className="match-h2h-score">
              {m.homeAbbr} {m.homeScore}–{m.awayScore} {m.awayAbbr}
            </span>
          </li>
        ))}
      </ul>
    </section>
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

export function MatchChapter({ league, id }: Props) {
  const [match, setMatch] = useState<MatchSnapshot | null>(null);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<TabId | null>(null);
  const [feed, setFeed] = useState<FeedFilter>('clave');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const q = new URLSearchParams(window.location.search);
    if (q.get('tab') === 'radio' || window.location.hash === '#radio') {
      setTab('radio');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetch(`/api/sports/match/${league}/${id}`)
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((d: MatchSnapshot) => {
          if (!cancelled) {
            setMatch(d);
            setError(false);
            setTab((prev) => {
              if (prev) return prev;
              return d.state === 'pre' ? 'contexto' : 'momentos';
            });
          }
        })
        .catch(() => {
          if (!cancelled) setError(true);
        });
    };
    load();
    const t = setInterval(load, 15_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [league, id]);

  const back = league === 'liga-mx' || league === 'seleccion' ? '/#hoy' : '/';
  const backLabel = league === 'seleccion' ? 'El Tri' : league === 'liga-mx' ? 'Liga MX' : 'Pulso';

  const tabs = useMemo(() => {
    if (!match) return [] as { id: TabId; label: string }[];
    if (match.state === 'pre') {
      return [
        { id: 'contexto' as const, label: 'Contexto' },
        { id: 'alineacion' as const, label: 'Alineación' },
        { id: 'radio' as const, label: 'Radio' },
      ];
    }
    return [
      { id: 'momentos' as const, label: 'Momentos' },
      { id: 'contexto' as const, label: 'Contexto' },
      { id: 'alineacion' as const, label: 'Alineación' },
      { id: 'datos' as const, label: 'Datos' },
      { id: 'radio' as const, label: 'Radio' },
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

  if (!match || !tab) {
    return (
      <div className="match-chapter match-chapter-loading">
        <PulseNav />
        <div className="match-loading-copy">
          <p className="af-tele">AF://CAPÍTULO</p>
          <p className="mt-3 font-display text-2xl uppercase tracking-wide">Abriendo cabina…</p>
        </div>
      </div>
    );
  }

  const live = match.state === 'in';
  const pre = match.state === 'pre';
  const kick = kickoffCopy(match.date);
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
            <p className="af-tele match-hero-path">
              AF://CAPÍTULO
              {match.jornada ? ` · ${match.jornada}` : ''}
              {league === 'liga-mx' ? ' · Liga MX' : ''}
            </p>
          </div>

          <p className="match-chapter-kicker">{chapterKicker(match)}</p>

          <div className="match-scoreboard">
            <div className="match-side">
              <ClubLogo abbr={match.home.abbreviation} name={match.home.name} size="xl" className="match-crest" />
              <p className="match-club">{match.home.name}</p>
              <p className="match-abbr">{match.home.abbreviation}</p>
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
              {match.referee && <p className="match-referee">Árbitro · {match.referee}</p>}
            </div>

            <div className="match-side match-side-away">
              <ClubLogo abbr={match.away.abbreviation} name={match.away.name} size="xl" className="match-crest" />
              <p className="match-club">{match.away.name}</p>
              <p className="match-abbr">{match.away.abbreviation}</p>
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
                  <p className="af-tele match-form-strip-label">Últimos 5 · G ganó · E empató · P perdió</p>
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
                usLabel={match.dondeVer?.us ?? 'Univision · TUDN · ViX'}
                surface="ink"
                compact
              />
            </div>
            <button type="button" className="af-cta match-radio-cta" onClick={() => setTab('radio')}>
              Acceso Radio
            </button>
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
          {tab === 'radio' && <RadioCompanion league={league} matchId={id} />}

          {tab === 'contexto' && (
            <div className="match-contexto">
              <section className="match-contexto-lead">
                <p className="af-kicker">
                  <span className="af-tele">Por qué importa esta noche</span>
                </p>
                <p className="match-contexto-copy">
                  {pre
                    ? `${match.home.name} recibe a ${match.away.name}${match.venue ? ` en ${match.venue}` : ''}. Forma reciente y el historial directo, antes de que abra la cabina.`
                    : `El historial y la forma que trajeron ${match.home.abbreviation} y ${match.away.abbreviation} a este marcador.`}
                </p>
              </section>

              {h2h && h2h.meetings.length > 0 && (
                <H2HBlock h2h={h2h} homeAbbr={match.home.abbreviation} awayAbbr={match.away.abbreviation} />
              )}

              {(homeForm.length > 0 || awayForm.length > 0) && (
                <section>
                  <p className="af-kicker">
                    <span className="af-tele">Últimos cinco</span>
                  </p>
                  <div className="match-form-panels">
                    <FormDetail side={match.home.abbreviation} form={homeForm} />
                    <FormDetail side={match.away.abbreviation} form={awayForm} />
                  </div>
                </section>
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
                  <p className="match-empty">Sin crónica aún. Entra a Radio para la cabina Acceso.</p>
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
