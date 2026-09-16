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

const MAX_TOASTS = 3;

// Durasi animasi keluar toast sebelum benar-benar dihapus dari DOM.
const EXIT_ANIM_MS = 250;

interface Toast {
  id: number;
  message: string;
  type: ToastType;
  leaving: boolean;
}

interface ToastContextType {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  dismiss: (id: number) => void;
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

  const forceRemove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // Tandai "leaving" dulu supaya animasi keluar sempat berjalan, lalu hapus
  // dari DOM setelah animasi selesai.
  const dismiss = useCallback(
    (id: number) => {
      setToasts((prev) =>
        prev.map((toast) => (toast.id === id ? { ...toast, leaving: true } : toast))
      );
      const timer = setTimeout(() => forceRemove(id), EXIT_ANIM_MS);
      timersRef.current.add(timer);
    },
    [forceRemove]
  );

  const addToast = useCallback(
    (
      message: string,
      type: ToastType = "success",
      duration: number = 3000
    ) => {
      // Dedup: pesan identik yang masih tampil tidak ditumpuk ulang
      // (toast yang sedang dalam animasi keluar dianggap boleh masuk lagi).
      if (
        toasts.some(
          (t) => t.message === message && t.type === type && !t.leaving
        )
      ) {
        return;
      }

      const id = ++toastId;

      setToasts((prev) => {
        const next = [
          ...prev.map((t) => (t.leaving ? t : { ...t, leaving: false })),
          {
            id,
            message,
            type,
            leaving: false,
          },
        ];
        return next.slice(-MAX_TOASTS);
      });

      const timer = setTimeout(() => {
        timersRef.current.delete(timer);
        dismiss(id);
      }, duration);
      timersRef.current.add(timer);
    },
    [toasts, dismiss]
  );

  const toast: ToastContextType = useMemo(
    () => ({
      success: (message: string) => addToast(message, "success"),
      error: (message: string) => addToast(message, "error"),
      info: (message: string) => addToast(message, "info"),
      dismiss,
    }),
    [addToast, dismiss]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
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

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const bg =
    toast.type === "success"
      ? "bg-primary-600"
      : toast.type === "error"
        ? "bg-error-600"
        : "bg-primary-600";

  return (
    <div
      className={`${bg} max-w-[min(24rem,calc(100vw-2rem))] text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-auto ${
        toast.leaving ? "animate-toast-leave" : "animate-slide-in"
      }`}
    >
      <div className="flex items-start gap-2">
        <p className="min-w-0 flex-1 break-words">{toast.message}</p>
        <button
          type="button"
          aria-label="Tutup notifikasi"
          onClick={() => onDismiss(toast.id)}
          className="shrink-0 rounded p-0.5 text-white/70 hover:bg-white/15 hover:text-white transition"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
