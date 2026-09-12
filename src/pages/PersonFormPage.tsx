import { type FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import type {
  FamilyRelation,
  Person,
  PersonTimelineEvent,
} from '../domain/types';
import { peopleService, participationService } from '../services';

type Tab = 'identity' | 'baptism' | 'marriage' | 'family' | 'timeline' | 'docs';

/**
 * Pastoral 360 edit — secretary / pastor / assistant with PERSON MANAGE.
 * Household family is record-only (links), not visit workflows.
 */
export function PersonFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const existing = id ? peopleService.getById(id) : null;
  const { canManagePeople, canViewFullRecord, authorize } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('identity');
  const [message, setMessage] = useState('');
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  const [fullName, setFullName] = useState(existing?.fullName ?? '');
  const [preferredName, setPreferredName] = useState(
    existing?.preferredName ?? '',
  );
  const [phone, setPhone] = useState(existing?.phone ?? '');
  const [email, setEmail] = useState(existing?.email ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(existing?.dateOfBirth ?? '');
  const [gender, setGender] = useState<Person['gender'] | ''>(
    existing?.gender ?? '',
  );
  const [address, setAddress] = useState(existing?.address ?? '');
  const [nationalId, setNationalId] = useState(existing?.nationalId ?? '');
  const [joinedChurchOn, setJoinedChurchOn] = useState(
    existing?.joinedChurchOn ?? '',
  );
  const [pastoralNotes, setPastoralNotes] = useState(
    existing?.pastoralNotes ?? '',
  );
  const [status, setStatus] = useState<Person['status']>(
    existing?.status ?? 'ACTIVE',
  );

  const baptism = id ? peopleService.baptism(id) : null;
  const [bapOn, setBapOn] = useState(baptism?.baptizedOn ?? '');
  const [bapPlace, setBapPlace] = useState(baptism?.place ?? '');
  const [bapMode, setBapMode] = useState(baptism?.mode ?? 'IMMERSION');
  const [bapMinister, setBapMinister] = useState(baptism?.ministerName ?? '');
  const [bapCert, setBapCert] = useState(baptism?.certificateRef ?? '');
  const [bapNotes, setBapNotes] = useState(baptism?.notes ?? '');

  const marriage = id ? peopleService.marriage(id) : null;
  const [marSpouse, setMarSpouse] = useState(marriage?.spouseName ?? '');
  const [marOn, setMarOn] = useState(marriage?.marriedOn ?? '');
  const [marPlace, setMarPlace] = useState(marriage?.place ?? '');
  const [marStatus, setMarStatus] = useState(marriage?.status ?? 'MARRIED');
  const [marCert, setMarCert] = useState(marriage?.certificateRef ?? '');
  const [marNotes, setMarNotes] = useState(marriage?.notes ?? '');

  const [famRelated, setFamRelated] = useState('');
  const [famRelation, setFamRelation] = useState<FamilyRelation>('OTHER');
  const [famNotes, setFamNotes] = useState('');

  const [tlAt, setTlAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [tlKind, setTlKind] =
    useState<PersonTimelineEvent['kind']>('NOTE');
  const [tlTitle, setTlTitle] = useState('');
  const [tlDetail, setTlDetail] = useState('');

  const [docLabel, setDocLabel] = useState('');
  const [docKind, setDocKind] = useState<
    'CERTIFICATE' | 'ID' | 'LETTER' | 'OTHER'
  >('CERTIFICATE');
  const [docIssued, setDocIssued] = useState('');
  const [docNote, setDocNote] = useState('');

  const peopleOptions = useMemo(
    () => peopleService.list().filter((p) => p.id !== id),
    [id],
  );

  if (!canManagePeople) {
    return (
      <div className="panel">
        <h2>Not authorized</h2>
        <Link to="/people">Back</Link>
      </div>
    );
  }

  if (isEdit && !existing) {
    return (
      <div className="panel">
        <h2>Person not found</h2>
        <Link to="/people">Back</Link>
      </div>
    );
  }

  function gate(): boolean {
    const decision = authorize('PERSON', 'MANAGE');
    if (!decision.allowed) {
      setMessage(decision.reason);
      return false;
    }
    return true;
  }

  function onSaveIdentity(e: FormEvent) {
    e.preventDefault();
    if (!gate()) return;
    const payload = {
      fullName,
      preferredName: preferredName || undefined,
      phone: phone || undefined,
      email: email || undefined,
      dateOfBirth: dateOfBirth || undefined,
      gender: gender || undefined,
      address: address || undefined,
      nationalId: nationalId || undefined,
      joinedChurchOn: joinedChurchOn || undefined,
      pastoralNotes: pastoralNotes || undefined,
      status,
    };
    if (isEdit && id) {
      peopleService.update(id, payload);
      setMessage('Identity saved');
      refresh();
      return;
    }
    const created = peopleService.create(payload);
    participationService.createMembership({
      personId: created.id,
      type: 'CHURCH_MEMBER',
      label: 'Church member',
    });
    setMessage('Person created · church membership added');
    window.setTimeout(() => navigate(`/people/${created.id}/edit`), 600);
  }

  function onSaveBaptism(e: FormEvent) {
    e.preventDefault();
    if (!id || !gate() || !canViewFullRecord) return;
    if (!bapOn) {
      setMessage('Baptism date required');
      return;
    }
    peopleService.saveBaptism({
      personId: id,
      baptizedOn: bapOn,
      place: bapPlace || undefined,
      mode: bapMode,
      ministerName: bapMinister || undefined,
      certificateRef: bapCert || undefined,
      notes: bapNotes || undefined,
    });
    peopleService.addTimelineEvent({
      personId: id,
      at: bapOn,
      kind: 'BAPTISM',
      title: 'Baptism record updated',
      detail: bapCert ? `Certificate ${bapCert}` : undefined,
    });
    setMessage('Baptism saved');
    refresh();
  }

  function onSaveMarriage(e: FormEvent) {
    e.preventDefault();
    if (!id || !gate() || !canViewFullRecord) return;
    if (!marOn) {
      setMessage('Marriage date required');
      return;
    }
    peopleService.saveMarriage({
      personId: id,
      spouseName: marSpouse || undefined,
      marriedOn: marOn,
      place: marPlace || undefined,
      status: marStatus,
      certificateRef: marCert || undefined,
      notes: marNotes || undefined,
    });
    peopleService.addTimelineEvent({
      personId: id,
      at: marOn,
      kind: 'MARRIAGE',
      title: 'Marriage record updated',
      detail: marSpouse ? `Spouse: ${marSpouse}` : undefined,
    });
    setMessage('Marriage saved');
    refresh();
  }

  function onAddFamily(e: FormEvent) {
    e.preventDefault();
    if (!id || !gate() || !canViewFullRecord || !famRelated) return;
    peopleService.addFamilyLink({
      personId: id,
      relatedPersonId: famRelated,
      relation: famRelation,
      notes: famNotes || undefined,
    });
    setFamRelated('');
    setFamNotes('');
    setMessage('Family link added (record only)');
    refresh();
  }

  function onAddTimeline(e: FormEvent) {
    e.preventDefault();
    if (!id || !gate() || !canViewFullRecord || !tlTitle) return;
    peopleService.addTimelineEvent({
      personId: id,
      at: tlAt,
      kind: tlKind,
      title: tlTitle,
      detail: tlDetail || undefined,
    });
    setTlTitle('');
    setTlDetail('');
    setMessage('Timeline event added');
    refresh();
  }

  function onAddDoc(e: FormEvent) {
    e.preventDefault();
    if (!id || !gate() || !canViewFullRecord || !docLabel) return;
    peopleService.addDocument({
      personId: id,
      label: docLabel,
      kind: docKind,
      issuedOn: docIssued || undefined,
      note: docNote || undefined,
    });
    setDocLabel('');
    setDocNote('');
    setMessage('Document meta saved');
    refresh();
  }

  const family = id ? peopleService.familyLinks(id) : [];
  const timeline = id ? peopleService.timeline(id) : [];
  const documents = id ? peopleService.documents(id) : [];

  const tabs: { id: Tab; label: string; needsFull?: boolean }[] = [
    { id: 'identity', label: 'Identity' },
    { id: 'baptism', label: 'Baptism', needsFull: true },
    { id: 'marriage', label: 'Marriage', needsFull: true },
    { id: 'family', label: 'Family', needsFull: true },
    { id: 'timeline', label: 'Timeline', needsFull: true },
    { id: 'docs', label: 'Documents', needsFull: true },
  ];

  return (
    <div className="stack">
      <div className="panel">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0 }}>
              {isEdit ? `Edit · ${existing?.fullName}` : 'Add person'}
            </h2>
            <p className="muted" style={{ margin: '0.35rem 0 0' }}>
              Pastoral 360 fields — household family is record only
            </p>
          </div>
          <Link
            to={id ? `/people/${id}` : '/people'}
            className="btn ghost"
          >
            {id ? 'View profile' : 'Cancel'}
          </Link>
        </div>
        <div className="row" style={{ marginTop: '0.75rem' }}>
          {tabs
            .filter((t) => !t.needsFull || (isEdit && canViewFullRecord))
            .map((t) => (
              <button
                key={t.id}
                type="button"
                className={`btn ${tab === t.id ? '' : 'ghost'}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
        </div>
        {message && (
          <p className="muted" style={{ marginBottom: 0 }}>
            {message}
          </p>
        )}
      </div>

      {tab === 'identity' && (
        <form className="panel stack" onSubmit={onSaveIdentity}>
          <div className="field">
            <label htmlFor="fullName">Full name</label>
            <input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="preferredName">Preferred name</label>
            <input
              id="preferredName"
              value={preferredName}
              onChange={(e) => setPreferredName(e.target.value)}
            />
          </div>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="phone">Phone</label>
              <input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="dob">Date of birth</label>
              <input
                id="dob"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="gender">Gender</label>
              <select
                id="gender"
                value={gender}
                onChange={(e) =>
                  setGender(e.target.value as Person['gender'] | '')
                }
              >
                <option value="">—</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="address">Address</label>
            <input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="nid">National ID</label>
              <input
                id="nid"
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="joined">Joined church</label>
              <input
                id="joined"
                type="date"
                value={joinedChurchOn}
                onChange={(e) => setJoinedChurchOn(e.target.value)}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as Person['status'])}
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="VISITOR">Visitor</option>
            </select>
          </div>
          {canViewFullRecord && (
            <div className="field">
              <label htmlFor="notes">Pastoral notes</label>
              <textarea
                id="notes"
                value={pastoralNotes}
                onChange={(e) => setPastoralNotes(e.target.value)}
                rows={3}
              />
            </div>
          )}
          <button type="submit" className="btn">
            Save identity
          </button>
        </form>
      )}

      {tab === 'baptism' && id && canViewFullRecord && (
        <form className="panel stack" onSubmit={onSaveBaptism}>
          <p className="muted" style={{ marginTop: 0 }}>
            One baptism record per person (upsert)
          </p>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="bapOn">Baptized on</label>
              <input
                id="bapOn"
                type="date"
                value={bapOn}
                onChange={(e) => setBapOn(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="bapMode">Mode</label>
              <select
                id="bapMode"
                value={bapMode}
                onChange={(e) =>
                  setBapMode(
                    e.target.value as 'IMMERSION' | 'POURING' | 'OTHER',
                  )
                }
              >
                <option value="IMMERSION">Immersion</option>
                <option value="POURING">Pouring</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="bapPlace">Place</label>
            <input
              id="bapPlace"
              value={bapPlace}
              onChange={(e) => setBapPlace(e.target.value)}
            />
          </div>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="bapMinister">Minister</label>
              <input
                id="bapMinister"
                value={bapMinister}
                onChange={(e) => setBapMinister(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="bapCert">Certificate ref</label>
              <input
                id="bapCert"
                value={bapCert}
                onChange={(e) => setBapCert(e.target.value)}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="bapNotes">Notes</label>
            <textarea
              id="bapNotes"
              value={bapNotes}
              onChange={(e) => setBapNotes(e.target.value)}
              rows={2}
            />
          </div>
          <button type="submit" className="btn">
            Save baptism
          </button>
        </form>
      )}

      {tab === 'marriage' && id && canViewFullRecord && (
        <form className="panel stack" onSubmit={onSaveMarriage}>
          <div className="field">
            <label htmlFor="marSpouse">Spouse name</label>
            <input
              id="marSpouse"
              value={marSpouse}
              onChange={(e) => setMarSpouse(e.target.value)}
            />
          </div>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="marOn">Married on</label>
              <input
                id="marOn"
                type="date"
                value={marOn}
                onChange={(e) => setMarOn(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="marStatus">Status</label>
              <select
                id="marStatus"
                value={marStatus}
                onChange={(e) =>
                  setMarStatus(
                    e.target.value as
                      | 'MARRIED'
                      | 'WIDOWED'
                      | 'DIVORCED'
                      | 'SEPARATED',
                  )
                }
              >
                <option value="MARRIED">Married</option>
                <option value="WIDOWED">Widowed</option>
                <option value="DIVORCED">Divorced</option>
                <option value="SEPARATED">Separated</option>
              </select>
            </div>
          </div>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="marPlace">Place</label>
              <input
                id="marPlace"
                value={marPlace}
                onChange={(e) => setMarPlace(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="marCert">Certificate ref</label>
              <input
                id="marCert"
                value={marCert}
                onChange={(e) => setMarCert(e.target.value)}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="marNotes">Notes</label>
            <textarea
              id="marNotes"
              value={marNotes}
              onChange={(e) => setMarNotes(e.target.value)}
              rows={2}
            />
          </div>
          <button type="submit" className="btn">
            Save marriage
          </button>
        </form>
      )}

      {tab === 'family' && id && canViewFullRecord && (
        <div className="stack">
          <div className="panel">
            <h3 style={{ marginTop: 0 }}>Household links</h3>
            <p className="muted">Record only — no visit workflows</p>
            {family.length === 0 ? (
              <p className="muted">No links</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Relation</th>
                    <th>Person</th>
                    <th>Notes</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {family.map((l) => (
                    <tr key={l.id}>
                      <td>{l.displayRelation}</td>
                      <td>{l.otherName}</td>
                      <td>{l.notes ?? '—'}</td>
                      <td>
                        <button
                          type="button"
                          className="btn ghost"
                          onClick={() => {
                            if (!gate()) return;
                            peopleService.removeFamilyLink(l.id);
                            setMessage('Link removed');
                            refresh();
                          }}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <form className="panel stack" onSubmit={onAddFamily}>
            <h3 style={{ margin: 0 }}>Add link</h3>
            <div className="field">
              <label htmlFor="famRel">Related person</label>
              <select
                id="famRel"
                value={famRelated}
                onChange={(e) => setFamRelated(e.target.value)}
                required
              >
                <option value="">— select —</option>
                {peopleOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="famRelation">Relation</label>
              <select
                id="famRelation"
                value={famRelation}
                onChange={(e) =>
                  setFamRelation(e.target.value as FamilyRelation)
                }
              >
                <option value="SPOUSE">Spouse</option>
                <option value="CHILD">Child</option>
                <option value="PARENT">Parent</option>
                <option value="SIBLING">Sibling</option>
                <option value="GUARDIAN">Guardian</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="famNotes">Notes</label>
              <input
                id="famNotes"
                value={famNotes}
                onChange={(e) => setFamNotes(e.target.value)}
              />
            </div>
            <button type="submit" className="btn">
              Add family link
            </button>
          </form>
        </div>
      )}

      {tab === 'timeline' && id && canViewFullRecord && (
        <div className="stack">
          <div className="panel">
            <h3 style={{ marginTop: 0 }}>Timeline</h3>
            <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
              {timeline.map((ev) => (
                <li key={ev.id}>
                  <strong>{ev.at}</strong> · {ev.kind} · {ev.title}
                  {ev.detail && (
                    <div className="muted">{ev.detail}</div>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <form className="panel stack" onSubmit={onAddTimeline}>
            <h3 style={{ margin: 0 }}>Add event</h3>
            <div className="grid-2">
              <div className="field">
                <label htmlFor="tlAt">Date</label>
                <input
                  id="tlAt"
                  type="date"
                  value={tlAt}
                  onChange={(e) => setTlAt(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="tlKind">Kind</label>
                <select
                  id="tlKind"
                  value={tlKind}
                  onChange={(e) =>
                    setTlKind(e.target.value as PersonTimelineEvent['kind'])
                  }
                >
                  <option value="NOTE">Note</option>
                  <option value="MEMBERSHIP">Membership</option>
                  <option value="BAPTISM">Baptism</option>
                  <option value="MARRIAGE">Marriage</option>
                  <option value="MINISTRY">Ministry</option>
                  <option value="DISCIPLINE">Discipline</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label htmlFor="tlTitle">Title</label>
              <input
                id="tlTitle"
                value={tlTitle}
                onChange={(e) => setTlTitle(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="tlDetail">Detail</label>
              <textarea
                id="tlDetail"
                value={tlDetail}
                onChange={(e) => setTlDetail(e.target.value)}
                rows={2}
              />
            </div>
            <button type="submit" className="btn">
              Add timeline event
            </button>
          </form>
        </div>
      )}

      {tab === 'docs' && id && canViewFullRecord && (
        <div className="stack">
          <div className="panel">
            <h3 style={{ marginTop: 0 }}>Documents (meta)</h3>
            <p className="muted">Prototype — metadata only, no file upload</p>
            <table className="table">
              <thead>
                <tr>
                  <th>Label</th>
                  <th>Kind</th>
                  <th>Issued</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((d) => (
                  <tr key={d.id}>
                    <td>{d.label}</td>
                    <td>{d.kind}</td>
                    <td>{d.issuedOn ?? '—'}</td>
                    <td>{d.note ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <form className="panel stack" onSubmit={onAddDoc}>
            <h3 style={{ margin: 0 }}>Add document meta</h3>
            <div className="field">
              <label htmlFor="docLabel">Label</label>
              <input
                id="docLabel"
                value={docLabel}
                onChange={(e) => setDocLabel(e.target.value)}
                required
              />
            </div>
            <div className="grid-2">
              <div className="field">
                <label htmlFor="docKind">Kind</label>
                <select
                  id="docKind"
                  value={docKind}
                  onChange={(e) =>
                    setDocKind(
                      e.target.value as
                        | 'CERTIFICATE'
                        | 'ID'
                        | 'LETTER'
                        | 'OTHER',
                    )
                  }
                >
                  <option value="CERTIFICATE">Certificate</option>
                  <option value="ID">ID</option>
                  <option value="LETTER">Letter</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="docIssued">Issued on</label>
                <input
                  id="docIssued"
                  type="date"
                  value={docIssued}
                  onChange={(e) => setDocIssued(e.target.value)}
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="docNote">Note</label>
              <input
                id="docNote"
                value={docNote}
                onChange={(e) => setDocNote(e.target.value)}
              />
            </div>
            <button type="submit" className="btn">
              Add document
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
