/**
 * Stewardship spine for Programs & Projects:
 * money card (plan / sources / used) + delivery + close-out + P2 ops.
 */

export type FundingSourceType =
  | 'MINISTRY_FUND'
  | 'GENERAL_ALLOCATION'
  | 'DESIGNATED_GIFT'
  | 'FEES'
  | 'OTHER';

export type FundingSourceStatus = 'INTENDED' | 'CONFIRMED';

export type DeliveryItemKind = 'ACTIVITY' | 'EVENT';

export type DeliveryItemTier = 'REQUIRED' | 'PLANNED' | 'POSSIBLE';

export type DeliveryItemStatus = 'TODO' | 'DONE' | 'WAIVED' | 'CANCELLED';

export type LeftoverDecision =
  | 'STAY_IN_FUND'
  | 'NEXT_CYCLE'
  | 'RETURN_GENERAL'
  | 'DONOR_RULE'
  | 'OTHER';

export type MissionAdvanceStatus = 'OPEN' | 'RETIRED';

export interface MissionBudgetLine {
  id: string;
  label: string;
  plannedAmount: number;
  /** When true, amount cannot be amended without unfreeze. */
  frozen?: boolean;
  amendNote?: string;
  amendedAt?: string;
  amendedByPersonId?: string;
}

export interface MissionFundingSource {
  id: string;
  sourceType: FundingSourceType;
  label: string;
  amount: number;
  status: FundingSourceStatus;
  fundId?: string;
  donationId?: string;
  note?: string;
  confirmedAt?: string;
  confirmedByPersonId?: string;
}

export interface MissionDeliveryItem {
  id: string;
  kind: DeliveryItemKind;
  tier: DeliveryItemTier;
  title: string;
  status: DeliveryItemStatus;
  eventId?: string;
  activityId?: string;
  ownerPersonId?: string;
  dueDate?: string;
  waiveNote?: string;
  waivedByPersonId?: string;
  waivedAt?: string;
}

export interface MissionCloseout {
  closedAt: string;
  closedByPersonId: string;
  workSummary: string;
  moneySummary: string;
  leftoverDecision: LeftoverDecision;
  leftoverNote?: string;
  narrative?: string;
  /** Required when force-closing past open advances / delivery / tasks. */
  forceReason?: string;
  plannedCostSnapshot?: number;
  usedCostSnapshot?: number;
  confirmedFundingSnapshot?: number;
  /** Frozen people count at close (archive / impact forever). */
  participantsServedSnapshot?: number;
}

export type MissionHealthSnapshot = {
  date: string; // YYYY-MM-DD
  score: number;
  tone: string;
  label: string;
  parts?: {
    schedule: number;
    money: number;
    delivery: number;
    people: number;
  };
};

/** Float issued to a leader — must retire with receipts. */
export interface MissionAdvance {
  id: string;
  holderPersonId: string;
  amount: number;
  fundId?: string;
  purpose: string;
  status: MissionAdvanceStatus;
  issuedAt: string;
  issuedByPersonId: string;
  retiredAt?: string;
  retiredByPersonId?: string;
  /** Amount accounted for (spent); unspent = amount − retiredSpent. */
  retiredSpent?: number;
  returnedAmount?: number;
  receiptNote?: string;
}

/** Non-cash gift noted against the programme/project. */
export interface MissionInKind {
  id: string;
  label: string;
  estimatedValue?: number;
  donorName?: string;
  notedAt: string;
  notedByPersonId: string;
  note?: string;
}

/** Programme year/envelope renew without ending the programme. */
export interface MissionPhaseRenewal {
  id: string;
  periodLabel: string;
  closedAt: string;
  closedByPersonId: string;
  plannedCostSnapshot?: number;
  usedCostSnapshot?: number;
  confirmedFundingSnapshot?: number;
  leftoverDecision?: LeftoverDecision;
  narrative?: string;
  nextPlannedCost?: number;
  nextPeriodLabel?: string;
}

/** Shared stewardship fields hung on Program / ChurchProject. */
export interface MissionStewardship {
  plannedCost?: number;
  budgetLines?: MissionBudgetLine[];
  fundingPlan?: MissionFundingSource[];
  /** Manual or rolled-up spend against the plan. */
  usedCost?: number;
  deliveryItems?: MissionDeliveryItem[];
  closeout?: MissionCloseout;
  advances?: MissionAdvance[];
  inKind?: MissionInKind[];
  /** Current envelope label e.g. "2026". */
  envelopePeriod?: string;
  phaseRenewals?: MissionPhaseRenewal[];
  /** Daily health snapshots (optional; last ~30 kept). */
  healthSnapshots?: MissionHealthSnapshot[];
  /** W4 delivery blockers / risks. */
  blockers?: import('./deliveryRisk').MissionBlocker[];
}

/** Upsert today's health into stewardship; keep last 30 days. */
export function upsertHealthSnapshot(
  s: MissionStewardship,
  snap: MissionHealthSnapshot,
  keep = 30,
): MissionStewardship {
  const rest = (s.healthSnapshots ?? []).filter((h) => h.date !== snap.date);
  const healthSnapshots = [...rest, snap]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-keep);
  return { ...s, healthSnapshots };
}

export function confirmedFundingTotal(s?: MissionStewardship): number {
  if (!s?.fundingPlan?.length) return 0;
  return s.fundingPlan
    .filter((f) => f.status === 'CONFIRMED')
    .reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
}

export function intendedFundingTotal(s?: MissionStewardship): number {
  if (!s?.fundingPlan?.length) return 0;
  return s.fundingPlan.reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
}

export function fundingGap(s?: MissionStewardship): number {
  const planned = Number(s?.plannedCost) || 0;
  return planned - confirmedFundingTotal(s);
}

export function remainingConfirmed(s?: MissionStewardship): number {
  return confirmedFundingTotal(s) - (Number(s?.usedCost) || 0);
}

export function costVariance(s?: MissionStewardship): number {
  return (Number(s?.usedCost) || 0) - (Number(s?.plannedCost) || 0);
}

export function requiredDeliveryOpen(s?: MissionStewardship): MissionDeliveryItem[] {
  return (s?.deliveryItems ?? []).filter(
    (d) => d.tier === 'REQUIRED' && d.status === 'TODO',
  );
}

export function deliveryReadyToClose(s?: MissionStewardship): boolean {
  return requiredDeliveryOpen(s).length === 0;
}

export function openAdvances(s?: MissionStewardship): MissionAdvance[] {
  return (s?.advances ?? []).filter((a) => a.status === 'OPEN');
}

export function budgetLinesTotal(s?: MissionStewardship): number {
  return (s?.budgetLines ?? []).reduce(
    (sum, l) => sum + (Number(l.plannedAmount) || 0),
    0,
  );
}

export function inKindTotal(s?: MissionStewardship): number {
  return (s?.inKind ?? []).reduce(
    (sum, i) => sum + (Number(i.estimatedValue) || 0),
    0,
  );
}

export function formatRwf(n: number): string {
  return `${Math.round(n).toLocaleString()} RWF`;
}

export const LEFTOVER_LABELS: Record<LeftoverDecision, string> = {
  STAY_IN_FUND: 'Stay in linked fund',
  NEXT_CYCLE: 'Roll to next cycle / cohort',
  RETURN_GENERAL: 'Return to General',
  DONOR_RULE: 'Per donor / restriction rule',
  OTHER: 'Other (see note)',
};

export const SOURCE_TYPE_LABELS: Record<FundingSourceType, string> = {
  MINISTRY_FUND: 'Ministry fund',
  GENERAL_ALLOCATION: 'General allocation',
  DESIGNATED_GIFT: 'Designated gift',
  FEES: 'Fees',
  OTHER: 'Other',
};
