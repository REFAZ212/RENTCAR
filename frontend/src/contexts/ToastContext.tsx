import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
  ReactNode,
} from "react";

/* ============================
   Types
======================== */

type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

interface ToastProviderProps {
  children: ReactNode;
}

/* ============================
   Context
======================== */

const ToastContext = createContext<ToastContextType | undefined>(undefined);

let toastId = 0;

/* ============================
   Provider
======================== */

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach(clearTimeout);
      timers.clear();
    };
  }, []);

  const addToast = useCallback(
    (
      message: string,
      type: ToastType = "success",
      duration: number = 3000
    ) => {
      const id = ++toastId;

      setToasts((prev) => [
        ...prev,
        {
          id,
          message,
          type,
        },
      ]);

      const timer = setTimeout(() => {
        timersRef.current.delete(timer);
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, duration);
      timersRef.current.add(timer);
    },
    []
  );

  const toast: ToastContextType = useMemo(
    () => ({
      success: (message: string) => addToast(message, "success"),
      error: (message: string) => addToast(message, "error"),
      info: (message: string) => addToast(message, "info"),
    }),
    [addToast]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} />
    </ToastContext.Provider>
  );
}

/* ============================
   Hook
======================== */

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error(
      "useToast harus digunakan di dalam ToastProvider"
    );
  }

  return context;
}

/* ============================
   Toast Container (inline)
======================== */

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}

function ToastItem({ toast }: { toast: Toast }) {
  const bg =
    toast.type === "success"
      ? "bg-accent-600"
      : toast.type === "error"
        ? "bg-error-600"
        : "bg-primary-600";

  return (
    <div
      className={`${bg} text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-auto animate-slide-in`}
    >
      {toast.message}
    </div>
  );
}
