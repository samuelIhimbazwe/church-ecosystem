import { ORG_UNITS, SYSTEMS } from '../data/seed';
import type { Membership, Person, SystemId } from './types';
import { isMembershipActive } from './participation';

/** Owner system + systems mapped to descendant org units. */
export function systemsInAudiencePool(ownerSystemId: SystemId): SystemId[] {
  if (ownerSystemId === 'sys-main') {
    return SYSTEMS.map((s) => s.id);
  }
  const ownerOrg =
    SYSTEMS.find((s) => s.id === ownerSystemId)?.orgUnitId ??
    ORG_UNITS.find((o) => o.systemId === ownerSystemId)?.id;
  if (!ownerOrg) return [ownerSystemId];

  const descendantOrgIds = new Set<string>([ownerOrg]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const u of ORG_UNITS) {
      if (u.parentId && descendantOrgIds.has(u.parentId) && !descendantOrgIds.has(u.id)) {
        descendantOrgIds.add(u.id);
        changed = true;
      }
    }
  }

  const ids = new Set<SystemId>([ownerSystemId]);
  for (const s of SYSTEMS) {
    if (s.orgUnitId && descendantOrgIds.has(s.orgUnitId)) {
      ids.add(s.id);
    }
  }
  for (const u of ORG_UNITS) {
    if (u.systemId && descendantOrgIds.has(u.id)) {
      ids.add(u.systemId);
    }
  }
  return [...ids];
}

/** Person belongs to audience pool via active membership in pool systems (or church for Main). */
export function personInAudiencePool(
  personId: string,
  ownerSystemId: SystemId,
  memberships: Membership[],
  now = new Date(),
): boolean {
  const mine = memberships.filter(
    (m) => m.personId === personId && isMembershipActive(m, now),
  );
  if (ownerSystemId === 'sys-main') {
    return mine.some(
      (m) => m.type === 'CHURCH_MEMBER' || !!m.systemId,
    );
  }
  const pool = new Set(systemsInAudiencePool(ownerSystemId));
  return mine.some((m) => m.systemId && pool.has(m.systemId));
}

export type ProgramEligibility = {
  minAge?: number;
  maxAge?: number;
  /** Require active marriage record status MARRIED. */
  requireMarried?: boolean;
  /**
   * When true, only staff / selective shares discover the program —
   * pool members still need invite even if they match other criteria.
   */
  requireInviteOnly?: boolean;
};

export function personAgeYears(
  person: Person | null | undefined,
  now = new Date(),
): number | null {
  if (!person?.dateOfBirth) return null;
  const dob = new Date(person.dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age;
}

export function matchesEligibility(
  person: Person | null | undefined,
  eligibility: ProgramEligibility | undefined,
  opts?: { isMarried?: boolean },
): { ok: boolean; reason?: string } {
  if (!eligibility) return { ok: true };
  if (!person) return { ok: false, reason: 'Unknown person' };

  const age = personAgeYears(person);
  if (eligibility.minAge != null) {
    if (age == null) {
      return { ok: false, reason: 'Date of birth required for age eligibility' };
    }
    if (age < eligibility.minAge) {
      return { ok: false, reason: `Must be at least ${eligibility.minAge}` };
    }
  }
  if (eligibility.maxAge != null) {
    if (age == null) {
      return { ok: false, reason: 'Date of birth required for age eligibility' };
    }
    if (age > eligibility.maxAge) {
      return { ok: false, reason: `Must be at most ${eligibility.maxAge}` };
    }
  }
  if (eligibility.requireMarried) {
    if (!opts?.isMarried) {
      return { ok: false, reason: 'Married status required' };
    }
  }
  return { ok: true };
}
