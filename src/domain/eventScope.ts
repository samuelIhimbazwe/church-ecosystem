import type {
  EventApprovalLevelKind,
  EventApprovalRecord,
  Position,
  SystemId,
  SystemRole,
} from './types';
import { isMissionLeader } from './missionScope';
import { ORG_UNITS, SYSTEMS } from '../data/seed';

export type ScopeApprovalLevel = {
  levelKey: string;
  kind: EventApprovalLevelKind;
  label: string;
  systemId?: SystemId;
};

/** Minimal shape shared by Events and Projects for beyond-scope approval. */
export type ScopeApproable = {
  ownerSystemId: SystemId;
  orgUnitId?: string;
  beyondOwnerScope?: boolean;
  approvals?: EventApprovalRecord[];
};

/** Org parent chain → required approvers when beyond owner scope. */
export function scopeApprovalChain(item: ScopeApproable): ScopeApprovalLevel[] {
  if (!item.beyondOwnerScope) return [];

  const levels: ScopeApprovalLevel[] = [];
  const ownerSys = SYSTEMS.find((s) => s.id === item.ownerSystemId);
  levels.push({
    levelKey: `owner:${item.ownerSystemId}`,
    kind: 'OWNER',
    label: `${ownerSys?.shortName ?? item.ownerSystemId} (owner)`,
    systemId: item.ownerSystemId,
  });

  let orgId =
    item.orgUnitId ??
    SYSTEMS.find((s) => s.id === item.ownerSystemId)?.orgUnitId;
  const seen = new Set<string>();
  while (orgId) {
    const org = ORG_UNITS.find((o) => o.id === orgId);
    if (!org) break;
    if (org.parentId) {
      const parent = ORG_UNITS.find((o) => o.id === org.parentId);
      if (parent?.systemId && parent.systemId !== item.ownerSystemId) {
        const key = `parent:${parent.systemId}`;
        if (!seen.has(key)) {
          seen.add(key);
          const sys = SYSTEMS.find((s) => s.id === parent.systemId);
          levels.push({
            levelKey: key,
            kind: 'PARENT',
            label: `${sys?.shortName ?? parent.name} (parent)`,
            systemId: parent.systemId,
          });
        }
      }
      orgId = org.parentId;
    } else {
      break;
    }
  }

  levels.push({
    levelKey: 'church',
    kind: 'CHURCH',
    label: 'Church Leadership',
  });
  return levels;
}

export function scopeApprovalsSatisfied(item: ScopeApproable): boolean {
  const chain = scopeApprovalChain(item);
  if (chain.length === 0) return true;
  const done = new Set((item.approvals ?? []).map((a) => a.levelKey));
  return chain.every((l) => done.has(l.levelKey));
}

export function missingScopeApprovals(
  item: ScopeApproable,
): ScopeApprovalLevel[] {
  const done = new Set((item.approvals ?? []).map((a) => a.levelKey));
  return scopeApprovalChain(item).filter((l) => !done.has(l.levelKey));
}

export function canApproveScopeLevel(
  level: ScopeApprovalLevel,
  roles: SystemRole[],
  positions: Position[],
): boolean {
  if (level.kind === 'CHURCH') {
    return (
      roles.includes('CHURCH_LEADER') || roles.includes('ASSISTANT_PASTOR')
    );
  }
  if (level.systemId) {
    if (isMissionLeader(positions, level.systemId)) return true;
    const sys = SYSTEMS.find((s) => s.id === level.systemId);
    if (sys && sys.status !== 'ACTIVE') {
      return (
        roles.includes('CHURCH_LEADER') || roles.includes('ASSISTANT_PASTOR')
      );
    }
  }
  return (
    roles.includes('CHURCH_LEADER') || roles.includes('ASSISTANT_PASTOR')
  );
}

/** @deprecated alias — Events keep existing names */
export type EventApprovalLevel = ScopeApprovalLevel;

export function eventApprovalChain(item: ScopeApproable): ScopeApprovalLevel[] {
  return scopeApprovalChain(item);
}

export function eventApprovalsSatisfied(item: ScopeApproable): boolean {
  return scopeApprovalsSatisfied(item);
}

export function missingEventApprovals(
  item: ScopeApproable,
): ScopeApprovalLevel[] {
  return missingScopeApprovals(item);
}

export function canApproveEventLevel(
  level: ScopeApprovalLevel,
  roles: SystemRole[],
  positions: Position[],
): boolean {
  return canApproveScopeLevel(level, roles, positions);
}

export function registrationModeOf(event: {
  registrationMode?: 'ANNOUNCEMENT_ONLY' | 'REGISTRATION_REQUIRED';
}): 'ANNOUNCEMENT_ONLY' | 'REGISTRATION_REQUIRED' {
  return event.registrationMode ?? 'ANNOUNCEMENT_ONLY';
}

export type { EventApprovalRecord };
