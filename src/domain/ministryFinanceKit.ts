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
  startsOn: string;
  endsOn?: string;
  status: 'ACTIVE' | 'CLOSED';
  description?: string;
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
 * Flow: member submits → optional receive (cash/MoMo handoff) →
 * treasurer verify → post to org-private fund vault.
 *
 * - giver: personId + occurredOn + submittedAt
 * - payment: paymentMethod (+ evidenceNote)
 * - receiver: receivedByPersonId + receivedAt (who took the money)
 * - verifier: verifiedByPersonId + verifiedAt (who confirmed → ledger)
 */
export interface MinistryContribution {
  id: string;
  orgUnitId?: string;
  personId: string;
  teamId?: string;
  typeId: string;
  driveId?: string;
  amount: number;
  /** Confirmed amount when PARTIAL. */
  confirmedAmount?: number;
  paymentMethod: MinistryPaymentMethod;
  occurredOn: string;
  status: MinistryContributionStatus;
  submittedAt: string;
  note?: string;
  evidenceNote?: string;
  /** Who physically/digitally received the payment (may differ from verifier). */
  receivedByPersonId?: string;
  receivedAt?: string;
  verifiedAt?: string;
  verifiedByPersonId?: string;
  verifyNote?: string;
  financeTxnId?: string;
  followUpId?: string;
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
