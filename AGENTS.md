<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:git-home-fix -->
# Git in agent shells

If `HOME` is not `/Users/jondev`, export it before `git commit` / `git push`. A broken relative `HOME` (e.g. `1356`) blocks osxkeychain GitHub auth.
<!-- END:git-home-fix -->

<!-- BEGIN:live-data-one-board -->
# Live scores come from ONE board

There is a single source of truth for Liga MX scores: `fetchLigaMxFixtures()` /
`getLigaMxBoard()` in `src/lib/sports/espnFallback.ts`. It merges the static
calendar + Sportmonks season + date window and overlays the **shared**
`/livescores` feed once, cached under `liga-mx-board-v1` (shared across Vercel
isolates via Upstash KV).

Rules for any new live surface:
- Derive Liga MX rows from that board (filter/shape), then `attachDondeVer`. Do
  NOT add a second `fetchFixturesByDate` + `fetchLivescores` + merge — that
  reintroduces cross-surface drift.
- Use `livingRoomLeagueIds()` for `fetchLivescores` so every surface reads one
  sticky board (one cache key), then filter by `f.league`.
- API routes should go through `serveSwr`; it prefers the KV payload over any
  static `seed` so cold isolates don't flash a stale board.
- Verify with `GET /api/ops/drift` (`ok: true` = every shared fixture agrees on
  score + state) and `GET /api/ops/live-health` (`sharedKv`, `sharedRemaining`).
<!-- END:live-data-one-board -->
