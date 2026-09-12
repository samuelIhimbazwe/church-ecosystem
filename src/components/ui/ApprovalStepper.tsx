import type { ReactNode } from 'react';
import { StatusPill } from './StatusPill';

export type ApprovalStepItem = {
  key: string;
  label: string;
  done: boolean;
  detail?: string;
  action?: ReactNode;
};

export function ApprovalStepper({
  steps,
  completeHint,
}: {
  steps: ApprovalStepItem[];
  completeHint?: string;
}) {
  const allDone = steps.length > 0 && steps.every((s) => s.done);

  return (
    <div className="stack" style={{ gap: '0.75rem' }}>
      <div className="approval-stepper">
        {steps.map((step, i) => (
          <div
            key={step.key}
            className={`approval-step ${step.done ? 'done' : 'pending'}`}
          >
            <div className="muted" style={{ fontSize: '0.7rem', fontWeight: 700 }}>
              Step {i + 1}
            </div>
            <div className="step-label">{step.label}</div>
            <StatusPill tone={step.done ? 'success' : 'warn'}>
              {step.done ? 'Approved' : 'Pending'}
            </StatusPill>
            {step.detail && (
              <div className="muted" style={{ fontSize: '0.8rem' }}>
                {step.detail}
              </div>
            )}
            {step.action}
          </div>
        ))}
      </div>
      {allDone && completeHint && (
        <p className="muted" style={{ margin: 0 }}>
          {completeHint}
        </p>
      )}
    </div>
  );
}
