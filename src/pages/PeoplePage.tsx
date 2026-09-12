import { useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { membershipTypeLabel, roleLabel } from '../domain/access';
import { useAuth } from '../auth/AuthContext';
import { StatusPill } from '../components/ui/StatusPill';
import {
  participationService,
  peopleService,
  systemsService,
} from '../services';

export function PeoplePage() {
  const { canManagePeople, canViewPeople, account } = useAuth();
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const people = useMemo(() => peopleService.search(q), [q]);

  if (!canViewPeople) {
    if (account?.personId) {
      return <Navigate to={`/people/${account.personId}`} replace />;
    }
    return (
      <div className="panel forbidden-state">
        <h2>People directory</h2>
        <p className="muted">
          The people directory is for church and ministry leaders only. Open
          Profile to view your own record.
        </p>
      </div>
    );
  }

  const selected =
    selectedId != null
      ? (peopleService.getById(selectedId) ?? null)
      : null;
  const memberships = selected
    ? participationService.activeMemberships(selected.id)
    : [];
  const positions = selected
    ? participationService.activePositions(selected.id)
    : [];
  const roles = selected ? participationService.rolesFor(selected.id) : [];
  const entitlements = selected
    ? participationService.entitlementsFor(selected.id)
    : [];

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="field" style={{ minWidth: 240, flex: 1 }}>
          <label htmlFor="search">Search people</label>
          <input
            id="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name or email"
          />
        </div>
        {canManagePeople && (
          <Link to="/people/new" className="btn" style={{ alignSelf: 'end' }}>
            Add person
          </Link>
        )}
      </div>

      <div className="people-split">
        <div className="panel" style={{ margin: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {people.map((p) => (
                <tr
                  key={p.id}
                  className={
                    selectedId === p.id ? 'people-row selected' : 'people-row'
                  }
                  onClick={() => setSelectedId(p.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedId(p.id);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                >
                  <td>
                    <strong>{p.preferredName || p.fullName}</strong>
                    {p.preferredName && p.preferredName !== p.fullName && (
                      <div className="muted">{p.fullName}</div>
                    )}
                  </td>
                  <td>
                    <div>{p.phone ?? '—'}</div>
                    <div className="muted">{p.email ?? ''}</div>
                  </td>
                  <td>
                    <StatusPill status={p.status}>{p.status}</StatusPill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="profile-rail panel">
          {!selected ? (
            <div className="empty-state" style={{ padding: '1rem 0' }}>
              <p className="muted" style={{ margin: 0 }}>
                Select a person to preview memberships, offices, and systems.
              </p>
            </div>
          ) : (
            <>
              <p className="hero-kicker" style={{ marginTop: 0 }}>
                Profile preview
              </p>
              <h3 style={{ margin: '0 0 0.35rem', fontFamily: 'var(--font-display)' }}>
                {selected.fullName}
              </h3>
              <p className="muted" style={{ marginTop: 0 }}>
                {selected.preferredName &&
                selected.preferredName !== selected.fullName
                  ? `${selected.preferredName} · `
                  : ''}
                {selected.email ?? selected.phone ?? 'No contact on file'}
              </p>
              <div className="row" style={{ marginBottom: '0.75rem' }}>
                <StatusPill status={selected.status}>
                  {selected.status}
                </StatusPill>
                {roles.map((r) => (
                  <span key={r} className="badge">
                    {roleLabel(r)}
                  </span>
                ))}
              </div>

              <h4 style={{ margin: '0.5rem 0 0.35rem' }}>Memberships</h4>
              {memberships.length === 0 ? (
                <p className="muted" style={{ margin: 0 }}>
                  None active
                </p>
              ) : (
                <ul className="rail-list">
                  {memberships.slice(0, 4).map((m) => (
                    <li key={m.id}>
                      {m.label || membershipTypeLabel(m.type)}
                    </li>
                  ))}
                </ul>
              )}

              <h4 style={{ margin: '0.85rem 0 0.35rem' }}>Positions</h4>
              {positions.length === 0 ? (
                <p className="muted" style={{ margin: 0 }}>
                  None active
                </p>
              ) : (
                <ul className="rail-list">
                  {positions.slice(0, 4).map((p) => (
                    <li key={p.id}>
                      {p.title}
                      {p.systemRole ? ` · ${roleLabel(p.systemRole)}` : ''}
                    </li>
                  ))}
                </ul>
              )}

              <h4 style={{ margin: '0.85rem 0 0.35rem' }}>Can enter</h4>
              {entitlements.filter((e) => e.systemId !== 'sys-main').length ===
              0 ? (
                <p className="muted" style={{ margin: 0 }}>
                  Main Church only
                </p>
              ) : (
                <ul className="rail-list">
                  {entitlements
                    .filter((e) => e.systemId !== 'sys-main')
                    .slice(0, 5)
                    .map((e) => (
                      <li key={e.systemId}>
                        {systemsService.getById(e.systemId)?.shortName ??
                          e.systemId}
                      </li>
                    ))}
                </ul>
              )}

              <div className="row" style={{ marginTop: '1rem' }}>
                <Link to={`/people/${selected.id}`} className="btn">
                  Open full profile
                </Link>
                {canManagePeople && (
                  <Link
                    to={`/people/${selected.id}/edit`}
                    className="btn ghost"
                  >
                    Edit
                  </Link>
                )}
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
