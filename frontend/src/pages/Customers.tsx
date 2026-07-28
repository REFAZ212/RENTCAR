import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerAPI, type Customer } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { formatHpDisplay } from '../lib/format';
import { Search, Eye, Users } from 'lucide-react';

const inputClass =
  'w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-900 outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500';

export default function Customers() {
  const { error: toastError } = useToast();
  const navigate = useNavigate();
  const [items, setItems] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900">Data Pelanggan</h1>
        <p className="text-sm text-ink-400">Daftar seluruh pelanggan rental</p>
      </div>

      <div className="rounded-xl border border-ink-200 bg-white p-4 shadow-sm">
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            placeholder="Cari nama, no HP, no KTP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputClass} pl-10`}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-ink-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-ink-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-ink-400">Nama</th>
                <th className="px-4 py-3 text-left font-medium text-ink-400">No. HP</th>
                <th className="px-4 py-3 text-left font-medium text-ink-400">Email</th>
                <th className="px-4 py-3 text-left font-medium text-ink-400">No. KTP</th>
                <th className="px-4 py-3 text-left font-medium text-ink-400">Dokumen</th>
                <th className="px-4 py-3 text-left font-medium text-ink-400">Pesanan</th>
                <th className="px-4 py-3 text-left font-medium text-ink-400">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-200">
              {loading ? (
                <tr><td colSpan={7} className="p-12 text-center text-ink-400">Memuat data...</td></tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center">
                    <Users size={40} className="mx-auto mb-3 text-ink-300" />
                    <p className="text-sm text-ink-500">Tidak ada data customer</p>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={item.id}
                    className="cursor-pointer transition-colors hover:bg-gray-50"
                    onClick={() => navigate(`/customers/${item.id}`)}
                  >
                    <td className="px-4 py-3 font-medium text-ink-900">{item.nama_lengkap}</td>
                    <td className="px-4 py-3 text-ink-700">{formatHpDisplay(item.no_hp)}</td>
                    <td className="px-4 py-3 text-ink-600">{item.email || '-'}</td>
                    <td className="px-4 py-3 font-mono text-sm text-ink-700">{item.no_ktp || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {item.foto_ktp && <span className="rounded-full bg-rented-50 px-2 py-0.5 text-xs font-medium text-rented-500">KTP</span>}
                        {item.foto_sim && <span className="rounded-full bg-avail-50 px-2 py-0.5 text-xs font-medium text-avail-600">SIM</span>}
                        {!item.foto_ktp && !item.foto_sim && <span className="text-xs text-ink-400">-</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-600">{item.orders_count ?? 0}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/customers/${item.id}`);
                        }}
                        className="text-ink-400 hover:text-brand-500"
                        title="Lihat Detail"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
