import type {
  WorshipAsset,
  WorshipBudget,
  WorshipBudgetLine,
  WorshipCampaignGift,
  WorshipContribution,
  WorshipContributionType,
  WorshipDonation,
  WorshipDutySlot,
  WorshipExpenseRecord,
  WorshipFollowUp,
  WorshipFundraisingCampaign,
  WorshipIncomeRecord,
  WorshipLiability,
  WorshipPaymentMethodConfig,
  WorshipRehearsal,
  WorshipRosterMember,
  WorshipSectionSeat,
  WorshipSong,
  WorshipSponsor,
  WorshipSponsorship,
  WorshipTeam,
  WorshipTeamMember,
} from '../domain/types';

const WORSHIP_OU = 'ou-worship';

export const WORSHIP_SONGS: WorshipSong[] = [
  {
    id: 'song-amazing',
    orgUnitId: WORSHIP_OU,
    title: 'Amazing Grace',
    composer: 'Traditional',
    language: 'English',
    status: 'READY',
  },
  {
    id: 'song-ni-mwari',
    orgUnitId: WORSHIP_OU,
    title: 'Ni Mwari',
    language: 'Kinyarwanda',
    status: 'READY',
    notes: 'Concert opener',
  },
  {
    id: 'song-hallelujah',
    orgUnitId: WORSHIP_OU,
    title: 'Hallelujah Chorus (excerpt)',
    composer: 'Handel',
    language: 'English',
    status: 'LEARNING',
  },
  {
    id: 'song-yesu',
    orgUnitId: WORSHIP_OU,
    title: 'Yesu Ni Umwami',
    language: 'Kinyarwanda',
    status: 'LEARNING',
  },
  {
    id: 'song-old',
    orgUnitId: WORSHIP_OU,
    title: 'Old concert piece',
    status: 'ARCHIVED',
  },
];

export const WORSHIP_SEATS: WorshipSectionSeat[] = [
  {
    id: 'seat-eric-tenor',
    orgUnitId: WORSHIP_OU,
    personId: 'p-worship-leader',
    section: 'TENOR',
    status: 'ACTIVE',
  },
  {
    id: 'seat-patrick-bass',
    orgUnitId: WORSHIP_OU,
    personId: 'p-member',
    section: 'BASS',
    status: 'ACTIVE',
  },
  {
    id: 'seat-grace-alto',
    orgUnitId: WORSHIP_OU,
    personId: 'p-secretary',
    section: 'ALTO',
    status: 'ACTIVE',
  },
  {
    id: 'seat-aline-soprano',
    orgUnitId: WORSHIP_OU,
    personId: 'p-youth-leader',
    section: 'SOPRANO',
    status: 'INACTIVE',
  },
];

export const WORSHIP_REHEARSALS: WorshipRehearsal[] = [
  {
    id: 'reh-2026-09-13',
    orgUnitId: WORSHIP_OU,
    title: 'Weekly rehearsal',
    startsAt: '2026-09-13T15:00:00',
    endsAt: '2026-09-13T17:00:00',
    location: 'Worship stage',
    songIds: ['song-ni-mwari', 'song-hallelujah'],
    notes: 'Focus on blend in altos',
  },
  {
    id: 'reh-2026-09-20',
    orgUnitId: WORSHIP_OU,
    title: 'Weekly rehearsal',
    startsAt: '2026-09-20T15:00:00',
    endsAt: '2026-09-20T17:00:00',
    location: 'Worship stage',
    songIds: ['song-amazing', 'song-yesu'],
  },
  {
    id: 'reh-2026-11-15',
    orgUnitId: WORSHIP_OU,
    title: 'Concert dress rehearsal',
    startsAt: '2026-11-15T14:00:00',
    endsAt: '2026-11-15T17:00:00',
    location: 'Main sanctuary',
    songIds: ['song-ni-mwari', 'song-amazing', 'song-hallelujah', 'song-yesu'],
  },
];

export const WORSHIP_DUTIES: WorshipDutySlot[] = [
  {
    id: 'duty-concert-conductor',
    orgUnitId: WORSHIP_OU,
    label: 'Thanksgiving Concert',
    eventId: 'evt-worship-concert-2026',
    serviceDate: '2026-11-22',
    role: 'CONDUCTOR',
    personId: 'p-worship-leader',
    status: 'CONFIRMED',
  },
  {
    id: 'duty-concert-solo',
    orgUnitId: WORSHIP_OU,
    label: 'Thanksgiving Concert',
    eventId: 'evt-worship-concert-2026',
    serviceDate: '2026-11-22',
    role: 'SOLOIST',
    personId: 'p-secretary',
    status: 'ASSIGNED',
  },
  {
    id: 'duty-sunday-section',
    orgUnitId: WORSHIP_OU,
    label: 'Sunday service',
    serviceDate: '2026-09-14',
    role: 'SECTION_LEAD',
    personId: 'p-worship-leader',
    status: 'DONE',
  },
];

/** Worship "families" = internal teams/squads. */
export const WORSHIP_TEAMS: WorshipTeam[] = [
  {
    id: 'cteam-alpha',
    orgUnitId: WORSHIP_OU,
    name: 'Family Alpha',
    code: 'ALPHA',
    leaderPersonId: 'p-member',
    viceLeaderPersonId: 'p-secretary',
    status: 'ACTIVE',
  },
  {
    id: 'cteam-beta',
    orgUnitId: WORSHIP_OU,
    name: 'Family Beta',
    code: 'BETA',
    leaderPersonId: 'p-worship-pres',
    status: 'ACTIVE',
  },
];

export const WORSHIP_TEAM_MEMBERS: WorshipTeamMember[] = [
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
    personId: 'p-worship-leader',
    status: 'ACTIVE',
  },
  {
    id: 'ctm-pres-beta',
    teamId: 'cteam-beta',
    personId: 'p-worship-pres',
    status: 'ACTIVE',
  },
  {
    id: 'ctm-treas-beta',
    teamId: 'cteam-beta',
    personId: 'p-worship-treas',
    status: 'ACTIVE',
  },
];

export const WORSHIP_ROSTER: WorshipRosterMember[] = [
  {
    id: 'crm-eric',
    orgUnitId: WORSHIP_OU,
    personId: 'p-worship-leader',
    office: 'MUSIC_DIRECTOR',
    teamId: 'cteam-beta',
    status: 'ACTIVE',
  },
  {
    id: 'crm-pres',
    orgUnitId: WORSHIP_OU,
    personId: 'p-worship-pres',
    office: 'PRESIDENT',
    teamId: 'cteam-beta',
    status: 'ACTIVE',
  },
  {
    id: 'crm-treas',
    orgUnitId: WORSHIP_OU,
    personId: 'p-worship-treas',
    office: 'TREASURER',
    teamId: 'cteam-beta',
    status: 'ACTIVE',
  },
  {
    id: 'crm-patrick',
    orgUnitId: WORSHIP_OU,
    personId: 'p-member',
    office: 'FAMILY_LEADER',
    teamId: 'cteam-alpha',
    status: 'ACTIVE',
  },
  {
    id: 'crm-grace',
    orgUnitId: WORSHIP_OU,
    personId: 'p-secretary',
    office: 'FAMILY_VICE',
    teamId: 'cteam-alpha',
    status: 'ACTIVE',
  },
];

export const WORSHIP_CONTRIBUTION_TYPES: WorshipContributionType[] = [
  {
    id: 'cct-monthly',
    name: 'Monthly contribution',
    category: 'MEMBERSHIP',
    frequency: 'MONTHLY',
    defaultAmount: 5_000,
    active: true,
    memberVisible: true,
  },
  {
    id: 'cct-concert',
    name: 'Concert support',
    category: 'EVENT',
    frequency: 'EVENT',
    defaultAmount: 10_000,
    active: true,
    memberVisible: true,
  },
  {
    id: 'cct-uniform',
    name: 'Uniform fund',
    category: 'SPECIAL',
    frequency: 'ONCE',
    active: true,
    memberVisible: true,
  },
];

export const WORSHIP_PAYMENT_METHODS: WorshipPaymentMethodConfig[] = [
  {
    id: 'cpm-momo',
    method: 'MOMO',
    label: 'Mobile money',
    active: true,
    memberVisible: true,
  },
  {
    id: 'cpm-cash',
    method: 'CASH',
    label: 'Cash',
    active: true,
    memberVisible: true,
  },
  {
    id: 'cpm-bank',
    method: 'BANK',
    label: 'Bank transfer',
    active: true,
    memberVisible: true,
  },
];

export let WORSHIP_CONTRIBUTIONS: WorshipContribution[] = [
  {
    id: 'ccon-seed-1',
    personId: 'p-member',
    teamId: 'cteam-alpha',
    typeId: 'cct-monthly',
    amount: 5_000,
    paymentMethod: 'MOMO',
    occurredOn: '2026-09-01',
    status: 'PENDING',
    submittedAt: '2026-09-01T10:00:00.000Z',
    note: 'September monthly',
  },
  {
    id: 'ccon-seed-2',
    personId: 'p-worship-pres',
    teamId: 'cteam-beta',
    typeId: 'cct-monthly',
    amount: 5_000,
    confirmedAmount: 5_000,
    paymentMethod: 'CASH',
    occurredOn: '2026-08-28',
    status: 'CONFIRMED',
    submittedAt: '2026-08-28T09:00:00.000Z',
    verifiedAt: '2026-08-29T11:00:00.000Z',
    verifiedByPersonId: 'p-worship-treas',
    financeTxnId: 'txn-worship-contrib-seed',
  },
];

export let WORSHIP_FOLLOW_UPS: WorshipFollowUp[] = [];

export function pushWorshipContribution(c: WorshipContribution) {
  WORSHIP_CONTRIBUTIONS = [c, ...WORSHIP_CONTRIBUTIONS];
}

export function updateWorshipContribution(
  id: string,
  patch: Partial<WorshipContribution>,
) {
  WORSHIP_CONTRIBUTIONS = WORSHIP_CONTRIBUTIONS.map((c) =>
    c.id === id ? { ...c, ...patch } : c,
  );
}

export function pushWorshipFollowUp(f: WorshipFollowUp) {
  WORSHIP_FOLLOW_UPS = [f, ...WORSHIP_FOLLOW_UPS];
}

export function updateWorshipFollowUp(id: string, patch: Partial<WorshipFollowUp>) {
  WORSHIP_FOLLOW_UPS = WORSHIP_FOLLOW_UPS.map((f) =>
    f.id === id ? { ...f, ...patch } : f,
  );
}

export let WORSHIP_DONATIONS: WorshipDonation[] = [
  {
    id: 'cdon-1',
    donorName: 'Anonymous friend',
    source: 'Community',
    donationType: 'General gift',
    amount: 50_000,
    occurredOn: '2026-09-02',
    paymentMethod: 'BANK',
    evidenceNote: 'Bank slip #441',
    recordedByPersonId: 'p-worship-treas',
    recordedAt: '2026-09-02T14:00:00.000Z',
    financeTxnId: 'txn-worship-don-1',
  },
];

export const WORSHIP_SPONSORS: WorshipSponsor[] = [
  {
    id: 'csp-1',
    name: 'Kacyiru Business Fellowship',
    sponsorType: 'ORG',
    status: 'ACTIVE',
    contactNote: 'Annual concert sponsor',
  },
  {
    id: 'csp-2',
    name: 'Jeanine Mukamana',
    sponsorType: 'INDIVIDUAL',
    status: 'ACTIVE',
  },
];

export const WORSHIP_SPONSORSHIPS: WorshipSponsorship[] = [
  {
    id: 'cspon-1',
    sponsorId: 'csp-1',
    label: 'Thanksgiving Concert 2026',
    amount: 200_000,
    startDate: '2026-08-01',
    endDate: '2026-12-31',
    status: 'ACTIVE',
    notes: 'Stage + sound support',
  },
];

export const WORSHIP_CAMPAIGNS: WorshipFundraisingCampaign[] = [
  {
    id: 'ccamp-uniforms',
    name: 'New uniforms 2026',
    goalAmount: 500_000,
    status: 'ACTIVE',
    startDate: '2026-07-01',
    endDate: '2026-12-31',
  },
];

export let WORSHIP_CAMPAIGN_GIFTS: WorshipCampaignGift[] = [
  {
    id: 'cgift-1',
    campaignId: 'ccamp-uniforms',
    contributorName: 'Family Alpha pool',
    amount: 75_000,
    occurredOn: '2026-08-15',
    paymentMethod: 'CASH',
    recordedByPersonId: 'p-worship-treas',
  },
];

export const WORSHIP_BUDGETS: WorshipBudget[] = [
  {
    id: 'cbud-2026',
    name: 'Worship Annual 2026',
    year: 2026,
    kind: 'ANNUAL',
    status: 'ACTIVE',
  },
];

export const WORSHIP_BUDGET_LINES: WorshipBudgetLine[] = [
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

export let WORSHIP_INCOME: WorshipIncomeRecord[] = [
  {
    id: 'cinc-1',
    category: 'Workshop fees',
    amount: 30_000,
    occurredOn: '2026-08-20',
    description: 'Vocal clinic registration',
    recordedByPersonId: 'p-worship-treas',
    budgetId: 'cbud-2026',
    financeTxnId: 'txn-worship-inc-1',
  },
];

export let WORSHIP_EXPENSES: WorshipExpenseRecord[] = [
  {
    id: 'cexp-1',
    category: 'Transport',
    amount: 25_000,
    occurredOn: '2026-09-01',
    description: 'Bus for retreat',
    status: 'PENDING',
    recordedByPersonId: 'p-worship-leader',
  },
  {
    id: 'cexp-2',
    category: 'Sheet music',
    amount: 45_000,
    occurredOn: '2026-09-03',
    description: 'Sheet music purchase',
    status: 'APPROVED',
    recordedByPersonId: 'p-worship-treas',
    approvedByPersonId: 'p-worship-pres',
    financeTxnId: 'txn-worship-2',
  },
];

export let WORSHIP_ASSETS: WorshipAsset[] = [
  {
    id: 'cass-1',
    name: 'Keyboard Yamaha',
    category: 'Instrument',
    value: 450_000,
    assignedToPersonId: 'p-worship-leader',
    acquiredOn: '2024-05-01',
    status: 'ACTIVE',
    historyNote: 'Assigned to Music Director',
  },
  {
    id: 'cass-2',
    name: 'Worship robes (set of 40)',
    category: 'Costume',
    value: 800_000,
    acquiredOn: '2023-01-15',
    status: 'ACTIVE',
  },
];

export let WORSHIP_LIABILITIES: WorshipLiability[] = [
  {
    id: 'cliab-1',
    name: 'Uniform supplier balance',
    amount: 120_000,
    dueDate: '2026-10-31',
    status: 'OPEN',
    notes: 'Final installment',
  },
];

export function pushWorshipDonation(d: WorshipDonation) {
  WORSHIP_DONATIONS = [d, ...WORSHIP_DONATIONS];
}

export function pushWorshipCampaignGift(g: WorshipCampaignGift) {
  WORSHIP_CAMPAIGN_GIFTS = [g, ...WORSHIP_CAMPAIGN_GIFTS];
}

export function pushWorshipIncome(r: WorshipIncomeRecord) {
  WORSHIP_INCOME = [r, ...WORSHIP_INCOME];
}

export function pushWorshipExpense(r: WorshipExpenseRecord) {
  WORSHIP_EXPENSES = [r, ...WORSHIP_EXPENSES];
}

export function updateWorshipExpense(
  id: string,
  patch: Partial<WorshipExpenseRecord>,
) {
  WORSHIP_EXPENSES = WORSHIP_EXPENSES.map((e) =>
    e.id === id ? { ...e, ...patch } : e,
  );
}

export function updateWorshipLiability(
  id: string,
  patch: Partial<WorshipLiability>,
) {
  WORSHIP_LIABILITIES = WORSHIP_LIABILITIES.map((l) =>
    l.id === id ? { ...l, ...patch } : l,
  );
}

export function pushWorshipAsset(a: WorshipAsset) {
  WORSHIP_ASSETS = [a, ...WORSHIP_ASSETS];
}
