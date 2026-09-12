import { type FormEvent, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { ForbiddenState } from '../../components/ui/StatusPill';
import { FilterBar, PageHead } from '../../components/ui/FilterBar';
import type {
  MinistryContribution,
  MinistryPaymentMethod,
  SystemId,
} from '../../domain/types';
import { getPeerCore } from '../../ministry/peerCoreSystems';
import { financeService, ministryFinanceService, missionService } from '../../services';

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
  const peer = getPeerCore(systemId);
  return peer ? `/systems/${peer.slug}` : '/';
}

function KitGate({
  systemId,
  children,
  title,
}: {
  systemId: SystemId;
  children: ReactNode;
  title: string;
}) {
  const { account, can } = useAuth();
  const canView = can('MINISTRY_FINANCE', 'VIEW', systemId);
  if (!account || !canView) {
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
  const { account, can } = useAuth();
  const { tick, refresh } = useTick();
  const canManage = can('MINISTRY_FINANCE', 'MANAGE', systemId);
  const base = basePathFor(systemId);
  const fundIdSeed = ministryFinanceService.fundIdFor(systemId);
  const [statusFilter, setStatusFilter] = useState('all');
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
  const filtered = useMemo(() => {
    if (statusFilter === 'pending') return pending;
    if (statusFilter === 'confirmed') {
      return all.filter(
        (c) => c.status === 'CONFIRMED' || c.status === 'PARTIAL',
      );
    }
    if (statusFilter === 'declined') {
      return all.filter((c) => c.status === 'DECLINED');
    }
    return all;
  }, [all, pending, statusFilter]);

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
              <Link to={`/systems/finance/funds/${fundId}`}>
                Open fund ledger →
              </Link>
            </p>
          )}
          <div style={{ marginTop: '0.75rem' }}>
            <FilterBar
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'all', label: 'All', count: all.length },
                { value: 'pending', label: 'Pending', count: pending.length },
                {
                  value: 'confirmed',
                  label: 'Confirmed',
                  count: all.filter(
                    (c) => c.status === 'CONFIRMED' || c.status === 'PARTIAL',
                  ).length,
                },
                {
                  value: 'declined',
                  label: 'Declined',
                  count: all.filter((c) => c.status === 'DECLINED').length,
                },
              ]}
            />
          </div>
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
              {filtered.map((c) => (
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
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Kit modules</h3>
          <div className="row" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
            <Link to={`${base}/donations`}>Donations</Link>
            <Link to={`${base}/sponsors`}>Sponsors</Link>
            <Link to={`${base}/fundraising`}>Fundraising</Link>
            <Link to={`${base}/accounting`}>Accounting</Link>
            <Link to={`${base}/assets`}>Assets</Link>
            <Link to={`${base}/reports`}>Reports</Link>
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
          <div className="field">
            <label>Type</label>
            <select
              value={typeId}
              onChange={(e) => setTypeId(e.target.value)}
              required
            >
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Amount (RWF)</label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label>Payment method</label>
            <select
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
            </select>
          </div>
          <div className="field">
            <label>Date</label>
            <input
              type="date"
              value={occurredOn}
              onChange={(e) => setOccurredOn(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="field">
          <label>Drive</label>
          <select
            value={driveId}
            onChange={(e) => setDriveId(e.target.value)}
          >
            <option value="">— none —</option>
            {drives.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Note</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="grid-2">
          <div className="field">
            <label>Apply to programme (optional)</label>
            <select
              value={programId}
              onChange={(e) => setProgramId(e.target.value)}
            >
              <option value="">Fund only</option>
              {tagPrograms.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Apply to project (optional)</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="">None</option>
              {tagProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
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
              <div className="field">
                <label>Donor</label>
                <input
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label>Amount</label>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="grid-2">
              <div className="field">
                <label>Date</label>
                <input
                  type="date"
                  value={occurredOn}
                  onChange={(e) => setOccurredOn(e.target.value)}
                />
              </div>
              <div className="field">
                <label>Method</label>
                <select
                  value={method}
                  onChange={(e) =>
                    setMethod(e.target.value as MinistryPaymentMethod)
                  }
                >
                  <option value="CASH">Cash</option>
                  <option value="MOMO">MoMo</option>
                  <option value="BANK">Bank</option>
                </select>
              </div>
            </div>
            <div className="grid-2">
              <div className="field">
                <label>Apply to programme (optional)</label>
                <select
                  value={programId}
                  onChange={(e) => setProgramId(e.target.value)}
                >
                  <option value="">Fund only</option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Apply to project (optional)</label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                >
                  <option value="">None</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
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
            <div className="field">
              <label>Campaign</label>
              <select
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
              >
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid-2">
              <div className="field">
                <label>Contributor</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label>Amount</label>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
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
  const budgets = ministryFinanceService.listBudgets(systemId);
  const expenses = useMemo(
    () => ministryFinanceService.listExpenses(systemId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, systemId],
  );
  const [category, setCategory] = useState('Programs');
  const [amount, setAmount] = useState('15000');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState('');

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!account || !canManage) return;
    const r = ministryFinanceService.recordExpense({
      systemId,
      actorPersonId: account.personId,
      category,
      amount: Number(amount),
      occurredOn: new Date().toISOString().slice(0, 10),
      description,
    });
    setMessage(r.ok ? 'Expense posted' : r.reason ?? 'Failed');
    if (r.ok) {
      setDescription('');
      refresh();
    }
  }

  return (
    <KitGate systemId={systemId} title="Accounting">
      <div className="stack">
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>Budgets</h2>
          {budgets.map((b) => (
            <div key={b.id} style={{ marginBottom: '0.75rem' }}>
              <strong>{b.name}</strong> · {b.status}
              <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.1rem' }}>
                {ministryFinanceService
                  .listBudgetLines(systemId, b.id)
                  .map((l) => (
                    <li key={l.id}>
                      {l.side} · {l.category} ·{' '}
                      {financeService.formatAmount(l.plannedAmount)}
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
        {canManage && (
          <form className="panel stack" onSubmit={onSubmit}>
            <h3 style={{ margin: 0 }}>Post expense</h3>
            {message && <p className="badge">{message}</p>}
            <div className="grid-2">
              <div className="field">
                <label>Category</label>
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </div>
              <div className="field">
                <label>Amount</label>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>
            <div className="field">
              <label>Description</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn">
              Post to fund
            </button>
          </form>
        )}
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Expenses</h3>
          {expenses.length === 0 ? (
            <p className="muted">None yet.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id}>
                    <td>{e.occurredOn}</td>
                    <td>{e.category}</td>
                    <td>{financeService.formatAmount(e.amount)}</td>
                    <td>{e.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
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
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Equipment');
  const [value, setValue] = useState('100000');

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canManage) return;
    ministryFinanceService.addAsset({
      systemId,
      name,
      category,
      value: Number(value),
      acquiredOn: new Date().toISOString().slice(0, 10),
    });
    setName('');
    refresh();
  }

  return (
    <KitGate systemId={systemId} title="Assets">
      <div className="stack">
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>Assets</h2>
          {assets.length === 0 ? (
            <p className="muted">No assets registered.</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
              {assets.map((a) => (
                <li key={a.id}>
                  {a.name} · {a.category} ·{' '}
                  {financeService.formatAmount(a.value)}
                </li>
              ))}
            </ul>
          )}
        </div>
        {canManage && (
          <form className="panel stack" onSubmit={onSubmit}>
            <h3 style={{ margin: 0 }}>Register asset</h3>
            <div className="grid-2">
              <div className="field">
                <label>Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label>Value</label>
                <input
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
              </div>
            </div>
            <div className="field">
              <label>Category</label>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>
            <button type="submit" className="btn">
              Add asset
            </button>
          </form>
        )}
      </div>
    </KitGate>
  );
}

export function MinistryFinanceReportsPage({
  systemId,
}: {
  systemId: SystemId;
}) {
  const r = ministryFinanceService.reports(systemId);
  return (
    <KitGate systemId={systemId} title="Finance reports">
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Finance reports</h2>
        <div className="overview-strip">
          <div className="overview-tile">
            <div className="label">Fund balance</div>
            <div className="value" style={{ fontSize: '1rem' }}>
              {financeService.formatAmount(r.fundBalance)}
            </div>
          </div>
          <div className="overview-tile">
            <div className="label">Confirmed gifts</div>
            <div className="value" style={{ fontSize: '1rem' }}>
              {financeService.formatAmount(r.confirmed)}
            </div>
          </div>
          <div className="overview-tile">
            <div className="label">Donations</div>
            <div className="value" style={{ fontSize: '1rem' }}>
              {financeService.formatAmount(r.donationTotal)}
            </div>
          </div>
          <div className="overview-tile">
            <div className="label">Expenses</div>
            <div className="value" style={{ fontSize: '1rem' }}>
              {financeService.formatAmount(r.expenseTotal)}
            </div>
          </div>
        </div>
        <p className="muted" style={{ marginBottom: 0 }}>
          Open follow-ups: {r.openFollowUps} · Assets:{' '}
          {financeService.formatAmount(r.assetTotal)}
        </p>
      </div>
    </KitGate>
  );
}
