import { accesoEditorialStories } from './accesoEditorial';
import { maybeEnrichAccesoLines } from './accesoLine';
import { dedupeStories } from './dedupeStories';
import { fetchEspnLigaMxNews } from './espnNews';
import { fetchMediotiempoStories } from './mediotiempo';
import { fetchRss } from './rss';
import { fetchTudnStories } from './tudn';
import type { StoriesPayload, Story, StorySourceId } from './types';

const MX_HINT =
  /liga\s*mx|apertura|clausura|chivas|américa|america|tigres|rayados|cruz azul|pumas|atlas|atlante|toluca|santos|xolos|necaxa|quer[eé]taro|le[oó]n|pachuca|ju[aá]rez|puebla|san luis|femenil|selecci[oó]n|el tri|futbol mexicano|fútbol mexicano/i;

type SourceDef = {
  id: StorySourceId;
  label: string;
  kind: 'espn-api' | 'rss' | 'mediotiempo' | 'tudn';
  url?: string;
  filter?: boolean;
};

const SOURCES: SourceDef[] = [
  { id: 'mediotiempo', label: 'Mediotiempo', kind: 'mediotiempo' },
  { id: 'tudn', label: 'TUDN', kind: 'tudn' },
  { id: 'espn', label: 'ESPN', kind: 'espn-api' },
  {
    id: 'espn-rss',
    label: 'ESPN Deportes',
    kind: 'rss',
    url: 'https://espndeportes.espn.com/espn/rss/soccer/news',
    filter: true,
  },
  {
    id: 'espn-rss',
    label: 'ESPN México',
    kind: 'rss',
    url: 'https://www.espn.com.mx/espn/rss/soccer/news',
    filter: true,
  },
  {
    id: 'marca',
    label: 'Marca',
    kind: 'rss',
    url: 'https://www.marca.com/rss/futbol/mexico.xml',
    filter: false,
  },
];

function toStory(
  item: { title: string; link: string; description: string; pubDate: string | null; image?: string },
  sourceId: StorySourceId,
  sourceLabel: string
): Story {
  return {
    id: `${sourceId}-${item.link.replace(/[^a-zA-Z0-9]/g, '').slice(-28)}`,
    title: item.title,
    summary: item.description,
    url: item.link,
    sourceId,
    sourceLabel,
    publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : null,
    image: item.image,
  };
}

async function loadSource(src: SourceDef): Promise<Story[]> {
  if (src.kind === 'espn-api') return fetchEspnLigaMxNews();
  if (src.kind === 'mediotiempo') return fetchMediotiempoStories();
  if (src.kind === 'tudn') return fetchTudnStories();
  const items = await fetchRss(src.url!);
  return items
    .filter((it) => !src.filter || MX_HINT.test(`${it.title} ${it.description}`))
    .slice(0, 12)
    .map((it) => toStory(it, src.id, src.label));
}

/** Round-robin wire feed; ESPN lead is pinned separately. */
function interleaveBySource(stories: Story[], limit: number): Story[] {
  const bySource = new Map<string, Story[]>();
  for (const s of stories) {
    const list = bySource.get(s.sourceId) ?? [];
    list.push(s);
    bySource.set(s.sourceId, list);
  }
  for (const list of bySource.values()) {
    list.sort((a, b) => {
      const at = a.publishedAt ? +new Date(a.publishedAt) : 0;
      const bt = b.publishedAt ? +new Date(b.publishedAt) : 0;
      return bt - at;
    });
  }

  const order = ['espn', 'espn-rss', 'mediotiempo', 'tudn', 'marca'];
  const queues = order.map((id) => bySource.get(id) ?? []).filter((q) => q.length > 0);
  const out: Story[] = [];
  while (out.length < limit && queues.some((q) => q.length)) {
    for (const q of queues) {
      const next = q.shift();
      if (next) out.push(next);
      if (out.length >= limit) break;
    }
  }
  return out;
}

/** Wire headline first (ESPN + photo preferred). Acceso editorial stays below the top of the cable. */
function pinWireLead(stories: Story[]): Story[] {
  const lead =
    stories.find((s) => s.sourceId === 'espn' && Boolean(s.image)) ??
    stories.find((s) => s.sourceId === 'espn') ??
    stories.find((s) => s.sourceId === 'espn-rss' && Boolean(s.image)) ??
    stories.find((s) => s.sourceId !== 'acceso' && Boolean(s.image)) ??
    stories.find((s) => s.sourceId !== 'acceso');
  if (!lead) return stories;
  const rest = stories.filter((s) => s.id !== lead.id);
  const wire = rest.filter((s) => s.sourceId !== 'acceso');
  const acceso = rest.filter((s) => s.sourceId === 'acceso');
  // Top wire stack, then Acceso takes, then leftover wire.
  const top = wire.slice(0, 6);
  const more = wire.slice(6);
  return [lead, ...top, ...acceso, ...more];
}

export async function aggregateStories(): Promise<StoriesPayload> {
  const buckets = await Promise.all(SOURCES.map((src) => loadSource(src)));
  const editorial = accesoEditorialStories();

  // Topic-aware collapse (same matchup / same deck across ESPN, MT, TUDN, etc.)
  const deduped = dedupeStories(buckets.flat());
  const wire = interleaveBySource(deduped, 26);
  // Top news leads; Acceso own stories sit below the wire stack.
  const merged = pinWireLead([...wire, ...editorial]);
  const stories = await maybeEnrichAccesoLines(merged);

  return {
    generatedAt: new Date().toISOString(),
    stories,
  };
}
