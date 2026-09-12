import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { actionLabel, resourceLabel } from '../domain/permissions';
import type { SystemId } from '../domain/types';
import {
  accessService,
  auditService,
  systemsService,
} from '../services';

type ProbeFilter = 'all' | 'allow' | 'deny';

export function AccessEnginePage() {
  const { account, personName, session, grants, currentSystem } = useAuth();
  const [systemId, setSystemId] = useState<SystemId>(
    session?.currentSystemId ?? 'sys-main',
  );
  const [auditTick, setAuditTick] = useState(0);
  const [filter, setFilter] = useState<ProbeFilter>('all');

  const systems = systemsService.listActive();
  const matrix = useMemo(() => {
    if (!account) return [];
    return accessService.probeMatrix(account.personId, systemId);
  }, [account, systemId]);

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
    () => grants.filter((g) => g.systemId === systemId),
    [grants, systemId],
  );

  const audit = useMemo(() => {
    void auditTick;
    return auditService.list().slice(0, 25);
  }, [auditTick, matrix]);

  const sysName = systemsService.getById(systemId)?.shortName ?? systemId;
  const allowCount = matrix.filter((d) => d.allowed).length;
  const denyCount = matrix.length - allowCount;

  if (!account) return null;

  return (
    <div className="stack">
      <div className="panel">
        <h2>Access engine</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          What can <strong>{personName}</strong> do right now? Direct ministry
          login and church→ministry SSO both call the same{' '}
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

      {enterDecision && (
        <div
          className={`why-callout ${enterDecision.allowed ? '' : 'denied'}`}
        >
          <strong>
            Why {enterDecision.allowed ? 'you can' : "you can't"} enter {sysName}
          </strong>
          <p style={{ margin: '0.4rem 0 0' }}>{enterDecision.reason}</p>
          {enterDecision.matchedGrant && (
            <p className="muted" style={{ margin: '0.35rem 0 0', fontSize: '0.88rem' }}>
              Matched grant: {enterDecision.matchedGrant.source}
              {enterDecision.matchedGrant.reason
                ? ` — ${enterDecision.matchedGrant.reason}`
                : ''}
            </p>
          )}
        </div>
      )}

      <div className="panel">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0 }}>Probe system</h3>
          <div className="field" style={{ minWidth: 200 }}>
            <label htmlFor="sys">System</label>
            <select
              id="sys"
              value={systemId}
              onChange={(e) => setSystemId(e.target.value as SystemId)}
            >
              {systems.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.shortName}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="row" style={{ marginBottom: '0.75rem' }}>
          <button
            type="button"
            className={`btn ${filter === 'all' ? '' : 'ghost'}`}
            onClick={() => setFilter('all')}
          >
            All ({matrix.length})
          </button>
          <button
            type="button"
            className={`btn ${filter === 'allow' ? '' : 'ghost'}`}
            onClick={() => setFilter('allow')}
          >
            Allow ({allowCount})
          </button>
          <button
            type="button"
            className={`btn ${filter === 'deny' ? '' : 'ghost'}`}
            onClick={() => setFilter('deny')}
          >
            Deny ({denyCount})
          </button>
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
                  No probes match this filter.
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
      </div>

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
