import { CHOIR_DUTIES } from '../data/choirSeed';
import {
  PROTOCOL_ACTIVITY,
  PROTOCOL_ALLOWED_MONTHS,
  PROTOCOL_ATTENDANCE,
  PROTOCOL_CONTRIBUTIONS,
  PROTOCOL_HISTORY,
  PROTOCOL_MONTH_PLANS,
  PROTOCOL_NOTIFICATIONS,
  PROTOCOL_ROSTER,
  PROTOCOL_RULES,
  PROTOCOL_SERVICES,
  PROTOCOL_TEAM_SLOTS,
  markAllProtocolNotificationsRead,
  markProtocolNotificationRead,
  pushProtocolActivity,
  pushProtocolContribution,
  pushProtocolHistory,
  pushProtocolNotification,
  replaceProtocolTeamSlots,
  updateProtocolContribution,
  updateProtocolMonthPlan,
  upsertProtocolAttendance,
} from '../data/protocolSeed';
import {
  buildProtocolTeams,
  validateProtocolTeams,
  type ChoirBusyByPerson,
} from '../domain/teamEngine';
import type {
  ProtocolActivityEvent,
  ProtocolAttendanceRecord,
  ProtocolAttendanceStatus,
  ProtocolContribution,
  ProtocolContributionType,
  ProtocolMonthPlan,
  ProtocolNotification,
  ProtocolNotificationKind,
  ProtocolOffice,
  ProtocolPaymentMethod,
  ProtocolRosterMember,
  ProtocolScheduleVersion,
  ProtocolService,
  ProtocolTeamSlot,
} from '../domain/types';
import { peopleService } from './authService';
import { financeService } from './financeService';
import {
  listClaimsPreferApi,
  submitClaimPreferApi,
  verifyClaimPreferApi,
} from './contributionApiBridge';

function choirBusyMap(): ChoirBusyByPerson {
  const map: ChoirBusyByPerson = new Map();
  for (const duty of CHOIR_DUTIES) {
    const set = map.get(duty.personId) ?? new Set();
    set.add(duty.serviceDate);
    map.set(duty.personId, set);
  }
  return map;
}

function personName(personId: string): string {
  const p = peopleService.getById(personId);
  return p?.preferredName || p?.fullName || personId;
}

function nid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function notifyPeople(
  personIds: string[],
  kind: ProtocolNotificationKind,
  title: string,
  body: string,
  href?: string,
) {
  const at = new Date().toISOString();
  const unique = [...new Set(personIds)];
  for (const personId of unique) {
    pushProtocolNotification({
      id: nid('pnot'),
      personId,
      kind,
      title,
      body,
      createdAt: at,
      read: false,
      href,
    });
  }
}

function leadershipPersonIds(): string[] {
  return PROTOCOL_ROSTER.filter((m) =>
    ['PRESIDENT', 'VP', 'COORDINATOR', 'SECRETARY', 'TREASURER'].includes(
      m.office,
    ),
  ).map((m) => m.personId);
}

function allRosterPersonIds(): string[] {
  return PROTOCOL_ROSTER.filter((m) => m.status !== 'INACTIVE').map(
    (m) => m.personId,
  );
}

function logActivity(
  actorPersonId: string,
  kind: ProtocolActivityEvent['kind'],
  summary: string,
) {
  pushProtocolActivity({
    id: nid('pact'),
    at: new Date().toISOString(),
    actorPersonId,
    kind,
    summary,
  });
}

type ActionResult = { ok: boolean; reason?: string };

export const protocolService = {
  allowedMonths(): string[] {
    return [...PROTOCOL_ALLOWED_MONTHS];
  },

  liveMonthKey(now = new Date()): string {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const key = `${y}-${m}`;
    if ((PROTOCOL_ALLOWED_MONTHS as readonly string[]).includes(key)) {
      return key;
    }
    return PROTOCOL_ALLOWED_MONTHS[0];
  },

  rules() {
    return PROTOCOL_RULES;
  },

  listRoster(activeOnly = false): ProtocolRosterMember[] {
    return PROTOCOL_ROSTER.filter((m) =>
      activeOnly ? m.status === 'ACTIVE' : true,
    );
  },

  rosterWithNames(activeOnly = false) {
    return this.listRoster(activeOnly).map((m) => ({
      ...m,
      name: personName(m.personId),
    }));
  },

  officeFor(personId: string): ProtocolOffice | null {
    const m = PROTOCOL_ROSTER.find(
      (r) => r.personId === personId && r.status !== 'INACTIVE',
    );
    return m?.office ?? null;
  },

  officeLabel(office: ProtocolOffice): string {
    const map: Record<ProtocolOffice, string> = {
      PRESIDENT: 'President',
      VP: 'Vice President',
      SECRETARY: 'Secretary',
      TREASURER: 'Treasurer',
      COORDINATOR: 'Coordinator',
      MEMBER: 'Member',
    };
    return map[office];
  },

  personLabel(personId: string): string {
    return personName(personId);
  },

  getMonthPlan(monthKey: string): ProtocolMonthPlan | null {
    return PROTOCOL_MONTH_PLANS.find((p) => p.monthKey === monthKey) ?? null;
  },

  listMonthPlans(): ProtocolMonthPlan[] {
    return PROTOCOL_MONTH_PLANS;
  },

  servicesForMonth(monthKey: string): ProtocolService[] {
    return PROTOCOL_SERVICES.filter((s) => s.monthKey === monthKey).sort(
      (a, b) =>
        a.date === b.date
          ? a.kind.localeCompare(b.kind)
          : a.date.localeCompare(b.date),
    );
  },

  getService(serviceId: string): ProtocolService | null {
    return PROTOCOL_SERVICES.find((s) => s.id === serviceId) ?? null;
  },

  slotsForMonth(monthKey: string): ProtocolTeamSlot[] {
    const serviceIds = new Set(
      this.servicesForMonth(monthKey).map((s) => s.id),
    );
    return PROTOCOL_TEAM_SLOTS.filter((s) => serviceIds.has(s.serviceId));
  },

  teamForService(serviceId: string): ProtocolTeamSlot[] {
    return PROTOCOL_TEAM_SLOTS.filter((s) => s.serviceId === serviceId);
  },

  dutyLoad(monthKey: string): Array<{
    personId: string;
    name: string;
    count: number;
    office: ProtocolOffice;
  }> {
    const slots = this.slotsForMonth(monthKey);
    const counts = new Map<string, number>();
    for (const s of slots) {
      counts.set(s.personId, (counts.get(s.personId) ?? 0) + 1);
    }
    return this.listRoster()
      .map((m) => ({
        personId: m.personId,
        name: personName(m.personId),
        count: counts.get(m.personId) ?? 0,
        office: m.office,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  },

  /** Generate / rebuild draft teams for a month (live or next only). */
  generateTeams(monthKey: string): {
    ok: boolean;
    reason?: string;
    warnings: string[];
    slotCount: number;
  } {
    if (!(PROTOCOL_ALLOWED_MONTHS as readonly string[]).includes(monthKey)) {
      return {
        ok: false,
        reason: 'Only live month and next month can be scheduled',
        warnings: [],
        slotCount: 0,
      };
    }
    const plan = this.getMonthPlan(monthKey);
    if (plan?.status === 'PUBLISHED') {
      return {
        ok: false,
        reason: 'Month is published — reopen to DRAFT before rebuilding',
        warnings: [],
        slotCount: 0,
      };
    }
    if (plan?.status === 'REVIEW') {
      return {
        ok: false,
        reason: 'Month is in leadership review — return to draft first',
        warnings: [],
        slotCount: 0,
      };
    }

    const services = this.servicesForMonth(monthKey);
    const { slots, warnings } = buildProtocolTeams({
      services,
      roster: PROTOCOL_ROSTER,
      rules: PROTOCOL_RULES,
      choirBusy: choirBusyMap(),
    });

    const otherSlots = PROTOCOL_TEAM_SLOTS.filter((s) => {
      const svc = PROTOCOL_SERVICES.find((x) => x.id === s.serviceId);
      return svc && svc.monthKey !== monthKey;
    });
    replaceProtocolTeamSlots([...otherSlots, ...slots]);

    const issues = validateProtocolTeams({
      services,
      roster: PROTOCOL_ROSTER,
      slots,
      rules: PROTOCOL_RULES,
    });

    updateProtocolMonthPlan(monthKey, {
      status: 'DRAFT',
      generatedAt: new Date().toISOString(),
      validationNotes: [...warnings, ...issues],
      submittedForReviewAt: undefined,
      submittedByPersonId: undefined,
      reviewedAt: undefined,
      reviewedByPersonId: undefined,
    });

    notifyPeople(
      leadershipPersonIds(),
      'TEAMS_BUILT',
      `Teams built for ${monthKey}`,
      `${slots.length} slots assigned · ${warnings.length + issues.length} notes`,
      '/systems/protocol/teams',
    );

    return {
      ok: true,
      warnings: [...warnings, ...issues],
      slotCount: slots.length,
    };
  },

  validateMonth(monthKey: string): string[] {
    return validateProtocolTeams({
      services: this.servicesForMonth(monthKey),
      roster: PROTOCOL_ROSTER,
      slots: this.slotsForMonth(monthKey),
      rules: PROTOCOL_RULES,
    });
  },

  submitForReview(monthKey: string, actorPersonId: string): ActionResult {
    const plan = this.getMonthPlan(monthKey);
    if (!plan) return { ok: false, reason: 'Unknown month' };
    if (plan.status !== 'DRAFT') {
      return { ok: false, reason: 'Only DRAFT months can be submitted' };
    }
    if (this.slotsForMonth(monthKey).length === 0) {
      return { ok: false, reason: 'Generate teams before submitting' };
    }
    const issues = this.validateMonth(monthKey);
    const blocking = issues.filter((i) => i.includes('both SS1 and SS2'));
    if (blocking.length > 0) {
      return { ok: false, reason: blocking[0] };
    }
    updateProtocolMonthPlan(monthKey, {
      status: 'REVIEW',
      submittedForReviewAt: new Date().toISOString(),
      submittedByPersonId: actorPersonId,
      validationNotes: issues,
    });
    logActivity(
      actorPersonId,
      'SUBMITTED_REVIEW',
      `Submitted ${monthKey} for leadership review`,
    );
    notifyPeople(
      PROTOCOL_ROSTER.filter((m) =>
        m.office === 'PRESIDENT' || m.office === 'VP',
      ).map((m) => m.personId),
      'SUBMITTED_REVIEW',
      `${monthKey} ready for review`,
      `${personName(actorPersonId)} submitted draft teams`,
      '/systems/protocol/review',
    );
    return { ok: true };
  },

  markReviewed(monthKey: string, actorPersonId: string): ActionResult {
    const plan = this.getMonthPlan(monthKey);
    if (!plan) return { ok: false, reason: 'Unknown month' };
    if (plan.status !== 'REVIEW') {
      return { ok: false, reason: 'Month is not in REVIEW' };
    }
    updateProtocolMonthPlan(monthKey, {
      reviewedAt: new Date().toISOString(),
      reviewedByPersonId: actorPersonId,
    });
    return { ok: true };
  },

  returnToDraft(monthKey: string): ActionResult {
    const plan = this.getMonthPlan(monthKey);
    if (!plan) return { ok: false, reason: 'Unknown month' };
    if (plan.status !== 'REVIEW' && plan.status !== 'PUBLISHED') {
      return { ok: false, reason: 'Nothing to reopen' };
    }
    updateProtocolMonthPlan(monthKey, {
      status: 'DRAFT',
      reviewedAt: undefined,
      reviewedByPersonId: undefined,
      publishedAt: undefined,
      publishedByPersonId: undefined,
    });
    return { ok: true };
  },

  publish(monthKey: string, actorPersonId: string): ActionResult & {
    version?: number;
  } {
    const plan = this.getMonthPlan(monthKey);
    if (!plan) return { ok: false, reason: 'Unknown month' };
    if (plan.status !== 'REVIEW') {
      return { ok: false, reason: 'Publish requires REVIEW status' };
    }
    if (!plan.reviewedByPersonId) {
      return {
        ok: false,
        reason: 'Leadership must mark reviewed before publish',
      };
    }
    const slots = this.slotsForMonth(monthKey);
    if (slots.length === 0) {
      return { ok: false, reason: 'No team slots to publish' };
    }
    const version = plan.version + 1;
    const publishedAt = new Date().toISOString();
    pushProtocolHistory({
      id: `psv-${monthKey}-v${version}`,
      monthKey,
      version,
      publishedAt,
      publishedByPersonId: actorPersonId,
      slots: slots.map((s) => ({ ...s })),
      validationNotes: [...plan.validationNotes],
    });
    updateProtocolMonthPlan(monthKey, {
      status: 'PUBLISHED',
      version,
      publishedAt,
      publishedByPersonId: actorPersonId,
    });
    logActivity(
      actorPersonId,
      'SCHEDULE_PUBLISHED',
      `Published ${monthKey} schedule v${version}`,
    );
    notifyPeople(
      allRosterPersonIds(),
      'SCHEDULE_PUBLISHED',
      `${monthKey} schedule published`,
      `Version ${version} is official — check My schedule`,
      '/systems/protocol/mine',
    );
    return { ok: true, version };
  },

  listHistory(): ProtocolScheduleVersion[] {
    return [...PROTOCOL_HISTORY].sort((a, b) =>
      b.publishedAt.localeCompare(a.publishedAt),
    );
  },

  getHistoryVersion(id: string): ProtocolScheduleVersion | null {
    return PROTOCOL_HISTORY.find((v) => v.id === id) ?? null;
  },

  /** Published assignments for a person (current + history). */
  mySchedule(personId: string): Array<{
    monthKey: string;
    version: number;
    publishedAt: string;
    serviceId: string;
    date: string;
    kind: string;
    label: string;
    fromHistory: boolean;
  }> {
    const rows: Array<{
      monthKey: string;
      version: number;
      publishedAt: string;
      serviceId: string;
      date: string;
      kind: string;
      label: string;
      fromHistory: boolean;
    }> = [];

    for (const plan of PROTOCOL_MONTH_PLANS) {
      if (plan.status !== 'PUBLISHED' || !plan.publishedAt) continue;
      for (const slot of this.slotsForMonth(plan.monthKey)) {
        if (slot.personId !== personId) continue;
        const svc = this.getService(slot.serviceId);
        if (!svc) continue;
        rows.push({
          monthKey: plan.monthKey,
          version: plan.version,
          publishedAt: plan.publishedAt,
          serviceId: svc.id,
          date: svc.date,
          kind: svc.kind,
          label: svc.label,
          fromHistory: false,
        });
      }
    }

    for (const hist of PROTOCOL_HISTORY) {
      const livePublished = PROTOCOL_MONTH_PLANS.find(
        (p) =>
          p.monthKey === hist.monthKey &&
          p.status === 'PUBLISHED' &&
          p.version === hist.version,
      );
      if (livePublished) continue;
      for (const slot of hist.slots) {
        if (slot.personId !== personId) continue;
        const svc = this.getService(slot.serviceId);
        rows.push({
          monthKey: hist.monthKey,
          version: hist.version,
          publishedAt: hist.publishedAt,
          serviceId: slot.serviceId,
          date: svc?.date ?? '—',
          kind: svc?.kind ?? '—',
          label: svc?.label ?? slot.serviceId,
          fromHistory: true,
        });
      }
    }

    return rows.sort((a, b) => a.date.localeCompare(b.date));
  },

  attendanceForService(serviceId: string): ProtocolAttendanceRecord[] {
    return PROTOCOL_ATTENDANCE.filter((r) => r.serviceId === serviceId);
  },

  attendanceForMonth(monthKey: string): ProtocolAttendanceRecord[] {
    const ids = new Set(this.servicesForMonth(monthKey).map((s) => s.id));
    return PROTOCOL_ATTENDANCE.filter((r) => ids.has(r.serviceId));
  },

  recordAttendance(input: {
    serviceId: string;
    personId: string;
    status: ProtocolAttendanceStatus;
    recordedByPersonId: string;
    notes?: string;
  }): ActionResult {
    const service = this.getService(input.serviceId);
    if (!service) return { ok: false, reason: 'Unknown service' };
    const plan = this.getMonthPlan(service.monthKey);
    if (plan?.status !== 'PUBLISHED') {
      return { ok: false, reason: 'Attendance only after publish' };
    }
    const onTeam = this.teamForService(input.serviceId).some(
      (s) => s.personId === input.personId,
    );
    if (!onTeam) {
      return { ok: false, reason: 'Person is not on this service team' };
    }
    upsertProtocolAttendance({
      id: `patt-${input.serviceId}-${input.personId}`,
      serviceId: input.serviceId,
      personId: input.personId,
      status: input.status,
      recordedByPersonId: input.recordedByPersonId,
      recordedAt: new Date().toISOString(),
      notes: input.notes,
    });
    return { ok: true };
  },

  attendanceSummary(monthKey: string) {
    const services = this.servicesForMonth(monthKey);
    return services.map((s) => {
      const team = this.teamForService(s.id);
      const records = this.attendanceForService(s.id);
      const present = records.filter(
        (r) => r.status === 'PRESENT' || r.status === 'LATE',
      ).length;
      return {
        service: s,
        teamSize: team.length,
        recorded: records.length,
        present,
      };
    });
  },

  stats(monthKey: string) {
    const roster = this.listRoster();
    const services = this.servicesForMonth(monthKey);
    const slots = this.slotsForMonth(monthKey);
    const plan = this.getMonthPlan(monthKey);
    return {
      rosterActive: roster.filter((m) => m.status === 'ACTIVE').length,
      rosterTotal: roster.length,
      services: services.length,
      slots: slots.length,
      status: plan?.status ?? 'OPEN',
      version: plan?.version ?? 0,
      historyCount: PROTOCOL_HISTORY.length,
      pendingContributions: PROTOCOL_CONTRIBUTIONS.filter(
        (c) => c.status === 'PENDING',
      ).length,
      unreadNotifications: 0,
    };
  },

  statsForPerson(monthKey: string, personId: string) {
    const base = this.stats(monthKey);
    return {
      ...base,
      unreadNotifications: this.unreadCount(personId),
    };
  },

  /* ─── Contributions (→ shared Finance fund-protocol) ─── */

  listContributions(filter?: {
    status?: ProtocolContribution['status'];
    personId?: string;
  }): ProtocolContribution[] {
    return PROTOCOL_CONTRIBUTIONS.filter((c) => {
      if (filter?.status && c.status !== filter.status) return false;
      if (filter?.personId && c.personId !== filter.personId) return false;
      return true;
    }).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  },

  submitContribution(input: {
    personId: string;
    amount: number;
    contributionType: ProtocolContributionType;
    paymentMethod: ProtocolPaymentMethod;
    note?: string;
  }): ActionResult & { id?: string } {
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      return { ok: false, reason: 'Amount must be positive' };
    }
    const onRoster = PROTOCOL_ROSTER.some(
      (m) => m.personId === input.personId && m.status !== 'INACTIVE',
    );
    if (!onRoster) {
      return { ok: false, reason: 'Only protocol roster members can contribute' };
    }
    const id = nid('pcon');
    pushProtocolContribution({
      id,
      personId: input.personId,
      amount: Math.round(input.amount),
      contributionType: input.contributionType,
      paymentMethod: input.paymentMethod,
      status: 'PENDING',
      submittedAt: new Date().toISOString(),
      note: input.note,
    });
    logActivity(
      input.personId,
      'CONTRIBUTION_SUBMITTED',
      `Submitted ${input.amount.toLocaleString()} RWF contribution`,
    );
    notifyPeople(
      PROTOCOL_ROSTER.filter((m) => m.office === 'TREASURER').map(
        (m) => m.personId,
      ),
      'CONTRIBUTION_SUBMITTED',
      'New contribution to verify',
      `${personName(input.personId)} · ${input.amount.toLocaleString()} RWF`,
      '/systems/protocol/finance',
    );
    return { ok: true, id };
  },

  verifyContribution(
    contributionId: string,
    actorPersonId: string,
  ): ActionResult {
    const c = PROTOCOL_CONTRIBUTIONS.find((x) => x.id === contributionId);
    if (!c) return { ok: false, reason: 'Unknown contribution' };
    if (c.status !== 'PENDING') {
      return { ok: false, reason: 'Already processed' };
    }
    const posted = financeService.recordProtocolContributionIncome({
      actorPersonId,
      amount: c.amount,
      description: `Protocol contribution · ${personName(c.personId)} · ${c.contributionType}`,
      occurredOn: c.submittedAt.slice(0, 10),
      contributionId: c.id,
    });
    if (!posted.ok) {
      return {
        ok: false,
        reason: posted.reason ?? 'Finance vault denied — need fund grant',
      };
    }
    updateProtocolContribution(c.id, {
      status: 'VERIFIED',
      verifiedAt: new Date().toISOString(),
      verifiedByPersonId: actorPersonId,
      financeTxnId: posted.txnId,
    });
    logActivity(
      actorPersonId,
      'CONTRIBUTION_VERIFIED',
      `Verified ${c.amount.toLocaleString()} RWF from ${personName(c.personId)}`,
    );
    notifyPeople(
      [c.personId],
      'CONTRIBUTION_VERIFIED',
      'Contribution verified',
      `${c.amount.toLocaleString()} RWF posted to Protocol fund`,
      '/systems/finance/funds/fund-protocol',
    );
    return { ok: true };
  },

  async listContributionsHybrid(filter?: {
    status?: ProtocolContribution['status'];
    personId?: string;
  }): Promise<{ rows: ProtocolContribution[]; source: 'api' | 'seed' }> {
    const remote = await listClaimsPreferApi('sys-protocol', {
      mine: Boolean(filter?.personId),
    });
    if (remote) {
      let rows = remote.map((c): ProtocolContribution => {
        const status: ProtocolContribution['status'] =
          c.status === 'CONFIRMED' || c.status === 'PARTIAL'
            ? 'VERIFIED'
            : c.status === 'DECLINED'
              ? 'REJECTED'
              : 'PENDING';
        return {
          id: c.id,
          personId: c.personId,
          amount: c.amount,
          contributionType: (c.typeId as ProtocolContributionType) || 'MONTHLY',
          paymentMethod: c.paymentMethod as ProtocolPaymentMethod,
          status,
          submittedAt: c.submittedAt,
          note: c.note,
          verifiedAt: c.verifiedAt,
          verifiedByPersonId: c.verifiedByPersonId,
          financeTxnId: c.financeTxnId,
        };
      });
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
    amount: number;
    contributionType: ProtocolContributionType;
    paymentMethod: ProtocolPaymentMethod;
    note?: string;
  }): Promise<ActionResult & { id?: string }> {
    const api = await submitClaimPreferApi({
      systemId: 'sys-protocol',
      fundId: 'fund-protocol',
      typeLabel: input.contributionType,
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      occurredOn: new Date().toISOString().slice(0, 10),
      note: input.note,
    });
    if (api) return api;
    return this.submitContribution(input);
  },

  async verifyContributionHybrid(
    contributionId: string,
    actorPersonId: string,
  ): Promise<ActionResult> {
    const api = await verifyClaimPreferApi({
      contributionId,
      decision: 'CONFIRMED',
    });
    if (api) return api;
    return this.verifyContribution(contributionId, actorPersonId);
  },

  async rejectContributionHybrid(
    contributionId: string,
    actorPersonId: string,
    reason: string,
  ): Promise<ActionResult> {
    const api = await verifyClaimPreferApi({
      contributionId,
      decision: 'DECLINED',
      note: reason,
    });
    if (api) return api;
    return this.rejectContribution(contributionId, actorPersonId, reason);
  },

  rejectContribution(
    contributionId: string,
    actorPersonId: string,
    reason: string,
  ): ActionResult {
    const c = PROTOCOL_CONTRIBUTIONS.find((x) => x.id === contributionId);
    if (!c) return { ok: false, reason: 'Unknown contribution' };
    if (c.status !== 'PENDING') {
      return { ok: false, reason: 'Already processed' };
    }
    const decision = financeService.authorizeFund(
      actorPersonId,
      'fund-protocol',
      'MANAGE',
    );
    if (!decision.allowed) {
      return { ok: false, reason: decision.reason };
    }
    updateProtocolContribution(c.id, {
      status: 'REJECTED',
      verifiedAt: new Date().toISOString(),
      verifiedByPersonId: actorPersonId,
      rejectionReason: reason || 'Rejected by treasurer',
    });
    notifyPeople(
      [c.personId],
      'GENERAL',
      'Contribution rejected',
      reason || 'Contact Protocol Treasurer',
      '/systems/protocol/finance',
    );
    return { ok: true };
  },

  contributionSummary() {
    const rows = PROTOCOL_CONTRIBUTIONS;
    const verified = rows.filter((c) => c.status === 'VERIFIED');
    const pending = rows.filter((c) => c.status === 'PENDING');
    return {
      pendingCount: pending.length,
      pendingAmount: pending.reduce((s, c) => s + c.amount, 0),
      verifiedCount: verified.length,
      verifiedAmount: verified.reduce((s, c) => s + c.amount, 0),
      fundBalance: financeService.balance('fund-protocol'),
    };
  },

  /* ─── Notifications & activity ─── */

  notificationsFor(personId: string): ProtocolNotification[] {
    return PROTOCOL_NOTIFICATIONS.filter((n) => n.personId === personId).sort(
      (a, b) => b.createdAt.localeCompare(a.createdAt),
    );
  },

  unreadCount(personId: string): number {
    return PROTOCOL_NOTIFICATIONS.filter(
      (n) => n.personId === personId && !n.read,
    ).length;
  },

  markNotificationRead(id: string) {
    markProtocolNotificationRead(id);
  },

  markAllNotificationsRead(personId: string) {
    markAllProtocolNotificationsRead(personId);
  },

  listActivity(): ProtocolActivityEvent[] {
    return [...PROTOCOL_ACTIVITY];
  },

  /* ─── Reports & export ─── */

  leadershipReport(monthKey: string) {
    const plan = this.getMonthPlan(monthKey);
    const load = this.dutyLoad(monthKey);
    const attendance = this.attendanceSummary(monthKey);
    const presentTotal = attendance.reduce((s, a) => s + a.present, 0);
    const teamTotal = attendance.reduce((s, a) => s + a.teamSize, 0);
    const recordedTotal = attendance.reduce((s, a) => s + a.recorded, 0);
    const contrib = this.contributionSummary();
    const byStatus = { PRESENT: 0, LATE: 0, ABSENT: 0, EXCUSED: 0 };
    for (const svc of this.servicesForMonth(monthKey)) {
      for (const a of PROTOCOL_ATTENDANCE.filter((r) => r.serviceId === svc.id)) {
        if (a.status in byStatus) {
          byStatus[a.status as keyof typeof byStatus] += 1;
        }
      }
    }
    return {
      monthKey,
      status: plan?.status ?? 'OPEN',
      version: plan?.version ?? 0,
      services: this.servicesForMonth(monthKey).length,
      slots: this.slotsForMonth(monthKey).length,
      dutyLoad: load,
      attendanceByService: attendance,
      attendanceByStatus: byStatus,
      attendanceRate:
        teamTotal === 0 ? null : Math.round((presentTotal / teamTotal) * 100),
      recordedRate:
        teamTotal === 0 ? null : Math.round((recordedTotal / teamTotal) * 100),
      presentTotal,
      teamTotal,
      recordedTotal,
      contributions: contrib,
    };
  },

  scheduleCsv(monthKey: string): string {
    const lines = ['date,kind,label,personId,personName,source'];
    for (const svc of this.servicesForMonth(monthKey)) {
      const team = this.teamForService(svc.id);
      if (team.length === 0) {
        lines.push(
          `${svc.date},${svc.kind},"${svc.label}",,,`,
        );
        continue;
      }
      for (const slot of team) {
        lines.push(
          `${svc.date},${svc.kind},"${svc.label}",${slot.personId},"${personName(slot.personId)}",${slot.source}`,
        );
      }
    }
    return lines.join('\n');
  },

  attendanceCsv(monthKey: string): string {
    const lines = [
      'date,kind,label,personId,personName,status,recordedAt',
    ];
    for (const svc of this.servicesForMonth(monthKey)) {
      const team = this.teamForService(svc.id);
      for (const slot of team) {
        const rec = PROTOCOL_ATTENDANCE.find(
          (a) =>
            a.serviceId === svc.id && a.personId === slot.personId,
        );
        lines.push(
          `${svc.date},${svc.kind},"${svc.label}",${slot.personId},"${personName(slot.personId)}",${rec?.status ?? 'UNRECORDED'},${rec?.recordedAt ?? ''}`,
        );
      }
    }
    return lines.join('\n');
  },

  contributionsCsv(): string {
    const lines = [
      'id,personId,personName,amount,type,method,status,submittedAt,verifiedAt,financeTxnId,note',
    ];
    for (const c of this.listContributions()) {
      const note = (c.note ?? '').replaceAll('"', "'");
      lines.push(
        [
          c.id,
          c.personId,
          `"${personName(c.personId)}"`,
          c.amount,
          c.contributionType,
          c.paymentMethod,
          c.status,
          c.submittedAt,
          c.verifiedAt ?? '',
          c.financeTxnId ?? '',
          `"${note}"`,
        ].join(','),
      );
    }
    return lines.join('\n');
  },

  bulletinText(monthKey: string): string {
    const plan = this.getMonthPlan(monthKey);
    const lines = [
      `ADEPR Kacyiru — Protocol Schedule`,
      `Month: ${monthKey} · Status: ${plan?.status ?? 'OPEN'} · v${plan?.version ?? 0}`,
      '',
    ];
    for (const svc of this.servicesForMonth(monthKey)) {
      const names = this.teamForService(svc.id)
        .map((s) => personName(s.personId))
        .join(', ');
      lines.push(`${svc.kind} ${svc.date}: ${names || '(unassigned)'}`);
    }
    lines.push('');
    lines.push('Generated for bulletin / print');
    return lines.join('\n');
  },
};
