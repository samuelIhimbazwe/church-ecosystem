import {
  CHOIR_CONTRIBUTIONS,
  CHOIR_CONTRIBUTION_DRIVES,
  CHOIR_CONTRIBUTION_GOALS,
  CHOIR_CONTRIB_EVENTS,
  CHOIR_CONTRIB_NOTIFICATIONS,
  CHOIR_FAMILY_RAILS,
  CHOIR_FOLLOW_UPS,
  CHOIR_HANDOFFS,
  CHOIR_OFFICE_RAILS,
  CHOIR_ROSTER,
  CHOIR_TEAMS,
  pushChoirContribEvent,
  pushChoirContribNotification,
  pushChoirContribution,
  pushChoirDrive,
  pushChoirFamilyRail,
  pushChoirFollowUp,
  pushChoirGoal,
  pushChoirHandoff,
  pushChoirOfficeRail,
  subscribeChoirFinance,
  updateChoirContribution,
  updateChoirFollowUp,
} from '../data/choirSeed';
import {
  isFinalConfirmedStatus,
  isIssueStatus,
  type ChoirContribNotification,
  type ChoirContributionEvent,
  type ChoirContributionHandoff,
  type ChoirFamilyPaymentRail,
  type ChoirOfficePaymentRail,
} from '../domain/choirContributionPipeline';
import type {
  ChoirContribution,
  ChoirContributionDrive,
  ChoirContributionStatus,
  ChoirOffice,
  ChoirPaymentMethod,
} from '../domain/types';
import { peopleService } from './authService';
import {
  getActiveChoirOrgUnitId,
  requireActiveChoirOrgUnitId,
} from './choirScope';
import { financeService } from './financeService';

type ActionResult = { ok: boolean; reason?: string; id?: string };

function personName(personId: string): string {
  const p = peopleService.getById(personId);
  return p?.preferredName || p?.fullName || personId;
}

function nid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function inActiveChoir(row: { orgUnitId?: string }): boolean {
  const ou = getActiveChoirOrgUnitId();
  if (!ou) return false;
  return !row.orgUnitId || row.orgUnitId === ou;
}

function officeFor(personId: string): ChoirOffice | null {
  const ou = getActiveChoirOrgUnitId();
  const row = CHOIR_ROSTER.find(
    (m) =>
      m.personId === personId &&
      m.status === 'ACTIVE' &&
      (!ou || m.orgUnitId === ou),
  );
  return row?.office ?? null;
}

function teamIdForPerson(personId: string): string | undefined {
  const ou = getActiveChoirOrgUnitId();
  const row = CHOIR_ROSTER.find(
    (m) =>
      m.personId === personId &&
      m.status === 'ACTIVE' &&
      (!ou || m.orgUnitId === ou),
  );
  return row?.teamId;
}

function ledTeamIds(personId: string): string[] {
  const ou = requireActiveChoirOrgUnitId();
  return CHOIR_TEAMS.filter(
    (t) =>
      t.orgUnitId === ou &&
      t.status === 'ACTIVE' &&
      (t.leaderPersonId === personId || t.viceLeaderPersonId === personId),
  ).map((t) => t.id);
}

function canFamilyGate(personId: string, teamId: string): boolean {
  if (ledTeamIds(personId).includes(teamId)) return true;
  const office = officeFor(personId);
  if (office !== 'FAMILY_LEADER') return false;
  return teamIdForPerson(personId) === teamId;
}

function emitEvent(
  input: Omit<ChoirContributionEvent, 'id' | 'orgUnitId' | 'at'> & {
    at?: string;
  },
) {
  const orgUnitId = requireActiveChoirOrgUnitId();
  pushChoirContribEvent({
    id: nid('cev'),
    orgUnitId,
    at: input.at ?? new Date().toISOString(),
    actorPersonId: input.actorPersonId,
    action: input.action,
    detail: input.detail,
    contributionId: input.contributionId,
    handoffId: input.handoffId,
  });
}

function notifyOffices(
  kind: ChoirContribNotification['kind'],
  message: string,
  extra?: Partial<ChoirContribNotification>,
) {
  const orgUnitId = requireActiveChoirOrgUnitId();
  pushChoirContribNotification({
    id: nid('cnotif'),
    orgUnitId,
    audienceOffices: ['TREASURER', 'COORDINATOR'],
    kind,
    message,
    createdAt: new Date().toISOString(),
    ...extra,
  });
}

export const choirContributionOps = {
  subscribe: subscribeChoirFinance,

  listFamilyRails(teamId?: string) {
    return CHOIR_FAMILY_RAILS.filter(
      (r) =>
        inActiveChoir(r) &&
        r.active &&
        (!teamId || r.teamId === teamId),
    );
  },

  listOfficeRails(holder?: 'COORDINATOR' | 'TREASURER') {
    return CHOIR_OFFICE_RAILS.filter(
      (r) =>
        inActiveChoir(r) &&
        r.active &&
        (!holder || r.holderOffice === holder),
    );
  },

  upsertFamilyRail(input: {
    actorPersonId: string;
    teamId: string;
    kind: 'MOMO' | 'BANK';
    label: string;
    accountRef: string;
  }): ActionResult {
    if (!canFamilyGate(input.actorPersonId, input.teamId)) {
      return { ok: false, reason: 'Only that family’s leader can set rails' };
    }
    const orgUnitId = requireActiveChoirOrgUnitId();
    const id = nid('cfrail');
    const rail: ChoirFamilyPaymentRail = {
      id,
      orgUnitId,
      teamId: input.teamId,
      kind: input.kind,
      label: input.label,
      accountRef: input.accountRef,
      createdByPersonId: input.actorPersonId,
      createdAt: new Date().toISOString(),
      active: true,
    };
    pushChoirFamilyRail(rail);
    emitEvent({
      actorPersonId: input.actorPersonId,
      action: 'FAMILY_RAIL_SET',
      detail: `${input.kind} ${input.label}`,
    });
    return { ok: true, id };
  },

  upsertOfficeRail(input: {
    actorPersonId: string;
    holderOffice: 'COORDINATOR' | 'TREASURER';
    kind: 'MOMO' | 'BANK';
    label: string;
    accountRef: string;
  }): ActionResult {
    const office = officeFor(input.actorPersonId);
    if (office !== input.holderOffice && office !== 'TREASURER') {
      return { ok: false, reason: 'Only that office can set this rail' };
    }
    const orgUnitId = requireActiveChoirOrgUnitId();
    const id = nid('corail');
    const rail: ChoirOfficePaymentRail = {
      id,
      orgUnitId,
      holderOffice: input.holderOffice,
      kind: input.kind,
      label: input.label,
      accountRef: input.accountRef,
      createdByPersonId: input.actorPersonId,
      createdAt: new Date().toISOString(),
      active: true,
    };
    pushChoirOfficeRail(rail);
    return { ok: true, id };
  },

  createDrive(input: {
    actorPersonId: string;
    name: string;
    typeId: string;
    frequency: 'ONCE' | 'MONTHLY' | 'EVENT';
    startsOn: string;
    endsOn?: string;
    description?: string;
    ministryGoalPublic?: boolean;
    memberGoal?: number;
    familyGoal?: number;
    familyTeamId?: string;
    choirGoal?: number;
  }): ActionResult {
    const office = officeFor(input.actorPersonId);
    if (office !== 'TREASURER') {
      return { ok: false, reason: 'Only treasurer creates contribution drives' };
    }
    const orgUnitId = requireActiveChoirOrgUnitId();
    const id = nid('cdrive');
    const drive: ChoirContributionDrive = {
      id,
      orgUnitId,
      systemId: 'sys-choir',
      name: input.name,
      typeId: input.typeId,
      frequency: input.frequency,
      startsOn: input.startsOn,
      endsOn: input.endsOn,
      status: 'ACTIVE',
      description: input.description,
      ministryGoalPublic: input.ministryGoalPublic ?? false,
      createdByPersonId: input.actorPersonId,
      createdAt: new Date().toISOString(),
    };
    pushChoirDrive(drive);
    if (input.memberGoal && input.memberGoal > 0) {
      pushChoirGoal({
        id: nid('cgoal'),
        driveId: id,
        scope: 'MEMBER',
        targetAmount: Math.round(input.memberGoal),
        label: `Each member · ${input.memberGoal.toLocaleString()}`,
      });
    }
    if (input.familyGoal && input.familyGoal > 0) {
      pushChoirGoal({
        id: nid('cgoal'),
        driveId: id,
        scope: 'TEAM',
        teamId: input.familyTeamId,
        targetAmount: Math.round(input.familyGoal),
        label: input.familyTeamId
          ? `Family target · ${input.familyGoal.toLocaleString()}`
          : `Each family · ${input.familyGoal.toLocaleString()}`,
      });
    }
    if (input.choirGoal && input.choirGoal > 0) {
      pushChoirGoal({
        id: nid('cgoal'),
        driveId: id,
        scope: 'MINISTRY',
        targetAmount: Math.round(input.choirGoal),
        label: `Whole choir · ${input.choirGoal.toLocaleString()}`,
      });
    }
    emitEvent({
      actorPersonId: input.actorPersonId,
      action: 'DRIVE_CREATED',
      detail: input.name,
    });
    notifyOffices('MODIFIED', `New contribution drive: ${input.name}`);
    return { ok: true, id };
  },

  recordClaimSubmitted(c: ChoirContribution) {
    emitEvent({
      actorPersonId: c.personId,
      action: 'CLAIM_SUBMITTED',
      contributionId: c.id,
      detail: `${personName(c.personId)} claimed ${c.amount.toLocaleString()}`,
    });
    notifyOffices(
      'NEW_CLAIM',
      `New claim: ${personName(c.personId)} · ${c.amount.toLocaleString()} (${c.status})`,
      { contributionId: c.id },
    );
  },

  familyRespond(input: {
    contributionId: string;
    actorPersonId: string;
    decision: 'FAMILY_CONFIRMED' | 'FAMILY_PARTIAL' | 'FAMILY_DECLINED';
    confirmedAmount?: number;
    note?: string;
  }): ActionResult {
    const c = CHOIR_CONTRIBUTIONS.find(
      (x) => x.id === input.contributionId && inActiveChoir(x),
    );
    if (!c) return { ok: false, reason: 'Unknown contribution' };
    if (c.status !== 'PENDING') {
      return { ok: false, reason: 'Claim is not awaiting family response' };
    }
    if (!c.teamId || !canFamilyGate(input.actorPersonId, c.teamId)) {
      return { ok: false, reason: 'Not the family leader for this claim' };
    }

    const now = new Date().toISOString();
    if (input.decision === 'FAMILY_DECLINED') {
      const followId = nid('cfu');
      pushChoirFollowUp({
        id: followId,
        contributionId: c.id,
        personId: c.personId,
        reason: input.note || 'Declined by family leader',
        status: 'OPEN',
        createdAt: now,
        createdByPersonId: input.actorPersonId,
      });
      updateChoirContribution(c.id, {
        status: 'FAMILY_DECLINED',
        familyRespondedAt: now,
        familyRespondedByPersonId: input.actorPersonId,
        familyResponseNote: input.note,
        followUpId: followId,
      });
    } else {
      const amount =
        input.decision === 'FAMILY_PARTIAL'
          ? Math.round(input.confirmedAmount ?? 0)
          : c.amount;
      if (amount <= 0 || amount > c.amount) {
        return { ok: false, reason: 'Invalid confirmed amount' };
      }
      let followUpId: string | undefined;
      if (input.decision === 'FAMILY_PARTIAL') {
        followUpId = nid('cfu');
        pushChoirFollowUp({
          id: followUpId,
          contributionId: c.id,
          personId: c.personId,
          reason:
            input.note ||
            `Partial family confirm ${amount.toLocaleString()} of ${c.amount.toLocaleString()} RWF`,
          status: 'OPEN',
          createdAt: now,
          createdByPersonId: input.actorPersonId,
        });
      }
      updateChoirContribution(c.id, {
        status: input.decision,
        familyConfirmedAmount: amount,
        confirmedAmount: amount,
        familyRespondedAt: now,
        familyRespondedByPersonId: input.actorPersonId,
        familyResponseNote: input.note,
        receivedByPersonId: input.actorPersonId,
        receivedAt: now,
        followUpId,
      });
    }

    emitEvent({
      actorPersonId: input.actorPersonId,
      action: input.decision,
      contributionId: c.id,
      detail: input.note,
    });
    notifyOffices(
      'FAMILY_RESPONSE',
      `Family response: ${personName(c.personId)} · ${input.decision}`,
      { contributionId: c.id },
    );
    return { ok: true };
  },

  submitFamilyBatchToCoordinator(input: {
    actorPersonId: string;
    teamId: string;
    contributionIds: string[];
    paymentMethod: ChoirPaymentMethod;
    toRailId?: string;
    note?: string;
  }): ActionResult {
    if (!canFamilyGate(input.actorPersonId, input.teamId)) {
      return { ok: false, reason: 'Only family leader can submit this batch' };
    }
    const rows = input.contributionIds
      .map((id) => CHOIR_CONTRIBUTIONS.find((c) => c.id === id && inActiveChoir(c)))
      .filter((c): c is ChoirContribution => Boolean(c));
    if (rows.length === 0) return { ok: false, reason: 'No claims selected' };
    for (const c of rows) {
      if (c.teamId !== input.teamId) {
        return { ok: false, reason: 'Claim outside this family' };
      }
      if (c.status !== 'FAMILY_CONFIRMED' && c.status !== 'FAMILY_PARTIAL') {
        return {
          ok: false,
          reason: `${c.id} must be family-confirmed before handoff`,
        };
      }
    }
    const total = rows.reduce(
      (s, c) => s + (c.familyConfirmedAmount ?? c.confirmedAmount ?? c.amount),
      0,
    );
    const orgUnitId = requireActiveChoirOrgUnitId();
    const handoffId = nid('chand');
    const handoff: ChoirContributionHandoff = {
      id: handoffId,
      orgUnitId,
      kind: 'FAMILY_TO_COORDINATOR',
      fromPersonId: input.actorPersonId,
      teamId: input.teamId,
      contributionIds: rows.map((c) => c.id),
      totalAmount: total,
      paymentMethod: input.paymentMethod,
      toRailId: input.toRailId,
      note: input.note,
      submittedAt: new Date().toISOString(),
      status: 'SUBMITTED',
    };
    pushChoirHandoff(handoff);
    for (const c of rows) {
      updateChoirContribution(c.id, {
        status: 'AT_COORDINATOR',
        handoffToCoordinatorId: handoffId,
      });
    }
    emitEvent({
      actorPersonId: input.actorPersonId,
      action: 'HANDOFF_TO_COORDINATOR',
      handoffId,
      detail: `${rows.length} claims · ${total.toLocaleString()} RWF`,
    });
    notifyOffices(
      'HANDOFF',
      `Family → coordinator: ${total.toLocaleString()} RWF (${rows.length} claims)`,
      { handoffId },
    );
    return { ok: true, id: handoffId };
  },

  submitCoordBatchToTreasurer(input: {
    actorPersonId: string;
    contributionIds: string[];
    paymentMethod: ChoirPaymentMethod;
    toRailId?: string;
    note?: string;
  }): ActionResult {
    const office = officeFor(input.actorPersonId);
    if (office !== 'COORDINATOR' && office !== 'TREASURER') {
      return { ok: false, reason: 'Only coordinator can submit to treasurer' };
    }
    const rows = input.contributionIds
      .map((id) => CHOIR_CONTRIBUTIONS.find((c) => c.id === id && inActiveChoir(c)))
      .filter((c): c is ChoirContribution => Boolean(c));
    if (rows.length === 0) return { ok: false, reason: 'No claims selected' };
    for (const c of rows) {
      if (c.status !== 'AT_COORDINATOR') {
        return { ok: false, reason: `${c.id} is not at coordinator` };
      }
    }
    const total = rows.reduce(
      (s, c) => s + (c.familyConfirmedAmount ?? c.confirmedAmount ?? c.amount),
      0,
    );
    const orgUnitId = requireActiveChoirOrgUnitId();
    const handoffId = nid('chand');
    pushChoirHandoff({
      id: handoffId,
      orgUnitId,
      kind: 'COORDINATOR_TO_TREASURER',
      fromPersonId: input.actorPersonId,
      contributionIds: rows.map((c) => c.id),
      totalAmount: total,
      paymentMethod: input.paymentMethod,
      toRailId: input.toRailId,
      note: input.note,
      submittedAt: new Date().toISOString(),
      status: 'SUBMITTED',
    });
    for (const c of rows) {
      updateChoirContribution(c.id, {
        status: 'AT_TREASURER',
        handoffToTreasurerId: handoffId,
      });
    }
    emitEvent({
      actorPersonId: input.actorPersonId,
      action: 'HANDOFF_TO_TREASURER',
      handoffId,
      detail: `${rows.length} claims · ${total.toLocaleString()} RWF`,
    });
    notifyOffices(
      'HANDOFF',
      `Coordinator → treasurer: ${total.toLocaleString()} RWF (${rows.length} claims)`,
      { handoffId },
    );
    return { ok: true, id: handoffId };
  },

  treasurerFinalize(input: {
    contributionId: string;
    actorPersonId: string;
    decision: 'CONFIRMED' | 'PARTIAL' | 'DECLINED';
    confirmedAmount?: number;
    note?: string;
  }): ActionResult {
    const office = officeFor(input.actorPersonId);
    if (office !== 'TREASURER') {
      return { ok: false, reason: 'Only treasurer finalizes into the vault' };
    }
    const c = CHOIR_CONTRIBUTIONS.find(
      (x) => x.id === input.contributionId && inActiveChoir(x),
    );
    if (!c) return { ok: false, reason: 'Unknown contribution' };
    if (c.status !== 'AT_TREASURER' && c.status !== 'FAMILY_CONFIRMED' && c.status !== 'FAMILY_PARTIAL') {
      return {
        ok: false,
        reason: 'Claim must reach treasurer (or be family-confirmed) to finalize',
      };
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
      emitEvent({
        actorPersonId: input.actorPersonId,
        action: 'FINAL_DECLINED',
        contributionId: c.id,
      });
      notifyOffices('FINALIZED', `Treasurer declined ${personName(c.personId)}`, {
        contributionId: c.id,
      });
      return { ok: true };
    }

    const base = c.familyConfirmedAmount ?? c.amount;
    const amount =
      input.decision === 'PARTIAL'
        ? Math.round(input.confirmedAmount ?? 0)
        : base;
    if (amount <= 0 || amount > c.amount) {
      return { ok: false, reason: 'Invalid confirmed amount' };
    }

    const posted = financeService.recordChoirContributionIncome({
      actorPersonId: input.actorPersonId,
      amount,
      description: `Choir contribution · ${personName(c.personId)}`,
      occurredOn: c.occurredOn,
      contributionId: c.id,
      orgUnitId: c.orgUnitId,
    });
    if (!posted.ok) {
      return { ok: false, reason: posted.reason ?? 'Choir fund vault denied' };
    }

    let followUpId = c.followUpId;
    if (input.decision === 'PARTIAL') {
      followUpId = nid('cfu');
      pushChoirFollowUp({
        id: followUpId,
        contributionId: c.id,
        personId: c.personId,
        reason:
          input.note ||
          `Partial vault confirm ${amount.toLocaleString()} of ${c.amount.toLocaleString()}`,
        status: 'OPEN',
        createdAt: new Date().toISOString(),
        createdByPersonId: input.actorPersonId,
      });
    }

    updateChoirContribution(c.id, {
      status: input.decision === 'PARTIAL' ? 'PARTIAL' : 'CONFIRMED',
      confirmedAmount: amount,
      verifiedAt: new Date().toISOString(),
      verifiedByPersonId: input.actorPersonId,
      verifyNote: input.note,
      financeTxnId: posted.txnId,
      followUpId,
    });
    emitEvent({
      actorPersonId: input.actorPersonId,
      action: input.decision === 'PARTIAL' ? 'FINAL_PARTIAL' : 'FINAL_CONFIRMED',
      contributionId: c.id,
      detail: `${amount.toLocaleString()} → vault`,
    });
    notifyOffices(
      'FINALIZED',
      `Treasurer ${input.decision}: ${personName(c.personId)} · ${amount.toLocaleString()}`,
      { contributionId: c.id },
    );
    return { ok: true };
  },

  openFollowUp(input: {
    contributionId: string;
    actorPersonId: string;
    reason: string;
  }): ActionResult {
    const c = CHOIR_CONTRIBUTIONS.find(
      (x) => x.id === input.contributionId && inActiveChoir(x),
    );
    if (!c) return { ok: false, reason: 'Unknown contribution' };
    const id = nid('cfu');
    pushChoirFollowUp({
      id,
      contributionId: c.id,
      personId: c.personId,
      reason: input.reason,
      status: 'OPEN',
      createdAt: new Date().toISOString(),
      createdByPersonId: input.actorPersonId,
    });
    updateChoirContribution(c.id, { followUpId: id });
    notifyOffices('FOLLOW_UP', input.reason, { contributionId: c.id });
    return { ok: true, id };
  },

  closeFollowUp(input: {
    followUpId: string;
    actorPersonId: string;
    resultNote: string;
  }): ActionResult {
    const f = CHOIR_FOLLOW_UPS.find((x) => x.id === input.followUpId);
    if (!f) return { ok: false, reason: 'Unknown follow-up' };
    updateChoirFollowUp(f.id, {
      status: 'CLOSED',
      resultNote: input.resultNote,
      closedAt: new Date().toISOString(),
      closedByPersonId: input.actorPersonId,
    });
    notifyOffices('FOLLOW_UP', `Follow-up closed: ${input.resultNote}`, {
      contributionId: f.contributionId,
    });
    return { ok: true };
  },

  listOversightClaims() {
    return CHOIR_CONTRIBUTIONS.filter(inActiveChoir).sort((a, b) =>
      b.submittedAt.localeCompare(a.submittedAt),
    );
  },

  listFamilyQueue(personId: string) {
    const teams = ledTeamIds(personId);
    const ownTeam = teamIdForPerson(personId);
    const ids = new Set([...teams, ...(ownTeam ? [ownTeam] : [])]);
    return CHOIR_CONTRIBUTIONS.filter(
      (c) =>
        inActiveChoir(c) &&
        c.teamId &&
        ids.has(c.teamId) &&
        (c.status === 'PENDING' ||
          c.status === 'FAMILY_CONFIRMED' ||
          c.status === 'FAMILY_PARTIAL'),
    ).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  },

  listFinalConfirmed() {
    return CHOIR_CONTRIBUTIONS.filter(
      (c) => inActiveChoir(c) && isFinalConfirmedStatus(c.status),
    ).sort((a, b) =>
      (b.verifiedAt ?? b.submittedAt).localeCompare(
        a.verifiedAt ?? a.submittedAt,
      ),
    );
  },

  listIssues() {
    return CHOIR_CONTRIBUTIONS.filter(
      (c) => inActiveChoir(c) && isIssueStatus(c.status),
    ).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  },

  listEvents(contributionId?: string) {
    return CHOIR_CONTRIB_EVENTS.filter(
      (e) =>
        inActiveChoir(e) &&
        (!contributionId || e.contributionId === contributionId),
    ).sort((a, b) => b.at.localeCompare(a.at));
  },

  listNotifications(office: ChoirOffice | null) {
    if (!office) return [];
    return CHOIR_CONTRIB_NOTIFICATIONS.filter(
      (n) =>
        inActiveChoir(n) &&
        n.audienceOffices.includes(
          office as ChoirContribNotification['audienceOffices'][number],
        ),
    ).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  listHandoffs() {
    return CHOIR_HANDOFFS.filter(inActiveChoir).sort((a, b) =>
      b.submittedAt.localeCompare(a.submittedAt),
    );
  },

  driveProgressForViewer(
    driveId: string,
    office: ChoirOffice | null,
  ): {
    drive: ChoirContributionDrive;
    memberGoal: number | null;
    familyGoal: number | null;
    choirGoal: number | null;
    claimed: number;
    familyConfirmed: number;
    finalConfirmed: number;
    remainingToChoirGoal: number | null;
    successRate: number | null;
  } | null {
    const drive = CHOIR_CONTRIBUTION_DRIVES.find(
      (d) => d.id === driveId && inActiveChoir(d),
    );
    if (!drive) return null;
    const goals = CHOIR_CONTRIBUTION_GOALS.filter((g) => g.driveId === driveId);
    const memberGoal =
      goals.find((g) => g.scope === 'MEMBER')?.targetAmount ?? null;
    const familyGoal =
      goals.find((g) => g.scope === 'TEAM')?.targetAmount ?? null;
    const choirGoalRaw =
      goals.find((g) => g.scope === 'MINISTRY')?.targetAmount ?? null;
    const showChoir =
      drive.ministryGoalPublic ||
      office === 'TREASURER' ||
      office === 'COORDINATOR' ||
      office === 'PRESIDENT' ||
      office === 'VP' ||
      office === 'SECRETARY' ||
      office === 'MUSIC_DIRECTOR';
    const choirGoal = showChoir ? choirGoalRaw : null;

    const rows = CHOIR_CONTRIBUTIONS.filter(
      (c) => inActiveChoir(c) && c.driveId === driveId,
    );
    const claimed = rows.reduce((s, c) => s + c.amount, 0);
    const familyConfirmed = rows
      .filter(
        (c) =>
          c.status === 'FAMILY_CONFIRMED' ||
          c.status === 'FAMILY_PARTIAL' ||
          c.status === 'AT_COORDINATOR' ||
          c.status === 'AT_TREASURER' ||
          isFinalConfirmedStatus(c.status),
      )
      .reduce(
        (s, c) => s + (c.familyConfirmedAmount ?? c.confirmedAmount ?? 0),
        0,
      );
    const finalConfirmed = rows
      .filter((c) => isFinalConfirmedStatus(c.status))
      .reduce((s, c) => s + (c.confirmedAmount ?? c.amount), 0);
    const remainingToChoirGoal =
      choirGoal != null ? Math.max(0, choirGoal - finalConfirmed) : null;
    const successRate =
      choirGoal != null && choirGoal > 0
        ? Math.round((finalConfirmed / choirGoal) * 1000) / 10
        : null;

    return {
      drive,
      memberGoal,
      familyGoal,
      choirGoal,
      claimed,
      familyConfirmed,
      finalConfirmed,
      remainingToChoirGoal,
      successRate,
    };
  },

  personName,
  officeFor,
  ledTeamIds,
  canFamilyGate,
};
