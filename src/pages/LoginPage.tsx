import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { apiBaseUrl, apiHealth, isApiEnabled } from '../api';
import { useAuth } from '../auth/AuthContext';
import type { SystemId } from '../domain/types';
import { systemsService } from '../services';

const DEMO_HINTS = [
  { user: 'pastor', pass: 'pastor123', note: '360° member records · also on API' },
  { user: 'assistant', pass: 'assist123', note: 'Assistant pastor — full profile' },
  { user: 'secretary', pass: 'secret123', note: 'Secretary — full profile' },
  { user: 'treasurer', pass: 'treas123', note: 'Church Treasurer · also on API' },
  { user: 'choirtreas', pass: 'choir123', note: 'Choir finance (local seed)' },
  { user: 'worship', pass: 'worship123', note: 'Worship leader' },
  { user: 'worshiptreas', pass: 'worship123', note: 'Worship finance' },
  { user: 'deacon', pass: 'deacon123', note: 'Deacon care coordinator' },
  { user: 'deacontreas', pass: 'deacon123', note: 'Deacon benevolence vault' },
  { user: 'patrick', pass: 'member123', note: 'Limited own-scope profile' },
  { user: 'music', pass: 'music123', note: 'Music oversight' },
  { user: 'children', pass: 'children123', note: 'Children / Sunday School' },
  { user: 'men', pass: 'men123', note: 'Men ministry' },
];

export function LoginPage() {
  const { account, login, apiEnabled } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [apiStatus, setApiStatus] = useState<'checking' | 'up' | 'down' | 'off'>(
    apiEnabled ? 'checking' : 'off',
  );

  const targetSystemId = (params.get('system') as SystemId | null) ?? 'sys-main';
  const targetSystem = useMemo(
    () =>
      systemsService.getById(targetSystemId) ??
      systemsService.getById('sys-main'),
    [targetSystemId],
  );

  useEffect(() => {
    if (!isApiEnabled()) {
      setApiStatus('off');
      return;
    }
    let cancelled = false;
    apiHealth().then((h) => {
      if (!cancelled) setApiStatus(h?.status === 'ok' ? 'up' : 'down');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (account) {
    const dest =
      targetSystemId === 'sys-main'
        ? '/'
        : (systemsService.getById(targetSystemId)?.basePath ?? '/');
    return <Navigate to={dest} replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const ok = await login(username, password, targetSystemId);
      if (!ok) {
        setError(
          'Invalid credentials or you are not entitled to this system.',
        );
        return;
      }
      const dest =
        targetSystemId === 'sys-main'
          ? '/'
          : (systemsService.getById(targetSystemId)?.basePath ?? '/');
      navigate(dest, { replace: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card stack">
        <div className="login-brand">
          <img src="/brand/adepr-logo.png" alt="ADEPR" width={88} height={88} />
          <div>
            <h1>{targetSystem?.shortName ?? 'Sign in'}</h1>
            <p className="muted" style={{ margin: 0 }}>
              {targetSystem?.kind === 'MAIN'
                ? 'Main Church System — shared identity for the ecosystem'
                : `Direct login to ${targetSystem?.name}. Same Account as Main Church.`}
            </p>
          </div>
        </div>

        {apiStatus !== 'off' && (
          <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
            Auth:{' '}
            {apiStatus === 'checking' && 'checking API…'}
            {apiStatus === 'up' && (
              <>
                API <code>{apiBaseUrl()}</code> (hashed) · seed fallback for
                other demo users
              </>
            )}
            {apiStatus === 'down' && (
              <>
                API unreachable — using in-memory seed login
              </>
            )}
          </p>
        )}

        <form className="stack" onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={busy}
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={busy}
            />
          </div>
          {error && <div className="error">{error}</div>}
          <button type="submit" className="btn" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="panel" style={{ padding: '0.85rem' }}>
          <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>
            Demo accounts
          </h3>
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Password</th>
                <th>Access</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_HINTS.map((d) => (
                <tr key={d.user}>
                  <td>{d.user}</td>
                  <td>{d.pass}</td>
                  <td>{d.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
