import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  actionLabel,
  PERMISSION_PROBES,
  resourceLabel,
} from '../domain/permissions';
import type { Action, Resource, SystemId } from '../domain/types';
import {
  accessService,
  auditService,
  peopleService,
  systemsService,
} from '../services';
import { SelectField } from '../components/ui/Field';

type ProbeFilter = 'all' | 'allow' | 'deny';
type ExplorerMode = 'person' | 'capability';

export function AccessEnginePage() {
  const { account, personName, session, grants, currentSystem } = useAuth();
  const [systemId, setSystemId] = useState<SystemId>(
    session?.currentSystemId ?? 'sys-main',
  );
  const [auditTick, setAuditTick] = useState(0);
  const [filter, setFilter] = useState<ProbeFilter>('all');
  const [mode, setMode] = useState<ExplorerMode>('person');
  const [probePersonId, setProbePersonId] = useState(
    () => account?.personId ?? '',
  );
  const [probeResource, setProbeResource] = useState<Resource>(
    PERMISSION_PROBES[0]?.resource ?? 'SYSTEM',
  );
  const [probeAction, setProbeAction] = useState<Action>(
    PERMISSION_PROBES[0]?.action ?? 'ENTER',
  );

  const systems = systemsService.listActive();
  const people = peopleService.list();
  const subjectPersonId =
    mode === 'person' ? probePersonId || account?.personId || '' : account?.personId ?? '';

  const matrix = useMemo(() => {
    if (!subjectPersonId) return [];
    return accessService.probeMatrix(subjectPersonId, systemId);
  }, [subjectPersonId, systemId]);

  const filtered = useMemo(() => {
    if (filter === 'allow') return matrix.filter((d) => d.allowed);
    if (filter === 'deny') return matrix.filter((d) => !d.allowed);
    return matrix;
  }, [matrix, filter]);

  const enterDecision = useMemo(
    () => matrix.find((d) => d.resource === 'SYSTEM' && d.action === 'ENTER'),
    [matrix],
  );

  const systemGrants = useMemo(
    () =>
      subjectPersonId
        ? accessService.grantsInSystem(subjectPersonId, systemId)
        : grants.filter((g) => g.systemId === systemId),
    [subjectPersonId, systemId, grants],
  );

  const capabilityPeople = useMemo(() => {
    if (mode !== 'capability') return [];
    return accessService
      .peopleWhoCan(probeResource, probeAction, systemId)
      .map((pid) => {
        const p = peopleService.getById(pid);
        return {
          id: pid,
          name: p?.preferredName || p?.fullName || pid,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [mode, systemId, probeResource, probeAction]);

  const audit = useMemo(() => {
    void auditTick;
    return auditService.list().slice(0, 25);
  }, [auditTick, matrix]);

  const sysName = systemsService.getById(systemId)?.shortName ?? systemId;
  const allowCount = matrix.filter((d) => d.allowed).length;
  const denyCount = matrix.length - allowCount;
  const probeSubject =
    peopleService.getById(subjectPersonId)?.preferredName ||
    peopleService.getById(subjectPersonId)?.fullName ||
    personName;

  if (!account) return null;

  return (
    <div className="stack">
      <div className="panel">
        <h2>Access engine</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Explore what people can do. Direct ministry login and church→ministry
          SSO both call the same{' '}
          <code>authorize(person, system, resource, action)</code>.
        </p>
        <div className="row">
          <span className="badge">
            Current context: {currentSystem?.shortName ?? 'Main'}
          </span>
          <span className="badge">{grants.length} total grants</span>
          <span className="badge">{systemGrants.length} in selected system</span>
        </div>
      </div>

      <div className="panel">
        <div className="tabs" role="tablist" aria-label="Explorer mode" style={{ marginBottom: '0.75rem' }}>
          <button
            type="button"
            role="tab"
            className="tab"
            aria-selected={mode === 'person'}
            onClick={() => setMode('person')}
          >
            Person → capabilities
          </button>
          <button
            type="button"
            role="tab"
            className="tab"
            aria-selected={mode === 'capability'}
            onClick={() => setMode('capability')}
          >
            Capability → people
          </button>
        </div>

        {mode === 'person' ? (
          <>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0 }}>Probe person</h3>
              <div className="row" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ minWidth: 200 }}>
                  <SelectField
                    label="Person"
                    name="probe-person"
                    id="probe-person"
                    value={probePersonId || account.personId}
                    onChange={(e) => setProbePersonId(e.target.value)}
                  >
                    {people.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.preferredName || p.fullName}
                      </option>
                    ))}
                  </SelectField>
                </div>
                <div style={{ minWidth: 200 }}>
                  <SelectField
                    label="System"
                    name="sys"
                    id="sys"
                    value={systemId}
                    onChange={(e) => setSystemId(e.target.value as SystemId)}
                  >
                    {systems.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.shortName}
                      </option>
                    ))}
                  </SelectField>
                </div>
              </div>
            </div>

            {enterDecision && (
              <div
                className={`why-callout ${enterDecision.allowed ? '' : 'denied'}`}
                style={{ marginTop: '0.75rem' }}
              >
                <strong>
                  Why {enterDecision.allowed ? 'they can' : "they can't"} enter{' '}
                  {sysName}
                </strong>
                <p style={{ margin: '0.4rem 0 0' }}>{enterDecision.reason}</p>
                {enterDecision.matchedGrant && (
                  <p
                    className="muted"
                    style={{ margin: '0.35rem 0 0', fontSize: '0.88rem' }}
                  >
                    Matched grant: {enterDecision.matchedGrant.source}
                    {enterDecision.matchedGrant.reason
                      ? ` — ${enterDecision.matchedGrant.reason}`
                      : ''}
                  </p>
                )}
              </div>
            )}

            <div className="row" style={{ margin: '0.75rem 0' }} role="group" aria-label="Permission filter">
              <div className="tabs">
                <button
                  type="button"
                  className="tab"
                  aria-pressed={filter === 'all'}
                  onClick={() => setFilter('all')}
                >
                  All ({matrix.length})
                </button>
                <button
                  type="button"
                  className="tab"
                  aria-pressed={filter === 'allow'}
                  onClick={() => setFilter('allow')}
                >
                  Allow ({allowCount})
                </button>
                <button
                  type="button"
                  className="tab"
                  aria-pressed={filter === 'deny'}
                  onClick={() => setFilter('deny')}
                >
                  Deny ({denyCount})
                </button>
              </div>
              <span className="muted">Subject: {probeSubject}</span>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Resource</th>
                  <th>Action</th>
                  <th>Allowed</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="muted">
                      {matrix.length > 0 ? (
                        <>
                          No probes match this filter.{' '}
                          <button
                            type="button"
                            className="btn ghost"
                            style={{ padding: 0, verticalAlign: 'baseline' }}
                            onClick={() => setFilter('all')}
                          >
                            Show all
                          </button>
                        </>
                      ) : (
                        'No probes match this filter.'
                      )}
                    </td>
                  </tr>
                ) : (
                  filtered.map((d) => (
                    <tr key={`${d.resource}-${d.action}`}>
                      <td>{resourceLabel(d.resource)}</td>
                      <td>{actionLabel(d.action)}</td>
                      <td>
                        <span className={`badge ${d.allowed ? '' : 'planned'}`}>
                          {d.allowed ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="muted">{d.reason}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </>
        ) : (
          <>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0 }}>Who can…</h3>
              <div className="row" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ minWidth: 220 }}>
                  <SelectField
                    label="Capability"
                    name="probe-cap"
                    id="probe-cap"
                    value={`${probeResource}:${probeAction}`}
                    onChange={(e) => {
                      const [r, a] = e.target.value.split(':') as [
                        Resource,
                        Action,
                      ];
                      setProbeResource(r);
                      setProbeAction(a);
                    }}
                  >
                    {PERMISSION_PROBES.map((p) => (
                      <option
                        key={`${p.resource}:${p.action}`}
                        value={`${p.resource}:${p.action}`}
                      >
                        {resourceLabel(p.resource)} / {actionLabel(p.action)}
                      </option>
                    ))}
                  </SelectField>
                </div>
                <div style={{ minWidth: 200 }}>
                  <SelectField
                    label="System"
                    name="sys-cap"
                    id="sys-cap"
                    value={systemId}
                    onChange={(e) => setSystemId(e.target.value as SystemId)}
                  >
                    {systems.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.shortName}
                      </option>
                    ))}
                  </SelectField>
                </div>
              </div>
            </div>
            <p className="muted">
              People with login accounts where{' '}
              <strong>
                {resourceLabel(probeResource)} / {actionLabel(probeAction)}
              </strong>{' '}
              is allowed in {sysName}.
            </p>
            <table className="table">
              <thead>
                <tr>
                  <th>Person</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {capabilityPeople.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="muted">
                      No accounts allowed for this capability.
                    </td>
                  </tr>
                ) : (
                  capabilityPeople.map((p) => (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td>
                        <Link to={`/people/${p.id}`}>Profile</Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </>
        )}
      </div>

      {mode === 'person' && (
        <div className="panel">
          <h3>Effective grants in {sysName}</h3>
          {systemGrants.length === 0 ? (
            <p className="muted">No grants in this system.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Resource</th>
                  <th>Action</th>
                  <th>Source</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {systemGrants.map((g, i) => (
                  <tr key={`${g.resource}-${g.action}-${g.source}-${i}`}>
                    <td>{resourceLabel(g.resource)}</td>
                    <td>{actionLabel(g.action)}</td>
                    <td>{g.source}</td>
                    <td className="muted">{g.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div className="panel">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0 }}>Audit trail</h3>
          <div className="row">
            <button
              type="button"
              className="btn secondary"
              onClick={() => setAuditTick((t) => t + 1)}
            >
              Refresh
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                auditService.clear();
                setAuditTick((t) => t + 1);
              }}
            >
              Clear
            </button>
          </div>
        </div>
        <p className="muted">
          Sensitive checks (ENTER, MANAGE, denials) are logged with systemId.
        </p>
        <table className="table">
          <thead>
            <tr>
              <th>When</th>
              <th>System</th>
              <th>Check</th>
              <th>Result</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {audit.length === 0 ? (
              <tr>
                <td colSpan={5} className="muted">
                  No audited decisions yet — open a system or manage people.
                </td>
              </tr>
            ) : (
              audit.map((e) => (
                <tr key={e.id}>
                  <td>{new Date(e.at).toLocaleTimeString()}</td>
                  <td>
                    {systemsService.getById(e.systemId)?.shortName ?? e.systemId}
                  </td>
                  <td>
                    {resourceLabel(e.resource)} / {actionLabel(e.action)}
                  </td>
                  <td>
                    <span className={`badge ${e.allowed ? '' : 'planned'}`}>
                      {e.allowed ? 'Allow' : 'Deny'}
                    </span>
                  </td>
                  <td className="muted">{e.reason}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <p className="muted" style={{ marginBottom: 0 }}>
          <Link to="/participation">Participation →</Link>
        </p>
      </div>
    </div>
  );
}
