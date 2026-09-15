import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { StatusPill } from '../components/ui/StatusPill';
import {
  canSeeSystemAdminNav,
  systemAdminSystemIds,
} from '../domain/systemAdmin';
import { systemsService } from '../services';

/**
 * Appointed System Admin home — config posture for systems you administer.
 * Never a back door to finance ledgers or pastoral dumps.
 * Visible to Church Leader, ministry/org presidents, and appointed System Admins.
 */
export function SystemAdminPage() {
  const { account, positions, roles, can } = useAuth();
  const maySee = Boolean(
    account && canSeeSystemAdminNav(account.personId, positions, roles),
  );
  const adminIds = useMemo(
    () =>
      account ? systemAdminSystemIds(account.personId, positions) : [],
    [account, positions],
  );

  if (!account) return null;

  if (!maySee) {
    return (
      <div className="panel">
        <h1>System administration</h1>
        <p className="muted">
          Only Church Leader, ministry or organisation presidents, and
          appointed System Admins can open this desk.
        </p>
        <Link to="/" className="btn secondary">
          Home
        </Link>
      </div>
    );
  }

  if (adminIds.length === 0) {
    return (
      <div className="panel">
        <h1>System administration</h1>
        <p className="muted">
          You are not personally appointed as System Admin on a peer system
          yet. Presidents appoint a member for tool configuration only — that
          does not grant ledgers or full ops data. Church Leader confirms
          appointments.
        </p>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="panel" style={{ background: 'var(--accent-soft)' }}>
        <p style={{ margin: 0 }}>
          System Admin configures software for appointed systems. It does not
          unlock finance, sacraments, or discipline decisions.
        </p>
      </div>
      <ul className="stack" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {adminIds.map((id) => {
          const sys = systemsService.getById(id);
          const configOk = can('SYSTEM_CONFIG', 'MANAGE', id);
          return (
            <li key={id} className="panel row" style={{ justifyContent: 'space-between' }}>
              <div>
                <strong>{sys?.name ?? id}</strong>
                <div className="muted" style={{ fontSize: '0.85rem' }}>
                  Config grant:{' '}
                  {configOk ? 'active' : 'missing — ask Church Leader'}
                </div>
              </div>
              <div className="row" style={{ gap: '0.5rem' }}>
                <StatusPill tone="info">System Admin</StatusPill>
                <Link className="btn ghost" to="/systems">
                  Open systems
                </Link>
                <Link className="btn ghost" to="/participation">
                  Participation
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
