import { type FormEvent, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { Drawer } from '../../components/ui/Drawer';
import { SelectField, TextField } from '../../components/ui/Field';
import { PageHead } from '../../components/ui/FilterBar';
import {
  EmptyState,
  StatusPill,
} from '../../components/ui/StatusPill';
import type { ChoirPaymentMethod } from '../../domain/types';
import { choirService, financeService } from '../../services';

export { ChoirFinancePage } from './ChoirContributionFinancePage';

const SYS = 'sys-choir' as const;

function useTick() {
  const [tick, setTick] = useState(0);
  return { tick, refresh: () => setTick((t) => t + 1) };
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
        ? 'Submitted — pending family leader confirmation'
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
          subtitle="Submit a claim to your family MoMo/bank. Your family leader Confirm / Partial / Decline; coordinator and treasurer move money upward into the choir vault."
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
            onChange={(e) => setMethod(e.target.value as ChoirPaymentMethod)}
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
            placeholder="e.g. MoMo ref ..."
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
