import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { formatRupiah } from '../lib/format';
import {
  CheckCircle2,
  ArrowLeftRight,
  ClipboardList,
  Clock,
  Wallet,
  TrendingUp,
  Building2,
  Users,
  AlertTriangle,
  Inbox,
} from 'lucide-react';
import { dashboardAPI } from '../services/api';
import StatCard, { decorativeSparkline } from '../components/dashboard/StatCard';
import RevenueChart, { type ChartPendapatanPoint } from '../components/dashboard/RevenueChart';

interface DashboardStats {
  kendaraan_tersedia: number;
  total_kendaraan: number;
  kendaraan_disewa: number;
  orders_aktif: number;
  orders_pending: number;
  pendapatan_hari_ini: number;
  pendapatan_bulan_ini: number;
  garasi_pending: number;
  total_customer: number;
}

interface OrderItem {
  id: number | string;
  kode_order: string;
  status_order: string;
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
  // Opsional — baru ada isinya kalau backend sudah menambahkan field ini
  // di endpoint /api/dashboard (lihat komentar di RevenueChart.tsx).
  chart_pendapatan?: ChartPendapatanPoint[];
}

const statusColors: Record<string, string> = {
  pending: 'bg-brand-50 text-brand-600',
  confirmed: 'bg-rented-50 text-rented-500',
  active: 'bg-avail-50 text-avail-500',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-maint-50 text-maint-500',
  tersedia: 'bg-avail-50 text-avail-500',
  tidak_terjawab: 'bg-maint-50 text-maint-500',
};

function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      <div className="p-5 border-b border-gray-100">
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
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<ChartPendapatanPoint[]>([]);
  const [activeRange, setActiveRange] = useState<'Harian' | 'Mingguan' | 'Bulanan'>('Bulanan');

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
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
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
          <AlertTriangle size={48} className="text-maint-500 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-gray-600 font-medium">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-3 text-sm text-brand-600 hover:underline">
            Muat ulang
          </button>
        </div>
      </div>
    );
  }

  const { stats, recent_orders, recent_garasi_requests } = data;

  const statCards = [
    {
      key: 'kendaraan_tersedia',
      label: 'Kendaraan Tersedia',
      value: `${stats.kendaraan_tersedia}/${stats.total_kendaraan}`,
      rawValue: stats.kendaraan_tersedia,
      icon: CheckCircle2,
      iconBg: 'bg-avail-50',
      iconColor: 'text-avail-500',
      sparkColor: '#0f6a2a',
    },
    {
      key: 'kendaraan_disewa',
      label: 'Sedang Disewa',
      value: stats.kendaraan_disewa,
      rawValue: stats.kendaraan_disewa,
      icon: ArrowLeftRight,
      iconBg: 'bg-rented-50',
      iconColor: 'text-rented-500',
      sparkColor: '#2f4b8f',
    },
    {
      key: 'orders_aktif',
      label: 'Order Aktif',
      value: stats.orders_aktif,
      rawValue: stats.orders_aktif,
      icon: ClipboardList,
      iconBg: 'bg-brand-50',
      iconColor: 'text-brand-600',
      sparkColor: '#2f4b8f',
    },
    {
      key: 'orders_pending',
      label: 'Order Pending',
      value: stats.orders_pending,
      rawValue: stats.orders_pending,
      icon: Clock,
      iconBg: 'bg-maint-50',
      iconColor: 'text-maint-500',
      sparkColor: '#c1121f',
    },
    {
      key: 'pendapatan_hari',
      label: 'Pendapatan Hari Ini',
      value: formatRupiah(stats.pendapatan_hari_ini),
      rawValue: stats.pendapatan_hari_ini,
      icon: Wallet,
      iconBg: 'bg-avail-50',
      iconColor: 'text-avail-600',
      sparkColor: '#0c5622',
    },
    {
      key: 'pendapatan_bulan',
      label: 'Pendapatan Bulan Ini',
      value: formatRupiah(stats.pendapatan_bulan_ini),
      rawValue: stats.pendapatan_bulan_ini,
      icon: TrendingUp,
      iconBg: 'bg-brand-50',
      iconColor: 'text-brand-700',
      sparkColor: '#1c2e59',
    },
    {
      key: 'garasi_pending',
      label: 'Garasi Pending',
      value: stats.garasi_pending,
      rawValue: stats.garasi_pending,
      icon: Building2,
      iconBg: 'bg-maint-50',
      iconColor: 'text-maint-600',
      sparkColor: '#9c0e19',
    },
    {
      key: 'total_customer',
      label: 'Total Customer',
      value: stats.total_customer,
      rawValue: stats.total_customer,
      icon: Users,
      iconBg: 'bg-ink-900/5',
      iconColor: 'text-ink-800',
      sparkColor: '#1c273f',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-ink-900">Dashboard</h1>
        <div className="text-sm text-gray-500">
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

      <RevenueChart data={chartData} activeRange={activeRange} onRangeChange={handleRangeChange} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h2 className="font-display font-semibold text-ink-900">Order Terbaru</h2>
            <Link to="/orders" className="text-sm text-brand-600 hover:text-brand-700 font-medium transition-colors">
              Lihat Semua
            </Link>
          </div>
          <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
            {recent_orders.length === 0 ? (
              <div className="p-8 text-center">
                <Inbox size={40} className="text-gray-300 mx-auto mb-2" strokeWidth={1.5} />
                <p className="text-sm text-gray-500">Belum ada order</p>
              </div>
            ) : (
              recent_orders.map((order) => (
                <div key={order.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-gray-900 font-mono">{order.kode_order}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {order.customer?.nama_lengkap} — {order.kendaraan?.nama_kendaraan}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 text-xs font-medium rounded-full shrink-0 ${
                        statusColors[order.status_order] || 'bg-gray-100 text-gray-600'
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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h2 className="font-display font-semibold text-ink-900">Permintaan Garasi Terbaru</h2>
            <Link to="/garasi" className="text-sm text-brand-600 hover:text-brand-700 font-medium transition-colors">
              Lihat Semua
            </Link>
          </div>
          <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
            {recent_garasi_requests.length === 0 ? (
              <div className="p-8 text-center">
                <Building2 size={40} className="text-gray-300 mx-auto mb-2" strokeWidth={1.5} />
                <p className="text-sm text-gray-500">Belum ada permintaan</p>
              </div>
            ) : (
              recent_garasi_requests.map((req) => (
                <div key={req.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-gray-900">{req.garasi_partner?.nama_garasi}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {req.order?.kode_order} — {req.order?.kendaraan?.nama_kendaraan}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 text-xs font-medium rounded-full shrink-0 ${
                        statusColors[req.status_permintaan] || 'bg-gray-100 text-gray-600'
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
    </div>
  );
}