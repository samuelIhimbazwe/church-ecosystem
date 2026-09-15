import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { isChurchLeader } from '../domain/churchLeadership';
import type { BoardFollowUpUpdateKind } from '../domain/types';
import { StatusPill } from '../components/ui/StatusPill';
import {
  boardService,
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

/**
 * Full progress / result report for one Board follow-up.
 * Church Leader reviews here before Mark done.
 */
export function BoardFollowUpPage() {
  const { decisionId = '' } = useParams();
  const navigate = useNavigate();
  const { account, positions, roles, can } = useAuth();
  const [tick, setTick] = useState(0);
  const [msg, setMsg] = useState('');
  const [progressNote, setProgressNote] = useState('');
  const [closeNote, setCloseNote] = useState('');
  const [closing, setClosing] = useState(false);

  const refresh = () => setTick((t) => t + 1);

  const allowed =
    !!account &&
    (can('BOARD', 'VIEW', 'sys-main') ||
      canViewBoard(account.personId, positions, roles));
  const leader = isChurchLeader(roles);

  const row = useMemo(
    () => (decisionId ? boardService.getFollowUp(decisionId) : null),
    [decisionId, tick],
  );

  if (!account) return null;

  if (!allowed) {
    return (
      <div className="panel">
        <p className="page-breadcrumb">
          <Link to="/board">Board</Link>
        </p>
        <h1>Follow-up report</h1>
        <p className="muted">You do not have access to Board follow-ups.</p>
      </div>
    );
  }

  if (!row) {
    return (
      <div className="panel">
        <p className="page-breadcrumb">
          <Link to="/board">Board</Link>
        </p>
        <h1>Follow-up not found</h1>
        <p className="muted">
          This follow-up may have been removed.{' '}
          <Link to="/board">Back to Board</Link>
        </p>
      </div>
    );
  }

  const { meeting, decision } = row;
  const updates = [...(decision.progressUpdates ?? [])].sort((a, b) =>
    b.at.localeCompare(a.at),
  );
  const overdue =
    Boolean(decision.dueDate) &&
    decision.dueDate! < new Date().toISOString().slice(0, 10);
  const canReport =
    leader || decision.ownerPersonId === account.personId;
  const canClose =
    decision.status === 'OPEN' &&
    (leader || decision.ownerPersonId === account.personId);
  const latestResult = updates.find((u) => u.kind === 'RESULT');

  return (
    <div className="stack">
      <p className="page-breadcrumb">
        <Link to="/board">Board</Link>
        <span aria-hidden="true"> · </span>
        Follow-up report
      </p>

      <div className="detail-hero">
        <p className="hero-kicker">Board follow-up</p>
        <h2>{decision.summary}</h2>
        <p className="muted" style={{ margin: '0.5rem 0 0' }}>
          {meeting.title}
          {decision.ownerPersonId
            ? ` · Owner: ${personName(decision.ownerPersonId)}`
            : ''}
          {decision.dueDate
            ? ` · Due ${decision.dueDate}${overdue ? ' (overdue)' : ''}`
            : ''}
        </p>
        <div className="overview-strip">
          <div className="overview-tile">
            <div className="label">Status</div>
            <div className="value" style={{ fontSize: '1.1rem' }}>
              {decision.status}
            </div>
          </div>
          <div className="overview-tile">
            <div className="label">Updates</div>
            <div className="value">{updates.length}</div>
          </div>
          <div className="overview-tile">
            <div className="label">Latest</div>
            <div className="value" style={{ fontSize: '1rem' }}>
              {updates[0]
                ? updateKindLabel(updates[0].kind)
                : '—'}
            </div>
          </div>
        </div>
      </div>

      {latestResult && decision.status === 'OPEN' && (
        <div className="panel steward-banner ok">
          <strong>Latest result for Leader review</strong>
          <p style={{ margin: '0.35rem 0 0' }}>{latestResult.note}</p>
          <p className="muted" style={{ margin: '0.35rem 0 0' }}>
            {personName(latestResult.byPersonId)} ·{' '}
            {new Date(latestResult.at).toLocaleString()}
          </p>
        </div>
      )}

      {decision.resultSummary && decision.status === 'DONE' && (
        <div className="panel steward-banner ok">
          <strong>Closed result</strong>
          <p style={{ margin: '0.35rem 0 0' }}>{decision.resultSummary}</p>
          {decision.completedAt && (
            <p className="muted" style={{ margin: '0.35rem 0 0' }}>
              Done{' '}
              {decision.completedByPersonId
                ? `by ${personName(decision.completedByPersonId)} · `
                : ''}
              {new Date(decision.completedAt).toLocaleString()}
            </p>
          )}
        </div>
      )}

      <div className="panel stack">
        <h3 style={{ margin: 0 }}>Progress & results</h3>
        <p className="muted" style={{ margin: 0 }}>
          Full trail — review this report before marking the follow-up done.
        </p>
        {updates.length === 0 ? (
          <p className="muted">No progress posted yet.</p>
        ) : (
          <ol className="board-progress-list">
            {updates.map((u) => (
              <li key={u.id}>
                <div className="row" style={{ gap: '0.4rem' }}>
                  <StatusPill
                    tone={
                      u.kind === 'RESULT'
                        ? 'success'
                        : u.kind === 'BLOCKER'
                          ? 'danger'
                          : 'neutral'
                    }
                  >
                    {updateKindLabel(u.kind)}
                  </StatusPill>
                  <span className="muted">
                    {new Date(u.at).toLocaleString()} ·{' '}
                    {personName(u.byPersonId)}
                  </span>
                </div>
                <p style={{ margin: '0.35rem 0 0' }}>{u.note}</p>
              </li>
            ))}
          </ol>
        )}
      </div>

      {canReport && decision.status === 'OPEN' && (
        <div className="panel stack">
          <h3 style={{ margin: 0 }}>Post an update</h3>
          <label className="field">
            <span className="label">Note</span>
            <textarea
              rows={3}
              value={progressNote}
              onChange={(e) => setProgressNote(e.target.value)}
              placeholder="What moved? Interim result? Blocker?"
            />
          </label>
          <div className="row">
            <button
              type="button"
              className="btn"
              onClick={() => {
                const r = boardService.addFollowUpUpdate(
                  meeting.id,
                  decision.id,
                  {
                    byPersonId: account.personId,
                    note: progressNote,
                    kind: 'PROGRESS',
                  },
                );
                setMsg(r.ok ? 'Progress saved' : r.reason ?? '');
                if (r.ok) {
                  setProgressNote('');
                  refresh();
                }
              }}
            >
              Post progress
            </button>
            <button
              type="button"
              className="btn secondary"
              onClick={() => {
                const r = boardService.addFollowUpUpdate(
                  meeting.id,
                  decision.id,
                  {
                    byPersonId: account.personId,
                    note: progressNote,
                    kind: 'RESULT',
                  },
                );
                setMsg(r.ok ? 'Result posted for review' : r.reason ?? '');
                if (r.ok) {
                  setProgressNote('');
                  refresh();
                }
              }}
            >
              Post as result
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                const r = boardService.addFollowUpUpdate(
                  meeting.id,
                  decision.id,
                  {
                    byPersonId: account.personId,
                    note: progressNote,
                    kind: 'BLOCKER',
                  },
                );
                setMsg(r.ok ? 'Blocker recorded' : r.reason ?? '');
                if (r.ok) {
                  setProgressNote('');
                  refresh();
                }
              }}
            >
              Post blocker
            </button>
          </div>
        </div>
      )}

      {canClose && (
        <div className="panel stack board-followup-close">
          <h3 style={{ margin: 0 }}>Close follow-up</h3>
          <p className="muted" style={{ margin: 0 }}>
            Church Leader should review the report above, then confirm done.
          </p>
          {!closing ? (
            <button
              type="button"
              className="btn"
              onClick={() => setClosing(true)}
            >
              Mark done…
            </button>
          ) : (
            <>
              <label className="field">
                <span className="label">
                  Result acknowledged (required if no progress yet)
                </span>
                <textarea
                  rows={3}
                  value={closeNote}
                  onChange={(e) => setCloseNote(e.target.value)}
                  placeholder="What was delivered / decided?"
                />
              </label>
              <div className="row">
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    const r = boardService.completeDecision(
                      meeting.id,
                      decision.id,
                      {
                        actorPersonId: account.personId,
                        resultSummary: closeNote || undefined,
                      },
                    );
                    setMsg(r.ok ? 'Follow-up marked done' : r.reason ?? '');
                    if (r.ok) {
                      refresh();
                      setClosing(false);
                    }
                  }}
                >
                  Confirm done
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setClosing(false)}
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {msg && <p className="badge">{msg}</p>}

      <div className="row">
        <Link className="btn ghost" to="/board">
          ← Back to Board
        </Link>
        {decision.followUpTaskId && (
          <Link className="btn ghost" to={`/tasks/${decision.followUpTaskId}`}>
            Open linked task
          </Link>
        )}
        {decision.status === 'DONE' && (
          <button
            type="button"
            className="btn ghost"
            onClick={() => navigate('/board')}
          >
            Done — return to Board
          </button>
        )}
      </div>
    </div>
  );
}
