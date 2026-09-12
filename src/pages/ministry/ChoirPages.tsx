import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { fundIdForChoirOrgUnit } from '../../domain/choirCatalog';
import { choirNavForOffice } from '../../domain/choirNav';
import {
  choirService,
  financeService,
  missionService,
  peopleService,
} from '../../services';
import { useActiveChoir } from './useActiveChoir';

const SYS = 'sys-choir' as const;

export function ChoirHomePage() {
  const { can, authorize, personName, account } = useAuth();
  const { activeChoirOrgUnitId } = useActiveChoir();
  const choirFundId = activeChoirOrgUnitId
    ? fundIdForChoirOrgUnit(activeChoirOrgUnitId)
    : null;
  const stats = choirService.stats();
  const upcoming = choirService.upcomingRehearsals().slice(0, 2);
  const concertDuties = choirService.listDuties({
    eventId: 'evt-choir-concert-2026',
  });
  const office = account ? choirService.officeFor(account.personId) : null;
  const canVerifyFund =
    account && choirFundId
      ? financeService.authorizeFund(account.personId, choirFundId, 'MANAGE')
          .allowed
      : false;
  const canFinance = can('CHOIR_FINANCE', 'MANAGE', SYS);
  const myPending = account
    ? choirService.listContributions({
        personId: account.personId,
        status: 'PENDING',
      }).length
    : 0;
  const followUps = choirService.listFollowUps(true).length;

  type Need = { id: string; title: string; reason: string; to: string };
  const needs: Need[] = [];
  if (canVerifyFund && stats.pendingPayments > 0) {
    needs.push({
      id: 'verify',
      title: `${stats.pendingPayments} payment${stats.pendingPayments === 1 ? '' : 's'} to verify`,
      reason: 'Confirm into Choir fund vault',
      to: '/systems/choir/finance',
    });
  }
  if ((canFinance || canVerifyFund) && followUps > 0) {
    needs.push({
      id: 'follow',
      title: `${followUps} open follow-up${followUps === 1 ? '' : 's'}`,
      reason: 'Partial / declined claims need closure',
      to: '/systems/choir/finance',
    });
  }
  if (stats.pendingExpenses > 0 && canFinance) {
    needs.push({
      id: 'exp',
      title: `${stats.pendingExpenses} expense${stats.pendingExpenses === 1 ? '' : 's'} pending`,
      reason: 'Accounting approval',
      to: '/systems/choir/accounting',
    });
  }
  if (myPending > 0) {
    needs.push({
      id: 'mine',
      title: `${myPending} of your claims pending`,
      reason: 'Waiting on treasurer verification',
      to: '/systems/choir/my-contributions',
    });
  }
  if (upcoming[0]) {
    needs.push({
      id: 'reh',
      title: upcoming[0].title,
      reason: new Date(upcoming[0].startsAt).toLocaleString(),
      to: '/systems/choir/rehearsals',
    });
  }

  const kicker =
    office === 'TREASURER'
      ? 'Treasurer home · all choir finance'
      : office === 'PRESIDENT' || office === 'VP'
        ? 'Administrative home'
        : office === 'SECRETARY'
          ? 'Secretary home · records & libraries'
          : office === 'MUSIC_DIRECTOR'
            ? 'Music Director home · repertoire & rehearsals'
            : office === 'COORDINATOR'
              ? 'Coordinator home · all families'
              : office === 'ADVISOR'
                ? 'Advisor home'
                : office === 'FAMILY_LEADER'
                  ? 'Family leader home'
                  : 'Member home';

  const showFinanceHome =
    office === 'TREASURER' ||
    office === 'COORDINATOR' ||
    office === 'PRESIDENT' ||
    office === 'VP' ||
    office === 'FAMILY_LEADER' ||
    canFinance;

  const showMusicHome =
    office === 'MUSIC_DIRECTOR' ||
    office === 'SECRETARY' ||
    office === 'PRESIDENT' ||
    office === 'VP' ||
    !office;

  return (
    <div className="stack">
      <div className="detail-hero">
        <p className="hero-kicker">{kicker}</p>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0 }}>Choir · {personName}</h2>
          {office && (
            <span className="persona-chip">
              {choirService.displayOfficeFor(account!.personId)}
            </span>
          )}
        </div>
        <p className="muted" style={{ marginBottom: 0 }}>
          {office === 'MUSIC_DIRECTOR'
            ? 'Repertoire, sections, rehearsals, and duty roster for your choir.'
            : office === 'TREASURER'
              ? 'Contributions, donations, budget, and the choir fund vault.'
              : 'Private peer under Music — scoped to your choir office.'}
        </p>
        <div className="overview-strip" style={{ marginTop: '0.85rem' }}>
          {showMusicHome && (
            <>
              <div className="overview-tile">
                <div className="label">Songs</div>
                <div className="value">{stats.songsReady}</div>
              </div>
              <div className="overview-tile">
                <div className="label">Rehearsals</div>
                <div className="value">{stats.upcomingRehearsals}</div>
              </div>
            </>
          )}
          <div className="overview-tile">
            <div className="label">Roster</div>
            <div className="value">{stats.rosterCount}</div>
          </div>
          {(office === 'COORDINATOR' ||
            office === 'FAMILY_LEADER' ||
            office === 'PRESIDENT') && (
            <div className="overview-tile">
              <div className="label">Families</div>
              <div className="value">{stats.teams}</div>
            </div>
          )}
          {showFinanceHome && (
            <>
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
            </>
          )}
        </div>
        <div className="row" style={{ marginTop: '0.85rem' }}>
          {office === 'MUSIC_DIRECTOR' || office === 'SECRETARY' ? (
            <>
              <Link to="/systems/choir/repertoire" className="btn">
                Repertoire
              </Link>
              <Link to="/systems/choir/rehearsals" className="btn secondary">
                Rehearsals
              </Link>
              <Link to="/systems/choir/my-contributions" className="btn ghost">
                My contributions
              </Link>
            </>
          ) : showFinanceHome ? (
            <>
              <Link to="/systems/choir/finance" className="btn">
                Finance
              </Link>
              <Link
                to="/systems/choir/my-contributions"
                className="btn secondary"
              >
                My contributions
              </Link>
              <Link to="/systems/choir/rehearsals" className="btn ghost">
                Rehearsals
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/systems/choir/my-contributions"
                className="btn"
              >
                My contributions
              </Link>
              <Link to="/systems/choir/rehearsals" className="btn secondary">
                Rehearsals
              </Link>
            </>
          )}
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
          <Link to="/systems/choir/rehearsals">All rehearsals →</Link>
        </div>
        <div className="panel">
          <h3>Your modules</h3>
          <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
            {choirNavForOffice(office)
              .filter((item) => item.key !== 'home')
              .map((item) => (
                <li key={item.key}>
                  <Link to={item.to}>{item.label}</Link>
                  {item.key === 'finance' && stats.pendingPayments > 0 && (
                    <span className="muted">
                      {' '}
                      · {stats.pendingPayments} pending
                    </span>
                  )}
                </li>
              ))}
          </ul>
          {office === 'MUSIC_DIRECTOR' && (
            <p className="muted" style={{ marginTop: '0.75rem' }}>
              {missionService.getEvent('evt-choir-concert-2026')?.name}:{' '}
              {concertDuties.length} duties assigned
            </p>
          )}
        </div>
      </div>

      <div className="row">
        {can('CHOIR_REPERTOIRE', 'MANAGE', SYS) && (
          <button
            type="button"
            className="btn"
            onClick={() => authorize('CHOIR_REPERTOIRE', 'MANAGE', SYS)}
          >
            Audit: manage repertoire
          </button>
        )}
        {can('CHOIR_FINANCE', 'MANAGE', SYS) && (
          <button
            type="button"
            className="btn secondary"
            onClick={() => authorize('CHOIR_FINANCE', 'MANAGE', SYS)}
          >
            Audit: manage finance
          </button>
        )}
      </div>
    </div>
  );
}

export function ChoirRepertoirePage() {
  const { can, authorize } = useAuth();
  const canView = can('CHOIR_REPERTOIRE', 'VIEW', SYS);
  const canManage = can('CHOIR_REPERTOIRE', 'MANAGE', SYS);
  const songs = choirService.listSongs();

  if (!canView) {
    return (
      <div className="panel">
        <h2>Repertoire</h2>
        <p className="muted">No CHOIR_REPERTOIRE / VIEW</p>
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
              onClick={() => authorize('CHOIR_REPERTOIRE', 'MANAGE', SYS)}
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

export function ChoirSectionsPage() {
  const { can } = useAuth();
  const canView = can('CHOIR_ROSTER', 'VIEW', SYS);
  const sections = choirService.sectionSummary();

  if (!canView) {
    return (
      <div className="panel">
        <h2>Sections</h2>
        <p className="muted">No CHOIR_ROSTER / VIEW</p>
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

export function ChoirRehearsalsPage() {
  const { can } = useAuth();
  const canView = can('CHOIR_REPERTOIRE', 'VIEW', SYS);
  const rehearsals = choirService.listRehearsals();

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
                    .map((id) => choirService.getSong(id)?.title ?? id)
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

export function ChoirRosterPage() {
  const { can, authorize } = useAuth();
  const canView = can('CHOIR_ROSTER', 'VIEW', SYS);
  const canManage = can('CHOIR_ROSTER', 'MANAGE', SYS);
  const canUpdate = can('CHOIR_ROSTER', 'UPDATE', SYS);
  const duties = choirService.listDuties();

  if (!canView) {
    return (
      <div className="panel">
        <h2>Duty roster</h2>
        <p className="muted">No CHOIR_ROSTER / VIEW</p>
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
                onClick={() => authorize('CHOIR_ROSTER', 'MANAGE', SYS)}
              >
                Manage
              </button>
            )}
            {!canManage && canUpdate && (
              <button
                type="button"
                className="btn secondary"
                onClick={() => authorize('CHOIR_ROSTER', 'UPDATE', SYS)}
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
                <td>{choirService.dutyRoleLabel(d.role)}</td>
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
