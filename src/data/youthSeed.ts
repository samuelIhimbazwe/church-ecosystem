import type {
  YouthGroup,
  YouthGroupMember,
  YouthMeeting,
} from '../domain/types';

/**
 * Youth groups / group meetings — DEFERRED.
 * ADEPR Kacyiru Youth does not run standing groups today.
 * Regular ops = Programs + Activities + Events (Mission kit),
 * with future audience filters (age, role, church membership).
 * Keep types + empty collections for a later optional feature.
 */
export const YOUTH_GROUPS: YouthGroup[] = [];

export const YOUTH_MEMBERS: YouthGroupMember[] = [];

export const YOUTH_MEETINGS: YouthMeeting[] = [];
