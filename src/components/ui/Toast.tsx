import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Icon } from './Icon';

export type ToastTone = 'info' | 'success' | 'warn' | 'danger';

export type ToastAction = {
  label: string;
  onClick: () => void;
};

export type ToastInput = {
  title: string;
  detail?: string;
  tone?: ToastTone;
  /** ms; default 4500. Undo window uses this duration. */
  durationMs?: number;
  undo?: () => void;
  action?: ToastAction;
};

type ToastItem = ToastInput & { id: string; leaving?: boolean };

type ToastApi = {
  push: (input: ToastInput) => string;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);
const EXIT_MS = 180;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, number>>(new Map());

  const dismiss = useCallback((id: string) => {
    const t = timers.current.get(id);
    if (t) window.clearTimeout(t);
    timers.current.delete(id);
    setItems((prev) =>
      prev.map((x) => (x.id === id ? { ...x, leaving: true } : x)),
    );
    window.setTimeout(() => {
      setItems((prev) => prev.filter((x) => x.id !== id));
    }, EXIT_MS);
  }, []);

  const push = useCallback(
    (input: ToastInput) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const duration = input.durationMs ?? (input.undo ? 6000 : 4500);
      setItems((prev) => [...prev, { ...input, id }]);
      const handle = window.setTimeout(() => dismiss(id), duration);
      timers.current.set(id, handle);
      return id;
    },
    [dismiss],
  );

  const api = useMemo(() => ({ push, dismiss }), [push, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-viewport" aria-live="polite" aria-relevant="additions text">
        {items.map((t) => (
          <div
            key={t.id}
            className={`toast toast-${t.tone ?? 'info'}${t.leaving ? ' toast-leaving' : ''}`}
            role="status"
          >
            <div className="toast-body">
              <strong>{t.title}</strong>
              {t.detail && <p className="muted">{t.detail}</p>}
            </div>
            <div className="toast-actions">
              {t.undo && (
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => {
                    t.undo?.();
                    dismiss(t.id);
                  }}
                >
                  Undo
                </button>
              )}
              {t.action && (
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => {
                    t.action?.onClick();
                    dismiss(t.id);
                  }}
                >
                  {t.action.label}
                </button>
              )}
              <button
                type="button"
                className="btn ghost sm"
                aria-label="Dismiss"
                onClick={() => dismiss(t.id)}
              >
                <Icon name="close" size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      push: () => '',
      dismiss: () => undefined,
    };
  }
  return ctx;
}
