import { type FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiCreateProgram } from '../api/missionApi';
import { isApiEnabled } from '../api';
import { useAuth } from '../auth/AuthContext';
import { Drawer } from '../components/ui/Drawer';
import { FilterBar, PageHead } from '../components/ui/FilterBar';
import {
  EmptyState,
  ForbiddenState,
  StatusPill,
} from '../components/ui/StatusPill';
import type { MissionVisibility, ProgramType } from '../domain/types';
import { useProgramsList } from '../hooks/useMissionLists';
import {
  isChurchLeadership,
  missionService,
  systemsService,
} from '../services';

export function ProgramsPage() {
  const { can, account, roles, refreshSession } = useAuth();
  const navigate = useNavigate();
  const { programs, reload, source } = useProgramsList({
    viewerSystemId: 'sys-main',
  });
  const refresh = () => {
    reload();
    refreshSession();
  };
  const [msg, setMsg] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const canView = can('PROGRAM', 'VIEW');
  const canManage = can('PROGRAM', 'MANAGE');
  const churchLead = isChurchLeadership(roles);
  const standing = programs.filter((p) => !p.parentProgramId);
  const pending = programs.filter((p) => p.status === 'PENDING_APPROVAL');

  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [ptype, setPtype] = useState<ProgramType>('CLASS');
  const [vis, setVis] = useState<MissionVisibility>('CHURCH');
  const [parentId, setParentId] = useState('');
  const [cohort, setCohort] = useState('');
  const [hint, setHint] = useState('');

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return programs;
    if (statusFilter === 'pending') {
      return programs.filter((p) => p.status === 'PENDING_APPROVAL');
    }
    if (statusFilter === 'active') {
      return programs.filter((p) => p.status === 'ACTIVE');
    }
    if (statusFilter === 'setup') {
      return programs.filter((p) => p.status === 'SETUP');
    }
    if (statusFilter === 'closing') {
      return programs.filter((p) => p.status === 'CLOSING');
    }
    if (statusFilter === 'draft') {
      return programs.filter((p) => p.status === 'DRAFT');
    }
    return programs;
  }, [programs, statusFilter]);

  if (!account || !canView) {
    return (
      <div className="panel">
        <h2>Programs</h2>
        <ForbiddenState resource="PROGRAM" />
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

  function onSubmit(id: string) {
    const r = missionService.submitProgramForApproval(id);
    setMsg(r.ok ? 'Submitted for approval' : (r.reason ?? 'Failed'));
    refresh();
  }

  function onApprove(id: string) {
    const r = missionService.approveProgram(id, account!.personId, roles);
    setMsg(r.ok ? 'Program approved — SETUP' : (r.reason ?? 'Failed'));
    refresh();
  }

  return (
    <div className="stack">
      <div className="panel">
        <PageHead
          title="Programs & cohorts"
          subtitle="Standing programs and seasonal intakes. Church Leader approves before operate."
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
        <div className="row" style={{ marginTop: '0.75rem' }}>
          <span className="badge">{standing.length} standing</span>
          <span className="badge">{pending.length} pending</span>
          {churchLead && <span className="badge">You can approve</span>}
        </div>
        <div style={{ marginTop: '0.75rem' }}>
          <FilterBar
            value={statusFilter}
            onChange={setStatusFilter}
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

      {pending.length > 0 && statusFilter === 'all' && (
        <div className="panel">
          <h3>Awaiting Church Leader approval</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Program</th>
                <th>Cohort</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pending.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link to={`/programs/${p.id}`}>{p.name}</Link>
                  </td>
                  <td>{p.cohortLabel ?? '—'}</td>
                  <td className="row">
                    {churchLead && (
                      <button
                        type="button"
                        className="btn"
                        onClick={() => onApprove(p.id)}
                      >
                        Approve
                      </button>
                    )}
                    <Link to={`/programs/${p.id}`}>Open</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Drawer
        open={createOpen}
        title="Create program / cohort"
        onClose={() => setCreateOpen(false)}
        wide
      >
        <form className="stack" onSubmit={onCreate}>
          <div className="field">
            <label>Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>Type</label>
            <select
              value={ptype}
              onChange={(e) => setPtype(e.target.value as ProgramType)}
            >
              <option value="CLASS">Class</option>
              <option value="SMALL_GROUP">Small group</option>
              <option value="FELLOWSHIP">Fellowship</option>
              <option value="DISCIPLESHIP">Discipleship</option>
              <option value="SERVING_TEAM">Serving team</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div className="field">
            <label>Visibility</label>
            <select
              value={vis}
              onChange={(e) => setVis(e.target.value as MissionVisibility)}
            >
              <option value="CHURCH">General church</option>
              <option value="MINISTRY_PRIVATE">Main private</option>
              <option value="SELECTIVE">Selective</option>
            </select>
          </div>
          <div className="field">
            <label>Standing parent (cohort)</label>
            <select
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
            </select>
          </div>
          <div className="field">
            <label>Cohort label</label>
            <input
              value={cohort}
              onChange={(e) => setCohort(e.target.value)}
              placeholder="2026 Q3"
            />
          </div>
          <div className="field">
            <label>Schedule hint</label>
            <input
              value={hint}
              onChange={(e) => setHint(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Description</label>
            <input value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>
          <button type="submit" className="btn">
            {churchLead ? 'Create (active)' : 'Create draft'}
          </button>
        </form>
      </Drawer>

      {filtered.length === 0 ? (
        <div className="panel">
          <EmptyState
            title="No programs match"
            detail={
              statusFilter === 'all'
                ? 'Create a standing program or cohort.'
                : 'Try another filter.'
            }
            action={
              canManage && statusFilter === 'all' ? (
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
        </div>
      ) : (
        filtered.map((program) => {
          const owner = systemsService.getById(program.ownerSystemId);
          const activities = missionService.activitiesForProgram(program.id);
          const enrollments = missionService.listEnrollments(program.id);
          const parent = program.parentProgramId
            ? missionService.getProgram(program.parentProgramId)
            : null;
          return (
            <div key={program.id} className="panel">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ margin: 0 }}>
                    <Link to={`/programs/${program.id}`}>{program.name}</Link>
                  </h3>
                  <p className="muted" style={{ margin: '0.35rem 0 0' }}>
                    {program.description}
                    {parent ? ` · under ${parent.name}` : ''}
                  </p>
                </div>
                <div className="row">
                  <StatusPill status={program.status}>
                    {program.status}
                  </StatusPill>
                  {program.cohortLabel && (
                    <span className="badge">{program.cohortLabel}</span>
                  )}
                  <span className="badge">
                    {program.visibility === 'CHURCH'
                      ? 'General church'
                      : program.visibility}
                  </span>
                  <span className="badge">
                    {owner?.shortName ?? program.ownerSystemId}
                  </span>
                </div>
              </div>
              {program.scheduleHint && (
                <p className="muted">Schedule: {program.scheduleHint}</p>
              )}
              <div className="row" style={{ marginBottom: '0.5rem' }}>
                <span className="badge">
                  {enrollments.filter((e) => e.status === 'ACTIVE').length}{' '}
                  enrolled
                </span>
                <span className="badge">{activities.length} sessions</span>
                <Link to={`/programs/${program.id}`}>Open detail →</Link>
                {canManage && program.status === 'DRAFT' && (
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => onSubmit(program.id)}
                  >
                    Submit for approval
                  </button>
                )}
                {churchLead &&
                  (program.status === 'PENDING_APPROVAL' ||
                    program.status === 'DRAFT') && (
                    <button
                      type="button"
                      className="btn"
                      onClick={() => onApprove(program.id)}
                    >
                      Approve
                    </button>
                  )}
              </div>
            </div>
          );
        })
      )}

      <p className="muted">
        <Link to="/calendar">Open calendar →</Link>
      </p>
    </div>
  );
}
