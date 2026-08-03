# Acceso Futbol — Data efficiency KPIs

Living ops doc for keeping scores competitive **without burning provider quota**.  
Source of truth for intervals: `src/lib/sports/freshness.ts`.  
Sportmonks API 3.0 patterns: [`AF_SPORTMONKS_BEST_PRACTICES.md`](./AF_SPORTMONKS_BEST_PRACTICES.md).  
Rate limits (Starter 2k/entity/hr): [`AF_SPORTMONKS_RATE_LIMITS.md`](./AF_SPORTMONKS_RATE_LIMITS.md).  
Last reviewed: 2026-08-02 (commit era: adaptive pace + single-flight).

---

## 1. Principles

1. **Spend quota only when scores can move** — live / near-kickoff get short TTLs; idle days get long ones.
2. **One upstream load, many users** — `singleFlight` + in-memory TTL per serverless instance; CDN `s-maxage` for edge.
3. **One browser timer, many widgets** — shared `useGamesOfDay` for home surfaces.
4. **Pause when nobody is looking** — `startLivePoll` stops while the tab is hidden.
5. **AI/TTS is event-priced, not poll-priced** — Anthropic + ElevenLabs only on new beats / cold cable briefs.

---

## 2. Freshness budget (code constants)

| Pace | When | Client poll | API coalesce | CDN `s-maxage` |
|------|------|-------------|--------------|----------------|
| **live** | Any fixture `state === 'in'` | **5 s** | **4 s** | **4 s** |
| **near** | Kickoff within 45m before → 3.5h after | **12 s** | **12 s** | **12 s** |
| **idle** | Quiet board | **35 s** | **30 s** | **30 s** |

| Other budgets | Value |
|---------------|-------|
| Standings (client + API) | **45 s** |
| Sportmonks livescores module cache | **4 s** |
| Sportmonks season board | **5 min** |
| ESPN Spanish crónica reuse | **60 s** |
| ESPN enrich budget (live / idle) | **550 ms / 2 s** (never block score payload) |
| Stories API | **120 s** (note: `FRESH.storiesTtlMs` is 60s but unused) |
| Cable brief | **2 h** bucket |
| Radio client poll | Forced **idle (35 s)** |
| Radio event delay | `RADIO_DELAY_MS` default **30 s** |

---

## 3. Cost centers (who we pay)

| Provider | Env | What we buy | Pricing note |
|----------|-----|-------------|--------------|
| **Sportmonks** | `SPORTMONKS_API_TOKEN`, `SPORTMONKS_PLAN` | Per-entity hourly caps (Starter **2,000 Fixture/hr**) | See rate-limit doc; $____ / mo |
| **ESPN public APIs** | none | Fallback boards, El Tri schedule, WC, Spanish PBP, news | Free but rate-risk / ToS |
| **Anthropic** | `ANTHROPIC_API_KEY` | Radio scripts, cable brief, story “Acceso lines” (Haiku default) | $____ / 1M tokens |
| **ElevenLabs** | `ELEVENLABS_*` | Radio + cable TTS | $____ / 1k chars |
| **Vercel** | — | Function invocations + bandwidth | Tied to client poll volume |

Update the blanks when the company plan renews. All KPIs below are in **calls**, not dollars, until rates are filled.

---

## 4. Call topology (lean path)

```
Browser (adaptive poll, pause if hidden)
    │
    ▼
Next API routes ── singleFlight + pace TTL ──► Sportmonks / ESPN
    │                                              │
    │                         AI only on miss ─────┼──► Anthropic
    │                         new beat audio ──────┴──► ElevenLabs
    ▼
CDN s-maxage (secondary coalesce across edges)
```

### Active client pollers

| Surface | Endpoint(s) | Pace | Shared |
|---------|-------------|------|--------|
| Home living room | `/api/games-of-day` | adaptive | **Yes** — PulseHero + banner + dock + footer source |
| Home jornada | `/api/jornada` | adaptive | No |
| Match chapter | `/api/sports/match/...` | adaptive by match state | No |
| Match radio tab | `/api/radio/match/...` | idle 35s | No (`Cache-Control: no-store`) |
| Liga MX board | `/api/ligamx/fixtures` (+ standings ≤45s) | adaptive | No |
| Leagues Cup | `/api/leagues-cup/fixtures` | adaptive | No |
| Mundial tabla | `/api/standings` + `/api/fixtures` | 45s fixed | No |
| Stories / cable | `/api/stories`, `/api/radio/cable-brief` | **once on mount** | No (stories fetched twice on home today) |

Orphan / unused poll surfaces: `/api/pulse` (no client), `LiveTicker` (not mounted), `MatchView` (legacy route).

### Upstream skip rules (already shipped)

| Call | Skipped when |
|------|----------------|
| Sportmonks livescores | Quiet day on **games-of-day / pulse / leagues-cup** (no `in` + not near kickoff) |
| Form + H2H | Match `state === 'in'` |
| ESPN crónica wait | Live enrich budget 550ms → serve cached Spanish lines |
| Radio Anthropic/TTS | Beat already in process cache |
| Client polls | Tab `visibilityState === 'hidden'` |

### Known leak / status

| Item | Status |
|------|--------|
| `fetchLigaMxFixtures()` always hit livescores | **Fixed** — gated with `isNearKickoff` |
| `fetchFixturesByDate` no module TTL | **Fixed** — `singleFlight` @ near TTL (12s) |
| Heavy livescores includes | **Improved** — dropped `venue`/`round` on hot path |
| SM 429 handling | **Fixed** — one retry + backoff/jitter in `smFetch` |
| Match detail re-fetched by radio | **Fixed** — radio reuses sports-match cache + snap TTL |
| Stories mounted twice on home | Open — 2× `/api/stories` on first paint |
| Multi-instance serverless | Open — need KV for beats / boards at scale |

---

## 5. KPI definitions & targets

Track weekly. Prefer **upstream calls** over browser hits (CDN absorbs many of those).

### Primary KPIs

| KPI | Definition | Quiet-day target | Match-night target | Alarm |
|-----|------------|------------------|--------------------|-------|
| **SM_FIXTURE_QPH** | Sportmonks **Fixture** entity calls / hour | **≤ 100** | **≤ 1,800** (Starter soft cap) | ≥ 1,900 or 429s |
| **SM_LIVE_QPH** | `/livescores` + `/livescores/latest` / hour | **≤ 5** (ideally 0) | ≤ 900 / hr per warm region* | > 2× match target |
| **SM_TOTAL_QPH** | All Sportmonks calls / hour (all entities) | ≤ 50 / hr @ 1 home user | ≤ 2,500 / hr @ 1 user live+match | Spike without live fixtures |
| **SM_PER_UV** | SM calls / unique visitor / session | ≤ 30 idle home session | ≤ 200 live 90m session (warm) | — |
| **ESPN_SUMMARY_QPH** | ESPN match summary (crónica) / hour | ~0 | ≤ 60 / live match (1/min cache) | > 120 / match |
| **ANTHROPIC_QPD** | Messages API calls / day | ≤ 50 (stories + cable) | ≤ 500 on busy jornada (beats) | Duplicate scripts for same beat id |
| **ELEVEN_CHARS_QPD** | TTS characters / day | Cable cold only | Live radio + cable | Same audio regenerated across instances |
| **CACHE_HIT_RATIO** | `singleFlight`/TTL hits ÷ API route hits | ≥ **85%** idle | ≥ **70%** live | < 50% |
| **P95_SCORE_LAG** | Time from SM livescores payload → UI score update | n/a | **≤ 8 s** (5s poll + 4s TTL) | > 15 s with tab visible |
| **IDLE_POLL_RATIO** | Client polls while pace=idle ÷ all polls | ≥ 90% of calendar hours | — | Idle hours still at 5s |

\*With one warm instance + 4s livescores TTL: theoretical floor ≈ `3600/4 = 900` Fixture calls/hr for latest alone. Match snap + date boards share the same **2,000/hr Starter** bucket — stay under soft cap **1,800**.

### Secondary KPIs

| KPI | Why |
|-----|-----|
| **CLIENT_GOD_QPH** | Browser `/api/games-of-day` — should be 1 stream per tab, not × widgets |
| **RADIO_GETMATCH_QPH** | Radio route match fetches — should ≈ sports-match cache hits after fix |
| **COLD_START_AI** | Anthropic+TTS on first radio open per match — expect 1 set per match/style/instance |
| **VERCEL_FN_QPH** | Function invocations — correlates with client poll × users |

---

## 6. Scenario budgets (math from current code)

Assumptions: tab visible; Sportmonks on; one warm serverless instance unless noted.

### A — Quiet weekday · 1 user · home 1 hour · idle

| Hop | Est. calls / hr | Notes |
|-----|-----------------|-------|
| Client → games-of-day | ~103 | `3600/35` shared stream |
| Client → jornada | ~103 | Separate poller |
| Client → stories/cable | ~3 once | Mount |
| **SM date boards** | ~200 | 2 dates × ~103 GOD misses (no date TTL) |
| **SM livescores** | **~103 today** | Jornada → `fetchLigaMxFixtures` always | → **target 0** after gate |
| **SM season** | ~12 | 5m cache |
| ESPN El Tri schedule | ~103 | Per GOD miss |

**Quiet-day cost driver today:** jornada’s unconditional livescores.

### B — Match night · 1 user · home + 1 match chapter · 90 min live

| Hop | Est. / 90m |
|-----|------------|
| Client → GOD + jornada + sports-match | ~3 × 1,080 = **~3,240** |
| Client → radio (if tab open) | ~154 @ 35s |
| SM livescores (unique @ 4s) | ~1,350 |
| SM match detail | ~1,080 (+ radio extras if uncached) |
| ESPN crónica | ~90 (60s reuse) |
| Anthropic + TTS | ~20–80 beat pairs (event density) |

**Score lag budget:** ≤ ~5s client + ≤ ~4s API ≈ **≤ 9s** worst coalesce (often less on cache hit).

### C — Match night · 50 concurrent · same pages · 90 min

| Layer | Best (1 warm instance) | Worst (50 cold isolates) |
|-------|------------------------|---------------------------|
| Client → our API | ~170k | same (CDN may cut) |
| SM livescores | ~1.3k | **~67k** |
| SM match detail | ~1.3k | **~67k** |
| Anthropic/TTS radio | ~1 beat set | **×50** = primary $ risk |

**Company risk:** AI/TTS and SM detail explode with instance count, not with UX need. Shared KV/Redis for match + radio beats is the scaling fix.

---

## 7. Cost risk register

| # | Risk | Severity | Mitigation status |
|---|------|----------|-------------------|
| R1 | Jornada/LigaMX always call livescores | **High** (24/7) | **Closed** — near-kickoff gate |
| R2 | Radio bypasses match cache | **High** on match night | **Closed** — peek sports-match + snap TTL |
| R3 | Multi-instance AI/TTS duplication | **Critical** at scale | Open — external beat/audio cache |
| R4 | Date fixtures no module TTL | Medium | **Closed** — 12s singleFlight |
| R5 | ESPN enrich background after budget | Medium | Cached 60s; monitor |
| R6 | Cable brief cold (stories+jornada+AI+TTS) | Medium | 2h bucket; defer until Play |
| R7 | Stories double-fetch on home | Low | Shared fetch |
| R8 | WC fixtures API TTL always 4s | Low | Pace-aware TTL |
| R9 | Season include payload every 5m | Low | Already cached |
| R10 | Livescores still includes `state` + `events.type` | Medium | Open — local `/states`+/`types` cache |

---

## 8. Instrumentation (must ship to manage $)

Without counters we are flying blind. Minimum viable:

| Signal | Where | How |
|--------|-------|-----|
| `af.upstream.sm` | `smFetch` | Increment path tag: `livescores\|date\|season\|fixture\|standings\|form\|h2h` |
| `af.upstream.espn` | `espnFetch` | Tag host path |
| `af.cache.hit` / `miss` | `singleFlight` / pace peek | Per cache key family |
| `af.ai.anthropic` | `anthropicChat` | + model + purpose (`radio\|cable\|story`) |
| `af.ai.tts` | ElevenLabs wrapper | + chars |
| `af.pace` | API responses | Already: `X-AF-Pace` header — log it |
| Dashboard | Vercel logs or Axiom/Datadog | Hourly rollup of above |

**Review ritual:** Friday 15 min — check SM_LIVE_QPH on a non-matchday (must be ~0 after R1 fix), ANTHROPIC_QPD, ELEVEN_CHARS_QPD.

---

## 9. Priority lean backlog

Ordered by $/effort:

1. ~~Gate livescores in `fetchLigaMxFixtures`~~ **Done**
2. ~~TTL + singleFlight for date boards + match snapshot~~ **Done**
3. ~~Radio reuses sports-match cache~~ **Done**
4. **Cache `/states` + `/types`**; drop `state` / `events.type` from livescores includes.
5. **Shared `/api/stories` client fetch**; load cable-brief only on Play.
6. **Env overrides** for `FRESH_*` and `RADIO_ENABLED` / max beats per match.
7. **External cache (Vercel KV / Redis)** for games-of-day, match snapshots, radio beats — required before paid traffic spikes.
8. **Remove or wire orphans** (`/api/pulse`, LiveTicker) so they don’t surprise-cost later.
9. **Align `FRESH.storiesTtlMs` with stories route** (60 vs 120).
10. **Upstream counters** (`af.upstream.sm`, cache hit ratio) — fly with instruments.

---

## 10. Dollar worksheet (fill in)

| Meter | Rate | Quiet day est. | Match day est. | Monthly |
|-------|------|----------------|----------------|---------|
| Sportmonks calls | $____ / 10k | ____ | ____ | ____ |
| Anthropic tokens | $____ / 1M | ____ | ____ | ____ |
| ElevenLabs chars | $____ / 1k | ____ | ____ | ____ |
| Vercel functions | $____ / 1M | ____ | ____ | ____ |
| **Total** | | | | **$____** |

Break-even rule of thumb: if quiet-day SM_LIVE_QPH is not ~0, you are paying for live data when there is no live product value.

---

## 11. Owner checklist

- [ ] Fill provider rates in §3 / §10
- [ ] Ship instrumentation §8
- [x] Close R1 (livescores gate)
- [x] Close R2 (radio cache)
- [ ] Cache SM types/states (R10)
- [ ] Revisit FRESH numbers after 2 live jornadas of real metrics
- [ ] Plan KV before 50+ concurrent radio listeners

---

*Related: `docs/AF_BRAND_VISION.md` (product), `docs/AF_SPORTMONKS_BEST_PRACTICES.md` (upstream API), `src/lib/sports/freshness.ts` (intervals).*
