import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const navItems = [
  { path: '/', label: 'Dashboard', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" /></svg> },
  { path: '/orders', paths: ['/orders', '/customers', '/customers-orders'], label: 'Customers & Orders', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg> },
  { path: '/kategori-tipe', label: 'Kategori & Tipe', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4zm0 0h12a2 2 0 002 2v4a2 2 0 00-2 2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg> },
  { path: '/supir-calo', label: 'Supir & Calo', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> },
  { path: '/garasi', paths: ['/garasi', '/garasi-saya', '/garasi-partner', '/kendaraan'], label: 'Garasi & Kendaraan', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg> },
];

function UserAvatar({ name }) {
  const initials = (name || 'A').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
      {initials}
    </div>
  );
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden transition-opacity" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed top-0 left-0 z-40 w-64 h-screen bg-gray-900 text-white transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-3 h-16 px-6 border-b border-gray-800">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">CV</span>
          </div>
          <h1 className="text-lg font-bold tracking-tight">CVPILAR</h1>
          <button className="lg:hidden ml-auto text-gray-400 hover:text-white transition-colors" onClick={() => setSidebarOpen(false)}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = item.paths
              ? item.paths.includes(location.pathname)
              : location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-r" />}
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="lg:ml-64">
        <header className="sticky top-0 z-20 flex items-center justify-between h-16 px-4 sm:px-6 bg-white/80 backdrop-blur-sm border-b border-gray-200">
          <button className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors" onClick={() => setSidebarOpen(true)}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className="flex items-center gap-3 ml-auto">
            <div className="hidden sm:flex items-center gap-3">
              <UserAvatar name={user?.name} />
              <div>
                <p className="text-sm font-medium text-gray-900 leading-tight">{user?.name}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
            </div>
            <div className="w-px h-8 bg-gray-200 hidden sm:block" />
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        <main className="p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
