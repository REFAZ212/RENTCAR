import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Menu, Search, Bell, ChevronDown, Plus, LogOut, CheckCheck } from 'lucide-react';
import { notificationAPI, type AppNotification } from '../services/api';

const NOTIF_LINK_MAP: Record<string, string> = {
  order_baru: '/orders',
  garasi_baru: '/garasi',
  garasi_respon: '/garasi',
  garasi_timeout: '/garasi',
};

function getNotifLink(n: AppNotification): string | null {
  if (n.data?.link && typeof n.data.link === 'string') return n.data.link;
  return NOTIF_LINK_MAP[n.type] ?? null;
}

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
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await notificationAPI.unreadCount();
      setUnreadCount(res.data.count);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (!showNotifications) return;
    setLoadingNotifications(true);
    notificationAPI
      .list({ per_page: 15 })
      .then((res) => {
        const items = Array.isArray(res.data) ? res.data : (res.data as unknown as { data: AppNotification[] }).data ?? [];
        setNotifications(items);
      })
      .catch(() => {})
      .finally(() => setLoadingNotifications(false));
  }, [showNotifications]);

  useEffect(() => {
    if (!showNotifications) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  const handleMarkAsRead = async (id: number) => {
    try {
      await notificationAPI.markAsRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // silent
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
      setUnreadCount(0);
    } catch {
      // silent
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Baru saja';
    if (diffMin < 60) return `${diffMin}m lalu`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}j lalu`;
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

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

        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications((v) => !v)}
            className="relative rounded-full border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full z-30 mt-2 w-80 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl sm:w-96">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <h3 className="text-sm font-semibold text-gray-800">Notifikasi</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700"
                  >
                    <CheckCheck size={14} />
                    Tandai semua sudah dibaca
                  </button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {loadingNotifications ? (
                  <div className="py-8 text-center text-sm text-gray-400">Memuat...</div>
                ) : notifications.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-400">Tidak ada notifikasi</div>
                ) : (
                  notifications.map((n) => {
                    const link = getNotifLink(n);
                    return (
                    <button
                      key={n.id}
                      onClick={() => {
                        if (!n.read_at) handleMarkAsRead(n.id);
                        if (link) {
                          setShowNotifications(false);
                          navigate(link);
                        }
                      }}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition ${
                        link ? 'cursor-pointer' : ''
                      } hover:bg-gray-50 ${
                        !n.read_at ? 'bg-brand-50/30' : ''
                      }`}
                    >
                      <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${!n.read_at ? 'bg-brand-500' : 'bg-transparent'}`} />
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm ${!n.read_at ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                          {n.title}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{n.message}</p>
                        <p className="mt-1 text-[11px] text-gray-400">{formatTime(n.created_at)}</p>
                      </div>
                    </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

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