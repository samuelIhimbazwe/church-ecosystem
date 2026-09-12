import {
  apiSubmitContribution,
  apiVerifyContribution,
  loadContributionsPreferApi,
} from '../api/contributionsApi';
import { ApiError, isApiEnabled } from '../api';
import type { MinistryContribution, SystemId } from '../domain/types';

type ActionResult = { ok: boolean; reason?: string; id?: string };

/** List claims from API when live; null → caller uses seed. */
export async function listClaimsPreferApi(
  systemId: SystemId,
  opts?: { mine?: boolean; fundId?: string; orgUnitId?: string },
): Promise<MinistryContribution[] | null> {
  const remote = await loadContributionsPreferApi(systemId, opts);
  return remote ? remote.claims : null;
}

export async function submitClaimPreferApi(input: {
  systemId: SystemId;
  fundId?: string;
  typeLabel: string;
  amount: number;
  paymentMethod: string;
  occurredOn: string;
  note?: string;
}): Promise<ActionResult | null> {
  if (!isApiEnabled()) return null;
  try {
    const c = await apiSubmitContribution(input);
    return { ok: true, id: c.id };
  } catch (e) {
    if (e instanceof ApiError && (e.status === 0 || e.status >= 500)) {
      return null;
    }
    const msg = e instanceof Error ? e.message : 'API claim failed';
    if (
      msg.includes('No ministry fund') ||
      msg.includes('Multiple vaults') ||
      msg.includes('not configured')
    ) {
      return null;
    }
    return { ok: false, reason: msg };
  }
}

export async function verifyClaimPreferApi(input: {
  contributionId: string;
  decision: 'CONFIRMED' | 'PARTIAL' | 'DECLINED';
  confirmedAmount?: number;
  note?: string;
}): Promise<ActionResult | null> {
  if (!isApiEnabled()) return null;
  try {
    await apiVerifyContribution(input);
    return { ok: true };
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    if (e instanceof ApiError && (e.status === 0 || e.status >= 500)) {
      return null;
    }
    return {
      ok: false,
      reason: e instanceof Error ? e.message : 'Verify failed',
    };
  }
}
