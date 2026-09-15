import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState, type EmptyVariant } from './EmptyState';
import { TableSkeleton } from './Skeleton';

export type DataColumn<T> = {
  id: string;
  header: string;
  /** Value used for sorting; omit to disable sort on this column. */
  sortValue?: (row: T) => string | number | boolean | null | undefined;
  cell: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
  width?: string;
};

export type SortState = {
  columnId: string;
  direction: 'asc' | 'desc';
};

export type DataTableDensity = 'comfortable' | 'compact';

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  sort,
  onSort,
  loading,
  emptyVariant = 'no-results',
  emptyTitle,
  emptyDetail,
  emptyAction,
  rowHref,
  footer,
  selectedKeys,
  onSelectedKeysChange,
  bulkActions,
  prefsKey,
  density: densityProp,
  onDensityChange,
}: {
  rows: T[];
  columns: DataColumn<T>[];
  rowKey: (row: T) => string;
  sort?: SortState | null;
  onSort?: (next: SortState) => void;
  loading?: boolean;
  emptyVariant?: EmptyVariant;
  emptyTitle?: string;
  emptyDetail?: string;
  emptyAction?: ReactNode;
  rowHref?: (row: T) => string | undefined;
  footer?: ReactNode;
  /** When set with onSelectedKeysChange, enables row checkboxes + bulk bar. */
  selectedKeys?: string[];
  onSelectedKeysChange?: (keys: string[]) => void;
  bulkActions?: ReactNode;
  /** Persist column visibility + density under these localStorage keys. */
  prefsKey?: string;
  density?: DataTableDensity;
  onDensityChange?: (density: DataTableDensity) => void;
}) {
  const selectable = Boolean(selectedKeys && onSelectedKeysChange);
  const selected = new Set(selectedKeys ?? []);
  const firstColId = columns[0]?.id;

  const [hiddenCols, setHiddenCols] = useState<string[]>(() => {
    if (!prefsKey) return [];
    const saved = loadJson<string[]>(`${prefsKey}:cols`, []);
    return Array.isArray(saved)
      ? saved.filter((id) => id !== firstColId)
      : [];
  });

  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    const defaults = columns.map((c) => c.id);
    if (!prefsKey) return defaults;
    const saved = loadJson<string[]>(`${prefsKey}:order`, []);
    if (!Array.isArray(saved) || saved.length === 0) return defaults;
    const known = new Set(defaults);
    const ordered = saved.filter((id) => known.has(id));
    for (const id of defaults) {
      if (!ordered.includes(id)) ordered.push(id);
    }
    // Keep primary column first.
    if (firstColId && ordered[0] !== firstColId) {
      return [firstColId, ...ordered.filter((id) => id !== firstColId)];
    }
    return ordered;
  });

  const [internalDensity, setInternalDensity] = useState<DataTableDensity>(
    () => {
      if (densityProp) return densityProp;
      if (!prefsKey) return 'comfortable';
      const saved = loadJson<DataTableDensity>(
        `${prefsKey}:density`,
        'comfortable',
      );
      return saved === 'compact' ? 'compact' : 'comfortable';
    },
  );

  const density = densityProp ?? internalDensity;

  useEffect(() => {
    if (densityProp) setInternalDensity(densityProp);
  }, [densityProp]);

  function setDensity(next: DataTableDensity) {
    if (onDensityChange) onDensityChange(next);
    else setInternalDensity(next);
    if (prefsKey) {
      localStorage.setItem(`${prefsKey}:density`, JSON.stringify(next));
    }
  }

  function persistOrder(next: string[]) {
    setColumnOrder(next);
    if (prefsKey) {
      localStorage.setItem(`${prefsKey}:order`, JSON.stringify(next));
    }
  }

  function moveCol(colId: string, dir: -1 | 1) {
    if (colId === firstColId) return;
    setColumnOrder((prev) => {
      const idx = prev.indexOf(colId);
      if (idx < 0) return prev;
      const swap = idx + dir;
      // Do not move past the pinned first column.
      if (swap <= 0 || swap >= prev.length) return prev;
      const next = [...prev];
      const tmp = next[idx]!;
      next[idx] = next[swap]!;
      next[swap] = tmp;
      if (prefsKey) {
        localStorage.setItem(`${prefsKey}:order`, JSON.stringify(next));
      }
      return next;
    });
  }

  function toggleCol(colId: string) {
    if (colId === firstColId) return;
    setHiddenCols((prev) => {
      const next = prev.includes(colId)
        ? prev.filter((id) => id !== colId)
        : [...prev, colId];
      if (prefsKey) {
        localStorage.setItem(`${prefsKey}:cols`, JSON.stringify(next));
      }
      return next;
    });
  }

  const orderedColumns = columnOrder
    .map((id) => columns.find((c) => c.id === id))
    .filter((c): c is DataColumn<T> => !!c);
  // Include any new columns not yet in order.
  for (const c of columns) {
    if (!orderedColumns.some((o) => o.id === c.id)) orderedColumns.push(c);
  }
  const visibleColumns = orderedColumns.filter(
    (c) => !hiddenCols.includes(c.id),
  );

  if (loading) {
    return (
      <TableSkeleton
        cols={visibleColumns.length + (selectable ? 1 : 0)}
        rows={6}
      />
    );
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        variant={emptyVariant}
        title={emptyTitle}
        detail={emptyDetail}
        action={emptyAction}
      />
    );
  }

  const sorted = (() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.id === sort.columnId);
    if (!col?.sortValue) return rows;
    const dir = sort.direction === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') {
        return (av - bv) * dir;
      }
      return (
        String(av).localeCompare(String(bv), undefined, {
          numeric: true,
          sensitivity: 'base',
        }) * dir
      );
    });
  })();

  const allKeys = sorted.map(rowKey);
  const allSelected =
    allKeys.length > 0 && allKeys.every((k) => selected.has(k));

  function toggleSort(col: DataColumn<T>) {
    if (!col.sortValue || !onSort) return;
    if (sort?.columnId === col.id) {
      onSort({
        columnId: col.id,
        direction: sort.direction === 'asc' ? 'desc' : 'asc',
      });
    } else {
      onSort({ columnId: col.id, direction: 'asc' });
    }
  }

  function toggleAllMatching() {
    if (!onSelectedKeysChange) return;
    onSelectedKeysChange(allSelected ? [] : allKeys);
  }

  function toggleOne(key: string) {
    if (!onSelectedKeysChange) return;
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onSelectedKeysChange([...next]);
  }

  const showPrefs = Boolean(prefsKey) || densityProp != null || onDensityChange;

  return (
    <div className="data-table-wrap">
      {showPrefs && (
        <div className="data-table-prefs row">
          <label className="muted" style={{ fontSize: '0.85rem' }}>
            Density{' '}
            <select
              value={density}
              onChange={(e) =>
                setDensity(e.target.value as DataTableDensity)
              }
            >
              <option value="comfortable">Comfortable</option>
              <option value="compact">Compact</option>
            </select>
          </label>
          {prefsKey && columns.length > 1 && (
            <details className="data-table-cols">
              <summary className="muted" style={{ cursor: 'pointer' }}>
                Columns
              </summary>
              <div className="stack" style={{ gap: '0.25rem', marginTop: '0.35rem' }}>
                {orderedColumns.map((col, i) => (
                  <div
                    key={col.id}
                    className="row"
                    style={{ gap: '0.35rem', alignItems: 'center' }}
                  >
                    <label style={{ fontSize: '0.85rem', flex: 1 }}>
                      <input
                        type="checkbox"
                        checked={!hiddenCols.includes(col.id)}
                        disabled={col.id === firstColId}
                        onChange={() => toggleCol(col.id)}
                      />{' '}
                      {col.header}
                    </label>
                    <button
                      type="button"
                      className="btn ghost"
                      style={{ padding: '0.15rem 0.4rem' }}
                      disabled={i <= 1}
                      aria-label={`Move ${col.header} left`}
                      onClick={() => moveCol(col.id, -1)}
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      className="btn ghost"
                      style={{ padding: '0.15rem 0.4rem' }}
                      disabled={i === 0 || i >= orderedColumns.length - 1}
                      aria-label={`Move ${col.header} right`}
                      onClick={() => moveCol(col.id, 1)}
                    >
                      →
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn ghost"
                  style={{ alignSelf: 'flex-start', fontSize: '0.8rem' }}
                  onClick={() =>
                    persistOrder([
                      firstColId!,
                      ...columns
                        .map((c) => c.id)
                        .filter((id) => id !== firstColId),
                    ])
                  }
                >
                  Reset order
                </button>
              </div>
            </details>
          )}
        </div>
      )}
      {selectable && selected.size > 0 && (
        <div className="data-table-bulk">
          <span>
            {selected.size} selected
            {allSelected ? ' (all matching)' : ''}
          </span>
          <div className="row">{bulkActions}</div>
        </div>
      )}
      <table className={`data-table density-${density}`}>
        <thead>
          <tr>
            {selectable && (
              <th style={{ width: '2.5rem' }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAllMatching}
                  aria-label="Select all matching rows"
                />
              </th>
            )}
            {visibleColumns.map((col) => {
              const sortable = Boolean(col.sortValue && onSort);
              const active = sort?.columnId === col.id;
              const ariaSort = !sortable
                ? undefined
                : active
                  ? sort!.direction === 'asc'
                    ? 'ascending'
                    : 'descending'
                  : 'none';
              return (
                <th
                  key={col.id}
                  style={{
                    textAlign: col.align ?? 'left',
                    width: col.width,
                  }}
                  aria-sort={
                    ariaSort as 'ascending' | 'descending' | 'none' | undefined
                  }
                >
                  {sortable ? (
                    <button
                      type="button"
                      className={`data-table-sort ${active ? 'active' : ''}`}
                      onClick={() => toggleSort(col)}
                    >
                      {col.header}
                      <span className="data-table-sort-ind" aria-hidden>
                        {active
                          ? sort!.direction === 'asc'
                            ? ' ↑'
                            : ' ↓'
                          : ' ↕'}
                      </span>
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => {
            const key = rowKey(row);
            const href = rowHref?.(row);
            return (
              <tr key={key} className={href ? 'data-table-row-link' : undefined}>
                {selectable && (
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.has(key)}
                      onChange={() => toggleOne(key)}
                      aria-label={`Select ${key}`}
                    />
                  </td>
                )}
                {visibleColumns.map((col, i) => (
                  <td key={col.id} style={{ textAlign: col.align ?? 'left' }}>
                    {i === 0 && href ? (
                      <Link to={href} className="data-table-primary-link">
                        {col.cell(row)}
                      </Link>
                    ) : (
                      col.cell(row)
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      {footer && <div className="data-table-footer">{footer}</div>}
    </div>
  );
}
