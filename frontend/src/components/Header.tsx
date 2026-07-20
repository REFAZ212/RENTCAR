import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Menu, Search, Bell, ChevronDown, Plus, LogOut } from 'lucide-react';

interface HeaderUser {
  name?: string;
  role?: string;
}

interface HeaderProps {
  user?: HeaderUser | null;
  onMenuClick: () => void;
  onLogout: () => void;
  onNewBooking?: () => void; // opsional — kalau tidak dikirim, tombol "Booking Baru" tidak ditampilkan
}

function UserAvatar({ name }: { name?: string }) {
  const initials = (name || 'A')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-ink-700 to-ink-900 text-xs font-bold text-white">
      {initials}
    </div>
  );
}

/**
 * Confirm dialog sederhana inline — tidak butuh komponen/file terpisah.
 * Kalau kamu sudah/nanti punya komponen ConfirmDialog sendiri di project,
 * tinggal ganti blok ini dengan <ConfirmDialog ... /> milikmu.
 */
function LogoutConfirm({
  open,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex min-h-screen w-screen items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
        <h3 className="text-base font-semibold text-gray-900">Keluar dari akun?</h3>
        <p className="mt-1.5 text-sm text-gray-500">Kamu perlu masuk kembali untuk mengakses dashboard ini.</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-maint-500 px-4 py-2 text-sm font-medium text-white hover:bg-maint-600"
          >
            Ya, Keluar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function Header({ user, onMenuClick, onLogout, onNewBooking }: HeaderProps) {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-200 bg-white/80 px-4 py-4 backdrop-blur-sm sm:px-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 lg:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="relative hidden sm:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cari booking, unit, atau pelanggan..."
            className="w-80 rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-14 text-sm text-gray-600 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-400">
            ⌘K
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {onNewBooking && (
          <button
            onClick={onNewBooking}
            className="hidden items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 sm:flex"
          >
            <Plus size={16} />
            Booking Baru
          </button>
        )}

        <button className="relative rounded-full border border-gray-200 p-2 text-gray-500 hover:bg-gray-50">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-brand-500" />
        </button>

        <div className="relative">
          <button
            onClick={() => setShowUserMenu((v) => !v)}
            className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-gray-50"
          >
            <UserAvatar name={user?.name} />
            <div className="hidden text-left sm:block">
              <p className="text-sm font-medium leading-tight text-gray-700">{user?.name}</p>
              <p className="text-xs capitalize text-gray-400">{user?.role}</p>
            </div>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </button>

          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
              <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    setShowLogoutConfirm(true);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-maint-50 hover:text-maint-500"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <LogoutConfirm
        open={showLogoutConfirm}
        onConfirm={onLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </header>
  );
}