/**
 * Magic-link email for the quiniela via the Resend REST API (no SDK dependency).
 * When `RESEND_API_KEY` is missing (local dev), we log the link to the server
 * console instead of sending, so the whole flow is testable without a mailbox.
 *
 * Env:
 *   RESEND_API_KEY       — Resend "Sending access" key
 *   QUINIELA_MAIL_FROM   — e.g. `Acceso Futbol <quiniela@accesofutbol.com>`
 */

import { siteConfig } from '@/config/site';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const DEFAULT_FROM = 'Acceso Futbol <quiniela@accesofutbol.com>';
const BASE = siteConfig.url;

export function mailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

function fromAddress(): string {
  return process.env.QUINIELA_MAIL_FROM?.trim() || DEFAULT_FROM;
}

function magicHtml(url: string): string {
  const year = siteConfig.founded;
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>Guarda tu racha</title>
</head>
<body style="margin:0;padding:0;background:#eceae5;-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#eceae5;">Tu enlace para guardar tu racha en Acceso Futbol — vence en 15 minutos.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eceae5;">
  <tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" width="480" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:480px;background:#ffffff;border:1px solid #e0ded9;border-radius:3px;">
      <tr><td style="padding:26px 28px 0;">
        <img src="${BASE}/logo-dark.png" width="128" height="82" alt="Acceso Futbol" style="display:block;border:0;outline:none;width:128px;height:auto;">
      </td></tr>
      <tr><td style="padding:18px 28px 6px;font-family:Arial,Helvetica,sans-serif;color:#1e223d;">
        <p style="margin:0 0 10px;font:700 11px/1 'Courier New',Courier,monospace;letter-spacing:.2em;text-transform:uppercase;color:#f54f1b;">AF · Quiniela</p>
        <h1 style="margin:0 0 12px;font-size:24px;line-height:1.15;color:#1e223d;">Guarda tu racha</h1>
        <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#3a3f52;">Conserva tu quiniela, tu racha y tu historial en cualquier teléfono o computadora. Sin contraseña, solo toca el botón.</p>
      </td></tr>
      <tr><td style="padding:0 28px 22px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td align="center" bgcolor="#f54f1b" style="border-radius:2px;">
            <a href="${url}" style="display:inline-block;padding:14px 26px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:.02em;">Guardar mi racha &rarr;</a>
          </td>
        </tr></table>
        <p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:#8a8e9c;">El enlace vence en 15 minutos y solo funciona una vez. Si no lo pediste, ignora este correo.</p>
      </td></tr>
      <tr><td style="padding:0 28px;"><div style="border-top:1px solid #e0ded9;font-size:0;line-height:0;">&nbsp;</div></td></tr>
      <tr><td style="padding:18px 28px 26px;font-family:Arial,Helvetica,sans-serif;">
        <p style="margin:0 0 10px;font-size:13px;line-height:1;">
          <a href="${BASE}/quiniela" style="color:#1e223d;text-decoration:none;font-weight:600;">Quiniela</a>
          <span style="color:#c9c6c0;">&nbsp;·&nbsp;</span>
          <a href="${BASE}/donde-ver" style="color:#1e223d;text-decoration:none;font-weight:600;">Dónde ver</a>
          <span style="color:#c9c6c0;">&nbsp;·&nbsp;</span>
          <a href="${BASE}/liga-mx" style="color:#1e223d;text-decoration:none;font-weight:600;">Liga MX</a>
        </p>
        <p style="margin:0 0 12px;font-size:12px;line-height:1;">
          <a href="${siteConfig.social.tiktok}" style="color:#6b6f80;text-decoration:none;">TikTok</a>
          <span style="color:#c9c6c0;">&nbsp;·&nbsp;</span>
          <a href="${siteConfig.social.instagram}" style="color:#6b6f80;text-decoration:none;">Instagram</a>
          <span style="color:#c9c6c0;">&nbsp;·&nbsp;</span>
          <a href="${siteConfig.social.youtube}" style="color:#6b6f80;text-decoration:none;">YouTube</a>
        </p>
        <p style="margin:0;font:600 10px/1.5 'Courier New',Courier,monospace;letter-spacing:.14em;text-transform:uppercase;color:#a7a49d;">Acceso Futbol · Tu acceso al fútbol mexicano · © ${year}</p>
      </td></tr>
    </table>
    <p style="width:100%;max-width:480px;margin:14px auto 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.5;color:#a7a49d;text-align:center;">Recibiste este correo porque pediste guardar tu quiniela en accesofutbol.com.</p>
  </td></tr>
</table>
</body>
</html>`;
}

/** Send the magic link. Returns true on success (or in the dev log fallback). */
export async function sendMagicLinkEmail({ to, url }: { to: string; url: string }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    console.info(`[quiniela] magic link for ${to}: ${url}`);
    return true;
  }
  const text = [
    'Guarda tu racha en Acceso Futbol.',
    'Conserva tu quiniela, tu racha y tu historial en cualquier dispositivo (sin contraseña):',
    url,
    '',
    'El enlace vence en 15 minutos y solo funciona una vez. Si no lo pediste, ignóralo.',
    '',
    `Acceso Futbol · ${BASE}`,
  ].join('\n');
  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: fromAddress(),
        to: [to],
        subject: 'Tu enlace para guardar tu quiniela',
        text,
        html: magicHtml(url),
      }),
      cache: 'no-store',
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error(`[quiniela] Resend send failed (${res.status}): ${detail}`);
    }
    return res.ok;
  } catch (err) {
    console.error('[quiniela] Resend request error:', err);
    return false;
  }
}
