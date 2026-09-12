import {
  buildSystemEntryUrl,
  issueHandoff,
} from '../domain/sso';
import type { ChurchSystem, SystemId, UserAccount } from '../domain/types';
import { accessService } from './accessService';
import { authService } from './authService';
import { systemsService } from './orgService';

export type OpenSystemResult =
  | { ok: true; url: string; mode: 'navigate' | 'external' }
  | { ok: false; reason: string };

/**
 * Open a peer system via SSO handoff.
 * Entry uses the same authorize(SYSTEM, ENTER) as direct login.
 */
export function openSystem(
  account: UserAccount | null,
  toSystemId: SystemId,
  fromSystemId: SystemId = 'sys-main',
): OpenSystemResult {
  if (!account) return { ok: false, reason: 'Not signed in' };

  const decision = accessService.authorize(
    account.personId,
    toSystemId,
    'SYSTEM',
    'ENTER',
    { audit: true, entryMode: 'handoff' },
  );
  if (!decision.allowed) {
    return { ok: false, reason: decision.reason };
  }

  const target = systemsService.getById(toSystemId);
  if (!target) return { ok: false, reason: 'System not found' };
  if (target.status !== 'ACTIVE') {
    return { ok: false, reason: 'System is not active yet' };
  }

  if (toSystemId === fromSystemId) {
    return { ok: true, url: target.basePath, mode: 'navigate' };
  }

  const token = issueHandoff(account.id, fromSystemId, toSystemId);
  authService.setCurrentSystem(fromSystemId, 'main');

  const url = buildSystemEntryUrl(target.basePath, {
    externalUrl: target.externalUrl,
    handoffTokenId: token.id,
    toSystemId: toSystemId,
  });

  return {
    ok: true,
    url,
    mode: target.externalUrl ? 'external' : 'navigate',
  };
}

/** Peer systems open in a new browser tab; Main stays where you are. */
export function openSystemUrlInNewTab(url: string): void {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  const abs = new URL(url, window.location.origin).href;
  window.open(abs, '_blank', 'noopener,noreferrer');
}

export function systemHomePath(system: ChurchSystem): string {
  return system.basePath === '/' ? '/' : system.basePath;
}
