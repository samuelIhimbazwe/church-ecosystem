import { readSession } from '../domain/sso';

let activeChoirOrgUnitId: string | null = null;

/** Sync in-memory scope from session (call on app/choir shell init). */
export function syncChoirScopeFromSession(): void {
  activeChoirOrgUnitId = readSession()?.activeChoirOrgUnitId ?? null;
}

export function setActiveChoirOrgUnitId(orgUnitId: string | null): void {
  activeChoirOrgUnitId = orgUnitId;
}

export function getActiveChoirOrgUnitId(): string | null {
  if (activeChoirOrgUnitId) return activeChoirOrgUnitId;
  // Fall back to session so office/roster resolve before ChoirShell effects run.
  activeChoirOrgUnitId = readSession()?.activeChoirOrgUnitId ?? null;
  return activeChoirOrgUnitId;
}

export function requireActiveChoirOrgUnitId(): string {
  const id = getActiveChoirOrgUnitId();
  if (!id) {
    throw new Error('No active choir selected');
  }
  return id;
}
