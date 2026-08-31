'use client';

import { useSyncExternalStore } from 'react';

const KEY = 'af-sello-follow-v1';
const MAX = 8;

export type SelloFollow = { league: string; id: string };

type Listener = () => void;

let follows: SelloFollow[] = [];
let hydrated = false;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((fn) => fn());
}

function readStored(): SelloFollow[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SelloFollow[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((f) => f && typeof f.id === 'string' && typeof f.league === 'string');
  } catch {
    return [];
  }
}

function writeStored(next: SelloFollow[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* quota */
  }
}

function hydrate() {
  if (hydrated) return;
  hydrated = true;
  follows = readStored();
}

export function getSelloFollows(): SelloFollow[] {
  hydrate();
  return follows;
}

export function subscribeSelloFollows(fn: Listener) {
  hydrate();
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function isSelloFollow(id: string): boolean {
  return getSelloFollows().some((f) => f.id === id);
}

/** Pin this fixture for gol/FT overlays. No gravity required. */
export function followSelloMatch(league: string, id: string) {
  hydrate();
  if (!league || !id) return;
  if (follows.some((f) => f.id === id)) return;
  follows = [{ league, id }, ...follows.filter((f) => f.id !== id)].slice(0, MAX);
  writeStored(follows);
  emit();
}

const EMPTY: SelloFollow[] = [];

export function useSelloFollows(): SelloFollow[] {
  return useSyncExternalStore(subscribeSelloFollows, getSelloFollows, () => EMPTY);
}
