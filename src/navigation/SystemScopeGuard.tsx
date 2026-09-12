import { useLayoutEffect, type ReactNode } from 'react';
import {
  useLocation,
  useNavigate,
  useNavigationType,
} from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  isAuthOrHandoffPath,
  isInsideSystemBase,
  peerBasePath,
} from './systemScope';

/**
 * While session is on a non-Main system, browser Back/Forward must not land
 * on Main Church routes. Bounce to that system's home. Leave Main only via
 * "Open Main Church" (switches session, then navigates — not a POP).
 */
export function SystemScopeGuard({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const navType = useNavigationType();
  const currentSystemId = session?.currentSystemId ?? 'sys-main';

  useLayoutEffect(() => {
    if (navType !== 'POP') return;
    if (currentSystemId === 'sys-main') return;

    const base = peerBasePath(currentSystemId);
    if (!base) return;

    const path = location.pathname;
    if (isInsideSystemBase(path, base) || isAuthOrHandoffPath(path)) {
      return;
    }

    navigate(base, { replace: true });
  }, [navType, currentSystemId, location.pathname, location.key, navigate]);

  return children;
}
