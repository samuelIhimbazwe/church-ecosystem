import { useMemo, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { StatusPill } from '../../components/ui/StatusPill';
import { formatImpactPerFranc } from '../../domain/impact';
import { formatRwf } from '../../domain/stewardship';
import { systemsService } from '../../services';
import { reportPrefs } from '../../services/reportPrefs';
import {
  downloadText,
  reportsService,
} from '../../services/reportsService';

type Section =
  | 'leadership'
  | 'mission'
  | 'events'
  | 'archive'
  | 'finance';

const SECTIONS: Array<{ id: Section; label: string }> = [
  { id: 'leadership', label: 'Leadership' },
  { id: 'mission', label: 'Mission' },
  { id: 'events', label: 'Events' },
  { id: 'archive', label: 'Close-out archive' },
  { id: 'finance', label: 'Finance' },
];

export function ReportsHubPage() {
  const { section: sectionParam } = useParams<{ section?: string }>();
  const section = ((sectionParam as Section) || 'leadership') as Section;
  const { account, can, personName } = useAuth();
  const [search, setSearch] = useSearchParams();
  const [tick, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);
  const statusFilter = search.get('status') || 'all';
  const packetId = search.get('packet');

  const pack = useMemo(() => reportsService.leadershipPack(), [tick]);
  const mission = useMemo(
    () => reportsService.missionRollup({ status: statusFilter }),
    [tick, statusFilter],
  );
  const events = useMemo(
    () => reportsService.eventsRollup({ status: statusFilter }),
    [tick, statusFilter],
  );
  const archive = useMemo(() => reportsService.closeoutArchive(), [tick]);
  const saved = useMemo(
    () => reportPrefs.listViews(section),
    [tick, section],
  );

  if (!account || !can('PROGRAM', 'VIEW')) {
    return (
      <div className="panel">
        <p className="muted">No access to reports.</p>
      </div>
    );
  }

  if (packetId) {
    const packet = reportPrefs.getPacket(packetId);
    if (!packet) {
      return (
        <div className="panel">
          <h2>Board packet not found</h2>
          <Link to="/reports/leadership">← Reports</Link>
        </div>
      );
    }
    const s = packet.snapshot;
    return (
      <div className="stack reports-print">
        <p>
          <Link to="/reports/leadership">← Reports</Link>
        </p>
        <div className="panel">
          <p className="muted" style={{ margin: 0 }}>
            Read-only board packet ·{' '}
            {new Date(packet.createdAt).toLocaleString()}
          </p>
          <h2 style={{ marginTop: '0.35rem' }}>{packet.title}</h2>
          <div className="overview-strip">
            <div className="overview-tile">
              <div className="label">Health G/A/R</div>
              <div className="value" style={{ fontSize: '1rem' }}>
                {s.healthGreen}/{s.healthAmber}/{s.healthRed}
              </div>
            </div>
            <div className="overview-tile">
              <div className="label">People served</div>
              <div className="value" style={{ fontSize: '1rem' }}>
                {s.peopleServed}
              </div>
            </div>
            <div className="overview-tile">
              <div className="label">Impact / 1k</div>
              <div className="value" style={{ fontSize: '1rem' }}>
                {formatImpactPerFranc(s.impactPerFranc)}
              </div>
            </div>
            <div className="overview-tile">
              <div className="label">Used</div>
              <div className="value" style={{ fontSize: '1rem' }}>
                {formatRwf(s.usedCost)}
              </div>
            </div>
          </div>
          {s.exceptions.length > 0 && (
            <div>
              <strong>Exceptions</strong>
              <ul>
                {s.exceptions.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!SECTIONS.some((s) => s.id === section)) {
    return <Navigate to="/reports/leadership" replace />;
  }

  function saveCurrentView() {
    const name = window.prompt('Name this view');
    if (!name?.trim()) return;
    reportPrefs.saveView({
      name: name.trim(),
      section,
      filters: { status: statusFilter },
    });
    refresh();
  }

  function shareBoardPacket() {
    const packet = reportPrefs.createPacket({
      title: `Leadership pack — ${new Date().toLocaleDateString()}`,
      createdByPersonId: account!.personId,
      snapshot: {
        healthGreen: pack.health.green,
        healthAmber: pack.health.amber,
        healthRed: pack.health.red,
        peopleServed: pack.peopleServed,
        impactPerFranc: pack.impactPerFranc,
        usedCost: pack.money.usedCost,
        plannedCost: pack.money.plannedCost,
        exceptions: pack.exceptions,
      },
    });
    const url = `${window.location.origin}/reports/leadership?packet=${packet.id}`;
    void navigator.clipboard?.writeText(url);
    window.prompt('Board packet link (copied if allowed):', url);
  }

  return (
    <div className="stack">
      <div className="panel">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0 }}>Reports</h2>
            <p className="muted" style={{ margin: '0.35rem 0 0' }}>
              MinistryReportsKit — Finance · Mission · Events · Leadership ·
              Archive. Hello {personName}.
            </p>
          </div>
          <div className="row">
            <button
              type="button"
              className="btn ghost"
              onClick={saveCurrentView}
            >
              Save view
            </button>
            {section === 'leadership' && (
              <button
                type="button"
                className="btn ghost"
                onClick={shareBoardPacket}
              >
                Share board packet
              </button>
            )}
            <button
              type="button"
              className="btn"
              onClick={() => {
                if (section === 'leadership') {
                  downloadText(
                    'leadership-pack.csv',
                    reportsService.leadershipCsv(),
                  );
                } else if (section === 'mission') {
                  downloadText(
                    'mission-report.csv',
                    reportsService.missionCsv({ status: statusFilter }),
                  );
                } else if (section === 'events') {
                  downloadText(
                    'events-report.csv',
                    reportsService.eventsCsv({ status: statusFilter }),
                  );
                } else if (section === 'archive') {
                  downloadText(
                    'closeout-archive.csv',
                    reportsService.archiveCsv(),
                  );
                } else if (section === 'finance') {
                  downloadText(
                    'leadership-money.csv',
                    reportsService.leadershipCsv(),
                  );
                } else {
                  window.print();
                }
              }}
            >
              {section === 'finance' ? 'Export money CSV' : 'Export CSV'}
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => window.print()}
            >
              Print / PDF
            </button>
          </div>
        </div>
        <div className="row" style={{ marginTop: '0.75rem', flexWrap: 'wrap' }}>
          {SECTIONS.map((s) => (
            <Link
              key={s.id}
              to={`/reports/${s.id}`}
              className={`btn ${section === s.id ? '' : 'ghost'}`}
            >
              {s.label}
            </Link>
          ))}
        </div>
        {saved.length > 0 && (
          <div className="row" style={{ marginTop: '0.5rem', flexWrap: 'wrap' }}>
            <span className="muted">Saved:</span>
            {saved.map((v) => (
              <button
                key={v.id}
                type="button"
                className="btn ghost"
                onClick={() => {
                  const next = new URLSearchParams(search);
                  Object.entries(v.filters).forEach(([k, val]) =>
                    next.set(k, val),
                  );
                  setSearch(next);
                }}
              >
                {v.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {section === 'leadership' && (
        <div className="stack reports-print">
          <div className="panel">
            <h3>Health distribution</h3>
            <div className="overview-strip">
              <div className="overview-tile">
                <div className="label">Green</div>
                <div className="value">{pack.health.green}</div>
              </div>
              <div className="overview-tile">
                <div className="label">Amber</div>
                <div className="value">{pack.health.amber}</div>
              </div>
              <div className="overview-tile">
                <div className="label">Red</div>
                <div className="value">{pack.health.red}</div>
              </div>
              <div className="overview-tile">
                <div className="label">People served</div>
                <div className="value">{pack.peopleServed}</div>
              </div>
            </div>
            <p className="muted">
              Impact per franc:{' '}
              <strong>{formatImpactPerFranc(pack.impactPerFranc)}</strong> ·{' '}
              {pack.programsActive} active programs · {pack.projectsActive}{' '}
              active projects · {pack.eventsUpcoming} upcoming events
            </p>
          </div>
          <div className="panel">
            <h3>Money comparative</h3>
            <table className="table">
              <tbody>
                <tr>
                  <td>Planned (mission)</td>
                  <td>{formatRwf(pack.money.plannedCost)}</td>
                </tr>
                <tr>
                  <td>Confirmed funding</td>
                  <td>{formatRwf(pack.money.confirmedFunding)}</td>
                </tr>
                <tr>
                  <td>Used</td>
                  <td>{formatRwf(pack.money.usedCost)}</td>
                </tr>
                <tr>
                  <td>Gap</td>
                  <td>{formatRwf(pack.money.gap)}</td>
                </tr>
                <tr>
                  <td>Church funds balance</td>
                  <td>{formatRwf(pack.money.churchFundsBalance)}</td>
                </tr>
                <tr>
                  <td>Designated pending</td>
                  <td>{formatRwf(pack.money.designatedPending)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="panel">
            <h3>Exceptions</h3>
            {pack.exceptions.length === 0 ? (
              <p className="muted">None flagged.</p>
            ) : (
              <ul>
                {pack.exceptions.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {section === 'mission' && (
        <div className="panel">
          <div className="row" style={{ marginBottom: '0.75rem' }}>
            <select
              value={statusFilter}
              onChange={(e) => {
                const next = new URLSearchParams(search);
                next.set('status', e.target.value);
                setSearch(next);
              }}
            >
              <option value="all">All statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="SETUP">SETUP</option>
              <option value="ENDED">ENDED</option>
              <option value="PENDING_APPROVAL">PENDING_APPROVAL</option>
            </select>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Program</th>
                <th>Health</th>
                <th>People</th>
                <th>Impact / 1k</th>
                <th>Used</th>
                <th>Gap</th>
              </tr>
            </thead>
            <tbody>
              {mission.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link to={r.href}>
                      <strong>{r.name}</strong>
                    </Link>
                    <div className="muted">
                      {systemsService.getById(r.ownerSystemId)?.shortName ??
                        r.ownerSystemId}{' '}
                      · {r.status}
                    </div>
                  </td>
                  <td>
                    <StatusPill
                      tone={
                        r.health.tone === 'green'
                          ? 'success'
                          : r.health.tone === 'amber'
                            ? 'warn'
                            : r.health.tone === 'red'
                              ? 'danger'
                              : 'neutral'
                      }
                    >
                      {r.health.score} {r.health.label}
                    </StatusPill>
                  </td>
                  <td>{r.participantsServed}</td>
                  <td>{formatImpactPerFranc(r.impactPerFranc)}</td>
                  <td>{formatRwf(r.usedCost)}</td>
                  <td>{formatRwf(r.gap)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {section === 'events' && (
        <div className="panel">
          <div className="row" style={{ marginBottom: '0.75rem' }}>
            <select
              value={statusFilter}
              onChange={(e) => {
                const next = new URLSearchParams(search);
                next.set('status', e.target.value);
                setSearch(next);
              }}
            >
              <option value="all">All statuses</option>
              <option value="DRAFT">DRAFT</option>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Event</th>
                <th>When</th>
                <th>Status</th>
                <th>Spend</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td>
                    <Link to={e.href}>
                      <strong>{e.name}</strong>
                    </Link>
                  </td>
                  <td>{new Date(e.startsAt).toLocaleString()}</td>
                  <td>
                    <StatusPill status={e.status}>{e.status}</StatusPill>
                  </td>
                  <td>
                    {e.willSpend
                      ? `${formatRwf(e.usedCost)} / ${formatRwf(e.plannedCost)}`
                      : 'No spend'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {section === 'archive' && (
        <div className="panel">
          <p className="muted" style={{ marginTop: 0 }}>
            Immutable close-outs — forever browsable once ENDED/DONE with a
            recorded closeout.
          </p>
          {archive.length === 0 ? (
            <p className="muted">No archived close-outs yet.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Work</th>
                  <th>Closed</th>
                  <th>People</th>
                  <th>Impact / 1k</th>
                  <th>Money snapshot</th>
                </tr>
              </thead>
              <tbody>
                {archive.map((r) => (
                  <tr key={`${r.kind}-${r.id}`}>
                    <td>
                      <Link to={r.href}>
                        <strong>{r.name}</strong>
                      </Link>
                      <div className="muted">
                        {r.kind} · {r.status}
                      </div>
                      <div className="muted">{r.workSummary}</div>
                    </td>
                    <td>{new Date(r.closedAt).toLocaleDateString()}</td>
                    <td>{r.participantsServed ?? '—'}</td>
                    <td>{formatImpactPerFranc(r.impactPerFranc)}</td>
                    <td>
                      {formatRwf(r.usedCost)} used / {formatRwf(r.plannedCost)}{' '}
                      planned
                      <div className="muted">{r.moneySummary}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {section === 'finance' && (
        <div className="stack reports-print">
          <div className="panel">
            <h3>Money comparative (church vs vaults vs designated)</h3>
            <p className="muted" style={{ marginTop: 0 }}>
              Same figures as the Leadership pack — treasury deep-links below for
              vault detail.
            </p>
            <table className="table">
              <tbody>
                <tr>
                  <td>Planned (mission)</td>
                  <td>{formatRwf(pack.money.plannedCost)}</td>
                </tr>
                <tr>
                  <td>Confirmed funding</td>
                  <td>{formatRwf(pack.money.confirmedFunding)}</td>
                </tr>
                <tr>
                  <td>Used</td>
                  <td>{formatRwf(pack.money.usedCost)}</td>
                </tr>
                <tr>
                  <td>Gap</td>
                  <td>{formatRwf(pack.money.gap)}</td>
                </tr>
                <tr>
                  <td>Church funds balance</td>
                  <td>{formatRwf(pack.money.churchFundsBalance)}</td>
                </tr>
                <tr>
                  <td>Designated pending</td>
                  <td>{formatRwf(pack.money.designatedPending)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="panel">
            <h3>Vault detail reports</h3>
            <ul>
              <li>
                <Link to="/finance/reports">Church finance reports</Link>
              </li>
              <li>
                <Link to="/systems/youth/reports">Youth vault reports</Link>
              </li>
              <li>
                <Link to="/systems/choir/reports">Choir reports</Link>
              </li>
              <li>
                <Link to="/systems/worship/reports">Worship reports</Link>
              </li>
              <li>
                <Link to="/systems/protocol/reports">Protocol leadership</Link>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
