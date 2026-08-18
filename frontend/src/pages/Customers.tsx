import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerAPI, type Customer } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { formatHpDisplay } from '../lib/format';
import ConfirmModal from '../components/ConfirmModal';
import { Search, Eye, Users, Trash2, RotateCcw } from 'lucide-react';

const inputClass =
  'w-full rounded-lg border border-black-200 px-3 py-2 text-sm text-black-900 outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500';

const tabs = [
  { key: 'semua', label: 'Semua' },
  { key: 'arsip', label: 'Arsip' },
];

export default function Customers() {
  const { success: toastSuccess, error: toastError } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('semua');
  const [confirmDelete, setConfirmDelete] = useState<Customer | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<Customer | null>(null);

  const canManageArchive = user?.role === 'admin_utama';

  const load = useCallback(() => {
    setLoading(true);
    customerAPI
      .list({ search, trashed: tab === 'arsip' || undefined })
      .then(({ data }) => setItems(data.data))
      .catch(() => toastError('Gagal memuat data customer'))
      .finally(() => setLoading(false));
  }, [search, tab, toastError]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await customerAPI.delete(confirmDelete.id);
      toastSuccess('Customer berhasil dihapus');
    } catch {
      toastError('Gagal menghapus customer');
    }
    setConfirmDelete(null);
    load();
  };

  const handleRestore = async () => {
    if (!confirmRestore) return;
    try {
      await customerAPI.restore(confirmRestore.id);
      toastSuccess('Customer berhasil dipulihkan');
    } catch {
      toastError('Gagal memulihkan customer');
    }
    setConfirmRestore(null);
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-black-900">Data Pelanggan</h1>
        <p className="text-sm text-black-400">Daftar seluruh pelanggan rental</p>
      </div>

      <div className="rounded-xl border border-black-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-black-400" />
            <input
              type="text"
              placeholder="Cari nama, no HP, no KTP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${inputClass} pl-10`}
            />
          </div>
          <div className="flex gap-2">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  tab === t.key
                    ? 'bg-primary-500 text-white'
                    : 'bg-black-200 text-black-600 hover:bg-black-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-black-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-black-200 bg-canvas">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-black-400">Nama</th>
                <th className="px-4 py-3 text-left font-medium text-black-400">No. HP</th>
                <th className="px-4 py-3 text-left font-medium text-black-400">Email</th>
                <th className="px-4 py-3 text-left font-medium text-black-400">No. KTP</th>
                <th className="px-4 py-3 text-left font-medium text-black-400">Dokumen</th>
                <th className="px-4 py-3 text-left font-medium text-black-400">Pesanan</th>
                <th className="px-4 py-3 text-left font-medium text-black-400">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black-200">
              {loading ? (
                <tr><td colSpan={7} className="p-12 text-center text-black-400">Memuat data...</td></tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center">
                    <Users size={40} className="mx-auto mb-3 text-black-400" />
                    <p className="text-sm text-black-500">
                      {tab === 'arsip' ? 'Tidak ada customer di arsip' : 'Tidak ada data customer'}
                    </p>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={item.id}
                    className="cursor-pointer transition-colors hover:bg-canvas"
                    onClick={() => navigate(`/customers/${item.id}`)}
                  >
                    <td className="px-4 py-3 font-medium text-black-900">
                      <div className="flex items-center gap-2">
                        {item.nama_lengkap}
                        {item.deleted_at && (
                          <span className="rounded-full bg-black-200 px-2 py-0.5 text-xs font-medium text-black-500">Dihapus</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-black-700">{formatHpDisplay(item.no_hp)}</td>
                    <td className="px-4 py-3 text-black-600">{item.email || '-'}</td>
                    <td className="px-4 py-3 font-mono text-sm text-black-700">{item.no_ktp || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {item.foto_ktp && <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-500">KTP</span>}
                        {item.foto_sim && <span className="rounded-full bg-accent-50 px-2 py-0.5 text-xs font-medium text-accent-600">SIM</span>}
                        {!item.foto_ktp && !item.foto_sim && <span className="text-xs text-black-400">-</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-black-600">{item.orders_count ?? 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/customers/${item.id}`);
                          }}
                          className="text-black-400 hover:text-primary-500"
                          title="Lihat Detail"
                        >
                          <Eye size={16} />
                        </button>
                        {canManageArchive && item.deleted_at && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmRestore(item);
                            }}
                            className="text-black-400 hover:text-accent-600"
                            title="Pulihkan"
                          >
                            <RotateCcw size={16} />
                          </button>
                        )}
                        {canManageArchive && !item.deleted_at && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDelete(item);
                            }}
                            className="p-1.5 text-black-400 hover:text-error-600 hover:bg-error-50 rounded-lg transition-colors"
                            title="Hapus"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        open={!!confirmDelete}
        title="Hapus Customer"
        message={`Yakin ingin menghapus "${confirmDelete?.nama_lengkap}"? Data riwayat transaksinya tetap tersimpan dan bisa dipulihkan dari tab Arsip.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      <ConfirmModal
        open={!!confirmRestore}
        title="Pulihkan Customer"
        message={`Pulihkan customer "${confirmRestore?.nama_lengkap}" dari arsip?`}
        confirmLabel="Pulihkan"
        danger={false}
        onConfirm={handleRestore}
        onCancel={() => setConfirmRestore(null)}
      />
    </div>
  );
}