import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import type { ProtocolAttendanceStatus } from '../../domain/types';
import { financeService, protocolService } from '../../services';

const SYS = 'sys-protocol' as const;

function useProtocolMonth() {
  const initial = protocolService.liveMonthKey();
  const [monthKey, setMonthKey] = useState(initial);
  const [tick, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);
  return { monthKey, setMonthKey, refresh, tick };
}

function MonthPicker({
  monthKey,
  onChange,
}: {
  monthKey: string;
  onChange: (m: string) => void;
}) {
  return (
    <select value={monthKey} onChange={(e) => onChange(e.target.value)}>
      {protocolService.allowedMonths().map((m) => (
        <option key={m} value={m}>
          {m}
        </option>
      ))}
    </select>
  );
}

export function ProtocolHomePage() {
  const { can, personName, account } = useAuth();
  const { monthKey, setMonthKey, refresh, tick } = useProtocolMonth();
  const stats = useMemo(
    () =>
      account
        ? protocolService.statsForPerson(monthKey, account.personId)
        : protocolService.stats(monthKey),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [monthKey, tick, account],
  );
  const plan = protocolService.getMonthPlan(monthKey);
  const canManage = can('PROTOCOL_SCHEDULE', 'MANAGE', SYS);
  const canApprove = can('PROTOCOL_SCHEDULE', 'APPROVE', SYS);
  const myCount = account
    ? protocolService.mySchedule(account.personId).length
    : 0;
  const office = account
    ? protocolService.officeFor(account.personId)
    : null;
  const canVerifyFund = account
    ? financeService.authorizeFund(account.personId, 'fund-protocol', 'MANAGE')
        .allowed
    : false;
  const pendingContribs = protocolService.listContributions({
    status: 'PENDING',
  }).length;
  const unread = account
    ? protocolService.unreadCount(account.personId)
    : 0;

  type Need = { id: string; title: string; reason: string; to: string };
  const needs: Need[] = [];
  if (canManage && plan && plan.status !== 'PUBLISHED' && plan.status !== 'REVIEW') {
    needs.push({
      id: 'gen',
      title: 'Build this month’s teams',
      reason: `Month ${monthKey} is ${plan.status}`,
      to: '/systems/protocol/teams',
    });
  }
  if (canManage && plan?.status === 'DRAFT') {
    needs.push({
      id: 'submit',
      title: 'Submit for review',
      reason: 'Teams drafted — send to President/VP',
      to: '/systems/protocol/review',
    });
  }
  if (canApprove && plan?.status === 'REVIEW') {
    needs.push({
      id: 'review',
      title: 'Mark reviewed',
      reason: 'Coordinator submitted this month',
      to: '/systems/protocol/review',
    });
  }
  if (canManage && plan?.status === 'REVIEW') {
    needs.push({
      id: 'publish',
      title: 'Publish after review',
      reason: 'Leadership can publish once marked reviewed',
      to: '/systems/protocol/review',
    });
  }
  if (canVerifyFund && pendingContribs > 0) {
    needs.push({
      id: 'contrib',
      title: `${pendingContribs} contribution${pendingContribs === 1 ? '' : 's'} to verify`,
      reason: 'Posts into Protocol fund vault',
      to: '/systems/protocol/finance',
    });
  }
  if (unread > 0) {
    needs.push({
      id: 'inbox',
      title: `${unread} unread notification${unread === 1 ? '' : 's'}`,
      reason: 'Schedule and contribution updates',
      to: '/systems/protocol/inbox',
    });
  }
  if (myCount > 0) {
    needs.push({
      id: 'mine',
      title: `You serve ${myCount} time${myCount === 1 ? '' : 's'} this month`,
      reason: 'Open My schedule',
      to: '/systems/protocol/mine',
    });
  }

  const kicker =
    office === 'TREASURER'
      ? 'Treasurer home'
      : office === 'COORDINATOR'
        ? 'Coordinator home'
        : office === 'PRESIDENT' || office === 'VP'
          ? 'Leadership home'
          : office === 'SECRETARY'
            ? 'Secretary home'
            : 'Member home';

  return (
    <div className="stack">
      <div className="detail-hero">
        <p className="hero-kicker">{kicker}</p>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0 }}>Protocol · {personName}</h2>
          {office && (
            <span className="persona-chip">
              {protocolService.officeLabel(office)}
            </span>
          )}
        </div>
        <p className="muted" style={{ marginBottom: 0 }}>
          Fair monthly staffing: roster → teams → review → publish → operate.
          Contributions post to the shared Protocol fund (org-private).
        </p>
        <div className="overview-strip" style={{ marginTop: '0.85rem' }}>
          <div className="overview-tile">
            <div className="label">Roster</div>
            <div className="value">{stats.rosterActive}</div>
          </div>
          <div className="overview-tile">
            <div className="label">Month</div>
            <div className="value" style={{ fontSize: '1.1rem' }}>
              {monthKey}
            </div>
          </div>
          <div className="overview-tile">
            <div className="label">Status</div>
            <div className="value" style={{ fontSize: '1rem' }}>
              {stats.status}
            </div>
          </div>
          <div className="overview-tile">
            <div className="label">Slots</div>
            <div className="value">{stats.slots}</div>
          </div>
        </div>
        <div className="row" style={{ marginTop: '0.85rem' }}>
          <MonthPicker monthKey={monthKey} onChange={setMonthKey} />
          {canManage && plan?.status !== 'PUBLISHED' && plan?.status !== 'REVIEW' && (
            <button
              type="button"
              className="btn"
              onClick={() => {
                protocolService.generateTeams(monthKey);
                refresh();
              }}
            >
              Generate teams
            </button>
          )}
          <Link to="/systems/protocol/review" className="btn secondary">
            Review
          </Link>
          <Link to="/systems/protocol/mine" className="btn ghost">
            My schedule ({myCount})
          </Link>
        </div>
      </div>

      {needs.length > 0 && (
        <div className="needs-me">
          <h3>Needs me · {needs.length}</h3>
          <ul className="needs-me-list">
            {needs.slice(0, 6).map((n) => (
              <li key={n.id}>
                <div>
                  <Link to={n.to}>
                    <strong>{n.title}</strong>
                  </Link>
                  <div className="muted" style={{ fontSize: '0.85rem' }}>
                    {n.reason}
                  </div>
                </div>
                <Link to={n.to} className="btn ghost">
                  Open
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid-2">
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Operate</h3>
          <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
            <li>
              <Link to="/systems/protocol/finance">Contributions / finance</Link>
              {pendingContribs > 0 && canVerifyFund && (
                <span className="muted"> · {pendingContribs} pending</span>
              )}
            </li>
            <li>
              <Link to="/systems/protocol/reports">Leadership reports</Link>
            </li>
            <li>
              <Link to="/systems/protocol/export">CSV / bulletin export</Link>
            </li>
            <li>
              <Link to="/systems/protocol/attendance">Attendance</Link> ·{' '}
              <Link to="/systems/protocol/history">History</Link>
            </li>
            <li>
              <Link to="/systems/protocol/inbox">
                Inbox{unread > 0 ? ` (${unread})` : ''}
              </Link>
            </li>
          </ul>
        </div>
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Month context</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            Live month and next month only.
            {plan?.generatedAt
              ? ` Last generated ${new Date(plan.generatedAt).toLocaleString()}.`
              : ''}
          </p>
          <div className="row">
            <Link to="/systems/protocol/teams">Service teams →</Link>
            <Link to="/systems/protocol/members">Roster →</Link>
            <Link to="/systems/protocol/calendar">Calendar →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProtocolMembersPage() {
  const { can } = useAuth();
  const canView = can('PROTOCOL_ROSTER', 'VIEW', SYS);
  const canManage = can('PROTOCOL_ROSTER', 'MANAGE', SYS);
  const roster = protocolService.rosterWithNames();

  if (!canView) {
    return (
      <div className="panel">
        <h2>Members</h2>
        <p className="muted">No PROTOCOL_ROSTER / VIEW</p>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="panel">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0 }}>Protocol roster</h2>
            <p className="muted" style={{ margin: '0.35rem 0 0' }}>
              Office, serve days, leave — inputs for teamEngine
            </p>
          </div>
          {canManage && <span className="badge">Can manage roster</span>}
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Office</th>
              <th>Serve days</th>
              <th>Status</th>
              <th>Unavailable</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {roster.map((m) => (
              <tr key={m.id}>
                <td>{m.name}</td>
                <td>{protocolService.officeLabel(m.office)}</td>
                <td>{m.serveDays}</td>
                <td>
                  <span
                    className={
                      m.status === 'LEAVE' ? 'badge planned' : 'badge'
                    }
                  >
                    {m.status}
                  </span>
                </td>
                <td className="muted">
                  {m.unavailableDates.length
                    ? m.unavailableDates.join(', ')
                    : '—'}
                </td>
                <td className="muted">{m.notes ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ProtocolCalendarPage() {
  const { can } = useAuth();
  const canView = can('PROTOCOL_SCHEDULE', 'VIEW', SYS);
  const { monthKey, setMonthKey, tick } = useProtocolMonth();
  const services = useMemo(
    () => protocolService.servicesForMonth(monthKey),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [monthKey, tick],
  );

  if (!canView) {
    return (
      <div className="panel">
        <h2>Calendar</h2>
        <p className="muted">No PROTOCOL_SCHEDULE / VIEW</p>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="panel">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0 }}>Service calendar</h2>
            <p className="muted" style={{ margin: '0.35rem 0 0' }}>
              SS1, SS2, and Tuesday services for the month
            </p>
          </div>
          <MonthPicker monthKey={monthKey} onChange={setMonthKey} />
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Service</th>
              <th>Target team</th>
              <th>Assigned</th>
            </tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.id}>
                <td>{s.date}</td>
                <td>
                  <strong>{s.kind}</strong>
                </td>
                <td>{s.targetTeamSize}</td>
                <td>{protocolService.teamForService(s.id).length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ProtocolTeamsPage() {
  const { can } = useAuth();
  const canView = can('PROTOCOL_SCHEDULE', 'VIEW', SYS);
  const canManage = can('PROTOCOL_SCHEDULE', 'MANAGE', SYS);
  const { monthKey, setMonthKey, refresh, tick } = useProtocolMonth();
  const [message, setMessage] = useState('');

  const services = useMemo(
    () => protocolService.servicesForMonth(monthKey),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [monthKey, tick],
  );
  const plan = protocolService.getMonthPlan(monthKey);
  const load = useMemo(
    () => protocolService.dutyLoad(monthKey),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [monthKey, tick],
  );
  const rules = protocolService.rules();

  if (!canView) {
    return (
      <div className="panel">
        <h2>Service teams</h2>
        <p className="muted">No PROTOCOL_SCHEDULE / VIEW</p>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="panel">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0 }}>Service teams</h2>
            <p className="muted" style={{ margin: '0.35rem 0 0' }}>
              teamEngine: prefer {rules.preferTarget} → {rules.softMax}, hard max{' '}
              {rules.hardMax}
            </p>
          </div>
          <MonthPicker monthKey={monthKey} onChange={setMonthKey} />
        </div>

        <div className="row">
          <span className="badge">{plan?.status ?? 'OPEN'}</span>
          {canManage && (
            <button
              type="button"
              className="btn"
              onClick={() => {
                const result = protocolService.generateTeams(monthKey);
                setMessage(
                  result.ok
                    ? `Built ${result.slotCount} slots` +
                        (result.warnings.length
                          ? ` · ${result.warnings.length} notes`
                          : '')
                    : result.reason ?? 'Failed',
                );
                refresh();
              }}
            >
              Generate / rebuild
            </button>
          )}
          <Link to="/systems/protocol/review">Review & publish →</Link>
        </div>
        {message && <p className="muted">{message}</p>}
      </div>

      <div className="grid-2">
        <div className="panel">
          <h3>Duty load ({monthKey})</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Office</th>
                <th>Duties</th>
              </tr>
            </thead>
            <tbody>
              {load.map((row) => (
                <tr key={row.personId}>
                  <td>{row.name}</td>
                  <td className="muted">
                    {protocolService.officeLabel(row.office)}
                  </td>
                  <td>
                    <span
                      className={
                        row.count >= rules.hardMax ? 'badge planned' : 'badge'
                      }
                    >
                      {row.count}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <h3>Teams by service</h3>
          <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
            {services.map((s) => {
              const team = protocolService.teamForService(s.id);
              return (
                <li key={s.id} style={{ marginBottom: '0.65rem' }}>
                  <strong>
                    {s.kind} · {s.date}
                  </strong>
                  <div className="muted">
                    {team.length === 0
                      ? 'No team yet — generate'
                      : team
                          .map((t) => protocolService.personLabel(t.personId))
                          .join(', ')}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function ProtocolReviewPage() {
  const { account, can } = useAuth();
  const canView = can('PROTOCOL_SCHEDULE', 'VIEW', SYS);
  const canManage = can('PROTOCOL_SCHEDULE', 'MANAGE', SYS);
  const canApprove = can('PROTOCOL_SCHEDULE', 'APPROVE', SYS);
  const { monthKey, setMonthKey, refresh, tick } = useProtocolMonth();
  const [message, setMessage] = useState('');

  const plan = useMemo(
    () => protocolService.getMonthPlan(monthKey),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [monthKey, tick],
  );
  const issues = useMemo(
    () => protocolService.validateMonth(monthKey),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [monthKey, tick],
  );
  const services = useMemo(
    () => protocolService.servicesForMonth(monthKey),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [monthKey, tick],
  );

  if (!canView) {
    return (
      <div className="panel">
        <h2>Review & publish</h2>
        <p className="muted">No PROTOCOL_SCHEDULE / VIEW</p>
      </div>
    );
  }

  function run(
    action: () => { ok: boolean; reason?: string; version?: number },
    okMsg: string,
  ) {
    if (!account) return;
    const result = action();
    setMessage(result.ok ? okMsg : result.reason ?? 'Failed');
    refresh();
  }

  return (
    <div className="stack">
      <div className="panel">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0 }}>Leadership review & publish</h2>
            <p className="muted" style={{ margin: '0.35rem 0 0' }}>
              DRAFT → REVIEW → leadership mark → PUBLISH (archives a version)
            </p>
          </div>
          <MonthPicker monthKey={monthKey} onChange={setMonthKey} />
        </div>

        <div className="row">
          <span className="badge">{plan?.status ?? 'OPEN'}</span>
          {plan && plan.version > 0 && (
            <span className="badge">v{plan.version}</span>
          )}
        </div>

        <div className="row" style={{ marginTop: '0.75rem' }}>
          {canManage && plan?.status === 'DRAFT' && (
            <button
              type="button"
              className="btn"
              onClick={() =>
                run(
                  () =>
                    protocolService.submitForReview(
                      monthKey,
                      account!.personId,
                    ),
                  'Submitted for leadership review',
                )
              }
            >
              Submit for review
            </button>
          )}
          {canApprove && plan?.status === 'REVIEW' && !plan.reviewedByPersonId && (
            <button
              type="button"
              className="btn"
              onClick={() =>
                run(
                  () =>
                    protocolService.markReviewed(monthKey, account!.personId),
                  'Marked reviewed',
                )
              }
            >
              Mark reviewed
            </button>
          )}
          {canManage &&
            plan?.status === 'REVIEW' &&
            plan.reviewedByPersonId && (
              <button
                type="button"
                className="btn"
                onClick={() =>
                  run(() => {
                    const r = protocolService.publish(
                      monthKey,
                      account!.personId,
                    );
                    return r;
                  }, 'Published — version archived')
                }
              >
                Publish schedule
              </button>
            )}
          {canManage &&
            (plan?.status === 'REVIEW' || plan?.status === 'PUBLISHED') && (
              <button
                type="button"
                className="btn secondary"
                onClick={() =>
                  run(
                    () => protocolService.returnToDraft(monthKey),
                    'Returned to DRAFT',
                  )
                }
              >
                Reopen to draft
              </button>
            )}
        </div>
        {message && <p className="muted">{message}</p>}

        {plan?.submittedByPersonId && (
          <p className="muted">
            Submitted by {protocolService.personLabel(plan.submittedByPersonId)}
            {plan.submittedForReviewAt
              ? ` · ${new Date(plan.submittedForReviewAt).toLocaleString()}`
              : ''}
          </p>
        )}
        {plan?.reviewedByPersonId && (
          <p className="muted">
            Reviewed by {protocolService.personLabel(plan.reviewedByPersonId)}
            {plan.reviewedAt
              ? ` · ${new Date(plan.reviewedAt).toLocaleString()}`
              : ''}
          </p>
        )}
        {plan?.publishedByPersonId && (
          <p className="muted">
            Published by {protocolService.personLabel(plan.publishedByPersonId)}
            {plan.publishedAt
              ? ` · ${new Date(plan.publishedAt).toLocaleString()}`
              : ''}
          </p>
        )}
      </div>

      <div className="grid-2">
        <div className="panel">
          <h3>Validation</h3>
          {issues.length === 0 ? (
            <p className="muted">No rule violations detected</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
              {issues.slice(0, 15).map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="panel">
          <h3>Draft teams snapshot</h3>
          <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
            {services.slice(0, 8).map((s) => (
              <li key={s.id}>
                <strong>
                  {s.kind} {s.date}
                </strong>
                <div className="muted">
                  {protocolService
                    .teamForService(s.id)
                    .map((t) => protocolService.personLabel(t.personId))
                    .join(', ') || '—'}
                </div>
              </li>
            ))}
          </ul>
          {services.length > 8 && (
            <p className="muted">+{services.length - 8} more services</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProtocolHistoryPage() {
  const { can } = useAuth();
  const canView = can('PROTOCOL_SCHEDULE', 'VIEW', SYS);
  const history = protocolService.listHistory();
  const [selectedId, setSelectedId] = useState<string | null>(
    history[0]?.id ?? null,
  );
  const selected = selectedId
    ? protocolService.getHistoryVersion(selectedId)
    : null;

  if (!canView) {
    return (
      <div className="panel">
        <h2>History</h2>
        <p className="muted">No PROTOCOL_SCHEDULE / VIEW</p>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Published history</h2>
        <p className="muted">Archived versions after each publish</p>
        <table className="table">
          <thead>
            <tr>
              <th>Month</th>
              <th>Version</th>
              <th>Published</th>
              <th>By</th>
              <th>Slots</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.id}>
                <td>{h.monthKey}</td>
                <td>v{h.version}</td>
                <td>{new Date(h.publishedAt).toLocaleString()}</td>
                <td>{protocolService.personLabel(h.publishedByPersonId)}</td>
                <td>{h.slots.length}</td>
                <td>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => setSelectedId(h.id)}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>
            {selected.monthKey} · v{selected.version}
          </h3>
          <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
            {Object.entries(
              selected.slots.reduce<Record<string, string[]>>((acc, s) => {
                const list = acc[s.serviceId] ?? [];
                list.push(protocolService.personLabel(s.personId));
                acc[s.serviceId] = list;
                return acc;
              }, {}),
            ).map(([serviceId, names]) => {
              const svc = protocolService.getService(serviceId);
              return (
                <li key={serviceId}>
                  <strong>{svc?.label ?? serviceId}</strong>
                  <div className="muted">{names.join(', ')}</div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export function ProtocolAttendancePage() {
  const { account, can } = useAuth();
  const canView = can('PROTOCOL_SCHEDULE', 'VIEW', SYS);
  const canRecord =
    can('PROTOCOL_SCHEDULE', 'RECORD_ATTENDANCE', SYS) ||
    can('PROTOCOL_SCHEDULE', 'MANAGE', SYS);
  const { monthKey, setMonthKey, refresh, tick } = useProtocolMonth();
  const [serviceId, setServiceId] = useState('');
  const [message, setMessage] = useState('');

  const plan = protocolService.getMonthPlan(monthKey);
  const summary = useMemo(
    () => protocolService.attendanceSummary(monthKey),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [monthKey, tick],
  );
  const services = useMemo(
    () => protocolService.servicesForMonth(monthKey),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [monthKey, tick],
  );
  const activeServiceId = serviceId || services[0]?.id || '';
  const team = activeServiceId
    ? protocolService.teamForService(activeServiceId)
    : [];
  const records = activeServiceId
    ? protocolService.attendanceForService(activeServiceId)
    : [];

  if (!canView) {
    return (
      <div className="panel">
        <h2>Attendance</h2>
        <p className="muted">No PROTOCOL_SCHEDULE / VIEW</p>
      </div>
    );
  }

  function setStatus(personId: string, status: ProtocolAttendanceStatus) {
    if (!account) return;
    const result = protocolService.recordAttendance({
      serviceId: activeServiceId,
      personId,
      status,
      recordedByPersonId: account.personId,
    });
    setMessage(result.ok ? `Recorded ${status}` : result.reason ?? 'Failed');
    refresh();
  }

  return (
    <div className="stack">
      <div className="panel">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0 }}>Attendance</h2>
            <p className="muted" style={{ margin: '0.35rem 0 0' }}>
              Record who served — only after the month is published
            </p>
          </div>
          <MonthPicker monthKey={monthKey} onChange={setMonthKey} />
        </div>
        <div className="row">
          <span className="badge">{plan?.status ?? 'OPEN'}</span>
          {plan?.status !== 'PUBLISHED' && (
            <span className="badge planned">Publish required</span>
          )}
        </div>
        {message && <p className="muted">{message}</p>}
      </div>

      <div className="panel">
        <h3>Sessions overview</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Service</th>
              <th>Team</th>
              <th>Recorded</th>
              <th>Present/Late</th>
            </tr>
          </thead>
          <tbody>
            {summary.map((row) => (
              <tr key={row.service.id}>
                <td>
                  {row.service.kind} · {row.service.date}
                </td>
                <td>{row.teamSize}</td>
                <td>{row.recorded}</td>
                <td>{row.present}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0 }}>Record session</h3>
          <select
            value={activeServiceId}
            onChange={(e) => setServiceId(e.target.value)}
          >
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.kind} · {s.date}
              </option>
            ))}
          </select>
        </div>
        {team.length === 0 ? (
          <p className="muted">No team for this service</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Status</th>
                {canRecord && <th>Mark</th>}
              </tr>
            </thead>
            <tbody>
              {team.map((slot) => {
                const rec = records.find((r) => r.personId === slot.personId);
                return (
                  <tr key={slot.id}>
                    <td>{protocolService.personLabel(slot.personId)}</td>
                    <td>
                      <span className="badge">{rec?.status ?? '—'}</span>
                    </td>
                    {canRecord && (
                      <td>
                        <div className="row">
                          {(
                            [
                              'PRESENT',
                              'LATE',
                              'ABSENT',
                              'EXCUSED',
                            ] as ProtocolAttendanceStatus[]
                          ).map((st) => (
                            <button
                              key={st}
                              type="button"
                              className="btn ghost"
                              disabled={plan?.status !== 'PUBLISHED'}
                              onClick={() => setStatus(slot.personId, st)}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export function ProtocolMySchedulePage() {
  const { account, can } = useAuth();
  const canView = can('PROTOCOL_SCHEDULE', 'VIEW', SYS);

  if (!account || !canView) {
    return (
      <div className="panel">
        <h2>My schedule</h2>
        <p className="muted">Sign in with Protocol access to see your duties</p>
      </div>
    );
  }

  const rows = protocolService.mySchedule(account.personId);

  return (
    <div className="stack">
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>My schedule</h2>
        <p className="muted">
          Published protocol duties for{' '}
          {protocolService.personLabel(account.personId)}
        </p>
        {rows.length === 0 ? (
          <p className="muted">
            No published duties yet. After Coordinator publishes a month that
            includes you, they appear here.
          </p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Service</th>
                <th>Month</th>
                <th>Version</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.serviceId}-${r.version}-${r.publishedAt}`}>
                  <td>{r.date}</td>
                  <td>
                    <strong>{r.kind}</strong>
                  </td>
                  <td>{r.monthKey}</td>
                  <td>v{r.version}</td>
                  <td className="muted">
                    {r.fromHistory ? 'Archive' : 'Current published'}
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
