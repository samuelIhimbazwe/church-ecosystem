/**
 * Where a person participates and which role they hold — not access/entitlements.
 */
import { membershipTypeLabel, roleLabel } from '../domain/access';
import type {
  Assignment,
  Membership,
  Position,
  SystemId,
} from '../domain/types';
import { orgService, systemsService } from './orgService';

export type PersonPlaceParticipation = {
  key: string;
  placeName: string;
  systemId: SystemId;
  /** Standing system roles at this place (labels). */
  roles: string[];
  /** Membership / position / assignment lines. */
  lines: string[];
};

function placeForSystem(systemId: SystemId): { key: string; placeName: string } {
  const sys = systemsService.getById(systemId);
  return {
    key: systemId,
    placeName: sys?.shortName ?? sys?.name ?? systemId,
  };
}

function systemFromOrg(orgUnitId?: string): SystemId {
  if (!orgUnitId) return 'sys-main';
  const sys = systemsService.getByOrgUnitId(orgUnitId);
  if (sys) return sys.id;
  return 'sys-main';
}

function orgLabel(orgUnitId?: string) {
  if (!orgUnitId) return null;
  return orgService.getById(orgUnitId)?.name ?? null;
}

/**
 * Group active memberships, positions, and assignments by ministry/system place.
 * Does not expand "all systems" access into every peer ministry.
 */
export function buildPersonParticipationPlaces(input: {
  memberships: Membership[];
  positions: Position[];
  assignments: Assignment[];
}): PersonPlaceParticipation[] {
  const map = new Map<
    SystemId,
    { roles: Set<string>; lines: string[]; titles: Set<string> }
  >();

  function bucket(systemId: SystemId) {
    let b = map.get(systemId);
    if (!b) {
      b = { roles: new Set(), lines: [], titles: new Set() };
      map.set(systemId, b);
    }
    return b;
  }

  for (const m of input.memberships) {
    const systemId = (m.systemId ?? systemFromOrg(m.orgUnitId)) as SystemId;
    const b = bucket(systemId);
    const org = orgLabel(m.orgUnitId);
    const label = m.label || membershipTypeLabel(m.type);
    b.lines.push(
      org ? `Membership · ${label} · ${org}` : `Membership · ${label}`,
    );
  }

  for (const p of input.positions) {
    const systemId = (p.systemId ?? systemFromOrg(p.orgUnitId)) as SystemId;
    const b = bucket(systemId);
    if (p.systemRole) b.roles.add(roleLabel(p.systemRole));
    const org = orgLabel(p.orgUnitId);
    const office =
      p.ministryOffice ??
      p.choirOffice ??
      p.worshipOffice ??
      p.deaconOffice ??
      p.protocolOffice;
    const officeBit = office ? ` · ${office}` : '';
    b.lines.push(
      org
        ? `Position · ${p.title}${officeBit} · ${org}`
        : `Position · ${p.title}${officeBit}`,
    );
    b.titles.add(p.title);
  }

  for (const a of input.assignments) {
    const systemId = (a.systemId ?? systemFromOrg(a.orgUnitId)) as SystemId;
    const b = bucket(systemId);
    b.lines.push(
      `Assignment · ${a.title}${a.contextLabel ? ` · ${a.contextLabel}` : ''}`,
    );
  }

  const rows: PersonPlaceParticipation[] = [];
  for (const [systemId, b] of map) {
    const place = placeForSystem(systemId);
    rows.push({
      key: place.key,
      placeName: place.placeName,
      systemId,
      roles: [...b.roles],
      lines: b.lines,
    });
  }

  rows.sort((a, b) => {
    if (a.systemId === 'sys-main') return -1;
    if (b.systemId === 'sys-main') return 1;
    return a.placeName.localeCompare(b.placeName);
  });

  return rows;
}
