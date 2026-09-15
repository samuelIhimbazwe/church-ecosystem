/**
 * Human-facing status labels + tones. Never show raw enums as the only signal.
 */

export type StatusTone = 'success' | 'warn' | 'danger' | 'info' | 'neutral';

const LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  VISITOR: 'Visitor',
  CONFIRMED: 'Confirmed',
  DONE: 'Done',
  COMPLETED: 'Completed',
  ATTENDED: 'Attended',
  REGISTERED: 'Registered',
  VERIFIED: 'Verified',
  PUBLISHED: 'Published',
  TODO: 'To do',
  PLANNED: 'Planned',
  SETUP: 'Setup',
  DRAFT: 'Draft',
  OPEN: 'Open',
  PENDING: 'Pending',
  PENDING_APPROVAL: 'Awaiting approval',
  REVIEW: 'In review',
  PARTIAL: 'Partial',
  IN_PROGRESS: 'In progress',
  PAUSED: 'Paused',
  CLOSING: 'Closing',
  WAITLIST: 'Waitlist',
  CANCELLED: 'Cancelled',
  REJECTED: 'Rejected',
  DECLINED: 'Declined',
  ENDED: 'Ended',
  NO_SHOW: 'No-show',
  READY: 'Ready',
  LIVE: 'Live',
  PREPARE: 'Prepare',
  DELIVER: 'Deliver',
  CLOSE: 'Close-out',
};

const TONES: Record<string, StatusTone> = {
  ACTIVE: 'success',
  INACTIVE: 'neutral',
  VISITOR: 'info',
  CONFIRMED: 'success',
  DONE: 'success',
  COMPLETED: 'success',
  ATTENDED: 'success',
  REGISTERED: 'info',
  VERIFIED: 'success',
  PUBLISHED: 'success',
  TODO: 'neutral',
  PLANNED: 'neutral',
  SETUP: 'info',
  DRAFT: 'neutral',
  OPEN: 'neutral',
  PENDING: 'info',
  PENDING_APPROVAL: 'info',
  REVIEW: 'info',
  PARTIAL: 'info',
  IN_PROGRESS: 'info',
  PAUSED: 'neutral',
  CLOSING: 'warn',
  WAITLIST: 'info',
  CANCELLED: 'danger',
  REJECTED: 'danger',
  DECLINED: 'danger',
  ENDED: 'neutral',
  NO_SHOW: 'danger',
  READY: 'info',
  LIVE: 'success',
  PREPARE: 'neutral',
  DELIVER: 'info',
  CLOSE: 'warn',
};

export function statusLabel(status: string | undefined | null): string {
  if (!status) return '—';
  return LABELS[status] ?? status.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

export function statusTone(status: string | undefined | null): StatusTone {
  if (!status) return 'neutral';
  return TONES[status] ?? 'neutral';
}
