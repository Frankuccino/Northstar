import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { useTheme } from "./theme-context";
import { Check, X, AlertTriangle, Info, XIcon } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
  progress: number;
}

interface ToastContextType {
  toast: (toast: Omit<Toast, "id" | "progress">) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ type, title, description, duration = 4000 }: Omit<Toast, "id" | "progress">) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, type, title, description, duration, progress: 100 }]);

      const interval = 50;
      const decrement = (interval / duration) * 100;
      const timer = setInterval(() => {
        setToasts((prev) =>
          prev.map((t) => {
            const newProgress = t.id === id ? Math.max(0, t.progress - decrement) : t.progress;
            if (newProgress <= 0) {
              clearInterval(timer);
              setTimeout(() => dismiss(id), 200);
              return { ...t, progress: 0 };
            }
            return t.id === id ? { ...t, progress: newProgress } : t;
          }),
        );
      }, interval);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
};

const ToastViewport = ({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) => {
  return (
    <div className="fixed bottom-6 left-1/2 z-[9999] flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastItem = ({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) => {
  const { theme } = useTheme();
  const [isExiting, setIsExiting] = useState(false);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onDismiss(toast.id), 250);
  };

  const config = {
    success: {
      icon: <Check className="h-3.5 w-3.5" strokeWidth={3} />,
      color: "oklch(0.7 0.18 145)",
      bg: "oklch(0.7 0.18 145 / 10%)",
    },
    error: {
      icon: <X className="h-3.5 w-3.5" strokeWidth={3} />,
      color: "oklch(0.65 0.22 25)",
      bg: "oklch(0.65 0.22 25 / 10%)",
    },
    warning: {
      icon: <AlertTriangle className="h-3.5 w-3.5" strokeWidth={3} />,
      color: "oklch(0.75 0.18 60)",
      bg: "oklch(0.75 0.18 60 / 10%)",
    },
    info: {
      icon: <Info className="h-3.5 w-3.5" strokeWidth={3} />,
      color: theme.colors.primary,
      bg: `${theme.colors.primary}10`,
    },
  };

  const { icon, color, bg } = config[toast.type];

  return (
    <div
      className={`relative w-[380px] overflow-hidden rounded-2xl border shadow-2xl transition-all duration-250 ${
        isExiting ? "translate-y-4 scale-95 opacity-0" : "translate-y-0 scale-100 opacity-100"
      }`}
      style={{
        background: theme.colors.card,
        borderColor: `${color}20`,
        boxShadow: `0 8px 32px ${color}15, 0 2px 8px oklch(0 0 0 / 8%)`,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: `${color}15` }}>
        <div
          className="h-full transition-all duration-50 ease-linear"
          style={{ width: `${toast.progress}%`, background: color }}
        />
      </div>

      <div className="flex items-center gap-3 p-3.5">
        {/* Icon */}
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ background: bg, color }}
        >
          {icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold leading-tight" style={{ color: theme.colors.foreground }}>
            {toast.title}
          </p>
          {toast.description && (
            <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{toast.description}</p>
          )}
        </div>

        {/* Close */}
        <button
          onClick={handleDismiss}
          className="shrink-0 rounded-full p-1 text-muted-foreground/50 transition-colors hover:bg-muted hover:text-foreground"
        >
          <XIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
