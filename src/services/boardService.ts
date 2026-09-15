import { BOARD_MEETINGS } from '../data/boardSeed';
import { isChurchLeader } from '../domain/churchLeadership';
import type {
  BoardAgendaItem,
  BoardDecision,
  BoardMeeting,
  BoardMeetingStatus,
  Position,
  SystemRole,
} from '../domain/types';
import { ITORERO_OVERSIGHT_ROLES } from '../domain/oversightAccess';

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}`;
}

const BOARD_VIEW_ROLES: SystemRole[] = [
  ...ITORERO_OVERSIGHT_ROLES,
  'CHURCH_SECRETARY',
  'CHURCH_TREASURER',
  'DEACON_LEADER',
];

/** Who may see Board meetings (high leaders, secretary, treasurer, deacon leaders, ministry presidents). */
export function canViewBoard(
  personId: string,
  positions: Position[],
  roles: SystemRole[],
): boolean {
  if (roles.some((r) => BOARD_VIEW_ROLES.includes(r))) return true;
  return positions.some(
    (p) =>
      p.personId === personId &&
      p.status === 'ACTIVE' &&
      (p.ministryOffice === 'PRESIDENT' ||
        p.ministryOffice === 'VP' ||
        p.choirOffice === 'PRESIDENT' ||
        p.choirOffice === 'VP' ||
        p.worshipOffice === 'PRESIDENT' ||
        p.worshipOffice === 'VP' ||
        p.deaconOffice === 'COORDINATOR' ||
        p.protocolOffice === 'COORDINATOR'),
  );
}

/** Only Church Leader calls / schedules Board meetings. */
export function canCallBoardMeeting(roles: SystemRole[]): boolean {
  return roles.includes('CHURCH_LEADER');
}

function ensureAgendaItems(m: BoardMeeting): BoardAgendaItem[] {
  if (m.agendaItems && m.agendaItems.length > 0) return m.agendaItems;
  m.agendaItems = (m.agenda ?? []).map((text, i) => ({
    id: `${m.id}-legacy-${i}`,
    text,
    state: 'OPEN' as const,
  }));
  return m.agendaItems;
}

export const boardService = {
  list() {
    return [...BOARD_MEETINGS].sort((a, b) =>
      b.scheduledAt.localeCompare(a.scheduledAt),
    );
  },

  get(id: string) {
    return BOARD_MEETINGS.find((m) => m.id === id) ?? null;
  },

  openFollowUps() {
    return BOARD_MEETINGS.flatMap((m) =>
      m.decisions
        .filter((d) => d.status === 'OPEN')
        .map((d) => ({ meeting: m, decision: d })),
    );
  },

  agendaItems(meetingId: string): BoardAgendaItem[] {
    const m = BOARD_MEETINGS.find((x) => x.id === meetingId);
    if (!m) return [];
    return ensureAgendaItems(m);
  },

  schedule(input: {
    title: string;
    scheduledAt: string;
    calledByPersonId: string;
    agenda: string[];
    attendeePersonIds: string[];
  }): BoardMeeting {
    const lines = input.agenda.map((a) => a.trim()).filter(Boolean);
    const meeting: BoardMeeting = {
      id: newId('board'),
      title: input.title.trim(),
      scheduledAt: input.scheduledAt,
      calledByPersonId: input.calledByPersonId,
      status: 'SCHEDULED',
      agenda: lines,
      agendaItems: lines.map((text) => ({
        id: newId('bag'),
        text,
        state: 'OPEN',
      })),
      attendeePersonIds: input.attendeePersonIds,
      decisions: [],
    };
    BOARD_MEETINGS.unshift(meeting);
    return meeting;
  },

  raiseAgendaItem(input: {
    meetingId?: string;
    text: string;
    raisedByPersonId: string;
  }): {
    ok: boolean;
    reason?: string;
    item?: BoardAgendaItem;
    meetingId?: string;
  } {
    const meeting =
      (input.meetingId
        ? BOARD_MEETINGS.find((m) => m.id === input.meetingId)
        : null) ??
      BOARD_MEETINGS.find((m) => m.status === 'SCHEDULED') ??
      BOARD_MEETINGS[0];
    if (!meeting) return { ok: false, reason: 'No Board meeting to attach to' };
    const items = ensureAgendaItems(meeting);
    const item: BoardAgendaItem = {
      id: newId('bag'),
      text: input.text.trim(),
      state: 'OPEN',
      raisedByPersonId: input.raisedByPersonId,
    };
    items.push(item);
    meeting.agenda.push(item.text);
    return { ok: true, item, meetingId: meeting.id };
  },

  freezeAgendaItem(
    meetingId: string,
    itemId: string,
    actorPersonId: string,
    roles: SystemRole[],
  ): { ok: boolean; reason?: string } {
    if (!isChurchLeader(roles)) {
      return { ok: false, reason: 'Only Church Leader can freeze for Board' };
    }
    const m = BOARD_MEETINGS.find((x) => x.id === meetingId);
    if (!m) return { ok: false, reason: 'Meeting not found' };
    const item = ensureAgendaItems(m).find((a) => a.id === itemId);
    if (!item) return { ok: false, reason: 'Agenda item not found' };
    item.state = 'FROZEN';
    item.notes = `Frozen by Leader`;
    void actorPersonId;
    return { ok: true };
  },

  decideAgendaItem(
    meetingId: string,
    itemId: string,
    actorPersonId: string,
    roles: SystemRole[],
    summary?: string,
  ): { ok: boolean; reason?: string } {
    if (!isChurchLeader(roles)) {
      return { ok: false, reason: 'Only Church Leader can decide alone' };
    }
    const m = BOARD_MEETINGS.find((x) => x.id === meetingId);
    if (!m) return { ok: false, reason: 'Meeting not found' };
    const item = ensureAgendaItems(m).find((a) => a.id === itemId);
    if (!item) return { ok: false, reason: 'Agenda item not found' };
    const d = this.addDecision(meetingId, {
      summary: summary?.trim() || `Decided: ${item.text}`,
      ownerPersonId: actorPersonId,
      status: 'DONE',
    });
    item.state = 'DECIDED';
    item.decidedAt = new Date().toISOString();
    item.decidedByPersonId = actorPersonId;
    item.decisionId = d?.id;
    return { ok: true };
  },

  markHeld(id: string, notes?: string): BoardMeeting | null {
    const m = BOARD_MEETINGS.find((x) => x.id === id);
    if (!m || m.status === 'CANCELLED') return null;
    m.status = 'HELD';
    m.heldAt = new Date().toISOString();
    if (notes != null) m.notes = notes;
    return m;
  },

  setStatus(id: string, status: BoardMeetingStatus): BoardMeeting | null {
    const m = BOARD_MEETINGS.find((x) => x.id === id);
    if (!m) return null;
    m.status = status;
    return m;
  },

  addDecision(
    meetingId: string,
    input: Omit<BoardDecision, 'id' | 'status'> & {
      status?: BoardDecision['status'];
    },
  ): BoardDecision | null {
    const m = BOARD_MEETINGS.find((x) => x.id === meetingId);
    if (!m) return null;
    const d: BoardDecision = {
      id: newId('bd'),
      summary: input.summary.trim(),
      ownerPersonId: input.ownerPersonId,
      dueDate: input.dueDate,
      followUpTaskId: input.followUpTaskId,
      status: input.status ?? 'OPEN',
    };
    m.decisions.push(d);
    return d;
  },

  completeDecision(meetingId: string, decisionId: string): boolean {
    const m = BOARD_MEETINGS.find((x) => x.id === meetingId);
    const d = m?.decisions.find((x) => x.id === decisionId);
    if (!d) return false;
    d.status = 'DONE';
    return true;
  },
};
