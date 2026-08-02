import { useState, useEffect, type ReactNode } from 'react';
import { isAxiosError } from 'axios';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { laporanAPI } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { formatHpDisplay, formatRupiah, formatRupiahShort } from '../lib/format';

/**
 * ─────────────────────────────────────────────────────────────
 * PALET WARNA — disamakan dengan tema Sidebar/Dashboard
 * ─────────────────────────────────────────────────────────────
 * Struktural (header, tombol, tab aktif) → ink / brand
 * Status positif (lunas, tersedia, selesai) → avail (hijau)
 * Status netral/berjalan (aktif, dikonfirmasi) → rented (biru)
 * Status negatif (batal, belum bayar, denda) → maint (merah)
 * Status menunggu/parsial → amber bawaan Tailwind (khusus warning,
 * tidak ada token dedicated di tema kita untuk "menunggu")
 *
 * Untuk chart, warna diambil langsung dari CSS variable Tailwind v4
 * (var(--color-primary-500), dst) — supaya tetap 1 sumber kebenaran
 * dengan app.css, tidak ada duplikasi hex code.
 */

type StatusOrder = 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';
type StatusPembayaran = 'unpaid' | 'partial' | 'paid';
type StatusPengiriman = 'belum_diambil' | 'sudah_diantarkan' | 'dalam_penyewaan' | 'selesai';
type MetodeBayar = 'cash' | 'transfer' | 'qris' | 'lainnya';

const statusOrderLabels: Record<StatusOrder, string> = {
  pending: 'Menunggu',
  confirmed: 'Dikonfirmasi',
  active: 'Aktif',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

const statusPembayaranLabels: Record<StatusPembayaran, string> = {
  unpaid: 'Belum Bayar',
  partial: 'DP / Sebagian',
  paid: 'Lunas',
};

const statusPengirimanLabels: Record<StatusPengiriman, string> = {
  belum_diambil: 'Belum Diambil',
  sudah_diantarkan: 'Sudah Diantarkan',
  dalam_penyewaan: 'Dalam Penyewaan',
  selesai: 'Selesai',
};

const metodeBayarLabels: Record<MetodeBayar, string> = {
  cash: 'Tunai',
  transfer: 'Transfer',
  qris: 'QRIS',
  lainnya: 'Lainnya',
};

// Badge status — dipetakan ke token tema (avail/rented/maint/ink + amber bawaan)
const statusColors: Record<string, string> = {
  pending: 'bg-accent-100 text-accent-700',
  confirmed: 'bg-primary-50 text-primary-500',
  active: 'bg-accent-50 text-accent-600',
  completed: 'bg-black-200 text-black-700',
  cancelled: 'bg-error-50 text-error-600',
  unpaid: 'bg-error-50 text-error-600',
  partial: 'bg-accent-100 text-accent-700',
  paid: 'bg-accent-50 text-accent-600',
  belum_diambil: 'bg-accent-100 text-accent-700',
  sudah_diantarkan: 'bg-primary-50 text-primary-500',
  dalam_penyewaan: 'bg-primary-100 text-primary-600',
  selesai: 'bg-black-200 text-black-700',
  tersedia: 'bg-success-50 text-success-600',
  disewa: 'bg-primary-50 text-primary-500',
  maintenance: 'bg-error-50 text-error-600',
};

// Warna ikon StatCard — dipetakan by makna, bukan asal warna
const ICON_BG = {
  brand: 'bg-primary-500',
  brandDark: 'bg-primary-700',
  avail: 'bg-success-500',
  maint: 'bg-error-500',
  rented: 'bg-primary-500',
  ink: 'bg-black-700',
} as const;

const tabs = [
  { key: 'ringkasan', label: 'Ringkasan', icon: 'M9 3v18M3 9h18M3 15h18M3 3h18v18H3V3z' },
  {
    key: 'pendapatan',
    label: 'Pendapatan',
    icon: 'M12 8c-1.66 0-3 .9-3 2s1.34 2 3 2 3 .9 3 2-1.34 2-3 2m0-8V6m0 2c1.66 0 3 .9 3 2m-3 6v2m0-2c-1.66 0-3-.9-3-2M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    key: 'kendaraan',
    label: 'Kendaraan',
    icon: 'M5 17h14M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0M5 17V9a1 1 0 011-1h1l2-4h6l2 4h1a1 1 0 011 1v8',
  },
  {
    key: 'customer',
    label: 'Customer',
    icon: 'M12 12a4 4 0 100-8 4 4 0 000 8zm0 0c-4 0-7 2-7 4.5V19h14v-2.5C19 14 16 12 12 12z',
  },
  {
    key: 'order',
    label: 'Order',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 7h6m-6 4h6',
  },
  {
    key: 'bagi-hasil',
    label: 'Bagi Hasil',
    icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
  },
  {
    key: 'komisi-calo',
    label: 'Komisi Calo',
    icon: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a4 4 0 10-4-4',
  },
] as const;

type TabKey = (typeof tabs)[number]['key'];

const ICONS = {
  order: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 7h6m-6 4h6',
  check: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  x: 'M6 18L18 6M6 6l12 12',
  money: 'M12 8c-1.66 0-3 .9-3 2s1.34 2 3 2 3 .9 3 2-1.34 2-3 2m0-8V6m0 2c1.66 0 3 .9 3 2m-3 6v2m0-2c-1.66 0-3-.9-3-2M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  alert: 'M12 9v2m0 4h.01M4.93 19h14.14a1 1 0 00.87-1.5L12.87 4.5a1 1 0 00-1.74 0L4.06 17.5A1 1 0 004.93 19z',
  wallet: 'M3 7a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z M16 12h.01',
  car: 'M5 17h14M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0M5 17V9a1 1 0 011-1h1l2-4h6l2 4h1a1 1 0 011 1v8',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zm0 0c-4 0-7 2-7 4.5V19h14v-2.5C19 14 16 12 12 12z',
  home: 'M3 12l2-2m0 0l7-7 7 7m-14 0v8a2 2 0 002 2h3m9-10l2 2m-2-2v8a2 2 0 01-2 2h-3m-6 0a2 2 0 002-2v-4a2 2 0 012-2h0a2 2 0 012 2v4a2 2 0 002 2m-6 0h6',
  users: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a4 4 0 10-4-4',
  trend: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
} as const;

const defaultStart = () => {
  const parts = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).split(' ');
  const datePart = parts[0]; // YYYY-MM-DD
  return `${datePart.substring(0, 7)}-01`;
};

const defaultEnd = () => {
  const parts = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).split(' ');
  return parts[0]; // YYYY-MM-DD
};



interface DateParams {
  start_date: string;
  end_date: string;
}

/* ─────────────────────────────────────────────────────────────
 * TYPE — bentuk data dari API (sesuaikan dengan response asli)
 * ───────────────────────────────────────────────────────────── */
interface RingkasanData {
  order: { total: number; pending: number; confirmed: number; active: number; selesai: number; dibatalkan: number };
  keuangan: { pendapatan: number; denda: number; total_penerimaan: number; rata_rata_order: number };
  kendaraan: { disewa: number; total: number; utilisasi_persen: number };
  pertumbuhan: { customer_baru: number; kendaraan_baru: number };
  garasi: { pending: number; direspon: number };
}

interface PendapatanPeriodeRow {
  periode: string;
  total_order: number;
  total_pendapatan: number;
  total_denda: number;
  rata_rata: number;
}

interface MetodePembayaranRow {
  metode_pembayaran: MetodeBayar;
  total_order: number;
  total_pendapatan: number;
  rata_rata: number;
}

interface PendapatanKategoriRow {
  nama_kategori: string;
  total_order: number;
  total_pendapatan: number;
  total_denda: number;
  rata_rata: number;
}

interface PendapatanData {
  ringkasan: { total_pendapatan: number; total_denda: number; total_order: number; total_customer: number; rata_rata_order: number };
  pendapatan_periode: PendapatanPeriodeRow[];
  metode_pembayaran: MetodePembayaranRow[];
  pendapatan_kategori?: PendapatanKategoriRow[];
}

interface KendaraanTerpopulerRow {
  id: number;
  nama_kendaraan: string;
  plat_nomor: string;
  kategori?: { nama_kategori: string };
  merek: string;
  model: string;
  tahun: number;
  harga_sewa_per_hari: number;
  orders_count: number;
  orders_sum_harga_total: number;
  orders_avg_durasi_hari: number | null;
}

interface KategoriStatRow {
  nama_kategori: string;
  total_kendaraan: number;
  disewa: number;
  tersedia: number;
}

interface KendaraanData {
  kendaraan_terpopuler: KendaraanTerpopulerRow[];
  status_kendaraan: { status: string; total: number }[];
  kategori_stats?: KategoriStatRow[];
}

interface CustomerTopRow {
  id: number;
  nama_lengkap: string;
  no_hp: string;
  email?: string | null;
  alamat?: string | null;
  orders_count: number;
  orders_sum_harga_total: number;
  rata_rata_durasi_hari: number | null;
}

interface CustomerData {
  customer_top: CustomerTopRow[];
  ringkasan: { total_customer: number; customer_baru: number; customer_aktif: number; customer_repeat: number };
}

interface OrderTerbaruRow {
  id: number;
  kode_order: string;
  customer?: { nama_lengkap: string };
  kendaraan?: { nama_kendaraan: string; plat_nomor: string };
  durasi_hari: number;
  harga_total: number;
  status_order: StatusOrder;
  status_pembayaran: StatusPembayaran;
  status_pengiriman: StatusPengiriman;
}

interface OrderData {
  order: {
    total_order: number;
    total_pendapatan: number;
    total_denda: number;
    rata_rata_durasi: number;
    status_order: { status_order: StatusOrder; total: number }[];
    status_pembayaran: { status_pembayaran: StatusPembayaran; total: number }[];
    status_pengiriman: { status_pengiriman: StatusPengiriman; total: number }[];
  };
  order_terbaru: OrderTerbaruRow[];
}

interface BagiHasilRow {
  partner_id: number;
  nama_garasi: string;
  nama_pemilik: string;
  persentase: number;
  total_order: number;
  total_pendapatan: number;
  total_denda: number;
  total_bagi_hasil: number;
}

interface BagiHasilData {
  data: BagiHasilRow[];
  ringkasan: { grand_total_pendapatan: number; grand_total_bagi_hasil: number; jumlah_partner: number };
}

interface KomisiCaloRow {
  calo_id: number;
  nama: string;
  no_hp: string;
  total_order: number;
  total_pendapatan: number;
  total_komisi: number;
}

interface KomisiCaloData {
  data: KomisiCaloRow[];
  ringkasan: { grand_total_pendapatan: number; grand_total_komisi: number; jumlah_calo: number };
}

/* ─────────────────────────────────────────────────────────────
 * KOMPONEN DASAR
 * ───────────────────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-black-200">
      <div className="skeleton mb-4 h-9 w-9 rounded-xl" />
      <div className="skeleton mb-3 h-3 w-24" />
      <div className="skeleton h-7 w-32" />
    </div>
  );
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-black-200">
      <div className="border-b border-black-200 p-5">
        <div className="skeleton h-5 w-40" />
      </div>
      <div className="divide-y divide-black-200">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <div className="skeleton h-3 w-1/4" />
            <div className="skeleton h-3 w-1/6" />
            <div className="skeleton ml-auto h-3 w-1/6" />
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ label = 'Belum ada data' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-5 py-12 text-black-400">
      <svg className="h-9 w-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 13h6m-6-4h6m2 9H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}

function SectionCard({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-black-200">
      <div className="flex items-center justify-between border-b border-black-200 px-5 py-4">
        <h3 className="font-semibold text-black-900">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function StatCard({
  label,
  value,
  mono,
  icon,
  iconBg,
}: {
  label: ReactNode;
  value: ReactNode;
  mono?: boolean;
  icon: string;
  iconBg: string;
}) {
  return (
    <div className="group rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-black-200 transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
        <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
        </svg>
      </div>
      <p className="mb-1 text-xs font-medium text-black-400">{label}</p>
      <p className={`truncate text-xl font-bold text-black-900 ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}

/* Tooltip custom untuk chart Rupiah, biar konsisten format id-ID */
function RupiahTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-black-200 bg-surface px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-black-900">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {formatRupiah(p.value)}
        </p>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * CHART — Tren Pendapatan per Periode (Area Chart)
 * ───────────────────────────────────────────────────────────── */
function RevenueAreaChart({ data }: { data: PendapatanPeriodeRow[] }) {
  if (data.length === 0) return <EmptyState label="Belum ada data pendapatan" />;

  return (
    <div className="h-72 w-full p-5">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="fillPendapatan" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-primary-500)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--color-primary-500)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-black-200)" vertical={false} />
          <XAxis dataKey="periode" tick={{ fontSize: 11, fill: 'var(--color-black-400)' }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--color-black-400)' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => formatRupiahShort(v)}
            width={48}
          />
          <Tooltip content={<RupiahTooltip />} />
          <Area
            type="monotone"
            dataKey="total_pendapatan"
            name="Pendapatan"
            stroke="var(--color-primary-500)"
            strokeWidth={2}
            fill="url(#fillPendapatan)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * CHART — Metode Pembayaran (Pie Chart)
 * ───────────────────────────────────────────────────────────── */
const PIE_COLORS = ['var(--color-primary-500)', 'var(--color-primary-500)', 'var(--color-accent-500)', 'var(--color-error-500)'];

function PaymentMethodPieChart({ data }: { data: MetodePembayaranRow[] }) {
  if (data.length === 0) return <EmptyState label="Belum ada data pembayaran" />;

  const chartData = data.map((row) => ({
    name: metodeBayarLabels[row.metode_pembayaran] || row.metode_pembayaran,
    value: row.total_pendapatan,
  }));

  return (
    <div className="h-72 w-full p-5">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => formatRupiah(value)} />
          <Legend verticalAlign="bottom" height={32} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * CHART — Distribusi Status Order (Donut)
 * ───────────────────────────────────────────────────────────── */
const STATUS_ORDER_COLOR_VAR: Record<StatusOrder, string> = {
  pending: '#FFC20F', // accent gold
  confirmed: 'var(--color-primary-500)',
  active: 'var(--color-accent-500)',
  completed: 'var(--color-black-700)',
  cancelled: 'var(--color-error-500)',
};

function OrderStatusDonut({ order }: { order: RingkasanData['order'] }) {
  const chartData: { name: string; value: number; status: StatusOrder }[] = [
    { name: statusOrderLabels.pending, value: order.pending, status: 'pending' as StatusOrder },
    { name: statusOrderLabels.confirmed, value: order.confirmed, status: 'confirmed' as StatusOrder },
    { name: statusOrderLabels.active, value: order.active, status: 'active' as StatusOrder },
    { name: statusOrderLabels.completed, value: order.selesai, status: 'completed' as StatusOrder },
    { name: statusOrderLabels.cancelled, value: order.dibatalkan, status: 'cancelled' as StatusOrder },
  ].filter((d) => d.value > 0);

  if (chartData.length === 0) return <EmptyState label="Belum ada order" />;

  return (
    <div className="h-64 w-full p-5">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
            {chartData.map((d) => (
              <Cell key={d.status} fill={STATUS_ORDER_COLOR_VAR[d.status]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend verticalAlign="bottom" height={32} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * CHART — Disewa vs Tersedia per Kategori (Bar Chart)
 * ───────────────────────────────────────────────────────────── */
function KategoriBarChart({ data }: { data: KategoriStatRow[] }) {
  if (data.length === 0) return <EmptyState label="Belum ada data kategori" />;

  return (
    <div className="h-72 w-full p-5">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-black-200)" vertical={false} />
          <XAxis dataKey="nama_kategori" tick={{ fontSize: 11, fill: 'var(--color-black-400)' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--color-black-400)' }} axisLine={false} tickLine={false} width={32} />
          <Tooltip />
          <Legend verticalAlign="top" height={28} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="disewa" name="Disewa" fill="var(--color-primary-500)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="tersedia" name="Tersedia" fill="var(--color-success-500)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * TAB — Ringkasan
 * ───────────────────────────────────────────────────────────── */
function RingkasanTab({ params }: { params: DateParams }) {
  const [data, setData] = useState<RingkasanData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    laporanAPI
      .ringkasan(params)
      .then((res) => {
        const d = (res.data as { data: Record<string, unknown> }).data;
        setData({
          order: {
            total: d.total_orders as number,
            pending: d.pending_orders as number,
            confirmed: d.confirmed_orders as number,
            active: d.active_orders as number,
            selesai: d.completed_orders as number,
            dibatalkan: d.cancelled_orders as number,
          },
          keuangan: {
            pendapatan: d.total_revenue as number,
            denda: d.total_fines as number,
            total_penerimaan: ((d.total_revenue as number) + (d.total_fines as number)),
            rata_rata_order: d.avg_order_value as number,
          },
          kendaraan: {
            disewa: d.rented_vehicles as number,
            total: d.total_vehicles as number,
            utilisasi_persen: d.utilization as number,
          },
          pertumbuhan: {
            customer_baru: d.new_customers as number,
            kendaraan_baru: d.new_vehicles as number,
          },
          garasi: {
            pending: d.pending_garage_requests as number,
            direspon: d.answered_garage_requests as number,
          },
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const { order: o, keuangan: k, kendaraan: v, pertumbuhan: p, garasi: g } = data;

  const cards = [
    { label: 'Total Order', value: o.total, icon: ICONS.order, iconBg: ICON_BG.brand },
    { label: 'Order Pending', value: o.pending, icon: ICONS.alert, iconBg: ICON_BG.ink },
    { label: 'Order Aktif', value: o.active, icon: ICONS.car, iconBg: ICON_BG.rented },
    { label: 'Order Dibatalkan', value: o.dibatalkan, icon: ICONS.x, iconBg: ICON_BG.maint },
    { label: 'Pendapatan (Lunas)', value: formatRupiah(k.pendapatan), mono: true, icon: ICONS.money, iconBg: ICON_BG.avail },
    { label: 'Denda Overtime', value: formatRupiah(k.denda), mono: true, icon: ICONS.alert, iconBg: ICON_BG.maint },
    { label: 'Total Penerimaan', value: formatRupiah(k.total_penerimaan), mono: true, icon: ICONS.wallet, iconBg: ICON_BG.brandDark },
    {
      label: 'Utilisasi Kendaraan',
      value: `${v.disewa}/${v.total} (${v.utilisasi_persen}%)`,
      icon: ICONS.car,
      iconBg: ICON_BG.rented,
    },
    { label: 'Customer Baru', value: p.customer_baru, icon: ICONS.user, iconBg: ICON_BG.brand },
    { label: 'Kendaraan Baru', value: p.kendaraan_baru, icon: ICONS.car, iconBg: ICON_BG.brand },
    { label: 'Garasi Pending', value: g.pending, icon: ICONS.home, iconBg: ICON_BG.ink },
    { label: 'Garasi Direspon', value: g.direspon, icon: ICONS.home, iconBg: ICON_BG.avail },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      <SectionCard title="Distribusi Status Order">
        <OrderStatusDonut order={o} />
      </SectionCard>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * TAB — Pendapatan
 * ───────────────────────────────────────────────────────────── */
function PendapatanTab({ params }: { params: DateParams }) {
  const [data, setData] = useState<PendapatanData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    laporanAPI
      .pendapatan(params)
      .then((res) => setData(res.data as PendapatanData))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TableSkeleton />
        <TableSkeleton />
      </div>
    );
  }
  if (!data) return null;

  const { ringkasan, pendapatan_periode, metode_pembayaran, pendapatan_kategori } = data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total Pendapatan" value={formatRupiah(ringkasan.total_pendapatan)} mono icon={ICONS.money} iconBg={ICON_BG.avail} />
        <StatCard label="Total Denda" value={formatRupiah(ringkasan.total_denda)} mono icon={ICONS.alert} iconBg={ICON_BG.maint} />
        <StatCard label="Total Order" value={ringkasan.total_order} icon={ICONS.order} iconBg={ICON_BG.brand} />
        <StatCard label="Total Customer" value={ringkasan.total_customer} icon={ICONS.user} iconBg={ICON_BG.rented} />
        <StatCard label="Rata-rata/Order" value={formatRupiah(ringkasan.rata_rata_order)} mono icon={ICONS.trend} iconBg={ICON_BG.brandDark} />
      </div>

      <SectionCard title="Tren Pendapatan per Periode">
        <RevenueAreaChart data={pendapatan_periode} />
      </SectionCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="Pendapatan Per Periode">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-canvas">
                <tr>
                  <th className="px-5 py-3 text-left font-medium text-black-400">Periode</th>
                  <th className="px-5 py-3 text-right font-medium text-black-400">Order</th>
                  <th className="px-5 py-3 text-right font-medium text-black-400">Pendapatan</th>
                  <th className="px-5 py-3 text-right font-medium text-black-400">Denda</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black-200">
                {pendapatan_periode.map((row) => (
                  <tr key={row.periode} className="transition-colors hover:bg-canvas">
                    <td className="px-5 py-3 font-medium text-black-900">{row.periode}</td>
                    <td className="px-5 py-3 text-right text-black-700">{row.total_order}</td>
                    <td className="px-5 py-3 text-right font-mono text-black-900">{formatRupiah(row.total_pendapatan)}</td>
                    <td className="px-5 py-3 text-right font-mono text-black-700">{formatRupiah(row.total_denda)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pendapatan_periode.length === 0 && <EmptyState />}
          </div>
        </SectionCard>

        <SectionCard title="Metode Pembayaran">
          <PaymentMethodPieChart data={metode_pembayaran} />
        </SectionCard>
      </div>

      {pendapatan_kategori && pendapatan_kategori.length > 0 && (
        <SectionCard title="Pendapatan Per Kategori Kendaraan">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-canvas">
                <tr>
                  <th className="px-5 py-3 text-left font-medium text-black-400">Kategori</th>
                  <th className="px-5 py-3 text-right font-medium text-black-400">Order</th>
                  <th className="px-5 py-3 text-right font-medium text-black-400">Pendapatan</th>
                  <th className="px-5 py-3 text-right font-medium text-black-400">Denda</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black-200">
                {pendapatan_kategori.map((row) => (
                  <tr key={row.nama_kategori} className="transition-colors hover:bg-canvas">
                    <td className="px-5 py-3 font-medium text-black-900">{row.nama_kategori}</td>
                    <td className="px-5 py-3 text-right text-black-700">{row.total_order}</td>
                    <td className="px-5 py-3 text-right font-mono text-black-900">{formatRupiah(row.total_pendapatan)}</td>
                    <td className="px-5 py-3 text-right font-mono text-black-700">{formatRupiah(row.total_denda)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * TAB — Kendaraan
 * ───────────────────────────────────────────────────────────── */
function KendaraanTab({ params }: { params: DateParams }) {
  const [data, setData] = useState<KendaraanData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    laporanAPI
      .kendaraan(params)
      .then((res) => setData(res.data as KendaraanData))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TableSkeleton />
        <TableSkeleton />
      </div>
    );
  }
  if (!data) return null;

  const { kendaraan_terpopuler, status_kendaraan, kategori_stats } = data;
  const totalKendaraan = status_kendaraan.reduce((sum, s) => sum + s.total, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Kendaraan" value={totalKendaraan} icon={ICONS.car} iconBg={ICON_BG.rented} />
        {status_kendaraan.map((s) => (
          <StatCard
            key={s.status}
            label={<span className="capitalize">{s.status}</span>}
            value={s.total}
            icon={ICONS.car}
            iconBg={s.status === 'tersedia' ? ICON_BG.avail : s.status === 'maintenance' ? ICON_BG.maint : ICON_BG.rented}
          />
        ))}
      </div>

      {kategori_stats && kategori_stats.length > 0 && (
        <SectionCard title="Disewa vs Tersedia per Kategori">
          <KategoriBarChart data={kategori_stats} />
        </SectionCard>
      )}

      <SectionCard title="Kendaraan Terpopuler">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-canvas">
              <tr>
                <th className="px-5 py-3 text-left font-medium text-black-400">#</th>
                <th className="px-5 py-3 text-left font-medium text-black-400">Nama</th>
                <th className="px-5 py-3 text-left font-medium text-black-400">Plat</th>
                <th className="px-5 py-3 text-left font-medium text-black-400">Kategori</th>
                <th className="px-5 py-3 text-right font-medium text-black-400">Harga/Hari</th>
                <th className="px-5 py-3 text-right font-medium text-black-400">Order</th>
                <th className="px-5 py-3 text-right font-medium text-black-400">Pendapatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black-200">
              {kendaraan_terpopuler.map((k, i) => (
                <tr key={k.id} className="transition-colors hover:bg-canvas">
                  <td className="px-5 py-3 text-black-400">{i + 1}</td>
                  <td className="px-5 py-3 font-medium text-black-900">{k.nama_kendaraan}</td>
                  <td className="px-5 py-3 font-mono text-black-700">{k.plat_nomor}</td>
                  <td className="px-5 py-3 text-black-700">{k.kategori?.nama_kategori ?? '-'}</td>
                  <td className="px-5 py-3 text-right font-mono text-black-900">{formatRupiah(k.harga_sewa_per_hari)}</td>
                  <td className="px-5 py-3 text-right text-black-900">{k.orders_count}</td>
                  <td className="px-5 py-3 text-right font-mono text-black-900">{formatRupiah(k.orders_sum_harga_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {kendaraan_terpopuler.length === 0 && <EmptyState />}
        </div>
      </SectionCard>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * TAB — Customer
 * ───────────────────────────────────────────────────────────── */
function CustomerTab({ params }: { params: DateParams }) {
  const [data, setData] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    laporanAPI
      .customer(params)
      .then((res) => setData(res.data as CustomerData))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params]);

  if (loading) return <TableSkeleton />;
  if (!data) return null;

  const { customer_top, ringkasan } = data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Customer" value={ringkasan.total_customer} icon={ICONS.users} iconBg={ICON_BG.brand} />
        <StatCard label="Customer Baru" value={ringkasan.customer_baru} icon={ICONS.user} iconBg={ICON_BG.rented} />
        <StatCard label="Customer Aktif" value={ringkasan.customer_aktif} icon={ICONS.trend} iconBg={ICON_BG.avail} />
        <StatCard label="Customer Repeat" value={ringkasan.customer_repeat} icon={ICONS.users} iconBg={ICON_BG.brandDark} />
      </div>

      <SectionCard title="Top Customer">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-canvas">
              <tr>
                <th className="px-5 py-3 text-left font-medium text-black-400">#</th>
                <th className="px-5 py-3 text-left font-medium text-black-400">Nama</th>
                <th className="px-5 py-3 text-left font-medium text-black-400">No. HP</th>
                <th className="px-5 py-3 text-right font-medium text-black-400">Total Order</th>
                <th className="px-5 py-3 text-right font-medium text-black-400">Total Pengeluaran</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black-200">
              {customer_top.map((c, i) => (
                <tr key={c.id} className="transition-colors hover:bg-canvas">
                  <td className="px-5 py-3 text-black-400">{i + 1}</td>
                  <td className="px-5 py-3 font-medium text-black-900">{c.nama_lengkap}</td>
                  <td className="px-5 py-3 text-black-700">{formatHpDisplay(c.no_hp)}</td>
                  <td className="px-5 py-3 text-right text-black-900">{c.orders_count}</td>
                  <td className="px-5 py-3 text-right font-mono text-black-900">{formatRupiah(c.orders_sum_harga_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {customer_top.length === 0 && <EmptyState />}
        </div>
      </SectionCard>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * TAB — Order
 * ───────────────────────────────────────────────────────────── */
function OrderTab({ params }: { params: DateParams }) {
  const [data, setData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    laporanAPI
      .order(params)
      .then((res) => setData(res.data as OrderData))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TableSkeleton />
        <TableSkeleton />
      </div>
    );
  }
  if (!data) return null;

  const { order, order_terbaru } = data;
  const summaryCards = [
    { label: 'Total Order', value: order.total_order, icon: ICONS.order, iconBg: ICON_BG.brand },
    { label: 'Pendapatan (Lunas)', value: formatRupiah(order.total_pendapatan), mono: true, icon: ICONS.money, iconBg: ICON_BG.avail },
    { label: 'Denda Overtime', value: formatRupiah(order.total_denda), mono: true, icon: ICONS.alert, iconBg: ICON_BG.maint },
    { label: 'Rata-rata Durasi', value: `${Number(order.rata_rata_durasi ?? 0).toFixed(1)} hari`, icon: ICONS.trend, iconBg: ICON_BG.rented },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((c) => (
          <StatCard key={c.label} {...c} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <SectionCard title="Status Order">
          <div className="divide-y divide-black-200">
            {order.status_order.length === 0 ? (
              <EmptyState />
            ) : (
              order.status_order.map((s) => (
                <div key={s.status_order} className="flex items-center justify-between px-5 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[s.status_order]}`}>
                    {statusOrderLabels[s.status_order]}
                  </span>
                  <span className="text-sm font-semibold text-black-900">{s.total}</span>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard title="Status Pembayaran">
          <div className="divide-y divide-black-200">
            {order.status_pembayaran.length === 0 ? (
              <EmptyState />
            ) : (
              order.status_pembayaran.map((s) => (
                <div key={s.status_pembayaran} className="flex items-center justify-between px-5 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[s.status_pembayaran]}`}>
                    {statusPembayaranLabels[s.status_pembayaran]}
                  </span>
                  <span className="text-sm font-semibold text-black-900">{s.total}</span>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard title="Status Pengiriman">
          <div className="divide-y divide-black-200">
            {order.status_pengiriman.length === 0 ? (
              <EmptyState />
            ) : (
              order.status_pengiriman.map((s) => (
                <div key={s.status_pengiriman} className="flex items-center justify-between px-5 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[s.status_pengiriman]}`}>
                    {statusPengirimanLabels[s.status_pengiriman]}
                  </span>
                  <span className="text-sm font-semibold text-black-900">{s.total}</span>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Order Terbaru">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-canvas">
              <tr>
                <th className="px-5 py-3 text-left font-medium text-black-400">Kode</th>
                <th className="px-5 py-3 text-left font-medium text-black-400">Customer</th>
                <th className="px-5 py-3 text-left font-medium text-black-400">Kendaraan</th>
                <th className="px-5 py-3 text-right font-medium text-black-400">Total</th>
                <th className="px-5 py-3 text-center font-medium text-black-400">Order</th>
                <th className="px-5 py-3 text-center font-medium text-black-400">Bayar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black-200">
              {order_terbaru.map((o) => (
                <tr key={o.id} className="transition-colors hover:bg-canvas">
                  <td className="px-5 py-3 font-mono font-medium text-black-900">{o.kode_order}</td>
                  <td className="px-5 py-3 text-black-700">{o.customer?.nama_lengkap}</td>
                  <td className="px-5 py-3 text-black-700">{o.kendaraan?.nama_kendaraan}</td>
                  <td className="px-5 py-3 text-right font-mono text-black-900">{formatRupiah(o.harga_total)}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[o.status_order]}`}>
                      {statusOrderLabels[o.status_order]}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[o.status_pembayaran]}`}>
                      {statusPembayaranLabels[o.status_pembayaran]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {order_terbaru.length === 0 && <EmptyState label="Belum ada order" />}
        </div>
      </SectionCard>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * TAB — Bagi Hasil Partner
 * ───────────────────────────────────────────────────────────── */
function BagiHasilTab({ params }: { params: DateParams }) {
  const [data, setData] = useState<BagiHasilData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    laporanAPI
      .bagiHasil(params)
      .then((res) => setData(res.data as BagiHasilData))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }
  if (!data) return null;

  const { data: rows, ringkasan } = data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Jumlah Partner" value={ringkasan.jumlah_partner} icon={ICONS.users} iconBg={ICON_BG.brand} />
        <StatCard label="Total Pendapatan" value={formatRupiah(ringkasan.grand_total_pendapatan)} mono icon={ICONS.money} iconBg={ICON_BG.avail} />
        <StatCard label="Total Bagi Hasil" value={formatRupiah(ringkasan.grand_total_bagi_hasil)} mono icon={ICONS.wallet} iconBg={ICON_BG.brandDark} />
        <StatCard
          label="Rasio Bagi Hasil"
          value={ringkasan.grand_total_pendapatan > 0 ? `${((ringkasan.grand_total_bagi_hasil / ringkasan.grand_total_pendapatan) * 100).toFixed(1)}%` : '0%'}
          icon={ICONS.trend}
          iconBg={ICON_BG.rented}
        />
      </div>

      <SectionCard title="Detail Bagi Hasil per Partner">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-canvas">
              <tr>
                <th className="px-5 py-3 text-left font-medium text-black-400">#</th>
                <th className="px-5 py-3 text-left font-medium text-black-400">Nama Garasi</th>
                <th className="px-5 py-3 text-left font-medium text-black-400">Pemilik</th>
                <th className="px-5 py-3 text-center font-medium text-black-400">Persentase</th>
                <th className="px-5 py-3 text-right font-medium text-black-400">Order</th>
                <th className="px-5 py-3 text-right font-medium text-black-400">Pendapatan</th>
                <th className="px-5 py-3 text-right font-medium text-black-400">Denda</th>
                <th className="px-5 py-3 text-right font-medium text-black-400">Bagi Hasil</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black-200">
              {rows.map((r, i) => (
                <tr key={r.partner_id} className="transition-colors hover:bg-canvas">
                  <td className="px-5 py-3 text-black-400">{i + 1}</td>
                  <td className="px-5 py-3 font-medium text-black-900">{r.nama_garasi}</td>
                  <td className="px-5 py-3 text-black-700">{r.nama_pemilik}</td>
                  <td className="px-5 py-3 text-center">
                    <span className="rounded-full bg-primary-100 px-2.5 py-1 text-xs font-medium text-primary-600">{r.persentase}%</span>
                  </td>
                  <td className="px-5 py-3 text-right text-black-900">{r.total_order}</td>
                  <td className="px-5 py-3 text-right font-mono text-black-900">{formatRupiah(r.total_pendapatan)}</td>
                  <td className="px-5 py-3 text-right font-mono text-black-700">{formatRupiah(r.total_denda)}</td>
                  <td className="px-5 py-3 text-right font-mono font-semibold text-black-900">{formatRupiah(r.total_bagi_hasil)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <EmptyState label="Belum ada data bagi hasil" />}
        </div>
      </SectionCard>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * TAB — Komisi Calo
 * ───────────────────────────────────────────────────────────── */
function KomisiCaloTab({ params }: { params: DateParams }) {
  const [data, setData] = useState<KomisiCaloData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    laporanAPI
      .komisiCalo(params)
      .then((res) => setData(res.data as KomisiCaloData))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }
  if (!data) return null;

  const { data: rows, ringkasan } = data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Jumlah Calo" value={ringkasan.jumlah_calo} icon={ICONS.users} iconBg={ICON_BG.brand} />
        <StatCard label="Total Pendapatan" value={formatRupiah(ringkasan.grand_total_pendapatan)} mono icon={ICONS.money} iconBg={ICON_BG.avail} />
        <StatCard label="Total Komisi" value={formatRupiah(ringkasan.grand_total_komisi)} mono icon={ICONS.wallet} iconBg={ICON_BG.brandDark} />
        <StatCard
          label="Rasio Komisi"
          value={ringkasan.grand_total_pendapatan > 0 ? `${((ringkasan.grand_total_komisi / ringkasan.grand_total_pendapatan) * 100).toFixed(1)}%` : '0%'}
          icon={ICONS.trend}
          iconBg={ICON_BG.rented}
        />
      </div>

      <SectionCard title="Detail Komisi per Calo">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-canvas">
              <tr>
                <th className="px-5 py-3 text-left font-medium text-black-400">#</th>
                <th className="px-5 py-3 text-left font-medium text-black-400">Nama Calo</th>
                <th className="px-5 py-3 text-left font-medium text-black-400">No. HP</th>
                <th className="px-5 py-3 text-right font-medium text-black-400">Order</th>
                <th className="px-5 py-3 text-right font-medium text-black-400">Pendapatan</th>
                <th className="px-5 py-3 text-right font-medium text-black-400">Komisi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black-200">
              {rows.map((r, i) => (
                <tr key={r.calo_id} className="transition-colors hover:bg-canvas">
                  <td className="px-5 py-3 text-black-400">{i + 1}</td>
                  <td className="px-5 py-3 font-medium text-black-900">{r.nama}</td>
                  <td className="px-5 py-3 text-black-700">{r.no_hp}</td>
                  <td className="px-5 py-3 text-right text-black-900">{r.total_order}</td>
                  <td className="px-5 py-3 text-right font-mono text-black-900">{formatRupiah(r.total_pendapatan)}</td>
                  <td className="px-5 py-3 text-right font-mono font-semibold text-black-900">{formatRupiah(r.total_komisi)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <EmptyState label="Belum ada data komisi calo" />}
        </div>
      </SectionCard>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * HALAMAN UTAMA
 * ───────────────────────────────────────────────────────────── */
export default function Laporan() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>('ringkasan');
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [exporting, setExporting] = useState(false);

  const params: DateParams = { start_date: startDate, end_date: endDate };

  const handleExportError = (err: unknown) => {
    console.error(err);
    if (isAxiosError(err) && err.response?.status === 401) {
      toast.error('Sesi telah berakhir, silakan login kembali');
    } else {
      toast.error('Gagal mengunduh laporan');
    }
  };

  const downloadBlob = (blobData: BlobPart, filename: string, format: 'csv' | 'xlsx') => {
    const blob = new Blob([blobData], {
      type: format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(blobUrl);
  };

  const handleDownload = async (format: 'csv' | 'xlsx') => {
    setExporting(true);
    try {
      const resp = await laporanAPI.export(activeTab, format, params);
      downloadBlob(resp.data, `laporan-${activeTab}-${startDate}-${endDate}.${format}`, format);
      toast.success('Laporan berhasil diunduh');
    } catch (err) {
      handleExportError(err);
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadAll = async () => {
    setExporting(true);
    try {
      const resp = await laporanAPI.export('all', 'xlsx', params);
      downloadBlob(resp.data, `laporan-semua-${startDate}-${endDate}.xlsx`, 'xlsx');
      toast.success('Semua laporan berhasil diunduh');
    } catch (err) {
      handleExportError(err);
    } finally {
      setExporting(false);
    }
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'ringkasan':
        return <RingkasanTab params={params} />;
      case 'pendapatan':
        return <PendapatanTab params={params} />;
      case 'kendaraan':
        return <KendaraanTab params={params} />;
      case 'customer':
        return <CustomerTab params={params} />;
      case 'order':
        return <OrderTab params={params} />;
      case 'bagi-hasil':
        return <BagiHasilTab params={params} />;
      case 'komisi-calo':
        return <KomisiCaloTab params={params} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header — gradasi ink gelap ke brand, senada dengan Sidebar */}
      <div className="rounded-2xl bg-gradient-to-r from-black-900 via-black-800 to-primary-700 p-6 text-white shadow-sm sm:p-7">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <h1 className="font-display text-2xl font-bold">Laporan</h1>
            <p className="mt-1 text-sm text-black-200">Pantau performa order, pendapatan, dan customer dalam satu tempat.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 backdrop-blur">
              <label htmlFor="start_date" className="text-xs font-medium text-black-200">
                Dari
              </label>
              <input
                id="start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-sm text-white outline-none [color-scheme:dark]"
              />
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 backdrop-blur">
              <label htmlFor="end_date" className="text-xs font-medium text-black-200">
                Sampai
              </label>
              <input
                id="end_date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-sm text-white outline-none [color-scheme:dark]"
              />
            </div>
            <div className="mx-1 h-6 w-px bg-white/20" />
            <button
              onClick={() => handleDownload('csv')}
              disabled={exporting}
              className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/20 disabled:opacity-50"
            >
              {exporting ? 'Mengunduh...' : 'CSV'}
            </button>
            <button
              onClick={() => handleDownload('xlsx')}
              disabled={exporting}
              className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-primary-600 shadow-sm transition-colors hover:bg-black-200 disabled:opacity-50"
            >
              {exporting ? 'Mengunduh...' : 'Excel'}
            </button>
            <div className="mx-1 h-6 w-px bg-white/20" />
            <button
              onClick={handleDownloadAll}
              disabled={exporting}
              className="flex items-center gap-1.5 rounded-lg bg-accent-500 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-accent-600 disabled:opacity-50"
            >
              {exporting ? 'Mengunduh...' : 'Download Semua'}
            </button>
          </div>
        </div>
      </div>

      {/* Tab navigasi */}
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-canvas p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              activeTab === tab.key ? 'bg-surface text-primary-600 shadow-sm' : 'text-black-400 hover:text-black-700'
            }`}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
            </svg>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="text-xs text-black-400">
        Periode: {startDate} s/d {endDate}
      </div>

      {renderTab()}
    </div>
  );
}