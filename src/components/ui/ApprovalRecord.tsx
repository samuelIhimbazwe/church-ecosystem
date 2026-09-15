import type { ReactNode } from 'react';
import { StatusPill } from './StatusPill';
import { ApprovalStepper, type ApprovalStepItem } from './ApprovalStepper';

export type ApprovalTimelineEntry = {
  id: string;
  at: string;
  label: string;
  detail?: string;
};

export type ApprovalRecordProps = {
  /** Route / gate description (human). */
  routeLabel?: string;
  gateHint?: string;
  steps: ApprovalStepItem[];
  completeHint?: string;
  comments?: ReactNode;
  timeline?: ApprovalTimelineEntry[];
};

/**
 * Approval record: route, gate, stepper, comments, timeline.
 * Prefer this over bare ApprovalStepper on decision surfaces.
 */
export function ApprovalRecord({
  routeLabel,
  gateHint,
  steps,
  completeHint,
  comments,
  timeline,
}: ApprovalRecordProps) {
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <div className="approval-record stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          {routeLabel && (
            <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
              Route · {routeLabel}
            </p>
          )}
          {gateHint && (
            <p style={{ margin: '0.25rem 0 0' }}>
              <strong>{gateHint}</strong>
            </p>
          )}
        </div>
        <StatusPill tone={doneCount === steps.length && steps.length > 0 ? 'success' : 'info'}>
          {doneCount}/{steps.length} cleared
        </StatusPill>
      </div>

      <ApprovalStepper steps={steps} completeHint={completeHint} />

      {comments && (
        <div className="approval-comments">
          <h4 style={{ margin: '0 0 0.35rem', fontSize: '0.95rem' }}>Notes</h4>
          {comments}
        </div>
      )}

      {timeline && timeline.length > 0 && (
        <div className="approval-timeline">
          <h4 style={{ margin: '0 0 0.35rem', fontSize: '0.95rem' }}>Timeline</h4>
          <ol>
            {timeline.map((e) => (
              <li key={e.id}>
                <span className="muted">{e.at}</span>
                <strong> {e.label}</strong>
                {e.detail && (
                  <span className="muted"> — {e.detail}</span>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

export type { ApprovalStepItem };
