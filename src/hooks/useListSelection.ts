import { useMemo, useState } from 'react';

/**
 * Keep a list|detail selection in sync with the visible rows.
 * Derives the effective id on every render (no useEffect flash) so the
 * detail pane is never stranded on “select something” while rows exist.
 */
export function useListSelection<T extends { id: string }>(
  items: readonly T[],
  options?: { enabled?: boolean },
) {
  const [pickedId, setPickedId] = useState<string | null>(null);
  const enabled = options?.enabled !== false;

  const selectedId = useMemo(() => {
    if (!enabled || items.length === 0) return null;
    if (pickedId && items.some((i) => i.id === pickedId)) return pickedId;
    return items[0].id;
  }, [enabled, items, pickedId]);

  const selected = useMemo(
    () => (selectedId ? (items.find((i) => i.id === selectedId) ?? null) : null),
    [items, selectedId],
  );

  return {
    selectedId,
    selected,
    setSelectedId: setPickedId,
  };
}
