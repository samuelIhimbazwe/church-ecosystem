import type { ReactNode } from 'react';

export type FilterOption = {
  value: string;
  label: string;
  count?: number;
};

export function FilterBar({
  options,
  value,
  onChange,
  label = 'Filter',
}: {
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  return (
    <div className="filter-bar" role="group" aria-label={label}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            className={`filter-chip ${active ? 'active' : ''}`}
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
          >
            {opt.label}
            {opt.count != null && (
              <span className="filter-count">{opt.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function PageHead({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-head">
      <div>
        <h2>{title}</h2>
        {subtitle && <p className="muted" style={{ margin: 0 }}>{subtitle}</p>}
      </div>
      {actions && <div className="row">{actions}</div>}
    </div>
  );
}
