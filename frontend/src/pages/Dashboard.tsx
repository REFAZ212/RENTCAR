import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { formatRupiah } from '../lib/format';
import {
  CheckCircle2,
  Wallet,
  TrendingUp,
  Building2,
  Users,
  AlertTriangle,
  Inbox,
  Car,
} from 'lucide-react';
import { dashboardAPI, inspeksiAPI, type Order } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import StatCard, { decorativeSparkline } from '../components/dashboard/StatCard';
import RevenueChart, { type ChartPendapatanPoint } from '../components/dashboard/RevenueChart';

interface DashboardStats {
  kendaraan_tersedia: number;
  total_kendaraan: number;
  pendapatan_hari_ini: number | null;
  pendapatan_bulan_ini: number | null;
  total_customer: number;
  orders_aktif: number;
  orders_pending: number;
}

interface OrderItem {
  id: number | string;
  kode_order: string;
  status_order: string;
  tanggal_mulai?: string;
  tanggal_selesai?: string;
  durasi_hari?: number;
  customer?: { nama_lengkap?: string };
  kendaraan?: { nama_kendaraan?: string };
}

interface GarasiRequestItem {
  id: number | string;
  status_permintaan: string;
  garasi_partner?: { nama_garasi?: string };
  order?: { kode_order?: string; kendaraan?: { nama_kendaraan?: string } };
}

interface DashboardData {
  stats: DashboardStats;
  recent_orders: OrderItem[];
  recent_garasi_requests: GarasiRequestItem[];
  orders_saya_supiri?: OrderItem[];
  // Opsional — baru ada isinya kalau backend sudah menambahkan field ini
  // di endpoint /api/dashboard (lihat komentar di RevenueChart.tsx).
  chart_pendapatan?: ChartPendapatanPoint[];
}

type TaskOrder = Order & { task_jenis: 'inspeksi_pickup' | 'kirim_kendaraan' | 'return' };

const statusColors: Record<string, string> = {
  pending: 'bg-primary-50 text-primary-600',
  confirmed: 'bg-primary-50 text-primary-500',
  active: 'bg-accent-50 text-accent-500',
  completed: 'bg-accent-100 text-black-400',
  cancelled: 'bg-error-50 text-error-500',
  tersedia: 'bg-success-50 text-success-500',
  tidak_terjawab: 'bg-error-50 text-error-500',
};

function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-accent-100 p-5">
      <div className="flex items-center justify-between">
        <div className="h-3 w-20 skeleton" />
        <div className="w-9 h-9 rounded-lg skeleton" />
      </div>
      <div className="mt-4 flex items-end justify-between">
        <div className="h-6 w-16 skeleton" />
        <div className="h-10 w-28 skeleton" />
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-accent-100">
      <div className="p-5 border-b border-accent-100">
        <div className="h-5 w-40 skeleton" />
      </div>
      <div className="p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg skeleton" />
            <div className="flex-1">
              <div className="h-3.5 w-32 skeleton mb-2" />
              <div className="h-3 w-48 skeleton" />
            </div>
            <div className="h-6 w-16 skeleton rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const isPetugas = user?.role === 'petugas';
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<ChartPendapatanPoint[]>([]);
  const [activeRange, setActiveRange] = useState<'Harian' | 'Mingguan' | 'Bulanan'>('Bulanan');
  const [tasks, setTasks] = useState<TaskOrder[]>([]);

  useEffect(() => {
    if (!isPetugas) return;
    inspeksiAPI
      .tasks()
      .then(({ data: res }) => setTasks(res))
      .catch(() => setTasks([]));
  }, [isPetugas]);

  const handleRangeChange = useCallback((range: 'Harian' | 'Mingguan' | 'Bulanan') => {
    setActiveRange(range);
    const map: Record<string, string> = { Harian: 'harian', Mingguan: 'mingguan', Bulanan: 'bulanan' };
    dashboardAPI
      .chart(map[range])
      .then(({ data: res }) => setChartData(res as unknown as ChartPendapatanPoint[]))
      .catch(() => {});
  }, []);

  useEffect(() => {
    dashboardAPI
      .get()
      .then(({ data }) => {
        setData(data as unknown as DashboardData);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Gagal memuat data dashboard');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (data?.chart_pendapatan && chartData.length === 0) {
      setChartData(data.chart_pendapatan);
    }
  }, [data, chartData.length]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-40 skeleton" />
          <div className="h-4 w-56 skeleton" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <div className="h-96 rounded-2xl skeleton" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ListSkeleton />
          <ListSkeleton />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle size={48} className="text-error-500 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-black-400 font-medium">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-3 text-sm text-primary-600 hover:underline">
            Muat ulang
          </button>
        </div>
      </div>
    );
  }

  const { stats, recent_orders, recent_garasi_requests } = data;

  const statCards = isPetugas
    ? [
        {
          key: 'kendaraan_tersedia',
          label: 'Kendaraan Tersedia',
          value: `${stats.kendaraan_tersedia}/${stats.total_kendaraan}`,
          rawValue: stats.kendaraan_tersedia,
          icon: CheckCircle2,
          iconBg: 'bg-accent-50',
          iconColor: 'text-accent-500',
          sparkColor: '#FFC20F',
        },
        {
          key: 'orders_aktif',
          label: 'Order Aktif',
          value: stats.orders_aktif,
          rawValue: stats.orders_aktif,
          icon: TrendingUp,
          iconBg: 'bg-primary-50',
          iconColor: 'text-primary-700',
          sparkColor: '#0d2e6b',
        },
        {
          key: 'orders_pending',
          label: 'Order Menunggu',
          value: stats.orders_pending,
          rawValue: stats.orders_pending,
          icon: Inbox,
          iconBg: 'bg-amber-50',
          iconColor: 'text-amber-600',
          sparkColor: '#d97706',
        },
        {
          key: 'total_customer',
          label: 'Total Customer',
          value: stats.total_customer,
          rawValue: stats.total_customer,
          icon: Users,
          iconBg: 'bg-black-900/5',
          iconColor: 'text-black-800',
          sparkColor: '#2a2a2a',
        },
      ]
    : [
        {
          key: 'kendaraan_tersedia',
          label: 'Kendaraan Tersedia',
          value: `${stats.kendaraan_tersedia}/${stats.total_kendaraan}`,
          rawValue: stats.kendaraan_tersedia,
          icon: CheckCircle2,
          iconBg: 'bg-accent-50',
          iconColor: 'text-accent-500',
          sparkColor: '#FFC20F',
        },
        {
          key: 'pendapatan_hari',
          label: 'Pendapatan Hari Ini',
          value: formatRupiah(stats.pendapatan_hari_ini ?? 0),
          rawValue: stats.pendapatan_hari_ini ?? 0,
          icon: Wallet,
          iconBg: 'bg-accent-50',
          iconColor: 'text-accent-600',
          sparkColor: '#e6a800',
        },
        {
          key: 'pendapatan_bulan',
          label: 'Pendapatan Bulan Ini',
          value: formatRupiah(stats.pendapatan_bulan_ini ?? 0),
          rawValue: stats.pendapatan_bulan_ini ?? 0,
          icon: TrendingUp,
          iconBg: 'bg-primary-50',
          iconColor: 'text-primary-700',
          sparkColor: '#0d2e6b',
        },
        {
          key: 'total_customer',
          label: 'Total Customer',
          value: stats.total_customer,
          rawValue: stats.total_customer,
          icon: Users,
          iconBg: 'bg-black-900/5',
          iconColor: 'text-black-800',
          sparkColor: '#2a2a2a',
        },
      ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-black-900">Dashboard</h1>
        <div className="text-sm text-black-400">
          {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <StatCard
            key={card.key}
            label={card.label}
            value={card.value}
            icon={card.icon}
            iconBg={card.iconBg}
            iconColor={card.iconColor}
            sparkData={decorativeSparkline(card.key, card.rawValue)}
            sparkColor={card.sparkColor}
            sparkId={`spark-${card.key}`}
          />
        ))}
      </div>

      {!isPetugas && <RevenueChart data={chartData} activeRange={activeRange} onRangeChange={handleRangeChange} />}

      {isPetugas ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tugas Menanti */}
          <div className="bg-white rounded-2xl shadow-sm border border-accent-100">
            <div className="flex items-center justify-between p-5 border-b border-accent-100">
              <h2 className="font-display font-semibold text-black-900">Tugas Menanti</h2>
              <Link to="/inspeksi" className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors">
                Buka Inspeksi
              </Link>
            </div>
            <div className="divide-y divide-black-200 max-h-96 overflow-y-auto">
              {tasks.length === 0 ? (
                <div className="p-8 text-center">
                  <Inbox size={40} className="text-black-200 mx-auto mb-2" strokeWidth={1.5} />
                  <p className="text-sm text-black-400">Tidak ada tugas menanti</p>
                </div>
              ) : (
                tasks.slice(0, 5).map((task) => (
                  <div key={`${task.task_jenis}-${task.id}`} className="p-4 hover:bg-canvas transition-colors">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-medium text-black-900">{task.kode_order}</p>
                        <p className="text-xs text-black-400 truncate">
                          {task.customer?.nama_lengkap} — {task.kendaraan?.nama_kendaraan}
                        </p>
                      </div>
                      <span
                        className={`px-2.5 py-1 text-xs font-medium rounded-full shrink-0 ${
                          task.task_jenis === 'return' ? 'bg-primary-100 text-primary-600' : 'bg-accent-50 text-accent-600'
                        }`}
                      >
                        {task.task_jenis === 'return' ? 'Return' : task.task_jenis === 'kirim_kendaraan' ? 'Kirim Kendaraan' : 'Inspeksi Pickup'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Order yang Saya Supiri */}
          <div className="bg-white rounded-2xl shadow-sm border border-accent-100">
            <div className="flex items-center justify-between p-5 border-b border-accent-100">
              <h2 className="font-display font-semibold text-black-900">Order yang Saya Supiri</h2>
            </div>
            <div className="divide-y divide-black-200 max-h-96 overflow-y-auto">
              {(data.orders_saya_supiri ?? []).length === 0 ? (
                <div className="p-8 text-center">
                  <Car size={40} className="text-black-200 mx-auto mb-2" strokeWidth={1.5} />
                  <p className="text-sm text-black-400">Belum ada order aktif sebagai supir</p>
                </div>
              ) : (
                (data.orders_saya_supiri ?? []).map((order) => (
                  <Link key={order.id} to={`/orders/${order.id}`} className="block p-4 hover:bg-canvas transition-colors">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-medium text-black-900">{order.kode_order}</p>
                        <p className="text-xs text-black-400 truncate">
                          {order.customer?.nama_lengkap} — {order.kendaraan?.nama_kendaraan}
                        </p>
                      </div>
                      <span
                        className={`px-2.5 py-1 text-xs font-medium rounded-full shrink-0 ${
                          statusColors[order.status_order] || 'bg-accent-100 text-black-400'
                        }`}
                      >
                        {order.status_order}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-2xl shadow-sm border border-accent-100">
          <div className="flex items-center justify-between p-5 border-b border-accent-100">
            <h2 className="font-display font-semibold text-black-900">Order Terbaru</h2>
            <Link to="/orders" className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors">
              Lihat Semua
            </Link>
          </div>
          <div className="divide-y divide-black-200 max-h-96 overflow-y-auto">
            {recent_orders.length === 0 ? (
              <div className="p-8 text-center">
                <Inbox size={40} className="text-black-200 mx-auto mb-2" strokeWidth={1.5} />
                <p className="text-sm text-black-400">Belum ada order</p>
              </div>
            ) : (
              recent_orders.map((order) => (
                <div key={order.id} className="p-4 hover:bg-canvas transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-black-900 font-mono">{order.kode_order}</p>
                      <p className="text-xs text-black-400 truncate">
                        {order.customer?.nama_lengkap} — {order.kendaraan?.nama_kendaraan}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 text-xs font-medium rounded-full shrink-0 ${
                        statusColors[order.status_order] || 'bg-accent-100 text-black-400'
                      }`}
                    >
                      {order.status_order}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Garasi Requests */}
        <div className="bg-white rounded-2xl shadow-sm border border-accent-100">
          <div className="flex items-center justify-between p-5 border-b border-accent-100">
            <h2 className="font-display font-semibold text-black-900">Permintaan Garasi Terbaru</h2>
            <Link to="/garasi" className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors">
              Lihat Semua
            </Link>
          </div>
          <div className="divide-y divide-black-200 max-h-96 overflow-y-auto">
            {recent_garasi_requests.length === 0 ? (
              <div className="p-8 text-center">
                <Building2 size={40} className="text-black-200 mx-auto mb-2" strokeWidth={1.5} />
                <p className="text-sm text-black-400">Belum ada permintaan</p>
              </div>
            ) : (
              recent_garasi_requests.map((req) => (
                <div key={req.id} className="p-4 hover:bg-canvas transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-black-900">{req.garasi_partner?.nama_garasi}</p>
                      <p className="text-xs text-black-400 truncate">
                        {req.order?.kode_order} — {req.order?.kendaraan?.nama_kendaraan}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 text-xs font-medium rounded-full shrink-0 ${
                        statusColors[req.status_permintaan] || 'bg-accent-100 text-black-400'
                      }`}
                    >
                      {req.status_permintaan}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
}