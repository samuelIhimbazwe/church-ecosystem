import type { ReactNode } from 'react';
import { statusLabel, statusTone } from '../../domain/statusCopy';

export { EmptyState, ForbiddenState } from './EmptyState';

const TONE_BY_STATUS: Record<string, string> = {
  ACTIVE: 'success',
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
};

export function StatusPill({
  status,
  children,
  tone,
}: {
  status?: string;
  children?: ReactNode;
  tone?: 'success' | 'warn' | 'danger' | 'info' | 'neutral';
}) {
  const resolved =
    tone ??
    (status ? statusTone(status) : undefined) ??
    (status ? TONE_BY_STATUS[status] : undefined) ??
    'neutral';
  return (
    <span className={`status-pill ${resolved}`}>
      {children ?? (status ? statusLabel(status) : '—')}
    </span>
  );
}
