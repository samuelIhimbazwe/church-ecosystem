import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { StatusPill } from '../components/ui/StatusPill';
import { missionService, systemsService } from '../services';

type CalItem = ReturnType<typeof missionService.calendar>[number];

function monthMatrix(year: number, month: number) {
  const first = new Date(year, month, 1);
  const startPad = first.getDay(); // 0 Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ date: Date | null; day: number | null }> = [];
  for (let i = 0; i < startPad; i++) cells.push({ date: null, day: null });
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), day: d });
  }
  while (cells.length % 7 !== 0) cells.push({ date: null, day: null });
  return cells;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function itemHref(item: CalItem) {
  if (item.kind === 'EVENT') return `/events/${item.id}`;
  if (item.programId) return `/programs/${item.programId}`;
  return '/programs';
}

export function CalendarPage() {
  const { can, account, positions } = useAuth();
  const canView = can('PROGRAM', 'VIEW') || can('EVENT', 'VIEW');
  const [cursor, setCursor] = useState(() => new Date(2026, 8, 1)); // Sep 2026 seed
  const [mode, setMode] = useState<'month' | 'list'>('month');

  const items = missionService.calendar('sys-main', {
    personId: account?.personId,
    positions,
    canEnterOwner: true,
  });

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const cells = useMemo(() => monthMatrix(year, month), [year, month]);
  const label = cursor.toLocaleString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const byDay = useMemo(() => {
    const map = new Map<string, CalItem[]>();
    for (const item of items) {
      const d = new Date(item.startsAt);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return map;
  }, [items]);

  if (!canView) {
    return (
      <div className="panel">
        <h2>Calendar</h2>
        <p className="muted">No program/event view rights.</p>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="panel">
        <div className="page-head">
          <div>
            <h2>Church calendar</h2>
            <p className="muted" style={{ margin: 0 }}>
              General church activities and events only — ministry-private stays
              in peer systems.
            </p>
          </div>
          <div className="row">
            <button
              type="button"
              className={`btn ${mode === 'month' ? '' : 'ghost'}`}
              onClick={() => setMode('month')}
            >
              Month
            </button>
            <button
              type="button"
              className={`btn ${mode === 'list' ? '' : 'ghost'}`}
              onClick={() => setMode('list')}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {mode === 'month' && (
        <div className="panel">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <button
              type="button"
              className="btn ghost"
              onClick={() => setCursor(new Date(year, month - 1, 1))}
            >
              ← Prev
            </button>
            <strong style={{ fontFamily: 'var(--font-display)' }}>{label}</strong>
            <button
              type="button"
              className="btn ghost"
              onClick={() => setCursor(new Date(year, month + 1, 1))}
            >
              Next →
            </button>
          </div>
          <div className="cal-weekdays">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="cal-grid">
            {cells.map((cell, i) => {
              if (!cell.date || cell.day == null) {
                return <div key={`e-${i}`} className="cal-cell empty" />;
              }
              const key = `${cell.date.getFullYear()}-${cell.date.getMonth()}-${cell.date.getDate()}`;
              const dayItems = byDay.get(key) ?? [];
              const isToday = sameDay(cell.date, new Date());
              return (
                <div
                  key={key}
                  className={`cal-cell ${isToday ? 'today' : ''}`}
                >
                  <div className="cal-daynum">{cell.day}</div>
                  <div className="cal-events">
                    {dayItems.slice(0, 3).map((item) => (
                      <Link
                        key={`${item.kind}-${item.id}`}
                        to={itemHref(item)}
                        className={`cal-chip ${item.kind === 'EVENT' ? 'event' : 'activity'}`}
                        title={item.title}
                      >
                        {item.title}
                      </Link>
                    ))}
                    {dayItems.length > 3 && (
                      <span className="muted" style={{ fontSize: '0.7rem' }}>
                        +{dayItems.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {mode === 'list' && (
        <div className="panel">
          <table className="table">
            <thead>
              <tr>
                <th>When</th>
                <th>Kind</th>
                <th>Title</th>
                <th>System</th>
                <th>Meta</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="muted">
                    No upcoming items
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={`${item.kind}-${item.id}`}>
                    <td>{new Date(item.startsAt).toLocaleString()}</td>
                    <td>
                      <StatusPill
                        tone={item.kind === 'EVENT' ? 'info' : 'neutral'}
                      >
                        {item.kind}
                      </StatusPill>
                    </td>
                    <td>
                      <Link to={itemHref(item)}>
                        <strong>{item.title}</strong>
                      </Link>
                    </td>
                    <td>
                      {systemsService.getById(item.systemId)?.shortName ??
                        item.systemId}
                    </td>
                    <td className="muted">{item.meta}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="row">
        <Link to="/programs">Programs</Link>
        <Link to="/events">Events</Link>
        <Link to="/tasks">Tasks</Link>
      </div>
    </div>
  );
}
