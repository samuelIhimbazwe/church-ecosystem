import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import {
  churchFinanceService,
  financeService,
  orgService,
  peopleService,
  systemsService,
} from '../../services';
import { MinistryHomeCard } from './MinistryShell';

export function FinanceHomePage() {
  const { account, personName, roles } = useAuth();
  if (!account) return null;

  const overview = financeService.fundsAccessOverview(account.personId);
  const visible = overview.filter((o) => o.canView);
  const locked = overview.filter((o) => !o.canView);
  const isChurchTreasurer = roles.includes('CHURCH_TREASURER');
  const canTreasury = churchFinanceService.canManageGeneral(account.personId);
  const generalBal = financeService.balance('fund-general');

  return (
    <div className="stack">
      <MinistryHomeCard title="Finance System">
        <p className="muted" style={{ marginTop: 0 }}>
          One shared ledger. Each fund is an <strong>org-private vault</strong>.
          Pastor and other church leaders cannot open a ministry fund unless that
          organization issues an explicit grant.
          {isChurchTreasurer
            ? ' As Church Treasurer you manage congregation finance on the General Fund.'
            : ''}
        </p>
        <div className="row">
          <span className="badge">{visible.length} funds you can open</span>
          <span className="badge planned">{locked.length} locked vaults</span>
          <span className="badge">Signed in as {personName}</span>
          {canTreasury && (
            <span className="badge">
              General Fund {financeService.formatAmount(generalBal)}
            </span>
          )}
        </div>
      </MinistryHomeCard>

      {canTreasury && (
        <div className="panel">
          <h3>Church treasury</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            Tithes, offerings, givings by service · budgets · balance sheet ·
            reports. Ministry vaults stay private to ministry treasurers.
          </p>
          <div className="row">
            <Link to="/systems/finance/collections" className="btn">
              Post collections
            </Link>
            <Link to="/systems/finance/budgets" className="btn secondary">
              Budgets
            </Link>
            <Link to="/systems/finance/balance-sheet" className="btn ghost">
              Balance sheet
            </Link>
            <Link to="/systems/finance/reports" className="btn ghost">
              Reports
            </Link>
            <Link to="/systems/finance/funds/fund-general">General ledger →</Link>
          </div>
        </div>
      )}

      <div className="panel">
        <h3>Your accessible funds</h3>
        {visible.length === 0 ? (
          <p className="muted">
            No fund grants. You may enter Finance but every vault stays locked
            until an organization grants access.
          </p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Fund</th>
                <th>Owner org</th>
                <th>Balance</th>
                <th>Access</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map(({ fund, canManage, orgName }) => (
                <tr key={fund.id}>
                  <td>
                    <strong>{fund.name}</strong>
                    <div className="muted">{fund.code}</div>
                  </td>
                  <td>{orgName}</td>
                  <td>{financeService.formatAmount(financeService.balance(fund.id))}</td>
                  <td>{canManage ? 'MANAGE' : 'VIEW'}</td>
                  <td>
                    <Link to={`/systems/finance/funds/${fund.id}`}>Open ledger</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="panel">
        <h3>Locked org-private vaults</h3>
        <p className="muted">
          These funds exist in the shared system but stay invisible as ledgers
          without an org grant — including for Church Leader.
        </p>
        <table className="table">
          <thead>
            <tr>
              <th>Fund</th>
              <th>Owner org</th>
              <th>Related system</th>
              <th>Denial</th>
            </tr>
          </thead>
          <tbody>
            {locked.map(({ fund, decision, orgName }) => (
              <tr key={fund.id}>
                <td>
                  <strong>{fund.name}</strong>
                  <div className="muted">{fund.code}</div>
                </td>
                <td>{orgName}</td>
                <td>
                  {fund.ownerSystemId
                    ? (systemsService.getById(fund.ownerSystemId)?.shortName ??
                      fund.ownerSystemId)
                    : '—'}
                </td>
                <td className="muted">{decision.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function FinanceFundLedgerPage() {
  const { fundId } = useParams();
  const { account } = useAuth();
  if (!account || !fundId) return null;

  const fund = financeService.getFund(fundId);
  if (!fund) {
    return (
      <div className="panel">
        <h2>Fund not found</h2>
        <Link to="/systems/finance">Back</Link>
      </div>
    );
  }

  const result = financeService.transactionsForFund(account.personId, fundId);
  const grants = financeService.grantsForFund(fundId);

  if (!result.allowed) {
    return (
      <div className="stack">
        <div className="panel">
          <h2>{fund.name}</h2>
          <p className="error">{result.decision.reason}</p>
          <p className="muted">
            Owning org:{' '}
            {orgService.getById(fund.orgUnitId)?.name ?? fund.orgUnitId}
          </p>
          <Link to="/systems/finance">Back to Finance</Link>
        </div>
      </div>
    );
  }

  const canManage = financeService.authorizeFund(
    account.personId,
    fundId,
    'MANAGE',
  ).allowed;

  return (
    <div className="stack">
      <div className="panel">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0 }}>{fund.name}</h2>
            <p className="muted" style={{ margin: '0.35rem 0 0' }}>
              {fund.description}
            </p>
          </div>
          <div className="row">
            <span className="badge">
              {financeService.formatAmount(financeService.balance(fundId))}
            </span>
            <span className="badge">{canManage ? 'MANAGE' : 'VIEW'}</span>
          </div>
        </div>
        <p className="muted">
          Org: {orgService.getById(fund.orgUnitId)?.name} · Grant reason:{' '}
          {result.decision.reason}
        </p>
      </div>

      <div className="panel">
        <h3>Ledger</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Recorded by</th>
            </tr>
          </thead>
          <tbody>
            {result.txns.length === 0 ? (
              <tr>
                <td colSpan={5} className="muted">
                  No transactions
                </td>
              </tr>
            ) : (
              result.txns.map((t) => (
                <tr key={t.id}>
                  <td>{t.occurredOn}</td>
                  <td>{t.type}</td>
                  <td>{t.description}</td>
                  <td>{financeService.formatAmount(t.amount)}</td>
                  <td>
                    {peopleService.getById(t.recordedByPersonId)?.preferredName ??
                      t.recordedByPersonId}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h3>Who holds grants on this fund</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Person</th>
              <th>Action</th>
              <th>Granted by</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {grants.map((g) => (
              <tr key={g.id}>
                <td>{financeService.grantorName(g.personId)}</td>
                <td>{g.action}</td>
                <td>{financeService.grantorName(g.grantedByPersonId)}</td>
                <td className="muted">{g.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Link to="/systems/finance">← All funds</Link>
      </div>
    </div>
  );
}
