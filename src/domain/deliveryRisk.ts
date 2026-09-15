/**
 * Delivery blockers / risks — linked to a delivery item or task.
 * Age + owner for Project Pulse.
 */
export type MissionBlockerSeverity = 'BLOCKER' | 'RISK';

export type MissionBlockerStatus = 'OPEN' | 'MITIGATING' | 'RESOLVED';

export type MissionBlocker = {
  id: string;
  title: string;
  severity: MissionBlockerSeverity;
  status: MissionBlockerStatus;
  /** Owner accountable for clearing it. */
  ownerPersonId: string;
  createdAt: string;
  resolvedAt?: string;
  deliveryItemId?: string;
  taskId?: string;
  note?: string;
};

export function openBlockers(list?: MissionBlocker[]): MissionBlocker[] {
  return (list ?? []).filter((b) => b.status !== 'RESOLVED');
}

export function blockerAgeDays(b: MissionBlocker, now = Date.now()): number {
  const start = new Date(b.createdAt).getTime();
  if (!Number.isFinite(start)) return 0;
  return Math.max(0, Math.floor((now - start) / 86400000));
}

export function blockerUrgency(
  b: MissionBlocker,
): 'critical' | 'warn' | 'normal' {
  if (b.status === 'RESOLVED') return 'normal';
  const age = blockerAgeDays(b);
  if (b.severity === 'BLOCKER' && age >= 3) return 'critical';
  if (b.severity === 'BLOCKER' || age >= 7) return 'warn';
  return 'normal';
}
