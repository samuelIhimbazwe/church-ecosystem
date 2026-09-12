import type { CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import type { SystemId } from '../domain/types';
import { openSystemUrlInNewTab } from '../services/ssoService';

const PEER_ACCENT: Partial<Record<SystemId, string>> = {
  'sys-choir': '#1a5f9e',
  'sys-worship': '#e08b7a',
  'sys-youth': '#1570b8',
  'sys-protocol': '#0d3a66',
  'sys-deacon': '#e08b7a',
  'sys-finance': '#175cd3',
  'sys-music': '#1a5f9e',
  'sys-media': '#4a5d6e',
  'sys-men': '#0d3a66',
  'sys-women': '#e08b7a',
  'sys-couples': '#1570b8',
  'sys-children': '#1a5f9e',
  'sys-elderly': '#4a5d6e',
  'sys-evangelism': '#175cd3',
  'sys-intercessors': '#0d3a66',
};

export function SystemLauncher({
  excludeMain = false,
  /** Hide shared Finance ledger — not a ministry peer system. */
  excludeShared = true,
}: {
  excludeMain?: boolean;
  excludeShared?: boolean;
}) {
  const { availableSystems, openPeerSystem, session } = useAuth();
  const navigate = useNavigate();

  const systems = availableSystems.filter((s) => {
    if (excludeMain && s.kind === 'MAIN') return false;
    if (excludeShared && s.kind === 'SHARED') return false;
    return true;
  });

  function handleOpen(systemId: (typeof systems)[number]['id']) {
    if (systemId === 'sys-main') {
      navigate('/');
      return;
    }
    const result = openPeerSystem(systemId);
    if (!result.ok || !result.url) {
      window.alert(result.reason ?? 'Unable to open system');
      return;
    }
    // Peer / shared systems: new browser tab (Main stays open).
    openSystemUrlInNewTab(result.url);
  }

  return (
    <div className="app-grid">
      {systems.map((system) => {
        const isCurrent = session?.currentSystemId === system.id;
        const planned = system.status !== 'ACTIVE';
        const mark = (system.shortName || system.code || '?')
          .slice(0, 2)
          .toUpperCase();
        const accent = PEER_ACCENT[system.id];
        const tileStyle = (
          accent && !planned
            ? { ['--tile-accent']: accent }
            : undefined
        ) as CSSProperties | undefined;
        return (
          <div
            key={system.id}
            className={`app-tile ${planned ? 'planned' : ''}`}
            style={tileStyle}
          >
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="app-mark" aria-hidden>
                {mark}
              </span>
              <span className={`badge ${planned ? 'planned' : ''}`}>
                {planned ? 'Planned' : 'Active'}
              </span>
            </div>
            <h3 className="title" style={{ margin: 0 }}>
              {system.shortName}
            </h3>
            <p
              className="muted"
              style={{ margin: 0, flex: 1, fontSize: '0.88rem' }}
            >
              {system.description}
            </p>
            <div className="row">
              {!planned ? (
                <button
                  type="button"
                  className="btn"
                  disabled={isCurrent && system.kind !== 'MAIN'}
                  onClick={() => handleOpen(system.id)}
                  title={
                    system.kind === 'MAIN'
                      ? undefined
                      : 'Opens in a new browser tab'
                  }
                >
                  {isCurrent ? 'Current' : 'Open'}
                </button>
              ) : (
                <button type="button" className="btn secondary" disabled>
                  Soon
                </button>
              )}
              {system.kind === 'MINISTRY' && (
                <Link
                  className="muted"
                  to={`/login?system=${system.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
