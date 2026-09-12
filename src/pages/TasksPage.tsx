import { type FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Drawer } from '../components/ui/Drawer';
import { FilterBar, PageHead } from '../components/ui/FilterBar';
import {
  EmptyState,
  ForbiddenState,
  StatusPill,
} from '../components/ui/StatusPill';
import type { MissionVisibility, TaskContextType } from '../domain/types';
import { useTasksList } from '../hooks/useMissionLists';
import { peopleService, systemsService, missionService } from '../services';

export function TasksPage() {
  const { account, can, positions, refreshSession } = useAuth();
  const navigate = useNavigate();
  const { tasks: apiOrSeedTasks, reload, source } = useTasksList();
  const refresh = () => {
    reload();
    refreshSession();
  };
  const [msg, setMsg] = useState('');
  const canView = can('TASK', 'VIEW');
  const canManage = can('TASK', 'MANAGE');

  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [ownerId, setOwnerId] = useState(account?.personId ?? '');
  const [helperId, setHelperId] = useState('');
  const [dueDate, setDueDate] = useState('2026-09-30');
  const [vis, setVis] = useState<MissionVisibility>('CHURCH');
  const [ctxType, setCtxType] = useState<TaskContextType>('NONE');
  const [grantAccess, setGrantAccess] = useState(false);
  const [view, setView] = useState<'list' | 'board'>('board');
  const [createOpen, setCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  const mine =
    source === 'api'
      ? apiOrSeedTasks.filter(
          (t) =>
            account &&
            (t.ownerPersonId === account.personId ||
              t.helperPersonIds?.includes(account.personId)),
        )
      : account
        ? missionService.listTasks({
            involvedPersonId: account.personId,
            viewerSystemId: 'sys-main',
            viewOpts: {
              personId: account.personId,
              positions,
              canEnterOwner: true,
            },
          })
        : [];
  const all =
    source === 'api'
      ? canManage
        ? apiOrSeedTasks
        : mine
      : account && canManage
        ? missionService.listTasks({
            viewerSystemId: 'sys-main',
            viewOpts: {
              personId: account.personId,
              positions,
              canEnterOwner: true,
            },
          })
        : mine;
  const activeMine = account
    ? source === 'api'
      ? apiOrSeedTasks.filter(
          (t) =>
            t.ownerPersonId === account.personId &&
            (t.status === 'TODO' || t.status === 'IN_PROGRESS') &&
            t.grantsSystemAccess,
        )
      : missionService.activeTasksFor(account.personId)
    : [];
  const open = all.filter(
    (t) => t.status === 'TODO' || t.status === 'IN_PROGRESS',
  );
  const people = peopleService.list();

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return all;
    if (statusFilter === 'open') {
      return all.filter(
        (t) => t.status === 'TODO' || t.status === 'IN_PROGRESS',
      );
    }
    if (statusFilter === 'done') {
      return all.filter(
        (t) => t.status === 'DONE' || t.status === 'CANCELLED',
      );
    }
    if (statusFilter === 'mine') {
      return mine;
    }
    return all;
  }, [all, mine, statusFilter]);

  if (!account || !canView) {
    return (
      <div className="panel">
        <h2>Tasks</h2>
        <ForbiddenState resource="TASK" />
      </div>
    );
  }

  function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!canManage || !title.trim() || !ownerId) return;
    const t = missionService.createTask({
      title: title.trim(),
      description: desc || undefined,
      ownerPersonId: ownerId,
      helperPersonIds: helperId ? [helperId] : undefined,
      createdByPersonId: account!.personId,
      systemId: 'sys-main',
      visibility: vis,
      contextType: ctxType,
      dueDate: dueDate || undefined,
      grantsSystemAccess: grantAccess,
    });
    setMsg(
      grantAccess
        ? `Created ${t.title} — temp system access while active`
        : `Created ${t.title}`,
    );
    setTitle('');
    setDesc('');
    setHelperId('');
    setGrantAccess(false);
    setCreateOpen(false);
    refresh();
    navigate(`/tasks/${t.id}`);
  }

  return (
    <div className="stack">
      <div className="panel">
        <PageHead
          title="Tasks"
          subtitle="Primary + helpers · temp ENTER revoked on DONE/CANCEL · Option A close."
          actions={
            <>
              <button
                type="button"
                className={`btn ${view === 'board' ? '' : 'ghost'}`}
                onClick={() => setView('board')}
              >
                Board
              </button>
              <button
                type="button"
                className={`btn ${view === 'list' ? '' : 'ghost'}`}
                onClick={() => setView('list')}
              >
                List
              </button>
              {canManage && (
                <button
                  type="button"
                  className="btn"
                  onClick={() => setCreateOpen(true)}
                >
                  Create task
                </button>
              )}
            </>
          }
        />
        <div className="row" style={{ marginTop: '0.75rem' }}>
          <span className="badge">{activeMine.length} active for you</span>
          <span className="badge">{open.length} open (visible)</span>
        </div>
        <div style={{ marginTop: '0.75rem' }}>
          <FilterBar
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'all', label: 'All', count: all.length },
              { value: 'open', label: 'Open', count: open.length },
              { value: 'mine', label: 'Mine', count: mine.length },
              {
                value: 'done',
                label: 'Closed',
                count: all.filter(
                  (t) => t.status === 'DONE' || t.status === 'CANCELLED',
                ).length,
              },
            ]}
          />
        </div>
      </div>

      {msg && <p className="badge">{msg}</p>}

      <Drawer
        open={createOpen}
        title="Create task"
        onClose={() => setCreateOpen(false)}
        wide
      >
        <form className="stack" onSubmit={onCreate}>
          <div className="field">
            <label>Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Verb + object"
              required
            />
          </div>
          <div className="field">
            <label>Primary assignee</label>
            <select
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
              required
            >
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.preferredName ?? p.fullName}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Helper (optional)</label>
            <select
              value={helperId}
              onChange={(e) => setHelperId(e.target.value)}
            >
              <option value="">None</option>
              {people
                .filter((p) => p.id !== ownerId)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.preferredName ?? p.fullName}
                  </option>
                ))}
            </select>
          </div>
          <div className="field">
            <label>Due</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Context</label>
            <select
              value={ctxType}
              onChange={(e) => setCtxType(e.target.value as TaskContextType)}
            >
              <option value="NONE">Standalone</option>
              <option value="PROGRAM">Program</option>
              <option value="EVENT">Event</option>
              <option value="PROJECT">Project</option>
            </select>
          </div>
          <div className="field">
            <label>Visibility</label>
            <select
              value={vis}
              onChange={(e) => setVis(e.target.value as MissionVisibility)}
            >
              <option value="CHURCH">General church</option>
              <option value="MINISTRY_PRIVATE">Private</option>
              <option value="SELECTIVE">Selective</option>
            </select>
          </div>
          <div className="field">
            <label>Description</label>
            <input value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>
          <label className="row">
            <input
              type="checkbox"
              checked={grantAccess}
              onChange={(e) => setGrantAccess(e.target.checked)}
            />
            Grant temporary Main Church system entry while active
          </label>
          <button type="submit" className="btn">
            Create task
          </button>
        </form>
      </Drawer>

      {filtered.length === 0 ? (
        <div className="panel">
          <EmptyState
            title="No tasks match"
            detail={
              statusFilter === 'all'
                ? 'Create a task or wait for an assignment.'
                : 'Try another filter.'
            }
            action={
              canManage && statusFilter === 'all' ? (
                <button
                  type="button"
                  className="btn"
                  onClick={() => setCreateOpen(true)}
                >
                  Create task
                </button>
              ) : undefined
            }
          />
        </div>
      ) : view === 'board' ? (
        <TaskBoard tasks={filtered} showOwner={canManage} />
      ) : (
        <>
          <div className="panel">
            <h3>
              {statusFilter === 'mine' ? 'Your tasks' : 'Filtered tasks'}
            </h3>
            <TaskTable
              tasks={statusFilter === 'mine' ? mine : filtered}
              showOwner={canManage}
            />
          </div>
        </>
      )}
    </div>
  );
}

function TaskBoard({
  tasks,
  showOwner,
}: {
  tasks: ReturnType<typeof missionService.listTasks>;
  showOwner?: boolean;
}) {
  const cols = [
    { key: 'TODO' as const, label: 'To do' },
    { key: 'IN_PROGRESS' as const, label: 'In progress' },
    { key: 'DONE' as const, label: 'Done' },
  ];
  return (
    <div className="task-board">
      {cols.map((col) => {
        const rows = tasks.filter((t) =>
          col.key === 'DONE'
            ? t.status === 'DONE' || t.status === 'CANCELLED'
            : t.status === col.key,
        );
        return (
          <div key={col.key} className="task-col">
            <h3>
              {col.label}
              <span className="badge">{rows.length}</span>
            </h3>
            {rows.length === 0 ? (
              <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
                Empty
              </p>
            ) : (
              rows.map((t) => (
                <div key={t.id} className="mission-card">
                  <div className="kind">
                    {t.grantsSystemAccess
                      ? 'Temp ENTER'
                      : t.accessRevokedAt
                        ? 'Revoked'
                        : t.contextType === 'NONE'
                          ? 'Task'
                          : t.contextType}
                  </div>
                  <strong>
                    <Link to={`/tasks/${t.id}`} style={{ color: 'inherit' }}>
                      {t.title}
                    </Link>
                  </strong>
                  <div className="meta">
                    {showOwner &&
                      (peopleService.getById(t.ownerPersonId)?.preferredName ??
                        t.ownerPersonId)}
                    {t.dueDate ? ` · due ${t.dueDate}` : ''}
                    {t.status === 'CANCELLED' ? ' · cancelled' : ''}
                  </div>
                  <StatusPill status={t.status}>{t.status}</StatusPill>
                </div>
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}

function TaskTable({
  tasks,
  showOwner = false,
}: {
  tasks: ReturnType<typeof missionService.listTasks>;
  showOwner?: boolean;
}) {
  if (tasks.length === 0) {
    return <EmptyState title="No tasks" detail="Nothing in this list." />;
  }
  return (
    <table className="table">
      <thead>
        <tr>
          <th>Title</th>
          {showOwner && <th>Primary</th>}
          <th>Helpers</th>
          <th>Context</th>
          <th>System</th>
          <th>Status</th>
          <th>Access</th>
          <th>Due</th>
        </tr>
      </thead>
      <tbody>
        {tasks.map((t) => (
          <tr key={t.id}>
            <td>
              <Link to={`/tasks/${t.id}`}>
                <strong>{t.title}</strong>
              </Link>
              {t.description && <div className="muted">{t.description}</div>}
            </td>
            {showOwner && (
              <td>
                {peopleService.getById(t.ownerPersonId)?.preferredName ??
                  t.ownerPersonId}
              </td>
            )}
            <td>
              {(t.helperPersonIds ?? []).length === 0
                ? '—'
                : (t.helperPersonIds ?? [])
                    .map(
                      (id) =>
                        peopleService.getById(id)?.preferredName ?? id,
                    )
                    .join(', ')}
            </td>
            <td>
              {t.contextType === 'NONE'
                ? '—'
                : `${t.contextType}: ${t.contextLabel ?? t.contextId}`}
            </td>
            <td>
              {t.systemId
                ? (systemsService.getById(t.systemId)?.shortName ?? t.systemId)
                : '—'}
            </td>
            <td>
              <StatusPill status={t.status}>{t.status}</StatusPill>
            </td>
            <td>
              {t.grantsSystemAccess ? (
                <StatusPill tone="success">Active grant</StatusPill>
              ) : t.accessRevokedAt ? (
                <StatusPill tone="neutral">Revoked</StatusPill>
              ) : (
                '—'
              )}
            </td>
            <td>{t.dueDate ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
