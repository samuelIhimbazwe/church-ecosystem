/**
 * System Admin — appointed tech operator for one system.
 * Tool config only; never auto finance / sacraments / discipline Approve.
 *
 * Who may see the System admin surface:
 * Church Leader, ministry/organisation presidents, and appointed System Admins.
 */
import { isChurchLeader } from './churchLeadership';
import type { Position, SystemId, SystemRole } from './types';

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

/** Ministry / choir / worship presidents, plus Protocol & Deacon coordinators. */
export function isMinistryOrOrgPresident(
  personId: string,
  positions: Position[],
): boolean {
  return positions.some(
    (p) =>
      p.personId === personId &&
      p.status === 'ACTIVE' &&
      (p.ministryOffice === 'PRESIDENT' ||
        p.choirOffice === 'PRESIDENT' ||
        p.worshipOffice === 'PRESIDENT' ||
        p.protocolOffice === 'COORDINATOR' ||
        p.deaconOffice === 'COORDINATOR'),
  );
}

/** Nav + entry: Leader, presidents, or appointed System Admin — not plain members. */
export function canSeeSystemAdminNav(
  personId: string,
  positions: Position[],
  roles: SystemRole[],
): boolean {
  if (isChurchLeader(roles)) return true;
  if (isMinistryOrOrgPresident(personId, positions)) return true;
  return systemAdminSystemIds(personId, positions).length > 0;
}
