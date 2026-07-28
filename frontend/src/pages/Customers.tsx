import { useState, useEffect, useCallback } from 'react';
import { customerAPI, type Customer, type ListResponse } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { formatHpDisplay } from '../lib/format';

const inputClass =
  'w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-900 outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500';

export default function Customers() {
  const toast = useToast();
  const [items, setItems] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    customerAPI
      .list({ search })
      .then(({ data }: { data: ListResponse<Customer> }) => setItems(data.data))
      .catch(() => toast.error('Gagal memuat data customer'))
      .finally(() => setLoading(false));
  }, [search, toast]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">Customers</h1>
          <p className="text-sm text-ink-400">Customer terdaftar dari semua sumber pemesanan</p>
        </div>
      </div>

      <div className="rounded-xl border border-ink-200 bg-white p-4 shadow-sm">
        <div className="relative max-w-md">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
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
                <th className="px-4 py-3 text-left font-medium text-ink-400">No. KTP</th>
                <th className="px-4 py-3 text-left font-medium text-ink-400">Dokumen</th>
                <th className="px-4 py-3 text-left font-medium text-ink-400">Pesanan Terakhir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center">
                    <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                    <p className="text-sm text-ink-400">Memuat data...</p>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center">
                    <svg className="mx-auto mb-3 h-12 w-12 text-ink-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <p className="font-medium text-ink-700">Tidak ada data customer</p>
                    <p className="mt-1 text-sm text-ink-400">Customer akan muncul setelah ada pemesanan</p>
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isKatalog = item.latestOrder?.source === 'katalog' && item.latestOrder?.status_order === 'pending';
                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        isKatalog
                          ? 'bg-gradient-to-r from-amber-50/80 to-orange-50/50 hover:from-amber-100/60 hover:to-orange-50/70'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-ink-900">{item.nama_lengkap}</span>
                          {isKatalog && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200">
                              <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                              </svg>
                              Pesanan Katalog
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-ink-700">{formatHpDisplay(item.no_hp)}</td>
                      <td className="px-4 py-3 font-mono text-sm text-ink-700">{item.no_ktp || '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {item.foto_ktp && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rented-50 px-2 py-0.5 text-xs font-medium text-rented-500">
                              KTP
                            </span>
                          )}
                          {item.foto_sim && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-avail-50 px-2 py-0.5 text-xs font-medium text-avail-600">
                              SIM
                            </span>
                          )}
                          {!item.foto_ktp && !item.foto_sim && <span className="text-xs text-ink-400">-</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {item.latestOrder ? (
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-medium ${
                                item.latestOrder.status_order === 'completed' ? 'text-green-600' :
                                item.latestOrder.status_order === 'cancelled' ? 'text-red-500' :
                                item.latestOrder.status_order === 'active' ? 'text-blue-600' :
                                isKatalog ? 'text-amber-700' : 'text-ink-700'
                              }`}>
                                {item.latestOrder.status_order === 'pending' ? 'Menunggu' :
                                 item.latestOrder.status_order === 'confirmed' ? 'Dikonfirmasi' :
                                 item.latestOrder.status_order === 'active' ? 'Aktif' :
                                 item.latestOrder.status_order === 'completed' ? 'Selesai' : 'Dibatalkan'}
                              </span>
                              {item.latestOrder.source === 'katalog' && (
                                <span className="text-[10px] text-amber-600">via Katalog</span>
                              )}
                            </div>
                            {item.latestOrder.kendaraan && (
                              <span className="mt-0.5 text-xs text-ink-500">
                                {item.latestOrder.kendaraan.nama_kendaraan}
                              </span>
                            )}
                            <span className="text-[11px] text-ink-400">
                              Rp {item.latestOrder.harga_total.toLocaleString('id-ID')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-ink-400">Belum ada order</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
