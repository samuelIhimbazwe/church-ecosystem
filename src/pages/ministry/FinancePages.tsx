import { Link, Navigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { StageBoard } from '../../components/ui/StageBoard';
import type { SystemId } from '../../domain/types';
import { getPeerCore } from '../../ministry/peerCoreSystems';
import {
  churchFinanceService,
  financeService,
  ministryFinanceService,
  orgService,
  peopleService,
} from '../../services';
import { MinistryHomeCard } from './MinistryShell';

/** Path to a ministry-owned fund ledger (stays inside that ministry shell). */
export function ministryFundLedgerPath(systemId: SystemId): string | null {
  if (systemId === 'sys-music') return '/systems/music/ledger';
  if (systemId === 'sys-youth') return '/systems/youth/ledger';
  if (systemId === 'sys-choir') return '/systems/choir/finance';
  if (systemId === 'sys-worship') return '/systems/worship/finance';
  if (systemId === 'sys-deacon') return '/systems/deacon/finance';
  if (systemId === 'sys-protocol') return '/systems/protocol/finance';
  const peer = getPeerCore(systemId);
  return peer ? `/systems/${peer.slug}/ledger` : null;
}

function basePathFor(systemId: SystemId): string {
  if (systemId === 'sys-youth') return '/systems/youth';
  if (systemId === 'sys-music') return '/systems/music';
  const peer = getPeerCore(systemId);
  return peer ? `/systems/${peer.slug}` : '/';
}

export function FundLedgerView({
  fundId,
  backTo,
  backLabel = 'Back',
}: {
  fundId: string;
  backTo: string;
  backLabel?: string;
}) {
  const { account } = useAuth();
  if (!account) return null;

  const fund = financeService.getFund(fundId);
  if (!fund) {
    return (
      <div className="panel">
        <h2>Fund not found</h2>
        <Link to={backTo}>{backLabel}</Link>
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
          <Link to={backTo}>{backLabel}</Link>
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
        <Link to={backTo}>← {backLabel}</Link>
      </div>
    </div>
  );
}

/** Full fund ledger inside a ministry system (not Finance System). */
export function MinistryFundLedgerPage({ systemId }: { systemId: SystemId }) {
  const fundId = ministryFinanceService.fundIdFor(systemId);
  const base = basePathFor(systemId);

  if (!fundId) {
    return (
      <div className="panel">
        <h2>Fund ledger</h2>
        <p className="muted">No fund vault is configured for this ministry.</p>
        <Link to={`${base}/finance`}>← Finance</Link>
      </div>
    );
  }

  return (
    <FundLedgerView
      fundId={fundId}
      backTo={`${base}/finance`}
      backLabel="Finance overview"
    />
  );
}

export function FinanceHomePage() {
  const { account, personName, roles } = useAuth();
  const [stage, setStage] = useState('overview');
  if (!account) return null;

  const overview = financeService.fundsAccessOverview(account.personId);
  /** Church treasury surface — General Church Fund (+ any other grants, linked out). */
  const general = overview.filter((o) => o.fund.id === 'fund-general' && o.canView);
  const otherGranted = overview.filter(
    (o) => o.fund.id !== 'fund-general' && o.canView,
  );
  const isChurchTreasurer = roles.includes('CHURCH_TREASURER');
  const canTreasury = churchFinanceService.canManageGeneral(account.personId);
  const generalBal = financeService.balance('fund-general');

  return (
    <div className="stack">
      <MinistryHomeCard title="Church treasury">
        <p className="muted" style={{ marginTop: 0 }}>
          Shared finance module on Main Church. Ministry vaults open inside each
          ministry — not as a separate Finance system.
          {isChurchTreasurer
            ? ' As Church Treasurer you manage congregation finance on the General Church Fund.'
            : ''}
        </p>
        <div className="row">
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
          <StageBoard
            title="Treasury stages"
            activeId={stage}
            onChange={setStage}
            stages={[
              {
                id: 'overview',
                label: 'Overview',
                count: general.length,
                cta: (
                  <Link to="/finance/collections" className="btn">
                    Post collections
                  </Link>
                ),
                children: (
                  <p className="muted" style={{ margin: 0 }}>
                    Tithes, offerings, and givings by service — start from
                    collections, then budgets and reports.
                  </p>
                ),
              },
              {
                id: 'budgets',
                label: 'Budgets',
                cta: (
                  <Link to="/finance/budgets" className="btn">
                    Open budgets
                  </Link>
                ),
                children: (
                  <p className="muted" style={{ margin: 0 }}>
                    Plan envelopes for the General Church Fund period.
                  </p>
                ),
              },
              {
                id: 'reports',
                label: 'Reports',
                cta: (
                  <Link to="/finance/reports" className="btn">
                    Open reports
                  </Link>
                ),
                children: (
                  <div className="row">
                    <Link to="/finance/balance-sheet" className="btn secondary">
                      Balance sheet
                    </Link>
                    <Link to="/finance/funds/fund-general">
                      General Church Fund ledger →
                    </Link>
                  </div>
                ),
              },
            ]}
          />
        </div>
      )}

      <div className="panel">
        <h3>General Church Fund</h3>
        {general.length === 0 ? (
          <p className="muted">
            You do not have a grant on the General Church Fund.
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
              {general.map(({ fund, canManage, orgName }) => (
                <tr key={fund.id}>
                  <td>
                    <strong>{fund.name}</strong>
                    <div className="muted">{fund.code}</div>
                  </td>
                  <td>{orgName}</td>
                  <td>
                    {financeService.formatAmount(
                      financeService.balance(fund.id),
                    )}
                  </td>
                  <td>{canManage ? 'MANAGE' : 'VIEW'}</td>
                  <td>
                    <Link to={`/finance/funds/${fund.id}`}>
                      Open ledger
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {otherGranted.length > 0 && (
        <div className="panel">
          <h3>Other grants</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            Open these from their ministry. Links go to the ministry fund
            ledger, not this treasury home.
          </p>
          <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
            {otherGranted.map(({ fund }) => {
              const path =
                fund.ownerSystemId &&
                ministryFundLedgerPath(fund.ownerSystemId);
              return (
                <li key={fund.id}>
                  <strong>{fund.name}</strong>
                  {path ? (
                    <>
                      {' '}
                      · <Link to={path}>Open in ministry →</Link>
                    </>
                  ) : (
                    <span className="muted"> · no ministry path</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export function FinanceFundLedgerPage() {
  const { fundId } = useParams();
  if (!fundId) return null;

  const fund = financeService.getFund(fundId);
  if (!fund) {
    return (
      <div className="panel">
        <h2>Fund not found</h2>
        <Link to="/finance">Back</Link>
      </div>
    );
  }

  // Ministry vaults belong in ministry shells — never park users in Finance System.
  if (fund.ownerSystemId && fund.id !== 'fund-general') {
    const dest = ministryFundLedgerPath(fund.ownerSystemId);
    if (dest) return <Navigate to={dest} replace />;
  }

  return (
    <FundLedgerView
      fundId={fundId}
      backTo="/finance"
      backLabel="Church treasury"
    />
  );
}

/** Old `/systems/finance/*` peer URLs → Main treasury module. */
export function FinanceSystemRedirect() {
  const { '*': rest } = useParams();
  const suffix = rest && rest.length ? `/${rest}` : '';
  return <Navigate to={`/finance${suffix}`} replace />;
}
