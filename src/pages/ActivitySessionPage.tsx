import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { isApiEnabled } from '../api';
import {
  apiCloseActivity,
  apiListActivities,
  apiListEnrollments,
} from '../api/missionApi';
import { useAuth } from '../auth/AuthContext';
import { EmptyState } from '../components/ui/EmptyState';
import { StatusPill } from '../components/ui/StatusPill';
import { useToast } from '../components/ui/Toast';
import { ATTENDANCE } from '../data/seed';
import { checkInToken, checkInUrl, qrImageUrl } from '../domain/checkInQr';
import type { Activity, AttendanceStatus } from '../domain/types';
import { missionService, peopleService } from '../services';
import { writeMarkAttendance } from '../services/missionWrite';

/**
 * Session Mode — full-screen attendance, close session, chase unmarked.
 * Closing can complete linked REQUIRED delivery (W2 acceptance).
 */
export function ActivitySessionPage() {
  const { programId, activityId } = useParams<{
    programId: string;
    activityId: string;
  }>();
  const navigate = useNavigate();
  const { account, can, refreshSession } = useAuth();
  const { push: toast } = useToast();
  const [tick, setTick] = useState(0);
  const [closing, setClosing] = useState(false);
  const [msg, setMsg] = useState('');

  const program = programId ? missionService.getProgram(programId) : null;
  const seedActivity =
    activityId && programId
      ? missionService
          .activitiesForProgram(programId)
          .find((a) => a.id === activityId)
      : undefined;
  const [activity, setActivity] = useState<Activity | undefined>(seedActivity);
  const [enrollIds, setEnrollIds] = useState<string[]>(() =>
    programId
      ? missionService
          .listEnrollments(programId)
          .filter((e) => e.status === 'ACTIVE')
          .map((e) => e.personId)
      : [],
  );

  useEffect(() => {
    if (!programId || !activityId || !isApiEnabled()) return;
    let cancelled = false;
    (async () => {
      try {
        const [acts, enrolls] = await Promise.all([
          apiListActivities(programId),
          apiListEnrollments(programId),
        ]);
        if (cancelled) return;
        const a = acts.find((x) => x.id === activityId);
        if (a) {
          setActivity({
            id: a.id,
            programId: a.programId,
            title: a.title,
            startsAt: a.startsAt,
            endsAt: a.endsAt,
            location: a.location,
            sessionClosedAt: a.sessionClosedAt,
          });
        }
        setEnrollIds(
          enrolls.filter((e) => e.status === 'ACTIVE').map((e) => e.personId),
        );
      } catch {
        /* seed fallback */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [programId, activityId]);

  const canRecord =
    can('ACTIVITY', 'RECORD_ATTENDANCE') || can('PROGRAM', 'MANAGE');
  const closed = Boolean(activity?.sessionClosedAt);

  const roster = useMemo(() => {
    void tick;
    return enrollIds.map((personId) => {
      const row = ATTENDANCE.find(
        (a) => a.activityId === activityId && a.personId === personId,
      );
      const person = peopleService.getById(personId);
      return {
        personId,
        name: person?.preferredName ?? person?.fullName ?? personId,
        status: row?.status as AttendanceStatus | undefined,
      };
    });
  }, [enrollIds, activityId, tick]);

  const unmarked = roster.filter((r) => !r.status);
  const present = roster.filter(
    (r) => r.status === 'PRESENT' || r.status === 'LATE',
  );

  async function mark(personId: string, status: AttendanceStatus) {
    if (!activityId || closed) return;
    await writeMarkAttendance({ activityId, personId, status });
    setTick((t) => t + 1);
    refreshSession();
  }

  async function closeSession() {
    if (!activityId || !programId || closed || !activity) return;
    setClosing(true);
    try {
      if (isApiEnabled()) {
        const r = await apiCloseActivity(activityId, {
          completeLinkedDelivery: true,
        });
        setActivity({
          ...activity,
          sessionClosedAt: r.activity.sessionClosedAt,
        });
        setMsg(
          r.deliveryCompleted
            ? 'Session closed · linked required delivery marked DONE'
            : r.alreadyClosed
              ? 'Session already closed'
              : 'Session closed',
        );
        toast({
          title: 'Session closed',
          detail: r.deliveryCompleted
            ? 'Linked REQUIRED delivery flipped DONE — Pulse health should rise.'
            : undefined,
          tone: 'success',
        });
      } else {
        activity.sessionClosedAt = new Date().toISOString();
        setActivity({ ...activity });
        const s = missionService.stewardshipOf('PROGRAM', programId);
        if (s?.deliveryItems) {
          for (const d of s.deliveryItems) {
            if (
              d.activityId === activityId &&
              d.tier === 'REQUIRED' &&
              d.status === 'TODO'
            ) {
              d.status = 'DONE';
            }
          }
          missionService.patchStewardship('PROGRAM', programId, {
            deliveryItems: s.deliveryItems,
          });
        }
        setMsg('Session closed (local)');
        toast({ title: 'Session closed', tone: 'success' });
      }
      setTick((t) => t + 1);
      refreshSession();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Close failed');
    } finally {
      setClosing(false);
    }
  }

  if (!account || !program || !activity) {
    return (
      <div className="panel">
        <EmptyState
          variant="error"
          title="Session not found"
          action={<Link to="/programs">Back to programs</Link>}
        />
      </div>
    );
  }

  if (!canRecord) {
    return (
      <div className="panel">
        <EmptyState
          variant="error"
          title="You can’t record attendance"
          detail="Ask a program leader for ACTIVITY / RECORD_ATTENDANCE."
          action={<Link to={`/programs/${program.id}`}>Back to program</Link>}
        />
      </div>
    );
  }

  return (
    <div className="session-mode">
      <header className="session-mode-bar">
        <div>
          <p className="muted" style={{ margin: 0, fontSize: '0.8rem' }}>
            Session Mode · {program.name}
          </p>
          <h1 style={{ margin: '0.15rem 0 0', fontSize: '1.45rem' }}>
            {activity.title}
          </h1>
          <p className="muted" style={{ margin: '0.25rem 0 0' }}>
            {new Date(activity.startsAt).toLocaleString()}
            {activity.location ? ` · ${activity.location}` : ''}
          </p>
        </div>
        <div className="row">
          <StatusPill tone={closed ? 'neutral' : 'info'}>
            {closed ? 'Closed' : 'Open'}
          </StatusPill>
          <button
            type="button"
            className="btn ghost"
            onClick={() => navigate(`/programs/${program.id}`)}
          >
            Exit
          </button>
          {!closed && (
            <button
              type="button"
              className="btn"
              disabled={closing}
              onClick={() => void closeSession()}
            >
              {closing ? 'Closing…' : 'Close session'}
            </button>
          )}
        </div>
      </header>

      {msg && <p className="badge">{msg}</p>}

      <div className="panel stack">
        <h3 style={{ margin: 0 }}>Check-in QR</h3>
        <div className="row" style={{ alignItems: 'flex-start', gap: '1rem' }}>
          <img
            src={qrImageUrl(checkInUrl('activity', activity.id))}
            alt="Session check-in QR"
            width={160}
            height={160}
          />
          <div>
            <p style={{ marginTop: 0 }}>
              <Link
                to={`/check-in?k=activity&id=${encodeURIComponent(activity.id)}&t=${encodeURIComponent(
                  checkInToken('activity', activity.id),
                )}`}
              >
                Open check-in page →
              </Link>
            </p>
            <p className="muted" style={{ fontSize: '0.85rem', wordBreak: 'break-all' }}>
              {checkInUrl('activity', activity.id)}
            </p>
          </div>
        </div>
      </div>

      <div className="session-mode-stats row">
        <span className="badge">{roster.length} on roster</span>
        <span className="badge">{present.length} present</span>
        <span className="badge">{unmarked.length} unmarked</span>
      </div>

      {unmarked.length > 0 && !closed && (
        <div className="panel">
          <strong>Chase unmarked ({unmarked.length})</strong>
          <div className="row" style={{ marginTop: '0.5rem', flexWrap: 'wrap' }}>
            {unmarked.map((u) => (
              <button
                key={u.personId}
                type="button"
                className="btn secondary"
                onClick={() => void mark(u.personId, 'PRESENT')}
              >
                {u.name} · Present
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>Person</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {roster.map((r) => (
              <tr key={r.personId}>
                <td>{r.name}</td>
                <td>
                  {r.status ? (
                    <StatusPill status={r.status} />
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                <td className="row">
                  {!closed && (
                    <>
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => void mark(r.personId, 'PRESENT')}
                      >
                        Present
                      </button>
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => void mark(r.personId, 'ABSENT')}
                      >
                        Absent
                      </button>
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => void mark(r.personId, 'LATE')}
                      >
                        Late
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
