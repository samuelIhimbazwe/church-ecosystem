import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { roleLabel } from '../domain/access';
import type { BoardAgendaItemState } from '../domain/types';
import { StatusPill } from '../components/ui/StatusPill';
import {
  boardService,
  canCallBoardMeeting,
  canViewBoard,
} from '../services/boardService';
import { participationService, peopleService } from '../services';

function personName(id: string) {
  return (
    peopleService.getById(id)?.preferredName ??
    peopleService.getById(id)?.fullName ??
    id
  );
}

function personRolesLine(personId: string) {
  const roles = participationService.rolesFor(personId);
  const positions = participationService.activePositions(personId);
  const bits = [
    ...roles.map(roleLabel),
    ...positions.map((p) => p.title).filter(Boolean),
  ];
  return [...new Set(bits)].slice(0, 3).join(' · ') || 'Board guest';
}

function stateTone(
  state: BoardAgendaItemState,
): 'success' | 'warn' | 'danger' | 'info' | 'neutral' {
  switch (state) {
    case 'DECIDED':
      return 'success';
    case 'FROZEN':
      return 'info';
    case 'DEFERRED':
      return 'warn';
    default:
      return 'neutral';
  }
}

function stateMeaning(state: BoardAgendaItemState) {
  switch (state) {
    case 'FROZEN':
      return 'Held for the Board meeting — do not act alone until the Board discusses it.';
    case 'DECIDED':
      return 'Closed — Church Leader already decided (or Board accepted).';
    case 'DEFERRED':
      return 'Parked for a later meeting.';
    default:
      return 'Still open — Leader may freeze for Board or decide alone between meetings.';
  }
}

type ActionMode = null | { kind: 'freeze' | 'decide'; itemId: string };

/**
 * Full Board meeting — agenda detail, attendees, Freeze / Decide now with clear meaning.
 */
export function BoardMeetingPage() {
  const { meetingId = '' } = useParams();
  const { account, positions, roles, can } = useAuth();
  const [tick, setTick] = useState(0);
  const [msg, setMsg] = useState('');
  const [action, setAction] = useState<ActionMode>(null);
  const [decideSummary, setDecideSummary] = useState('');
  const [freezeNote, setFreezeNote] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const refresh = () => setTick((t) => t + 1);

  const allowed =
    !!account &&
    (can('BOARD', 'VIEW', 'sys-main') ||
      canViewBoard(account.personId, positions, roles));
  const canLead =
    !!account &&
    (can('BOARD', 'MANAGE', 'sys-main') || canCallBoardMeeting(roles));

  const meeting = useMemo(
    () => (meetingId ? boardService.get(meetingId) : null),
    [meetingId, tick],
  );

  if (!account) return null;

  if (!allowed) {
    return (
      <div className="panel">
        <p className="page-breadcrumb">
          <Link to="/board">Board</Link>
        </p>
        <h1>Meeting</h1>
        <p className="muted">You do not have access to Board meetings.</p>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="panel">
        <p className="page-breadcrumb">
          <Link to="/board">Board</Link>
        </p>
        <h1>Meeting not found</h1>
        <Link to="/board">Back to Board</Link>
      </div>
    );
  }

  const agenda = boardService.agendaItems(meeting.id);
  const activeActionItem = action
    ? agenda.find((a) => a.id === action.itemId)
    : null;

  return (
    <div className="stack">
      <p className="page-breadcrumb">
        <Link to="/board">Board</Link>
        <span aria-hidden="true"> · </span>
        Meeting
      </p>

      <div className="detail-hero">
        <p className="hero-kicker">Board of Directors</p>
        <h2>{meeting.title}</h2>
        <p className="muted" style={{ margin: '0.5rem 0 0' }}>
          {new Date(meeting.scheduledAt).toLocaleString()} · called by{' '}
          {personName(meeting.calledByPersonId)}
        </p>
        <div className="overview-strip">
          <div className="overview-tile">
            <div className="label">Status</div>
            <div className="value" style={{ fontSize: '1.1rem' }}>
              {meeting.status}
            </div>
          </div>
          <div className="overview-tile">
            <div className="label">Agenda</div>
            <div className="value">{agenda.length}</div>
          </div>
          <div className="overview-tile">
            <div className="label">Attendees</div>
            <div className="value">{meeting.attendeePersonIds.length}</div>
          </div>
        </div>
      </div>

      <div className="panel stack">
        <div>
          <h3 style={{ margin: 0 }}>What Freeze and Decide now mean</h3>
          <ul className="board-action-legend">
            <li>
              <strong>Freeze for Board</strong> — parks the item until this
              meeting. No one (including the Leader) should execute it alone;
              the full Board must discuss it.
            </li>
            <li>
              <strong>Decide now</strong> — Church Leader decides between
              meetings without waiting for the Board. Records a decision and
              closes the agenda item.
            </li>
          </ul>
        </div>
      </div>

      <div className="panel stack">
        <h3 style={{ margin: 0 }}>Agenda</h3>
        <p className="muted" style={{ margin: 0 }}>
          Open an item for context, who raised it, and Leader actions.
        </p>
        <ul className="board-agenda-list">
          {agenda.map((a) => {
            const open = expandedId === a.id;
            return (
              <li key={a.id} className="board-agenda-item">
                <div className="board-agenda-item-head">
                  <div>
                    <strong>{a.text}</strong>
                    <div className="row" style={{ marginTop: '0.35rem', gap: '0.4rem' }}>
                      <StatusPill tone={stateTone(a.state)}>
                        {a.state}
                      </StatusPill>
                      <span className="muted" style={{ fontSize: '0.85rem' }}>
                        {stateMeaning(a.state)}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn secondary sm"
                    onClick={() => setExpandedId(open ? null : a.id)}
                  >
                    {open ? 'Hide details' : 'View details'}
                  </button>
                </div>

                {open && (
                  <div className="board-agenda-item-body stack">
                    {a.detail && <p style={{ margin: 0 }}>{a.detail}</p>}
                    <p className="muted" style={{ margin: 0 }}>
                      Raised by:{' '}
                      {a.raisedByPersonId
                        ? personName(a.raisedByPersonId)
                        : '—'}
                      {a.notes ? ` · ${a.notes}` : ''}
                      {a.decidedAt
                        ? ` · Decided ${new Date(a.decidedAt).toLocaleString()}`
                        : ''}
                      {a.decisionId ? (
                        <>
                          {' '}
                          ·{' '}
                          <Link to={`/board/follow-ups/${a.decisionId}`}>
                            Open decision / follow-up
                          </Link>
                        </>
                      ) : null}
                    </p>

                    {canLead &&
                      meeting.status === 'SCHEDULED' &&
                      (a.state === 'OPEN' || a.state === 'FROZEN') && (
                        <div className="row">
                          {a.state === 'OPEN' && (
                            <button
                              type="button"
                              className="btn secondary sm"
                              onClick={() => {
                                setAction({ kind: 'freeze', itemId: a.id });
                                setFreezeNote('');
                                setMsg('');
                              }}
                            >
                              Freeze for Board…
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn sm"
                            onClick={() => {
                              setAction({ kind: 'decide', itemId: a.id });
                              setDecideSummary('');
                              setMsg('');
                            }}
                          >
                            Decide now…
                          </button>
                        </div>
                      )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {action && activeActionItem && (
        <div className="panel stack board-action-confirm">
          {action.kind === 'freeze' ? (
            <>
              <h3 style={{ margin: 0 }}>Freeze for Board</h3>
              <p style={{ margin: 0 }}>
                <strong>{activeActionItem.text}</strong>
              </p>
              <p className="muted" style={{ margin: 0 }}>
                This keeps the item on the agenda until the Board meets. Staff
                must wait — no between-meeting action. Use this for large or
                sensitive matters (quotes, appointments, policy).
              </p>
              <label className="field">
                <span className="label">Note (optional)</span>
                <textarea
                  rows={2}
                  value={freezeNote}
                  onChange={(e) => setFreezeNote(e.target.value)}
                  placeholder="Why this must wait for the Board…"
                />
              </label>
              <div className="row">
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    const r = boardService.freezeAgendaItem(
                      meeting.id,
                      activeActionItem.id,
                      account.personId,
                      roles,
                      freezeNote || undefined,
                    );
                    setMsg(r.ok ? 'Frozen for Board' : r.reason ?? '');
                    if (r.ok) {
                      setAction(null);
                      refresh();
                    }
                  }}
                >
                  Confirm freeze
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setAction(null)}
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <h3 style={{ margin: 0 }}>Decide now (Leader alone)</h3>
              <p style={{ margin: 0 }}>
                <strong>{activeActionItem.text}</strong>
              </p>
              <p className="muted" style={{ margin: 0 }}>
                You are deciding this without waiting for the Board. A decision
                record is created and the agenda item closes as DECIDED.
              </p>
              <label className="field">
                <span className="label">Your decision</span>
                <textarea
                  rows={3}
                  value={decideSummary}
                  onChange={(e) => setDecideSummary(e.target.value)}
                  placeholder="What did you decide? Who owns any follow-up?"
                  required
                />
              </label>
              <div className="row">
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    if (!decideSummary.trim()) {
                      setMsg('Write the decision before confirming');
                      return;
                    }
                    const r = boardService.decideAgendaItem(
                      meeting.id,
                      activeActionItem.id,
                      account.personId,
                      roles,
                      decideSummary.trim(),
                    );
                    setMsg(r.ok ? 'Decision recorded' : r.reason ?? '');
                    if (r.ok) {
                      setAction(null);
                      setExpandedId(activeActionItem.id);
                      refresh();
                    }
                  }}
                >
                  Confirm decision
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setAction(null)}
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <div className="panel stack">
        <h3 style={{ margin: 0 }}>Attendees</h3>
        <p className="muted" style={{ margin: 0 }}>
          Expected Board circle — high leaders, ministry presidents/vice,
          deacon leadership.
        </p>
        <ul className="board-attendee-list">
          {meeting.attendeePersonIds.map((id) => {
            const p = peopleService.getById(id);
            return (
              <li key={id}>
                <Link to={`/people/${id}`}>
                  {p?.preferredName || p?.fullName || id}
                </Link>
                <span className="muted">{personRolesLine(id)}</span>
              </li>
            );
          })}
        </ul>
      </div>

      {meeting.decisions.length > 0 && (
        <div className="panel stack">
          <h3 style={{ margin: 0 }}>Decisions from this meeting</h3>
          <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
            {meeting.decisions.map((d) => (
              <li key={d.id}>
                <Link to={`/board/follow-ups/${d.id}`}>{d.summary}</Link>{' '}
                <StatusPill tone={d.status === 'DONE' ? 'success' : 'warn'}>
                  {d.status}
                </StatusPill>
              </li>
            ))}
          </ul>
        </div>
      )}

      {meeting.notes && (
        <div className="panel">
          <span className="label">Meeting notes</span>
          <p style={{ margin: '0.35rem 0 0' }}>{meeting.notes}</p>
        </div>
      )}

      {msg && <p className="badge">{msg}</p>}

      {canLead && meeting.status === 'SCHEDULED' && (
        <div className="row">
          <button
            type="button"
            className="btn"
            onClick={() => {
              boardService.markHeld(meeting.id);
              setMsg('Marked held');
              refresh();
            }}
          >
            Mark held
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              boardService.setStatus(meeting.id, 'CANCELLED');
              setMsg('Meeting cancelled');
              refresh();
            }}
          >
            Cancel meeting
          </button>
        </div>
      )}

      <Link className="btn ghost" to="/board">
        ← Back to Board
      </Link>
    </div>
  );
}
