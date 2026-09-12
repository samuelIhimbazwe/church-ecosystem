import {
  WORSHIP_ASSETS,
  WORSHIP_BUDGET_LINES,
  WORSHIP_BUDGETS,
  WORSHIP_CAMPAIGN_GIFTS,
  WORSHIP_CAMPAIGNS,
  WORSHIP_CONTRIBUTIONS,
  WORSHIP_CONTRIBUTION_TYPES,
  WORSHIP_DONATIONS,
  WORSHIP_DUTIES,
  WORSHIP_EXPENSES,
  WORSHIP_FOLLOW_UPS,
  WORSHIP_INCOME,
  WORSHIP_LIABILITIES,
  WORSHIP_PAYMENT_METHODS,
  WORSHIP_REHEARSALS,
  WORSHIP_ROSTER,
  WORSHIP_SEATS,
  WORSHIP_SONGS,
  WORSHIP_SPONSORS,
  WORSHIP_SPONSORSHIPS,
  WORSHIP_TEAM_MEMBERS,
  WORSHIP_TEAMS,
  pushWorshipAsset,
  pushWorshipCampaignGift,
  pushWorshipContribution,
  pushWorshipDonation,
  pushWorshipExpense,
  pushWorshipFollowUp,
  pushWorshipIncome,
  updateWorshipContribution,
  updateWorshipExpense,
  updateWorshipFollowUp,
  updateWorshipLiability,
} from '../data/worshipSeed';
import type {
  WorshipContribution,
  WorshipContributionStatus,
  WorshipDutyRole,
  WorshipDutySlot,
  WorshipOffice,
  WorshipPaymentMethod,
  WorshipRehearsal,
  WorshipSectionSeat,
  WorshipSong,
  WorshipVoiceSection,
} from '../domain/types';
import { peopleService } from './authService';
import {
  listClaimsPreferApi,
  submitClaimPreferApi,
  verifyClaimPreferApi,
} from './contributionApiBridge';
import { financeService } from './financeService';

const SECTION_ORDER: WorshipVoiceSection[] = [
  'SOPRANO',
  'ALTO',
  'TENOR',
  'BASS',
];

function personName(personId: string): string {
  const p = peopleService.getById(personId);
  return p?.preferredName || p?.fullName || personId;
}

function nid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

type ActionResult = { ok: boolean; reason?: string };

export const worshipService = {
  listSongs(filter?: { status?: WorshipSong['status'] }): WorshipSong[] {
    return WORSHIP_SONGS.filter((s) =>
      filter?.status ? s.status === filter.status : true,
    );
  },

  getSong(id: string): WorshipSong | null {
    return WORSHIP_SONGS.find((s) => s.id === id) ?? null;
  },

  listSeats(activeOnly = true): WorshipSectionSeat[] {
    return WORSHIP_SEATS.filter((s) => (activeOnly ? s.status === 'ACTIVE' : true));
  },

  seatsBySection(): Record<WorshipVoiceSection, WorshipSectionSeat[]> {
    const map = Object.fromEntries(
      SECTION_ORDER.map((s) => [s, [] as WorshipSectionSeat[]]),
    ) as Record<WorshipVoiceSection, WorshipSectionSeat[]>;
    for (const seat of this.listSeats(true)) {
      map[seat.section].push(seat);
    }
    return map;
  },

  sectionSummary() {
    const by = this.seatsBySection();
    return SECTION_ORDER.map((section) => ({
      section,
      count: by[section].length,
      members: by[section].map((seat) => ({
        seatId: seat.id,
        personId: seat.personId,
        name: personName(seat.personId),
      })),
    }));
  },

  listRehearsals(): WorshipRehearsal[] {
    return [...WORSHIP_REHEARSALS].sort((a, b) =>
      a.startsAt.localeCompare(b.startsAt),
    );
  },

  upcomingRehearsals(now = new Date()): WorshipRehearsal[] {
    return this.listRehearsals().filter(
      (r) => new Date(r.startsAt) >= new Date(now.toDateString()),
    );
  },

  listDuties(filter?: { eventId?: string }): WorshipDutySlot[] {
    return WORSHIP_DUTIES.filter((d) =>
      filter?.eventId ? d.eventId === filter.eventId : true,
    ).sort((a, b) => a.serviceDate.localeCompare(b.serviceDate));
  },

  dutyRoleLabel(role: WorshipDutyRole): string {
    return role.replaceAll('_', ' ');
  },

  officeLabel(office: WorshipOffice): string {
    const map: Record<WorshipOffice, string> = {
      ADMIN: 'Admin',
      PRESIDENT: 'President',
      VP: 'Vice President',
      SECRETARY: 'Secretary',
      TREASURER: 'Treasurer',
      COORDINATOR: 'Coordinator',
      MUSIC_DIRECTOR: 'Music Director',
      FAMILY_LEADER: 'Family Leader',
      FAMILY_VICE: 'Vice Family Leader',
      MEMBER: 'Member',
    };
    return map[office];
  },

  personLabel(personId: string): string {
    return personName(personId);
  },

  listRoster() {
    return WORSHIP_ROSTER.filter((m) => m.status === 'ACTIVE').map((m) => ({
      ...m,
      name: personName(m.personId),
      teamName: m.teamId
        ? (WORSHIP_TEAMS.find((t) => t.id === m.teamId)?.name ?? m.teamId)
        : '—',
    }));
  },

  rosterFor(personId: string) {
    return WORSHIP_ROSTER.find(
      (m) => m.personId === personId && m.status === 'ACTIVE',
    );
  },

  officeFor(personId: string): WorshipOffice | null {
    return this.rosterFor(personId)?.office ?? null;
  },

  listTeams() {
    return WORSHIP_TEAMS.filter((t) => t.status === 'ACTIVE').map((t) => ({
      ...t,
      memberCount: WORSHIP_TEAM_MEMBERS.filter(
        (m) => m.teamId === t.id && m.status === 'ACTIVE',
      ).length,
      leaderName: t.leaderPersonId
        ? personName(t.leaderPersonId)
        : undefined,
    }));
  },

  teamMembers(teamId: string) {
    return WORSHIP_TEAM_MEMBERS.filter(
      (m) => m.teamId === teamId && m.status === 'ACTIVE',
    ).map((m) => ({
      ...m,
      name: personName(m.personId),
    }));
  },

  teamIdForPerson(personId: string): string | undefined {
    return (
      WORSHIP_TEAM_MEMBERS.find(
        (m) => m.personId === personId && m.status === 'ACTIVE',
      )?.teamId ?? this.rosterFor(personId)?.teamId
    );
  },

  /** Teams this person may monitor for family finance. */
  ledTeamIds(personId: string): string[] {
    return WORSHIP_TEAMS.filter(
      (t) =>
        t.status === 'ACTIVE' &&
        (t.leaderPersonId === personId || t.viceLeaderPersonId === personId),
    ).map((t) => t.id);
  },

  contributionTypes(memberVisibleOnly = false) {
    return WORSHIP_CONTRIBUTION_TYPES.filter(
      (t) => t.active && (!memberVisibleOnly || t.memberVisible),
    );
  },

  paymentMethods(memberVisibleOnly = false) {
    return WORSHIP_PAYMENT_METHODS.filter(
      (m) => m.active && (!memberVisibleOnly || m.memberVisible),
    );
  },

  typeLabel(typeId: string): string {
    return WORSHIP_CONTRIBUTION_TYPES.find((t) => t.id === typeId)?.name ?? typeId;
  },

  listContributions(filter?: {
    status?: WorshipContributionStatus;
    personId?: string;
    teamId?: string;
  }): WorshipContribution[] {
    return WORSHIP_CONTRIBUTIONS.filter((c) => {
      if (filter?.status && c.status !== filter.status) return false;
      if (filter?.personId && c.personId !== filter.personId) return false;
      if (filter?.teamId && c.teamId !== filter.teamId) return false;
      return true;
    }).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  },

  submitContribution(input: {
    personId: string;
    typeId: string;
    amount: number;
    paymentMethod: WorshipPaymentMethod;
    occurredOn: string;
    note?: string;
    evidenceNote?: string;
  }): ActionResult & { id?: string } {
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      return { ok: false, reason: 'Amount must be positive' };
    }
    const type = WORSHIP_CONTRIBUTION_TYPES.find(
      (t) => t.id === input.typeId && t.active && t.memberVisible,
    );
    if (!type) return { ok: false, reason: 'Unknown contribution type' };
    const methodOk = WORSHIP_PAYMENT_METHODS.some(
      (m) =>
        m.method === input.paymentMethod && m.active && m.memberVisible,
    );
    if (!methodOk) return { ok: false, reason: 'Payment method not available' };
    const onRoster = WORSHIP_ROSTER.some(
      (m) => m.personId === input.personId && m.status === 'ACTIVE',
    );
    if (!onRoster) {
      return { ok: false, reason: 'Only Worship roster members can contribute' };
    }
    const id = nid('ccon');
    pushWorshipContribution({
      id,
      personId: input.personId,
      teamId: this.teamIdForPerson(input.personId),
      typeId: input.typeId,
      amount: Math.round(input.amount),
      paymentMethod: input.paymentMethod,
      occurredOn: input.occurredOn,
      status: 'PENDING',
      submittedAt: new Date().toISOString(),
      note: input.note,
      evidenceNote: input.evidenceNote,
    });
    return { ok: true, id };
  },

  verifyContribution(input: {
    contributionId: string;
    actorPersonId: string;
    decision: 'CONFIRMED' | 'PARTIAL' | 'DECLINED';
    confirmedAmount?: number;
    note?: string;
  }): ActionResult {
    const c = WORSHIP_CONTRIBUTIONS.find((x) => x.id === input.contributionId);
    if (!c) return { ok: false, reason: 'Unknown contribution' };
    if (c.status !== 'PENDING') {
      return { ok: false, reason: 'Already processed' };
    }

    if (input.decision === 'DECLINED') {
      const followId = nid('cfu');
      pushWorshipFollowUp({
        id: followId,
        contributionId: c.id,
        personId: c.personId,
        reason: input.note || 'Declined by treasurer',
        status: 'OPEN',
        createdAt: new Date().toISOString(),
        createdByPersonId: input.actorPersonId,
      });
      updateWorshipContribution(c.id, {
        status: 'DECLINED',
        verifiedAt: new Date().toISOString(),
        verifiedByPersonId: input.actorPersonId,
        verifyNote: input.note,
        followUpId: followId,
      });
      return { ok: true };
    }

    const amount =
      input.decision === 'PARTIAL'
        ? Math.round(input.confirmedAmount ?? 0)
        : c.amount;
    if (amount <= 0 || amount > c.amount) {
      return { ok: false, reason: 'Invalid confirmed amount' };
    }

    const posted = financeService.recordWorshipContributionIncome({
      actorPersonId: input.actorPersonId,
      amount,
      description: `Worship contribution · ${personName(c.personId)} · ${this.typeLabel(c.typeId)}`,
      occurredOn: c.occurredOn,
      contributionId: c.id,
    });
    if (!posted.ok) {
      return {
        ok: false,
        reason: posted.reason ?? 'Worship fund vault denied',
      };
    }

    let followUpId: string | undefined;
    if (input.decision === 'PARTIAL') {
      followUpId = nid('cfu');
      pushWorshipFollowUp({
        id: followUpId,
        contributionId: c.id,
        personId: c.personId,
        reason:
          input.note ||
          `Partial confirm ${amount.toLocaleString()} of ${c.amount.toLocaleString()} RWF`,
        status: 'OPEN',
        createdAt: new Date().toISOString(),
        createdByPersonId: input.actorPersonId,
      });
    }

    updateWorshipContribution(c.id, {
      status: input.decision === 'PARTIAL' ? 'PARTIAL' : 'CONFIRMED',
      confirmedAmount: amount,
      verifiedAt: new Date().toISOString(),
      verifiedByPersonId: input.actorPersonId,
      verifyNote: input.note,
      financeTxnId: posted.txnId,
      followUpId,
    });
    return { ok: true };
  },

  async listContributionsHybrid(filter?: {
    status?: WorshipContributionStatus;
    personId?: string;
  }): Promise<{ rows: WorshipContribution[]; source: 'api' | 'seed' }> {
    const remote = await listClaimsPreferApi('sys-worship', {
      mine: Boolean(filter?.personId),
    });
    if (remote) {
      let rows = remote.map(
        (c): WorshipContribution => ({
          ...c,
          status: c.status as WorshipContributionStatus,
        }),
      );
      if (filter?.personId) {
        rows = rows.filter((c) => c.personId === filter.personId);
      }
      if (filter?.status) {
        rows = rows.filter((c) => c.status === filter.status);
      }
      return { rows, source: 'api' };
    }
    return { rows: this.listContributions(filter), source: 'seed' };
  },

  async submitContributionHybrid(input: {
    personId: string;
    typeId: string;
    amount: number;
    paymentMethod: WorshipPaymentMethod;
    occurredOn: string;
    note?: string;
    evidenceNote?: string;
  }): Promise<ActionResult & { id?: string }> {
    const api = await submitClaimPreferApi({
      systemId: 'sys-worship',
      fundId: 'fund-worship',
      typeLabel: this.typeLabel(input.typeId),
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      occurredOn: input.occurredOn,
      note: input.note,
    });
    if (api) return api;
    return this.submitContribution(input);
  },

  async verifyContributionHybrid(input: {
    contributionId: string;
    actorPersonId: string;
    decision: 'CONFIRMED' | 'PARTIAL' | 'DECLINED';
    confirmedAmount?: number;
    note?: string;
  }): Promise<ActionResult> {
    const api = await verifyClaimPreferApi({
      contributionId: input.contributionId,
      decision: input.decision,
      confirmedAmount: input.confirmedAmount,
      note: input.note,
    });
    if (api) return api;
    return this.verifyContribution(input);
  },

  listFollowUps(openOnly = false) {
    return WORSHIP_FOLLOW_UPS.filter((f) =>
      openOnly ? f.status === 'OPEN' : true,
    ).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  closeFollowUp(id: string): ActionResult {
    const f = WORSHIP_FOLLOW_UPS.find((x) => x.id === id);
    if (!f) return { ok: false, reason: 'Unknown follow-up' };
    updateWorshipFollowUp(id, { status: 'CLOSED' });
    return { ok: true };
  },

  contributionSummary() {
    const claimed = WORSHIP_CONTRIBUTIONS.reduce((s, c) => s + c.amount, 0);
    const confirmed = WORSHIP_CONTRIBUTIONS.filter(
      (c) => c.status === 'CONFIRMED' || c.status === 'PARTIAL',
    ).reduce((s, c) => s + (c.confirmedAmount ?? c.amount), 0);
    const pending = WORSHIP_CONTRIBUTIONS.filter((c) => c.status === 'PENDING');
    return {
      claimed,
      confirmed,
      pendingCount: pending.length,
      pendingAmount: pending.reduce((s, c) => s + c.amount, 0),
      openFollowUps: WORSHIP_FOLLOW_UPS.filter((f) => f.status === 'OPEN').length,
      fundBalance: financeService.balance('fund-worship'),
    };
  },

  teamFinance(teamId: string) {
    const rows = this.listContributions({ teamId });
    const confirmed = rows
      .filter((c) => c.status === 'CONFIRMED' || c.status === 'PARTIAL')
      .reduce((s, c) => s + (c.confirmedAmount ?? c.amount), 0);
    const pending = rows
      .filter((c) => c.status === 'PENDING')
      .reduce((s, c) => s + c.amount, 0);
    return { teamId, rows, confirmed, pending, claimed: confirmed + pending };
  },

  ledgerCsv(): string {
    const lines = [
      'date,person,team,type,amount,confirmed,method,status,financeTxn',
    ];
    for (const c of this.listContributions()) {
      const team =
        WORSHIP_TEAMS.find((t) => t.id === c.teamId)?.name ?? c.teamId ?? '';
      lines.push(
        `${c.occurredOn},"${personName(c.personId)}","${team}","${this.typeLabel(c.typeId)}",${c.amount},${c.confirmedAmount ?? ''},${c.paymentMethod},${c.status},${c.financeTxnId ?? ''}`,
      );
    }
    return lines.join('\n');
  },

  /* ─── Donations / sponsors / fundraising ─── */

  listDonations() {
    return [...WORSHIP_DONATIONS].sort((a, b) =>
      b.occurredOn.localeCompare(a.occurredOn),
    );
  },

  recordDonation(input: {
    actorPersonId: string;
    donorName: string;
    source: string;
    donationType: string;
    amount: number;
    occurredOn: string;
    paymentMethod: WorshipPaymentMethod;
    evidenceNote?: string;
    postToFund?: boolean;
  }): ActionResult & { id?: string } {
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      return { ok: false, reason: 'Amount must be positive' };
    }
    const id = nid('cdon');
    let financeTxnId: string | undefined;
    if (input.postToFund !== false) {
      const posted = financeService.recordWorshipFundIncome({
        actorPersonId: input.actorPersonId,
        amount: Math.round(input.amount),
        description: `Worship donation · ${input.donorName} · ${input.donationType}`,
        occurredOn: input.occurredOn,
        txnPrefix: `txn-worship-${id}`,
      });
      if (!posted.ok) return { ok: false, reason: posted.reason };
      financeTxnId = posted.txnId;
    }
    pushWorshipDonation({
      id,
      donorName: input.donorName,
      source: input.source,
      donationType: input.donationType,
      amount: Math.round(input.amount),
      occurredOn: input.occurredOn,
      paymentMethod: input.paymentMethod,
      evidenceNote: input.evidenceNote,
      recordedByPersonId: input.actorPersonId,
      recordedAt: new Date().toISOString(),
      financeTxnId,
    });
    return { ok: true, id };
  },

  listSponsors() {
    return WORSHIP_SPONSORS.map((s) => {
      const deals = WORSHIP_SPONSORSHIPS.filter((x) => x.sponsorId === s.id);
      const total = deals.reduce((sum, d) => sum + d.amount, 0);
      return { ...s, sponsorships: deals, total };
    });
  },

  listCampaigns() {
    return WORSHIP_CAMPAIGNS.map((c) => {
      const gifts = WORSHIP_CAMPAIGN_GIFTS.filter((g) => g.campaignId === c.id);
      const raised = gifts.reduce((s, g) => s + g.amount, 0);
      return {
        ...c,
        raised,
        remaining: Math.max(0, c.goalAmount - raised),
        gifts,
      };
    });
  },

  addCampaignGift(input: {
    actorPersonId: string;
    campaignId: string;
    contributorName: string;
    amount: number;
    occurredOn: string;
    paymentMethod: WorshipPaymentMethod;
  }): ActionResult {
    const campaign = WORSHIP_CAMPAIGNS.find((c) => c.id === input.campaignId);
    if (!campaign || campaign.status !== 'ACTIVE') {
      return { ok: false, reason: 'Campaign not active' };
    }
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      return { ok: false, reason: 'Amount must be positive' };
    }
    pushWorshipCampaignGift({
      id: nid('cgift'),
      campaignId: input.campaignId,
      contributorName: input.contributorName,
      amount: Math.round(input.amount),
      occurredOn: input.occurredOn,
      paymentMethod: input.paymentMethod,
      recordedByPersonId: input.actorPersonId,
    });
    return { ok: true };
  },

  /* ─── Accounting / assets ─── */

  listBudgets() {
    return WORSHIP_BUDGETS.map((b) => ({
      ...b,
      lines: WORSHIP_BUDGET_LINES.filter((l) => l.budgetId === b.id),
      plannedIncome: WORSHIP_BUDGET_LINES.filter(
        (l) => l.budgetId === b.id && l.side === 'INCOME',
      ).reduce((s, l) => s + l.plannedAmount, 0),
      plannedExpense: WORSHIP_BUDGET_LINES.filter(
        (l) => l.budgetId === b.id && l.side === 'EXPENSE',
      ).reduce((s, l) => s + l.plannedAmount, 0),
    }));
  },

  listIncome() {
    return [...WORSHIP_INCOME].sort((a, b) =>
      b.occurredOn.localeCompare(a.occurredOn),
    );
  },

  recordIncome(input: {
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
    const id = nid('cinc');
    const posted = financeService.recordWorshipFundIncome({
      actorPersonId: input.actorPersonId,
      amount: Math.round(input.amount),
      description: `Worship income · ${input.category}`,
      occurredOn: input.occurredOn,
      txnPrefix: `txn-worship-${id}`,
    });
    if (!posted.ok) return { ok: false, reason: posted.reason };
    pushWorshipIncome({
      id,
      category: input.category,
      amount: Math.round(input.amount),
      occurredOn: input.occurredOn,
      description: input.description,
      recordedByPersonId: input.actorPersonId,
      budgetId: input.budgetId,
      financeTxnId: posted.txnId,
    });
    return { ok: true };
  },

  listExpenses() {
    return [...WORSHIP_EXPENSES].sort((a, b) =>
      b.occurredOn.localeCompare(a.occurredOn),
    );
  },

  submitExpense(input: {
    actorPersonId: string;
    category: string;
    amount: number;
    occurredOn: string;
    description: string;
  }): ActionResult {
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      return { ok: false, reason: 'Amount must be positive' };
    }
    pushWorshipExpense({
      id: nid('cexp'),
      category: input.category,
      amount: Math.round(input.amount),
      occurredOn: input.occurredOn,
      description: input.description,
      status: 'PENDING',
      recordedByPersonId: input.actorPersonId,
    });
    return { ok: true };
  },

  approveExpense(
    expenseId: string,
    actorPersonId: string,
    approve: boolean,
  ): ActionResult {
    const e = WORSHIP_EXPENSES.find((x) => x.id === expenseId);
    if (!e) return { ok: false, reason: 'Unknown expense' };
    if (e.status !== 'PENDING') {
      return { ok: false, reason: 'Already processed' };
    }
    if (!approve) {
      updateWorshipExpense(expenseId, {
        status: 'REJECTED',
        approvedByPersonId: actorPersonId,
      });
      return { ok: true };
    }
    const posted = financeService.recordWorshipFundExpense({
      actorPersonId,
      amount: e.amount,
      description: `Worship expense · ${e.category} · ${e.description}`,
      occurredOn: e.occurredOn,
      expenseId: e.id,
    });
    if (!posted.ok) return { ok: false, reason: posted.reason };
    updateWorshipExpense(expenseId, {
      status: 'APPROVED',
      approvedByPersonId: actorPersonId,
      financeTxnId: posted.txnId,
    });
    return { ok: true };
  },

  listAssets() {
    return [...WORSHIP_ASSETS];
  },

  listLiabilities() {
    return [...WORSHIP_LIABILITIES];
  },

  closeLiability(id: string): ActionResult {
    const l = WORSHIP_LIABILITIES.find((x) => x.id === id);
    if (!l) return { ok: false, reason: 'Unknown liability' };
    updateWorshipLiability(id, { status: 'CLOSED' });
    return { ok: true };
  },

  addAsset(input: {
    name: string;
    category: string;
    value: number;
    acquiredOn: string;
    assignedToPersonId?: string;
  }): ActionResult {
    pushWorshipAsset({
      id: nid('cass'),
      name: input.name,
      category: input.category,
      value: Math.round(input.value),
      acquiredOn: input.acquiredOn,
      assignedToPersonId: input.assignedToPersonId,
      status: 'ACTIVE',
    });
    return { ok: true };
  },

  financeReport() {
    const contrib = this.contributionSummary();
    const donations = WORSHIP_DONATIONS.reduce((s, d) => s + d.amount, 0);
    const sponsorships = WORSHIP_SPONSORSHIPS.reduce((s, d) => s + d.amount, 0);
    const campaignRaised = WORSHIP_CAMPAIGN_GIFTS.reduce((s, g) => s + g.amount, 0);
    const income = WORSHIP_INCOME.reduce((s, r) => s + r.amount, 0);
    const expensesApproved = WORSHIP_EXPENSES.filter(
      (e) => e.status === 'APPROVED',
    ).reduce((s, e) => s + e.amount, 0);
    const assets = WORSHIP_ASSETS.filter((a) => a.status === 'ACTIVE').reduce(
      (s, a) => s + a.value,
      0,
    );
    const liabilities = WORSHIP_LIABILITIES.filter(
      (l) => l.status === 'OPEN',
    ).reduce((s, l) => s + l.amount, 0);
    return {
      contributionsConfirmed: contrib.confirmed,
      contributionsPending: contrib.pendingAmount,
      donations,
      sponsorships,
      campaignRaised,
      otherIncome: income,
      expensesApproved,
      assets,
      liabilities,
      fundBalance: contrib.fundBalance,
      netAssets: assets - liabilities,
    };
  },

  financeReportCsv(): string {
    const r = this.financeReport();
    return [
      'metric,amount_rwf',
      `contributions_confirmed,${r.contributionsConfirmed}`,
      `contributions_pending,${r.contributionsPending}`,
      `donations,${r.donations}`,
      `sponsorships,${r.sponsorships}`,
      `campaign_raised,${r.campaignRaised}`,
      `other_income,${r.otherIncome}`,
      `expenses_approved,${r.expensesApproved}`,
      `assets,${r.assets}`,
      `liabilities_open,${r.liabilities}`,
      `fund_balance,${r.fundBalance}`,
      `net_assets,${r.netAssets}`,
    ].join('\n');
  },

  stats() {
    const finance = this.contributionSummary();
    return {
      songsReady: WORSHIP_SONGS.filter((s) => s.status === 'READY').length,
      songsLearning: WORSHIP_SONGS.filter((s) => s.status === 'LEARNING').length,
      activeSingers: this.listSeats(true).length,
      upcomingRehearsals: this.upcomingRehearsals().length,
      openDuties: WORSHIP_DUTIES.filter((d) => d.status === 'ASSIGNED').length,
      rosterCount: WORSHIP_ROSTER.filter((m) => m.status === 'ACTIVE').length,
      teams: WORSHIP_TEAMS.filter((t) => t.status === 'ACTIVE').length,
      pendingPayments: finance.pendingCount,
      pendingExpenses: WORSHIP_EXPENSES.filter((e) => e.status === 'PENDING')
        .length,
      fundBalance: finance.fundBalance,
      activeCampaigns: WORSHIP_CAMPAIGNS.filter((c) => c.status === 'ACTIVE')
        .length,
    };
  },
};
