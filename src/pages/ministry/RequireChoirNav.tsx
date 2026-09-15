import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../../auth/AuthContext';
import {
  choirOfficeMayAccess,
  type ChoirNavKey,
} from '../../domain/choirNav';
import {
  oversightDepthForRoles,
  oversightMayAccessModule,
  resolvePeerEntry,
} from '../../domain/oversightAccess';
import { choirService } from '../../services';

/** Block deep-links to choir modules outside the active office / oversight nav. */
export function RequireChoirNav({
  navKey,
  children,
}: {
  navKey: ChoirNavKey;
  children: ReactNode;
}) {
  const { account, positions, roles } = useAuth();
  if (!account) {
    return <Navigate to="/login?system=sys-choir" replace />;
  }
  const office = choirService.officeFor(account.personId);
  const entry = resolvePeerEntry(account.personId, 'sys-choir', positions);
  if (entry.kind === 'oversight' && !office) {
    if (
      !oversightMayAccessModule(
        'sys-choir',
        navKey,
        oversightDepthForRoles(roles),
      )
    ) {
      return <Navigate to="/systems/choir" replace />;
    }
    return children;
  }
  if (!choirOfficeMayAccess(office, navKey)) {
    return <Navigate to="/systems/choir" replace />;
  }
  return children;
}
