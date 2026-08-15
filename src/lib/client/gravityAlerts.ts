'use client';

const KEY = 'af-gravity-alerts-v1';

type Listener = () => void;

let on = false;
let hydrated = false;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((fn) => fn());
}

function readStored(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

function writeStored(next: boolean) {
  try {
    localStorage.setItem(KEY, next ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export function hydrateGravityAlerts() {
  if (hydrated) return;
  hydrated = true;
  on = readStored();
  emit();
}

export function getGravityAlertsOn() {
  return on;
}

export function subscribeGravityAlerts(fn: Listener) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function setGravityAlertsOn(next: boolean) {
  on = next;
  writeStored(next);
  emit();
}

export function notificationsSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function enableGravityAlerts(): Promise<boolean> {
  if (notificationsSupported() && Notification.permission === 'default') {
    await Notification.requestPermission();
  }
  setGravityAlertsOn(true);
  return true;
}

export function disableGravityAlerts() {
  setGravityAlertsOn(false);
}

export type GravityToast = {
  id: string;
  title: string;
  body: string;
  href?: string;
};

let toasts: GravityToast[] = [];
const toastListeners = new Set<Listener>();

function emitToasts() {
  toastListeners.forEach((fn) => fn());
}

export function getGravityToasts() {
  return toasts;
}

export function subscribeGravityToasts(fn: Listener) {
  toastListeners.add(fn);
  return () => {
    toastListeners.delete(fn);
  };
}

export function dismissGravityToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  emitToasts();
}

export function pushGravityToast(title: string, body: string, href?: string) {
  const id = `af-toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  toasts = [{ id, title, body, href }, ...toasts].slice(0, 3);
  emitToasts();
  if (typeof window !== 'undefined') {
    window.setTimeout(() => dismissGravityToast(id), 10_000);
  }
}

export function fireOsNotification(title: string, body: string, tag: string, href?: string) {
  if (!notificationsSupported() || Notification.permission !== 'granted') return;
  try {
    const n = new Notification(title, { body, tag, icon: '/logo.png' });
    n.onclick = () => {
      window.focus();
      n.close();
      if (href) window.location.assign(href);
    };
  } catch {
    /* Safari / denied after the fact */
  }
}

export function emitGravityAlert(title: string, body: string, tag: string, href?: string) {
  pushGravityToast(title, body, href);
  fireOsNotification(title, body, tag, href);
}
