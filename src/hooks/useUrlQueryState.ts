import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/** Sync a single query-string key with React state (URL is source of truth). */
export function useUrlQueryState(
  key: string,
  defaultValue = '',
): [string, (next: string) => void] {
  const [params, setParams] = useSearchParams();
  const value = params.get(key) ?? defaultValue;

  const setValue = useCallback(
    (next: string) => {
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (!next || next === defaultValue) p.delete(key);
          else p.set(key, next);
          return p;
        },
        { replace: true },
      );
    },
    [defaultValue, key, setParams],
  );

  return [value, setValue];
}

export function useUrlSort(
  defaultColumn: string,
  defaultDir: 'asc' | 'desc' = 'asc',
): [
  { columnId: string; direction: 'asc' | 'desc' },
  (next: { columnId: string; direction: 'asc' | 'desc' }) => void,
] {
  const [sortBy, setSortBy] = useUrlQueryState('sort', defaultColumn);
  const [dir, setDir] = useUrlQueryState('dir', defaultDir);

  const sort = useMemo(
    () => ({
      columnId: sortBy || defaultColumn,
      direction: (dir === 'desc' ? 'desc' : 'asc') as 'asc' | 'desc',
    }),
    [sortBy, dir, defaultColumn],
  );

  const setSort = useCallback(
    (next: { columnId: string; direction: 'asc' | 'desc' }) => {
      setSortBy(next.columnId);
      setDir(next.direction);
    },
    [setDir, setSortBy],
  );

  return [sort, setSort];
}
