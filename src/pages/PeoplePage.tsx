import { useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { roleLabel } from '../domain/access';
import { useAuth } from '../auth/AuthContext';
import { FilterBar, PageHead } from '../components/ui/FilterBar';
import { TextField } from '../components/ui/Field';
import { Icon } from '../components/ui/Icon';
import { MasterDetail } from '../components/ui/MasterDetail';
import {
  EmptyState,
  ForbiddenState,
  StatusPill,
} from '../components/ui/StatusPill';
import { useListSelection } from '../hooks/useListSelection';
import type { Person } from '../domain/types';
import {
  buildPersonParticipationPlaces,
  participationService,
  peopleService,
} from '../services';
import { pastoralOpsService } from '../services/pastoralOpsService';

type StatusFilter = 'all' | 'ACTIVE' | 'INACTIVE' | 'VISITOR' | 'pathway';

export function PeoplePage() {
  const { canManagePeople, canViewPeople, account } = useAuth();
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const searched = useMemo(() => peopleService.search(q), [q]);
  const pathwayPersonIds = useMemo(
    () =>
      new Set(
        pastoralOpsService
          .listPathways({ openOnly: true })
          .map((p) => p.personId),
      ),
    [],
  );

  const people = useMemo(() => {
    if (statusFilter === 'pathway') {
      return searched.filter((p) => pathwayPersonIds.has(p.id));
    }
    if (statusFilter === 'all') return searched;
    return searched.filter((p) => p.status === statusFilter);
  }, [searched, statusFilter, pathwayPersonIds]);

  const counts = useMemo(() => {
    const all = searched;
    return {
      all: all.length,
      ACTIVE: all.filter((p) => p.status === 'ACTIVE').length,
      INACTIVE: all.filter((p) => p.status === 'INACTIVE').length,
      VISITOR: all.filter((p) => p.status === 'VISITOR').length,
      pathway: all.filter((p) => pathwayPersonIds.has(p.id)).length,
    };
  }, [searched, pathwayPersonIds]);

  const { selectedId, selected, setSelectedId } = useListSelection(people);

  if (!canViewPeople) {
    if (account?.personId) {
      return <Navigate to={`/people/${account.personId}`} replace />;
    }
    return (
      <ForbiddenState
        resource="PERSON"
        action="VIEW"
        detail="The directory is for church and ministry leaders. Ask a leader if you need access, or open your own profile when linked to your account."
        recovery={
          <Link to="/" className="btn secondary">
            Back home
          </Link>
        }
      />
    );
  }

  const memberships = selected
    ? participationService.activeMemberships(selected.id)
    : [];
  const positions = selected
    ? participationService.activePositions(selected.id)
    : [];
  const assignments = selected
    ? participationService.activeAssignments(selected.id)
    : [];
  const roles = selected ? participationService.rolesFor(selected.id) : [];
  const places = selected
    ? buildPersonParticipationPlaces({
        memberships,
        positions,
        assignments,
      })
    : [];

  return (
    <div className="list-page people-page">
      <div className="list-chrome">
        <PageHead
          actions={
            canManagePeople ? (
              <Link to="/people/new" className="btn">
                <Icon name="plus" size={15} />
                Add person
              </Link>
            ) : undefined
          }
        />
        <div className="list-toolbar people-toolbar">
          <div className="people-search">
            <TextField
              label="Search"
              name="search"
              id="people-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Name, phone, or email"
            />
          </div>
          <FilterBar
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as StatusFilter)}
            options={[
              { value: 'all', label: 'All', count: counts.all },
              { value: 'ACTIVE', label: 'Active', count: counts.ACTIVE },
              {
                value: 'pathway',
                label: 'In process',
                count: counts.pathway,
              },
              { value: 'VISITOR', label: 'Visitors', count: counts.VISITOR },
              { value: 'INACTIVE', label: 'Inactive', count: counts.INACTIVE },
            ]}
            onClearAll={() => {
              setStatusFilter('all');
              setQ('');
            }}
          />
        </div>
      </div>

      {people.length === 0 ? (
        <div className="list-surface" style={{ padding: '1rem' }}>
          <EmptyState
            variant={q || statusFilter !== 'all' ? 'no-results' : 'first-use'}
            title={
              q || statusFilter !== 'all'
                ? 'No people match'
                : 'Directory is empty'
            }
            detail={
              q || statusFilter !== 'all'
                ? 'Try another name, or clear filters.'
                : 'Add the first person so ministries know who they serve.'
            }
            action={
              q || statusFilter !== 'all' ? (
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => {
                    setQ('');
                    setStatusFilter('all');
                  }}
                >
                  Clear search
                </button>
              ) : canManagePeople ? (
                <Link to="/people/new" className="btn">
                  Add person
                </Link>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="list-surface">
          <MasterDetail
            listWidth="minmax(18rem, 1.1fr)"
            list={
              <ul
                className="people-master-list"
                role="listbox"
                aria-label="People"
              >
                {people.map((p) => (
                  <PersonRow
                    key={p.id}
                    person={p}
                    selected={selectedId === p.id}
                    onSelect={() => setSelectedId(p.id)}
                  />
                ))}
              </ul>
            }
            detail={
              selected ? (
                <PersonDetail
                  person={selected}
                  memberships={memberships}
                  positions={positions}
                  roles={roles}
                  places={places}
                  canManagePeople={canManagePeople}
                />
              ) : null
            }
            emptyDetail={
              <EmptyState
                variant="no-results"
                title="Select someone"
                detail="Choose a person from the list to preview their profile."
              />
            }
          />
        </div>
      )}
    </div>
  );
}

function PersonRow({
  person: p,
  selected,
  onSelect,
}: {
  person: Person;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        role="option"
        aria-selected={selected}
        className={`people-master-item${selected ? ' selected' : ''}`}
        onClick={onSelect}
      >
        <span className="people-avatar" aria-hidden>
          {(p.preferredName || p.fullName).slice(0, 1).toUpperCase()}
        </span>
        <span className="people-master-body">
          <strong>{p.preferredName || p.fullName}</strong>
          <span className="muted">
            {p.phone || p.email || 'No contact on file'}
          </span>
        </span>
        <StatusPill status={p.status} />
      </button>
    </li>
  );
}

function PersonDetail({
  person: selected,
  memberships,
  positions,
  roles,
  places,
  canManagePeople,
}: {
  person: Person;
  memberships: ReturnType<typeof participationService.activeMemberships>;
  positions: ReturnType<typeof participationService.activePositions>;
  roles: ReturnType<typeof participationService.rolesFor>;
  places: ReturnType<typeof buildPersonParticipationPlaces>;
  canManagePeople: boolean;
}) {
  return (
    <div className="people-detail">
      <p className="hero-kicker" style={{ marginTop: 0 }}>
        Preview
      </p>
      <h3 className="people-detail-name">{selected.fullName}</h3>
      <p className="muted" style={{ marginTop: 0 }}>
        {selected.preferredName &&
        selected.preferredName !== selected.fullName
          ? `${selected.preferredName} · `
          : ''}
        {selected.email ?? selected.phone ?? 'No contact on file'}
      </p>
      <div className="row" style={{ marginBottom: '0.85rem', flexWrap: 'wrap' }}>
        <StatusPill status={selected.status} />
        {roles.map((r) => (
          <span key={r} className="badge">
            {roleLabel(r)}
          </span>
        ))}
      </div>

      <h4 className="people-detail-section">Where they participate</h4>
      {places.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}>
          No memberships, positions, or assignments on file
        </p>
      ) : (
        <ul className="rail-list people-place-list">
          {places.map((place) => (
            <li key={place.key}>
              <strong>{place.placeName}</strong>
              {place.roles.length > 0 && (
                <div className="muted">
                  Role · {place.roles.join(' · ')}
                </div>
              )}
              {place.lines.slice(0, 3).map((line) => (
                <div key={line} className="muted" style={{ fontSize: '0.85rem' }}>
                  {line}
                </div>
              ))}
            </li>
          ))}
        </ul>
      )}

      {(memberships.length > 0 || positions.length > 0) && (
        <p className="muted" style={{ margin: '0.75rem 0 0', fontSize: '0.85rem' }}>
          Full membership and position lists are on the profile.
        </p>
      )}

      <div className="row" style={{ marginTop: '1.1rem' }}>
        <Link to={`/people/${selected.id}`} className="btn">
          Open full profile
        </Link>
        {canManagePeople && (
          <Link to={`/people/${selected.id}/edit`} className="btn ghost">
            Edit
          </Link>
        )}
      </div>
    </div>
  );
}
