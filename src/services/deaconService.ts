import {
  DEACON_CASES,
  DEACON_CONTRIBUTIONS,
  DEACON_EXPENSES,
  DEACON_ROSTER,
  DEACON_VISITS,
  pushDeaconCase,
  pushDeaconContribution,
  pushDeaconExpense,
  pushDeaconVisit,
  updateDeaconCase,
  updateDeaconContribution,
  updateDeaconExpense,
} from '../data/deaconSeed';
import type {
  DeaconCareCase,
  DeaconCaseStatus,
  DeaconContribution,
  DeaconOffice,
  DeaconPaymentMethod,
} from '../domain/types';
import { peopleService } from './authService';
import {
  listClaimsPreferApi,
  submitClaimPreferApi,
  verifyClaimPreferApi,
} from './contributionApiBridge';
import { financeService } from './financeService';

function nid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function personLabel(personId: string): string {
  const p = peopleService.getById(personId);
  return p?.preferredName || p?.fullName || personId;
}

export const deaconService = {
  personLabel,

  officeLabel(office: DeaconOffice): string {
    const map: Record<DeaconOffice, string> = {
      COORDINATOR: 'Coordinator',
      PRESIDENT: 'President',
      SECRETARY: 'Secretary',
      TREASURER: 'Treasurer',
      MEMBER: 'Member',
    };
    return map[office];
  },

  listRoster(activeOnly = true) {
    return DEACON_ROSTER.filter((r) =>
      activeOnly ? r.status === 'ACTIVE' : true,
    );
  },

  listCases(filter?: { status?: DeaconCaseStatus }) {
    return DEACON_CASES.filter((c) =>
      filter?.status ? c.status === filter.status : true,
    );
  },

  getCase(id: string) {
    return DEACON_CASES.find((c) => c.id === id) ?? null;
  },

  openCase(input: {
    title: string;
    personId?: string;
    householdNote?: string;
    priority: DeaconCareCase['priority'];
    assignedPersonId?: string;
    notes?: string;
    openedOn: string;
  }) {
    const c: DeaconCareCase = {
      id: nid('dcase'),
      title: input.title,
      personId: input.personId || undefined,
      householdNote: input.householdNote,
      status: 'OPEN',
      priority: input.priority,
      openedOn: input.openedOn,
      assignedPersonId: input.assignedPersonId,
      notes: input.notes,
    };
    pushDeaconCase(c);
    return c;
  },

  updateCaseStatus(id: string, status: DeaconCaseStatus) {
    updateDeaconCase(id, { status });
  },

  listVisits(caseId?: string) {
    return DEACON_VISITS.filter((v) =>
      caseId ? v.caseId === caseId : true,
    ).sort((a, b) => b.visitedOn.localeCompare(a.visitedOn));
  },

  recordVisit(input: {
    caseId?: string;
    personId?: string;
    visitedOn: string;
    visitorPersonId: string;
    location?: string;
    notes?: string;
  }) {
    const v = {
      id: nid('dvis'),
      ...input,
    };
    pushDeaconVisit(v);
    if (input.caseId) {
      updateDeaconCase(input.caseId, { status: 'IN_PROGRESS' });
    }
    return v;
  },

  listContributions(filter?: {
    personId?: string;
    status?: DeaconContribution['status'];
  }) {
    return DEACON_CONTRIBUTIONS.filter((c) => {
      if (filter?.personId && c.personId !== filter.personId) return false;
      if (filter?.status && c.status !== filter.status) return false;
      return true;
    });
  },

  submitContribution(input: {
    personId: string;
    amount: number;
    paymentMethod: DeaconPaymentMethod;
    occurredOn: string;
    note?: string;
  }) {
    const c: DeaconContribution = {
      id: nid('dcon'),
      personId: input.personId,
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      occurredOn: input.occurredOn,
      status: 'PENDING',
      submittedAt: new Date().toISOString(),
      note: input.note,
    };
    pushDeaconContribution(c);
    return c;
  },

  verifyContribution(input: {
    contributionId: string;
    actorPersonId: string;
    status: 'CONFIRMED' | 'DECLINED';
  }): { ok: boolean; reason?: string } {
    const c = DEACON_CONTRIBUTIONS.find((x) => x.id === input.contributionId);
    if (!c) return { ok: false, reason: 'Contribution not found' };
    if (c.status !== 'PENDING') {
      return { ok: false, reason: 'Already processed' };
    }
    if (input.status === 'DECLINED') {
      updateDeaconContribution(c.id, {
        status: 'DECLINED',
        verifiedAt: new Date().toISOString(),
        verifiedByPersonId: input.actorPersonId,
      });
      return { ok: true };
    }
    const posted = financeService.recordDeaconContributionIncome({
      actorPersonId: input.actorPersonId,
      amount: c.amount,
      description: `Deacon contribution · ${personLabel(c.personId)}`,
      occurredOn: c.occurredOn,
      contributionId: c.id,
    });
    if (!posted.ok) return { ok: false, reason: posted.reason };
    updateDeaconContribution(c.id, {
      status: 'CONFIRMED',
      verifiedAt: new Date().toISOString(),
      verifiedByPersonId: input.actorPersonId,
      financeTxnId: posted.txnId,
    });
    return { ok: true };
  },

  async listContributionsHybrid(filter?: {
    personId?: string;
  }): Promise<{ rows: DeaconContribution[]; source: 'api' | 'seed' }> {
    const remote = await listClaimsPreferApi('sys-deacon', {
      mine: Boolean(filter?.personId),
    });
    if (remote) {
      let rows = remote.map(
        (c): DeaconContribution => ({
          id: c.id,
          personId: c.personId,
          amount: c.amount,
          paymentMethod: c.paymentMethod as DeaconPaymentMethod,
          occurredOn: c.occurredOn,
          status: c.status as DeaconContribution['status'],
          submittedAt: c.submittedAt,
          note: c.note,
          verifiedAt: c.verifiedAt,
          verifiedByPersonId: c.verifiedByPersonId,
          financeTxnId: c.financeTxnId,
        }),
      );
      if (filter?.personId) {
        rows = rows.filter((c) => c.personId === filter.personId);
      }
      return { rows, source: 'api' };
    }
    const seed = [...DEACON_CONTRIBUTIONS].filter((c) =>
      filter?.personId ? c.personId === filter.personId : true,
    );
    return { rows: seed, source: 'seed' };
  },

  async submitContributionHybrid(input: {
    personId: string;
    amount: number;
    paymentMethod: DeaconPaymentMethod;
    occurredOn: string;
    note?: string;
  }): Promise<DeaconContribution | { ok: false; reason: string }> {
    const api = await submitClaimPreferApi({
      systemId: 'sys-deacon',
      fundId: 'fund-deacon',
      typeLabel: 'Deacon contribution',
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      occurredOn: input.occurredOn,
      note: input.note,
    });
    if (api) {
      if (!api.ok) return { ok: false, reason: api.reason ?? 'Failed' };
      return {
        id: api.id!,
        personId: input.personId,
        amount: Math.round(input.amount),
        paymentMethod: input.paymentMethod,
        occurredOn: input.occurredOn,
        status: 'PENDING',
        submittedAt: new Date().toISOString(),
        note: input.note,
      };
    }
    return this.submitContribution(input);
  },

  async verifyContributionHybrid(input: {
    contributionId: string;
    actorPersonId: string;
    status: 'CONFIRMED' | 'DECLINED';
  }): Promise<{ ok: boolean; reason?: string }> {
    const api = await verifyClaimPreferApi({
      contributionId: input.contributionId,
      decision: input.status,
    });
    if (api) return api;
    return this.verifyContribution(input);
  },

  listExpenses() {
    return [...DEACON_EXPENSES];
  },

  submitExpense(input: {
    category: string;
    amount: number;
    occurredOn: string;
    description: string;
    caseId?: string;
    recordedByPersonId: string;
  }) {
    const r = {
      id: nid('dexp'),
      category: input.category,
      amount: input.amount,
      occurredOn: input.occurredOn,
      description: input.description,
      status: 'PENDING' as const,
      caseId: input.caseId,
      recordedByPersonId: input.recordedByPersonId,
    };
    pushDeaconExpense(r);
    return r;
  },

  approveExpense(
    expenseId: string,
    actorPersonId: string,
    approve: boolean,
  ): { ok: boolean; reason?: string } {
    const e = DEACON_EXPENSES.find((x) => x.id === expenseId);
    if (!e) return { ok: false, reason: 'Expense not found' };
    if (e.status !== 'PENDING') {
      return { ok: false, reason: 'Already processed' };
    }
    if (!approve) {
      updateDeaconExpense(e.id, {
        status: 'REJECTED',
        approvedByPersonId: actorPersonId,
      });
      return { ok: true };
    }
    const posted = financeService.recordDeaconFundExpense({
      actorPersonId,
      amount: e.amount,
      description: `Deacon expense · ${e.description}`,
      occurredOn: e.occurredOn,
      expenseId: e.id,
    });
    if (!posted.ok) return { ok: false, reason: posted.reason };
    updateDeaconExpense(e.id, {
      status: 'APPROVED',
      approvedByPersonId: actorPersonId,
      financeTxnId: posted.txnId,
    });
    return { ok: true };
  },

  stats() {
    return {
      rosterCount: this.listRoster().length,
      openCases: DEACON_CASES.filter((c) => c.status !== 'CLOSED').length,
      visits: DEACON_VISITS.length,
      pendingPayments: DEACON_CONTRIBUTIONS.filter((c) => c.status === 'PENDING')
        .length,
      pendingExpenses: DEACON_EXPENSES.filter((e) => e.status === 'PENDING')
        .length,
      fundBalance: financeService.balance('fund-deacon'),
    };
  },
};
