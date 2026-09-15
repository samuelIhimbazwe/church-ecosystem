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
import type { MissionVisibility, SystemId } from '../domain/types';
import { projectToWorkItem } from '../domain/workItem';
import { useProjectsList } from '../hooks/useMissionLists';
import {
  financeService,
  isChurchLeader,
  missionService,
  peopleService,
  systemsService,
} from '../services';

export function ProjectsPage() {
  const { can, account, roles, refreshSession } = useAuth();
  const navigate = useNavigate();
  const { projects, reload } = useProjectsList();
  const refresh = () => {
    reload();
    refreshSession();
  };
  const [msg, setMsg] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [view, setView] = useState<WorkViewMode>('list');
  const canView = can('PROJECT', 'VIEW');
  const canManage = can('PROJECT', 'MANAGE');
  const churchLead = isChurchLeader(roles);

  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [vis, setVis] = useState<MissionVisibility>('CHURCH');
  const [leadId, setLeadId] = useState('');
  const [beyond, setBeyond] = useState(false);
  const [willSpend, setWillSpend] = useState(false);
  const [fundId, setFundId] = useState('');
  const [collabSys, setCollabSys] = useState<SystemId | ''>('');
  const [programId, setProgramId] = useState('');
  const [fastTrack, setFastTrack] = useState(false);

  const pending = projects.filter((p) => p.status === 'PENDING_APPROVAL');
  const people = peopleService.list();
  const systems = systemsService.list().filter((s) => s.id !== 'sys-main');
  const programs = missionService
    .listPrograms({ viewerSystemId: 'sys-main' })
    .filter((p) => !p.parentProgramId);
  const funds = financeService
    .listAllFunds()
    .filter(
      (f) =>
        f.status === 'ACTIVE' &&
        (f.kind === 'PROJECT' ||
          f.kind === 'GENERAL' ||
          f.ownerSystemId === 'sys-main'),
    );

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return projects;
    if (statusFilter === 'pending') {
      return projects.filter((p) => p.status === 'PENDING_APPROVAL');
    }
    if (statusFilter === 'draft') {
      return projects.filter((p) => p.status === 'DRAFT');
    }
    if (statusFilter === 'setup') {
      return projects.filter((p) => p.status === 'PLANNED');
    }
    if (statusFilter === 'paused') {
      return projects.filter((p) => p.status === 'PAUSED');
    }
    if (statusFilter === 'closing') {
      return projects.filter((p) => p.status === 'CLOSING');
    }
    if (statusFilter === 'active') {
      return projects.filter((p) => p.status === 'ACTIVE');
    }
    if (statusFilter === 'done') {
      return projects.filter(
        (p) => p.status === 'DONE' || p.status === 'CANCELLED',
      );
    }
    return projects;
  }, [projects, statusFilter]);

  if (!account || !canView) {
    return (
      <div className="panel">
        <h2>Projects</h2>
        <ForbiddenState resource="PROJECT" />
      </div>
    );
  }

  function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!canManage || !name.trim()) return;
    const r = missionService.createProject({
      name: name.trim(),
      description: desc || undefined,
      ownerSystemId: 'sys-main',
      visibility: vis,
      leadPersonId: leadId || undefined,
      beyondOwnerScope: beyond,
      willSpend,
      fundId: willSpend ? fundId || undefined : undefined,
      collaboratorSystemIds: collabSys ? [collabSys] : undefined,
      programId: programId || undefined,
      createdByPersonId: account!.personId,
      startActive: churchLead && fastTrack && !beyond,
    });
    if (!r.ok || !r.project) {
      setMsg(r.reason ?? 'Create failed');
      return;
    }
    const st = r.project.status;
    setMsg(
      st === 'ACTIVE'
        ? `Created ${r.project.name} — fast-track ACTIVE`
        : `Draft created: ${r.project.name} — submit when ready${
            beyond ? ' (beyond-scope approvals after submit)' : ''
          }`,
    );
    setName('');
    setDesc('');
    setBeyond(false);
    setWillSpend(false);
    setFundId('');
    setCollabSys('');
    setProgramId('');
    setFastTrack(false);
    setCreateOpen(false);
    refresh();
    navigate(`/projects/${r.project.id}`);
  }

  return (
    <div className="stack">
      <div className="panel">
        <PageHead
          actions={
            canManage ? (
              <button
                type="button"
                className="btn"
                onClick={() => setCreateOpen(true)}
              >
                Create project
              </button>
            ) : undefined
          }
        />
        <div className="row" style={{ marginTop: '0.75rem' }}>
          <span className="badge">{projects.length} visible</span>
          <span className="badge">{pending.length} pending</span>
        </div>
        <div style={{ marginTop: '0.75rem' }}>
          <div className="row" style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
            <FilterBar
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'all', label: 'All', count: projects.length },
                {
                  value: 'draft',
                  label: 'Draft',
                  count: projects.filter((p) => p.status === 'DRAFT').length,
                },
                { value: 'pending', label: 'Pending', count: pending.length },
                {
                  value: 'setup',
                  label: 'Setup',
                  count: projects.filter((p) => p.status === 'PLANNED').length,
                },
                {
                  value: 'paused',
                  label: 'Paused',
                  count: projects.filter((p) => p.status === 'PAUSED').length,
                },
                {
                  value: 'closing',
                  label: 'Closing',
                  count: projects.filter((p) => p.status === 'CLOSING').length,
                },
                {
                  value: 'active',
                  label: 'Active',
                  count: projects.filter((p) => p.status === 'ACTIVE').length,
                },
                {
                  value: 'done',
                  label: 'Closed',
                  count: projects.filter(
                    (p) => p.status === 'DONE' || p.status === 'CANCELLED',
                  ).length,
                },
              ]}
            />
            <WorkViewToggle value={view} onChange={setView} />
          </div>
        </div>
      </div>

      {msg && <p className="badge">{msg}</p>}

      {pending.length > 0 && statusFilter === 'all' && (
        <div className="panel">
          <h3>Pending approval</h3>
          <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
            {pending.map((p) => (
              <li key={p.id}>
                <Link to={`/projects/${p.id}`}>{p.name}</Link>
                <span className="muted">
                  {' '}
                  · missing{' '}
                  {missionService
                    .missingProjectApprovals(p.id)
                    .map((l) => l.label)
                    .join(', ')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Drawer
        open={createOpen}
        title="Create project"
        onClose={() => setCreateOpen(false)}
        wide
      >
        <form className="stack" onSubmit={onCreate}>
          <TextField
            label="Name"
            name="proj-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <SelectField
            label="Lead (recommended)"
            name="proj-lead"
            value={leadId}
            onChange={(e) => setLeadId(e.target.value)}
          >
            <option value="">None yet</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.preferredName ?? p.fullName}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Collaborating system"
            name="proj-collab"
            value={collabSys}
            onChange={(e) => setCollabSys(e.target.value as SystemId | '')}
          >
            <option value="">None</option>
            {systems.map((s) => (
              <option key={s.id} value={s.id}>
                {s.shortName}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Parent programme (optional)"
            name="proj-program"
            value={programId}
            onChange={(e) => setProgramId(e.target.value)}
          >
            <option value="">None</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Visibility"
            name="proj-vis"
            value={vis}
            onChange={(e) => setVis(e.target.value as MissionVisibility)}
          >
            <option value="CHURCH">General church</option>
            <option value="MINISTRY_PRIVATE">Private</option>
            <option value="SELECTIVE">Selective</option>
          </SelectField>
          <TextAreaField
            label="Description"
            name="proj-desc"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={3}
          />
          <CheckboxField
            label="Beyond owner scope (needs upper approvals)"
            checked={beyond}
            onChange={setBeyond}
          />
          {churchLead && !beyond && (
            <CheckboxField
              label="Fast-track ACTIVE (Church Leader only)"
              checked={fastTrack}
              onChange={setFastTrack}
            />
          )}
          <CheckboxField
            label="Will spend / has budget (fund required)"
            checked={willSpend}
            onChange={setWillSpend}
          />
          {willSpend && (
            <SelectField
              label="Fund"
              name="proj-fund"
              value={fundId}
              onChange={(e) => setFundId(e.target.value)}
              required
              hint="Spending still requires a Treasurer FundAccessGrant on the vault."
            >
              <option value="">Select fund…</option>
              {funds.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.code})
                </option>
              ))}
            </SelectField>
          )}
          <button type="submit" className="btn">
            Create project
          </button>
        </form>
      </Drawer>

      <div className="panel">
        {view !== 'list' ? (
          <WorkItemViews
            items={filtered.map((p) => projectToWorkItem(p))}
            view={view}
            emptyTitle="No projects match"
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No projects match"
            detail={
              statusFilter === 'all'
                ? 'Start an initiative from the create drawer.'
                : 'Try another filter.'
            }
            action={
              canManage && statusFilter === 'all' ? (
                <button
                  type="button"
                  className="btn"
                  onClick={() => setCreateOpen(true)}
                >
                  Create project
                </button>
              ) : undefined
            }
          />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Lead</th>
                <th>Collaborators</th>
                <th>Money</th>
                <th>Scope</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link to={`/projects/${p.id}`}>
                      <strong>{p.name}</strong>
                    </Link>
                    <div className="muted">
                      {systemsService.getById(p.ownerSystemId)?.shortName}
                    </div>
                  </td>
                  <td>
                    {p.leadPersonId
                      ? (peopleService.getById(p.leadPersonId)?.preferredName ??
                        p.leadPersonId)
                      : '—'}
                  </td>
                  <td>
                    {(p.collaboratorSystemIds ?? [])
                      .map(
                        (id) => systemsService.getById(id)?.shortName ?? id,
                      )
                      .join(', ') || '—'}
                  </td>
                  <td>
                    {p.willSpend
                      ? `Spend · ${financeService.getFund(p.fundId ?? '')?.code ?? p.fundId}`
                      : 'No spend'}
                  </td>
                  <td>{p.beyondOwnerScope ? 'Beyond' : 'In-scope'}</td>
                  <td>
                    <StatusPill status={p.status}>{p.status}</StatusPill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
