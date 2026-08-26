/** Fallback only for SSR / first paint. After mount, UI uses the device zone. */
export const DEVICE_TZ_FALLBACK = 'America/Mexico_City';

export function readDeviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEVICE_TZ_FALLBACK;
  } catch {
    return DEVICE_TZ_FALLBACK;
  }
}

export function formatKickoffTime(iso: string, tz: string): string {
  try {
    return new Date(iso).toLocaleTimeString('es-MX', {
      timeZone: tz,
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export function formatKickoffDay(iso: string, tz: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-MX', {
      timeZone: tz,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  } catch {
    return '';
  }
}

/** Long kickoff for cards: weekday, date, time. */
export function formatKickoffLong(iso: string, tz: string): string {
  try {
    return new Date(iso).toLocaleString('es-MX', {
      timeZone: tz,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

/** Full wall clock for crawl / sr-only summaries. */
export function formatKickoffFull(iso: string, tz: string): string {
  try {
    return new Date(iso).toLocaleString('es-MX', {
      timeZone: tz,
      dateStyle: 'full',
      timeStyle: 'short',
    });
  } catch {
    return '';
  }
}

export function dayKeyInTz(iso: string | Date, tz: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-CA', { timeZone: tz });
  } catch {
    return '';
  }
}
