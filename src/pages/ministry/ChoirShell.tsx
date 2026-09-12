import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '../../auth/AuthContext';
import {
  choirName,
  isChoirOrgUnitId,
  listChoirOrgUnits,
} from '../../domain/choirCatalog';
import { choirNavForOffice } from '../../domain/choirNav';
import type { Membership, Position } from '../../domain/types';
import { authService, choirService } from '../../services';
import { setActiveChoirOrgUnitId as syncChoirScope } from '../../services/choirScope';
import { MinistryShell } from './MinistryShell';
import { ChoirTenantContext } from './useActiveChoir';

function resolveAccessibleChoirOrgUnitIds(
  memberships: Membership[],
  positions: Position[],
): string[] {
  const ids = new Set<string>();
  for (const m of memberships) {
    if (
      m.status === 'ACTIVE' &&
      m.orgUnitId &&
      isChoirOrgUnitId(m.orgUnitId)
    ) {
      ids.add(m.orgUnitId);
    }
  }
  for (const p of positions) {
    if (
      p.status === 'ACTIVE' &&
      p.orgUnitId &&
      isChoirOrgUnitId(p.orgUnitId)
    ) {
      ids.add(p.orgUnitId);
    }
  }
  // Do not fall back to every named choir. ENTER alone is not a tenancy grant —
  // holders must have membership or position on a choir org unit.
  return [...ids];
}

export function ChoirShell({ basePath }: { basePath: string }) {
  const { account, memberships, positions, session, refreshSession } =
    useAuth();
  const [, setTick] = useState(0);

  const accessibleIds = useMemo(
    () =>
      account
        ? resolveAccessibleChoirOrgUnitIds(memberships, positions)
        : [],
    [account, memberships, positions],
  );

  const accessibleChoirs = useMemo(
    () => listChoirOrgUnits().filter((c) => accessibleIds.includes(c.id)),
    [accessibleIds],
  );

  const activeChoirOrgUnitId = session?.activeChoirOrgUnitId ?? null;

  const office = account ? choirService.officeFor(account.personId) : null;
  const nav = useMemo(
    () => choirNavForOffice(office),
    [office, activeChoirOrgUnitId],
  );

  useEffect(() => {
    syncChoirScope(activeChoirOrgUnitId);
  }, [activeChoirOrgUnitId]);

  useEffect(() => {
    if (!account || accessibleIds.length === 0) return;
    const current = session?.activeChoirOrgUnitId;
    if (current && accessibleIds.includes(current)) {
      syncChoirScope(current);
      return;
    }
    const pick = accessibleIds[0];
    authService.setActiveChoirOrgUnitId(pick);
    refreshSession();
  }, [account, accessibleIds, session?.activeChoirOrgUnitId, refreshSession]);

  const setActiveChoir = (orgUnitId: string) => {
    authService.setActiveChoirOrgUnitId(orgUnitId);
    syncChoirScope(orgUnitId);
    refreshSession();
    setTick((t) => t + 1);
  };

  const tenantValue = useMemo(
    () => ({
      activeChoirOrgUnitId,
      activeChoirName: activeChoirOrgUnitId
        ? choirName(activeChoirOrgUnitId)
        : '',
      accessibleChoirs,
      setActiveChoir,
    }),
    [activeChoirOrgUnitId, accessibleChoirs],
  );

  const subHeader: ReactNode =
    accessibleChoirs.length === 0 ? (
      <div className="panel" style={{ marginBottom: '0.75rem' }}>
        <p className="muted" style={{ margin: 0 }}>
          No named choir membership or office on your account. Ask your choir
          secretary to place you on a choir before you can open Choir System.
        </p>
      </div>
    ) : (
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

  return (
    <ChoirTenantContext.Provider value={tenantValue}>
      <MinistryShell
        systemId="sys-choir"
        basePath={basePath}
        nav={nav}
        subHeader={subHeader}
        blockBody={accessibleChoirs.length === 0}
      />
    </ChoirTenantContext.Provider>
  );
}
