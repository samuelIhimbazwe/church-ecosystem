import { useMemo, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  allowedOwnProfileSections,
  membershipTypeLabel,
  roleLabel,
} from '../domain/access';
import { useAuth } from '../auth/AuthContext';
import {
  EmptyState,
  ForbiddenState,
  StatusPill,
} from '../components/ui/StatusPill';
import {
  orgService,
  participationService,
  peopleService,
  systemsService,
} from '../services';

const SECTION_LABELS: Record<string, string> = {
  overview: 'Overview',
  personal: 'Personal',
  contact: 'Contact',
  family: 'Family',
  membership: 'Membership',
  baptism: 'Baptism',
  marriage: 'Marriage',
  certificates: 'Certificates',
  documents: 'Documents',
  ministries: 'Ministries',
  teams: 'Teams / service',
  service: 'Service history',
  history: 'History',
  timeline: 'Timeline',
  account: 'Account',
};

function SectionPanel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="panel" style={{ margin: 0 }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      {children}
    </div>
  );
}

export function PersonProfilePage() {
  const { id } = useParams();
  const {
    account,
    canManagePeople,
    canViewFullRecord,
    canViewPeople,
    allowedSections,
  } = useAuth();
  const person = id ? peopleService.getById(id) : null;
  const [section, setSection] = useState('overview');
  const isSelf = Boolean(account && person && account.personId === person.id);

  const memberships = person
    ? participationService.activeMemberships(person.id)
    : [];
  const positions = person
    ? participationService.activePositions(person.id)
    : [];
  const assignments = person
    ? participationService.activeAssignments(person.id)
    : [];
  const entitlements = person
    ? participationService.entitlementsFor(person.id)
    : [];
  const roles = person ? participationService.rolesFor(person.id) : [];

  const profileSections = useMemo(() => {
    if (isSelf && !canViewFullRecord) return allowedOwnProfileSections();
    return allowedSections;
  }, [isSelf, canViewFullRecord, allowedSections]);

  const visibleSections = useMemo(() => {
    const set = new Set(profileSections);
    return profileSections.filter((s) => set.has(s));
  }, [profileSections]);

  const activeSection = visibleSections.includes(section)
    ? section
    : (visibleSections[0] ?? 'overview');

  if (!person) {
    return (
      <div className="panel">
        <EmptyState
          title="Person not found"
          detail="They may have been removed from the directory."
          action={
            canViewPeople ? (
              <Link to="/people" className="btn">
                Back to directory
              </Link>
            ) : account ? (
              <Link to={`/people/${account.personId}`} className="btn">
                My profile
              </Link>
            ) : undefined
          }
        />
      </div>
    );
  }

  if (!isSelf && !canViewPeople) {
    return (
      <div className="stack">
        <div className="panel">
          <ForbiddenState
            resource="PERSON"
            action="VIEW"
            detail="The people directory is for church and ministry leaders. You may only open your own profile."
          />
        </div>
        {account && (
          <Link to={`/people/${account.personId}`} className="btn">
            Open my profile
          </Link>
        )}
      </div>
    );
  }

  const baptism = peopleService.baptism(person.id);
  const marriage = peopleService.marriage(person.id);
  const family = peopleService.familyLinks(person.id);
  const timeline = peopleService.timeline(person.id);
  const documents = peopleService.documents(person.id);
  const certificates = peopleService.certificates(person.id);
  const peerSystems = entitlements.filter((e) => e.systemId !== 'sys-main');
  /** Own profile or pastoral FULL — show 360 fields (not pastoral-only notes). */
  const seeFullFields = canViewFullRecord || isSelf;

  let body: ReactNode = null;

  if (activeSection === 'overview') {
    body = (
      <div className="stack">
        <div className="grid-2">
          <SectionPanel title="Snapshot">
            <p style={{ marginTop: 0 }}>
              Status:{' '}
              <StatusPill status={person.status}>{person.status}</StatusPill>
            </p>
            <p>Joined church: {person.joinedChurchOn ?? '—'}</p>
            <p>
              Roles:{' '}
              {roles.length === 0
                ? '—'
                : roles.map((r) => roleLabel(r)).join(' · ')}
            </p>
          </SectionPanel>
          <SectionPanel title="Contact">
            <p style={{ marginTop: 0 }}>Phone: {person.phone ?? '—'}</p>
            <p>Email: {person.email ?? '—'}</p>
            {seeFullFields && <p>Address: {person.address ?? '—'}</p>}
          </SectionPanel>
        </div>
        <div className="why-callout">
          <strong>Why they can enter systems</strong>
          {peerSystems.length === 0 ? (
            <p className="muted" style={{ margin: '0.4rem 0 0' }}>
              Main Church only — no peer entitlements.
            </p>
          ) : (
            <ul style={{ margin: '0.45rem 0 0', paddingLeft: '1.1rem' }}>
              {peerSystems.map((e) => (
                <li key={e.systemId}>
                  <strong>
                    {systemsService.getById(e.systemId)?.shortName ??
                      e.systemId}
                  </strong>
                  <span className="muted"> — {e.reasons.join(' · ')}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="muted" style={{ marginBottom: 0, marginTop: '0.5rem' }}>
            <Link to="/access">Probe in Access engine →</Link>
          </p>
        </div>
        <div className="grid-2">
          <SectionPanel title="Memberships">
            {memberships.length === 0 ? (
              <EmptyState title="No memberships" />
            ) : (
              <ul className="rail-list">
                {memberships.slice(0, 5).map((m) => (
                  <li key={m.id}>
                    {membershipTypeLabel(m.type)}
                    {m.systemId
                      ? ` → ${systemsService.getById(m.systemId)?.shortName}`
                      : ''}
                  </li>
                ))}
              </ul>
            )}
          </SectionPanel>
          <SectionPanel title="Positions">
            {positions.length === 0 ? (
              <EmptyState title="No positions" />
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
          </SectionPanel>
        </div>
      </div>
    );
  } else if (activeSection === 'personal') {
    body = (
      <SectionPanel title="Personal">
        {seeFullFields ? (
          <>
            <p style={{ marginTop: 0 }}>Full name: {person.fullName}</p>
            <p>Preferred: {person.preferredName ?? '—'}</p>
            <p>Date of birth: {person.dateOfBirth ?? '—'}</p>
            <p>Gender: {person.gender ?? '—'}</p>
            <p>National ID: {person.nationalId ?? '—'}</p>
            <p>Address: {person.address ?? '—'}</p>
            {canViewFullRecord && person.pastoralNotes && (
              <p>
                <strong>Pastoral notes:</strong> {person.pastoralNotes}
              </p>
            )}
          </>
        ) : (
          <>
            <p style={{ marginTop: 0 }}>
              Preferred: {person.preferredName ?? person.fullName}
            </p>
            <ForbiddenState
              resource="PERSON"
              action="VIEW_FULL"
              detail="Full personal identifiers require pastoral / secretary scope."
            />
          </>
        )}
      </SectionPanel>
    );
  } else if (activeSection === 'contact') {
    body = (
      <SectionPanel title="Contact">
        <p style={{ marginTop: 0 }}>Phone: {person.phone ?? '—'}</p>
        <p>Email: {person.email ?? '—'}</p>
        {canViewFullRecord && <p>Address: {person.address ?? '—'}</p>}
      </SectionPanel>
    );
  } else if (activeSection === 'family') {
    body = (
      <SectionPanel title="Family (household)">
        <p className="muted" style={{ marginTop: 0 }}>
          Household links on the pastoral record — not Choir team “families”.
        </p>
        {!seeFullFields ? (
          <ForbiddenState
            resource="PERSON"
            action="VIEW_FULL"
            detail="Household links require FULL pastoral scope."
          />
        ) : family.length === 0 ? (
          <EmptyState title="No family links on file" />
        ) : (
          <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
            {family.map((f) => (
              <li key={f.id}>
                <Link to={`/people/${f.otherPersonId}`}>{f.otherName}</Link>
                {' — '}
                {f.displayRelation}
                {f.notes ? ` · ${f.notes}` : ''}
              </li>
            ))}
          </ul>
        )}
      </SectionPanel>
    );
  } else if (activeSection === 'membership') {
    body = (
      <SectionPanel title="Memberships">
        {memberships.length === 0 ? (
          <EmptyState title="No memberships" />
        ) : (
          <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
            {memberships.map((m) => (
              <li key={m.id}>
                {membershipTypeLabel(m.type)}
                {m.systemId
                  ? ` → ${systemsService.getById(m.systemId)?.shortName}`
                  : ''}
                <div className="muted">
                  Since {m.startDate}
                  {m.orgUnitId
                    ? ` · ${orgService.getById(m.orgUnitId)?.name}`
                    : ''}
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionPanel>
    );
  } else if (activeSection === 'baptism') {
    body = (
      <SectionPanel title="Baptism">
        {!seeFullFields ? (
          <ForbiddenState
            resource="PERSON"
            action="VIEW_FULL"
            detail="Baptism record is pastoral / secretary only."
          />
        ) : !baptism ? (
          <EmptyState title="No baptism record on file" />
        ) : (
          <>
            <p style={{ marginTop: 0 }}>Date: {baptism.baptizedOn}</p>
            <p>Place: {baptism.place ?? '—'}</p>
            <p>Mode: {baptism.mode ?? '—'}</p>
            <p>Minister: {baptism.ministerName ?? '—'}</p>
            <p>Certificate: {baptism.certificateRef ?? '—'}</p>
            {baptism.notes && <p>Notes: {baptism.notes}</p>}
          </>
        )}
      </SectionPanel>
    );
  } else if (activeSection === 'marriage') {
    body = (
      <SectionPanel title="Marriage">
        {!seeFullFields ? (
          <ForbiddenState
            resource="PERSON"
            action="VIEW_FULL"
            detail="Marriage record is pastoral / secretary only."
          />
        ) : !marriage ? (
          <EmptyState title="No marriage record on file" />
        ) : (
          <>
            <p style={{ marginTop: 0 }}>
              Status:{' '}
              <StatusPill status={marriage.status}>
                {marriage.status}
              </StatusPill>
            </p>
            <p>
              Spouse:{' '}
              {marriage.spousePersonId ? (
                <Link to={`/people/${marriage.spousePersonId}`}>
                  {marriage.spouseName ?? marriage.spousePersonId}
                </Link>
              ) : (
                (marriage.spouseName ?? '—')
              )}
            </p>
            <p>Married on: {marriage.marriedOn}</p>
            <p>Place: {marriage.place ?? '—'}</p>
            <p>Certificate: {marriage.certificateRef ?? '—'}</p>
          </>
        )}
      </SectionPanel>
    );
  } else if (activeSection === 'certificates') {
    body = (
      <SectionPanel title="Certificates">
        {!seeFullFields ? (
          <ForbiddenState resource="PERSON" action="VIEW_FULL" />
        ) : certificates.length === 0 ? (
          <EmptyState title="None on file" />
        ) : (
          <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
            {certificates.map((d) => (
              <li key={d.id}>
                {d.label}
                {d.issuedOn ? ` · ${d.issuedOn}` : ''}
                {d.note ? ` · ${d.note}` : ''}
              </li>
            ))}
          </ul>
        )}
      </SectionPanel>
    );
  } else if (activeSection === 'documents') {
    body = (
      <SectionPanel title="Documents">
        {!seeFullFields ? (
          <ForbiddenState resource="PERSON" action="VIEW_FULL" />
        ) : documents.length === 0 ? (
          <EmptyState title="None on file" />
        ) : (
          <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
            {documents.map((d) => (
              <li key={d.id}>
                [{d.kind}] {d.label}
                {d.issuedOn ? ` · ${d.issuedOn}` : ''}
              </li>
            ))}
          </ul>
        )}
      </SectionPanel>
    );
  } else if (
    activeSection === 'ministries' ||
    activeSection === 'teams' ||
    activeSection === 'service'
  ) {
    body = (
      <div className="grid-2">
        <SectionPanel title="Positions">
          {positions.length === 0 ? (
            <EmptyState title="No positions" />
          ) : (
            <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
              {positions.map((p) => (
                <li key={p.id}>
                  {p.title} ({orgService.getById(p.orgUnitId)?.name})
                  {p.systemRole ? (
                    <div className="muted">{roleLabel(p.systemRole)}</div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </SectionPanel>
        <SectionPanel title="Assignments">
          {assignments.length === 0 ? (
            <EmptyState title="No assignments" />
          ) : (
            <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
              {assignments.map((a) => (
                <li key={a.id}>
                  {a.title} — {a.contextLabel}
                  {a.endDate ? (
                    <div className="muted">Until {a.endDate}</div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </SectionPanel>
      </div>
    );
  } else if (
    activeSection === 'timeline' ||
    activeSection === 'history'
  ) {
    body = (
      <SectionPanel
        title={activeSection === 'timeline' ? 'Timeline' : 'History'}
      >
        {!seeFullFields ? (
          <ForbiddenState
            resource="PERSON"
            action="VIEW_FULL"
            detail="Full timeline requires Pastor, Assistant Pastor, or Secretary."
          />
        ) : timeline.length === 0 ? (
          <EmptyState title="No timeline events" />
        ) : (
          <ul className="timeline-list">
            {timeline.map((e) => (
              <li key={e.id}>
                <div className="timeline-when">{e.at}</div>
                <div>
                  <StatusPill tone="neutral">{e.kind}</StatusPill>{' '}
                  <strong>{e.title}</strong>
                  {e.detail && <div className="muted">{e.detail}</div>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionPanel>
    );
  } else if (activeSection === 'account') {
    body = (
      <SectionPanel title="Account">
        <p className="muted" style={{ marginTop: 0 }}>
          Login credentials are 1:1 with Person. Linking is a secretary /
          admin workflow (see Access engine).
        </p>
        <p>
          Entitled systems:{' '}
          {entitlements
            .map(
              (e) =>
                systemsService.getById(e.systemId)?.shortName ?? e.systemId,
            )
            .join(', ') || 'Main only'}
        </p>
        <Link to="/access">Open Access engine →</Link>
      </SectionPanel>
    );
  }

  return (
    <div className="stack">
      <p>
        {canViewPeople ? (
          <Link to="/people">← People directory</Link>
        ) : (
          <span className="muted">My profile</span>
        )}
      </p>

      <div className="detail-hero">
        <p className="hero-kicker">
          {isSelf
            ? 'My 360° profile'
            : canViewFullRecord
              ? '360° pastoral record'
              : 'Limited profile'}
        </p>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <h2>{person.fullName}</h2>
            {person.preferredName &&
              person.preferredName !== person.fullName && (
                <p className="muted" style={{ margin: '0.25rem 0 0' }}>
                  Preferred: {person.preferredName}
                </p>
              )}
          </div>
          <div className="row">
            <StatusPill status={person.status}>{person.status}</StatusPill>
            {canManagePeople && (
              <Link to={`/people/${person.id}/edit`} className="btn secondary">
                Edit
              </Link>
            )}
          </div>
        </div>
        <div className="row" style={{ marginTop: '0.65rem' }}>
          {roles.map((r) => (
            <span key={r} className="badge">
              {roleLabel(r)}
            </span>
          ))}
          {!canViewFullRecord && !isSelf && (
            <span className="badge planned">Limited scope</span>
          )}
        </div>
        <div className="overview-strip">
          <div className="overview-tile">
            <div className="label">Memberships</div>
            <div className="value">{memberships.length}</div>
          </div>
          <div className="overview-tile">
            <div className="label">Positions</div>
            <div className="value">{positions.length}</div>
          </div>
          <div className="overview-tile">
            <div className="label">Assignments</div>
            <div className="value">{assignments.length}</div>
          </div>
          <div className="overview-tile">
            <div className="label">Peer systems</div>
            <div className="value">{peerSystems.length}</div>
          </div>
        </div>
      </div>

      <div className="profile-layout">
        <nav className="profile-nav" aria-label="Profile sections">
          {visibleSections.map((s) => (
            <button
              key={s}
              type="button"
              className={`profile-nav-item ${activeSection === s ? 'active' : ''}`}
              onClick={() => setSection(s)}
            >
              {SECTION_LABELS[s] ?? s}
            </button>
          ))}
        </nav>
        <div className="profile-main">{body}</div>
      </div>
    </div>
  );
}
