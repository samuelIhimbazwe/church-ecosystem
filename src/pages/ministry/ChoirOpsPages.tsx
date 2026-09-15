import { type FormEvent, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { SelectField, TextField } from '../../components/ui/Field';
import { useAuth } from '../../auth/AuthContext';
import { fundIdForChoirOrgUnit } from '../../domain/choirCatalog';
import { choirOfficeIsTreasurer } from '../../domain/choirAccess';
import { resolvePeerEntry } from '../../domain/oversightAccess';
import type { ChoirPaymentMethod } from '../../domain/types';
import { choirService, financeService } from '../../services';
import { useActiveChoir } from './useActiveChoir';

const SYS = 'sys-choir' as const;

function useChoirFundGrant() {
  const { account } = useAuth();
  const { activeChoirOrgUnitId } = useActiveChoir();
  const choirFundId = activeChoirOrgUnitId
    ? fundIdForChoirOrgUnit(activeChoirOrgUnitId)
    : null;
  const canPost =
    account && choirFundId
      ? financeService.authorizeFund(account.personId, choirFundId, 'MANAGE')
          .allowed
      : false;
  return { choirFundId, canPost };
}

/** Treasurer-only finance suite (donations, accounting, assets, …). */
function useChoirTreasurerAccess() {
  const { account, can } = useAuth();
  const office = account ? choirService.officeFor(account.personId) : null;
  const isTreasurer = choirOfficeIsTreasurer(office);
  return {
    account,
    office,
    canView: isTreasurer && can('CHOIR_FINANCE', 'VIEW', SYS),
    canManage: isTreasurer && can('CHOIR_FINANCE', 'MANAGE', SYS),
  };
}

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

export function ChoirDonationsPage() {
  const { account, canView, canManage } = useChoirTreasurerAccess();
  const { canPost } = useChoirFundGrant();
  const { tick, refresh } = useTick();

  const [donorName, setDonorName] = useState('');
  const [source, setSource] = useState('Community');
  const [donationType, setDonationType] = useState('General gift');
  const [amount, setAmount] = useState('25000');
  const [occurredOn, setOccurredOn] = useState('2026-09-08');
  const [method, setMethod] = useState<ChoirPaymentMethod>('BANK');
  const [evidence, setEvidence] = useState('');
  const [message, setMessage] = useState('');

  const rows = useMemo(
    () => choirService.listDonations(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick],
  );

  if (!account || !canView) {
    return (
      <div className="panel">
        <h2>Donations</h2>
        <p className="muted">No access</p>
      </div>
    );
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canManage || !canPost) {
      setMessage('Need Choir finance manage + active choir fund grant');
      return;
    }
    const r = choirService.recordDonation({
      actorPersonId: account!.personId,
      donorName,
      source,
      donationType,
      amount: Number(amount),
      occurredOn,
      paymentMethod: method,
      evidenceNote: evidence || undefined,
    });
    setMessage(r.ok ? 'Donation recorded → Choir fund' : r.reason ?? 'Failed');
    if (r.ok) {
      setDonorName('');
      setEvidence('');
      refresh();
    }
  }

  return (
    <div className="stack">
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Donation register</h2>
        <p className="muted">External gifts posted to private Choir fund</p>
        {message && <p className="muted">{message}</p>}
      </div>

      {canManage && (
        <div className="panel">
          <h3>Record donation</h3>
          <form className="stack" onSubmit={onSubmit}>
            <TextField
              label="Donor"
              name="donor-name"
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
              required
            />
            <TextField
              label="Source"
              name="source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              required
            />
            <TextField
              label="Type"
              name="donation-type"
              value={donationType}
              onChange={(e) => setDonationType(e.target.value)}
              required
            />
            <TextField
              label="Amount"
              name="amount"
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <TextField
              label="Date"
              name="occurred-on"
              type="date"
              value={occurredOn}
              onChange={(e) => setOccurredOn(e.target.value)}
              required
            />
            <SelectField
              label="Method"
              name="payment-method"
              value={method}
              onChange={(e) =>
                setMethod(e.target.value as ChoirPaymentMethod)
              }
            >
              <option value="BANK">Bank</option>
              <option value="MOMO">MoMo</option>
              <option value="CASH">Cash</option>
            </SelectField>
            <TextField
              label="Evidence"
              name="evidence"
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
            />
            <button type="submit" className="btn" disabled={!canPost}>
              Save donation
            </button>
          </form>
        </div>
      )}

      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Donor</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Txn</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id}>
                <td>{d.occurredOn}</td>
                <td>
                  {d.donorName}
                  <div className="muted">{d.source}</div>
                </td>
                <td>{d.donationType}</td>
                <td>{financeService.formatAmount(d.amount)}</td>
                <td className="muted">{d.financeTxnId ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ChoirSponsorsPage() {
  const { canView } = useChoirTreasurerAccess();
  const sponsors = choirService.listSponsors();

  if (!canView) {
    return (
      <div className="panel">
        <h2>Sponsors</h2>
        <p className="muted">No access</p>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Sponsors</h2>
        <p className="muted">External profiles — no system login</p>
        {sponsors.map((s) => (
          <div key={s.id} style={{ marginBottom: '1rem' }}>
            <h3 style={{ marginBottom: '0.25rem' }}>
              {s.name}{' '}
              <span className="badge">{s.sponsorType}</span>
              <span className="badge">{s.status}</span>
            </h3>
            <p className="muted" style={{ margin: 0 }}>
              Total agreements: {financeService.formatAmount(s.total)}
              {s.contactNote ? ` · ${s.contactNote}` : ''}
            </p>
            <ul style={{ margin: '0.35rem 0 0', paddingLeft: '1.1rem' }}>
              {s.sponsorships.map((sp) => (
                <li key={sp.id}>
                  {sp.label} — {financeService.formatAmount(sp.amount)} (
                  {sp.status})
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChoirFundraisingPage() {
  const { account, canView, canManage } = useChoirTreasurerAccess();
  const { tick, refresh } = useTick();
  const campaigns = useMemo(
    () => choirService.listCampaigns(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick],
  );
  const [campaignId, setCampaignId] = useState(campaigns[0]?.id ?? '');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('10000');
  const [occurredOn, setOccurredOn] = useState('2026-09-08');
  const [message, setMessage] = useState('');

  if (!account || !canView) {
    return (
      <div className="panel">
        <h2>Fundraising</h2>
        <p className="muted">No access</p>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Fundraising campaigns</h2>
        <p className="muted">Goal vs raised vs remaining</p>
        {campaigns.map((c) => (
          <div key={c.id} style={{ marginBottom: '0.85rem' }}>
            <strong>{c.name}</strong>
            <div className="row">
              <span className="badge">
                Goal {financeService.formatAmount(c.goalAmount)}
              </span>
              <span className="badge">
                Raised {financeService.formatAmount(c.raised)}
              </span>
              <span className="badge planned">
                Remaining {financeService.formatAmount(c.remaining)}
              </span>
            </div>
            <ul style={{ margin: '0.35rem 0 0', paddingLeft: '1.1rem' }}>
              {c.gifts.map((g) => (
                <li key={g.id}>
                  {g.contributorName} — {financeService.formatAmount(g.amount)}{' '}
                  · {g.occurredOn}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {canManage && (
        <div className="panel">
          <h3>Log campaign gift</h3>
          {message && <p className="muted">{message}</p>}
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              const r = choirService.addCampaignGift({
                actorPersonId: account.personId,
                campaignId,
                contributorName: name,
                amount: Number(amount),
                occurredOn,
                paymentMethod: 'CASH',
              });
              setMessage(r.ok ? 'Gift recorded' : r.reason ?? 'Failed');
              if (r.ok) {
                setName('');
                refresh();
              }
            }}
          >
            <SelectField
              label="Campaign"
              name="campaign-id"
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
            >
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </SelectField>
            <TextField
              label="Contributor"
              name="contributor-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <TextField
              label="Amount"
              name="amount"
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <TextField
              label="Date"
              name="occurred-on"
              type="date"
              value={occurredOn}
              onChange={(e) => setOccurredOn(e.target.value)}
              required
            />
            <button type="submit" className="btn">
              Add gift
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export function ChoirAccountingPage() {
  const { account, canView, canManage } = useChoirTreasurerAccess();
  const { canPost } = useChoirFundGrant();
  const { tick, refresh } = useTick();

  const budgets = choirService.listBudgets();
  const income = useMemo(
    () => choirService.listIncome(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick],
  );
  const expenses = useMemo(
    () => choirService.listExpenses(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick],
  );
  const [message, setMessage] = useState('');
  const [cat, setCat] = useState('Transport');
  const [amount, setAmount] = useState('15000');
  const [desc, setDesc] = useState('');
  const [occurredOn, setOccurredOn] = useState('2026-09-08');

  if (!account || !canView) {
    return (
      <div className="panel">
        <h2>Accounting</h2>
        <p className="muted">No access</p>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Budgets & accounting</h2>
        {budgets.map((b) => (
          <div key={b.id}>
            <strong>
              {b.name} ({b.kind})
            </strong>
            <div className="row">
              <span className="badge">
                Planned in {financeService.formatAmount(b.plannedIncome)}
              </span>
              <span className="badge">
                Planned out {financeService.formatAmount(b.plannedExpense)}
              </span>
              <span className="badge">{b.status}</span>
            </div>
            <ul style={{ margin: '0.35rem 0 0', paddingLeft: '1.1rem' }}>
              {b.lines.map((l) => (
                <li key={l.id}>
                  {l.side} · {l.category} —{' '}
                  {financeService.formatAmount(l.plannedAmount)}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="grid-2">
        <div className="panel">
          <h3>Income</h3>
          <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
            {income.map((r) => (
              <li key={r.id}>
                {r.occurredOn} · {r.category} —{' '}
                {financeService.formatAmount(r.amount)}
                <div className="muted">{r.description}</div>
              </li>
            ))}
          </ul>
          {canManage && canPost && (
            <button
              type="button"
              className="btn secondary"
              style={{ marginTop: '0.75rem' }}
              onClick={() => {
                const r = choirService.recordIncome({
                  actorPersonId: account.personId,
                  category: 'Other',
                  amount: 10_000,
                  occurredOn: '2026-09-08',
                  description: 'Quick income entry',
                  budgetId: 'cbud-2026',
                });
                setMessage(r.ok ? 'Income posted' : r.reason ?? 'Failed');
                refresh();
              }}
            >
              + Quick income 10,000
            </button>
          )}
        </div>
        <div className="panel">
          <h3>Expenses</h3>
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
              {expenses.map((e) => (
                <tr key={e.id}>
                  <td>{e.occurredOn}</td>
                  <td>
                    {e.category}
                    <div className="muted">{e.description}</div>
                  </td>
                  <td>{financeService.formatAmount(e.amount)}</td>
                  <td>
                    <span className="badge">{e.status}</span>
                  </td>
                  <td>
                    {canManage && e.status === 'PENDING' && (
                      <div className="row">
                        <button
                          type="button"
                          className="btn"
                          disabled={!canPost}
                          onClick={() => {
                            const r = choirService.approveExpense(
                              e.id,
                              account.personId,
                              true,
                            );
                            setMessage(
                              r.ok ? 'Approved → fund' : r.reason ?? 'Failed',
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
                            choirService.approveExpense(
                              e.id,
                              account.personId,
                              false,
                            );
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
        </div>
      </div>

      {canManage && (
        <div className="panel">
          <h3>Submit expense</h3>
          {message && <p className="muted">{message}</p>}
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              const r = choirService.submitExpense({
                actorPersonId: account.personId,
                category: cat,
                amount: Number(amount),
                occurredOn,
                description: desc || cat,
              });
              setMessage(r.ok ? 'Expense submitted' : r.reason ?? 'Failed');
              if (r.ok) {
                setDesc('');
                refresh();
              }
            }}
          >
            <TextField
              label="Category"
              name="category"
              value={cat}
              onChange={(e) => setCat(e.target.value)}
            />
            <TextField
              label="Amount"
              name="amount"
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <TextField
              label="Date"
              name="occurred-on"
              type="date"
              value={occurredOn}
              onChange={(e) => setOccurredOn(e.target.value)}
            />
            <TextField
              label="Description"
              name="description"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
            <button type="submit" className="btn">
              Submit for approval
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export function ChoirAssetsPage() {
  const { account, can, positions } = useAuth();
  const { canView: treasView, canManage: treasManage } =
    useChoirTreasurerAccess();
  const oversight =
    !!account &&
    resolvePeerEntry(account.personId, SYS, positions).kind === 'oversight';
  const canView =
    treasView ||
    oversight ||
    (!!account && can('CHOIR_FINANCE', 'VIEW', SYS));
  const canManage = treasManage && !oversight;
  const { tick, refresh } = useTick();
  const assets = useMemo(
    () => choirService.listAssets(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick],
  );
  const liabilities = useMemo(
    () => choirService.listLiabilities(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick],
  );

  if (!canView) {
    return (
      <div className="panel">
        <h2>Assets & liabilities</h2>
        <p className="muted">No access</p>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="grid-2">
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>Assets</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Value</th>
                <th>Assigned</th>
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
                      ? choirService.personLabel(a.assignedToPersonId)
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>Liabilities</h2>
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
                  <td>{l.name}</td>
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
                          choirService.closeLiability(l.id);
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
        </div>
      </div>
    </div>
  );
}

export function ChoirReportsPage() {
  const { account, can } = useAuth();
  const office = account ? choirService.officeFor(account.personId) : null;
  const canView =
    (office === 'TREASURER' || office === 'PRESIDENT') &&
    can('CHOIR_FINANCE', 'VIEW', SYS);
  const report = choirService.financeReport();

  if (!canView) {
    return (
      <div className="panel">
        <h2>Reports</h2>
        <p className="muted">No access</p>
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
    ['Assets', report.assets],
    ['Liabilities (open)', report.liabilities],
    ['Choir fund balance', report.fundBalance],
    ['Net assets', report.netAssets],
  ];

  return (
    <div className="stack">
      <div className="panel">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0 }}>Financial reports</h2>
            <p className="muted" style={{ margin: '0.35rem 0 0' }}>
              Summary across contributions, donations, campaigns, accounting
            </p>
          </div>
          <div className="row">
            <button
              type="button"
              className="btn"
              onClick={() =>
                downloadText(
                  'choir-finance-report.csv',
                  choirService.financeReportCsv(),
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
        <table className="table">
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
        <Link to="/systems/choir/finance">← Contribution finance</Link>
      </div>
    </div>
  );
}
