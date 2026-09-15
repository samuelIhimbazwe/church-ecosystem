/**
 * System Admin — appointed tech operator for one system.
 * Tool config only; never auto finance / sacraments / discipline Approve.
 */
import type { Position, SystemId } from './types';

export function isSystemAdminOf(
  personId: string,
  systemId: SystemId,
  positions: Position[],
): boolean {
  return positions.some(
    (p) =>
      p.personId === personId &&
      p.status === 'ACTIVE' &&
      p.systemAdmin === true &&
      p.systemId === systemId,
  );
}

export function systemAdminSystemIds(
  personId: string,
  positions: Position[],
): SystemId[] {
  const ids = new Set<SystemId>();
  for (const p of positions) {
    if (
      p.personId === personId &&
      p.status === 'ACTIVE' &&
      p.systemAdmin === true &&
      p.systemId
    ) {
      ids.add(p.systemId);
    }
  }
  return [...ids];
}
