import type { ReactNode } from 'react';

/** Section header inside create drawers — keeps forms scannable. */
export function CreateFormSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="create-form-section">
      <header className="create-form-section-head">
        <h4>{title}</h4>
        {hint ? <p className="muted">{hint}</p> : null}
      </header>
      <div className="create-form-section-body stack">{children}</div>
    </section>
  );
}

export function CreateFormActions({
  onCancel,
  submitLabel,
  busy,
  disabled,
  formId,
}: {
  onCancel: () => void;
  submitLabel: string;
  busy?: boolean;
  disabled?: boolean;
  /** When actions sit in Drawer footer outside the <form>. */
  formId?: string;
}) {
  return (
    <div className="create-form-actions">
      <button type="button" className="btn secondary" onClick={onCancel} disabled={busy}>
        Cancel
      </button>
      <button
        type="submit"
        className="btn"
        form={formId}
        disabled={busy || disabled}
      >
        {busy ? 'Creating…' : submitLabel}
      </button>
    </div>
  );
}
