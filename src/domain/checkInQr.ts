/**
 * Soft recurrence + check-in QR helpers (W6).
 */

export type RecurrenceRule = {
  /** Simple weekly cadence for demos. */
  freq: 'WEEKLY';
  /** 0=Sun … 6=Sat */
  byWeekday: number;
  /** ISO date of first occurrence. */
  startDate: string;
  /** Optional ISO end date (inclusive). */
  untilDate?: string;
  count?: number;
};

export function nextWeeklyOccurrence(
  fromIso: string,
  count = 1,
): string[] {
  const out: string[] = [];
  const d = new Date(fromIso);
  if (!Number.isFinite(d.getTime())) return out;
  for (let i = 0; i < count; i++) {
    d.setDate(d.getDate() + 7);
    out.push(d.toISOString());
  }
  return out;
}

export function seriesSiblingLabel(seriesLabel?: string, seriesId?: string) {
  if (seriesLabel) return seriesLabel;
  if (seriesId) return `Series ${seriesId.slice(0, 8)}`;
  return 'Series';
}

/** Stable demo token — not cryptographic; staff/logged-in check-in only. */
export function checkInToken(kind: 'event' | 'activity', id: string): string {
  const raw = `${kind}:${id}:adepr-w6`;
  try {
    return btoa(raw).replace(/=+$/, '');
  } catch {
    return encodeURIComponent(raw);
  }
}

export function verifyCheckInToken(
  kind: 'event' | 'activity',
  id: string,
  token: string,
): boolean {
  return token === checkInToken(kind, id);
}

export function checkInUrl(
  kind: 'event' | 'activity',
  id: string,
  origin = typeof window !== 'undefined' ? window.location.origin : '',
): string {
  const t = checkInToken(kind, id);
  return `${origin}/check-in?k=${kind}&id=${encodeURIComponent(id)}&t=${encodeURIComponent(t)}`;
}

export function qrImageUrl(data: string, size = 160): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}
