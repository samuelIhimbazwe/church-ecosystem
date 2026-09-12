import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import type { ReactNode } from 'react';

/** Blocks Access / Systems admin pages for non-governance roles. */
export function RequireAdminTools({ children }: { children: ReactNode }) {
  const { account, can } = useAuth();
  if (!account) return <Navigate to="/login" replace />;
  if (!can('AUDIT', 'VIEW', 'sys-main')) {
    return <Navigate to="/" replace />;
  }
  return children;
}
