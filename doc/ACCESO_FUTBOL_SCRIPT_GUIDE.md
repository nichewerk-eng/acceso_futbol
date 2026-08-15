# Acceso Fútbol — Script Writing Guide
### Juegos de Hoy, match recaps, and the supporting formats for a Jornada (built for J4 and every jornada after)

> **How to use this file:** Section 0 is the law — it applies to *everything*. Section 1 is the locked Juegos de Hoy template. Section 2 is the recap engine (the heart of jornada content). Section 3 is the rest of the jornada toolkit. Section 4 is how to turn all of it into a written **website** J4 recap. Sections 5–6 are the QA checklist and the voice cheat sheet you copy from.

---

## 0. Universal Rules — apply to EVERY script

These are non-negotiable. If a script breaks one of these, it's not ready.

**Language & text**
- **No accent marks on vowels in voiceover or on-screen text.** Write `Preparense`, `para mi`, `Seleccion`, `analisis`. **Keep the ñ** (`señor`, `mañana`). → *This rule is for VO and graphics only. Website articles are the exception — see Section 4.*
- **Never use em-dashes (—).** Use a period, a comma, or rewrite the line.
- Spanish (Mexican) is primary. English only when the audience/topic calls for it (e.g. a Mexican player abroad reaching a US audience).

**Structure & voice**
- **Mandatory standalone line after the hook, before the body:** `Preparense que arrancamos`.
- **Cold open:** no logo card for the first 3 seconds. The hook lands first.
- **First-person opinion is required** in any analysis/recap/opinion script: `yo creo`, `honestamente`, `para mi`, `yo ahi dije`. The narrator is a character, not a news anchor.
- **At least one verified stat per script.** Verify before writing (Spanish-language search first — Mexican outlets return better Liga MX data).
- **CTA must divide the audience** — binary or A/B/C so people argue in the comments. Never "follow for more."

**Order conventions**
- **Times:** Mexico Centro first, then US Central, then US Eastern.
- **Spoken clocks (VO, Escuchar, and any Toma/website prose that gets read aloud):** write the hour in words. Never a digital clock. Never a team-abbr pair in parentheses.
  - YES: `cinco de la tarde`, `siete de la noche`, `mediodía`, `lunes a las nueve de la noche`, `Pachuca contra Puebla`.
  - NO: `5:00 p.m.`, `7:10 p.m.`, `9:06 p.m.`, `19:00`, `(PAC–PUE)`, `PAC-PUE`.
  - Flatten awkward minutes (`:06`, `:10`) to the hour for voice. Exact clocks belong on Dónde ver / on-screen time blocks, not in the sentence the voice has to say.
- **Liga MX on screen, "Liga eme equis" in the voice.** Never write `LigaMX` in Toma copy. TTS expands `Liga MX` / `LigaMX` to the Spanish letter names. Nav and SEO stay `Liga MX`.
- **Channels:** Mexico first, then USA.
- **Broadcast rule:** the **local (home) team determines the broadcaster.** Verify every time. Known exclusives: **Chivas home = Amazon Prime**, **San Luis home = ESPN/Disney+**.

**Closes**
- **Recaps / news standard close:** `Para mas informacion de la Liga MX y Seleccion Mexicana, siguenos en Acceso Futbol`.
- **Do NOT use "suu!" or "crack" on recaps.** (Older reference files still show `Suu!`/`Siu!` at the end — that's outdated. Use the standard close.)

**Blocklist (do not use as a standalone primary angle)**
- Rafa Márquez appointment · Almada arrival · Gignac departure — each is stale as a standalone hook.
- Do **not** use "Atlante regreso / back after 12 years." Find fresher context.

**Runtime targets**

| Format | Target | Ceiling |
|---|---|---|
| Juegos de Hoy | 15–25s | 30s max |
| Opinion Caliente (post-match hot take) | 15–30s | post within 15 min of final whistle |
| Polémica y Debate | 15–30s | — |
| Micro-Análisis | 30–60s | — |
| Match recap (TikTok) | 68–75s | 80s (Creator Rewards floor is 68s) |
| Narrativas / storytelling | 45–90s | — |

> **Creator Rewards:** a video must be **60s+ AND hit 1,000 qualified views** to earn. Anything at 59s or under earns $0 no matter how well it does. Recaps live in the 68–80s band on purpose.

---

## 1. Juegos de Hoy — the locked template

**What it is:** the day's fixture rundown. Where and when to watch every game, Mexico and USA. This is utility content — a big share of its views come from Search, so it earns reach regardless of clock time. Post it the morning-of or the night before.

**Duration:** 15–25s, 30s hard cap. Keep it tight — this is not an analysis piece.

### Structure (3 parts)

**1) Intro hook** — competition + team/game count, then the mandatory line.
> `[N] juegos hoy en la [competencia]. Preparense que arrancamos.`

**2) Each match** — teams, time (MX → US Central → US Eastern, **spoken**), one line of context or a stat, then channels (MX → USA).
> `[Local] recibe a [Visitante]. [Hora hablada] centro de Mexico, [hora] centro y [hora] este en Estados Unidos. [Un dato o contexto breve]. Lo ves por [Canal MX] en Mexico y [Canal USA] en Estados Unidos.`
>
> Hora hablada = `siete de la noche`, never `7:10 p.m.` or `(PUM–TOL)`. Digits belong on the on-screen time block, not in the line the voice says.

**3) Close** — recap the count + day, then a dividing CTA, then the sign-off.
> `Esos son los [N] juegos de hoy [dia]. Dime en los comentarios quien crees que gane [partido estrella]. Te leo en los comentarios. Para mas informacion, siguenos en Acceso Futbol.`

### Illustrative example (verify all real fixtures, horarios y canales before publishing)

```
Cuatro juegos hoy en la Jornada 4 de la Liga MX. Preparense que arrancamos.

Pumas recibe a Toluca. Siete de la noche centro de Mexico, siete centro y
ocho este en Estados Unidos. Toluca llega de lider y de goleador. Lo ves
por [Canal MX] en Mexico y [Canal USA] en Estados Unidos.

[... siguiente partido, mismo formato ...]

Esos son los cuatro juegos de hoy sabado. Dime en los comentarios quien
crees que gane el Pumas contra Toluca. Te leo en los comentarios. Para mas
informacion, siguenos en Acceso Futbol.
```

### Package it
- **[VISUAL] cues:** crest vs crest per match; on-screen time block (MX/US); channel logos; a "J4" tag. Rotate a visual every 4–6s.
- **TikTok description (first 100 chars = hook):** `Todos los juegos de la J4 y donde verlos 🇲🇽🇺🇸 ¿Quién gana el partidazo? #LigaMX`
- **Hashtags (3–5):** `#LigaMX #FutbolMexicano #Jornada4 #FutbolTikTok` + team tag of the marquee game.
- **On-screen text:** team names, times, channels — the info people screenshot.

---

## 2. Match Recap Scripts — the engine of J4 content

A recap is a **take**, not a score report. Lead with the result and the most dramatic moment; give your opinion; end on a question with no wrong answer. Target 68–80s for TikTok.

### Pick your pattern

**Pattern A — High-drama / close result** (draws, comebacks, late winners, controversy)
1. **Score + framing hook** (0–5s): state the score, frame the angle. *"Empate con sabor a victoria o a derrota. Depende a quien le vas."*
2. **`Preparense que arrancamos`** (retention beat).
3. **Half-by-half / big picture** with a bold comparison. Escalate with a hypothetical (*"se enfrentan en una final y hoy le gana"*), then pivot with **"Pero…"**
4. **Goal-by-goal**, each its own mini-story: minute + build-up + scorer + reaction. Drop a personal aside between goals.
5. **Drama pivot:** penalty / red card / tactical shift — plus an **ironic** observation.
6. **Climax:** *"Lo imposible estaba sucediendo."*
7. **Dual-fan verdict:** *"Si eres de [A]… Si eres de [B]…"*
8. **CTA:** 2–3 layered questions → standard close.

**Pattern B — Dominant win** (blowouts, one-sided results)
1. **Score + flavor teaser** (0–5s): *"[Ganador] [X], [Perdedor] [Y], y hubo de todo."* Personality/pop-culture reference welcome when it fits the player/moment.
2. **`Preparense que arrancamos`.**
3. **Goal-by-goal with personality:** lead each with the minute, name the assist and the scorer, use apodos and celebrations.
4. **Team-level verdict:** one sentence on the functioning/idea of play.
5. **Forward-looking concern / debate:** *"Pero ojito, que se le vienen…"* + your honest take (*"yo honestamente no le veo…"*).
6. **CTA:** one sharp forward-looking question → standard close.

> Patterns can be **mixed**. A 3-1 with a strong losing stretch = mostly B, borrow A's dual-fan verdict. Match length to drama: a 0-0 needs creative framing to fill 68s; a 4-3 can push to 80s.

### Fill-in-the-blank

```
[SCORE]. [Framing hook in one sentence].
Preparense que arrancamos.

[Big-picture / dominant-stretch line with a bold comparison].
Pero...

[Goal 1: minuto + jugada + goleador + reaccion].
[Aside en primera persona].
[Goal 2: minuto + apodo + celebracion].
[Goal 3 si aplica: accion vivida + comparacion de estilo].

[Pivot de drama: penal / expulsion / cambio tactico].
[Observacion ironica].

[Veredicto de equipo en una linea].
[Preocupacion o debate hacia adelante]. Yo honestamente...

[Pregunta(s) de CTA que dividen]. Los leo a todos.
Para mas informacion de la Liga MX y Seleccion Mexicana, siguenos en Acceso Futbol.
```

### Pacing rules
- Each goal narration: 8–12s max. Transitions between goals: 2–3s.
- Never go 15s without naming a player.
- The "pero" pivot should feel like a gear shift.
- CTA questions are rapid-fire, not drawn out.

### Package it
- **[VISUAL]:** goal clips synced to narration; scorer name + minute on screen; a stat card for your one verified number; scoreboard for the dual-fan verdict.
- **Description:** lead with the take or the stat, not the score. *"Nadie esperaba esto de [equipo] en la J4 👀 #LigaMX"*
- **Hashtags:** `#LigaMX` + both team tags + `#FutbolTikTok` + one niche (`#Jornada4`).

---

## 3. The rest of the Jornada toolkit

Each of these is a **standalone** script. Never fold a major angle into another one.

**Pronósticos (predictions) — your #2 reach driver.** ~90s covering the whole jornada. Confident, specific picks with a short factual reason each. No hedging. A contrarian, arguable call beats a safe one. Lead the post on the boldest pick.

**Opinion Caliente — post-match hot take.** 15–30s, published within 15 min of the final whistle. Speed over polish. One take, one stat, one dividing question. This is first-class content on its own.

**Micro-Análisis.** 30–60s tactical breakdown of one thing: a matchup (*"Campillo anuló a Henry por 90 minutos"*), a formation shift, a set-piece problem. Use the real terms: `ratonero`, `línea de cinco`, `pelota parada`, `líbero`, `merodear el área`.

**Polémica y Debate.** 15–30s. One provocative question, framed to split the audience. Valid as standalone content — no match footage required.

**Tabla General (standings).** Full 18 teams, not just the big clubs. Color-code the zones (Liguilla / Play-In / crisis) and give one narrative line per team. **Always fetch live data before writing:** `https://www.espn.com/soccer/table/_/league/mex.1`. Bracket/tabla content pulls heavily from Search — phrase for it.

**Top 5 Noticias.** Five trending stories, ~30s each, delivered as **individual** scripts. Each stands alone.

**Reminder on tiebreakers (get these right — errors invite comment-section corrections):**
- **Liga MX Final:** tied aggregate → extra time → penalties. **Not** automatic advancement by table position.
- **CONCACAF Champions Cup:** away-goals tiebreaker (unlike Liga MX).

---

## 4. Writing the J4 recap for the WEBSITE

A website jornada recap is the same voice, different medium: a written article a reader scans and search engines index. The video patterns above still drive it — you're adapting, not starting over.

**The one rule that flips for the website: use proper accents.** The no-accent rule is for VO and on-screen graphics. A written article uses correct Spanish orthography (`análisis`, `Selección`, `pronóstico`) — it reads better and it's better for SEO.

### Article structure (jornada roundup)

1. **Headline + lead (SEO-first).** Put the searchable terms up top: `Resultados Jornada 4 Liga MX Apertura 2026: [angle]`. Open the first paragraph on the jornada's single biggest story or number, not a warm-up.
2. **Per-match mini-recaps.** One tight block per game — final score in the subhead, then 2–4 sentences: goal scorers + minutes, the decisive moment, one verified stat, and your first-person read. Reuse Pattern A/B logic per match (dominant vs dramatic).
3. **Standings implications.** Pull the live tabla from ESPN and note who moved into/out of the Liguilla, Play-In, and crisis zones after J4. This is the section Search rewards.
4. **Jornada standouts.** A short "XI or players of the jornada" beat, or the 2–3 individual performances worth naming.
5. **Debate close.** End on the same kind of dividing question you'd use on TikTok, inviting comments/shares.

### Website-specific notes
- **Lead with searchable phrasing:** scores, full team names, "Jornada 4", "resultados", "tabla" — these are what people type.
- **Keep the opinion.** The narrator's take is what separates this from a wire recap. At least one `yo creo` / `honestamente` per article.
- **One verified stat per match block**, minimum. Verify before publishing — a wrong number in an article lives longer than in a video.
- **Cover all the games**, not just América/Chivas/Cruz Azul. Every fanbase is a reader.
- **Spoken clocks in the column.** Escuchar reads this article. Write `Pachuca contra Puebla, lunes a las nueve de la noche`, never `9:06 p.m. (PAC–PUE)`.
- **Repurpose down, not up:** the article can seed the week's TikToks (each match block → an Opinion Caliente; the standings section → a Tabla General video).

---

## 5. Pre-publish QA checklist

Run this before anything ships. Aim for all boxes.

- [ ] Hook lands in the first 2–3 seconds (number, stake, or claim) — no logo card first.
- [ ] `Preparense que arrancamos` present (VO scripts).
- [ ] First-person opinion included (`yo creo` / `honestamente` / `para mi`).
- [ ] At least one **verified** stat.
- [ ] CTA divides the audience (binary or A/B/C).
- [ ] VO/on-screen text has **no vowel accents**; ñ preserved. *(Website article = accents ON.)*
- [ ] No em-dashes.
- [ ] Spoken clocks in VO / Toma / Escuchar copy (`siete de la noche`, full team names). No `9:06 p.m.` or `(PAC–PUE)`.
- [ ] Times in MX → US Central → US Eastern order; channels MX → USA. Digital clocks only on graphics / Dónde ver.
- [ ] Broadcast info verified (home team = broadcaster; check Chivas/San Luis exclusives).
- [ ] No "suu!"/"crack"; recaps/news end on the standard close.
- [ ] No blocklisted standalone angle.
- [ ] Within runtime target for the format.
- [ ] TikTok description: hook in first 100 chars, 1–3 emojis, 3–5 hashtags at the end.
- [ ] [VISUAL] cue roughly every 5–10s; thumbnail concept noted (longer content).
- [ ] Tiebreaker facts correct if relevant (Liga MX vs Concachampions).

---

## 6. Voice cheat sheet (copy from these)

**Times (spoken)**
`cinco de la tarde` · `siete de la noche` · `mediodía` · `lunes a las nueve de la noche` · `Pachuca contra Puebla`

**Goal / play**
`golazo` · `se mamó` · `qué perro jugadón` · `para cerrar la pinza` · `de taquito perro` · `marcaba su doblete` · `remata a los Zlatan`

**Match quality / narration**
`el partido de la jornada` · `nos regalaron un partidazo` · `magistral primera parte` · `no fueron ni la sombra de eso` · `el segundo tiempo [equipo] no existía` · `hubo de todo` · `pasó de todo`

**Transitions & pivots**
`vámonos por partes` · `pero arrancaría el segundo tiempo y…` · `y de ahí nos vamos al [minuto]` · `y cuando todo parecía que…` · `lo imposible estaba sucediendo`

**Tactical terms**
`ratonero` · `mezquino` · `echado atrás` · `línea de cinco` · `líbero` · `tres centrales` · `pelota parada` · `juego aéreo` · `merodear el área` · `le pasó por encima` · `anticipó bien`

**Framing devices**
`con todo respeto…` (softens hard criticism) · `la verdad es que…` · `hay que reconocer…` (credit to a rival) · `no entiendo…` (confusion as critique)

**Concern / debate starters**
`pero ojito, que…` · `se le vienen [N] rivales bastante pesados` · `no le veo ese fondo de vestidor` · `¿qué carajos le pasó al equipo?`

**Fan-addressing**
`si eres de [equipo]…` · `sin importar a qué equipo le vayas` · `depende a quién le vas`

**Closes (recaps/news)**
`Dejenlo abajo, los leo a todos.` → `Para mas informacion de la Liga MX y Seleccion Mexicana, siguenos en Acceso Futbol.`

---

## Production workflow (quick reference)
1. **Verify first** — Spanish-language search on Mexican outlets before writing a word. Use conditional language for unconfirmed items (`según reportes`, `rondaría`). Never fabricate a score.
2. **Standings** — always `web_fetch` the live ESPN tabla before any tabla content.
3. **Broadcast** — confirm home-team broadcaster and the Chivas/San Luis exclusives every time.
4. **Deliver** — video scripts as DOCX to `/mnt/user-data/outputs/` per the locked template; website recaps as article copy with accents on.
