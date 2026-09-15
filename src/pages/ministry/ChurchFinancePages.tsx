import { type FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import type { BalanceSheetSection, FinanceCategory } from '../../domain/types';
import {
  CATEGORY_LABELS,
  churchFinanceService,
} from '../../services/churchFinanceService';
import { financeService } from '../../services';
import { MinistryHomeCard } from './MinistryShell';
import {
  SelectField,
  TextField,
} from '../../components/ui/Field';

function fmt(n: number) {
  return financeService.formatAmount(n);
}

export function ChurchCollectionsPage() {
  const { account } = useAuth();
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);
  const [msg, setMsg] = useState('');
  const [serviceDate, setServiceDate] = useState('2026-09-14');
  const [serviceLabel, setServiceLabel] = useState('Sunday 1st service');
  const [tithe, setTithe] = useState('');
  const [offering, setOffering] = useState('');
  const [giving, setGiving] = useState('');
  const [notes, setNotes] = useState('');

  if (!account) return null;
  const canManage = churchFinanceService.canManageGeneral(account.personId);
  const canView = churchFinanceService.canViewGeneral(account.personId);
  if (!canView) {
    return (
      <div className="panel">
        <p className="error">General Fund access required.</p>
        <Link to="/finance">Back</Link>
      </div>
    );
  }

  const rollups = churchFinanceService.collectionRollups();
  const collections = churchFinanceService.listCollections();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!account) return;
    const result = churchFinanceService.postServiceCollection({
      actorPersonId: account.personId,
      serviceDate,
      serviceLabel,
      titheAmount: Number(tithe) || 0,
      offeringAmount: Number(offering) || 0,
      givingAmount: Number(giving) || 0,
      notes: notes || undefined,
    });
    if (!result.ok) {
      setMsg(result.reason ?? 'Failed');
      return;
    }
    setMsg('Collection posted to General Fund');
    setTithe('');
    setOffering('');
    setGiving('');
    setNotes('');
    refresh();
  }

  return (
    <div className="stack">
      <MinistryHomeCard title="Service collections">
        <p className="muted" style={{ marginTop: 0 }}>
          Post tithes, offerings, and givings per service. Totals roll up by
          week and month into the General Church Fund.
        </p>
      </MinistryHomeCard>

      {msg && <p className="badge">{msg}</p>}

      {canManage && (
        <div className="panel">
          <h3>Post service totals</h3>
          <form className="stack" onSubmit={onSubmit}>
            <div className="grid-2">
              <TextField
                label="Service date"
                name="svc-date"
                type="date"
                value={serviceDate}
                onChange={(e) => setServiceDate(e.target.value)}
                required
              />
              <SelectField
                label="Service"
                name="svc-label"
                value={serviceLabel}
                onChange={(e) => setServiceLabel(e.target.value)}
              >
                <option>Sunday 1st service</option>
                <option>Sunday 2nd service</option>
                <option>Tuesday prayer</option>
                <option>Friday overnight</option>
                <option>Special / crusade</option>
              </SelectField>
              <TextField
                label="Tithes (RWF)"
                name="svc-tithe"
                type="number"
                min={0}
                value={tithe}
                onChange={(e) => setTithe(e.target.value)}
              />
              <TextField
                label="Offerings (RWF)"
                name="svc-offering"
                type="number"
                min={0}
                value={offering}
                onChange={(e) => setOffering(e.target.value)}
              />
              <TextField
                label="Givings (RWF)"
                name="svc-giving"
                type="number"
                min={0}
                value={giving}
                onChange={(e) => setGiving(e.target.value)}
              />
              <TextField
                label="Notes"
                name="svc-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <button type="submit" className="btn">
              Post to General Fund
            </button>
          </form>
        </div>
      )}

      <div className="panel">
        <h3>By service</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Service</th>
              <th>Tithe</th>
              <th>Offering</th>
              <th>Giving</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {rollups.byService.map((r) => (
              <tr key={r.id}>
                <td>{r.serviceDate}</td>
                <td>{r.serviceLabel}</td>
                <td>{fmt(r.tithe)}</td>
                <td>{fmt(r.offering)}</td>
                <td>{fmt(r.giving)}</td>
                <td>
                  <strong>{fmt(r.total)}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid-2">
        <div className="panel">
          <h3>By week</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Week</th>
                <th>Tithe</th>
                <th>Offering</th>
                <th>Giving</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {rollups.byWeek.map((r) => (
                <tr key={r.week}>
                  <td>{r.week}</td>
                  <td>{fmt(r.tithe)}</td>
                  <td>{fmt(r.offering)}</td>
                  <td>{fmt(r.giving)}</td>
                  <td>
                    <strong>{fmt(r.total)}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="panel">
          <h3>By month</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Tithe</th>
                <th>Offering</th>
                <th>Giving</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {rollups.byMonth.map((r) => (
                <tr key={r.month}>
                  <td>{r.month}</td>
                  <td>{fmt(r.tithe)}</td>
                  <td>{fmt(r.offering)}</td>
                  <td>{fmt(r.giving)}</td>
                  <td>
                    <strong>{fmt(r.total)}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="muted">
        {collections.length} collection records ·{' '}
        <Link to="/finance/funds/fund-general">Open General Fund ledger</Link>
      </p>
    </div>
  );
}

const EXPENSE_CATS: FinanceCategory[] = [
  'UTILITIES',
  'SALARIES',
  'MISSIONS',
  'MAINTENANCE',
  'ADMIN',
  'OTHER_EXPENSE',
];

const ALL_CATS = Object.keys(CATEGORY_LABELS) as FinanceCategory[];

export function ChurchBudgetsPage() {
  const { account } = useAuth();
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);
  const year = 2026;
  const [msg, setMsg] = useState('');
  const [label, setLabel] = useState('');
  const [category, setCategory] = useState<FinanceCategory>('UTILITIES');
  const [kind, setKind] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [month, setMonth] = useState('');
  const [expDesc, setExpDesc] = useState('');
  const [expAmt, setExpAmt] = useState('');
  const [expCat, setExpCat] = useState<FinanceCategory>('UTILITIES');
  const [expDate, setExpDate] = useState('2026-09-08');

  if (!account) return null;
  if (!churchFinanceService.canViewGeneral(account.personId)) {
    return (
      <div className="panel">
        <p className="error">General Fund access required.</p>
      </div>
    );
  }
  const canManage = churchFinanceService.canManageGeneral(account.personId);
  const rows = churchFinanceService.budgetVsActual(year);

  function onBudget(e: FormEvent) {
    e.preventDefault();
    churchFinanceService.upsertBudget({
      fiscalYear: year,
      month: month ? Number(month) : undefined,
      category,
      kind,
      budgetedAmount: Number(amount) || 0,
      label: label || CATEGORY_LABELS[category],
    });
    setMsg('Budget line saved');
    setLabel('');
    setAmount('');
    refresh();
  }

  function onExpense(e: FormEvent) {
    e.preventDefault();
    if (!account) return;
    const result = churchFinanceService.recordExpense({
      actorPersonId: account.personId,
      amount: Number(expAmt) || 0,
      category: expCat,
      description: expDesc,
      occurredOn: expDate,
    });
    setMsg(result.ok ? 'Expense recorded' : (result.reason ?? 'Failed'));
    if (result.ok) {
      setExpDesc('');
      setExpAmt('');
      refresh();
    }
  }

  return (
    <div className="stack">
      <MinistryHomeCard title="Budgets & expenses">
        <p className="muted" style={{ marginTop: 0 }}>
          Church operating budget vs actuals on the General Fund ({year}).
        </p>
        <span className="badge">
          Cash on hand: {fmt(financeService.balance('fund-general'))}
        </span>
      </MinistryHomeCard>
      {msg && <p className="badge">{msg}</p>}

      <div className="panel">
        <h3>Budget vs actual</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Line</th>
              <th>Kind</th>
              <th>Budget</th>
              <th>Actual</th>
              <th>Variance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ line, actual, variance }) => (
              <tr key={line.id}>
                <td>
                  <strong>{line.label}</strong>
                  <div className="muted">
                    {CATEGORY_LABELS[line.category]}
                    {line.month ? ` · M${line.month}` : ' · annual'}
                  </div>
                </td>
                <td>{line.kind}</td>
                <td>{fmt(line.budgetedAmount)}</td>
                <td>{fmt(actual)}</td>
                <td>{fmt(variance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canManage && (
        <div className="grid-2">
          <div className="panel">
            <h3>Add budget line</h3>
            <form className="stack" onSubmit={onBudget}>
              <div className="field">
                <label>Label</label>
                <input value={label} onChange={(e) => setLabel(e.target.value)} />
              </div>
              <div className="field">
                <label>Category</label>
                <select
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value as FinanceCategory)
                  }
                >
                  {ALL_CATS.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Kind</label>
                <select
                  value={kind}
                  onChange={(e) =>
                    setKind(e.target.value as 'INCOME' | 'EXPENSE')
                  }
                >
                  <option value="INCOME">INCOME</option>
                  <option value="EXPENSE">EXPENSE</option>
                </select>
              </div>
              <div className="field">
                <label>Month (optional)</label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  placeholder="Annual if empty"
                />
              </div>
              <div className="field">
                <label>Budgeted amount</label>
                <input
                  type="number"
                  min={0}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn">
                Save budget line
              </button>
            </form>
          </div>
          <div className="panel">
            <h3>Record expense</h3>
            <form className="stack" onSubmit={onExpense}>
              <div className="field">
                <label>Description</label>
                <input
                  value={expDesc}
                  onChange={(e) => setExpDesc(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label>Category</label>
                <select
                  value={expCat}
                  onChange={(e) =>
                    setExpCat(e.target.value as FinanceCategory)
                  }
                >
                  {EXPENSE_CATS.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Amount</label>
                <input
                  type="number"
                  min={0}
                  value={expAmt}
                  onChange={(e) => setExpAmt(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label>Date</label>
                <input
                  type="date"
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                />
              </div>
              <button type="submit" className="btn">
                Post expense
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export function ChurchBalanceSheetPage() {
  const { account } = useAuth();
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);
  const [asOf, setAsOf] = useState('2026-09-08');
  const [msg, setMsg] = useState('');
  const [section, setSection] = useState<BalanceSheetSection>('ASSET');
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');

  if (!account) return null;
  if (!churchFinanceService.canViewGeneral(account.personId)) {
    return (
      <div className="panel">
        <p className="error">General Fund access required.</p>
      </div>
    );
  }
  const canManage = churchFinanceService.canManageGeneral(account.personId);
  const sheet = churchFinanceService.resolvedBalanceSheet(asOf);

  function onAdd(e: FormEvent) {
    e.preventDefault();
    churchFinanceService.upsertBalanceSheetLine({
      asOfDate: asOf,
      section,
      label,
      amount: Number(amount) || 0,
    });
    setMsg('Balance sheet line added');
    setLabel('');
    setAmount('');
    refresh();
  }

  const sections: BalanceSheetSection[] = ['ASSET', 'LIABILITY', 'EQUITY'];

  return (
    <div className="stack">
      <MinistryHomeCard title="Balance sheet">
        <p className="muted" style={{ marginTop: 0 }}>
          Statement of financial position for congregation finances. Cash links
          live to the General Fund ledger.
        </p>
        <div className="row">
          <div className="field" style={{ margin: 0 }}>
            <label>As of</label>
            <input
              type="date"
              value={asOf}
              onChange={(e) => setAsOf(e.target.value)}
            />
          </div>
          <span className="badge">
            {sheet.balanced ? 'Balanced' : 'Check equity / totals'}
          </span>
        </div>
      </MinistryHomeCard>
      {msg && <p className="badge">{msg}</p>}

      {sections.map((sec) => (
        <div className="panel" key={sec}>
          <h3>{sec}</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Line</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {sheet.lines
                .filter((l) => l.section === sec)
                .map((l) => (
                  <tr key={l.id}>
                    <td>
                      {l.label}
                      {l.linkedFundId && (
                        <div className="muted">Linked: {l.linkedFundId}</div>
                      )}
                    </td>
                    <td>{fmt(l.resolvedAmount)}</td>
                  </tr>
                ))}
              <tr>
                <td>
                  <strong>Total {sec}</strong>
                </td>
                <td>
                  <strong>{fmt(sheet.totals[sec])}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ))}

      {canManage && (
        <div className="panel">
          <h3>Add line</h3>
          <form className="stack" onSubmit={onAdd}>
            <div className="grid-2">
              <div className="field">
                <label>Section</label>
                <select
                  value={section}
                  onChange={(e) =>
                    setSection(e.target.value as BalanceSheetSection)
                  }
                >
                  {sections.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Label</label>
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label>Amount</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn">
              Add line
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export function ChurchReportsPage() {
  const { account } = useAuth();
  const [from, setFrom] = useState('2026-08-01');
  const [to, setTo] = useState('2026-09-30');

  if (!account) return null;
  if (!churchFinanceService.canViewGeneral(account.personId)) {
    return (
      <div className="panel">
        <p className="error">General Fund access required.</p>
      </div>
    );
  }

  const stmt = churchFinanceService.incomeStatement(from, to);
  const rollups = churchFinanceService.collectionRollups();
  const sheet = churchFinanceService.resolvedBalanceSheet('2026-09-08');

  return (
    <div className="stack">
      <MinistryHomeCard title="Finance reports">
        <p className="muted" style={{ marginTop: 0 }}>
          Income statement, collection summaries, and balance sheet snapshot for
          Church Treasurer oversight.
        </p>
      </MinistryHomeCard>

      <div className="panel">
        <h3>Income statement (General Fund)</h3>
        <div className="row" style={{ marginBottom: '0.75rem' }}>
          <div className="field" style={{ margin: 0 }}>
            <label>From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
        </div>
        <div className="grid-2">
          <div>
            <h4>Income</h4>
            <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
              {stmt.income.map((r) => (
                <li key={r.category}>
                  {r.category}: {fmt(r.amount)}
                </li>
              ))}
            </ul>
            <p>
              <strong>Total income: {fmt(stmt.totalIncome)}</strong>
            </p>
          </div>
          <div>
            <h4>Expenses</h4>
            <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
              {stmt.expense.map((r) => (
                <li key={r.category}>
                  {r.category}: {fmt(r.amount)}
                </li>
              ))}
            </ul>
            <p>
              <strong>Total expense: {fmt(stmt.totalExpense)}</strong>
            </p>
          </div>
        </div>
        <p className="badge">Net: {fmt(stmt.net)}</p>
      </div>

      <div className="panel">
        <h3>Collections this period (all posted)</h3>
        <div className="row">
          {rollups.byMonth.map((m) => (
            <span className="badge" key={m.month}>
              {m.month}: {fmt(m.total)}
            </span>
          ))}
        </div>
      </div>

      <div className="panel">
        <h3>Balance sheet snapshot ({sheet.asOfDate})</h3>
        <div className="row">
          <span className="badge">Assets {fmt(sheet.totals.ASSET)}</span>
          <span className="badge">
            Liabilities {fmt(sheet.totals.LIABILITY)}
          </span>
          <span className="badge">Equity {fmt(sheet.totals.EQUITY)}</span>
        </div>
        <Link to="/finance/balance-sheet">Open balance sheet →</Link>
      </div>
    </div>
  );
}
