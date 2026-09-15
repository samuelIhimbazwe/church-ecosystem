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
import { POSITIONS } from '../data/seed';
import type {
  CareEscalateTo,
  CareSubmitterRole,
  DeaconCareCase,
  DeaconCaseStatus,
  DeaconContribution,
  DeaconOffice,
  DeaconPaymentMethod,
  WellbeingCategory,
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

function isChurchLeaderPerson(personId: string): boolean {
  return POSITIONS.some(
    (p) =>
      p.personId === personId &&
      p.status === 'ACTIVE' &&
      p.systemRole === 'CHURCH_LEADER',
  );
}

export const WELLBEING_LABELS: Record<WellbeingCategory, string> = {
  NORMAL: 'Normal',
  SICK: 'Sick',
  DIED_OR_BEREAVED: 'Died / lost someone',
  OTHER_ISSUE: 'Other serious issue',
  WEDDING: 'Have a wedding',
  BAPTISM: 'Have a baptism',
  BREAKTHROUGH: 'Breakthrough / achievement',
};

export const CARE_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Open case',
  HANDLING: 'Handling it',
  WILL_HANDLE: 'We will handle it',
  CLOSED: 'Closed case',
  IN_PROGRESS: 'Handling it',
};

function normalizeStatus(status: DeaconCaseStatus): DeaconCaseStatus {
  return status === 'IN_PROGRESS' ? 'HANDLING' : status;
}

export const deaconService = {
  personLabel,
  WELLBEING_LABELS,
  CARE_STATUS_LABELS,

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

  listCases(filter?: {
    status?: DeaconCaseStatus;
    escalateTo?: CareEscalateTo;
  }) {
    return DEACON_CASES.filter((c) => {
      if (filter?.status && normalizeStatus(c.status) !== filter.status) {
        return false;
      }
      if (filter?.escalateTo && c.escalateTo !== filter.escalateTo) {
        return false;
      }
      return true;
    });
  },

  /** Upward view for Leader/pastor/catechist — summary only, no privateNotes. */
  listCasesForOversight(escalateTo?: CareEscalateTo) {
    return this.listCases(
      escalateTo ? { escalateTo } : undefined,
    ).map((c) => ({
      id: c.id,
      title: c.title,
      personId: c.personId,
      householdNote: c.householdNote,
      status: normalizeStatus(c.status),
      priority: c.priority,
      openedOn: c.openedOn,
      category: c.category,
      categoryDetail: c.categoryDetail,
      summary: c.summary ?? c.title,
      escalateTo: c.escalateTo,
      sickSince: c.sickSince,
      sickLocation: c.sickLocation,
      sickStatus: c.sickStatus,
      assignedPersonId: c.assignedPersonId,
    }));
  },

  getCase(id: string) {
    return DEACON_CASES.find((c) => c.id === id) ?? null;
  },

  /**
   * Submit a care case (member / catechist / secretary / deacon).
   * Deacons prioritize; does not silently overwrite as final truth.
   */
  submitCase(input: {
    title: string;
    personId?: string;
    householdNote?: string;
    priority?: DeaconCareCase['priority'];
    category: WellbeingCategory;
    categoryDetail?: string;
    summary?: string;
    privateNotes?: string;
    submittedByPersonId: string;
    submittedByRole: CareSubmitterRole;
    escalateTo?: CareEscalateTo;
    sickSince?: string;
    sickLocation?: DeaconCareCase['sickLocation'];
    sickStatus?: string;
    openedOn?: string;
    assignedPersonId?: string;
  }) {
    if (
      (input.category === 'OTHER_ISSUE' || input.category === 'BREAKTHROUGH') &&
      !input.categoryDetail?.trim()
    ) {
      return {
        ok: false as const,
        reason: 'Name the issue or breakthrough',
      };
    }
    const summary =
      input.summary?.trim() ||
      [
        WELLBEING_LABELS[input.category],
        input.categoryDetail,
        input.sickLocation
          ? input.sickLocation === 'HOSPITAL'
            ? 'hospital'
            : input.sickLocation === 'HOME'
              ? 'home'
              : 'other location'
          : undefined,
      ]
        .filter(Boolean)
        .join(' · ');

    const c: DeaconCareCase = {
      id: nid('dcase'),
      title: input.title,
      personId: input.personId || undefined,
      householdNote: input.householdNote,
      status: 'OPEN',
      priority: input.priority ?? 'NORMAL',
      openedOn: input.openedOn ?? new Date().toISOString().slice(0, 10),
      assignedPersonId: input.assignedPersonId,
      category: input.category,
      categoryDetail: input.categoryDetail,
      summary,
      privateNotes: input.privateNotes,
      submittedByPersonId: input.submittedByPersonId,
      submittedByRole: input.submittedByRole,
      escalateTo: input.escalateTo,
      sickSince: input.sickSince,
      sickLocation: input.sickLocation,
      sickStatus: input.sickStatus,
    };
    pushDeaconCase(c);
    return { ok: true as const, case: c };
  },

  /** @deprecated Prefer submitCase */
  openCase(input: {
    title: string;
    personId?: string;
    householdNote?: string;
    priority: DeaconCareCase['priority'];
    assignedPersonId?: string;
    notes?: string;
    openedOn: string;
  }) {
    const r = this.submitCase({
      title: input.title,
      personId: input.personId,
      householdNote: input.householdNote,
      priority: input.priority,
      category: 'OTHER_ISSUE',
      categoryDetail: input.title,
      privateNotes: input.notes,
      summary: input.title,
      submittedByPersonId: input.assignedPersonId ?? 'unknown',
      submittedByRole: 'DEACON',
      openedOn: input.openedOn,
      assignedPersonId: input.assignedPersonId,
    });
    return r.ok ? r.case : null;
  },

  updateCaseStatus(id: string, status: DeaconCaseStatus) {
    updateDeaconCase(id, { status: normalizeStatus(status) });
  },

  prioritizeCase(
    id: string,
    patch: {
      priority?: DeaconCareCase['priority'];
      status?: DeaconCaseStatus;
      escalateTo?: CareEscalateTo;
      assignedPersonId?: string;
      summary?: string;
    },
  ) {
    updateDeaconCase(id, {
      ...patch,
      status: patch.status ? normalizeStatus(patch.status) : undefined,
    });
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
      updateDeaconCase(input.caseId, { status: 'HANDLING' });
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

  /**
   * Benevolence / care spend — Church Leader must approve (always wait for him).
   * Deacons may reject a pending row; only Leader can approve.
   */
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
    if (approve && !isChurchLeaderPerson(actorPersonId)) {
      return {
        ok: false,
        reason: 'Church Leader must approve care spending — wait for him',
      };
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
      openCases: DEACON_CASES.filter(
        (c) => normalizeStatus(c.status) !== 'CLOSED',
      ).length,
      visits: DEACON_VISITS.length,
      pendingPayments: DEACON_CONTRIBUTIONS.filter((c) => c.status === 'PENDING')
        .length,
      pendingExpenses: DEACON_EXPENSES.filter((e) => e.status === 'PENDING')
        .length,
    };
  },
};
