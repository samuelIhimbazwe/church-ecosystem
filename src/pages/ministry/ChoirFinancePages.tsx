import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { Drawer } from '../../components/ui/Drawer';
import { FilterBar, PageHead } from '../../components/ui/FilterBar';
import {
  EmptyState,
  ForbiddenState,
  StatusPill,
} from '../../components/ui/StatusPill';
import { fundIdForChoirOrgUnit } from '../../domain/choirCatalog';
import {
  choirOfficeIsTreasurer,
  choirOfficeMayViewAllFamilies,
  choirOfficeMayViewFinanceModule,
} from '../../domain/choirAccess';
import type { ChoirContribution, ChoirPaymentMethod } from '../../domain/types';
import { choirService, financeService } from '../../services';
import { useActiveChoir } from './useActiveChoir';

const SYS = 'sys-choir' as const;

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

export function ChoirTeamsPage() {
  const { can } = useAuth();
  const canView = can('CHOIR_ROSTER', 'VIEW', SYS);
  const teams = choirService.listTeams();

  if (!canView) {
    return (
      <div className="panel">
        <h2>Families (teams)</h2>
        <p className="muted">No access</p>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Families</h2>
        <p className="muted">
          Internal choir teams/squads — not household relatives. Used for
          leadership scope and family finance.
        </p>
        {teams.map((t) => (
          <div key={t.id} style={{ marginBottom: '1rem' }}>
            <h3 style={{ marginBottom: '0.25rem' }}>
              {t.name}{' '}
              <span className="badge">{t.code}</span>
            </h3>
            <p className="muted" style={{ margin: 0 }}>
              Leader: {t.leaderName ?? '—'} · {t.memberCount} members
            </p>
            <ul style={{ margin: '0.35rem 0 0', paddingLeft: '1.1rem' }}>
              {choirService.teamMembers(t.id).map((m) => (
                <li key={m.id}>{m.name}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChoirPeoplePage() {
  const { can, canViewPeople, account } = useAuth();
  const canView = can('CHOIR_ROSTER', 'VIEW', SYS) && canViewPeople;
  const roster = choirService.listRoster();

  if (!canViewPeople && account) {
    return <Navigate to={`/people/${account.personId}`} replace />;
  }

  if (!canView) {
    return (
      <div className="panel">
        <h2>People</h2>
        <p className="muted">
          Choir people directory is for ministry leaders only.
        </p>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Choir people</h2>
        <p className="muted">Offices and family (team) assignment</p>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Office</th>
              <th>Family</th>
            </tr>
          </thead>
          <tbody>
            {roster.map((m) => (
              <tr key={m.id}>
                <td>{m.name}</td>
                <td>{choirService.officeLabel(m.office, m.advisorRole)}</td>
                <td>{m.teamName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ChoirFinancePage() {
  const { account, can, grantsFromApi } = useAuth();
  const { activeChoirOrgUnitId } = useActiveChoir();
  const choirFundId = activeChoirOrgUnitId
    ? fundIdForChoirOrgUnit(activeChoirOrgUnitId)
    : null;
  const { tick, refresh } = useTick();
  const office = account ? choirService.officeFor(account.personId) : null;
  const mayModule = choirOfficeMayViewFinanceModule(office);
  const canView = mayModule && can('CHOIR_FINANCE', 'VIEW', SYS);
  const canManage =
    choirOfficeIsTreasurer(office) && can('CHOIR_FINANCE', 'MANAGE', SYS);
  const canVerifyFund = Boolean(
    account &&
      choirFundId &&
      (financeService.authorizeFund(account.personId, choirFundId, 'MANAGE')
        .allowed ||
        (grantsFromApi &&
          can('FINANCE', 'MANAGE', 'sys-finance', choirFundId)) ||
        (grantsFromApi && canManage)),
  );
  const [statusFilter, setStatusFilter] = useState('all');
  const [message, setMessage] = useState('');
  const [all, setAll] = useState<ChoirContribution[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const hybrid = await choirService.listContributionsHybrid();
      if (cancelled || !account) return;
      let rows = hybrid.rows;
      if (
        !(
          choirOfficeMayViewAllFamilies(office) ||
          office === 'PRESIDENT' ||
          office === 'VP'
        )
      ) {
        if (office === 'FAMILY_LEADER') {
          const teamIds = new Set(choirService.ledTeamIds(account.personId));
          rows = rows.filter((c) => c.teamId && teamIds.has(c.teamId));
        } else if (!grantsFromApi) {
          rows = [];
        }
      }
      setAll(rows);
    })();
    return () => {
      cancelled = true;
    };
  }, [tick, account, office, grantsFromApi]);

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
      fundBalance: choirFundId ? financeService.balance(choirFundId) : 0,
    };
  }, [all, choirFundId]);
  const pending = useMemo(
    () => all.filter((c) => c.status === 'PENDING'),
    [all],
  );
  const followUps = useMemo(
    () =>
      canManage ? choirService.listFollowUps(true) : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, canManage],
  );
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

  if (!account || !canView) {
    return (
      <div className="panel">
        <h2>Contribution & finance</h2>
        <ForbiddenState resource="CHOIR_FINANCE" />
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="panel">
        <PageHead
          title="Contribution & finance"
          subtitle="Claim → verify → ledger. Confirmed amounts post to the private Choir fund vault."
          actions={
            <>
              <Link to="/systems/choir/my-contributions" className="btn">
                Submit claim
              </Link>
              <button
                type="button"
                className="btn ghost"
                onClick={() =>
                  downloadText(
                    'choir-contributions.csv',
                    choirService.ledgerCsv(),
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
            <div className="label">Pending RWF</div>
            <div className="value" style={{ fontSize: '1rem' }}>
              {financeService.formatAmount(summary.pendingAmount)}
            </div>
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
        {canVerifyFund && (
          <p className="muted" style={{ marginBottom: 0, marginTop: '0.65rem' }}>
            {choirFundId && (
              <Link to={`/systems/finance/funds/${choirFundId}`}>
                Open choir fund ledger →
              </Link>
            )}
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
                  <td>{choirService.personLabel(c.personId)}</td>
                  <td>{choirService.typeLabel(c.typeId)}</td>
                  <td>{financeService.formatAmount(c.amount)}</td>
                  <td>{c.paymentMethod}</td>
                  <td>
                    <div className="row">
                      <button
                        type="button"
                        className="btn"
                        disabled={!canVerifyFund}
                        onClick={async () => {
                          const r = await choirService.verifyContributionHybrid({
                            contributionId: c.id,
                            actorPersonId: account.personId,
                            decision: 'CONFIRMED',
                          });
                          setMessage(
                            r.ok
                              ? 'Confirmed → Choir fund'
                              : (r.reason ?? 'Failed'),
                          );
                          refresh();
                        }}
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        className="btn secondary"
                        disabled={!canVerifyFund}
                        onClick={async () => {
                          const half = Math.round(c.amount / 2);
                          const r = await choirService.verifyContributionHybrid({
                            contributionId: c.id,
                            actorPersonId: account.personId,
                            decision: 'PARTIAL',
                            confirmedAmount: half,
                            note: `Partial ${half}`,
                          });
                          setMessage(
                            r.ok
                              ? 'Partial + follow-up'
                              : (r.reason ?? 'Failed'),
                          );
                          refresh();
                        }}
                      >
                        Partial
                      </button>
                      <button
                        type="button"
                        className="btn ghost"
                        disabled={!canVerifyFund}
                        onClick={async () => {
                          await choirService.verifyContributionHybrid({
                            contributionId: c.id,
                            actorPersonId: account.personId,
                            decision: 'DECLINED',
                            note: 'Needs clarification',
                          });
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

      {followUps.length > 0 && (
        <div className="panel">
          <h3>Open follow-ups</h3>
          <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
            {followUps.map((f) => (
              <li key={f.id}>
                {choirService.personLabel(f.personId)} — {f.reason}{' '}
                {(canManage || canVerifyFund) && (
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => {
                      choirService.closeFollowUp(f.id);
                      refresh();
                    }}
                  >
                    Close
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Contribution ledger</h3>
        {filtered.length === 0 ? (
          <EmptyState
            title="No contributions match"
            detail="Members submit claims from My contributions."
            action={
              <Link to="/systems/choir/my-contributions" className="btn">
                Submit claim
              </Link>
            }
          />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Member</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Txn</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td>{c.occurredOn}</td>
                  <td>{choirService.personLabel(c.personId)}</td>
                  <td>{choirService.typeLabel(c.typeId)}</td>
                  <td>
                    {financeService.formatAmount(c.confirmedAmount ?? c.amount)}
                  </td>
                  <td>
                    <StatusPill status={c.status}>{c.status}</StatusPill>
                  </td>
                  <td className="muted">{c.financeTxnId ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ChoirFamilyFinancePanel personId={account.personId} tick={tick} />
    </div>
  );
}

function ChoirFamilyFinancePanel({
  personId,
  tick,
}: {
  personId: string;
  tick: number;
}) {
  const allFamilies = choirService.canViewAllFamilyFinance(personId);
  const teamIds = allFamilies
    ? choirService.listTeams().map((t) => t.id)
    : choirService.ledTeamIds(personId);
  if (teamIds.length === 0) return null;

  return (
    <div className="panel">
      <h3>{allFamilies ? 'All family contributions' : 'Family finance'}</h3>
      <p className="muted">
        {allFamilies
          ? 'Treasurer / Coordinator — rollup across every family'
          : 'Teams you lead — contribution rollup only'}
      </p>
      {teamIds.map((teamId) => {
        const fin = choirService.teamFinance(teamId);
        const team = choirService.listTeams().find((t) => t.id === teamId);
        return (
          <div key={`${teamId}-${tick}`} style={{ marginBottom: '0.75rem' }}>
            <strong>{team?.name ?? teamId}</strong>
            <div className="row">
              <span className="badge">
                Confirmed {financeService.formatAmount(fin.confirmed)}
              </span>
              <span className="badge">
                Pending {financeService.formatAmount(fin.pending)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ChoirMyContributionsPage() {
  const { account, canEnter } = useAuth();
  const { tick, refresh } = useTick();
  const onRoster = account
    ? Boolean(choirService.rosterFor(account.personId))
    : false;
  const canUse = Boolean(account && canEnter(SYS) && onRoster);
  const types = choirService.contributionTypes(true);
  const methods = choirService.paymentMethods(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [typeId, setTypeId] = useState(types[0]?.id ?? '');
  const [amount, setAmount] = useState(String(types[0]?.defaultAmount ?? 5000));
  const [method, setMethod] = useState<ChoirPaymentMethod>('MOMO');
  const [occurredOn, setOccurredOn] = useState('2026-09-08');
  const [note, setNote] = useState('');
  const [evidenceNote, setEvidenceNote] = useState('');
  const [message, setMessage] = useState('');

  const mine = useMemo(
    () =>
      account
        ? choirService.listContributions({ personId: account.personId })
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [account, tick],
  );

  if (!account || !canUse) {
    return (
      <div className="panel">
        <h2>My contributions</h2>
        <p className="muted">
          Only active choir roster members can submit and view their own claims.
        </p>
      </div>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const result = await choirService.submitContributionHybrid({
      personId: account!.personId,
      typeId,
      amount: Number(amount),
      paymentMethod: method,
      occurredOn,
      note: note || undefined,
      evidenceNote: evidenceNote || undefined,
    });
    setMessage(
      result.ok
        ? 'Submitted — pending verification'
        : (result.reason ?? 'Failed'),
    );
    if (result.ok) {
      setNote('');
      setEvidenceNote('');
      setCreateOpen(false);
      refresh();
    }
  }

  return (
    <div className="stack">
      <div className="panel">
        <PageHead
          title="My contributions"
          subtitle="Submit a claim; treasurer confirms into the Choir fund vault."
          actions={
            <button
              type="button"
              className="btn"
              onClick={() => setCreateOpen(true)}
            >
              Submit claim
            </button>
          }
        />
        {message && <p className="badge">{message}</p>}
      </div>

      <Drawer
        open={createOpen}
        title="Submit claim"
        onClose={() => setCreateOpen(false)}
      >
        <form className="stack" onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="ctype">Type</label>
            <select
              id="ctype"
              value={typeId}
              onChange={(e) => {
                setTypeId(e.target.value);
                const t = types.find((x) => x.id === e.target.value);
                if (t?.defaultAmount) setAmount(String(t.defaultAmount));
              }}
            >
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="amt">Amount (RWF)</label>
            <input
              id="amt"
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="pm">Payment method</label>
            <select
              id="pm"
              value={method}
              onChange={(e) => setMethod(e.target.value as ChoirPaymentMethod)}
            >
              {methods.map((m) => (
                <option key={m.id} value={m.method}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="od">Date</label>
            <input
              id="od"
              type="date"
              value={occurredOn}
              onChange={(e) => setOccurredOn(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="note">Note</label>
            <input
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="ev">Evidence note</label>
            <input
              id="ev"
              value={evidenceNote}
              onChange={(e) => setEvidenceNote(e.target.value)}
              placeholder="e.g. MoMo ref …"
            />
          </div>
          <button type="submit" className="btn">
            Submit claim
          </button>
        </form>
      </Drawer>

      <div className="panel">
        <h3>My history</h3>
        {mine.length === 0 ? (
          <EmptyState
            title="No submissions yet"
            detail="Submit a claim when you have paid."
            action={
              <button
                type="button"
                className="btn"
                onClick={() => setCreateOpen(true)}
              >
                Submit claim
              </button>
            }
          />
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
                  <td>{choirService.typeLabel(c.typeId)}</td>
                  <td>{financeService.formatAmount(c.amount)}</td>
                  <td>
                    <StatusPill status={c.status}>{c.status}</StatusPill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Link to="/systems/choir/finance">Finance overview →</Link>
      </div>
    </div>
  );
}
