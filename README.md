# Acceso Fútbol

Landing page and TikTok embed widget for [accesofutbol.com](https://accesofutbol.com).

TikTok: [@accesofutbolmx](https://www.tiktok.com/@accesofutbolmx)

## Features

- Homepage with TikTok profile embed (official TikTok widget)
- Optional featured videos via TikTok iframe player
- Standalone embed route at `/embed/tiktok` for GoDaddy or other site builders

## Setup

```bash
npm install
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
