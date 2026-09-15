import type {
  ChurchAssistanceReport,
  SharedReportPack,
  SystemId,
} from '../domain/types';

/** Seed: packs published to Itorero leaders + church assistance accountability. */
export let SHARED_REPORT_PACKS: SharedReportPack[] = [
  {
    id: 'srp-youth-q3',
    systemId: 'sys-youth',
    title: 'Youth Q3 ministry snapshot',
    summary:
      'Attendance and program delivery for Jul–Sep. Shared by Youth president for board follow-up.',
    highlights: [
      '3 active programs · 2 at risk of delay',
      'Career mentorship cohort at 78% attendance',
      'No open safeguarding incidents this quarter',
    ],
    publishedAt: '2026-09-01T10:00:00.000Z',
    publishedByPersonId: 'p-youth-leader',
    status: 'PUBLISHED',
  },
];

export let CHURCH_ASSISTANCE_REPORTS: ChurchAssistanceReport[] = [
  {
    id: 'car-youth-sound',
    systemId: 'sys-youth',
    amountRwf: 450_000,
    purpose: 'Portable PA support for outdoor youth outreach',
    whereSpent: 'Kacyiru youth outreach weekend · kit hire & transport',
    howSpent:
      'RWF 320k equipment hire · RWF 80k fuel/transport · RWF 50k printed materials',
    operations: 'Youth outdoor evangelism weekend (sys-youth / outreach event)',
    results: '2 outdoor gatherings held; ~180 youth reached; kit returned intact',
    impact:
      'Clearer proclamation outdoors; 12 first-time visitors linked to cell follow-up',
    assistedOn: '2026-08-10',
    reportedAt: '2026-08-25T14:00:00.000Z',
    reportedByPersonId: 'p-youth-leader',
    status: 'ACCEPTED',
  },
  {
    id: 'car-choir-vestments',
    systemId: 'sys-choir',
    amountRwf: 200_000,
    purpose: 'Partial support for choir vestment refresh',
    whereSpent: 'Approved tailor · Main Church choir loft inventory',
    howSpent: 'Fabric and sewing for 8 replacement robes',
    operations: 'Choir Sunday presentation readiness',
    results: '8 robes delivered and logged on choir asset register',
    impact: 'Uniform presentation restored for 2 named choirs sharing loft kit',
    assistedOn: '2026-07-01',
    reportedAt: '2026-07-20T09:30:00.000Z',
    reportedByPersonId: 'p-choir-pres',
    status: 'ACCEPTED',
  },
];

export function sharedPacksFor(systemId: SystemId): SharedReportPack[] {
  return SHARED_REPORT_PACKS.filter(
    (p) => p.systemId === systemId && p.status === 'PUBLISHED',
  );
}

export function assistanceReportsFor(
  systemId: SystemId,
): ChurchAssistanceReport[] {
  return CHURCH_ASSISTANCE_REPORTS.filter(
    (r) =>
      r.systemId === systemId &&
      (r.status === 'SUBMITTED' || r.status === 'ACCEPTED'),
  );
}

export function hasOversightFinanceArtifacts(systemId: SystemId): boolean {
  return (
    sharedPacksFor(systemId).length > 0 ||
    assistanceReportsFor(systemId).length > 0
  );
}
