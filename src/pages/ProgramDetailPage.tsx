import { type FormEvent, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { StewardshipPanel } from '../components/StewardshipPanel';
import { StatusPill } from '../components/ui/StatusPill';
import {
  confirmedFundingTotal,
  formatRwf,
  fundingGap,
} from '../domain/stewardship';
import type { AttendanceStatus, MembershipType } from '../domain/types';
import {
  isChurchLeadership,
  missionService,
  peopleService,
  systemsService,
} from '../services';

export function ProgramDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { account, can, roles, refreshSession } = useAuth();
  const [, setTick] = useState(0);
  const refresh = () => {
    setTick((t) => t + 1);
    refreshSession();
  };
  const [msg, setMsg] = useState('');
  const [closeOpen, setCloseOpen] = useState(false);

  const program = id ? missionService.getProgram(id) : null;
  const canView = can('PROGRAM', 'VIEW');
  const canManageOutside = can('PROGRAM', 'MANAGE');
  const canRecord = can('ACTIVITY', 'RECORD_ATTENDANCE');
  const churchLead = isChurchLeadership(roles);

  const [enrollPersonId, setEnrollPersonId] = useState('');
  const [enrollRoleKey, setEnrollRoleKey] = useState('PARTICIPANT');
  const [sessTitle, setSessTitle] = useState('');
  const [sessAt, setSessAt] = useState('2026-09-21T15:00');
  const [sessLoc, setSessLoc] = useState('');
  const [customRoleKey, setCustomRoleKey] = useState('');
  const [customRoleLabel, setCustomRoleLabel] = useState('');

  /** Option B panel for a completed enrollment */
  const [completeId, setCompleteId] = useState<string | null>(null);
  const [issueCert, setIssueCert] = useState(true);
  const [addMem, setAddMem] = useState(false);
  const [memType, setMemType] = useState<MembershipType>('CHURCH_MEMBER');
  const [doBaptism, setDoBaptism] = useState(false);
  const [bapDate, setBapDate] = useState('2026-09-08');
  const [bapPlace, setBapPlace] = useState('ADEPR Kacyiru');
  const [tab, setTab] = useState<
    'roster' | 'sessions' | 'about' | 'roles' | 'stewardship'
  >('roster');

  if (!account || !canView) {
    return (
      <div className="panel">
        <p className="error">No access</p>
        <Link to="/programs">Back</Link>
      </div>
    );
  }
  if (!program) {
    return (
      <div className="panel">
        <h2>Program not found</h2>
        <Link to="/programs">Back</Link>
      </div>
    );
  }

  const programRoles = missionService.ensureProgramRoles(program.id);
  const myRole = missionService.enrollmentRole(program.id, account.personId);
  const insideOpen = program.status === 'ACTIVE';
  const canManageEnroll =
    (insideOpen &&
      missionService.canInProgram(
        program.id,
        account.personId,
        'MANAGE_ENROLL',
      )) ||
    (!insideOpen && canManageOutside) ||
    canManageOutside;
  const canManageSessions =
    (insideOpen &&
      missionService.canInProgram(
        program.id,
        account.personId,
        'MANAGE_SESSIONS',
      )) ||
    canRecord ||
    canManageOutside;
  const canClose =
    missionService.canInProgram(program.id, account.personId, 'CLOSE_PROGRAM') ||
    canManageOutside;
  const canManageRoles =
    missionService.canInProgram(program.id, account.personId, 'MANAGE_ROLES') ||
    canManageOutside;

  const parent = program.parentProgramId
    ? missionService.getProgram(program.parentProgramId)
    : null;
  const cohorts = missionService.cohortsOf(program.id);
  const childProjects = missionService.projectsForProgram(program.id);
  const enrollments = missionService.listEnrollments(program.id);
  const activities = missionService.activitiesForProgram(program.id);
  const people = peopleService.list();
  const poolSystems = missionService.audiencePoolSystems(program.ownerSystemId);
  const planned = Number(program.plannedCost) || 0;
  const confirmed = confirmedFundingTotal(program);
  const gap = fundingGap(program);

  function onSubmitApproval() {
    const r = missionService.submitProgramForApproval(program!.id);
    setMsg(r.ok ? 'Submitted for approval' : (r.reason ?? 'Failed'));
    refresh();
  }

  function onApprove() {
    const r = missionService.approveProgram(
      program!.id,
      account!.personId,
      roles,
    );
    setMsg(r.ok ? 'Approved — SETUP (prep before run)' : (r.reason ?? 'Failed'));
    refresh();
  }

  function onEnd() {
    const r = missionService.beginCloseProgram(program!.id);
    if (r.ok) setCloseOpen(true);
    else setMsg(r.reason ?? 'Failed');
    refresh();
  }

  function onEnroll(e: FormEvent) {
    e.preventDefault();
    if (!enrollPersonId) return;
    const roleDef = programRoles.find((r) => r.key === enrollRoleKey);
    const r = missionService.enroll({
      programId: program!.id,
      personId: enrollPersonId,
      roleKey: enrollRoleKey,
      role: roleDef?.isStaff ? 'LEADER' : 'PARTICIPANT',
      asStaff: !!roleDef?.isStaff,
    });
    setMsg(r.ok ? 'Enrolled' : (r.reason ?? 'Failed'));
    setEnrollPersonId('');
    refresh();
  }

  function onAddSession(e: FormEvent) {
    e.preventDefault();
    const r = missionService.createActivity({
      programId: program!.id,
      title: sessTitle || `Session ${sessAt}`,
      startsAt: new Date(sessAt).toISOString(),
      location: sessLoc || undefined,
    });
    setMsg(r.ok ? 'Session added' : (r.reason ?? 'Failed'));
    setSessTitle('');
    refresh();
  }

  function markAttend(
    activityId: string,
    personId: string,
    status: AttendanceStatus,
  ) {
    missionService.recordAttendance({ activityId, personId, status });
    setMsg(`Attendance: ${status}`);
    refresh();
  }

  function runComplete(e: FormEvent) {
    e.preventDefault();
    if (!completeId) return;
    const r = missionService.completeEnrollment({
      enrollmentId: completeId,
      issueCertificate: issueCert,
      nextSteps: {
        addMembershipType: addMem ? memType : undefined,
        membershipLabel: addMem ? 'Church member' : undefined,
        updateBaptism: doBaptism
          ? { baptizedOn: bapDate, place: bapPlace }
          : undefined,
      },
    });
    setMsg(
      r.ok
        ? 'Completed — timeline/certificate saved; confirmed next steps applied'
        : (r.reason ?? 'Failed'),
    );
    setCompleteId(null);
    setAddMem(false);
    setDoBaptism(false);
    refresh();
  }

  return (
    <div className="stack">
      <div className="panel">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <p className="muted" style={{ margin: 0 }}>
              <Link to="/programs">← Programs</Link>
            </p>
            <h2 style={{ margin: '0.35rem 0' }}>{program.name}</h2>
            <p className="muted" style={{ margin: 0 }}>
              {program.description}
            </p>
          </div>
          <div className="row">
            <StatusPill status={program.status}>{program.status}</StatusPill>
            {program.programType && (
              <span className="badge">{program.programType}</span>
            )}
            {program.cohortLabel && (
              <span className="badge">{program.cohortLabel}</span>
            )}
          </div>
        </div>
        <p className="muted">
          Owner:{' '}
          {systemsService.getById(program.ownerSystemId)?.shortName ??
            program.ownerSystemId}
          {parent ? (
            <>
              {' '}
              · Under{' '}
              <Link to={`/programs/${parent.id}`}>{parent.name}</Link>
            </>
          ) : null}
          {program.scheduleHint ? ` · ${program.scheduleHint}` : ''}
        </p>
        {myRole && (
          <p className="badge" style={{ marginTop: '0.5rem' }}>
            Your program role: {myRole.label}
            {myRole.isStaff ? ' (staff)' : ''}
          </p>
        )}
        <div className="row">
          {canManageOutside && program.status === 'DRAFT' && (
            <button type="button" className="btn" onClick={onSubmitApproval}>
              Submit for approval
            </button>
          )}
          {churchLead &&
            (program.status === 'PENDING_APPROVAL' ||
              program.status === 'DRAFT') && (
              <button type="button" className="btn" onClick={onApprove}>
                Approve → SETUP
              </button>
            )}
          {canManageOutside && program.status === 'SETUP' && (
            <button
              type="button"
              className="btn"
              onClick={() => {
                const r = missionService.startProgram(program.id);
                setMsg(
                  r.ok
                    ? [
                        r.gap
                          ? `Running — funding gap still ${r.gap.toLocaleString()} RWF`
                          : 'Program started — ACTIVE',
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
          {canManageOutside && program.status === 'ACTIVE' && (
            <>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  missionService.pauseProgram(program.id);
                  refresh();
                }}
              >
                Pause
              </button>
              {canClose && (
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => {
                    setTab('stewardship');
                    onEnd();
                  }}
                >
                  Begin close-out
                </button>
              )}
            </>
          )}
          {canClose && program.status === 'CLOSING' && (
            <>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setTab('stewardship');
                  setCloseOpen(true);
                }}
              >
                Finish close-out…
              </button>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  const r = missionService.abandonCloseProgram(program.id);
                  setMsg(r.ok ? 'Resumed ACTIVE' : (r.reason ?? 'Failed'));
                  refresh();
                }}
              >
                Resume running
              </button>
            </>
          )}
          {canManageOutside && program.status === 'PAUSED' && (
            <>
              <button type="button" className="btn" onClick={onSubmitApproval}>
                Re-submit / resume path
              </button>
              {canClose && (
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => {
                    setTab('stewardship');
                    onEnd();
                  }}
                >
                  Begin close-out
                </button>
              )}
            </>
          )}
        </div>
        {program.status === 'CLOSING' && (
          <p className="steward-banner warn" style={{ marginTop: '0.75rem' }}>
            In CLOSING — complete the stewardship report, or resume running.
          </p>
        )}
        {planned > 0 && (
          <div className="grant-callout" style={{ marginTop: '0.75rem' }}>
            <strong>Stewardship snapshot</strong>
            <p className="muted" style={{ margin: '0.35rem 0 0' }}>
              Planned {formatRwf(planned)} · confirmed {formatRwf(confirmed)} ·
              gap {formatRwf(Math.max(0, gap))}
              {(program.deliveryItems ?? []).length
                ? ` · ${(program.deliveryItems ?? []).filter((d) => d.tier === 'REQUIRED').length} required delivery`
                : ''}
            </p>
          </div>
        )}
      </div>

      {msg && <p className="badge">{msg}</p>}

      {cohorts.length > 0 && (
        <div className="panel">
          <h3>Cohorts under this standing program</h3>
          <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
            {cohorts.map((c) => (
              <li key={c.id}>
                <Link to={`/programs/${c.id}`}>{c.name}</Link>{' '}
                <span className="muted">
                  {c.cohortLabel} · {c.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {childProjects.length > 0 && (
        <div className="panel">
          <h3>Projects under this programme</h3>
          <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
            {childProjects.map((p) => (
              <li key={p.id}>
                <Link to={`/projects/${p.id}`}>{p.name}</Link>{' '}
                <span className="muted">· {p.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="row">
        <button
          type="button"
          className={`btn ${tab === 'roster' ? '' : 'ghost'}`}
          onClick={() => setTab('roster')}
        >
          Roster ({enrollments.length})
        </button>
        <button
          type="button"
          className={`btn ${tab === 'sessions' ? '' : 'ghost'}`}
          onClick={() => setTab('sessions')}
        >
          Sessions ({activities.length})
        </button>
        <button
          type="button"
          className={`btn ${tab === 'stewardship' ? '' : 'ghost'}`}
          onClick={() => setTab('stewardship')}
        >
          Stewardship
        </button>
        <button
          type="button"
          className={`btn ${tab === 'about' ? '' : 'ghost'}`}
          onClick={() => setTab('about')}
        >
          About
        </button>
        <button
          type="button"
          className={`btn ${tab === 'roles' ? '' : 'ghost'}`}
          onClick={() => setTab('roles')}
        >
          Roles ({programRoles.length})
        </button>
      </div>

      {(tab === 'stewardship' || closeOpen || !!program.closeout) && (
        <StewardshipPanel
          kind="PROGRAM"
          id={program.id}
          canEdit={canManageOutside || canClose}
          personId={account.personId}
          defaultFundId="fund-youth"
          closeOpen={closeOpen}
          onCloseOpenChange={setCloseOpen}
          onChanged={() => {
            refresh();
            setMsg('Stewardship updated');
          }}
        />
      )}

      {tab === 'about' && (
        <div className="panel stack">
          <h3 style={{ margin: 0 }}>About</h3>
          <p style={{ marginTop: 0 }}>
            {program.description || 'No description.'}
          </p>
          <p className="muted" style={{ marginBottom: 0 }}>
            Visibility {program.visibility}
            {program.scheduleHint ? ` · ${program.scheduleHint}` : ''}
          </p>
          <div>
            <h4 style={{ marginBottom: '0.35rem' }}>Audience pool</h4>
            <p className="muted" style={{ marginTop: 0 }}>
              Owner system + descendants:{' '}
              {poolSystems
                .map((sid) => systemsService.getById(sid)?.shortName ?? sid)
                .join(', ')}
            </p>
            <p className="muted">
              Membership in the pool alone does not grant see/join — eligibility
              still applies.
            </p>
          </div>
          {program.eligibility && (
            <div>
              <h4 style={{ marginBottom: '0.35rem' }}>Eligibility</h4>
              <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                {program.eligibility.minAge != null && (
                  <li>Min age {program.eligibility.minAge}</li>
                )}
                {program.eligibility.maxAge != null && (
                  <li>Max age {program.eligibility.maxAge}</li>
                )}
                {program.eligibility.requireMarried && <li>Married required</li>}
                {program.eligibility.requireInviteOnly && (
                  <li>Invite only</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      {tab === 'roles' && (
        <div className="panel stack">
          <h3 style={{ margin: 0 }}>Program roles</h3>
          <p className="muted" style={{ margin: 0 }}>
            Inside this open program, permissions follow these roles — not system
            office.
          </p>
          <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
            {programRoles.map((r) => (
              <li key={r.key}>
                <strong>{r.label}</strong> ({r.key})
                {r.isStaff ? ' · staff' : ''} — {r.permissions.join(', ')}
              </li>
            ))}
          </ul>
          {canManageRoles && (
            <form
              className="row"
              onSubmit={(e) => {
                e.preventDefault();
                if (!customRoleKey.trim() || !customRoleLabel.trim()) return;
                const r = missionService.addProgramRole(program.id, {
                  key: customRoleKey.trim().toUpperCase().replace(/\s+/g, '_'),
                  label: customRoleLabel.trim(),
                  permissions: ['PARTICIPATE', 'VIEW_ROSTER'],
                });
                setMsg(r.ok ? 'Role added' : (r.reason ?? 'Failed'));
                setCustomRoleKey('');
                setCustomRoleLabel('');
                refresh();
              }}
            >
              <input
                placeholder="Key (e.g. MENTOR)"
                value={customRoleKey}
                onChange={(e) => setCustomRoleKey(e.target.value)}
                required
              />
              <input
                placeholder="Label"
                value={customRoleLabel}
                onChange={(e) => setCustomRoleLabel(e.target.value)}
                required
              />
              <button type="submit" className="btn">
                Add custom role
              </button>
            </form>
          )}
        </div>
      )}

      {tab === 'roster' && (
      <div className="panel">
        <h3>Roster</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Person</th>
              <th>Role</th>
              <th>Status</th>
              <th>Enrolled</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {enrollments.length === 0 ? (
              <tr>
                <td colSpan={5} className="muted">
                  No enrollments
                </td>
              </tr>
            ) : (
              enrollments.map((en) => (
                <tr key={en.id}>
                  <td>
                    {peopleService.getById(en.personId)?.preferredName ??
                      en.personId}
                  </td>
                  <td>{en.roleKey ?? en.role}</td>
                  <td>{en.status}</td>
                  <td>{en.enrolledOn}</td>
                  <td>
                    {canManageEnroll && en.status === 'ACTIVE' && (
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => setCompleteId(en.id)}
                      >
                        Complete…
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {canManageEnroll &&
          (program.status === 'ACTIVE' ||
            program.status === 'PENDING_APPROVAL') && (
            <form className="row" onSubmit={onEnroll} style={{ marginTop: '0.75rem' }}>
              <select
                value={enrollPersonId}
                onChange={(e) => setEnrollPersonId(e.target.value)}
                required
              >
                <option value="">Add person…</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.preferredName || p.fullName}
                  </option>
                ))}
              </select>
              <select
                value={enrollRoleKey}
                onChange={(e) => setEnrollRoleKey(e.target.value)}
              >
                {programRoles.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.label}
                  </option>
                ))}
              </select>
              <button type="submit" className="btn">
                Enroll
              </button>
            </form>
          )}
      </div>
      )}

      {tab === 'roster' && completeId && (
        <div className="panel">
          <h3>Complete enrollment — Option B</h3>
          <p className="muted">
            Always writes timeline (+ certificate if checked). Extra steps only
            if you confirm below.
          </p>
          <form className="stack" onSubmit={runComplete}>
            <label className="row">
              <input
                type="checkbox"
                checked={issueCert}
                onChange={(e) => setIssueCert(e.target.checked)}
              />
              Issue certificate document
            </label>
            <label className="row">
              <input
                type="checkbox"
                checked={addMem}
                onChange={(e) => setAddMem(e.target.checked)}
              />
              Add membership
            </label>
            {addMem && (
              <select
                value={memType}
                onChange={(e) =>
                  setMemType(e.target.value as MembershipType)
                }
              >
                <option value="CHURCH_MEMBER">Church member</option>
                <option value="YOUTH_MEMBER">Youth member</option>
                <option value="CHOIR_MEMBER">Choir member</option>
              </select>
            )}
            <label className="row">
              <input
                type="checkbox"
                checked={doBaptism}
                onChange={(e) => setDoBaptism(e.target.checked)}
              />
              Update baptism record
            </label>
            {doBaptism && (
              <div className="grid-2">
                <input
                  type="date"
                  value={bapDate}
                  onChange={(e) => setBapDate(e.target.value)}
                />
                <input
                  value={bapPlace}
                  onChange={(e) => setBapPlace(e.target.value)}
                  placeholder="Place"
                />
              </div>
            )}
            <div className="row">
              <button type="submit" className="btn">
                Confirm complete
              </button>
              <button
                type="button"
                className="btn ghost"
                onClick={() => setCompleteId(null)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {tab === 'sessions' && (
      <div className="panel">
        <h3>Sessions</h3>
        {program.status !== 'ACTIVE' && (
          <p className="muted">Sessions can be added when status is ACTIVE.</p>
        )}
        <table className="table">
          <thead>
            <tr>
              <th>Session</th>
              <th>When</th>
              <th>Location</th>
              <th>Attendance</th>
            </tr>
          </thead>
          <tbody>
            {activities.length === 0 ? (
              <tr>
                <td colSpan={4} className="muted">
                  No sessions
                </td>
              </tr>
            ) : (
              activities.map((a) => {
                const summary = missionService.attendanceSummary(a.id);
                return (
                  <tr key={a.id}>
                    <td>{a.title}</td>
                    <td>{new Date(a.startsAt).toLocaleString()}</td>
                    <td>{a.location ?? '—'}</td>
                    <td>
                      {summary.total === 0
                        ? '—'
                        : `${summary.present}/${summary.total}`}
                      {canRecord &&
                        program.status === 'ACTIVE' &&
                        enrollments
                          .filter((en) => en.status === 'ACTIVE')
                          .slice(0, 3)
                          .map((en) => (
                            <div key={en.id} className="row">
                              <span className="muted">
                                {peopleService.getById(en.personId)
                                  ?.preferredName ?? en.personId}
                              </span>
                              <button
                                type="button"
                                className="btn ghost"
                                onClick={() =>
                                  markAttend(a.id, en.personId, 'PRESENT')
                                }
                              >
                                Present
                              </button>
                              <button
                                type="button"
                                className="btn ghost"
                                onClick={() =>
                                  markAttend(a.id, en.personId, 'ABSENT')
                                }
                              >
                                Absent
                              </button>
                            </div>
                          ))}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {canManageSessions && program.status === 'ACTIVE' && (
          <form className="stack" onSubmit={onAddSession} style={{ marginTop: '0.75rem' }}>
            <h4 style={{ margin: 0 }}>Add session</h4>
            <div className="grid-2">
              <input
                placeholder="Title"
                value={sessTitle}
                onChange={(e) => setSessTitle(e.target.value)}
              />
              <input
                type="datetime-local"
                value={sessAt}
                onChange={(e) => setSessAt(e.target.value)}
                required
              />
              <input
                placeholder="Location"
                value={sessLoc}
                onChange={(e) => setSessLoc(e.target.value)}
              />
            </div>
            <button type="submit" className="btn">
              Add session
            </button>
          </form>
        )}
      </div>
      )}

      <button type="button" className="btn ghost" onClick={() => navigate(-1)}>
        Back
      </button>
    </div>
  );
}

