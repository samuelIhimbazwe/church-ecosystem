import { type FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  WorkItemViews,
  WorkViewToggle,
  type WorkViewMode,
} from '../components/WorkItemViews';
import { Drawer } from '../components/ui/Drawer';
import {
  CheckboxField,
  SelectField,
  TextAreaField,
  TextField,
} from '../components/ui/Field';
import { FilterBar, PageHead } from '../components/ui/FilterBar';
import {
  EmptyState,
  ForbiddenState,
  StatusPill,
} from '../components/ui/StatusPill';
import { useToast } from '../components/ui/Toast';
import type {
  MissionVisibility,
  TaskContextType,
  WorkTask,
} from '../domain/types';
import { taskToWorkItem } from '../domain/workItem';
import { useTasksList } from '../hooks/useMissionLists';
import { peopleService, systemsService, missionService } from '../services';
import { writeCompleteTask, writeReopenTask } from '../services/missionWrite';

function taskUrgency(t: WorkTask): 'overdue' | 'critical' | 'grant' | null {
  if (t.status === 'DONE' || t.status === 'CANCELLED') return null;
  if (t.grantsSystemAccess) return 'grant';
  if (missionService.isSoftCritical(t.id)) return 'critical';
  if (t.dueDate && t.dueDate < new Date().toISOString().slice(0, 10)) {
    return 'overdue';
  }
  return null;
}

export function TasksPage() {
  const { account, can, positions, refreshSession } = useAuth();
  const navigate = useNavigate();
  const { push: toast } = useToast();
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
  const [view, setView] = useState<WorkViewMode>('board');
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

  async function markDoneQuick(t: WorkTask) {
    const prior = {
      status: t.status,
      endDate: t.endDate,
      outcomeNote: t.outcomeNote,
      grantsSystemAccess: t.grantsSystemAccess,
      accessRevokedAt: t.accessRevokedAt,
    };
    const r = await writeCompleteTask(t.id);
    if (!r.ok) {
      toast({ title: 'Could not complete', detail: r.reason, tone: 'danger' });
      return;
    }
    refresh();
    toast({
      title: 'Marked done',
      detail: t.title,
      tone: 'success',
      undo: () => {
        void writeReopenTask(t.id, prior).then(() => refresh());
      },
    });
  }

  if (!account || !canView) {
    return <ForbiddenState resource="TASK" action="VIEW" />;
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
        ? `Created ${t.title} — opens a ministry for the assignee until closed`
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

  const canQuickDone = (t: WorkTask) =>
    (t.status === 'TODO' || t.status === 'IN_PROGRESS') &&
    (canManage ||
      t.ownerPersonId === account.personId ||
      (t.helperPersonIds ?? []).includes(account.personId));

  return (
    <div className="list-page">
      <div className="list-chrome">
        <PageHead
          actions={
            <>
              <WorkViewToggle value={view} onChange={setView} />
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
        <div className="list-meta">
          <span className="badge">{activeMine.length} active for you</span>
          <span className="badge">{open.length} open</span>
        </div>
        {activeMine.length > 0 && (
          <div className="steward-banner warn" style={{ marginTop: '0.65rem' }}>
            {activeMine.length} open task
            {activeMine.length === 1 ? '' : 's'} temporarily open a ministry for
            the assignee. Closing the task removes that access.
          </div>
        )}
        <div className="list-toolbar">
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
          <TextField
            label="Title"
            name="task-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Verb + object"
            required
          />
          <SelectField
            label="Primary assignee"
            name="task-owner"
            value={ownerId}
            onChange={(e) => setOwnerId(e.target.value)}
            required
          >
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.preferredName ?? p.fullName}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Helper (optional)"
            name="task-helper"
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
          </SelectField>
          <TextField
            label="Due"
            name="task-due"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
          <SelectField
            label="Context"
            name="task-ctx"
            value={ctxType}
            onChange={(e) => setCtxType(e.target.value as TaskContextType)}
          >
            <option value="NONE">Standalone</option>
            <option value="PROGRAM">Program</option>
            <option value="EVENT">Event</option>
            <option value="PROJECT">Project</option>
          </SelectField>
          <SelectField
            label="Visibility"
            name="task-vis"
            value={vis}
            onChange={(e) => setVis(e.target.value as MissionVisibility)}
          >
            <option value="CHURCH">General church</option>
            <option value="MINISTRY_PRIVATE">Private</option>
            <option value="SELECTIVE">Selective</option>
          </SelectField>
          <TextAreaField
            label="Description"
            name="task-desc"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={3}
          />
          <CheckboxField
            label="While this task is open, let the assignee enter a ministry"
            checked={grantAccess}
            onChange={setGrantAccess}
          />
          <button type="submit" className="btn">
            Create task
          </button>
        </form>
      </Drawer>

      {filtered.length === 0 ? (
        <div className="list-surface" style={{ padding: '1rem' }}>
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
      ) : view === 'calendar' ? (
        <div className="list-surface" style={{ padding: '1rem' }}>
          <WorkItemViews
            items={filtered.map((t) => taskToWorkItem(t))}
            view="calendar"
            emptyTitle="No tasks match"
          />
        </div>
      ) : view === 'board' ? (
        <TaskBoard
          tasks={filtered}
          showOwner={canManage}
          canQuickDone={canQuickDone}
          onDone={markDoneQuick}
        />
      ) : (
        <div className="list-surface" style={{ padding: '1rem 1.1rem' }}>
          <h3 style={{ marginTop: 0 }}>
            {statusFilter === 'mine' ? 'Your tasks' : 'Filtered tasks'}
          </h3>
          <TaskTable
            tasks={statusFilter === 'mine' ? mine : filtered}
            showOwner={canManage}
            canQuickDone={canQuickDone}
            onDone={markDoneQuick}
          />
        </div>
      )}
    </div>
  );
}

function UrgencyBadge({ task }: { task: WorkTask }) {
  const u = taskUrgency(task);
  if (!u) return null;
  const label =
    u === 'overdue'
      ? 'Overdue'
      : u === 'critical'
        ? 'Waiting on deps'
        : 'Opens ministry';
  return <span className="badge">{label}</span>;
}

function TaskBoard({
  tasks,
  showOwner,
  canQuickDone,
  onDone,
}: {
  tasks: ReturnType<typeof missionService.listTasks>;
  showOwner?: boolean;
  canQuickDone: (t: WorkTask) => boolean;
  onDone: (t: WorkTask) => void;
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
                <div
                  key={t.id}
                  className={`mission-card${
                    missionService.isSoftCritical(t.id) ? ' soft-critical' : ''
                  }`}
                >
                  <div className="kind">
                    {t.grantsSystemAccess
                      ? 'Opens ministry'
                      : t.accessRevokedAt
                        ? 'Access ended'
                        : t.contextType === 'NONE'
                          ? 'Task'
                          : t.contextType === 'PROGRAM'
                            ? 'Program'
                            : t.contextType === 'EVENT'
                              ? 'Event'
                              : t.contextType === 'PROJECT'
                                ? 'Project'
                                : 'Task'}
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
                  <div
                    className="row"
                    style={{ gap: '0.35rem', flexWrap: 'wrap' }}
                  >
                    <StatusPill status={t.status} />
                    <UrgencyBadge task={t} />
                    {canQuickDone(t) && (
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => onDone(t)}
                      >
                        Done
                      </button>
                    )}
                  </div>
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
  canQuickDone,
  onDone,
}: {
  tasks: ReturnType<typeof missionService.listTasks>;
  showOwner?: boolean;
  canQuickDone: (t: WorkTask) => boolean;
  onDone: (t: WorkTask) => void;
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
          <th>Urgency</th>
          <th>Access</th>
          <th>Due</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {tasks.map((t) => (
          <tr
            key={t.id}
            className={
              missionService.isSoftCritical(t.id)
                ? 'soft-critical-row'
                : undefined
            }
          >
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
              <StatusPill status={t.status} />
            </td>
            <td>
              <UrgencyBadge task={t} />
            </td>
            <td>
              {t.grantsSystemAccess ? (
                <StatusPill tone="success">Opens ministry</StatusPill>
              ) : t.accessRevokedAt ? (
                <StatusPill tone="neutral">Access ended</StatusPill>
              ) : (
                '—'
              )}
            </td>
            <td>{t.dueDate ?? '—'}</td>
            <td>
              {canQuickDone(t) && (
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => onDone(t)}
                >
                  Done
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
