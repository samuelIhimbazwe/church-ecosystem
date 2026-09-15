import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { choirName } from '../../domain/choirCatalog';
import { CHOIR_NAV_CATALOG, choirNavForOffice } from '../../domain/choirNav';
import { resolveAccessibleChoirs } from '../../domain/choirTenancy';
import {
  filterOversightNav,
  oversightDepthForRoles,
  resolvePeerEntry,
} from '../../domain/oversightAccess';
import { authService, choirService } from '../../services';
import { setActiveChoirOrgUnitId as syncChoirScope } from '../../services/choirScope';
import { MinistryShell } from './MinistryShell';
import { ChoirTenantContext } from './useActiveChoir';

export function ChoirShell({ basePath }: { basePath: string }) {
  const { account, memberships, positions, session, refreshSession, roles } =
    useAuth();
  const [, setTick] = useState(0);

  const accessibleChoirs = useMemo(
    () =>
      account ? resolveAccessibleChoirs(memberships, positions) : [],
    [account, memberships, positions],
  );

  const accessibleIds = useMemo(
    () => accessibleChoirs.map((c) => c.id),
    [accessibleChoirs],
  );

  const activeChoirOrgUnitId = session?.activeChoirOrgUnitId ?? null;
  const activeIsValid =
    !!activeChoirOrgUnitId && accessibleIds.includes(activeChoirOrgUnitId);

  const needsChoirPick =
    accessibleChoirs.length > 1 && !activeIsValid;

  const office = account ? choirService.officeFor(account.personId) : null;
  const peerEntry = useMemo(() => {
    if (!account) return null;
    return resolvePeerEntry(account.personId, 'sys-choir', positions);
  }, [account, positions]);

  const nav = useMemo(() => {
    if (peerEntry?.kind === 'oversight' && !office) {
      return filterOversightNav(
        'sys-choir',
        basePath,
        CHOIR_NAV_CATALOG,
        oversightDepthForRoles(roles),
      );
    }
    return choirNavForOffice(office);
  }, [office, peerEntry, basePath, activeChoirOrgUnitId, roles]);

  useEffect(() => {
    syncChoirScope(activeIsValid ? activeChoirOrgUnitId : null);
  }, [activeChoirOrgUnitId, activeIsValid]);

  // Single choir only — auto-scope. Never pick "first of many".
  useEffect(() => {
    if (!account || accessibleIds.length !== 1) return;
    const only = accessibleIds[0];
    if (session?.activeChoirOrgUnitId === only) {
      syncChoirScope(only);
      return;
    }
    authService.setActiveChoirOrgUnitId(only);
    refreshSession();
  }, [account, accessibleIds, session?.activeChoirOrgUnitId, refreshSession]);

  const setActiveChoir = (orgUnitId: string) => {
    if (!accessibleIds.includes(orgUnitId)) return;
    authService.setActiveChoirOrgUnitId(orgUnitId);
    syncChoirScope(orgUnitId);
    refreshSession();
    setTick((t) => t + 1);
  };

  const tenantValue = useMemo(
    () => ({
      activeChoirOrgUnitId: activeIsValid ? activeChoirOrgUnitId : null,
      activeChoirName:
        activeIsValid && activeChoirOrgUnitId
          ? choirName(activeChoirOrgUnitId)
          : '',
      accessibleChoirs,
      setActiveChoir,
    }),
    [activeChoirOrgUnitId, activeIsValid, accessibleChoirs],
  );

  let subHeader: ReactNode = null;
  if (accessibleChoirs.length === 0) {
    subHeader = (
      <div className="panel" style={{ marginBottom: '0.75rem' }}>
        <p className="muted" style={{ margin: 0 }}>
          No named choir membership or office on your account. Ask your choir
          secretary to place you on a choir before you can open Choir System.
        </p>
      </div>
    );
  } else if (needsChoirPick) {
    subHeader = (
      <div className="panel stack" style={{ marginBottom: '0.75rem' }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)' }}>
            Select a choir
          </h2>
          <p className="muted" style={{ margin: '0.35rem 0 0' }}>
            There are {accessibleChoirs.length} choirs. Choose which one to
            open — each has its own roster, repertoire, and fund.
          </p>
        </div>
        <div className="app-grid">
          {accessibleChoirs.map((c) => {
            const mark = c.name.slice(0, 2).toUpperCase();
            return (
              <div key={c.id} className="app-tile">
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span className="app-mark" aria-hidden>
                    {mark}
                  </span>
                  <span className="badge">Choir</span>
                </div>
                <h3 className="title" style={{ margin: 0 }}>
                  {c.name}
                </h3>
                <p
                  className="muted"
                  style={{ margin: 0, flex: 1, fontSize: '0.88rem' }}
                >
                  Private tenant under Music — open this choir only.
                </p>
                <div className="row">
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setActiveChoir(c.id)}
                  >
                    Open
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  } else {
    subHeader = (
      <div
        className="row"
        style={{
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        <strong>{tenantValue.activeChoirName || 'Choir'}</strong>
        {accessibleChoirs.length > 1 && (
          <label
            className="row"
            style={{ gap: '0.35rem', alignItems: 'center' }}
          >
            <span className="muted">Switch:</span>
            <select
              value={activeChoirOrgUnitId ?? ''}
              onChange={(e) => setActiveChoir(e.target.value)}
            >
              {accessibleChoirs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    );
  }

  return (
    <ChoirTenantContext.Provider value={tenantValue}>
      <MinistryShell
        systemId="sys-choir"
        basePath={basePath}
        nav={nav}
        subHeader={subHeader}
        blockBody={accessibleChoirs.length === 0 || needsChoirPick}
        blockBodyContent={needsChoirPick ? null : undefined}
      />
    </ChoirTenantContext.Provider>
  );
}
