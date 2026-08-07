# Acceso × Sportmonks Football API 3.0 — best practices

Distilled from Sportmonks **Football API 3.0 → Best practices**, mapped to how Acceso Futbol should fetch data so we stay **lean on calls, light on payloads, and under rate limits**.

Companion: [`AF_DATA_KPIS.md`](./AF_DATA_KPIS.md) (intervals, cost KPIs) · [`AF_SPORTMONKS_RATE_LIMITS.md`](./AF_SPORTMONKS_RATE_LIMITS.md) (Starter 2k/entity/hr).  
Implementation: `src/lib/sports/sportmonks.ts`, `src/lib/sports/smRateLimit.ts`, `src/lib/sports/freshness.ts`.

Official docs: [Sportmonks Best practices](https://docs.sportmonks.com/v3/endpoints-and-entities/best-practices) · [Pagination](https://docs.sportmonks.com/v3/endpoints-and-entities/pagination) · [Request options](https://docs.sportmonks.com/v3/endpoints-and-entities/request-options).

---

## 1. Architecture rule (CORS + secrets)

| Do | Don’t |
|----|--------|
| Call Sportmonks **only from Next.js API / server** (`smFetch`) | Call Sportmonks from the browser |
| Keep `SPORTMONKS_API_TOKEN` server-side | Ship the token in client bundles |

We already proxy via `/api/*`. Keep it that way — SM CORS + token exposure both require a middleware layer.

---

## 2. Sync strategies (Sportmonks guidance)

### 2.1 Bulk bootstrap — `filters=populate`

- Disables includes → minimal payload, **up to 1000 records/page**.
- Use for **initial sync** of reference or historical entity lists into our own store (teams, types, states, fixtures index).
- Pseudocode from SM: page until empty with `populate`.

**Acceso today:** We do **not** maintain a Sportmonks mirror DB. Season boards use `/seasons/{id}?include=fixtures…` (heavy).  
**Lean target:** For a future sync worker, bootstrap fixtures/teams with `populate` + cursor pagination, then enrich on demand.

### 2.2 Incremental — `filters=idAfter:{lastId}`

- Pull **only new IDs** after bootstrap.
- Combine with `populate` for light responses.
- Caveats from SM:
  - Does **not** catch updates/deletes to existing rows.
  - Out-of-order IDs possible → periodic full snapshot of reference entities.
  - Empty result = nothing new (slow the poll; don’t panic).

**Acceso today:** Not used (we re-poll live/date/season endpoints).  
**When to adopt:** Background job that maintains a fixture index; live UI still uses livescores/date.

### 2.3 Cursor pagination (preferred for new work)

Response includes:

```json
"pagination": {
  "next_cursor": "...",
  "has_more": true
}
```

Pass `cursor=` on the next request until `has_more` is false. Page numbers still work for legacy; **prefer cursor** for new sync code.

### 2.4 Combine strategies

| Layer | Tool | Cadence |
|-------|------|---------|
| Bootstrap | `populate` + cursor | Once / rare |
| New rows | `idAfter` | Minutes–hours |
| Updates | “latest updated” / targeted endpoints | As needed |
| Live scores | `/livescores` lean includes | Seconds (our FRESH pace) |
| Reconciliation | Full snapshot of types/states/teams | Daily |

---

## 3. Cache static entities (cut includes)

Sportmonks recommends caching entities that **rarely change**:

| Entity | Endpoint (typical) | Suggested TTL |
|--------|-------------------|---------------|
| States | `/states` | 12–24 h |
| Types | `/types` | 12–24 h |
| Continents / countries / regions / cities | matching `/…` | 24 h+ |

**How to use:** Resolve `type_id` / `state_id` locally → **omit** `include=state`, `include=…type`, `statistics.type`, `events.type` from hot paths when possible.

**Impact (SM):** Smaller JSON, less server join work, fewer timeouts on livescores.

**Acceso today:**

| Call | Current includes | Gap vs SM advice |
|------|------------------|------------------|
| Livescores | `participants;scores;state;league;periods;events` | **Shipped** — `events.type` dropped; type_id map locally |
| Date fixtures | `participants;scores;state;venue;round;league;periods` | Same for `state` |
| Season fixtures | Nested `fixtures.*` + `events.type` | Heavy; OK behind **5 min** cache; don’t poll as live |
| Match tick | scores/state/periods/events (+ player) | **Shipped** — live poll path |
| Match detail | Rich include (lineups, stats, comments…) | First paint / pre; skip form/H2H when live |

**Shared cache:** set `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` so `singleFlight` writes L2 (`src/lib/sharedKv.ts`).

---

## 4. Livescores — avoid timeouts (critical)

SM: livescores payload **compounds per active fixture × includes**. Busy windows + heavy includes → timeouts.

### Includes to treat carefully

| Include | Risk | SM recommendation |
|---------|------|-------------------|
| `trends.type` | **High** — grows every minute | Cache types; fetch trends **separately** ~once/min |
| `trends` | Medium | Separate 60s poll, offset :30s |
| `lineups.details` | Medium | Separate / slower; rarely change mid-match |
| `periods.statistics` | Medium | Separate or per-fixture on demand |
| `*.type` on stats/events | High | Cache types locally; drop `.type` from includes |

### SM example pattern

```text
Every 10s  → livescores?include=scores;events;participants&filters=fixtureLeagues:…
Every 60s  → livescores/inplay?include=trends   (offset :30 past the minute)
```

### Acceso mapping

| Practice | Our status |
|----------|------------|
| Filter by league (`fixtureLeagues:743` / LC) | Done |
| Keep livescores includes relatively lean | Partial — still `state`, `league`, `periods`, `events.type` |
| Prefer `/livescores/latest` + sticky merge | Done |
| Do **not** put trends / lineup details / period stats on the main poll | Done |
| Split heavy match detail onto `/fixtures/{id}` | Done (`fetchMatchSnapshot`) |
| Short coalesce (`FRESH.liveTtlMs` = 4s) | Done |
| Skip livescores when no near/live fixtures | Done (incl. jornada / ligamx) |
| Soft per-entity throttle (Starter 90% of 2k) | Done (`smRateLimit.ts`) |
| Never call livescores from the browser | Done |

**Target livescores include (Acceso lean):**

```text
participants;scores;periods;events
```

Resolve state labels + event type names from local `/states` + `/types` caches. Keep `periods` only while we need clock/HT stamps on cards.

---

## 5. Filtering & field selection

SM: filter **server-side**, don’t download then discard.

| Pattern | Acceso use |
|---------|------------|
| `filters=fixtureLeagues:{ids}` | Livescores + date boards |
| Season-scoped standings | `/standings/seasons/{seasonId}` |
| Select fields / order | Prefer when adding new list endpoints |
| Avoid full-world fixture dumps on the live path | Season board cached 5m; live overlay separate |

---

## 6. Rate limiting

SM expectations:

- Know plan limits; throttle client-side (token bucket / sliding window).
- On **429**: honor `Retry-After`, exponential backoff + jitter, then resume conservatively.
- Separate buckets for **livescores** vs **historical/bootstrap** so a sync job can’t starve live.
- Monitor how often you hit 429.

**Acceso today:** Adaptive poll + singleFlight + tab-hidden pause.  
**Gap:** No explicit token-bucket around `smFetch`; no structured 429 backoff. Add before aggressive parallel paging.

---

## 7. Caching query results (SM + Acceso)

| Data volatility | Cache approach | Acceso |
|-----------------|----------------|--------|
| Types / states / teams metadata | Long TTL / Redis | Not yet (in-memory planned) |
| Standings | Medium (45s) | Done |
| Season fixture list | Medium (5m) | Done |
| Date boards | Short–medium | **Gap:** no module TTL on `fetchFixturesByDate` |
| Livescores / events | Very short (4s) | Done |
| Full match snapshot | Short + singleFlight | Route-level; snapshot itself not TTL’d |

Never long-cache livescores. Never put SM token in CDN-cached HTML.

---

## 8. Recommended Acceso sync model (target architecture)

```text
┌──────────────────────────────────────────────────────────┐
│ Reference cache (types, states, teams) — TTL 12–24h      │
└──────────────────────────────────────────────────────────┘
              ▲ resolve type_id / state_id locally
┌─────────────┴──────────────┐
│ Livescores (league filter) │── lean includes ──► boards / clocks
│ Date + season boards       │── TTL ────────────► jornada / calendars
│ Fixture/{id}               │── on demand ──────► match chapter
│ Optional sync worker       │── populate + idAfter + daily snapshot
└────────────────────────────┘
Browser → /api/* only → smFetch (never Sportmonks from the client)
```

Browser → our `/api/*` only → `smFetch` (never SM direct).

---

## 9. Checklist vs Sportmonks docs

| SM best practice | Acceso |
|------------------|--------|
| Middleware / no browser token | Yes |
| League filters on livescores | Yes |
| Avoid heavy livescores includes (trends, lineup details) | Yes |
| Slim livescores (no venue/round on hot path) | Yes |
| Cache types/states; drop `.type` / `state` includes | **Todo** |
| Split trends to 60s poll | N/A (we don’t use trends yet) |
| `populate` + cursor for bulk sync | **Todo** (if we add mirror DB) |
| `idAfter` incremental | **Todo** (mirror DB) |
| 429 backoff on `smFetch` | Yes (1 retry + jitter) |
| Full client token-bucket | **Todo** |
| Cache date boards + match snapshots | Yes (`singleFlight`) |
| Skip livescores when nothing can be live | Yes (incl. jornada / ligamx fixtures) |
| Monitor new-record yield / cache hits | **Todo** (KPI §8) |

---

## 10. Implementation priorities (aligned with cost KPIs)

1. ~~Gate livescores in `fetchLigaMxFixtures`~~ **Done**
2. ~~Slim livescores includes (drop venue/round)~~ **Done** — next: local states/types cache
3. ~~TTL + singleFlight on date boards / match snapshot~~ **Done**
4. ~~`smFetch` 429 retry + jitter~~ **Done** — next: token-bucket if we add sync workers
5. Optional: background `populate`/`idAfter` fixture index so season pages stop re-pulling fat includes.

---

*When Sportmonks updates Best practices, refresh this doc and re-score §9.*
