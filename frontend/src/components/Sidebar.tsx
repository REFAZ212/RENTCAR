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
  History,
  ClipboardCheck,
  Shield,
} from 'lucide-react';
import logo from '../assets/logorentcar.png';
import { useAuth } from '../contexts/AuthContext';

const ROLES_ADMIN = ['admin_utama', 'admin_operasional'];
const ROLES_ALL = ['admin_utama', 'admin_operasional', 'petugas'];

interface NavItem {
  path: string;
  label: string;
  icon: typeof LayoutGrid;
  roles: string[];
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: 'Umum',
    items: [
      { path: '/admin', label: 'Dashboard', icon: LayoutGrid, roles: ROLES_ALL },
      { path: '/orders', label: 'Orders', icon: ClipboardList, roles: ROLES_ALL },
      { path: '/customers', label: 'Customers', icon: Users, roles: ROLES_ALL },
    ],
  },
  {
    title: 'Kendaraan',
    items: [
      { path: '/kendaraan', label: 'Kendaraan', icon: Car, roles: ROLES_ALL },
      { path: '/kategori-tipe', label: 'Kategori & Tipe', icon: Tags, roles: ROLES_ADMIN },
      { path: '/inspeksi', label: 'Inspeksi', icon: ClipboardCheck, roles: ROLES_ADMIN },
    ],
  },
  {
    title: 'Tim',
    items: [
      { path: '/supir-calo', label: 'Supir & Calo', icon: UserCheck, roles: ROLES_ADMIN },
      { path: '/garasi', label: 'Garasi', icon: Warehouse, roles: ROLES_ADMIN },
      { path: '/gps', label: 'GPS', icon: MapPin, roles: ROLES_ADMIN },
    ],
  },
  {
    title: 'Lainnya',
    items: [
      { path: '/laporan', label: 'Laporan', icon: FileBarChart, roles: ROLES_ADMIN },
      
      { path: '/users', label: 'Users', icon: Shield, roles: ['admin_utama'] },
      { path: '/activity-log', label: 'Aktivitas', icon: History, roles: ['admin_utama'] },
      { path: '/pengaturan', label: 'Pengaturan', icon: Settings, roles: ['admin_utama'] },
    ],
  },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const userRole = user?.role ?? '';

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-40 flex h-screen w-64 flex-col bg-black-900 text-white transition-transform duration-200 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-black-800 px-6 shrink-0">
          <img
            src={logo}
            alt="logo"
            className="h-8 w-auto"
          />
          <button
            onClick={onClose}
            className="ml-auto text-black-400 transition-colors hover:text-white lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 overflow-y-auto p-3">
          {navGroups.map((group) => {
            const visibleItems = group.items.filter((item) =>
              item.roles.includes(userRole)
            );

            if (visibleItems.length === 0) return null;

            return (
              <div key={group.title} className="mb-4">
                <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-widest text-black-400">
                  {group.title}
                </p>
                <div className="space-y-1">
                  {visibleItems.map((item) => {
                    const active = isActive(item.path);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={onClose}
                        className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                          active
                            ? 'bg-black-800 text-primary-400'
                            : 'text-black-200 hover:bg-black-800 hover:text-white'
                        }`}
                      >
                        {active && (
                          <div className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r bg-primary-500" />
                        )}
                        <item.icon
                          size={18}
                          className={active ? 'text-primary-400' : 'text-black-400'}
                        />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
