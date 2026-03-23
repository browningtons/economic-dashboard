import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle, Info, X, AlertTriangle } from 'lucide-react';

// --- Types ---

type ToastLevel = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: number;
  level: ToastLevel;
  message: string;
  /** Auto-dismiss delay in ms. 0 = sticky. Default 5000. */
  duration: number;
}

interface ToastAPI {
  toast: (message: string, level?: ToastLevel, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

// --- Context ---

const ToastContext = createContext<ToastAPI | null>(null);

export function useToast(): ToastAPI {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

// --- Styling per level ---

const LEVEL_STYLES: Record<ToastLevel, { bg: string; border: string; icon: React.ElementType; iconColor: string }> = {
  success: {
    bg: 'color-mix(in oklab, var(--color-brand-accent) 8%, var(--color-bg-secondary))',
    border: 'color-mix(in oklab, var(--color-brand-accent) 28%, var(--color-border))',
    icon: CheckCircle,
    iconColor: 'var(--color-brand-accent)',
  },
  error: {
    bg: 'color-mix(in oklab, var(--color-brand-primary) 8%, var(--color-bg-secondary))',
    border: 'color-mix(in oklab, var(--color-brand-primary) 28%, var(--color-border))',
    icon: AlertCircle,
    iconColor: 'var(--color-brand-primary)',
  },
  warning: {
    bg: 'color-mix(in oklab, var(--color-brand-secondary) 8%, var(--color-bg-secondary))',
    border: 'color-mix(in oklab, var(--color-brand-secondary) 28%, var(--color-border))',
    icon: AlertTriangle,
    iconColor: 'var(--color-brand-secondary)',
  },
  info: {
    bg: 'var(--color-bg-secondary)',
    border: 'var(--color-border)',
    icon: Info,
    iconColor: 'var(--color-text-muted)',
  },
};

const DEFAULT_DURATION: Record<ToastLevel, number> = {
  success: 4000,
  error: 7000,
  warning: 6000,
  info: 5000,
};

// --- Single toast row ---

function ToastRow({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  const style = LEVEL_STYLES[item.level];
  const Icon = style.icon;

  useEffect(() => {
    if (item.duration <= 0) return;
    const timer = window.setTimeout(() => onDismiss(item.id), item.duration);
    return () => window.clearTimeout(timer);
  }, [item.id, item.duration, onDismiss]);

  return (
    <div
      className="pointer-events-auto flex items-start gap-2.5 rounded-xl border px-4 py-3 shadow-md backdrop-blur-sm animate-[slideIn_0.25s_ease-out]"
      style={{ backgroundColor: style.bg, borderColor: style.border }}
      role="status"
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: style.iconColor }} />
      <p className="flex-1 text-sm leading-snug text-main">{item.message}</p>
      <button
        onClick={() => onDismiss(item.id)}
        className="shrink-0 rounded p-0.5 text-muted transition-colors hover:text-main"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// --- Provider ---

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, level: ToastLevel = 'info', duration?: number) => {
    const id = nextId.current++;
    setItems((prev) => [...prev.slice(-4), { id, level, message, duration: duration ?? DEFAULT_DURATION[level] }]);
  }, []);

  const api = React.useMemo<ToastAPI>(() => ({
    toast,
    success: (msg, dur) => toast(msg, 'success', dur),
    error: (msg, dur) => toast(msg, 'error', dur),
    warning: (msg, dur) => toast(msg, 'warning', dur),
    info: (msg, dur) => toast(msg, 'info', dur),
  }), [toast]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* Toast container — bottom-right, above fold */}
      <div className="fixed bottom-6 right-6 z-50 flex w-[min(24rem,calc(100vw-3rem))] flex-col gap-2 pointer-events-none">
        {items.map((item) => (
          <ToastRow key={item.id} item={item} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
