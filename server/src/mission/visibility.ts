/**
 * Canonical stored visibility: CHURCH | MINISTRY_PRIVATE | SELECTIVE.
 * Accepts legacy GENERAL / MINISTRY / SELECTED on input.
 */

export type StoredVisibility = 'CHURCH' | 'MINISTRY_PRIVATE' | 'SELECTIVE';

export function toStoredVisibility(raw: string | undefined | null): StoredVisibility {
  if (!raw) return 'MINISTRY_PRIVATE';
  const v = raw.toUpperCase();
  if (v === 'GENERAL' || v === 'CHURCH') return 'CHURCH';
  if (v === 'SELECTED' || v === 'SELECTIVE') return 'SELECTIVE';
  return 'MINISTRY_PRIVATE';
}

/** Alias kept for older clients that still send/expect GENERAL|MINISTRY|SELECTED. */
export function toLegacyApiVisibility(stored: string): string {
  const v = toStoredVisibility(stored);
  if (v === 'CHURCH') return 'GENERAL';
  if (v === 'SELECTIVE') return 'SELECTED';
  return 'MINISTRY';
}
