# Acceso × Sportmonks — rate limits (Starter)

Source: Sportmonks Football API 3.0 **Rate limit** docs.  
Plan assumed: **Starter** unless `SPORTMONKS_PLAN` is set.

---

## 1. The numbers that matter

| Plan | Calls / **entity** / hour |
|------|---------------------------|
| **Starter** | **2,000** |
| Growth | 2,500 |
| Pro | 3,000 |
| Enterprise | 5,000 (+ burst buffer) |

**Critical:** limits are **per entity**, not per endpoint.

| Entity | Endpoints Acceso uses |
|--------|------------------------|
| **Fixture** | `/livescores`, `/livescores/latest`, `/fixtures/{id}`, `/fixtures/date/{date}`, H2H |
| **Season** | `/seasons/{id}` (Liga MX / LC boards) |
| **Team** | `/teams/{id}` (form) |
| **Standing** | `/standings/seasons/{id}` |
| **Type / State** | `/types`, `/states` (when we cache them) |

Hour window starts at the **first request to that entity**, then resets after 1 hour.

Every response includes:

```json
"rate_limit": {
  "resets_in_seconds": 1847,
  "remaining": 2749,
  "requested_entity": "Fixture"
}
```

Dashboard: [my.sportmonks.com](https://my.sportmonks.com) · API: `GET /core/my/usage`.

On **429**: that entity is exhausted; **other entities still work**. Body includes `retry_after` (seconds).

---

## 2. Acceso soft cap

Env: `SPORTMONKS_PLAN=starter|growth|pro|enterprise` (default **starter**).

Code (`smRateLimit.ts`):

- Soft throttle at **90%** of plan → Starter **1,800 Fixture/hr** per process
- Reads `rate_limit` from every SM JSON body
- Warns in logs when `remaining < 200`
- 429: short retry only; never block a serverless invoke for a full hour reset

---

## 3. Fixture budget (the bottleneck)

Almost all live UX burns the **Fixture** bucket:

| Call | Cadence (warm instance) | Est. Fixture/hr |
|------|-------------------------|-----------------|
| `/livescores/latest` | every ~4s when near/live | ≤ **900** |
| `/fixtures/date/*` (×2 days) | every ~12s when GOD misses | ≤ **600** |
| `/fixtures/{id}` match snap | every ~4s per watched match | ≤ **900** |

Naive sum **~2,400** → **over Starter 2,000**.

Why we still fit on Starter (one warm instance):

1. Quiet hours → livescores **gated off** (near-kickoff only).
2. Date + match + livescores **singleFlight** coalesce across users on the same instance.
3. `/livescores/latest` empty responses still cost 1 call but keep sticky in-play state (no full board every tick).
4. Season boards hit **Season** entity (separate 2,000/hr), not Fixture.
5. Form/H2H skipped while `state === 'in'`.

**Match-night rule of thumb (Starter, 1 region, warm):**

| Mode | Target Fixture/hr | Notes |
|------|-------------------|-------|
| Idle home only | **&lt; 100** | dates only; no livescores |
| Live boards, no match page | **≤ 1,200** | latest + dates |
| Live + 1 match chapter | **≤ 1,800** | stay under soft cap |
| Live + many match tabs / cold isolates | **Risk** | upgrade plan or add KV |

If `remaining` trends under 200 with &gt;20 minutes left in the window → tighten polls or upgrade.

---

## 4. Strategies we apply (from SM docs)

| SM advice | Acceso |
|-----------|--------|
| Includes over extra Team calls | Participants on fixture/livescores |
| Cache types/states (week) | **Todo** — still send `state` / `events.type` |
| Smart polling / adaptive | FRESH live/near/idle |
| `/livescores/latest` | **Yes** — with sticky merge + cold `/livescores` hydrate |
| Don’t poll when nothing live | Near-kickoff gate |
| `filters=populate` bulk | For future DB sync only |
| Multi-ID batch | Not yet (low need) |
| Monitor `rate_limit` | Logged + soft throttle |
| Handle 429 | Retry short; serve caches |

---

## 5. Ops checklist

```
□ SPORTMONKS_PLAN set correctly in Vercel
□ Watch Fixture remaining on match nights (dashboard or logs)
□ Quiet day: Fixture/hr should stay tiny (no livescores)
□ Prefer one warm region / KV before 50 concurrent cold starts
□ Upgrade path: Growth (2.5k) → Pro (3k) before World Cup traffic
```

---

## 6. Related

- [`AF_DATA_KPIS.md`](./AF_DATA_KPIS.md) — product KPIs  
- [`AF_SPORTMONKS_BEST_PRACTICES.md`](./AF_SPORTMONKS_BEST_PRACTICES.md) — includes, pagination, timeouts  
- `src/lib/sports/smRateLimit.ts` — plan + throttle  
- `src/lib/sports/sportmonks.ts` — `smFetch` + latest livescores  
