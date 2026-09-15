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
    status: 'HANDLING',
    priority: 'HIGH',
    openedOn: '2026-09-01',
    assignedPersonId: 'p-deacon-coord',
    category: 'SICK',
    summary: 'Sick · hospital · recovery follow-up',
    privateNotes: 'Surgery recovery; meals and prayer requested',
    sickSince: '2026-08-28',
    sickLocation: 'HOSPITAL',
    sickStatus: 'Recovering',
    submittedByRole: 'DEACON',
    submittedByPersonId: 'p-deacon-coord',
    escalateTo: 'CHURCH_LEADER',
  },
  {
    id: 'dcase-2',
    title: 'New widow support',
    householdNote: 'Confidential — contact via coordinator',
    status: 'OPEN',
    priority: 'NORMAL',
    openedOn: '2026-09-05',
    assignedPersonId: 'p-deacon-treas',
    category: 'DIED_OR_BEREAVED',
    summary: 'Lost loved one · benevolence assessment',
    privateNotes: 'Benevolence assessment pending',
    submittedByRole: 'SECRETARY',
    submittedByPersonId: 'p-secretary',
    escalateTo: 'CATECHIST',
  },
  {
    id: 'dcase-3',
    title: 'Transport assistance',
    personId: 'p-youth-leader',
    status: 'CLOSED',
    priority: 'LOW',
    openedOn: '2026-08-10',
    assignedPersonId: 'p-deacon-coord',
    category: 'OTHER_ISSUE',
    categoryDetail: 'Transport hardship',
    summary: 'Other issue · Transport hardship',
    privateNotes: 'One-time fuel support for ministry trip — closed',
    submittedByRole: 'DEACON',
    submittedByPersonId: 'p-deacon-coord',
  },
  {
    id: 'dcase-4',
    title: 'Upcoming wedding — blessing',
    personId: 'p-youth-leader',
    status: 'WILL_HANDLE',
    priority: 'NORMAL',
    openedOn: '2026-09-10',
    assignedPersonId: 'p-deacon-coord',
    category: 'WEDDING',
    summary: 'Have a wedding · clearance underway',
    submittedByRole: 'MEMBER',
    submittedByPersonId: 'p-youth-leader',
    escalateTo: 'PASTOR',
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
    status: 'PENDING',
    caseId: 'dcase-1',
    recordedByPersonId: 'p-deacon-treas',
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

export function pushDeaconExpense(e: DeaconExpenseRecord) {
  DEACON_EXPENSES = [e, ...DEACON_EXPENSES];
}

export function updateDeaconExpense(
  id: string,
  patch: Partial<DeaconExpenseRecord>,
) {
  DEACON_EXPENSES = DEACON_EXPENSES.map((e) =>
    e.id === id ? { ...e, ...patch } : e,
  );
}
