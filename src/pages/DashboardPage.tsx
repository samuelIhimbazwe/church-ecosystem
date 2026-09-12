import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { SystemLauncher } from '../components/SystemLauncher';
import { StatusPill } from '../components/ui/StatusPill';
import { useAuth } from '../auth/AuthContext';
import { roleLabel } from '../domain/access';
import { canApproveEventLevel, canApproveScopeLevel } from '../domain/eventScope';
import type { SystemRole, WorkTask } from '../domain/types';
import {
  isChurchLeadership,
  missionService,
  orgService,
  peopleService,
  systemsService,
} from '../services';

type NeedItem = {
  id: string;
  kind: 'PROGRAM' | 'EVENT' | 'PROJECT' | 'TASK';
  title: string;
  reason: string;
  to: string;
};

type HomePersona =
  | 'leader'
  | 'secretary'
  | 'treasurer'
  | 'ministry'
  | 'member';

const MINISTRY_ROLES: SystemRole[] = [
  'CHOIR_LEADER',
  'WORSHIP_LEADER',
  'YOUTH_LEADER',
  'PROTOCOL_LEADER',
  'DEACON_LEADER',
];

/** Dashboard preview lists — open the linked full page for the rest. */
const DASHBOARD_PREVIEW_LIMIT = 3;

function resolvePersona(roles: SystemRole[]): HomePersona {
  if (isChurchLeadership(roles)) return 'leader';
  if (roles.includes('CHURCH_SECRETARY')) return 'secretary';
  if (roles.includes('CHURCH_TREASURER')) return 'treasurer';
  if (roles.some((r) => MINISTRY_ROLES.includes(r))) return 'ministry';
  return 'member';
}

const PERSONA_COPY: Record<
  HomePersona,
  { kicker: string; blurb: string }
> = {
  leader: {
    kicker: 'Pastoral home',
    blurb:
      'Clear approvals first, then church calendar and mission. Peer systems stay one handoff away.',
  },
  secretary: {
    kicker: 'Operations home',
    blurb:
      'People, participation, and org registry are your desk. Approvals and calendar stay visible.',
  },
  treasurer: {
    kicker: 'Finance home',
    blurb:
      'Shared Finance vaults stay ORG_PRIVATE. Open Finance for grants — linking a project fund is not a vault open.',
  },
  ministry: {
    kicker: 'Ministry home',
    blurb:
      'Your peer system is primary. Main Church shows church-visible work and anything assigned to you.',
  },
  member: {
    kicker: 'Member home',
    blurb:
      'Your tasks, upcoming church dates, and the systems you can enter — without staff clutter.',
  },
};

function calHref(item: {
  kind: string;
  id: string;
  programId?: string;
}) {
  if (item.kind === 'EVENT') return `/events/${item.id}`;
  if (item.programId) return `/programs/${item.programId}`;
  return '/programs';
}

export function DashboardPage() {
  const {
    personName,
    account,
    session,
    positions,
    roles,
    roleLabels,
    availableSystems,
    memberships,
    assignments,
    tasks,
    entitlements,
    canManagePeople,
    canViewPeople,
    can,
  } = useAuth();

  const canAdminTools = can('AUDIT', 'VIEW', 'sys-main');
  const persona = resolvePersona(roles);
  const copy = PERSONA_COPY[persona];
  const peopleCount = canViewPeople ? peopleService.list().length : 0;
  const myProfilePath = account ? `/people/${account.personId}` : '/';
  const orgCount = orgService.list().length;
  const ministrySystems = availableSystems.filter((s) => s.kind === 'MINISTRY');
  const viewOpts = {
    personId: account?.personId,
    positions,
    canEnterOwner: true,
  };
  const calendarItems = missionService.calendar('sys-main', viewOpts);
  const upcoming = calendarItems.slice(0, DASHBOARD_PREVIEW_LIMIT);
  const calendarMore = calendarItems.length - upcoming.length;
  const { church, own } = missionService.programsForSystem(
    'sys-main',
    viewOpts,
  );
  const myTasks = tasks.filter(
    (t) => t.status === 'TODO' || t.status === 'IN_PROGRESS',
  );
  const myTasksPreview = myTasks.slice(0, DASHBOARD_PREVIEW_LIMIT);
  const tasksMore = myTasks.length - myTasksPreview.length;

  const approvals: NeedItem[] = [];
  const taskNeeds: NeedItem[] = [];
  if (account) {
    if (isChurchLeadership(roles)) {
      for (const p of missionService.listPrograms({
        viewerSystemId: 'sys-main',
        viewOpts,
      })) {
        if (p.status === 'PENDING_APPROVAL') {
          approvals.push({
            id: `prog-${p.id}`,
            kind: 'PROGRAM',
            title: p.name,
            reason: 'Program awaiting Church Leadership approval',
            to: `/programs/${p.id}`,
          });
        }
      }
      for (const p of missionService.listProjects({
        viewerSystemId: 'sys-main',
        viewOpts,
      })) {
        if (p.status === 'PENDING_APPROVAL' && !p.beyondOwnerScope) {
          approvals.push({
            id: `proj-in-${p.id}`,
            kind: 'PROJECT',
            title: p.name,
            reason: 'In-scope project awaiting Church Leadership approval',
            to: `/projects/${p.id}`,
          });
        }
      }
    }

    for (const e of missionService.listEvents({
      viewerSystemId: 'sys-main',
      viewOpts,
    })) {
      if (e.status !== 'PENDING_APPROVAL' || !e.beyondOwnerScope) continue;
      const missing = missionService.missingEventApprovals(e.id);
      const canAny = missing.some((level) =>
        canApproveEventLevel(level, roles, positions),
      );
      if (canAny) {
        approvals.push({
          id: `evt-${e.id}`,
          kind: 'EVENT',
          title: e.name,
          reason: `Pending: ${missing.map((m) => m.label).join(', ')}`,
          to: `/events/${e.id}`,
        });
      }
    }

    for (const p of missionService.listProjects({
      viewerSystemId: 'sys-main',
      viewOpts,
    })) {
      if (p.status === 'PENDING_APPROVAL' && p.beyondOwnerScope) {
        const missing = missionService.missingProjectApprovals(p.id);
        const canAny = missing.some((level) =>
          canApproveScopeLevel(level, roles, positions),
        );
        if (canAny) {
          approvals.push({
            id: `proj-${p.id}`,
            kind: 'PROJECT',
            title: p.name,
            reason: `Pending: ${missing.map((m) => m.label).join(', ')}`,
            to: `/projects/${p.id}`,
          });
        }
      }
      if (
        p.status === 'PLANNED' &&
        (can('PROJECT', 'MANAGE') ||
          p.leadPersonId === account.personId ||
          p.createdByPersonId === account.personId)
      ) {
        approvals.push({
          id: `proj-setup-${p.id}`,
          kind: 'PROJECT',
          title: p.name,
          reason: 'In SETUP — start running when ready',
          to: `/projects/${p.id}`,
        });
      }
      if (
        p.status === 'CLOSING' &&
        (can('PROJECT', 'MANAGE') ||
          p.leadPersonId === account.personId ||
          p.createdByPersonId === account.personId)
      ) {
        approvals.push({
          id: `proj-close-${p.id}`,
          kind: 'PROJECT',
          title: p.name,
          reason: 'In CLOSING — finish stewardship close-out',
          to: `/projects/${p.id}`,
        });
      }
    }

    for (const p of missionService.listPrograms({
      viewerSystemId: 'sys-main',
      viewOpts,
    })) {
      if (
        p.status === 'SETUP' &&
        (can('PROGRAM', 'MANAGE') ||
          (p.leaderPersonIds ?? []).includes(account.personId))
      ) {
        approvals.push({
          id: `prog-setup-${p.id}`,
          kind: 'PROGRAM',
          title: p.name,
          reason: 'In SETUP — start running when ready',
          to: `/programs/${p.id}`,
        });
      }
      if (
        p.status === 'CLOSING' &&
        (can('PROGRAM', 'MANAGE') ||
          (p.leaderPersonIds ?? []).includes(account.personId))
      ) {
        approvals.push({
          id: `prog-close-${p.id}`,
          kind: 'PROGRAM',
          title: p.name,
          reason: 'In CLOSING — finish stewardship close-out',
          to: `/programs/${p.id}`,
        });
      }
    }

    for (const t of myTasks) {
      taskNeeds.push({
        id: `task-${t.id}`,
        kind: 'TASK',
        title: t.title,
        reason: t.dueDate ? `Your task · due ${t.dueDate}` : 'Your open task',
        to: `/tasks/${t.id}`,
      });
    }
  }

  const needsMe =
    persona === 'leader' || persona === 'secretary'
      ? [...approvals, ...taskNeeds]
      : [...taskNeeds, ...approvals];

  const peerEntitlements = entitlements.filter((e) => e.systemId !== 'sys-main');
  const peerPreview = peerEntitlements.slice(0, DASHBOARD_PREVIEW_LIMIT);
  const peerMore = peerEntitlements.length - peerPreview.length;

  return (
    <div className="stack">
      <div className="detail-hero dash-hero">
        <p className="hero-kicker">{copy.kicker}</p>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2>Welcome, {personName}</h2>
          <span className="persona-chip">{roleLabels[0] ?? 'Member'}</span>
        </div>
        <p className="muted" style={{ marginBottom: 0 }}>
          {copy.blurb}
          {session?.entryMode === 'handoff' ? ' (SSO handoff.)' : ''}
        </p>
        <div className="overview-strip" style={{ marginTop: '0.85rem' }}>
          {persona === 'secretary' || persona === 'leader' ? (
            canViewPeople ? (
              <div className="overview-tile">
                <div className="label">People</div>
                <div className="value">{peopleCount}</div>
              </div>
            ) : null
          ) : null}
          {(persona === 'leader' || persona === 'secretary') && (
            <div className="overview-tile">
              <div className="label">Approvals</div>
              <div className="value">{approvals.length}</div>
            </div>
          )}
          <div className="overview-tile">
            <div className="label">Your tasks</div>
            <div className="value">{myTasks.length}</div>
          </div>
          <div className="overview-tile">
            <div className="label">Systems</div>
            <div className="value">{ministrySystems.length}</div>
          </div>
          {persona === 'member' && (
            <div className="overview-tile">
              <div className="label">Memberships</div>
              <div className="value">{memberships.length}</div>
            </div>
          )}
          {persona === 'treasurer' && (
            <div className="overview-tile">
              <div className="label">Org units</div>
              <div className="value">{orgCount}</div>
            </div>
          )}
        </div>
        <div className="row" style={{ marginTop: '0.85rem' }}>
          {persona === 'leader' && (
            <>
              <Link to="/mission" className="btn">
                Mission board
              </Link>
              <Link to="/people" className="btn secondary">
                People
              </Link>
              <Link to="/calendar" className="btn ghost">
                Calendar
              </Link>
            </>
          )}
          {persona === 'secretary' && (
            <>
              {canManagePeople && (
                <Link to="/people/new" className="btn">
                  Add person
                </Link>
              )}
              <Link to="/people" className="btn secondary">
                Directory
              </Link>
              {can('MEMBERSHIP', 'MANAGE') && (
                <Link to="/participation" className="btn ghost">
                  Participation
                </Link>
              )}
              {can('ORG_UNIT', 'MANAGE') && (
                <Link to="/organization" className="btn ghost">
                  Organisation
                </Link>
              )}
            </>
          )}
          {persona === 'treasurer' && (
            <>
              <Link to="/systems/finance" className="btn">
                Open Finance
              </Link>
              <Link to="/projects" className="btn secondary">
                Projects
              </Link>
            </>
          )}
          {persona === 'ministry' && (
            <>
              <Link to="/tasks" className="btn">
                My tasks
              </Link>
              <Link to="/participation" className="btn secondary">
                Why I can enter
              </Link>
            </>
          )}
          {persona === 'member' && (
            <>
              <Link to={myProfilePath} className="btn">
                My profile
              </Link>
              <Link to="/tasks" className="btn secondary">
                My tasks
              </Link>
              <Link to="/calendar" className="btn ghost">
                Calendar
              </Link>
            </>
          )}
        </div>
      </div>

      {needsMe.length > 0 && (
        <div className="needs-me">
          <h3>
            Needs me · {needsMe.length}
            {approvals.length > 0 && persona === 'leader'
              ? ` · ${approvals.length} approval${approvals.length === 1 ? '' : 's'}`
              : ''}
          </h3>
          <p className="muted" style={{ marginTop: 0, marginBottom: '0.65rem' }}>
            {persona === 'leader'
              ? 'Approvals you can clear, then tasks assigned to you.'
              : 'Items waiting on you.'}
          </p>
          <ul className="needs-me-list">
            {needsMe.slice(0, 8).map((n) => (
              <li key={n.id}>
                <div>
                  <StatusPill
                    tone={n.kind === 'TASK' ? 'info' : 'neutral'}
                  >
                    {n.kind}
                  </StatusPill>{' '}
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

      {persona === 'ministry' || persona === 'treasurer' ? (
        <div className="dashboard-home-row">
          <div className="dashboard-home-launcher">
            <div
              className="row"
              style={{
                justifyContent: 'space-between',
                marginBottom: '0.15rem',
              }}
            >
              <h2 style={{ margin: 0, fontFamily: 'var(--font-display)' }}>
                {persona === 'treasurer' ? 'Finance & peers' : 'Your systems'}
              </h2>
              {canAdminTools ? <Link to="/systems">All systems</Link> : null}
            </div>
            <SystemLauncher excludeMain />
          </div>
          <aside className="dashboard-home-side" aria-label="Home previews">
            <DashboardCalendarPanel
              upcoming={upcoming}
              calendarMore={calendarMore}
            />
            <DashboardTasksPanel
              title="Your open tasks"
              tasks={myTasksPreview}
              tasksMore={tasksMore}
            />
            <DashboardAccessPanel
              title={
                persona === 'ministry' ? 'Why you can enter' : 'System access'
              }
              peerPreview={peerPreview}
              peerMore={peerMore}
              summaryLine={
                <>
                  {roles.map(roleLabel).join(' · ') || 'Member'} ·{' '}
                  {memberships.length} memberships · {assignments.length}{' '}
                  assignments
                </>
              }
            />
          </aside>
        </div>
      ) : null}

      {(persona === 'leader' ||
        persona === 'secretary' ||
        persona === 'member') && (
        <div className="dashboard-home-row">
          <div className="dashboard-home-launcher">
            <div
              className="row"
              style={{
                justifyContent: 'space-between',
                marginBottom: '0.15rem',
              }}
            >
              <h2 style={{ margin: 0, fontFamily: 'var(--font-display)' }}>
                System launcher
              </h2>
              {canAdminTools ? <Link to="/systems">All systems</Link> : null}
            </div>
            <SystemLauncher excludeMain />
          </div>
          <aside className="dashboard-home-side" aria-label="Home previews">
            <DashboardCalendarPanel
              upcoming={upcoming}
              calendarMore={calendarMore}
            />
            <DashboardTasksPanel
              title={
                persona === 'member' ? 'My open tasks' : 'Your open tasks'
              }
              tasks={myTasksPreview}
              tasksMore={tasksMore}
            />
            <DashboardAccessPanel
              title={
                persona === 'member' ? 'Why you can enter' : 'System access'
              }
              peerPreview={peerPreview}
              peerMore={peerMore}
              summaryLine={
                <>
                  {roles.map(roleLabel).join(' · ') || 'Member'} ·{' '}
                  {memberships.length} memberships · {assignments.length}{' '}
                  assignments
                  {persona === 'leader'
                    ? ` · ${church.length} church programs`
                    : ''}
                  {persona === 'member'
                    ? ` · private programs: ${own.length}`
                    : ''}
                </>
              }
            />
          </aside>
        </div>
      )}
    </div>
  );
}

function DashboardCalendarPanel({
  upcoming,
  calendarMore,
}: {
  upcoming: {
    kind: string;
    id: string;
    title: string;
    startsAt: string;
    systemId: string;
  }[];
  calendarMore: number;
}) {
  return (
    <div className="panel dashboard-preview-panel">
      <div
        className="row"
        style={{ justifyContent: 'space-between', marginBottom: '0.35rem' }}
      >
        <h3 style={{ margin: 0 }}>Church calendar</h3>
        <Link to="/calendar">Full calendar</Link>
      </div>
      {upcoming.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}>
          No upcoming items
        </p>
      ) : (
        <ul className="dashboard-preview-list">
          {upcoming.map((item) => (
            <li key={`${item.kind}-${item.id}`}>
              <Link to={calHref(item)}>
                <strong>{item.title}</strong>
              </Link>
              <div className="muted">
                {new Date(item.startsAt).toLocaleDateString()} · {item.kind} ·{' '}
                {systemsService.getById(item.systemId)?.shortName ??
                  item.systemId}
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="dashboard-preview-foot">
        {calendarMore > 0 ? (
          <Link to="/calendar">+{calendarMore} more →</Link>
        ) : (
          <span className="row" style={{ gap: '0.65rem' }}>
            <Link to="/mission">Mission</Link>
            <Link to="/events">Events</Link>
          </span>
        )}
      </div>
    </div>
  );
}

function DashboardTasksPanel({
  title,
  tasks,
  tasksMore,
}: {
  title: string;
  tasks: WorkTask[];
  tasksMore: number;
}) {
  return (
    <div className="panel dashboard-preview-panel">
      <h3 style={{ margin: 0, marginBottom: '0.35rem' }}>{title}</h3>
      {tasks.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}>
          None
        </p>
      ) : (
        <ul className="dashboard-preview-list">
          {tasks.map((t) => (
            <li key={t.id}>
              <Link to={`/tasks/${t.id}`}>
                <strong>{t.title}</strong>
              </Link>
              <div className="muted">
                {t.contextLabel ?? t.status}
                {t.dueDate ? ` · due ${t.dueDate}` : ''}
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="dashboard-preview-foot">
        <Link to="/tasks">
          {tasksMore > 0 ? `+${tasksMore} more tasks →` : 'All tasks →'}
        </Link>
      </div>
    </div>
  );
}

function DashboardAccessPanel({
  title,
  peerPreview,
  peerMore,
  summaryLine,
}: {
  title: string;
  peerPreview: { systemId: string; reasons: string[] }[];
  peerMore: number;
  summaryLine: ReactNode;
}) {
  return (
    <div className="panel dashboard-preview-panel">
      <h3 style={{ margin: 0, marginBottom: '0.35rem' }}>{title}</h3>
      {peerPreview.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}>
          No ministry systems entitled yet.
        </p>
      ) : (
        <ul className="dashboard-preview-list">
          {peerPreview.map((e) => (
            <li key={e.systemId}>
              <strong>
                {systemsService.getById(e.systemId)?.shortName ?? e.systemId}
              </strong>
              <div className="muted">{e.reasons[0] ?? ''}</div>
            </li>
          ))}
        </ul>
      )}
      <div className="dashboard-preview-foot">
        {peerMore > 0 ? (
          <Link to="/access">+{peerMore} more →</Link>
        ) : (
          <Link to="/access">Access engine →</Link>
        )}
        <p className="muted" style={{ margin: '0.35rem 0 0', fontSize: '0.75rem' }}>
          {summaryLine}
        </p>
      </div>
    </div>
  );
}
