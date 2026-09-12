import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { eventTypeLabel } from '../../domain/permissions';
import { StatusPill } from '../../components/ui/StatusPill';
import type { SystemId } from '../../domain/types';
import {
  useEventsList,
  useProgramsList,
  useTasksList,
} from '../../hooks/useMissionLists';
import { missionService, systemsService } from '../../services';

/**
 * Peer-local Programs / Events / Tasks lists.
 * Detail opens under the same ministry basePath so session stays on the peer system.
 * Prefer API lists when VITE_API_URL is up; otherwise seed.
 */
export function PeerProgramsPage({
  systemId,
  basePath,
}: {
  systemId: SystemId;
  basePath: string;
}) {
  const { can } = useAuth();
  const { programs, loading, source } = useProgramsList({
    ownerSystemId: systemId,
    viewerSystemId: systemId,
  });

  if (!can('PROGRAM', 'VIEW', systemId)) {
    return (
      <div className="panel">
        <h2>Programs</h2>
        <p className="muted">No access</p>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Programs</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Owned by {systemsService.getById(systemId)?.shortName}. Audience pool
          and eligibility filter who can discover each program. Open a program
          to activate its roles.
          {source === 'api' && (
            <span className="muted"> · live API</span>
          )}
        </p>
        <Link className="btn secondary" to={`${basePath}/mission`}>
          Mission board
        </Link>
      </div>
      <div className="panel">
        {loading ? (
          <p className="muted">Loading…</p>
        ) : programs.length === 0 ? (
          <p className="muted">No discoverable programs.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Status</th>
                <th>Visibility</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {programs.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.name}</strong>
                    {p.eligibility && (
                      <div className="muted" style={{ fontSize: '0.85rem' }}>
                        Eligibility set
                      </div>
                    )}
                  </td>
                  <td>{p.programType ?? '—'}</td>
                  <td>
                    <StatusPill status={p.status}>{p.status}</StatusPill>
                  </td>
                  <td>{p.visibility}</td>
                  <td>
                    <Link to={`${basePath}/programs/${p.id}`}>Open</Link>
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

export function PeerEventsPage({
  systemId,
  basePath,
}: {
  systemId: SystemId;
  basePath: string;
}) {
  const { account, positions, can } = useAuth();
  const { events: ownedApi, loading, source } = useEventsList({
    ownerSystemId: systemId,
  });

  const viewOpts = {
    personId: account?.personId,
    positions,
    canEnterOwner: true,
  };
  const events =
    source === 'api'
      ? ownedApi
      : [
          ...missionService.listEvents({
            ownerSystemId: systemId,
            viewerSystemId: systemId,
            viewOpts,
          }),
          ...missionService
            .listEvents({ viewerSystemId: systemId, viewOpts })
            .filter(
              (e) =>
                e.ownerSystemId !== systemId &&
                e.collaboratorSystemIds?.includes(systemId),
            ),
        ];

  if (!can('EVENT', 'VIEW', systemId)) {
    return (
      <div className="panel">
        <h2>Events</h2>
        <p className="muted">No access</p>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Events</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Owned by this system or where this system is a collaborator.
          {source === 'api' && (
            <span className="muted"> · live API</span>
          )}
        </p>
        <Link className="btn secondary" to={`${basePath}/mission`}>
          Mission board
        </Link>
      </div>
      <div className="panel">
        {loading ? (
          <p className="muted">Loading…</p>
        ) : events.length === 0 ? (
          <p className="muted">No events.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>When</th>
                <th>Phase</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td>
                    <strong>{e.name}</strong>
                    {e.ownerSystemId !== systemId && (
                      <div className="muted" style={{ fontSize: '0.85rem' }}>
                        Collab ·{' '}
                        {systemsService.getById(e.ownerSystemId)?.shortName}
                      </div>
                    )}
                  </td>
                  <td>{eventTypeLabel(e.type)}</td>
                  <td>{new Date(e.startsAt).toLocaleString()}</td>
                  <td>{e.lifecyclePhase ?? 'PREPARE'}</td>
                  <td>
                    <StatusPill status={e.status}>{e.status}</StatusPill>
                  </td>
                  <td>
                    <Link to={`${basePath}/events/${e.id}`}>Open</Link>
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

export function PeerTasksPage({
  systemId,
  basePath,
}: {
  systemId: SystemId;
  basePath: string;
}) {
  const { can } = useAuth();
  const { tasks, loading, source } = useTasksList({ systemId });

  if (!can('TASK', 'VIEW', systemId)) {
    return (
      <div className="panel">
        <h2>Tasks</h2>
        <p className="muted">No access</p>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Tasks</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Work items owned by this system.
          {source === 'api' && (
            <span className="muted"> · live API</span>
          )}
        </p>
        <Link className="btn secondary" to={`${basePath}/mission`}>
          Mission board
        </Link>
      </div>
      <div className="panel">
        {loading ? (
          <p className="muted">Loading…</p>
        ) : tasks.length === 0 ? (
          <p className="muted">No tasks.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Due</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id}>
                  <td>
                    <strong>{t.title}</strong>
                  </td>
                  <td>
                    <StatusPill status={t.status}>{t.status}</StatusPill>
                  </td>
                  <td>{t.dueDate ?? '—'}</td>
                  <td>
                    <Link to={`${basePath}/tasks/${t.id}`}>Open</Link>
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
