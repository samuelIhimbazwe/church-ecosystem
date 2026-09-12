import type {
  BalanceSheetLine,
  BudgetLine,
  ServiceCollection,
} from '../domain/types';

/** Posted Sunday collections (demo clock: Sep 2026). */
export let SERVICE_COLLECTIONS: ServiceCollection[] = [
  {
    id: 'sc-2026-08-31',
    serviceDate: '2026-08-31',
    serviceLabel: 'Sunday 1st service',
    titheAmount: 400_000,
    offeringAmount: 280_000,
    givingAmount: 0,
    status: 'POSTED',
    recordedByPersonId: 'p-church-treas',
    postedAt: '2026-08-31T14:00:00',
    txnIds: ['txn-gen-aug-tithe', 'txn-gen-aug-off'],
  },
  {
    id: 'sc-2026-09-07',
    serviceDate: '2026-09-07',
    serviceLabel: 'Sunday 1st service',
    titheAmount: 420_000,
    offeringAmount: 310_000,
    givingAmount: 120_000,
    notes: 'Thanksgiving week',
    status: 'POSTED',
    recordedByPersonId: 'p-church-treas',
    postedAt: '2026-09-07T14:30:00',
    txnIds: ['txn-gen-1', 'txn-gen-1b', 'txn-gen-1c'],
  },
];

export let BUDGET_LINES: BudgetLine[] = [
  {
    id: 'bud-2026-tithe',
    fiscalYear: 2026,
    category: 'TITHE',
    kind: 'INCOME',
    budgetedAmount: 5_000_000,
    label: 'Tithes (annual)',
  },
  {
    id: 'bud-2026-offering',
    fiscalYear: 2026,
    category: 'OFFERING',
    kind: 'INCOME',
    budgetedAmount: 3_600_000,
    label: 'Offerings (annual)',
  },
  {
    id: 'bud-2026-giving',
    fiscalYear: 2026,
    category: 'GIVING',
    kind: 'INCOME',
    budgetedAmount: 1_200_000,
    label: 'Special givings (annual)',
  },
  {
    id: 'bud-2026-util',
    fiscalYear: 2026,
    month: 9,
    category: 'UTILITIES',
    kind: 'EXPENSE',
    budgetedAmount: 150_000,
    label: 'Utilities — September',
  },
  {
    id: 'bud-2026-maint',
    fiscalYear: 2026,
    month: 9,
    category: 'MAINTENANCE',
    kind: 'EXPENSE',
    budgetedAmount: 100_000,
    label: 'Maintenance — September',
  },
  {
    id: 'bud-2026-missions',
    fiscalYear: 2026,
    category: 'MISSIONS',
    kind: 'EXPENSE',
    budgetedAmount: 800_000,
    label: 'Missions & outreach (annual)',
  },
  {
    id: 'bud-2026-admin',
    fiscalYear: 2026,
    category: 'ADMIN',
    kind: 'EXPENSE',
    budgetedAmount: 600_000,
    label: 'Administration (annual)',
  },
];

/** Manual BS lines + linked cash from General Fund. */
export let BALANCE_SHEET_LINES: BalanceSheetLine[] = [
  {
    id: 'bs-cash-gen',
    asOfDate: '2026-09-08',
    section: 'ASSET',
    label: 'Cash — General Church Fund',
    amount: 0,
    linkedFundId: 'fund-general',
    notes: 'Live balance from ledger',
  },
  {
    id: 'bs-equip',
    asOfDate: '2026-09-08',
    section: 'ASSET',
    label: 'Equipment & fixtures',
    amount: 2_500_000,
  },
  {
    id: 'bs-receivable',
    asOfDate: '2026-09-08',
    section: 'ASSET',
    label: 'Receivables (pledges)',
    amount: 150_000,
  },
  {
    id: 'bs-payables',
    asOfDate: '2026-09-08',
    section: 'LIABILITY',
    label: 'Accounts payable',
    amount: 95_000,
  },
  {
    id: 'bs-accrued',
    asOfDate: '2026-09-08',
    section: 'LIABILITY',
    label: 'Accrued utilities',
    amount: 40_000,
  },
  {
    id: 'bs-equity',
    asOfDate: '2026-09-08',
    section: 'EQUITY',
    label: 'Net assets / church equity',
    amount: 0,
    notes: 'Balancing figure computed in reports when amount is 0',
  },
];
