import webpush from 'web-push';

/** Web Push sender. VAPID keys come from env; unconfigured = safe no-op. */

export interface PushPayload {
  title: string;
  body: string;
  tag?: string;
  url?: string;
  icon?: string;
}

export type SendResult = 'ok' | 'gone' | 'error';

let configured: boolean | null = null;

export function pushConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() && process.env.VAPID_PRIVATE_KEY?.trim()
  );
}

function ensureVapid(): boolean {
  if (configured !== null) return configured;
  if (!pushConfigured()) {
    configured = false;
    return false;
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT?.trim() || 'mailto:hola@accesofutbol.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!.trim(),
    process.env.VAPID_PRIVATE_KEY!.trim()
  );
  configured = true;
  return true;
}

export async function sendWebPush(
  sub: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: PushPayload
): Promise<SendResult> {
  if (!ensureVapid()) return 'error';
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: sub.keys },
      JSON.stringify(payload),
      { TTL: 120, urgency: 'high' }
    );
    return 'ok';
  } catch (err: unknown) {
    const status = (err as { statusCode?: number })?.statusCode;
    // 404 = unknown endpoint, 410 = gone — prune these subscriptions.
    if (status === 404 || status === 410) return 'gone';
    return 'error';
  }
}
