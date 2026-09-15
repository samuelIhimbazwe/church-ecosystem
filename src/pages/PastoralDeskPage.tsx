import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { isChurchLeader, isCatechist, isOrdainedPastor } from '../domain/churchLeadership';
import { pastoralOpsService } from '../services/pastoralOpsService';
import { peopleService } from '../services';

function nameOf(id: string) {
  return (
    peopleService.getById(id)?.preferredName ||
    peopleService.getById(id)?.fullName ||
    id
  );
}

/**
 * Church Leader pastoral desk: pathways, baptism name gate, discipline,
 * transfer-out letters, pulpit pipeline.
 */
export function PastoralDeskPage() {
  const { account, roles } = useAuth();
  const [tick, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);
  const leader = isChurchLeader(roles);
  const catechist = isCatechist(roles);
  const pastor = isOrdainedPastor(roles);
  const high = leader || catechist || pastor;

  const pathways = useMemo(
    () => pastoralOpsService.listPathways({ openOnly: true }),
    [tick],
  );
  const baptismReady = useMemo(
    () =>
      pastoralOpsService
        .listPathways({ kind: 'BAPTISM_TRACK' })
        .filter((p) => p.status !== 'WITHDRAWN' && p.status !== 'COMPLETED'),
    [tick],
  );
  const discipline = useMemo(
    () => pastoralOpsService.listDiscipline(),
    [tick],
  );
  const letters = useMemo(
    () => pastoralOpsService.listTransferLettersOut(),
    [tick],
  );
  const pulpit = useMemo(() => pastoralOpsService.listPulpit(), [tick]);

  const [msg, setMsg] = useState('');

  if (!account || !high) {
    return (
      <div className="panel">
        <h1>Pastoral desk</h1>
        <p className="muted">
          For Church Leader, pastors, and catechist — pathways, discipline,
          letters, and pulpit.
        </p>
        <Link to="/" className="btn secondary">
          Home
        </Link>
      </div>
    );
  }

  return (
    <div className="stack">
      {msg ? <p className="muted">{msg}</p> : null}

      <div className="panel stack">
        <h2 style={{ margin: 0 }}>Pathway list</h2>
        <p className="muted" style={{ margin: 0 }}>
          Separate from official members — transfer, baptism track, and other
          in-process people.
        </p>
        <table className="table">
          <thead>
            <tr>
              <th>Person</th>
              <th>Pathway</th>
              <th>Status</th>
              <th>Label</th>
            </tr>
          </thead>
          <tbody>
            {pathways.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link to={`/people/${p.personId}`}>{nameOf(p.personId)}</Link>
                </td>
                <td>{pastoralOpsService.PATHWAY_KIND_LABELS[p.kind]}</td>
                <td>{p.status}</td>
                <td>{p.label}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel stack">
        <h2 style={{ margin: 0 }}>Baptism names</h2>
        <p className="muted" style={{ margin: 0 }}>
          Catechist prepares · Church Leader must confirm every name before the
          rite.
        </p>
        <table className="table">
          <thead>
            <tr>
              <th>Person</th>
              <th>Status</th>
              <th>Leader confirm</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {baptismReady.map((p) => (
              <tr key={p.id}>
                <td>{nameOf(p.personId)}</td>
                <td>{p.status}</td>
                <td>
                  {p.leaderConfirmedByPersonId
                    ? `Confirmed · ${nameOf(p.leaderConfirmedByPersonId)}`
                    : 'Not yet'}
                </td>
                <td>
                  {leader && !p.leaderConfirmedByPersonId ? (
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        const r = pastoralOpsService.confirmBaptismName(
                          p.id,
                          account.personId,
                        );
                        setMsg(r.ok ? 'Name confirmed' : r.reason ?? 'Failed');
                        refresh();
                      }}
                    >
                      Confirm name
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel stack">
        <h2 style={{ margin: 0 }}>Discipline</h2>
        <p className="muted" style={{ margin: 0 }}>
          Pastors / catechist may start · final standing needs Church Leader.
        </p>
        <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
          {discipline.map((c) => (
            <li key={c.id} style={{ marginBottom: '0.5rem' }}>
              <strong>{c.title}</strong> · {nameOf(c.personId)} · {c.status}
              <div className="muted" style={{ fontSize: '0.85rem' }}>
                {c.summary}
              </div>
              {c.status === 'OPEN' && (pastor || catechist || leader) ? (
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => {
                    pastoralOpsService.submitDisciplineForLeader(c.id);
                    refresh();
                  }}
                >
                  Send to Leader
                </button>
              ) : null}
              {c.status === 'AWAITING_LEADER' && leader ? (
                <div className="row" style={{ marginTop: '0.35rem' }}>
                  <button
                    type="button"
                    className="btn sm"
                    onClick={() => {
                      pastoralOpsService.resolveDiscipline(
                        c.id,
                        account.personId,
                        {
                          finalStanding: 'RESTORED',
                          mayServe: true,
                          mayTakeCommunion: true,
                        },
                      );
                      setMsg('Standing restored');
                      refresh();
                    }}
                  >
                    Restore
                  </button>
                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={() => {
                      pastoralOpsService.resolveDiscipline(
                        c.id,
                        account.personId,
                        {
                          finalStanding: 'RESTRICTED',
                          mayServe: false,
                          mayTakeCommunion: true,
                        },
                      );
                      setMsg('Standing restricted');
                      refresh();
                    }}
                  >
                    Restrict
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      <div className="panel stack">
        <h2 style={{ margin: 0 }}>Transfer letters out</h2>
        <p className="muted" style={{ margin: 0 }}>
          Church Leader only signs.
        </p>
        <table className="table">
          <thead>
            <tr>
              <th>Person</th>
              <th>Destination</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {letters.map((l) => (
              <tr key={l.id}>
                <td>{nameOf(l.personId)}</td>
                <td>{l.destinationChurch}</td>
                <td>{l.status}</td>
                <td>
                  {leader && l.status === 'AWAITING_LEADER' ? (
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        const r = pastoralOpsService.signTransferOut(
                          l.id,
                          account.personId,
                        );
                        setMsg(r.ok ? 'Letter signed' : r.reason ?? 'Failed');
                        refresh();
                      }}
                    >
                      Sign
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel stack">
        <h2 style={{ margin: 0 }}>Pulpit plan</h2>
        <p className="muted" style={{ margin: 0 }}>
          Evangelism prepares → Catechist reviews → Church Leader approves.
        </p>
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Service</th>
              <th>Preacher</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {pulpit.map((s) => (
              <tr key={s.id}>
                <td>{s.serviceDate}</td>
                <td>{s.serviceLabel}</td>
                <td>
                  {s.isGuest && s.guestName
                    ? s.guestName
                    : nameOf(s.preacherPersonId)}
                </td>
                <td>{s.status}</td>
                <td>
                  {catechist && s.status === 'CATECHIST_REVIEW' ? (
                    <button
                      type="button"
                      className="btn ghost sm"
                      onClick={() => {
                        pastoralOpsService.catechistReviewPulpit(
                          s.id,
                          account.personId,
                        );
                        refresh();
                      }}
                    >
                      Review OK
                    </button>
                  ) : null}
                  {leader && s.status === 'AWAITING_LEADER' ? (
                    <button
                      type="button"
                      className="btn sm"
                      onClick={() => {
                        pastoralOpsService.approvePulpit(
                          s.id,
                          account.personId,
                        );
                        setMsg('Pulpit approved');
                        refresh();
                      }}
                    >
                      Approve
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(catechist || leader) && (
          <PulpitPrepareForm
            actorId={account.personId}
            onDone={() => {
              setMsg('Pulpit slot prepared — awaiting catechist review');
              refresh();
            }}
          />
        )}
      </div>
    </div>
  );
}

function PulpitPrepareForm({
  actorId,
  onDone,
}: {
  actorId: string;
  onDone: () => void;
}) {
  const [date, setDate] = useState('2026-10-12');
  const [label, setLabel] = useState('Sunday SS1');
  const [preacherId, setPreacherId] = useState('p-assistant');

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    pastoralOpsService.preparePulpit({
      serviceDate: date,
      serviceLabel: label,
      preacherPersonId: preacherId,
      preparedByPersonId: actorId,
    });
    onDone();
  }

  return (
    <form className="stack" onSubmit={onSubmit} style={{ marginTop: '0.75rem' }}>
      <h3 style={{ margin: 0 }}>Prepare slot (Evangelism / ops)</h3>
      <div className="row" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Service label"
          required
        />
        <select
          value={preacherId}
          onChange={(e) => setPreacherId(e.target.value)}
        >
          {peopleService
            .list()
            .slice(0, 12)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.preferredName || p.fullName}
              </option>
            ))}
        </select>
        <button type="submit" className="btn">
          Submit for review
        </button>
      </div>
    </form>
  );
}
