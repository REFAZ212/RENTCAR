import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { formatRupiah } from '../lib/format';
import {
  CheckCircle2,
  Wallet,
  TrendingUp,
  Users,
  AlertTriangle,
  Inbox,
  Car,
  Plus,
  ClipboardCheck,
  Warehouse,
  FileBarChart,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
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
  orders_hari_ini?: number;
  orders_kemarin?: number;
  pendapatan_kemarin?: number | null;
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

interface ActivityLogItem {
  id: string;
  type: 'order' | 'garasi' | 'inspeksi';
  tipe_event: string;
  label: string;
  kode: string;
  detail: string;
  link_order_id?: number | null;
  waktu: string;
}

interface DashboardData {
  stats: DashboardStats;
  recent_orders: OrderItem[];
  recent_garasi_requests: GarasiRequestItem[];
  orders_saya_supiri?: OrderItem[];
  quick_actions?: { inspeksi_pending: number; garasi_pending: number };
  activity_log?: ActivityLogItem[];
  chart_pendapatan?: ChartPendapatanPoint[];
}

type TaskOrder = Order & { task_jenis: 'inspeksi_pickup' | 'kirim_kendaraan' | 'return' };

// Badge warna — token tema: primary (biru), accent (amber), success (hijau), error (merah)
const statusOrderColors: Record<string, string> = {
  pending: 'bg-accent-50 text-accent-600',
  confirmed: 'bg-primary-50 text-primary-500',
  active: 'bg-primary-100 text-primary-600',
  completed: 'bg-success-50 text-success-600',
  cancelled: 'bg-error-50 text-error-500',
};

// Aktivitas timeline color by type
const activityColors: Record<string, string> = {
  order: 'bg-primary-500',
  garasi: 'bg-accent-500',
  inspeksi: 'bg-success-500',
};

interface QuickAction {
  label: string;
  icon: typeof Plus;
  to: string;
  badge?: number;
  color: string;
  iconBg: string;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 11) return 'Selamat pagi';
  if (hour < 15) return 'Selamat siang';
  if (hour < 19) return 'Selamat sore';
  return 'Selamat malam';
}

function formatWaktuRelatif(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'baru saja';
  if (diffMin < 60) return `${diffMin}m lalu`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}j lalu`;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function diffPercent(current: number | undefined | null, previous: number | undefined | null): number | null {
  if (current === undefined || previous === undefined || current === null || previous === null) return null;
  if (Number.isNaN(current) || Number.isNaN(previous) || previous === 0) return null;
  return ((current - previous) / Math.max(Math.abs(previous), 1)) * 100;
}

function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-primary-100 p-5">
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
    <div className="bg-white rounded-2xl shadow-sm border border-primary-100">
      <div className="p-5 border-b border-primary-100">
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

function TrendBadge({ current, previous }: { current: number | undefined | null; previous: number | undefined | null }) {
  const pct = diffPercent(current, previous);
  if (pct === null) return null;
  const isUp = pct >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
        isUp ? 'bg-success-50 text-success-500' : 'bg-error-50 text-error-500'
      }`}
    >
      {isUp ? <ArrowUpRight size={11} strokeWidth={2.5} /> : <ArrowDownRight size={11} strokeWidth={2.5} />}
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

function quickActionSkeleton() {
  return (
    <div className="rounded-2xl border border-primary-100 bg-white p-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl skeleton" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 w-24 skeleton" />
          <div className="h-3 w-16 skeleton" />
        </div>
      </div>
    </div>
  );
}

function ActivityTimeline({ activities }: { activities: ActivityLogItem[] }) {
  if (activities.length === 0) {
    return (
      <div className="p-8 text-center">
        <Clock size={40} className="text-black-200 mx-auto mb-2" strokeWidth={1.5} />
        <p className="text-sm text-black-400">Belum ada aktivitas</p>
      </div>
    );
  }

  return (
    <div className="p-5">
      <div className="relative space-y-5">
        <div className="absolute left-[5px] top-2 bottom-2 w-px bg-black-200" aria-hidden />
        {activities.map((act) => (
          <div key={act.id} className="relative flex gap-3 pl-6">
            <span
              className={`absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${
                activityColors[act.type] || 'bg-primary-500'
              }`}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                {act.link_order_id ? (
                  <Link
                    to={`/orders/${act.link_order_id}`}
                    className="font-mono text-xs font-medium text-black-900 hover:text-primary-600"
                  >
                    {act.kode}
                  </Link>
                ) : (
                  <span className="font-mono text-xs font-medium text-black-700">{act.kode}</span>
                )}
                <span className="shrink-0 text-[11px] text-black-400">{formatWaktuRelatif(act.waktu)}</span>
              </div>
              <p className="text-sm text-black-700">{act.label}</p>
              {act.detail && <p className="text-xs text-black-400 truncate">{act.detail}</p>}
            </div>
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
    const fetchTasks = () => {
      inspeksiAPI
        .tasks()
        .then(({ data: res }) => setTasks(res))
        .catch(() => setTasks([]));
    };
    fetchTasks();
    const interval = setInterval(fetchTasks, 30000);
    return () => clearInterval(interval);
  }, [isPetugas]);

  const handleRangeChange = useCallback((range: 'Harian' | 'Mingguan' | 'Bulanan') => {
    setActiveRange(range);
    const map: Record<string, string> = { Harian: 'harian', Mingguan: 'mingguan', Bulanan: 'bulanan' };
    dashboardAPI
      .chart(map[range])
      .then(({ data: res }) => setChartData(res as unknown as ChartPendapatanPoint[]))
      .catch(() => {});
  }, []);

  const loadData = useCallback(() => {
    dashboardAPI
      .get()
      .then(({ data }) => {
        setData(data as unknown as DashboardData);
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Gagal memuat data dashboard');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  useEffect(() => {
    if (data?.chart_pendapatan && chartData.length === 0) {
      setChartData(data.chart_pendapatan);
    }
  }, [data, chartData.length]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 skeleton" />
          <div className="h-4 w-56 skeleton" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>{quickActionSkeleton()}</div>
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

  const { stats, recent_orders } = data;
  const quick_actions = data.quick_actions ?? { inspeksi_pending: 0, garasi_pending: 0 };
  const activities = data.activity_log ?? [];

  const orderActivityCount = activities.filter((a) => a.type === 'order').length;
  const todayOrderTip = stats.orders_aktif > 0 ? `${stats.orders_aktif} kendaraan sedang disewa` : 'tidak ada order aktif';
  const tipItems = [];

  if (isPetugas) {
    if (quick_actions.inspeksi_pending > 0) tipItems.push(`${quick_actions.inspeksi_pending} inspeksi menunggu`);
    if (tasks.length > 0) tipItems.push(`${tasks.length} tugas menanti`);
  }
  if (!isPetugas && quick_actions.garasi_pending > 0) tipItems.push(`${quick_actions.garasi_pending} permintaan garasi pending`);
  if (stats.orders_pending > 0) tipItems.push(`${stats.orders_pending} order menunggu konfirmasi`);

  const statCards = isPetugas
    ? [
        {
          key: 'kendaraan_tersedia',
          label: 'Kendaraan Tersedia',
          value: `${stats.kendaraan_tersedia}/${stats.total_kendaraan}`,
          rawValue: stats.kendaraan_tersedia,
          icon: CheckCircle2,
          iconBg: 'bg-primary-50',
          iconColor: 'text-primary-600',
          sparkColor: '#0d2e6b',
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
          trend: { current: stats.orders_hari_ini, previous: stats.orders_kemarin },
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
          iconBg: 'bg-primary-50',
          iconColor: 'text-primary-600',
          sparkColor: '#0d2e6b',
        },
        {
          key: 'pendapatan_hari',
          label: 'Pendapatan Hari Ini',
          value: formatRupiah(stats.pendapatan_hari_ini ?? 0),
          rawValue: stats.pendapatan_hari_ini ?? 0,
          icon: Wallet,
          iconBg: 'bg-primary-50',
          iconColor: 'text-primary-600',
          sparkColor: '#0d2e6b',
          trend: { current: stats.pendapatan_hari_ini ?? 0, previous: stats.pendapatan_kemarin ?? 0 },
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

  const quickActionList: QuickAction[] = isPetugas
    ? [
        {
          label: 'Inspeksi',
          icon: ClipboardCheck,
          to: '/inspeksi',
          badge: quick_actions.inspeksi_pending,
          color: 'text-primary-600',
          iconBg: 'bg-primary-50',
        },
        {
          label: 'Order Saya',
          icon: ClipboardCheck,
          to: '/orders',
          color: 'text-success-600',
          iconBg: 'bg-success-50',
        },
      ]
    : [
        {
          label: 'Booking Baru',
          icon: Plus,
          to: '/orders?new=true',
          color: 'text-primary-600',
          iconBg: 'bg-primary-50',
        },
        {
          label: 'Inspeksi',
          icon: ClipboardCheck,
          to: '/inspeksi',
          badge: quick_actions.inspeksi_pending,
          color: 'text-success-600',
          iconBg: 'bg-success-50',
        },
        {
          label: 'Garasi',
          icon: Warehouse,
          to: '/garasi',
          badge: quick_actions.garasi_pending,
          color: 'text-accent-600',
          iconBg: 'bg-accent-50',
        },
        {
          label: 'Laporan',
          icon: FileBarChart,
          to: '/laporan',
          color: 'text-black-700',
          iconBg: 'bg-black-900/5',
        },
      ];

  const timeLabel = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl border border-primary-100 bg-gradient-to-br from-primary-50 via-white to-accent-50 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold text-black-900">
              {getGreeting()}, {user?.name?.split(' ')[0] ?? 'Admin'}
            </h1>
            <p className="mt-1 text-sm text-black-400">
              {timeLabel} · {tipItems.length > 0 ? tipItems.map((t) => `• ${t}`).join(' · ') : todayOrderTip}
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm text-black-600 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success-500" />
            </span>
            Sistem berjalan normal
          </div>
        </div>
      </div>

      {/* Stat cards */}
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
            trend={
              card.trend && (
                <TrendBadge current={card.trend.current} previous={card.trend.previous} />
              )
            }
          />
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {quickActionList.map((qa) => (
          <Link
            key={qa.label}
            to={qa.to}
            className="group flex items-center gap-3 rounded-2xl border border-primary-100 bg-white p-4 text-left shadow-sm transition-all hover:border-primary-300 hover:shadow-md"
          >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${qa.iconBg}`}>
              <qa.icon size={20} className={qa.color} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-black-900">{qa.label}</p>
              {typeof qa.badge === 'number' && qa.badge > 0 && (
                <p className="text-xs text-accent-600 font-semibold">{qa.badge} menunggu</p>
              )}
            </div>
          </Link>
        ))}
      </div>

      {!isPetugas && <RevenueChart data={chartData} activeRange={activeRange} onRangeChange={handleRangeChange} />}

      {isPetugas ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tugas Menanti */}
          <div className="bg-white rounded-2xl shadow-sm border border-primary-100">
            <div className="flex items-center justify-between p-5 border-b border-primary-100">
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
                          task.task_jenis === 'return' ? 'bg-primary-100 text-primary-600' : 'bg-primary-50 text-primary-600'
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
          <div className="bg-white rounded-2xl shadow-sm border border-primary-100">
            <div className="flex items-center justify-between p-5 border-b border-primary-100">
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
                          statusOrderColors[order.status_order] || 'bg-primary-100 text-black-400'
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
            {/* Activity Timeline */}
            <div className="bg-white rounded-2xl shadow-sm border border-primary-100">
              <div className="flex items-center justify-between p-5 border-b border-primary-100">
                <div>
                  <h2 className="font-display font-semibold text-black-900">Aktivitas Terbaru</h2>
                  <p className="mt-0.5 text-xs text-black-400">{orderActivityCount} event order dalam 15 terbaru</p>
                </div>
                {user?.role === 'admin_utama' && (
                  <Link to="/activity-log" className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors">
                    Lihat Semua
                  </Link>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                <ActivityTimeline activities={activities} />
              </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-white rounded-2xl shadow-sm border border-primary-100">
              <div className="flex items-center justify-between p-5 border-b border-primary-100">
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
                    <Link
                      key={order.id}
                      to={`/orders/${order.id}`}
                      className="block p-4 hover:bg-canvas transition-colors"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-black-900 font-mono">{order.kode_order}</p>
                          <p className="text-xs text-black-400 truncate">
                            {order.customer?.nama_lengkap} — {order.kendaraan?.nama_kendaraan}
                          </p>
                        </div>
                        <span
                          className={`px-2.5 py-1 text-xs font-medium rounded-full shrink-0 ${
                            statusOrderColors[order.status_order] || 'bg-primary-100 text-black-400'
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
        </>
      )}
    </div>
  );
}