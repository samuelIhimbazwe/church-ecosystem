import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { redeemHandoff } from '../domain/sso';
import type { SystemId } from '../domain/types';
import { accessService, authService, systemsService } from '../services';

/**
 * Global SSO handoff receiver.
 * Church launcher (or another system) issues a short-lived token;
 * this route redeems it and lands the same Account in the target system.
 */
export function SsoHandoffPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { refreshSession } = useAuth();
  const [message, setMessage] = useState('Completing secure handoff…');
  const [failedSystem, setFailedSystem] = useState<SystemId | null>(null);

  useEffect(() => {
    const tokenId = params.get('token');
    const systemParam = params.get('system') as SystemId | null;

    if (!tokenId || !systemParam) {
      setMessage('Missing handoff token or target system.');
      return;
    }

    const target = systemsService.getById(systemParam);
    const home = target?.basePath ?? '/';

    const token = redeemHandoff(tokenId, systemParam);
    if (token) {
      const account = authService.acceptHandoff(
        token.accountId,
        token.toSystemId,
      );
      if (!account) {
        setFailedSystem(systemParam);
        setMessage('You are not entitled to open this system.');
        return;
      }
      refreshSession();
      navigate(home, { replace: true });
      return;
    }

    // Token already used / expired / other tab — if this browser still has
    // a signed-in account with ENTER, land them in the system anyway.
    const sessionAccount = authService.getSessionAccount();
    if (
      sessionAccount &&
      accessService.canEnter(sessionAccount.personId, systemParam)
    ) {
      authService.setCurrentSystem(systemParam, 'handoff');
      refreshSession();
      navigate(home, { replace: true });
      return;
    }

    setFailedSystem(systemParam);
    setMessage('Handoff expired or invalid. Sign in again.');
  }, [params, navigate, refreshSession]);

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>SSO handoff</h1>
        <p className="muted">{message}</p>
        {failedSystem && (
          <p style={{ marginTop: '1rem' }}>
            <Link to={`/login?system=${failedSystem}`}>
              Sign in to{' '}
              {systemsService.getById(failedSystem)?.shortName ?? 'system'}
            </Link>
            {' · '}
            <Link to="/">Main Church</Link>
          </p>
        )}
      </div>
    </div>
  );
}
