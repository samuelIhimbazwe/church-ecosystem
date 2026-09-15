import { prisma } from '../lib/prisma.js';

export type ScopeApprovalLevel = {
  levelKey: string;
  kind: 'OWNER' | 'PARENT' | 'CHURCH';
  label: string;
  systemId?: string;
};

export type ApprovalRecord = {
  levelKey: string;
  kind: string;
  label: string;
  systemId?: string;
  personId: string;
  approvedAt: string;
};

export function parseApprovals(raw: string | null | undefined): ApprovalRecord[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? (v as ApprovalRecord[]) : [];
  } catch {
    return [];
  }
}

export function serializeApprovals(rows: ApprovalRecord[]): string {
  return JSON.stringify(rows);
}

/** Org parent chain → required approvers when beyond owner scope. */
export async function buildScopeApprovalChain(item: {
  ownerSystemId: string;
  orgUnitId?: string | null;
  beyondOwnerScope?: boolean | null;
}): Promise<ScopeApprovalLevel[]> {
  if (!item.beyondOwnerScope) return [];

  const systems = await prisma.churchSystem.findMany();
  const orgs = await prisma.orgUnit.findMany();
  const bySys = new Map(systems.map((s) => [s.id, s]));
  const byOrg = new Map(orgs.map((o) => [o.id, o]));

  const levels: ScopeApprovalLevel[] = [];
  const ownerSys = bySys.get(item.ownerSystemId);
  levels.push({
    levelKey: `owner:${item.ownerSystemId}`,
    kind: 'OWNER',
    label: `${ownerSys?.shortName ?? item.ownerSystemId} (owner)`,
    systemId: item.ownerSystemId,
  });

  let orgId =
    item.orgUnitId ??
    ownerSys?.orgUnitId ??
    undefined;
  const seen = new Set<string>();
  while (orgId) {
    const org = byOrg.get(orgId);
    if (!org) break;
    if (org.parentId) {
      const parent = byOrg.get(org.parentId);
      if (parent?.systemId && parent.systemId !== item.ownerSystemId) {
        const key = `parent:${parent.systemId}`;
        if (!seen.has(key)) {
          seen.add(key);
          const sys = bySys.get(parent.systemId);
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

export function approvalsSatisfied(
  chain: ScopeApprovalLevel[],
  approvals: ApprovalRecord[],
): boolean {
  if (chain.length === 0) return true;
  const done = new Set(approvals.map((a) => a.levelKey));
  return chain.every((l) => done.has(l.levelKey));
}

export async function personCanApproveLevel(
  level: ScopeApprovalLevel,
  personId: string,
): Promise<boolean> {
  if (level.kind === 'CHURCH') {
    const n = await prisma.position.count({
      where: {
        personId,
        status: 'ACTIVE',
        systemRole: 'CHURCH_LEADER',
      },
    });
    return n > 0;
  }
  if (level.systemId) {
    const asLeader = await prisma.position.count({
      where: {
        personId,
        status: 'ACTIVE',
        systemId: level.systemId,
        OR: [
          { ministryOffice: { not: null } },
        ],
      },
    });
    if (asLeader > 0) return true;
    const sys = await prisma.churchSystem.findUnique({
      where: { id: level.systemId },
    });
    if (sys && sys.status !== 'ACTIVE') {
      const n = await prisma.position.count({
        where: {
          personId,
          status: 'ACTIVE',
          systemRole: 'CHURCH_LEADER',
        },
      });
      return n > 0;
    }
    return false;
  }
  const fallback = await prisma.position.count({
    where: {
      personId,
      status: 'ACTIVE',
      systemRole: 'CHURCH_LEADER',
    },
  });
  return fallback > 0;
}
