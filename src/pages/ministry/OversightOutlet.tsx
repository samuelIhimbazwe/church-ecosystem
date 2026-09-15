import { useMemo, type ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { roleLabel } from '../../domain/access';
import { ministryModuleKey } from '../../domain/ministryNavAccess';
import {
  oversightDepthForRoles,
  oversightMayAccessModule,
  oversightPassthroughModule,
  resolvePeerEntry,
} from '../../domain/oversightAccess';
import type { SystemId } from '../../domain/types';
import { OversightModuleReport } from './OversightModuleReport';

/** When in oversight entry, pass through assets/home/mission/reports; else report surface. */
export function OversightOutlet({
  systemId,
  basePath,
  children,
}: {
  systemId: SystemId;
  basePath: string;
  children?: ReactNode;
}) {
  const { account, positions, roles } = useAuth();
  const location = useLocation();

  const entry = useMemo(() => {
    if (!account) return null;
    return resolvePeerEntry(account.personId, systemId, positions);
  }, [account, systemId, positions]);

  if (!account || !entry || entry.kind !== 'oversight') {
    return children ?? <Outlet />;
  }

  const depth = oversightDepthForRoles(roles);
  const key = ministryModuleKey(location.pathname, basePath);
  if (!oversightMayAccessModule(systemId, key, depth)) {
    return <Navigate to={basePath} replace />;
  }
  if (oversightPassthroughModule(key)) {
    return children ?? <Outlet />;
  }

  const label = roles[0] ? roleLabel(roles[0]) : undefined;
  return (
    <OversightModuleReport
      systemId={systemId}
      basePath={basePath}
      moduleKey={key}
      roleLabel={label}
    />
  );
}
