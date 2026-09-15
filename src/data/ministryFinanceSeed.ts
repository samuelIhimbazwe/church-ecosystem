import type {
  MinistryAsset,
  MinistryBudget,
  MinistryBudgetLine,
  MinistryCampaignGift,
  MinistryContribution,
  MinistryContributionDrive,
  MinistryContributionGoal,
  MinistryContributionType,
  MinistryDonation,
  MinistryExpenseRecord,
  MinistryFollowUp,
  MinistryFundraisingCampaign,
  MinistryIncomeRecord,
  MinistryLiability,
  MinistryPaymentMethodConfig,
  MinistrySponsor,
  MinistrySponsorship,
  SystemId,
} from '../domain/types';

/** Systems that use the shared ministry finance kit UI (not Choir/Worship/Deacon/Protocol). */
export const FINANCE_KIT_SYSTEM_IDS: SystemId[] = [
  'sys-youth',
  'sys-music',
  'sys-media',
  'sys-men',
  'sys-women',
  'sys-couples',
  'sys-children',
  'sys-elderly',
  'sys-evangelism',
  'sys-intercessors',
];

export const FUND_ID_BY_SYSTEM: Partial<Record<SystemId, string>> = {
  'sys-youth': 'fund-youth',
  'sys-music': 'fund-music',
  'sys-media': 'fund-media',
  'sys-men': 'fund-men',
  'sys-women': 'fund-women',
  'sys-couples': 'fund-couples',
  'sys-children': 'fund-children',
  'sys-elderly': 'fund-elderly',
  'sys-evangelism': 'fund-evangelism',
  'sys-intercessors': 'fund-intercessors',
};

function seedTypes(systemId: SystemId): MinistryContributionType[] {
  const prefix = systemId.replace('sys-', '');
  return [
    {
      id: `${prefix}-type-tithe`,
      name: 'Ministry offering',
      category: 'Giving',
      frequency: 'MONTHLY',
      defaultAmount: 5000,
      active: true,
      memberVisible: true,
    },
    {
      id: `${prefix}-type-event`,
      name: 'Event support',
      category: 'Events',
      frequency: 'EVENT',
      defaultAmount: 2000,
      active: true,
      memberVisible: true,
    },
  ];
}

function seedMethods(systemId: SystemId): MinistryPaymentMethodConfig[] {
  const prefix = systemId.replace('sys-', '');
  return [
    {
      id: `${prefix}-pm-cash`,
      method: 'CASH',
      label: 'Cash to treasurer',
      active: true,
      memberVisible: true,
    },
    {
      id: `${prefix}-pm-momo`,
      method: 'MOMO',
      label: 'MTN MoMo',
      active: true,
      memberVisible: true,
    },
    {
      id: `${prefix}-pm-bank`,
      method: 'BANK',
      label: 'Bank transfer',
      active: true,
      memberVisible: true,
    },
  ];
}

export let MF_TYPES: Array<MinistryContributionType & { systemId: SystemId }> =
  FINANCE_KIT_SYSTEM_IDS.flatMap((systemId) =>
    seedTypes(systemId).map((t) => ({ ...t, systemId })),
  );

export let MF_METHODS: Array<
  MinistryPaymentMethodConfig & { systemId: SystemId }
> = FINANCE_KIT_SYSTEM_IDS.flatMap((systemId) =>
  seedMethods(systemId).map((m) => ({ ...m, systemId })),
);

export let MF_DRIVES: MinistryContributionDrive[] =
  FINANCE_KIT_SYSTEM_IDS.map((systemId) => ({
    id: `drv-${systemId.replace('sys-', '')}-q3`,
    systemId,
    name: 'Q3 ministry drive',
    startsOn: '2026-07-01',
    endsOn: '2026-09-30',
    status: 'ACTIVE',
    description: 'Quarterly contribution drive',
  }));

export let MF_GOALS: MinistryContributionGoal[] = MF_DRIVES.map((d) => ({
  id: `goal-${d.id}`,
  driveId: d.id,
  scope: 'MINISTRY',
  targetAmount: 500_000,
  label: 'Ministry target',
}));

export let MF_CONTRIBUTIONS: Array<
  MinistryContribution & { systemId: SystemId }
> = [
  {
    id: 'mf-c-youth-1',
    systemId: 'sys-youth',
    personId: 'p-youth-leader',
    typeId: 'youth-type-tithe',
    driveId: 'drv-youth-q3',
    amount: 5000,
    paymentMethod: 'MOMO',
    occurredOn: '2026-09-01',
    status: 'PENDING',
    submittedAt: '2026-09-01T10:00:00.000Z',
  },
];

export let MF_FOLLOWUPS: Array<MinistryFollowUp & { systemId: SystemId }> = [];

export let MF_DONATIONS: Array<MinistryDonation & { systemId: SystemId }> = [];

export let MF_SPONSORS: Array<MinistrySponsor & { systemId: SystemId }> =
  FINANCE_KIT_SYSTEM_IDS.map((systemId) => ({
    id: `sp-${systemId.replace('sys-', '')}-1`,
    systemId,
    name: 'Community partner',
    sponsorType: 'ORG',
    status: 'ACTIVE',
  }));

export let MF_SPONSORSHIPS: Array<
  MinistrySponsorship & { systemId: SystemId }
> = [];

export let MF_CAMPAIGNS: Array<
  MinistryFundraisingCampaign & { systemId: SystemId }
> = FINANCE_KIT_SYSTEM_IDS.map((systemId) => ({
  id: `camp-${systemId.replace('sys-', '')}-1`,
  systemId,
  name: 'Annual fundraising',
  goalAmount: 1_000_000,
  status: 'ACTIVE',
  startDate: '2026-01-01',
}));

export let MF_CAMPAIGN_GIFTS: Array<
  MinistryCampaignGift & { systemId: SystemId }
> = [];

export let MF_BUDGETS: Array<MinistryBudget & { systemId: SystemId }> =
  FINANCE_KIT_SYSTEM_IDS.map((systemId) => ({
    id: `bud-${systemId.replace('sys-', '')}-2026`,
    systemId,
    name: '2026 annual budget',
    year: 2026,
    kind: 'ANNUAL',
    status: 'ACTIVE',
  }));

export let MF_BUDGET_LINES: Array<
  MinistryBudgetLine & { systemId: SystemId }
> = MF_BUDGETS.flatMap((b) => [
  {
    id: `${b.id}-inc`,
    systemId: b.systemId,
    budgetId: b.id,
    side: 'INCOME',
    category: 'Contributions',
    plannedAmount: 2_000_000,
  },
  {
    id: `${b.id}-exp`,
    systemId: b.systemId,
    budgetId: b.id,
    side: 'EXPENSE',
    category: 'Programs',
    plannedAmount: 1_500_000,
  },
]);

export let MF_INCOME: Array<MinistryIncomeRecord & { systemId: SystemId }> = [];
export let MF_EXPENSES: Array<
  MinistryExpenseRecord & { systemId: SystemId }
> = [];
export let MF_ASSETS: Array<MinistryAsset & { systemId: SystemId }> =
  FINANCE_KIT_SYSTEM_IDS.map((systemId) => ({
    id: `asset-${systemId.replace('sys-', '')}-kit`,
    systemId,
    name: 'Ministry kit / materials',
    category: 'Equipment',
    value: 150_000,
    acquiredOn: '2026-01-15',
    status: 'ACTIVE' as const,
  }));
export let MF_LIABILITIES: Array<
  MinistryLiability & { systemId: SystemId }
> = FINANCE_KIT_SYSTEM_IDS.map((systemId) => ({
  id: `liab-${systemId.replace('sys-', '')}-kit`,
  systemId,
  name: 'Outstanding supplier balance',
  amount: 40_000,
  dueDate: '2026-10-31',
  status: 'OPEN' as const,
  notes: 'Seed sample — close when paid',
}));
