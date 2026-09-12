import { type FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import type { OrgUnit, SystemId } from '../domain/types';
import {
  orgService,
  participationService,
  peopleService,
  systemsService,
} from '../services';

type BrowseCategory = 'MINISTRY' | 'TEAM' | 'ORGANISATION';

const CATEGORIES: Array<{
  key: BrowseCategory;
  title: string;
  blurb: string;
}> = [
  {
    key: 'MINISTRY',
    title: 'Ministries',
    blurb: 'Church ministries and their peer systems.',
  },
  {
    key: 'TEAM',
    title: 'Teams',
    blurb: 'Operational teams under ministries or standing alone.',
  },
  {
    key: 'ORGANISATION',
    title: 'Organisation',
    blurb: 'Named choirs and other organisations — not listed as teams.',
  },
];

function shortDescription(unit: OrgUnit): string {
  const text = (unit.description ?? '').trim();
  if (!text) return 'No description yet.';
  return text.length > 110 ? `${text.slice(0, 107).trimEnd()}…` : text;
}

function OrgUnitCard({ unit }: { unit: OrgUnit }) {
  const leader = unit.leaderPersonId
    ? peopleService.getById(unit.leaderPersonId)
    : null;
  const system = unit.systemId
    ? systemsService.getById(unit.systemId)
    : null;
  const rosterCount = participationService.rosterByOrgUnit(unit.id).length;

  return (
    <article className="panel org-card">
      <div className="org-card-top">
        <h3 className="org-card-title">{unit.name}</h3>
        {system && (
          <span
            className={`badge ${system.status === 'PLANNED' ? 'planned' : ''}`}
          >
            {system.status}
          </span>
        )}
      </div>
      <p className="org-card-desc muted">{shortDescription(unit)}</p>
      <div className="org-card-meta muted">
        {leader ? (
          <span>Led by {leader.preferredName}</span>
        ) : (
          <span>Leader not set</span>
        )}
        {rosterCount > 0 && <span>· {rosterCount} active</span>}
      </div>
      <div className="org-card-actions">
        <Link className="btn secondary" to={`/organization/${unit.id}`}>
          View detail
        </Link>
      </div>
    </article>
  );
}

export function OrganizationPage() {
  const { can, authorize, refreshSession } = useAuth();
  const canManage = can('ORG_UNIT', 'MANAGE');
  const [, setTick] = useState(0);
  const refresh = () => {
    setTick((t) => t + 1);
    refreshSession();
  };
  const units = orgService.list();
  const [msg, setMsg] = useState('');

  const [name, setName] = useState('');
  const [type, setType] = useState<BrowseCategory>('MINISTRY');
  const [parentId, setParentId] = useState('');
  const [description, setDescription] = useState('');
  const [leaderPersonId, setLeaderPersonId] = useState('');
  const [systemId, setSystemId] = useState('');

  const browseUnits = units.filter(
    (u): u is OrgUnit & { type: BrowseCategory } =>
      u.type === 'MINISTRY' || u.type === 'TEAM' || u.type === 'ORGANISATION',
  );

  function resetForm() {
    setName('');
    setType('MINISTRY');
    setParentId('');
    setDescription('');
    setLeaderPersonId('');
    setSystemId('');
  }

  function onSave(e: FormEvent) {
    e.preventDefault();
    const d = authorize('ORG_UNIT', 'MANAGE');
    if (!d.allowed) {
      setMsg(d.reason);
      return;
    }
    const payload = {
      name: name.trim(),
      type,
      parentId: parentId || undefined,
      description: description || undefined,
      leaderPersonId: leaderPersonId || undefined,
      systemId: (systemId || undefined) as SystemId | undefined,
    };
    orgService.create(payload);
    setMsg(`Created ${payload.name}`);
    resetForm();
    refresh();
  }

  return (
    <div className="stack">
      <div className="panel">
        <h2>Organisation</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Browse ministries, teams, and the choir organisation. Open a card for
          full details and leaders.
        </p>
        {msg && <p className="muted">{msg}</p>}
      </div>

      {CATEGORIES.map((cat) => {
        const items = browseUnits.filter((u) => u.type === cat.key);
        if (items.length === 0) return null;
        return (
          <section key={cat.key} className="stack org-category">
            <div>
              <h3 className="org-category-title">{cat.title}</h3>
              <p className="muted" style={{ margin: 0 }}>
                {cat.blurb}
              </p>
            </div>
            <div className="org-card-grid">
              {items.map((unit) => (
                <OrgUnitCard key={unit.id} unit={unit} />
              ))}
            </div>
          </section>
        );
      })}

      {canManage && (
        <form className="panel stack" onSubmit={onSave}>
          <h3 style={{ margin: 0 }}>Add unit</h3>
          <p className="muted" style={{ margin: 0 }}>
            Offices are not listed here. Edit an existing unit from its detail
            page.
          </p>
          <div className="field">
            <label htmlFor="oname">Name</label>
            <input
              id="oname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="otype">Category</label>
              <select
                id="otype"
                value={type}
                onChange={(e) => setType(e.target.value as BrowseCategory)}
              >
                <option value="MINISTRY">Ministry</option>
                <option value="TEAM">Team</option>
                <option value="ORGANISATION">Organisation</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="oparent">Parent</label>
              <select
                id="oparent"
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
              >
                <option value="">— none —</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="odesc">Description</label>
            <input
              id="odesc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="olead">Leader</label>
              <select
                id="olead"
                value={leaderPersonId}
                onChange={(e) => setLeaderPersonId(e.target.value)}
              >
                <option value="">— none —</option>
                {peopleService.list().map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="osys">Linked system</label>
              <select
                id="osys"
                value={systemId}
                onChange={(e) => setSystemId(e.target.value)}
              >
                <option value="">— none —</option>
                {systemsService.list().map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.shortName} ({s.status})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="row">
            <button type="submit" className="btn">
              Create unit
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
