import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { TextField } from '../components/ui/Field';
import { StatusPill } from '../components/ui/StatusPill';
import {
  boardService,
  canCallBoardMeeting,
  canViewBoard,
} from '../services/boardService';
import { peopleService } from '../services';

function personName(id: string) {
  return peopleService.getById(id)?.preferredName ??
    peopleService.getById(id)?.fullName ??
    id;
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
          <h2 style={{ margin: 0 }}>Open follow-ups</h2>
          <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
            {followUps.map(({ meeting, decision }) => (
              <li key={decision.id}>
                <strong>{decision.summary}</strong>
                <span className="muted">
                  {' '}
                  · {meeting.title}
                  {decision.ownerPersonId
                    ? ` · ${personName(decision.ownerPersonId)}`
                    : ''}
                  {decision.dueDate ? ` · due ${decision.dueDate}` : ''}
                </span>{' '}
                <button
                  type="button"
                  className="btn ghost"
                  style={{ padding: '0.15rem 0.4rem', fontSize: '0.8rem' }}
                  onClick={() => {
                    boardService.completeDecision(meeting.id, decision.id);
                    refresh();
                  }}
                >
                  Mark done
                </button>
              </li>
            ))}
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
        {meetings.map((m) => (
          <article key={m.id} className="panel stack">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ margin: 0 }}>{m.title}</h2>
                <p className="muted" style={{ margin: '0.25rem 0 0' }}>
                  {new Date(m.scheduledAt).toLocaleString()} · called by{' '}
                  {personName(m.calledByPersonId)}
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
            {boardService.agendaItems(m.id).length > 0 && (
              <div>
                <span className="label">Agenda</span>
                <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.1rem' }}>
                  {boardService.agendaItems(m.id).map((a) => (
                    <li key={a.id}>
                      {a.text}{' '}
                      <span className="muted">· {a.state}</span>
                      {canCall &&
                        (a.state === 'OPEN' || a.state === 'FROZEN') && (
                          <span className="row" style={{ display: 'inline-flex', gap: '0.25rem', marginLeft: '0.35rem' }}>
                            {a.state === 'OPEN' ? (
                              <button
                                type="button"
                                className="btn ghost"
                                style={{ padding: '0.1rem 0.35rem', fontSize: '0.75rem' }}
                                onClick={() => {
                                  const r = boardService.freezeAgendaItem(
                                    m.id,
                                    a.id,
                                    account.personId,
                                    roles,
                                  );
                                  setMsg(r.ok ? 'Frozen for Board' : r.reason ?? '');
                                  refresh();
                                }}
                              >
                                Freeze
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className="btn ghost"
                              style={{ padding: '0.1rem 0.35rem', fontSize: '0.75rem' }}
                              onClick={() => {
                                const r = boardService.decideAgendaItem(
                                  m.id,
                                  a.id,
                                  account.personId,
                                  roles,
                                );
                                setMsg(r.ok ? 'Decided' : r.reason ?? '');
                                refresh();
                              }}
                            >
                              Decide now
                            </button>
                          </span>
                        )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <span className="label">Attendees</span>
              <p style={{ margin: '0.25rem 0 0' }}>
                {m.attendeePersonIds.map(personName).join(' · ')}
              </p>
            </div>
            {m.decisions.length > 0 && (
              <div>
                <span className="label">Decisions</span>
                <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.1rem' }}>
                  {m.decisions.map((d) => (
                    <li key={d.id}>
                      {d.summary}{' '}
                      <StatusPill
                        tone={d.status === 'DONE' ? 'success' : 'warn'}
                      >
                        {d.status}
                      </StatusPill>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {m.notes && <p className="muted">{m.notes}</p>}
            {canCall && m.status === 'SCHEDULED' && (
              <div className="row">
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    boardService.markHeld(m.id);
                    refresh();
                  }}
                >
                  Mark held
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => {
                    boardService.setStatus(m.id, 'CANCELLED');
                    refresh();
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </article>
        ))}
      </div>

      <p className="muted">
        Between meetings: implementation lives in{' '}
        <Link to="/tasks">Tasks</Link> and ministry follow-ups — not a parallel
        hierarchy.
      </p>
    </div>
  );
}
