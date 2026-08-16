'use client';

import { useMemo } from 'react';
import { ClubLogo } from '@/components/brand/ClubLogo';
import { useQuiniela } from '@/lib/client/useQuiniela';
import type { Outcome, QuinielaBoard as Board, QuinielaMatch } from '@/lib/quiniela/types';

const OUTCOMES: readonly Outcome[] = ['1', 'X', '2'];

function kickoffLabel(iso: string): string {
  try {
    return new Intl.DateTimeFormat('es-MX', {
      weekday: 'short',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'America/Mexico_City',
    }).format(new Date(iso));
  } catch {
    return '';
  }
}

function metaLine(m: QuinielaMatch): string {
  const h = m.home.score ?? 0;
  const a = m.away.score ?? 0;
  if (m.state === 'post') return `Final · ${h}-${a}`;
  if (m.state === 'in') return `En vivo · ${h}-${a}`;
  return kickoffLabel(m.date);
}

function Row({
  m,
  pick,
  onPick,
}: {
  m: QuinielaMatch;
  pick: Outcome | undefined;
  onPick: (id: string, o: Outcome) => void;
}) {
  const result = m.result;
  return (
    <li className={['q-row', m.locked ? 'q-row-locked' : ''].filter(Boolean).join(' ')}>
      <div className="q-team q-team-home">
        <span className="q-abbr">{m.home.abbr}</span>
        <ClubLogo abbr={m.home.abbr} clubId={m.home.clubId} name={m.home.name} logoUrl={m.home.logo} size="sm" />
      </div>

      <div className="q-pick" role="group" aria-label={`${m.home.abbr} vs ${m.away.abbr}`}>
        {OUTCOMES.map((o) => {
          const on = pick === o;
          const isWin = Boolean(on && result === o);
          const isMiss = Boolean(on && result != null && result !== o);
          const isResult = Boolean(!on && result === o);
          return (
            <button
              key={o}
              type="button"
              disabled={m.locked}
              onClick={() => onPick(m.id, o)}
              className={[
                'q-opt',
                on ? 'q-opt-on' : '',
                isWin ? 'q-opt-win' : '',
                isMiss ? 'q-opt-miss' : '',
                isResult ? 'q-opt-result' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-pressed={on}
            >
              {o}
            </button>
          );
        })}
      </div>

      <div className="q-team q-team-away">
        <ClubLogo abbr={m.away.abbr} clubId={m.away.clubId} name={m.away.name} logoUrl={m.away.logo} size="sm" />
        <span className="q-abbr">{m.away.abbr}</span>
      </div>

      <p className="q-meta">{metaLine(m)}</p>
    </li>
  );
}

export function QuinielaBoard({ initial = null }: { initial?: Board | null }) {
  const q = useQuiniela(initial);
  const { board, leaderboard, mine, draft, name, setName, setPick, save, saving, dirtyCount } = q;

  const completed = useMemo(
    () => (board ? board.matches.filter((m) => draft[m.id]).length : 0),
    [board, draft]
  );

  if (!board) {
    return (
      <p className="mt-8 border border-line bg-bg-2 p-5 font-mono text-[12px] leading-6 text-muted">
        La quiniela abre cuando se define la próxima jornada. Vuelve pronto.
      </p>
    );
  }

  const openMatches = board.matches.filter((m) => !m.locked).length;
  const missedFinals = board.matches.filter((m) => m.result && !draft[m.id]).length;

  return (
    <div className="mt-8">
      <div className="q-headline">
        <label className="q-name">
          <span className="af-tele text-muted">Tu alias</span>
          <input
            type="text"
            value={name}
            maxLength={24}
            onChange={(e) => setName(e.target.value)}
            placeholder="Anónimo"
            className="q-name-input"
          />
        </label>
        <div className="q-score">
          <span className="q-score-num">{mine?.points ?? 0}</span>
          <span className="af-tele text-muted">
            aciertos · {mine?.played ?? 0}/{board.finals} definidos
          </span>
        </div>
      </div>

      <p className="mt-3 font-mono text-[11px] leading-5 text-muted">
        {completed}/{board.total} marcados
        {missedFinals > 0
          ? ` · ${missedFinals} ya cerrados (no suman: se cierran al arranque)`
          : ''}
        {openMatches > 0
          ? ` · ${openMatches} abiertos`
          : ' · jornada cerrada'}
      </p>

      <ol className="q-list mt-4">
        {board.matches.map((m) => (
          <Row key={m.id} m={m} pick={draft[m.id]} onPick={setPick} />
        ))}
      </ol>

      <div className="q-savebar">
        <button
          type="button"
          className="af-cta"
          onClick={() => void save()}
          disabled={saving || dirtyCount === 0}
        >
          {saving ? 'Guardando…' : dirtyCount ? `Guardar (${dirtyCount})` : 'Guardado'}
        </button>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
          {board.jornadaLabel}
        </span>
      </div>

      <section className="mt-12">
        <p className="af-tele text-foreground">
          <span className="text-signal">AF</span>
          ://TABLA
        </p>
        <h2 className="mt-2 font-display text-2xl font-bold uppercase tracking-wide">
          Quinieleros
        </h2>
        {leaderboard && leaderboard.rows.length ? (
          <div className="lead-board mt-3">
            {leaderboard.rows.slice(0, 20).map((r, i) => (
              <div
                key={r.userId}
                className={['q-lead-row', i === 0 ? 'lead-row-top' : ''].filter(Boolean).join(' ')}
              >
                <span className="lead-rank">{i + 1}</span>
                <span className="q-lead-name">{r.name}</span>
                <span className="q-lead-meta af-tele text-muted">
                  {r.played}/{board.finals} def.
                </span>
                <span className="lead-val">{r.points}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 border border-line bg-bg-2 p-4 font-mono text-[12px] leading-6 text-muted">
            Sé el primero en llenar la quiniela de esta jornada.
          </p>
        )}
      </section>
    </div>
  );
}
