import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import {
  financeService,
  missionService,
  peopleService,
  worshipService,
} from '../../services';

const SYS = 'sys-worship' as const;

export function WorshipHomePage() {
  const { can, authorize, personName, account } = useAuth();
  const stats = worshipService.stats();
  const upcoming = worshipService.upcomingRehearsals().slice(0, 2);
  const concertDuties = worshipService.listDuties({
    eventId: 'evt-worship-concert-2026',
  });
  const office = account ? worshipService.officeFor(account.personId) : null;
  const canVerifyFund = account
    ? financeService.authorizeFund(account.personId, 'fund-worship', 'MANAGE')
        .allowed
    : false;
  const canFinance = can('WORSHIP_FINANCE', 'MANAGE', SYS);
  const myPending = account
    ? worshipService.listContributions({
        personId: account.personId,
        status: 'PENDING',
      }).length
    : 0;
  const followUps = worshipService.listFollowUps(true).length;

  type Need = { id: string; title: string; reason: string; to: string };
  const needs: Need[] = [];
  if (canVerifyFund && stats.pendingPayments > 0) {
    needs.push({
      id: 'verify',
      title: `${stats.pendingPayments} payment${stats.pendingPayments === 1 ? '' : 's'} to verify`,
      reason: 'Confirm into Worship fund vault',
      to: '/systems/worship/finance',
    });
  }
  if ((canFinance || canVerifyFund) && followUps > 0) {
    needs.push({
      id: 'follow',
      title: `${followUps} open follow-up${followUps === 1 ? '' : 's'}`,
      reason: 'Partial / declined claims need closure',
      to: '/systems/worship/finance',
    });
  }
  if (stats.pendingExpenses > 0 && canFinance) {
    needs.push({
      id: 'exp',
      title: `${stats.pendingExpenses} expense${stats.pendingExpenses === 1 ? '' : 's'} pending`,
      reason: 'Accounting approval',
      to: '/systems/worship/accounting',
    });
  }
  if (myPending > 0) {
    needs.push({
      id: 'mine',
      title: `${myPending} of your claims pending`,
      reason: 'Waiting on treasurer verification',
      to: '/systems/worship/my-contributions',
    });
  }
  if (upcoming[0]) {
    needs.push({
      id: 'reh',
      title: upcoming[0].title,
      reason: new Date(upcoming[0].startsAt).toLocaleString(),
      to: '/systems/worship/rehearsals',
    });
  }

  const kicker =
    office === 'TREASURER'
      ? 'Treasurer home'
      : office === 'PRESIDENT' || office === 'VP' || office === 'ADMIN'
        ? 'Leadership home'
        : office === 'MUSIC_DIRECTOR' || office === 'COORDINATOR'
          ? 'Music ops home'
          : office === 'FAMILY_LEADER' || office === 'FAMILY_VICE'
            ? 'Family leader home'
            : 'Member home';

  return (
    <div className="stack">
      <div className="detail-hero">
        <p className="hero-kicker">{kicker}</p>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0 }}>Worship · {personName}</h2>
          {office && (
            <span className="persona-chip">
              {worshipService.officeLabel(office)}
            </span>
          )}
        </div>
        <p className="muted" style={{ marginBottom: 0 }}>
          Private peer under Music — setlists, families, and contributions into
          the Worship fund vault (org-private).
        </p>
        <div className="overview-strip" style={{ marginTop: '0.85rem' }}>
          <div className="overview-tile">
            <div className="label">Roster</div>
            <div className="value">{stats.rosterCount}</div>
          </div>
          <div className="overview-tile">
            <div className="label">Families</div>
            <div className="value">{stats.teams}</div>
          </div>
          <div className="overview-tile">
            <div className="label">Pending $</div>
            <div className="value">{stats.pendingPayments}</div>
          </div>
          <div className="overview-tile">
            <div className="label">Fund</div>
            <div className="value" style={{ fontSize: '1rem' }}>
              {stats.fundBalance.toLocaleString()}
            </div>
          </div>
        </div>
        <div className="row" style={{ marginTop: '0.85rem' }}>
          <Link to="/systems/worship/finance" className="btn">
            Finance
          </Link>
          <Link
            to="/systems/worship/my-contributions"
            className="btn secondary"
          >
            My contributions
          </Link>
          <Link to="/systems/worship/rehearsals" className="btn ghost">
            Rehearsals
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
          <h3>Upcoming rehearsals</h3>
          {upcoming.length === 0 ? (
            <p className="muted">None scheduled</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
              {upcoming.map((r) => (
                <li key={r.id}>
                  <strong>{r.title}</strong>
                  <div className="muted">
                    {new Date(r.startsAt).toLocaleString()} · {r.location}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link to="/systems/worship/rehearsals">All rehearsals →</Link>
        </div>
        <div className="panel">
          <h3>Operate</h3>
          <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
            <li>
              <Link to="/systems/worship/people">People & offices</Link>
            </li>
            <li>
              <Link to="/systems/worship/families">Families (teams)</Link>
            </li>
            <li>
              <Link to="/systems/worship/finance">Contribution & finance</Link>
              {stats.pendingPayments > 0 && (
                <span className="muted"> · {stats.pendingPayments} pending</span>
              )}
            </li>
            <li>
              <Link to="/systems/worship/donations">Donations</Link> ·{' '}
              <Link to="/systems/worship/sponsors">Sponsors</Link>
            </li>
            <li>
              <Link to="/systems/worship/fundraising">Fundraising</Link> ·{' '}
              <Link to="/systems/worship/accounting">Accounting</Link>
            </li>
            <li>
              <Link to="/systems/worship/assets">Assets</Link> ·{' '}
              <Link to="/systems/worship/reports">Reports</Link>
            </li>
            <li>
              <Link to="/systems/worship/roster">Duty roster</Link>
            </li>
          </ul>
          <p className="muted" style={{ marginTop: '0.75rem' }}>
            {missionService.getEvent('evt-worship-concert-2026')?.name}:{' '}
            {concertDuties.length} duties assigned
          </p>
        </div>
      </div>

      <div className="row">
        {can('WORSHIP_REPERTOIRE', 'MANAGE', SYS) && (
          <button
            type="button"
            className="btn"
            onClick={() => authorize('WORSHIP_REPERTOIRE', 'MANAGE', SYS)}
          >
            Audit: manage repertoire
          </button>
        )}
        {can('WORSHIP_FINANCE', 'MANAGE', SYS) && (
          <button
            type="button"
            className="btn secondary"
            onClick={() => authorize('WORSHIP_FINANCE', 'MANAGE', SYS)}
          >
            Audit: manage finance
          </button>
        )}
      </div>
    </div>
  );
}

export function WorshipRepertoirePage() {
  const { can, authorize } = useAuth();
  const canView = can('WORSHIP_REPERTOIRE', 'VIEW', SYS);
  const canManage = can('WORSHIP_REPERTOIRE', 'MANAGE', SYS);
  const songs = worshipService.listSongs();

  if (!canView) {
    return (
      <div className="panel">
        <h2>Repertoire</h2>
        <p className="muted">No WORSHIP_REPERTOIRE / VIEW</p>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="panel">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0 }}>Repertoire</h2>
            <p className="muted" style={{ margin: '0.35rem 0 0' }}>
              Songs for worship and concerts
            </p>
          </div>
          {canManage && (
            <button
              type="button"
              className="btn"
              onClick={() => authorize('WORSHIP_REPERTOIRE', 'MANAGE', SYS)}
            >
              Manage
            </button>
          )}
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Composer</th>
              <th>Language</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {songs.map((s) => (
              <tr key={s.id}>
                <td>
                  <strong>{s.title}</strong>
                  {s.notes && <div className="muted">{s.notes}</div>}
                </td>
                <td>{s.composer ?? '—'}</td>
                <td>{s.language ?? '—'}</td>
                <td>
                  <span
                    className={`badge ${s.status === 'ARCHIVED' ? 'planned' : ''}`}
                  >
                    {s.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function WorshipSectionsPage() {
  const { can } = useAuth();
  const canView = can('WORSHIP_ROSTER', 'VIEW', SYS);
  const sections = worshipService.sectionSummary();

  if (!canView) {
    return (
      <div className="panel">
        <h2>Sections</h2>
        <p className="muted">No WORSHIP_ROSTER / VIEW</p>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="panel">
        <h2>Voice sections</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Section seats link to shared Person records.
        </p>
      </div>
      <div className="grid-2">
        {sections.map((sec) => (
          <div key={sec.section} className="panel">
            <h3>
              {sec.section}{' '}
              <span className="badge">{sec.count}</span>
            </h3>
            {sec.members.length === 0 ? (
              <p className="muted">Empty</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                {sec.members.map((m) => (
                  <li key={m.seatId}>
                    <Link to={`/people/${m.personId}`}>{m.name}</Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function WorshipRehearsalsPage() {
  const { can } = useAuth();
  const canView = can('WORSHIP_REPERTOIRE', 'VIEW', SYS);
  const rehearsals = worshipService.listRehearsals();

  if (!canView) {
    return (
      <div className="panel">
        <h2>Rehearsals</h2>
        <p className="muted">No view rights</p>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="panel">
        <h2>Rehearsals</h2>
        <table className="table">
          <thead>
            <tr>
              <th>When</th>
              <th>Title</th>
              <th>Location</th>
              <th>Songs</th>
            </tr>
          </thead>
          <tbody>
            {rehearsals.map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.startsAt).toLocaleString()}</td>
                <td>
                  <strong>{r.title}</strong>
                  {r.notes && <div className="muted">{r.notes}</div>}
                </td>
                <td>{r.location ?? '—'}</td>
                <td>
                  {r.songIds
                    .map((id) => worshipService.getSong(id)?.title ?? id)
                    .join(', ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function WorshipRosterPage() {
  const { can, authorize } = useAuth();
  const canView = can('WORSHIP_ROSTER', 'VIEW', SYS);
  const canManage = can('WORSHIP_ROSTER', 'MANAGE', SYS);
  const canUpdate = can('WORSHIP_ROSTER', 'UPDATE', SYS);
  const duties = worshipService.listDuties();

  if (!canView) {
    return (
      <div className="panel">
        <h2>Duty roster</h2>
        <p className="muted">No WORSHIP_ROSTER / VIEW</p>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="panel">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0 }}>Duty roster</h2>
            <p className="muted" style={{ margin: '0.35rem 0 0' }}>
              Service and event roles
            </p>
          </div>
          <div className="row">
            {canManage && (
              <button
                type="button"
                className="btn"
                onClick={() => authorize('WORSHIP_ROSTER', 'MANAGE', SYS)}
              >
                Manage
              </button>
            )}
            {!canManage && canUpdate && (
              <button
                type="button"
                className="btn secondary"
                onClick={() => authorize('WORSHIP_ROSTER', 'UPDATE', SYS)}
              >
                Update (assignment)
              </button>
            )}
          </div>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Label</th>
              <th>Role</th>
              <th>Person</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {duties.map((d) => (
              <tr key={d.id}>
                <td>{d.serviceDate}</td>
                <td>{d.label}</td>
                <td>{worshipService.dutyRoleLabel(d.role)}</td>
                <td>
                  <Link to={`/people/${d.personId}`}>
                    {peopleService.getById(d.personId)?.preferredName ??
                      d.personId}
                  </Link>
                </td>
                <td>
                  <span
                    className={`badge ${d.status === 'DONE' ? 'planned' : ''}`}
                  >
                    {d.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
