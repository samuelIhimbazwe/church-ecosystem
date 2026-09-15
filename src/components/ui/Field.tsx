import { type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

type FieldShellProps = {
  label: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  children: ReactNode;
};

export function FieldShell({ label, hint, error, htmlFor, children }: FieldShellProps) {
  return (
    <div className={`field${error ? ' invalid' : ''}`}>
      <label className="field-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? <p className="field-error">{error}</p> : null}
      {!error && hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  );
}

export function TextField({
  label,
  hint,
  error,
  id,
  ...rest
}: {
  label: string;
  hint?: string;
  error?: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  const inputId = id ?? rest.name;
  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={inputId}>
      <input id={inputId} {...rest} />
    </FieldShell>
  );
}

export function SelectField({
  label,
  hint,
  error,
  id,
  children,
  ...rest
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
} & SelectHTMLAttributes<HTMLSelectElement>) {
  const inputId = id ?? rest.name;
  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={inputId}>
      <select id={inputId} {...rest}>
        {children}
      </select>
    </FieldShell>
  );
}

export function TextAreaField({
  label,
  hint,
  error,
  id,
  ...rest
}: {
  label: string;
  hint?: string;
  error?: string;
} & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const inputId = id ?? rest.name;
  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={inputId}>
      <textarea id={inputId} {...rest} />
    </FieldShell>
  );
}

export function CheckboxField({
  label,
  checked,
  onChange,
  disabled,
  id,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  id?: string;
}) {
  const inputId = id ?? `check-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <label className="control-check" htmlFor={inputId}>
      <input
        id={inputId}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}
