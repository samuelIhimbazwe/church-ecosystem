import type {
  ChoirAsset,
  ChoirBudget,
  ChoirBudgetLine,
  ChoirCampaignGift,
  ChoirContribution,
  ChoirContributionDrive,
  ChoirContributionGoal,
  ChoirContributionType,
  ChoirDonation,
  ChoirDutySlot,
  ChoirExpenseRecord,
  ChoirFollowUp,
  ChoirFundraisingCampaign,
  ChoirIncomeRecord,
  ChoirLiability,
  ChoirPaymentMethodConfig,
  ChoirRehearsal,
  ChoirRosterMember,
  ChoirSectionSeat,
  ChoirSong,
  ChoirSponsor,
  ChoirSponsorship,
  ChoirTeam,
  ChoirTeamMember,
} from '../domain/types';
import type {
  ChoirContributionEvent,
  ChoirContribNotification,
  ChoirContributionHandoff,
  ChoirFamilyPaymentRail,
  ChoirOfficePaymentRail,
} from '../domain/choirContributionPipeline';

const IJWI = 'ou-choir-ijwi';
const HOPE = 'ou-choir-hope';

export const CHOIR_SONGS: ChoirSong[] = [
  {
    id: 'song-amazing',
    orgUnitId: IJWI,
    title: 'Amazing Grace',
    composer: 'Traditional',
    language: 'English',
    status: 'READY',
  },
  {
    id: 'song-ni-mwari',
    orgUnitId: IJWI,
    title: 'Ni Mwari',
    language: 'Kinyarwanda',
    status: 'READY',
    notes: 'Concert opener',
  },
  {
    id: 'song-hallelujah',
    orgUnitId: IJWI,
    title: 'Hallelujah Chorus (excerpt)',
    composer: 'Handel',
    language: 'English',
    status: 'LEARNING',
  },
  {
    id: 'song-yesu',
    orgUnitId: IJWI,
    title: 'Yesu Ni Umwami',
    language: 'Kinyarwanda',
    status: 'LEARNING',
  },
  {
    id: 'song-old',
    orgUnitId: IJWI,
    title: 'Old concert piece',
    status: 'ARCHIVED',
  },
  {
    id: 'song-hope-1',
    orgUnitId: HOPE,
    title: 'Hope in Christ',
    language: 'Kinyarwanda',
    status: 'READY',
  },
  {
    id: 'song-hope-2',
    orgUnitId: HOPE,
    title: 'Nzahimbaza',
    language: 'Kinyarwanda',
    status: 'LEARNING',
  },
];

export const CHOIR_SEATS: ChoirSectionSeat[] = [
  {
    id: 'seat-eric-tenor',
    orgUnitId: IJWI,
    personId: 'p-choir-leader',
    section: 'TENOR',
    status: 'ACTIVE',
  },
  {
    id: 'seat-patrick-bass',
    orgUnitId: IJWI,
    personId: 'p-member',
    section: 'BASS',
    status: 'ACTIVE',
  },
  {
    id: 'seat-grace-alto',
    orgUnitId: IJWI,
    personId: 'p-secretary',
    section: 'ALTO',
    status: 'ACTIVE',
  },
  {
    id: 'seat-aline-soprano',
    orgUnitId: IJWI,
    personId: 'p-youth-leader',
    section: 'SOPRANO',
    status: 'INACTIVE',
  },
  {
    id: 'seat-hope-leader',
    orgUnitId: HOPE,
    personId: 'p-hope-leader',
    section: 'TENOR',
    status: 'ACTIVE',
  },
];

export const CHOIR_REHEARSALS: ChoirRehearsal[] = [
  {
    id: 'reh-2026-09-13',
    orgUnitId: IJWI,
    title: 'Weekly rehearsal',
    startsAt: '2026-09-13T15:00:00',
    endsAt: '2026-09-13T17:00:00',
    location: 'Choir loft',
    songIds: ['song-ni-mwari', 'song-hallelujah'],
    notes: 'Focus on blend in altos',
  },
  {
    id: 'reh-2026-09-20',
    orgUnitId: IJWI,
    title: 'Weekly rehearsal',
    startsAt: '2026-09-20T15:00:00',
    endsAt: '2026-09-20T17:00:00',
    location: 'Choir loft',
    songIds: ['song-amazing', 'song-yesu'],
  },
  {
    id: 'reh-2026-11-15',
    orgUnitId: IJWI,
    title: 'Concert dress rehearsal',
    startsAt: '2026-11-15T14:00:00',
    endsAt: '2026-11-15T17:00:00',
    location: 'Main sanctuary',
    songIds: ['song-ni-mwari', 'song-amazing', 'song-hallelujah', 'song-yesu'],
  },
  {
    id: 'reh-hope-2026-09-14',
    orgUnitId: HOPE,
    title: 'Hope weekly rehearsal',
    startsAt: '2026-09-14T16:00:00',
    endsAt: '2026-09-14T18:00:00',
    location: 'Hope hall',
    songIds: ['song-hope-1'],
  },
];

export const CHOIR_DUTIES: ChoirDutySlot[] = [
  {
    id: 'duty-concert-conductor',
    orgUnitId: IJWI,
    label: 'Thanksgiving Concert',
    eventId: 'evt-choir-concert-2026',
    serviceDate: '2026-11-22',
    role: 'CONDUCTOR',
    personId: 'p-choir-leader',
    status: 'CONFIRMED',
  },
  {
    id: 'duty-concert-solo',
    orgUnitId: IJWI,
    label: 'Thanksgiving Concert',
    eventId: 'evt-choir-concert-2026',
    serviceDate: '2026-11-22',
    role: 'SOLOIST',
    personId: 'p-secretary',
    status: 'ASSIGNED',
  },
  {
    id: 'duty-concert-usher',
    orgUnitId: IJWI,
    label: 'Thanksgiving Concert',
    eventId: 'evt-choir-concert-2026',
    serviceDate: '2026-11-22',
    role: 'USHER',
    personId: 'p-member',
    status: 'ASSIGNED',
  },
  {
    id: 'duty-sunday-section',
    orgUnitId: IJWI,
    label: 'Sunday service',
    serviceDate: '2026-09-14',
    role: 'SECTION_LEAD',
    personId: 'p-choir-leader',
    status: 'DONE',
  },
];

/** Choir "families" = internal teams/squads. */
export const CHOIR_TEAMS: ChoirTeam[] = [
  {
    id: 'cteam-alpha',
    orgUnitId: IJWI,
    name: 'Family Alpha',
    code: 'ALPHA',
    leaderPersonId: 'p-member',
    viceLeaderPersonId: 'p-secretary',
    status: 'ACTIVE',
  },
  {
    id: 'cteam-beta',
    orgUnitId: IJWI,
    name: 'Family Beta',
    code: 'BETA',
    leaderPersonId: 'p-choir-pres',
    status: 'ACTIVE',
  },
];

export const CHOIR_TEAM_MEMBERS: ChoirTeamMember[] = [
  {
    id: 'ctm-patrick-alpha',
    teamId: 'cteam-alpha',
    personId: 'p-member',
    status: 'ACTIVE',
  },
  {
    id: 'ctm-grace-alpha',
    teamId: 'cteam-alpha',
    personId: 'p-secretary',
    status: 'ACTIVE',
  },
  {
    id: 'ctm-eric-beta',
    teamId: 'cteam-beta',
    personId: 'p-choir-leader',
    status: 'ACTIVE',
  },
  {
    id: 'ctm-pres-beta',
    teamId: 'cteam-beta',
    personId: 'p-choir-pres',
    status: 'ACTIVE',
  },
  {
    id: 'ctm-treas-beta',
    teamId: 'cteam-beta',
    personId: 'p-choir-treas',
    status: 'ACTIVE',
  },
];

export const CHOIR_ROSTER: ChoirRosterMember[] = [
  {
    id: 'crm-eric',
    orgUnitId: IJWI,
    personId: 'p-choir-leader',
    office: 'MUSIC_DIRECTOR',
    teamId: 'cteam-beta',
    status: 'ACTIVE',
  },
  {
    id: 'crm-pres',
    orgUnitId: IJWI,
    personId: 'p-choir-pres',
    office: 'PRESIDENT',
    teamId: 'cteam-beta',
    status: 'ACTIVE',
  },
  {
    id: 'crm-vp',
    orgUnitId: IJWI,
    personId: 'p-choir-vp',
    office: 'VP',
    status: 'ACTIVE',
  },
  {
    id: 'crm-treas',
    orgUnitId: IJWI,
    personId: 'p-choir-treas',
    office: 'TREASURER',
    teamId: 'cteam-beta',
    status: 'ACTIVE',
  },
  {
    id: 'crm-secretary',
    orgUnitId: IJWI,
    personId: 'p-secretary',
    office: 'SECRETARY',
    teamId: 'cteam-alpha',
    status: 'ACTIVE',
  },
  {
    id: 'crm-coord',
    orgUnitId: IJWI,
    personId: 'p-choir-coord',
    office: 'COORDINATOR',
    status: 'ACTIVE',
  },
  {
    id: 'crm-adv-spirit',
    orgUnitId: IJWI,
    personId: 'p-choir-adv-spirit',
    office: 'ADVISOR',
    advisorRole: 'Spiritual leader',
    status: 'ACTIVE',
  },
  {
    id: 'crm-adv-social',
    orgUnitId: IJWI,
    personId: 'p-choir-adv-social',
    office: 'ADVISOR',
    advisorRole: 'Social & outreach',
    status: 'ACTIVE',
  },
  {
    id: 'crm-patrick',
    orgUnitId: IJWI,
    personId: 'p-member',
    office: 'FAMILY_LEADER',
    teamId: 'cteam-alpha',
    status: 'ACTIVE',
  },
  {
    id: 'crm-hope-leader',
    orgUnitId: HOPE,
    personId: 'p-hope-leader',
    office: 'MUSIC_DIRECTOR',
    status: 'ACTIVE',
  },
];

export const CHOIR_CONTRIBUTION_TYPES: ChoirContributionType[] = [
  {
    id: 'cct-monthly',
    orgUnitId: IJWI,
    name: 'Monthly contribution',
    category: 'MEMBERSHIP',
    frequency: 'MONTHLY',
    defaultAmount: 5_000,
    active: true,
    memberVisible: true,
  },
  {
    id: 'cct-concert',
    orgUnitId: IJWI,
    name: 'Concert support',
    category: 'EVENT',
    frequency: 'EVENT',
    defaultAmount: 10_000,
    active: true,
    memberVisible: true,
  },
  {
    id: 'cct-uniform',
    orgUnitId: IJWI,
    name: 'Uniform fund',
    category: 'SPECIAL',
    frequency: 'ONCE',
    active: true,
    memberVisible: true,
  },
  {
    id: 'cct-hope-monthly',
    orgUnitId: HOPE,
    name: 'Hope monthly offering',
    category: 'MEMBERSHIP',
    frequency: 'MONTHLY',
    defaultAmount: 3_000,
    active: true,
    memberVisible: true,
  },
];

export const CHOIR_PAYMENT_METHODS: ChoirPaymentMethodConfig[] = [
  {
    id: 'cpm-momo',
    orgUnitId: IJWI,
    method: 'MOMO',
    label: 'Mobile money',
    active: true,
    memberVisible: true,
  },
  {
    id: 'cpm-cash',
    orgUnitId: IJWI,
    method: 'CASH',
    label: 'Cash',
    active: true,
    memberVisible: true,
  },
  {
    id: 'cpm-bank',
    orgUnitId: IJWI,
    method: 'BANK',
    label: 'Bank transfer',
    active: true,
    memberVisible: true,
  },
];

/** Timed member-contribution windows with scoped goals (kit). */
export let CHOIR_CONTRIBUTION_DRIVES: ChoirContributionDrive[] = [
  {
    id: 'cdrive-monthly-2026',
    orgUnitId: IJWI,
    systemId: 'sys-choir',
    name: 'Choir monthly 2026',
    typeId: 'cct-monthly',
    frequency: 'MONTHLY',
    startsOn: '2026-01-01',
    endsOn: '2026-12-31',
    status: 'ACTIVE',
    description: 'Standing monthly member contribution',
    ministryGoalPublic: false,
    createdByPersonId: 'p-choir-treas',
    createdAt: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'cdrive-concert-26',
    orgUnitId: IJWI,
    systemId: 'sys-choir',
    name: 'Concert support drive',
    typeId: 'cct-concert',
    frequency: 'EVENT',
    startsOn: '2026-09-01',
    endsOn: '2026-10-15',
    status: 'ACTIVE',
    description: 'Each member + family + whole choir targets for the concert',
    ministryGoalPublic: false,
    createdByPersonId: 'p-choir-treas',
    createdAt: '2026-09-01T08:00:00.000Z',
  },
];

export let CHOIR_CONTRIBUTION_GOALS: ChoirContributionGoal[] = [
  {
    id: 'cgoal-monthly-member',
    driveId: 'cdrive-monthly-2026',
    scope: 'MEMBER',
    targetAmount: 5_000,
    label: 'Each member · 5,000 / month',
  },
  {
    id: 'cgoal-monthly-ministry',
    driveId: 'cdrive-monthly-2026',
    scope: 'MINISTRY',
    targetAmount: 600_000,
    label: 'Whole choir · 600,000 / year',
  },
  {
    id: 'cgoal-concert-member',
    driveId: 'cdrive-concert-26',
    scope: 'MEMBER',
    targetAmount: 10_000,
    label: 'Each member · 10,000',
  },
  {
    id: 'cgoal-concert-team-a',
    driveId: 'cdrive-concert-26',
    scope: 'TEAM',
    teamId: 'cteam-alpha',
    targetAmount: 80_000,
    label: 'Family Alpha · 80,000',
  },
  {
    id: 'cgoal-concert-ministry',
    driveId: 'cdrive-concert-26',
    scope: 'MINISTRY',
    targetAmount: 250_000,
    label: 'Whole choir · 250,000',
  },
];

export let CHOIR_CONTRIBUTIONS: ChoirContribution[] = [
  {
    id: 'ccon-seed-1',
    orgUnitId: IJWI,
    personId: 'p-member',
    teamId: 'cteam-alpha',
    typeId: 'cct-monthly',
    driveId: 'cdrive-monthly-2026',
    amount: 5_000,
    paymentMethod: 'MOMO',
    familyRailId: 'cfrail-alpha-momo',
    occurredOn: '2026-09-01',
    status: 'PENDING',
    submittedAt: '2026-09-01T10:00:00.000Z',
    note: 'September monthly — awaiting family leader',
  },
  {
    id: 'ccon-seed-grace',
    orgUnitId: IJWI,
    personId: 'p-secretary',
    teamId: 'cteam-alpha',
    typeId: 'cct-monthly',
    driveId: 'cdrive-monthly-2026',
    amount: 5_000,
    paymentMethod: 'MOMO',
    familyRailId: 'cfrail-alpha-momo',
    occurredOn: '2026-09-02',
    status: 'FAMILY_CONFIRMED',
    submittedAt: '2026-09-02T09:00:00.000Z',
    familyRespondedAt: '2026-09-02T12:00:00.000Z',
    familyRespondedByPersonId: 'p-member',
    familyConfirmedAmount: 5_000,
    receivedByPersonId: 'p-member',
    receivedAt: '2026-09-02T12:00:00.000Z',
    note: 'Grace monthly — family confirmed, ready to batch',
  },
  {
    id: 'ccon-seed-2',
    orgUnitId: IJWI,
    personId: 'p-choir-pres',
    teamId: 'cteam-beta',
    typeId: 'cct-monthly',
    driveId: 'cdrive-monthly-2026',
    amount: 5_000,
    confirmedAmount: 5_000,
    paymentMethod: 'CASH',
    occurredOn: '2026-08-28',
    status: 'CONFIRMED',
    submittedAt: '2026-08-28T09:00:00.000Z',
    familyRespondedAt: '2026-08-28T10:00:00.000Z',
    familyRespondedByPersonId: 'p-choir-pres',
    familyConfirmedAmount: 5_000,
    receivedByPersonId: 'p-choir-pres',
    receivedAt: '2026-08-28T10:00:00.000Z',
    verifiedAt: '2026-08-29T11:00:00.000Z',
    verifiedByPersonId: 'p-choir-treas',
    financeTxnId: 'txn-choir-contrib-seed',
  },
  {
    id: 'ccon-seed-partial',
    orgUnitId: IJWI,
    personId: 'p-choir-leader',
    teamId: 'cteam-beta',
    typeId: 'cct-concert',
    driveId: 'cdrive-concert-26',
    amount: 10_000,
    confirmedAmount: 6_000,
    familyConfirmedAmount: 6_000,
    paymentMethod: 'BANK',
    familyRailId: 'cfrail-beta-bank',
    occurredOn: '2026-09-05',
    status: 'FAMILY_PARTIAL',
    submittedAt: '2026-09-05T14:00:00.000Z',
    familyRespondedAt: '2026-09-05T16:00:00.000Z',
    familyRespondedByPersonId: 'p-choir-pres',
    familyResponseNote: 'Only 6,000 landed — rest pending',
    receivedByPersonId: 'p-choir-pres',
    receivedAt: '2026-09-05T16:00:00.000Z',
    followUpId: 'cfu-seed-1',
  },
];

export let CHOIR_FOLLOW_UPS: ChoirFollowUp[] = [
  {
    id: 'cfu-seed-1',
    contributionId: 'ccon-seed-partial',
    personId: 'p-choir-leader',
    reason: 'Partial family confirm 6,000 of 10,000 RWF',
    status: 'OPEN',
    createdAt: '2026-09-05T16:00:00.000Z',
    createdByPersonId: 'p-choir-pres',
  },
];

export let CHOIR_FAMILY_RAILS: ChoirFamilyPaymentRail[] = [
  {
    id: 'cfrail-alpha-momo',
    orgUnitId: IJWI,
    teamId: 'cteam-alpha',
    kind: 'MOMO',
    label: 'Alpha MTN MoMo',
    accountRef: '*182*8*1*0788001001#',
    createdByPersonId: 'p-member',
    createdAt: '2026-01-15T10:00:00.000Z',
    active: true,
  },
  {
    id: 'cfrail-beta-bank',
    orgUnitId: IJWI,
    teamId: 'cteam-beta',
    kind: 'BANK',
    label: 'Beta BK account',
    accountRef: '1000123456789',
    createdByPersonId: 'p-choir-pres',
    createdAt: '2026-01-20T10:00:00.000Z',
    active: true,
  },
];

export let CHOIR_OFFICE_RAILS: ChoirOfficePaymentRail[] = [
  {
    id: 'corail-coord-momo',
    orgUnitId: IJWI,
    holderOffice: 'COORDINATOR',
    kind: 'MOMO',
    label: 'Coordinator MoMo',
    accountRef: '*182*8*1*0788002002#',
    createdByPersonId: 'p-choir-coord',
    createdAt: '2026-01-10T10:00:00.000Z',
    active: true,
  },
  {
    id: 'corail-treas-bank',
    orgUnitId: IJWI,
    holderOffice: 'TREASURER',
    kind: 'BANK',
    label: 'Choir treasurer BK',
    accountRef: '1000987654321',
    createdByPersonId: 'p-choir-treas',
    createdAt: '2026-01-10T10:00:00.000Z',
    active: true,
  },
];

export let CHOIR_HANDOFFS: ChoirContributionHandoff[] = [];

export let CHOIR_CONTRIB_EVENTS: ChoirContributionEvent[] = [
  {
    id: 'cev-1',
    orgUnitId: IJWI,
    contributionId: 'ccon-seed-1',
    at: '2026-09-01T10:00:00.000Z',
    actorPersonId: 'p-member',
    action: 'CLAIM_SUBMITTED',
    detail: 'September monthly 5,000 MoMo',
  },
  {
    id: 'cev-2',
    orgUnitId: IJWI,
    contributionId: 'ccon-seed-grace',
    at: '2026-09-02T12:00:00.000Z',
    actorPersonId: 'p-member',
    action: 'FAMILY_CONFIRMED',
    detail: 'Family Alpha confirmed 5,000',
  },
  {
    id: 'cev-3',
    orgUnitId: IJWI,
    contributionId: 'ccon-seed-partial',
    at: '2026-09-05T16:00:00.000Z',
    actorPersonId: 'p-choir-pres',
    action: 'FAMILY_PARTIAL',
    detail: '6,000 of 10,000 — follow-up opened',
  },
];

export let CHOIR_CONTRIB_NOTIFICATIONS: ChoirContribNotification[] = [
  {
    id: 'cnotif-1',
    orgUnitId: IJWI,
    audienceOffices: ['TREASURER', 'COORDINATOR'],
    kind: 'NEW_CLAIM',
    contributionId: 'ccon-seed-1',
    message: 'New claim: Patrick · Monthly · 5,000 (PENDING)',
    createdAt: '2026-09-01T10:00:00.000Z',
  },
  {
    id: 'cnotif-2',
    orgUnitId: IJWI,
    audienceOffices: ['TREASURER', 'COORDINATOR'],
    kind: 'FAMILY_RESPONSE',
    contributionId: 'ccon-seed-grace',
    message: 'Family Alpha confirmed Grace · 5,000',
    createdAt: '2026-09-02T12:00:00.000Z',
  },
  {
    id: 'cnotif-3',
    orgUnitId: IJWI,
    audienceOffices: ['TREASURER', 'COORDINATOR'],
    kind: 'FAMILY_RESPONSE',
    contributionId: 'ccon-seed-partial',
    message: 'Family Beta partial · Eric · 6,000 of 10,000',
    createdAt: '2026-09-05T16:00:00.000Z',
  },
];

type ChoirFinanceListener = () => void;
const choirFinanceListeners = new Set<ChoirFinanceListener>();

export function subscribeChoirFinance(listener: ChoirFinanceListener) {
  choirFinanceListeners.add(listener);
  return () => {
    choirFinanceListeners.delete(listener);
  };
}

function notifyChoirFinance() {
  choirFinanceListeners.forEach((l) => l());
}

export function pushChoirContribution(c: ChoirContribution) {
  CHOIR_CONTRIBUTIONS = [c, ...CHOIR_CONTRIBUTIONS];
  notifyChoirFinance();
}

export function updateChoirContribution(
  id: string,
  patch: Partial<ChoirContribution>,
) {
  CHOIR_CONTRIBUTIONS = CHOIR_CONTRIBUTIONS.map((c) =>
    c.id === id ? { ...c, ...patch } : c,
  );
  notifyChoirFinance();
}

export function pushChoirFollowUp(f: ChoirFollowUp) {
  CHOIR_FOLLOW_UPS = [f, ...CHOIR_FOLLOW_UPS];
  notifyChoirFinance();
}

export function updateChoirFollowUp(id: string, patch: Partial<ChoirFollowUp>) {
  CHOIR_FOLLOW_UPS = CHOIR_FOLLOW_UPS.map((f) =>
    f.id === id ? { ...f, ...patch } : f,
  );
  notifyChoirFinance();
}

export function pushChoirFamilyRail(r: ChoirFamilyPaymentRail) {
  CHOIR_FAMILY_RAILS = [r, ...CHOIR_FAMILY_RAILS];
  notifyChoirFinance();
}

export function pushChoirOfficeRail(r: ChoirOfficePaymentRail) {
  CHOIR_OFFICE_RAILS = [r, ...CHOIR_OFFICE_RAILS];
  notifyChoirFinance();
}

export function pushChoirHandoff(h: ChoirContributionHandoff) {
  CHOIR_HANDOFFS = [h, ...CHOIR_HANDOFFS];
  notifyChoirFinance();
}

export function pushChoirContribEvent(e: ChoirContributionEvent) {
  CHOIR_CONTRIB_EVENTS = [e, ...CHOIR_CONTRIB_EVENTS];
  notifyChoirFinance();
}

export function pushChoirContribNotification(n: ChoirContribNotification) {
  CHOIR_CONTRIB_NOTIFICATIONS = [n, ...CHOIR_CONTRIB_NOTIFICATIONS];
  notifyChoirFinance();
}

export function pushChoirDrive(d: ChoirContributionDrive) {
  CHOIR_CONTRIBUTION_DRIVES = [d, ...CHOIR_CONTRIBUTION_DRIVES];
  notifyChoirFinance();
}

export function pushChoirGoal(g: ChoirContributionGoal) {
  CHOIR_CONTRIBUTION_GOALS = [g, ...CHOIR_CONTRIBUTION_GOALS];
  notifyChoirFinance();
}

export let CHOIR_DONATIONS: ChoirDonation[] = [
  {
    id: 'cdon-1',
    orgUnitId: IJWI,
    donorName: 'Anonymous friend',
    source: 'Community',
    donationType: 'General gift',
    amount: 50_000,
    occurredOn: '2026-09-02',
    paymentMethod: 'BANK',
    evidenceNote: 'Bank slip #441',
    recordedByPersonId: 'p-choir-treas',
    recordedAt: '2026-09-02T14:00:00.000Z',
    financeTxnId: 'txn-choir-don-1',
  },
];

export const CHOIR_SPONSORS: ChoirSponsor[] = [
  {
    id: 'csp-1',
    orgUnitId: IJWI,
    name: 'Kacyiru Business Fellowship',
    sponsorType: 'ORG',
    status: 'ACTIVE',
    contactNote: 'Annual concert sponsor',
  },
  {
    id: 'csp-2',
    orgUnitId: IJWI,
    name: 'Jeanine Mukamana',
    sponsorType: 'INDIVIDUAL',
    status: 'ACTIVE',
  },
];

export const CHOIR_SPONSORSHIPS: ChoirSponsorship[] = [
  {
    id: 'cspon-1',
    orgUnitId: IJWI,
    sponsorId: 'csp-1',
    label: 'Thanksgiving Concert 2026',
    amount: 200_000,
    startDate: '2026-08-01',
    endDate: '2026-12-31',
    status: 'ACTIVE',
    notes: 'Stage + sound support',
  },
];

export const CHOIR_CAMPAIGNS: ChoirFundraisingCampaign[] = [
  {
    id: 'ccamp-uniforms',
    orgUnitId: IJWI,
    name: 'New uniforms 2026',
    goalAmount: 500_000,
    status: 'ACTIVE',
    startDate: '2026-07-01',
    endDate: '2026-12-31',
  },
];

export let CHOIR_CAMPAIGN_GIFTS: ChoirCampaignGift[] = [
  {
    id: 'cgift-1',
    orgUnitId: IJWI,
    campaignId: 'ccamp-uniforms',
    contributorName: 'Family Alpha pool',
    amount: 75_000,
    occurredOn: '2026-08-15',
    paymentMethod: 'CASH',
    recordedByPersonId: 'p-choir-treas',
  },
];

export const CHOIR_BUDGETS: ChoirBudget[] = [
  {
    id: 'cbud-2026',
    orgUnitId: IJWI,
    name: 'Choir Annual 2026',
    year: 2026,
    kind: 'ANNUAL',
    status: 'ACTIVE',
  },
];

export const CHOIR_BUDGET_LINES: ChoirBudgetLine[] = [
  {
    id: 'cbl-1',
    budgetId: 'cbud-2026',
    side: 'INCOME',
    category: 'Member contributions',
    plannedAmount: 600_000,
  },
  {
    id: 'cbl-2',
    budgetId: 'cbud-2026',
    side: 'INCOME',
    category: 'Donations & sponsors',
    plannedAmount: 400_000,
  },
  {
    id: 'cbl-3',
    budgetId: 'cbud-2026',
    side: 'EXPENSE',
    category: 'Sheet music',
    plannedAmount: 80_000,
  },
  {
    id: 'cbl-4',
    budgetId: 'cbud-2026',
    side: 'EXPENSE',
    category: 'Transport',
    plannedAmount: 120_000,
  },
];

export let CHOIR_INCOME: ChoirIncomeRecord[] = [
  {
    id: 'cinc-1',
    orgUnitId: IJWI,
    category: 'Workshop fees',
    amount: 30_000,
    occurredOn: '2026-08-20',
    description: 'Vocal clinic registration',
    recordedByPersonId: 'p-choir-treas',
    budgetId: 'cbud-2026',
    financeTxnId: 'txn-choir-inc-1',
  },
];

export let CHOIR_EXPENSES: ChoirExpenseRecord[] = [
  {
    id: 'cexp-1',
    orgUnitId: IJWI,
    category: 'Transport',
    amount: 25_000,
    occurredOn: '2026-09-01',
    description: 'Bus for retreat',
    status: 'PENDING',
    recordedByPersonId: 'p-choir-leader',
  },
  {
    id: 'cexp-2',
    orgUnitId: IJWI,
    category: 'Sheet music',
    amount: 45_000,
    occurredOn: '2026-09-03',
    description: 'Sheet music purchase',
    status: 'APPROVED',
    recordedByPersonId: 'p-choir-treas',
    approvedByPersonId: 'p-choir-pres',
    financeTxnId: 'txn-choir-2',
  },
];

export let CHOIR_ASSETS: ChoirAsset[] = [
  {
    id: 'cass-1',
    orgUnitId: IJWI,
    name: 'Keyboard Yamaha',
    category: 'Instrument',
    value: 450_000,
    assignedToPersonId: 'p-choir-leader',
    acquiredOn: '2024-05-01',
    status: 'ACTIVE',
    historyNote: 'Assigned to Music Director',
  },
  {
    id: 'cass-2',
    orgUnitId: IJWI,
    name: 'Choir robes (set of 40)',
    category: 'Costume',
    value: 800_000,
    acquiredOn: '2023-01-15',
    status: 'ACTIVE',
  },
];

export let CHOIR_LIABILITIES: ChoirLiability[] = [
  {
    id: 'cliab-1',
    orgUnitId: IJWI,
    name: 'Uniform supplier balance',
    amount: 120_000,
    dueDate: '2026-10-31',
    status: 'OPEN',
    notes: 'Final installment',
  },
];

export function pushChoirDonation(d: ChoirDonation) {
  CHOIR_DONATIONS = [d, ...CHOIR_DONATIONS];
}

export function pushChoirCampaignGift(g: ChoirCampaignGift) {
  CHOIR_CAMPAIGN_GIFTS = [g, ...CHOIR_CAMPAIGN_GIFTS];
}

export function pushChoirIncome(r: ChoirIncomeRecord) {
  CHOIR_INCOME = [r, ...CHOIR_INCOME];
}

export function pushChoirExpense(r: ChoirExpenseRecord) {
  CHOIR_EXPENSES = [r, ...CHOIR_EXPENSES];
}

export function updateChoirExpense(
  id: string,
  patch: Partial<ChoirExpenseRecord>,
) {
  CHOIR_EXPENSES = CHOIR_EXPENSES.map((e) =>
    e.id === id ? { ...e, ...patch } : e,
  );
}

export function updateChoirLiability(
  id: string,
  patch: Partial<ChoirLiability>,
) {
  CHOIR_LIABILITIES = CHOIR_LIABILITIES.map((l) =>
    l.id === id ? { ...l, ...patch } : l,
  );
}

export function pushChoirAsset(a: ChoirAsset) {
  CHOIR_ASSETS = [a, ...CHOIR_ASSETS];
}
