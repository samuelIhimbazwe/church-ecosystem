import { type FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Drawer } from '../components/ui/Drawer';
import { FilterBar, PageHead } from '../components/ui/FilterBar';
import {
  EmptyState,
  ForbiddenState,
  StatusPill,
} from '../components/ui/StatusPill';
import type {
  ChurchEventType,
  EventRegistrationMode,
  MissionVisibility,
} from '../domain/types';
import { eventTypeLabel } from '../domain/permissions';
import { useEventsList } from '../hooks/useMissionLists';
import { missionService, systemsService } from '../services';

const EVENT_TYPES: ChurchEventType[] = [
  'CONFERENCE',
  'BAPTISM',
  'WEDDING',
  'CONCERT',
  'RETREAT',
  'SEMINAR',
  'SPECIAL_SERVICE',
  'CAMPAIGN',
  'OTHER',
];

export function EventsPage() {
  const { can, account, refreshSession } = useAuth();
  const navigate = useNavigate();
  const { events, reload } = useEventsList();
  const refresh = () => {
    reload();
    refreshSession();
  };
  const [msg, setMsg] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const canView = can('EVENT', 'VIEW');
  const canManage = can('EVENT', 'MANAGE');

  const [name, setName] = useState('');
  const [etype, setEtype] = useState<ChurchEventType>('OTHER');
  const [vis, setVis] = useState<MissionVisibility>('CHURCH');
  const [regMode, setRegMode] =
    useState<EventRegistrationMode>('ANNOUNCEMENT_ONLY');
  const [capacity, setCapacity] = useState('50');
  const [beyond, setBeyond] = useState(false);
  const [startsAt, setStartsAt] = useState('2026-09-21T10:00');
  const [location, setLocation] = useState('');
  const [desc, setDesc] = useState('');
  const [projectId, setProjectId] = useState('');

  const pending = events.filter((e) => e.status === 'PENDING_APPROVAL');
  const projects = missionService.listProjects({ viewerSystemId: 'sys-main' });
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

  function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!canManage || !name.trim()) return;
    const ev = missionService.createEvent({
      name: name.trim(),
      type: etype,
      ownerSystemId: 'sys-main',
      startsAt: new Date(startsAt).toISOString(),
      location: location || undefined,
      description: desc || undefined,
      visibility: vis,
      registrationMode: regMode,
      capacity:
        regMode === 'REGISTRATION_REQUIRED'
          ? Number(capacity) || undefined
          : undefined,
      beyondOwnerScope: beyond,
      projectId: projectId || undefined,
      createdByPersonId: account!.personId,
    });
    setMsg(
      beyond
        ? `Created ${ev.name} — pending upper approvals`
        : `Created ${ev.name} — confirmed (in-scope)`,
    );
    setName('');
    setProjectId('');
    setCreateOpen(false);
    refresh();
    navigate(`/events/${ev.id}`);
  }

  return (
    <div className="stack">
      <div className="panel">
        <PageHead
          title="Events"
          subtitle="Dated occasions. In-scope confirms immediately; beyond-scope needs every upper level."
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

      <Drawer
        open={createOpen}
        title="Create event"
        onClose={() => setCreateOpen(false)}
        wide
      >
        <form className="stack" onSubmit={onCreate}>
          <div className="field">
            <label>Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>Type</label>
            <select
              value={etype}
              onChange={(e) => setEtype(e.target.value as ChurchEventType)}
            >
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {eventTypeLabel(t)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Starts</label>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>Link to project (optional)</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="">None</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Location</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Registration mode</label>
            <select
              value={regMode}
              onChange={(e) =>
                setRegMode(e.target.value as EventRegistrationMode)
              }
            >
              <option value="ANNOUNCEMENT_ONLY">Announcement only</option>
              <option value="REGISTRATION_REQUIRED">
                Registration required
              </option>
            </select>
          </div>
          {regMode === 'REGISTRATION_REQUIRED' && (
            <div className="field">
              <label>Capacity</label>
              <input
                type="number"
                min={1}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
              />
            </div>
          )}
          <div className="field">
            <label>Visibility</label>
            <select
              value={vis}
              onChange={(e) => setVis(e.target.value as MissionVisibility)}
            >
              <option value="CHURCH">General church</option>
              <option value="MINISTRY_PRIVATE">Private</option>
              <option value="SELECTIVE">Selective</option>
            </select>
          </div>
          <label className="row">
            <input
              type="checkbox"
              checked={beyond}
              onChange={(e) => setBeyond(e.target.checked)}
            />
            Beyond owner scope (needs upper approvals)
          </label>
          <div className="field">
            <label>Description</label>
            <input value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>
          <button type="submit" className="btn">
            Create event
          </button>
        </form>
      </Drawer>

      <div className="panel">
        {filtered.length === 0 ? (
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
    </div>
  );
}
