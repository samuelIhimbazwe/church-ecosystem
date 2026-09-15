import type { MinistryPaymentMethod } from './ministryFinanceKit';

/** Family MoMo / bank rail — members pay here; family leader confirms. */
export interface ChoirFamilyPaymentRail {
  id: string;
  orgUnitId: string;
  teamId: string;
  kind: 'MOMO' | 'BANK';
  label: string;
  /** MoMo code or bank account number. */
  accountRef: string;
  createdByPersonId: string;
  createdAt: string;
  active: boolean;
}

/** Coordinator / treasurer receiving rails for upward handoffs. */
export interface ChoirOfficePaymentRail {
  id: string;
  orgUnitId: string;
  holderOffice: 'COORDINATOR' | 'TREASURER';
  kind: 'MOMO' | 'BANK';
  label: string;
  accountRef: string;
  createdByPersonId: string;
  createdAt: string;
  active: boolean;
}

export type ChoirHandoffKind =
  | 'FAMILY_TO_COORDINATOR'
  | 'COORDINATOR_TO_TREASURER';

export interface ChoirContributionHandoff {
  id: string;
  orgUnitId: string;
  kind: ChoirHandoffKind;
  fromPersonId: string;
  teamId?: string;
  contributionIds: string[];
  totalAmount: number;
  paymentMethod: MinistryPaymentMethod;
  toRailId?: string;
  note?: string;
  submittedAt: string;
  status: 'SUBMITTED' | 'ACCEPTED' | 'DISPUTED';
  acceptedAt?: string;
  acceptedByPersonId?: string;
}

export interface ChoirContributionEvent {
  id: string;
  orgUnitId: string;
  contributionId?: string;
  handoffId?: string;
  at: string;
  actorPersonId: string;
  action: string;
  detail?: string;
}

export type ChoirContribNotifyKind =
  | 'NEW_CLAIM'
  | 'FAMILY_RESPONSE'
  | 'HANDOFF'
  | 'FOLLOW_UP'
  | 'MODIFIED'
  | 'FINALIZED';

export interface ChoirContribNotification {
  id: string;
  orgUnitId: string;
  /** Offices that should see this (empty = personId only). */
  audienceOffices: Array<
    'TREASURER' | 'COORDINATOR' | 'FAMILY_LEADER' | 'PRESIDENT' | 'VP' | 'SECRETARY'
  >;
  personId?: string;
  kind: ChoirContribNotifyKind;
  contributionId?: string;
  handoffId?: string;
  message: string;
  createdAt: string;
  readAt?: string;
}

export function isFamilyGateStatus(
  status: string,
): status is 'FAMILY_CONFIRMED' | 'FAMILY_PARTIAL' | 'FAMILY_DECLINED' {
  return (
    status === 'FAMILY_CONFIRMED' ||
    status === 'FAMILY_PARTIAL' ||
    status === 'FAMILY_DECLINED'
  );
}

export function isFinalConfirmedStatus(
  status: string,
): status is 'CONFIRMED' | 'PARTIAL' {
  return status === 'CONFIRMED' || status === 'PARTIAL';
}

export function isIssueStatus(status: string): boolean {
  return (
    status === 'FAMILY_PARTIAL' ||
    status === 'FAMILY_DECLINED' ||
    status === 'PARTIAL' ||
    status === 'DECLINED'
  );
}
