'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { trackClient } from '@/lib/analytics/trackClient';
import { missingOpenPicks } from '@/lib/quiniela/card';
import { adoptLeaderboard } from '@/lib/quiniela/leaderboard';
import { sanitizeName } from '@/lib/quiniela/name';
import type { Outcome, QuinielaBoard, QuinielaLeaderboard, SeasonView } from '@/lib/quiniela/types';

const ID_KEY = 'af-quiniela-id';
const NAME_KEY = 'af-quiniela-name';
/** Last jornada number the user saved a card for — powers return / retention events. */
const LAST_JORNADA_KEY = 'af-quiniela-last-jornada';

type Mine = { picks: Record<string, Outcome>; points: number; played: number; count: number };

function makeId(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID().replace(/-/g, '');
    }
  } catch {
    /* ignore */
  }
  return `af${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

function readId(): string {
  try {
    const cur = localStorage.getItem(ID_KEY);
    if (cur && cur.length >= 8) return cur;
    const next = makeId();
    localStorage.setItem(ID_KEY, next);
    return next;
  } catch {
    return makeId();
  }
}

export function useQuiniela(
  initialBoard: QuinielaBoard | null = null,
  initialLeaderboard: QuinielaLeaderboard | null = null
) {
  const [board, setBoard] = useState<QuinielaBoard | null>(initialBoard);
  const [leaderboard, setLeaderboard] = useState<QuinielaLeaderboard | null>(initialLeaderboard);
  const [saved, setSaved] = useState<Record<string, Outcome>>({});
  const [draft, setDraft] = useState<Record<string, Outcome>>({});
  const [mine, setMine] = useState<Mine | null>(null);
  const [name, setName] = useState('');
  const [savedName, setSavedName] = useState('');
  const [loading, setLoading] = useState(!initialBoard);
  const [saving, setSaving] = useState(false);
  const [account, setAccount] = useState<{ email: string } | null>(null);
  const [season, setSeason] = useState<SeasonView | null>(null);
  const [linkStatus, setLinkStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [rankingReady, setRankingReady] = useState(initialLeaderboard != null);
  const idRef = useRef<string>('');
  const loadGenRef = useRef(0);
  // Analytics guards — each keyed by the jornada it last fired for so a roll re-arms.
  const lastSavedJornadaRef = useRef<number | null>(null);
  const viewFiredRef = useRef<number | null>(null);
  const cardStartFiredRef = useRef<number | null>(null);
  const nameFiredRef = useRef<number | null>(null);

  useEffect(() => {
    // Adopt an accountId handed back by the magic-link verify redirect, then
    // strip it from the URL so it isn't left in history / shared links.
    try {
      const params = new URLSearchParams(window.location.search);
      const claimed = params.get('account');
      if (claimed && /^[A-Za-z0-9_-]{8,64}$/.test(claimed)) {
        localStorage.setItem(ID_KEY, claimed);
        params.delete('account');
        const qs = params.toString();
        window.history.replaceState(
          null,
          '',
          `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`
        );
      }
    } catch {
      /* ignore */
    }
    idRef.current = readId();
    try {
      const stored = sanitizeName(localStorage.getItem(NAME_KEY) ?? '') ?? '';
      setName(stored);
      setSavedName(stored);
    } catch {
      /* ignore */
    }
    try {
      const raw = Number(localStorage.getItem(LAST_JORNADA_KEY));
      lastSavedJornadaRef.current = Number.isFinite(raw) && raw > 0 ? raw : null;
    } catch {
      /* ignore */
    }
  }, []);

  // Top of funnel + jornada-over-jornada retention cohort: fire once per jornada.
  useEffect(() => {
    const jn = board?.jornadaNumber;
    if (jn == null || viewFiredRef.current === jn) return;
    viewFiredRef.current = jn;
    const last = lastSavedJornadaRef.current;
    const returning = last != null && last < jn;
    trackClient('Quiniela view', {
      jornada: jn,
      returning,
      gap: returning && last != null ? jn - last : 0,
    });
  }, [board?.jornadaNumber]);

  const applyServer = useCallback(
    (data: {
      board?: QuinielaBoard;
      leaderboard?: QuinielaLeaderboard | null;
      mine?: Mine | null;
      account?: { email: string } | null;
      season?: SeasonView | null;
    }) => {
      if (data.board) setBoard(data.board);
      setLeaderboard((prev) => adoptLeaderboard(prev, data.leaderboard));
      if (data.mine) {
        setMine(data.mine);
        setSaved(data.mine.picks);
        // Keep any unsaved draft edits the user has in flight.
        setDraft((d) => ({ ...data.mine!.picks, ...d }));
      }
      if ('account' in data) setAccount(data.account ?? null);
      if ('season' in data) setSeason(data.season ?? null);
    },
    []
  );

  const requestMagicLink = useCallback(
    async (rawEmail: string) => {
      const email = rawEmail.trim();
      if (!email || linkStatus === 'sending') return;
      setLinkStatus('sending');
      try {
        const res = await fetch('/api/quiniela/auth/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, anonId: idRef.current || readId() }),
        });
        setLinkStatus(res.ok ? 'sent' : 'error');
        if (res.ok) trackClient('Quiniela link requested');
      } catch {
        setLinkStatus('error');
      }
    },
    [linkStatus]
  );

  const load = useCallback(async () => {
    const id = idRef.current || readId();
    const gen = ++loadGenRef.current;
    try {
      const res = await fetch(`/api/quiniela?u=${encodeURIComponent(id)}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (gen !== loadGenRef.current) return;
      applyServer(data);
    } catch {
      /* ignore */
    } finally {
      if (gen === loadGenRef.current) {
        setLoading(false);
        setRankingReady(true);
      }
    }
  }, [applyServer]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(id);
  }, [load]);

  const setPick = useCallback(
    (matchId: string, outcome: Outcome) => {
      const locked = board?.matches.find((m) => m.id === matchId)?.locked;
      if (locked) return;
      const jn = board?.jornadaNumber;
      // Card start = the user's first fresh pick on a jornada they haven't saved yet.
      if (jn != null && cardStartFiredRef.current !== jn && (mine?.count ?? 0) === 0) {
        cardStartFiredRef.current = jn;
        trackClient('Quiniela card start', { jornada: jn });
      }
      setDraft((d) => ({ ...d, [matchId]: outcome }));
    },
    [board, mine]
  );

  // User-typed name reaching a valid value (restore-from-storage uses the raw setter).
  const handleSetName = useCallback(
    (v: string) => {
      setName(v);
      const jn = board?.jornadaNumber;
      if (jn == null || nameFiredRef.current === jn) return;
      if (sanitizeName(v)) {
        nameFiredRef.current = jn;
        trackClient('Quiniela name set', { jornada: jn });
      }
    },
    [board?.jornadaNumber]
  );

  const dirtyIds = useMemo(() => {
    const ids: string[] = [];
    for (const [id, pick] of Object.entries(draft)) {
      if (saved[id] !== pick) ids.push(id);
    }
    return ids;
  }, [draft, saved]);

  const missingIds = useMemo(
    () => (board ? missingOpenPicks(board.matches, draft) : []),
    [board, draft]
  );
  const cardFull = missingIds.length === 0;

  const named = Boolean(sanitizeName(name));
  const nameDirty = (sanitizeName(name) ?? '') !== savedName;

  const save = useCallback(async () => {
    const display = sanitizeName(name);
    if (!display || saving) return;
    if (!cardFull) return;
    if (!dirtyIds.length && display === savedName) return;
    setSaving(true);
    const id = idRef.current || readId();
    const openIds = (board?.matches ?? []).filter((m) => !m.locked).map((m) => m.id);
    const payload = Object.fromEntries(
      openIds.filter((mid) => draft[mid]).map((mid) => [mid, draft[mid]])
    );
    try {
      try {
        localStorage.setItem(NAME_KEY, display);
      } catch {
        /* ignore */
      }
      const res = await fetch('/api/quiniela/pick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: id, name: display, picks: payload }),
      });
      if (res.ok) {
        applyServer(await res.json());
        setSavedName(display);
        const jn = board?.jornadaNumber ?? null;
        if (jn != null) {
          const last = lastSavedJornadaRef.current;
          if (last != null && last < jn) {
            trackClient('Quiniela return', { jornada: jn, gap: jn - last });
          }
          lastSavedJornadaRef.current = jn;
          try {
            localStorage.setItem(LAST_JORNADA_KEY, String(jn));
          } catch {
            /* ignore */
          }
        }
      }
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  }, [board, cardFull, dirtyIds, draft, name, savedName, saving, applyServer]);

  return {
    board,
    leaderboard,
    mine,
    draft,
    saved,
    name,
    setName: handleSetName,
    named,
    setPick,
    save,
    saving,
    loading,
    dirtyCount: dirtyIds.length,
    missingCount: missingIds.length,
    missingIds,
    cardFull,
    canSave:
      named &&
      cardFull &&
      (dirtyIds.length > 0 || (nameDirty && Object.keys(saved).length > 0)),
    userId: idRef.current,
    account,
    season,
    signedIn: Boolean(account?.email),
    requestMagicLink,
    linkStatus,
    rankingReady,
  };
}
