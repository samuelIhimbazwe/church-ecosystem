import {
  FUND_ID_BY_SYSTEM,
  MF_ASSETS,
  MF_BUDGET_LINES,
  MF_BUDGETS,
  MF_CAMPAIGN_GIFTS,
  MF_CAMPAIGNS,
  MF_CONTRIBUTIONS,
  MF_DONATIONS,
  MF_DRIVES,
  MF_EXPENSES,
  MF_FOLLOWUPS,
  MF_GOALS,
  MF_INCOME,
  MF_LIABILITIES,
  MF_METHODS,
  MF_SPONSORS,
  MF_SPONSORSHIPS,
  MF_TYPES,
} from '../data/ministryFinanceSeed';
import { POSITIONS } from '../data/seed';
import {
  apiSubmitContribution,
  apiVerifyContribution,
  loadContributionsPreferApi,
} from '../api/contributionsApi';
import { isApiEnabled } from '../api';
import type {
  MinistryContribution,
  MinistryPaymentMethod,
  SystemId,
} from '../domain/types';
import { peopleService } from './authService';
import { financeService } from './financeService';
import { missionService } from './missionService';

type ActionResult = { ok: boolean; reason?: string; id?: string };

function nid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

function personLabel(personId: string) {
  const p = peopleService.getById(personId);
  return p?.preferredName || p?.fullName || personId;
}

export const ministryFinanceService = {
  fundIdFor(systemId: SystemId): string | null {
    return FUND_ID_BY_SYSTEM[systemId] ?? null;
  },

  contributionTypes(systemId: SystemId, memberVisibleOnly = false) {
    return MF_TYPES.filter(
      (t) =>
        t.systemId === systemId &&
        t.active &&
        (!memberVisibleOnly || t.memberVisible),
    );
  },

  paymentMethods(systemId: SystemId, memberVisibleOnly = false) {
    return MF_METHODS.filter(
      (m) =>
        m.systemId === systemId &&
        m.active &&
        (!memberVisibleOnly || m.memberVisible),
    );
  },

  typeLabel(systemId: SystemId, typeId: string) {
    return (
      MF_TYPES.find((t) => t.systemId === systemId && t.id === typeId)?.name ??
      typeId
    );
  },

  listDrives(systemId: SystemId, activeOnly = false) {
    return MF_DRIVES.filter(
      (d) =>
        d.systemId === systemId && (activeOnly ? d.status === 'ACTIVE' : true),
    );
  },

  listGoals(driveId?: string) {
    return MF_GOALS.filter((g) => (driveId ? g.driveId === driveId : true));
  },

  listContributions(
    systemId: SystemId,
    filter?: { status?: string; personId?: string },
  ) {
    return MF_CONTRIBUTIONS.filter((c) => {
      if (c.systemId !== systemId) return false;
      if (filter?.status && c.status !== filter.status) return false;
      if (filter?.personId && c.personId !== filter.personId) return false;
      return true;
    }).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  },

  /**
   * Prefer API claims when enabled; otherwise seed list.
   * Returns null fund/canVerify from API meta when remote.
   */
  async listContributionsHybrid(
    systemId: SystemId,
    filter?: { status?: string; personId?: string; mine?: boolean },
  ): Promise<{
    rows: MinistryContribution[];
    source: 'api' | 'seed';
    fundId: string | null;
    canVerify: boolean | null;
  }> {
    const remote = await loadContributionsPreferApi(systemId, {
      status: filter?.status,
      mine: filter?.mine || Boolean(filter?.personId),
    });
    if (remote) {
      let rows = remote.claims;
      if (filter?.personId) {
        rows = rows.filter((c) => c.personId === filter.personId);
      }
      if (filter?.status) {
        rows = rows.filter((c) => c.status === filter.status);
      }
      return {
        rows,
        source: 'api',
        fundId: remote.fundId,
        canVerify: remote.canVerify,
      };
    }
    return {
      rows: this.listContributions(systemId, filter),
      source: 'seed',
      fundId: this.fundIdFor(systemId),
      canVerify: null,
    };
  },

  async submitContributionHybrid(input: {
    systemId: SystemId;
    personId: string;
    typeId: string;
    amount: number;
    paymentMethod: MinistryPaymentMethod;
    occurredOn: string;
    note?: string;
    driveId?: string;
    programId?: string;
    projectId?: string;
  }): Promise<ActionResult> {
    if (isApiEnabled()) {
      try {
        const typeLabel = this.typeLabel(input.systemId, input.typeId);
        const c = await apiSubmitContribution({
          systemId: input.systemId,
          typeLabel,
          amount: input.amount,
          paymentMethod: input.paymentMethod,
          occurredOn: input.occurredOn,
          note: input.note,
        });
        return { ok: true, id: c.id };
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'API claim failed';
        if (!msg.includes('No contribution fund')) {
          /* fall through to seed when API down / unmapped */
        }
      }
    }
    return this.submitContribution(input);
  },

  async verifyContributionHybrid(input: {
    systemId: SystemId;
    contributionId: string;
    actorPersonId: string;
    decision: 'CONFIRMED' | 'PARTIAL' | 'DECLINED';
    confirmedAmount?: number;
    note?: string;
  }): Promise<ActionResult> {
    if (isApiEnabled()) {
      try {
        await apiVerifyContribution({
          contributionId: input.contributionId,
          decision: input.decision,
          confirmedAmount: input.confirmedAmount,
          note: input.note,
        });
        return { ok: true };
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Verify failed';
        /* API claim ids won't exist in seed — surface error */
        if (input.contributionId.startsWith('mf-c')) {
          /* seed id — fall through */
        } else {
          return { ok: false, reason: msg };
        }
      }
    }
    return this.verifyContribution(input);
  },

  contributionSummary(systemId: SystemId) {
    const all = this.listContributions(systemId);
    const pending = all.filter((c) => c.status === 'PENDING');
    const confirmed = all.filter(
      (c) => c.status === 'CONFIRMED' || c.status === 'PARTIAL',
    );
    const fundId = this.fundIdFor(systemId);
    return {
      pendingCount: pending.length,
      pendingAmount: pending.reduce((s, c) => s + c.amount, 0),
      confirmed: confirmed.reduce(
        (s, c) => s + (c.confirmedAmount ?? c.amount),
        0,
      ),
      fundBalance: fundId ? financeService.balance(fundId) : 0,
      fundId,
    };
  },

  submitContribution(input: {
    systemId: SystemId;
    personId: string;
    typeId: string;
    amount: number;
    paymentMethod: MinistryPaymentMethod;
    occurredOn: string;
    note?: string;
    driveId?: string;
    programId?: string;
    projectId?: string;
  }): ActionResult {
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      return { ok: false, reason: 'Amount must be positive' };
    }
    const type = MF_TYPES.find(
      (t) =>
        t.systemId === input.systemId &&
        t.id === input.typeId &&
        t.active &&
        t.memberVisible,
    );
    if (!type) return { ok: false, reason: 'Unknown contribution type' };
    const methodOk = MF_METHODS.some(
      (m) =>
        m.systemId === input.systemId &&
        m.method === input.paymentMethod &&
        m.active &&
        m.memberVisible,
    );
    if (!methodOk) return { ok: false, reason: 'Payment method not available' };
    if (input.driveId) {
      const drive = MF_DRIVES.find(
        (d) =>
          d.id === input.driveId &&
          d.systemId === input.systemId &&
          d.status === 'ACTIVE',
      );
      if (!drive) return { ok: false, reason: 'Unknown or closed drive' };
    }
    const id = nid('mf-c');
    MF_CONTRIBUTIONS.unshift({
      id,
      systemId: input.systemId,
      personId: input.personId,
      typeId: input.typeId,
      driveId: input.driveId,
      amount: Math.round(input.amount),
      paymentMethod: input.paymentMethod,
      occurredOn: input.occurredOn,
      status: 'PENDING',
      submittedAt: new Date().toISOString(),
      note: input.note,
      programId: input.programId,
      projectId: input.projectId,
    });
    return { ok: true, id };
  },

  verifyContribution(input: {
    systemId: SystemId;
    contributionId: string;
    actorPersonId: string;
    decision: 'CONFIRMED' | 'PARTIAL' | 'DECLINED';
    confirmedAmount?: number;
    note?: string;
  }): ActionResult {
    const i = MF_CONTRIBUTIONS.findIndex(
      (c) => c.id === input.contributionId && c.systemId === input.systemId,
    );
    if (i < 0) return { ok: false, reason: 'Unknown contribution' };
    const c = MF_CONTRIBUTIONS[i];
    if (c.status !== 'PENDING') {
      return { ok: false, reason: 'Already processed' };
    }
    const fundId = this.fundIdFor(input.systemId);
    if (!fundId) return { ok: false, reason: 'No fund vault for system' };

    if (input.decision === 'DECLINED') {
      const followId = nid('mf-fu');
      MF_FOLLOWUPS.unshift({
        id: followId,
        systemId: input.systemId,
        contributionId: c.id,
        personId: c.personId,
        reason: input.note || 'Declined by treasurer',
        status: 'OPEN',
        createdAt: new Date().toISOString(),
        createdByPersonId: input.actorPersonId,
      });
      MF_CONTRIBUTIONS[i] = {
        ...c,
        status: 'DECLINED',
        verifiedAt: new Date().toISOString(),
        verifiedByPersonId: input.actorPersonId,
        verifyNote: input.note,
        followUpId: followId,
      };
      return { ok: true };
    }

    const amount =
      input.decision === 'PARTIAL'
        ? Math.round(input.confirmedAmount ?? c.amount)
        : c.amount;
    const posted = financeService.recordMinistryFundIncome({
      actorPersonId: input.actorPersonId,
      fundId,
      amount,
      description: `Contribution · ${personLabel(c.personId)} · ${this.typeLabel(input.systemId, c.typeId)}`,
      occurredOn: c.occurredOn,
      contributionId: c.id,
    });
    if (!posted.ok) return { ok: false, reason: posted.reason };

    MF_CONTRIBUTIONS[i] = {
      ...c,
      status: input.decision,
      confirmedAmount: amount,
      verifiedAt: new Date().toISOString(),
      verifiedByPersonId: input.actorPersonId,
      verifyNote: input.note,
      financeTxnId: posted.txnId,
    };

    if (c.programId || c.projectId) {
      const tagged = missionService.applyDesignatedGift({
        amount,
        label: `Contribution · ${this.typeLabel(input.systemId, c.typeId)}`,
        fundId,
        donationId: c.id,
        personId: input.actorPersonId,
        programId: c.programId,
        projectId: c.projectId,
        note: input.note,
      });
      void import('../api/missionApi')
        .then(({ apiApplyDesignatedGift }) =>
          apiApplyDesignatedGift({
            amount,
            label: `Contribution · ${this.typeLabel(input.systemId, c.typeId)}`,
            fundId,
            donationId: c.id,
            programId: c.programId,
            projectId: c.projectId,
            note: input.note,
          }),
        )
        .catch(() => undefined);
      if (tagged.warnings?.length) {
        return { ok: true, reason: tagged.warnings.join('; ') };
      }
    }
    return { ok: true };
  },

  listFollowUps(systemId: SystemId, openOnly = false) {
    return MF_FOLLOWUPS.filter(
      (f) =>
        f.systemId === systemId && (openOnly ? f.status === 'OPEN' : true),
    );
  },

  listDonations(systemId: SystemId) {
    return MF_DONATIONS.filter((d) => d.systemId === systemId);
  },

  recordDonation(input: {
    systemId: SystemId;
    actorPersonId: string;
    donorName: string;
    source: string;
    donationType: string;
    amount: number;
    occurredOn: string;
    paymentMethod: MinistryPaymentMethod;
    evidenceNote?: string;
    programId?: string;
    projectId?: string;
  }): ActionResult {
    const fundId = this.fundIdFor(input.systemId);
    if (!fundId) return { ok: false, reason: 'No fund vault' };
    const id = nid('mf-don');
    const posted = financeService.recordMinistryFundIncome({
      actorPersonId: input.actorPersonId,
      fundId,
      amount: Math.round(input.amount),
      description: `Donation · ${input.donorName} · ${input.donationType}`,
      occurredOn: input.occurredOn,
      contributionId: id,
    });
    if (!posted.ok) return { ok: false, reason: posted.reason };
    MF_DONATIONS.unshift({
      id,
      systemId: input.systemId,
      donorName: input.donorName,
      source: input.source,
      donationType: input.donationType,
      amount: Math.round(input.amount),
      occurredOn: input.occurredOn,
      paymentMethod: input.paymentMethod,
      evidenceNote: input.evidenceNote,
      recordedByPersonId: input.actorPersonId,
      recordedAt: new Date().toISOString(),
      financeTxnId: posted.txnId,
      programId: input.programId,
      projectId: input.projectId,
    });
    if (input.programId || input.projectId) {
      const tagged = missionService.applyDesignatedGift({
        amount: Math.round(input.amount),
        label: `Donation · ${input.donorName} · ${input.donationType}`,
        fundId,
        donationId: id,
        personId: input.actorPersonId,
        programId: input.programId,
        projectId: input.projectId,
        note: input.evidenceNote,
      });
      if (tagged.warnings?.length) {
        return { ok: true, id, reason: tagged.warnings.join('; ') };
      }
    }
    return { ok: true, id };
  },

  listSponsors(systemId: SystemId) {
    return MF_SPONSORS.filter((s) => s.systemId === systemId);
  },

  listSponsorships(systemId: SystemId) {
    return MF_SPONSORSHIPS.filter((s) => s.systemId === systemId);
  },

  listCampaigns(systemId: SystemId) {
    return MF_CAMPAIGNS.filter((c) => c.systemId === systemId);
  },

  listCampaignGifts(systemId: SystemId, campaignId?: string) {
    return MF_CAMPAIGN_GIFTS.filter(
      (g) =>
        g.systemId === systemId &&
        (campaignId ? g.campaignId === campaignId : true),
    );
  },

  recordCampaignGift(input: {
    systemId: SystemId;
    campaignId: string;
    contributorName: string;
    amount: number;
    occurredOn: string;
    paymentMethod: MinistryPaymentMethod;
    actorPersonId: string;
  }): ActionResult {
    const camp = MF_CAMPAIGNS.find(
      (c) => c.id === input.campaignId && c.systemId === input.systemId,
    );
    if (!camp) return { ok: false, reason: 'Unknown campaign' };
    const id = nid('mf-cg');
    MF_CAMPAIGN_GIFTS.unshift({
      id,
      systemId: input.systemId,
      campaignId: input.campaignId,
      contributorName: input.contributorName,
      amount: Math.round(input.amount),
      occurredOn: input.occurredOn,
      paymentMethod: input.paymentMethod,
      recordedByPersonId: input.actorPersonId,
    });
    return { ok: true, id };
  },

  listBudgets(systemId: SystemId) {
    return MF_BUDGETS.filter((b) => b.systemId === systemId);
  },

  listBudgetLines(systemId: SystemId, budgetId?: string) {
    return MF_BUDGET_LINES.filter(
      (l) =>
        l.systemId === systemId &&
        (budgetId ? l.budgetId === budgetId : true),
    );
  },

  budgetPlannedTotals(systemId: SystemId, budgetId: string) {
    const lines = this.listBudgetLines(systemId, budgetId);
    return {
      plannedIncome: lines
        .filter((l) => l.side === 'INCOME')
        .reduce((s, l) => s + l.plannedAmount, 0),
      plannedExpense: lines
        .filter((l) => l.side === 'EXPENSE')
        .reduce((s, l) => s + l.plannedAmount, 0),
    };
  },

  listIncome(systemId: SystemId) {
    return MF_INCOME.filter((r) => r.systemId === systemId).sort((a, b) =>
      b.occurredOn.localeCompare(a.occurredOn),
    );
  },

  listExpenses(systemId: SystemId) {
    return MF_EXPENSES.filter((r) => r.systemId === systemId).sort((a, b) =>
      b.occurredOn.localeCompare(a.occurredOn),
    );
  },

  recordIncome(input: {
    systemId: SystemId;
    actorPersonId: string;
    category: string;
    amount: number;
    occurredOn: string;
    description: string;
    budgetId?: string;
  }): ActionResult {
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      return { ok: false, reason: 'Amount must be positive' };
    }
    const fundId = this.fundIdFor(input.systemId);
    if (!fundId) return { ok: false, reason: 'No fund vault' };
    const id = nid('mf-inc');
    const posted = financeService.recordMinistryFundIncome({
      actorPersonId: input.actorPersonId,
      fundId,
      amount: Math.round(input.amount),
      description: `Income · ${input.category} · ${input.description}`,
      occurredOn: input.occurredOn,
      contributionId: id,
    });
    if (!posted.ok) return { ok: false, reason: posted.reason };
    MF_INCOME.unshift({
      id,
      systemId: input.systemId,
      category: input.category,
      amount: Math.round(input.amount),
      occurredOn: input.occurredOn,
      description: input.description,
      recordedByPersonId: input.actorPersonId,
      budgetId: input.budgetId,
      financeTxnId: posted.txnId,
    });
    return { ok: true, id };
  },

  /** Submit expense for approval (does not hit the fund until approved). */
  submitExpense(input: {
    systemId: SystemId;
    actorPersonId: string;
    category: string;
    amount: number;
    occurredOn: string;
    description: string;
    programId?: string;
    projectId?: string;
  }): ActionResult {
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      return { ok: false, reason: 'Amount must be positive' };
    }
    const id = nid('mf-exp');
    MF_EXPENSES.unshift({
      id,
      systemId: input.systemId,
      category: input.category,
      amount: Math.round(input.amount),
      occurredOn: input.occurredOn,
      description: input.description,
      status: 'PENDING',
      recordedByPersonId: input.actorPersonId,
      programId: input.programId,
      projectId: input.projectId,
    });
    return { ok: true, id };
  },

  approveExpense(
    systemId: SystemId,
    expenseId: string,
    actorPersonId: string,
    approve: boolean,
  ): ActionResult {
    const e = MF_EXPENSES.find(
      (x) => x.id === expenseId && x.systemId === systemId,
    );
    if (!e) return { ok: false, reason: 'Unknown expense' };
    if (e.status !== 'PENDING') {
      return { ok: false, reason: 'Already processed' };
    }
    if (!approve) {
      e.status = 'REJECTED';
      e.approvedByPersonId = actorPersonId;
      return { ok: true };
    }
    const fundId = this.fundIdFor(systemId);
    if (!fundId) return { ok: false, reason: 'No fund vault' };
    const posted = financeService.recordMinistryFundExpense({
      actorPersonId,
      fundId,
      amount: e.amount,
      description: `Expense · ${e.category} · ${e.description}`,
      occurredOn: e.occurredOn,
      expenseId: e.id,
    });
    if (!posted.ok) return { ok: false, reason: posted.reason };
    e.status = 'APPROVED';
    e.approvedByPersonId = actorPersonId;
    e.financeTxnId = posted.txnId;
    // W2: tagged spend → stewardship.usedCost (seed + fire-and-forget API).
    if (e.programId || e.projectId) {
      if (e.programId) {
        const s = missionService.stewardshipOf('PROGRAM', e.programId);
        if (s) {
          missionService.setUsedCost(
            'PROGRAM',
            e.programId,
            (Number(s.usedCost) || 0) + e.amount,
          );
        }
      }
      if (e.projectId) {
        const s = missionService.stewardshipOf('PROJECT', e.projectId);
        if (s) {
          missionService.setUsedCost(
            'PROJECT',
            e.projectId,
            (Number(s.usedCost) || 0) + e.amount,
          );
        }
      }
      void import('../api/missionApi')
        .then(({ apiIncrementUsedCost }) =>
          apiIncrementUsedCost({
            amount: e.amount,
            programId: e.programId,
            projectId: e.projectId,
            expenseId: e.id,
          }),
        )
        .catch(() => undefined);
    }
    return { ok: true };
  },

  /** Legacy: submit + approve in one step when actor can post to fund. */
  recordExpense(input: {
    systemId: SystemId;
    actorPersonId: string;
    category: string;
    amount: number;
    occurredOn: string;
    description: string;
  }): ActionResult {
    const submitted = this.submitExpense(input);
    if (!submitted.ok || !submitted.id) return submitted;
    return this.approveExpense(
      input.systemId,
      submitted.id,
      input.actorPersonId,
      true,
    );
  },

  listAssets(systemId: SystemId) {
    return MF_ASSETS.filter((a) => a.systemId === systemId);
  },

  addAsset(input: {
    systemId: SystemId;
    name: string;
    category: string;
    value: number;
    acquiredOn: string;
    assignedToPersonId?: string;
  }): ActionResult {
    if (!Number.isFinite(input.value) || input.value < 0) {
      return { ok: false, reason: 'Value must be zero or positive' };
    }
    if (!input.name.trim()) return { ok: false, reason: 'Name required' };
    const id = nid('mf-asset');
    MF_ASSETS.unshift({
      id,
      systemId: input.systemId,
      name: input.name.trim(),
      category: input.category.trim() || 'Equipment',
      value: Math.round(input.value),
      acquiredOn: input.acquiredOn,
      assignedToPersonId: input.assignedToPersonId,
      status: 'ACTIVE',
    });
    return { ok: true, id };
  },

  assignAsset(
    systemId: SystemId,
    assetId: string,
    assignedToPersonId: string | undefined,
  ): ActionResult {
    const a = MF_ASSETS.find(
      (x) => x.id === assetId && x.systemId === systemId,
    );
    if (!a) return { ok: false, reason: 'Unknown asset' };
    if (a.status !== 'ACTIVE') return { ok: false, reason: 'Asset not active' };
    a.assignedToPersonId = assignedToPersonId;
    a.historyNote = assignedToPersonId
      ? `Assigned to ${personLabel(assignedToPersonId)}`
      : 'Unassigned';
    return { ok: true };
  },

  disposeAsset(systemId: SystemId, assetId: string): ActionResult {
    const a = MF_ASSETS.find(
      (x) => x.id === assetId && x.systemId === systemId,
    );
    if (!a) return { ok: false, reason: 'Unknown asset' };
    if (a.status !== 'ACTIVE') return { ok: false, reason: 'Already disposed' };
    a.status = 'DISPOSED';
    a.assignedToPersonId = undefined;
    a.historyNote = 'Disposed';
    return { ok: true };
  },

  listLiabilities(systemId: SystemId) {
    return MF_LIABILITIES.filter((l) => l.systemId === systemId);
  },

  addLiability(input: {
    systemId: SystemId;
    name: string;
    amount: number;
    dueDate: string;
    notes?: string;
  }): ActionResult {
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      return { ok: false, reason: 'Amount must be positive' };
    }
    if (!input.name.trim()) return { ok: false, reason: 'Name required' };
    const id = nid('mf-liab');
    MF_LIABILITIES.unshift({
      id,
      systemId: input.systemId,
      name: input.name.trim(),
      amount: Math.round(input.amount),
      dueDate: input.dueDate,
      status: 'OPEN',
      notes: input.notes,
    });
    return { ok: true, id };
  },

  closeLiability(systemId: SystemId, liabilityId: string): ActionResult {
    const l = MF_LIABILITIES.find(
      (x) => x.id === liabilityId && x.systemId === systemId,
    );
    if (!l) return { ok: false, reason: 'Unknown liability' };
    if (l.status !== 'OPEN') return { ok: false, reason: 'Already closed' };
    l.status = 'CLOSED';
    return { ok: true };
  },

  personLabel,

  /** Board / office holders for asset assignment pickers. */
  assigneesFor(systemId: SystemId): Array<{ id: string; label: string }> {
    const ids = [
      ...new Set(
        POSITIONS.filter(
          (p) => p.systemId === systemId && p.status === 'ACTIVE',
        ).map((p) => p.personId),
      ),
    ];
    return ids.map((id) => ({ id, label: personLabel(id) }));
  },

  ledgerCsv(systemId: SystemId) {
    const rows = this.listContributions(systemId);
    const header =
      'date,person,type,amount,confirmed,method,status,txn';
    const lines = rows.map(
      (c) =>
        `${c.occurredOn},"${personLabel(c.personId)}","${this.typeLabel(systemId, c.typeId)}",${c.amount},${c.confirmedAmount ?? ''},${c.paymentMethod},${c.status},${c.financeTxnId ?? ''}`,
    );
    return [header, ...lines].join('\n');
  },

  financeReport(systemId: SystemId) {
    const summary = this.contributionSummary(systemId);
    const donations = this.listDonations(systemId).reduce(
      (s, d) => s + d.amount,
      0,
    );
    const sponsorships = this.listSponsorships(systemId).reduce(
      (s, d) => s + d.amount,
      0,
    );
    const campaignRaised = this.listCampaignGifts(systemId).reduce(
      (s, g) => s + g.amount,
      0,
    );
    const otherIncome = this.listIncome(systemId).reduce(
      (s, r) => s + r.amount,
      0,
    );
    const expensesApproved = this.listExpenses(systemId)
      .filter((e) => e.status === 'APPROVED')
      .reduce((s, e) => s + e.amount, 0);
    const expensesPending = this.listExpenses(systemId)
      .filter((e) => e.status === 'PENDING')
      .reduce((s, e) => s + e.amount, 0);
    const assets = this.listAssets(systemId)
      .filter((a) => a.status === 'ACTIVE')
      .reduce((s, a) => s + a.value, 0);
    const liabilities = this.listLiabilities(systemId)
      .filter((l) => l.status === 'OPEN')
      .reduce((s, l) => s + l.amount, 0);
    return {
      contributionsConfirmed: summary.confirmed,
      contributionsPending: summary.pendingAmount,
      donations,
      sponsorships,
      campaignRaised,
      otherIncome,
      expensesApproved,
      expensesPending,
      assets,
      liabilities,
      fundBalance: summary.fundBalance,
      netAssets: assets - liabilities,
      openFollowUps: this.listFollowUps(systemId, true).length,
      fundId: summary.fundId,
    };
  },

  financeReportCsv(systemId: SystemId): string {
    const r = this.financeReport(systemId);
    return [
      'metric,amount_rwf',
      `contributions_confirmed,${r.contributionsConfirmed}`,
      `contributions_pending,${r.contributionsPending}`,
      `donations,${r.donations}`,
      `sponsorships,${r.sponsorships}`,
      `campaign_raised,${r.campaignRaised}`,
      `other_income,${r.otherIncome}`,
      `expenses_approved,${r.expensesApproved}`,
      `expenses_pending,${r.expensesPending}`,
      `assets,${r.assets}`,
      `liabilities_open,${r.liabilities}`,
      `fund_balance,${r.fundBalance}`,
      `net_assets,${r.netAssets}`,
    ].join('\n');
  },

  /** @deprecated Prefer financeReport — kept for older callers. */
  reports(systemId: SystemId) {
    const r = this.financeReport(systemId);
    return {
      confirmed: r.contributionsConfirmed,
      pendingAmount: r.contributionsPending,
      fundBalance: r.fundBalance,
      fundId: r.fundId,
      donationTotal: r.donations,
      expenseTotal: r.expensesApproved,
      assetTotal: r.assets,
      openFollowUps: r.openFollowUps,
    };
  },
};
