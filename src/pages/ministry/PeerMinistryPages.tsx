import { Link } from 'react-router-dom';
import type { SystemId } from '../../domain/types';
import { getPeerCore } from '../../ministry/peerCoreSystems';
import { missionService } from '../../services';
import { MinistryHomeCard } from './MinistryShell';
import { MinistryMissionBoard } from './MinistryMissionBoard';

export function PeerMinistryHomePage({ systemId }: { systemId: SystemId }) {
  const cfg = getPeerCore(systemId);
  const programs = missionService.listPrograms({
    ownerSystemId: systemId,
    status: 'ACTIVE',
  });
  const events = missionService
    .listEvents()
    .filter((e) => e.ownerSystemId === systemId);
  const missionPath = cfg ? `/systems/${cfg.slug}/mission` : '/';

  return (
    <div className="stack">
      <MinistryHomeCard title={cfg?.title ?? 'Ministry System'}>
        <p className="muted" style={{ marginTop: 0 }}>
          {cfg?.blurb ??
            'Peer ministry system — programs, events, tasks, and projects.'}
        </p>
        <div className="row">
          <span className="badge">{programs.length} active programs</span>
          <span className="badge">{events.length} events</span>
        </div>
      </MinistryHomeCard>

      <div className="grid-2">
        <div className="panel">
          <h3>Active programs</h3>
          {programs.length === 0 ? (
            <p className="muted">None yet — create from the mission board.</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
              {programs.map((p) => (
                <li key={p.id}>
                  <strong>{p.name}</strong>
                  {p.scheduleHint ? (
                    <div className="muted">{p.scheduleHint}</div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="panel">
          <h3>Work here</h3>
          <div className="stack" style={{ gap: '0.5rem' }}>
            <Link to={missionPath}>
              Mission board — programs · events · tasks · projects
            </Link>
            <Link to={`${missionPath.replace(/\/mission$/, '')}/programs`}>
              Programs
            </Link>
            <Link to={`${missionPath.replace(/\/mission$/, '')}/events`}>
              Events
            </Link>
            <Link to={`${missionPath.replace(/\/mission$/, '')}/tasks`}>
              Tasks
            </Link>
            <Link to={`${missionPath.replace(/\/mission$/, '')}/projects`}>
              Projects
            </Link>
            <Link to={`${missionPath.replace(/\/mission$/, '')}/finance`}>
              Finance kit — contributions · donations · budgets · assets
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PeerMinistryMissionPage({ systemId }: { systemId: SystemId }) {
  const cfg = getPeerCore(systemId);
  return (
    <MinistryMissionBoard
      systemId={systemId}
      title={cfg?.missionTitle ?? 'Mission board'}
    />
  );
}
