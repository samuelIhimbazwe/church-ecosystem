/**
 * Shared ministry finance kit — canonical model for every peer system.
 *
 * Mission kit (Programs / Events / Tasks / Projects / Program Activities)
 * stays in missionService. This kit is money + material only.
 *
 * Rollout: Choir/Worship are reference; Youth → Deacon → Protocol adopt next.
 */

export type MinistryPaymentMethod = 'CASH' | 'MOMO' | 'BANK';

export interface MinistryPaymentMethodConfig {
  id: string;
  orgUnitId?: string;
  method: MinistryPaymentMethod;
  /** Shown to members, e.g. "MTN MoMo · *182*…" */
  label: string;
  active: boolean;
  memberVisible: boolean;
}

export interface MinistryContributionType {
  id: string;
  orgUnitId?: string;
  name: string;
  category: string;
  frequency: 'ONCE' | 'MONTHLY' | 'EVENT';
  defaultAmount?: number;
  active: boolean;
  memberVisible: boolean;
}

export type MinistryContributionStatus =
  | 'PENDING'
  /** Family leader confirmed payment into family MoMo/bank. */
  | 'FAMILY_CONFIRMED'
  | 'FAMILY_PARTIAL'
  | 'FAMILY_DECLINED'
  /** Batched upward in the choir money chain. */
  | 'AT_COORDINATOR'
  | 'AT_TREASURER'
  /** Final outcomes (treasurer / vault). */
  | 'CONFIRMED'
  | 'PARTIAL'
  | 'DECLINED';

/**
 * Timed contribution window (e.g. “Youth Q2 drive”, “Choir Easter offering”).
 * Goals hang off the drive; individual claims reference driveId.
 */
export interface MinistryContributionDrive {
  id: string;
  systemId: string;
  orgUnitId?: string;
  name: string;
  typeId?: string;
  /** Mirrors type frequency for display; type remains source of category. */
  frequency?: 'ONCE' | 'MONTHLY' | 'EVENT';
  startsOn: string;
  endsOn?: string;
  status: 'ACTIVE' | 'CLOSED';
  description?: string;
  /**
   * When false, MINISTRY (whole-choir) goal is hidden from family leaders
   * and members. Choir leaders always see it.
   */
  ministryGoalPublic?: boolean;
  createdByPersonId?: string;
  createdAt?: string;
}

/**
 * Goal amount by scope:
 * - MEMBER  → each person owes targetAmount (e.g. 5_000)
 * - TEAM    → that team’s collective target (needs teamId)
 * - MINISTRY → whole system target (e.g. Youth 1_000_000)
 */
export type ContributionGoalScope = 'MEMBER' | 'TEAM' | 'MINISTRY';

export interface MinistryContributionGoal {
  id: string;
  driveId: string;
  scope: ContributionGoalScope;
  teamId?: string;
  targetAmount: number;
  label?: string;
}

/**
 * Member contribution claim.
 *
 * Choir money chain (Ijwi model):
 * member claim → family leader Confirm/Partial/Decline (family rail) →
 * family leader batches to coordinator → coordinator batches to treasurer →
 * treasurer finalizes into choir vault.
 *
 * - giver: personId + occurredOn + submittedAt
 * - payment: paymentMethod (+ evidenceNote) toward family rail
 * - familyResponse*: family leader decision
 * - verifier: verifiedByPersonId + verifiedAt (final / vault)
 */
export interface MinistryContribution {
  id: string;
  orgUnitId?: string;
  personId: string;
  teamId?: string;
  typeId: string;
  driveId?: string;
  amount: number;
  /** Confirmed amount when PARTIAL / FAMILY_PARTIAL. */
  confirmedAmount?: number;
  paymentMethod: MinistryPaymentMethod;
  /** Family MoMo/bank rail the member paid to (when known). */
  familyRailId?: string;
  occurredOn: string;
  status: MinistryContributionStatus;
  submittedAt: string;
  note?: string;
  evidenceNote?: string;
  /** Who physically/digitally received the payment (may differ from verifier). */
  receivedByPersonId?: string;
  receivedAt?: string;
  /** Family leader response (first gate). */
  familyRespondedAt?: string;
  familyRespondedByPersonId?: string;
  familyResponseNote?: string;
  familyConfirmedAmount?: number;
  verifiedAt?: string;
  verifiedByPersonId?: string;
  verifyNote?: string;
  financeTxnId?: string;
  followUpId?: string;
  handoffToCoordinatorId?: string;
  handoffToTreasurerId?: string;
  /** Optional stewardship tag — confirmed gift lands on this programme. */
  programId?: string;
  /** Optional stewardship tag — confirmed gift lands on this project. */
  projectId?: string;
}

export interface MinistryFollowUp {
  id: string;
  contributionId: string;
  personId: string;
  reason: string;
  status: 'OPEN' | 'CLOSED';
  createdAt: string;
  createdByPersonId: string;
  resultNote?: string;
  closedAt?: string;
  closedByPersonId?: string;
}

/** External donor gift — not a member contribution claim. */
export interface MinistryDonation {
  id: string;
  orgUnitId?: string;
  donorName: string;
  source: string;
  donationType: string;
  amount: number;
  occurredOn: string;
  paymentMethod: MinistryPaymentMethod;
  evidenceNote?: string;
  recordedByPersonId: string;
  recordedAt: string;
  receivedByPersonId?: string;
  receivedAt?: string;
  financeTxnId?: string;
  /** Optional stewardship tag. */
  programId?: string;
  projectId?: string;
}

export interface MinistrySponsor {
  id: string;
  orgUnitId?: string;
  name: string;
  sponsorType: 'INDIVIDUAL' | 'ORG' | 'CHURCH';
  status: 'ACTIVE' | 'INACTIVE';
  contactNote?: string;
}

export interface MinistrySponsorship {
  id: string;
  orgUnitId?: string;
  sponsorId: string;
  label: string;
  amount: number;
  startDate: string;
  endDate?: string;
  status: 'ACTIVE' | 'ENDED';
  notes?: string;
}

/** External fundraising pot (non-member gifts). Distinct from ContributionDrive. */
export interface MinistryFundraisingCampaign {
  id: string;
  orgUnitId?: string;
  name: string;
  goalAmount: number;
  status: 'ACTIVE' | 'CLOSED';
  startDate: string;
  endDate?: string;
}

export interface MinistryCampaignGift {
  id: string;
  orgUnitId?: string;
  campaignId: string;
  contributorName: string;
  amount: number;
  occurredOn: string;
  paymentMethod: MinistryPaymentMethod;
  recordedByPersonId: string;
}

export interface MinistryBudget {
  id: string;
  orgUnitId?: string;
  name: string;
  year: number;
  kind: 'ANNUAL' | 'EVENT';
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED';
}

export interface MinistryBudgetLine {
  id: string;
  budgetId: string;
  side: 'INCOME' | 'EXPENSE';
  category: string;
  plannedAmount: number;
}

export interface MinistryIncomeRecord {
  id: string;
  orgUnitId?: string;
  category: string;
  amount: number;
  occurredOn: string;
  description: string;
  recordedByPersonId: string;
  budgetId?: string;
  financeTxnId?: string;
}

export type MinistryExpenseStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface MinistryExpenseRecord {
  id: string;
  orgUnitId?: string;
  category: string;
  amount: number;
  occurredOn: string;
  description: string;
  status: MinistryExpenseStatus;
  recordedByPersonId: string;
  approvedByPersonId?: string;
  financeTxnId?: string;
  /** When set, approve increments stewardship.usedCost. */
  programId?: string;
  projectId?: string;
}

export interface MinistryAsset {
  id: string;
  orgUnitId?: string;
  name: string;
  category: string;
  value: number;
  assignedToPersonId?: string;
  acquiredOn: string;
  status: 'ACTIVE' | 'DISPOSED';
  historyNote?: string;
}

export interface MinistryLiability {
  id: string;
  orgUnitId?: string;
  name: string;
  amount: number;
  dueDate: string;
  status: 'OPEN' | 'CLOSED';
  notes?: string;
}

/** Kit surface every ACTIVE ministry system should expose. */
export const MINISTRY_FINANCE_KIT_MODULES = [
  'contributionTypes',
  'paymentMethods',
  'contributionDrives',
  'contributionGoals',
  'contributions',
  'donations',
  'sponsors',
  'fundraisingCampaigns',
  'budgets',
  'incomeExpense',
  'assets',
  'liabilities',
  'reports',
] as const;

export type MinistryFinanceKitModule =
  (typeof MINISTRY_FINANCE_KIT_MODULES)[number];
