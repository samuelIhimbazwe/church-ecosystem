import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { PageHead } from '../../components/ui/FilterBar';
import { StatusPill } from '../../components/ui/StatusPill';
import type { MusicHorizon } from '../../domain/musicSchedule';
import { MUSIC_SERVICE_LABELS } from '../../domain/musicSchedule';
import { MUSIC_UNITS, musicUnitName } from '../../domain/musicUnits';
import { missionService } from '../../services';
import { musicScheduleService } from '../../services/musicScheduleService';
import { MinistryHomeCard } from './MinistryShell';
import { MinistryMissionBoard } from './MinistryMissionBoard';

const SYS = 'sys-music' as const;
const BASE = '/systems/music';

function useTick() {
  const [tick, setTick] = useState(0);
  return { tick, refresh: () => setTick((t) => t + 1) };
}

function musicNotifyRecipients(): string[] {
  return [
    'p-music-leader',
    'p-choir-pres',
    'p-choir-leader',
    'p-worship-pres',
    'p-worship-leader',
    'p-pastor',
    'p-assistant',
    'p-secretary',
  ];
}

export function MusicHomePage() {
  const { refresh, tick } = useTick();
  void tick;
  const month = musicScheduleService.liveMonthKey();
  const published = musicScheduleService.getPublished(month);
  const drafts = musicScheduleService.listDrafts(month);

  return (
    <div className="stack">
      <MinistryHomeCard title="Music System">
        <p className="muted" style={{ marginTop: 0 }}>
          Oversight for choirs and worship — service calendar and choir schedule
          engine. Choir and Worship vaults stay private unless granted.
        </p>
        <div className="row">
          <span className="badge">{MUSIC_UNITS.length} units</span>
          <span className="badge">
            {published ? `Published ${month} v${published.version}` : `${month} not published`}
          </span>
          <span className="badge">{drafts.length} drafts</span>
        </div>
      </MinistryHomeCard>
      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Work here</h3>
        <div className="stack" style={{ gap: '0.5rem' }}>
            <Link to={`${BASE}/schedule`}>Choir schedule workspace</Link>
          <Link to={`${BASE}/schedule-drafts`}>Drafts</Link>
          <Link to={`${BASE}/schedule-published`}>Published choir schedule</Link>
          <Link to={`${BASE}/mission`}>Mission board</Link>
        </div>
        <button
          type="button"
          className="btn ghost"
          style={{ marginTop: '0.75rem' }}
          onClick={refresh}
        >
          Refresh
        </button>
      </div>
    </div>
  );
}

export function MusicMissionPage() {
  return (
    <MinistryMissionBoard systemId={SYS} title="Music mission board" />
  );
}

export function MusicScheduleWorkspacePage() {
  const { account, positions } = useAuth();
  const canManage = missionService.canManageBoard(positions, SYS);
  const { refresh, tick } = useTick();
  const [periodKey, setPeriodKey] = useState(
    musicScheduleService.liveMonthKey(),
  );
  const [horizon, setHorizon] = useState<MusicHorizon>('MONTH');
  const [msg, setMsg] = useState('');
  const canvas = useMemo(
    () => musicScheduleService.getCanvas(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, periodKey, horizon],
  );

  if (!account) return null;

  function onBuildCalendar() {
    musicScheduleService.buildCalendar(periodKey, horizon);
    setMsg(`Calendar built for ${periodKey} (${horizon.toLowerCase()})`);
    refresh();
  }

  function onBuildSchedule() {
    const r = musicScheduleService.buildChoirSchedule();
    setMsg(
      r.ok
        ? `Choir schedule generated${r.warnings.length ? ` · ${r.warnings.length} note(s)` : ''}`
        : r.reason ?? 'Failed',
    );
    refresh();
  }

  function onSaveDraft() {
    if (!canManage) {
      setMsg('Only Music leaders can save drafts');
      return;
    }
    const r = musicScheduleService.saveDraft(account!.personId);
    setMsg(r.ok ? `Saved draft: ${r.draft?.label}` : r.reason ?? 'Save failed');
    refresh();
  }

  const services = canvas?.services ?? [];
  const assignments = canvas?.assignments ?? [];

  return (
    <div className="stack">
      <div className="panel">
        <PageHead
          title="Choir schedule workspace"
          subtitle="Build calendar → generate choir schedule → save draft. Publish from Drafts."
          actions={
            <Link className="btn secondary" to={`${BASE}/schedule-drafts`}>
              Drafts
            </Link>
          }
        />
        <div className="row" style={{ marginTop: '0.75rem', flexWrap: 'wrap' }}>
          <label className="field" style={{ margin: 0 }}>
            Period
            <select
              value={periodKey}
              onChange={(e) => setPeriodKey(e.target.value)}
            >
              {musicScheduleService.allowedMonths().map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className="field" style={{ margin: 0 }}>
            Horizon
            <select
              value={horizon}
              onChange={(e) => setHorizon(e.target.value as MusicHorizon)}
            >
              <option value="MONTH">Month</option>
              <option value="QUARTER">Quarter</option>
              <option value="HALF">Half year</option>
              <option value="YEAR">Year</option>
            </select>
          </label>
        </div>
        <div className="row" style={{ marginTop: '0.75rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn" onClick={onBuildCalendar}>
            Build calendar
          </button>
          <button
            type="button"
            className="btn"
            onClick={onBuildSchedule}
            disabled={!services.length}
          >
            Build choir schedule
          </button>
          {canManage && (
            <button
              type="button"
              className="btn"
              onClick={onSaveDraft}
              disabled={!assignments.length}
            >
              Save draft
            </button>
          )}
        </div>
        {msg && <p className="badge" style={{ marginTop: '0.75rem' }}>{msg}</p>}
        {canvas?.warnings?.length ? (
          <ul className="muted" style={{ marginTop: '0.5rem' }}>
            {canvas.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="panel">
        <h3 style={{ marginTop: 0 }}>
          {services.length
            ? `${services.length} services · ${assignments.length} assignments`
            : 'No calendar yet'}
        </h3>
        {services.length === 0 ? (
          <p className="muted">Click Build calendar to start.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Service</th>
                <th>Scheduled</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => {
                const units = musicScheduleService.assignmentsForService(
                  assignments,
                  s.id,
                );
                return (
                  <tr key={s.id}>
                    <td>{s.date}</td>
                    <td>{MUSIC_SERVICE_LABELS[s.kind]}</td>
                    <td>
                      {units.length
                        ? musicScheduleService.formatAssignmentLine(units)
                        : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export function MusicScheduleDraftsPage() {
  const { account, positions } = useAuth();
  const canManage = missionService.canManageBoard(positions, SYS);
  const { refresh, tick } = useTick();
  const [msg, setMsg] = useState('');
  const drafts = useMemo(
    () => musicScheduleService.listDrafts(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick],
  );

  if (!account) return null;

  function onPublish(id: string) {
    if (!canManage) return;
    const r = musicScheduleService.publishDraft(
      id,
      account!.personId,
      musicNotifyRecipients(),
    );
    setMsg(
      r.ok
        ? `Published choir schedule ${r.schedule?.periodKey} v${r.schedule?.version}`
        : r.reason ?? 'Publish failed',
    );
    refresh();
  }

  function onDelete(id: string) {
    if (!canManage) return;
    musicScheduleService.deleteDraft(id);
    setMsg('Draft deleted');
    refresh();
  }

  return (
    <div className="stack">
      <div className="panel">
        <PageHead
          title="Schedule drafts"
          subtitle="Drafts cannot be edited — delete or publish. Publishing deletes other drafts for that period."
          actions={
            <Link className="btn secondary" to={`${BASE}/schedule`}>
              Workspace
            </Link>
          }
        />
        {msg && <p className="badge">{msg}</p>}
      </div>
      <div className="panel">
        {drafts.length === 0 ? (
          <p className="muted">No drafts.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Label</th>
                <th>Period</th>
                <th>Status</th>
                <th>Created</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {drafts.map((d) => (
                <tr key={d.id}>
                  <td>
                    <strong>{d.label}</strong>
                    <div className="muted" style={{ fontSize: '0.85rem' }}>
                      {d.assignments.length} assignments · {d.services.length}{' '}
                      services
                    </div>
                  </td>
                  <td>{d.periodKey}</td>
                  <td>
                    <StatusPill status={d.status}>{d.status}</StatusPill>
                  </td>
                  <td>{new Date(d.createdAt).toLocaleString()}</td>
                  <td>
                    {canManage && (
                      <div className="row">
                        <button
                          type="button"
                          className="btn"
                          onClick={() => onPublish(d.id)}
                        >
                          Publish
                        </button>
                        <button
                          type="button"
                          className="btn ghost"
                          onClick={() => onDelete(d.id)}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export function MusicSchedulePublishedPage() {
  const { account, positions } = useAuth();
  const canManage = missionService.canManageBoard(positions, SYS);
  const { refresh, tick } = useTick();
  const [periodKey, setPeriodKey] = useState(
    musicScheduleService.liveMonthKey(),
  );
  const [msg, setMsg] = useState('');
  const published = useMemo(
    () => musicScheduleService.getPublished(periodKey),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [periodKey, tick],
  );

  function moveUnit(serviceId: string, fromIdx: number, dir: -1 | 1) {
    if (!published || !canManage || !account) return;
    const units = musicScheduleService.assignmentsForService(
      published.assignments,
      serviceId,
    );
    const to = fromIdx + dir;
    if (to < 0 || to >= units.length) return;
    const next = [...units];
    [next[fromIdx], next[to]] = [next[to], next[fromIdx]];
    const rest = published.assignments.filter((a) => a.serviceId !== serviceId);
    const rebuilt = [
      ...rest,
      ...next.map((unitId) => ({
        id: `masg-${Math.random().toString(36).slice(2, 8)}`,
        serviceId,
        unitId,
        source: 'MANUAL' as const,
      })),
    ];
    const r = musicScheduleService.updatePublished(
      periodKey,
      account.personId,
      rebuilt,
      musicNotifyRecipients(),
    );
    setMsg(r.ok ? `Updated v${r.schedule?.version}` : r.reason ?? 'Update failed');
    refresh();
  }

  return (
    <div className="stack">
      <div className="panel">
        <PageHead
          title="Published choir schedule"
          subtitle="Published schedule can be edited; viewers always see the latest version."
        />
        <label className="field">
          Period
          <select
            value={periodKey}
            onChange={(e) => setPeriodKey(e.target.value)}
          >
            {musicScheduleService.allowedMonths().map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        {msg && <p className="badge">{msg}</p>}
      </div>
      {!published ? (
        <div className="panel">
          <p className="muted">No published choir schedule for {periodKey}.</p>
        </div>
      ) : (
        <div className="panel">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0 }}>
              Choir schedule · {published.periodKey} · v{published.version}
            </h3>
            <StatusPill status="PUBLISHED">PUBLISHED</StatusPill>
          </div>
          <p className="muted">
            Updated {new Date(published.updatedAt).toLocaleString()}
          </p>
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Service</th>
                <th>Scheduled</th>
                {canManage ? <th /> : null}
              </tr>
            </thead>
            <tbody>
              {published.services.map((s) => {
                const units = musicScheduleService.assignmentsForService(
                  published.assignments,
                  s.id,
                );
                return (
                  <tr key={s.id}>
                    <td>{s.date}</td>
                    <td>{MUSIC_SERVICE_LABELS[s.kind]}</td>
                    <td>
                      {units.map(musicUnitName).join(' · ') || '—'}
                    </td>
                    {canManage ? (
                      <td>
                        {units.length > 1 && (
                          <button
                            type="button"
                            className="btn ghost"
                            title="Swap first two units"
                            onClick={() => moveUnit(s.id, 0, 1)}
                          >
                            Swap
                          </button>
                        )}
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function MusicScheduleInboxPage() {
  const { account } = useAuth();
  const { refresh, tick } = useTick();
  const notes = useMemo(
    () =>
      account
        ? musicScheduleService.listNotifications(account.personId)
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [account, tick],
  );

  if (!account) return null;

  return (
    <div className="stack">
      <div className="panel">
        <PageHead
          title="Schedule inbox"
          subtitle="Notifications when a choir schedule is published or updated."
        />
      </div>
      <div className="panel">
        {notes.length === 0 ? (
          <p className="muted">No notifications.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
            {notes.map((n) => (
              <li key={n.id} style={{ marginBottom: '0.75rem' }}>
                <strong>{n.title}</strong>
                {!n.readAt && <span className="badge"> New</span>}
                <div className="muted">{n.body}</div>
                <div className="row" style={{ marginTop: '0.25rem' }}>
                  <Link to={`${BASE}/schedule-published`}>View schedule</Link>
                  {!n.readAt && (
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => {
                        musicScheduleService.markRead(n.id, account.personId);
                        refresh();
                      }}
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
