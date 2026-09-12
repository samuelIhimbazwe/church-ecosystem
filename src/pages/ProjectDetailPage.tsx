import { type FormEvent, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { StewardshipPanel } from '../components/StewardshipPanel';
import { ApprovalStepper } from '../components/ui/ApprovalStepper';
import { StatusPill } from '../components/ui/StatusPill';
import { canApproveScopeLevel } from '../domain/eventScope';
import {
  confirmedFundingTotal,
  formatRwf,
  fundingGap,
} from '../domain/stewardship';
import type { SystemId } from '../domain/types';
import {
  financeService,
  isChurchLeadership,
  missionService,
  peopleService,
  systemsService,
} from '../services';

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { can, account, positions, roles, refreshSession } = useAuth();
  const [, setTick] = useState(0);
  const refresh = () => {
    setTick((t) => t + 1);
    refreshSession();
  };
  const [msg, setMsg] = useState('');
  const [closeOpen, setCloseOpen] = useState(false);
  const [addSys, setAddSys] = useState<SystemId | ''>('');
  const [addPerson, setAddPerson] = useState('');
  const [linkProgramId, setLinkProgramId] = useState('');

  const project = id ? missionService.getProject(id) : null;

  if (!account || !can('PROJECT', 'VIEW')) {
    return (
      <div className="panel">
        <p className="muted">No access.</p>
        <Link to="/projects">← Projects</Link>
      </div>
    );
  }
  if (!project) {
    return (
      <div className="panel">
        <p>Project not found.</p>
        <Link to="/projects">← Projects</Link>
      </div>
    );
  }

  const canManage = can('PROJECT', 'MANAGE');
  const churchLead = isChurchLeadership(roles);
  const closed = project.status === 'DONE' || project.status === 'CANCELLED';
  const owner = systemsService.getById(project.ownerSystemId);
  const chain = missionService.projectApprovalChain(project.id);
  const openTasks = missionService.openTasksForProject(project.id);
  const linkedEvents = missionService.eventsForProject(project.id);
  const parentProgram = project.programId
    ? missionService.getProgram(project.programId)
    : null;
  const fund = project.fundId
    ? financeService.getFund(project.fundId)
    : null;
  const people = peopleService.list();
  const standingPrograms = missionService
    .listPrograms({ viewerSystemId: project.ownerSystemId })
    .filter((p) => !p.parentProgramId);
  const systems = systemsService
    .list()
    .filter(
      (s) =>
        s.id !== project.ownerSystemId &&
        !(project.collaboratorSystemIds ?? []).includes(s.id),
    );
  const collabCount =
    (project.collaboratorSystemIds ?? []).length +
    (project.collaboratorPersonIds ?? []).length;
  const planned = Number(project.plannedCost) || 0;
  const confirmed = confirmedFundingTotal(project);
  const gap = fundingGap(project);
  const deliveryRequired = (project.deliveryItems ?? []).filter(
    (d) => d.tier === 'REQUIRED',
  ).length;
  const deliveryPlanned = (project.deliveryItems ?? []).filter(
    (d) => d.tier === 'PLANNED',
  ).length;

  function personName(pid: string) {
    const p = peopleService.getById(pid);
    return p?.preferredName ?? p?.fullName ?? pid;
  }

  function doApproveLevel(levelKey: string) {
    const r = missionService.approveProjectLevel({
      projectId: project!.id,
      levelKey,
      personId: account!.personId,
      positions,
      roles,
    });
    setMsg(
      r.ok
        ? r.project?.status === 'PLANNED'
          ? 'Chain complete — PLANNED (setup)'
          : 'Approval recorded'
        : (r.reason ?? 'Failed'),
    );
    refresh();
  }

  function doCancel() {
    const r = missionService.cancelProject(project!.id);
    setMsg(r.ok ? 'Cancelled — recorded' : (r.reason ?? 'Failed'));
    refresh();
  }

  function doAddSys(e: FormEvent) {
    e.preventDefault();
    if (!addSys) return;
    missionService.addProjectCollaboratorSystem(project!.id, addSys);
    setMsg('Collaborating system added');
    setAddSys('');
    refresh();
  }

  function doAddPerson(e: FormEvent) {
    e.preventDefault();
    if (!addPerson) return;
    missionService.addProjectCollaboratorPerson(project!.id, addPerson);
    setMsg('Collaborating person added');
    setAddPerson('');
    refresh();
  }

  function doLinkProgram(e: FormEvent) {
    e.preventDefault();
    missionService.updateProject(project!.id, {
      programId: linkProgramId || undefined,
    });
    setMsg(linkProgramId ? 'Linked to programme' : 'Programme link cleared');
    refresh();
  }

  return (
    <div className="stack">
      <p>
        <Link to="/projects">← Projects</Link>
      </p>
      {msg && <p className="badge">{msg}</p>}

      <div className="detail-hero">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <p className="hero-kicker">
              Project · {owner?.shortName ?? owner?.name} ·{' '}
              {project.beyondOwnerScope ? 'Beyond scope' : 'In-scope'}
              {parentProgram ? (
                <>
                  {' '}
                  · under{' '}
                  <Link to={`/programs/${parentProgram.id}`}>
                    {parentProgram.name}
                  </Link>
                </>
              ) : null}
            </p>
            <h2>{project.name}</h2>
          </div>
          <StatusPill status={project.status}>{project.status}</StatusPill>
        </div>
        {project.description && (
          <p className="muted" style={{ marginBottom: 0 }}>
            {project.description}
          </p>
        )}
        <div className="overview-strip">
          <div className="overview-tile">
            <div className="label">Lead</div>
            <div className="value">
              {project.leadPersonId
                ? personName(project.leadPersonId)
                : 'Not named'}
            </div>
          </div>
          <div className="overview-tile">
            <div className="label">Collaborators</div>
            <div className="value">{collabCount || 'Owner only'}</div>
          </div>
          <div className="overview-tile">
            <div className="label">Money</div>
            <div className="value">
              {planned > 0
                ? `${formatRwf(planned)} · gap ${formatRwf(Math.max(0, gap))}`
                : project.willSpend
                  ? fund?.code ?? project.fundId ?? 'Spend'
                  : 'No spend'}
            </div>
          </div>
          <div className="overview-tile">
            <div className="label">Delivery</div>
            <div className="value">
              {deliveryRequired || deliveryPlanned
                ? `${deliveryRequired} req · ${deliveryPlanned} planned`
                : '—'}
            </div>
          </div>
          <div className="overview-tile">
            <div className="label">Open tasks</div>
            <div className="value">{openTasks.length}</div>
          </div>
        </div>
        {project.outcomeNote && (
          <p style={{ marginBottom: 0, marginTop: '0.75rem' }}>
            <strong>Outcome:</strong> {project.outcomeNote}
          </p>
        )}
        {project.willSpend && (
          <div className="grant-callout" style={{ marginTop: '0.75rem' }}>
            <strong>Fund vault (ORG_PRIVATE)</strong>
            <p className="muted" style={{ margin: '0.35rem 0 0' }}>
              Linked fund: {fund?.name ?? project.fundId}. Spending still
              requires a Treasurer FundAccessGrant — linking does not open the
              vault to everyone.
            </p>
            {fund && (
              <Link to="/systems/finance" style={{ fontSize: '0.9rem' }}>
                Open Finance system →
              </Link>
            )}
          </div>
        )}
        {planned > 0 && (
          <div className="grant-callout" style={{ marginTop: '0.75rem' }}>
            <strong>Stewardship snapshot (for approvers)</strong>
            <p className="muted" style={{ margin: '0.35rem 0 0' }}>
              Planned {formatRwf(planned)} · confirmed {formatRwf(confirmed)} ·
              gap {formatRwf(Math.max(0, gap))} · delivery {deliveryRequired}{' '}
              required / {deliveryPlanned} planned
            </p>
          </div>
        )}
        <div className="row" style={{ marginTop: '0.75rem' }}>
          {canManage && project.status === 'DRAFT' && (
            <button
              type="button"
              className="btn"
              onClick={() => {
                const r = missionService.submitProjectForApproval(project.id);
                setMsg(
                  r.ok ? 'Submitted for approval' : (r.reason ?? 'Failed'),
                );
                refresh();
              }}
            >
              Submit for approval
            </button>
          )}
          {churchLead &&
            project.status === 'PENDING_APPROVAL' &&
            !project.beyondOwnerScope && (
              <button
                type="button"
                className="btn"
                onClick={() => {
                  const r = missionService.approveProject(
                    project.id,
                    account.personId,
                    roles,
                  );
                  setMsg(
                    r.ok
                      ? 'Approved — PLANNED (setup)'
                      : (r.reason ?? 'Failed'),
                  );
                  refresh();
                }}
              >
                Approve → SETUP
              </button>
            )}
          {canManage && project.status === 'PLANNED' && (
            <button
              type="button"
              className="btn"
              onClick={() => {
                const r = missionService.startProject(project.id);
                setMsg(
                  r.ok
                    ? [
                        r.gap
                          ? `Running — funding gap still ${r.gap.toLocaleString()} RWF`
                          : 'Project started — ACTIVE',
                        r.openRequired
                          ? `(${r.openRequired} required delivery still open)`
                          : '',
                      ]
                        .filter(Boolean)
                        .join(' ')
                    : (r.reason ?? 'Failed'),
                );
                refresh();
              }}
            >
              Start running
            </button>
          )}
          {canManage && project.status === 'ACTIVE' && (
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                const r = missionService.pauseProject(project.id);
                setMsg(r.ok ? 'Project paused' : (r.reason ?? 'Failed'));
                refresh();
              }}
            >
              Pause
            </button>
          )}
          {canManage && project.status === 'PAUSED' && (
            <button
              type="button"
              className="btn"
              onClick={() => {
                const r = missionService.resumeProject(project.id);
                setMsg(r.ok ? 'Project resumed — ACTIVE' : (r.reason ?? 'Failed'));
                refresh();
              }}
            >
              Resume
            </button>
          )}
        </div>
      </div>

      {project.beyondOwnerScope && (
        <div className="panel">
          <h3>Approval chain</h3>
          <ApprovalStepper
            completeHint="All levels approved — project enters SETUP (PLANNED)."
            steps={chain.map((level) => {
              const done = (project.approvals ?? []).some(
                (a) => a.levelKey === level.levelKey,
              );
              const canHere = canApproveScopeLevel(level, roles, positions);
              const approver = (project.approvals ?? []).find(
                (a) => a.levelKey === level.levelKey,
              );
              return {
                key: level.levelKey,
                label: level.label,
                done,
                detail:
                  done && approver ? personName(approver.personId) : undefined,
                action:
                  !done && canHere ? (
                    <button
                      type="button"
                      className="btn"
                      onClick={() => doApproveLevel(level.levelKey)}
                    >
                      Approve
                    </button>
                  ) : undefined,
              };
            })}
          />
        </div>
      )}

      {canManage && !closed && (
        <div className="panel">
          <h3>Parent programme</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            Nest this season/cohort under an ongoing programme.
          </p>
          <form className="row" onSubmit={doLinkProgram}>
            <select
              value={linkProgramId || project.programId || ''}
              onChange={(e) => setLinkProgramId(e.target.value)}
            >
              <option value="">No parent programme</option>
              {standingPrograms.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button type="submit" className="btn ghost">
              Save link
            </button>
          </form>
        </div>
      )}

      <StewardshipPanel
        kind="PROJECT"
        id={project.id}
        canEdit={canManage && !closed}
        personId={account.personId}
        defaultFundId={project.fundId}
        closeOpen={closeOpen}
        onCloseOpenChange={setCloseOpen}
        openTaskCount={openTasks.length}
        onChanged={() => {
          refresh();
          setMsg('Stewardship updated');
        }}
      />

      <div className="panel">
        <h3>Linked events</h3>
        {linkedEvents.length === 0 ? (
          <p className="muted">No events linked to this project yet.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
            {linkedEvents.map((ev) => (
              <li key={ev.id}>
                <Link to={`/events/${ev.id}`}>{ev.name}</Link>
                <span className="muted">
                  {' '}
                  · {new Date(ev.startsAt).toLocaleDateString()} · {ev.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="panel">
        <h3>Collaborators (one shared project)</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Owning system plus collaborating systems/people — not duplicate
          projects per system.
        </p>
        <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
          <li>
            <strong>{owner?.shortName}</strong> — owner
          </li>
          {(project.collaboratorSystemIds ?? []).map((sid) => (
            <li key={sid}>
              {systemsService.getById(sid)?.shortName ?? sid} — system
            </li>
          ))}
          {(project.collaboratorPersonIds ?? []).map((pid) => (
            <li key={pid}>{personName(pid)} — person</li>
          ))}
        </ul>
        {canManage && !closed && (
          <div className="stack" style={{ marginTop: '0.75rem' }}>
            <form className="row" onSubmit={doAddSys}>
              <select
                value={addSys}
                onChange={(e) => setAddSys(e.target.value as SystemId | '')}
              >
                <option value="">Add system…</option>
                {systems.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.shortName}
                  </option>
                ))}
              </select>
              <button type="submit" className="btn" disabled={!addSys}>
                Add system
              </button>
            </form>
            <form className="row" onSubmit={doAddPerson}>
              <select
                value={addPerson}
                onChange={(e) => setAddPerson(e.target.value)}
              >
                <option value="">Add person…</option>
                {people
                  .filter(
                    (p) =>
                      !(project.collaboratorPersonIds ?? []).includes(p.id),
                  )
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.preferredName ?? p.fullName}
                    </option>
                  ))}
              </select>
              <button type="submit" className="btn" disabled={!addPerson}>
                Add person
              </button>
            </form>
          </div>
        )}
      </div>

      <div className="panel">
        <h3>Linked open tasks</h3>
        {openTasks.length === 0 ? (
          <p className="muted">No open tasks linked to this project.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
            {openTasks.map((t) => (
              <li key={t.id}>
                <Link to={`/tasks/${t.id}`}>{t.title}</Link>
                <span className="muted"> · {t.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {canManage && !closed && project.status === 'ACTIVE' && (
        <div className="panel">
          <h3>Close</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            Enter CLOSING first — finish required delivery and money honesty,
            then complete the close-out report.
          </p>
          <div className="row">
            <button
              type="button"
              className="btn"
              onClick={() => {
                const r = missionService.beginCloseProject(project.id);
                setMsg(
                  r.ok
                    ? 'Entered CLOSING — finish checklist'
                    : (r.reason ?? 'Failed'),
                );
                setCloseOpen(true);
                refresh();
              }}
            >
              Begin close-out
            </button>
            <button type="button" className="btn ghost" onClick={doCancel}>
              Cancel project
            </button>
          </div>
        </div>
      )}
      {canManage && !closed && project.status === 'PAUSED' && (
        <div className="panel">
          <h3>Paused</h3>
          <div className="row">
            <button
              type="button"
              className="btn"
              onClick={() => {
                missionService.resumeProject(project.id);
                refresh();
              }}
            >
              Resume
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                missionService.beginCloseProject(project.id);
                setCloseOpen(true);
                refresh();
              }}
            >
              Begin close-out
            </button>
            <button type="button" className="btn ghost" onClick={doCancel}>
              Cancel project
            </button>
          </div>
        </div>
      )}
      {canManage && !closed && project.status === 'CLOSING' && (
        <div className="panel">
          <h3>Closing</h3>
          <p className="steward-banner warn" style={{ marginTop: 0 }}>
            In CLOSING — complete the stewardship report, or resume running.
          </p>
          <div className="row">
            <button
              type="button"
              className="btn"
              onClick={() => setCloseOpen(true)}
            >
              Finish close-out…
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                const r = missionService.abandonCloseProject(project.id);
                setMsg(r.ok ? 'Resumed ACTIVE' : (r.reason ?? 'Failed'));
                refresh();
              }}
            >
              Resume running
            </button>
            <button type="button" className="btn ghost" onClick={doCancel}>
              Cancel project
            </button>
          </div>
        </div>
      )}
      {canManage &&
        !closed &&
        project.status !== 'ACTIVE' &&
        project.status !== 'CLOSING' &&
        project.status !== 'PAUSED' && (
          <div className="panel">
            <button type="button" className="btn ghost" onClick={doCancel}>
              Cancel project
            </button>
          </div>
        )}
    </div>
  );
}
