/**
 * FundFlowProfile — reusable contribution/handoff stages (W6).
 * Choir keeps the full family→coordinator→treasurer chain; peers use a thinner kit.
 */
import type { MinistryPaymentMethod } from './ministryFinanceKit';
import type { SystemId } from './types';

export type FundFlowStageId =
  | 'CLAIMED'
  | 'FAMILY'
  | 'COORDINATOR'
  | 'TREASURER'
  | 'VAULT'
  | 'ISSUE';

export type FundFlowStageDef = {
  id: FundFlowStageId;
  label: string;
  /** Contribution statuses that land in this stage. */
  statuses: string[];
};

/** Default church-ministry contribution pipeline stages (choir-depth). */
export const DEFAULT_FUND_FLOW_STAGES: FundFlowStageDef[] = [
  {
    id: 'CLAIMED',
    label: 'Claimed',
    statuses: ['PENDING'],
  },
  {
    id: 'FAMILY',
    label: 'Family',
    statuses: ['FAMILY_CONFIRMED', 'FAMILY_PARTIAL', 'PARTIAL'],
  },
  {
    id: 'COORDINATOR',
    label: 'Coordinator',
    statuses: ['AT_COORDINATOR'],
  },
  {
    id: 'TREASURER',
    label: 'Treasurer',
    statuses: ['AT_TREASURER'],
  },
  {
    id: 'VAULT',
    label: 'Vault',
    statuses: ['CONFIRMED'],
  },
  {
    id: 'ISSUE',
    label: 'Issues',
    statuses: ['DECLINED', 'FAMILY_DECLINED'],
  },
];

/** Peer kit: claim → verify → vault (no family MoMo chain). */
export const PEER_FUND_FLOW_STAGES: FundFlowStageDef[] = [
  { id: 'CLAIMED', label: 'Pending verify', statuses: ['PENDING'] },
  { id: 'FAMILY', label: 'In review', statuses: [] },
  { id: 'COORDINATOR', label: 'Coordinator', statuses: [] },
  { id: 'TREASURER', label: 'Treasurer', statuses: [] },
  {
    id: 'VAULT',
    label: 'Confirmed',
    statuses: ['CONFIRMED', 'PARTIAL'],
  },
  {
    id: 'ISSUE',
    label: 'Declined',
    statuses: ['DECLINED', 'FAMILY_DECLINED'],
  },
];

export type FundFlowHandoffKind =
  | 'FAMILY_TO_COORDINATOR'
  | 'COORDINATOR_TO_TREASURER'
  | 'TREASURER_TO_VAULT';

export type FundFlowProfile = {
  id: string;
  label: string;
  stages: FundFlowStageDef[];
  handoffKinds: FundFlowHandoffKind[];
  /** Payment methods allowed on handoffs. */
  paymentMethods: MinistryPaymentMethod[];
};

export const CHOIR_FUND_FLOW_PROFILE: FundFlowProfile = {
  id: 'choir-contribution-v1',
  label: 'Choir contribution pipeline',
  stages: DEFAULT_FUND_FLOW_STAGES,
  handoffKinds: [
    'FAMILY_TO_COORDINATOR',
    'COORDINATOR_TO_TREASURER',
    'TREASURER_TO_VAULT',
  ],
  paymentMethods: ['CASH', 'MOMO', 'BANK'],
};

export const WORSHIP_FUND_FLOW_PROFILE: FundFlowProfile = {
  id: 'worship-contribution-v1',
  label: 'Worship contribution pipeline',
  stages: PEER_FUND_FLOW_STAGES,
  handoffKinds: ['TREASURER_TO_VAULT'],
  paymentMethods: ['CASH', 'MOMO', 'BANK'],
};

export const YOUTH_FUND_FLOW_PROFILE: FundFlowProfile = {
  id: 'youth-contribution-v1',
  label: 'Youth contribution pipeline',
  stages: PEER_FUND_FLOW_STAGES,
  handoffKinds: ['TREASURER_TO_VAULT'],
  paymentMethods: ['CASH', 'MOMO', 'BANK'],
};

export const PEER_FUND_FLOW_PROFILE: FundFlowProfile = {
  id: 'peer-contribution-v1',
  label: 'Ministry contribution pipeline',
  stages: PEER_FUND_FLOW_STAGES,
  handoffKinds: ['TREASURER_TO_VAULT'],
  paymentMethods: ['CASH', 'MOMO', 'BANK'],
};

/** Resolve the optional FundFlowProfile for a peer/ministry system (no forks). */
export function fundFlowProfileFor(systemId: SystemId): FundFlowProfile {
  if (systemId === 'sys-choir') return CHOIR_FUND_FLOW_PROFILE;
  if (systemId === 'sys-worship') return WORSHIP_FUND_FLOW_PROFILE;
  if (systemId === 'sys-youth') return YOUTH_FUND_FLOW_PROFILE;
  return PEER_FUND_FLOW_PROFILE;
}

export function stageForStatus(
  profile: FundFlowProfile,
  status: string,
): FundFlowStageDef | undefined {
  return profile.stages.find((s) => s.statuses.includes(status));
}

export function countByStage<T extends { status: string }>(
  profile: FundFlowProfile,
  items: T[],
): Record<FundFlowStageId, number> {
  const out = {} as Record<FundFlowStageId, number>;
  for (const s of profile.stages) out[s.id] = 0;
  for (const item of items) {
    const stage = stageForStatus(profile, item.status);
    if (stage) out[stage.id] = (out[stage.id] ?? 0) + 1;
  }
  return out;
}

/** Active stages with at least one mapped status (for peer StageBoard). */
export function activeFundFlowStages(profile: FundFlowProfile): FundFlowStageDef[] {
  return profile.stages.filter((s) => s.statuses.length > 0);
}

/** Choir adapter — maps profile stage → UI tab id used today. */
export function choirStageToTab(
  stageId: FundFlowStageId,
): 'family' | 'oversight' | 'confirmed' | 'issues' | 'goals' {
  if (stageId === 'CLAIMED' || stageId === 'FAMILY') return 'family';
  if (stageId === 'COORDINATOR' || stageId === 'TREASURER') return 'oversight';
  if (stageId === 'VAULT') return 'confirmed';
  if (stageId === 'ISSUE') return 'issues';
  return 'goals';
}
