import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApprovalStepper } from '../components/ui/ApprovalStepper';
import { StatusPill } from '../components/ui/StatusPill';
import { canApproveEventLevel } from '../domain/eventScope';
import { eventTypeLabel } from '../domain/permissions';
import { PEOPLE } from '../data/seed';
import { missionService, systemsService } from '../services';

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { can, account, positions, roles, refreshSession } = useAuth();
  const [, setTick] = useState(0);
  const refresh = () => {
    setTick((t) => t + 1);
    refreshSession();
  };
  const [msg, setMsg] = useState('');
  const [nextPersonId, setNextPersonId] = useState('');
  const [enrollProgram, setEnrollProgram] = useState(true);

  const [collabSys, setCollabSys] = useState('');
  const [collabPerson, setCollabPerson] = useState('');
  const [linkProjectId, setLinkProjectId] = useState('');

  const event = id ? missionService.getEvent(id) : null;
  if (!account || !can('EVENT', 'VIEW')) {
    return (
      <div className="panel">
        <p className="muted">No access.</p>
        <Link to="/events">← Events</Link>
      </div>
    );
  }
  if (!event) {
    return (
      <div className="panel">
        <p>Event not found.</p>
        <Link to="/events">← Events</Link>
      </div>
    );
  }

  const owner = systemsService.getById(event.ownerSystemId);
  const chain = missionService.eventApprovalChain(event.id);
  const regs = missionService.listEventRegistrations(event.id);
  const myReg = regs.find(
    (r) => r.personId === account.personId && r.status !== 'CANCELLED',
  );
  const canManage = can('EVENT', 'MANAGE');
  const openForReg =
    event.status === 'CONFIRMED' || event.status === 'PLANNED';
  const regMode = event.registrationMode ?? 'ANNOUNCEMENT_ONLY';

  const activePrograms = missionService
    .listPrograms({ viewerSystemId: 'sys-main' })
    .filter((p) => p.status === 'ACTIVE');

  function personName(pid: string) {
    const p = PEOPLE.find((x) => x.id === pid);
    return p?.preferredName ?? p?.fullName ?? pid;
  }

  function doApprove(levelKey: string) {
    const r = missionService.approveEventLevel({
      eventId: event!.id,
      levelKey,
      personId: account!.personId,
      positions,
      roles,
    });
    setMsg(r.ok ? 'Approval recorded' : (r.reason ?? 'Failed'));
    refresh();
  }

  function doRegister() {
    const r = missionService.registerForEvent({
      eventId: event!.id,
      personId: account!.personId,
    });
    setMsg(r.ok ? `Registered (${r.registration?.status})` : (r.reason ?? 'Failed'));
    refresh();
  }

  function doAttend(personId: string, attended: boolean) {
    const r = missionService.markEventAttendance({
      eventId: event!.id,
      personId,
      attended,
    });
    setMsg(r.ok ? (attended ? 'Marked attended' : 'Marked no-show') : (r.reason ?? 'Failed'));
    refresh();
  }

  function doComplete() {
    missionService.completeEvent(event!.id);
    setMsg('Event completed — apply next steps below');
    refresh();
  }

  function doNextSteps() {
    if (!nextPersonId) return;
    const suggestBaptism =
      event!.type === 'BAPTISM' && enrollProgram
        ? 'prg-baptism-standing'
        : undefined;
    const r = missionService.applyEventNextSteps({
      personId: nextPersonId,
      eventId: event!.id,
      enrollProgramId: suggestBaptism,
      createFollowUpTask: {
        title: `Follow up after ${event!.name}: ${personName(nextPersonId)}`,
        ownerPersonId: account!.personId,
      },
    });
    setMsg(
      r.ok
        ? `Next steps applied${
            suggestBaptism ? ' · enrolled in Baptism class' : ''
          } · follow-up task created`
        : (r.reason ?? 'Failed'),
    );
    refresh();
  }

  const activeRegs = regs.filter(
    (r) => r.status === 'REGISTERED' || r.status === 'ATTENDED',
  ).length;
  const capPct =
    event.capacity && event.capacity > 0
      ? Math.min(100, Math.round((activeRegs / event.capacity) * 100))
      : 0;

  const primaryCta =
    event.beyondOwnerScope &&
    event.status === 'PENDING_APPROVAL' &&
    chain.some(
      (level) =>
        !(event.approvals ?? []).some((a) => a.levelKey === level.levelKey) &&
        canApproveEventLevel(level, roles, positions),
    )
      ? { label: 'Review approvals', scroll: 'approvals' }
      : regMode === 'REGISTRATION_REQUIRED' &&
          openForReg &&
          (!myReg || myReg.status === 'CANCELLED')
        ? { label: 'Register myself', action: doRegister }
        : null;

  return (
    <div className="stack">
      <p>
        <Link to="/events">← Events</Link>
      </p>
      {msg && <p className="badge">{msg}</p>}

      <div className="detail-hero">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <p className="hero-kicker">
              {eventTypeLabel(event.type)} · {owner?.shortName ?? owner?.name} ·{' '}
              {event.beyondOwnerScope ? 'Beyond scope' : 'In-scope'}
            </p>
            <h2>{event.name}</h2>
          </div>
          <StatusPill status={event.status}>{event.status}</StatusPill>
        </div>
        <p className="hero-when">
          {new Date(event.startsAt).toLocaleString()}
          {event.location ? ` · ${event.location}` : ''}
        </p>
        {event.description && (
          <p className="muted" style={{ marginBottom: 0 }}>
            {event.description}
          </p>
        )}
        <div className="row" style={{ marginTop: '0.75rem' }}>
          <span className="badge">
            {regMode === 'REGISTRATION_REQUIRED'
              ? 'Registration required'
              : 'Announcement only'}
          </span>
          {event.seriesLabel && (
            <span className="badge">Series: {event.seriesLabel}</span>
          )}
          {primaryCta &&
            ('action' in primaryCta && primaryCta.action ? (
              <button type="button" className="btn" onClick={primaryCta.action}>
                {primaryCta.label}
              </button>
            ) : (
              <a href="#approvals" className="btn">
                {primaryCta.label}
              </a>
            ))}
        </div>
        {regMode === 'REGISTRATION_REQUIRED' && event.capacity != null && (
          <div className="capacity-meter">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="muted" style={{ fontSize: '0.85rem' }}>
                Capacity
              </span>
              <strong style={{ fontSize: '0.9rem' }}>
                {activeRegs} / {event.capacity}
              </strong>
            </div>
            <div className="track" style={{ marginTop: '0.35rem' }}>
              <div className="fill" style={{ width: `${capPct}%` }} />
            </div>
          </div>
        )}
      </div>

      <div className="panel stack">
        <h3 style={{ margin: 0 }}>Lifecycle</h3>
        <p className="muted" style={{ margin: 0 }}>
          Prepare → deliver → close. Current:{' '}
          <strong>{event.lifecyclePhase ?? 'PREPARE'}</strong>
        </p>
        <div className="row">
          {(['PREPARE', 'DELIVER', 'CLOSE'] as const).map((phase) => (
            <button
              key={phase}
              type="button"
              className={`btn ${
                (event.lifecyclePhase ?? 'PREPARE') === phase ? '' : 'ghost'
              }`}
              disabled={!canManage}
              onClick={() => {
                const r = missionService.setEventLifecycle(event.id, phase);
                setMsg(
                  r.ok
                    ? phase === 'CLOSE'
                      ? 'Event closed'
                      : `Phase → ${phase}`
                    : (r.reason ?? 'Failed'),
                );
                refresh();
              }}
            >
              {phase}
            </button>
          ))}
        </div>
      </div>

      <div className="panel stack">
        <h3 style={{ margin: 0 }}>Collaborators</h3>
        <p className="muted" style={{ margin: 0 }}>
          Peer systems and people helping run this event (like projects).
        </p>
        <div className="row" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
          {(event.collaboratorSystemIds ?? []).map((sid) => (
            <span key={sid} className="badge">
              {systemsService.getById(sid)?.shortName ?? sid}
            </span>
          ))}
          {(event.collaboratorPersonIds ?? []).map((pid) => (
            <span key={pid} className="badge">
              {personName(pid)}
            </span>
          ))}
          {!event.collaboratorSystemIds?.length &&
            !event.collaboratorPersonIds?.length && (
              <span className="muted">None yet</span>
            )}
        </div>
        {canManage && (
          <div className="row">
            <select
              value={collabSys}
              onChange={(e) => setCollabSys(e.target.value)}
            >
              <option value="">Add system…</option>
              {systemsService
                .list()
                .filter(
                  (s) =>
                    s.id !== 'sys-main' && s.id !== event.ownerSystemId,
                )
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.shortName}
                  </option>
                ))}
            </select>
            <button
              type="button"
              className="btn secondary"
              disabled={!collabSys}
              onClick={() => {
                missionService.addEventCollaboratorSystem(
                  event.id,
                  collabSys as typeof event.ownerSystemId,
                );
                setCollabSys('');
                setMsg('Collaborator system added');
                refresh();
              }}
            >
              Add system
            </button>
            <select
              value={collabPerson}
              onChange={(e) => setCollabPerson(e.target.value)}
            >
              <option value="">Add person…</option>
              {PEOPLE.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.preferredName || p.fullName}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn secondary"
              disabled={!collabPerson}
              onClick={() => {
                missionService.addEventCollaboratorPerson(
                  event.id,
                  collabPerson,
                );
                setCollabPerson('');
                setMsg('Collaborator person added');
                refresh();
              }}
            >
              Add person
            </button>
          </div>
        )}
        {event.programId && (
          <p className="muted" style={{ marginBottom: 0 }}>
            Linked program:{' '}
            <Link to={`/programs/${event.programId}`}>
              {missionService.getProgram(event.programId)?.name ??
                event.programId}
            </Link>
          </p>
        )}
        {event.projectId && (
          <p className="muted" style={{ marginBottom: 0 }}>
            Linked project:{' '}
            <Link to={`/projects/${event.projectId}`}>
              {missionService.getProject(event.projectId)?.name ??
                event.projectId}
            </Link>
          </p>
        )}
        {canManage && (
          <form
            className="row"
            style={{ marginTop: '0.5rem' }}
            onSubmit={(e) => {
              e.preventDefault();
              const r = missionService.linkEventToProject(
                event.id,
                linkProjectId || null,
              );
              setMsg(
                r.ok
                  ? linkProjectId
                    ? 'Linked to project (+ planned delivery)'
                    : 'Project link cleared'
                  : (r.reason ?? 'Failed'),
              );
              refresh();
            }}
          >
            <select
              value={linkProjectId || event.projectId || ''}
              onChange={(e) => setLinkProjectId(e.target.value)}
            >
              <option value="">No project</option>
              {missionService
                .listProjects({ viewerSystemId: event.ownerSystemId })
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
            <button type="submit" className="btn ghost">
              Save project link
            </button>
          </form>
        )}
      </div>

      {event.beyondOwnerScope && (
        <div className="panel" id="approvals">
          <h3>Approval chain</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            Every level must approve before the event is confirmed.
          </p>
          <ApprovalStepper
            completeHint="All levels approved — event is confirmed."
            steps={chain.map((level) => {
              const done = (event.approvals ?? []).some(
                (a) => a.levelKey === level.levelKey,
              );
              const canHere = canApproveEventLevel(level, roles, positions);
              const approver = (event.approvals ?? []).find(
                (a) => a.levelKey === level.levelKey,
              );
              return {
                key: level.levelKey,
                label: level.label,
                done,
                detail: done && approver ? personName(approver.personId) : undefined,
                action:
                  !done && canHere ? (
                    <button
                      type="button"
                      className="btn"
                      onClick={() => doApprove(level.levelKey)}
                    >
                      Approve
                    </button>
                  ) : undefined,
              };
            })}
          />
        </div>
      )}

      {regMode === 'REGISTRATION_REQUIRED' && openForReg && (
        <div className="panel">
          <h3>Registration</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            {
              regs.filter(
                (r) => r.status === 'REGISTERED' || r.status === 'ATTENDED',
              ).length
            }
            {event.capacity ? ` / ${event.capacity}` : ''} registered
          </p>
          {!myReg ? (
            <button type="button" className="btn" onClick={doRegister}>
              Register myself
            </button>
          ) : (
            <p className="badge">You are {myReg.status.toLowerCase()}</p>
          )}
          {regs.length > 0 && (
            <table className="table" style={{ marginTop: '0.75rem' }}>
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Status</th>
                  <th>Attended</th>
                  {canManage && <th />}
                </tr>
              </thead>
              <tbody>
                {regs.map((r) => (
                  <tr key={r.id}>
                    <td>{personName(r.personId)}</td>
                    <td>{r.status}</td>
                    <td>{r.attendedAt ? 'Yes' : '—'}</td>
                    {canManage && (
                      <td>
                        {r.status !== 'CANCELLED' &&
                          r.status !== 'ATTENDED' && (
                            <button
                              type="button"
                              className="btn ghost"
                              onClick={() => doAttend(r.personId, true)}
                            >
                              Mark attended
                            </button>
                          )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {canManage && event.status === 'CONFIRMED' && (
        <div className="panel">
          <h3>Complete event</h3>
          <button type="button" className="btn" onClick={doComplete}>
            Mark completed
          </button>
        </div>
      )}

      {event.status === 'COMPLETED' && canManage && (
        <div className="panel">
          <h3>Option B — guided next steps</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            After attendance, suggest follow-up (e.g. Baptism → Baptism class).
            Creates a Church-scope follow-up task for you.
          </p>
          {event.type === 'BAPTISM' && (
            <label className="row">
              <input
                type="checkbox"
                checked={enrollProgram}
                onChange={(e) => setEnrollProgram(e.target.checked)}
              />
              Enroll in Baptism class ({activePrograms.find((p) => p.id === 'prg-baptism-standing')?.name ?? 'standing'})
            </label>
          )}
          <div className="row">
            <select
              value={nextPersonId}
              onChange={(e) => setNextPersonId(e.target.value)}
            >
              <option value="">Select person…</option>
              {regs
                .filter((r) => r.status === 'ATTENDED' || r.attendedAt)
                .map((r) => (
                  <option key={r.id} value={r.personId}>
                    {personName(r.personId)}
                  </option>
                ))}
              {regs.filter((r) => r.status === 'ATTENDED' || r.attendedAt)
                .length === 0 &&
                regs.map((r) => (
                  <option key={r.id} value={r.personId}>
                    {personName(r.personId)}
                  </option>
                ))}
            </select>
            <button
              type="button"
              className="btn"
              disabled={!nextPersonId}
              onClick={doNextSteps}
            >
              Apply next steps
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
