import { type FormEvent, useState } from 'react';
import {
  formatRwf,
  inKindTotal,
  LEFTOVER_LABELS,
  openAdvances,
  type LeftoverDecision,
} from '../domain/stewardship';
import type { MissionStewardKind } from '../services/missionService';
import {
  financeService,
  missionService,
  peopleService,
} from '../services';

type Props = {
  kind: MissionStewardKind;
  id: string;
  canEdit: boolean;
  personId: string;
  defaultFundId?: string;
  onChanged: () => void;
};

/**
 * P2 stewardship ops: budget lines, advances, in-kind, transfers, programme renew.
 */
export function StewardshipOpsPanel({
  kind,
  id,
  canEdit,
  personId,
  defaultFundId,
  onChanged,
}: Props) {
  const steward = missionService.stewardshipOf(kind, id) ?? {};
  const closed = !!steward.closeout;
  const editable = canEdit && !closed;
  const funds = financeService.listAllFunds().filter((f) => f.status === 'ACTIVE');
  const people = peopleService.list();
  const openAdv = openAdvances(steward);
  const [msg, setMsg] = useState('');

  const [lineLabel, setLineLabel] = useState('');
  const [lineAmount, setLineAmount] = useState('');

  const [advHolder, setAdvHolder] = useState(personId);
  const [advAmount, setAdvAmount] = useState('');
  const [advPurpose, setAdvPurpose] = useState('');
  const [forceAdv, setForceAdv] = useState(false);
  const [retireId, setRetireId] = useState<string | null>(null);
  const [retireSpent, setRetireSpent] = useState('');
  const [retireNote, setRetireNote] = useState('');

  const [ikLabel, setIkLabel] = useState('');
  const [ikValue, setIkValue] = useState('');
  const [ikDonor, setIkDonor] = useState('');

  const [fromFund, setFromFund] = useState('fund-general');
  const [toFund, setToFund] = useState(defaultFundId ?? 'fund-youth');
  const [xferAmount, setXferAmount] = useState('');
  const [xferLabel, setXferLabel] = useState('');
  const [tagSource, setTagSource] = useState(true);

  const [period, setPeriod] = useState(steward.envelopePeriod || '2026');
  const [nextPeriod, setNextPeriod] = useState('2027');
  const [nextPlan, setNextPlan] = useState(
    steward.plannedCost ? String(steward.plannedCost) : '',
  );
  const [renewLeftover, setRenewLeftover] =
    useState<LeftoverDecision>('NEXT_CYCLE');
  const [renewNote, setRenewNote] = useState('');

  function personName(pid: string) {
    const p = peopleService.getById(pid);
    return p?.preferredName ?? p?.fullName ?? pid;
  }

  function addLine(e: FormEvent) {
    e.preventDefault();
    const r = missionService.upsertBudgetLine(kind, id, {
      label: lineLabel,
      plannedAmount: Number(lineAmount),
      personId,
    });
    setMsg(r.ok ? 'Budget line added' : (r.reason ?? 'Failed'));
    if (r.ok) {
      setLineLabel('');
      setLineAmount('');
    }
    onChanged();
  }

  function issueAdv(e: FormEvent) {
    e.preventDefault();
    const r = missionService.issueAdvance(kind, id, {
      holderPersonId: advHolder,
      amount: Number(advAmount),
      purpose: advPurpose,
      personId,
      fundId: defaultFundId,
      allowWhileOpen: forceAdv,
    });
    setMsg(r.ok ? 'Advance issued' : (r.reason ?? 'Failed'));
    if (r.ok) {
      setAdvAmount('');
      setAdvPurpose('');
      setForceAdv(false);
    }
    onChanged();
  }

  function doRetire(e: FormEvent) {
    e.preventDefault();
    if (!retireId) return;
    const r = missionService.retireAdvance(kind, id, retireId, {
      personId,
      retiredSpent: Number(retireSpent),
      receiptNote: retireNote,
    });
    setMsg(r.ok ? 'Advance retired' : (r.reason ?? 'Failed'));
    if (r.ok) {
      setRetireId(null);
      setRetireSpent('');
      setRetireNote('');
    }
    onChanged();
  }

  function addIk(e: FormEvent) {
    e.preventDefault();
    const r = missionService.addInKind(kind, id, {
      label: ikLabel,
      personId,
      estimatedValue: ikValue ? Number(ikValue) : undefined,
      donorName: ikDonor || undefined,
    });
    setMsg(r.ok ? 'In-kind noted' : (r.reason ?? 'Failed'));
    if (r.ok) {
      setIkLabel('');
      setIkValue('');
      setIkDonor('');
    }
    onChanged();
  }

  function doTransfer(e: FormEvent) {
    e.preventDefault();
    const r = missionService.recordStewardshipTransfer({
      kind,
      id,
      actorPersonId: personId,
      fromFundId: fromFund,
      toFundId: toFund,
      amount: Number(xferAmount),
      description: xferLabel.trim() || 'Internal fund transfer',
      tagAsConfirmedSource: tagSource,
    });
    setMsg(r.ok ? 'Transfer recorded' : (r.reason ?? 'Failed'));
    if (r.ok) setXferAmount('');
    onChanged();
  }

  function doRenew(e: FormEvent) {
    e.preventDefault();
    if (kind !== 'PROGRAM') return;
    const r = missionService.renewProgramPhase(id, {
      personId,
      periodLabel: period,
      nextPeriodLabel: nextPeriod,
      nextPlannedCost: nextPlan ? Number(nextPlan) : undefined,
      leftoverDecision: renewLeftover,
      narrative: renewNote || undefined,
    });
    setMsg(r.ok ? `Envelope renewed → ${nextPeriod}` : (r.reason ?? 'Failed'));
    onChanged();
  }

  return (
    <div className="stack">
      {msg && <p className="badge">{msg}</p>}
      {openAdv.length > 0 && (
        <div className="steward-banner warn">
          {openAdv.length} open advance(s) — retire before issuing another
          (unless forced).
        </div>
      )}

      <div className="panel">
        <h3>Budget lines</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Thin line items; freeze to lock a line. Amending updates planned
          total.
        </p>
        {(steward.budgetLines ?? []).length === 0 ? (
          <p className="muted">No lines yet.</p>
        ) : (
          <ul className="steward-list">
            {(steward.budgetLines ?? []).map((l) => (
              <li key={l.id}>
                <div>
                  <strong>{l.label}</strong>{' '}
                  <span className="muted">{formatRwf(l.plannedAmount)}</span>
                  {l.frozen && (
                    <span className="badge" title="Frozen">
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        aria-hidden
                        style={{
                          verticalAlign: '-1px',
                          marginRight: '0.25rem',
                        }}
                      >
                        <path
                          fill="currentColor"
                          d="M12 1a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V11a2 2 0 0 0-2-2h-1V6a5 5 0 0 0-5-5Zm-3 5a3 3 0 0 1 6 0v3H9V6Zm3 8a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z"
                        />
                      </svg>
                      FROZEN
                    </span>
                  )}
                </div>
                {editable && (
                  <div className="row">
                    {l.frozen ? (
                      <button
                        type="button"
                        className="btn ghost"
                        title="Locked — unfreeze requires amend note"
                        onClick={() => {
                          const note = window.prompt(
                            'Amend note to unfreeze this line (required):',
                            l.amendNote ?? '',
                          );
                          if (note === null) return;
                          const r = missionService.setBudgetLineFrozen(
                            kind,
                            id,
                            l.id,
                            false,
                            { amendNote: note },
                          );
                          setMsg(
                            r.ok ? 'Line unfrozen' : (r.reason ?? 'Failed'),
                          );
                          if (r.ok) onChanged();
                        }}
                      >
                        Locked · Unfreeze…
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn ghost"
                        title="Freeze / lock this line"
                        onClick={() => {
                          const r = missionService.setBudgetLineFrozen(
                            kind,
                            id,
                            l.id,
                            true,
                          );
                          setMsg(r.ok ? 'Line frozen' : (r.reason ?? 'Failed'));
                          if (r.ok) onChanged();
                        }}
                      >
                        Freeze
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        {editable && (
          <form className="row" onSubmit={addLine} style={{ marginTop: '0.5rem' }}>
            <input
              placeholder="Line label"
              value={lineLabel}
              onChange={(e) => setLineLabel(e.target.value)}
              required
            />
            <input
              placeholder="Amount"
              value={lineAmount}
              onChange={(e) => setLineAmount(e.target.value)}
              inputMode="numeric"
              style={{ maxWidth: '8rem' }}
              required
            />
            <button type="submit" className="btn ghost">
              Add line
            </button>
          </form>
        )}
      </div>

      <div className="panel">
        <h3>Advances (floats)</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Issue cash to a leader; retire with spent + return. Spent adds to
          used cost.
        </p>
        <ul className="steward-list">
          {(steward.advances ?? []).map((a) => (
            <li key={a.id}>
              <div>
                <strong>{personName(a.holderPersonId)}</strong>{' '}
                <span className="muted">
                  · {formatRwf(a.amount)} · {a.purpose} · {a.status}
                </span>
                {a.status === 'RETIRED' && a.retiredSpent !== undefined && (
                  <span className="muted">
                    {' '}
                    · spent {formatRwf(a.retiredSpent)}
                  </span>
                )}
              </div>
              {editable && a.status === 'OPEN' && (
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => {
                    setRetireId(a.id);
                    setRetireSpent(String(a.amount));
                  }}
                >
                  Retire…
                </button>
              )}
            </li>
          ))}
        </ul>
        {(steward.advances ?? []).length === 0 && (
          <p className="muted">No advances.</p>
        )}
        {editable && retireId && (
          <form className="stack" onSubmit={doRetire} style={{ marginTop: '0.5rem' }}>
            <div className="field">
              <label>Spent (RWF)</label>
              <input
                value={retireSpent}
                onChange={(e) => setRetireSpent(e.target.value)}
                inputMode="numeric"
                required
              />
            </div>
            <div className="field">
              <label>Receipt note</label>
              <input
                value={retireNote}
                onChange={(e) => setRetireNote(e.target.value)}
              />
            </div>
            <div className="row">
              <button type="submit" className="btn">
                Confirm retirement
              </button>
              <button
                type="button"
                className="btn ghost"
                onClick={() => setRetireId(null)}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
        {editable && !retireId && (
          <form className="stack" onSubmit={issueAdv} style={{ marginTop: '0.5rem' }}>
            <div className="row">
              <select
                value={advHolder}
                onChange={(e) => setAdvHolder(e.target.value)}
              >
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.preferredName ?? p.fullName}
                  </option>
                ))}
              </select>
              <input
                placeholder="Amount"
                value={advAmount}
                onChange={(e) => setAdvAmount(e.target.value)}
                inputMode="numeric"
                style={{ maxWidth: '8rem' }}
                required
              />
              <input
                placeholder="Purpose"
                value={advPurpose}
                onChange={(e) => setAdvPurpose(e.target.value)}
                required
              />
              <button type="submit" className="btn ghost">
                Issue
              </button>
            </div>
            {openAdv.length > 0 && (
              <label className="row">
                <input
                  type="checkbox"
                  checked={forceAdv}
                  onChange={(e) => setForceAdv(e.target.checked)}
                />
                Allow while open advances remain
              </label>
            )}
          </form>
        )}
      </div>

      <div className="panel">
        <h3>In-kind</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Non-cash gifts (venue, gear, printing). Estimated value is light —
          not fake cash.
          {inKindTotal(steward) > 0
            ? ` · noted ~${formatRwf(inKindTotal(steward))}`
            : ''}
        </p>
        <ul className="steward-list">
          {(steward.inKind ?? []).map((i) => (
            <li key={i.id}>
              <div>
                <strong>{i.label}</strong>
                {i.estimatedValue !== undefined && (
                  <span className="muted"> · ~{formatRwf(i.estimatedValue)}</span>
                )}
                {i.donorName && (
                  <span className="muted"> · {i.donorName}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
        {(steward.inKind ?? []).length === 0 && (
          <p className="muted">None logged.</p>
        )}
        {editable && (
          <form className="row" onSubmit={addIk} style={{ marginTop: '0.5rem' }}>
            <input
              placeholder="What was given"
              value={ikLabel}
              onChange={(e) => setIkLabel(e.target.value)}
              required
            />
            <input
              placeholder="Est. value"
              value={ikValue}
              onChange={(e) => setIkValue(e.target.value)}
              inputMode="numeric"
              style={{ maxWidth: '7rem' }}
            />
            <input
              placeholder="Donor"
              value={ikDonor}
              onChange={(e) => setIkDonor(e.target.value)}
            />
            <button type="submit" className="btn ghost">
              Log
            </button>
          </form>
        )}
      </div>

      <div className="panel">
        <h3>Fund transfer</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Explicit General → ministry (or any vault pair). Requires MANAGE on
          both funds. Optional tag as confirmed source on this card.
        </p>
        {editable && (
          <form className="stack" onSubmit={doTransfer}>
            <div className="row">
              <select
                value={fromFund}
                onChange={(e) => setFromFund(e.target.value)}
              >
                {funds.map((f) => (
                  <option key={f.id} value={f.id}>
                    From {f.code}
                  </option>
                ))}
              </select>
              <select value={toFund} onChange={(e) => setToFund(e.target.value)}>
                {funds.map((f) => (
                  <option key={f.id} value={f.id}>
                    To {f.code}
                  </option>
                ))}
              </select>
              <input
                placeholder="Amount"
                value={xferAmount}
                onChange={(e) => setXferAmount(e.target.value)}
                inputMode="numeric"
                style={{ maxWidth: '8rem' }}
                required
              />
            </div>
            <input
              placeholder="Description"
              value={xferLabel}
              onChange={(e) => setXferLabel(e.target.value)}
            />
            <label className="row">
              <input
                type="checkbox"
                checked={tagSource}
                onChange={(e) => setTagSource(e.target.checked)}
              />
              Tag destination amount as confirmed funding on this card
            </label>
            <button type="submit" className="btn ghost">
              Record transfer
            </button>
          </form>
        )}
      </div>

      {kind === 'PROGRAM' && (
        <div className="panel">
          <h3>Envelope renew</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            Close this year/period&apos;s money story without ending the
            programme. Used cost resets; planned can roll forward.
            {steward.envelopePeriod
              ? ` Current: ${steward.envelopePeriod}`
              : ''}
          </p>
          {(steward.phaseRenewals ?? []).length > 0 && (
            <ul className="steward-list">
              {(steward.phaseRenewals ?? []).map((r) => (
                <li key={r.id}>
                  <span className="muted">
                    Closed {r.periodLabel} → {r.nextPeriodLabel} · used{' '}
                    {formatRwf(r.usedCostSnapshot ?? 0)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {editable && (
            <form className="stack" onSubmit={doRenew}>
              <div className="row">
                <input
                  placeholder="Closing period"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  required
                />
                <input
                  placeholder="Next period"
                  value={nextPeriod}
                  onChange={(e) => setNextPeriod(e.target.value)}
                  required
                />
                <input
                  placeholder="Next planned"
                  value={nextPlan}
                  onChange={(e) => setNextPlan(e.target.value)}
                  inputMode="numeric"
                  style={{ maxWidth: '8rem' }}
                />
              </div>
              <select
                value={renewLeftover}
                onChange={(e) =>
                  setRenewLeftover(e.target.value as LeftoverDecision)
                }
              >
                {(Object.keys(LEFTOVER_LABELS) as LeftoverDecision[]).map(
                  (k) => (
                    <option key={k} value={k}>
                      {LEFTOVER_LABELS[k]}
                    </option>
                  ),
                )}
              </select>
              <input
                placeholder="Note (optional)"
                value={renewNote}
                onChange={(e) => setRenewNote(e.target.value)}
              />
              <button type="submit" className="btn">
                Renew envelope
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
