# Acceso Futbol — SEO / indexation plan

Canonical host: **https://www.accesofutbol.com** (matches Vercel primary). Apex `accesofutbol.com` should 307 → www at the Vercel domain layer — do **not** add app-level redirects the other way (that creates a loop).

## Phase 0 — GSC (ops, not code)

Do in [Google Search Console](https://search.google.com/search-console) on the **Domain** property `accesofutbol.com` (covers both hosts) or the URL-prefix **`https://www.accesofutbol.com/`**:

1. Prefer Domain property `accesofutbol.com`, or URL-prefix www (the live host).
2. Submit sitemap: `https://www.accesofutbol.com/sitemap.xml`.
3. URL Inspection on www URLs: `/`, `/liga-mx`, `/leagues-cup`, one `/club/*`, one `/momento/*`, one `/partido/*`.
4. Request indexing if “URL is unknown to Google” after deploy.
5. Monitor Coverage / Page indexing for soft-404 or duplicate `/inicio`.
6. Ignore “not on Google” for brand-new paths until after Request indexing + a few days.

## Phase 1 — Technical (shipped in code)

| Item | Status |
|------|--------|
| Sitemap: hubs + clubs + momentos + partidos | Done |
| www → apex redirect (middleware + next.config) | Done |
| `/inicio` noindex + canonical `/` + robots disallow | Done |
| Home / partido / club SSR crawl shells | Done |
| Momento canonical, OG article, NewsArticle JSON-LD | Done |
| Club SportsTeam JSON-LD | Done |

## Phase 2 — Trust pages

| Item | Status |
|------|--------|
| `/nosotros` | Done |
| `/contacto` | Done |
| Footer internal links | Done |
| Organization sameAs (TikTok, IG, FB, YT) | Done |

## Phase 3 — Content architecture

| Item | Status |
|------|--------|
| Momento → related clubs + related momentos | Done |
| Internal links to Liga MX / cable | Done |

## Phase 4 — Entity consistency

- Keep `siteConfig.url`, Open Graph `url`, JSON-LD `url`, and sitemap host aligned on **www**.
- Prefer one title pattern: topic + Acceso Futbol (layout template).
- Social profile URLs live in `siteConfig.social` — update if handles change.

## Phase 5 — Ongoing ops

- After each major content/fixture season: re-submit sitemap if URL count jumps.
- Watch GSC for “Crawled – currently not indexed” on thin client shells (partido without Sportmonks).
- Optional Upstash / live health does not affect SEO; crawl quality does.
- Authority (backlinks, social embeds) is mostly off-site — media kit + press outreach.

## Quick verify after deploy

```bash
curl -sI https://accesofutbol.com/ | grep -i location   # expect → www
curl -sI https://www.accesofutbol.com/liga-mx | head -1  # expect 200
curl -s https://www.accesofutbol.com/sitemap.xml | head
```
