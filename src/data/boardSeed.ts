import type { BoardMeeting } from '../domain/types';

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
    agendaItems: [
      {
        id: 'board-2026-08-a1',
        text: 'Youth outreach assistance report',
        state: 'DECIDED',
        decisionId: 'bd-aug-1',
        raisedByPersonId: 'p-youth-leader',
        detail:
          'Church assistance for outdoor PA — Youth president reported spend, results, and impact for Board acceptance.',
        decidedAt: '2026-08-28T17:20:00.000Z',
        decidedByPersonId: 'p-pastor',
        notes: 'Accepted in meeting; follow-up closed.',
      },
      {
        id: 'board-2026-08-a2',
        text: 'Choir vestment support follow-up',
        state: 'DECIDED',
        raisedByPersonId: 'p-choir-pres',
        detail:
          'Partial church support for vestment refresh — confirm delivery logged on choir asset register.',
        notes: 'Noted as complete; no open decision row.',
      },
      {
        id: 'board-2026-08-a3',
        text: 'Protocol September coverage',
        state: 'OPEN',
        raisedByPersonId: 'p-proto-pres',
        detail:
          'Soft gaps on mid-September Sundays. Board asked Catechist to track weekly until publish (see follow-up).',
      },
      {
        id: 'board-2026-08-a4',
        text: 'Appoint System Admin for Youth System',
        state: 'OPEN',
        raisedByPersonId: 'p-youth-leader',
        detail:
          'Youth nominated a System Admin for config-only tools. Church Leader must confirm the appointment.',
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
        progressUpdates: [
          {
            id: 'bd-aug-2-u1',
            at: '2026-09-02T09:00:00.000Z',
            byPersonId: 'p-catechist',
            kind: 'PROGRESS',
            note:
              'Week 1: reviewed Protocol soft gaps with coordinator — 4 slots still open for mid-September Sundays.',
          },
          {
            id: 'bd-aug-2-u2',
            at: '2026-09-09T10:30:00.000Z',
            byPersonId: 'p-catechist',
            kind: 'PROGRESS',
            note:
              'Week 2: 2 of 4 soft gaps filled. Publish draft circulated to Protocol leadership for comment.',
          },
          {
            id: 'bd-aug-2-u3',
            at: '2026-09-14T16:00:00.000Z',
            byPersonId: 'p-catechist',
            kind: 'RESULT',
            note:
              'Interim result: soft-gap list down to 1 evening slot. Ready for Leader review before final publish.',
          },
        ],
      },
      {
        id: 'bd-aug-3',
        summary: 'Church Leader to confirm Youth System Admin appointment',
        ownerPersonId: 'p-pastor',
        status: 'OPEN',
        dueDate: '2026-09-05',
        progressUpdates: [
          {
            id: 'bd-aug-3-u1',
            at: '2026-09-01T11:00:00.000Z',
            byPersonId: 'p-youth-leader',
            kind: 'PROGRESS',
            note:
              'Youth president nominated candidate; waiting Church Leader confirmation.',
          },
        ],
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
      {
        id: 'board-2026-09-a1',
        text: 'Open follow-ups from August',
        state: 'OPEN',
        raisedByPersonId: 'p-pastor',
        detail:
          'Review August open decisions: Protocol soft gaps (Catechist) and Youth System Admin confirmation (Leader). Close only after progress reports are reviewed.',
      },
      {
        id: 'board-2026-09-a2',
        text: 'Ministry presidents’ pulse',
        state: 'OPEN',
        raisedByPersonId: 'p-catechist',
        detail:
          'Each ministry president (or vice) briefly reports risks, people needs, and calendar conflicts for the next month.',
      },
      {
        id: 'board-2026-09-a3',
        text: 'Deacon care load',
        state: 'OPEN',
        raisedByPersonId: 'p-deacon-coord',
        detail:
          'Summary of open care cases escalated to Church Leader and pending benevolence spend awaiting Leader approval — no private case notes in Board.',
      },
      {
        id: 'board-2026-09-a4',
        text: 'Itorero system admin coverage',
        state: 'OPEN',
        raisedByPersonId: 'p-assistant',
        detail:
          'Which peer systems still lack an appointed System Admin for config-only tools; Leader confirms appointments.',
      },
      {
        id: 'board-2026-09-frozen',
        text: 'Large facility repair quote',
        state: 'FROZEN',
        raisedByPersonId: 'p-catechist',
        detail:
          'Quote exceeds ordinary between-meeting spend. Leader froze it so the full Board must discuss before any yes.',
        notes: 'Frozen by Church Leader until this September meeting.',
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
