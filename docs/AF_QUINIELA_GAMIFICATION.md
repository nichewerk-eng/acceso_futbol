# Acceso Futbol — Quiniela gamification & retention plan

Source of truth for turning the quiniela from a one-and-done matchday game into a
**ritual fans come back to every jornada**. Product work on `/quiniela` should serve
this doc and `AF_BRAND_VISION.md` (pillar 5 — **Play**: "why you stay between whistles").

Last reviewed: 2026-08-24.
Related: `AF_BRAND_VISION.md` (product), `AF_DATA_KPIS.md` (cost discipline), `AF_SEO_PLAN.md`.

Code today:
- Page / SSR board: `src/app/quiniela/page.tsx`, `src/components/quiniela/QuinielaBoard.tsx`
- Board + scoring + leaderboard: `src/lib/quiniela/service.ts`
- Client state + anon id: `src/lib/client/useQuiniela.ts`
- Pick storage (Upstash hash per jornada): `src/lib/quiniela/store.ts`
- Jornada selection / hold-then-roll: `src/lib/quiniela/jornada.ts`
- Push (VAPID) + 1-min cron: `src/lib/push/*`, `vercel.json`
- Gravity (favorite club): `src/contexts/GravityContext.tsx`
- Share/OG image pattern: `src/app/quiniela/opengraph-image.tsx`, `src/components/standings/generateImage.ts`

---

## 1. Diagnosis — why it doesn't retain today

The quiniela is well-built but has **no memory and no voice**.

| Gap | Evidence in code | Retention cost |
|-----|------------------|----------------|
| Nothing accrues between jornadas | `getLeaderboard` is scoped to `board.jornadaKey`; sealed tabla holds one Mexico day then rolls (`jornada.ts`) | No thread pulls a J(n) player into J(n+1) |
| No trigger to return | No quiniela-specific push; subs target club gravity only (`src/lib/push/store.ts` `PushSub`) | User must *remember* to come back |
| No durable identity | Anonymous `af-quiniela-id` in localStorage (`useQuiniela.ts`) | Progress dies on device/storage loss; no cross-device |
| Flat reward | `scoreAgainst` = 1 pt per correct final (`service.ts`) | No aspirational peak, no celebration |
| No shareable artifact | Only a static page OG (`opengraph-image.tsx`) | Wastes the brand's #1 organic strength (share cards) |

Core fix: **give the game memory (season + streaks), a durable identity (accounts),
a voice (pushes), and a face (share cards).**

---

## 2. Strategy — three nested return loops

Framed on the Hook model (trigger → action → variable reward → investment).

| Loop | Cadence | Hook that pulls them back |
|------|---------|---------------------------|
| **Jornada** | Several times per matchday | Push + live "vas ganando" rank movement as results land |
| **Season** | Every jornada | Cumulative season standing + a **streak** you won't break |
| **Social** | Ongoing | Share cards that recruit; friend pools (future) |

The **Season loop is the primitive that's missing** and the highest-ROI build.

---

## 3. Scope decisions (locked 2026-08-24)

| Decision | Choice |
|----------|--------|
| **Identity** | Lightweight **magic-link / email account** as the foundation, built **before** streaks so season progress is durable and cross-device. Mailer = **Resend**. |
| **Scoring model** | **Keep the simple 1-point-per-correct model** (`scoreAgainst` unchanged) |
| **In scope** | Season memory + **rachas (streaks)**, **Quiniela perfecta** celebration + share card, **Estampas (badges)** |
| **Out of scope (for now)** | El Palomazo (banker/double pick), Bono de sorpresa (upset bonus) |
| **Deferred / future** | Grupos privados (friend pools) — accounts make it viable; see §10 |

Everything below (streaks, badges, perfect card) computes **off the existing 1-point
results** — no change to how points are earned.

---

## 4. Identity foundation — magic-link accounts (Phase 1, prerequisite)

Goal: keep "sin cuenta para **jugar**", add "con cuenta (solo email) para **guardar tu
racha** y verla en cualquier dispositivo." Play stays zero-friction; the account is the
prompt to *save your streak / season*.

**Flow**
1. User plays anonymously with today's `af-quiniela-id` (unchanged first-touch).
2. After first save (or when a streak exists), prompt: *"Guarda tu racha — deja tu email."*
3. Email a one-time magic link → click sets a signed **httpOnly session cookie**.
4. On claim, **merge the anon id's picks/history into the account** and repoint future writes to `accountId`.

**Data model (Upstash KV)**
| Key | Value |
|-----|-------|
| `quiniela:account:{accountId}` | `{ email, name, createdAt }` |
| `quiniela:account-by-email:{sha256(email)}` | `accountId` |
| `quiniela:magic:{token}` | `accountId` via `kvSetNx(..., 15m)` (single-use) |
| `quiniela:session:{sessionId}` | `accountId` (cookie holds `sessionId`) |

**New surface**
- `src/lib/quiniela/account.ts` — create/lookup/link, token mint+verify (reuse `kvSetNx`, `sharedKv`).
- `src/lib/quiniela/mail.ts` — Resend wrapper; dev fallback logs the link.
- `src/app/api/quiniela/auth/request/route.ts` — POST email → mint token → send mail.
- `src/app/api/quiniela/auth/verify/route.ts` — GET `?token=` → set cookie → redirect `/quiniela`.
- Extend `sanitizeUserId` acceptance so `submitPicks` accepts an account-scoped id.

**Email transport — Resend (chosen 2026-08-24).** Add the `resend` dependency + a thin
`mail.ts` wrapper; env `RESEND_API_KEY` + `QUINIELA_MAIL_FROM`. Dev fallback (no key)
logs the magic link to the server console so the flow is testable without sending mail.

**Anti-abuse (no prizes yet, keep light):** per-email rate-limit on magic requests
(`kvSetNx` cooldown), reuse existing `sanitizeName`. Real fraud controls only matter if
sponsor prizes attach (see `mediaKit.ts` "patrocinador de jornada").

---

## 5. Season memory + rachas (Phase 2 — the core retention fix)

Built on accounts so it survives devices.

**Season standing** — cumulative correct picks across all Apertura 2026 jornadas.
Maintain **incrementally on jornada seal** (do NOT rescan every request — respects
`AF_DATA_KPIS.md`). When a jornada's board is fully `post`, roll each account's totals.

| Key | Value |
|-----|-------|
| `quiniela:season:{QUINIELA_TORNEO}` | hash `accountId → { points, jornadasPlayed, lastJornada, ... }` |
| `quiniela:streak:{accountId}` | `{ participation, accuracy, best }` |

**Rachas (streaks)**
- **Participation streak** — consecutive jornadas with a saved full card. The loss-aversion driver ("no rompas tu racha de 4").
- **Accuracy streak** — consecutive correct picks (cross-match). A secondary flex stat.
- Surfaced with a flame + count on the board headline and the credencial.

**Credencial de quinielero** — personal profile panel: season points + rank, best
jornada, current/best streak, win rate, badges (§7).

**Touchpoints**
- `src/lib/quiniela/season.ts` — seal-time rollup + streak update; season leaderboard read.
- Extend `QuinielaBoard` payload (`types.ts`) with `season?` + `streak?` for the caller.
- `QuinielaBoard.tsx` — headline shows streak; new "Temporada" tab/section for the season tabla + credencial.
- Trigger seal rollup from the existing jornada-roll logic in `jornada.ts` / board build, guarded by an idempotency key so it runs once per sealed jornada.

**Scoring stays 1-point.** Season = sum of per-jornada points; streaks = derived. No
change to `scoreAgainst`.

---

## 6. Re-engagement pushes (Phase 3 — the trigger)

Reuse `src/lib/push/*` + a new cron alongside `push-dispatch` in `vercel.json`.

| Push | When | Copy example |
|------|------|--------------|
| Cierre reminder | ~2–3h before first kickoff, to opted-in players missing picks | "La quiniela de la J6 cierra en 2h — te faltan 4 partidos" |
| Resultado | After a player's matches settle | "Vas 5/6, subiste a #2" |
| Racha en riesgo | New jornada open + a streak exists, still no card | "No pierdas tu racha de 4 — abre la J7" |
| Nueva jornada | Board rolls to J(n+1) | "Ya abrió la quiniela de la J8" |

**Required extension:** bind a push subscription to the **account/quiniela id** (today
`PushSub` in `src/lib/push/store.ts` carries only `clubId`/`elTri`). Add optional
`quinielaAccountId` so the dispatcher can target players, not just club gravity.

**Copy change:** update `/quiniela` FAQ ("¿Necesito una cuenta?") to reflect play-free,
account-to-keep-your-streak.

---

## 7. Quiniela perfecta + Estampas (Phase 4)

**Quiniela perfecta** — all picks correct in a jornada → confetti/stamp moment +
auto-generated share card. Rare, aspirational, shareable.

**Estampas (badges)** — collectible achievements on the credencial, all computable from
the 1-point results + streaks:
- Primera quiniela · Racha 5 · Quiniela perfecta · Top-10 de jornada · Campeón de jornada · Clásico llamado · Temporada completa.

| Key | Value |
|-----|-------|
| `quiniela:badges:{accountId}` | set of earned badge ids + earnedAt |

**Share cards** (reuse the `opengraph-image.tsx` / `generateImage.ts` pattern):
- Post-jornada **resultado** card: "Saqué 7/9 en la J5 — #2 en Acceso".
- **Reto** card (pre-jornada) to recruit players.
- **Perfecta** card on the celebration.
- New dynamic routes, e.g. `src/app/quiniela/share/[jornada]/opengraph-image.tsx`.

**Touchpoints**
- `src/lib/quiniela/badges.ts` — evaluate/award at seal-time (same hook as season rollup).
- Client celebration in `QuinielaBoard.tsx` (confetti gated to first view of a perfecta).

---

## 8. Phased roadmap

| Phase | Ship | Status |
|-------|------|--------|
| **0** | Instrument funnel — client events `Quiniela view` / `card start` / `name set` / `return` (`useQuiniela.ts`) + server `Quiniela save` (`api/quiniela/pick`) | **Shipped** |
| **1** | Magic-link/email accounts (Resend) + anon→account merge | Todo |
| **2** | Season standing + rachas + credencial (seal-time rollup) | Todo |
| **3** | Re-engagement pushes bound to account id + new cron | Todo |
| **4** | Quiniela perfecta celebration + estampas + share cards | Todo |
| **Future** | Grupos privados (friend pools) — see §10 | Deferred |

Phase 0 shipped. Phase 1 mailer = **Resend** (see §4).

---

## 9. Metrics (track weekly, KPI-doc style)

| KPI | Definition | Target |
|-----|------------|--------|
| **QJOR_RETENTION** | % of J(n) players who play J(n+1) | North-star; grow week-over-week |
| **QD7_RETURN** | % who return within 7 days | — |
| **QACCT_CLAIM** | % of savers who create an account | ≥ 30% of repeat players |
| **QPUSH_OPTIN / QPUSH_CTR** | opt-in rate / click-through on quiniela pushes | CTR ≥ 8% |
| **QCARD_SHARE** | result/reto/perfecta cards shared per jornada | Growth |
| **QSTREAK_MEDIAN** | median participation streak of active players | Rising |

**Phase 0 events (live now):** `Quiniela view` `{ jornada, returning, gap }` ·
`Quiniela card start` `{ jornada }` · `Quiniela name set` `{ jornada }` ·
`Quiniela return` `{ jornada, gap }` · server `Quiniela save` `{ jornada, picks }`.
Retention = saves for J(n+1) among `Quiniela view` `returning:true` / prior savers.

---

## 10. Out of scope / future

- **El Palomazo (banker pick)** and **Bono de sorpresa (upset bonus)** — deliberately
  excluded; scoring stays 1-point. Revisit only if the flat leaderboard needs spreading.
- **Grupos privados (friend pools)** — highest social-retention feature; accounts (Phase 1)
  make it viable (create pool, share-code join, private tabla). Documented for later; not
  in the current build.
- **Prizes / sponsor tie-in** — would require real anti-abuse and ties to `mediaKit.ts`.

---

## 11. Risks & open decisions

| # | Risk / decision | Note |
|---|-----------------|------|
| R1 | Email transport | **Resolved — Resend** (`RESEND_API_KEY`, `QUINIELA_MAIL_FROM`); dev fallback logs the link. |
| R2 | Anon→account merge correctness | Merge per-jornada picks + recompute season on claim; add `jornada.test.ts`-style coverage. |
| R3 | Seal-time rollup idempotency | Guard with a KV once-key per sealed jornada so cron/traffic can't double-count. |
| R4 | Cost | Keep season/badges rollup **on seal**, not per request; pushes within `AF_DATA_KPIS.md` budget. |
| R5 | "One board" rule (`AGENTS.md`) | Quiniela already derives from `fetchLigaMxFixtures`; any new live surface must too. |
| R6 | Multi-account gaming | Acceptable while prize-free; revisit with sponsor prizes. |

---

## 12. Quick verify (per phase)

```bash
# Phase 0 — funnel events fire (check Vercel Analytics → Events for Quiniela *)
#   Quiniela view / card start / name set / return + server Quiniela save
# Phase 1 — accounts
curl -s -X POST https://www.accesofutbol.com/api/quiniela/auth/request -d '{"email":"..."}'  # 200 + mail (or dev log)
# Phase 2 — season payload present
curl -s https://www.accesofutbol.com/api/quiniela | jq '.board.season, .board.streak'
# Phase 3 — quiniela push targeting
curl -s https://www.accesofutbol.com/api/ops/live-health | jq '.sharedKv'   # KV up for subs
```
