/**
 * Browser Web Push helpers. Registers the service worker, subscribes via
 * `PushManager` with the VAPID public key, and syncs the subscription + gravity
 * prefs (clubId / El Tri) to the server so pushes target the right fixtures.
 */

const VAPID_PUBLIC = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '').trim();

export type PushPrefs = { clubId: string | null; elTri: boolean };

export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function pushConfiguredClient(): boolean {
  return VAPID_PUBLIC.length > 0;
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(normalized);
  const buffer = new ArrayBuffer(raw.length);
  const out = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

let registration: Promise<ServiceWorkerRegistration> | null = null;

export function registerPushSw(): Promise<ServiceWorkerRegistration> {
  if (!pushSupported()) return Promise.reject(new Error('push_unsupported'));
  if (!registration) registration = navigator.serviceWorker.register('/sw.js');
  return registration;
}

async function postSubscribe(sub: PushSubscription, prefs: PushPrefs): Promise<void> {
  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription: sub.toJSON(), clubId: prefs.clubId, elTri: prefs.elTri }),
  });
}

/**
 * Create (or reuse) a push subscription and register it with the server.
 * Must be called from a user gesture the first time so the permission prompt
 * is allowed. Returns false when unsupported / not configured / denied.
 */
export async function subscribeToPush(prefs: PushPrefs): Promise<boolean> {
  if (!pushSupported() || !pushConfiguredClient()) return false;
  try {
    const reg = await registerPushSw();
    await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
      });
    }
    await postSubscribe(sub, prefs);
    return true;
  } catch {
    return false;
  }
}

/** Re-send prefs if a subscription already exists (e.g. the user changed club). */
export async function syncPushPrefs(prefs: PushPrefs): Promise<void> {
  if (!pushSupported() || !pushConfiguredClient()) return;
  try {
    const reg = (await navigator.serviceWorker.getRegistration()) ?? null;
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    if (sub) await postSubscribe(sub, prefs);
  } catch {
    /* ignore */
  }
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!pushSupported()) return;
  try {
    const reg = (await navigator.serviceWorker.getRegistration()) ?? null;
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    if (!sub) return;
    const { endpoint } = sub;
    try {
      await sub.unsubscribe();
    } catch {
      /* keep going — still tell the server to drop it */
    }
    await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint }),
    });
  } catch {
    /* ignore */
  }
}
