import {
  CHOIR_ASSETS,
  CHOIR_BUDGET_LINES,
  CHOIR_BUDGETS,
  CHOIR_CAMPAIGN_GIFTS,
  CHOIR_CAMPAIGNS,
  CHOIR_CONTRIBUTIONS,
  CHOIR_CONTRIBUTION_DRIVES,
  CHOIR_CONTRIBUTION_GOALS,
  CHOIR_CONTRIBUTION_TYPES,
  CHOIR_DONATIONS,
  CHOIR_DUTIES,
  CHOIR_EXPENSES,
  CHOIR_FAMILY_RAILS,
  CHOIR_FOLLOW_UPS,
  CHOIR_INCOME,
  CHOIR_LIABILITIES,
  CHOIR_PAYMENT_METHODS,
  CHOIR_REHEARSALS,
  CHOIR_ROSTER,
  CHOIR_SEATS,
  CHOIR_SONGS,
  CHOIR_SPONSORS,
  CHOIR_SPONSORSHIPS,
  CHOIR_TEAM_MEMBERS,
  CHOIR_TEAMS,
  pushChoirAsset,
  pushChoirCampaignGift,
  pushChoirContribution,
  pushChoirDonation,
  pushChoirExpense,
  pushChoirFollowUp,
  pushChoirIncome,
  updateChoirContribution,
  updateChoirExpense,
  updateChoirFollowUp,
  updateChoirLiability,
} from '../data/choirSeed';
import { fundIdForChoirOrgUnit } from '../domain/choirCatalog';
import {
  choirOfficeMayViewAllFamilies,
} from '../domain/choirAccess';
import type {
  ChoirContribution,
  ChoirContributionStatus,
  ChoirDutyRole,
  ChoirDutySlot,
  ChoirOffice,
  ChoirPaymentMethod,
  ChoirRehearsal,
  ChoirSectionSeat,
  ChoirSong,
  ChoirVoiceSection,
} from '../domain/types';
import { peopleService } from './authService';
import {
  getActiveChoirOrgUnitId,
  requireActiveChoirOrgUnitId,
} from './choirScope';
import {
  listClaimsPreferApi,
  submitClaimPreferApi,
  verifyClaimPreferApi,
} from './contributionApiBridge';
import { financeService } from './financeService';
import { choirContributionOps } from './choirContributionOps';

const SECTION_ORDER: ChoirVoiceSection[] = [
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

function activeChoir(): string | null {
  return getActiveChoirOrgUnitId();
}

function inActiveChoir(row: { orgUnitId?: string }): boolean {
  const ou = activeChoir();
  if (!ou) return false;
  return row.orgUnitId === ou;
}

function inActiveChoirRequired(row: { orgUnitId: string }): boolean {
  const ou = activeChoir();
  if (!ou) return false;
  return row.orgUnitId === ou;
}

function activeChoirFundId(): string | null {
  const ou = activeChoir();
  return ou ? fundIdForChoirOrgUnit(ou) : null;
}

type ActionResult = { ok: boolean; reason?: string };

export const choirService = {
  listSongs(filter?: { status?: ChoirSong['status'] }): ChoirSong[] {
    return CHOIR_SONGS.filter(
      (s) =>
        inActiveChoirRequired(s) &&
        (filter?.status ? s.status === filter.status : true),
    );
  },

  getSong(id: string): ChoirSong | null {
    const s = CHOIR_SONGS.find((x) => x.id === id);
    return s && inActiveChoirRequired(s) ? s : null;
  },

  listSeats(activeOnly = true): ChoirSectionSeat[] {
    return CHOIR_SEATS.filter(
      (s) =>
        inActiveChoirRequired(s) &&
        (activeOnly ? s.status === 'ACTIVE' : true),
    );
  },

  seatsBySection(): Record<ChoirVoiceSection, ChoirSectionSeat[]> {
    const map = Object.fromEntries(
      SECTION_ORDER.map((s) => [s, [] as ChoirSectionSeat[]]),
    ) as Record<ChoirVoiceSection, ChoirSectionSeat[]>;
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

  listRehearsals(): ChoirRehearsal[] {
    return CHOIR_REHEARSALS.filter(inActiveChoirRequired).sort((a, b) =>
      a.startsAt.localeCompare(b.startsAt),
    );
  },

  upcomingRehearsals(now = new Date()): ChoirRehearsal[] {
    return this.listRehearsals().filter(
      (r) => new Date(r.startsAt) >= new Date(now.toDateString()),
    );
  },

  listDuties(filter?: { eventId?: string }): ChoirDutySlot[] {
    return CHOIR_DUTIES.filter(
      (d) =>
        inActiveChoirRequired(d) &&
        (filter?.eventId ? d.eventId === filter.eventId : true),
    ).sort((a, b) => a.serviceDate.localeCompare(b.serviceDate));
  },

  dutyRoleLabel(role: ChoirDutyRole): string {
    return role.replaceAll('_', ' ');
  },

  officeLabel(office: ChoirOffice, advisorRole?: string): string {
    if (office === 'ADVISOR') {
      return advisorRole ? `Advisor · ${advisorRole}` : 'Advisor';
    }
    const map: Record<Exclude<ChoirOffice, 'ADVISOR'>, string> = {
      PRESIDENT: 'President',
      VP: 'Vice President',
      SECRETARY: 'Secretary',
      TREASURER: 'Treasurer',
      COORDINATOR: 'Coordinator (families)',
      MUSIC_DIRECTOR: 'Music Director',
      FAMILY_LEADER: 'Family Leader',
      MEMBER: 'Member',
    };
    return map[office];
  },

  displayOfficeFor(personId: string): string {
    const row = this.rosterFor(personId);
    if (!row) return '—';
    return this.officeLabel(row.office, row.advisorRole);
  },

  /** Treasurer + Coordinator see every family's contribution rollup. */
  canViewAllFamilyFinance(personId: string): boolean {
    return choirOfficeMayViewAllFamilies(this.officeFor(personId));
  },

  personLabel(personId: string): string {
    return personName(personId);
  },

  listRoster() {
    return CHOIR_ROSTER.filter(
      (m) => m.status === 'ACTIVE' && inActiveChoirRequired(m),
    ).map((m) => ({
      ...m,
      name: personName(m.personId),
      teamName: m.teamId
        ? (CHOIR_TEAMS.find((t) => t.id === m.teamId)?.name ?? m.teamId)
        : '—',
    }));
  },

  rosterFor(personId: string) {
    return CHOIR_ROSTER.find(
      (m) =>
        m.personId === personId &&
        m.status === 'ACTIVE' &&
        inActiveChoirRequired(m),
    );
  },

  officeFor(personId: string): ChoirOffice | null {
    return this.rosterFor(personId)?.office ?? null;
  },

  listTeams() {
    return CHOIR_TEAMS.filter(
      (t) => t.status === 'ACTIVE' && inActiveChoirRequired(t),
    ).map((t) => ({
      ...t,
      memberCount: CHOIR_TEAM_MEMBERS.filter(
        (m) => m.teamId === t.id && m.status === 'ACTIVE',
      ).length,
      leaderName: t.leaderPersonId
        ? personName(t.leaderPersonId)
        : undefined,
    }));
  },

  teamMembers(teamId: string) {
    const team = CHOIR_TEAMS.find((t) => t.id === teamId);
    if (!team || !inActiveChoirRequired(team)) return [];
    return CHOIR_TEAM_MEMBERS.filter(
      (m) => m.teamId === teamId && m.status === 'ACTIVE',
    ).map((m) => ({
      ...m,
      name: personName(m.personId),
    }));
  },

  teamIdForPerson(personId: string): string | undefined {
    const teamId =
      CHOIR_TEAM_MEMBERS.find(
        (m) => m.personId === personId && m.status === 'ACTIVE',
      )?.teamId ?? this.rosterFor(personId)?.teamId;
    if (!teamId) return undefined;
    const team = CHOIR_TEAMS.find((t) => t.id === teamId);
    return team && inActiveChoirRequired(team) ? teamId : undefined;
  },

  /** Teams this person may monitor for family finance. */
  ledTeamIds(personId: string): string[] {
    return CHOIR_TEAMS.filter(
      (t) =>
        t.status === 'ACTIVE' &&
        inActiveChoirRequired(t) &&
        (t.leaderPersonId === personId || t.viceLeaderPersonId === personId),
    ).map((t) => t.id);
  },

  contributionTypes(memberVisibleOnly = false) {
    return CHOIR_CONTRIBUTION_TYPES.filter(
      (t) =>
        inActiveChoir(t) &&
        t.active &&
        (!memberVisibleOnly || t.memberVisible),
    );
  },

  paymentMethods(memberVisibleOnly = false) {
    return CHOIR_PAYMENT_METHODS.filter(
      (m) =>
        inActiveChoir(m) &&
        m.active &&
        (!memberVisibleOnly || m.memberVisible),
    );
  },

  typeLabel(typeId: string): string {
    return CHOIR_CONTRIBUTION_TYPES.find((t) => t.id === typeId)?.name ?? typeId;
  },

  listContributions(filter?: {
    status?: ChoirContributionStatus;
    personId?: string;
    teamId?: string;
  }): ChoirContribution[] {
    return CHOIR_CONTRIBUTIONS.filter((c) => {
      if (!inActiveChoir(c)) return false;
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
    paymentMethod: ChoirPaymentMethod;
    occurredOn: string;
    note?: string;
    evidenceNote?: string;
    driveId?: string;
    receivedByPersonId?: string;
  }): ActionResult & { id?: string } {
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      return { ok: false, reason: 'Amount must be positive' };
    }
    let orgUnitId: string;
    try {
      orgUnitId = requireActiveChoirOrgUnitId();
    } catch {
      return { ok: false, reason: 'No active choir selected' };
    }
    const type = CHOIR_CONTRIBUTION_TYPES.find(
      (t) =>
        t.id === input.typeId &&
        t.active &&
        t.memberVisible &&
        inActiveChoir(t),
    );
    if (!type) return { ok: false, reason: 'Unknown contribution type' };
    const methodOk = CHOIR_PAYMENT_METHODS.some(
      (m) =>
        m.method === input.paymentMethod &&
        m.active &&
        m.memberVisible &&
        inActiveChoir(m),
    );
    if (!methodOk) return { ok: false, reason: 'Payment method not available' };
    const onRoster = CHOIR_ROSTER.some(
      (m) =>
        m.personId === input.personId &&
        m.status === 'ACTIVE' &&
        m.orgUnitId === orgUnitId,
    );
    if (!onRoster) {
      return { ok: false, reason: 'Only choir roster members can contribute' };
    }
    if (input.driveId) {
      const drive = CHOIR_CONTRIBUTION_DRIVES.find(
        (d) =>
          d.id === input.driveId &&
          d.status === 'ACTIVE' &&
          inActiveChoir(d),
      );
      if (!drive) return { ok: false, reason: 'Unknown or closed drive' };
    }
    const id = nid('ccon');
    const now = new Date().toISOString();
    const teamId = this.teamIdForPerson(input.personId);
    const familyRail = teamId
      ? CHOIR_FAMILY_RAILS.find(
          (r) =>
            r.teamId === teamId &&
            r.active &&
            r.kind === (input.paymentMethod === 'BANK' ? 'BANK' : 'MOMO') &&
            inActiveChoir(r),
        )
      : undefined;
    pushChoirContribution({
      id,
      orgUnitId,
      personId: input.personId,
      teamId,
      typeId: input.typeId,
      driveId: input.driveId,
      amount: Math.round(input.amount),
      paymentMethod: input.paymentMethod,
      familyRailId: familyRail?.id,
      occurredOn: input.occurredOn,
      status: 'PENDING',
      submittedAt: now,
      note: input.note,
      evidenceNote: input.evidenceNote,
      receivedByPersonId: input.receivedByPersonId,
      receivedAt: input.receivedByPersonId ? now : undefined,
    });
    try {
      const created = CHOIR_CONTRIBUTIONS.find((x) => x.id === id);
      if (created) choirContributionOps.recordClaimSubmitted(created);
    } catch {
      /* ignore */
    }
    return { ok: true, id };
  },

  /** Record who took the money (cash handoff / MoMo agent) before verify. */
  markContributionReceived(input: {
    contributionId: string;
    receivedByPersonId: string;
    receivedAt?: string;
  }): ActionResult {
    const c = CHOIR_CONTRIBUTIONS.find(
      (x) => x.id === input.contributionId && inActiveChoir(x),
    );
    if (!c) return { ok: false, reason: 'Unknown contribution' };
    if (c.status !== 'PENDING') {
      return { ok: false, reason: 'Already processed' };
    }
    updateChoirContribution(c.id, {
      receivedByPersonId: input.receivedByPersonId,
      receivedAt: input.receivedAt ?? new Date().toISOString(),
    });
    return { ok: true };
  },

  listContributionDrives(activeOnly = false) {
    return CHOIR_CONTRIBUTION_DRIVES.filter(
      (d) =>
        inActiveChoir(d) && (activeOnly ? d.status === 'ACTIVE' : true),
    ).sort((a, b) => b.startsOn.localeCompare(a.startsOn));
  },

  listContributionGoals(driveId?: string) {
    return CHOIR_CONTRIBUTION_GOALS.filter((g) => {
      if (driveId && g.driveId !== driveId) return false;
      const drive = CHOIR_CONTRIBUTION_DRIVES.find((d) => d.id === g.driveId);
      return drive ? inActiveChoir(drive) : false;
    });
  },

  driveProgress(driveId: string) {
    const drive = CHOIR_CONTRIBUTION_DRIVES.find(
      (d) => d.id === driveId && inActiveChoir(d),
    );
    if (!drive) return null;
    const goals = this.listContributionGoals(driveId);
    const rows = this.listContributions().filter(
      (c) =>
        c.driveId === driveId &&
        (c.status === 'CONFIRMED' || c.status === 'PARTIAL'),
    );
    const raised = rows.reduce(
      (s, c) => s + (c.confirmedAmount ?? c.amount),
      0,
    );
    const ministryGoal = goals.find((g) => g.scope === 'MINISTRY');
    return {
      drive,
      goals,
      raised,
      ministryTarget: ministryGoal?.targetAmount ?? null,
      confirmedCount: rows.length,
    };
  },

  verifyContribution(input: {
    contributionId: string;
    actorPersonId: string;
    decision: 'CONFIRMED' | 'PARTIAL' | 'DECLINED';
    confirmedAmount?: number;
    note?: string;
  }): ActionResult {
    const c = CHOIR_CONTRIBUTIONS.find(
      (x) => x.id === input.contributionId && inActiveChoir(x),
    );
    if (!c) return { ok: false, reason: 'Unknown contribution' };
    if (c.status !== 'PENDING') {
      return { ok: false, reason: 'Already processed' };
    }

    if (input.decision === 'DECLINED') {
      const followId = nid('cfu');
      pushChoirFollowUp({
        id: followId,
        contributionId: c.id,
        personId: c.personId,
        reason: input.note || 'Declined by treasurer',
        status: 'OPEN',
        createdAt: new Date().toISOString(),
        createdByPersonId: input.actorPersonId,
      });
      updateChoirContribution(c.id, {
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

    const posted = financeService.recordChoirContributionIncome({
      actorPersonId: input.actorPersonId,
      amount,
      description: `Choir contribution · ${personName(c.personId)} · ${this.typeLabel(c.typeId)}`,
      occurredOn: c.occurredOn,
      contributionId: c.id,
      orgUnitId: c.orgUnitId,
    });
    if (!posted.ok) {
      return {
        ok: false,
        reason: posted.reason ?? 'Choir fund vault denied',
      };
    }

    let followUpId: string | undefined;
    if (input.decision === 'PARTIAL') {
      followUpId = nid('cfu');
      pushChoirFollowUp({
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

    const now = new Date().toISOString();
    updateChoirContribution(c.id, {
      status: input.decision === 'PARTIAL' ? 'PARTIAL' : 'CONFIRMED',
      confirmedAmount: amount,
      verifiedAt: now,
      verifiedByPersonId: input.actorPersonId,
      verifyNote: input.note,
      financeTxnId: posted.txnId,
      followUpId,
      // If nobody recorded a handoff yet, verifier is also receiver.
      receivedByPersonId: c.receivedByPersonId ?? input.actorPersonId,
      receivedAt: c.receivedAt ?? now,
    });
    return { ok: true };
  },

  async listContributionsHybrid(filter?: {
    status?: ChoirContributionStatus;
    personId?: string;
  }): Promise<{ rows: ChoirContribution[]; source: 'api' | 'seed' }> {
    let orgUnitId: string | undefined;
    let fundId: string | undefined;
    try {
      orgUnitId = requireActiveChoirOrgUnitId();
      fundId = fundIdForChoirOrgUnit(orgUnitId);
    } catch {
      /* no active choir */
    }
    const remote = await listClaimsPreferApi('sys-choir', {
      fundId,
      orgUnitId,
      mine: Boolean(filter?.personId),
    });
    if (remote) {
      let rows = remote.map(
        (c): ChoirContribution => ({
          ...c,
          orgUnitId: c.orgUnitId ?? orgUnitId,
          status: c.status as ChoirContributionStatus,
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
    paymentMethod: ChoirPaymentMethod;
    occurredOn: string;
    note?: string;
    evidenceNote?: string;
    driveId?: string;
    receivedByPersonId?: string;
  }): Promise<ActionResult & { id?: string }> {
    try {
      const orgUnitId = requireActiveChoirOrgUnitId();
      const fundId = fundIdForChoirOrgUnit(orgUnitId);
      const api = await submitClaimPreferApi({
        systemId: 'sys-choir',
        fundId,
        typeLabel: this.typeLabel(input.typeId),
        amount: input.amount,
        paymentMethod: input.paymentMethod,
        occurredOn: input.occurredOn,
        note: input.note,
      });
      if (api) return api;
    } catch {
      /* fall through */
    }
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
    return CHOIR_FOLLOW_UPS.filter((f) => {
      const c = CHOIR_CONTRIBUTIONS.find((x) => x.id === f.contributionId);
      if (!c || !inActiveChoir(c)) return false;
      return openOnly ? f.status === 'OPEN' : true;
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  closeFollowUp(id: string): ActionResult {
    const f = CHOIR_FOLLOW_UPS.find((x) => x.id === id);
    if (!f) return { ok: false, reason: 'Unknown follow-up' };
    updateChoirFollowUp(id, { status: 'CLOSED' });
    return { ok: true };
  },

  contributionSummary() {
    const rows = CHOIR_CONTRIBUTIONS.filter(inActiveChoir);
    const claimed = rows.reduce((s, c) => s + c.amount, 0);
    const confirmed = rows
      .filter((c) => c.status === 'CONFIRMED' || c.status === 'PARTIAL')
      .reduce((s, c) => s + (c.confirmedAmount ?? c.amount), 0);
    const pending = rows.filter((c) => c.status === 'PENDING');
    const fundId = activeChoirFundId();
    return {
      claimed,
      confirmed,
      pendingCount: pending.length,
      pendingAmount: pending.reduce((s, c) => s + c.amount, 0),
      openFollowUps: this.listFollowUps(true).length,
      fundBalance: fundId ? financeService.balance(fundId) : 0,
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
        CHOIR_TEAMS.find((t) => t.id === c.teamId)?.name ?? c.teamId ?? '';
      lines.push(
        `${c.occurredOn},"${personName(c.personId)}","${team}","${this.typeLabel(c.typeId)}",${c.amount},${c.confirmedAmount ?? ''},${c.paymentMethod},${c.status},${c.financeTxnId ?? ''}`,
      );
    }
    return lines.join('\n');
  },

  /* ─── Donations / sponsors / fundraising ─── */

  listDonations() {
    return CHOIR_DONATIONS.filter(inActiveChoir).sort((a, b) =>
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
    paymentMethod: ChoirPaymentMethod;
    evidenceNote?: string;
    postToFund?: boolean;
  }): ActionResult & { id?: string } {
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      return { ok: false, reason: 'Amount must be positive' };
    }
    let orgUnitId: string;
    try {
      orgUnitId = requireActiveChoirOrgUnitId();
    } catch {
      return { ok: false, reason: 'No active choir selected' };
    }
    const id = nid('cdon');
    let financeTxnId: string | undefined;
    if (input.postToFund !== false) {
      const posted = financeService.recordChoirFundIncome({
        actorPersonId: input.actorPersonId,
        amount: Math.round(input.amount),
        description: `Choir donation · ${input.donorName} · ${input.donationType}`,
        occurredOn: input.occurredOn,
        orgUnitId,
        txnPrefix: `txn-choir-${id}`,
      });
      if (!posted.ok) return { ok: false, reason: posted.reason };
      financeTxnId = posted.txnId;
    }
    pushChoirDonation({
      id,
      orgUnitId,
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
    return CHOIR_SPONSORS.filter(inActiveChoir).map((s) => {
      const deals = CHOIR_SPONSORSHIPS.filter(
        (x) => x.sponsorId === s.id && inActiveChoir(x),
      );
      const total = deals.reduce((sum, d) => sum + d.amount, 0);
      return { ...s, sponsorships: deals, total };
    });
  },

  listCampaigns() {
    return CHOIR_CAMPAIGNS.filter(inActiveChoir).map((c) => {
      const gifts = CHOIR_CAMPAIGN_GIFTS.filter(
        (g) => g.campaignId === c.id && inActiveChoir(g),
      );
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
    paymentMethod: ChoirPaymentMethod;
  }): ActionResult {
    const campaign = CHOIR_CAMPAIGNS.find(
      (c) => c.id === input.campaignId && inActiveChoir(c),
    );
    if (!campaign || campaign.status !== 'ACTIVE') {
      return { ok: false, reason: 'Campaign not active' };
    }
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      return { ok: false, reason: 'Amount must be positive' };
    }
    pushChoirCampaignGift({
      id: nid('cgift'),
      orgUnitId: campaign.orgUnitId,
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
    return CHOIR_BUDGETS.filter(inActiveChoir).map((b) => ({
      ...b,
      lines: CHOIR_BUDGET_LINES.filter((l) => l.budgetId === b.id),
      plannedIncome: CHOIR_BUDGET_LINES.filter(
        (l) => l.budgetId === b.id && l.side === 'INCOME',
      ).reduce((s, l) => s + l.plannedAmount, 0),
      plannedExpense: CHOIR_BUDGET_LINES.filter(
        (l) => l.budgetId === b.id && l.side === 'EXPENSE',
      ).reduce((s, l) => s + l.plannedAmount, 0),
    }));
  },

  listIncome() {
    return CHOIR_INCOME.filter(inActiveChoir).sort((a, b) =>
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
    let orgUnitId: string;
    try {
      orgUnitId = requireActiveChoirOrgUnitId();
    } catch {
      return { ok: false, reason: 'No active choir selected' };
    }
    const id = nid('cinc');
    const posted = financeService.recordChoirFundIncome({
      actorPersonId: input.actorPersonId,
      amount: Math.round(input.amount),
      description: `Choir income · ${input.category}`,
      occurredOn: input.occurredOn,
      orgUnitId,
      txnPrefix: `txn-choir-${id}`,
    });
    if (!posted.ok) return { ok: false, reason: posted.reason };
    pushChoirIncome({
      id,
      orgUnitId,
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
    return CHOIR_EXPENSES.filter(inActiveChoir).sort((a, b) =>
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
    let orgUnitId: string;
    try {
      orgUnitId = requireActiveChoirOrgUnitId();
    } catch {
      return { ok: false, reason: 'No active choir selected' };
    }
    pushChoirExpense({
      id: nid('cexp'),
      orgUnitId,
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
    const e = CHOIR_EXPENSES.find(
      (x) => x.id === expenseId && inActiveChoir(x),
    );
    if (!e) return { ok: false, reason: 'Unknown expense' };
    if (e.status !== 'PENDING') {
      return { ok: false, reason: 'Already processed' };
    }
    if (!approve) {
      updateChoirExpense(expenseId, {
        status: 'REJECTED',
        approvedByPersonId: actorPersonId,
      });
      return { ok: true };
    }
    const posted = financeService.recordChoirFundExpense({
      actorPersonId,
      amount: e.amount,
      description: `Choir expense · ${e.category} · ${e.description}`,
      occurredOn: e.occurredOn,
      expenseId: e.id,
      orgUnitId: e.orgUnitId,
    });
    if (!posted.ok) return { ok: false, reason: posted.reason };
    updateChoirExpense(expenseId, {
      status: 'APPROVED',
      approvedByPersonId: actorPersonId,
      financeTxnId: posted.txnId,
    });
    return { ok: true };
  },

  listAssets() {
    return CHOIR_ASSETS.filter(inActiveChoir);
  },

  listLiabilities() {
    return CHOIR_LIABILITIES.filter(inActiveChoir);
  },

  closeLiability(id: string): ActionResult {
    const l = CHOIR_LIABILITIES.find((x) => x.id === id && inActiveChoir(x));
    if (!l) return { ok: false, reason: 'Unknown liability' };
    updateChoirLiability(id, { status: 'CLOSED' });
    return { ok: true };
  },

  addAsset(input: {
    name: string;
    category: string;
    value: number;
    acquiredOn: string;
    assignedToPersonId?: string;
  }): ActionResult {
    let orgUnitId: string;
    try {
      orgUnitId = requireActiveChoirOrgUnitId();
    } catch {
      return { ok: false, reason: 'No active choir selected' };
    }
    pushChoirAsset({
      id: nid('cass'),
      orgUnitId,
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
    const donations = CHOIR_DONATIONS.filter(inActiveChoir).reduce(
      (s, d) => s + d.amount,
      0,
    );
    const sponsorships = CHOIR_SPONSORSHIPS.filter(inActiveChoir).reduce(
      (s, d) => s + d.amount,
      0,
    );
    const campaignRaised = CHOIR_CAMPAIGN_GIFTS.filter(inActiveChoir).reduce(
      (s, g) => s + g.amount,
      0,
    );
    const income = CHOIR_INCOME.filter(inActiveChoir).reduce(
      (s, r) => s + r.amount,
      0,
    );
    const expensesApproved = CHOIR_EXPENSES.filter(
      (e) => e.status === 'APPROVED' && inActiveChoir(e),
    ).reduce((s, e) => s + e.amount, 0);
    const assets = CHOIR_ASSETS.filter(
      (a) => a.status === 'ACTIVE' && inActiveChoir(a),
    ).reduce((s, a) => s + a.value, 0);
    const liabilities = CHOIR_LIABILITIES.filter(
      (l) => l.status === 'OPEN' && inActiveChoir(l),
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
      songsReady: this.listSongs({ status: 'READY' }).length,
      songsLearning: this.listSongs({ status: 'LEARNING' }).length,
      activeSingers: this.listSeats(true).length,
      upcomingRehearsals: this.upcomingRehearsals().length,
      openDuties: this.listDuties().filter((d) => d.status === 'ASSIGNED')
        .length,
      rosterCount: this.listRoster().length,
      teams: this.listTeams().length,
      pendingPayments: finance.pendingCount,
      pendingExpenses: this.listExpenses().filter((e) => e.status === 'PENDING')
        .length,
      fundBalance: finance.fundBalance,
      activeCampaigns: this.listCampaigns().filter((c) => c.status === 'ACTIVE')
        .length,
    };
  },
};
