import { type FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiCreateProgram } from '../api/missionApi';
import { isApiEnabled } from '../api';
import { useAuth } from '../auth/AuthContext';
import {
  WorkItemViews,
  WorkViewToggle,
  type WorkViewMode,
} from '../components/WorkItemViews';
import { DataTable, type DataColumn } from '../components/ui/DataTable';
import { Drawer } from '../components/ui/Drawer';
import {
  SelectField,
  TextAreaField,
  TextField,
} from '../components/ui/Field';
import { FilterBar, PageHead } from '../components/ui/FilterBar';
import { ForbiddenState, StatusPill } from '../components/ui/StatusPill';
import { useToast } from '../components/ui/Toast';
import { statusLabel } from '../domain/statusCopy';
import type { MissionVisibility, Program, ProgramType } from '../domain/types';
import { programToWorkItem } from '../domain/workItem';
import { useProgramsList } from '../hooks/useMissionLists';
import { useUrlQueryState, useUrlSort } from '../hooks/useUrlQueryState';
import {
  isChurchLeader,
  missionService,
  systemsService,
} from '../services';
import {
  writeApproveProgram,
  writeSubmitProgram,
} from '../services/missionWrite';

export function ProgramsPage() {
  const { can, account, roles, refreshSession } = useAuth();
  const navigate = useNavigate();
  const { programs, reload, source, loading } = useProgramsList({
    viewerSystemId: 'sys-main',
  });
  const refresh = () => {
    reload();
    refreshSession();
  };
  const [msg, setMsg] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useUrlQueryState('status', 'all');
  const [visFilter, setVisFilter] = useUrlQueryState('vis', 'all');
  const [view, setView] = useUrlQueryState('view', 'list');
  const workView = (
    view === 'board' || view === 'calendar' ? view : 'list'
  ) as WorkViewMode;
  const [sort, setSort] = useUrlSort('name', 'asc');
  const [moreOpen, setMoreOpen] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const { push: toast } = useToast();
  const canView = can('PROGRAM', 'VIEW');
  const canManage = can('PROGRAM', 'MANAGE');
  const churchLead = isChurchLeader(roles);
  const standing = programs.filter((p) => !p.parentProgramId);
  const pending = programs.filter((p) => p.status === 'PENDING_APPROVAL');

  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [ptype, setPtype] = useState<ProgramType>('CLASS');
  const [vis, setVis] = useState<MissionVisibility>('CHURCH');
  const [parentId, setParentId] = useState('');
  const [cohort, setCohort] = useState('');
  const [hint, setHint] = useState('');

  async function onSubmit(id: string) {
    const r = await writeSubmitProgram(id);
    setMsg(r.ok ? 'Submitted for approval' : (r.reason ?? 'Failed'));
    refresh();
  }

  async function onApprove(id: string) {
    const r = await writeApproveProgram(id, account!.personId, roles);
    setMsg(r.ok ? `Approved — ${statusLabel('SETUP')}` : (r.reason ?? 'Failed'));
    refresh();
  }

  const filtered = useMemo(() => {
    let rows = programs;
    if (statusFilter === 'pending') {
      rows = rows.filter((p) => p.status === 'PENDING_APPROVAL');
    } else if (statusFilter === 'active') {
      rows = rows.filter((p) => p.status === 'ACTIVE');
    } else if (statusFilter === 'setup') {
      rows = rows.filter((p) => p.status === 'SETUP');
    } else if (statusFilter === 'closing') {
      rows = rows.filter((p) => p.status === 'CLOSING');
    } else if (statusFilter === 'draft') {
      rows = rows.filter((p) => p.status === 'DRAFT');
    }
    if (visFilter !== 'all') {
      rows = rows.filter((p) => p.visibility === visFilter);
    }
    return rows;
  }, [programs, statusFilter, visFilter]);

  const columns: DataColumn<Program>[] = [
    {
      id: 'name',
      header: 'Program',
      sortValue: (p) => p.name,
      cell: (p) => (
        <span>
          <strong>{p.name}</strong>
          {p.cohortLabel ? (
            <span className="muted"> · {p.cohortLabel}</span>
          ) : null}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      sortValue: (p) => p.status,
      cell: (p) => <StatusPill status={p.status} />,
      width: '9rem',
    },
    {
      id: 'type',
      header: 'Type',
      sortValue: (p) => p.programType ?? '',
      cell: (p) => p.programType ?? '—',
    },
    {
      id: 'owner',
      header: 'Owner',
      sortValue: (p) => p.ownerSystemId,
      cell: (p) =>
        systemsService.getById(p.ownerSystemId)?.shortName ?? p.ownerSystemId,
    },
    {
      id: 'actions',
      header: '',
      cell: (p) => (
        <span className="row" style={{ justifyContent: 'flex-end', gap: '0.35rem' }}>
          {canManage && p.status === 'DRAFT' && (
            <button
              type="button"
              className="btn ghost"
              onClick={(e) => {
                e.preventDefault();
                void onSubmit(p.id);
              }}
            >
              Submit
            </button>
          )}
          {churchLead &&
            (p.status === 'PENDING_APPROVAL' || p.status === 'DRAFT') && (
              <button
                type="button"
                className="btn"
                onClick={(e) => {
                  e.preventDefault();
                  void onApprove(p.id);
                }}
              >
                Approve
              </button>
            )}
          <Link to={`/programs/${p.id}`}>Open</Link>
        </span>
      ),
      align: 'right',
    },
  ];

  if (!account || !canView) {
    return (
      <div className="panel">
        <h2>Programs</h2>
        <ForbiddenState
          resource="PROGRAM"
          detail="You need program access in Main Church to view this list. Ask a church leader if you should be here."
          recovery={<Link to="/">Back to home</Link>}
        />
      </div>
    );
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!canManage || !name.trim()) return;
    const base = {
      name: name.trim(),
      description: desc || name.trim(),
      ownerSystemId: 'sys-main' as const,
      visibility: vis,
      programType: ptype,
      scheduleHint: hint || undefined,
    };
    let pId = '';
    let pName = base.name;
    if (isApiEnabled() && source === 'api') {
      try {
        const p = await apiCreateProgram({
          ...base,
          status: churchLead ? 'ACTIVE' : 'DRAFT',
        });
        pId = p.id;
        pName = p.name;
      } catch {
        /* fall through to seed */
      }
    }
    if (!pId) {
      const p = missionService.createProgram({
        ...base,
        parentProgramId: parentId || undefined,
        cohortLabel: cohort || undefined,
        createdByPersonId: account!.personId,
        startActive: churchLead,
      });
      pId = p.id;
      pName = p.name;
    }
    setMsg(
      churchLead
        ? `Created & active: ${pName}`
        : `Draft created: ${pName} — submit for Church Leader approval`,
    );
    setName('');
    setDesc('');
    setCohort('');
    setHint('');
    setParentId('');
    setCreateOpen(false);
    refresh();
    navigate(`/programs/${pId}`);
  }

  return (
    <div className="list-page">
      <div className="list-chrome">
        <PageHead
          actions={
            canManage ? (
              <button
                type="button"
                className="btn"
                onClick={() => setCreateOpen(true)}
              >
                Create program
              </button>
            ) : undefined
          }
        />
        <div className="list-meta">
          <span className="badge">{standing.length} standing</span>
          <span className="badge">{pending.length} pending</span>
          {churchLead && <span className="badge">You can approve</span>}
        </div>
        <div className="list-toolbar">
          <FilterBar
            value={statusFilter}
            onChange={setStatusFilter}
            onClearAll={() => {
              setStatusFilter('all');
              setVisFilter('all');
            }}
            activeFilters={
              visFilter !== 'all'
                ? [
                    {
                      id: 'vis',
                      label: `Visibility: ${visFilter}`,
                      onRemove: () => setVisFilter('all'),
                    },
                  ]
                : undefined
            }
            moreFilters={
              <>
                <WorkViewToggle
                  value={workView}
                  onChange={(v) => setView(v)}
                />
                <button
                  type="button"
                  className="filter-chip"
                  onClick={() => setMoreOpen(true)}
                >
                  More filters
                </button>
              </>
            }
            options={[
              { value: 'all', label: 'All', count: programs.length },
              { value: 'pending', label: 'Pending', count: pending.length },
              {
                value: 'setup',
                label: 'Setup',
                count: programs.filter((p) => p.status === 'SETUP').length,
              },
              {
                value: 'closing',
                label: 'Closing',
                count: programs.filter((p) => p.status === 'CLOSING').length,
              },
              {
                value: 'active',
                label: 'Active',
                count: programs.filter((p) => p.status === 'ACTIVE').length,
              },
              {
                value: 'draft',
                label: 'Draft',
                count: programs.filter((p) => p.status === 'DRAFT').length,
              },
            ]}
          />
        </div>
      </div>

      {msg && <p className="badge">{msg}</p>}

      <div className="list-surface">
        {workView === 'list' ? (
        <DataTable
          rows={filtered}
          columns={columns}
          rowKey={(p) => p.id}
          sort={sort}
          onSort={setSort}
          loading={loading}
          rowHref={(p) => `/programs/${p.id}`}
          selectedKeys={selectedKeys}
          onSelectedKeysChange={setSelectedKeys}
          bulkActions={
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                toast({
                  title: `${selectedKeys.length} selected`,
                  detail: 'Bulk actions land with mission ops in W2.',
                  tone: 'info',
                });
                setSelectedKeys([]);
              }}
            >
              Clear selection
            </button>
          }
          emptyVariant={
            statusFilter === 'all' &&
            visFilter === 'all' &&
            programs.length === 0
              ? 'first-use'
              : 'no-results'
          }
          emptyTitle={
            statusFilter === 'all' &&
            visFilter === 'all' &&
            programs.length === 0
              ? 'No programs yet'
              : 'No programs match'
          }
          emptyDetail={
            statusFilter === 'all' &&
            visFilter === 'all' &&
            programs.length === 0
              ? 'Create a standing program or cohort to begin.'
              : 'Try another filter or clear all.'
          }
          emptyAction={
            canManage && statusFilter === 'all' && visFilter === 'all' ? (
              <button
                type="button"
                className="btn"
                onClick={() => setCreateOpen(true)}
              >
                Create program
              </button>
            ) : statusFilter !== 'all' || visFilter !== 'all' ? (
              <button
                type="button"
                className="btn secondary"
                onClick={() => {
                  setStatusFilter('all');
                  setVisFilter('all');
                }}
              >
                Clear filters
              </button>
            ) : undefined
          }
          footer={
            <span className="muted">
              {filtered.length} of {programs.length} · sort/filters in URL ·{' '}
              <Link to="/calendar">Calendar →</Link>
            </span>
          }
        />
        ) : (
          <WorkItemViews
            items={filtered.map((p) => programToWorkItem(p))}
            view={workView}
            emptyTitle="No programs match"
          />
        )}
      </div>

      <Drawer
        open={moreOpen}
        title="More filters"
        onClose={() => setMoreOpen(false)}
      >
        <SelectField
          label="Visibility"
          name="prog-vis-filter"
          value={visFilter}
          onChange={(e) => setVisFilter(e.target.value)}
        >
          <option value="all">All</option>
          <option value="CHURCH">General church</option>
          <option value="MINISTRY_PRIVATE">Ministry private</option>
          <option value="SELECTIVE">Selective</option>
        </SelectField>
        <button
          type="button"
          className="btn"
          style={{ marginTop: '0.75rem' }}
          onClick={() => setMoreOpen(false)}
        >
          Apply
        </button>
      </Drawer>

      <Drawer
        open={createOpen}
        title="Create program / cohort"
        onClose={() => setCreateOpen(false)}
        wide
      >
        <form className="stack" onSubmit={onCreate}>
          <TextField
            label="Name"
            name="prog-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <SelectField
            label="Type"
            name="prog-type"
            value={ptype}
            onChange={(e) => setPtype(e.target.value as ProgramType)}
          >
            <option value="CLASS">Class</option>
            <option value="SMALL_GROUP">Small group</option>
            <option value="FELLOWSHIP">Fellowship</option>
            <option value="DISCIPLESHIP">Discipleship</option>
            <option value="SERVING_TEAM">Serving team</option>
            <option value="OTHER">Other</option>
          </SelectField>
          <SelectField
            label="Visibility"
            name="prog-vis"
            value={vis}
            onChange={(e) => setVis(e.target.value as MissionVisibility)}
          >
            <option value="CHURCH">General church</option>
            <option value="MINISTRY_PRIVATE">Main private</option>
            <option value="SELECTIVE">Selective</option>
          </SelectField>
          <SelectField
            label="Standing parent (cohort)"
            name="prog-parent"
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
          >
            <option value="">— Standing / new —</option>
            {standing
              .filter((p) => p.status === 'ACTIVE')
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </SelectField>
          <TextField
            label="Cohort label"
            name="prog-cohort"
            value={cohort}
            onChange={(e) => setCohort(e.target.value)}
            placeholder="2026 Q3"
          />
          <TextField
            label="Schedule hint"
            name="prog-hint"
            value={hint}
            onChange={(e) => setHint(e.target.value)}
          />
          <TextAreaField
            label="Description"
            name="prog-desc"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={3}
          />
          <button type="submit" className="btn">
            {churchLead ? 'Create (active)' : 'Create draft'}
          </button>
        </form>
      </Drawer>
    </div>
  );
}
