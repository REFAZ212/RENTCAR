import { Link, useLocation } from 'react-router-dom';
import {
  LayoutGrid,
  ClipboardList,
  Car,
  Tags,
  Users,
  MapPin,
  FileBarChart,
  Warehouse,
  Settings,
  UserCheck,
  X,
} from 'lucide-react';
import logo from '../assets/logo.png';
import { useAuth } from '../contexts/AuthContext';

const allNavItems = [
  { path: '/', label: 'Dashboard', icon: LayoutGrid, roles: ['admin', 'petugas'] },
  { path: '/orders', label: 'Orders', icon: ClipboardList, roles: ['admin', 'petugas'] },
  { path: '/kendaraan', label: 'Kendaraan', icon: Car, roles: ['admin', 'petugas'] },
  { path: '/kategori-tipe', label: 'Kategori & Tipe', icon: Tags, roles: ['admin'] },
  { path: '/customers', label: 'Customers', icon: Users, roles: ['admin', 'petugas'] },
  { path: '/supir-calo', label: 'Supir & Calo', icon: UserCheck, roles: ['admin'] },
  { path: '/gps', label: 'GPS', icon: MapPin, roles: ['admin'] },
  { path: '/laporan', label: 'Laporan', icon: FileBarChart, roles: ['admin'] },
  { path: '/garasi', label: 'Garasi', icon: Warehouse, roles: ['admin'] },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const navItems = allNavItems.filter(item => item.roles.includes(user?.role ?? ''));

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-40 flex h-screen w-64 flex-col bg-ink-900 text-white transition-transform duration-200 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-ink-800 px-6 shrink-0">
          <img
            src={logo}
            alt="Pilar Karya Production"
            className="h-8 w-auto"
          />

          <button
            onClick={onClose}
            className="ml-auto text-ink-400 transition-colors hover:text-white lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 overflow-y-auto p-3">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-widest text-ink-400">
            Operasional
          </p>

          <div className="space-y-1">
            {navItems.map((item) => {
              const active = isActive(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-ink-800 text-brand-400'
                      : 'text-ink-200 hover:bg-ink-800 hover:text-white'
                  }`}
                >
                  {active && (
                    <div className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r bg-brand-500" />
                  )}

                  <item.icon
                    size={18}
                    className={
                      active ? 'text-brand-400' : 'text-ink-400'
                    }
                  />

                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-ink-800 p-3 shrink-0">
          {user?.role === 'admin' && (
            <Link
              to="/pengaturan"
              onClick={onClose}
              className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive('/pengaturan')
                  ? 'bg-ink-800 text-brand-400'
                  : 'text-ink-200 hover:bg-ink-800 hover:text-white'
              }`}
            >
              {isActive('/pengaturan') && (
                <div className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r bg-brand-500" />
              )}

              <Settings
                size={18}
                className={
                  isActive('/pengaturan')
                    ? 'text-brand-400'
                    : 'text-ink-400'
                }
              />

              Pengaturan
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}