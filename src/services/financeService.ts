import {
  FINANCE_TXNS,
  FUND_GRANTS,
  FUNDS,
  pushFinanceTxn,
} from '../data/financeSeed';
import { authorizeFinanceFund, visibleFundIds } from '../domain/financeAccess';
import type {
  Action,
  AuthzDecision,
  FinanceFund,
  FinanceTransaction,
  FundAccessGrant,
} from '../domain/types';
import { fundIdForChoirOrgUnit } from '../domain/choirCatalog';
import { accessService } from './accessService';
import { orgService, systemsService } from './orgService';
import { peopleService } from './authService';

function resolveChoirFundId(input: {
  orgUnitId?: string;
  fundId?: string;
}): string {
  if (input.fundId) return input.fundId;
  if (input.orgUnitId) return fundIdForChoirOrgUnit(input.orgUnitId);
  throw new Error('Choir fund requires orgUnitId or fundId');
}

export const financeService = {
  listAllFunds(): FinanceFund[] {
    return [...FUNDS];
  },

  getFund(id: string): FinanceFund | null {
    return FUNDS.find((f) => f.id === id) ?? null;
  },

  /** Funds this person may VIEW (org-private ACL). */
  visibleFunds(personId: string): FinanceFund[] {
    const grants = accessService.effectiveAccess(personId);
    const ids = new Set(visibleFundIds(personId, grants));
    return FUNDS.filter((f) => ids.has(f.id) && f.status === 'ACTIVE');
  },

  /** All funds with access flag — for privacy demo (pastor sees locked vaults). */
  fundsAccessOverview(personId: string): Array<{
    fund: FinanceFund;
    canView: boolean;
    canManage: boolean;
    decision: AuthzDecision;
    orgName: string;
  }> {
    const grants = accessService.effectiveAccess(personId);
    return FUNDS.map((fund) => {
      const view = authorizeFinanceFund(
        personId,
        fund.id,
        'VIEW',
        grants,
      );
      const manage = authorizeFinanceFund(
        personId,
        fund.id,
        'MANAGE',
        grants,
      );
      return {
        fund,
        canView: view.allowed,
        canManage: manage.allowed,
        decision: view,
        orgName: orgService.getById(fund.orgUnitId)?.name ?? fund.orgUnitId,
      };
    });
  },

  authorizeFund(
    personId: string,
    fundId: string,
    action: Action,
  ): AuthzDecision {
    return accessService.authorize(
      personId,
      'sys-finance',
      'FINANCE',
      action,
      { fundId, audit: true },
    );
  },

  transactionsForFund(
    personId: string,
    fundId: string,
  ): { allowed: boolean; decision: AuthzDecision; txns: FinanceTransaction[] } {
    const decision = this.authorizeFund(personId, fundId, 'VIEW');
    if (!decision.allowed) {
      return { allowed: false, decision, txns: [] };
    }
    return {
      allowed: true,
      decision,
      txns: FINANCE_TXNS.filter((t) => t.fundId === fundId).sort((a, b) =>
        b.occurredOn.localeCompare(a.occurredOn),
      ),
    };
  },

  balance(fundId: string): number {
    return FINANCE_TXNS.filter((t) => t.fundId === fundId).reduce((sum, t) => {
      if (t.type === 'INCOME' || t.type === 'TRANSFER_IN') return sum + t.amount;
      return sum - t.amount;
    }, 0);
  },

  grantsForFund(fundId: string): FundAccessGrant[] {
    return FUND_GRANTS.filter(
      (g) => g.fundId === fundId && g.status === 'ACTIVE',
    );
  },

  fundLabel(fund: FinanceFund): string {
    const sys = fund.ownerSystemId
      ? systemsService.getById(fund.ownerSystemId)?.shortName
      : null;
    return sys ? `${fund.name} (${sys})` : fund.name;
  },

  formatAmount(amount: number): string {
    return `${amount.toLocaleString()} RWF`;
  },

  grantorName(personId: string): string {
    return (
      peopleService.getById(personId)?.preferredName ||
      peopleService.getById(personId)?.fullName ||
      personId
    );
  },

  /**
   * Append an income txn when Protocol Treasurer verifies a contribution.
   * Requires FINANCE MANAGE on the fund vault.
   */
  recordProtocolContributionIncome(input: {
    actorPersonId: string;
    amount: number;
    description: string;
    occurredOn: string;
    contributionId: string;
  }): { ok: boolean; reason?: string; txnId?: string } {
    const decision = this.authorizeFund(
      input.actorPersonId,
      'fund-protocol',
      'MANAGE',
    );
    if (!decision.allowed) {
      return { ok: false, reason: decision.reason };
    }
    const txnId = `txn-protocol-${input.contributionId}`;
    pushFinanceTxn({
      id: txnId,
      fundId: 'fund-protocol',
      type: 'INCOME',
      amount: input.amount,
      description: input.description,
      occurredOn: input.occurredOn,
      recordedByPersonId: input.actorPersonId,
    });
    return { ok: true, txnId };
  },

  /** Choir contribution verify → per-choir fund vault. */
  recordChoirContributionIncome(input: {
    actorPersonId: string;
    amount: number;
    description: string;
    occurredOn: string;
    contributionId: string;
    orgUnitId?: string;
    fundId?: string;
  }): { ok: boolean; reason?: string; txnId?: string } {
    return this.recordChoirFundIncome({
      actorPersonId: input.actorPersonId,
      amount: input.amount,
      description: input.description,
      occurredOn: input.occurredOn,
      orgUnitId: input.orgUnitId,
      fundId: input.fundId,
      txnPrefix: `txn-choir-${input.contributionId}`,
    });
  },

  recordChoirFundIncome(input: {
    actorPersonId: string;
    amount: number;
    description: string;
    occurredOn: string;
    txnPrefix: string;
    orgUnitId?: string;
    fundId?: string;
  }): { ok: boolean; reason?: string; txnId?: string } {
    const fundId = resolveChoirFundId(input);
    const decision = this.authorizeFund(
      input.actorPersonId,
      fundId,
      'MANAGE',
    );
    if (!decision.allowed) {
      return { ok: false, reason: decision.reason };
    }
    const txnId = input.txnPrefix;
    pushFinanceTxn({
      id: txnId,
      fundId,
      type: 'INCOME',
      amount: input.amount,
      description: input.description,
      occurredOn: input.occurredOn,
      recordedByPersonId: input.actorPersonId,
    });
    return { ok: true, txnId };
  },

  recordChoirFundExpense(input: {
    actorPersonId: string;
    amount: number;
    description: string;
    occurredOn: string;
    expenseId: string;
    orgUnitId?: string;
    fundId?: string;
  }): { ok: boolean; reason?: string; txnId?: string } {
    const fundId = resolveChoirFundId(input);
    const decision = this.authorizeFund(
      input.actorPersonId,
      fundId,
      'MANAGE',
    );
    if (!decision.allowed) {
      return { ok: false, reason: decision.reason };
    }
    const txnId = `txn-choir-exp-${input.expenseId}`;
    pushFinanceTxn({
      id: txnId,
      fundId,
      type: 'EXPENSE',
      amount: input.amount,
      description: input.description,
      occurredOn: input.occurredOn,
      recordedByPersonId: input.actorPersonId,
    });
    return { ok: true, txnId };
  },

  /** Worship contribution verify → fund-worship vault. */
  recordWorshipContributionIncome(input: {
    actorPersonId: string;
    amount: number;
    description: string;
    occurredOn: string;
    contributionId: string;
  }): { ok: boolean; reason?: string; txnId?: string } {
    return this.recordWorshipFundIncome({
      ...input,
      txnPrefix: `txn-worship-${input.contributionId}`,
    });
  },

  recordWorshipFundIncome(input: {
    actorPersonId: string;
    amount: number;
    description: string;
    occurredOn: string;
    txnPrefix: string;
  }): { ok: boolean; reason?: string; txnId?: string } {
    const decision = this.authorizeFund(
      input.actorPersonId,
      'fund-worship',
      'MANAGE',
    );
    if (!decision.allowed) {
      return { ok: false, reason: decision.reason };
    }
    const txnId = input.txnPrefix;
    pushFinanceTxn({
      id: txnId,
      fundId: 'fund-worship',
      type: 'INCOME',
      amount: input.amount,
      description: input.description,
      occurredOn: input.occurredOn,
      recordedByPersonId: input.actorPersonId,
    });
    return { ok: true, txnId };
  },

  recordWorshipFundExpense(input: {
    actorPersonId: string;
    amount: number;
    description: string;
    occurredOn: string;
    expenseId: string;
  }): { ok: boolean; reason?: string; txnId?: string } {
    const decision = this.authorizeFund(
      input.actorPersonId,
      'fund-worship',
      'MANAGE',
    );
    if (!decision.allowed) {
      return { ok: false, reason: decision.reason };
    }
    const txnId = `txn-worship-exp-${input.expenseId}`;
    pushFinanceTxn({
      id: txnId,
      fundId: 'fund-worship',
      type: 'EXPENSE',
      amount: input.amount,
      description: input.description,
      occurredOn: input.occurredOn,
      recordedByPersonId: input.actorPersonId,
    });
    return { ok: true, txnId };
  },

  /** Deacon contribution / care spend → fund-deacon vault. */
  recordDeaconContributionIncome(input: {
    actorPersonId: string;
    amount: number;
    description: string;
    occurredOn: string;
    contributionId: string;
  }): { ok: boolean; reason?: string; txnId?: string } {
    return this.recordDeaconFundIncome({
      ...input,
      txnPrefix: `txn-deacon-${input.contributionId}`,
    });
  },

  recordDeaconFundIncome(input: {
    actorPersonId: string;
    amount: number;
    description: string;
    occurredOn: string;
    txnPrefix: string;
  }): { ok: boolean; reason?: string; txnId?: string } {
    const decision = this.authorizeFund(
      input.actorPersonId,
      'fund-deacon',
      'MANAGE',
    );
    if (!decision.allowed) {
      return { ok: false, reason: decision.reason };
    }
    const txnId = input.txnPrefix;
    pushFinanceTxn({
      id: txnId,
      fundId: 'fund-deacon',
      type: 'INCOME',
      amount: input.amount,
      description: input.description,
      occurredOn: input.occurredOn,
      recordedByPersonId: input.actorPersonId,
    });
    return { ok: true, txnId };
  },

  recordDeaconFundExpense(input: {
    actorPersonId: string;
    amount: number;
    description: string;
    occurredOn: string;
    expenseId: string;
  }): { ok: boolean; reason?: string; txnId?: string } {
    const manage = this.authorizeFund(
      input.actorPersonId,
      'fund-deacon',
      'MANAGE',
    );
    const approve = this.authorizeFund(
      input.actorPersonId,
      'fund-deacon',
      'APPROVE',
    );
    if (!manage.allowed && !approve.allowed) {
      return { ok: false, reason: manage.reason || approve.reason };
    }
    const txnId = `txn-deacon-exp-${input.expenseId}`;
    pushFinanceTxn({
      id: txnId,
      fundId: 'fund-deacon',
      type: 'EXPENSE',
      amount: input.amount,
      description: input.description,
      occurredOn: input.occurredOn,
      recordedByPersonId: input.actorPersonId,
    });
    return { ok: true, txnId };
  },

  /** Generic ministry kit → org-private fund vault. */
  recordMinistryFundIncome(input: {
    actorPersonId: string;
    fundId: string;
    amount: number;
    description: string;
    occurredOn: string;
    contributionId: string;
  }): { ok: boolean; reason?: string; txnId?: string } {
    const decision = this.authorizeFund(
      input.actorPersonId,
      input.fundId,
      'MANAGE',
    );
    if (!decision.allowed) {
      return { ok: false, reason: decision.reason };
    }
    const txnId = `txn-mf-${input.contributionId}`;
    pushFinanceTxn({
      id: txnId,
      fundId: input.fundId,
      type: 'INCOME',
      amount: input.amount,
      description: input.description,
      occurredOn: input.occurredOn,
      recordedByPersonId: input.actorPersonId,
    });
    return { ok: true, txnId };
  },

  recordMinistryFundExpense(input: {
    actorPersonId: string;
    fundId: string;
    amount: number;
    description: string;
    occurredOn: string;
    expenseId: string;
  }): { ok: boolean; reason?: string; txnId?: string } {
    const decision = this.authorizeFund(
      input.actorPersonId,
      input.fundId,
      'MANAGE',
    );
    if (!decision.allowed) {
      return { ok: false, reason: decision.reason };
    }
    const txnId = `txn-mf-exp-${input.expenseId}`;
    pushFinanceTxn({
      id: txnId,
      fundId: input.fundId,
      type: 'EXPENSE',
      amount: input.amount,
      description: input.description,
      occurredOn: input.occurredOn,
      recordedByPersonId: input.actorPersonId,
    });
    return { ok: true, txnId };
  },

  /**
   * Explicit internal transfer General ↔ ministry (or any two funds).
   * Posts TRANSFER_OUT + TRANSFER_IN pair.
   */
  recordFundTransfer(input: {
    actorPersonId: string;
    fromFundId: string;
    toFundId: string;
    amount: number;
    description: string;
    occurredOn?: string;
    contextType?: 'EVENT' | 'PROGRAM' | 'PROJECT';
    contextId?: string;
  }): { ok: boolean; reason?: string; outTxnId?: string; inTxnId?: string } {
    if (input.fromFundId === input.toFundId) {
      return { ok: false, reason: 'Choose two different funds' };
    }
    const amount = Math.round(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return { ok: false, reason: 'Amount must be positive' };
    }
    if (!FUNDS.find((f) => f.id === input.fromFundId)) {
      return { ok: false, reason: 'Unknown source fund' };
    }
    if (!FUNDS.find((f) => f.id === input.toFundId)) {
      return { ok: false, reason: 'Unknown destination fund' };
    }
    const fromAuth = this.authorizeFund(
      input.actorPersonId,
      input.fromFundId,
      'MANAGE',
    );
    if (!fromAuth.allowed) {
      return { ok: false, reason: `Source fund: ${fromAuth.reason}` };
    }
    const toAuth = this.authorizeFund(
      input.actorPersonId,
      input.toFundId,
      'MANAGE',
    );
    if (!toAuth.allowed) {
      return { ok: false, reason: `Destination fund: ${toAuth.reason}` };
    }
    if (this.balance(input.fromFundId) < amount) {
      return { ok: false, reason: 'Insufficient balance in source fund' };
    }
    const occurredOn =
      input.occurredOn ?? new Date().toISOString().slice(0, 10);
    const pair = `xfer-${Date.now().toString(36)}`;
    const outTxnId = `txn-${pair}-out`;
    const inTxnId = `txn-${pair}-in`;
    pushFinanceTxn({
      id: outTxnId,
      fundId: input.fromFundId,
      type: 'TRANSFER_OUT',
      amount,
      description: input.description,
      occurredOn,
      recordedByPersonId: input.actorPersonId,
      counterpartyFundId: input.toFundId,
      contextType: input.contextType,
      contextId: input.contextId,
    });
    pushFinanceTxn({
      id: inTxnId,
      fundId: input.toFundId,
      type: 'TRANSFER_IN',
      amount,
      description: input.description,
      occurredOn,
      recordedByPersonId: input.actorPersonId,
      counterpartyFundId: input.fromFundId,
      contextType: input.contextType,
      contextId: input.contextId,
    });
    return { ok: true, outTxnId, inTxnId };
  },
};
