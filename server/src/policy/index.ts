export {
  authorizePerson,
  grantsForPerson,
  grantsForPersonInSystem,
  authorize,
  buildEffectiveAccess,
  grantsForSystem,
} from './evaluate.js';
export type { AuthzDecision, PermissionGrant } from './types.js';
export { loadPolicyContext } from './loadContext.js';
