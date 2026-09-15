import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FilterBar, PageHead } from '../components/ui/FilterBar';
import { EmptyState } from '../components/ui/EmptyState';
import { MasterDetail } from '../components/ui/MasterDetail';
import { ListSkeleton } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';
import { useAttention } from '../hooks/useAttention';
import { useListSelection } from '../hooks/useListSelection';
import type { AttentionViewItem } from '../services/attentionService';

export function InboxPage() {
  const {
    items,
    loading,
    markRead,
    markUnread,
    markAllRead,
    unreadCount,
  } = useAttention();
  const { push: toast } = useToast();
  const [filter, setFilter] = useState<'all' | 'unread'>('unread');
  const [liveMsg, setLiveMsg] = useState('');

  const visible = useMemo(() => {
    if (filter === 'unread') return items.filter((i) => i.unread);
    return items;
  }, [items, filter]);

  const { selectedId, selected, setSelectedId } =
    useListSelection<AttentionViewItem>(visible, { enabled: !loading });

  function markReadWithUndo(id: string) {
    markRead(id);
    setLiveMsg('Marked read');
    toast({
      title: 'Marked read',
      tone: 'success',
      durationMs: 5000,
      undo: () => {
        markUnread(id);
        setLiveMsg('Marked unread');
      },
    });
  }

  return (
    <div className="list-page inbox-page">
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {liveMsg}
      </div>
      <div className="list-chrome">
        <PageHead
          actions={
            unreadCount > 0 ? (
              <button
                type="button"
                className="btn secondary"
                onClick={() => {
                  markAllRead();
                  setLiveMsg('All marked read');
                  toast({ title: 'All marked read', tone: 'success' });
                }}
              >
                Mark all read
              </button>
            ) : undefined
          }
        />
        <div className="list-toolbar">
          <FilterBar
            value={filter}
            onChange={(v) => setFilter(v as 'all' | 'unread')}
            options={[
              { value: 'unread', label: 'Unread', count: unreadCount },
              { value: 'all', label: 'All', count: items.length },
            ]}
            onClearAll={() => setFilter('all')}
          />
        </div>
      </div>

      {loading ? (
        <ListSkeleton rows={4} />
      ) : visible.length === 0 ? (
        <div className="list-surface" style={{ padding: '1rem' }}>
          <EmptyState
            variant={filter === 'unread' ? 'no-results' : 'first-use'}
            title={filter === 'unread' ? 'Inbox zero' : 'Nothing needs you'}
            detail={
              filter === 'unread'
                ? 'You’re caught up. Switch to All to revisit items.'
                : 'When approvals or tasks land for you, they’ll show here.'
            }
            action={
              filter === 'unread' ? (
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => setFilter('all')}
                >
                  Show all
                </button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="list-surface">
          <MasterDetail
            list={
              <ul
                className="inbox-items inbox-master-list"
                role="listbox"
                aria-label="Inbox items"
              >
                {visible.map((item) => (
                  <li key={item.id} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={selectedId === item.id}
                      className={`inbox-master-row ${item.unread ? 'unread' : ''} ${selectedId === item.id ? 'selected' : ''}`}
                      onClick={() => setSelectedId(item.id)}
                    >
                      <span className="inbox-kind">{item.kind}</span>
                      <strong>{item.title}</strong>
                      <span className="muted inbox-reason">{item.reason}</span>
                    </button>
                  </li>
                ))}
              </ul>
            }
            detail={
              selected ? (
                <div className="inbox-detail stack">
                  <span className="inbox-kind">{selected.kind}</span>
                  <h3 style={{ margin: 0 }}>{selected.title}</h3>
                  <p className="muted">{selected.reason}</p>
                  <div className="row">
                    <Link
                      to={selected.href}
                      className="btn"
                      onClick={() => markRead(selected.id)}
                    >
                      Open claim
                    </Link>
                    {selected.unread && (
                      <button
                        type="button"
                        className="btn secondary"
                        onClick={() => markReadWithUndo(selected.id)}
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              ) : null
            }
          />
        </div>
      )}
    </div>
  );
}
