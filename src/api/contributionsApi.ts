import { apiFetch, isApiEnabled } from './index';
import type {
  MinistryContribution,
  MinistryContributionStatus,
  MinistryPaymentMethod,
  SystemId,
} from '../domain/types';

export type ApiContributionClaim = {
  id: string;
  systemId: string;
  fundId: string;
  orgUnitId?: string | null;
  personId: string;
  typeLabel: string;
  amount: number;
  paymentMethod: string;
  occurredOn: string;
  note?: string | null;
  status: string;
  confirmedAmount?: number | null;
  submittedAt: string;
  verifiedAt?: string | null;
  verifiedByPersonId?: string | null;
  verifyNote?: string | null;
  financeTxnId?: string | null;
};

export function mapApiClaim(c: ApiContributionClaim): MinistryContribution {
  return {
    id: c.id,
    orgUnitId: c.orgUnitId ?? undefined,
    personId: c.personId,
    typeId: c.typeLabel,
    amount: c.amount,
    confirmedAmount: c.confirmedAmount ?? undefined,
    paymentMethod: (c.paymentMethod as MinistryPaymentMethod) || 'MOMO',
    occurredOn: c.occurredOn.slice(0, 10),
    status: (c.status as MinistryContributionStatus) || 'PENDING',
    submittedAt: c.submittedAt,
    note: c.note ?? undefined,
    verifiedAt: c.verifiedAt ?? undefined,
    verifiedByPersonId: c.verifiedByPersonId ?? undefined,
    verifyNote: c.verifyNote ?? undefined,
    financeTxnId: c.financeTxnId ?? undefined,
  };
}

export async function apiListContributions(
  systemId: string,
  opts?: { status?: string; mine?: boolean; fundId?: string; orgUnitId?: string },
): Promise<{
  claims: MinistryContribution[];
  fundId: string | null;
  canVerify: boolean;
  funds: { id: string; name: string; orgUnitId: string }[];
}> {
  const q = new URLSearchParams({ systemId });
  if (opts?.status) q.set('status', opts.status);
  if (opts?.mine) q.set('mine', '1');
  if (opts?.fundId) q.set('fundId', opts.fundId);
  if (opts?.orgUnitId) q.set('orgUnitId', opts.orgUnitId);
  const res = await apiFetch<{
    claims: ApiContributionClaim[];
    fundId: string | null;
    canVerify: boolean;
    funds?: { id: string; name: string; orgUnitId: string }[];
  }>(`/api/contributions?${q}`);
  return {
    claims: res.claims.map(mapApiClaim),
    fundId: res.fundId,
    canVerify: res.canVerify,
    funds: res.funds ?? [],
  };
}

export async function apiSubmitContribution(input: {
  systemId: SystemId;
  fundId?: string;
  typeLabel: string;
  amount: number;
  paymentMethod: string;
  occurredOn: string;
  note?: string;
}): Promise<MinistryContribution> {
  const res = await apiFetch<{ claim: ApiContributionClaim }>(
    '/api/contributions',
    {
      method: 'POST',
      body: input,
    },
  );
  return mapApiClaim(res.claim);
}

export async function apiVerifyContribution(input: {
  contributionId: string;
  decision: 'CONFIRMED' | 'PARTIAL' | 'DECLINED';
  confirmedAmount?: number;
  note?: string;
}): Promise<{
  claim: MinistryContribution;
  financeTxnId?: string;
}> {
  const res = await apiFetch<{
    claim: ApiContributionClaim;
    financeTxn?: { id: string };
  }>(`/api/contributions/${input.contributionId}/verify`, {
    method: 'POST',
    body: {
      decision: input.decision,
      confirmedAmount: input.confirmedAmount,
      note: input.note,
    },
  });
  return {
    claim: mapApiClaim(res.claim),
    financeTxnId: res.financeTxn?.id ?? res.claim.financeTxnId ?? undefined,
  };
}

export async function loadContributionsPreferApi(
  systemId: SystemId,
  opts?: { status?: string; mine?: boolean; fundId?: string; orgUnitId?: string },
): Promise<{
  claims: MinistryContribution[];
  fundId: string | null;
  canVerify: boolean;
  funds: { id: string; name: string; orgUnitId: string }[];
} | null> {
  if (!isApiEnabled()) return null;
  try {
    return await apiListContributions(systemId, opts);
  } catch {
    return null;
  }
}
