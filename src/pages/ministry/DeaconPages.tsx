import { type FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import type { CareEscalateTo, WellbeingCategory } from '../../domain/types';
import { deaconService, financeService, peopleService } from '../../services';
import { MinistryHomeCard } from './MinistryShell';

const SYS = 'sys-deacon' as const;

export function DeaconHomePage() {
  const { can, authorize, personName } = useAuth();
  const stats = deaconService.stats();
  const openCases = deaconService.listCases().filter((c) => c.status !== 'CLOSED');

  return (
    <div className="stack">
      <MinistryHomeCard title="Deacon System">
        <p className="muted" style={{ marginTop: 0 }}>
          Care cases, visits, and benevolence — private peer under Deacon
          Ministry. Protocol remains a separate system.
        </p>
        <div className="row">
          <span className="badge">{stats.rosterCount} on roster</span>
          <span className="badge">{stats.openCases} open cases</span>
          <span className="badge">{stats.visits} visits</span>
          {stats.pendingPayments > 0 && (
            <span className="badge planned">
              {stats.pendingPayments} pending gifts
            </span>
          )}
          <span className="badge">
            Fund {stats.fundBalance.toLocaleString()} RWF
          </span>
          <span className="badge">Signed in as {personName}</span>
        </div>
      </MinistryHomeCard>

      <div className="grid-2">
        <div className="panel">
          <h3>Open care cases</h3>
          {openCases.length === 0 ? (
            <p className="muted">None</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
              {openCases.slice(0, 4).map((c) => (
                <li key={c.id}>
                  <strong>{c.title}</strong>
                  <div className="muted">
                    {c.priority} · {c.status}
                    {c.personId
                      ? ` · ${deaconService.personLabel(c.personId)}`
                      : ''}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link to="/systems/deacon/cases">All cases →</Link>
        </div>
        <div className="panel">
          <h3>Quick links</h3>
          <div className="stack" style={{ gap: '0.5rem' }}>
            <Link to="/systems/deacon/roster">Roster</Link>
            <Link to="/systems/deacon/visits">Visits</Link>
            <Link to="/systems/deacon/finance">Finance</Link>
            <Link to="/systems/protocol">Protocol (sibling peer) →</Link>
          </div>
          {can('DEACON_CARE', 'MANAGE', SYS) && (
            <button
              type="button"
              className="btn"
              style={{ marginTop: '0.75rem' }}
              onClick={() => authorize('DEACON_CARE', 'MANAGE', SYS)}
            >
              Audit: manage care
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function DeaconRosterPage() {
  const { can } = useAuth();
  const canView = can('DEACON_ROSTER', 'VIEW', SYS);
  const roster = deaconService.listRoster(false);

  if (!canView) {
    return (
      <div className="panel">
        <h2>Roster</h2>
        <p className="muted">No DEACON_ROSTER / VIEW</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <h2>Deacon roster</h2>
      <p className="muted">Offices drive care and vault entitlements</p>
      <table className="table">
        <thead>
          <tr>
            <th>Person</th>
            <th>Office</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {roster.map((m) => (
            <tr key={m.id}>
              <td>{deaconService.personLabel(m.personId)}</td>
              <td>{deaconService.officeLabel(m.office)}</td>
              <td>
                <span
                  className={`badge ${m.status === 'INACTIVE' ? 'planned' : ''}`}
                >
                  {m.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DeaconCasesPage() {
  const { account, can, authorize, roles } = useAuth();
  const canView = can('DEACON_CARE', 'VIEW', SYS);
  const canManage = can('DEACON_CARE', 'MANAGE', SYS);
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);
  const cases = deaconService.listCases();
  const isLeader = roles.includes('CHURCH_LEADER');

  const [title, setTitle] = useState('');
  const [personId, setPersonId] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'NORMAL' | 'HIGH'>('NORMAL');
  const [category, setCategory] = useState<WellbeingCategory>('SICK');
  const [categoryDetail, setCategoryDetail] = useState('');
  const [privateNotes, setPrivateNotes] = useState('');
  const [sickLocation, setSickLocation] = useState<
    '' | 'HOSPITAL' | 'HOME' | 'OTHER'
  >('');
  const [escalateTo, setEscalateTo] = useState<CareEscalateTo | ''>(
    'CHURCH_LEADER',
  );
  const [formMsg, setFormMsg] = useState('');

  if (!canView) {
    return (
      <div className="panel">
        <h2>Care cases</h2>
        <p className="muted">No DEACON_CARE / VIEW</p>
      </div>
    );
  }

  function onOpen(e: FormEvent) {
    e.preventDefault();
    if (!canManage || !account) return;
    authorize('DEACON_CARE', 'MANAGE', SYS);
    const r = deaconService.submitCase({
      title,
      personId: personId || undefined,
      priority,
      category,
      categoryDetail: categoryDetail || undefined,
      privateNotes: privateNotes || undefined,
      sickLocation: sickLocation || undefined,
      escalateTo: escalateTo || undefined,
      submittedByPersonId: account.personId,
      submittedByRole: 'DEACON',
      assignedPersonId: account.personId,
    });
    if (!r.ok) {
      setFormMsg(r.reason);
      return;
    }
    setTitle('');
    setPersonId('');
    setCategoryDetail('');
    setPrivateNotes('');
    setFormMsg('');
    refresh();
  }

  return (
    <div className="stack">
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Care cases</h2>
        <p className="muted">
          Submit → deacon leaders prioritize → escalate upward with status.
          Leader sees situation type, not private clinical notes.
        </p>
        {isLeader ? (
          <p className="muted" style={{ fontSize: '0.9rem' }}>
            Your upward view (summaries):{' '}
            {deaconService.listCasesForOversight('CHURCH_LEADER').length} case(s)
            escalated to Church Leader
          </p>
        ) : null}
        <table className="table">
          <thead>
            <tr>
              <th>Case</th>
              <th>Category</th>
              <th>Person / household</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Escalate</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => (
              <tr key={c.id}>
                <td>
                  <strong>{c.title}</strong>
                  <div className="muted" style={{ fontSize: '0.85rem' }}>
                    {c.summary}
                  </div>
                  {canManage && c.privateNotes ? (
                    <div className="muted" style={{ fontSize: '0.8rem' }}>
                      Private: {c.privateNotes}
                    </div>
                  ) : null}
                </td>
                <td>
                  {deaconService.WELLBEING_LABELS[c.category]}
                  {c.categoryDetail ? ` · ${c.categoryDetail}` : ''}
                </td>
                <td>
                  {c.personId
                    ? deaconService.personLabel(c.personId)
                    : c.householdNote || '—'}
                </td>
                <td>{c.priority}</td>
                <td>
                  <span
                    className={`badge ${c.status === 'CLOSED' ? 'planned' : ''}`}
                  >
                    {deaconService.CARE_STATUS_LABELS[c.status] ?? c.status}
                  </span>
                </td>
                <td>{c.escalateTo ?? '—'}</td>
                <td>
                  {canManage && c.status !== 'CLOSED' && (
                    <div className="row" style={{ gap: '0.35rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => {
                          deaconService.prioritizeCase(c.id, {
                            status: 'HANDLING',
                          });
                          refresh();
                        }}
                      >
                        Handling
                      </button>
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => {
                          deaconService.prioritizeCase(c.id, {
                            status: 'WILL_HANDLE',
                          });
                          refresh();
                        }}
                      >
                        Will handle
                      </button>
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => {
                          deaconService.updateCaseStatus(c.id, 'CLOSED');
                          refresh();
                        }}
                      >
                        Close
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canManage && (
        <div className="panel">
          <h3>Submit case</h3>
          <form className="stack" onSubmit={onOpen}>
            <div className="field">
              <label htmlFor="dtitle">Title</label>
              <input
                id="dtitle"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="dcat">Wellbeing category</label>
              <select
                id="dcat"
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as WellbeingCategory)
                }
              >
                {(
                  Object.keys(deaconService.WELLBEING_LABELS) as WellbeingCategory[]
                )
                  .filter((k) => k !== 'NORMAL')
                  .map((k) => (
                    <option key={k} value={k}>
                      {deaconService.WELLBEING_LABELS[k]}
                    </option>
                  ))}
              </select>
            </div>
            {(category === 'OTHER_ISSUE' || category === 'BREAKTHROUGH') && (
              <div className="field">
                <label htmlFor="ddetail">Name it</label>
                <input
                  id="ddetail"
                  value={categoryDetail}
                  onChange={(e) => setCategoryDetail(e.target.value)}
                  required
                />
              </div>
            )}
            {category === 'SICK' && (
              <div className="field">
                <label htmlFor="dloc">Where</label>
                <select
                  id="dloc"
                  value={sickLocation}
                  onChange={(e) =>
                    setSickLocation(
                      e.target.value as '' | 'HOSPITAL' | 'HOME' | 'OTHER',
                    )
                  }
                >
                  <option value="">—</option>
                  <option value="HOSPITAL">Hospital</option>
                  <option value="HOME">Home</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            )}
            <div className="field">
              <label htmlFor="dperson">Person (optional)</label>
              <select
                id="dperson"
                value={personId}
                onChange={(e) => setPersonId(e.target.value)}
              >
                <option value="">— household only —</option>
                {peopleService.list().map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="dpri">Priority</label>
              <select
                id="dpri"
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value as 'LOW' | 'NORMAL' | 'HIGH')
                }
              >
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="desc">Escalate to</label>
              <select
                id="desc"
                value={escalateTo}
                onChange={(e) =>
                  setEscalateTo(e.target.value as CareEscalateTo | '')
                }
              >
                <option value="">— after prioritizing —</option>
                <option value="CATECHIST">Catechist</option>
                <option value="PASTOR">Pastor</option>
                <option value="CHURCH_LEADER">Church Leader</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="dnotes">Private notes (not for Leader view)</label>
              <textarea
                id="dnotes"
                value={privateNotes}
                onChange={(e) => setPrivateNotes(e.target.value)}
                rows={2}
              />
            </div>
            {formMsg ? <p className="error">{formMsg}</p> : null}
            <button type="submit" className="btn">
              Submit case
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export function DeaconVisitsPage() {
  const { account, can, authorize } = useAuth();
  const canView = can('DEACON_CARE', 'VIEW', SYS);
  const canManage = can('DEACON_CARE', 'MANAGE', SYS);
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);
  const visits = deaconService.listVisits();
  const openCases = deaconService
    .listCases()
    .filter((c) => c.status !== 'CLOSED');

  const [caseId, setCaseId] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [visitedOn, setVisitedOn] = useState(
    () => new Date().toISOString().slice(0, 10),
  );

  if (!canView) {
    return (
      <div className="panel">
        <h2>Visits</h2>
        <p className="muted">No DEACON_CARE / VIEW</p>
      </div>
    );
  }

  function onVisit(e: FormEvent) {
    e.preventDefault();
    if (!canManage || !account) return;
    authorize('DEACON_CARE', 'MANAGE', SYS);
    const c = caseId ? deaconService.getCase(caseId) : null;
    deaconService.recordVisit({
      caseId: caseId || undefined,
      personId: c?.personId,
      visitedOn,
      visitorPersonId: account.personId,
      location: location || undefined,
      notes: notes || undefined,
    });
    setNotes('');
    setLocation('');
    refresh();
  }

  return (
    <div className="stack">
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Visits</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Visitor</th>
              <th>Person</th>
              <th>Location</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {visits.map((v) => (
              <tr key={v.id}>
                <td>{v.visitedOn}</td>
                <td>{deaconService.personLabel(v.visitorPersonId)}</td>
                <td>
                  {v.personId ? deaconService.personLabel(v.personId) : '—'}
                </td>
                <td>{v.location ?? '—'}</td>
                <td>{v.notes ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canManage && (
        <div className="panel">
          <h3>Record visit</h3>
          <form className="stack" onSubmit={onVisit}>
            <div className="field">
              <label htmlFor="vcase">Linked case</label>
              <select
                id="vcase"
                value={caseId}
                onChange={(e) => setCaseId(e.target.value)}
              >
                <option value="">— none —</option>
                {openCases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="vdate">Date</label>
              <input
                id="vdate"
                type="date"
                value={visitedOn}
                onChange={(e) => setVisitedOn(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="vloc">Location</label>
              <input
                id="vloc"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="vnotes">Notes</label>
              <textarea
                id="vnotes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
            <button type="submit" className="btn">
              Save visit
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export function DeaconFinancePage() {
  const { account, can, authorize, roles } = useAuth();
  const isLeader = roles.includes('CHURCH_LEADER');
  const canView = can('DEACON_FINANCE', 'VIEW', SYS);
  const canManage = can('DEACON_FINANCE', 'MANAGE', SYS);
  const fundOk =
    account &&
    financeService.authorizeFund(account.personId, 'fund-deacon', 'MANAGE')
      .allowed;
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);
  const pending = deaconService.listContributions({ status: 'PENDING' });
  const expenses = deaconService.listExpenses();
  const balance = financeService.balance('fund-deacon');

  const [expCat, setExpCat] = useState('Benevolence');
  const [expAmt, setExpAmt] = useState('10000');
  const [expDesc, setExpDesc] = useState('');
  const [msg, setMsg] = useState('');

  if (!canView) {
    return (
      <div className="panel">
        <h2>Finance</h2>
        <p className="muted">No DEACON_FINANCE / VIEW</p>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Deacon fund</h2>
        <div className="row">
          <span className="badge">{balance.toLocaleString()} RWF</span>
          <Link to="/systems/deacon/finance">Open ledger →</Link>
          <Link to="/systems/deacon/my-contributions">My contributions →</Link>
        </div>
      </div>

      <div className="panel">
        <h3>Pending contributions</h3>
        {pending.length === 0 ? (
          <p className="muted">None</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Person</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Date</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pending.map((c) => (
                <tr key={c.id}>
                  <td>{deaconService.personLabel(c.personId)}</td>
                  <td>{c.amount.toLocaleString()}</td>
                  <td>{c.paymentMethod}</td>
                  <td>{c.occurredOn}</td>
                  <td>
                    {canManage && fundOk && account && (
                      <div className="row">
                        <button
                          type="button"
                          className="btn"
                          onClick={async () => {
                            authorize('DEACON_FINANCE', 'MANAGE', SYS);
                            const r = await deaconService.verifyContributionHybrid({
                              contributionId: c.id,
                              actorPersonId: account.personId,
                              status: 'CONFIRMED',
                            });
                            setMsg(r.ok ? 'Verified' : r.reason ?? 'Failed');
                            refresh();
                          }}
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          className="btn ghost"
                          onClick={async () => {
                            await deaconService.verifyContributionHybrid({
                              contributionId: c.id,
                              actorPersonId: account.personId,
                              status: 'DECLINED',
                            });
                            refresh();
                          }}
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {msg && <p className="muted">{msg}</p>}
      </div>

      <div className="panel">
        <h3>Expenses</h3>
        <p className="muted" style={{ fontSize: '0.9rem' }}>
          Care spending needs Church Leader approval — wait for him (no
          act-then-report).
        </p>
        <table className="table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Amount</th>
              <th>Description</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id}>
                <td>{e.category}</td>
                <td>{e.amount.toLocaleString()}</td>
                <td>{e.description}</td>
                <td>{e.status}</td>
                <td>
                  {account && e.status === 'PENDING' && (
                    <div className="row">
                      {isLeader ? (
                        <button
                          type="button"
                          className="btn"
                          onClick={() => {
                            const r = deaconService.approveExpense(
                              e.id,
                              account.personId,
                              true,
                            );
                            setMsg(r.ok ? 'Approved' : r.reason ?? 'Failed');
                            refresh();
                          }}
                        >
                          Approve (Leader)
                        </button>
                      ) : null}
                      {canManage ? (
                        <button
                          type="button"
                          className="btn ghost"
                          onClick={() => {
                            deaconService.approveExpense(
                              e.id,
                              account.personId,
                              false,
                            );
                            refresh();
                          }}
                        >
                          Reject
                        </button>
                      ) : null}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {canManage && account && (
          <form
            className="stack"
            style={{ marginTop: '1rem' }}
            onSubmit={(e) => {
              e.preventDefault();
              deaconService.submitExpense({
                category: expCat,
                amount: Number(expAmt),
                occurredOn: new Date().toISOString().slice(0, 10),
                description: expDesc,
                recordedByPersonId: account.personId,
              });
              setExpDesc('');
              refresh();
            }}
          >
            <h4 style={{ margin: 0 }}>Submit expense</h4>
            <div className="field">
              <label htmlFor="ecat">Category</label>
              <input
                id="ecat"
                value={expCat}
                onChange={(ev) => setExpCat(ev.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="eamt">Amount</label>
              <input
                id="eamt"
                type="number"
                value={expAmt}
                onChange={(ev) => setExpAmt(ev.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="edesc">Description</label>
              <input
                id="edesc"
                value={expDesc}
                onChange={(ev) => setExpDesc(ev.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn">
              Submit
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export function DeaconMyContributionsPage() {
  const { account } = useAuth();
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);
  const [amount, setAmount] = useState('5000');
  const [method, setMethod] = useState<'CASH' | 'MOMO' | 'BANK'>('MOMO');
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');

  if (!account) return null;

  const mine = deaconService.listContributions({ personId: account.personId });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await deaconService.submitContributionHybrid({
      personId: account!.personId,
      amount: Number(amount),
      paymentMethod: method,
      occurredOn: new Date().toISOString().slice(0, 10),
      note: note || undefined,
    });
    setMsg('Claim submitted — treasurer must verify');
    setNote('');
    refresh();
  }

  return (
    <div className="stack">
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>My contributions</h2>
        <p className="muted">Claims post to fund-deacon only after verify</p>
        <form className="stack" onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="amt">Amount</label>
            <input
              id="amt"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="meth">Method</label>
            <select
              id="meth"
              value={method}
              onChange={(e) =>
                setMethod(e.target.value as 'CASH' | 'MOMO' | 'BANK')
              }
            >
              <option value="CASH">Cash</option>
              <option value="MOMO">MoMo</option>
              <option value="BANK">Bank</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="note">Note</label>
            <input
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <button type="submit" className="btn">
            Submit claim
          </button>
          {msg && <p className="muted">{msg}</p>}
        </form>
      </div>
      <div className="panel">
        <h3>History</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {mine.map((c) => (
              <tr key={c.id}>
                <td>{c.occurredOn}</td>
                <td>{c.amount.toLocaleString()}</td>
                <td>{c.status}</td>
                <td>{c.note ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
