import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../../auth/AuthContext';
import {
  choirOfficeMayAccess,
  type ChoirNavKey,
} from '../../domain/choirNav';
import { choirService } from '../../services';

/** Block deep-links to choir modules outside the active office nav. */
export function RequireChoirNav({
  navKey,
  children,
}: {
  navKey: ChoirNavKey;
  children: ReactNode;
}) {
  const { account } = useAuth();
  const office = account ? choirService.officeFor(account.personId) : null;
  if (!choirOfficeMayAccess(office, navKey)) {
    return <Navigate to="/systems/choir" replace />;
  }
  return children;
}
