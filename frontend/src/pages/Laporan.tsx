import { useState, useEffect, useMemo, type ReactNode } from 'react';
import { isAxiosError } from 'axios';
import {
  Download,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  CalendarDays,
  Target,
  Wallet,
  Car,
  Handshake,
  Coins,
  CreditCard,
  TrendingUp,
  Loader2,
  Banknote,
  TriangleAlert,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react';
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
import { laporanAPI, garasiPartnerAPI, type GarasiPartner, type LaporanParams } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { formatRupiah, formatRupiahShort, formatTanggal, addDaysYmd, todayJakarta, monthRangeYmd, diffDaysYmd } from '../lib/format';
import { vehicleStatusLabels, type StatusKendaraan } from '../lib/vehicleStatus';

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

type StatusOrder = 'pending' | 'confirmed' | 'active' | 'perlu_verifikasi' | 'completed' | 'cancelled';
type StatusPembayaran = 'unpaid' | 'partial' | 'paid';
type StatusPengiriman = 'belum_diambil' | 'sudah_diantarkan' | 'dalam_penyewaan' | 'selesai' | 'sudah_dikembalikan';
type MetodeBayar = 'cash' | 'transfer' | 'qris' | 'lainnya';

const statusOrderLabels: Record<StatusOrder, string> = {
  pending: 'Menunggu',
  confirmed: 'Dikonfirmasi',
  active: 'Sedang Disewa',
  perlu_verifikasi: 'Perlu Verifikasi',
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
  sudah_dikembalikan: 'Sudah Dikembalikan',
};

const metodeBayarLabels: Record<MetodeBayar, string> = {
  cash: 'Tunai',
  transfer: 'Transfer',
  qris: 'QRIS',
  lainnya: 'Lainnya',
};

// Badge warna per domain status — token tema: primary (biru), accent (amber), success (hijau), error (merah)
const statusOrderColors: Record<string, string> = {
  pending: 'bg-accent-100 text-accent-700',
  confirmed: 'bg-primary-50 text-primary-500',
  active: 'bg-primary-100 text-primary-600',
  perlu_verifikasi: 'bg-accent-50 text-accent-700',
  completed: 'bg-success-50 text-success-600',
  cancelled: 'bg-error-50 text-error-600',
};

const statusPembayaranColors: Record<string, string> = {
  unpaid: 'bg-error-50 text-error-600',
  partial: 'bg-accent-100 text-accent-700',
  paid: 'bg-success-50 text-success-600',
};

const statusPengirimanColors: Record<string, string> = {
  belum_diambil: 'bg-accent-100 text-accent-700',
  sudah_diantarkan: 'bg-primary-50 text-primary-500',
  dalam_penyewaan: 'bg-primary-100 text-primary-600',
  selesai: 'bg-success-50 text-success-600',
  sudah_dikembalikan: 'bg-success-50 text-success-600',
};

// Warna ikon StatCard — konsisten biru tema (primary), bukan macam-macam
const ICON_BG = {
  brand: 'bg-primary-50 text-primary-600',
  brandDark: 'bg-primary-100 text-primary-700',
  avail: 'bg-primary-50 text-primary-600',
  maint: 'bg-primary-50 text-primary-600',
  rented: 'bg-primary-50 text-primary-600',
  ink: 'bg-primary-50 text-primary-600',
} as const;

const sections: { id: string; label: string; icon: LucideIcon }[] = [
  { id: 'detail-order', label: 'Detail Order', icon: FileText },
  { id: 'per-kategori', label: 'Per Kategori', icon: Target },
  { id: 'top-performa', label: 'Top Performa', icon: TrendingUp },
  { id: 'pendapatan', label: 'Pendapatan', icon: Wallet },
  { id: 'kendaraan', label: 'Kendaraan', icon: Car },
  { id: 'rekap-garasi', label: 'Rekap per Garasi', icon: Handshake },
  { id: 'komisi-calo', label: 'Komisi Calo', icon: Coins },
  { id: 'piutang', label: 'Piutang', icon: CreditCard },
];

const SEMUA_WAKTU_START = '2000-01-01';

const defaultStart = () => SEMUA_WAKTU_START;

const defaultEnd = () => todayJakarta();

type QuickRange = '7hari' | 'bulan' | 'semua' | 'kustom';

type PresetRange = Exclude<QuickRange, 'kustom'>;

const QUICK_RANGES: { key: QuickRange; label: string }[] = [
  { key: 'semua', label: 'Semua Waktu' },
  { key: '7hari', label: '7 Hari Terakhir' },
  { key: 'bulan', label: 'Bulan Ini' },
  { key: 'kustom', label: 'Kustom' },
];

function quickRangeDates(key: PresetRange): { start: string; end: string } {
  const today = todayJakarta();
  if (key === 'semua') return { start: SEMUA_WAKTU_START, end: today };
  if (key === '7hari') return { start: addDaysYmd(today, -6), end: today };
  return { start: monthRangeYmd(today).start, end: today };
}

interface DateParams {
  start_date: string;
  end_date: string;
}

/* Filter periode independen per bagian — state lokal (range preset + kustom) */
interface PeriodFilterState {
  range: QuickRange;
  setRange: (key: QuickRange) => void;
  custom: DateParams | null;
  handleManualChange: (which: 'start' | 'end', value: string) => void;
  params: DateParams;
  label: string;
}

function usePeriodFilter(toast: { error: (message: string) => void }): PeriodFilterState {
  const [range, setRangeState] = useState<QuickRange>('semua');
  const [custom, setCustom] = useState<DateParams | null>(null);

  const params = useMemo<DateParams>(() => {
    if (range === 'kustom') {
      const c = custom ?? { start_date: defaultStart(), end_date: defaultEnd() };
      return { start_date: c.start_date, end_date: c.end_date };
    }
    const r = quickRangeDates(range);
    return { start_date: r.start, end_date: r.end };
  }, [range, custom]);

  const label = useMemo(() => {
    if (range === 'kustom' && custom) {
      return `${formatTanggal(custom.start_date)} – ${formatTanggal(custom.end_date)}`;
    }
    return QUICK_RANGES.find((q) => q.key === range)?.label ?? 'Semua Waktu';
  }, [range, custom]);

  const setRange = (key: QuickRange) => {
    if (key === 'kustom') {
      setRangeState('kustom');
      setCustom({ start_date: params.start_date, end_date: params.end_date });
      return;
    }
    setRangeState(key);
    setCustom(null);
  };

  const handleManualChange = (which: 'start' | 'end', value: string) => {
    const current = custom ?? { start_date: params.start_date, end_date: params.end_date };
    const candidateStart = which === 'start' ? value : current.start_date;
    const candidateEnd = which === 'end' ? value : current.end_date;
    if (!candidateStart || !candidateEnd) {
      toast.error('Tanggal awal dan akhir harus diisi.');
      return;
    }
    if (candidateStart > candidateEnd) {
      toast.error('Tanggal awal tidak boleh melewati tanggal akhir.');
      return;
    }
    if (diffDaysYmd(candidateStart, candidateEnd) > 90) {
      toast.error('Rentang tanggal maksimal 90 hari.');
      return;
    }
    setCustom({ start_date: candidateStart, end_date: candidateEnd });
  };

  return { range, setRange, custom, handleManualChange, params, label };
}

function PeriodFilter({ state }: { state: PeriodFilterState }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap rounded-lg bg-canvas p-1">
        {QUICK_RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => state.setRange(r.key)}
            className={`shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              state.range === r.key
                ? 'bg-surface text-primary-600 shadow-sm ring-1 ring-black-200'
                : 'text-black-500 hover:text-black-800'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {state.range === 'kustom' && state.custom && (
        <div className="flex w-full flex-col gap-1.5 rounded-lg border border-black-200 bg-surface px-2.5 py-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-center gap-1.5">
            <CalendarDays className="h-4 w-4 shrink-0 text-black-400" />
            <input
              type="date"
              value={state.custom.start_date}
              max={todayJakarta()}
              onChange={(e) => state.handleManualChange('start', e.target.value)}
              className="w-full min-w-0 bg-transparent text-sm text-black-800 outline-none"
            />
          </div>
          <span className="shrink-0 self-start px-1 text-xs text-black-300 sm:self-center">s/d</span>
          <input
            type="date"
            value={state.custom.end_date}
            max={todayJakarta()}
            onChange={(e) => state.handleManualChange('end', e.target.value)}
            className="w-full min-w-0 bg-transparent text-sm text-black-800 outline-none"
          />
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * UTILITAS — export per bagian & komponen tabel standar
 * ───────────────────────────────────────────────────────────── */

type SectionExportType =
  | 'ringkasan'
  | 'pendapatan'
  | 'kendaraan'
  | 'customer'
  | 'order'
  | 'bagi-hasil'
  | 'komisi-calo'
  | 'piutang'
  | 'profitabilitas'
  | 'detail-order'
  | 'rekap-garasi'
  | 'per-kategori'
  | 'top-kendaraan'
  | 'top-pelanggan';

function downloadBlob(blobData: BlobPart, filename: string, format: 'csv' | 'xlsx') {
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
}

function exportErrorToast(err: unknown, toast: ReturnType<typeof useToast>): void {
  console.error(err);
  if (isAxiosError(err) && err.response?.status === 401) {
    toast.error('Sesi telah berakhir, silakan login kembali');
  } else {
    toast.error('Gagal mengunduh laporan');
  }
}

function ExportSectionButton({
  type,
  params,
  label,
  extraParams,
}: {
  type: SectionExportType;
  params: DateParams;
  label: string;
  extraParams?: Record<string, unknown>;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const handle = async () => {
    setBusy(true);
    try {
      const query = { ...params, ...extraParams };
      const resp = await laporanAPI.export(type, 'xlsx', query as LaporanParams);
      downloadBlob(resp.data, `laporan-${type}-${params.start_date}-${params.end_date}.xlsx`, 'xlsx');
      toast.success(`Laporan ${label} berhasil diunduh`);
    } catch (err) {
      exportErrorToast(err, toast);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handle}
      disabled={busy}
      title={`Unduh ${label} (Excel)`}
      className="flex h-8 items-center gap-1.5 rounded-lg border border-black-200 px-2.5 text-xs font-medium text-black-700 transition-colors hover:bg-canvas hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5 text-success-500" />}
      <span className="hidden sm:inline">Excel</span>
    </button>
  );
}

interface ColumnDef {
  label: string;
  align?: 'left' | 'right' | 'center';
  className?: string;
}

function DataTable({ columns, children, footer }: { columns: ColumnDef[]; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-black-200 bg-canvas/70">
          <tr>
            {columns.map((c) => (
              <th
                key={c.label}
                className={`px-5 py-3 whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-black-400 ${
                  c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left'
                } ${c.className ?? ''}`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-black-200">{children}</tbody>
        {footer}
      </table>
    </div>
  );
}

function TotalRow({ colSpan, totals, label = 'Total' }: { colSpan: number; totals: ReactNode[]; label?: string }) {
  return (
    <tfoot>
      <tr className="border-t-2 border-black-200 bg-canvas/70">
        <th scope="row" colSpan={colSpan} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-black-700">
          {label}
        </th>
        {totals.map((t, i) => (
          <td key={i} className="px-5 py-3 text-right text-sm font-semibold text-black-900">
            {t}
          </td>
        ))}
      </tr>
    </tfoot>
  );
}

function PaginationControls({
  pagination,
  onPage,
}: {
  pagination: DetailOrderData['pagination'];
  onPage: (p: number) => void;
}) {
  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-black-200 px-5 py-3 sm:flex-row">
      <span className="text-xs text-black-400">
        Menampilkan{' '}
        <span className="font-semibold text-black-700">
          {(pagination.current_page - 1) * pagination.per_page + 1}–
          {Math.min(pagination.current_page * pagination.per_page, pagination.total)}
        </span>{' '}
        dari <span className="font-semibold text-black-700">{pagination.total}</span> data
      </span>
      <div className="flex items-center gap-1">
        <button
          disabled={pagination.current_page <= 1}
          onClick={() => onPage(pagination.current_page - 1)}
          className="rounded-lg border border-black-200 bg-surface px-2.5 py-1.5 text-xs font-medium text-black-700 transition-colors hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-40"
        >
          Sebelumnya
        </button>
        {Array.from({ length: pagination.last_page }).map((_, i) => {
          const n = i + 1;
          const show = n === 1 || n === pagination.last_page || Math.abs(n - pagination.current_page) <= 1;
          if (!show) {
            const prevShown = n === 2 || (n === pagination.current_page - 2 && pagination.current_page > 3);
            return prevShown ? <span key={`e-${n}`} className="px-1 text-xs text-black-400">…</span> : null;
          }
          return (
            <button
              key={n}
              onClick={() => onPage(n)}
              className={`h-7 min-w-7 rounded-lg px-2 text-xs font-semibold transition-colors ${
                n === pagination.current_page ? 'bg-primary-500 text-white' : 'text-black-700 hover:bg-canvas'
              }`}
            >
              {n}
            </button>
          );
        })}
        <button
          disabled={pagination.current_page >= pagination.last_page}
          onClick={() => onPage(pagination.current_page + 1)}
          className="rounded-lg border border-black-200 bg-surface px-2.5 py-1.5 text-xs font-medium text-black-700 transition-colors hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-40"
        >
          Berikutnya
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * TYPE — bentuk data dari API (sesuaikan dengan response asli)
 * ───────────────────────────────────────────────────────────── */
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

interface PendapatanData {
  ringkasan: { total_pendapatan: number; total_denda: number; total_order: number; total_customer: number; rata_rata_order: number };
  pendapatan_periode: PendapatanPeriodeRow[];
  metode_pembayaran: MetodePembayaranRow[];
}

interface KategoriStatRow {
  nama_kategori: string;
  total_kendaraan: number;
  disewa: number;
  tersedia: number;
}

interface KendaraanData {
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
  tanggal_mulai?: string;
  tanggal_selesai?: string;
  durasi_hari: number;
  harga_total: number;
  status_order: StatusOrder;
  status_pembayaran: StatusPembayaran;
  status_pengiriman: StatusPengiriman;
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

interface GrowthApiResponse {
  pendapatan: { current: number; previous: number };
  denda: { current: number; previous: number };
  order: { current: number; previous: number };
  customer: { current: number; previous: number };
}

interface PiutangRow {
  order_id: number;
  kode_order: string;
  nama_customer: string;
  no_hp: string;
  kendaraan: string;
  tanggal_mulai: string | null;
  tanggal_pengembalian: string | null;
  harga_total: number;
  total_bayar: number;
  sisa_pembayaran: number;
  hari_tertunggak: number;
  aging: 'belum_tertunggak' | '1_30_hari' | '31_60_hari' | 'lebih_60_hari';
}

interface PiutangData {
  data: PiutangRow[];
  ringkasan: {
    total_piutang: number;
    total_tertunggak: number;
    jumlah_order: number;
    aging_buckets: Record<string, { count: number; total: number }>;
  };
}

interface RekapGarasiRow {
  garasi_partner_id: number;
  nama_garasi: string;
  persentase: number;
  order_count: number;
  pendapatan: number;
  denda: number;
  beban_partner: number;
  komisi: number;
  laba: number;
  bagi_hasil: number;
}

interface RekapGarasiData {
  partners: RekapGarasiRow[];
  grand_total: {
    order_count: number;
    pendapatan: number;
    denda: number;
    beban_partner: number;
    komisi: number;
    laba: number;
    bagi_hasil: number;
  };
}

interface InspeksiDetail {
  id: number;
  status: 'draft' | 'final';
  odometer: number | null;
  fuel_level: string | null;
  kondisi_body: string | null;
  kondisi_interior: string | null;
  kondisi_ban: string | null;
  kondisi_ac: string | null;
  kondisi_lampu: string | null;
  ada_damagenya: boolean;
  deskripsi_kondisi: string | null;
  checklist_serah_terima: string[] | null;
  biaya_kerusakan: number | null;
  ttd_customer: string | null;
  ttd_petugas: string | null;
  fotos: string[] | null;
  videos: string[] | null;
  catatan: string | null;
  inspeksi_oleh: string | null;
  waktu: string | null;
}

interface DetailOrderRow {
  order_id: number;
  kode_order: string;
  source: string;
  tanggal_order: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  tanggal_pengembalian_aktual: string | null;
  jam_mulai: string | null;
  jam_selesai: string | null;
  durasi_hari: number;
  nama_customer: string;
  no_hp: string;
  nama_admin?: string | null;
  nama_operator?: string | null;
  nama_supir?: string | null;
  nama_calo?: string | null;
  nama_kendaraan?: string | null;
  plat_nomor?: string | null;
  kategori?: string | null;
  tipe?: string | null;
  garasi_pemilik?: string | null;
  garasi_request: string[];
  status_order: StatusOrder;
  status_pembayaran: StatusPembayaran;
  metode_pembayaran: MetodeBayar | null;
  status_pengiriman: StatusPengiriman;
  metode_penyerahan: string;
  opsi_supir: string | null;
  harga_per_hari: number;
  harga_total: number;
  jam_overtime: number;
  denda_overtime: number;
  biaya_kerusakan: number | null;
  komisi_calo: number | null;
  beban_partner: number;
  laba: number;
  margin: number;
  alamat_jemput?: string | null;
  tujuan?: string | null;
  catatan?: string | null;
  alasan_pembatalan?: string | null;
  inspeksi_pickup: InspeksiDetail | null;
  inspeksi_return: InspeksiDetail | null;
  jarak_tempuh: number | null;
}

interface DetailOrderData {
  data: DetailOrderRow[];
  ringkasan: {
    total_order: number;
    total_harga: number;
    total_denda: number;
    total_komisi: number;
    total_beban: number;
    total_laba: number;
    margin_rata_rata: number;
  };
  pagination: { current_page: number; last_page: number; total: number; per_page: number };
}

interface DecisionKategoriRow {
  kategori_id: number | null;
  nama_kategori: string;
  jumlah_order: number;
  total_harga: number;
  total_beban: number;
  total_komisi: number;
  total_laba: number;
}

interface DecisionKendaraanRow {
  id: number;
  nama_kendaraan: string;
  plat_nomor: string;
  kategori: string;
  jumlah_order: number;
  total_harga: number;
  total_laba: number;
}

interface DecisionData {
  ringkasan: DetailOrderData['ringkasan'];
  per_kategori: DecisionKategoriRow[];
  top_kendaraan_terlaris: DecisionKendaraanRow[];
  top_kendaraan_menguntungkan: DecisionKendaraanRow[];
}

/* ─────────────────────────────────────────────────────────────
 * TYPE — bentuk respons mentah dari backend.
 * ReportController membungkus SEMUA endpoint laporan dalam
 * { data, periode } — interface ini mencerminkan isi `data`
 * yang dikembalikan ReportService saat ini.
 * ───────────────────────────────────────────────────────────── */
interface PendapatanApiResponse {
  summary: { total_revenue: number; total_fines: number; total_orders: number; distinct_customers: number; avg_order: number };
  pendapatan_periode: { periode: string; revenue: number; denda: number | null; orders: number }[];
  metode_pembayaran: { metode_pembayaran: MetodeBayar; revenue: number; orders: number }[];
  pendapatan_kategori: { nama_kategori: string; revenue: number; denda: number | null; orders: number }[];
}

interface KendaraanApiResponse {
  kendaraan_terpopuler: {
    kendaraan_id: number;
    nama_kendaraan: string;
    plat_nomor: string;
    kategori: string | null;
    harga_sewa_per_hari: number;
    order_count: number;
    total_revenue: number;
    avg_duration: number;
  }[];
  status_kendaraan: { status: string; count: number }[];
  kategori_stats: { nama_kategori: string; total: number; rented: number; available: number }[];
}

interface CustomerApiResponse {
  customer_top: { customer_id: number; nama_lengkap: string; no_hp: string; order_count: number; total_spend: number; avg_duration: number }[];
  ringkasan: { total_customers: number; new_customers: number; active_customers: number; repeat_customers: number };
}

interface OrderApiResponse {
  total_orders: number;
  total_pendapatan: number;
  total_denda: number;
  rata_rata_durasi: number;
  by_status: { status_order: StatusOrder; count: number }[];
  by_pembayaran: { status_pembayaran: StatusPembayaran; count: number }[];
  by_pengiriman: { status_pengiriman: StatusPengiriman; count: number }[];
  recent_orders: (OrderTerbaruRow & { tanggal_mulai?: string; tanggal_selesai?: string })[];
}

interface KomisiCaloApiResponse {
  calos: { calo_id: number; nama: string; no_hp: string | null; total_orders: number; total_revenue: number; total_komisi: number }[];
  grand_total: { total_revenue: number; total_komisi: number };
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
      <FileText className="h-9 w-9" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-surface px-5 py-12 text-center shadow-sm ring-1 ring-black-200">
      <TriangleAlert className="h-9 w-9 text-error-500" />
      <p className="text-sm font-medium text-black-700">{message}</p>
    </div>
  );
}

function apiErrorMessage(err: unknown, fallback = 'Gagal memuat data laporan.'): string {
  if (isAxiosError(err)) {
    const msg = err.response?.data?.message;
    if (typeof msg === 'string' && msg) return msg;
    return err.message || fallback;
  }
  return fallback;
}

function GrowthBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return null;
  const pct = previous === 0 ? (current > 0 ? 100 : 0) : ((current - previous) / previous) * 100;
  const isUp = pct > 0;
  const isDown = pct < 0;
  return (
    <span className={`ml-1.5 inline-flex items-center gap-0.5 text-xs font-medium ${isUp ? 'text-success-600' : isDown ? 'text-error-600' : 'text-black-400'}`}>
      {isUp ? '↑' : isDown ? '↓' : '–'} {Math.abs(pct).toFixed(1)}%
    </span>
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

function SectionCardShell({ title, filter, children }: { title: string; filter: ReactNode; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-black-200">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black-200 px-5 py-4">
        <h2 className="font-display text-lg font-bold text-black-900">{title}</h2>
        <div className="flex flex-wrap items-center justify-end gap-2">{filter}</div>
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
  growth,
  tone,
}: {
  label: ReactNode;
  value: ReactNode;
  mono?: boolean;
  icon: ReactNode;
  iconBg: string;
  growth?: { current: number; previous: number };
  tone?: 'positive' | 'negative';
}) {
  const valueColor =
    tone === 'positive' ? 'text-success-600' : tone === 'negative' ? 'text-error-600' : 'text-black-900';
  return (
    <div className="group rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-black-200 transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
        {icon}
      </div>
      <div className="mb-1 flex items-center">
        <p className="text-xs font-medium text-black-400">{label}</p>
        {growth && <GrowthBadge current={growth.current} previous={growth.previous} />}
      </div>
      <p className={`truncate text-lg font-bold sm:text-xl ${mono ? 'font-mono' : ''} ${valueColor}`}>{value}</p>
    </div>
  );
}

/* Tooltip custom untuk chart Rupiah, biar konsisten format id-ID */
function RupiahTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string; payload?: Record<string, unknown> }[];
  label?: string;
  formatter?: (v: number, entry: { name: string; color: string; payload?: Record<string, unknown> }) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-black-200 bg-surface px-3 py-2 text-xs shadow-md">
      {label != null && <p className="mb-1 font-medium text-black-900">{label}</p>}
      <div className="space-y-1">
        {payload.map((p) => (
          <p key={p.name} className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-black-500">{p.name}:</span>
            <span className="font-mono font-semibold text-black-900">
              {formatter ? formatter(p.value, { name: p.name, color: p.color, payload: p.payload }) : formatRupiah(p.value)}
            </span>
          </p>
        ))}
      </div>
    </div>
  );
}

/* Chart color palette — dipakai konsisten antar chart, dari token tema.
   Urutannya menyesuaikan makna: brand (biru) untuk utama, lalu
   hijau/amber/merah/abu untuk variasi. */
const CHART_COLORS = [
  'var(--color-primary-500)',
  'var(--color-accent-500)',
  'var(--color-success-500)',
  'var(--color-error-500)',
  'var(--color-primary-300)',
  'var(--color-black-400)',
  'var(--color-accent-400)',
];


/* ─────────────────────────────────────────────────────────────
 * CHART — Tren Pendapatan per Periode (Area Chart)
 * ───────────────────────────────────────────────────────────── */
function RevenueAreaChart({ data }: { data: PendapatanPeriodeRow[] }) {
  if (data.length === 0) return <EmptyState label="Belum ada data pendapatan" />;

  const totalPendapatan = data.reduce((sum, d) => sum + (Number(d.total_pendapatan) || 0), 0);
  const rataRata = totalPendapatan / data.length;

  return (
    <div className="w-full p-5">
      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2">
        <div>
          <p className="text-xs font-medium text-black-400">Total Pendapatan</p>
          <p className="font-display text-xl font-bold text-black-900">{formatRupiah(totalPendapatan)}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-black-400">Rata-rata / Periode</p>
          <p className="font-mono text-lg font-semibold text-black-700">{formatRupiah(rataRata)}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-black-400">Periode</p>
          <p className="text-lg font-semibold text-black-700">{data.length}</p>
        </div>
      </div>
      <div className="h-64 w-full">
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
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * CHART — Metode Pembayaran (Donut)
 * ───────────────────────────────────────────────────────────── */
function PaymentMethodPieChart({ data }: { data: MetodePembayaranRow[] }) {
  if (data.length === 0) return <EmptyState label="Belum ada data pembayaran" />;

  const chartData = data.map((row) => ({
    name: metodeBayarLabels[row.metode_pembayaran] || row.metode_pembayaran,
    value: row.total_pendapatan,
  }));
  const total = chartData.reduce((sum, d) => sum + (Number(d.value) || 0), 0);

  return (
    <div className="w-full p-5">
      <div className="mb-1 flex items-baseline justify-center gap-1">
        <p className="font-display text-2xl font-bold text-black-900">{formatRupiah(total)}</p>
        <p className="text-xs text-black-400">total</p>
      </div>
      <div className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<RupiahTooltip />} />
            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
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
          <Tooltip
            content={<RupiahTooltip formatter={(v) => `${v} kendaraan`} />}
          />
          <Legend verticalAlign="top" height={28} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="disewa" name="Disewa" fill="var(--color-primary-500)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="tersedia" name="Tersedia" fill="var(--color-success-500)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * EXECUTIVE SUMMARY — KPI inti yang selalu terlihat di atas
 * ───────────────────────────────────────────────────────────── */
function ExecutiveSummary() {
  const toast = useToast();
  const pf = usePeriodFilter(toast);
  const [data, setData] = useState<{ ringkasan: Record<string, unknown>; decision: DecisionData | null; piutang: PiutangData | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      laporanAPI.ringkasan(pf.params),
      laporanAPI.decision(pf.params),
      laporanAPI.piutang(pf.params),
    ])
      .then(([ringkasanRes, decisionRes, piutangRes]) => {
        setData({
          ringkasan: (ringkasanRes.data as { data: Record<string, unknown> }).data,
          decision: (decisionRes.data as { data: DecisionData }).data,
          piutang: (piutangRes.data as { data: PiutangData }).data,
        });
      })
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [pf.params]);

  if (loading) {
    return (
      <div className="rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-black-200">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold text-black-900">Ringkasan Eksekutif</h2>
          <PeriodFilter state={pf} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }
  if (error) return <ErrorState message={error} />;
  if (!data) return null;

  const r = data.ringkasan;
  const laba = data.decision?.ringkasan.total_laba ?? 0;
  const margin = data.decision?.ringkasan.margin_rata_rata ?? 0;
  const piutangTertunggak = data.piutang?.ringkasan.total_tertunggak ?? 0;
  const rented = Number(r.rented_vehicles ?? 0);
  const totalVehicles = Number(r.total_vehicles ?? 0);
  const utilisasi = Number(r.utilization ?? 0);

  return (
    <div className="rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-black-200">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold text-black-900">Ringkasan Eksekutif</h2>
        <PeriodFilter state={pf} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
      <StatCard label="Total Pendapatan" value={formatRupiah(Number(r.total_revenue ?? 0))} mono icon={<Banknote className="h-5 w-5" />} iconBg={ICON_BG.avail} />
      <StatCard label="Total Order" value={Number(r.total_orders ?? 0)} icon={<FileText className="h-5 w-5" />} iconBg={ICON_BG.brand} />
      <StatCard
        label="Laba Bersih"
        value={formatRupiah(laba)}
        mono
        icon={<TrendingUp className="h-5 w-5" />}
        iconBg={laba >= 0 ? ICON_BG.avail : ICON_BG.maint}
        tone={laba >= 0 ? 'positive' : 'negative'}
      />
      <StatCard
        label="Margin Rata-rata"
        value={Number.isFinite(margin) ? `${margin.toFixed(1)}%` : '0,0%'}
        mono
        icon={<TrendingUp className="h-5 w-5" />}
        iconBg={ICON_BG.brandDark}
      />
      <StatCard
        label="Utilisasi Kendaraan"
        value={totalVehicles > 0 ? `${rented}/${totalVehicles} (${utilisasi.toFixed(0)}%)` : '0/0 (0%)'}
        icon={<Car className="h-5 w-5" />}
        iconBg={ICON_BG.rented}
      />
      <StatCard
        label="Piutang Tertunggak"
        value={formatRupiah(piutangTertunggak)}
        mono
        icon={<Wallet className="h-5 w-5" />}
        iconBg={ICON_BG.maint}
        tone={piutangTertunggak > 0 ? 'negative' : 'positive'}
      />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * TAB — Pendapatan
 * ───────────────────────────────────────────────────────────── */
function PendapatanTab({ title }: { title: string }) {
  const toast = useToast();
  const pf = usePeriodFilter(toast);
  const [data, setData] = useState<PendapatanData | null>(null);
  const [growth, setGrowth] = useState<GrowthApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      laporanAPI.pendapatan(pf.params),
      laporanAPI.growth(pf.params),
    ])
      .then(([pendapatanRes, growthRes]) => {
        const d = (pendapatanRes.data as { data: PendapatanApiResponse }).data;
        setData({
          ringkasan: {
            total_pendapatan: d.summary.total_revenue,
            total_denda: d.summary.total_fines,
            total_order: d.summary.total_orders,
            total_customer: d.summary.distinct_customers,
            rata_rata_order: d.summary.avg_order,
          },
          pendapatan_periode: d.pendapatan_periode.map((p) => ({
            periode: p.periode,
            total_order: p.orders,
            total_pendapatan: p.revenue,
            total_denda: p.denda ?? 0,
            rata_rata: 0,
          })),
          metode_pembayaran: d.metode_pembayaran.map((m) => ({
            metode_pembayaran: m.metode_pembayaran,
            total_order: m.orders,
            total_pendapatan: m.revenue,
            rata_rata: 0,
          })),
        });
        setGrowth((growthRes.data as { data: GrowthApiResponse }).data);
      })
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [pf.params]);

  if (loading) {
    return (
      <SectionCardShell title={title} filter={<PeriodFilter state={pf} />}>
        <div className="p-5">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <TableSkeleton />
            <TableSkeleton />
          </div>
        </div>
      </SectionCardShell>
    );
  }
  if (error) return <ErrorState message={error} />;
  if (!data) return null;

  const { ringkasan, pendapatan_periode, metode_pembayaran } = data;

  const totalPeriode = pendapatan_periode.reduce(
    (acc, r) => {
      acc.total_order += Number(r.total_order) || 0;
      acc.total_pendapatan += Number(r.total_pendapatan) || 0;
      acc.total_denda += Number(r.total_denda) || 0;
      return acc;
    },
    { total_order: 0, total_pendapatan: 0, total_denda: 0 },
  );

  return (
    <SectionCardShell
      title={title}
      filter={
        <>
          <PeriodFilter state={pf} />
          <ExportSectionButton type="pendapatan" params={pf.params} label="Pendapatan" />
        </>
      }
    >
      <div className="p-5">
        <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Pendapatan" value={formatRupiah(ringkasan.total_pendapatan)} mono icon={<Banknote className="h-5 w-5" />} iconBg={ICON_BG.avail} growth={growth?.pendapatan} />
        <StatCard label="Total Denda" value={formatRupiah(ringkasan.total_denda)} mono icon={<TriangleAlert className="h-5 w-5" />} iconBg={ICON_BG.maint} growth={growth?.denda} />
        <StatCard label="Total Customer" value={ringkasan.total_customer} icon={<User className="h-5 w-5" />} iconBg={ICON_BG.rented} growth={growth?.customer} />
        <StatCard label="Rata-rata/Order" value={formatRupiah(ringkasan.rata_rata_order)} mono icon={<TrendingUp className="h-5 w-5" />} iconBg={ICON_BG.brandDark} />
      </div>

      <SectionCard title="Tren Pendapatan per Periode">
        <RevenueAreaChart data={pendapatan_periode} />
      </SectionCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="Pendapatan Per Periode">
          <DataTable
            columns={[
              { label: 'Periode' },
              { label: 'Order', align: 'right' },
              { label: 'Pendapatan', align: 'right' },
              { label: 'Denda', align: 'right' },
            ]}
            footer={
              <TotalRow
                colSpan={1}
                totals={[
                  totalPeriode.total_order,
                  formatRupiah(totalPeriode.total_pendapatan),
                  formatRupiah(totalPeriode.total_denda),
                ]}
              />
            }
          >
            {pendapatan_periode.map((row) => (
              <tr key={row.periode} className="transition-colors odd:bg-white even:bg-canvas/40 hover:bg-primary-50/40">
                <td className="px-5 py-3 font-medium text-black-900">{row.periode}</td>
                <td className="px-5 py-3 text-right text-black-700">{row.total_order}</td>
                <td className="px-5 py-3 text-right font-mono text-black-900">{formatRupiah(row.total_pendapatan)}</td>
                <td className="px-5 py-3 text-right font-mono text-black-700">{formatRupiah(row.total_denda)}</td>
              </tr>
            ))}
          </DataTable>
          {pendapatan_periode.length === 0 && <EmptyState />}
        </SectionCard>

        <SectionCard title="Metode Pembayaran">
          <PaymentMethodPieChart data={metode_pembayaran} />
        </SectionCard>
      </div>
      </div>
      </div>
    </SectionCardShell>
  );
}

/* ─────────────────────────────────────────────────────────────
 * TAB — Kendaraan
 * ───────────────────────────────────────────────────────────── */
function KendaraanTab({ title }: { title: string }) {
  const toast = useToast();
  const pf = usePeriodFilter(toast);
  const [data, setData] = useState<KendaraanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    laporanAPI
      .kendaraan(pf.params)
      .then((res) => {
        const d = (res.data as { data: KendaraanApiResponse }).data;
        setData({
          status_kendaraan: d.status_kendaraan.map((s) => ({ status: s.status, total: s.count })),
          kategori_stats: d.kategori_stats.map((k) => ({
            nama_kategori: k.nama_kategori,
            total_kendaraan: k.total,
            disewa: k.rented,
            tersedia: k.available,
          })),
        });
      })
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [pf.params]);

  if (loading) {
    return (
      <SectionCardShell title={title} filter={<PeriodFilter state={pf} />}>
        <div className="p-5">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <TableSkeleton />
            <TableSkeleton />
          </div>
        </div>
      </SectionCardShell>
    );
  }
  if (error) return <ErrorState message={error} />;
  if (!data) return null;

  const { status_kendaraan, kategori_stats } = data;
  const totalKendaraan = status_kendaraan.reduce((sum, s) => sum + s.total, 0);

  return (
    <SectionCardShell title={title} filter={<PeriodFilter state={pf} />}>
      <div className="p-5">
        <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Kendaraan" value={totalKendaraan} icon={<Car className="h-5 w-5" />} iconBg={ICON_BG.rented} />
        {status_kendaraan.map((s) => (
          <StatCard
            key={s.status}
            label={vehicleStatusLabels[s.status as StatusKendaraan] ?? <span className="capitalize">{s.status}</span>}
            value={s.total}
            icon={<Car className="h-5 w-5" />}
            iconBg={s.status === 'tersedia' ? ICON_BG.avail : s.status === 'maintenance' || s.status === 'tidak_tersedia' ? ICON_BG.maint : ICON_BG.rented}
          />
        ))}
      </div>

      {kategori_stats && kategori_stats.length > 0 && (
        <SectionCard title="Disewa vs Tersedia per Kategori">
          <KategoriBarChart data={kategori_stats} />
        </SectionCard>
      )}
      </div>
      </div>
    </SectionCardShell>
  );
}

/* ─────────────────────────────────────────────────────────────
 * TAB — Rekap per Garasi
 * ───────────────────────────────────────────────────────────── */
function RekapGarasiTab({ title }: { title: string }) {
  const toast = useToast();
  const pf = usePeriodFilter(toast);
  const [data, setData] = useState<RekapGarasiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPartner, setSelectedPartner] = useState<RekapGarasiRow | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    laporanAPI
      .rekapGarasi(pf.params)
      .then((res) => {
        const d = (res.data as { data: RekapGarasiData }).data;
        setData(d);
      })
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [pf.params]);

  if (loading) {
    return (
      <SectionCardShell title={title} filter={<PeriodFilter state={pf} />}>
        <div className="p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </SectionCardShell>
    );
  }
  if (error) return <ErrorState message={error} />;
  if (!data) return null;

  const { partners, grand_total } = data;

  return (
    <>
      <SectionCardShell
        title={title}
        filter={
          <>
            <PeriodFilter state={pf} />
            <ExportSectionButton type="rekap-garasi" params={pf.params} label="Rekap Garasi" />
          </>
        }
      >
        <div className="p-5">
          <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Jumlah Partner" value={partners.length} icon={<Users className="h-5 w-5" />} iconBg={ICON_BG.brand} />
        <StatCard label="Total Pendapatan" value={formatRupiah(grand_total.pendapatan)} mono icon={<Banknote className="h-5 w-5" />} iconBg={ICON_BG.avail} />
        <StatCard
          label="Total Laba Bersih"
          value={formatRupiah(grand_total.laba)}
          mono
          icon={<TrendingUp className="h-5 w-5" />}
          iconBg={grand_total.laba >= 0 ? ICON_BG.avail : ICON_BG.maint}
          tone={grand_total.laba >= 0 ? 'positive' : 'negative'}
        />
        <StatCard label="Total Bagi Hasil" value={formatRupiah(grand_total.bagi_hasil)} mono icon={<Wallet className="h-5 w-5" />} iconBg={ICON_BG.brandDark} />
      </div>

      <SectionCard title="Rekap per Garasi Partner">
        <DataTable
          columns={[
            { label: '#' },
            { label: 'Nama Garasi' },
            { label: 'Persentase', align: 'center' },
            { label: 'Order', align: 'right' },
            { label: 'Pendapatan', align: 'right' },
            { label: 'Beban', align: 'right' },
            { label: 'Komisi', align: 'right' },
            { label: 'Laba / Rugi', align: 'right' },
            { label: 'Bagi Hasil', align: 'right' },
            { label: 'Aksi', align: 'center' },
          ]}
          footer={
            <TotalRow
              colSpan={4}
              totals={[
                grand_total.order_count,
                formatRupiah(grand_total.pendapatan),
                formatRupiah(grand_total.beban_partner),
                formatRupiah(grand_total.komisi),
                formatRupiah(grand_total.laba),
                formatRupiah(grand_total.bagi_hasil),
              ]}
            />
          }
        >
          {partners.map((r, i) => (
            <tr
              key={r.garasi_partner_id}
              className="cursor-pointer transition-colors odd:bg-white even:bg-canvas/40 hover:bg-primary-50/40"
              onClick={() => setSelectedPartner(r)}
            >
              <td className="px-5 py-3 text-black-400">{i + 1}</td>
              <td className="px-5 py-3 font-medium text-black-900">{r.nama_garasi}</td>
              <td className="px-5 py-3 text-center">
                <span className="rounded-full bg-primary-100 px-2.5 py-1 text-xs font-medium text-primary-600">{r.persentase}%</span>
              </td>
              <td className="px-5 py-3 text-right text-black-900">{r.order_count}</td>
              <td className="px-5 py-3 text-right font-mono text-black-900">{formatRupiah(r.pendapatan)}</td>
              <td className="px-5 py-3 text-right font-mono text-black-700">{formatRupiah(r.beban_partner)}</td>
              <td className="px-5 py-3 text-right font-mono text-black-700">{formatRupiah(r.komisi)}</td>
              <td className={`px-5 py-3 text-right font-mono font-semibold ${r.laba >= 0 ? 'text-success-600' : 'text-error-600'}`}>
                {formatRupiah(r.laba)}
              </td>
              <td className="px-5 py-3 text-right font-mono font-semibold text-black-900">{formatRupiah(r.bagi_hasil)}</td>
              <td className="px-5 py-3 text-center text-primary-600">Detail</td>
            </tr>
          ))}
        </DataTable>
        {partners.length === 0 && <EmptyState label="Belum ada data garasi partner" />}
      </SectionCard>

      {selectedPartner && (
        <OrderListModal
          title={selectedPartner.nama_garasi}
          subtitle={`${selectedPartner.order_count} order selesai • bagi hasil ${selectedPartner.persentase}%`}
          params={pf.params}
          garasiId={selectedPartner.garasi_partner_id}
          onClose={() => setSelectedPartner(null)}
        />
      )}
      </div>
      </div>
      </SectionCardShell>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────
 * TAB — Komisi Calo
 * ───────────────────────────────────────────────────────────── */
function KomisiCaloTab({ title }: { title: string }) {
  const toast = useToast();
  const pf = usePeriodFilter(toast);
  const [data, setData] = useState<KomisiCaloData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    laporanAPI
      .komisiCalo(pf.params)
      .then((res) => {
        const d = (res.data as { data: KomisiCaloApiResponse }).data;
        setData({
          data: d.calos.map((c) => ({
            calo_id: c.calo_id,
            nama: c.nama,
            no_hp: c.no_hp ?? '-',
            total_order: c.total_orders,
            total_pendapatan: c.total_revenue,
            total_komisi: c.total_komisi,
          })),
          ringkasan: {
            grand_total_pendapatan: d.grand_total.total_revenue,
            grand_total_komisi: d.grand_total.total_komisi,
            jumlah_calo: d.calos.length,
          },
        });
      })
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [pf.params]);

  if (loading) {
    return (
      <SectionCardShell title={title} filter={<PeriodFilter state={pf} />}>
        <div className="p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </SectionCardShell>
    );
  }
  if (error) return <ErrorState message={error} />;
  if (!data) return null;

  const { data: rows, ringkasan } = data;

  const totalKomisi = rows.reduce(
    (acc, r) => {
      acc.total_order += r.total_order;
      acc.total_pendapatan += r.total_pendapatan;
      acc.total_komisi += r.total_komisi;
      return acc;
    },
    { total_order: 0, total_pendapatan: 0, total_komisi: 0 },
  );

  return (
    <SectionCardShell
      title={title}
      filter={
        <>
          <PeriodFilter state={pf} />
          <ExportSectionButton type="komisi-calo" params={pf.params} label="Komisi Calo" />
        </>
      }
    >
      <div className="p-5">
        <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Jumlah Calo" value={ringkasan.jumlah_calo} icon={<Users className="h-5 w-5" />} iconBg={ICON_BG.brand} />
        <StatCard label="Total Pendapatan" value={formatRupiah(ringkasan.grand_total_pendapatan)} mono icon={<Banknote className="h-5 w-5" />} iconBg={ICON_BG.avail} />
        <StatCard label="Total Komisi" value={formatRupiah(ringkasan.grand_total_komisi)} mono icon={<Wallet className="h-5 w-5" />} iconBg={ICON_BG.brandDark} />
        <StatCard
          label="Rasio Komisi"
          value={ringkasan.grand_total_pendapatan > 0 ? `${((ringkasan.grand_total_komisi / ringkasan.grand_total_pendapatan) * 100).toFixed(1)}%` : '0%'}
          icon={<TrendingUp className="h-5 w-5" />}
          iconBg={ICON_BG.rented}
        />
      </div>

      <SectionCard title="Detail Komisi per Calo">
        <DataTable
          columns={[
            { label: '#' },
            { label: 'Nama Calo' },
            { label: 'No. HP' },
            { label: 'Order', align: 'right' },
            { label: 'Pendapatan', align: 'right' },
            { label: 'Komisi', align: 'right' },
          ]}
          footer={
            <TotalRow
              colSpan={3}
              totals={[
                totalKomisi.total_order,
                formatRupiah(totalKomisi.total_pendapatan),
                formatRupiah(totalKomisi.total_komisi),
              ]}
            />
          }
        >
          {rows.map((r, i) => (
            <tr key={r.calo_id} className="transition-colors odd:bg-white even:bg-canvas/40 hover:bg-primary-50/40">
              <td className="px-5 py-3 text-black-400">{i + 1}</td>
              <td className="px-5 py-3 font-medium text-black-900">{r.nama}</td>
              <td className="px-5 py-3 text-black-700">{r.no_hp}</td>
              <td className="px-5 py-3 text-right text-black-900">{r.total_order}</td>
              <td className="px-5 py-3 text-right font-mono text-black-900">{formatRupiah(r.total_pendapatan)}</td>
              <td className="px-5 py-3 text-right font-mono font-semibold text-black-900">{formatRupiah(r.total_komisi)}</td>
            </tr>
          ))}
        </DataTable>
        {rows.length === 0 && <EmptyState label="Belum ada data komisi calo" />}
      </SectionCard>
      </div>
      </div>
    </SectionCardShell>
  );
}

/* ─────────────────────────────────────────────────────────────
 * TAB — Piutang (Aging Report)
 * ───────────────────────────────────────────────────────────── */
const AGING_LABELS: Record<PiutangRow['aging'], string> = {
  belum_tertunggak: 'Belum Lewat Jatuh Tempo',
  '1_30_hari': 'Lewat Jatuh Tempo 1–30 Hari',
  '31_60_hari': 'Lewat Jatuh Tempo 31–60 Hari',
  lebih_60_hari: 'Lewat Jatuh Tempo >60 Hari',
};

const AGING_COLORS: Record<PiutangRow['aging'], string> = {
  belum_tertunggak: 'bg-success-50 text-success-600',
  '1_30_hari': 'bg-accent-50 text-accent-700',
  '31_60_hari': 'bg-accent-100 text-accent-700',
  lebih_60_hari: 'bg-error-50 text-error-600',
};

function PiutangTab({ title }: { title: string }) {
  const toast = useToast();
  const pf = usePeriodFilter(toast);
  const [data, setData] = useState<PiutangData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    laporanAPI
      .piutang(pf.params)
      .then((res) => {
        const d = (res.data as { data: PiutangData }).data;
        setData(d);
      })
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [pf.params]);

  if (loading) {
    return (
      <SectionCardShell title={title} filter={<PeriodFilter state={pf} />}>
        <div className="p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </SectionCardShell>
    );
  }
  if (error) return <ErrorState message={error} />;
  if (!data) return null;

  const { data: rows, ringkasan } = data;

  const totalPiutang = rows.reduce(
    (acc, r) => {
      acc.total += r.harga_total;
      acc.total_bayar += r.total_bayar;
      acc.sisa += r.sisa_pembayaran;
      return acc;
    },
    { total: 0, total_bayar: 0, sisa: 0 },
  );

  return (
    <SectionCardShell
      title={title}
      filter={
        <>
          <PeriodFilter state={pf} />
          <ExportSectionButton type="piutang" params={pf.params} label="Piutang" />
        </>
      }
    >
      <div className="p-5">
        <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Piutang" value={formatRupiah(ringkasan.total_piutang)} mono icon={<Wallet className="h-5 w-5" />} iconBg={ICON_BG.maint} />
        <StatCard label="Total Tertunggak" value={formatRupiah(ringkasan.total_tertunggak)} mono icon={<TriangleAlert className="h-5 w-5" />} iconBg={ICON_BG.maint} />
        <StatCard label="Jumlah Order" value={ringkasan.jumlah_order} icon={<FileText className="h-5 w-5" />} iconBg={ICON_BG.brand} />
        <StatCard
          label="Rasio Tertunggak"
          value={ringkasan.total_piutang > 0 && ringkasan.total_tertunggak > 0
            ? `${((ringkasan.total_tertunggak / ringkasan.total_piutang) * 100).toFixed(1)}%`
            : '0%'}
          icon={<TrendingUp className="h-5 w-5" />}
          iconBg={ICON_BG.rented}
        />
      </div>

      <SectionCard title="Detail Piutang">
        <DataTable
          columns={[
            { label: '#' },
            { label: 'Kode' },
            { label: 'Customer' },
            { label: 'Kendaraan' },
            { label: 'Mulai' },
            { label: 'Tgl Kembali' },
            { label: 'Total', align: 'right' },
            { label: 'Dibayar', align: 'right' },
            { label: 'Sisa', align: 'right' },
            { label: 'Hari Tertunggak', align: 'right' },
            { label: 'Aging', align: 'center' },
          ]}
          footer={
            <TotalRow
              colSpan={6}
              totals={[
                formatRupiah(totalPiutang.total),
                formatRupiah(totalPiutang.total_bayar),
                formatRupiah(totalPiutang.sisa),
                '',
                '',
              ]}
            />
          }
        >
          {rows.map((r, i) => (
            <tr key={r.order_id} className="transition-colors odd:bg-white even:bg-canvas/40 hover:bg-primary-50/40">
              <td className="px-5 py-3 text-black-400">{i + 1}</td>
              <td className="px-5 py-3 font-mono font-medium text-black-900">{r.kode_order}</td>
              <td className="px-5 py-3 text-black-700">{r.nama_customer}</td>
              <td className="px-5 py-3 text-black-700">{r.kendaraan}</td>
              <td className="px-5 py-3 text-black-700">{r.tanggal_mulai ?? '-'}</td>
              <td className="px-5 py-3 text-black-700">{r.tanggal_pengembalian ?? '-'}</td>
              <td className="px-5 py-3 text-right font-mono text-black-900">{formatRupiah(r.harga_total)}</td>
              <td className="px-5 py-3 text-right font-mono text-black-700">{formatRupiah(r.total_bayar)}</td>
              <td className="px-5 py-3 text-right font-mono font-semibold text-error-600">{formatRupiah(r.sisa_pembayaran)}</td>
              <td className="px-5 py-3 text-right text-black-900">{r.hari_tertunggak > 0 ? `${r.hari_tertunggak} hari` : '-'}</td>
              <td className="px-5 py-3 text-center">
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${AGING_COLORS[r.aging]}`}>
                  {AGING_LABELS[r.aging]}
                </span>
              </td>
            </tr>
          ))}
        </DataTable>
        {rows.length === 0 && <EmptyState label="Tidak ada piutang aktif" />}
      </SectionCard>
      </div>
      </div>
    </SectionCardShell>
  );
}

/* ─────────────────────────────────────────────────────────────
 * TAB — Detail Order (Laporan Per-Order)
 * ───────────────────────────────────────────────────────────── */
const detailFilters: { status_order: string[]; source: string[] } = {
  status_order: ['pending', 'confirmed', 'active', 'perlu_verifikasi', 'completed', 'cancelled'],
  source: ['admin', 'katalog'],
};

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-black-100 py-2 last:border-0">
      <span className="text-xs text-black-400">{label}</span>
      <span className="text-right text-sm font-medium text-black-900">{children}</span>
    </div>
  );
}

function InspeksiCard({ title, data }: { title: string; data: InspeksiDetail | null }) {
  if (!data) {
    return (
      <div className="rounded-2xl bg-canvas p-5">
        <h4 className="mb-3 font-semibold text-black-900">{title}</h4>
        <p className="text-sm text-black-400">Belum ada inspeksi {title.toLowerCase()}</p>
      </div>
    );
  }

  const kondisiItem = (label: string, value: string | null) => (
    <span key={label} className="rounded-full bg-black-100 px-2.5 py-1 text-xs text-black-700">
      {label}: {value ?? '-'}
    </span>
  );

  const ttdLengkap = Boolean(data.ttd_customer && data.ttd_petugas);

  return (
    <div className="rounded-2xl bg-canvas p-5">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="font-semibold text-black-900">{title}</h4>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${data.status === 'final' ? 'bg-success-50 text-success-600' : 'bg-accent-100 text-accent-700'}`}>
          {data.status === 'final' ? 'Final' : 'Draft'}
        </span>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {kondisiItem('Body', data.kondisi_body)}
        {kondisiItem('Interior', data.kondisi_interior)}
        {kondisiItem('Ban', data.kondisi_ban)}
        {kondisiItem('AC', data.kondisi_ac)}
        {kondisiItem('Lampu', data.kondisi_lampu)}
      </div>

      <div className="divide-y divide-black-100 text-sm">
        <DetailRow label="ODOMETER">{data.odometer != null ? `${data.odometer} km` : '-'}</DetailRow>
        <DetailRow label="Bahan Bakar">{data.fuel_level ?? '-'}</DetailRow>
        <DetailRow label="TTD Customer & Petugas">
          <span className={ttdLengkap ? 'text-success-600' : 'text-error-600'}>{ttdLengkap ? 'Lengkap' : 'Belum Lengkap'}</span>
        </DetailRow>
        <DetailRow label="Waktu">{data.waktu ?? '-'}</DetailRow>
        <DetailRow label="Oleh">{data.inspeksi_oleh ?? '-'}</DetailRow>
        {data.ada_damagenya && (
          <div className="py-2">
            <p className="text-xs text-error-600">Ada Kerusakan</p>
            {data.biaya_kerusakan != null && <p className="mt-1 font-mono text-sm font-semibold text-error-600">{formatRupiah(data.biaya_kerusakan)}</p>}
            {data.deskripsi_kondisi && <p className="mt-1 text-sm text-black-700">{data.deskripsi_kondisi}</p>}
          </div>
        )}
        {data.checklist_serah_terima && data.checklist_serah_terima.length > 0 && (
          <div className="py-2">
            <p className="mb-1 text-xs text-black-400">Checklist Serah Terima</p>
            <p className="text-sm text-black-700">{data.checklist_serah_terima.join(', ')}</p>
          </div>
        )}
        {data.catatan && (
          <div className="py-2">
            <p className="mb-1 text-xs text-black-400">Catatan</p>
            <p className="text-sm text-black-700">{data.catatan}</p>
          </div>
        )}
        {data.fotos && data.fotos.length > 0 && (
          <div className="pt-2">
            <p className="mb-2 text-xs text-black-400">Dokumentasi ({data.fotos.length} foto)</p>
            <div className="flex flex-wrap gap-2">
              {data.fotos.map((f, i) => (
                <img key={i} src={`/storage/${f}`} alt={`foto ${i + 1}`} className="h-20 w-28 rounded-lg object-cover" />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailModal({ order, onClose }: { order: DetailOrderRow; onClose: () => void }) {
  const pickup = order.inspeksi_pickup;
  const return_ = order.inspeksi_return;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black-900/50 p-4" onClick={onClose}>
      <div className="my-8 w-full max-w-3xl rounded-2xl bg-surface p-4 shadow-xl sm:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-xl font-bold text-black-900">{order.kode_order}</h3>
            <p className="mt-1 text-sm text-black-400">
              {order.nama_customer} • {order.nama_kendaraan ?? '-'} {order.plat_nomor ? `(${order.plat_nomor})` : ''}
            </p>
          </div>
          <button onClick={onClose} className="shrink-0 rounded-lg bg-black-100 px-2.5 py-1.5 text-sm text-black-700 hover:bg-black-200">
            Tutup
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-canvas p-5">
            <h4 className="mb-3 font-semibold text-black-900">Info Order</h4>
            <div className="divide-y divide-black-100 text-sm">
              <DetailRow label="Sumber">{order.source}</DetailRow>
              <DetailRow label="Tanggal Order">{order.tanggal_order}</DetailRow>
              <DetailRow label="Mulai">{order.tanggal_mulai} {order.jam_mulai ?? ''}</DetailRow>
              <DetailRow label="Selesai">{order.tanggal_selesai} {order.jam_selesai ?? ''}</DetailRow>
              <DetailRow label="Kembali Aktual">{order.tanggal_pengembalian_aktual ?? '-'}</DetailRow>
              <DetailRow label="Durasi">{order.durasi_hari} hari</DetailRow>
              <DetailRow label="Status Order">{statusOrderLabels[order.status_order]}</DetailRow>
              <DetailRow label="Status Pengiriman">{statusPengirimanLabels[order.status_pengiriman]}</DetailRow>
              <DetailRow label="Penyerahan">{order.metode_penyerahan}</DetailRow>
              <DetailRow label="Opsi Supir">{order.opsi_supir ?? '-'}</DetailRow>
              <DetailRow label="Supir">{order.nama_supir ?? '-'}</DetailRow>
              <DetailRow label="Calo">{order.nama_calo ?? '-'}</DetailRow>
              <DetailRow label="Garasi Pemilik">{order.garasi_pemilik ?? '-'}</DetailRow>
              {order.garasi_request.length > 0 && <DetailRow label="Garasi Request">{order.garasi_request.join(', ')}</DetailRow>}
            </div>
          </div>

          <div className="rounded-2xl bg-canvas p-5">
            <h4 className="mb-3 font-semibold text-black-900">Keuangan</h4>
            <div className="divide-y divide-black-100 text-sm">
              <DetailRow label="Harga / Hari">{formatRupiah(order.harga_per_hari)}</DetailRow>
              <DetailRow label="Harga Total">{formatRupiah(order.harga_total)}</DetailRow>
              <DetailRow label="Denda Overtime">{order.jam_overtime > 0 ? `${order.jam_overtime} jam • ` : ''}{formatRupiah(order.denda_overtime)}</DetailRow>
              <DetailRow label="Biaya Kerusakan">{formatRupiah(order.biaya_kerusakan ?? 0)}</DetailRow>
              <DetailRow label="Komisi Calo">{order.komisi_calo ? formatRupiah(order.komisi_calo) : '-'}</DetailRow>
              <DetailRow label="Beban Partner">{formatRupiah(order.beban_partner)}</DetailRow>
              <DetailRow label="Status Bayar">
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusPembayaranColors[order.status_pembayaran]}`}>
                  {statusPembayaranLabels[order.status_pembayaran]}
                </span>
              </DetailRow>
              <DetailRow label="Metode Bayar">{metodeBayarLabels[order.metode_pembayaran as MetodeBayar] ?? '-'}</DetailRow>
              <DetailRow label="Laba / Rugi">
                {order.beban_partner > 0 || (order.komisi_calo ?? 0) > 0 ? (
                  <span className={`font-mono font-semibold ${order.laba >= 0 ? 'text-success-600' : 'text-error-600'}`}>{formatRupiah(order.laba)}</span>
                ) : '-'}
              </DetailRow>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <InspeksiCard title="Inspeksi Pickup" data={pickup} />
          <InspeksiCard title="Inspeksi Return" data={return_} />
        </div>

        {order.jarak_tempuh != null && (
          <div className="mt-4 rounded-2xl bg-canvas p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-black-400">Jarak Tempuh</span>
              <span className="font-mono text-lg font-bold text-black-900">{order.jarak_tempuh} km</span>
            </div>
          </div>
        )}

        {order.catatan && (
          <div className="mt-4 rounded-2xl bg-canvas p-5">
            <p className="mb-1 text-xs text-black-400">Catatan Order</p>
            <p className="text-sm text-black-700">{order.catatan}</p>
          </div>
        )}
        {order.alasan_pembatalan && (
          <div className="mt-4 rounded-2xl bg-canvas p-5">
            <p className="mb-1 text-xs text-black-400">Alasan Pembatalan</p>
            <p className="text-sm text-black-700">{order.alasan_pembatalan}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* Modal daftar order (drill-down) untuk baris agregat pada tab
 * Per Kategori & Rekap per Garasi. Membuka DetailModal per baris
 * order — pola sama dengan tab Detail Order. */
function OrderListModal({
  title,
  subtitle,
  params,
  kategoriId,
  garasiId,
  onClose,
}: {
  title: string;
  subtitle?: string;
  params: DateParams;
  kategoriId?: number | null;
  garasiId?: number | null;
  onClose: () => void;
}) {
  const [data, setData] = useState<DetailOrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<DetailOrderRow | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const query: Record<string, unknown> = {
      start_date: params.start_date,
      end_date: params.end_date,
      status_order: 'completed',
      page,
      per_page: 10,
    };
    if (kategoriId != null) query.kategori_id = kategoriId;
    if (garasiId != null) query.garasi_partner_id = garasiId;

    laporanAPI
      .detailOrder(query)
      .then((res) => {
        const d = (res.data as { data: DetailOrderData }).data;
        setData(d);
      })
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [params, kategoriId, garasiId, page]);

  const pageTotals = (data?.data ?? []).reduce(
    (acc, o) => {
      acc.total += o.harga_total;
      acc.denda += o.denda_overtime;
      acc.beban += o.beban_partner;
      acc.laba += o.laba;
      return acc;
    },
    { total: 0, denda: 0, beban: 0, laba: 0 },
  );
  const pageMargin = pageTotals.total > 0 ? (pageTotals.laba / pageTotals.total) * 100 : 0;
  const { pagination } = data ?? { pagination: null };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black-900/50 p-4" onClick={onClose}>
      <div className="my-8 w-full max-w-5xl rounded-2xl bg-surface p-4 shadow-xl sm:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-xl font-bold text-black-900">{title}</h3>
            {subtitle && <p className="mt-1 text-sm text-black-400">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="shrink-0 rounded-lg bg-black-100 px-2.5 py-1.5 text-sm text-black-700 hover:bg-black-200">
            Tutup
          </button>
        </div>

        <div className="rounded-2xl border border-black-200">
          {loading ? (
            <TableSkeleton rows={6} />
          ) : error ? (
            <ErrorState message={error} />
          ) : data && data.data.length > 0 ? (
            <>
              <DataTable
                columns={[
                  { label: 'Kode' },
                  { label: 'Mulai' },
                  { label: 'Customer' },
                  { label: 'Kendaraan' },
                  { label: 'Order', align: 'center' },
                  { label: 'Bayar', align: 'center' },
                  { label: 'Total', align: 'right' },
                  { label: 'Denda', align: 'right' },
                  { label: 'Harga Beli', align: 'right' },
                  { label: 'Margin', align: 'right' },
                  { label: 'Laba', align: 'right' },
                  { label: 'Aksi', align: 'center' },
                ]}
                footer={
                  <TotalRow
                    colSpan={6}
                    label="Subtotal halaman"
                    totals={[
                      formatRupiah(pageTotals.total),
                      formatRupiah(pageTotals.denda),
                      formatRupiah(pageTotals.beban),
                      `${pageMargin.toFixed(1)}%`,
                      formatRupiah(pageTotals.laba),
                      '',
                    ]}
                  />
                }
              >
                {data.data.map((o) => (
                  <tr
                    key={o.order_id}
                    className="cursor-pointer transition-colors odd:bg-white even:bg-canvas/40 hover:bg-primary-50/40"
                    onClick={() => setSelectedOrder(o)}
                  >
                    <td className="px-5 py-3 font-mono font-medium text-black-900">{o.kode_order}</td>
                    <td className="px-5 py-3 text-black-700">{o.tanggal_mulai}</td>
                    <td className="px-5 py-3 text-black-700">{o.nama_customer}</td>
                    <td className="px-5 py-3 text-black-700">
                      {o.nama_kendaraan ?? '-'}
                      {o.kategori && <span className="ml-1 text-xs text-black-400">({o.kategori})</span>}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusOrderColors[o.status_order]}`}>
                        {statusOrderLabels[o.status_order]}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusPembayaranColors[o.status_pembayaran]}`}>
                        {statusPembayaranLabels[o.status_pembayaran]}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-black-900">{formatRupiah(o.harga_total)}</td>
                    <td className="px-5 py-3 text-right font-mono text-black-700">{formatRupiah(o.denda_overtime)}</td>
                    <td className="px-5 py-3 text-right font-mono text-black-700">{formatRupiah(o.beban_partner)}</td>
                    <td className="px-5 py-3 text-right font-mono text-black-700">
                      {o.beban_partner > 0 || (o.komisi_calo ?? 0) > 0 ? `${o.margin.toFixed(1)}%` : '-'}
                    </td>
                    <td className={`px-5 py-3 text-right font-mono font-semibold ${o.laba >= 0 ? 'text-success-600' : 'text-error-600'}`}>
                      {o.beban_partner > 0 || (o.komisi_calo ?? 0) > 0 ? formatRupiah(o.laba) : '-'}
                    </td>
                    <td className="px-5 py-3 text-center text-primary-600">Detail</td>
                  </tr>
                ))}
              </DataTable>
              {pagination && pagination.last_page > 1 && (
                <div className="flex flex-col items-center justify-between gap-3 border-t border-black-200 px-5 py-3 sm:flex-row">
                  <span className="text-xs text-black-400">
                    Menampilkan{' '}
                    <span className="font-semibold text-black-700">
                      {(pagination.current_page - 1) * pagination.per_page + 1}–
                      {Math.min(pagination.current_page * pagination.per_page, pagination.total)}
                    </span>{' '}
                    dari <span className="font-semibold text-black-700">{pagination.total}</span> data
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      disabled={pagination.current_page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                      className="rounded-lg border border-black-200 bg-surface px-2.5 py-1.5 text-xs font-medium text-black-700 transition-colors hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Sebelumnya
                    </button>
                    {Array.from({ length: pagination.last_page }).map((_, i) => {
                      const n = i + 1;
                      const show = n === 1 || n === pagination.last_page || Math.abs(n - pagination.current_page) <= 1;
                      if (!show) {
                        const prevShown = n === 2 || (n === pagination.current_page - 2 && pagination.current_page > 3);
                        return prevShown ? <span key={`e-${n}`} className="px-1 text-xs text-black-400">…</span> : null;
                      }
                      return (
                        <button
                          key={n}
                          onClick={() => setPage(n)}
                          className={`h-7 min-w-7 rounded-lg px-2 text-xs font-semibold transition-colors ${
                            n === pagination.current_page ? 'bg-primary-500 text-white' : 'text-black-700 hover:bg-canvas'
                          }`}
                        >
                          {n}
                        </button>
                      );
                    })}
                    <button
                      disabled={pagination.current_page >= pagination.last_page}
                      onClick={() => setPage((p) => p + 1)}
                      className="rounded-lg border border-black-200 bg-surface px-2.5 py-1.5 text-xs font-medium text-black-700 transition-colors hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Berikutnya
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <EmptyState label="Belum ada data order" />
          )}
        </div>

        {selectedOrder && <DetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
      </div>
    </div>
  );
}

/* Modal daftar order ringkas untuk drill-down "Top Pelanggan".
 * Hanya menampilkan order selesai pelanggan dalam periode laporan
 * (Info Order-esque: kode, tanggal, kendaraan, status, total) —
 * tanpa kolom finansial berat dan tanpa membuka DetailModal penuh. */
function InfoOrderListModal({
  title,
  subtitle,
  params,
  customerId,
  onClose,
}: {
  title: string;
  subtitle?: string;
  params: DateParams;
  customerId: number;
  onClose: () => void;
}) {
  const [data, setData] = useState<DetailOrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    setError(null);
    laporanAPI
      .detailOrder({
        start_date: params.start_date,
        end_date: params.end_date,
        status_order: 'completed',
        customer_id: customerId,
        page,
        per_page: 10,
      })
      .then((res) => {
        const d = (res.data as { data: DetailOrderData }).data;
        setData(d);
      })
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [params, customerId, page]);

  const { pagination } = data ?? { pagination: null };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black-900/50 p-4" onClick={onClose}>
      <div className="my-8 w-full max-w-4xl rounded-2xl bg-surface p-4 shadow-xl sm:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-xl font-bold text-black-900">{title}</h3>
            {subtitle && <p className="mt-1 text-sm text-black-400">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="shrink-0 rounded-lg bg-black-100 px-2.5 py-1.5 text-sm text-black-700 hover:bg-black-200">
            Tutup
          </button>
        </div>

        <div className="rounded-2xl border border-black-200">
          {loading ? (
            <TableSkeleton rows={6} />
          ) : error ? (
            <ErrorState message={error} />
          ) : data && data.data.length > 0 ? (
            <>
              <DataTable
                columns={[
                  { label: 'Kode' },
                  { label: 'Mulai' },
                  { label: 'Selesai' },
                  { label: 'Kendaraan' },
                  { label: 'Status Order', align: 'center' },
                  { label: 'Status Bayar', align: 'center' },
                  { label: 'Total', align: 'right' },
                ]}
              >
                {data.data.map((o) => (
                  <tr key={o.order_id} className="transition-colors odd:bg-white even:bg-canvas/40 hover:bg-primary-50/40">
                    <td className="px-5 py-3 font-mono font-medium text-black-900">{o.kode_order}</td>
                    <td className="px-5 py-3 text-black-700">{o.tanggal_mulai}</td>
                    <td className="px-5 py-3 text-black-700">{o.tanggal_selesai}</td>
                    <td className="px-5 py-3 text-black-700">
                      {o.nama_kendaraan ?? '-'}
                      {o.kategori && <span className="ml-1 text-xs text-black-400">({o.kategori})</span>}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusOrderColors[o.status_order]}`}>
                        {statusOrderLabels[o.status_order]}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusPembayaranColors[o.status_pembayaran]}`}>
                        {statusPembayaranLabels[o.status_pembayaran]}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-black-900">{formatRupiah(o.harga_total)}</td>
                  </tr>
                ))}
              </DataTable>
              {pagination && pagination.last_page > 1 && <PaginationControls pagination={pagination} onPage={setPage} />}
            </>
          ) : (
            <EmptyState label="Belum ada data order" />
          )}
        </div>
      </div>
    </div>
  );
}

function DetailOrderTab({ title }: { title: string }) {
  const toast = useToast();
  const pf = usePeriodFilter(toast);
  const [data, setData] = useState<DetailOrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<DetailOrderRow | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [garasiFilter, setGarasiFilter] = useState('');
  const [garasiOptions, setGarasiOptions] = useState<{ id: number; nama_garasi: string }[]>([]);
  const [statusData, setStatusData] = useState<{
    status_order: { status_order: StatusOrder; total: number }[];
    status_pembayaran: { status_pembayaran: StatusPembayaran; total: number }[];
    status_pengiriman: { status_pengiriman: StatusPengiriman; total: number }[];
  } | null>(null);

  useEffect(() => {
    garasiPartnerAPI
      .list({ include_own: true, per_page: 100 })
      .then(({ data }) => {
        const items = data.data as unknown as GarasiPartner[];
        if (Array.isArray(items)) {
          setGarasiOptions(items.map((x) => ({ id: x.id, nama_garasi: x.nama_garasi })));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const query: Record<string, unknown> = {
      start_date: pf.params.start_date,
      end_date: pf.params.end_date,
      page,
      per_page: 25,
    };
    if (statusFilter) query.status_order = statusFilter;
    if (sourceFilter) query.source = sourceFilter;
    if (garasiFilter) query.garasi_partner_id = garasiFilter;

    Promise.all([
      laporanAPI.detailOrder(query),
      laporanAPI.order({ start_date: pf.params.start_date, end_date: pf.params.end_date }),
    ])
      .then(([detailRes, orderRes]) => {
        const d = (detailRes.data as { data: DetailOrderData }).data;
        setData(d);
        const o = (orderRes.data as { data: OrderApiResponse }).data;
        setStatusData({
          status_order: o.by_status.map((s) => ({ status_order: s.status_order, total: s.count })),
          status_pembayaran: o.by_pembayaran.map((s) => ({ status_pembayaran: s.status_pembayaran, total: s.count })),
          status_pengiriman: o.by_pengiriman.map((s) => ({ status_pengiriman: s.status_pengiriman, total: s.count })),
        });
      })
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [pf.params, page, statusFilter, sourceFilter, garasiFilter]);

  if (error) return <ErrorState message={error} />;

  const { ringkasan, pagination } = data ?? { ringkasan: null, pagination: null };

  const detailExportParams: Record<string, unknown> = {};
  if (statusFilter) detailExportParams.status_order = statusFilter;
  if (sourceFilter) detailExportParams.source = sourceFilter;
  if (garasiFilter) detailExportParams.garasi_partner_id = garasiFilter;

  const pageTotals = (data?.data ?? []).reduce(
    (acc, o) => {
      acc.total += o.harga_total;
      acc.denda += o.denda_overtime;
      acc.beban += o.beban_partner;
      acc.laba += o.laba;
      return acc;
    },
    { total: 0, denda: 0, beban: 0, laba: 0 },
  );
  const pageMargin = pageTotals.total > 0 ? (pageTotals.laba / pageTotals.total) * 100 : 0;

  return (
    <>
      <SectionCardShell
        title={title}
        filter={
          <>
            <PeriodFilter state={pf} />
            <ExportSectionButton type="order" params={pf.params} label="Order" />
          </>
        }
      >
        <div className="p-5">
          <div className="space-y-6">
      {ringkasan && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Order" value={ringkasan.total_order} icon={<FileText className="h-5 w-5" />} iconBg={ICON_BG.brand} />
          <StatCard label="Total Harga" value={formatRupiah(ringkasan.total_harga)} mono icon={<Banknote className="h-5 w-5" />} iconBg={ICON_BG.avail} />
          <StatCard label="Total Denda" value={formatRupiah(ringkasan.total_denda)} mono icon={<TriangleAlert className="h-5 w-5" />} iconBg={ICON_BG.maint} />
          <StatCard
            label="Total Laba"
            value={formatRupiah(ringkasan.total_laba)}
            mono
            icon={<TrendingUp className="h-5 w-5" />}
            iconBg={ringkasan.total_laba >= 0 ? ICON_BG.avail : ICON_BG.maint}
          />
        </div>
      )}

      {statusData && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <SectionCard title="Status Order">
            <div className="divide-y divide-black-200">
              {statusData.status_order.length === 0 ? (
                <EmptyState />
              ) : (
                statusData.status_order.map((s) => (
                  <div key={s.status_order} className="flex items-center justify-between px-5 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusOrderColors[s.status_order]}`}>
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
              {statusData.status_pembayaran.length === 0 ? (
                <EmptyState />
              ) : (
                statusData.status_pembayaran.map((s) => (
                  <div key={s.status_pembayaran} className="flex items-center justify-between px-5 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusPembayaranColors[s.status_pembayaran]}`}>
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
              {statusData.status_pengiriman.length === 0 ? (
                <EmptyState />
              ) : (
                statusData.status_pengiriman.map((s) => (
                  <div key={s.status_pengiriman} className="flex items-center justify-between px-5 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusPengirimanColors[s.status_pengiriman]}`}>
                      {statusPengirimanLabels[s.status_pengiriman]}
                    </span>
                    <span className="text-sm font-semibold text-black-900">{s.total}</span>
                  </div>
                ))
              )}
            </div>
          </SectionCard>
        </div>
      )}

      <SectionCard
        title="Daftar Order"
        action={<ExportSectionButton type="detail-order" params={pf.params} label="Detail Order" extraParams={detailExportParams} />}
      >
        <div className="flex flex-wrap items-center gap-3 border-b border-black-200 p-5">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="h-10 w-full rounded-lg border border-black-200 bg-surface px-3 text-sm font-medium text-black-700 outline-none transition-colors focus:border-primary-400 focus:ring-2 focus:ring-primary-100 sm:max-w-[180px]"
          >
            <option value="">Semua Status Order</option>
            {detailFilters.status_order.map((s) => (
              <option key={s} value={s}>{statusOrderLabels[s as StatusOrder]}</option>
            ))}
          </select>
          <select
            value={sourceFilter}
            onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }}
            className="h-10 w-full rounded-lg border border-black-200 bg-surface px-3 text-sm font-medium text-black-700 outline-none transition-colors focus:border-primary-400 focus:ring-2 focus:ring-primary-100 sm:max-w-[150px]"
          >
            <option value="">Semua Sumber</option>
            {detailFilters.source.map((s) => (
              <option key={s} value={s}>{s === 'admin' ? 'Admin' : 'Katalog'}</option>
            ))}
          </select>
          <select
            value={garasiFilter}
            onChange={(e) => { setGarasiFilter(e.target.value); setPage(1); }}
            className="h-10 w-full rounded-lg border border-black-200 bg-surface px-3 text-sm font-medium text-black-700 outline-none transition-colors focus:border-primary-400 focus:ring-2 focus:ring-primary-100 sm:max-w-[220px]"
          >
            <option value="">Semua Garasi</option>
            {garasiOptions.map((g) => (
              <option key={g.id} value={g.id}>{g.nama_garasi}</option>
            ))}
          </select>
          <button
            onClick={() => {
              setStatusFilter('');
              setSourceFilter('');
              setGarasiFilter('');
              setPage(1);
            }}
            className="h-10 w-full rounded-lg border border-black-200 px-3 py-1.5 text-xs font-medium text-black-700 transition-colors hover:bg-canvas sm:ml-auto sm:w-auto"
          >
            Reset Filter
          </button>
        </div>
        {loading ? (
          <TableSkeleton rows={6} />
        ) : data && data.data.length > 0 ? (
          <>
            <DataTable
              columns={[
                { label: 'Kode' },
                { label: 'Mulai' },
                { label: 'Customer' },
                { label: 'Kendaraan' },
                { label: 'Order', align: 'center' },
                { label: 'Bayar', align: 'center' },
                { label: 'Total', align: 'right' },
                { label: 'Denda', align: 'right' },
                { label: 'Harga Beli', align: 'right' },
                { label: 'Margin', align: 'right' },
                { label: 'Laba', align: 'right' },
                { label: 'Aksi', align: 'center' },
              ]}
              footer={
                <TotalRow
                  colSpan={6}
                  label="Subtotal halaman"
                  totals={[
                    formatRupiah(pageTotals.total),
                    formatRupiah(pageTotals.denda),
                    formatRupiah(pageTotals.beban),
                    `${pageMargin.toFixed(1)}%`,
                    formatRupiah(pageTotals.laba),
                    '',
                  ]}
                />
              }
            >
              {data.data.map((o) => (
                <tr key={o.order_id} className="cursor-pointer transition-colors odd:bg-white even:bg-canvas/40 hover:bg-primary-50/40" onClick={() => setSelectedOrder(o)}>
                  <td className="px-5 py-3 font-mono font-medium text-black-900">{o.kode_order}</td>
                  <td className="px-5 py-3 text-black-700">{o.tanggal_mulai}</td>
                  <td className="px-5 py-3 text-black-700">{o.nama_customer}</td>
                  <td className="px-5 py-3 text-black-700">
                    {o.nama_kendaraan ?? '-'}
                    {o.kategori && <span className="ml-1 text-xs text-black-400">({o.kategori})</span>}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusOrderColors[o.status_order]}`}>
                      {statusOrderLabels[o.status_order]}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusPembayaranColors[o.status_pembayaran]}`}>
                      {statusPembayaranLabels[o.status_pembayaran]}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-black-900">{formatRupiah(o.harga_total)}</td>
                  <td className="px-5 py-3 text-right font-mono text-black-700">{formatRupiah(o.denda_overtime)}</td>
                  <td className="px-5 py-3 text-right font-mono text-black-700">{formatRupiah(o.beban_partner)}</td>
                  <td className="px-5 py-3 text-right font-mono text-black-700">{o.beban_partner > 0 || (o.komisi_calo ?? 0) > 0 ? `${o.margin.toFixed(1)}%` : '-'}</td>
                  <td className={`px-5 py-3 text-right font-mono font-semibold ${o.laba >= 0 ? 'text-success-600' : 'text-error-600'}`}>
                    {o.beban_partner > 0 || (o.komisi_calo ?? 0) > 0 ? formatRupiah(o.laba) : '-'}
                  </td>
                  <td className="px-5 py-3 text-center text-primary-600">Detail</td>
                </tr>
              ))}
            </DataTable>
            {pagination && pagination.last_page > 1 && (
              <div className="flex flex-col items-center justify-between gap-3 border-t border-black-200 px-5 py-3 sm:flex-row">
                <span className="text-xs text-black-400">
                  Menampilkan{' '}
                  <span className="font-semibold text-black-700">
                    {(pagination.current_page - 1) * pagination.per_page + 1}–{Math.min(pagination.current_page * pagination.per_page, pagination.total)}
                  </span>{' '}
                  dari <span className="font-semibold text-black-700">{pagination.total}</span> data
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={pagination.current_page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="rounded-lg border border-black-200 bg-surface px-2.5 py-1.5 text-xs font-medium text-black-700 transition-colors hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Sebelumnya
                  </button>
                  {Array.from({ length: pagination.last_page }).map((_, i) => {
                    const n = i + 1;
                    const show =
                      n === 1 ||
                      n === pagination.last_page ||
                      Math.abs(n - pagination.current_page) <= 1;
                    if (!show) {
                      const prevShown = n === 2 || (n === pagination.current_page - 2 && pagination.current_page > 3);
                      return prevShown ? <span key={`e-${n}`} className="px-1 text-xs text-black-400">…</span> : null;
                    }
                    return (
                      <button
                        key={n}
                        onClick={() => setPage(n)}
                        className={`h-7 min-w-7 rounded-lg px-2 text-xs font-semibold transition-colors ${
                          n === pagination.current_page
                            ? 'bg-primary-500 text-white'
                            : 'text-black-700 hover:bg-canvas'
                        }`}
                      >
                        {n}
                      </button>
                    );
                  })}
                  <button
                    disabled={pagination.current_page >= pagination.last_page}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-lg border border-black-200 bg-surface px-2.5 py-1.5 text-xs font-medium text-black-700 transition-colors hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Berikutnya
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <EmptyState label="Belum ada data order" />
        )}
      </SectionCard>

      {selectedOrder && <DetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
      </div>
      </div>
      </SectionCardShell>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────
 * TAB — Per Kategori Kendaraan
 * ───────────────────────────────────────────────────────────── */
function PerKategoriTab({ title }: { title: string }) {
  const toast = useToast();
  const pf = usePeriodFilter(toast);
  const [data, setData] = useState<DecisionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedKategori, setSelectedKategori] = useState<DecisionKategoriRow | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    laporanAPI
      .decision(pf.params)
      .then((res) => {
        const d = (res.data as { data: DecisionData }).data;
        setData(d);
      })
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [pf.params]);

  if (loading) {
    return (
      <SectionCardShell title={title} filter={<PeriodFilter state={pf} />}>
        <div className="divide-y divide-black-200">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <div className="skeleton h-3 w-1/4" />
              <div className="skeleton h-3 w-1/6" />
              <div className="skeleton ml-auto h-3 w-1/6" />
            </div>
          ))}
        </div>
      </SectionCardShell>
    );
  }
  if (error) return <ErrorState message={error} />;
  if (!data) return null;

  const total = data.per_kategori.reduce(
    (acc, k) => {
      acc.jumlah_order += k.jumlah_order;
      acc.total_harga += k.total_harga;
      acc.total_beban += k.total_beban;
      acc.total_komisi += k.total_komisi;
      acc.total_laba += k.total_laba;
      return acc;
    },
    { jumlah_order: 0, total_harga: 0, total_beban: 0, total_komisi: 0, total_laba: 0 },
  );

  return (
    <>
      <SectionCardShell
        title={title}
        filter={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <PeriodFilter state={pf} />
            <ExportSectionButton type="per-kategori" params={pf.params} label="Per Kategori" />
          </div>
        }
      >
        {data.per_kategori.length > 0 ? (
          <DataTable
            columns={[
              { label: 'Kategori' },
              { label: 'Order', align: 'right' },
              { label: 'Total Harga', align: 'right' },
              { label: 'Total Beban', align: 'right' },
              { label: 'Total Komisi', align: 'right' },
              { label: 'Total Laba', align: 'right' },
              { label: 'Margin', align: 'right' },
              { label: 'Aksi', align: 'center' },
            ]}
            footer={
              <TotalRow
                colSpan={2}
                totals={[
                  total.jumlah_order,
                  formatRupiah(total.total_harga),
                  formatRupiah(total.total_beban),
                  formatRupiah(total.total_komisi),
                  formatRupiah(total.total_laba),
                  `${total.total_harga > 0 ? ((total.total_laba / total.total_harga) * 100).toFixed(1) : '0.0'}%`,
                ]}
              />
            }
          >
            {data.per_kategori.map((k) => (
              <tr
                key={k.nama_kategori}
                className={`cursor-pointer transition-colors odd:bg-white even:bg-canvas/40 hover:bg-primary-50/40 ${
                  k.kategori_id == null ? 'cursor-default' : ''
                }`}
                onClick={() => k.kategori_id != null && setSelectedKategori(k)}
              >
                <td className="px-5 py-3 font-medium text-black-900">{k.nama_kategori}</td>
                <td className="px-5 py-3 text-right text-black-700">{k.jumlah_order}</td>
                <td className="px-5 py-3 text-right font-mono text-black-900">{formatRupiah(k.total_harga)}</td>
                <td className="px-5 py-3 text-right font-mono text-black-700">{formatRupiah(k.total_beban)}</td>
                <td className="px-5 py-3 text-right font-mono text-black-700">{formatRupiah(k.total_komisi)}</td>
                <td className={`px-5 py-3 text-right font-mono font-semibold ${k.total_laba >= 0 ? 'text-success-600' : 'text-error-600'}`}>
                  {formatRupiah(k.total_laba)}
                </td>
                <td className="px-5 py-3 text-right font-mono text-black-900">
                  {k.total_harga > 0 ? `${((k.total_laba / k.total_harga) * 100).toFixed(1)}%` : '0.0%'}
                </td>
                <td className="px-5 py-3 text-center">
                  {k.kategori_id != null ? (
                    <span className="text-primary-600">Detail</span>
                  ) : (
                    <span className="text-black-300">—</span>
                  )}
                </td>
              </tr>
            ))}
          </DataTable>
        ) : (
          <EmptyState label="Belum ada data kategori" />
        )}
      </SectionCardShell>

      {selectedKategori && selectedKategori.kategori_id != null && (
        <OrderListModal
          title={selectedKategori.nama_kategori}
          params={pf.params}
          kategoriId={selectedKategori.kategori_id}
          onClose={() => setSelectedKategori(null)}
        />
      )}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────
 * TAB — Top Performa
 * ───────────────────────────────────────────────────────────── */
function TopPerformaTab({ title }: { title: string }) {
  const toast = useToast();
  const [decision, setDecision] = useState<DecisionData | null>(null);
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerTopRow | null>(null);
  const pf = usePeriodFilter(toast);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setSelectedCustomer(null);
    Promise.all([laporanAPI.decision(pf.params), laporanAPI.customer(pf.params)])
      .then(([dRes, cRes]) => {
        const d = (dRes.data as { data: DecisionData }).data;
        const raw = (cRes.data as { data: CustomerApiResponse }).data;
        setDecision(d);
        setCustomer({
          customer_top: raw.customer_top.map((c) => ({
            id: c.customer_id,
            nama_lengkap: c.nama_lengkap,
            no_hp: c.no_hp,
            orders_count: c.order_count,
            orders_sum_harga_total: c.total_spend,
            rata_rata_durasi_hari: c.avg_duration,
          })),
          ringkasan: {
            total_customer: raw.ringkasan.total_customers,
            customer_baru: raw.ringkasan.new_customers,
            customer_aktif: raw.ringkasan.active_customers,
            customer_repeat: raw.ringkasan.repeat_customers,
          },
        });
      })
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [pf.params]);

  if (loading) {
    return (
      <SectionCardShell title={title} filter={<PeriodFilter state={pf} />}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <TableSkeleton />
          <TableSkeleton />
        </div>
      </SectionCardShell>
    );
  }
  if (error) return <ErrorState message={error} />;
  if (!decision || !customer) return null;

  return (
    <>
      {/* Satu kartu: filter periode + tabel performa */}
      <div className="overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-black-200">
        {/* Header — judul + filter periode lokal tab */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-lg font-bold text-black-900">{title}</h2>
            <span className="rounded-full bg-canvas px-2.5 py-0.5 text-xs font-medium text-black-500">{pf.label}</span>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <PeriodFilter state={pf} />
          </div>
        </div>

        {/* Sub-tabel: Top 5 Kendaraan Terlaris */}
        <div className="px-5 pt-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h4 className="font-medium text-black-700">Top 5 Kendaraan Terlaris</h4>
            <ExportSectionButton type="top-kendaraan" params={pf.params} label="Top Kendaraan Terlaris" />
          </div>
        </div>
        <TopKendaraanTable rows={decision.top_kendaraan_terlaris} />

        {/* Pembatas antar sub-tabel */}
        <div className="mx-5 mt-6 border-t border-black-100" />

        {/* Sub-tabel: Top Pelanggan */}
        <div className="px-5 pt-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h4 className="font-medium text-black-700">Top Pelanggan</h4>
            <ExportSectionButton type="top-pelanggan" params={pf.params} label="Top Pelanggan" />
          </div>
        </div>
        {customer.customer_top.length > 0 ? (
          <DataTable
            columns={[
              { label: '#' },
              { label: 'Pelanggan' },
              { label: 'No. HP' },
              { label: 'Order', align: 'right' },
              { label: 'Total Harga', align: 'right' },
              { label: 'Rata-rata Durasi', align: 'right' },
            ]}
          >
            {customer.customer_top.map((c, i) => (
              <tr
                key={c.id}
                className="cursor-pointer transition-colors odd:bg-white even:bg-canvas/40 hover:bg-primary-50/40"
                onClick={() => setSelectedCustomer(c)}
                title="Lihat daftar order"
              >
                <td className="px-5 py-3 text-black-400">{i + 1}</td>
                <td className="px-5 py-3 font-medium text-primary-600">{c.nama_lengkap}</td>
                <td className="px-5 py-3 text-black-700">{c.no_hp || '-'}</td>
                <td className="px-5 py-3 text-right text-black-900">{c.orders_count}</td>
                <td className="px-5 py-3 text-right font-mono text-black-900">{formatRupiah(c.orders_sum_harga_total)}</td>
                <td className="px-5 py-3 text-right text-black-700">
                  {c.rata_rata_durasi_hari != null ? `${c.rata_rata_durasi_hari.toFixed(1)} hari` : '-'}
                </td>
              </tr>
            ))}
          </DataTable>
        ) : (
          <EmptyState label="Belum ada data pelanggan" />
        )}
      </div>

      {selectedCustomer && (
        <InfoOrderListModal
          title={selectedCustomer.nama_lengkap}
          subtitle={`${selectedCustomer.orders_count} order selesai • ${pf.label}`}
          params={pf.params}
          customerId={selectedCustomer.id}
          onClose={() => setSelectedCustomer(null)}
        />
      )}
    </>
  );
}

function TopKendaraanTable({ rows }: { rows: DecisionKendaraanRow[] }) {
  if (rows.length === 0) return <EmptyState label="Belum ada data kendaraan" />;
  return (
    <DataTable
      columns={[
        { label: 'Kendaraan' },
        { label: 'Kategori' },
        { label: 'Order', align: 'right' },
        { label: 'Total Harga', align: 'right' },
        { label: 'Total Laba', align: 'right' },
      ]}
    >
      {rows.map((v) => (
        <tr key={v.id}>
          <td className="px-5 py-3 font-medium text-black-900">{v.nama_kendaraan}</td>
          <td className="px-5 py-3 text-black-700">{v.kategori}</td>
          <td className="px-5 py-3 text-right text-black-700">{v.jumlah_order}</td>
          <td className="px-5 py-3 text-right font-mono text-black-900">{formatRupiah(v.total_harga)}</td>
          <td className={`px-5 py-3 text-right font-mono font-semibold ${v.total_laba >= 0 ? 'text-success-600' : 'text-error-600'}`}>
            {formatRupiah(v.total_laba)}
          </td>
        </tr>
      ))}
    </DataTable>
  );
}

function SectionWrapper({ id, children }: { id: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20">
      {children}
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
 * HALAMAN UTAMA
 * ───────────────────────────────────────────────────────────── */
export default function Laporan() {
  const toast = useToast();
  const [exporting, setExporting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [exportOpen, setExportOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(sections[0].id);
  const exportPf = usePeriodFilter(toast);

  // Scroll-spy: tandai bagian yang sedang terlihat di viewport
  useEffect(() => {
    const observers = sections.map((sec) => {
      const el = document.getElementById(sec.id);
      if (!el) return null;
      const obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) setActiveSection(sec.id);
          });
        },
        { rootMargin: '-15% 0px -70% 0px', threshold: 0 },
      );
      obs.observe(el);
      return obs;
    });
    return () => observers.forEach((o) => o?.disconnect());
  }, []);

  const goToSection = (id: string) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleDownloadDetail = async (format: 'csv' | 'xlsx') => {
    setExporting(true);
    try {
      const resp = await laporanAPI.exportDetailOrder(format, exportPf.params);
      downloadBlob(resp.data, `laporan-detail-${exportPf.params.start_date}-${exportPf.params.end_date}.${format}`, format);
      toast.success('Laporan berhasil diunduh');
    } catch (err) {
      exportErrorToast(err, toast);
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadAll = async () => {
    setExporting(true);
    try {
      const resp = await laporanAPI.export('all', 'xlsx', exportPf.params);
      downloadBlob(resp.data, `laporan-semua-${exportPf.params.start_date}-${exportPf.params.end_date}.xlsx`, 'xlsx');
      toast.success('Semua laporan berhasil diunduh');
    } catch (err) {
      exportErrorToast(err, toast);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header — hanya judul + tombol aksi, gradasi senada Sidebar */}
      <div className="rounded-2xl bg-gradient-to-r from-black-900 via-black-800 to-primary-700 text-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 p-5 sm:px-6 lg:flex-row lg:items-center">
          <div>
            <h1 className="font-display text-2xl font-bold">Laporan</h1>
            <p className="mt-1 text-sm text-black-200">Pantau performa order, pendapatan, dan customer dalam satu tempat.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              title="Muat ulang data"
              className="flex h-9 items-center gap-1.5 rounded-lg bg-white/10 px-3 text-sm font-medium text-white backdrop-blur transition-colors hover:bg-white/20"
            >
              <RefreshCw className="h-4 w-4" />
              Muat Ulang
            </button>

            {/* Dropdown Export */}
            <div className="relative">
              <button
                onClick={() => setExportOpen((o) => !o)}
                disabled={exporting}
                className="flex h-9 items-center gap-1.5 rounded-lg bg-primary-500 px-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-600 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                {exporting ? 'Mengunduh...' : 'Export'}
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </button>
              {exportOpen && (
                <div className="absolute right-0 z-30 mt-2 w-[28rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-black-200 bg-surface shadow-lg">
                  <div className="border-b border-black-200 px-4 py-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-black-400">
                      Periode Export
                    </p>
                    <PeriodFilter state={exportPf} />
                  </div>
                  <p className="border-b border-black-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-black-400">
                    Detail Order
                  </p>
                  <button
                    onClick={() => { handleDownloadDetail('xlsx'); setExportOpen(false); }}
                    disabled={exporting}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-black-700 transition-colors hover:bg-canvas disabled:opacity-50"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-success-500" />
                    Unduh Excel
                  </button>
                  <button
                    onClick={() => { handleDownloadDetail('csv'); setExportOpen(false); }}
                    disabled={exporting}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-black-700 transition-colors hover:bg-canvas disabled:opacity-50"
                  >
                    <FileText className="h-4 w-4 text-primary-500" />
                    Unduh CSV
                  </button>
                  <div className="border-t border-black-200">
                    <button
                      onClick={() => { handleDownloadAll(); setExportOpen(false); }}
                      disabled={exporting}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-black-700 transition-colors hover:bg-canvas disabled:opacity-50"
                    >
                    <Download className="h-4 w-4 text-success-500" />
                    <span>
                      <span className="block">Semua Laporan (Excel)</span>
                      <span className="block text-xs font-normal text-black-400">Detail order + keputusan + 9 laporan</span>
                    </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Kartu kontrol — navigasi lompat section */}
      <div className="sticky top-0 z-20 rounded-2xl border-t border-black-200 bg-surface px-2 py-2 shadow-sm">
        {/* Navigasi lompat cepat, sticky, sorot bagian aktif */}
        <div className="flex gap-1 overflow-x-auto rounded-lg bg-canvas p-1">
            {sections.map((sec) => {
              const isActive = activeSection === sec.id;
              const Icon = sec.icon;
              return (
                <button
                  key={sec.id}
                  onClick={() => goToSection(sec.id)}
                  className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-surface text-primary-600 shadow-sm ring-1 ring-black-200'
                      : 'text-black-500 hover:bg-surface hover:text-primary-600'
                  }`}
                  title={sec.label}
                  aria-current={isActive ? 'true' : undefined}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {sec.label}
                </button>
              );
            })}
        </div>
      </div>

      {/* Eksekutif Summary — ringkasan cepat */}
      <ExecutiveSummary />

      {/* Semua bagian bertumpuk — satu kartu per nomor */}
      <div className="space-y-8">
        <SectionWrapper id="detail-order">
          <DetailOrderTab key={refreshKey} title="1. Detail Order" />
        </SectionWrapper>
        <SectionWrapper id="per-kategori">
          <PerKategoriTab key={`pk-${refreshKey}`} title="2. Per Kategori" />
        </SectionWrapper>
        <SectionWrapper id="top-performa">
          <TopPerformaTab key={`tp-${refreshKey}`} title="3. Top Performa" />
        </SectionWrapper>
        <SectionWrapper id="pendapatan">
          <PendapatanTab key={`pend-${refreshKey}`} title="4. Pendapatan" />
        </SectionWrapper>
        <SectionWrapper id="kendaraan">
          <KendaraanTab key={`kend-${refreshKey}`} title="5. Kendaraan" />
        </SectionWrapper>
        <SectionWrapper id="rekap-garasi">
          <RekapGarasiTab key={`rg-${refreshKey}`} title="6. Rekap per Garasi" />
        </SectionWrapper>
        <SectionWrapper id="komisi-calo">
          <KomisiCaloTab key={`kc-${refreshKey}`} title="7. Komisi Calo" />
        </SectionWrapper>
        <SectionWrapper id="piutang">
          <PiutangTab key={`piut-${refreshKey}`} title="8. Piutang" />
        </SectionWrapper>
      </div>
    </div>
  );
}