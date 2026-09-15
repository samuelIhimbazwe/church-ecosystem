import { useState } from 'react';
import { SystemLauncher } from '../components/SystemLauncher';
import { systemsService } from '../services';

export function SystemsPage() {
  const all = systemsService.list();
  const [showRegistry, setShowRegistry] = useState(false);

  return (
    <div className="stack">
      <div className="panel">
        <h2>Systems</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Peer applications in the ADEPR Kacyiru ecosystem, grouped as
          Ministries, Choirs, and Others. Open opens each system in a new
          browser tab.
        </p>
      </div>

      <div>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            marginBottom: '0.75rem',
            fontSize: '1.35rem',
          }}
        >
          Open a system
        </h2>
        <SystemLauncher />
      </div>

      <div className="panel">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0 }}>Registry</h3>
          <button
            type="button"
            className="btn ghost"
            onClick={() => setShowRegistry((v) => !v)}
          >
            {showRegistry ? 'Hide table' : 'Show table'}
          </button>
        </div>
        {showRegistry && (
          <table className="table" style={{ marginTop: '0.75rem' }}>
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Kind</th>
                <th>Status</th>
                <th>Path</th>
                <th>Org unit</th>
              </tr>
            </thead>
            <tbody>
              {all.map((s) => (
                <tr key={s.id}>
                  <td>
                    <code>{s.code}</code>
                  </td>
                  <td>{s.name}</td>
                  <td>{s.kind}</td>
                  <td>
                    <span
                      className={`badge ${s.status === 'PLANNED' ? 'planned' : ''}`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td>
                    <code>{s.basePath}</code>
                  </td>
                  <td>{s.orgUnitId ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!showRegistry && (
          <p className="muted" style={{ marginBottom: 0, marginTop: '0.5rem' }}>
            {all.length} registered systems — expand for codes and paths.
          </p>
        )}
      </div>
    </div>
  );
}
