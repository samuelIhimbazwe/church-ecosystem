import type { ReactNode } from 'react';
import { EmptyState } from './EmptyState';

/**
 * List | detail split for decision queues (Inbox, review, handoffs).
 * Parents must keep `detail` filled whenever the list has rows — use
 * `useListSelection` so selection never flashes null after paint.
 * `emptyDetail` is only for a truly empty list (or rare edge cases).
 */
export function MasterDetail({
  list,
  detail,
  emptyDetail,
  listWidth = '22rem',
}: {
  list: ReactNode;
  detail: ReactNode | null;
  emptyDetail?: ReactNode;
  listWidth?: string;
}) {
  return (
    <div className="master-detail" style={{ ['--md-list' as string]: listWidth }}>
      <aside className="master-detail-list" aria-label="Items">
        {list}
      </aside>
      <section className="master-detail-pane" aria-live="polite">
        {detail ??
          emptyDetail ?? (
            <EmptyState
              variant="no-results"
              title="Queue empty"
              detail="Nothing in this list yet."
            />
          )}
      </section>
    </div>
  );
}
