import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ACTIVITIES } from '../data/seed';
import {
  checkInUrl,
  qrImageUrl,
  verifyCheckInToken,
} from '../domain/checkInQr';
import { missionService } from '../services';
import { writeMarkEventAttendance } from '../services/missionWrite';

/**
 * Staff check-in landing from QR / deep link (W6).
 */
export function CheckInPage() {
  const { account, can } = useAuth();
  const [params] = useSearchParams();
  const kind = params.get('k') === 'activity' ? 'activity' : 'event';
  const id = params.get('id') ?? '';
  const token = params.get('t') ?? '';
  const [msg, setMsg] = useState('');

  const valid = Boolean(id && verifyCheckInToken(kind, id, token));
  const event = kind === 'event' && id ? missionService.getEvent(id) : null;
  const activity =
    kind === 'activity' && id
      ? (ACTIVITIES.find((a) => a.id === id) ?? null)
      : null;
  const title = event?.name ?? activity?.title ?? id;
  const href =
    kind === 'event'
      ? `/events/${id}`
      : activity
        ? `/programs/${activity.programId}/sessions/${activity.id}`
        : '/';

  const url = useMemo(
    () => (id ? checkInUrl(kind, id) : ''),
    [kind, id],
  );

  async function markSelf() {
    if (!account || kind !== 'event' || !event) return;
    const r = await writeMarkEventAttendance({
      eventId: event.id,
      personId: account.personId,
      attended: true,
    });
    setMsg(r.ok ? 'Checked in' : (r.reason ?? 'Failed'));
  }

  if (!valid) {
    return (
      <div className="panel">
        <h2>Check-in link invalid</h2>
        <p className="muted">Ask staff for a fresh QR.</p>
        <Link to="/">Home</Link>
      </div>
    );
  }

  const canCheck =
    account &&
    (can('EVENT', 'MANAGE') || can('EVENT', 'VIEW') || can('PROGRAM', 'MANAGE'));

  return (
    <div className="stack">
      <div className="panel">
        <p className="muted" style={{ margin: 0 }}>
          Check-in
        </p>
        <h2 style={{ marginTop: '0.25rem' }}>{title}</h2>
        {msg && <p className="badge">{msg}</p>}
        <p>
          <Link to={href}>Open full record →</Link>
        </p>
        {canCheck && kind === 'event' && account && (
          <button type="button" className="btn" onClick={() => void markSelf()}>
            Mark me attended
          </button>
        )}
        {!account && (
          <p className="muted">
            Sign in to check yourself in, or show this QR to staff.
          </p>
        )}
        <div style={{ marginTop: '1rem' }}>
          <img
            src={qrImageUrl(url)}
            alt="Check-in QR"
            width={160}
            height={160}
          />
          <p
            className="muted"
            style={{ fontSize: '0.8rem', wordBreak: 'break-all' }}
          >
            {url}
          </p>
        </div>
      </div>
    </div>
  );
}
