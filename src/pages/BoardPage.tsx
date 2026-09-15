import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import type { BoardFollowUpUpdateKind } from '../domain/types';
import { TextField } from '../components/ui/Field';
import { StatusPill } from '../components/ui/StatusPill';
import {
  boardService,
  canCallBoardMeeting,
  canViewBoard,
} from '../services/boardService';
import { peopleService } from '../services';

function personName(id: string) {
  return (
    peopleService.getById(id)?.preferredName ??
    peopleService.getById(id)?.fullName ??
    id
  );
}

function updateKindLabel(kind: BoardFollowUpUpdateKind) {
  switch (kind) {
    case 'RESULT':
      return 'Result';
    case 'BLOCKER':
      return 'Blocker';
    default:
      return 'Progress';
  }
}

export function BoardPage() {
  const { account, positions, roles, can } = useAuth();
  const [tick, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  const allowed =
    !!account &&
    (can('BOARD', 'VIEW', 'sys-main') ||
      canViewBoard(account.personId, positions, roles));
  const canCall =
    !!account &&
    (can('BOARD', 'MANAGE', 'sys-main') || canCallBoardMeeting(roles));

  const meetings = useMemo(() => boardService.list(), [tick]);
  const followUps = useMemo(() => boardService.openFollowUps(), [tick]);

  const [title, setTitle] = useState('Board meeting');
  const [when, setWhen] = useState(
    new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 16),
  );
  const [agenda, setAgenda] = useState('');
  const [msg, setMsg] = useState('');

  if (!account) return null;
  if (!allowed) {
    return (
      <div className="panel">
        <h1>Board of Directors</h1>
        <p className="muted">
          Board meetings are for Itorero high leaders, ministry presidents (or
          vice), and deacon leadership. Ask the Church Leader if you should be
          listed.
        </p>
      </div>
    );
  }

  function onSchedule(e: FormEvent) {
    e.preventDefault();
    if (!account || !canCall) return;
    boardService.schedule({
      title,
      scheduledAt: new Date(when).toISOString(),
      calledByPersonId: account.personId,
      agenda: agenda.split('\n').map((l) => l.trim()).filter(Boolean),
      attendeePersonIds: [account.personId],
    });
    setMsg('Meeting scheduled.');
    setAgenda('');
    refresh();
  }

  return (
    <div className="stack">
      {followUps.length > 0 && (
        <div className="panel stack">
          <div>
            <h2 style={{ margin: 0 }}>Open follow-ups</h2>
            <p className="muted" style={{ margin: '0.35rem 0 0' }}>
              Open the report to review progress and results before marking
              done.
            </p>
          </div>
          <ul className="board-followups">
            {followUps.map(({ meeting, decision }) => {
              const updates = [...(decision.progressUpdates ?? [])].sort(
                (a, b) => b.at.localeCompare(a.at),
              );
              const latest = updates[0];
              const overdue =
                Boolean(decision.dueDate) &&
                decision.dueDate! < new Date().toISOString().slice(0, 10);
              const reportPath = `/board/follow-ups/${decision.id}`;
              return (
                <li key={decision.id} className="board-followup">
                  <div className="board-followup-main">
                    <div>
                      <strong>
                        <Link to={reportPath}>{decision.summary}</Link>
                      </strong>
                      <p className="muted" style={{ margin: '0.25rem 0 0' }}>
                        {meeting.title}
                        {decision.ownerPersonId
                          ? ` · ${personName(decision.ownerPersonId)}`
                          : ''}
                        {decision.dueDate
                          ? ` · due ${decision.dueDate}${overdue ? ' (overdue)' : ''}`
                          : ''}
                      </p>
                      {latest ? (
                        <p className="board-followup-latest">
                          <span className="badge">
                            {updateKindLabel(latest.kind)}
                          </span>{' '}
                          {latest.note.slice(0, 140)}
                          {latest.note.length > 140 ? '…' : ''}
                        </p>
                      ) : (
                        <p className="muted" style={{ margin: '0.35rem 0 0' }}>
                          No progress posted yet.
                        </p>
                      )}
                    </div>
                    <div className="row" style={{ flexShrink: 0 }}>
                      <Link className="btn secondary sm" to={reportPath}>
                        {latest?.kind === 'RESULT'
                          ? 'View report'
                          : 'View progress'}
                      </Link>
                      {decision.followUpTaskId && (
                        <Link
                          className="btn ghost sm"
                          to={`/tasks/${decision.followUpTaskId}`}
                        >
                          Open task
                        </Link>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {canCall && (
        <form className="panel stack" onSubmit={onSchedule}>
          <h2 style={{ margin: 0 }}>Call a meeting</h2>
          <p className="muted" style={{ margin: 0 }}>
            Only the Church Leader schedules Board meetings.
          </p>
          <TextField
            label="Title"
            name="title"
            id="boardTitle"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <TextField
            label="When"
            name="when"
            id="boardWhen"
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
          />
          <label className="field">
            <span className="label">Agenda (one item per line)</span>
            <textarea
              rows={4}
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
            />
          </label>
          {msg && <p className="muted">{msg}</p>}
          <button type="submit" className="btn">
            Schedule
          </button>
        </form>
      )}

      <div className="stack">
        <h2 style={{ margin: 0 }}>Meetings</h2>
        {meetings.map((m) => (
          <article key={m.id} className="panel stack">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0 }}>
                  <Link to={`/board/meetings/${m.id}`}>{m.title}</Link>
                </h3>
                <p className="muted" style={{ margin: '0.25rem 0 0' }}>
                  {new Date(m.scheduledAt).toLocaleString()} · called by{' '}
                  {personName(m.calledByPersonId)} ·{' '}
                  {boardService.agendaItems(m.id).length} agenda ·{' '}
                  {m.attendeePersonIds.length} attendees
                </p>
              </div>
              <StatusPill
                tone={
                  m.status === 'HELD'
                    ? 'success'
                    : m.status === 'CANCELLED'
                      ? 'danger'
                      : 'neutral'
                }
              >
                {m.status}
              </StatusPill>
            </div>
            <div className="row">
              <Link className="btn secondary sm" to={`/board/meetings/${m.id}`}>
                Open meeting
              </Link>
              {canCall && m.status === 'SCHEDULED' && (
                <>
                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={() => {
                      boardService.markHeld(m.id);
                      refresh();
                    }}
                  >
                    Mark held
                  </button>
                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={() => {
                      boardService.setStatus(m.id, 'CANCELLED');
                      refresh();
                    }}
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
            {m.decisions.some((d) => d.status === 'OPEN') && (
              <p className="muted" style={{ margin: 0 }}>
                Open follow-ups from this meeting live at the top of Board.
              </p>
            )}
          </article>
        ))}
      </div>

      <p className="muted">
        Open a meeting for agenda detail, attendees, and Freeze / Decide now.
        Follow-up reports live under each decision. Linked work may also live in{' '}
        <Link to="/tasks">Tasks</Link>.
      </p>
    </div>
  );
}
