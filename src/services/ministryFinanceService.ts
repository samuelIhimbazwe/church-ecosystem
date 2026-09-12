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

  listIncome(systemId: SystemId) {
    return MF_INCOME.filter((r) => r.systemId === systemId);
  },

  listExpenses(systemId: SystemId) {
    return MF_EXPENSES.filter((r) => r.systemId === systemId);
  },

  recordExpense(input: {
    systemId: SystemId;
    actorPersonId: string;
    category: string;
    amount: number;
    occurredOn: string;
    description: string;
  }): ActionResult {
    const fundId = this.fundIdFor(input.systemId);
    if (!fundId) return { ok: false, reason: 'No fund vault' };
    const id = nid('mf-exp');
    const posted = financeService.recordMinistryFundExpense({
      actorPersonId: input.actorPersonId,
      fundId,
      amount: Math.round(input.amount),
      description: `Expense · ${input.category} · ${input.description}`,
      occurredOn: input.occurredOn,
      expenseId: id,
    });
    if (!posted.ok) return { ok: false, reason: posted.reason };
    MF_EXPENSES.unshift({
      id,
      systemId: input.systemId,
      category: input.category,
      amount: Math.round(input.amount),
      occurredOn: input.occurredOn,
      description: input.description,
      status: 'APPROVED',
      recordedByPersonId: input.actorPersonId,
      approvedByPersonId: input.actorPersonId,
      financeTxnId: posted.txnId,
    });
    return { ok: true, id };
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
  }): ActionResult {
    const id = nid('mf-asset');
    MF_ASSETS.unshift({
      id,
      systemId: input.systemId,
      name: input.name,
      category: input.category,
      value: Math.round(input.value),
      acquiredOn: input.acquiredOn,
      status: 'ACTIVE',
    });
    return { ok: true, id };
  },

  listLiabilities(systemId: SystemId) {
    return MF_LIABILITIES.filter((l) => l.systemId === systemId);
  },

  personLabel,

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

  reports(systemId: SystemId) {
    const summary = this.contributionSummary(systemId);
    const donations = this.listDonations(systemId);
    const expenses = this.listExpenses(systemId);
    const assets = this.listAssets(systemId);
    return {
      ...summary,
      donationTotal: donations.reduce((s, d) => s + d.amount, 0),
      expenseTotal: expenses.reduce((s, e) => s + e.amount, 0),
      assetTotal: assets.reduce((s, a) => s + a.value, 0),
      openFollowUps: this.listFollowUps(systemId, true).length,
    };
  },
};
