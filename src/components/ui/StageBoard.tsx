import { useEffect, type ReactNode } from 'react';

export type StageColumn = {
  id: string;
  label: string;
  count?: number;
  /** Always-on CTA for this stage (e.g. Post collection). */
  cta?: ReactNode;
  children: ReactNode;
};

/**
 * Stage board: tabs/columns with counts + always-on stage CTA.
 * If `activeId` is missing from `stages`, falls back to the first stage
 * and notifies the parent via `onChange` so filters stay in sync.
 */
export function StageBoard({
  stages,
  activeId,
  onChange,
  title,
}: {
  stages: StageColumn[];
  activeId: string;
  onChange: (id: string) => void;
  title?: string;
}) {
  const active = stages.find((s) => s.id === activeId) ?? stages[0];

  useEffect(() => {
    if (!active || active.id === activeId) return;
    onChange(active.id);
  }, [active, activeId, onChange]);

  return (
    <div className="stage-board">
      {(title || stages.length > 0) && (
        <div className="stage-board-head">
          {title && <h3 style={{ margin: 0 }}>{title}</h3>}
          <div className="stage-tabs" role="tablist" aria-label={title ?? 'Stages'}>
            {stages.map((s) => {
              const selected = s.id === active?.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  className={`stage-tab ${selected ? 'active' : ''}`}
                  onClick={() => onChange(s.id)}
                >
                  {s.label}
                  {s.count != null && (
                    <span className="stage-count">{s.count}</span>
                  )}
                </button>
              );
            })}
          </div>
          {active?.cta && <div className="stage-cta">{active.cta}</div>}
        </div>
      )}
      <div className="stage-board-body" role="tabpanel">
        {active?.children}
      </div>
    </div>
  );
}
