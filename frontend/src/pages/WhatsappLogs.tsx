import { useState, useEffect, useCallback } from 'react';
import { whatsappLogAPI, type WhatsappLog } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { RefreshCw, RotateCcw } from 'lucide-react';

const typeLabels: Record<string, string> = {
  reminder_pembayaran: 'Pengingat Bayar',
  reminder_pengembalian: 'Pengingat Kembali H-1',
  perlu_verifikasi_freeze: 'Perlu Verifikasi',
  perlu_verifikasi_reminder: 'Reminder Verifikasi',
  perlu_verifikasi_auto_complete: 'Auto Complete',
  order_dikonfirmasi: 'Order Dikonfirmasi',
  order_disewakan: 'Order Disewakan',
  order_selesai: 'Order Selesai',
  order_dibatalkan: 'Order Dibatalkan',
  penugasan_driver: 'Penugasan Driver',
  task_inspeksi_petugas: 'Task Inspeksi (Pickup)',
  task_inspeksi_return: 'Task Inspeksi (Return)',
  supir_order_mulai: 'Supir Order Mulai',
  supir_order_selesai: 'Supir Order Selesai',
  reminder_pengembalian_supir: 'Pengingat Kembali Supir',
  hasil_inspeksi_pickup: 'Hasil Inspeksi Pickup',
  hasil_inspeksi_return: 'Hasil Inspeksi Return',
  test_gateway: 'Test Gateway',
  pembayaran_masuk: 'Pembayaran Masuk',
  booking_baru: 'Booking Baru',
  notifikasi_owner: 'Notifikasi Owner',
  notifikasi_customer: 'Notifikasi Customer',
  garasi: 'Garasi',
};

const statusStyles: Record<string, string> = {
  diantri: 'bg-accent-50 text-accent-600',
  gagal: 'bg-error-50 text-error-600',
  terkirim: 'bg-primary-50 text-primary-500',
  pending: 'bg-accent-100 text-black-400',
};

const statusLabels: Record<string, string> = {
  diantri: 'Diantri',
  gagal: 'Gagal',
  terkirim: 'Terkirim',
  pending: 'Pending',
};

function formatType(type: string): string {
  return typeLabels[type] ?? type;
}

export default function WhatsappLogsPage() {
  const toast = useToast();
  const [logs, setLogs] = useState<WhatsappLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [resending, setResending] = useState<number | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, per_page: 20 };
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.type = typeFilter;

      const res = await whatsappLogAPI.list(params);
      const d = res.data as { data: WhatsappLog[]; last_page?: number; total?: number };
      setLogs(d.data);
      setLastPage(d.last_page ?? 1);
      setTotal(d.total ?? 0);
    } catch {
      toast.error('Gagal memuat riwayat WhatsApp');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, typeFilter, toast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleRetry = async (log: WhatsappLog) => {
    setResending(log.id);
    try {
      await whatsappLogAPI.retry(log.id);
      toast.success('Pesan dikirim ulang');
      fetchLogs();
    } catch {
      toast.error('Gagal mengirim ulang pesan');
    } finally {
      setResending(null);
    }
  };

  const uniqueTypes = Array.from(new Set([...Object.keys(typeLabels)]));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-black-900">Riwayat WhatsApp</h1>
          <p className="text-sm text-black-500">
            {total} pesan menunggu proses atau gagal terkirim
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-black-200 rounded-lg text-sm font-medium text-black-700 hover:bg-canvas"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-black-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Semua Status</option>
          <option value="diantri">Diantri</option>
          <option value="gagal">Gagal</option>
          <option value="terkirim">Terkirim</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-black-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Semua Jenis</option>
          {uniqueTypes.map((t) => (
            <option key={t} value={t}>{typeLabels[t]}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-black-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="py-20 text-center text-black-400">
            <p className="text-lg font-medium">Tidak ada pesan bermasalah</p>
            <p className="text-sm mt-1">Semua pesan WhatsApp berjalan lancar.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-canvas border-b border-accent-100">
                  <th className="text-left px-4 py-3 font-medium text-black-600">Waktu</th>
                  <th className="text-left px-4 py-3 font-medium text-black-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-black-600">Nomor</th>
                  <th className="text-left px-4 py-3 font-medium text-black-600">Jenis</th>
                  <th className="text-left px-4 py-3 font-medium text-black-600">Order</th>
                  <th className="text-left px-4 py-3 font-medium text-black-600">Pesan</th>
                  <th className="text-right px-4 py-3 font-medium text-black-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-canvas/50 transition-colors">
                    <td className="px-4 py-3 text-black-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('id-ID', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[log.status_kirim] ?? 'bg-accent-100 text-black-400'}`}>
                        {statusLabels[log.status_kirim] ?? log.status_kirim}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-black-700 whitespace-nowrap">{log.nomor_tujuan}</td>
                    <td className="px-4 py-3 text-black-600 whitespace-nowrap">{formatType(log.type)}</td>
                    <td className="px-4 py-3">
                      {log.order ? (
                        <span className="font-medium text-primary-600">{log.order.kode_order}</span>
                      ) : (
                        <span className="text-black-400">-</span>
                      )}
                      {log.order?.customer?.nama_lengkap && (
                        <span className="block text-xs text-black-400">{log.order.customer.nama_lengkap}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-black-500 max-w-xs truncate" title={log.pesan}>
                      {log.pesan}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {(log.status_kirim === 'gagal' || log.status_kirim === 'diantri') && (
                        <button
                          onClick={() => handleRetry(log)}
                          disabled={resending === log.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-black-200 rounded-lg text-xs font-medium text-black-700 hover:bg-canvas disabled:opacity-50"
                        >
                          <RotateCcw className={`w-3.5 h-3.5 ${resending === log.id ? 'animate-spin' : ''}`} />
                          Kirim Ulang
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {lastPage > 1 && (
        <div className="flex items-center justify-between text-sm text-black-500">
          <span>Halaman {page} dari {lastPage}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 border border-black-200 rounded-lg disabled:opacity-40 hover:bg-canvas"
            >
              Sebelumnya
            </button>
            <button
              onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
              disabled={page >= lastPage}
              className="px-3 py-1.5 border border-black-200 rounded-lg disabled:opacity-40 hover:bg-canvas"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      )}
    </div>
  );
}