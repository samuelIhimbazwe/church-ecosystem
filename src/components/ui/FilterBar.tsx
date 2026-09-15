import type { ReactNode } from 'react';

export type FilterOption = {
  value: string;
  label: string;
  count?: number;
};

export type ActiveFilter = {
  id: string;
  label: string;
  onRemove: () => void;
};

/**
 * FilterBar v2: tier-1 chips + optional More filters slot + removable actives + Clear all.
 */
export function FilterBar({
  options,
  value,
  onChange,
  label = 'Filter',
  moreFilters,
  activeFilters,
  onClearAll,
}: {
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  moreFilters?: ReactNode;
  activeFilters?: ActiveFilter[];
  onClearAll?: () => void;
}) {
  const hasActives = (activeFilters?.length ?? 0) > 0;
  const showClear =
    onClearAll &&
    (hasActives || (value && value !== options[0]?.value && value !== 'all'));

  return (
    <div className="filter-bar-v2">
      <div className="filter-bar">
        <div className="tabs" role="group" aria-label={label}>
          {options.map((opt) => {
            const active = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                className={`tab ${active ? 'active' : ''}`}
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
        {moreFilters}
        {showClear && (
          <button
            type="button"
            className="filter-clear"
            onClick={onClearAll}
          >
            Clear all
          </button>
        )}
      </div>
      {hasActives && (
        <div className="filter-actives" aria-label="Active filters">
          {activeFilters!.map((f) => (
            <button
              key={f.id}
              type="button"
              className="filter-active-chip"
              onClick={f.onRemove}
              title={`Remove ${f.label}`}
            >
              {f.label}
              <span aria-hidden> ×</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function PageHead({
  title,
  subtitle,
  breadcrumb,
  actions,
}: {
  title?: string;
  subtitle?: string;
  breadcrumb?: ReactNode;
  actions?: ReactNode;
}) {
  if (!title && !subtitle && !breadcrumb && !actions) return null;
  return (
    <div className={`page-head${!title ? ' page-head-actions-only' : ''}`}>
      {(title || subtitle || breadcrumb) && (
        <div>
          {breadcrumb && <div className="page-breadcrumb">{breadcrumb}</div>}
          {title ? <h2>{title}</h2> : null}
          {subtitle && (
            <p className="muted" style={{ margin: 0 }}>
              {subtitle}
            </p>
          )}
        </div>
      )}
      {actions && <div className="row page-head-actions">{actions}</div>}
    </div>
  );
}
