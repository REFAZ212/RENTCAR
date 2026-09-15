import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerAPI, type Customer } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { formatHpDisplay } from '../lib/format';
import ConfirmModal from '../components/ConfirmModal';
import { Search, Eye, Users, Trash2 } from 'lucide-react';

const inputClass =
  'w-full rounded-lg border border-black-200 px-3 py-2 text-sm text-black-900 outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500';

export default function Customers() {
  const { success: toastSuccess, error: toastError } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<Customer | null>(null);

  const canDelete = user?.role === 'admin_utama';

  const load = useCallback(() => {
    setLoading(true);
    customerAPI
      .list({ search })
      .then(({ data }) => setItems(data.data))
      .catch(() => toastError('Gagal memuat data customer'))
      .finally(() => setLoading(false));
  }, [search, toastError]);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-black-900">Data Pelanggan</h1>
        <p className="text-sm text-black-400">Daftar seluruh pelanggan rental</p>
      </div>

      <div className="rounded-xl border border-black-200 bg-white p-4 shadow-sm">
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
      </div>

      {/* Mobile: card list */}
      <div className="space-y-3 md:hidden">
        {loading ? (
          <div className="rounded-xl border border-black-200 bg-white p-12 text-center text-sm text-black-400 shadow-sm">
            Memuat data...
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-black-200 bg-white p-12 text-center shadow-sm">
            <Users size={40} className="mx-auto mb-3 text-black-400" />
            <p className="text-sm text-black-500">Tidak ada data customer</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-black-200 bg-white p-4 shadow-sm transition-colors active:bg-canvas"
              onClick={() => navigate(`/customers/${item.id}`)}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-600">
                  {item.nama_lengkap?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-black-900">{item.nama_lengkap}</p>
                  <p className="text-xs text-black-400">{formatHpDisplay(item.no_hp)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/customers/${item.id}`);
                    }}
                    className="rounded-lg p-2 text-black-400 transition-colors hover:bg-canvas hover:text-primary-500"
                    title="Lihat Detail"
                    aria-label="Lihat Detail"
                  >
                    <Eye size={18} />
                  </button>
                  {canDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDelete(item);
                      }}
                      className="rounded-lg p-2 text-black-400 transition-colors hover:bg-error-50 hover:text-error-600"
                      title="Hapus"
                      aria-label="Hapus"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-black-400">Email</p>
                  <p className="truncate text-black-700">{item.email || '-'}</p>
                </div>
                <div>
                  <p className="text-black-400">No. KTP</p>
                  <p className="truncate font-mono text-black-700">{item.no_ktp || '-'}</p>
                </div>
                <div>
                  <p className="text-black-400">Pesanan</p>
                  <p className="text-black-700">{item.orders_count ?? 0}</p>
                </div>
                <div>
                  <p className="text-black-400">Dokumen</p>
                  <div className="flex items-center gap-1.5">
                    {item.foto_ktp && <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-500">KTP</span>}
                    {item.foto_sim && <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-600">SIM</span>}
                    {!item.foto_ktp && !item.foto_sim && <span className="text-black-400">-</span>}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop/tablet: table */}
      <div className="hidden overflow-hidden rounded-xl border border-black-200 bg-white shadow-sm md:block">
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
                    <p className="text-sm text-black-500">Tidak ada data customer</p>
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
                      <div className="flex items-center gap-2">{item.nama_lengkap}</div>
                    </td>
                    <td className="px-4 py-3 text-black-700">{formatHpDisplay(item.no_hp)}</td>
                    <td className="px-4 py-3 text-black-600">{item.email || '-'}</td>
                    <td className="px-4 py-3 font-mono text-sm text-black-700">{item.no_ktp || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {item.foto_ktp && <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-500">KTP</span>}
                        {item.foto_sim && <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-600">SIM</span>}
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
                        {canDelete && (
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
        message={`Yakin ingin menghapus "${confirmDelete?.nama_lengkap}"? Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}