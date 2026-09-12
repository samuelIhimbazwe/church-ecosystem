import type { ReactNode } from 'react';

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
    (status ? TONE_BY_STATUS[status] : undefined) ??
    'neutral';
  return (
    <span className={`status-pill ${resolved}`}>
      {children ?? status ?? '—'}
    </span>
  );
}

export function EmptyState({
  title,
  detail,
  action,
}: {
  title: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      {detail && <p className="muted">{detail}</p>}
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
}

export function ForbiddenState({
  resource,
  action = 'VIEW',
  detail,
}: {
  resource: string;
  action?: string;
  detail?: string;
}) {
  return (
    <div className="forbidden-state">
      <strong>No access</strong>
      <p className="muted">
        {detail ?? (
          <>
            You need <code>
              {resource} / {action}
            </code>{' '}
            in this system.
          </>
        )}
      </p>
    </div>
  );
}
