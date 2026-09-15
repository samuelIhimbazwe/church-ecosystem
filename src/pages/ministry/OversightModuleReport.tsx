import { Link } from 'react-router-dom';
import type { SystemId } from '../../domain/types';
import { systemsService } from '../../services';

const MODULE_BLURB: Record<string, string> = {
  people: 'Headcount, sections, and roster balance — not edit tools.',
  members: 'Membership summary for this system.',
  families: 'Family / household coverage summary.',
  repertoire: 'Repertoire status overview.',
  sections: 'Section fill and gaps.',
  rehearsals: 'Upcoming rehearsals and attendance trends.',
  roster: 'Duty coverage and open slots.',
  programs: 'Program status and delivery risk.',
  events: 'Upcoming events and readiness.',
  tasks: 'Open vs done task counts.',
  projects: 'Project progress summary.',
  cases: 'Care case volume (summary only).',
  visits: 'Visit activity summary.',
  schedule: 'Schedule coverage overview.',
  calendar: 'Calendar density overview.',
  teams: 'Team staffing summary.',
  mission: 'Mission board health.',
  home: 'System pulse.',
};

/**
 * Reports-first surface for Itorero oversight visitors inside a peer system.
 * Real ops pages stay for members/officers; assets/reports pass through the shell.
 */
export function OversightModuleReport({
  systemId,
  basePath,
  moduleKey,
  roleLabel,
}: {
  systemId: SystemId;
  basePath: string;
  moduleKey: string;
  roleLabel?: string;
}) {
  const system = systemsService.getById(systemId);
  const title =
    moduleKey === 'home'
      ? 'Home'
      : moduleKey.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const blurb =
    MODULE_BLURB[moduleKey] ??
    'Summary report for Itorero oversight — not member operations.';

  return (
    <div className="panel stack">
      <div>
        <p className="label" style={{ margin: 0 }}>
          Itorero oversight · reports view
          {roleLabel ? ` · ${roleLabel}` : ''}
        </p>
        <h2 style={{ margin: '0.35rem 0 0', fontFamily: 'var(--font-display)' }}>
          {title}
        </h2>
        <p className="muted" style={{ margin: '0.35rem 0 0' }}>
          {system?.name ?? systemId} — {blurb}
        </p>
      </div>
      <div
        className="panel"
        style={{
          margin: 0,
          background: 'var(--accent-soft)',
          borderColor: 'color-mix(in srgb, var(--accent) 25%, var(--line))',
        }}
      >
        <p style={{ margin: 0 }}>
          Detailed charts and published packs from the president or vice will
          appear here. Live edit queues stay with ministry officers.
        </p>
      </div>
      <div className="row" style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
        <Link className="btn ghost" to={`${basePath}/assets`}>
          View assets register
        </Link>
        <Link className="btn ghost" to={`${basePath}/reports`}>
          Shared / assistance reports
        </Link>
        <Link className="btn ghost" to={basePath}>
          System home
        </Link>
      </div>
    </div>
  );
}
