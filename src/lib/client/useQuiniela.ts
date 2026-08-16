'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Outcome, QuinielaBoard, QuinielaLeaderboard } from '@/lib/quiniela/types';

const ID_KEY = 'af-quiniela-id';
const NAME_KEY = 'af-quiniela-name';

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

export function useQuiniela(initialBoard: QuinielaBoard | null = null) {
  const [board, setBoard] = useState<QuinielaBoard | null>(initialBoard);
  const [leaderboard, setLeaderboard] = useState<QuinielaLeaderboard | null>(null);
  const [saved, setSaved] = useState<Record<string, Outcome>>({});
  const [draft, setDraft] = useState<Record<string, Outcome>>({});
  const [mine, setMine] = useState<Mine | null>(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(!initialBoard);
  const [saving, setSaving] = useState(false);
  const idRef = useRef<string>('');

  useEffect(() => {
    idRef.current = readId();
    try {
      setName(localStorage.getItem(NAME_KEY) ?? '');
    } catch {
      /* ignore */
    }
  }, []);

  const applyServer = useCallback(
    (data: { board?: QuinielaBoard; leaderboard?: QuinielaLeaderboard; mine?: Mine | null }) => {
      if (data.board) setBoard(data.board);
      if (data.leaderboard) setLeaderboard(data.leaderboard);
      if (data.mine) {
        setMine(data.mine);
        setSaved(data.mine.picks);
        // Keep any unsaved draft edits the user has in flight.
        setDraft((d) => ({ ...data.mine!.picks, ...d }));
      }
    },
    []
  );

  const load = useCallback(async () => {
    const id = idRef.current || readId();
    try {
      const res = await fetch(`/api/quiniela?u=${encodeURIComponent(id)}`, { cache: 'no-store' });
      if (!res.ok) return;
      applyServer(await res.json());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
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
      setDraft((d) => ({ ...d, [matchId]: outcome }));
    },
    [board]
  );

  const dirtyIds = useMemo(() => {
    const ids: string[] = [];
    for (const [id, pick] of Object.entries(draft)) {
      if (saved[id] !== pick) ids.push(id);
    }
    return ids;
  }, [draft, saved]);

  const save = useCallback(async () => {
    if (!dirtyIds.length || saving) return;
    setSaving(true);
    const id = idRef.current || readId();
    const payload = Object.fromEntries(dirtyIds.map((mid) => [mid, draft[mid]]));
    try {
      try {
        localStorage.setItem(NAME_KEY, name);
      } catch {
        /* ignore */
      }
      const res = await fetch('/api/quiniela/pick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: id, name, picks: payload }),
      });
      if (res.ok) applyServer(await res.json());
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  }, [dirtyIds, draft, name, saving, applyServer]);

  return {
    board,
    leaderboard,
    mine,
    draft,
    saved,
    name,
    setName,
    setPick,
    save,
    saving,
    loading,
    dirtyCount: dirtyIds.length,
    userId: idRef.current,
  };
}
