import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { MasterDetail } from '../../components/ui/MasterDetail';
import { PageHead } from '../../components/ui/FilterBar';
import { StageBoard } from '../../components/ui/StageBoard';
import {
  ForbiddenState,
  StatusPill,
} from '../../components/ui/StatusPill';
import { useListSelection } from '../../hooks/useListSelection';
import {
  choirOfficeIsContributionOversight,
  choirOfficeIsFamilyLeader,
  choirOfficeIsTreasurer,
  choirOfficeMayViewContributionLedgers,
  choirOfficeMayViewFinanceModule,
} from '../../domain/choirAccess';
import {
  CHOIR_FUND_FLOW_PROFILE,
  countByStage,
} from '../../domain/fundFlow';
import type { ChoirContribution, ChoirPaymentMethod } from '../../domain/types';
import {
  choirContributionOps,
  choirService,
  financeService,
} from '../../services';

const SYS = 'sys-choir' as const;

function useLiveFinance() {
  const [tick, setTick] = useState(0);
  useEffect(() => choirContributionOps.subscribe(() => setTick((t) => t + 1)), []);
  return tick;
}

function money(n: number) {
  return financeService.formatAmount(n);
}

function statusTone(
  status: string,
): 'info' | 'success' | 'warn' | 'danger' | 'neutral' {
  if (status === 'PENDING' || status === 'AT_COORDINATOR' || status === 'AT_TREASURER')
    return 'info';
  if (status === 'CONFIRMED' || status === 'FAMILY_CONFIRMED') return 'success';
  if (status === 'PARTIAL' || status === 'FAMILY_PARTIAL') return 'warn';
  if (status === 'DECLINED' || status === 'FAMILY_DECLINED') return 'danger';
  return 'neutral';
}

type Tab =
  | 'goals'
  | 'family'
  | 'oversight'
  | 'drives'
  | 'rails'
  | 'confirmed'
  | 'issues';

export function ChoirFinancePage() {
  const { account, can } = useAuth();
  const tick = useLiveFinance();
  const office = account ? choirService.officeFor(account.personId) : null;
  const mayModule = choirOfficeMayViewFinanceModule(office);
  const canView = mayModule && can('CHOIR_FINANCE', 'VIEW', SYS);
  const isTreasurer = choirOfficeIsTreasurer(office);
  const isCoord = office === 'COORDINATOR';
  const isOversight = choirOfficeIsContributionOversight(office);
  const isFamilyLead =
    choirOfficeIsFamilyLeader(office) ||
    (account ? choirContributionOps.ledTeamIds(account.personId).length > 0 : false);
  const mayLedgers = choirOfficeMayViewContributionLedgers(office);

  const defaultTab: Tab = isFamilyLead && !isOversight
    ? 'family'
    : isOversight
      ? 'oversight'
      : mayLedgers
        ? 'confirmed'
        : 'goals';
  const [tab, setTab] = useState<Tab>(defaultTab);
  const [message, setMessage] = useState('');

  const drives = useMemo(
    () => choirService.listContributionDrives(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick],
  );

  const stageCounts = useMemo(() => {
    const rows = [
      ...choirContributionOps.listOversightClaims(),
      ...choirContributionOps.listFinalConfirmed(),
      ...choirContributionOps.listIssues(),
    ];
    const seen = new Set<string>();
    const unique = rows.filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
    return countByStage(CHOIR_FUND_FLOW_PROFILE, unique);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const notifications = useMemo(
    () => (account ? choirContributionOps.listNotifications(office) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, account, office],
  );

  if (!account || !canView) {
    return (
      <div className="panel">
        <h2>Contribution & finance</h2>
        <ForbiddenState resource="CHOIR_FINANCE" />
      </div>
    );
  }

  const visibleTabs = (
    [
      { id: 'goals' as Tab, label: 'Goals', show: true, count: drives.length },
      {
        id: 'family' as Tab,
        label: 'Family',
        show: isFamilyLead,
        count: (stageCounts.CLAIMED ?? 0) + (stageCounts.FAMILY ?? 0),
      },
      {
        id: 'oversight' as Tab,
        label: 'Pipeline',
        show: isOversight,
        count:
          (stageCounts.COORDINATOR ?? 0) + (stageCounts.TREASURER ?? 0),
      },
      {
        id: 'drives' as Tab,
        label: 'Create drive',
        show: isTreasurer,
      },
      {
        id: 'rails' as Tab,
        label: 'Rails',
        show: isFamilyLead || isOversight,
      },
      {
        id: 'confirmed' as Tab,
        label: 'Vault',
        show: mayLedgers,
        count: stageCounts.VAULT,
      },
      {
        id: 'issues' as Tab,
        label: 'Issues',
        show: mayLedgers,
        count: stageCounts.ISSUE,
      },
    ] as const
  ).filter((t) => t.show);

  const activeTab = visibleTabs.some((t) => t.id === tab)
    ? tab
    : (visibleTabs[0]?.id ?? 'goals');

  return (
    <div className="stack">
      <div className="panel">
        <PageHead
          title="Contribution & finance"
          subtitle={`${CHOIR_FUND_FLOW_PROFILE.label} — claim → family → coordinator → treasurer vault. Stages stay one click away.`}
          actions={
            <Link to="/systems/choir/my-contributions" className="btn">
              My claims
            </Link>
          }
        />
        {message && (
          <p className="badge" style={{ marginTop: '0.65rem' }}>
            {message}
          </p>
        )}
      </div>

      {isOversight && notifications.length > 0 && (
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Notifications · {notifications.length}</h3>
          <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
            {notifications.slice(0, 8).map((n) => (
              <li key={n.id}>
                <span className="muted" style={{ fontSize: '0.85rem' }}>
                  {new Date(n.createdAt).toLocaleString()} · {n.kind}
                </span>
                <div>{n.message}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="panel">
        <StageBoard
          title="Contribution stages"
          activeId={activeTab}
          onChange={(id) => setTab(id as Tab)}
          stages={visibleTabs.map((t) => ({
            id: t.id,
            label: t.label,
            count: 'count' in t ? t.count : undefined,
            cta:
              t.id === 'family' ? (
                <Link to="/systems/choir/my-contributions" className="btn ghost">
                  Member claims
                </Link>
              ) : t.id === 'drives' && isTreasurer ? (
                <span className="muted" style={{ fontSize: '0.85rem' }}>
                  New drive form below
                </span>
              ) : t.id === 'oversight' ? (
                <span className="muted" style={{ fontSize: '0.85rem' }}>
                  Accept / dispute handoffs in the list
                </span>
              ) : undefined,
            children:
              t.id === 'goals' ? (
                <GoalsPanel office={office} tick={tick} drives={drives} />
              ) : t.id === 'family' && account ? (
                <FamilyClaimsPanel
                  personId={account.personId}
                  tick={tick}
                  onMessage={setMessage}
                />
              ) : t.id === 'oversight' && account ? (
                <OversightPanel
                  personId={account.personId}
                  office={office}
                  isTreasurer={isTreasurer}
                  isCoord={isCoord}
                  tick={tick}
                  onMessage={setMessage}
                />
              ) : t.id === 'drives' && account ? (
                <CreateDrivePanel
                  personId={account.personId}
                  onMessage={setMessage}
                />
              ) : t.id === 'rails' && account ? (
                <RailsPanel
                  personId={account.personId}
                  isFamilyLead={isFamilyLead}
                  isOversight={isOversight}
                  office={office}
                  tick={tick}
                  onMessage={setMessage}
                />
              ) : t.id === 'confirmed' ? (
                <ConfirmedTable tick={tick} />
              ) : t.id === 'issues' && account ? (
                <IssuesTable
                  personId={account.personId}
                  canAct={isOversight}
                  tick={tick}
                  onMessage={setMessage}
                />
              ) : (
                <p className="muted">Nothing in this stage.</p>
              ),
          }))}
        />
      </div>
    </div>
  );
}

function GoalsPanel({
  office,
  tick,
  drives,
}: {
  office: ReturnType<typeof choirService.officeFor>;
  tick: number;
  drives: ReturnType<typeof choirService.listContributionDrives>;
}) {
  void tick;
  if (drives.length === 0) {
    return (
      <div className="panel">
        <p className="muted">No active contribution drives.</p>
      </div>
    );
  }
  return (
    <div className="stack">
      {drives.map((d) => {
        const p = choirContributionOps.driveProgressForViewer(d.id, office);
        if (!p) {
          return (
            <div key={d.id} className="panel">
              <strong>{d.title}</strong>
              <p className="muted" style={{ margin: '0.35rem 0 0' }}>
                Progress not available for your office on this drive.
              </p>
            </div>
          );
        }
        return (
          <div key={d.id} className="panel">
            <h3 style={{ marginTop: 0 }}>{d.name}</h3>
            <p className="muted" style={{ marginTop: 0 }}>
              {d.frequency ?? '—'} · {d.startsOn}
              {d.endsOn ? ` → ${d.endsOn}` : ''}
              {d.description ? ` · ${d.description}` : ''}
            </p>
            <div className="overview-strip">
              {p.memberGoal != null && (
                <div className="overview-tile">
                  <div className="label">Member goal</div>
                  <div className="value" style={{ fontSize: '1rem' }}>
                    {money(p.memberGoal)}
                  </div>
                </div>
              )}
              {p.familyGoal != null && (
                <div className="overview-tile">
                  <div className="label">Family goal</div>
                  <div className="value" style={{ fontSize: '1rem' }}>
                    {money(p.familyGoal)}
                  </div>
                </div>
              )}
              {p.choirGoal != null && (
                <div className="overview-tile">
                  <div className="label">Choir goal</div>
                  <div className="value" style={{ fontSize: '1rem' }}>
                    {money(p.choirGoal)}
                  </div>
                </div>
              )}
              <div className="overview-tile">
                <div className="label">Claimed</div>
                <div className="value" style={{ fontSize: '1rem' }}>
                  {money(p.claimed)}
                </div>
              </div>
              <div className="overview-tile">
                <div className="label">Family confirmed</div>
                <div className="value" style={{ fontSize: '1rem' }}>
                  {money(p.familyConfirmed)}
                </div>
              </div>
              <div className="overview-tile">
                <div className="label">Final / vault</div>
                <div className="value" style={{ fontSize: '1rem' }}>
                  {money(p.finalConfirmed)}
                </div>
              </div>
              {p.remainingToChoirGoal != null && (
                <div className="overview-tile">
                  <div className="label">Remaining</div>
                  <div className="value" style={{ fontSize: '1rem' }}>
                    {money(p.remainingToChoirGoal)}
                  </div>
                </div>
              )}
              {p.successRate != null && (
                <div className="overview-tile">
                  <div className="label">Success rate</div>
                  <div className="value" style={{ fontSize: '1rem' }}>
                    {p.successRate}%
                  </div>
                </div>
              )}
            </div>
            {p.choirGoal == null && (
              <p className="muted" style={{ marginBottom: 0, fontSize: '0.85rem' }}>
                Whole-choir goal is private to choir leaders (not published).
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function FamilyClaimsPanel({
  personId,
  tick,
  onMessage,
}: {
  personId: string;
  tick: number;
  onMessage: (m: string) => void;
}) {
  const rows = useMemo(
    () => choirContributionOps.listFamilyQueue(personId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, personId],
  );
  const [selected, setSelected] = useState<string[]>([]);
  const teamIds = choirContributionOps.ledTeamIds(personId);
  const coordRails = choirContributionOps.listOfficeRails('COORDINATOR');

  async function respond(
    c: ChoirContribution,
    decision: 'FAMILY_CONFIRMED' | 'FAMILY_PARTIAL' | 'FAMILY_DECLINED',
  ) {
    let confirmedAmount: number | undefined;
    if (decision === 'FAMILY_PARTIAL') {
      const raw = window.prompt('Confirmed amount (RWF)', String(c.amount));
      if (!raw) return;
      confirmedAmount = Number(raw);
    }
    const note =
      decision === 'FAMILY_DECLINED' || decision === 'FAMILY_PARTIAL'
        ? window.prompt('Note') || undefined
        : undefined;
    const r = choirContributionOps.familyRespond({
      contributionId: c.id,
      actorPersonId: personId,
      decision,
      confirmedAmount,
      note,
    });
    onMessage(r.ok ? `Family ${decision}` : (r.reason ?? 'Failed'));
  }

  function submitBatch() {
    const teamId = teamIds[0];
    if (!teamId || selected.length === 0) return;
    const r = choirContributionOps.submitFamilyBatchToCoordinator({
      actorPersonId: personId,
      teamId,
      contributionIds: selected,
      paymentMethod: 'MOMO',
      toRailId: coordRails[0]?.id,
      note: 'Family batch to coordinator',
    });
    onMessage(r.ok ? 'Submitted to coordinator' : (r.reason ?? 'Failed'));
    if (r.ok) setSelected([]);
  }

  return (
    <div className="panel stack">
      <h3 style={{ marginTop: 0 }}>Family claim queue</h3>
      <p className="muted" style={{ marginTop: 0 }}>
        1) Confirm / Partial / Decline PENDING claims (money on your family
        MoMo/bank). 2) Check the boxes on confirmed rows — or use{' '}
        <strong>Send</strong> on a row. 3) Click{' '}
        <strong>Submit to coordinator</strong> at the bottom.
      </p>
      {rows.length === 0 ? (
        <p className="muted">No claims for your family.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>
                <span className="muted" style={{ fontSize: '0.8rem' }}>
                  Select
                </span>
              </th>
              <th>Claimer</th>
              <th>Claimed</th>
              <th>Status</th>
              <th>Who</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const ready =
                c.status === 'FAMILY_CONFIRMED' || c.status === 'FAMILY_PARTIAL';
              return (
                <tr key={c.id}>
                  <td>
                    {ready ? (
                      <input
                        type="checkbox"
                        checked={selected.includes(c.id)}
                        onChange={(e) =>
                          setSelected((prev) =>
                            e.target.checked
                              ? [...prev, c.id]
                              : prev.filter((x) => x !== c.id),
                          )
                        }
                        aria-label={`Select ${choirService.personLabel(c.personId)}`}
                      />
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>{choirService.personLabel(c.personId)}</td>
                  <td>{money(c.amount)}</td>
                  <td>
                    <StatusPill tone={statusTone(c.status)}>
                      {c.status}
                    </StatusPill>
                  </td>
                  <td className="muted" style={{ fontSize: '0.85rem' }}>
                    {c.familyRespondedByPersonId
                      ? `FL ${choirService.personLabel(c.familyRespondedByPersonId)}`
                      : '—'}
                  </td>
                  <td>
                    {c.status === 'PENDING' && (
                      <div className="row">
                        <button
                          type="button"
                          className="btn"
                          onClick={() => respond(c, 'FAMILY_CONFIRMED')}
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          className="btn secondary"
                          onClick={() => respond(c, 'FAMILY_PARTIAL')}
                        >
                          Partial
                        </button>
                        <button
                          type="button"
                          className="btn ghost"
                          onClick={() => respond(c, 'FAMILY_DECLINED')}
                        >
                          Decline
                        </button>
                      </div>
                    )}
                    {ready && (
                      <button
                        type="button"
                        className="btn secondary"
                        onClick={() => {
                          const teamId = teamIds[0];
                          if (!teamId) {
                            onMessage('No family team on your account');
                            return;
                          }
                          const r =
                            choirContributionOps.submitFamilyBatchToCoordinator({
                              actorPersonId: personId,
                              teamId,
                              contributionIds: [c.id],
                              paymentMethod: 'MOMO',
                              toRailId: coordRails[0]?.id,
                              note: 'Family batch to coordinator',
                            });
                          onMessage(
                            r.ok
                              ? 'Submitted to coordinator'
                              : (r.reason ?? 'Failed'),
                          );
                          if (r.ok) {
                            setSelected((prev) =>
                              prev.filter((id) => id !== c.id),
                            );
                          }
                        }}
                      >
                        Send to coordinator
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <div
        className="row"
        style={{
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.5rem',
          marginTop: '0.5rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid var(--line)',
        }}
      >
        <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
          {selected.length === 0
            ? 'Select confirmed rows (checkboxes) to enable batch submit.'
            : `${selected.length} claim(s) selected for handoff.`}
        </p>
        <button
          type="button"
          className="btn"
          disabled={selected.length === 0 || teamIds.length === 0}
          onClick={submitBatch}
        >
          Submit {selected.length || ''} to coordinator
        </button>
      </div>
    </div>
  );
}

function OversightPanel({
  personId,
  office,
  isTreasurer,
  isCoord,
  tick,
  onMessage,
}: {
  personId: string;
  office: ReturnType<typeof choirService.officeFor>;
  isTreasurer: boolean;
  isCoord: boolean;
  tick: number;
  onMessage: (m: string) => void;
}) {
  void office;
  const rows = useMemo(
    () => choirContributionOps.listOversightClaims(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick],
  );
  const events = useMemo(
    () => choirContributionOps.listEvents().slice(0, 12),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick],
  );
  const [selected, setSelected] = useState<string[]>([]);
  const visibleRows = useMemo(() => rows.slice(0, 40), [rows]);
  const {
    selectedId: focusId,
    selected: focused,
    setSelectedId: setFocusId,
  } = useListSelection(visibleRows);
  const treasRails = choirContributionOps.listOfficeRails('TREASURER');

  function batchToTreasurer() {
    const r = choirContributionOps.submitCoordBatchToTreasurer({
      actorPersonId: personId,
      contributionIds: selected,
      paymentMethod: 'BANK',
      toRailId: treasRails[0]?.id,
    });
    onMessage(r.ok ? 'Submitted to treasurer' : (r.reason ?? 'Failed'));
    if (r.ok) setSelected([]);
  }

  function finalize(
    c: ChoirContribution,
    decision: 'CONFIRMED' | 'PARTIAL' | 'DECLINED',
  ) {
    let confirmedAmount: number | undefined;
    if (decision === 'PARTIAL') {
      const raw = window.prompt(
        'Vault amount',
        String(c.familyConfirmedAmount ?? c.amount),
      );
      if (!raw) return;
      confirmedAmount = Number(raw);
    }
    const r = choirContributionOps.treasurerFinalize({
      contributionId: c.id,
      actorPersonId: personId,
      decision,
      confirmedAmount,
      note: window.prompt('Note (optional)') || undefined,
    });
    onMessage(r.ok ? `Final ${decision}` : (r.reason ?? 'Failed'));
  }

  return (
    <div className="stack">
      <MasterDetail
        list={
          <div className="stack" style={{ gap: '0.35rem' }}>
            <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
              {rows.length} claims · select to act
            </p>
            {visibleRows.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`work-board-card ${focusId === c.id ? 'active' : ''}`}
                style={{
                  textAlign: 'left',
                  width: '100%',
                  borderColor:
                    focusId === c.id
                      ? 'color-mix(in srgb, var(--accent) 50%, var(--line))'
                      : undefined,
                }}
                onClick={() => setFocusId(c.id)}
              >
                <strong>{choirService.personLabel(c.personId)}</strong>
                <div className="muted" style={{ fontSize: '0.8rem' }}>
                  {money(c.amount)} · {c.occurredOn}
                </div>
                <div style={{ marginTop: '0.25rem' }}>
                  <StatusPill tone={statusTone(c.status)}>{c.status}</StatusPill>
                </div>
              </button>
            ))}
          </div>
        }
        detail={
          focused ? (
            <div className="stack">
              <h3 style={{ margin: 0 }}>
                {choirService.personLabel(focused.personId)}
              </h3>
              <p className="muted" style={{ margin: 0 }}>
                {money(focused.amount)}
                {focused.familyConfirmedAmount != null
                  ? ` · family ${money(focused.familyConfirmedAmount)}`
                  : ''}{' '}
                · {focused.occurredOn}
              </p>
              <StatusPill tone={statusTone(focused.status)}>
                {focused.status}
              </StatusPill>
              <div className="row" style={{ flexWrap: 'wrap', gap: '0.35rem' }}>
                {isCoord && focused.status === 'AT_COORDINATOR' && (
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      const r =
                        choirContributionOps.submitCoordBatchToTreasurer({
                          actorPersonId: personId,
                          contributionIds: [focused.id],
                          paymentMethod: 'BANK',
                          toRailId: treasRails[0]?.id,
                        });
                      onMessage(
                        r.ok ? 'Sent to treasurer' : (r.reason ?? 'Failed'),
                      );
                    }}
                  >
                    Send to treasurer
                  </button>
                )}
                {isTreasurer &&
                  (focused.status === 'AT_TREASURER' ||
                    focused.status === 'FAMILY_CONFIRMED') && (
                    <>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => finalize(focused, 'CONFIRMED')}
                      >
                        Vault confirm
                      </button>
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => finalize(focused, 'PARTIAL')}
                      >
                        Partial
                      </button>
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => finalize(focused, 'DECLINED')}
                      >
                        Decline
                      </button>
                    </>
                  )}
                {isCoord && focused.status === 'AT_COORDINATOR' && (
                  <label className="row">
                    <input
                      type="checkbox"
                      checked={selected.includes(focused.id)}
                      onChange={(e) =>
                        setSelected((prev) =>
                          e.target.checked
                            ? [...prev, focused.id]
                            : prev.filter((x) => x !== focused.id),
                        )
                      }
                    />
                    Include in batch
                  </label>
                )}
              </div>
              {isCoord && selected.length > 0 && (
                <button
                  type="button"
                  className="btn"
                  onClick={batchToTreasurer}
                >
                  Submit batch ({selected.length}) to treasurer
                </button>
              )}
              <div>
                <strong>Recent activity</strong>
                <ul style={{ margin: '0.35rem 0 0', paddingLeft: '1.1rem' }}>
                  {choirContributionOps.listEvents(focused.id).slice(0, 6).map((ev) => (
                    <li key={ev.id} className="muted" style={{ fontSize: '0.85rem' }}>
                      {choirService.personLabel(ev.actorPersonId)} · {ev.action}
                      {ev.detail ? ` · ${ev.detail}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null
        }
        emptyDetail={
          rows.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>
              No claims in this queue.
            </p>
          ) : undefined
        }
      />
      {events.length > 0 && (
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Feed</h3>
          <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
            {events.map((ev) => (
              <li key={ev.id} className="muted" style={{ fontSize: '0.85rem' }}>
                {choirService.personLabel(ev.actorPersonId)} · {ev.action}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function isOversightBtn(office: ReturnType<typeof choirService.officeFor>) {
  return office === 'TREASURER' || office === 'COORDINATOR';
}

function CreateDrivePanel({
  personId,
  onMessage,
}: {
  personId: string;
  onMessage: (m: string) => void;
}) {
  const types = choirService.contributionTypes(false);
  const teams = choirService.listTeams();
  const [name, setName] = useState('');
  const [typeId, setTypeId] = useState(types[0]?.id ?? '');
  const [frequency, setFrequency] = useState<'ONCE' | 'MONTHLY' | 'EVENT'>(
    'MONTHLY',
  );
  const [startsOn, setStartsOn] = useState('2026-09-01');
  const [endsOn, setEndsOn] = useState('2026-12-31');
  const [memberGoal, setMemberGoal] = useState('5000');
  const [familyGoal, setFamilyGoal] = useState('40000');
  const [choirGoal, setChoirGoal] = useState('250000');
  const [publicChoir, setPublicChoir] = useState(false);
  const [familyTeamId, setFamilyTeamId] = useState(teams[0]?.id ?? '');

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const r = choirContributionOps.createDrive({
      actorPersonId: personId,
      name,
      typeId,
      frequency,
      startsOn,
      endsOn: endsOn || undefined,
      memberGoal: Number(memberGoal) || undefined,
      familyGoal: Number(familyGoal) || undefined,
      familyTeamId: familyTeamId || undefined,
      choirGoal: Number(choirGoal) || undefined,
      ministryGoalPublic: publicChoir,
    });
    onMessage(r.ok ? 'Drive created' : (r.reason ?? 'Failed'));
    if (r.ok) setName('');
  }

  return (
    <div className="panel">
      <h3 style={{ marginTop: 0 }}>Create contribution</h3>
      <form className="stack" onSubmit={onSubmit}>
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Type
          <select value={typeId} onChange={(e) => setTypeId(e.target.value)}>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Frequency
          <select
            value={frequency}
            onChange={(e) =>
              setFrequency(e.target.value as 'ONCE' | 'MONTHLY' | 'EVENT')
            }
          >
            <option value="ONCE">Once</option>
            <option value="MONTHLY">Monthly</option>
            <option value="EVENT">Event</option>
          </select>
        </label>
        <div className="row">
          <label>
            Starts
            <input
              type="date"
              value={startsOn}
              onChange={(e) => setStartsOn(e.target.value)}
              required
            />
          </label>
          <label>
            Ends
            <input
              type="date"
              value={endsOn}
              onChange={(e) => setEndsOn(e.target.value)}
            />
          </label>
        </div>
        <label>
          Member goal (RWF)
          <input
            value={memberGoal}
            onChange={(e) => setMemberGoal(e.target.value)}
          />
        </label>
        <label>
          Family goal (RWF)
          <input
            value={familyGoal}
            onChange={(e) => setFamilyGoal(e.target.value)}
          />
        </label>
        <label>
          Family for team goal
          <select
            value={familyTeamId}
            onChange={(e) => setFamilyTeamId(e.target.value)}
          >
            <option value="">All / generic</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Choir goal (RWF)
          <input
            value={choirGoal}
            onChange={(e) => setChoirGoal(e.target.value)}
          />
        </label>
        <label className="row" style={{ alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="checkbox"
            checked={publicChoir}
            onChange={(e) => setPublicChoir(e.target.checked)}
          />
          Publish choir goal to members / family leaders
        </label>
        <button type="submit" className="btn">
          Create drive
        </button>
      </form>
    </div>
  );
}

function RailsPanel({
  personId,
  isFamilyLead,
  isOversight,
  office,
  tick,
  onMessage,
}: {
  personId: string;
  isFamilyLead: boolean;
  isOversight: boolean;
  office: ReturnType<typeof choirService.officeFor>;
  tick: number;
  onMessage: (m: string) => void;
}) {
  void tick;
  const familyRails = choirContributionOps.listFamilyRails();
  const officeRails = choirContributionOps.listOfficeRails();
  const teamId = choirContributionOps.ledTeamIds(personId)[0];
  const [kind, setKind] = useState<'MOMO' | 'BANK'>('MOMO');
  const [label, setLabel] = useState('');
  const [accountRef, setAccountRef] = useState('');

  return (
    <div className="stack">
      {isFamilyLead && teamId && (
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Family payment rails</h3>
          <p className="muted">
            Members pay to your MoMo / bank. That is why you Confirm / Partial /
            Decline.
          </p>
          <ul>
            {familyRails
              .filter((r) => r.teamId === teamId)
              .map((r) => (
                <li key={r.id}>
                  <strong>{r.label}</strong> · {r.kind} · {r.accountRef}
                </li>
              ))}
          </ul>
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              const r = choirContributionOps.upsertFamilyRail({
                actorPersonId: personId,
                teamId,
                kind,
                label,
                accountRef,
              });
              onMessage(r.ok ? 'Family rail saved' : (r.reason ?? 'Failed'));
            }}
          >
            <label>
              Kind
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as 'MOMO' | 'BANK')}
              >
                <option value="MOMO">MoMo</option>
                <option value="BANK">Bank</option>
              </select>
            </label>
            <label>
              Label
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                required
              />
            </label>
            <label>
              Code / account
              <input
                value={accountRef}
                onChange={(e) => setAccountRef(e.target.value)}
                required
              />
            </label>
            <button type="submit" className="btn">
              Save family rail
            </button>
          </form>
        </div>
      )}
      {isOversight && (
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Coordinator / treasurer rails</h3>
          <ul>
            {officeRails.map((r) => (
              <li key={r.id}>
                <strong>{r.holderOffice}</strong> · {r.label} · {r.kind} ·{' '}
                {r.accountRef}
              </li>
            ))}
          </ul>
          {(office === 'COORDINATOR' || office === 'TREASURER') && (
            <form
              className="stack"
              onSubmit={(e) => {
                e.preventDefault();
                const r = choirContributionOps.upsertOfficeRail({
                  actorPersonId: personId,
                  holderOffice: office,
                  kind,
                  label,
                  accountRef,
                });
                onMessage(r.ok ? 'Office rail saved' : (r.reason ?? 'Failed'));
              }}
            >
              <label>
                Kind
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value as 'MOMO' | 'BANK')}
                >
                  <option value="MOMO">MoMo</option>
                  <option value="BANK">Bank</option>
                </select>
              </label>
              <label>
                Label
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  required
                />
              </label>
              <label>
                Code / account
                <input
                  value={accountRef}
                  onChange={(e) => setAccountRef(e.target.value)}
                  required
                />
              </label>
              <button type="submit" className="btn">
                Save {office.toLowerCase()} rail
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

function ConfirmedTable({ tick }: { tick: number }) {
  const rows = useMemo(
    () => choirContributionOps.listFinalConfirmed(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick],
  );
  return (
    <div className="panel">
      <h3 style={{ marginTop: 0 }}>Final confirmed contributions</h3>
      <p className="muted">Auto-updates when the treasurer posts to the vault.</p>
      <table className="table">
        <thead>
          <tr>
            <th>Claim date</th>
            <th>Confirmation date</th>
            <th>Claimer</th>
            <th>Confirmer</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id}>
              <td>{c.occurredOn}</td>
              <td>
                {c.verifiedAt ? new Date(c.verifiedAt).toLocaleString() : '—'}
              </td>
              <td>{choirService.personLabel(c.personId)}</td>
              <td>
                {c.verifiedByPersonId
                  ? choirService.personLabel(c.verifiedByPersonId)
                  : '—'}
              </td>
              <td>{money(c.confirmedAmount ?? c.amount)}</td>
              <td>
                <StatusPill tone={statusTone(c.status)}>{c.status}</StatusPill>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p className="muted">No final confirmations yet.</p>}
    </div>
  );
}

function IssuesTable({
  personId,
  canAct,
  tick,
  onMessage,
}: {
  personId: string;
  canAct: boolean;
  tick: number;
  onMessage: (m: string) => void;
}) {
  const rows = useMemo(
    () => choirContributionOps.listIssues(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick],
  );
  return (
    <div className="panel">
      <h3 style={{ marginTop: 0 }}>Issues</h3>
      <p className="muted">
        Partials, declines, and open follow-ups — updates live.
      </p>
      <table className="table">
        <thead>
          <tr>
            <th>Claim date</th>
            <th>Response date</th>
            <th>Claimer</th>
            <th>Confirmer</th>
            <th>Claimed</th>
            <th>Confirmed</th>
            <th>Follow-up</th>
            <th>Status / result</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => {
            const fu = c.followUpId
              ? choirService.listFollowUps(false).find((f) => f.id === c.followUpId)
              : undefined;
            return (
              <tr key={c.id}>
                <td>{c.occurredOn}</td>
                <td>
                  {c.familyRespondedAt || c.verifiedAt
                    ? new Date(
                        c.verifiedAt ?? c.familyRespondedAt!,
                      ).toLocaleString()
                    : '—'}
                </td>
                <td>{choirService.personLabel(c.personId)}</td>
                <td>
                  {(c.verifiedByPersonId || c.familyRespondedByPersonId)
                    ? choirService.personLabel(
                        c.verifiedByPersonId ?? c.familyRespondedByPersonId!,
                      )
                    : '—'}
                </td>
                <td>{money(c.amount)}</td>
                <td>
                  {money(
                    c.confirmedAmount ?? c.familyConfirmedAmount ?? 0,
                  )}
                </td>
                <td className="muted" style={{ fontSize: '0.85rem' }}>
                  {fu
                    ? `${fu.reason} · by ${choirService.personLabel(fu.createdByPersonId)}`
                    : '—'}
                </td>
                <td>
                  <StatusPill tone={statusTone(c.status)}>{c.status}</StatusPill>
                  {fu && (
                    <div className="muted" style={{ fontSize: '0.8rem' }}>
                      FU {fu.status}
                      {fu.resultNote ? ` · ${fu.resultNote}` : ''}
                    </div>
                  )}
                  {canAct && fu?.status === 'OPEN' && (
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => {
                        const resultNote = window.prompt('Follow-up result');
                        if (!resultNote) return;
                        const r = choirContributionOps.closeFollowUp({
                          followUpId: fu.id,
                          actorPersonId: personId,
                          resultNote,
                        });
                        onMessage(
                          r.ok ? 'Follow-up closed' : (r.reason ?? 'Failed'),
                        );
                      }}
                    >
                      Close FU
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 && <p className="muted">No issues.</p>}
    </div>
  );
}
