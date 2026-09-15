import { type FormEvent, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { SelectField, TextField } from '../../components/ui/Field';
import { StageBoard } from '../../components/ui/StageBoard';
import { ForbiddenState } from '../../components/ui/StatusPill';
import { PageHead } from '../../components/ui/FilterBar';
import type {
  MinistryContribution,
  MinistryPaymentMethod,
  SystemId,
} from '../../domain/types';
import {
  activeFundFlowStages,
  countByStage,
  fundFlowProfileFor,
  stageForStatus,
  type FundFlowStageId,
} from '../../domain/fundFlow';
import {
  ministryOfficeMayAccessModule,
  resolveMinistryBoardOffice,
} from '../../domain/ministryNavAccess';
import { resolvePeerEntry } from '../../domain/oversightAccess';
import { getPeerCore } from '../../ministry/peerCoreSystems';
import {
  financeService,
  ministryFinanceService,
  missionService,
  oversightReportsService,
} from '../../services';
import { participationService } from '../../services/participationService';

function useTick() {
  const [tick, setTick] = useState(0);
  return { tick, refresh: () => setTick((t) => t + 1) };
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function basePathFor(systemId: SystemId): string {
  if (systemId === 'sys-youth') return '/systems/youth';
  if (systemId === 'sys-music') return '/systems/music';
  const peer = getPeerCore(systemId);
  return peer ? `/systems/${peer.slug}` : '/';
}

function KitGate({
  systemId,
  children,
  title,
  /** Itorero oversight may open assets (and later shared reports) without ledger VIEW. */
  allowOversight = false,
}: {
  systemId: SystemId;
  children: ReactNode;
  title: string;
  allowOversight?: boolean;
}) {
  const { account, can, positions } = useAuth();
  const canView = can('MINISTRY_FINANCE', 'VIEW', systemId);
  const oversight =
    allowOversight &&
    !!account &&
    resolvePeerEntry(account.personId, systemId, positions).kind ===
      'oversight';
  if (!account || (!canView && !oversight)) {
    return (
      <div className="panel">
        <h2>{title}</h2>
        <ForbiddenState resource="MINISTRY_FINANCE" />
      </div>
    );
  }
  return <>{children}</>;
}

export function MinistryFinanceOverviewPage({
  systemId,
}: {
  systemId: SystemId;
}) {
  const { account, can, positions } = useAuth();
  const { tick, refresh } = useTick();
  const canManage = can('MINISTRY_FINANCE', 'MANAGE', systemId);
  const base = basePathFor(systemId);
  const boardOffice = account
    ? resolveMinistryBoardOffice(
        account.personId,
        systemId,
        positions.length ? positions : participationService.positionsFor(account.personId),
      )
    : 'MEMBER';
  const fundIdSeed = ministryFinanceService.fundIdFor(systemId);
  const profile = fundFlowProfileFor(systemId);
  const flowStages = activeFundFlowStages(profile);
  const [stageFilter, setStageFilter] = useState<FundFlowStageId | 'all'>('all');
  const [message, setMessage] = useState('');
  const [all, setAll] = useState<MinistryContribution[]>([]);
  const [apiCanVerify, setApiCanVerify] = useState<boolean | null>(null);
  const [apiFundId, setApiFundId] = useState<string | null>(null);
  const [listSource, setListSource] = useState<'api' | 'seed'>('seed');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const hybrid = await ministryFinanceService.listContributionsHybrid(
        systemId,
      );
      if (cancelled) return;
      setAll(hybrid.rows);
      setListSource(hybrid.source);
      setApiCanVerify(hybrid.canVerify);
      setApiFundId(hybrid.fundId);
    })();
    return () => {
      cancelled = true;
    };
  }, [tick, systemId]);

  useEffect(() => {
    setStageFilter('all');
  }, [systemId]);

  const fundId = apiFundId ?? fundIdSeed;
  const canVerifyFund =
    apiCanVerify ??
    (account && fundId
      ? financeService.authorizeFund(account.personId, fundId, 'MANAGE')
          .allowed
      : false);

  const summary = useMemo(() => {
    const pendingRows = all.filter((c) => c.status === 'PENDING');
    const confirmed = all.filter(
      (c) => c.status === 'CONFIRMED' || c.status === 'PARTIAL',
    );
    return {
      pendingCount: pendingRows.length,
      pendingAmount: pendingRows.reduce((s, c) => s + c.amount, 0),
      confirmed: confirmed.reduce(
        (s, c) => s + (c.confirmedAmount ?? c.amount),
        0,
      ),
      fundBalance:
        listSource === 'seed' && fundId
          ? financeService.balance(fundId)
          : 0,
      fundId,
    };
  }, [all, fundId, listSource]);

  const pending = all.filter((c) => c.status === 'PENDING');
  const stageCounts = useMemo(() => countByStage(profile, all), [profile, all]);

  function contributionTable(rows: MinistryContribution[]) {
    return (
      <table className="table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Person</th>
            <th>Type</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="muted">
                {all.length > 0 ? (
                  <>
                    No contributions in this stage.{' '}
                    <button
                      type="button"
                      className="btn ghost"
                      style={{ padding: 0, verticalAlign: 'baseline' }}
                      onClick={() => setStageFilter('all')}
                    >
                      Show all ({all.length})
                    </button>
                  </>
                ) : (
                  'No contributions in this stage.'
                )}
              </td>
            </tr>
          ) : (
            rows.map((c) => (
              <tr key={c.id}>
                <td>{c.occurredOn}</td>
                <td>{ministryFinanceService.personLabel(c.personId)}</td>
                <td>
                  {ministryFinanceService.typeLabel(systemId, c.typeId)}
                </td>
                <td>{financeService.formatAmount(c.amount)}</td>
                <td>
                  <span className="badge">{c.status}</span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    );
  }

  return (
    <KitGate systemId={systemId} title="Contribution & finance">
      <div className="stack">
        <div className="panel">
          <PageHead
            title="Contribution & finance"
            subtitle="Claim → verify → ledger. Confirmed amounts post to the private ministry fund vault."
            actions={
              <>
                <Link to={`${base}/my-contributions`} className="btn">
                  Submit claim
                </Link>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() =>
                    downloadText(
                      `${systemId}-contributions.csv`,
                      ministryFinanceService.ledgerCsv(systemId),
                    )
                  }
                >
                  Export CSV
                </button>
              </>
            }
          />
          <div className="overview-strip" style={{ marginTop: '0.85rem' }}>
            <div className="overview-tile">
              <div className="label">Pending</div>
              <div className="value">{summary.pendingCount}</div>
            </div>
            <div className="overview-tile">
              <div className="label">Confirmed</div>
              <div className="value" style={{ fontSize: '1rem' }}>
                {financeService.formatAmount(summary.confirmed)}
              </div>
            </div>
            <div className="overview-tile">
              <div className="label">Fund</div>
              <div className="value" style={{ fontSize: '1rem' }}>
                {financeService.formatAmount(summary.fundBalance)}
              </div>
            </div>
          </div>
          {canVerifyFund && fundId && (
            <p className="muted" style={{ marginBottom: 0, marginTop: '0.65rem' }}>
              <Link to={`${base}/ledger`}>Open fund ledger →</Link>
            </p>
          )}
          {message && <p className="badge">{message}</p>}
        </div>

        {(canManage || canVerifyFund) && pending.length > 0 && (
          <div className="needs-me">
            <h3>Verification queue · {pending.length}</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {pending.map((c) => (
                  <tr key={c.id}>
                    <td>{ministryFinanceService.personLabel(c.personId)}</td>
                    <td>
                      {ministryFinanceService.typeLabel(systemId, c.typeId)}
                    </td>
                    <td>{financeService.formatAmount(c.amount)}</td>
                    <td>{c.paymentMethod}</td>
                    <td>
                      <div className="row">
                        <button
                          type="button"
                          className="btn"
                          onClick={async () => {
                            const r =
                              await ministryFinanceService.verifyContributionHybrid(
                                {
                                  systemId,
                                  contributionId: c.id,
                                  actorPersonId: account!.personId,
                                  decision: 'CONFIRMED',
                                },
                              );
                            setMessage(
                              r.ok ? 'Confirmed → fund' : r.reason ?? 'Failed',
                            );
                            refresh();
                          }}
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          className="btn ghost"
                          onClick={async () => {
                            const r =
                              await ministryFinanceService.verifyContributionHybrid(
                                {
                                  systemId,
                                  contributionId: c.id,
                                  actorPersonId: account!.personId,
                                  decision: 'DECLINED',
                                  note: 'Needs follow-up',
                                },
                              );
                            setMessage(
                              r.ok ? 'Declined' : r.reason ?? 'Failed',
                            );
                            refresh();
                          }}
                        >
                          Decline
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="panel">
          <StageBoard
            title={profile.label}
            activeId={stageFilter}
            onChange={(id) => setStageFilter(id as FundFlowStageId | 'all')}
            stages={[
              {
                id: 'all',
                label: 'All',
                count: all.length,
                children: contributionTable(all),
              },
              ...flowStages.map((s) => ({
                id: s.id,
                label: s.label,
                count: stageCounts[s.id] ?? 0,
                children: contributionTable(
                  all.filter(
                    (c) => stageForStatus(profile, c.status)?.id === s.id,
                  ),
                ),
              })),
            ]}
          />
        </div>

        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Kit modules</h3>
          <div className="row" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
            {(
              [
                ['donations', 'Donations'],
                ['sponsors', 'Sponsors'],
                ['fundraising', 'Fundraising'],
                ['accounting', 'Accounting'],
                ['assets', 'Assets'],
                ['reports', 'Reports'],
              ] as const
            )
              .filter(([key]) =>
                ministryOfficeMayAccessModule(systemId, boardOffice, key),
              )
              .map(([key, label]) => (
                <Link key={key} to={`${base}/${key}`}>
                  {label}
                </Link>
              ))}
          </div>
        </div>
      </div>
    </KitGate>
  );
}

export function MinistryMyContributionsPage({
  systemId,
}: {
  systemId: SystemId;
}) {
  const { account, canEnter, can } = useAuth();
  const { tick, refresh } = useTick();
  const base = basePathFor(systemId);
  const canUse = Boolean(account && canEnter(systemId));
  const canSeeFinance = can('MINISTRY_FINANCE', 'VIEW', systemId);
  const types = ministryFinanceService.contributionTypes(systemId, true);
  const methods = ministryFinanceService.paymentMethods(systemId, true);
  const drives = ministryFinanceService.listDrives(systemId, true);
  const [mine, setMine] = useState<MinistryContribution[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!account) {
        setMine([]);
        return;
      }
      const hybrid = await ministryFinanceService.listContributionsHybrid(
        systemId,
        { personId: account.personId, mine: true },
      );
      if (cancelled) return;
      setMine(hybrid.rows);
    })();
    return () => {
      cancelled = true;
    };
  }, [tick, systemId, account]);

  const [typeId, setTypeId] = useState(types[0]?.id ?? '');
  const [amount, setAmount] = useState('5000');
  const [method, setMethod] = useState<MinistryPaymentMethod>('MOMO');
  const [occurredOn, setOccurredOn] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [driveId, setDriveId] = useState(drives[0]?.id ?? '');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const [programId, setProgramId] = useState('');
  const [projectId, setProjectId] = useState('');
  const tagPrograms = missionService
    .listPrograms({ viewerSystemId: systemId })
    .filter((p) => p.status === 'ACTIVE' || p.status === 'SETUP');
  const tagProjects = missionService
    .listProjects({ viewerSystemId: systemId })
    .filter((p) => p.status === 'ACTIVE' || p.status === 'PLANNED');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!account) return;
    const r = await ministryFinanceService.submitContributionHybrid({
      systemId,
      personId: account.personId,
      typeId,
      amount: Number(amount),
      paymentMethod: method,
      occurredOn,
      driveId: driveId || undefined,
      note: note || undefined,
      programId: programId || undefined,
      projectId: projectId || undefined,
    });
    setMessage(r.ok ? 'Claim submitted' : r.reason ?? 'Failed');
    if (r.ok) {
      setNote('');
      setProgramId('');
      setProjectId('');
      refresh();
    }
  }

  if (!canUse) {
    return (
      <div className="panel">
        <h2>My contributions</h2>
        <p className="muted">
          Sign in with ministry access to submit your own claims.
        </p>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>My contributions</h2>
        <p className="muted">
          Submit a claim for the treasurer to verify.
          {canSeeFinance ? (
            <>
              {' '}
              <Link to={`${base}/finance`}>Finance overview →</Link>
            </>
          ) : null}
        </p>
        {message && <p className="badge">{message}</p>}
      </div>
      <form className="panel stack" onSubmit={onSubmit}>
        <div className="grid-2">
          <SelectField
            label="Type"
            value={typeId}
            onChange={(e) => setTypeId(e.target.value)}
            required
          >
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </SelectField>
          <TextField
            label="Amount (RWF)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
        <div className="grid-2">
          <SelectField
            label="Payment method"
            value={method}
            onChange={(e) =>
              setMethod(e.target.value as MinistryPaymentMethod)
            }
          >
            {methods.map((m) => (
              <option key={m.id} value={m.method}>
                {m.label}
              </option>
            ))}
          </SelectField>
          <TextField
            label="Date"
            type="date"
            value={occurredOn}
            onChange={(e) => setOccurredOn(e.target.value)}
            required
          />
        </div>
        <SelectField
          label="Drive"
          value={driveId}
          onChange={(e) => setDriveId(e.target.value)}
        >
          <option value="">— none —</option>
          {drives.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </SelectField>
        <TextField
          label="Note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="grid-2">
          <SelectField
            label="Apply to programme (optional)"
            value={programId}
            onChange={(e) => setProgramId(e.target.value)}
          >
            <option value="">Fund only</option>
            {tagPrograms.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Apply to project (optional)"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="">None</option>
            {tagProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </SelectField>
        </div>
        <button type="submit" className="btn">
          Submit claim
        </button>
      </form>
      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Your history</h3>
        {mine.length === 0 ? (
          <p className="muted">No claims yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {mine.map((c) => (
                <tr key={c.id}>
                  <td>{c.occurredOn}</td>
                  <td>
                    {ministryFinanceService.typeLabel(systemId, c.typeId)}
                  </td>
                  <td>{financeService.formatAmount(c.amount)}</td>
                  <td>
                    <span className="badge">{c.status}</span>
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

export function MinistryDonationsPage({ systemId }: { systemId: SystemId }) {
  const { account, can } = useAuth();
  const { tick, refresh } = useTick();
  const canManage = can('MINISTRY_FINANCE', 'MANAGE', systemId);
  const [donorName, setDonorName] = useState('');
  const [amount, setAmount] = useState('25000');
  const [occurredOn, setOccurredOn] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [method, setMethod] = useState<MinistryPaymentMethod>('BANK');
  const [message, setMessage] = useState('');
  const [programId, setProgramId] = useState('');
  const [projectId, setProjectId] = useState('');
  const rows = useMemo(
    () => ministryFinanceService.listDonations(systemId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, systemId],
  );
  const programs = missionService
    .listPrograms({ viewerSystemId: systemId })
    .filter((p) => p.status === 'ACTIVE' || p.status === 'SETUP');
  const projects = missionService
    .listProjects({ viewerSystemId: systemId })
    .filter(
      (p) =>
        p.status === 'ACTIVE' ||
        p.status === 'PLANNED' ||
        p.status === 'PENDING_APPROVAL',
    );

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!account || !canManage) return;
    const r = ministryFinanceService.recordDonation({
      systemId,
      actorPersonId: account.personId,
      donorName,
      source: 'External',
      donationType: 'General gift',
      amount: Number(amount),
      occurredOn,
      paymentMethod: method,
      programId: programId || undefined,
      projectId: projectId || undefined,
    });
    setMessage(
      r.ok
        ? r.reason
          ? `Donation posted (${r.reason})`
          : programId || projectId
            ? 'Donation posted + tagged on stewardship card'
            : 'Donation posted'
        : r.reason ?? 'Failed',
    );
    if (r.ok) {
      setDonorName('');
      setProgramId('');
      setProjectId('');
      refresh();
    }
  }

  return (
    <KitGate systemId={systemId} title="Donations">
      <div className="stack">
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>Donations</h2>
          <p className="muted">External gifts posted to the private fund.</p>
          {message && <p className="badge">{message}</p>}
        </div>
        {canManage && (
          <form className="panel stack" onSubmit={onSubmit}>
            <div className="grid-2">
              <TextField
                label="Donor"
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
                required
              />
              <TextField
                label="Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="grid-2">
              <TextField
                label="Date"
                type="date"
                value={occurredOn}
                onChange={(e) => setOccurredOn(e.target.value)}
              />
              <SelectField
                label="Method"
                value={method}
                onChange={(e) =>
                  setMethod(e.target.value as MinistryPaymentMethod)
                }
              >
                <option value="CASH">Cash</option>
                <option value="MOMO">MoMo</option>
                <option value="BANK">Bank</option>
              </SelectField>
            </div>
            <div className="grid-2">
              <SelectField
                label="Apply to programme (optional)"
                value={programId}
                onChange={(e) => setProgramId(e.target.value)}
              >
                <option value="">Fund only</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Apply to project (optional)"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              >
                <option value="">None</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </SelectField>
            </div>
            <button type="submit" className="btn">
              Record donation
            </button>
          </form>
        )}
        <div className="panel">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Donor</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Tagged</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id}>
                  <td>{d.occurredOn}</td>
                  <td>{d.donorName}</td>
                  <td>{financeService.formatAmount(d.amount)}</td>
                  <td>{d.paymentMethod}</td>
                  <td className="muted">
                    {d.projectId
                      ? missionService.getProject(d.projectId)?.name ??
                        d.projectId
                      : d.programId
                        ? missionService.getProgram(d.programId)?.name ??
                          d.programId
                        : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="muted">No donations yet.</p>}
        </div>
      </div>
    </KitGate>
  );
}

export function MinistrySponsorsPage({ systemId }: { systemId: SystemId }) {
  const sponsors = ministryFinanceService.listSponsors(systemId);
  return (
    <KitGate systemId={systemId} title="Sponsors">
      <div className="panel stack">
        <h2 style={{ marginTop: 0 }}>Sponsors</h2>
        <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
          {sponsors.map((s) => (
            <li key={s.id}>
              <strong>{s.name}</strong> · {s.sponsorType} · {s.status}
            </li>
          ))}
        </ul>
      </div>
    </KitGate>
  );
}

export function MinistryFundraisingPage({ systemId }: { systemId: SystemId }) {
  const { account, can } = useAuth();
  const { tick, refresh } = useTick();
  const canManage = can('MINISTRY_FINANCE', 'MANAGE', systemId);
  const campaigns = useMemo(
    () => ministryFinanceService.listCampaigns(systemId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, systemId],
  );
  const [campaignId, setCampaignId] = useState(campaigns[0]?.id ?? '');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('10000');
  const [message, setMessage] = useState('');

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!account || !canManage) return;
    const r = ministryFinanceService.recordCampaignGift({
      systemId,
      campaignId,
      contributorName: name,
      amount: Number(amount),
      occurredOn: new Date().toISOString().slice(0, 10),
      paymentMethod: 'CASH',
      actorPersonId: account.personId,
    });
    setMessage(r.ok ? 'Gift recorded' : r.reason ?? 'Failed');
    if (r.ok) {
      setName('');
      refresh();
    }
  }

  return (
    <KitGate systemId={systemId} title="Fundraising">
      <div className="stack">
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>Fundraising campaigns</h2>
          {campaigns.map((c) => {
            const gifts = ministryFinanceService.listCampaignGifts(
              systemId,
              c.id,
            );
            const raised = gifts.reduce((s, g) => s + g.amount, 0);
            return (
              <div key={c.id} style={{ marginBottom: '0.75rem' }}>
                <strong>{c.name}</strong>
                <div className="muted">
                  Goal {financeService.formatAmount(c.goalAmount)} · raised{' '}
                  {financeService.formatAmount(raised)} · {c.status}
                </div>
              </div>
            );
          })}
          {message && <p className="badge">{message}</p>}
        </div>
        {canManage && campaigns.length > 0 && (
          <form className="panel stack" onSubmit={onSubmit}>
            <h3 style={{ margin: 0 }}>Record campaign gift</h3>
            <SelectField
              label="Campaign"
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
            >
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </SelectField>
            <div className="grid-2">
              <TextField
                label="Contributor"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <TextField
                label="Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn">
              Save gift
            </button>
          </form>
        )}
      </div>
    </KitGate>
  );
}

export function MinistryAccountingPage({ systemId }: { systemId: SystemId }) {
  const { account, can } = useAuth();
  const { tick, refresh } = useTick();
  const canManage = can('MINISTRY_FINANCE', 'MANAGE', systemId);
  const fundId = ministryFinanceService.fundIdFor(systemId);
  const canPost =
    Boolean(account && fundId) &&
    financeService.authorizeFund(account!.personId, fundId!, 'MANAGE').allowed;

  const budgets = ministryFinanceService.listBudgets(systemId);
  const income = useMemo(
    () => ministryFinanceService.listIncome(systemId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, systemId],
  );
  const expenses = useMemo(
    () => ministryFinanceService.listExpenses(systemId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, systemId],
  );

  const [message, setMessage] = useState('');
  const [cat, setCat] = useState('Programs');
  const [amount, setAmount] = useState('15000');
  const [desc, setDesc] = useState('');
  const [occurredOn, setOccurredOn] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [incCat, setIncCat] = useState('Other');
  const [incAmount, setIncAmount] = useState('10000');
  const [incDesc, setIncDesc] = useState('');
  const [incDate, setIncDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [incBudgetId, setIncBudgetId] = useState(budgets[0]?.id ?? '');

  return (
    <KitGate systemId={systemId} title="Accounting">
      <div className="stack">
        <div className="panel">
          <PageHead
            title="Budgets & accounting"
            subtitle="Planned budget lines, other income into the fund, and expenses that need treasurer approval."
          />
          {message && <p className="badge">{message}</p>}
          {budgets.length === 0 ? (
            <p className="muted">No budgets yet.</p>
          ) : (
            budgets.map((b) => {
              const totals = ministryFinanceService.budgetPlannedTotals(
                systemId,
                b.id,
              );
              return (
                <div key={b.id} style={{ marginBottom: '0.85rem' }}>
                  <strong>
                    {b.name} ({b.kind})
                  </strong>
                  <div className="row" style={{ flexWrap: 'wrap' }}>
                    <span className="badge">
                      Planned in{' '}
                      {financeService.formatAmount(totals.plannedIncome)}
                    </span>
                    <span className="badge">
                      Planned out{' '}
                      {financeService.formatAmount(totals.plannedExpense)}
                    </span>
                    <span className="badge">{b.status}</span>
                  </div>
                  <ul style={{ margin: '0.35rem 0 0', paddingLeft: '1.1rem' }}>
                    {ministryFinanceService
                      .listBudgetLines(systemId, b.id)
                      .map((l) => (
                        <li key={l.id}>
                          {l.side} · {l.category} —{' '}
                          {financeService.formatAmount(l.plannedAmount)}
                        </li>
                      ))}
                  </ul>
                </div>
              );
            })
          )}
        </div>

        <div className="grid-2">
          <div className="panel">
            <h3 style={{ marginTop: 0 }}>Income</h3>
            {income.length === 0 ? (
              <p className="muted">No other income yet.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                {income.map((r) => (
                  <li key={r.id}>
                    {r.occurredOn} · {r.category} —{' '}
                    {financeService.formatAmount(r.amount)}
                    <div className="muted">{r.description}</div>
                  </li>
                ))}
              </ul>
            )}
            {canManage && (
              <form
                className="stack"
                style={{ marginTop: '0.85rem' }}
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!account) return;
                  const r = ministryFinanceService.recordIncome({
                    systemId,
                    actorPersonId: account.personId,
                    category: incCat,
                    amount: Number(incAmount),
                    occurredOn: incDate,
                    description: incDesc || incCat,
                    budgetId: incBudgetId || undefined,
                  });
                  setMessage(
                    r.ok ? 'Income posted to fund' : r.reason ?? 'Failed',
                  );
                  if (r.ok) {
                    setIncDesc('');
                    refresh();
                  }
                }}
              >
                <h4 style={{ margin: 0 }}>Record income</h4>
                {!canPost && (
                  <p className="muted" style={{ margin: 0 }}>
                    Needs fund vault MANAGE grant to post.
                  </p>
                )}
                <div className="grid-2">
                  <TextField
                    label="Category"
                    value={incCat}
                    onChange={(e) => setIncCat(e.target.value)}
                  />
                  <TextField
                    label="Amount"
                    type="number"
                    min={1}
                    value={incAmount}
                    onChange={(e) => setIncAmount(e.target.value)}
                  />
                </div>
                <div className="grid-2">
                  <TextField
                    label="Date"
                    type="date"
                    value={incDate}
                    onChange={(e) => setIncDate(e.target.value)}
                  />
                  <SelectField
                    label="Budget (optional)"
                    value={incBudgetId}
                    onChange={(e) => setIncBudgetId(e.target.value)}
                  >
                    <option value="">None</option>
                    {budgets.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </SelectField>
                </div>
                <TextField
                  label="Description"
                  value={incDesc}
                  onChange={(e) => setIncDesc(e.target.value)}
                />
                <button type="submit" className="btn" disabled={!canPost}>
                  Post income to fund
                </button>
              </form>
            )}
          </div>

          <div className="panel">
            <h3 style={{ marginTop: 0 }}>Expenses</h3>
            {expenses.length === 0 ? (
              <p className="muted">None yet.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Item</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((exp) => (
                    <tr key={exp.id}>
                      <td>{exp.occurredOn}</td>
                      <td>
                        {exp.category}
                        <div className="muted">{exp.description}</div>
                      </td>
                      <td>{financeService.formatAmount(exp.amount)}</td>
                      <td>
                        <span className="badge">{exp.status}</span>
                      </td>
                      <td>
                        {canManage && exp.status === 'PENDING' && (
                          <div className="row">
                            <button
                              type="button"
                              className="btn"
                              disabled={!canPost}
                              onClick={() => {
                                if (!account) return;
                                const r = ministryFinanceService.approveExpense(
                                  systemId,
                                  exp.id,
                                  account.personId,
                                  true,
                                );
                                setMessage(
                                  r.ok
                                    ? 'Approved → fund'
                                    : r.reason ?? 'Failed',
                                );
                                refresh();
                              }}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="btn ghost"
                              onClick={() => {
                                if (!account) return;
                                ministryFinanceService.approveExpense(
                                  systemId,
                                  exp.id,
                                  account.personId,
                                  false,
                                );
                                setMessage('Expense rejected');
                                refresh();
                              }}
                            >
                              Reject
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

        {canManage && (
          <form
            className="panel stack"
            onSubmit={(e) => {
              e.preventDefault();
              if (!account) return;
              const r = ministryFinanceService.submitExpense({
                systemId,
                actorPersonId: account.personId,
                category: cat,
                amount: Number(amount),
                occurredOn,
                description: desc || cat,
              });
              setMessage(
                r.ok ? 'Expense submitted for approval' : r.reason ?? 'Failed',
              );
              if (r.ok) {
                setDesc('');
                refresh();
              }
            }}
          >
            <h3 style={{ margin: 0 }}>Submit expense</h3>
            <div className="grid-2">
              <TextField
                label="Category"
                value={cat}
                onChange={(e) => setCat(e.target.value)}
              />
              <TextField
                label="Amount"
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="grid-2">
              <TextField
                label="Date"
                type="date"
                value={occurredOn}
                onChange={(e) => setOccurredOn(e.target.value)}
              />
              <TextField
                label="Description"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />
            </div>
            <button type="submit" className="btn">
              Submit for approval
            </button>
          </form>
        )}
      </div>
    </KitGate>
  );
}

export function MinistryAssetsPage({ systemId }: { systemId: SystemId }) {
  const { can } = useAuth();
  const { tick, refresh } = useTick();
  const canManage = can('MINISTRY_FINANCE', 'MANAGE', systemId);
  const assets = useMemo(
    () => ministryFinanceService.listAssets(systemId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, systemId],
  );
  const liabilities = useMemo(
    () => ministryFinanceService.listLiabilities(systemId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, systemId],
  );
  const assignees = ministryFinanceService.assigneesFor(systemId);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('Equipment');
  const [value, setValue] = useState('100000');
  const [acquiredOn, setAcquiredOn] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [assignTo, setAssignTo] = useState('');
  const [liabName, setLiabName] = useState('');
  const [liabAmount, setLiabAmount] = useState('25000');
  const [liabDue, setLiabDue] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [liabNotes, setLiabNotes] = useState('');
  const [message, setMessage] = useState('');

  const assetTotal = assets
    .filter((a) => a.status === 'ACTIVE')
    .reduce((s, a) => s + a.value, 0);
  const liabTotal = liabilities
    .filter((l) => l.status === 'OPEN')
    .reduce((s, l) => s + l.amount, 0);

  return (
    <KitGate systemId={systemId} title="Assets & liabilities" allowOversight>
      <div className="stack">
        <div className="panel">
          <PageHead
            title="Assets & liabilities"
            subtitle="Track ministry property and open obligations."
          />
          <div className="overview-strip" style={{ marginTop: '0.75rem' }}>
            <div className="overview-tile">
              <div className="label">Active assets</div>
              <div className="value" style={{ fontSize: '1rem' }}>
                {financeService.formatAmount(assetTotal)}
              </div>
            </div>
            <div className="overview-tile">
              <div className="label">Open liabilities</div>
              <div className="value" style={{ fontSize: '1rem' }}>
                {financeService.formatAmount(liabTotal)}
              </div>
            </div>
            <div className="overview-tile">
              <div className="label">Net</div>
              <div className="value" style={{ fontSize: '1rem' }}>
                {financeService.formatAmount(assetTotal - liabTotal)}
              </div>
            </div>
          </div>
          {message && <p className="badge">{message}</p>}
        </div>

        <div className="grid-2">
          <div className="panel">
            <h3 style={{ marginTop: 0 }}>Assets</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Value</th>
                  <th>Assigned</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {assets.map((a) => (
                  <tr key={a.id}>
                    <td>{a.name}</td>
                    <td>{a.category}</td>
                    <td>{financeService.formatAmount(a.value)}</td>
                    <td className="muted">
                      {a.assignedToPersonId
                        ? ministryFinanceService.personLabel(
                            a.assignedToPersonId,
                          )
                        : '—'}
                    </td>
                    <td>
                      <span className="badge">{a.status}</span>
                    </td>
                    <td>
                      {canManage && a.status === 'ACTIVE' && (
                        <div className="row" style={{ flexWrap: 'wrap' }}>
                          <select
                            aria-label={`Assign ${a.name}`}
                            value={a.assignedToPersonId ?? ''}
                            onChange={(e) => {
                              const r = ministryFinanceService.assignAsset(
                                systemId,
                                a.id,
                                e.target.value || undefined,
                              );
                              setMessage(
                                r.ok
                                  ? 'Assignment updated'
                                  : r.reason ?? 'Failed',
                              );
                              refresh();
                            }}
                          >
                            <option value="">Unassigned</option>
                            {assignees.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.label}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="btn ghost"
                            onClick={() => {
                              const r = ministryFinanceService.disposeAsset(
                                systemId,
                                a.id,
                              );
                              setMessage(
                                r.ok ? 'Asset disposed' : r.reason ?? 'Failed',
                              );
                              refresh();
                            }}
                          >
                            Dispose
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {assets.length === 0 && <p className="muted">No assets yet.</p>}
            {canManage && (
              <form
                className="stack"
                style={{ marginTop: '0.85rem' }}
                onSubmit={(e) => {
                  e.preventDefault();
                  const r = ministryFinanceService.addAsset({
                    systemId,
                    name,
                    category,
                    value: Number(value),
                    acquiredOn,
                    assignedToPersonId: assignTo || undefined,
                  });
                  setMessage(r.ok ? 'Asset added' : r.reason ?? 'Failed');
                  if (r.ok) {
                    setName('');
                    setAssignTo('');
                    refresh();
                  }
                }}
              >
                <h4 style={{ margin: 0 }}>Add asset</h4>
                <div className="grid-2">
                  <TextField
                    label="Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                  <TextField
                    label="Category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  />
                </div>
                <div className="grid-2">
                  <TextField
                    label="Value"
                    type="number"
                    min={0}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                  />
                  <TextField
                    label="Acquired"
                    type="date"
                    value={acquiredOn}
                    onChange={(e) => setAcquiredOn(e.target.value)}
                  />
                </div>
                <SelectField
                  label="Assign to (optional)"
                  value={assignTo}
                  onChange={(e) => setAssignTo(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {assignees.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </SelectField>
                <button type="submit" className="btn">
                  Add asset
                </button>
              </form>
            )}
          </div>

          <div className="panel">
            <h3 style={{ marginTop: 0 }}>Liabilities</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Amount</th>
                  <th>Due</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {liabilities.map((l) => (
                  <tr key={l.id}>
                    <td>
                      {l.name}
                      {l.notes ? (
                        <div className="muted">{l.notes}</div>
                      ) : null}
                    </td>
                    <td>{financeService.formatAmount(l.amount)}</td>
                    <td>{l.dueDate}</td>
                    <td>
                      <span className="badge">{l.status}</span>
                    </td>
                    <td>
                      {canManage && l.status === 'OPEN' && (
                        <button
                          type="button"
                          className="btn ghost"
                          onClick={() => {
                            const r = ministryFinanceService.closeLiability(
                              systemId,
                              l.id,
                            );
                            setMessage(
                              r.ok ? 'Liability closed' : r.reason ?? 'Failed',
                            );
                            refresh();
                          }}
                        >
                          Close
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {liabilities.length === 0 && (
              <p className="muted">No liabilities yet.</p>
            )}
            {canManage && (
              <form
                className="stack"
                style={{ marginTop: '0.85rem' }}
                onSubmit={(e) => {
                  e.preventDefault();
                  const r = ministryFinanceService.addLiability({
                    systemId,
                    name: liabName,
                    amount: Number(liabAmount),
                    dueDate: liabDue,
                    notes: liabNotes || undefined,
                  });
                  setMessage(r.ok ? 'Liability added' : r.reason ?? 'Failed');
                  if (r.ok) {
                    setLiabName('');
                    setLiabNotes('');
                    refresh();
                  }
                }}
              >
                <h4 style={{ margin: 0 }}>Add liability</h4>
                <TextField
                  label="Name"
                  value={liabName}
                  onChange={(e) => setLiabName(e.target.value)}
                  required
                />
                <div className="grid-2">
                  <TextField
                    label="Amount"
                    type="number"
                    min={1}
                    value={liabAmount}
                    onChange={(e) => setLiabAmount(e.target.value)}
                  />
                  <TextField
                    label="Due"
                    type="date"
                    value={liabDue}
                    onChange={(e) => setLiabDue(e.target.value)}
                  />
                </div>
                <TextField
                  label="Notes"
                  value={liabNotes}
                  onChange={(e) => setLiabNotes(e.target.value)}
                />
                <button type="submit" className="btn">
                  Add liability
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </KitGate>
  );
}

export function MinistryFinanceReportsPage({
  systemId,
}: {
  systemId: SystemId;
}) {
  const { account, positions, can } = useAuth();
  const { tick, refresh } = useTick();
  const base = basePathFor(systemId);
  const oversight =
    !!account &&
    resolvePeerEntry(account.personId, systemId, positions).kind ===
      'oversight';
  const boardOffice = account
    ? resolveMinistryBoardOffice(account.personId, systemId, positions)
    : 'MEMBER';
  const canPublish =
    !!account &&
    (boardOffice === 'PRESIDENT' || boardOffice === 'VP') &&
    can('MINISTRY_FINANCE', 'VIEW', systemId);

  const [packTitle, setPackTitle] = useState('');
  const [packSummary, setPackSummary] = useState('');
  const [packMsg, setPackMsg] = useState('');

  const report = useMemo(
    () => ministryFinanceService.financeReport(systemId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, systemId],
  );

  if (oversight) {
    const packs = oversightReportsService.listSharedPacks(systemId);
    const assistance =
      oversightReportsService.listAssistanceReports(systemId);
    return (
      <div className="stack">
        <div className="panel">
          <p className="label" style={{ margin: 0 }}>
            Itorero oversight
          </p>
          <h2 style={{ margin: '0.35rem 0 0' }}>Shared & assistance reports</h2>
          <p className="muted" style={{ margin: '0.35rem 0 0' }}>
            Ministry ledgers stay closed. Packs from the president/vice and
            church-assistance accountability appear here.
          </p>
        </div>

        <div className="panel stack">
          <h3 style={{ margin: 0 }}>Published packs</h3>
          {packs.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>
              Nothing published yet for this system.
            </p>
          ) : (
            packs.map((p) => (
              <div key={p.id} style={{ padding: '0.5rem 0' }}>
                <strong>{p.title}</strong>
                <p className="muted" style={{ margin: '0.25rem 0 0' }}>
                  {p.summary}
                </p>
                {p.highlights && p.highlights.length > 0 && (
                  <ul style={{ margin: '0.35rem 0 0', paddingLeft: '1.1rem' }}>
                    {p.highlights.map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))
          )}
        </div>

        <div className="panel stack">
          <h3 style={{ margin: 0 }}>Church financial assistance</h3>
          {assistance.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>
              No church-funded assistance reports for this system.
            </p>
          ) : (
            assistance.map((r) => (
              <div key={r.id} style={{ padding: '0.5rem 0' }}>
                <strong>
                  {r.purpose} · {r.amountRwf.toLocaleString()} RWF
                </strong>
                <p className="muted" style={{ margin: '0.25rem 0 0' }}>
                  Assisted {r.assistedOn}
                </p>
                <p style={{ margin: '0.35rem 0 0' }}>
                  <span className="label">Where / how</span>
                  <br />
                  {r.whereSpent} — {r.howSpent}
                </p>
                <p style={{ margin: '0.35rem 0 0' }}>
                  <span className="label">Operations</span>
                  <br />
                  {r.operations}
                </p>
                <p style={{ margin: '0.35rem 0 0' }}>
                  <span className="label">Results</span>
                  <br />
                  {r.results}
                </p>
                <p style={{ margin: '0.35rem 0 0' }}>
                  <span className="label">Impact</span>
                  <br />
                  {r.impact}
                </p>
              </div>
            ))
          )}
        </div>

        <Link className="btn ghost" to={`${base}/assets`}>
          Open assets register
        </Link>
      </div>
    );
  }

  const rows: Array<[string, number]> = [
    ['Contributions confirmed', report.contributionsConfirmed],
    ['Contributions pending', report.contributionsPending],
    ['Donations', report.donations],
    ['Sponsorships', report.sponsorships],
    ['Campaign raised', report.campaignRaised],
    ['Other income', report.otherIncome],
    ['Expenses approved', report.expensesApproved],
    ['Expenses pending', report.expensesPending],
    ['Assets', report.assets],
    ['Liabilities (open)', report.liabilities],
    ['Fund balance', report.fundBalance],
    ['Net assets', report.netAssets],
  ];

  return (
    <KitGate systemId={systemId} title="Finance reports">
      <div className="stack">
        <div className="panel">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ margin: 0 }}>Financial reports</h2>
              <p className="muted" style={{ margin: '0.35rem 0 0' }}>
                Summary across contributions, donations, campaigns, accounting,
                and assets
              </p>
            </div>
            <div className="row">
              <button
                type="button"
                className="btn"
                onClick={() =>
                  downloadText(
                    `${systemId}-finance-report.csv`,
                    ministryFinanceService.financeReportCsv(systemId),
                  )
                }
              >
                Export CSV
              </button>
              <button
                type="button"
                className="btn secondary"
                onClick={() => window.print()}
              >
                Print / PDF
              </button>
            </div>
          </div>
          <table className="table" style={{ marginTop: '0.85rem' }}>
            <thead>
              <tr>
                <th>Metric</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, amount]) => (
                <tr key={label}>
                  <td>{label}</td>
                  <td>{financeService.formatAmount(amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted">
            Open follow-ups: {report.openFollowUps}
            {report.fundId ? (
              <>
                {' '}
                ·{' '}
                <Link to={`${base}/ledger`}>
                  Open fund ledger →
                </Link>
              </>
            ) : null}
          </p>
          <Link to={`${base}/finance`}>← Contribution finance</Link>
        </div>
        {canPublish && account && (
          <div className="panel stack">
            <h3 style={{ margin: 0 }}>Publish pack to Itorero leaders</h3>
            <p className="muted" style={{ margin: 0 }}>
              Does not open the ledger — only a summary high leaders can see in
              oversight.
            </p>
            <TextField
              label="Title"
              name="packTitle"
              id="packTitle"
              value={packTitle}
              onChange={(e) => setPackTitle(e.target.value)}
            />
            <TextField
              label="Summary"
              name="packSummary"
              id="packSummary"
              value={packSummary}
              onChange={(e) => setPackSummary(e.target.value)}
            />
            {packMsg && <p className="muted">{packMsg}</p>}
            <button
              type="button"
              className="btn"
              onClick={() => {
                if (!packTitle.trim() || !packSummary.trim()) {
                  setPackMsg('Title and summary required.');
                  return;
                }
                oversightReportsService.publishPack({
                  systemId,
                  title: packTitle,
                  summary: packSummary,
                  publishedByPersonId: account.personId,
                });
                setPackTitle('');
                setPackSummary('');
                setPackMsg('Published for Itorero oversight.');
                refresh();
              }}
            >
              Publish to oversight
            </button>
          </div>
        )}
      </div>
    </KitGate>
  );
}
