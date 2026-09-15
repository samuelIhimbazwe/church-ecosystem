/**
 * W0 write-through: prefer mission API when enabled, else seed missionService.
 * Syncs successful API writes back into seed arrays when the id already exists
 * so hybrid list views stay coherent during migration.
 */
import { isApiEnabled, ApiError } from '../api';
import {
  apiAddEventCollaborator,
  apiAddProjectCollaborator,
  apiApproveEventLevel,
  apiApproveProgram,
  apiApproveProject,
  apiApproveProjectLevel,
  apiBeginCloseProgram,
  apiBeginCloseProject,
  apiCancelProject,
  apiCompleteEvent,
  apiCreateActivity,
  apiEnroll,
  apiEventNextSteps,
  apiMarkAttendance,
  apiMarkEventAttendance,
  apiRegisterForEvent,
  apiSetTaskStatus,
  apiStartProgram,
  apiStartProject,
  apiSubmitProgram,
  apiSubmitProject,
  loadActivitiesPreferApi,
  loadEnrollmentsPreferApi,
  loadEventRegistrationsPreferApi,
} from '../api/missionApi';
import {
  ACTIVITIES,
  ATTENDANCE,
  EVENT_REGISTRATIONS,
  EVENTS,
  PROGRAM_ENROLLMENTS,
  PROGRAMS,
  PROJECTS,
  TASKS,
} from '../data/seed';
import type {
  EventRegistration,
  EventRegistrationStatus,
  MembershipType,
  Position,
  ProgramEnrollment,
  ProgramEnrollmentRole,
  ProgramEnrollmentStatus,
  SystemId,
  SystemRole,
} from '../domain/types';
import { missionService } from './missionService';

function syncProgram(program: { id: string; status: string; approvedByPersonId?: string; approvedAt?: string }) {
  const i = PROGRAMS.findIndex((p) => p.id === program.id);
  if (i < 0) return;
  PROGRAMS[i] = {
    ...PROGRAMS[i],
    status: program.status as (typeof PROGRAMS)[0]['status'],
    approvedByPersonId: program.approvedByPersonId ?? PROGRAMS[i].approvedByPersonId,
    approvedAt: program.approvedAt ?? PROGRAMS[i].approvedAt,
  };
}

export async function writeSubmitProgram(id: string) {
  if (isApiEnabled()) {
    try {
      const program = await apiSubmitProgram(id);
      syncProgram(program);
      return { ok: true as const, program };
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'API submit failed';
      return { ok: false as const, reason: msg };
    }
  }
  return missionService.submitProgramForApproval(id);
}

export async function writeApproveProgram(
  id: string,
  approverPersonId: string,
  roles: SystemRole[],
) {
  if (isApiEnabled()) {
    try {
      const program = await apiApproveProgram(id);
      syncProgram(program);
      return { ok: true as const, program };
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'API approve failed';
      return { ok: false as const, reason: msg };
    }
  }
  return missionService.approveProgram(id, approverPersonId, roles);
}

export async function writeStartProgram(id: string) {
  if (isApiEnabled()) {
    try {
      const r = await apiStartProgram(id);
      syncProgram(r.program);
      return {
        ok: true as const,
        program: r.program,
        gap: r.gap,
        openRequired: r.openRequired,
      };
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'API start failed';
      return { ok: false as const, reason: msg };
    }
  }
  return missionService.startProgram(id);
}

export async function writeBeginCloseProgram(id: string) {
  if (isApiEnabled()) {
    try {
      const program = await apiBeginCloseProgram(id);
      syncProgram(program);
      return { ok: true as const, program };
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'API begin-close failed';
      return { ok: false as const, reason: msg };
    }
  }
  return missionService.beginCloseProgram(id);
}

export async function writeCreateActivity(input: {
  programId: string;
  title: string;
  startsAt: string;
  endsAt?: string;
  location?: string;
  seriesId?: string;
  seriesLabel?: string;
}) {
  if (isApiEnabled()) {
    try {
      const activity = await apiCreateActivity(input.programId, input);
      ACTIVITIES.unshift({
        id: activity.id,
        programId: activity.programId,
        title: activity.title,
        startsAt: activity.startsAt,
        endsAt: activity.endsAt,
        location: activity.location,
        seriesId: input.seriesId,
        seriesLabel: input.seriesLabel,
      });
      return { ok: true as const, activity };
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'API create activity failed';
      return { ok: false as const, reason: msg };
    }
  }
  const activity = missionService.createActivity(input);
  if (!activity.ok) {
    return { ok: false as const, reason: activity.reason };
  }
  return { ok: true as const, activity: activity.activity };
}

export async function writeEnroll(input: {
  programId: string;
  personId: string;
  role?: 'LEADER' | 'PARTICIPANT';
  roleKey?: string;
  staffBypass?: boolean;
}) {
  if (isApiEnabled()) {
    try {
      const enrollment = await apiEnroll(input.programId, {
        personId: input.personId,
        role: input.role,
        roleKey: input.roleKey,
      });
      PROGRAM_ENROLLMENTS.unshift({
        id: enrollment.id,
        programId: enrollment.programId,
        personId: enrollment.personId,
        role: (enrollment.role as 'LEADER' | 'PARTICIPANT') || 'PARTICIPANT',
        roleKey: enrollment.roleKey,
        status: (enrollment.status as 'ACTIVE') || 'ACTIVE',
        enrolledOn: enrollment.enrolledOn,
      });
      return { ok: true as const, enrollment };
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'API enroll failed';
      return { ok: false as const, reason: msg };
    }
  }
  return missionService.enroll({
    ...input,
    asStaff: input.staffBypass,
  });
}

export async function writeMarkAttendance(input: {
  activityId: string;
  personId: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
}) {
  if (isApiEnabled()) {
    try {
      const attendance = await apiMarkAttendance(input.activityId, input);
      const i = ATTENDANCE.findIndex(
        (a) =>
          a.activityId === attendance.activityId &&
          a.personId === attendance.personId,
      );
      const row = {
        id: attendance.id,
        activityId: attendance.activityId,
        personId: attendance.personId,
        status: attendance.status as 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED',
        recordedAt: attendance.recordedAt,
      };
      if (i >= 0) ATTENDANCE[i] = row;
      else ATTENDANCE.unshift(row);
      return { ok: true as const, attendance: row };
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'API attendance failed';
      return { ok: false as const, reason: msg };
    }
  }
  // seed path via missionService if it has markAttendance — fallback local
  const existing = ATTENDANCE.find(
    (a) => a.activityId === input.activityId && a.personId === input.personId,
  );
  if (existing) {
    existing.status = input.status;
    existing.recordedAt = new Date().toISOString();
    return { ok: true as const, attendance: existing };
  }
  const attendance = {
    id: `att-${Date.now()}`,
    ...input,
    recordedAt: new Date().toISOString(),
  };
  ATTENDANCE.unshift(attendance);
  return { ok: true as const, attendance };
}

function syncProject(project: { id: string; status: string }) {
  const i = PROJECTS.findIndex((p) => p.id === project.id);
  if (i < 0) return;
  PROJECTS[i] = {
    ...PROJECTS[i],
    status: project.status as (typeof PROJECTS)[0]['status'],
  };
}

function syncEvent(event: {
  id: string;
  status: string;
  lifecyclePhase?: string | null;
}) {
  const i = EVENTS.findIndex((e) => e.id === event.id);
  if (i < 0) return;
  EVENTS[i] = {
    ...EVENTS[i],
    status: event.status as (typeof EVENTS)[0]['status'],
    ...(event.lifecyclePhase
      ? {
          lifecyclePhase: event.lifecyclePhase as NonNullable<
            (typeof EVENTS)[0]['lifecyclePhase']
          >,
        }
      : {}),
  };
}

function syncTask(task: { id: string; status: string }) {
  const i = TASKS.findIndex((t) => t.id === task.id);
  if (i < 0) return;
  TASKS[i] = {
    ...TASKS[i],
    status: task.status as (typeof TASKS)[0]['status'],
  };
}

export async function writeSubmitProject(id: string) {
  if (isApiEnabled()) {
    try {
      const project = await apiSubmitProject(id);
      syncProject(project);
      return { ok: true as const, project };
    } catch (e) {
      return {
        ok: false as const,
        reason: e instanceof ApiError ? e.message : 'API submit failed',
      };
    }
  }
  return missionService.submitProjectForApproval(id);
}

export async function writeApproveProject(
  id: string,
  approverPersonId: string,
  roles: SystemRole[],
) {
  if (isApiEnabled()) {
    try {
      const project = await apiApproveProject(id);
      syncProject(project);
      return { ok: true as const, project };
    } catch (e) {
      return {
        ok: false as const,
        reason: e instanceof ApiError ? e.message : 'API approve failed',
      };
    }
  }
  return missionService.approveProject(id, approverPersonId, roles);
}

export async function writeApproveProjectLevel(input: {
  projectId: string;
  levelKey: string;
  personId: string;
  roles: SystemRole[];
  positions: Position[];
}) {
  if (isApiEnabled()) {
    try {
      const project = await apiApproveProjectLevel(
        input.projectId,
        input.levelKey,
      );
      syncProject(project);
      return { ok: true as const, project };
    } catch (e) {
      return {
        ok: false as const,
        reason: e instanceof ApiError ? e.message : 'API approve-level failed',
      };
    }
  }
  return missionService.approveProjectLevel(input);
}

export async function writeStartProject(
  id: string,
  opts?: { forceSpendGap?: boolean; forceReason?: string },
) {
  if (isApiEnabled()) {
    try {
      const r = await apiStartProject(id, opts);
      syncProject(r.project);
      return {
        ok: true as const,
        project: r.project,
        gap: r.gap,
        openRequired: r.openRequired,
      };
    } catch (e) {
      const gap =
        e instanceof ApiError &&
        e.body &&
        typeof e.body === 'object' &&
        e.body !== null &&
        'gap' in e.body
          ? Number((e.body as { gap?: number }).gap)
          : undefined;
      return {
        ok: false as const,
        reason: e instanceof ApiError ? e.message : 'API start failed',
        gap: Number.isFinite(gap) ? gap : undefined,
      };
    }
  }
  return missionService.startProject(id, opts);
}

export async function writeBeginCloseProject(id: string) {
  if (isApiEnabled()) {
    try {
      const project = await apiBeginCloseProject(id);
      syncProject(project);
      return { ok: true as const, project };
    } catch (e) {
      return {
        ok: false as const,
        reason: e instanceof ApiError ? e.message : 'API begin-close failed',
      };
    }
  }
  return missionService.beginCloseProject(id);
}

export async function writeCancelProject(id: string) {
  if (isApiEnabled()) {
    try {
      const project = await apiCancelProject(id);
      syncProject(project);
      return { ok: true as const, project };
    } catch (e) {
      return {
        ok: false as const,
        reason: e instanceof ApiError ? e.message : 'API cancel failed',
      };
    }
  }
  return missionService.cancelProject(id);
}

export async function writeApproveEventLevel(input: {
  eventId: string;
  levelKey: string;
  personId: string;
  roles: SystemRole[];
  positions: Position[];
}) {
  if (isApiEnabled()) {
    try {
      const event = await apiApproveEventLevel(input.eventId, input.levelKey);
      syncEvent(event);
      return { ok: true as const, event };
    } catch (e) {
      return {
        ok: false as const,
        reason: e instanceof ApiError ? e.message : 'API approve-level failed',
      };
    }
  }
  return missionService.approveEventLevel(input);
}

export async function writeCompleteEvent(id: string) {
  if (isApiEnabled()) {
    try {
      const event = await apiCompleteEvent(id);
      syncEvent(event);
      return { ok: true as const, event };
    } catch (e) {
      return {
        ok: false as const,
        reason: e instanceof ApiError ? e.message : 'API complete failed',
      };
    }
  }
  const event = missionService.completeEvent(id);
  return event
    ? { ok: true as const, event }
    : { ok: false as const, reason: 'Event not found' };
}

export async function writePatchEvent(
  id: string,
  patch: { status?: string; lifecyclePhase?: 'PREPARE' | 'DELIVER' | 'CLOSE' },
) {
  if (isApiEnabled()) {
    try {
      const { apiPatchEvent } = await import('../api/missionApi');
      const event = await apiPatchEvent(id, patch);
      syncEvent(event);
      return { ok: true as const, event };
    } catch (e) {
      return {
        ok: false as const,
        reason: e instanceof ApiError ? e.message : 'API patch failed',
      };
    }
  }
  if (patch.lifecyclePhase) {
    return missionService.setEventLifecycle(id, patch.lifecyclePhase);
  }
  if (patch.status) {
    const event = missionService.updateEvent(id, {
      status: patch.status as import('../domain/types').ChurchEventStatus,
    });
    return event
      ? { ok: true as const, event }
      : { ok: false as const, reason: 'Event not found' };
  }
  return { ok: false as const, reason: 'Nothing to patch' };
}

export async function writeSubmitEvent(id: string) {
  if (isApiEnabled()) {
    try {
      const { apiPatchEvent } = await import('../api/missionApi');
      const live = missionService.getEvent(id);
      const nextStatus = live?.beyondOwnerScope
        ? 'PENDING_APPROVAL'
        : 'CONFIRMED';
      const event = await apiPatchEvent(id, {
        status: nextStatus,
        lifecyclePhase: 'PREPARE',
      });
      syncEvent(event);
      return { ok: true as const, event };
    } catch (e) {
      return {
        ok: false as const,
        reason: e instanceof ApiError ? e.message : 'API submit failed',
      };
    }
  }
  return missionService.submitEvent(id);
}

export async function writeStartTask(id: string) {
  if (isApiEnabled()) {
    try {
      const task = await apiSetTaskStatus(id, 'IN_PROGRESS');
      syncTask(task);
      return task;
    } catch {
      return missionService.startTask(id);
    }
  }
  return missionService.startTask(id);
}

export async function writeCompleteTask(id: string, outcomeNote?: string) {
  if (isApiEnabled()) {
    try {
      const task = await apiSetTaskStatus(id, 'DONE');
      syncTask(task);
      if (outcomeNote) {
        const i = TASKS.findIndex((t) => t.id === id);
        if (i >= 0) TASKS[i] = { ...TASKS[i], outcomeNote };
      }
      return { ok: true as const, task };
    } catch (e) {
      return {
        ok: false as const,
        reason: e instanceof ApiError ? e.message : 'API complete failed',
      };
    }
  }
  return missionService.completeTask(id, outcomeNote);
}

export async function writeReopenTask(
  id: string,
  prior: {
    status: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
    endDate?: string;
    outcomeNote?: string;
    grantsSystemAccess?: boolean;
    accessRevokedAt?: string;
  },
) {
  const status =
    prior.status === 'DONE' || prior.status === 'CANCELLED'
      ? 'IN_PROGRESS'
      : prior.status;
  if (isApiEnabled()) {
    try {
      const task = await apiSetTaskStatus(id, status);
      syncTask(task);
      missionService.updateTask(id, {
        endDate: prior.endDate,
        outcomeNote: prior.outcomeNote,
        grantsSystemAccess: prior.grantsSystemAccess,
        accessRevokedAt: prior.accessRevokedAt,
      });
      return missionService.getTask(id);
    } catch {
      return missionService.reopenTask(id, prior);
    }
  }
  return missionService.reopenTask(id, prior);
}

function replaceProgramActivities(
  programId: string,
  rows: Array<{
    id: string;
    programId: string;
    title: string;
    startsAt: string;
    endsAt?: string;
    location?: string;
    sessionClosedAt?: string;
  }>,
) {
  for (let i = ACTIVITIES.length - 1; i >= 0; i--) {
    if (ACTIVITIES[i].programId === programId) ACTIVITIES.splice(i, 1);
  }
  for (const a of rows) {
    ACTIVITIES.push({
      id: a.id,
      programId: a.programId,
      title: a.title,
      startsAt: a.startsAt,
      endsAt: a.endsAt,
      location: a.location,
      sessionClosedAt: a.sessionClosedAt,
    });
  }
}

function replaceProgramEnrollments(
  programId: string,
  rows: Array<{
    id: string;
    programId: string;
    personId: string;
    role: string;
    roleKey?: string;
    status: string;
    enrolledOn: string;
  }>,
) {
  for (let i = PROGRAM_ENROLLMENTS.length - 1; i >= 0; i--) {
    if (PROGRAM_ENROLLMENTS[i].programId === programId) {
      PROGRAM_ENROLLMENTS.splice(i, 1);
    }
  }
  for (const e of rows) {
    PROGRAM_ENROLLMENTS.push({
      id: e.id,
      programId: e.programId,
      personId: e.personId,
      role: (e.role as ProgramEnrollmentRole) || 'PARTICIPANT',
      roleKey: e.roleKey,
      status: (e.status as ProgramEnrollmentStatus) || 'ACTIVE',
      enrolledOn: e.enrolledOn,
    } satisfies ProgramEnrollment);
  }
}

function replaceEventRegistrations(
  eventId: string,
  rows: Array<{
    id: string;
    eventId: string;
    personId: string;
    status: string;
    registeredOn: string;
    attendedAt?: string;
    promotedAt?: string;
    offerExpiresAt?: string;
  }>,
) {
  for (let i = EVENT_REGISTRATIONS.length - 1; i >= 0; i--) {
    if (EVENT_REGISTRATIONS[i].eventId === eventId) {
      EVENT_REGISTRATIONS.splice(i, 1);
    }
  }
  for (const r of rows) {
    EVENT_REGISTRATIONS.push({
      id: r.id,
      eventId: r.eventId,
      personId: r.personId,
      status: r.status as EventRegistrationStatus,
      registeredOn: r.registeredOn,
      attendedAt: r.attendedAt,
      promotedAt: r.promotedAt,
      offerExpiresAt: r.offerExpiresAt,
    } satisfies EventRegistration);
  }
}

function upsertEventRegistration(reg: {
  id: string;
  eventId: string;
  personId: string;
  status: string;
  registeredOn: string;
  attendedAt?: string;
  promotedAt?: string;
  offerExpiresAt?: string;
}) {
  const row: EventRegistration = {
    id: reg.id,
    eventId: reg.eventId,
    personId: reg.personId,
    status: reg.status as EventRegistrationStatus,
    registeredOn: reg.registeredOn,
    attendedAt: reg.attendedAt,
    promotedAt: reg.promotedAt,
    offerExpiresAt: reg.offerExpiresAt,
  };
  const i = EVENT_REGISTRATIONS.findIndex(
    (r) =>
      r.id === reg.id ||
      (r.eventId === reg.eventId && r.personId === reg.personId),
  );
  if (i >= 0) EVENT_REGISTRATIONS[i] = row;
  else EVENT_REGISTRATIONS.unshift(row);
  return row;
}

/** Hydrate program roster/sessions from API into seed so detail views stay coherent. */
export async function hydrateProgramDetailFromApi(programId: string) {
  if (!isApiEnabled()) return false;
  const [acts, enrolls] = await Promise.all([
    loadActivitiesPreferApi(programId),
    loadEnrollmentsPreferApi(programId),
  ]);
  if (acts) replaceProgramActivities(programId, acts);
  if (enrolls) replaceProgramEnrollments(programId, enrolls);
  return !!(acts || enrolls);
}

export async function hydrateEventRegistrationsFromApi(eventId: string) {
  if (!isApiEnabled()) return false;
  const regs = await loadEventRegistrationsPreferApi(eventId);
  if (!regs) return false;
  replaceEventRegistrations(eventId, regs);
  return true;
}

export async function writeRegisterForEvent(input: {
  eventId: string;
  personId: string;
}) {
  if (isApiEnabled()) {
    try {
      const registration = await apiRegisterForEvent(
        input.eventId,
        input.personId,
      );
      const row = upsertEventRegistration(registration);
      return { ok: true as const, registration: row };
    } catch (e) {
      return {
        ok: false as const,
        reason: e instanceof ApiError ? e.message : 'API register failed',
      };
    }
  }
  return missionService.registerForEvent(input);
}

export async function writeCancelEventRegistration(input: {
  eventId: string;
  personId: string;
}) {
  if (isApiEnabled()) {
    try {
      const { apiCancelEventRegistration } = await import('../api/missionApi');
      const res = await apiCancelEventRegistration(
        input.eventId,
        input.personId,
      );
      upsertEventRegistration(res.registration);
      if (res.promoted) upsertEventRegistration(res.promoted);
      return {
        ok: true as const,
        registration: res.registration,
        promoted: res.promoted ?? undefined,
      };
    } catch (e) {
      return {
        ok: false as const,
        reason: e instanceof ApiError ? e.message : 'API cancel failed',
      };
    }
  }
  return missionService.cancelEventRegistration(input);
}

export async function writeMarkEventAttendance(input: {
  eventId: string;
  personId: string;
  attended: boolean;
}) {
  if (isApiEnabled()) {
    try {
      const registration = await apiMarkEventAttendance(input.eventId, {
        personId: input.personId,
        attended: input.attended,
      });
      const row = upsertEventRegistration(registration);
      return { ok: true as const, registration: row };
    } catch (e) {
      return {
        ok: false as const,
        reason: e instanceof ApiError ? e.message : 'API attendance failed',
      };
    }
  }
  return missionService.markEventAttendance(input);
}

export async function writeEventNextSteps(input: {
  eventId: string;
  personId: string;
  enrollProgramId?: string;
  addMembershipType?: MembershipType;
  membershipLabel?: string;
  createFollowUpTask?: { title: string; ownerPersonId: string };
}) {
  if (isApiEnabled()) {
    try {
      const r = await apiEventNextSteps(input.eventId, {
        personId: input.personId,
        enrollProgramId: input.enrollProgramId,
        addMembershipType: input.addMembershipType,
        membershipLabel: input.membershipLabel,
        createFollowUpTask: input.createFollowUpTask,
      });
      if (input.enrollProgramId) {
        await hydrateProgramDetailFromApi(input.enrollProgramId);
      }
      return { ...r, ok: true as const };
    } catch (e) {
      return {
        ok: false as const,
        reason: e instanceof ApiError ? e.message : 'API next-steps failed',
      };
    }
  }
  return missionService.applyEventNextSteps(input);
}

export async function writeAddEventCollaboratorSystem(
  eventId: string,
  systemId: SystemId,
) {
  if (isApiEnabled()) {
    try {
      const event = await apiAddEventCollaborator(eventId, {
        addSystemId: systemId,
      });
      const i = EVENTS.findIndex((e) => e.id === eventId);
      if (i >= 0) {
        EVENTS[i] = {
          ...EVENTS[i],
          status: (event.status as (typeof EVENTS)[0]['status']) ?? EVENTS[i].status,
          collaboratorSystemIds: (event.collaboratorSystemIds ??
            []) as SystemId[],
          collaboratorPersonIds: event.collaboratorPersonIds,
        };
      }
      return { ok: true as const, event: EVENTS[i] ?? event };
    } catch (e) {
      return {
        ok: false as const,
        reason: e instanceof ApiError ? e.message : 'API collaborator failed',
      };
    }
  }
  const event = missionService.addEventCollaboratorSystem(eventId, systemId);
  return event
    ? { ok: true as const, event }
    : { ok: false as const, reason: 'Event not found' };
}

export async function writeAddEventCollaboratorPerson(
  eventId: string,
  personId: string,
) {
  if (isApiEnabled()) {
    try {
      const event = await apiAddEventCollaborator(eventId, {
        addPersonId: personId,
      });
      const i = EVENTS.findIndex((e) => e.id === eventId);
      if (i >= 0) {
        EVENTS[i] = {
          ...EVENTS[i],
          collaboratorSystemIds: (event.collaboratorSystemIds ??
            EVENTS[i].collaboratorSystemIds ??
            []) as SystemId[],
          collaboratorPersonIds: event.collaboratorPersonIds,
        };
      }
      return { ok: true as const, event: EVENTS[i] ?? event };
    } catch (e) {
      return {
        ok: false as const,
        reason: e instanceof ApiError ? e.message : 'API collaborator failed',
      };
    }
  }
  const event = missionService.addEventCollaboratorPerson(eventId, personId);
  return event
    ? { ok: true as const, event }
    : { ok: false as const, reason: 'Event not found' };
}

export async function writeAddProjectCollaboratorSystem(
  projectId: string,
  systemId: SystemId,
) {
  if (isApiEnabled()) {
    try {
      const project = await apiAddProjectCollaborator(projectId, {
        addSystemId: systemId,
      });
      const i = PROJECTS.findIndex((p) => p.id === projectId);
      if (i >= 0) {
        PROJECTS[i] = {
          ...PROJECTS[i],
          collaboratorSystemIds: (project.collaboratorSystemIds ??
            []) as SystemId[],
          collaboratorPersonIds: project.collaboratorPersonIds,
        };
      }
      return { ok: true as const, project: PROJECTS[i] ?? project };
    } catch (e) {
      return {
        ok: false as const,
        reason: e instanceof ApiError ? e.message : 'API collaborator failed',
      };
    }
  }
  const project = missionService.addProjectCollaboratorSystem(
    projectId,
    systemId,
  );
  return project
    ? { ok: true as const, project }
    : { ok: false as const, reason: 'Project not found' };
}

export async function writeAddProjectCollaboratorPerson(
  projectId: string,
  personId: string,
) {
  if (isApiEnabled()) {
    try {
      const project = await apiAddProjectCollaborator(projectId, {
        addPersonId: personId,
      });
      const i = PROJECTS.findIndex((p) => p.id === projectId);
      if (i >= 0) {
        PROJECTS[i] = {
          ...PROJECTS[i],
          collaboratorSystemIds: (project.collaboratorSystemIds ??
            PROJECTS[i].collaboratorSystemIds ??
            []) as SystemId[],
          collaboratorPersonIds: project.collaboratorPersonIds,
        };
      }
      return { ok: true as const, project: PROJECTS[i] ?? project };
    } catch (e) {
      return {
        ok: false as const,
        reason: e instanceof ApiError ? e.message : 'API collaborator failed',
      };
    }
  }
  const project = missionService.addProjectCollaboratorPerson(
    projectId,
    personId,
  );
  return project
    ? { ok: true as const, project }
    : { ok: false as const, reason: 'Project not found' };
}
