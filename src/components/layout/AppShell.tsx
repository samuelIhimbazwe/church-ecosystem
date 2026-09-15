import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useMemo } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { CommandPalette } from '../CommandPalette';
import { Icon } from '../ui/Icon';
import { useAttention } from '../../hooks/useAttention';
import { peekExitToMainChurch, consumeExitToMainChurch } from '../../navigation/systemScope';
import { authService, churchFinanceService } from '../../services';

function weekOfLabel(d = new Date()) {
  const start = new Date(d);
  // Church week often begins Sunday
  start.setDate(d.getDate() - d.getDay());
  start.setHours(0, 0, 0, 0);
  return start.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

const NAV_GROUPS: Array<{
  label: string;
  items: Array<{ to: string; label: string; end?: boolean; secondary?: boolean }>;
}> = [
  {
    label: 'Home',
    items: [
      { to: '/', label: 'Home', end: true },
      { to: '/inbox', label: 'Inbox' },
      { to: '/board', label: 'Board', secondary: true },
      { to: '/pastoral', label: 'Pastoral desk', secondary: true },
      { to: '/system-admin', label: 'System admin', secondary: true },
    ],
  },
  {
    label: 'People & org',
    items: [
      { to: '/people', label: 'People' },
      { to: '/organization', label: 'Organisation', secondary: true },
      { to: '/participation', label: 'Participation', secondary: true },
    ],
  },
  {
    label: 'Work',
    items: [
      { to: '/mission', label: 'Mission' },
      { to: '/programs', label: 'Programs', secondary: true },
      { to: '/events', label: 'Events', secondary: true },
      { to: '/tasks', label: 'Tasks', secondary: true },
      { to: '/projects', label: 'Projects', secondary: true },
      { to: '/calendar', label: 'Calendar', secondary: true },
      { to: '/reports/leadership', label: 'Reports', secondary: true },
    ],
  },
  {
    label: 'Treasury',
    items: [
      { to: '/finance', label: 'Overview', end: true },
      { to: '/finance/collections', label: 'Collections', secondary: true },
      { to: '/finance/budgets', label: 'Budgets', secondary: true },
      { to: '/finance/balance-sheet', label: 'Balance sheet', secondary: true },
      { to: '/finance/reports', label: 'Reports', secondary: true },
    ],
  },
  {
    label: 'Admin',
    items: [
      { to: '/access', label: 'Access' },
      { to: '/systems', label: 'Systems', secondary: true },
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
  const { unreadCount } = useAttention();

  useEffect(() => {
    // Do not steal an active peer/shared session on a transient Back into Main.
    // "Open Main Church" arms exit and switches session before navigating here.
    if (!session) return;
    if (session.currentSystemId !== 'sys-main' && !peekExitToMainChurch()) {
      return;
    }
    if (peekExitToMainChurch()) {
      consumeExitToMainChurch();
      authService.setCurrentSystem('sys-main', 'main');
      refreshSession();
      return;
    }
    // Already scoped to Main — avoid refreshSession loops on every render.
    if (session.currentSystemId === 'sys-main') return;
    authService.setCurrentSystem('sys-main', 'main');
    refreshSession();
  }, [refreshSession, session?.currentSystemId, location.pathname]);

  const profilePath = account ? `/people/${account.personId}` : '/people';
  /** Access engine + systems registry — governance only (not regular members). */
  const canAdminTools = can('AUDIT', 'VIEW', 'sys-main');
  const canTreasury = Boolean(
    account && churchFinanceService.canViewGeneral(account.personId),
  );

  const navGroups = NAV_GROUPS.map((group) => {
    if (group.label === 'Admin') {
      if (!canAdminTools) return { ...group, items: [] };
      return group;
    }
    if (group.label === 'Treasury') {
      if (!canTreasury) return { ...group, items: [] };
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

  const weekLabel = useMemo(() => weekOfLabel(), []);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <CommandPalette />
      <aside className="sidebar" aria-label="Primary">
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
        <nav className="nav" aria-label="Main">
          {navGroups.map((group) => (
            <div key={group.label} className="nav-group">
              <div className="nav-group-label">{group.label}</div>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    [
                      item.secondary ? 'nav-secondary' : '',
                      isActive ? 'active' : '',
                    ]
                      .filter(Boolean)
                      .join(' ') || undefined
                  }
                >
                  {item.label}
                  {item.to === '/inbox' && unreadCount > 0 ? (
                    <span className="nav-badge" aria-label={`${unreadCount} unread`}>
                      {unreadCount}
                    </span>
                  ) : null}
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
          <p className="sidebar-quote muted">
            Faith · Knowledge · Service
          </p>
          <button
            type="button"
            className="btn ghost sm"
            style={{ marginTop: '0.75rem' }}
            onClick={logout}
          >
            Sign out
          </button>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <div>
            <p className="topbar-week">Week of {weekLabel}</p>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <div className="topbar-actions">
            <button
              type="button"
              className="topbar-search"
              onClick={() => window.dispatchEvent(new Event('adepr:cmdk'))}
              title="Search (Ctrl/⌘+K)"
              aria-label="Open search"
            >
              <Icon name="search" size={15} />
              Search
              <kbd className="topbar-kbd">⌘K</kbd>
            </button>
            <NavLink to="/inbox" className="topbar-inbox" aria-label="Inbox">
              <Icon name="inbox" size={15} />
              Inbox
              {unreadCount > 0 ? (
                <span className="nav-badge" aria-label={`${unreadCount} unread`}>
                  {unreadCount}
                </span>
              ) : null}
            </NavLink>
            <span className="muted topbar-account">{personName}</span>
          </div>
        </header>
        <main className="content" id="main-content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
