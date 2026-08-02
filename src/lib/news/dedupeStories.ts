import type { Story } from './types';

const STOP = new Set([
  'para',
  'desde',
  'sobre',
  'como',
  'esta',
  'este',
  'estos',
  'estas',
  'tiene',
  'tienen',
  'partido',
  'partidos',
  'despues',
  'después',
  'contra',
  'entre',
  'fueron',
  'con',
  'los',
  'las',
  'del',
  'una',
  'por',
  'que',
  'el',
  'la',
  'en',
  'de',
  'y',
  'a',
  'al',
  'se',
  'su',
  'sus',
  'un',
  'the',
  'and',
  'vs',
  'tras',
  'ante',
  'sin',
  'mas',
  'más',
  'fue',
  'son',
  'hay',
  'hoy',
  'ya',
  'le',
  'lo',
  'no',
  'si',
  'sí',
  'pero',
  'como',
  'cuando',
  'mientras',
  'hacia',
  'bajo',
  'anos',
  'años',
  'primer',
  'primera',
  'circuito',
  'maximo',
  'máximo',
  'futbol',
  'fútbol',
]);

/** Club / nickname → canonical id for topic clustering. */
const CLUBS: [RegExp, string][] = [
  [/cruz\s*azul|\bm[aá]quina\b/i, 'cruz-azul'],
  [/\batlante\b|\bpotros?\b/i, 'atlante'],
  [/\bam[eé]rica\b|\b[aá]guilas\b/i, 'america'],
  [/\bchivas\b|\bguadalajara\b/i, 'chivas'],
  [/\btigres\b|\buanl\b/i, 'tigres'],
  [/\bmonterrey\b|\brayados\b/i, 'monterrey'],
  [/\bpumas\b|\bunam\b/i, 'pumas'],
  [/\batlas\b/i, 'atlas'],
  [/\btoluca\b|\bdiablos?\b/i, 'toluca'],
  [/\bsantos\b/i, 'santos'],
  [/\btijuana\b|\bxolos\b/i, 'tijuana'],
  [/\bnecaxa\b/i, 'necaxa'],
  [/\bpachuca\b|\btuzos\b/i, 'pachuca'],
  [/\ble[oó]n\b|\bfiera\b/i, 'leon'],
  [/\bpuebla\b/i, 'puebla'],
  [/quer[eé]taro|\bgallos\b/i, 'queretaro'],
  [/ju[aá]rez/i, 'juarez'],
  [/san\s*luis|\batl[eé]tico\s*san\s*luis/i, 'san-luis'],
  [/mazatl[aá]n/i, 'mazatlan'],
  [/selecci[oó]n|\bel\s*tri\b|\bm[eé]xico\b/i, 'el-tri'],
];

const EVENT_HINT =
  /\binvicto\b|\bvence\b|\bderrota\b|\btriunfo\b|\blesi[oó]n\b|\bexpuls|\bpenal\b|\bgol(es)?\b|\bfichaje\b|\bcontrato\b|\bt[eé]cnico\b|\bdt\b|\bcorona\b|\babolla\b|\bmazazo\b|\brelincha\b/i;

function fold(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normTitle(t: string) {
  return fold(t).slice(0, 80);
}

function clubsIn(text: string): Set<string> {
  const out = new Set<string>();
  for (const [re, id] of CLUBS) {
    if (re.test(text)) out.add(id);
  }
  return out;
}

function tokens(text: string): Set<string> {
  return new Set(
    fold(text)
      .split(' ')
      .filter((w) => w.length > 3 && !STOP.has(w))
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter += 1;
  return inter / (a.size + b.size - inter);
}

function clubOverlap(a: Set<string>, b: Set<string>): string[] {
  return [...a].filter((c) => b.has(c));
}

/** True when two headlines are covering the same news item. */
export function sameTopic(a: Story, b: Story): boolean {
  const titleA = normTitle(a.title);
  const titleB = normTitle(b.title);
  if (titleA && titleA === titleB) return true;

  const sumA = fold(a.summary ?? '');
  const sumB = fold(b.summary ?? '');
  if (sumA.length > 48 && sumB.length > 48) {
    if (sumA === sumB) return true;
    // Same deck reused across ESPN API + ESPN RSS
    if (sumA.includes(sumB.slice(0, 72)) || sumB.includes(sumA.slice(0, 72))) return true;
  }

  const blobA = `${a.title} ${a.summary ?? ''}`;
  const blobB = `${b.title} ${b.summary ?? ''}`;
  const clubsA = clubsIn(blobA);
  const clubsB = clubsIn(blobB);
  const sharedClubs = clubOverlap(clubsA, clubsB);
  const tokA = tokens(blobA);
  const tokB = tokens(blobB);
  const jac = jaccard(tokA, tokB);

  // Same matchup covered by multiple outlets (Atlante vs Cruz Azul, etc.)
  if (sharedClubs.length >= 2) return true;

  // Celebration / one-club headline about a two-club matchup
  // e.g. "El Potro relincha…" vs "Atlante pone fin al invicto… Cruz Azul"
  const eventA = EVENT_HINT.test(blobA);
  const eventB = EVENT_HINT.test(blobB);
  if (
    sharedClubs.length >= 1 &&
    eventA &&
    eventB &&
    (clubsA.size >= 2 || clubsB.size >= 2)
  ) {
    return true;
  }

  // Same club + overlapping narrative / event language
  if (sharedClubs.length >= 1 && jac >= 0.26) return true;
  if (sharedClubs.length >= 1 && eventA && eventB && jac >= 0.18) return true;

  // Near-duplicate wording without clear club tags
  if (jac >= 0.4) return true;

  return false;
}

function storyScore(s: Story): number {
  let n = 0;
  if (s.sourceId === 'espn' && s.image) n += 6;
  else if (s.sourceId === 'espn') n += 5;
  else if (s.sourceId === 'espn-rss') n += 3;
  else if (s.sourceId === 'marca') n += 2;
  else n += 1;
  if ((s.summary?.trim().length ?? 0) > 40) n += 2;
  if (s.image) n += 1;
  if (s.publishedAt) n += 0.25;
  return n;
}

function prefer(a: Story, b: Story): Story {
  return storyScore(a) >= storyScore(b) ? a : b;
}

/**
 * Collapse cross-source duplicates of the same topic.
 * Keeps the strongest card (ESPN+image preferred) per cluster.
 */
export function dedupeStories(stories: Story[]): Story[] {
  const kept: Story[] = [];

  for (const s of stories) {
    if (!normTitle(s.title)) continue;
    const idx = kept.findIndex((k) => sameTopic(k, s));
    if (idx >= 0) {
      kept[idx] = prefer(kept[idx], s);
    } else {
      kept.push(s);
    }
  }

  return kept;
}
