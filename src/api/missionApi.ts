import { apiFetch, isApiEnabled } from './index';
import type {
  ChurchEvent,
  ChurchProject,
  MissionVisibility,
  Program,
  SystemId,
  WorkTask,
} from '../domain/types';

export type ApiProgram = {
  id: string;
  name: string;
  description: string;
  ownerSystemId: string;
  visibility: string;
  status: string;
  programType?: string | null;
  scheduleHint?: string | null;
  createdByPersonId?: string | null;
};

export type ApiEvent = {
  id: string;
  name: string;
  type: string;
  description?: string | null;
  ownerSystemId: string;
  visibility: string;
  startsAt: string;
  endsAt?: string | null;
  location?: string | null;
  status: string;
  lifecyclePhase?: string | null;
};

export type ApiTask = {
  id: string;
  title: string;
  description?: string | null;
  ownerPersonId: string;
  systemId?: string | null;
  visibility: string;
  status: string;
  dueDate?: string | null;
  startDate: string;
  grantsSystemAccess: boolean;
  contextType: string;
  contextLabel?: string | null;
};

export type ApiProject = {
  id: string;
  name: string;
  description: string;
  ownerSystemId: string;
  visibility: string;
  status: string;
  willSpend: boolean;
  fundId?: string | null;
};

function mapVisibility(v: string): MissionVisibility {
  if (v === 'GENERAL' || v === 'CHURCH') return 'CHURCH';
  if (v === 'SELECTED' || v === 'SELECTIVE') return 'SELECTIVE';
  return 'MINISTRY_PRIVATE';
}

function toApiVisibility(v: MissionVisibility): string {
  if (v === 'CHURCH') return 'GENERAL';
  if (v === 'SELECTIVE') return 'SELECTED';
  return 'MINISTRY';
}

export function mapApiProgram(p: ApiProgram): Program {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    ownerSystemId: p.ownerSystemId as SystemId,
    visibility: mapVisibility(p.visibility),
    status: (p.status as Program['status']) || 'DRAFT',
    programType: (p.programType as Program['programType']) || undefined,
    scheduleHint: p.scheduleHint ?? undefined,
    createdByPersonId: p.createdByPersonId ?? undefined,
  };
}

export function mapApiEvent(e: ApiEvent): ChurchEvent {
  return {
    id: e.id,
    name: e.name,
    type: (e.type as ChurchEvent['type']) || 'OTHER',
    description: e.description ?? undefined,
    ownerSystemId: e.ownerSystemId as SystemId,
    visibility: mapVisibility(e.visibility),
    startsAt: e.startsAt,
    endsAt: e.endsAt ?? undefined,
    location: e.location ?? undefined,
    status: (e.status as ChurchEvent['status']) || 'DRAFT',
    lifecyclePhase: (e.lifecyclePhase as ChurchEvent['lifecyclePhase']) || 'PREPARE',
  };
}

export function mapApiTask(t: ApiTask): WorkTask {
  return {
    id: t.id,
    title: t.title,
    description: t.description ?? undefined,
    ownerPersonId: t.ownerPersonId,
    systemId: (t.systemId as SystemId) || undefined,
    visibility: mapVisibility(t.visibility),
    status: (t.status as WorkTask['status']) || 'TODO',
    dueDate: t.dueDate ? t.dueDate.slice(0, 10) : undefined,
    startDate: t.startDate.slice(0, 10),
    grantsSystemAccess: t.grantsSystemAccess,
    contextType: (t.contextType as WorkTask['contextType']) || 'GENERAL',
    contextLabel: t.contextLabel ?? undefined,
  };
}

export function mapApiProject(p: ApiProject): ChurchProject {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    ownerSystemId: p.ownerSystemId as SystemId,
    visibility: mapVisibility(p.visibility),
    status: (p.status as ChurchProject['status']) || 'DRAFT',
    willSpend: p.willSpend,
    fundId: p.fundId ?? undefined,
  };
}

export async function apiListPrograms(ownerSystemId?: string): Promise<Program[]> {
  const q = ownerSystemId
    ? `?ownerSystemId=${encodeURIComponent(ownerSystemId)}`
    : '';
  const res = await apiFetch<{ programs: ApiProgram[] }>(
    `/api/mission/programs${q}`,
  );
  return res.programs.map(mapApiProgram);
}

export async function apiListEvents(ownerSystemId?: string): Promise<ChurchEvent[]> {
  const q = ownerSystemId
    ? `?ownerSystemId=${encodeURIComponent(ownerSystemId)}`
    : '';
  const res = await apiFetch<{ events: ApiEvent[] }>(`/api/mission/events${q}`);
  return res.events.map(mapApiEvent);
}

export async function apiListTasks(systemId?: string): Promise<WorkTask[]> {
  const q = systemId ? `?systemId=${encodeURIComponent(systemId)}` : '';
  const res = await apiFetch<{ tasks: ApiTask[] }>(`/api/mission/tasks${q}`);
  return res.tasks.map(mapApiTask);
}

export async function apiListProjects(
  ownerSystemId?: string,
): Promise<ChurchProject[]> {
  const q = ownerSystemId
    ? `?ownerSystemId=${encodeURIComponent(ownerSystemId)}`
    : '';
  const res = await apiFetch<{ projects: ApiProject[] }>(
    `/api/mission/projects${q}`,
  );
  return res.projects.map(mapApiProject);
}

export async function apiCreateProgram(input: {
  name: string;
  description?: string;
  ownerSystemId: string;
  visibility?: MissionVisibility;
  status?: string;
  programType?: string;
  scheduleHint?: string;
}): Promise<Program> {
  const res = await apiFetch<{ program: ApiProgram }>('/api/mission/programs', {
    method: 'POST',
    body: {
      name: input.name,
      description: input.description,
      ownerSystemId: input.ownerSystemId,
      visibility: input.visibility
        ? toApiVisibility(input.visibility)
        : 'MINISTRY',
      status: input.status,
      programType: input.programType,
      scheduleHint: input.scheduleHint,
    },
  });
  return mapApiProgram(res.program);
}

/** Prefer API when enabled; otherwise null so callers use seed. */
export async function loadProgramsPreferApi(
  ownerSystemId?: string,
): Promise<Program[] | null> {
  if (!isApiEnabled()) return null;
  try {
    return await apiListPrograms(ownerSystemId);
  } catch {
    return null;
  }
}

export async function loadEventsPreferApi(
  ownerSystemId?: string,
): Promise<ChurchEvent[] | null> {
  if (!isApiEnabled()) return null;
  try {
    return await apiListEvents(ownerSystemId);
  } catch {
    return null;
  }
}

export async function loadTasksPreferApi(
  systemId?: string,
): Promise<WorkTask[] | null> {
  if (!isApiEnabled()) return null;
  try {
    return await apiListTasks(systemId);
  } catch {
    return null;
  }
}

export async function loadProjectsPreferApi(
  ownerSystemId?: string,
): Promise<ChurchProject[] | null> {
  if (!isApiEnabled()) return null;
  try {
    return await apiListProjects(ownerSystemId);
  } catch {
    return null;
  }
}
