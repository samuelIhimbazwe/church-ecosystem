import { useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { membershipTypeLabel, roleLabel } from '../domain/access';
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
  participationService,
  peopleService,
  systemsService,
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
  const roles = selected ? participationService.rolesFor(selected.id) : [];
  const entitlements = selected
    ? participationService.entitlementsFor(selected.id)
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
                  entitlements={entitlements}
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
  entitlements,
  canManagePeople,
}: {
  person: Person;
  memberships: ReturnType<typeof participationService.activeMemberships>;
  positions: ReturnType<typeof participationService.activePositions>;
  roles: ReturnType<typeof participationService.rolesFor>;
  entitlements: ReturnType<typeof participationService.entitlementsFor>;
  canManagePeople: boolean;
}) {
  const ministryEntries = entitlements.filter((e) => e.systemId !== 'sys-main');

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

      <h4 className="people-detail-section">Memberships</h4>
      {memberships.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}>
          None active
        </p>
      ) : (
        <ul className="rail-list">
          {memberships.slice(0, 5).map((m) => (
            <li key={m.id}>{m.label || membershipTypeLabel(m.type)}</li>
          ))}
        </ul>
      )}

      <h4 className="people-detail-section">Positions</h4>
      {positions.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}>
          None active
        </p>
      ) : (
        <ul className="rail-list">
          {positions.slice(0, 5).map((p) => (
            <li key={p.id}>
              {p.title}
              {p.systemRole ? ` · ${roleLabel(p.systemRole)}` : ''}
            </li>
          ))}
        </ul>
      )}

      <h4 className="people-detail-section">Ministries they can enter</h4>
      {ministryEntries.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}>
          Main Church only
        </p>
      ) : (
        <ul className="rail-list">
          {ministryEntries.slice(0, 6).map((e) => (
            <li key={e.systemId}>
              {systemsService.getById(e.systemId)?.shortName ??
                systemsService.getById(e.systemId)?.name ??
                'Ministry'}
            </li>
          ))}
        </ul>
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
