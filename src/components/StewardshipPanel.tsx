import { type FormEvent, useMemo, useState } from 'react';
import { Drawer } from './ui/Drawer';
import { StewardshipOpsPanel } from './StewardshipOpsPanel';
import {
  confirmedFundingTotal,
  costVariance,
  formatRwf,
  fundingGap,
  intendedFundingTotal,
  LEFTOVER_LABELS,
  remainingConfirmed,
  requiredDeliveryOpen,
  SOURCE_TYPE_LABELS,
  type DeliveryItemKind,
  type DeliveryItemTier,
  type FundingSourceType,
  type LeftoverDecision,
} from '../domain/stewardship';
import type { MissionStewardKind } from '../services/missionService';
import { financeService, missionService } from '../services';

type Props = {
  kind: MissionStewardKind;
  id: string;
  canEdit: boolean;
  /** Opens close-out drawer from parent End / Mark DONE buttons. */
  closeOpen?: boolean;
  onCloseOpenChange?: (open: boolean) => void;
  personId: string;
  defaultFundId?: string;
  onChanged: () => void;
  /** Extra context for project task soft-block in close form. */
  openTaskCount?: number;
};

export function StewardshipPanel({
  kind,
  id,
  canEdit,
  closeOpen = false,
  onCloseOpenChange,
  personId,
  defaultFundId,
  onChanged,
  openTaskCount = 0,
}: Props) {
  const steward = missionService.stewardshipOf(kind, id) ?? {};
  const live =
    kind === 'PROGRAM'
      ? missionService.getProgram(id)
      : missionService.getProject(id);
  const isClosing = live?.status === 'CLOSING';
  const closed = !!steward.closeout;
  const funds = financeService.listAllFunds();

  const planned = Number(steward?.plannedCost) || 0;
  const used = Number(steward?.usedCost) || 0;
  const confirmed = confirmedFundingTotal(steward);
  const intended = intendedFundingTotal(steward);
  const gap = fundingGap(steward);
  const remaining = remainingConfirmed(steward);
  const variance = costVariance(steward);
  const openRequired = requiredDeliveryOpen(steward);

  const [plannedDraft, setPlannedDraft] = useState(
    planned ? String(planned) : '',
  );
  const [usedDraft, setUsedDraft] = useState(used ? String(used) : '');

  const [srcType, setSrcType] = useState<FundingSourceType>('MINISTRY_FUND');
  const [srcLabel, setSrcLabel] = useState('');
  const [srcAmount, setSrcAmount] = useState('');
  const [srcFund] = useState(defaultFundId ?? '');

  const [allocLabel, setAllocLabel] = useState('');
  const [allocAmount, setAllocAmount] = useState('');
  const [allocFund, setAllocFund] = useState(defaultFundId ?? '');
  const [allocType, setAllocType] =
    useState<FundingSourceType>('GENERAL_ALLOCATION');

  const [delTitle, setDelTitle] = useState('');
  const [delKind, setDelKind] = useState<DeliveryItemKind>('ACTIVITY');
  const [delTier, setDelTier] = useState<DeliveryItemTier>('PLANNED');

  const [waiveId, setWaiveId] = useState<string | null>(null);
  const [waiveNote, setWaiveNote] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmFund, setConfirmFund] = useState(defaultFundId ?? '');

  const [workSummary, setWorkSummary] = useState('');
  const [moneySummary, setMoneySummary] = useState('');
  const [leftover, setLeftover] = useState<LeftoverDecision>('STAY_IN_FUND');
  const [leftoverNote, setLeftoverNote] = useState('');
  const [narrative, setNarrative] = useState('');
  const [closeUsed, setCloseUsed] = useState(used ? String(used) : '');
  const [forceClose, setForceClose] = useState(false);
  const [localMsg, setLocalMsg] = useState('');

  const banners = useMemo(() => {
    const list: { tone: 'warn' | 'danger' | 'ok'; text: string }[] = [];
    if (planned > 0 && gap > 0 && !closed) {
      list.push({
        tone: 'warn',
        text: `Funding gap: ${formatRwf(gap)} still needed (planned ${formatRwf(planned)} − confirmed ${formatRwf(confirmed)}).`,
      });
    }
    if (confirmed > 0 && used > confirmed) {
      list.push({
        tone: 'danger',
        text: `Over confirmed funding: used ${formatRwf(used)} exceeds confirmed ${formatRwf(confirmed)} by ${formatRwf(used - confirmed)}.`,
      });
    }
    if (planned > 0 && used > planned) {
      list.push({
        tone: 'warn',
        text: `Over planned cost: used ${formatRwf(used)} vs plan ${formatRwf(planned)} (${formatRwf(variance)} over).`,
      });
    }
    if (planned > 0 && gap <= 0 && used <= confirmed && !closed) {
      list.push({
        tone: 'ok',
        text: `Funding covers plan. Remaining vs confirmed: ${formatRwf(remaining)}.`,
      });
    }
    return list;
  }, [planned, gap, confirmed, used, variance, remaining, closed]);

  function savePlanned(e: FormEvent) {
    e.preventDefault();
    const n = Number(plannedDraft);
    if (!Number.isFinite(n) || n < 0) {
      setLocalMsg('Enter a valid planned cost');
      return;
    }
    missionService.setPlannedCost(kind, id, n);
    setLocalMsg('Planned cost saved');
    onChanged();
  }

  function saveUsed(e: FormEvent) {
    e.preventDefault();
    const n = Number(usedDraft);
    if (!Number.isFinite(n) || n < 0) {
      setLocalMsg('Enter a valid used cost');
      return;
    }
    if (confirmed > 0 && n > confirmed) {
      setLocalMsg(
        `Warning: used ${formatRwf(n)} exceeds confirmed ${formatRwf(confirmed)} — saved anyway (warn mode).`,
      );
    } else if (planned > 0 && n > planned) {
      setLocalMsg(
        `Warning: used exceeds planned — saved anyway (warn mode).`,
      );
    } else {
      setLocalMsg('Used cost saved');
    }
    missionService.setUsedCost(kind, id, n);
    onChanged();
  }

  function addIntended(e: FormEvent) {
    e.preventDefault();
    const amount = Number(srcAmount);
    if (!srcLabel.trim() || !Number.isFinite(amount) || amount <= 0) {
      setLocalMsg('Label and amount required');
      return;
    }
    const r = missionService.addFundingSource(kind, id, {
      sourceType: srcType,
      label: srcLabel,
      amount,
      status: 'INTENDED',
      fundId: srcFund || undefined,
    });
    setLocalMsg(r.ok ? 'Intended source added' : (r.reason ?? 'Failed'));
    if (r.ok) {
      setSrcLabel('');
      setSrcAmount('');
    }
    onChanged();
  }

  function addConfirmedAlloc(e: FormEvent) {
    e.preventDefault();
    const amount = Number(allocAmount);
    if (!allocLabel.trim() || !Number.isFinite(amount) || amount <= 0) {
      setLocalMsg('Label and amount required');
      return;
    }
    if (!allocFund) {
      setLocalMsg('Fund required to confirm allocation');
      return;
    }
    const r = missionService.recordConfirmedAllocation(kind, id, {
      sourceType: allocType,
      label: allocLabel,
      amount,
      fundId: allocFund,
      personId,
    });
    setLocalMsg(
      r.ok ? 'Confirmed allocation recorded' : (r.reason ?? 'Failed'),
    );
    if (r.ok) {
      setAllocLabel('');
      setAllocAmount('');
    }
    onChanged();
  }

  function doConfirmSource(sourceId: string) {
    if (!confirmFund) {
      setLocalMsg('Pick a fund to confirm');
      return;
    }
    const r = missionService.confirmFundingSource(kind, id, sourceId, {
      fundId: confirmFund,
      personId,
    });
    setLocalMsg(r.ok ? 'Source confirmed' : (r.reason ?? 'Failed'));
    setConfirmId(null);
    onChanged();
  }

  function addDelivery(e: FormEvent) {
    e.preventDefault();
    const r = missionService.addDeliveryItem(kind, id, {
      kind: delKind,
      tier: delTier,
      title: delTitle,
    });
    setLocalMsg(r.ok ? 'Delivery item added' : (r.reason ?? 'Failed'));
    if (r.ok) setDelTitle('');
    onChanged();
  }

  function markDone(itemId: string) {
    missionService.setDeliveryItemStatus(kind, id, itemId, 'DONE');
    setLocalMsg('Marked done');
    onChanged();
  }

  function submitWaive(e: FormEvent) {
    e.preventDefault();
    if (!waiveId) return;
    const r = missionService.setDeliveryItemStatus(kind, id, waiveId, 'WAIVED', {
      waiveNote,
      waivedByPersonId: personId,
    });
    setLocalMsg(r.ok ? 'Waived' : (r.reason ?? 'Failed'));
    if (r.ok) {
      setWaiveId(null);
      setWaiveNote('');
    }
    onChanged();
  }

  function submitClose(e: FormEvent) {
    e.preventDefault();
    if (!workSummary.trim() || !moneySummary.trim()) {
      setLocalMsg('Work and money summaries are required');
      return;
    }
    const usedN = Number(closeUsed);
    const closeoutBase = {
      closedByPersonId: personId,
      workSummary: workSummary.trim(),
      moneySummary: moneySummary.trim(),
      leftoverDecision: leftover,
      leftoverNote: leftoverNote.trim() || undefined,
      narrative: narrative.trim() || undefined,
    };
    const r =
      kind === 'PROGRAM'
        ? missionService.endProgram(id, {
            closeout: closeoutBase,
            forceClose,
            usedCost: Number.isFinite(usedN) ? usedN : undefined,
          })
        : missionService.completeProject(id, {
            closeout: closeoutBase,
            forceClose,
            usedCost: Number.isFinite(usedN) ? usedN : undefined,
            outcomeNote: narrative.trim() || undefined,
          });
    setLocalMsg(r.ok ? 'Closed with stewardship report' : (r.reason ?? 'Failed'));
    if (r.ok) {
      onCloseOpenChange?.(false);
      setForceClose(false);
    }
    onChanged();
  }

  const byTier = (tier: DeliveryItemTier) =>
    (steward?.deliveryItems ?? []).filter((d) => d.tier === tier);

  return (
    <div className="stack stewardship-panel">
      {isClosing && !closed && (
        <div className="steward-banner warn">
          CLOSING phase — finish required delivery and the money close-out
          report below.
        </div>
      )}
      {banners.map((b) => (
        <div key={b.text} className={`steward-banner ${b.tone}`}>
          {b.text}
        </div>
      ))}

      {localMsg && <p className="badge">{localMsg}</p>}

      <div className="panel">
        <h3>Money</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Planned cost, intended → confirmed sources, and used so far. Gap and
          overspend show as banners above.
        </p>
        <div className="overview-strip">
          <div className="overview-tile">
            <div className="label">Planned</div>
            <div className="value">{formatRwf(planned)}</div>
          </div>
          <div className="overview-tile">
            <div className="label">Intended</div>
            <div className="value">{formatRwf(intended)}</div>
          </div>
          <div className="overview-tile">
            <div className="label">Confirmed</div>
            <div className="value">{formatRwf(confirmed)}</div>
          </div>
          <div className="overview-tile">
            <div className="label">Used</div>
            <div className="value">{formatRwf(used)}</div>
          </div>
          <div className="overview-tile">
            <div className="label">Gap</div>
            <div className="value">{formatRwf(Math.max(0, gap))}</div>
          </div>
          <div className="overview-tile">
            <div className="label">Remaining</div>
            <div className="value">{formatRwf(remaining)}</div>
          </div>
        </div>

        {canEdit && !closed && (
          <div className="stack" style={{ marginTop: '0.85rem' }}>
            <form className="row" onSubmit={savePlanned}>
              <div className="field" style={{ flex: 1 }}>
                <label>Planned cost (RWF)</label>
                <input
                  value={plannedDraft}
                  onChange={(e) => setPlannedDraft(e.target.value)}
                  inputMode="numeric"
                />
              </div>
              <button type="submit" className="btn">
                Save plan
              </button>
            </form>
            <form className="row" onSubmit={saveUsed}>
              <div className="field" style={{ flex: 1 }}>
                <label>Used so far (RWF)</label>
                <input
                  value={usedDraft}
                  onChange={(e) => setUsedDraft(e.target.value)}
                  inputMode="numeric"
                />
              </div>
              <button type="submit" className="btn ghost">
                Save used
              </button>
            </form>
          </div>
        )}

        <h4 style={{ marginBottom: '0.35rem' }}>Funding sources</h4>
        {(steward?.fundingPlan ?? []).length === 0 ? (
          <p className="muted">No sources yet.</p>
        ) : (
          <ul className="steward-list">
            {(steward?.fundingPlan ?? []).map((f) => (
              <li key={f.id}>
                <div>
                  <strong>{f.label}</strong>{' '}
                  <span className="muted">
                    · {SOURCE_TYPE_LABELS[f.sourceType]} · {formatRwf(f.amount)}
                  </span>
                  <span className={`badge ${f.status === 'CONFIRMED' ? '' : 'planned'}`}>
                    {f.status}
                  </span>
                  {f.fundId && (
                    <span className="muted">
                      {' '}
                      · {financeService.getFund(f.fundId)?.code ?? f.fundId}
                    </span>
                  )}
                </div>
                {canEdit && !closed && f.status === 'INTENDED' && (
                  <div className="row">
                    {confirmId === f.id ? (
                      <>
                        <select
                          value={confirmFund}
                          onChange={(e) => setConfirmFund(e.target.value)}
                        >
                          <option value="">Fund…</option>
                          {funds.map((fund) => (
                            <option key={fund.id} value={fund.id}>
                              {fund.code} — {fund.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="btn"
                          onClick={() => doConfirmSource(f.id)}
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          className="btn ghost"
                          onClick={() => setConfirmId(null)}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => {
                          setConfirmId(f.id);
                          setConfirmFund(f.fundId || defaultFundId || '');
                        }}
                      >
                        Confirm allocation
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {canEdit && !closed && (
          <div className="stack" style={{ marginTop: '0.75rem' }}>
            <form className="stack" onSubmit={addIntended}>
              <p className="muted" style={{ margin: 0 }}>
                Add intended source
              </p>
              <div className="row">
                <select
                  value={srcType}
                  onChange={(e) =>
                    setSrcType(e.target.value as FundingSourceType)
                  }
                >
                  {(Object.keys(SOURCE_TYPE_LABELS) as FundingSourceType[]).map(
                    (k) => (
                      <option key={k} value={k}>
                        {SOURCE_TYPE_LABELS[k]}
                      </option>
                    ),
                  )}
                </select>
                <input
                  placeholder="Label"
                  value={srcLabel}
                  onChange={(e) => setSrcLabel(e.target.value)}
                />
                <input
                  placeholder="Amount"
                  value={srcAmount}
                  onChange={(e) => setSrcAmount(e.target.value)}
                  inputMode="numeric"
                  style={{ maxWidth: '8rem' }}
                />
                <button type="submit" className="btn ghost">
                  Add intended
                </button>
              </div>
            </form>
            <form className="stack" onSubmit={addConfirmedAlloc}>
              <p className="muted" style={{ margin: 0 }}>
                Record confirmed allocation (manual)
              </p>
              <div className="row">
                <select
                  value={allocType}
                  onChange={(e) =>
                    setAllocType(e.target.value as FundingSourceType)
                  }
                >
                  {(Object.keys(SOURCE_TYPE_LABELS) as FundingSourceType[]).map(
                    (k) => (
                      <option key={k} value={k}>
                        {SOURCE_TYPE_LABELS[k]}
                      </option>
                    ),
                  )}
                </select>
                <input
                  placeholder="Label"
                  value={allocLabel}
                  onChange={(e) => setAllocLabel(e.target.value)}
                />
                <input
                  placeholder="Amount"
                  value={allocAmount}
                  onChange={(e) => setAllocAmount(e.target.value)}
                  inputMode="numeric"
                  style={{ maxWidth: '8rem' }}
                />
                <select
                  value={allocFund}
                  onChange={(e) => setAllocFund(e.target.value)}
                >
                  <option value="">Fund…</option>
                  {funds.map((fund) => (
                    <option key={fund.id} value={fund.id}>
                      {fund.code}
                    </option>
                  ))}
                </select>
                <button type="submit" className="btn">
                  Confirm now
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      <div className="panel">
        <h3>Delivery</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Required defines integrity; planned is this season; possible is
          parking lot. Close needs all required done or waived.
        </p>
        {openRequired.length > 0 && !closed && (
          <p className="steward-banner warn">
            {openRequired.length} required item(s) still open — blocks close
            unless waived or forced.
          </p>
        )}
        {(['REQUIRED', 'PLANNED', 'POSSIBLE'] as DeliveryItemTier[]).map(
          (tier) => {
            const items = byTier(tier);
            return (
              <div key={tier} style={{ marginTop: '0.75rem' }}>
                <h4 style={{ margin: '0 0 0.35rem' }}>
                  {tier} ({items.length})
                </h4>
                {items.length === 0 ? (
                  <p className="muted" style={{ margin: 0 }}>
                    None
                  </p>
                ) : (
                  <ul className="steward-list">
                    {items.map((d) => (
                      <li key={d.id}>
                        <div>
                          <strong>{d.title}</strong>{' '}
                          <span className="muted">
                            · {d.kind} · {d.status}
                          </span>
                          {d.waiveNote && (
                            <span className="muted"> — {d.waiveNote}</span>
                          )}
                        </div>
                        {canEdit && !closed && d.status === 'TODO' && (
                          <div className="row">
                            <button
                              type="button"
                              className="btn ghost"
                              onClick={() => markDone(d.id)}
                            >
                              Done
                            </button>
                            <button
                              type="button"
                              className="btn ghost"
                              onClick={() => setWaiveId(d.id)}
                            >
                              Waive
                            </button>
                            {tier === 'POSSIBLE' && (
                              <button
                                type="button"
                                className="btn ghost"
                                onClick={() => {
                                  missionService.promoteDeliveryItem(
                                    kind,
                                    id,
                                    d.id,
                                  );
                                  setLocalMsg('Promoted to PLANNED');
                                  onChanged();
                                }}
                              >
                                Promote → planned
                              </button>
                            )}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          },
        )}

        {canEdit && !closed && (
          <form className="row" style={{ marginTop: '0.75rem' }} onSubmit={addDelivery}>
            <select
              value={delTier}
              onChange={(e) => setDelTier(e.target.value as DeliveryItemTier)}
            >
              <option value="REQUIRED">Required</option>
              <option value="PLANNED">Planned</option>
              <option value="POSSIBLE">Possible</option>
            </select>
            <select
              value={delKind}
              onChange={(e) => setDelKind(e.target.value as DeliveryItemKind)}
            >
              <option value="ACTIVITY">Activity</option>
              <option value="EVENT">Event</option>
            </select>
            <input
              placeholder="Title"
              value={delTitle}
              onChange={(e) => setDelTitle(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn ghost" disabled={!delTitle.trim()}>
              Add
            </button>
          </form>
        )}
      </div>

      <StewardshipOpsPanel
        kind={kind}
        id={id}
        canEdit={canEdit}
        personId={personId}
        defaultFundId={defaultFundId}
        onChanged={onChanged}
      />

      {steward?.closeout && (
        <div className="panel">
          <h3>Close-out report</h3>
          <p>
            <strong>Work:</strong> {steward.closeout.workSummary}
          </p>
          <p>
            <strong>Money:</strong> {steward.closeout.moneySummary}
          </p>
          <p>
            <strong>Leftover:</strong>{' '}
            {LEFTOVER_LABELS[steward.closeout.leftoverDecision]}
            {steward.closeout.leftoverNote
              ? ` — ${steward.closeout.leftoverNote}`
              : ''}
          </p>
          {steward.closeout.narrative && (
            <p>
              <strong>Narrative:</strong> {steward.closeout.narrative}
            </p>
          )}
          <p className="muted">
            Snapshots — planned{' '}
            {formatRwf(steward.closeout.plannedCostSnapshot ?? 0)}, used{' '}
            {formatRwf(steward.closeout.usedCostSnapshot ?? 0)}, confirmed{' '}
            {formatRwf(steward.closeout.confirmedFundingSnapshot ?? 0)}
          </p>
        </div>
      )}

      <Drawer
        open={!!waiveId}
        title="Waive required / planned item"
        onClose={() => setWaiveId(null)}
      >
        <form className="stack" onSubmit={submitWaive}>
          <div className="field">
            <label>Reason (required)</label>
            <textarea
              rows={3}
              value={waiveNote}
              onChange={(e) => setWaiveNote(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn">
            Record waiver
          </button>
        </form>
      </Drawer>

      <Drawer
        open={closeOpen}
        title={kind === 'PROGRAM' ? 'End program — close-out' : 'Mark DONE — close-out'}
        onClose={() => onCloseOpenChange?.(false)}
        wide
      >
        <form className="stack" onSubmit={submitClose}>
          <p className="muted" style={{ marginTop: 0 }}>
            Required delivery must be done or waived. Enter final used cost,
            leftover decision, and short honesty for board/diaspora.
          </p>
          {openRequired.length > 0 && (
            <div className="steward-banner warn">
              {openRequired.length} required still open:{' '}
              {openRequired.map((d) => d.title).join(', ')}
            </div>
          )}
          {openTaskCount > 0 && (
            <div className="steward-banner warn">
              {openTaskCount} open task(s) linked to this project.
            </div>
          )}
          <div className="field">
            <label>Final used cost (RWF)</label>
            <input
              value={closeUsed}
              onChange={(e) => setCloseUsed(e.target.value)}
              inputMode="numeric"
            />
          </div>
          <div className="field">
            <label>Work summary (planned vs done)</label>
            <textarea
              rows={2}
              value={workSummary}
              onChange={(e) => setWorkSummary(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>Money summary (used vs planned / sources)</label>
            <textarea
              rows={2}
              value={moneySummary}
              onChange={(e) => setMoneySummary(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>Leftover decision</label>
            <select
              value={leftover}
              onChange={(e) => setLeftover(e.target.value as LeftoverDecision)}
            >
              {(Object.keys(LEFTOVER_LABELS) as LeftoverDecision[]).map((k) => (
                <option key={k} value={k}>
                  {LEFTOVER_LABELS[k]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Leftover note (optional)</label>
            <input
              value={leftoverNote}
              onChange={(e) => setLeftoverNote(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Short narrative (optional)</label>
            <textarea
              rows={2}
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
            />
          </div>
          {(openRequired.length > 0 || openTaskCount > 0) && (
            <label className="row">
              <input
                type="checkbox"
                checked={forceClose}
                onChange={(e) => setForceClose(e.target.checked)}
              />
              Force close despite open required / tasks
            </label>
          )}
          <div className="row">
            <button type="submit" className="btn">
              {kind === 'PROGRAM' ? 'End with report' : 'Mark DONE with report'}
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => onCloseOpenChange?.(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
