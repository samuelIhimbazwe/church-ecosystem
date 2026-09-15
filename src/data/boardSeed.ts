import type { BoardMeeting } from '../domain/types';

function itemsFromStrings(lines: string[], prefix: string) {
  return lines.map((text, i) => ({
    id: `${prefix}-a${i + 1}`,
    text,
    state: 'OPEN' as const,
  }));
}

/** Seed Board of Directors meetings for Itorero Kacyiru. */
export let BOARD_MEETINGS: BoardMeeting[] = [
  {
    id: 'board-2026-08',
    title: 'August Board meeting',
    scheduledAt: '2026-08-28T17:00:00.000Z',
    calledByPersonId: 'p-pastor',
    status: 'HELD',
    heldAt: '2026-08-28T17:05:00.000Z',
    agenda: [
      'Youth outreach assistance report',
      'Choir vestment support follow-up',
      'Protocol September coverage',
      'Appoint System Admin for Youth System',
    ],
    agendaItems: itemsFromStrings(
      [
        'Youth outreach assistance report',
        'Choir vestment support follow-up',
        'Protocol September coverage',
        'Appoint System Admin for Youth System',
      ],
      'board-2026-08',
    ).map((a, i) =>
      i === 0 ? { ...a, state: 'DECIDED' as const, decisionId: 'bd-aug-1' } : a,
    ),
    attendeePersonIds: [
      'p-pastor',
      'p-assistant',
      'p-catechist',
      'p-youth-leader',
      'p-choir-pres',
      'p-deacon-coord',
      'p-worship-pres',
    ],
    decisions: [
      {
        id: 'bd-aug-1',
        summary:
          'Accept Youth outreach assistance report; close church assistance item',
        ownerPersonId: 'p-youth-leader',
        status: 'DONE',
        dueDate: '2026-08-28',
      },
      {
        id: 'bd-aug-2',
        summary:
          'Catechist to track Protocol September soft gaps weekly until publish',
        ownerPersonId: 'p-catechist',
        status: 'OPEN',
        dueDate: '2026-09-20',
      },
      {
        id: 'bd-aug-3',
        summary: 'Church Leader to confirm Youth System Admin appointment',
        ownerPersonId: 'p-pastor',
        status: 'OPEN',
        dueDate: '2026-09-05',
      },
    ],
    notes: 'Quorum present. Next meeting at Church Leader’s call.',
  },
  {
    id: 'board-2026-09',
    title: 'September Board meeting',
    scheduledAt: '2026-09-25T17:00:00.000Z',
    calledByPersonId: 'p-pastor',
    status: 'SCHEDULED',
    agenda: [
      'Open follow-ups from August',
      'Ministry presidents’ pulse',
      'Deacon care load',
      'Itorero system admin coverage',
    ],
    agendaItems: [
      ...itemsFromStrings(
        [
          'Open follow-ups from August',
          'Ministry presidents’ pulse',
          'Deacon care load',
          'Itorero system admin coverage',
        ],
        'board-2026-09',
      ),
      {
        id: 'board-2026-09-frozen',
        text: 'Large facility repair quote — frozen for Board',
        state: 'FROZEN',
        raisedByPersonId: 'p-catechist',
        notes: 'Church Leader froze until September meeting',
      },
    ],
    attendeePersonIds: [
      'p-pastor',
      'p-assistant',
      'p-catechist',
      'p-youth-leader',
      'p-choir-pres',
      'p-deacon-coord',
      'p-worship-pres',
      'p-proto-pres',
    ],
    decisions: [],
  },
];
