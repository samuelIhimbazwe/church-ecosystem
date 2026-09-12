import { type FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { membershipTypeLabel, roleLabel } from '../domain/access';
import { useAuth } from '../auth/AuthContext';
import { Drawer } from '../components/ui/Drawer';
import { FilterBar } from '../components/ui/FilterBar';
import {
  EmptyState,
  StatusPill,
} from '../components/ui/StatusPill';
import type {
  MembershipType,
  MissionLeaderOffice,
  SystemId,
  SystemRole,
} from '../domain/types';
import {
  orgService,
  participationService,
  peopleService,
  systemsService,
} from '../services';

type CreateKind = 'membership' | 'position' | 'assignment' | null;
type RegistryFilter = 'all' | 'memberships' | 'positions' | 'assignments';

export function ParticipationPage() {
  const {
    personName,
    memberships,
    positions,
    assignments,
    entitlements,
    roles,
    tasks,
    can,
    authorize,
    refreshSession,
  } = useAuth();
  const canManage =
    can('MEMBERSHIP', 'MANAGE') ||
    can('POSITION', 'MANAGE') ||
    can('ASSIGNMENT', 'MANAGE');
  const [, setTick] = useState(0);
  const refresh = () => {
    setTick((t) => t + 1);
    refreshSession();
  };
  const [msg, setMsg] = useState('');
  const [tab, setTab] = useState<'mine' | 'manage'>('mine');
  const [createKind, setCreateKind] = useState<CreateKind>(null);
  const [registryFilter, setRegistryFilter] =
    useState<RegistryFilter>('all');

  const allMemberships = participationService.listMemberships();
  const allPositions = participationService.listPositions();
  const allAssignments = participationService.listAssignments();

  const [mPerson, setMPerson] = useState('');
  const [mType, setMType] = useState<MembershipType>('CHURCH_MEMBER');
  const [mOrg, setMOrg] = useState('');
  const [mSystem, setMSystem] = useState('');

  const [pPerson, setPPerson] = useState('');
  const [pTitle, setPTitle] = useState('');
  const [pOrg, setPOrg] = useState('');
  const [pRole, setPRole] = useState<SystemRole | ''>('');
  const [pOffice, setPOffice] = useState<MissionLeaderOffice | ''>('');
  const [pSystem, setPSystem] = useState('');
  const [pAllSystems, setPAllSystems] = useState(false);

  const [aPerson, setAPerson] = useState('');
  const [aTitle, setATitle] = useState('');
  const [aLabel, setALabel] = useState('');
  const [aSystem, setASystem] = useState('');
  const [aEnd, setAEnd] = useState('');

  function onAddMembership(e: FormEvent) {
    e.preventDefault();
    const d = authorize('MEMBERSHIP', 'MANAGE');
    if (!d.allowed) {
      setMsg(d.reason);
      return;
    }
    participationService.createMembership({
      personId: mPerson,
      type: mType,
      label: membershipTypeLabel(mType),
      orgUnitId: mOrg || undefined,
      systemId: (mSystem || undefined) as SystemId | undefined,
    });
    setMsg('Membership added');
    setMPerson('');
    setCreateKind(null);
    refresh();
  }

  function onAddPosition(e: FormEvent) {
    e.preventDefault();
    const d = authorize('POSITION', 'MANAGE');
    if (!d.allowed) {
      setMsg(d.reason);
      return;
    }
    participationService.createPosition({
      personId: pPerson,
      title: pTitle.trim(),
      orgUnitId: pOrg,
      systemRole: pRole || undefined,
      ministryOffice: pOffice || undefined,
      grantsAllSystems: pAllSystems || undefined,
      systemId: (pSystem || undefined) as SystemId | undefined,
    });
    setMsg('Position added');
    setPTitle('');
    setPPerson('');
    setCreateKind(null);
    refresh();
  }

  function onAddAssignment(e: FormEvent) {
    e.preventDefault();
    const d = authorize('ASSIGNMENT', 'MANAGE');
    if (!d.allowed) {
      setMsg(d.reason);
      return;
    }
    participationService.createAssignment({
      personId: aPerson,
      title: aTitle.trim(),
      contextType: 'EVENT',
      contextId: `ctx-${Date.now()}`,
      contextLabel: aLabel.trim() || aTitle.trim(),
      systemId: (aSystem || undefined) as SystemId | undefined,
      endDate: aEnd || undefined,
    });
    setMsg('Assignment added');
    setATitle('');
    setAPerson('');
    setCreateKind(null);
    refresh();
  }

  const people = peopleService.list();
  const orgs = orgService.list();
  const systems = systemsService.list();
  const activeSystems = systemsService.listActive();

  return (
    <div className="stack">
      <div className="detail-hero">
        <p className="hero-kicker">Participation</p>
        <h2 style={{ margin: 0 }}>Where you serve</h2>
        <p className="muted" style={{ marginBottom: 0 }}>
          Memberships, positions, and assignments drive system entry (direct or
          SSO). Temporary task ENTER grants show on Tasks and in Access.
        </p>
        <div className="overview-strip" style={{ marginTop: '0.85rem' }}>
          <div className="overview-tile">
            <div className="label">Roles</div>
            <div className="value">{roles.length || '—'}</div>
          </div>
          <div className="overview-tile">
            <div className="label">Memberships</div>
            <div className="value">{memberships.length}</div>
          </div>
          <div className="overview-tile">
            <div className="label">Positions</div>
            <div className="value">{positions.length}</div>
          </div>
          <div className="overview-tile">
            <div className="label">Peer systems</div>
            <div className="value">
              {entitlements.filter((e) => e.systemId !== 'sys-main').length}
            </div>
          </div>
        </div>
        <div className="row" style={{ marginTop: '0.85rem' }}>
          <button
            type="button"
            className={`btn ${tab === 'mine' ? '' : 'ghost'}`}
            onClick={() => setTab('mine')}
          >
            My participation
          </button>
          {canManage && (
            <button
              type="button"
              className={`btn ${tab === 'manage' ? '' : 'ghost'}`}
              onClick={() => setTab('manage')}
            >
              Manage church registry
            </button>
          )}
        </div>
        {msg && <p className="badge">{msg}</p>}
      </div>

      {tab === 'mine' && (
        <>
          <div className="why-callout">
            <strong>Why you can open systems</strong>
            {entitlements.filter((e) => e.systemId !== 'sys-main').length ===
            0 ? (
              <p style={{ margin: '0.4rem 0 0' }} className="muted">
                No peer systems yet — Main Church only.
              </p>
            ) : (
              <ul style={{ margin: '0.45rem 0 0', paddingLeft: '1.1rem' }}>
                {entitlements
                  .filter((e) => e.systemId !== 'sys-main')
                  .map((e) => (
                    <li key={e.systemId}>
                      <strong>
                        {systemsService.getById(e.systemId)?.shortName ??
                          e.systemId}
                      </strong>
                      <span className="muted"> — {e.reasons.join(' · ')}</span>
                    </li>
                  ))}
              </ul>
            )}
            <p className="muted" style={{ marginBottom: 0, marginTop: '0.5rem' }}>
              <Link to="/access">Probe rights in Access engine →</Link>
            </p>
          </div>

          <div className="panel">
            <h3>{personName}</h3>
            <div className="row">
              {roles.length === 0 ? (
                <span className="badge">No standing system role</span>
              ) : (
                roles.map((r) => (
                  <span key={r} className="badge">
                    {roleLabel(r)}
                  </span>
                ))
              )}
            </div>
          </div>

          <div className="panel">
            <h3>My memberships</h3>
            <SimpleMembershipTable rows={memberships} />
          </div>
          <div className="panel">
            <h3>My positions</h3>
            <SimplePositionTable rows={positions} />
          </div>
          <div className="panel">
            <h3>My assignments</h3>
            {assignments.length === 0 ? (
              <EmptyState title="No assignments" detail="None active for you." />
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Context</th>
                    <th>System</th>
                    <th>Until</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((a) => (
                    <tr key={a.id}>
                      <td>{a.title}</td>
                      <td>{a.contextLabel}</td>
                      <td>
                        {a.systemId
                          ? systemsService.getById(a.systemId)?.shortName
                          : '—'}
                      </td>
                      <td>{a.endDate ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="panel">
            <h3>System entitlements</h3>
            {entitlements.length === 0 ? (
              <EmptyState title="No entitlements" />
            ) : (
              <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                {entitlements.map((e) => (
                  <li key={e.systemId}>
                    <strong>
                      {systemsService.getById(e.systemId)?.shortName ??
                        e.systemId}
                    </strong>
                    <div className="muted">{e.reasons.join(' · ')}</div>
                  </li>
                ))}
              </ul>
            )}
            {tasks.length > 0 && (
              <p className="muted">
                Active tasks: {tasks.map((t) => t.title).join(', ')}
              </p>
            )}
            <Link to="/access">Access engine →</Link>
          </div>
        </>
      )}

      {tab === 'manage' && canManage && (
        <div className="stack">
          <div className="panel">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0 }}>Church registry</h3>
                <p className="muted" style={{ margin: '0.35rem 0 0' }}>
                  Dense tables stay here — creates open in drawers.
                </p>
              </div>
              <div className="row">
                {can('MEMBERSHIP', 'MANAGE') && (
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setCreateKind('membership')}
                  >
                    Add membership
                  </button>
                )}
                {can('POSITION', 'MANAGE') && (
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => setCreateKind('position')}
                  >
                    Add position
                  </button>
                )}
                {can('ASSIGNMENT', 'MANAGE') && (
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => setCreateKind('assignment')}
                  >
                    Add assignment
                  </button>
                )}
              </div>
            </div>
            <div style={{ marginTop: '0.75rem' }}>
              <FilterBar
                value={registryFilter}
                onChange={(v) => setRegistryFilter(v as RegistryFilter)}
                options={[
                  {
                    value: 'all',
                    label: 'All',
                    count:
                      allMemberships.length +
                      allPositions.length +
                      allAssignments.length,
                  },
                  {
                    value: 'memberships',
                    label: 'Memberships',
                    count: allMemberships.length,
                  },
                  {
                    value: 'positions',
                    label: 'Positions',
                    count: allPositions.length,
                  },
                  {
                    value: 'assignments',
                    label: 'Assignments',
                    count: allAssignments.length,
                  },
                ]}
              />
            </div>
          </div>

          {(registryFilter === 'all' || registryFilter === 'memberships') && (
            <div className="panel">
              <h3>Memberships</h3>
              {allMemberships.length === 0 ? (
                <EmptyState
                  title="No memberships"
                  action={
                    can('MEMBERSHIP', 'MANAGE') ? (
                      <button
                        type="button"
                        className="btn"
                        onClick={() => setCreateKind('membership')}
                      >
                        Add membership
                      </button>
                    ) : undefined
                  }
                />
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Person</th>
                      <th>Type</th>
                      <th>Org</th>
                      <th>System</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {allMemberships.map((m) => (
                      <tr key={m.id}>
                        <td>
                          <Link to={`/people/${m.personId}`}>
                            {peopleService.getById(m.personId)?.preferredName ??
                              m.personId}
                          </Link>
                        </td>
                        <td>{membershipTypeLabel(m.type)}</td>
                        <td>
                          {m.orgUnitId
                            ? orgService.getById(m.orgUnitId)?.name
                            : '—'}
                        </td>
                        <td>
                          {m.systemId
                            ? systemsService.getById(m.systemId)?.shortName
                            : '—'}
                        </td>
                        <td>
                          <StatusPill status={m.status}>{m.status}</StatusPill>
                        </td>
                        <td>
                          {m.status === 'ACTIVE' && (
                            <button
                              type="button"
                              className="btn ghost"
                              onClick={() => {
                                authorize('MEMBERSHIP', 'MANAGE');
                                participationService.endMembership(m.id);
                                refresh();
                              }}
                            >
                              End
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {(registryFilter === 'all' || registryFilter === 'positions') && (
            <div className="panel">
              <h3>Positions</h3>
              {allPositions.length === 0 ? (
                <EmptyState
                  title="No positions"
                  action={
                    can('POSITION', 'MANAGE') ? (
                      <button
                        type="button"
                        className="btn"
                        onClick={() => setCreateKind('position')}
                      >
                        Add position
                      </button>
                    ) : undefined
                  }
                />
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Person</th>
                      <th>Title</th>
                      <th>Org</th>
                      <th>Role / office</th>
                      <th>System</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {allPositions.map((p) => (
                      <tr key={p.id}>
                        <td>
                          {peopleService.getById(p.personId)?.preferredName ??
                            p.personId}
                        </td>
                        <td>{p.title}</td>
                        <td>{orgService.getById(p.orgUnitId)?.name}</td>
                        <td>
                          {p.systemRole ? roleLabel(p.systemRole) : '—'}
                          {p.ministryOffice ? ` · ${p.ministryOffice}` : ''}
                        </td>
                        <td>
                          {p.grantsAllSystems
                            ? 'All'
                            : p.systemId
                              ? systemsService.getById(p.systemId)?.shortName
                              : '—'}
                        </td>
                        <td>
                          <StatusPill status={p.status}>{p.status}</StatusPill>
                        </td>
                        <td>
                          {p.status === 'ACTIVE' && (
                            <button
                              type="button"
                              className="btn ghost"
                              onClick={() => {
                                authorize('POSITION', 'MANAGE');
                                participationService.endPosition(p.id);
                                refresh();
                              }}
                            >
                              End
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {(registryFilter === 'all' || registryFilter === 'assignments') && (
            <div className="panel">
              <h3>Assignments</h3>
              {allAssignments.length === 0 ? (
                <EmptyState
                  title="No assignments"
                  action={
                    can('ASSIGNMENT', 'MANAGE') ? (
                      <button
                        type="button"
                        className="btn"
                        onClick={() => setCreateKind('assignment')}
                      >
                        Add assignment
                      </button>
                    ) : undefined
                  }
                />
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Person</th>
                      <th>Title</th>
                      <th>Context</th>
                      <th>System</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {allAssignments.map((a) => (
                      <tr key={a.id}>
                        <td>
                          {peopleService.getById(a.personId)?.preferredName ??
                            a.personId}
                        </td>
                        <td>{a.title}</td>
                        <td>{a.contextLabel}</td>
                        <td>
                          {a.systemId
                            ? systemsService.getById(a.systemId)?.shortName
                            : '—'}
                        </td>
                        <td>
                          <StatusPill status={a.status}>{a.status}</StatusPill>
                        </td>
                        <td>
                          {a.status === 'ACTIVE' && (
                            <button
                              type="button"
                              className="btn ghost"
                              onClick={() => {
                                authorize('ASSIGNMENT', 'MANAGE');
                                participationService.completeAssignment(a.id);
                                refresh();
                              }}
                            >
                              Complete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          <Drawer
            open={createKind === 'membership'}
            title="Add membership"
            onClose={() => setCreateKind(null)}
            wide
          >
            <form className="stack" onSubmit={onAddMembership}>
              <div className="field">
                <label>Person</label>
                <select
                  value={mPerson}
                  onChange={(e) => setMPerson(e.target.value)}
                  required
                >
                  <option value="">—</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Type</label>
                <select
                  value={mType}
                  onChange={(e) => setMType(e.target.value as MembershipType)}
                >
                  {(
                    [
                      'CHURCH_MEMBER',
                      'CHOIR_MEMBER',
                      'WORSHIP_MEMBER',
                      'YOUTH_MEMBER',
                      'PROTOCOL_MEMBER',
                      'DEACON_MEMBER',
                      'MEDIA_MEMBER',
                      'MUSIC_MEMBER',
                      'MEN_MEMBER',
                      'WOMEN_MEMBER',
                      'COUPLES_MEMBER',
                      'CHILDREN_MEMBER',
                      'ELDERLY_MEMBER',
                      'EVANGELISM_MEMBER',
                      'INTERCESSORS_MEMBER',
                    ] as MembershipType[]
                  ).map((t) => (
                    <option key={t} value={t}>
                      {membershipTypeLabel(t)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Org unit</label>
                <select
                  value={mOrg}
                  onChange={(e) => setMOrg(e.target.value)}
                >
                  <option value="">—</option>
                  {orgs.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>System (entry)</label>
                <select
                  value={mSystem}
                  onChange={(e) => setMSystem(e.target.value)}
                >
                  <option value="">—</option>
                  {activeSystems.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.shortName}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn">
                Add membership
              </button>
            </form>
          </Drawer>

          <Drawer
            open={createKind === 'position'}
            title="Add position"
            onClose={() => setCreateKind(null)}
            wide
          >
            <form className="stack" onSubmit={onAddPosition}>
              <div className="field">
                <label>Person</label>
                <select
                  value={pPerson}
                  onChange={(e) => setPPerson(e.target.value)}
                  required
                >
                  <option value="">—</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Title</label>
                <input
                  value={pTitle}
                  onChange={(e) => setPTitle(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label>Org unit</label>
                <select
                  value={pOrg}
                  onChange={(e) => setPOrg(e.target.value)}
                  required
                >
                  <option value="">—</option>
                  {orgs.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>System</label>
                <select
                  value={pSystem}
                  onChange={(e) => setPSystem(e.target.value)}
                >
                  <option value="">—</option>
                  {systems.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.shortName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>System role</label>
                <select
                  value={pRole}
                  onChange={(e) =>
                    setPRole(e.target.value as SystemRole | '')
                  }
                >
                  <option value="">—</option>
                  {(
                    [
                      'CHURCH_LEADER',
                      'ASSISTANT_PASTOR',
                      'CHURCH_SECRETARY',
                      'CHURCH_TREASURER',
                      'CHOIR_LEADER',
                      'WORSHIP_LEADER',
                      'YOUTH_LEADER',
                      'PROTOCOL_LEADER',
                      'DEACON_LEADER',
                      'LIMITED_STAFF',
                    ] as SystemRole[]
                  ).map((r) => (
                    <option key={r} value={r}>
                      {roleLabel(r)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Mission office</label>
                <select
                  value={pOffice}
                  onChange={(e) =>
                    setPOffice(e.target.value as MissionLeaderOffice | '')
                  }
                >
                  <option value="">—</option>
                  <option value="PRESIDENT">President</option>
                  <option value="VP">VP</option>
                  <option value="SECRETARY">Secretary</option>
                  <option value="TREASURER">Treasurer</option>
                </select>
              </div>
              <label className="row" style={{ gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={pAllSystems}
                  onChange={(e) => setPAllSystems(e.target.checked)}
                />
                Grants all systems (governance)
              </label>
              <button type="submit" className="btn">
                Add position
              </button>
            </form>
          </Drawer>

          <Drawer
            open={createKind === 'assignment'}
            title="Add assignment"
            onClose={() => setCreateKind(null)}
            wide
          >
            <form className="stack" onSubmit={onAddAssignment}>
              <div className="field">
                <label>Person</label>
                <select
                  value={aPerson}
                  onChange={(e) => setAPerson(e.target.value)}
                  required
                >
                  <option value="">—</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Title</label>
                <input
                  value={aTitle}
                  onChange={(e) => setATitle(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label>Context label</label>
                <input
                  value={aLabel}
                  onChange={(e) => setALabel(e.target.value)}
                  placeholder="e.g. Youth Retreat 2026"
                />
              </div>
              <div className="field">
                <label>Temporary system access</label>
                <select
                  value={aSystem}
                  onChange={(e) => setASystem(e.target.value)}
                >
                  <option value="">— none —</option>
                  {activeSystems.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.shortName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>End date</label>
                <input
                  type="date"
                  value={aEnd}
                  onChange={(e) => setAEnd(e.target.value)}
                />
              </div>
              <button type="submit" className="btn">
                Add assignment
              </button>
            </form>
          </Drawer>
        </div>
      )}
    </div>
  );
}

function SimpleMembershipTable({
  rows,
}: {
  rows: ReturnType<typeof participationService.activeMemberships>;
}) {
  if (rows.length === 0) {
    return <EmptyState title="No active memberships" />;
  }
  return (
    <table className="table">
      <thead>
        <tr>
          <th>Type</th>
          <th>Label</th>
          <th>Org unit</th>
          <th>System</th>
          <th>Since</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((m) => (
          <tr key={m.id}>
            <td>{membershipTypeLabel(m.type)}</td>
            <td>{m.label}</td>
            <td>
              {m.orgUnitId
                ? (orgService.getById(m.orgUnitId)?.name ?? m.orgUnitId)
                : '—'}
            </td>
            <td>
              {m.systemId
                ? (systemsService.getById(m.systemId)?.shortName ?? m.systemId)
                : '—'}
            </td>
            <td>{m.startDate}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SimplePositionTable({
  rows,
}: {
  rows: ReturnType<typeof participationService.activePositions>;
}) {
  if (rows.length === 0) {
    return <EmptyState title="No active positions" />;
  }
  return (
    <table className="table">
      <thead>
        <tr>
          <th>Title</th>
          <th>Org unit</th>
          <th>System role</th>
          <th>Access</th>
          <th>Since</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((p) => (
          <tr key={p.id}>
            <td>{p.title}</td>
            <td>{orgService.getById(p.orgUnitId)?.name ?? p.orgUnitId}</td>
            <td>{p.systemRole ? roleLabel(p.systemRole) : '—'}</td>
            <td>
              {p.grantsAllSystems
                ? 'All systems'
                : p.systemId
                  ? (systemsService.getById(p.systemId)?.shortName ??
                    p.systemId)
                  : '—'}
            </td>
            <td>{p.startDate}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
