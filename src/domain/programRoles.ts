import type { ProgramType } from './types';

/** Permissions that apply inside an open program (not system office). */
export type ProgramRolePermission =
  | 'VIEW_ROSTER'
  | 'MANAGE_SESSIONS'
  | 'MANAGE_ENROLL'
  | 'MANAGE_ROLES'
  | 'CLOSE_PROGRAM'
  | 'PARTICIPATE';

export interface ProgramRoleDef {
  key: string;
  label: string;
  permissions: ProgramRolePermission[];
  /** Staff roles bypass audience eligibility. */
  isStaff?: boolean;
}

const FACILITATOR: ProgramRoleDef = {
  key: 'FACILITATOR',
  label: 'Facilitator',
  isStaff: true,
  permissions: [
    'VIEW_ROSTER',
    'MANAGE_SESSIONS',
    'MANAGE_ENROLL',
    'MANAGE_ROLES',
    'CLOSE_PROGRAM',
    'PARTICIPATE',
  ],
};

const ASSISTANT: ProgramRoleDef = {
  key: 'ASSISTANT',
  label: 'Assistant',
  isStaff: true,
  permissions: ['VIEW_ROSTER', 'MANAGE_SESSIONS', 'MANAGE_ENROLL', 'PARTICIPATE'],
};

const PARTICIPANT: ProgramRoleDef = {
  key: 'PARTICIPANT',
  label: 'Participant',
  permissions: ['PARTICIPATE'],
};

/** Category template → default roles when creating a program. */
export function rolesFromProgramType(type?: ProgramType): ProgramRoleDef[] {
  switch (type) {
    case 'CLASS':
    case 'DISCIPLESHIP':
      return [
        FACILITATOR,
        ASSISTANT,
        { ...PARTICIPANT, label: 'Learner' },
      ];
    case 'SMALL_GROUP':
      return [
        { ...FACILITATOR, key: 'LEADER', label: 'Group leader' },
        PARTICIPANT,
      ];
    case 'FELLOWSHIP':
      return [
        { ...FACILITATOR, key: 'COORDINATOR', label: 'Coordinator' },
        PARTICIPANT,
      ];
    case 'SERVING_TEAM':
      return [
        FACILITATOR,
        { ...ASSISTANT, key: 'TEAM_LEAD', label: 'Team lead' },
        PARTICIPANT,
      ];
    default:
      return [FACILITATOR, PARTICIPANT];
  }
}

export function roleHasPermission(
  role: ProgramRoleDef | undefined,
  permission: ProgramRolePermission,
): boolean {
  return !!role?.permissions.includes(permission);
}

export function findRole(
  roles: ProgramRoleDef[] | undefined,
  key: string,
): ProgramRoleDef | undefined {
  return roles?.find((r) => r.key === key);
}

/** Map legacy LEADER/PARTICIPANT enrollment to role key. */
export function legacyRoleKey(
  role: 'LEADER' | 'PARTICIPANT',
  roles: ProgramRoleDef[] | undefined,
): string {
  if (role === 'LEADER') {
    return (
      roles?.find((r) => r.isStaff)?.key ??
      roles?.[0]?.key ??
      'FACILITATOR'
    );
  }
  return (
    roles?.find((r) => !r.isStaff)?.key ??
    roles?.find((r) => r.key === 'PARTICIPANT')?.key ??
    'PARTICIPANT'
  );
}
