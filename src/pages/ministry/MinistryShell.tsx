import { useEffect, useMemo, type ReactNode } from 'react';
import {
  Link,
  NavLink,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import {
  filterMinistryNav,
  ministryModuleKey,
  ministryOfficeMayAccessModule,
  resolveMinistryBoardOffice,
} from '../../domain/ministryNavAccess';
import type { SystemId } from '../../domain/types';
import { armExitToMainChurch, clearExitToMainChurch } from '../../navigation/systemScope';
import { authService, systemsService } from '../../services';

export function MinistryShell({
  systemId,
  basePath,
  nav,
  subHeader,
  blockBody,
  /** When true (default for peer ministries), filter nav for member vs board office. */
  enforceMemberNav = true,
}: {
  systemId: SystemId;
  basePath: string;
  nav: Array<{ to: string; label: string; end?: boolean }>;
  subHeader?: ReactNode;
  blockBody?: boolean;
  enforceMemberNav?: boolean;
}) {
  const {
    account,
    personName,
    logout,
    canEnter,
    session,
    refreshSession,
    canViewPeople,
    positions,
  } = useAuth();
  const navigate = useNavigate();
  const system = systemsService.getById(systemId);
  const profilePath = account ? `/people/${account.personId}` : '/';

  function openMainChurch() {
    armExitToMainChurch();
    authService.setCurrentSystem('sys-main', 'main');
    refreshSession();
    navigate('/', { replace: true });
  }

  const boardOffice = useMemo(() => {
    if (!account || !enforceMemberNav || systemId === 'sys-choir') {
      return null;
    }
    return resolveMinistryBoardOffice(
      account.personId,
      systemId,
      positions,
    );
  }, [account, enforceMemberNav, systemId, positions]);

  const roleFilteredNav = useMemo(() => {
    if (!boardOffice) return nav;
    return filterMinistryNav(systemId, basePath, nav, boardOffice);
  }, [boardOffice, systemId, basePath, nav]);

  const resolvedNav = roleFilteredNav.map((item) => {
    if (item.label !== 'People' && item.label !== 'Members') return item;
    if (canViewPeople) return item;
    return { to: profilePath, label: 'Profile' };
  });

  useEffect(() => {
    if (!account || !canEnter(systemId)) return;
    if (session?.currentSystemId === systemId) return;
    clearExitToMainChurch();
    authService.setCurrentSystem(
      systemId,
      session?.entryMode === 'handoff' ? 'handoff' : 'direct',
    );
    refreshSession();
  }, [account, canEnter, systemId, session, refreshSession]);

  if (!account) {
    return <Navigate to={`/login?system=${systemId}`} replace />;
  }
  if (!canEnter(systemId)) {
    return (
      <div className="login-page">
        <div className="login-card">
          <h1>Access denied</h1>
          <p className="muted">
            Signed in as <strong>{personName}</strong>, but{' '}
            <code>authorize(SYSTEM, ENTER)</code> is denied for {system?.name}.
          </p>
          <p style={{ marginTop: '1rem' }}>
            <Link to={`/login?system=${systemId}`}>Sign in here</Link>
            {' · '}
            <button type="button" className="btn ghost" onClick={openMainChurch}>
              Open Main Church
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="ministry-shell">
      <header className="ministry-top">
        <div className="ministry-top-brand">
          <img src="/brand/adepr-logo.png" alt="ADEPR" width={38} height={38} />
          <div>
            <strong>{system?.name}</strong>
            <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>
              {personName}
              {boardOffice && boardOffice !== 'MEMBER'
                ? ` · ${boardOffice.replaceAll('_', ' ')}`
                : boardOffice === 'MEMBER'
                  ? ' · member'
                  : ''}
              {session?.entryMode === 'handoff'
                ? ' · entered via church SSO'
                : session?.entryMode === 'direct'
                  ? ' · direct login'
                  : ''}
            </div>
          </div>
        </div>
        <div className="row">
          <button
            type="button"
            className="btn ghost"
            style={{ color: '#e4eef7', borderColor: '#2a4a66' }}
            onClick={openMainChurch}
          >
            Open Main Church
          </button>
          <button
            type="button"
            className="btn ghost"
            style={{ color: '#e4eef7', borderColor: '#2a4a66' }}
            onClick={logout}
          >
            Sign out
          </button>
        </div>
      </header>
      <nav className="ministry-nav">
        {resolvedNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => (isActive ? 'active' : undefined)}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="ministry-body">
        {subHeader}
        {blockBody ? (
          <div className="panel">
            <h2 style={{ marginTop: 0 }}>No access</h2>
            <p className="muted">Nothing to show for this account.</p>
          </div>
        ) : (
          <Outlet />
        )}
      </div>
      <p className="muted ministry-foot">
        Peer system at <code>{basePath}</code> · shared Person identity
      </p>
    </div>
  );
}

/** Block deep-links to modules outside the member/board allow-list. */
export function RequireMinistryModule({
  systemId,
  basePath,
  moduleKey,
  children,
}: {
  systemId: SystemId;
  basePath: string;
  /** If omitted, derived from current location under basePath. */
  moduleKey?: string;
  children?: ReactNode;
}) {
  const { account, positions } = useAuth();
  const location = useLocation();
  if (!account) {
    return <Navigate to={`/login?system=${systemId}`} replace />;
  }
  const office = resolveMinistryBoardOffice(
    account.personId,
    systemId,
    positions,
  );
  const key =
    moduleKey ?? ministryModuleKey(location.pathname, basePath);
  if (!ministryOfficeMayAccessModule(systemId, office, key)) {
    return <Navigate to={basePath} replace />;
  }
  return children ?? <Outlet />;
}

export function MinistryHomeCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="panel">
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      {children}
    </div>
  );
}
