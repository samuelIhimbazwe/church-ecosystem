import type {
  ContributionGoalScope as ContributionGoalScopeImport,
  MinistryAsset,
  MinistryBudget,
  MinistryBudgetLine,
  MinistryCampaignGift,
  MinistryContribution,
  MinistryContributionDrive,
  MinistryContributionGoal,
  MinistryContributionStatus,
  MinistryContributionType,
  MinistryDonation,
  MinistryExpenseRecord,
  MinistryExpenseStatus,
  MinistryFollowUp,
  MinistryFundraisingCampaign,
  MinistryIncomeRecord,
  MinistryLiability,
  MinistryPaymentMethod,
  MinistryPaymentMethodConfig,
  MinistrySponsor,
  MinistrySponsorship,
} from './ministryFinanceKit';

/** Canonical human identity — one Person across every system. */
export interface Person {
  id: string;
  fullName: string;
  preferredName?: string;
  phone?: string;
  email?: string;
  dateOfBirth?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  address?: string;
  nationalId?: string;
  /** Date joined this local church. */
  joinedChurchOn?: string;
  pastoralNotes?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'VISITOR';
  createdAt: string;
}

/** Household / kinship links (Main Church pastoral record — not Choir "families"). */
export type FamilyRelation =
  | 'SPOUSE'
  | 'CHILD'
  | 'PARENT'
  | 'SIBLING'
  | 'GUARDIAN'
  | 'OTHER';

export interface PersonFamilyLink {
  id: string;
  personId: string;
  relatedPersonId: string;
  relation: FamilyRelation;
  notes?: string;
}

export interface PersonBaptismRecord {
  personId: string;
  baptizedOn: string;
  place?: string;
  mode?: 'IMMERSION' | 'POURING' | 'OTHER';
  ministerName?: string;
  certificateRef?: string;
  notes?: string;
}

export interface PersonMarriageRecord {
  personId: string;
  spousePersonId?: string;
  spouseName?: string;
  marriedOn: string;
  place?: string;
  status: 'MARRIED' | 'WIDOWED' | 'DIVORCED' | 'SEPARATED';
  certificateRef?: string;
  notes?: string;
}

export interface PersonTimelineEvent {
  id: string;
  personId: string;
  at: string;
  kind:
    | 'MEMBERSHIP'
    | 'BAPTISM'
    | 'MARRIAGE'
    | 'MINISTRY'
    | 'DISCIPLINE'
    | 'NOTE'
    | 'OTHER';
  title: string;
  detail?: string;
}

export interface PersonDocumentMeta {
  id: string;
  personId: string;
  label: string;
  kind: 'CERTIFICATE' | 'ID' | 'LETTER' | 'OTHER';
  issuedOn?: string;
  note?: string;
}

/**
 * Login credentials ↔ exactly one Person (SSO across systems).
 * System access is derived from participation — not stored on the account.
 */
export interface UserAccount {
  id: string;
  personId: string;
  username: string;
  /** Demo-only plaintext; replace with hashed credentials in production. */
  password: string;
}

export type SystemRole =
  | 'CHURCH_LEADER'
  | 'ASSISTANT_PASTOR'
  | 'CHURCH_SECRETARY'
  | 'CHURCH_TREASURER'
  | 'CHOIR_LEADER'
  | 'WORSHIP_LEADER'
  | 'YOUTH_LEADER'
  | 'PROTOCOL_LEADER'
  | 'DEACON_LEADER'
  | 'LIMITED_STAFF';

/** Stage-1 coarse scopes; Phase 2 will be per-system + resource. */
export type AccessScope =
  | 'FULL'
  | 'FINANCE'
  | 'CHOIR'
  | 'WORSHIP'
  | 'YOUTH'
  | 'PROTOCOL'
  | 'DEACON'
  | 'LIMITED';

export type SystemId =
  | 'sys-main'
  | 'sys-choir'
  | 'sys-worship'
  | 'sys-music'
  | 'sys-youth'
  | 'sys-protocol'
  | 'sys-deacon'
  | 'sys-media'
  | 'sys-men'
  | 'sys-women'
  | 'sys-couples'
  | 'sys-children'
  | 'sys-elderly'
  | 'sys-evangelism'
  | 'sys-intercessors'
  | 'sys-finance';

export type SystemCode =
  | 'MAIN_CHURCH'
  | 'CHOIR'
  | 'WORSHIP'
  | 'MUSIC'
  | 'YOUTH'
  | 'PROTOCOL'
  | 'DEACON'
  | 'MEDIA'
  | 'MEN'
  | 'WOMEN'
  | 'COUPLES'
  | 'CHILDREN'
  | 'ELDERLY'
  | 'EVANGELISM'
  | 'INTERCESSORS'
  | 'FINANCE';

export type SystemKind = 'MAIN' | 'MINISTRY' | 'OFFICE' | 'SHARED';

export type SystemStatus = 'ACTIVE' | 'PLANNED';

/**
 * Deployable peer application in the ecosystem.
 * Ministries are Systems — not nav modules inside Main Church.
 */
export interface ChurchSystem {
  id: SystemId;
  code: SystemCode;
  name: string;
  shortName: string;
  kind: SystemKind;
  status: SystemStatus;
  description: string;
  /** In-app path for this prototype (same origin). */
  basePath: string;
  /**
   * Future separate deploy URL, e.g. https://choir.adepr-kacyiru.rw
   * When set, SSO handoff redirects here instead of in-app navigation.
   */
  externalUrl?: string;
  /** OrgUnit that owns / maps to this system (ministry ↔ system). */
  orgUnitId?: string;
}

export type OrgUnitType =
  | 'MINISTRY'
  | 'TEAM'
  | 'ORGANISATION'
  | 'OFFICE'
  | 'COMMITTEE';

export interface OrgUnit {
  id: string;
  name: string;
  type: OrgUnitType;
  parentId?: string;
  description?: string;
  /** When set, this unit has (or will have) its own peer System. */
  systemId?: SystemId;
  leaderPersonId?: string;
}

/** Standing belonging — Membership ≠ Position ≠ Assignment. */
export type MembershipType =
  | 'CHURCH_MEMBER'
  | 'CHOIR_MEMBER'
  | 'WORSHIP_MEMBER'
  | 'YOUTH_MEMBER'
  | 'PROTOCOL_MEMBER'
  | 'DEACON_MEMBER'
  | 'MEDIA_MEMBER'
  | 'MUSIC_MEMBER'
  | 'MEN_MEMBER'
  | 'WOMEN_MEMBER'
  | 'COUPLES_MEMBER'
  | 'CHILDREN_MEMBER'
  | 'ELDERLY_MEMBER'
  | 'EVANGELISM_MEMBER'
  | 'INTERCESSORS_MEMBER';

export type ParticipationStatus = 'ACTIVE' | 'ENDED' | 'SUSPENDED';

export interface Membership {
  id: string;
  personId: string;
  type: MembershipType;
  label: string;
  orgUnitId?: string;
  /** When set, active membership entitles entry to this system. */
  systemId?: SystemId;
  status: ParticipationStatus;
  startDate: string;
  endDate?: string;
}

/** Standing authority in an OrgUnit (leader, treasurer, secretary…). */
export interface Position {
  id: string;
  personId: string;
  title: string;
  orgUnitId: string;
  /** Maps to Stage-1 SystemRole for profile scope. */
  systemRole?: SystemRole;
  /**
   * Protocol office when this position is on the Protocol Team.
   * Drives Protocol-specific grants (Coordinator vs Treasurer vs Member…).
   */
  protocolOffice?: ProtocolOffice;
  /**
   * Choir CMS office when this position is on a named choir.
   * Drives Choir finance / leadership grants.
   */
  choirOffice?: ChoirOffice;
  /**
   * When choirOffice is ADVISOR — custom brief, e.g. "Spiritual leader".
   */
  choirAdvisorRole?: string;
  /**
   * Worship CMS office when this position is on the Worship team.
   * Drives Worship finance / leadership grants.
   */
  worshipOffice?: WorshipOffice;
  /**
   * Deacon team office when this position is on the Deacon team.
   */
  deaconOffice?: DeaconOffice;
  /**
   * Standing ministry board office (President / VP / Secretary / Treasurer).
   * Drives mission CRUD + publish rights across peer systems.
   */
  ministryOffice?: MissionLeaderOffice;
  /**
   * Governance positions (pastor, secretary) may open every system.
   * Otherwise access is limited to `systemId` when set.
   */
  grantsAllSystems?: boolean;
  systemId?: SystemId;
  status: ParticipationStatus;
  startDate: string;
  endDate?: string;
}

/** Temporary context role — program / project / event. */
export type AssignmentContextType = 'PROGRAM' | 'PROJECT' | 'EVENT';

export type AssignmentStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface Assignment {
  id: string;
  personId: string;
  title: string;
  contextType: AssignmentContextType;
  contextId: string;
  contextLabel: string;
  orgUnitId?: string;
  /** Temporary system entry while assignment is active. */
  systemId?: SystemId;
  status: AssignmentStatus;
  startDate: string;
  endDate?: string;
}

export type EntitlementSource =
  | 'GOVERNANCE'
  | 'MEMBERSHIP'
  | 'POSITION'
  | 'ASSIGNMENT'
  | 'TASK'
  | 'ACCOUNT';

export interface SystemEntitlement {
  systemId: SystemId;
  sources: EntitlementSource[];
  /** Human-readable reasons (for UI / audit). */
  reasons: string[];
}

/** Short-lived handoff between peer systems (same Account, no re-login). */
export interface SsoHandoffToken {
  id: string;
  accountId: string;
  fromSystemId: SystemId;
  toSystemId: SystemId;
  issuedAt: number;
  expiresAt: number;
}

export interface SessionState {
  accountId: string;
  /** Which system the user is currently inside. */
  currentSystemId: SystemId;
  /** How they entered this system. */
  entryMode: 'direct' | 'handoff' | 'main';
  /** Active named choir when inside sys-choir (multi-tenant isolation). */
  activeChoirOrgUnitId?: string;
}

/** Protected resource kinds in the ecosystem. */
export type Resource =
  | 'SYSTEM'
  | 'PERSON'
  | 'ORG_UNIT'
  | 'MEMBERSHIP'
  | 'POSITION'
  | 'ASSIGNMENT'
  | 'PROGRAM'
  | 'ACTIVITY'
  | 'EVENT'
  | 'TASK'
  | 'PROJECT'
  | 'FINANCE'
  | 'CHOIR_REPERTOIRE'
  | 'CHOIR_ROSTER'
  | 'CHOIR_FINANCE'
  | 'WORSHIP_REPERTOIRE'
  | 'WORSHIP_ROSTER'
  | 'WORSHIP_FINANCE'
  | 'YOUTH_GROUP'
  | 'PROTOCOL_ROSTER'
  | 'PROTOCOL_SCHEDULE'
  | 'DEACON_ROSTER'
  | 'DEACON_CARE'
  | 'DEACON_FINANCE'
  | 'MINISTRY_FINANCE'
  | 'AUDIT';

export type Action =
  | 'ENTER'
  | 'VIEW'
  | 'VIEW_FULL'
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'MANAGE'
  | 'LINK_ACCOUNT'
  | 'RECORD_ATTENDANCE'
  | 'APPROVE';

export type PermissionSource =
  | 'GOVERNANCE'
  | 'POSITION'
  | 'MEMBERSHIP'
  | 'ASSIGNMENT'
  | 'TASK'
  | 'FUND_GRANT'
  | 'ACCOUNT';

/** Church-visible vs org-private (no pastor bypass). */
export type ResourceSensitivity = 'CHURCH' | 'ORG_PRIVATE';

export const RESOURCE_SENSITIVITY: Record<Resource, ResourceSensitivity> = {
  SYSTEM: 'CHURCH',
  PERSON: 'CHURCH',
  ORG_UNIT: 'CHURCH',
  MEMBERSHIP: 'CHURCH',
  POSITION: 'CHURCH',
  ASSIGNMENT: 'CHURCH',
  PROGRAM: 'CHURCH',
  ACTIVITY: 'CHURCH',
  EVENT: 'CHURCH',
  TASK: 'CHURCH',
  PROJECT: 'CHURCH',
  FINANCE: 'ORG_PRIVATE',
  CHOIR_REPERTOIRE: 'CHURCH',
  CHOIR_ROSTER: 'CHURCH',
  CHOIR_FINANCE: 'CHURCH',
  WORSHIP_REPERTOIRE: 'CHURCH',
  WORSHIP_ROSTER: 'CHURCH',
  WORSHIP_FINANCE: 'CHURCH',
  YOUTH_GROUP: 'CHURCH',
  PROTOCOL_ROSTER: 'CHURCH',
  PROTOCOL_SCHEDULE: 'CHURCH',
  DEACON_ROSTER: 'CHURCH',
  DEACON_CARE: 'CHURCH',
  DEACON_FINANCE: 'CHURCH',
  MINISTRY_FINANCE: 'CHURCH',
  AUDIT: 'CHURCH',
};

/** A concrete right held right now in a system (optionally fund-scoped). */
export interface PermissionGrant {
  systemId: SystemId;
  resource: Resource;
  action: Action;
  source: PermissionSource;
  reason: string;
  /** When set, grant applies only to this fund vault (ORG_PRIVATE finance). */
  fundId?: string;
}

export interface AuthzRequest {
  personId: string;
  systemId: SystemId;
  resource: Resource;
  action: Action;
  now?: Date;
  fundId?: string;
}

export interface AuthzDecision {
  allowed: boolean;
  personId: string;
  systemId: SystemId;
  resource: Resource;
  action: Action;
  fundId?: string;
  matchedGrant?: PermissionGrant;
  reason: string;
  evaluatedAt: string;
}

export interface AuditEntry {
  id: string;
  at: string;
  personId: string;
  systemId: SystemId;
  resource: Resource;
  action: Action;
  allowed: boolean;
  reason: string;
  entryMode?: SessionState['entryMode'];
  fundId?: string;
}

export type ProgramStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'SETUP'
  | 'ACTIVE'
  | 'PAUSED'
  | 'CLOSING'
  | 'ENDED';

export type ProgramType =
  | 'CLASS'
  | 'SMALL_GROUP'
  | 'FELLOWSHIP'
  | 'SERVING_TEAM'
  | 'DISCIPLESHIP'
  | 'OTHER';

/**
 * Dual mission scope (locked product rule):
 * - CHURCH — general church / published; Main + every system’s general lane
 * - MINISTRY_PRIVATE — default; owning ministry (leaders + members with ENTER)
 * - SELECTIVE — only listed people via MissionShareGrant (+ mission leaders)
 */
export type MissionVisibility = 'CHURCH' | 'MINISTRY_PRIVATE' | 'SELECTIVE';

/** Offices that may CRUD mission items and publish to church. */
export type MissionLeaderOffice =
  | 'PRESIDENT'
  | 'VP'
  | 'SECRETARY'
  | 'TREASURER';

export type MissionResourceKind = 'PROGRAM' | 'EVENT' | 'TASK' | 'PROJECT';

/**
 * Selective share — person may VIEW or MANAGE a specific mission item
 * outside (or inside) the default ministry audience.
 */
export interface MissionShareGrant {
  id: string;
  kind: MissionResourceKind;
  resourceId: string;
  personId: string;
  action: 'VIEW' | 'MANAGE';
  grantedByPersonId: string;
  reason?: string;
  status: 'ACTIVE' | 'REVOKED';
  startDate: string;
  endDate?: string;
}

/** Recurring ministry / discipleship program (standing or cohort intake). */
export interface Program {
  id: string;
  name: string;
  description: string;
  orgUnitId?: string;
  /** Owning peer system (Main or ministry). */
  ownerSystemId: SystemId;
  /** General church vs owning-system private. */
  visibility: MissionVisibility;
  status: ProgramStatus;
  programType?: ProgramType;
  scheduleHint?: string;
  /** Standing program this cohort belongs to (omit for standing). */
  parentProgramId?: string;
  /** Season label e.g. "2026 Q3". */
  cohortLabel?: string;
  createdByPersonId?: string;
  approvedByPersonId?: string;
  approvedAt?: string;
  /** Recommended facilitators / leaders. */
  leaderPersonIds?: string[];
  /**
   * Roles active inside this open program (template + custom).
   * Permissions follow these — not system office.
   */
  roles?: import('./programRoles').ProgramRoleDef[];
  /** Eligibility within audience pool (age, married, invite-only…). */
  eligibility?: import('./audiencePool').ProgramEligibility;
  /** P0/P2 stewardship: money card + delivery + close-out + ops. */
  plannedCost?: number;
  budgetLines?: import('./stewardship').MissionBudgetLine[];
  fundingPlan?: import('./stewardship').MissionFundingSource[];
  usedCost?: number;
  deliveryItems?: import('./stewardship').MissionDeliveryItem[];
  closeout?: import('./stewardship').MissionCloseout;
  advances?: import('./stewardship').MissionAdvance[];
  inKind?: import('./stewardship').MissionInKind[];
  envelopePeriod?: string;
  phaseRenewals?: import('./stewardship').MissionPhaseRenewal[];
}

export type ProgramEnrollmentStatus =
  | 'ACTIVE'
  | 'COMPLETED'
  | 'WITHDRAWN'
  | 'ENDED';

export type ProgramEnrollmentRole = 'LEADER' | 'PARTICIPANT';

/** Person on a program / cohort roster. */
export interface ProgramEnrollment {
  id: string;
  programId: string;
  personId: string;
  /** Legacy coarse role — kept for older UI. */
  role: ProgramEnrollmentRole;
  /** Program role key (FACILITATOR, PARTICIPANT, custom…). */
  roleKey?: string;
  status: ProgramEnrollmentStatus;
  enrolledOn: string;
  endedOn?: string;
  completedOn?: string;
}

/** One session / occurrence of a Program. */
export interface Activity {
  id: string;
  programId: string;
  title: string;
  startsAt: string;
  endsAt?: string;
  location?: string;
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

export interface Attendance {
  id: string;
  activityId: string;
  personId: string;
  status: AttendanceStatus;
  recordedAt: string;
}

export type ChurchEventType =
  | 'CONFERENCE'
  | 'BAPTISM'
  | 'WEDDING'
  | 'CONCERT'
  | 'RETREAT'
  | 'SEMINAR'
  | 'SPECIAL_SERVICE'
  | 'CAMPAIGN'
  | 'OTHER';

export type ChurchEventStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'PLANNED'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED';

/** Chosen at create — locked research rule. */
export type EventRegistrationMode =
  | 'ANNOUNCEMENT_ONLY'
  | 'REGISTRATION_REQUIRED';

export type EventApprovalLevelKind = 'OWNER' | 'PARENT' | 'CHURCH';

export interface EventApprovalRecord {
  levelKey: string;
  kind: EventApprovalLevelKind;
  label: string;
  systemId?: SystemId;
  personId: string;
  approvedAt: string;
}

export type EventLifecyclePhase = 'PREPARE' | 'DELIVER' | 'CLOSE';

export interface ChurchEvent {
  id: string;
  name: string;
  type: ChurchEventType;
  description?: string;
  orgUnitId?: string;
  ownerSystemId: SystemId;
  visibility: MissionVisibility;
  startsAt: string;
  endsAt?: string;
  location?: string;
  status: ChurchEventStatus;
  /** Always set on create (defaults for legacy rows). */
  registrationMode?: EventRegistrationMode;
  capacity?: number;
  /**
   * When true, every upper level in the org chain must approve before CONFIRMED
   * (e.g. Choir concert → Music → Church). Rehearsal/meeting: false.
   */
  beyondOwnerScope?: boolean;
  approvals?: EventApprovalRecord[];
  createdByPersonId?: string;
  /** Recurring dated series (not Program Activities). */
  seriesId?: string;
  seriesLabel?: string;
  /** Optional link to a Program (special occasion for that program). */
  programId?: string;
  /** Optional link to a Project / season (dress rehearsal, workshop…). */
  projectId?: string;
  /** Peer systems collaborating on this event. */
  collaboratorSystemIds?: SystemId[];
  /** People collaborating outside owner roster. */
  collaboratorPersonIds?: string[];
  /** Prepare → deliver → close operating phase. */
  lifecyclePhase?: EventLifecyclePhase;
}

export type EventRegistrationStatus =
  | 'REGISTERED'
  | 'WAITLIST'
  | 'CANCELLED'
  | 'ATTENDED'
  | 'NO_SHOW';

export interface EventRegistration {
  id: string;
  eventId: string;
  personId: string;
  status: EventRegistrationStatus;
  registeredOn: string;
  attendedAt?: string;
}

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';

export type TaskContextType = 'PROGRAM' | 'EVENT' | 'PROJECT' | 'NONE';

/**
 * Atomic work item. When active with systemId + grantsSystemAccess,
 * it can grant temporary SYSTEM ENTER (like an Assignment).
 * Primary assignee + optional helpers are both Responsible.
 * On DONE/CANCELLED, grantsSystemAccess is cleared (Option A — record only).
 */
export interface WorkTask {
  id: string;
  title: string;
  description?: string;
  /** Primary Responsible (required). */
  ownerPersonId: string;
  /** Additional Responsible helpers (optional). */
  helperPersonIds?: string[];
  createdByPersonId?: string;
  contextType: TaskContextType;
  contextId?: string;
  contextLabel?: string;
  systemId?: SystemId;
  /** When true, active task entitles entry to systemId (owner + helpers). */
  grantsSystemAccess?: boolean;
  /** Set when access was cleared on DONE/CANCEL. */
  accessRevokedAt?: string;
  /** Defaults to CHURCH when omitted in older rows — always set in seed. */
  visibility: MissionVisibility;
  status: TaskStatus;
  dueDate?: string;
  startDate: string;
  endDate?: string;
  /** Optional close note (Option A — no guided next steps). */
  outcomeNote?: string;
}

/**
 * Finite initiative that can own many Tasks.
 * Scope approval like Events; optional fund when willSpend; shared collaborators.
 */
export type ChurchProjectStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'PLANNED'
  | 'ACTIVE'
  | 'PAUSED'
  | 'CLOSING'
  | 'DONE'
  | 'CANCELLED';

export interface ChurchProject {
  id: string;
  name: string;
  description?: string;
  ownerSystemId: SystemId;
  orgUnitId?: string;
  visibility: MissionVisibility;
  status: ChurchProjectStatus;
  startDate?: string;
  endDate?: string;
  /** Parent programme (ongoing container) when this is a season/cohort. */
  programId?: string;
  /** Recommended lead (not required). */
  leadPersonId?: string;
  /** Peer systems collaborating on one shared project. */
  collaboratorSystemIds?: SystemId[];
  collaboratorPersonIds?: string[];
  /**
   * When true, every upper level in the org chain must approve before ACTIVE
   * (same rule as Events).
   */
  beyondOwnerScope?: boolean;
  approvals?: EventApprovalRecord[];
  /** M1+M3+M4: optional unless willSpend. */
  willSpend?: boolean;
  fundId?: string;
  createdByPersonId?: string;
  /** Option A close note. */
  outcomeNote?: string;
  /** P0/P2 stewardship: money card + delivery + close-out + ops. */
  plannedCost?: number;
  budgetLines?: import('./stewardship').MissionBudgetLine[];
  fundingPlan?: import('./stewardship').MissionFundingSource[];
  usedCost?: number;
  deliveryItems?: import('./stewardship').MissionDeliveryItem[];
  closeout?: import('./stewardship').MissionCloseout;
  advances?: import('./stewardship').MissionAdvance[];
  inKind?: import('./stewardship').MissionInKind[];
  envelopePeriod?: string;
  phaseRenewals?: import('./stewardship').MissionPhaseRenewal[];
}

/* ─── Choir System domain (peer app data; Person IDs shared) ─── */

/**
 * Standing office inside a named choir.
 * Administrative: President, VP, Treasurer, Secretary.
 * Operations: Music Director, Coordinator (head of all families), Advisor (custom slot).
 * Structural: Family Leader, Member.
 */
export type ChoirOffice =
  | 'PRESIDENT'
  | 'VP'
  | 'TREASURER'
  | 'SECRETARY'
  | 'MUSIC_DIRECTOR'
  | 'COORDINATOR'
  | 'ADVISOR'
  | 'FAMILY_LEADER'
  | 'MEMBER';

export type ChoirVoiceSection = 'SOPRANO' | 'ALTO' | 'TENOR' | 'BASS';

export interface ChoirSong {
  id: string;
  orgUnitId: string;
  title: string;
  composer?: string;
  language?: string;
  status: 'LEARNING' | 'READY' | 'ARCHIVED';
  notes?: string;
}

export interface ChoirSectionSeat {
  id: string;
  orgUnitId: string;
  personId: string;
  section: ChoirVoiceSection;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface ChoirRehearsal {
  id: string;
  orgUnitId: string;
  title: string;
  startsAt: string;
  endsAt?: string;
  location?: string;
  songIds: string[];
  notes?: string;
}

export type ChoirDutyRole =
  | 'CONDUCTOR'
  | 'SOLOIST'
  | 'SECTION_LEAD'
  | 'USHER'
  | 'SOUND';

export interface ChoirDutySlot {
  id: string;
  orgUnitId: string;
  label: string;
  /** Linked church event when applicable. */
  eventId?: string;
  serviceDate: string;
  role: ChoirDutyRole;
  personId: string;
  status: 'ASSIGNED' | 'CONFIRMED' | 'DONE';
}

/**
 * Choir "family" = internal team/squad (not household relatives).
 */
export interface ChoirTeam {
  id: string;
  orgUnitId: string;
  name: string;
  code: string;
  leaderPersonId?: string;
  viceLeaderPersonId?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface ChoirTeamMember {
  id: string;
  teamId: string;
  personId: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface ChoirRosterMember {
  id: string;
  orgUnitId: string;
  personId: string;
  office: ChoirOffice;
  /** When office is ADVISOR — e.g. "Spiritual leader", "Social & outreach". */
  advisorRole?: string;
  teamId?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

/** Choir finance types = shared ministry finance kit (see ministryFinanceKit.ts). */
export type ContributionGoalScope = ContributionGoalScopeImport;
export type ChoirPaymentMethod = MinistryPaymentMethod;
export type ChoirContributionType = MinistryContributionType;
export type ChoirPaymentMethodConfig = MinistryPaymentMethodConfig;
export type ChoirContributionStatus = MinistryContributionStatus;
export type ChoirContribution = MinistryContribution;
export type ChoirFollowUp = MinistryFollowUp;
export type ChoirDonation = MinistryDonation;
export type ChoirSponsor = MinistrySponsor;
export type ChoirSponsorship = MinistrySponsorship;
export type ChoirFundraisingCampaign = MinistryFundraisingCampaign;
export type ChoirCampaignGift = MinistryCampaignGift;
export type ChoirBudget = MinistryBudget;
export type ChoirBudgetLine = MinistryBudgetLine;
export type ChoirIncomeRecord = MinistryIncomeRecord;
export type ChoirExpenseStatus = MinistryExpenseStatus;
export type ChoirExpenseRecord = MinistryExpenseRecord;
export type ChoirAsset = MinistryAsset;
export type ChoirLiability = MinistryLiability;
export type ChoirContributionDrive = MinistryContributionDrive;
export type ChoirContributionGoal = MinistryContributionGoal;

/* ─── Worship System domain (peer of Choir under Music) ─── */

/** Worship keeps its own office set (not the choir admin/ops model). */
export type WorshipOffice =
  | 'ADMIN'
  | 'PRESIDENT'
  | 'VP'
  | 'SECRETARY'
  | 'TREASURER'
  | 'COORDINATOR'
  | 'MUSIC_DIRECTOR'
  | 'FAMILY_LEADER'
  | 'FAMILY_VICE'
  | 'MEMBER';
export type WorshipVoiceSection = ChoirVoiceSection;
export type WorshipSong = ChoirSong;
export type WorshipSectionSeat = ChoirSectionSeat;
export type WorshipRehearsal = ChoirRehearsal;
export type WorshipDutyRole = ChoirDutyRole;
export type WorshipDutySlot = ChoirDutySlot;
export type WorshipTeam = ChoirTeam;
export type WorshipTeamMember = ChoirTeamMember;
export type WorshipRosterMember = ChoirRosterMember;
export type WorshipPaymentMethod = ChoirPaymentMethod;
export type WorshipContributionType = ChoirContributionType;
export type WorshipPaymentMethodConfig = ChoirPaymentMethodConfig;
export type WorshipContributionStatus = ChoirContributionStatus;
export type WorshipContribution = ChoirContribution;
export type WorshipFollowUp = ChoirFollowUp;
export type WorshipDonation = ChoirDonation;
export type WorshipSponsor = ChoirSponsor;
export type WorshipSponsorship = ChoirSponsorship;
export type WorshipFundraisingCampaign = ChoirFundraisingCampaign;
export type WorshipCampaignGift = ChoirCampaignGift;
export type WorshipBudget = ChoirBudget;
export type WorshipBudgetLine = ChoirBudgetLine;
export type WorshipIncomeRecord = ChoirIncomeRecord;
export type WorshipExpenseStatus = ChoirExpenseStatus;
export type WorshipExpenseRecord = ChoirExpenseRecord;
export type WorshipAsset = ChoirAsset;
export type WorshipLiability = ChoirLiability;

/* ─── Deacon Team domain (care / benevolence peer) ─── */

export type DeaconOffice =
  | 'COORDINATOR'
  | 'PRESIDENT'
  | 'SECRETARY'
  | 'TREASURER'
  | 'MEMBER';

export type DeaconCaseStatus = 'OPEN' | 'IN_PROGRESS' | 'CLOSED';

export interface DeaconCareCase {
  id: string;
  title: string;
  personId?: string;
  householdNote?: string;
  status: DeaconCaseStatus;
  priority: 'LOW' | 'NORMAL' | 'HIGH';
  openedOn: string;
  assignedPersonId?: string;
  notes?: string;
}

export interface DeaconVisit {
  id: string;
  caseId?: string;
  personId?: string;
  visitedOn: string;
  visitorPersonId: string;
  location?: string;
  notes?: string;
}

export interface DeaconRosterMember {
  id: string;
  personId: string;
  office: DeaconOffice;
  status: 'ACTIVE' | 'INACTIVE';
}

export type DeaconPaymentMethod = 'CASH' | 'MOMO' | 'BANK';

export interface DeaconContribution {
  id: string;
  personId: string;
  amount: number;
  paymentMethod: DeaconPaymentMethod;
  occurredOn: string;
  status: 'PENDING' | 'CONFIRMED' | 'DECLINED';
  submittedAt: string;
  note?: string;
  verifiedAt?: string;
  verifiedByPersonId?: string;
  financeTxnId?: string;
}

export interface DeaconExpenseRecord {
  id: string;
  category: string;
  amount: number;
  occurredOn: string;
  description: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  caseId?: string;
  recordedByPersonId: string;
  approvedByPersonId?: string;
  financeTxnId?: string;
}

/* ─── Youth System domain ─── */

export interface YouthGroup {
  id: string;
  name: string;
  description: string;
  ageLabel?: string;
  mentorPersonIds: string[];
  status: 'ACTIVE' | 'PAUSED';
}

export type YouthMemberRole = 'MEMBER' | 'MENTOR' | 'LEADER';

export interface YouthGroupMember {
  id: string;
  groupId: string;
  personId: string;
  role: YouthMemberRole;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface YouthMeeting {
  id: string;
  groupId: string;
  title: string;
  topic?: string;
  startsAt: string;
  endsAt?: string;
  location?: string;
}

/* ─── Shared Finance (one system, isolated fund vaults) ─── */

export type FundKind = 'GENERAL' | 'MINISTRY' | 'EVENT' | 'PROJECT' | 'PROGRAM';

export interface FinanceFund {
  id: string;
  name: string;
  code: string;
  kind: FundKind;
  /** Owning org — privacy boundary. */
  orgUnitId: string;
  /** Related peer system when ministry-owned. */
  ownerSystemId?: SystemId;
  /** Optional event/program/project context. */
  contextType?: 'EVENT' | 'PROGRAM' | 'PROJECT';
  contextId?: string;
  currency: 'RWF';
  status: 'ACTIVE' | 'CLOSED';
  description?: string;
}

export type FundGrantAction = 'VIEW' | 'MANAGE' | 'APPROVE';

/**
 * Explicit org-issued access to a fund vault.
 * Pastor does NOT inherit these from CHURCH_LEADER.
 */
export interface FundAccessGrant {
  id: string;
  fundId: string;
  personId: string;
  action: FundGrantAction;
  grantedByPersonId: string;
  reason: string;
  status: 'ACTIVE' | 'REVOKED';
  startDate: string;
  endDate?: string;
}

export type FinanceTxnType = 'INCOME' | 'EXPENSE' | 'TRANSFER_IN' | 'TRANSFER_OUT';

/** Chart-of-accounts style category for church treasury reporting. */
export type FinanceCategory =
  | 'TITHE'
  | 'OFFERING'
  | 'GIVING'
  | 'UTILITIES'
  | 'SALARIES'
  | 'MISSIONS'
  | 'MAINTENANCE'
  | 'ADMIN'
  | 'OTHER_INCOME'
  | 'OTHER_EXPENSE';

export interface FinanceTransaction {
  id: string;
  fundId: string;
  type: FinanceTxnType;
  amount: number;
  description: string;
  occurredOn: string;
  recordedByPersonId: string;
  category?: FinanceCategory;
  /** Optional cross-fund transfer pair. */
  counterpartyFundId?: string;
  contextType?: 'EVENT' | 'PROGRAM' | 'PROJECT';
  contextId?: string;
}

/** Tithes / offerings / givings totals posted per worship service. */
export interface ServiceCollection {
  id: string;
  serviceDate: string;
  serviceLabel: string;
  titheAmount: number;
  offeringAmount: number;
  givingAmount: number;
  notes?: string;
  status: 'DRAFT' | 'POSTED';
  recordedByPersonId: string;
  postedAt?: string;
  txnIds: string[];
}

export interface BudgetLine {
  id: string;
  fiscalYear: number;
  /** Month 1–12 optional; omit for annual line. */
  month?: number;
  category: FinanceCategory;
  kind: 'INCOME' | 'EXPENSE';
  budgetedAmount: number;
  label: string;
  notes?: string;
}

export type BalanceSheetSection = 'ASSET' | 'LIABILITY' | 'EQUITY';

export interface BalanceSheetLine {
  id: string;
  asOfDate: string;
  section: BalanceSheetSection;
  label: string;
  amount: number;
  notes?: string;
  /** When true, amount is taken from live fund balance instead of stored amount. */
  linkedFundId?: string;
}

/* ─── Protocol Management System (PMS) ─── */

/** Standing office inside Protocol (not the shared SystemRole enum). */
export type ProtocolOffice =
  | 'PRESIDENT'
  | 'VP'
  | 'SECRETARY'
  | 'TREASURER'
  | 'COORDINATOR'
  | 'MEMBER';

/** Which service days this person may be scheduled for. */
export type ServeDayCapability = 'SUNDAY' | 'TUESDAY' | 'BOTH';

export interface ProtocolRosterMember {
  id: string;
  personId: string;
  office: ProtocolOffice;
  serveDays: ServeDayCapability;
  status: 'ACTIVE' | 'INACTIVE' | 'LEAVE';
  /** ISO dates this person must not be scheduled. */
  unavailableDates: string[];
  notes?: string;
}

export type ProtocolServiceKind = 'SS1' | 'SS2' | 'TUESDAY';

/** One service slot in a month calendar (SS1 / SS2 / Tuesday…). */
export interface ProtocolService {
  id: string;
  monthKey: string;
  date: string;
  kind: ProtocolServiceKind;
  label: string;
  targetTeamSize: number;
}

export type ProtocolMonthStatus = 'OPEN' | 'DRAFT' | 'REVIEW' | 'PUBLISHED';

export interface ProtocolMonthPlan {
  monthKey: string;
  status: ProtocolMonthStatus;
  version: number;
  generatedAt?: string;
  validationNotes: string[];
  submittedForReviewAt?: string;
  submittedByPersonId?: string;
  reviewedAt?: string;
  reviewedByPersonId?: string;
  publishedAt?: string;
  publishedByPersonId?: string;
}

export interface ProtocolTeamSlot {
  id: string;
  serviceId: string;
  personId: string;
  source: 'ENGINE' | 'MANUAL';
}

/** Immutable snapshot after publish (history / archive). */
export interface ProtocolScheduleVersion {
  id: string;
  monthKey: string;
  version: number;
  publishedAt: string;
  publishedByPersonId: string;
  slots: ProtocolTeamSlot[];
  validationNotes: string[];
}

export type ProtocolAttendanceStatus =
  | 'PRESENT'
  | 'ABSENT'
  | 'LATE'
  | 'EXCUSED';

export interface ProtocolAttendanceRecord {
  id: string;
  serviceId: string;
  personId: string;
  status: ProtocolAttendanceStatus;
  recordedByPersonId: string;
  recordedAt: string;
  notes?: string;
}

export type ProtocolPaymentMethod = 'CASH' | 'MOMO' | 'BANK';
export type ProtocolContributionType =
  | 'MONTHLY'
  | 'SPECIAL'
  | 'EVENT'
  | 'OTHER';
export type ProtocolContributionStatus =
  | 'PENDING'
  | 'VERIFIED'
  | 'REJECTED';

/** Member contribution submitted in Protocol; verified → shared Finance ledger. */
export interface ProtocolContribution {
  id: string;
  personId: string;
  amount: number;
  contributionType: ProtocolContributionType;
  paymentMethod: ProtocolPaymentMethod;
  status: ProtocolContributionStatus;
  submittedAt: string;
  note?: string;
  verifiedAt?: string;
  verifiedByPersonId?: string;
  /** Set when verified — links to FinanceTransaction on fund-protocol. */
  financeTxnId?: string;
  rejectionReason?: string;
}

export type ProtocolNotificationKind =
  | 'TEAMS_BUILT'
  | 'SUBMITTED_REVIEW'
  | 'SCHEDULE_PUBLISHED'
  | 'CONTRIBUTION_SUBMITTED'
  | 'CONTRIBUTION_VERIFIED'
  | 'GENERAL';

export interface ProtocolNotification {
  id: string;
  personId: string;
  kind: ProtocolNotificationKind;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  href?: string;
}

export interface ProtocolActivityEvent {
  id: string;
  at: string;
  actorPersonId: string;
  kind: ProtocolNotificationKind | 'ATTENDANCE' | 'EXPORT';
  summary: string;
}

export interface ProtocolSchedulingRules {
  /** Prefer filling duty load toward this count first. */
  preferTarget: number;
  softMax: number;
  hardMax: number;
  defaultTeamSize: number;
  avoidChoirConflicts: boolean;
}
