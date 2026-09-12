import { useMemo } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { churchFinanceService } from '../../services/churchFinanceService';
import { MinistryShell } from './MinistryShell';

const FUNDS_ONLY_NAV = [
  { to: '/systems/finance', label: 'Funds', end: true as const },
];

const TREASURY_NAV = [
  { to: '/systems/finance', label: 'Funds', end: true as const },
  { to: '/systems/finance/collections', label: 'Collections' },
  { to: '/systems/finance/budgets', label: 'Budgets' },
  { to: '/systems/finance/balance-sheet', label: 'Balance sheet' },
  { to: '/systems/finance/reports', label: 'Reports' },
];

/**
 * Shared Finance shell — vault holders see Funds only;
 * General Fund VIEW/MANAGE sees church treasury modules.
 */
export function FinanceShell() {
  const { account } = useAuth();
  const nav = useMemo(() => {
    if (!account) return FUNDS_ONLY_NAV;
    const canTreasury =
      churchFinanceService.canViewGeneral(account.personId) ||
      churchFinanceService.canManageGeneral(account.personId);
    return canTreasury ? TREASURY_NAV : FUNDS_ONLY_NAV;
  }, [account]);

  return (
    <MinistryShell
      systemId="sys-finance"
      basePath="/systems/finance"
      nav={nav}
      enforceMemberNav={false}
    />
  );
}
