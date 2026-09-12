import { createContext, useContext } from 'react';
import type { ChoirOrgUnitEntry } from '../../domain/choirCatalog';

export interface ChoirTenantContextValue {
  activeChoirOrgUnitId: string | null;
  activeChoirName: string;
  accessibleChoirs: ChoirOrgUnitEntry[];
  setActiveChoir: (orgUnitId: string) => void;
}

export const ChoirTenantContext = createContext<ChoirTenantContextValue | null>(
  null,
);

export function useActiveChoir(): ChoirTenantContextValue {
  const ctx = useContext(ChoirTenantContext);
  if (!ctx) {
    throw new Error('useActiveChoir must be used within ChoirShell');
  }
  return ctx;
}
