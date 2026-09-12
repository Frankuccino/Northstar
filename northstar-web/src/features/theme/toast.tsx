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
}

interface ToastContextType {
  toast: (toast: Omit<Toast, "id">) => void;
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
    ({ type, title, description, duration = 4000 }: Omit<Toast, "id">) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, type, title, description, duration }]);

      setTimeout(() => {
        dismiss(id);
      }, duration);
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
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-3">
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
    setTimeout(() => onDismiss(toast.id), 200);
  };

  const icons = {
    success: <Check className="h-4 w-4" />,
    error: <X className="h-4 w-4" />,
    warning: <AlertTriangle className="h-4 w-4" />,
    info: <Info className="h-4 w-4" />,
  };

  const colors = {
    success: "oklch(0.65 0.15 145)",
    error: "oklch(0.6 0.22 25)",
    warning: "oklch(0.7 0.18 60)",
    info: theme.colors.primary,
  };

  return (
    <div
      className={`group relative flex items-start gap-3 rounded-xl px-4 py-3 shadow-lg ring-1 transition-all duration-200 ${
        isExiting ? "translate-x-full opacity-0" : "translate-x-0 opacity-100"
      }`}
      style={{
        background: theme.glass.background,
        borderColor: theme.glass.border,
        boxShadow: theme.glass.shadow,
        backdropFilter: "blur(16px) saturate(180%)",
        WebkitBackdropFilter: "blur(16px) saturate(180%)",
        minWidth: "300px",
        maxWidth: "420px",
      }}
    >
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white"
        style={{ background: colors[toast.type] }}
      >
        {icons[toast.type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight">{toast.title}</p>
        {toast.description && (
          <p className="mt-0.5 text-xs text-muted-foreground leading-snug">{toast.description}</p>
        )}
      </div>
      <button
        onClick={handleDismiss}
        className="shrink-0 rounded-full p-1 opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
      >
        <XIcon className="h-3 w-3 text-muted-foreground" />
      </button>
    </div>
  );
};
