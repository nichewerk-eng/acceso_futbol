# Acceso Futbol — SEO / indexation plan

Canonical host: **https://www.accesofutbol.com** (matches Vercel primary). Apex `accesofutbol.com` must **308 Permanent Redirect** → www at the Vercel domain layer — do **not** add app-level redirects the other way (that creates a loop).

Vercel’s default apex redirect is **307 Temporary**. Change it: Vercel → Project → Settings → Domains → Edit `accesofutbol.com` → status **308 Permanent Redirect**. A 307 is why GSC lists `https://accesofutbol.com/` under **Page with redirect** and may not pass ranking to www.

That GSC row will **stay** after the 308 — Google correctly refuses to index a URL that only redirects. The indexed homepage is `https://www.accesofutbol.com/`. Do not click “Done fixing?” expecting the apex URL to become indexed.

## Phase 0 — GSC (ops, not code)

Do in [Google Search Console](https://search.google.com/search-console) on the **Domain** property `accesofutbol.com` (covers both hosts) or the URL-prefix **`https://www.accesofutbol.com/`**:

1. Prefer Domain property `accesofutbol.com`, or URL-prefix www (the live host).
2. Submit sitemap: `https://www.accesofutbol.com/sitemap.xml`.
3. URL Inspection on **www** URLs (never the apex): `/`, `/horarios`, `/liga-mx`, `/donde-ver`, `/quiniela`, `/leagues-cup`, one `/club/*`, one `/donde-ver/*`, one `/momento/*`, one `/partido/*`.
4. Request indexing if “URL is unknown to Google” after deploy.
5. Monitor Coverage / Page indexing for soft-404 or duplicate `/inicio`.
6. Ignore “not on Google” for brand-new paths until after Request indexing + a few days.
7. Ignore **Page with redirect** for `https://accesofutbol.com/` — that is the apex→www canonicalization working.

## Phase 1 — Technical (shipped in code)

| Item | Status |
|------|--------|
| Sitemap: hubs + clubs + momentos + partidos | Done |
| Canonical www; apex → www at Vercel only (no app www→apex) | Done |
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
| `/horarios` crawlable calendar (Liga MX horarios + CDMX times) | Done |
| `/calendario` → `/horarios` | Done |

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
curl -sI https://accesofutbol.com/ | grep -iE 'HTTP/|location'   # expect 308 → www
curl -sI https://www.accesofutbol.com/liga-mx | head -1          # expect 200
curl -s https://www.accesofutbol.com/sitemap.xml | head
```
