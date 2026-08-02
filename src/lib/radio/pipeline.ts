import type { MatchSnapshot } from '@/lib/sports';
import {
  beatKey,
  getBeat,
  listBeats,
  pruneRadioCache,
  setBeat,
  type RadioBeat,
} from './cache';
import { radioPhase } from './phases';
import { type RadioStyle } from './personas';
import { generateScript } from './script';
import { buildPreshowSegments, buildRecapSegments } from './show';
import { radioEnabled, synthesize } from './tts';

const DELAY_MS = Number(process.env.RADIO_DELAY_MS ?? 30_000);
const seen = new Map<string, number>(); // eventKey -> firstSeen

function eventSignalId(match: MatchSnapshot, kind: string, rawId: string) {
  return `${match.id}:${kind}:${rawId}`;
}

async function ensureBeat(params: {
  match: MatchSnapshot;
  style: RadioStyle;
  eventId: string;
  kind: RadioBeat['kind'];
  eventText?: string;
  eventType?: string;
  minute?: number;
  textOverride?: string;
}): Promise<RadioBeat> {
  const key = beatKey(params.match.id, params.eventId, params.style);
  const existing = getBeat(key);
  if (existing) return existing;

  const text =
    params.textOverride ??
    (await generateScript({
      style: params.style,
      kind:
        params.kind === 'preshow' || params.kind === 'show'
          ? params.kind === 'preshow'
            ? 'kick'
            : 'recap'
          : params.kind,
      match: params.match,
      eventText: params.eventText,
      eventType: params.eventType,
      minute: params.minute,
    }));

  const audioPath = await synthesize(key, text, params.style);
  const beat: RadioBeat = {
    id: key,
    matchId: params.match.id,
    style: params.style,
    text,
    kind: params.kind,
    createdAt: Date.now(),
    audioPath,
  };
  setBeat(beat);
  pruneRadioCache();
  return beat;
}

async function ensureShowBeats(
  match: MatchSnapshot,
  style: RadioStyle,
  mode: 'preshow' | 'recap'
): Promise<RadioBeat[]> {
  const kindFilter = (b: RadioBeat) =>
    mode === 'preshow' ? b.kind === 'preshow' : b.kind === 'show' || b.kind === 'recap';
  const existing = listBeats(match.id, style).filter(kindFilter);
  if (existing.length >= 2) return existing;

  const segments =
    mode === 'preshow'
      ? await buildPreshowSegments(match, style)
      : await buildRecapSegments(match, style);
  for (const seg of segments) {
    await ensureBeat({
      match,
      style,
      eventId: seg.id,
      kind: mode === 'preshow' ? 'preshow' : 'show',
      textOverride: seg.text,
    });
  }
  return listBeats(match.id, style).filter(kindFilter);
}

/**
 * Build delayed radio beats for a match + style.
 * Auto-switches to pre-show / post podcast when phase calls for it.
 */
export async function buildRadioFeed(
  match: MatchSnapshot,
  style: RadioStyle
): Promise<{
  beats: RadioBeat[];
  delaySec: number;
  enabled: boolean;
  phase: ReturnType<typeof radioPhase>;
  mode: 'live' | 'preshow' | 'recap' | 'off';
}> {
  const phase = radioPhase(match);

  if (!radioEnabled()) {
    return { beats: [], delaySec: DELAY_MS / 1000, enabled: false, phase, mode: 'off' };
  }

  // Pre-show podcast: 15 min window, no live commentary yet
  if (phase === 'preshow' && match.state === 'pre') {
    const beats = await ensureShowBeats(match, style, 'preshow');
    return {
      beats,
      delaySec: 0,
      enabled: true,
      phase,
      mode: 'preshow',
    };
  }

  // Post-game podcast (commentary preferred; falls back to score + stats)
  if (phase === 'recap' && match.state === 'post') {
    const beats = await ensureShowBeats(match, style, 'recap');
    return {
      beats,
      delaySec: 0,
      enabled: true,
      phase,
      mode: 'recap',
    };
  }

  const now = Date.now();
  const ready: Array<Parameters<typeof ensureBeat>[0]> = [];

  if (match.state === 'pre' || (match.state === 'in' && match.events.length === 0 && match.comments.length === 0)) {
    const id = match.state === 'pre' ? 'kickoff' : `bed-${Math.floor(now / 180_000)}`;
    const sig = eventSignalId(match, 'meta', id);
    if (!seen.has(sig)) seen.set(sig, now);
    if (now - (seen.get(sig) ?? now) >= Math.min(DELAY_MS, 5_000)) {
      ready.push({
        match,
        style,
        eventId: id,
        kind: match.state === 'pre' ? 'kick' : 'bed',
      });
    }
  }

  for (const ev of match.events.slice(0, 30)) {
    const sig = eventSignalId(match, 'event', ev.id);
    if (!seen.has(sig)) seen.set(sig, now);
    if (now - (seen.get(sig) ?? now) < DELAY_MS) continue;
    const peak =
      /gol|goal|penal|red|roja|tarjeta/i.test(`${ev.type} ${ev.text}`) || Boolean(ev.text);
    ready.push({
      match,
      style,
      eventId: `e-${ev.id}`,
      kind: peak ? 'peak' : 'color',
      eventText: ev.text,
      eventType: ev.type,
      minute: ev.minute,
    });
  }

  for (const c of match.comments.slice(0, 20)) {
    if (!c.text) continue;
    const sig = eventSignalId(match, 'comment', c.id);
    if (!seen.has(sig)) seen.set(sig, now);
    if (now - (seen.get(sig) ?? now) < DELAY_MS) continue;
    ready.push({
      match,
      style,
      eventId: `c-${c.id}`,
      kind: c.isGoal ? 'peak' : 'color',
      eventText: c.text,
      minute: c.minute,
    });
  }

  const unique = new Map<string, (typeof ready)[0]>();
  for (const r of ready) unique.set(r.eventId, r);
  const slice = [...unique.values()].slice(-8);

  for (const r of slice) {
    await ensureBeat(r);
  }

  let beats = listBeats(match.id, style);
  if (match.state === 'in' && beats.length < 2) {
    const bedId = `bed-${Math.floor(now / 120_000)}`;
    await ensureBeat({ match, style, eventId: bedId, kind: 'bed' });
    beats = listBeats(match.id, style);
  }

  return {
    beats,
    delaySec: DELAY_MS / 1000,
    enabled: true,
    phase,
    mode: match.state === 'in' ? 'live' : 'live',
  };
}
