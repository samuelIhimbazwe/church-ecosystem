import type {
  DeaconCareCase,
  DeaconContribution,
  DeaconExpenseRecord,
  DeaconRosterMember,
  DeaconVisit,
} from '../domain/types';

export const DEACON_ROSTER: DeaconRosterMember[] = [
  {
    id: 'drm-coord',
    personId: 'p-deacon-coord',
    office: 'COORDINATOR',
    status: 'ACTIVE',
  },
  {
    id: 'drm-treas',
    personId: 'p-deacon-treas',
    office: 'TREASURER',
    status: 'ACTIVE',
  },
  {
    id: 'drm-patrick',
    personId: 'p-member',
    office: 'MEMBER',
    status: 'ACTIVE',
  },
  {
    id: 'drm-secretary',
    personId: 'p-secretary',
    office: 'SECRETARY',
    status: 'INACTIVE',
  },
];

export let DEACON_CASES: DeaconCareCase[] = [
  {
    id: 'dcase-1',
    title: 'Hospital visit — Remera',
    personId: 'p-member',
    householdNote: 'Patrick Niyonzima household',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    openedOn: '2026-09-01',
    assignedPersonId: 'p-deacon-coord',
    notes: 'Surgery recovery; meals and prayer requested',
  },
  {
    id: 'dcase-2',
    title: 'New widow support',
    householdNote: 'Confidential — contact via coordinator',
    status: 'OPEN',
    priority: 'NORMAL',
    openedOn: '2026-09-05',
    assignedPersonId: 'p-deacon-treas',
    notes: 'Benevolence assessment pending',
  },
  {
    id: 'dcase-3',
    title: 'Transport assistance',
    personId: 'p-youth-leader',
    status: 'CLOSED',
    priority: 'LOW',
    openedOn: '2026-08-10',
    assignedPersonId: 'p-deacon-coord',
    notes: 'One-time fuel support for ministry trip — closed',
  },
];

export let DEACON_VISITS: DeaconVisit[] = [
  {
    id: 'dvis-1',
    caseId: 'dcase-1',
    personId: 'p-member',
    visitedOn: '2026-09-03',
    visitorPersonId: 'p-deacon-coord',
    location: 'King Faisal Hospital',
    notes: 'Prayed with family; follow-up Sunday',
  },
  {
    id: 'dvis-2',
    caseId: 'dcase-1',
    personId: 'p-member',
    visitedOn: '2026-09-07',
    visitorPersonId: 'p-deacon-treas',
    location: 'Home — Remera',
    notes: 'Delivered meal package',
  },
];

export let DEACON_CONTRIBUTIONS: DeaconContribution[] = [
  {
    id: 'dcon-1',
    personId: 'p-deacon-coord',
    amount: 20_000,
    paymentMethod: 'MOMO',
    occurredOn: '2026-09-01',
    status: 'CONFIRMED',
    submittedAt: '2026-09-01T10:00:00',
    note: 'Monthly deacon fund',
    verifiedAt: '2026-09-01T12:00:00',
    verifiedByPersonId: 'p-deacon-treas',
    financeTxnId: 'txn-deacon-seed-1',
  },
  {
    id: 'dcon-2',
    personId: 'p-member',
    amount: 5_000,
    paymentMethod: 'CASH',
    occurredOn: '2026-09-06',
    status: 'PENDING',
    submittedAt: '2026-09-06T09:00:00',
    note: 'Benevolence gift',
  },
];

export let DEACON_EXPENSES: DeaconExpenseRecord[] = [
  {
    id: 'dexp-1',
    category: 'Benevolence',
    amount: 50_000,
    occurredOn: '2026-09-04',
    description: 'Hospital meal support — case dcase-1',
    status: 'APPROVED',
    caseId: 'dcase-1',
    recordedByPersonId: 'p-deacon-treas',
    approvedByPersonId: 'p-deacon-coord',
    financeTxnId: 'txn-deacon-seed-exp-1',
  },
  {
    id: 'dexp-2',
    category: 'Transport',
    amount: 15_000,
    occurredOn: '2026-09-07',
    description: 'Visit transport — Remera',
    status: 'PENDING',
    caseId: 'dcase-1',
    recordedByPersonId: 'p-deacon-coord',
  },
];

export function pushDeaconCase(c: DeaconCareCase) {
  DEACON_CASES = [c, ...DEACON_CASES];
}

export function updateDeaconCase(
  id: string,
  patch: Partial<DeaconCareCase>,
) {
  DEACON_CASES = DEACON_CASES.map((c) =>
    c.id === id ? { ...c, ...patch } : c,
  );
}

export function pushDeaconVisit(v: DeaconVisit) {
  DEACON_VISITS = [v, ...DEACON_VISITS];
}

export function pushDeaconContribution(c: DeaconContribution) {
  DEACON_CONTRIBUTIONS = [c, ...DEACON_CONTRIBUTIONS];
}

export function updateDeaconContribution(
  id: string,
  patch: Partial<DeaconContribution>,
) {
  DEACON_CONTRIBUTIONS = DEACON_CONTRIBUTIONS.map((c) =>
    c.id === id ? { ...c, ...patch } : c,
  );
}

export function pushDeaconExpense(r: DeaconExpenseRecord) {
  DEACON_EXPENSES = [r, ...DEACON_EXPENSES];
}

export function updateDeaconExpense(
  id: string,
  patch: Partial<DeaconExpenseRecord>,
) {
  DEACON_EXPENSES = DEACON_EXPENSES.map((e) =>
    e.id === id ? { ...e, ...patch } : e,
  );
}
