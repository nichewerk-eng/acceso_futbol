# Acceso Fútbol

Where fútbol mexicano lives — [accesofutbol.com](https://accesofutbol.com).

Brand vision: [`docs/AF_BRAND_VISION.md`](docs/AF_BRAND_VISION.md)  
TikTok: [@accesofutbolmx](https://www.tiktok.com/@accesofutbolmx)

## Features

- **Pulso home** (`/`) — living room: tonight’s story, gravity, Moments, show, ritual inventory
- **Match chapters** (`/partido/...`) — crónica, datos, Acceso Radio
- **Acceso Radio** — Caliente / Táctico / Puente (~30s delay; browser voice without keys; Anthropic + ElevenLabs when configured)
- **Momentos** (`/momento/[id]`) — sharable editorial units
- Liga MX table / Mundial tools / Media kit
- Sportmonks-ready sports layer (ESPN fallback until `SPORTMONKS_API_TOKEN` is set)

## Setup

```bash
npm install
cp .env.example .env.local   # optional Sportmonks / Radio keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Embed on GoDaddy (iframe)

If you keep the GoDaddy site and want to show the TikTok widget without replacing the whole site, deploy this project and add a **Custom HTML** block:

```html
<iframe
  src="https://accesofutbol.com/embed/tiktok"
  width="100%"
  height="900"
  style="border:0; border-radius:16px; overflow:hidden;"
  loading="lazy"
  title="Acceso Fútbol en TikTok"
></iframe>
```

## Deploy

Deploy to Vercel (recommended) and point your domain DNS to the deployment.

```bash
npm run build
npm run start
```

## TikTok embed options

| Method | Use case |
|--------|----------|
| Profile embed (`TikTokProfileEmbed`) | Shows profile card + recent videos |
| Video iframe (`TikTokVideoPlayer`) | Single video player, good for highlights |
| `/embed/tiktok` page | Drop-in iframe for GoDaddy or other builders |

Official docs: [TikTok Embeds](https://www.tiktok.com/embed)
