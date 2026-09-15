import type {
  CalendarConflictCase,
  DisciplineCase,
  PersonPathway,
  PulpitSlot,
  TransferLetterOut,
} from '../domain/types';

export let PERSON_PATHWAYS: PersonPathway[] = [
  {
    id: 'path-bap-1',
    personId: 'p-member',
    kind: 'BAPTISM_TRACK',
    status: 'READY',
    label: 'Baptism class Q3 2026',
    openedOn: '2026-07-01',
    openedByPersonId: 'p-catechist',
    notes: 'Completed standing class; awaiting Leader name confirm',
  },
  {
    id: 'path-bap-2',
    personId: 'p-youth-leader',
    kind: 'BAPTISM_TRACK',
    status: 'IN_PROGRESS',
    label: 'Baptism track',
    openedOn: '2026-08-15',
    openedByPersonId: 'p-catechist',
  },
  {
    id: 'path-tin-1',
    personId: 'p-choir-pres',
    kind: 'TRANSFER_IN',
    status: 'OPEN',
    label: 'Transfer in from ADEPR Remera (example pathway)',
    openedOn: '2026-09-01',
    openedByPersonId: 'p-secretary',
  },
];

export let DISCIPLINE_CASES: DisciplineCase[] = [
  {
    id: 'disc-1',
    personId: 'p-member',
    title: 'Restoration conversation',
    status: 'AWAITING_LEADER',
    openedOn: '2026-08-20',
    openedByPersonId: 'p-assistant',
    summary: 'Pastors started; final standing needs Church Leader',
    privateNotes: 'Details held with pastors',
  },
];

export let TRANSFER_LETTERS_OUT: TransferLetterOut[] = [
  {
    id: 'tlo-1',
    personId: 'p-member',
    destinationChurch: 'ADEPR Gisozi',
    status: 'AWAITING_LEADER',
    draftedByPersonId: 'p-secretary',
    draftedOn: '2026-09-08',
    note: 'Family relocating',
  },
];

export let PULPIT_SLOTS: PulpitSlot[] = [
  {
    id: 'pulpit-1',
    serviceDate: '2026-09-21',
    serviceLabel: 'Sunday SS1',
    preacherPersonId: 'p-assistant',
    status: 'AWAITING_LEADER',
    preparedByPersonId: 'p-catechist',
    catechistReviewedByPersonId: 'p-catechist',
    catechistReviewedAt: '2026-09-12T10:00:00.000Z',
  },
  {
    id: 'pulpit-2',
    serviceDate: '2026-09-28',
    serviceLabel: 'Sunday SS1',
    preacherPersonId: 'p-pastor',
    status: 'APPROVED',
    preparedByPersonId: 'p-catechist',
    catechistReviewedByPersonId: 'p-catechist',
    catechistReviewedAt: '2026-09-10T10:00:00.000Z',
    approvedByPersonId: 'p-pastor',
    approvedAt: '2026-09-11T08:00:00.000Z',
  },
  {
    id: 'pulpit-3',
    serviceDate: '2026-10-05',
    serviceLabel: 'Sunday SS2 · guest',
    preacherPersonId: 'p-assistant',
    isGuest: true,
    guestName: 'Rev. Guest (district)',
    status: 'CATECHIST_REVIEW',
    preparedByPersonId: 'p-catechist',
  },
];

export let CALENDAR_CONFLICTS: CalendarConflictCase[] = [
  {
    id: 'calconf-1',
    title: 'Hall double-book risk',
    date: '2026-09-27',
    eventIds: [],
    status: 'OPEN',
    notes: 'Youth and Women both asked for main hall afternoon — ministries trying to settle',
  },
];

export function pushPathway(p: PersonPathway) {
  PERSON_PATHWAYS = [p, ...PERSON_PATHWAYS];
}

export function updatePathway(id: string, patch: Partial<PersonPathway>) {
  PERSON_PATHWAYS = PERSON_PATHWAYS.map((p) =>
    p.id === id ? { ...p, ...patch } : p,
  );
}

export function pushDiscipline(c: DisciplineCase) {
  DISCIPLINE_CASES = [c, ...DISCIPLINE_CASES];
}

export function updateDiscipline(id: string, patch: Partial<DisciplineCase>) {
  DISCIPLINE_CASES = DISCIPLINE_CASES.map((c) =>
    c.id === id ? { ...c, ...patch } : c,
  );
}

export function pushTransferLetter(l: TransferLetterOut) {
  TRANSFER_LETTERS_OUT = [l, ...TRANSFER_LETTERS_OUT];
}

export function updateTransferLetter(
  id: string,
  patch: Partial<TransferLetterOut>,
) {
  TRANSFER_LETTERS_OUT = TRANSFER_LETTERS_OUT.map((l) =>
    l.id === id ? { ...l, ...patch } : l,
  );
}

export function pushPulpit(s: PulpitSlot) {
  PULPIT_SLOTS = [s, ...PULPIT_SLOTS];
}

export function updatePulpit(id: string, patch: Partial<PulpitSlot>) {
  PULPIT_SLOTS = PULPIT_SLOTS.map((s) =>
    s.id === id ? { ...s, ...patch } : s,
  );
}

export function pushCalendarConflict(c: CalendarConflictCase) {
  CALENDAR_CONFLICTS = [c, ...CALENDAR_CONFLICTS];
}

export function updateCalendarConflict(
  id: string,
  patch: Partial<CalendarConflictCase>,
) {
  CALENDAR_CONFLICTS = CALENDAR_CONFLICTS.map((c) =>
    c.id === id ? { ...c, ...patch } : c,
  );
}
