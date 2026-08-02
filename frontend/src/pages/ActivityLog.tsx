import { useState, useEffect, useCallback } from 'react';
import { activityLogAPI, type ActivityLog } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { RefreshCw } from 'lucide-react';

const subjectTypeLabels: Record<string, string> = {
  'App\\Models\\Order': 'Order',
  'App\\Models\\Customer': 'Customer',
  'App\\Models\\Kendaraan': 'Kendaraan',
  'App\\Models\\Pembayaran': 'Pembayaran',
  'App\\Models\\User': 'User',
  'App\\Models\\Kategori': 'Kategori',
  'App\\Models\\Tipe': 'Tipe',
  'App\\Models\\SupirCalo': 'Supir/Calo',
  'App\\Models\\GarasiPartner': 'Garasi Partner',
};

const eventLabels: Record<string, string> = {
  created: 'Dibuat',
  updated: 'Diubah',
  deleted: 'Dihapus',
};

const eventColors: Record<string, string> = {
  created: 'bg-accent-50 text-accent-600',
  updated: 'bg-primary-50 text-primary-500',
  deleted: 'bg-error-50 text-error-600',
};

function formatSubjectType(type: string | null): string {
  if (!type) return '-';
  return subjectTypeLabels[type] ?? type.split('\\').pop() ?? type;
}

function formatProperties(properties: Record<string, unknown>, event: string | null): string {
  if (!properties || Object.keys(properties).length === 0) return '';

  if (event === 'created') {
    const attrs = properties.attributes as Record<string, unknown> | undefined;
    if (attrs) {
      return Object.entries(attrs)
        .filter(([k]) => !['id', 'created_at', 'updated_at'].includes(k))
        .slice(0, 5)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
    }
  }

  if (event === 'updated') {
    const dirty = properties.attributes as Record<string, unknown> | undefined;
    const old = properties.old as Record<string, unknown> | undefined;
    if (dirty && old) {
      return Object.keys(dirty)
        .filter((k) => old[k] !== dirty[k] && !['updated_at'].includes(k))
        .slice(0, 5)
        .map((k) => `${k}: ${old[k]} → ${dirty[k]}`)
        .join(', ');
    }
  }

  return JSON.stringify(properties).slice(0, 120);
}

export default function ActivityLogPage() {
  const toast = useToast();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterSubject, setFilterSubject] = useState('');
  const [filterEvent, setFilterEvent] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, per_page: 20 };
      if (filterSubject) params.subject_type = filterSubject;
      if (filterEvent) params.event = filterEvent;
      if (search) params.search = search;

      const res = await activityLogAPI.list(params);
      const d = res.data as { data: ActivityLog[]; last_page?: number; total?: number };
      setLogs(d.data);
      setLastPage(d.last_page ?? 1);
      setTotal(d.total ?? 0);
    } catch {
      toast.error('Gagal memuat aktivitas');
    } finally {
      setLoading(false);
    }
  }, [page, filterSubject, filterEvent, search, toast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-black-900">Aktivitas Sistem</h1>
          <p className="text-sm text-black-500">{total} aktivitas tercatat</p>
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
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <input
            type="text"
            placeholder="Cari aktivitas..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex-1 px-3 py-2 border border-black-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600"
          >
            Cari
          </button>
        </form>
        <select
          value={filterSubject}
          onChange={(e) => { setFilterSubject(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-black-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Semua Model</option>
          {Object.entries(subjectTypeLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select
          value={filterEvent}
          onChange={(e) => { setFilterEvent(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-black-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Semua Event</option>
          <option value="created">Dibuat</option>
          <option value="updated">Diubah</option>
          <option value="deleted">Dihapus</option>
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
            <p className="text-lg font-medium">Tidak ada aktivitas</p>
            <p className="text-sm mt-1">Belum ada aktivitas sistem yang tercatat.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-canvas border-b border-accent-100">
                  <th className="text-left px-4 py-3 font-medium text-black-600">Waktu</th>
                  <th className="text-left px-4 py-3 font-medium text-black-600">Event</th>
                  <th className="text-left px-4 py-3 font-medium text-black-600">Model</th>
                  <th className="text-left px-4 py-3 font-medium text-black-600">Oleh</th>
                  <th className="text-left px-4 py-3 font-medium text-black-600">Detail</th>
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
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${eventColors[log.event ?? ''] ?? 'bg-accent-100 text-black-400'}`}>
                        {eventLabels[log.event ?? ''] ?? log.event}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-black-800">{formatSubjectType(log.subject_type)}</span>
                      {log.subject_id && (
                        <span className="ml-1 text-black-400">#{log.subject_id}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-black-600">
                      {log.causer?.name ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-black-500 max-w-xs truncate" title={formatProperties(log.properties, log.event)}>
                      {formatProperties(log.properties, log.event) || log.description}
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
