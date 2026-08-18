import { useSearchParams } from 'react-router-dom';
import Kendaraan from './Kendaraan';
import KategoriTipe from './KategoriTipe';
import { useAuth } from '../contexts/AuthContext';

const MANAGE_ROLES = ['admin_utama', 'admin_operasional'];

type TabKey = 'kendaraan' | 'kategori';

export default function KendaraanPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const canManage = MANAGE_ROLES.includes(user?.role ?? '');

  const param = searchParams.get('tab');
  const activeTab: TabKey =
    param === 'kategori' && canManage ? 'kategori' : 'kendaraan';

  const switchTab = (tab: TabKey) => {
    const next = new URLSearchParams(searchParams);
    if (tab === 'kategori') {
      next.set('tab', 'kategori');
    } else {
      next.delete('tab');
    }
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1 bg-accent-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => switchTab('kendaraan')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'kendaraan'
              ? 'bg-white text-primary-600 shadow-sm'
              : 'text-black-400 hover:text-black-700'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17h.01M16 17h.01M3 11l1.5-5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.4L21 11M3 11h18M3 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-6" /></svg>
          Kendaraan
        </button>
        {canManage && (
          <button
            onClick={() => switchTab('kategori')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'kategori'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-black-400 hover:text-black-700'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
            Kategori & Tipe
          </button>
        )}
      </div>

      {activeTab === 'kendaraan' && <Kendaraan />}
      {activeTab === 'kategori' && canManage && <KategoriTipe />}
    </div>
  );
}