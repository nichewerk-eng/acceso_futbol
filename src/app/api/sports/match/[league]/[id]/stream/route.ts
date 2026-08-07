import { peekCache, peekCacheAgeMs, setCache, singleFlight } from '@/lib/apiCache';
import { apiTtlMsForPace } from '@/lib/sports/freshness';
import {
  getMatchTick,
  sportsMatchCacheKey,
  sportsMatchTickCacheKey,
} from '@/lib/sports/getMatch';
import { mergeMatchSnapshot } from '@/lib/sports/mergeMatchSnapshot';
import type { MatchSnapshot } from '@/lib/sports';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * SSE live tick stream. Reads shared/process cache; refreshes SM at most every live TTL.
 * Clients should fall back to /tick polling if EventSource fails.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ league: string; id: string }> }
) {
  const { league, id } = await params;
  if (!['liga-mx', 'mundial', 'seleccion', 'leagues-cup'].includes(league)) {
    return new Response('invalid_league', { status: 400 });
  }

  const encoder = new TextEncoder();
  const tickKey = sportsMatchTickCacheKey(league, id);
  const detailKey = sportsMatchCacheKey(league, id);
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: MatchSnapshot) => {
        if (closed) return;
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
        );
      };

      const pull = async () => {
        const cached = peekCache<MatchSnapshot>(tickKey);
        const age = peekCacheAgeMs(tickKey);
        if (cached && age != null && age <= apiTtlMsForPace('live')) {
          const detail = peekCache<MatchSnapshot>(detailKey);
          send(mergeMatchSnapshot(detail, cached));
          return;
        }

        const tick = await singleFlight(tickKey, apiTtlMsForPace('live'), () =>
          getMatchTick(league, id)
        );
        if (!tick) return;
        const detail = peekCache<MatchSnapshot>(detailKey);
        const merged = mergeMatchSnapshot(detail, tick);
        setCache(tickKey, merged);
        send(merged);
      };

      await pull();

      const interval = setInterval(() => {
        if (closed) return;
        void pull();
      }, apiTtlMsForPace('live'));

      const ping = setInterval(() => {
        if (closed) return;
        controller.enqueue(encoder.encode(': ping\n\n'));
      }, 15_000);

      req.signal.addEventListener('abort', () => {
        closed = true;
        clearInterval(interval);
        clearInterval(ping);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-AF-Stream': 'match-tick',
    },
  });
}
