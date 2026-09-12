import { type FormEvent, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { StatusPill } from '../components/ui/StatusPill';
import { peopleService, systemsService, missionService } from '../services';

export function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { can, account, refreshSession } = useAuth();
  const [, setTick] = useState(0);
  const refresh = () => {
    setTick((t) => t + 1);
    refreshSession();
  };
  const [msg, setMsg] = useState('');
  const [outcome, setOutcome] = useState('');
  const [helperAdd, setHelperAdd] = useState('');

  const task = id ? missionService.getTask(id) : null;

  if (!account || !can('TASK', 'VIEW')) {
    return (
      <div className="panel">
        <p className="muted">No access.</p>
        <Link to="/tasks">← Tasks</Link>
      </div>
    );
  }
  if (!task) {
    return (
      <div className="panel">
        <p>Task not found.</p>
        <Link to="/tasks">← Tasks</Link>
      </div>
    );
  }

  const canManage = can('TASK', 'MANAGE');
  const isInvolved =
    task.ownerPersonId === account.personId ||
    (task.helperPersonIds ?? []).includes(account.personId);
  const canOperate = canManage || isInvolved;
  const closed = task.status === 'DONE' || task.status === 'CANCELLED';
  const sys = task.systemId
    ? systemsService.getById(task.systemId)
    : undefined;
  const people = peopleService.list();

  function personName(pid: string) {
    const p = peopleService.getById(pid);
    return p?.preferredName ?? p?.fullName ?? pid;
  }

  function doStart() {
    const t = missionService.startTask(task!.id);
    setMsg(t ? 'Started' : 'Cannot start');
    refresh();
  }

  function doComplete(e: FormEvent) {
    e.preventDefault();
    const r = missionService.completeTask(task!.id, outcome || undefined);
    setMsg(
      r.ok
        ? r.task?.accessRevokedAt
          ? 'Done — temp system access revoked'
          : 'Done — recorded'
        : (r.reason ?? 'Failed'),
    );
    setOutcome('');
    refresh();
  }

  function doCancel() {
    const r = missionService.cancelTask(task!.id, outcome || undefined);
    setMsg(
      r.ok
        ? r.task?.accessRevokedAt
          ? 'Cancelled — temp system access revoked'
          : 'Cancelled — recorded'
        : (r.reason ?? 'Failed'),
    );
    setOutcome('');
    refresh();
  }

  function doAddHelper(e: FormEvent) {
    e.preventDefault();
    if (!helperAdd) return;
    missionService.addTaskHelper(task!.id, helperAdd);
    setMsg('Helper added');
    setHelperAdd('');
    refresh();
  }

  function doRemoveHelper(personId: string) {
    missionService.removeTaskHelper(task!.id, personId);
    setMsg('Helper removed');
    refresh();
  }

  return (
    <div className="stack">
      <p>
        <Link to="/tasks">← Tasks</Link>
      </p>
      {msg && <p className="badge">{msg}</p>}

      <div className="panel">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0 }}>{task.title}</h2>
            <p className="muted" style={{ margin: '0.35rem 0 0' }}>
              Primary: {personName(task.ownerPersonId)}
              {sys && ` · ${sys.shortName}`}
            </p>
          </div>
          <StatusPill status={task.status}>{task.status}</StatusPill>
        </div>
        {task.description && <p>{task.description}</p>}
        <div className="row">
          {task.contextType !== 'NONE' && (
            <span className="badge">
              {task.contextType}: {task.contextLabel ?? task.contextId}
            </span>
          )}
          <span className="badge">Due {task.dueDate ?? '—'}</span>
        </div>
        {task.createdByPersonId && (
          <p className="muted" style={{ marginBottom: 0 }}>
            Created by {personName(task.createdByPersonId)} · started{' '}
            {task.startDate}
            {task.endDate && ` · ended ${task.endDate}`}
          </p>
        )}
        {task.outcomeNote && (
          <p style={{ marginBottom: 0 }}>
            <strong>Outcome:</strong> {task.outcomeNote}
          </p>
        )}
      </div>

      {(task.grantsSystemAccess || task.accessRevokedAt) && (
        <div
          className={`grant-callout ${
            task.grantsSystemAccess ? 'active-grant' : 'revoked'
          }`}
        >
          {task.grantsSystemAccess ? (
            <>
              <strong>Temporary system ENTER is active</strong>
              <p style={{ margin: '0.35rem 0 0' }}>
                While this task is open, primary and helpers can ENTER{' '}
                <strong>{sys?.shortName ?? task.systemId}</strong> (like a short
                Assignment). Closing DONE or CANCELLED revokes that grant
                immediately (Option A — record only).
              </p>
              <p className="muted" style={{ margin: '0.5rem 0 0', fontSize: '0.85rem' }}>
                Verify in{' '}
                <Link to="/access">Access Engine</Link> · source TASK
              </p>
            </>
          ) : (
            <>
              <strong>Temporary system ENTER revoked</strong>
              <p style={{ margin: '0.35rem 0 0' }}>
                Access to {sys?.shortName ?? task.systemId} from this task ended
                {task.accessRevokedAt
                  ? ` on ${new Date(task.accessRevokedAt).toLocaleString()}`
                  : ''}
                . Closing recorded status and dates only — no guided next steps.
              </p>
              <p className="muted" style={{ margin: '0.5rem 0 0', fontSize: '0.85rem' }}>
                Confirm denials in <Link to="/access">Access Engine</Link>
              </p>
            </>
          )}
        </div>
      )}

      <div className="panel">
        <h3>Responsible</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Primary assignee plus optional helpers — both Responsible.
        </p>
        <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
          <li>
            <strong>{personName(task.ownerPersonId)}</strong> — primary
          </li>
          {(task.helperPersonIds ?? []).map((hid) => (
            <li key={hid}>
              {personName(hid)} — helper
              {canManage && !closed && (
                <button
                  type="button"
                  className="btn ghost"
                  style={{ marginLeft: '0.5rem' }}
                  onClick={() => doRemoveHelper(hid)}
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
        {canManage && !closed && (
          <form className="row" onSubmit={doAddHelper} style={{ marginTop: '0.75rem' }}>
            <select
              value={helperAdd}
              onChange={(e) => setHelperAdd(e.target.value)}
            >
              <option value="">Add helper…</option>
              {people
                .filter(
                  (p) =>
                    p.id !== task.ownerPersonId &&
                    !(task.helperPersonIds ?? []).includes(p.id),
                )
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.preferredName ?? p.fullName}
                  </option>
                ))}
            </select>
            <button type="submit" className="btn" disabled={!helperAdd}>
              Add
            </button>
          </form>
        )}
      </div>

      {canOperate && !closed && (
        <div className="panel">
          <h3>Operate</h3>
          {task.status === 'TODO' && (
            <button type="button" className="btn" onClick={doStart}>
              Start (→ IN_PROGRESS)
            </button>
          )}
          <p className="muted">
            Option A — close records status and dates only. Any temp system
            access is revoked immediately.
          </p>
          <form className="stack" onSubmit={doComplete}>
            <div className="field">
              <label>Outcome note (optional)</label>
              <input
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                placeholder="What was done / why cancelled"
              />
            </div>
            <div className="row">
              <button type="submit" className="btn">
                Mark DONE
              </button>
              <button
                type="button"
                className="btn ghost"
                onClick={doCancel}
              >
                Cancel task
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
