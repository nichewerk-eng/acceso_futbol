'use client';

import { useEffect, useRef, useState } from 'react';
import { ClubLogo } from '@/components/brand/ClubLogo';
import { useQuiniela } from '@/lib/client/useQuiniela';
import type { Outcome, QuinielaBoard as Board, QuinielaMatch } from '@/lib/quiniela/types';

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

function optClass(on: boolean, result: Outcome | null, o: Outcome): string {
  const isWin = Boolean(on && result === o);
  const isMiss = Boolean(on && result != null && result !== o);
  const isResult = Boolean(!on && result === o);
  return [
    'q-opt',
    on ? 'q-opt-on' : '',
    isWin ? 'q-opt-win' : '',
    isMiss ? 'q-opt-miss' : '',
    isResult ? 'q-opt-result' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

function Row({
  m,
  pick,
  onPick,
  flag = false,
}: {
  m: QuinielaMatch;
  pick: Outcome | undefined;
  onPick: (id: string, o: Outcome) => void;
  flag?: boolean;
}) {
  const result = m.result;
  return (
    <li
      className={['q-row', m.locked ? 'q-row-locked' : '', flag ? 'q-row-need' : '']
        .filter(Boolean)
        .join(' ')}
    >
      <p className="q-meta">{metaLine(m)}</p>
      <div className="q-pick" role="group" aria-label={`${m.home.name} contra ${m.away.name}`}>
        <button
          type="button"
          disabled={m.locked}
          onClick={() => onPick(m.id, '1')}
          className={`${optClass(pick === '1', result, '1')} q-opt-side`}
          aria-pressed={pick === '1'}
          aria-label={`Gana ${m.home.name}`}
        >
          <ClubLogo
            abbr={m.home.abbr}
            clubId={m.home.clubId}
            name={m.home.name}
            logoUrl={m.home.logo}
            size="sm"
          />
          <span className="q-abbr">{m.home.abbr}</span>
        </button>
        <button
          type="button"
          disabled={m.locked}
          onClick={() => onPick(m.id, 'X')}
          className={`${optClass(pick === 'X', result, 'X')} q-opt-draw`}
          aria-pressed={pick === 'X'}
          aria-label="Empate"
        >
          Empate
        </button>
        <button
          type="button"
          disabled={m.locked}
          onClick={() => onPick(m.id, '2')}
          className={`${optClass(pick === '2', result, '2')} q-opt-side`}
          aria-pressed={pick === '2'}
          aria-label={`Gana ${m.away.name}`}
        >
          <ClubLogo
            abbr={m.away.abbr}
            clubId={m.away.clubId}
            name={m.away.name}
            logoUrl={m.away.logo}
            size="sm"
          />
          <span className="q-abbr">{m.away.abbr}</span>
        </button>
      </div>
    </li>
  );
}

export function QuinielaBoard({ initial = null }: { initial?: Board | null }) {
  const q = useQuiniela(initial);
  const {
    board,
    leaderboard,
    mine,
    draft,
    name,
    setName,
    named,
    setPick,
    save,
    saving,
    dirtyCount,
    missingCount,
    missingIds,
    cardFull,
    canSave,
  } = q;
  const nameRef = useRef<HTMLInputElement>(null);
  const [needName, setNeedName] = useState(false);
  const [needCard, setNeedCard] = useState(false);

  useEffect(() => {
    if (named) setNeedName(false);
  }, [named]);

  useEffect(() => {
    if (cardFull) setNeedCard(false);
  }, [cardFull]);

  useEffect(() => {
    if (!needCard) return;
    document.querySelector('.q-row-need')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [needCard, missingIds]);

  if (!board) {
    return (
      <p className="mt-8 border border-line bg-bg-2 p-5 font-mono text-[12px] leading-6 text-muted">
        La quiniela abre cuando se define la próxima jornada. Vuelve pronto.
      </p>
    );
  }

  return (
    <div className="mt-8">
      <div className="q-headline">
        <label className="q-name">
          <span className="af-tele text-muted">Tu nombre en la tabla</span>
          <input
            ref={nameRef}
            id="q-name"
            type="text"
            value={name}
            maxLength={24}
            required
            aria-required="true"
            aria-invalid={needName}
            aria-describedby={needName ? 'q-name-alert' : undefined}
            autoComplete="nickname"
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu apodo"
            className={['q-name-input', named ? '' : 'is-need'].filter(Boolean).join(' ')}
          />
          {needName ? (
            <p id="q-name-alert" className="q-name-alert" role="alert">
              Pon un nombre para guardar tu quiniela. No vale Anónimo.
            </p>
          ) : named ? null : (
            <span className="q-name-hint">Obligatorio · no vale Anónimo.</span>
          )}
        </label>
        <div className="q-score">
          <span className="q-score-num">
            {mine?.points ?? 0}
            <span className="q-score-of">/{board.total}</span>
          </span>
          <span className="q-score-label">
            {mine?.points ?? 0} {(mine?.points ?? 0) === 1 ? 'acierto' : 'aciertos'}
            {' · '}
            de {board.finals} {board.finals === 1 ? 'partido terminado' : 'partidos terminados'}
          </span>
        </div>
      </div>

      <ol className="q-list">
        {board.matches.map((m) => (
          <Row
            key={m.id}
            m={m}
            pick={draft[m.id]}
            onPick={setPick}
            flag={needCard && missingIds.includes(m.id)}
          />
        ))}
      </ol>

      <div className="q-savebar">
        <button
          type="button"
          className="af-cta"
          onClick={() => {
            if (!named) {
              setNeedName(true);
              nameRef.current?.focus();
              nameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              return;
            }
            if (!cardFull) {
              setNeedCard(true);
              return;
            }
            void save();
          }}
          disabled={saving || (named && cardFull && !canSave)}
        >
          {saving
            ? 'Guardando…'
            : named && cardFull && !canSave
              ? 'Guardado'
              : dirtyCount
                ? `Guardar (${dirtyCount})`
                : !named
                  ? 'Pon un nombre'
                  : !cardFull
                    ? 'Llena la jornada'
                    : 'Guardar nombre'}
        </button>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
          {board.jornadaLabel}
        </span>
      </div>
      {needCard ? (
        <p className="q-name-alert mt-3" role="alert">
          {missingCount === 1
            ? 'Te falta 1 partido para guardar la quiniela.'
            : `Llena todos los partidos abiertos. Te faltan ${missingCount}.`}
        </p>
      ) : null}

      <section className="mt-12">
        <p className="af-tele text-foreground">
          <span className="text-signal">AF</span>
          ://TABLA
        </p>
        <h2 className="mt-2 font-display text-2xl font-bold uppercase tracking-wide">
          Quién va ganando
        </h2>
        {board.finals > 0 ? (
          <p className="q-lead-progress">
            {board.finals}/{board.total} cerrados
          </p>
        ) : null}
        {leaderboard && leaderboard.rows.length ? (
          <div className="lead-board mt-3">
            {leaderboard.rows.slice(0, 20).map((r, i) => (
              <div
                key={r.userId}
                className={['q-lead-row', i === 0 ? 'lead-row-top' : ''].filter(Boolean).join(' ')}
              >
                <span className="lead-rank">{i + 1}</span>
                <span className="q-lead-name">{r.name}</span>
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
