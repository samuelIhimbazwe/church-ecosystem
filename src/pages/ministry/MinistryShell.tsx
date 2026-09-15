import { useEffect, useMemo, type ReactNode } from 'react';
import {
  Link,
  NavLink,
  Navigate,
  Outlet,
  useLocation,
} from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { roleLabel } from '../../domain/access';
import {
  filterMinistryNav,
  ministryModuleKey,
  ministryOfficeMayAccessModule,
  resolveMinistryBoardOffice,
} from '../../domain/ministryNavAccess';
import {
  filterOversightNav,
  oversightDepthForRoles,
  oversightMayAccessModule,
  resolvePeerEntry,
} from '../../domain/oversightAccess';
import type { SystemId } from '../../domain/types';
import { clearExitToMainChurch } from '../../navigation/systemScope';
import {
  authService,
  openSystemUrlInNewTab,
  systemsService,
} from '../../services';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { OversightOutlet } from './OversightOutlet';

export function MinistryShell({
  systemId,
  basePath,
  nav,
  subHeader,
  blockBody,
  /** When blockBody is true, render this instead of the default “No access” panel. Pass `null` to show only subHeader (e.g. choir picker). */
  blockBodyContent,
  /** When true (default for peer ministries), filter nav for member vs board office. */
  enforceMemberNav = true,
}: {
  systemId: SystemId;
  basePath: string;
  nav: Array<{ to: string; label: string; end?: boolean }>;
  subHeader?: ReactNode;
  blockBody?: boolean;
  blockBodyContent?: ReactNode;
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
    roles,
    openPeerSystem,
  } = useAuth();
  const system = systemsService.getById(systemId);
  const profilePath = account ? `/people/${account.personId}` : '/';

  function openMainChurch() {
    const result = openPeerSystem('sys-main');
    if (!result.ok || !result.url) return;
    openSystemUrlInNewTab(result.url);
  }

  const peerEntry = useMemo(() => {
    if (!account || !enforceMemberNav) return null;
    return resolvePeerEntry(account.personId, systemId, positions);
  }, [account, enforceMemberNav, systemId, positions]);

  const oversightDepth = useMemo(
    () => oversightDepthForRoles(roles),
    [roles],
  );

  const boardOffice = useMemo(() => {
    if (!account || !enforceMemberNav || systemId === 'sys-choir') {
      return null;
    }
    if (peerEntry?.kind === 'oversight') return null;
    return resolveMinistryBoardOffice(
      account.personId,
      systemId,
      positions,
    );
  }, [account, enforceMemberNav, systemId, positions, peerEntry]);

  const roleFilteredNav = useMemo(() => {
    if (peerEntry?.kind === 'oversight') {
      return filterOversightNav(systemId, basePath, nav, oversightDepth);
    }
    if (!boardOffice) return nav;
    return filterMinistryNav(systemId, basePath, nav, boardOffice);
  }, [peerEntry, boardOffice, systemId, basePath, nav, oversightDepth]);

  const resolvedNav = roleFilteredNav.map((item) => {
    if (item.label !== 'People' && item.label !== 'Members') return item;
    if (canViewPeople || peerEntry?.kind === 'oversight') return item;
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
  }, [
    account,
    canEnter,
    systemId,
    session?.currentSystemId,
    session?.entryMode,
    refreshSession,
  ]);

  if (!account) {
    return <Navigate to={`/login?system=${systemId}`} replace />;
  }
  if (!canEnter(systemId)) {
    return (
      <div className="login-page">
        <div className="login-card">
          <h1>You don’t have access</h1>
          <p className="muted">
            Signed in as <strong>{personName}</strong>, but you can’t enter{' '}
            {system?.name ?? 'this system'}. Ask a church leader or ministry
            steward if you should be here.
          </p>
          <details className="forbidden-details">
            <summary>Technical details</summary>
            <p className="muted">
              Required: <code>SYSTEM / ENTER</code> for {systemId}
            </p>
          </details>
          <p style={{ marginTop: '1rem' }}>
            <Link to={`/login?system=${systemId}`}>Sign in here</Link>
            {' · '}
            <button
              type="button"
              className="btn ghost"
              onClick={openMainChurch}
              title="Opens Main Church in a new tab"
            >
              Open Main Church
            </button>
          </p>
        </div>
      </div>
    );
  }

  const oversight = peerEntry?.kind === 'oversight';
  const postureLabel = oversight
    ? ' · Itorero oversight · reports'
    : boardOffice && boardOffice !== 'MEMBER'
      ? ` · ${boardOffice.replaceAll('_', ' ')}`
      : boardOffice === 'MEMBER'
        ? ' · member'
        : '';

  return (
    <div className="ministry-shell">
      <header className="ministry-top">
        <div className="ministry-top-brand">
          <img src="/brand/adepr-logo.png" alt="ADEPR" width={38} height={38} />
          <div>
            <strong>{system?.name}</strong>
            <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>
              {personName}
              {postureLabel}
              {roles[0] && oversight ? ` · ${roleLabel(roles[0])}` : ''}
              {session?.entryMode === 'handoff'
                ? ' · entered via church SSO'
                : session?.entryMode === 'direct'
                  ? ' · direct login'
                  : ''}
            </div>
          </div>
        </div>
        <div className="row">
          <ThemeToggle />
          <button
            type="button"
            className="btn ghost"
            style={{ color: '#e4eef7', borderColor: '#2a4a66' }}
            onClick={openMainChurch}
            title="Opens Main Church in a new tab"
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
      {oversight && (
        <div
          className="ministry-oversight-banner"
          role="status"
          style={{
            padding: '0.55rem 1.1rem',
            background: 'color-mix(in srgb, var(--accent) 22%, var(--sidebar))',
            color: '#f3f8fc',
            fontSize: '0.85rem',
            fontWeight: 650,
            borderBottom: '1px solid #2a4a66',
          }}
        >
          You are here in Itorero oversight (reports view). Finance ledgers stay
          with ministry officers — assets and shared reports only.
        </div>
      )}
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
          blockBodyContent !== undefined ? (
            blockBodyContent
          ) : (
            <div className="panel">
              <h2 style={{ marginTop: 0 }}>No access</h2>
              <p className="muted">Nothing to show for this account.</p>
            </div>
          )
        ) : oversight ? (
          <OversightOutlet systemId={systemId} basePath={basePath} />
        ) : (
          <Outlet />
        )}
      </div>
      <p className="muted ministry-foot">
        Peer system at <code>{basePath}</code> · shared Person identity
        {oversight ? ' · oversight ≠ membership' : ''}
      </p>
    </div>
  );
}

/** Block deep-links to modules outside the member/board/oversight allow-list. */
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
  const { account, positions, roles } = useAuth();
  const location = useLocation();
  if (!account) {
    return <Navigate to={`/login?system=${systemId}`} replace />;
  }
  const entry = resolvePeerEntry(account.personId, systemId, positions);
  const key =
    moduleKey ?? ministryModuleKey(location.pathname, basePath);
  if (entry.kind === 'oversight') {
    if (!oversightMayAccessModule(systemId, key, oversightDepthForRoles(roles))) {
      return <Navigate to={basePath} replace />;
    }
    return children ?? <Outlet />;
  }
  const office = resolveMinistryBoardOffice(
    account.personId,
    systemId,
    positions,
  );
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
