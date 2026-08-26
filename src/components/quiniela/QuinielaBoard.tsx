'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ClubLogo } from '@/components/brand/ClubLogo';
import { useDeviceTimeZone } from '@/lib/client/useDeviceTimeZone';
import { useQuiniela } from '@/lib/client/useQuiniela';
import { dayKeyInTz, formatKickoffDay, formatKickoffTime } from '@/lib/localTime';
import type {
  LeaderRow,
  Outcome,
  QuinielaBoard as Board,
  QuinielaMatch,
  SeasonStandingRow,
} from '@/lib/quiniela/types';

function groupByDay(
  matches: QuinielaMatch[],
  tz: string
): { key: string; label: string; items: QuinielaMatch[] }[] {
  const groups: { key: string; label: string; items: QuinielaMatch[] }[] = [];
  for (const m of matches) {
    const key = dayKeyInTz(m.date, tz) || m.date.slice(0, 10);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(m);
    else groups.push({ key, label: formatKickoffDay(m.date, tz), items: [m] });
  }
  return groups;
}

function metaLine(m: QuinielaMatch, tz: string): string {
  const h = m.home.score ?? 0;
  const a = m.away.score ?? 0;
  if (m.state === 'post') return `Final · ${h}-${a}`;
  if (m.state === 'in') return `En vivo · ${h}-${a}`;
  return formatKickoffTime(m.date, tz);
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
  tz,
}: {
  m: QuinielaMatch;
  pick: Outcome | undefined;
  onPick: (id: string, o: Outcome) => void;
  flag?: boolean;
  tz: string;
}) {
  const result = m.result;
  return (
    <li
      className={['q-row', m.locked ? 'q-row-locked' : '', flag ? 'q-row-need' : '']
        .filter(Boolean)
        .join(' ')}
    >
      <p className="q-meta">{metaLine(m, tz)}</p>
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

function AccountStrip({
  signedIn,
  emailShown,
  email,
  setEmail,
  requestMagicLink,
  linkStatus,
}: {
  signedIn: boolean;
  emailShown: string | undefined;
  email: string;
  setEmail: (v: string) => void;
  requestMagicLink: (v: string) => Promise<void> | void;
  linkStatus: 'idle' | 'sending' | 'sent' | 'error';
}) {
  if (signedIn) {
    return (
      <p className="q-acct-ok">
        <span className="text-signal">✓</span> Ligada a {emailShown}
      </p>
    );
  }
  return (
    <div className="q-acct">
      <p className="q-acct-sum">¿Otro teléfono? Recupera tu racha</p>
      <p className="q-acct-copy">
        El mismo correo, un enlace, sin contraseña. Ábrelo en este dispositivo.
      </p>
      <form
        className="q-acct-form"
        onSubmit={(e) => {
          e.preventDefault();
          void requestMagicLink(email);
        }}
      >
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tucorreo@ejemplo.com"
          autoComplete="email"
          aria-label="Tu correo"
          className="q-name-input"
        />
        <button type="submit" className="af-cta af-cta-ghost" disabled={linkStatus === 'sending'}>
          {linkStatus === 'sending' ? 'Enviando…' : 'Enviar enlace'}
        </button>
      </form>
      {linkStatus === 'sent' ? (
        <p className="q-acct-note">Enlace enviado. Ábrelo aquí · 15 min.</p>
      ) : linkStatus === 'error' ? (
        <p className="q-acct-note q-acct-err">No se pudo enviar. Intenta otra vez.</p>
      ) : null}
    </div>
  );
}

function RankingTable({
  kind,
  rows,
  meId,
}: {
  kind: 'jornada' | 'apertura';
  rows: { userId: string; name: string; points: number; extra?: number }[];
  meId: string;
}) {
  return (
    <div className="lead-board q-rank">
      <div className={['q-rank-head', kind === 'apertura' ? 'q-rank-head-4' : ''].filter(Boolean).join(' ')}>
        <span>#</span>
        <span>Nombre</span>
        <span>{kind === 'apertura' ? 'Pts' : 'Aciertos'}</span>
        {kind === 'apertura' ? <span>Jgs.</span> : null}
      </div>
      {rows.map((r, i) => (
        <div
          key={r.userId || `${r.name}-${i}`}
          className={[
            kind === 'apertura' ? 'q-lead-row q-lead-row-4' : 'q-lead-row',
            i === 0 ? 'lead-row-top' : '',
            meId && r.userId === meId ? 'q-lead-me' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <span className="lead-rank">{i + 1}</span>
          <span className="q-lead-name">
            <span className="q-lead-name-text">{r.name}</span>
            {meId && r.userId === meId ? <span className="q-you">tú</span> : null}
          </span>
          <span className="lead-val">{r.points}</span>
          {kind === 'apertura' ? <span className="q-lead-extra">{r.extra ?? 0}</span> : null}
        </div>
      ))}
    </div>
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
    account,
    season,
    signedIn,
    requestMagicLink,
    linkStatus,
    userId,
  } = q;
  const me = season?.me ?? null;
  const nameRef = useRef<HTMLInputElement>(null);
  const [needName, setNeedName] = useState(false);
  const [needCard, setNeedCard] = useState(false);
  const [email, setEmail] = useState('');
  const [rankTab, setRankTab] = useState<'jornada' | 'apertura'>('jornada');
  const tz = useDeviceTimeZone();

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

  const days = useMemo(() => (board ? groupByDay(board.matches, tz) : []), [board, tz]);

  if (!board) {
    return (
      <p className="mt-8 border border-line bg-bg-2 p-5 font-mono text-[12px] leading-6 text-muted">
        La quiniela abre cuando se define la próxima jornada. Vuelve pronto.
      </p>
    );
  }

  const closed = board.holding || (board.finals === board.total && board.total > 0);
  const jornadaRows: LeaderRow[] = leaderboard?.rows.slice(0, 20) ?? [];
  const aperturaRows: SeasonStandingRow[] = season?.top ?? [];

  return (
    <div className="mt-6">
      <div className="q-headline">
        <label className="q-name">
          <span className="af-tele text-muted">Tu nombre</span>
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
              Pon un nombre para guardar. No vale Anónimo.
            </p>
          ) : named ? null : (
            <span className="q-name-hint">Obligatorio · no Anónimo</span>
          )}
        </label>
        <div className="q-score">
          <span className="q-score-num">
            {mine?.points ?? 0}
            <span className="q-score-of">/{board.total}</span>
          </span>
          <span className="q-score-label">esta jornada</span>
          {me && me.participation >= 2 ? (
            <span className="q-streak" title={`Racha de ${me.participation} jornadas seguidas`}>
              <span aria-hidden="true">🔥</span> {me.participation} jornadas
            </span>
          ) : null}
        </div>
      </div>

      {days.map((g) => (
        <div key={g.key} className="q-day">
          <p className="q-day-label">{g.label}</p>
          <ol className="q-list">
            {g.items.map((m) => (
              <Row
                key={m.id}
                m={m}
                pick={draft[m.id]}
                onPick={setPick}
                flag={needCard && missingIds.includes(m.id)}
                tz={tz}
              />
            ))}
          </ol>
        </div>
      ))}

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
            ? 'Te falta 1 partido para guardar.'
            : `Te faltan ${missingCount} partidos abiertos.`}
        </p>
      ) : null}

      <AccountStrip
        signedIn={signedIn}
        emailShown={account?.email}
        email={email}
        setEmail={setEmail}
        requestMagicLink={requestMagicLink}
        linkStatus={linkStatus}
      />

      <section className="q-standings">
        <div className="q-tabs" role="tablist" aria-label="Clasificación">
          <button
            type="button"
            role="tab"
            aria-selected={rankTab === 'jornada'}
            className={['q-tab', rankTab === 'jornada' ? 'q-tab-on' : ''].filter(Boolean).join(' ')}
            onClick={() => setRankTab('jornada')}
          >
            Esta jornada
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={rankTab === 'apertura'}
            className={['q-tab', rankTab === 'apertura' ? 'q-tab-on' : ''].filter(Boolean).join(' ')}
            onClick={() => setRankTab('apertura')}
          >
            Apertura
          </button>
        </div>

        {rankTab === 'jornada' ? (
          <div role="tabpanel">
            <h2 className="q-stand-title">
              {closed ? 'Quién ganó' : 'Quién va ganando'}
            </h2>
            <p className="q-stand-sub">
              {board.holding
                ? `${board.jornadaLabel} · solo estos partidos · se mantiene un día más`
                : board.finals > 0
                  ? `${board.jornadaLabel} · ${board.finals}/${board.total} cerrados · se reinicia la próxima`
                  : `${board.jornadaLabel} · un punto por partido · se reinicia la próxima`}
            </p>
            {jornadaRows.length ? (
              <RankingTable kind="jornada" rows={jornadaRows} meId={userId} />
            ) : (
              <p className="q-empty">
                {closed
                  ? 'Nadie llenó esta jornada.'
                  : 'Nadie ha llenado esta jornada. Sé el primero.'}
              </p>
            )}
          </div>
        ) : (
          <div role="tabpanel">
            <h2 className="q-stand-title">Clasificación del Apertura</h2>
            <p className="q-stand-sub">
              Puntos acumulados · cada jornada cerrada suma aquí
            </p>

            {me ? (
              <div className="q-me">
                <div className="q-me-stat">
                  <span className="q-me-k">Lugar</span>
                  <span className="q-me-v">#{me.rank}</span>
                  <span className="q-me-s">de {me.entries}</span>
                </div>
                <div className="q-me-stat">
                  <span className="q-me-k">Puntos</span>
                  <span className="q-me-v">{me.points}</span>
                  <span className="q-me-s">en el Apertura</span>
                </div>
                <div className="q-me-stat">
                  <span className="q-me-k">Racha</span>
                  <span className="q-me-v">
                    {me.participation >= 1 ? <span aria-hidden="true">🔥</span> : null}
                    {me.participation}
                  </span>
                  <span className="q-me-s">
                    {me.jornadasPlayed} {me.jornadasPlayed === 1 ? 'jornada' : 'jornadas'}
                  </span>
                </div>
              </div>
            ) : null}

            {aperturaRows.length ? (
              <RankingTable
                kind="apertura"
                rows={aperturaRows.map((r) => ({
                  userId: r.userId,
                  name: r.name,
                  points: r.points,
                  extra: r.jornadasPlayed,
                }))}
                meId={userId}
              />
            ) : (
              <p className="q-empty">
                La del Apertura se actualiza cuando cierra cada jornada. La Jornada 6 es la
                primera que cuenta.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
