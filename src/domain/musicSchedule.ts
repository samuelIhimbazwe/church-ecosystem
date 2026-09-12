/**
 * Music ministry — choir & worship service scheduling.
 * Units map to choir org units + worship team.
 */

export type MusicServiceKind =
  | 'SS1'
  | 'SS2'
  | 'TUESDAY'
  | 'FRIDAY'
  | 'IGABURO';

export type MusicUnitKind =
  | 'PRIMARY'
  | 'SECONDARY'
  | 'CHILDREN'
  | 'WORSHIP';

export type MusicHorizon = 'MONTH' | 'QUARTER' | 'HALF' | 'YEAR';

export type MusicDraftStatus = 'DRAFT';
export type MusicPublishedStatus = 'PUBLISHED';

export interface MusicScheduleUnit {
  id: string;
  kind: MusicUnitKind;
  name: string;
  /** Choir org unit when applicable. */
  orgUnitId?: string;
  systemId?: 'sys-choir' | 'sys-worship';
}

export interface MusicServiceSlot {
  id: string;
  /** Period key: YYYY-MM for month plans, or period start. */
  periodKey: string;
  date: string;
  kind: MusicServiceKind;
  label: string;
}

export interface MusicAssignment {
  id: string;
  serviceId: string;
  unitId: string;
  source: 'ENGINE' | 'MANUAL';
}

export interface MusicScheduleDraft {
  id: string;
  periodKey: string;
  horizon: MusicHorizon;
  label: string;
  status: MusicDraftStatus;
  createdAt: string;
  createdByPersonId: string;
  services: MusicServiceSlot[];
  assignments: MusicAssignment[];
  warnings: string[];
}

/** Live published choir schedule for a period (editable). */
export interface MusicChoirSchedule {
  id: string;
  periodKey: string;
  horizon: MusicHorizon;
  status: MusicPublishedStatus;
  publishedAt: string;
  publishedByPersonId: string;
  updatedAt: string;
  updatedByPersonId?: string;
  version: number;
  services: MusicServiceSlot[];
  assignments: MusicAssignment[];
  warnings: string[];
}

export type MusicScheduleNotifKind =
  | 'PUBLISHED'
  | 'UPDATED'
  | 'DRAFT_SAVED';

export interface MusicScheduleNotification {
  id: string;
  personId: string;
  kind: MusicScheduleNotifKind;
  periodKey: string;
  scheduleId: string;
  title: string;
  body: string;
  createdAt: string;
  readAt?: string;
}

export const MUSIC_SERVICE_LABELS: Record<MusicServiceKind, string> = {
  SS1: 'Sunday Service 1',
  SS2: 'Sunday Service 2',
  TUESDAY: 'Tuesday Service',
  FRIDAY: 'Friday Service',
  IGABURO: 'Igaburo (Holy Communion)',
};
