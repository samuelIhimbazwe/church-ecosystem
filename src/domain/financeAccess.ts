import { FUND_GRANTS } from '../data/financeSeed';
import { actionSatisfied } from './permissions';
import type {
  Action,
  AuthzDecision,
  FundAccessGrant,
  FundGrantAction,
  PermissionGrant,
  SystemId,
} from './types';

function isGrantActive(g: FundAccessGrant, now: Date): boolean {
  if (g.status !== 'ACTIVE') return false;
  const start = new Date(g.startDate);
  if (Number.isNaN(start.getTime()) || start > now) return false;
  if (g.endDate) {
    const end = new Date(g.endDate);
    if (!Number.isNaN(end.getTime()) && end < now) return false;
  }
  return true;
}

function fundActionToPermission(action: FundGrantAction): Action {
  if (action === 'APPROVE') return 'APPROVE';
  if (action === 'MANAGE') return 'MANAGE';
  return 'VIEW';
}

/**
 * Convert org-issued fund ACL rows into permission grants.
 * These are ORG_PRIVATE — never inferred from CHURCH_LEADER.
 */
export function fundGrantsToPermissions(
  personId: string,
  now = new Date(),
): PermissionGrant[] {
  const grants: PermissionGrant[] = [];
  const mine = FUND_GRANTS.filter(
    (g) => g.personId === personId && isGrantActive(g, now),
  );

  if (mine.length === 0) return grants;

  // Fund ACL only — Finance is a shared module, not a peer system to ENTER.
  for (const g of mine) {
    grants.push({
      systemId: 'sys-finance',
      resource: 'FINANCE',
      action: fundActionToPermission(g.action),
      source: 'FUND_GRANT',
      reason: g.reason,
      fundId: g.fundId,
    });
  }

  return grants;
}

export function authorizeFinanceFund(
  personId: string,
  fundId: string,
  action: Action,
  permissionGrants: PermissionGrant[],
  now = new Date(),
): AuthzDecision {
  const evaluatedAt = now.toISOString();
  const matched = permissionGrants.find((g) => {
    if (g.systemId !== 'sys-finance') return false;
    if (g.resource !== 'FINANCE') return false;
    if (g.fundId !== fundId) return false;
    return actionSatisfied(g.action, action);
  });

  if (matched) {
    return {
      allowed: true,
      personId,
      systemId: 'sys-finance',
      resource: 'FINANCE',
      action,
      fundId,
      matchedGrant: matched,
      reason: matched.reason,
      evaluatedAt,
    };
  }

  return {
    allowed: false,
    personId,
    systemId: 'sys-finance',
    resource: 'FINANCE',
    action,
    fundId,
    reason:
      'ORG_PRIVATE fund — no access without an explicit grant from the owning organization (pastor cannot bypass)',
    evaluatedAt,
  };
}

export function visibleFundIds(
  _personId: string,
  permissionGrants: PermissionGrant[],
): string[] {
  const ids = new Set<string>();
  for (const g of permissionGrants) {
    if (
      g.systemId === 'sys-finance' &&
      g.resource === 'FINANCE' &&
      g.fundId &&
      actionSatisfied(g.action, 'VIEW')
    ) {
      ids.add(g.fundId);
    }
  }
  return [...ids];
}

export function financeSystemId(): SystemId {
  return 'sys-finance';
}
