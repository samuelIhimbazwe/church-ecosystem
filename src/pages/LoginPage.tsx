import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { apiHealth, isApiEnabled } from '../api';
import { useAuth } from '../auth/AuthContext';
import { isChoirOrgUnitId, choirName } from '../domain/choirCatalog';
import type { SystemId } from '../domain/types';
import { systemsService, authService } from '../services';
import { Spinner } from '../components/ui/Spinner';
import { TextField } from '../components/ui/Field';

const DEMO_HINTS = [
  { user: 'pastor', pass: 'pastor123', note: 'Church Leader · oversight into peer systems' },
  { user: 'assistant', pass: 'assist123', note: 'Pastor (ordained) · lighter oversight' },
  { user: 'catechist', pass: 'catechist123', note: 'Umwarimu · Itorero ops oversight' },
  { user: 'secretary', pass: 'secret123', note: 'Church Secretary (appointment)' },
  { user: 'patrick', pass: 'member123', note: 'Member · Youth System Admin (config only)' },
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
  const { account, login, apiEnabled, setActiveChoir } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [apiStatus, setApiStatus] = useState<'checking' | 'up' | 'down' | 'off'>(
    apiEnabled ? 'checking' : 'off',
  );

  const [showDemos, setShowDemos] = useState(false);

  const targetSystemId = (params.get('system') as SystemId | null) ?? 'sys-main';
  const choirOrgUnitId = params.get('choir');
  /** Demo accounts + API chrome: DEV builds or `?demo=1`. */
  const showOpsChrome =
    import.meta.env.DEV || params.get('demo') === '1';
  const targetSystem = useMemo(
    () =>
      systemsService.getById(targetSystemId) ??
      systemsService.getById('sys-main'),
    [targetSystemId],
  );

  useEffect(() => {
    if (!showOpsChrome) {
      setApiStatus('off');
      return;
    }
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
  }, [showOpsChrome]);

  useEffect(() => {
    if (
      !account ||
      targetSystemId !== 'sys-choir' ||
      !choirOrgUnitId ||
      !isChoirOrgUnitId(choirOrgUnitId)
    ) {
      return;
    }
    // Avoid refresh loops when already scoped.
    const current = authService.getSession()?.activeChoirOrgUnitId;
    if (current === choirOrgUnitId) return;
    setActiveChoir(choirOrgUnitId);
  }, [account, targetSystemId, choirOrgUnitId, setActiveChoir]);

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
      if (
        targetSystemId === 'sys-choir' &&
        choirOrgUnitId &&
        isChoirOrgUnitId(choirOrgUnitId)
      ) {
        setActiveChoir(choirOrgUnitId);
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
    <div className="login-page login-split">
      <div className="login-form-pane">
        <div className="login-card stack">
          <div className="login-brand">
            <img src="/brand/adepr-logo.png" alt="ADEPR" width={76} height={76} />
            <div>
              <h1>
                {choirOrgUnitId && isChoirOrgUnitId(choirOrgUnitId)
                  ? choirName(choirOrgUnitId)
                  : 'Welcome Back'}
              </h1>
              <p className="muted" style={{ margin: 0 }}>
                {targetSystem?.kind === 'MAIN'
                  ? 'Sign in to continue to your account'
                  : choirOrgUnitId && isChoirOrgUnitId(choirOrgUnitId)
                    ? `Direct login to this choir. Same account as Main Church.`
                    : `Direct login to ${targetSystem?.name}. Same account as Main Church.`}
              </p>
              <p className="login-motto">Faith · Knowledge · Service</p>
            </div>
          </div>

          {showOpsChrome && apiStatus !== 'off' && (
            <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
              Auth:{' '}
              {apiStatus === 'checking' && 'checking API…'}
              {apiStatus === 'up' && (
                <>
                  API connected · seed fallback for other demo users
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
            <TextField
              label="Username"
              name="username"
              id="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={busy}
            />
            <TextField
              label="Password"
              name="password"
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={busy}
            />
            {error && (
              <div className="error" role="alert">
                {error}
              </div>
            )}
            <button type="submit" className="btn" disabled={busy}>
              {busy ? (
                <>
                  <Spinner label="Signing in" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {showOpsChrome ? (
            <details
              className="login-demos"
              open={showDemos}
              onToggle={(e) =>
                setShowDemos((e.target as HTMLDetailsElement).open)
              }
            >
              <summary>Demo accounts</summary>
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
                    <tr key={`${d.user}-${d.note}`}>
                      <td>{d.user}</td>
                      <td>{d.pass}</td>
                      <td>{d.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          ) : null}
        </div>
      </div>

      <aside className="login-hero-pane" aria-label="Welcome">
        <img
          className="login-hero-media"
          src="/brand/church-building.png"
          alt="ADEPR Kacyiru church building"
        />
        <div className="login-hero-shade" aria-hidden />
        <div className="login-hero-copy">
          <p className="login-hero-brand">
            Building a brighter future through faith and service.
          </p>
          <p className="login-hero-line">
            Shared identity for Main Church and every ministry system at ADEPR
            Kacyiru.
          </p>
        </div>
        <div className="login-hero-wave" aria-hidden />
      </aside>
    </div>
  );
}
