import { type FormEvent, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { Drawer } from '../../components/ui/Drawer';
import { SelectField, TextField } from '../../components/ui/Field';
import { FilterBar, PageHead } from '../../components/ui/FilterBar';
import {
  EmptyState,
  ForbiddenState,
  StatusPill,
} from '../../components/ui/StatusPill';
import type { WorshipPaymentMethod } from '../../domain/types';
import { worshipService, financeService } from '../../services';

const SYS = 'sys-worship' as const;

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

export function WorshipTeamsPage() {
  const { can } = useAuth();
  const canView = can('WORSHIP_ROSTER', 'VIEW', SYS);
  const teams = worshipService.listTeams();

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
          Internal Worship teams/squads — not household relatives. Used for
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
              {worshipService.teamMembers(t.id).map((m) => (
                <li key={m.id}>{m.name}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WorshipPeoplePage() {
  const { can, canViewPeople, account } = useAuth();
  const canView = can('WORSHIP_ROSTER', 'VIEW', SYS) && canViewPeople;
  const roster = worshipService.listRoster();

  if (!canViewPeople && account) {
    return <Navigate to={`/people/${account.personId}`} replace />;
  }

  if (!canView) {
    return (
      <div className="panel">
        <h2>People</h2>
        <p className="muted">
          Worship people directory is for ministry leaders only.
        </p>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Worship people</h2>
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
                <td>{worshipService.officeLabel(m.office)}</td>
                <td>{m.teamName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function WorshipFinancePage() {
  const { account, can } = useAuth();
  const { tick, refresh } = useTick();
  const canView = can('WORSHIP_FINANCE', 'VIEW', SYS);
  const canManage = can('WORSHIP_FINANCE', 'MANAGE', SYS);
  const canVerifyFund = account
    ? financeService.authorizeFund(account.personId, 'fund-worship', 'MANAGE')
        .allowed
    : false;
  const [statusFilter, setStatusFilter] = useState('all');
  const [message, setMessage] = useState('');

  const summary = useMemo(
    () => worshipService.contributionSummary(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick],
  );
  const all = useMemo(
    () => worshipService.listContributions(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick],
  );
  const pending = useMemo(
    () => all.filter((c) => c.status === 'PENDING'),
    [all],
  );
  const followUps = useMemo(
    () => worshipService.listFollowUps(true),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick],
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
        <ForbiddenState resource="WORSHIP_FINANCE" />
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="panel">
        <PageHead
          title="Contribution & finance"
          subtitle="Claim → verify → ledger. Confirmed amounts post to the private Worship fund vault."
          actions={
            <>
              <Link to="/systems/worship/my-contributions" className="btn">
                Submit claim
              </Link>
              <button
                type="button"
                className="btn ghost"
                onClick={() =>
                  downloadText(
                    'worship-contributions.csv',
                    worshipService.ledgerCsv(),
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
            <Link to="/systems/worship/finance">
              Open Worship fund ledger →
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
                  <td>{worshipService.personLabel(c.personId)}</td>
                  <td>{worshipService.typeLabel(c.typeId)}</td>
                  <td>{financeService.formatAmount(c.amount)}</td>
                  <td>{c.paymentMethod}</td>
                  <td>
                    <div className="row">
                      <button
                        type="button"
                        className="btn"
                        disabled={!canVerifyFund}
                        onClick={async () => {
                          const r = await worshipService.verifyContributionHybrid({
                            contributionId: c.id,
                            actorPersonId: account.personId,
                            decision: 'CONFIRMED',
                          });
                          setMessage(
                            r.ok
                              ? 'Confirmed → Worship fund'
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
                          const r = await worshipService.verifyContributionHybrid({
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
                          await worshipService.verifyContributionHybrid({
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
                {worshipService.personLabel(f.personId)} — {f.reason}{' '}
                {(canManage || canVerifyFund) && (
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => {
                      worshipService.closeFollowUp(f.id);
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
            title={
              all.length > 0
                ? 'No contributions match'
                : 'No contributions'
            }
            detail={
              all.length > 0
                ? 'This status filter is empty. Switch to All to see the ledger.'
                : 'Members submit claims from My contributions.'
            }
            action={
              all.length > 0 ? (
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => setStatusFilter('all')}
                >
                  Show all
                </button>
              ) : (
                <Link to="/systems/worship/my-contributions" className="btn">
                  Submit claim
                </Link>
              )
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
                  <td>{worshipService.personLabel(c.personId)}</td>
                  <td>{worshipService.typeLabel(c.typeId)}</td>
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

      <WorshipFamilyFinancePanel personId={account.personId} tick={tick} />
    </div>
  );
}

function WorshipFamilyFinancePanel({
  personId,
  tick,
}: {
  personId: string;
  tick: number;
}) {
  const led = worshipService.ledTeamIds(personId);
  if (led.length === 0) return null;

  return (
    <div className="panel">
      <h3>Family finance</h3>
      <p className="muted">Teams you lead — contribution rollup only</p>
      {led.map((teamId) => {
        const fin = worshipService.teamFinance(teamId);
        const team = worshipService.listTeams().find((t) => t.id === teamId);
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

export function WorshipMyContributionsPage() {
  const { account, canEnter } = useAuth();
  const { tick, refresh } = useTick();
  const canUse = Boolean(account && canEnter(SYS));
  const types = worshipService.contributionTypes(true);
  const methods = worshipService.paymentMethods(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [typeId, setTypeId] = useState(types[0]?.id ?? '');
  const [amount, setAmount] = useState(String(types[0]?.defaultAmount ?? 5000));
  const [method, setMethod] = useState<WorshipPaymentMethod>('MOMO');
  const [occurredOn, setOccurredOn] = useState('2026-09-08');
  const [note, setNote] = useState('');
  const [evidenceNote, setEvidenceNote] = useState('');
  const [message, setMessage] = useState('');

  const mine = useMemo(
    () =>
      account
        ? worshipService.listContributions({ personId: account.personId })
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [account, tick],
  );

  if (!account || !canUse) {
    return (
      <div className="panel">
        <h2>My contributions</h2>
        <p className="muted">
          Sign in with Worship system access to submit your own claims.
        </p>
      </div>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const result = await worshipService.submitContributionHybrid({
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
          subtitle="Submit a claim; treasurer confirms into the Worship fund vault."
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
          <SelectField
            label="Type"
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
          </SelectField>
          <TextField
            label="Amount (RWF)"
            id="amt"
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <SelectField
            label="Payment method"
            id="pm"
            value={method}
            onChange={(e) => setMethod(e.target.value as WorshipPaymentMethod)}
          >
            {methods.map((m) => (
              <option key={m.id} value={m.method}>
                {m.label}
              </option>
            ))}
          </SelectField>
          <TextField
            label="Date"
            id="od"
            type="date"
            value={occurredOn}
            onChange={(e) => setOccurredOn(e.target.value)}
            required
          />
          <TextField
            label="Note"
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <TextField
            label="Evidence note"
            id="ev"
            value={evidenceNote}
            onChange={(e) => setEvidenceNote(e.target.value)}
            placeholder="e.g. MoMo ref …"
          />
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
                  <td>{worshipService.typeLabel(c.typeId)}</td>
                  <td>{financeService.formatAmount(c.amount)}</td>
                  <td>
                    <StatusPill status={c.status}>{c.status}</StatusPill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Link to="/systems/worship/finance">Finance overview →</Link>
      </div>
    </div>
  );
}
