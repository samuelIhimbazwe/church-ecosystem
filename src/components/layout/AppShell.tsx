import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { peekExitToMainChurch, consumeExitToMainChurch } from '../../navigation/systemScope';
import { authService } from '../../services';

const NAV_GROUPS: Array<{
  label: string;
  items: Array<{ to: string; label: string; end?: boolean }>;
}> = [
  {
    label: 'Home',
    items: [{ to: '/', label: 'Dashboard', end: true }],
  },
  {
    label: 'People & org',
    items: [
      { to: '/people', label: 'People' },
      { to: '/organization', label: 'Organisation' },
      { to: '/participation', label: 'Participation' },
    ],
  },
  {
    label: 'Work',
    items: [
      { to: '/mission', label: 'Mission' },
      { to: '/programs', label: 'Programs' },
      { to: '/events', label: 'Events' },
      { to: '/tasks', label: 'Tasks' },
      { to: '/projects', label: 'Projects' },
      { to: '/calendar', label: 'Calendar' },
    ],
  },
  {
    label: 'Admin',
    items: [
      { to: '/access', label: 'Access' },
      { to: '/systems', label: 'Systems' },
    ],
  },
];

export function AppShell({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  const {
    personName,
    roleLabels,
    logout,
    currentSystem,
    refreshSession,
    canViewPeople,
    account,
    can,
    session,
  } = useAuth();
  const location = useLocation();

  useEffect(() => {
    // Do not steal an active peer/shared session on a transient Back into Main.
    // "Open Main Church" arms exit and switches session before navigating here.
    if (
      session &&
      session.currentSystemId !== 'sys-main' &&
      !peekExitToMainChurch()
    ) {
      return;
    }
    consumeExitToMainChurch();
    authService.setCurrentSystem('sys-main', 'main');
    refreshSession();
  }, [refreshSession, session, location.pathname]);

  const profilePath = account ? `/people/${account.personId}` : '/people';
  /** Access engine + systems registry — governance only (not regular members). */
  const canAdminTools = can('AUDIT', 'VIEW', 'sys-main');

  const navGroups = NAV_GROUPS.map((group) => {
    if (group.label === 'Admin') {
      if (!canAdminTools) return { ...group, items: [] };
      return group;
    }
    if (group.label !== 'People & org') return group;
    return {
      ...group,
      items: group.items.map((item) =>
        item.to === '/people'
          ? canViewPeople
            ? item
            : { to: profilePath, label: 'Profile' }
          : item,
      ),
    };
  }).filter((group) => group.items.length > 0);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img
            className="brand-logo"
            src="/brand/adepr-logo.png"
            alt="ADEPR"
            width={44}
            height={44}
          />
          <div className="brand-text">
            ADEPR Kacyiru
            <small>{currentSystem?.shortName ?? 'Main Church'}</small>
          </div>
        </div>
        <nav className="nav">
          {navGroups.map((group) => (
            <div key={group.label} className="nav-group">
              <div className="nav-group-label">{group.label}</div>
              {group.items.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end}>
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div>{personName}</div>
          <div className="muted">
            {roleLabels.join(' · ') || 'Member'}
          </div>
          <button
            type="button"
            className="btn ghost"
            style={{
              marginTop: '0.75rem',
              color: '#e4eef7',
              borderColor: '#2a4a66',
            }}
            onClick={logout}
          >
            Sign out
          </button>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
        </header>
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
