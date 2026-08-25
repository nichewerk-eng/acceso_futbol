import { createHash, randomBytes } from 'node:crypto';
import {
  kvDel,
  kvGetJson,
  kvHget,
  kvHgetall,
  kvHset,
  kvSetJson,
  kvSetNx,
  sharedKvEnabled,
} from '@/lib/sharedKv';

/**
 * Lightweight, password-less quiniela accounts. An account is just a stable,
 * email-recoverable id that becomes the picks key (same model as the anonymous
 * localStorage id, but durable + cross-device). No sessions/cookies: the verify
 * route hands the `accountId` back to the client, which adopts it as its id.
 *
 * Storage mirrors `store.ts` — durable Upstash hashes, with a process-memory
 * fallback when KV is off so the flow works end-to-end in local dev.
 */

export interface QuinielaAccount {
  accountId: string;
  email: string;
  name?: string;
  createdAt: number;
}

export interface MagicPayload {
  accountId: string;
  /** Anonymous id whose current card should merge into the account on claim. */
  anonId?: string;
}

const BY_EMAIL = 'quiniela:account-by-email'; // hash: sha256(email) -> accountId
const BY_ID = 'quiniela:account-by-id'; //       hash: accountId -> JSON(QuinielaAccount)
const MAGIC_PREFIX = 'quiniela:magic'; //         key per token -> MagicPayload (TTL)
const COOLDOWN_PREFIX = 'quiniela:magic-cd'; //   key per email -> send cooldown (TTL)
const MAGIC_TTL_MS = 15 * 60_000;
const COOLDOWN_MS = 45_000;

// Process fallback (dev / no KV).
const memEmail = new Map<string, string>();
const memId = new Map<string, QuinielaAccount>();
const memMagic = new Map<string, { data: MagicPayload; exp: number }>();
const memCooldown = new Map<string, number>();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Trimmed, lowercased email, or null if it doesn't look valid. */
export function normalizeEmail(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const e = v.trim().toLowerCase();
  if (e.length < 3 || e.length > 254 || !EMAIL_RE.test(e)) return null;
  return e;
}

function emailHash(email: string): string {
  return createHash('sha256').update(email).digest('hex');
}

/** 32 hex chars — matches `sanitizeUserId` so it can be used as the picks key. */
export function newAccountId(): string {
  return randomBytes(16).toString('hex');
}

export async function getAccount(accountId: string): Promise<QuinielaAccount | null> {
  if (!sharedKvEnabled()) return memId.get(accountId) ?? null;
  const raw = await kvHget(BY_ID, accountId);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as QuinielaAccount;
  } catch {
    return null;
  }
}

async function accountIdForEmail(email: string): Promise<string | null> {
  const h = emailHash(email);
  if (!sharedKvEnabled()) return memEmail.get(h) ?? null;
  return kvHget(BY_EMAIL, h);
}

/** Stable account for an email — same email always returns the same id. */
export async function getOrCreateAccount(email: string, name?: string): Promise<QuinielaAccount> {
  const existingId = await accountIdForEmail(email);
  if (existingId) {
    const acc = await getAccount(existingId);
    if (acc) return acc;
  }
  const account: QuinielaAccount = {
    accountId: newAccountId(),
    email,
    name,
    createdAt: Date.now(),
  };
  const h = emailHash(email);
  if (sharedKvEnabled()) {
    await kvHset(BY_EMAIL, h, account.accountId);
    await kvHset(BY_ID, account.accountId, JSON.stringify(account));
  } else {
    memEmail.set(h, account.accountId);
    memId.set(account.accountId, account);
  }
  return account;
}

export async function mintMagicToken(payload: MagicPayload): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  if (sharedKvEnabled()) {
    await kvSetJson(`${MAGIC_PREFIX}:${token}`, payload, MAGIC_TTL_MS);
  } else {
    memMagic.set(token, { data: payload, exp: Date.now() + MAGIC_TTL_MS });
  }
  return token;
}

/** Read + delete a magic token (single use). Null if unknown/expired. */
export async function consumeMagicToken(token: string): Promise<MagicPayload | null> {
  if (!token || token.length < 20) return null;
  if (sharedKvEnabled()) {
    const rec = await kvGetJson<MagicPayload>(`${MAGIC_PREFIX}:${token}`);
    if (!rec) return null;
    await kvDel(`${MAGIC_PREFIX}:${token}`);
    return rec.data;
  }
  const m = memMagic.get(token);
  if (!m) return null;
  memMagic.delete(token);
  if (m.exp < Date.now()) return null;
  return m.data;
}

/** Count accounts on file (ops preview). */
export async function countAccounts(): Promise<number> {
  if (!sharedKvEnabled()) return memId.size;
  return Object.keys(await kvHgetall(BY_ID)).length;
}

/** Delete every account + email mapping (ops reset). Returns how many existed. */
export async function resetAccounts(): Promise<number> {
  const n = await countAccounts();
  if (sharedKvEnabled()) {
    await kvDel(BY_ID);
    await kvDel(BY_EMAIL);
  } else {
    memId.clear();
    memEmail.clear();
    memMagic.clear();
    memCooldown.clear();
  }
  return n;
}

/** True if a send is allowed now (per-email cooldown to throttle abuse). */
export async function magicCooldownOk(email: string): Promise<boolean> {
  const key = `${COOLDOWN_PREFIX}:${emailHash(email)}`;
  if (sharedKvEnabled()) {
    return kvSetNx(key, '1', COOLDOWN_MS);
  }
  const now = Date.now();
  if ((memCooldown.get(key) ?? 0) > now) return false;
  memCooldown.set(key, now + COOLDOWN_MS);
  return true;
}
