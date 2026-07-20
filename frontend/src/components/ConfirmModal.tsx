import type { ReactNode } from 'react';
import { AlertTriangle, Info } from 'lucide-react';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message?: string;
  children?: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export default function ConfirmModal({
  open,
  title,
  message,
  children,
  confirmLabel = 'Hapus',
  onConfirm,
  onCancel,
  danger = true,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[90] flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              danger ? 'bg-maint-50' : 'bg-brand-50'
            }`}
          >
            {danger ? (
              <AlertTriangle size={20} className="text-maint-500" />
            ) : (
              <Info size={20} className="text-brand-600" />
            )}
          </div>
          <h3 className="font-display text-lg font-semibold text-ink-900">{title}</h3>
        </div>

        {message && <p className="text-sm text-gray-600 mb-4">{message}</p>}
        {children && <div className="mb-6">{children}</div>}
        {!children && !message && <div className="mb-6" />}

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
              danger ? 'bg-maint-500 hover:bg-maint-600' : 'bg-avail-500 hover:bg-avail-600'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}