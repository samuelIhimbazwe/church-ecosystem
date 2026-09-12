import type { SessionState, SsoHandoffToken, SystemId } from './types';

const HANDOFF_TTL_MS = 2 * 60 * 1000;
/** localStorage so a new browser tab can redeem the token (sessionStorage is per-tab). */
const HANDOFF_STORE_KEY = 'adepr.sso.handoffs';
const SESSION_KEY = 'adepr.session';

function readHandoffs(): SsoHandoffToken[] {
  try {
    const raw = localStorage.getItem(HANDOFF_STORE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SsoHandoffToken[];
  } catch {
    return [];
  }
}

function writeHandoffs(tokens: SsoHandoffToken[]) {
  localStorage.setItem(HANDOFF_STORE_KEY, JSON.stringify(tokens));
}

function pruneExpired(tokens: SsoHandoffToken[], now = Date.now()) {
  return tokens.filter((t) => t.expiresAt > now);
}

/** Issue a short-lived handoff token for church ↔ ministry navigation. */
export function issueHandoff(
  accountId: string,
  fromSystemId: SystemId,
  toSystemId: SystemId,
): SsoHandoffToken {
  const now = Date.now();
  const token: SsoHandoffToken = {
    id: `handoff-${now}-${Math.random().toString(36).slice(2, 10)}`,
    accountId,
    fromSystemId,
    toSystemId,
    issuedAt: now,
    expiresAt: now + HANDOFF_TTL_MS,
  };
  const next = pruneExpired(readHandoffs(), now);
  next.push(token);
  writeHandoffs(next);
  return token;
}

/**
 * Redeem a handoff token once. Returns null if missing, expired, or
 * target system does not match.
 */
export function redeemHandoff(
  tokenId: string,
  expectedToSystemId: SystemId,
): SsoHandoffToken | null {
  const now = Date.now();
  const tokens = pruneExpired(readHandoffs(), now);
  const idx = tokens.findIndex((t) => t.id === tokenId);
  if (idx < 0) {
    writeHandoffs(tokens);
    return null;
  }
  const token = tokens[idx];
  tokens.splice(idx, 1);
  writeHandoffs(tokens);
  if (token.toSystemId !== expectedToSystemId) return null;
  if (token.expiresAt <= now) return null;
  return token;
}

export function readSession(): SessionState | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionState;
  } catch {
    return null;
  }
}

export function writeSession(session: SessionState) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

/**
 * Build the URL to open a peer system.
 * Same-origin prototype uses a global /sso/handoff route; production uses externalUrl + token.
 */
export function buildSystemEntryUrl(
  basePath: string,
  options: {
    externalUrl?: string;
    handoffTokenId?: string;
    toSystemId?: SystemId;
  },
): string {
  if (options.externalUrl) {
    const url = new URL('/sso/handoff', options.externalUrl);
    if (options.handoffTokenId) {
      url.searchParams.set('token', options.handoffTokenId);
    }
    return url.toString();
  }
  if (options.handoffTokenId) {
    const params = new URLSearchParams({ token: options.handoffTokenId });
    if (options.toSystemId) params.set('system', options.toSystemId);
    return `/sso/handoff?${params.toString()}`;
  }
  return basePath || '/';
}
