import { type FormEvent, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { StatusPill } from '../components/ui/StatusPill';
import { missionListPath } from '../navigation/missionPaths';
import { peopleService, systemsService, missionService } from '../services';
import {
  writeCompleteTask,
  writeStartTask,
} from '../services/missionWrite';

export function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const listPath = missionListPath(location.pathname, 'tasks');
  const { can, account, refreshSession } = useAuth();
  const [, setTick] = useState(0);
  const refresh = () => {
    setTick((t) => t + 1);
    refreshSession();
  };
  const [msg, setMsg] = useState('');
  const [outcome, setOutcome] = useState('');
  const [helperAdd, setHelperAdd] = useState('');
  const [watcherAdd, setWatcherAdd] = useState('');
  const [accountableId, setAccountableId] = useState('');
  const [depAdd, setDepAdd] = useState('');

  const task = id ? missionService.getTask(id) : null;

  if (!account || !can('TASK', 'VIEW')) {
    return (
      <div className="panel">
        <p className="muted">No access.</p>
        <Link to={listPath}>← Tasks</Link>
      </div>
    );
  }
  if (!task) {
    return (
      <div className="panel">
        <p>Task not found.</p>
        <Link to={listPath}>← Tasks</Link>
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
  const openDeps = missionService.openDependencyTitles(task.id);
  const softCritical = openDeps.length > 0;
  const peerTasks = missionService
    .listTasks({})
    .filter(
      (t) =>
        t.id !== task.id &&
        t.status !== 'CANCELLED' &&
        (task.contextType === 'NONE' ||
          (t.contextType === task.contextType &&
            t.contextId === task.contextId)),
    );

  function personName(pid: string) {
    const p = peopleService.getById(pid);
    return p?.preferredName ?? p?.fullName ?? pid;
  }

  async function doStart() {
    const t = await writeStartTask(task!.id);
    setMsg(
      t
        ? softCritical
          ? `Started — still waiting on: ${openDeps.join(', ')}`
          : 'Started'
        : 'Cannot start',
    );
    refresh();
  }

  async function doComplete(e: FormEvent) {
    e.preventDefault();
    const r = await writeCompleteTask(task!.id, outcome || undefined);
    setMsg(
      r.ok
        ? // API path may not return accessRevokedAt on mapped task
          'Done — recorded'
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

  function doSaveAccountable(e: FormEvent) {
    e.preventDefault();
    missionService.updateTask(task!.id, {
      accountablePersonId: accountableId || undefined,
    });
    setMsg(accountableId ? 'Accountable set' : 'Accountable cleared');
    refresh();
  }

  function doAddWatcher(e: FormEvent) {
    e.preventDefault();
    if (!watcherAdd) return;
    const next = [...new Set([...(task!.watcherPersonIds ?? []), watcherAdd])];
    missionService.updateTask(task!.id, { watcherPersonIds: next });
    setMsg('Watcher added');
    setWatcherAdd('');
    refresh();
  }

  function doRemoveWatcher(personId: string) {
    missionService.updateTask(task!.id, {
      watcherPersonIds: (task!.watcherPersonIds ?? []).filter(
        (id) => id !== personId,
      ),
    });
    setMsg('Watcher removed');
    refresh();
  }

  function doAddDep(e: FormEvent) {
    e.preventDefault();
    if (!depAdd) return;
    const next = [...new Set([...(task!.dependsOn ?? []), depAdd])];
    missionService.updateTask(task!.id, { dependsOn: next });
    setMsg('Dependency added');
    setDepAdd('');
    refresh();
  }

  function doRemoveDep(depId: string) {
    missionService.updateTask(task!.id, {
      dependsOn: (task!.dependsOn ?? []).filter((id) => id !== depId),
    });
    setMsg('Dependency removed');
    refresh();
  }

  return (
    <div className="stack">
      <p>
        <Link to={listPath}>← Tasks</Link>
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
          {softCritical && (
            <span className="badge" style={{ borderColor: 'var(--warn, #b45309)' }}>
              Soft critical
            </span>
          )}
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

      {softCritical && !closed && (
        <div className="steward-banner warn">
          Waiting on open dependencies: {openDeps.join('; ')}. You can still
          start — this is a soft highlight, not a hard block.
        </div>
      )}

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
        <h3>Responsible (R)</h3>
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

      <div className="panel">
        <h3>Accountable (A) & informed</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          One accountable person; watchers are informed (C/I lite).
        </p>
        <p style={{ marginTop: 0 }}>
          <strong>A:</strong>{' '}
          {task.accountablePersonId
            ? personName(task.accountablePersonId)
            : '— not set'}
        </p>
        {canManage && !closed && (
          <form className="row" onSubmit={doSaveAccountable}>
            <select
              value={accountableId || task.accountablePersonId || ''}
              onChange={(e) => setAccountableId(e.target.value)}
            >
              <option value="">No accountable…</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.preferredName ?? p.fullName}
                </option>
              ))}
            </select>
            <button type="submit" className="btn ghost">
              Save A
            </button>
          </form>
        )}
        <ul style={{ margin: '0.75rem 0 0', paddingLeft: '1.1rem' }}>
          {(task.watcherPersonIds ?? []).length === 0 && (
            <li className="muted">No watchers</li>
          )}
          {(task.watcherPersonIds ?? []).map((wid) => (
            <li key={wid}>
              {personName(wid)} — watcher
              {canManage && !closed && (
                <button
                  type="button"
                  className="btn ghost"
                  style={{ marginLeft: '0.5rem' }}
                  onClick={() => doRemoveWatcher(wid)}
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
        {canManage && !closed && (
          <form className="row" onSubmit={doAddWatcher} style={{ marginTop: '0.5rem' }}>
            <select
              value={watcherAdd}
              onChange={(e) => setWatcherAdd(e.target.value)}
            >
              <option value="">Add watcher…</option>
              {people
                .filter(
                  (p) =>
                    p.id !== task.ownerPersonId &&
                    p.id !== task.accountablePersonId &&
                    !(task.helperPersonIds ?? []).includes(p.id) &&
                    !(task.watcherPersonIds ?? []).includes(p.id),
                )
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.preferredName ?? p.fullName}
                  </option>
                ))}
            </select>
            <button type="submit" className="btn ghost" disabled={!watcherAdd}>
              Add
            </button>
          </form>
        )}
      </div>

      <div className="panel">
        <h3>Depends on</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Soft critical while listed tasks are still open.
        </p>
        <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
          {(task.dependsOn ?? []).length === 0 && (
            <li className="muted">No dependencies</li>
          )}
          {(task.dependsOn ?? []).map((depId) => {
            const d = missionService.getTask(depId);
            return (
              <li key={depId}>
                {d ? (
                  <Link to={`/tasks/${depId}`}>{d.title}</Link>
                ) : (
                  depId
                )}{' '}
                <span className="muted">· {d?.status ?? '?'}</span>
                {canManage && !closed && (
                  <button
                    type="button"
                    className="btn ghost"
                    style={{ marginLeft: '0.5rem' }}
                    onClick={() => doRemoveDep(depId)}
                  >
                    Remove
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        {canManage && !closed && (
          <form className="row" onSubmit={doAddDep} style={{ marginTop: '0.75rem' }}>
            <select value={depAdd} onChange={(e) => setDepAdd(e.target.value)}>
              <option value="">Add dependency…</option>
              {peerTasks
                .filter((t) => !(task.dependsOn ?? []).includes(t.id))
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.status})
                  </option>
                ))}
            </select>
            <button type="submit" className="btn ghost" disabled={!depAdd}>
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
