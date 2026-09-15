import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { MissionCreateDrawer } from '../components/MissionCreateDrawer';
import {
  WorkItemViews,
  WorkViewToggle,
  type WorkViewMode,
} from '../components/WorkItemViews';
import { FilterBar, PageHead } from '../components/ui/FilterBar';
import {
  EmptyState,
  ForbiddenState,
  StatusPill,
} from '../components/ui/StatusPill';
import { eventTypeLabel } from '../domain/permissions';
import { eventToWorkItem } from '../domain/workItem';
import { useEventsList } from '../hooks/useMissionLists';
import { isChurchLeader, missionService, systemsService } from '../services';

export function EventsPage() {
  const { can, account, roles, refreshSession } = useAuth();
  const navigate = useNavigate();
  const { events, reload, source } = useEventsList();
  const refresh = () => {
    reload();
    refreshSession();
  };
  const [msg, setMsg] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [view, setView] = useState<WorkViewMode>('list');
  const canView = can('EVENT', 'VIEW');
  const canManage = can('EVENT', 'MANAGE');
  const churchLead = isChurchLeader(roles);

  const pending = events.filter((e) => e.status === 'PENDING_APPROVAL');
  const filtered = useMemo(() => {
    if (statusFilter === 'all') return events;
    if (statusFilter === 'pending') {
      return events.filter((e) => e.status === 'PENDING_APPROVAL');
    }
    if (statusFilter === 'confirmed') {
      return events.filter((e) => e.status === 'CONFIRMED');
    }
    if (statusFilter === 'cancelled') {
      return events.filter((e) => e.status === 'CANCELLED');
    }
    return events;
  }, [events, statusFilter]);

  if (!account || !canView) {
    return (
      <div className="panel">
        <h2>Events</h2>
        <ForbiddenState resource="EVENT" />
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="panel">
        <PageHead
          actions={
            canManage ? (
              <button
                type="button"
                className="btn"
                onClick={() => setCreateOpen(true)}
              >
                Create event
              </button>
            ) : undefined
          }
        />
        <div className="row" style={{ marginTop: '0.75rem' }}>
          <span className="badge">{events.length} visible</span>
          <span className="badge">{pending.length} pending</span>
        </div>
        <div style={{ marginTop: '0.75rem' }}>
          <div className="row" style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
            <FilterBar
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'all', label: 'All', count: events.length },
                {
                  value: 'pending',
                  label: 'Pending',
                  count: pending.length,
                },
                {
                  value: 'confirmed',
                  label: 'Confirmed',
                  count: events.filter((e) => e.status === 'CONFIRMED').length,
                },
                {
                  value: 'cancelled',
                  label: 'Cancelled',
                  count: events.filter((e) => e.status === 'CANCELLED').length,
                },
              ]}
            />
            <WorkViewToggle value={view} onChange={setView} />
          </div>
        </div>
      </div>

      {msg && <p className="badge">{msg}</p>}

      {pending.length > 0 && statusFilter === 'all' && (
        <div className="panel">
          <h3>Pending approval</h3>
          <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
            {pending.map((e) => (
              <li key={e.id}>
                <Link to={`/events/${e.id}`}>{e.name}</Link>
                <span className="muted">
                  {' '}
                  · missing{' '}
                  {missionService
                    .missingEventApprovals(e.id)
                    .map((l) => l.label)
                    .join(', ')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="panel">
        {view !== 'list' ? (
          <WorkItemViews
            items={filtered.map((e) => eventToWorkItem(e))}
            view={view}
            emptyTitle="No events match"
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No events match"
            detail={
              statusFilter === 'all'
                ? 'Create a church-visible event to get started.'
                : 'Try another filter.'
            }
            action={
              canManage && statusFilter === 'all' ? (
                <button
                  type="button"
                  className="btn"
                  onClick={() => setCreateOpen(true)}
                >
                  Create event
                </button>
              ) : undefined
            }
          />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Type</th>
                <th>Reg</th>
                <th>Scope</th>
                <th>When</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id}>
                  <td>
                    <Link to={`/events/${e.id}`}>
                      <strong>{e.name}</strong>
                    </Link>
                    {e.location && <div className="muted">{e.location}</div>}
                    {e.seriesLabel && (
                      <div className="muted">Series: {e.seriesLabel}</div>
                    )}
                  </td>
                  <td>{eventTypeLabel(e.type)}</td>
                  <td>
                    {(e.registrationMode ?? 'ANNOUNCEMENT_ONLY') ===
                    'REGISTRATION_REQUIRED'
                      ? `Reg${e.capacity ? ` (${e.capacity})` : ''}`
                      : 'Announce'}
                  </td>
                  <td>
                    {e.beyondOwnerScope ? 'Beyond' : 'In-scope'}
                    <div className="muted">
                      {systemsService.getById(e.ownerSystemId)?.shortName}
                    </div>
                  </td>
                  <td>{new Date(e.startsAt).toLocaleString()}</td>
                  <td>
                    <StatusPill status={e.status}>{e.status}</StatusPill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {account && (
        <MissionCreateDrawer
          kind="EVENT"
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          listSource={source}
          accountPersonId={account.personId}
          canManage={canManage}
          isChurchLeader={churchLead}
          onCreated={(r) => {
            setMsg(r.message);
            refresh();
            navigate(`/events/${r.id}`);
          }}
        />
      )}
    </div>
  );
}
