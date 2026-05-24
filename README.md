# Acceso Fútbol

Landing page and TikTok embed widget for [accesofutbol.com](https://accesofutbol.com).

## Features

- Homepage with TikTok profile embed (official TikTok widget)
- Optional featured videos via TikTok iframe player
- Standalone embed route at `/embed/tiktok` for GoDaddy or other site builders
- Configurable TikTok username and video IDs via environment variables

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env.local
```

3. Edit `.env.local` with your TikTok handle and optional video IDs:

```env
NEXT_PUBLIC_TIKTOK_USERNAME=your_tiktok_handle
NEXT_PUBLIC_TIKTOK_VIDEO_IDS=6718335390845095173,7123456789012345678
```

Video IDs are the numeric part from a TikTok URL:
`https://www.tiktok.com/@user/video/6718335390845095173` → `6718335390845095173`

4. Run locally:

```bash
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

Deploy to Vercel (recommended) and point your domain DNS to the deployment. Then replace the GoDaddy placeholder site or embed the `/embed/tiktok` route.

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
