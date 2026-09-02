import { useState, useEffect, useCallback, useRef, useMemo, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { isAxiosError } from 'axios';
import { orderAPI, customerAPI, kendaraanAPI, supirCaloAPI, settingsAPI, inspeksiAPI, type Customer, type Kendaraan, type SupirCalo, type Order, type OrderCancelPreview, type InspeksiKendaraan } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import ConfirmModal from '../components/ConfirmModal';
import { formatHpDisplay, formatHpWa, todayJakarta, nowWIB, nowWIBTime, formatRupiah, warnaKendaraanHex } from '../lib/format';

/**
 * ─────────────────────────────────────────────────────────────
 * PERBAIKAN FILTER (permintaan utama halaman ini)
 * ─────────────────────────────────────────────────────────────
 * Sebelumnya ada 3 dropdown terpisah (status_order, status_pengiriman,
 * status_pembayaran) yang dikirim sebagai filter AND ke API sekaligus.
 * Banyak kombinasi tidak pernah terjadi secara bisnis (mis. "Aktif" +
 * "Belum Diambil"), sehingga hasil selalu kosong dan terasa "bentrok".
 *
 * Solusi: SATU kontrol filter berbentuk tab status, dengan pilihan yang
 * sudah dikurasi sesuai siklus hidup order (bukan kombinasi mentah 3
 * dimensi). Status pembayaran & pengiriman tetap tampil sebagai badge
 * di tiap baris — hanya tidak lagi jadi filter terpisah yang saling tabrak.
 * ───────────────────────────────────────────────────────────── */

type StatusOrder = 'pending' | 'confirmed' | 'active' | 'perlu_verifikasi' | 'completed' | 'cancelled';
type StatusPembayaran = 'unpaid' | 'partial' | 'paid';
type StatusPengiriman = 'belum_diambil' | 'sudah_diantarkan' | 'dalam_penyewaan' | 'selesai' | 'sudah_dikembalikan';
type MetodePembayaran = 'cash' | 'transfer' | 'qris' | 'lainnya';
type StatusFilter = '' | StatusOrder | 'overdue';

const statusPembayaranOptions: StatusPembayaran[] = ['unpaid', 'partial', 'paid'];

// Tarif denda keterlambatan per jam — diambil dari backend supaya
// selalu konsisten (single source of truth di OvertimeCalculator).
const DEFAULT_OVERTIME_RATE = 25000;

// Jumlah order per pemuatan — tetap di belakang layar (tanpa pilihan UI)
// supaya baris filter tetap bersih.
const PER_PAGE = 30;

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

const metodePembayaranLabels: Record<MetodePembayaran, string> = {
  cash: 'Tunai',
  transfer: 'Transfer',
  qris: 'QRIS',
  lainnya: 'Lainnya',
};

// Badge warna per domain status — token tema: primary (biru), accent (amber), success (hijau), error (merah)
const statusOrderColors: Record<string, string> = {
  pending: 'bg-accent-50 text-accent-700',
  confirmed: 'bg-primary-50 text-primary-500',
  active: 'bg-primary-100 text-primary-600',
  perlu_verifikasi: 'bg-accent-50 text-accent-700',
  completed: 'bg-success-50 text-success-600',
  cancelled: 'bg-error-50 text-error-600',
};

const statusPembayaranColors: Record<string, string> = {
  unpaid: 'bg-error-50 text-error-600',
  partial: 'bg-accent-50 text-accent-600',
  paid: 'bg-success-50 text-success-600',
};

const statusPengirimanColors: Record<string, string> = {
  belum_diambil: 'bg-accent-100 text-accent-700',
  sudah_diantarkan: 'bg-primary-50 text-primary-500',
  dalam_penyewaan: 'bg-primary-100 text-primary-600',
  selesai: 'bg-success-50 text-success-600',
  sudah_dikembalikan: 'bg-success-50 text-success-600',
};

// Status turunan (hasil hitung, bukan enum) — Terlambat.
const OVERDUE_BADGE = 'bg-error-50 text-error-600';

const formatJam = (jam: number): string => {
  const hari = Math.floor(jam / 24);
  const sisaJam = jam % 24;
  if (hari === 0) return `${sisaJam} jam`;
  if (sisaJam === 0) return `${hari} hari`;
  return `${hari} hari ${sisaJam} jam`;
};

const inputClass =
  'w-full rounded-lg border border-black-200 px-3 py-2 text-sm text-black-900 outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500';

/* ─────────────────────────────────────────────────────────────
 * TYPES — ENTITAS (di-import dari api.ts sebagai single source of truth)
 * ───────────────────────────────────────────────────────────── */

const orderCardBorderColor: Record<string, string> = {
  pending: 'border-t-accent-500',
  confirmed: 'border-t-primary-500',
  active: 'border-t-primary-500',
  perlu_verifikasi: 'border-t-accent-500',
  completed: 'border-t-success-500',
  cancelled: 'border-t-error-500',
};
const orderStatusDotColor: Record<string, string> = {
  pending: 'bg-accent-500',
  confirmed: 'bg-primary-500',
  active: 'bg-primary-500',
  perlu_verifikasi: 'bg-accent-500',
  completed: 'bg-success-500',
  cancelled: 'bg-error-500',
};

interface OrderForm {
  customer_id: string;
  customer_name: string;
  customer_no_hp: string;
  customer_email: string;
  customer_alamat: string;
  customer_no_ktp: string;
  customer_no_sim: string;
  kendaraan_id: string;
  alamat_jemput: string;
  tujuan: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  jam_mulai: string;
  jam_selesai: string;
  harga_per_hari: string;
  metode_pembayaran: MetodePembayaran;
  status_order: StatusOrder;
  status_pembayaran: StatusPembayaran;
  status_pengiriman: StatusPengiriman;
  metode_penyerahan: 'ambil' | 'antar';
  jumlah_bayar: string;
  opsi_supir: 'dengan_supir' | 'lepas_kunci';
  calo_id: string;
  catatan: string;
}

type OrderEditForm = Partial<OrderForm>;

interface ConfirmActionState {
  title: string;
  message: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
}

interface ListResponse<T> {
  data: T[];
  meta?: {
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
  };
  counts?: {
    total: number;
    status: Record<string, number>;
    overdue: number;
  };
}

const emptyForm: OrderForm = {
  customer_id: '',
  customer_name: '',
  customer_no_hp: '',
  customer_email: '',
  customer_alamat: '',
  customer_no_ktp: '',
  customer_no_sim: '',
  kendaraan_id: '',
  alamat_jemput: '',
  tujuan: '',
  tanggal_mulai: '',
  tanggal_selesai: '',
  jam_mulai: '08:00',
  jam_selesai: '17:00',
  harga_per_hari: '',
  metode_pembayaran: 'cash',
  status_order: 'confirmed',
  status_pembayaran: 'unpaid',
  status_pengiriman: 'belum_diambil',
  metode_penyerahan: 'ambil',
  jumlah_bayar: '',
  opsi_supir: 'lepas_kunci',
  calo_id: '',
  catatan: '',
};

const fmtDate = (d: string | null | undefined) => {
  if (!d) return '-';
  const s = typeof d === 'string' ? d.split('T')[0] : d;
  return s || '-';
};

const fmtTime = (t: string | null | undefined) => {
  if (!t) return '';
  return t.length > 5 ? t.substring(0, 5) : t;
};

const fmtPeriode = (d: string) =>
  new Date(`${d}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

/* ─────────────────────────────────────────────────────────────
 * IKON
 * ───────────────────────────────────────────────────────────── */
const PencilIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
    />
  </svg>
);

const EyeIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
    />
  </svg>
);

const TrashIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
);

const CloseIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

/* ─────────────────────────────────────────────────────────────
 * KOMPONEN BANTU
 * ───────────────────────────────────────────────────────────── */
function UploadBox({
  label,
  hint,
  fileName,
  onFile,
  icon,
}: {
  label: string;
  hint: string;
  fileName?: string;
  onFile: (file: File | null) => void;
  icon: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-black-200 px-4 py-3 transition-colors hover:border-primary-400 hover:bg-primary-50/50">
      {icon}
      <div className="text-center">
        <p className="text-sm text-black-700">{fileName || label}</p>
        <p className="text-xs text-black-400">{hint}</p>
      </div>
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          const file = e.target.files?.[0] ?? null;
          if (file && file.size > 2 * 1024 * 1024) { alert('Ukuran file maksimal 2MB'); e.target.value = ''; return; }
          onFile(file);
        }}
      />
    </label>
  );
}

function ImagePreview({ src, onRemove }: { src: string | null; onRemove?: () => void }) {
  if (!src) return null;
  return (
    <div className="relative mb-2 inline-block">
      <img src={src} alt="Preview" className="h-32 w-32 rounded-xl border border-black-200 object-cover" />
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-error-500 text-white transition-colors hover:bg-error-600"
          aria-label="Hapus gambar"
        >
          <CloseIcon className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

function StatChip({ label, value, iconBg, icon }: { label: string; value: number; iconBg: string; icon: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-black-200">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
        <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
        </svg>
      </div>
      <div>
        <p className="text-lg font-bold leading-tight text-black-900">{value}</p>
        <p className="text-xs text-black-400">{label}</p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * FILTER STATUS — satu kontrol tab, menggantikan 3 dropdown lama
 * ───────────────────────────────────────────────────────────── */
const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: '', label: 'Semua' },
  { key: 'pending', label: 'Menunggu' },
  { key: 'confirmed', label: 'Dikonfirmasi' },
  { key: 'active', label: 'Sedang Disewa' },
  { key: 'perlu_verifikasi', label: 'Perlu Verifikasi' },
  { key: 'overdue', label: 'Terlambat' },
  { key: 'completed', label: 'Selesai' },
  { key: 'cancelled', label: 'Dibatalkan' },
];

function StatusFilterTabs({
  active,
  onChange,
  overdueCount,
  verifikasiCount,
}: {
  active: StatusFilter;
  onChange: (v: StatusFilter) => void;
  overdueCount: number;
  verifikasiCount: number;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-xl bg-canvas p-1">
      {STATUS_TABS.map((tab) => (
        <button
          key={tab.key || 'semua'}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${
            active === tab.key ? 'bg-white text-primary-600 shadow-sm' : 'text-black-400 hover:text-black-700'
          }`}
        >
          {tab.label}
          {tab.key === 'overdue' && overdueCount > 0 && (
            <span className="rounded-full bg-error-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">{overdueCount}</span>
          )}
          {tab.key === 'perlu_verifikasi' && verifikasiCount > 0 && (
            <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">{verifikasiCount}</span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * HALAMAN UTAMA
 * ───────────────────────────────────────────────────────────── */
export default function Orders() {
  const toast = useToast();
  const { user } = useAuth();
  const canManage = ['admin_utama', 'admin_operasional'].includes(user?.role ?? '');
  const [items, setItems] = useState<Order[]>([]);
  const [meta, setMeta] = useState<ListResponse<Order>['meta']>(undefined);
  const [counts, setCounts] = useState<ListResponse<Order>['counts']>(undefined);
  const [page, setPage] = useState(1);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [kendaraans, setKendaraans] = useState<Kendaraan[]>([]);
  const [allKendaraans, setAllKendaraans] = useState<Kendaraan[]>([]);
  const [calos, setCalos] = useState<SupirCalo[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [overtimeRate, setOvertimeRate] = useState(DEFAULT_OVERTIME_RATE);
  const [tarifSupirGlobal, setTarifSupirGlobal] = useState(150000);

  // ── Filter (disatukan) ────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const loadRequestId = useRef(0);
  const pageRef = useRef(1);

  const [showForm, setShowForm] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [form, setForm] = useState<OrderForm>(emptyForm);
  const [kendaraanSearch, setKendaraanSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<Order | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmActionState | null>(null);
  const [cancelOrder, setCancelOrder] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelPreview, setCancelPreview] = useState<OrderCancelPreview | null>(null);
  const [cancelPreviewLoading, setCancelPreviewLoading] = useState(false);
  const [confirmComplete, setConfirmComplete] = useState<Order | null>(null);
  const [completeReturnInspeksi, setCompleteReturnInspeksi] = useState<InspeksiKendaraan | null>(null);
  const [completeInspeksiLoading, setCompleteInspeksiLoading] = useState(false);
  const [completePaymentFile, setCompletePaymentFile] = useState<File | null>(null);
  const [completePaymentPreview, setCompletePaymentPreview] = useState<string | null>(null);
  const [completeReturnTime, setCompleteReturnTime] = useState(nowWIB());
  const [completePaymentAmount, setCompletePaymentAmount] = useState('');
  const [completeKerusakanAmount, setCompleteKerusakanAmount] = useState('');
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);
  const [buktiBaruFile, setBuktiBaruFile] = useState<File | null>(null);
  const [buktiBaruPreview, setBuktiBaruPreview] = useState<string | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [isKonfirmasi, setIsKonfirmasi] = useState(false);
  const [editKendaraanSearch, setEditKendaraanSearch] = useState('');
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editForm, setEditForm] = useState<OrderEditForm>({});
  const [editBuktiFile, setEditBuktiFile] = useState<File | null>(null);
  const [editBuktiPreview, setEditBuktiPreview] = useState<string | null>(null);
  const [editBuktiNewPreview, setEditBuktiNewPreview] = useState<string | null>(null);
  const [newPaymentAmount, setNewPaymentAmount] = useState<string>('');

  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [editCustomerSearch, setEditCustomerSearch] = useState('');
  const [showEditCustomerSuggestions, setShowEditCustomerSuggestions] = useState(false);
  const customerSearchRef = useRef<HTMLDivElement>(null);
  const editCustomerSearchRef = useRef<HTMLDivElement>(null);
  const editKendaraanListRef = useRef<HTMLDivElement>(null);

  const [custFotoKtpFile, setCustFotoKtpFile] = useState<File | null>(null);
  const [custFotoKtpPreview, setCustFotoKtpPreview] = useState<string | null>(null);
  const [custFotoKtpDelete, setCustFotoKtpDelete] = useState(false);
  const [editCustFotoKtpFile, setEditCustFotoKtpFile] = useState<File | null>(null);
  const [editCustFotoKtpPreview, setEditCustFotoKtpPreview] = useState<string | null>(null);
  const [editCustFotoKtpDelete, setEditCustFotoKtpDelete] = useState(false);

  // M5: Revoke each blob preview URL before replacing it to prevent memory leaks.

  // Ambil pengaturan dari backend (tarif denda overtime, tarif supir global, dll.)
  useEffect(() => {
    settingsAPI.get().then(({ data }) => {
      setOvertimeRate(data.overtime_rate_per_hour);
      if (data.biaya_dengan_driver_per_hari != null) {
        setTarifSupirGlobal(data.biaya_dengan_driver_per_hari);
      }
    }).catch(() => {});
  }, []);

  // Auto-scroll ke kendaraan yang dipilih saat modal edit/konfirmasi dibuka
  useEffect(() => {
    if (!showEditForm || !editForm.kendaraan_id) return;
    const timer = setTimeout(() => {
      const el = editKendaraanListRef.current?.querySelector('[data-selected="true"]');
      el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }, 100);
    return () => clearTimeout(timer);
  }, [showEditForm, editForm.kendaraan_id]);

  // Click outside to close customer suggestions
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (customerSearchRef.current && !customerSearchRef.current.contains(e.target as Node)) {
        setShowCustomerSuggestions(false);
      }
      if (editCustomerSearchRef.current && !editCustomerSearchRef.current.contains(e.target as Node)) {
        setShowEditCustomerSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return [];
    const q = customerSearch.toLowerCase();
    return customers
      .filter((c) => c.nama_lengkap.toLowerCase().includes(q) || (c.no_ktp ?? '').toLowerCase().includes(q))
      .slice(0, 8);
  }, [customerSearch, customers]);

  const filteredEditCustomers = useMemo(() => {
    if (!editCustomerSearch) return [];
    const q = editCustomerSearch.toLowerCase();
    return customers
      .filter((c) => c.nama_lengkap.toLowerCase().includes(q) || (c.no_ktp ?? '').toLowerCase().includes(q))
      .slice(0, 8);
  }, [editCustomerSearch, customers]);

  const ktpConflict = useMemo(() => {
    const ktp = (form.customer_no_ktp || '').trim();
    if (!ktp || form.customer_id) return null;
    return customers.find((c) => c.no_ktp && c.no_ktp.trim() === ktp) ?? null;
  }, [form.customer_no_ktp, form.customer_id, customers]);

  const editKtpConflict = useMemo(() => {
    const ktp = (editForm.customer_no_ktp || '').trim();
    if (!ktp || editForm.customer_id) return null;
    return customers.find((c) => c.no_ktp && c.no_ktp.trim() === ktp) ?? null;
  }, [editForm.customer_no_ktp, editForm.customer_id, customers]);

  const nameConflict = useMemo(() => {
    const nama = (form.customer_name || '').trim();
    if (!nama || form.customer_id || ktpConflict) return null;
    const hp = formatHpWa(form.customer_no_hp || '');
    return (
      customers.find(
        (c) =>
          c.nama_lengkap.trim().toLowerCase() === nama.toLowerCase() &&
          (!c.no_hp || !hp || formatHpWa(c.no_hp) !== hp),
      ) ?? null
    );
  }, [form.customer_name, form.customer_no_hp, form.customer_id, customers, ktpConflict]);

  const editNameConflict = useMemo(() => {
    const nama = (editForm.customer_name || '').trim();
    if (!nama || editForm.customer_id || editKtpConflict) return null;
    const hp = formatHpWa(editForm.customer_no_hp || '');
    return (
      customers.find(
        (c) =>
          c.nama_lengkap.trim().toLowerCase() === nama.toLowerCase() &&
          (!c.no_hp || !hp || formatHpWa(c.no_hp) !== hp),
      ) ?? null
    );
  }, [editForm.customer_name, editForm.customer_no_hp, editForm.customer_id, customers, editKtpConflict]);


  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const load = useCallback(
    (pageNum?: number, append = false) => {
      const requestId = ++loadRequestId.current;
      setLoading(true);
      const targetPage = pageNum ?? pageRef.current;
      const params: Record<string, string> = { search: debouncedSearch, page: String(targetPage), per_page: String(PER_PAGE) };

      if (dateFrom && dateTo) {
        params.tanggal_mulai = dateFrom;
        params.tanggal_selesai = dateTo;
      }

      // 'overdue' bukan status asli di database — server menyaringnya dari
      // batas waktu pengembalian (Order::batasWaktuKembali()).
      if (statusFilter === 'overdue') {
        params.overdue = '1';
      } else if (statusFilter) {
        params.status_order = statusFilter;
      }

      orderAPI
        .list(params)
        .then(({ data }: { data: ListResponse<Order> }) => {
          if (requestId !== loadRequestId.current) return; // M2: ignore stale response
          setItems((prev) => (append ? [...prev, ...data.data] : data.data));
          setMeta(data.meta);
          setCounts(data.counts);
          // Jangan update state `page` saat append — kalau di-set, effect
          // [load] akan refetch ulang (non-append) dan membuang daftar bertumpuk.
          if (!append) setPage(targetPage);
          pageRef.current = targetPage;
        })
        .catch(() => { if (requestId === loadRequestId.current) toast.error('Gagal memuat data order'); })
        .finally(() => { if (requestId === loadRequestId.current) setLoading(false); });
    },
    [debouncedSearch, dateFrom, dateTo, statusFilter, toast]
  );

  // Pindah ke halaman pertama saat pencarian/filter berubah. Dideklarasikan
  // SEBELUM effect refetch supaya `pageRef` sudah di-reset duluan saat filter
  // berubah — kalau tidak, refetch bisa memuat halaman lama yang sudah tidak relevan.
  useEffect(() => {
    if (pageRef.current !== 1) {
      pageRef.current = 1;
      setPage(1);
    }
  }, [debouncedSearch, dateFrom, dateTo, statusFilter]);

  useEffect(() => {
    load();
  }, [load, page]);

  // Auto-refresh: segarkan halaman 1 tiap 60 detik selama user belum
  // menumpuk halaman via "Muat Lebih" (agar tidak mereset daftar saat scroll).
  useEffect(() => {
    const timer = setInterval(() => {
      if (pageRef.current === 1) load(1);
    }, 60_000);
    return () => clearInterval(timer);
  }, [load, page]);

  // Isi otomatis tanggal pasangannya saat rentang terbalik, supaya tidak
  // berakhir dengan filter kosong yang membingungkan.
  const handleDateFrom = (v: string) => {
    setDateFrom(v);
    if (v && dateTo && v > dateTo) setDateTo(v);
  };
  const handleDateTo = (v: string) => {
    setDateTo(v);
    if (v && dateFrom && v < dateFrom) setDateFrom(v);
  };
  const resetPeriode = () => {
    setDateFrom('');
    setDateTo('');
  };

  useEffect(() => {
    if (!canManage) return;
    customerAPI
      .list()
      .then(({ data }: { data: ListResponse<Customer> }) => setCustomers(data.data))
      .catch(() => toast.error('Gagal memuat data customer'));
    kendaraanAPI
      .list({ per_page: 100 })
      .then(({ data }: { data: ListResponse<Kendaraan> }) => { setKendaraans(data.data); setAllKendaraans(data.data); })
      .catch(() => toast.error('Gagal memuat data kendaraan'));
    supirCaloAPI
      .list({ jenis: 'calo' })
      .then(({ data }: { data: ListResponse<SupirCalo> }) => setCalos(data.data))
      .catch(() => toast.error('Gagal memuat data calo'));
  }, [canManage, toast]);

  // Saat modal buat order terbuka dan tanggal mulai/selesai sudah diisi,
  // muat ulang daftar mobil yang TIDAK bertabrakan dengan rentang tanggal
  // tersebut (server yang memfilter). Mobil dengan order masa depan yang
  // tidak beririsan tetap bisa dipilih.
  // Penanda urutan: respons yang datang terlambat tidak boleh menimpa
  // hasil permintaan yang lebih baru.
  const kendaraanFetchId = useRef(0);
  useEffect(() => {
    if (!showForm || !canManage) return;
    const from = form.tanggal_mulai;
    const to = form.tanggal_selesai;
    const fetchId = ++kendaraanFetchId.current;
    const t = setTimeout(() => {
      kendaraanAPI
        .list({ per_page: 100, ...(from && to ? { available_from: from, available_to: to } : {}) })
        .then(({ data }: { data: ListResponse<Kendaraan> }) => {
          if (fetchId === kendaraanFetchId.current) setKendaraans(data.data);
        })
        .catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, [showForm, canManage, form.tanggal_mulai, form.tanggal_selesai]);

  // Ringkasan cepat — ambil hitungan nyata dari server (semua order, bukan cuma halaman ini).
  const stats = useMemo(
    () => ({
      total: counts?.total ?? meta?.total ?? items.length,
      aktif: counts?.status?.active ?? items.filter((i) => i.status_order === 'active').length,
      menunggu: counts?.status?.pending ?? items.filter((i) => i.status_order === 'pending').length,
      perluVerifikasi:
        counts?.status?.perlu_verifikasi ?? items.filter((i) => i.status_order === 'perlu_verifikasi').length,
      terlambat: counts?.overdue ?? items.filter((i) => i.status_order === 'active' && i.jam_overtime_saat_ini > 0).length,
    }),
    [counts, meta, items]
  );

  const groupedItems = useMemo(() => {
    const map = new Map<string, Order[]>();
    for (const o of items) {
      const key = o.tanggal_mulai ? String(o.tanggal_mulai).slice(0, 7) : 'tanpa-tanggal';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(o);
    }
    return Array.from(map.entries()).map(([key, list]) => {
      const [y, m] = key.split('-').map(Number);
      const label =
        key === 'tanpa-tanggal' || !y || !m || Number.isNaN(y) || Number.isNaN(m)
          ? 'Tanpa Tanggal'
          : new Date(y, m - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
      return { key, label, list };
    });
  }, [items]);

  // Order yang sedang aktif TAPI sudah lewat batas waktu pengembalian.
  const overdueItems = useMemo(() => items.filter((i) => i.status_order === 'active' && i.jam_overtime_saat_ini > 0), [items]);
  const verifikasiItems = useMemo(() => items.filter((i) => i.status_order === 'perlu_verifikasi'), [items]);
  const [alertDismissed, setAlertDismissed] = useState(false);
  const prevOverdueCountRef = useRef(overdueItems.length);
  useEffect(() => {
    // Reset alert hanya jika jumlah overdue BERUBAH (order baru terlambat
    // atau order terlambat terselesaikan), bukan setiap kali items di-poll.
    if (overdueItems.length !== prevOverdueCountRef.current) {
      setAlertDismissed(false);
      prevOverdueCountRef.current = overdueItems.length;
    }
  }, [overdueItems]);

  const [alertVerifikasiDismissed, setAlertVerifikasiDismissed] = useState(false);
  const prevVerifikasiCountRef = useRef(verifikasiItems.length);
  useEffect(() => {
    if (verifikasiItems.length !== prevVerifikasiCountRef.current) {
      setAlertVerifikasiDismissed(false);
      prevVerifikasiCountRef.current = verifikasiItems.length;
    }
  }, [verifikasiItems]);

  const closeCreateModal = () => {
    setShowForm(false);
    setCreateStep(1);
    setKendaraanSearch('');
    setCustomerSearch('');
    if (buktiBaruPreview) URL.revokeObjectURL(buktiBaruPreview);
    setBuktiBaruFile(null);
    setBuktiBaruPreview(null);
    if (custFotoKtpPreview) URL.revokeObjectURL(custFotoKtpPreview);
    setCustFotoKtpFile(null);
    setCustFotoKtpPreview(null);
    setCustFotoKtpDelete(false);
  };

  const validateStep1 = (): string | null => {
    if (!form.customer_name.trim()) return 'Nama customer wajib diisi';
    if (!form.customer_no_hp) return 'No. HP wajib diisi';
    if (!form.customer_no_sim) return 'No. Identitas (SIM) wajib diisi';
    if (!form.customer_alamat.trim()) return 'Alamat wajib diisi';
    if (!form.customer_id && !custFotoKtpFile) return 'Dokumen identitas wajib diupload untuk customer baru';
    return null;
  };

  const validateStep2 = (): string | null => {
    if (!form.kendaraan_id) return 'Pilih kendaraan terlebih dahulu';
    return null;
  };

  const validateStep3 = (): string | null => {
    if (!form.tanggal_mulai) return 'Tanggal mulai wajib diisi';
    if (!form.tanggal_selesai) return 'Tanggal selesai wajib diisi';
    if (!form.tujuan.trim()) return 'Tujuan wajib diisi';
    if (form.metode_penyerahan === 'antar' && !form.alamat_jemput.trim()) return 'Alamat pengantaran wajib diisi';
    const today = todayJakarta();
    if (form.tanggal_mulai < today) return 'Tanggal mulai tidak boleh di masa lalu';
    if (form.tanggal_selesai < form.tanggal_mulai) return 'Tanggal selesai harus setelah atau sama dengan tanggal mulai';
    return null;
  };

  const validateCurrentStep = (): boolean => {
    let error: string | null = null;
    if (createStep === 1) error = validateStep1();
    else if (createStep === 2) error = validateStep2();
    else if (createStep === 3) error = validateStep3();
    if (error) {
      toast.error(error);
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateCurrentStep()) {
      setCreateStep((s) => Math.min(s + 1, 3));
    }
  };

  const handlePrevStep = () => {
    setCreateStep((s) => Math.max(s - 1, 1));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.customer_name.trim()) { toast.error('Nama customer wajib diisi'); return; }
    if (!form.customer_no_hp) { toast.error('No. HP wajib diisi'); return; }
    if (!form.customer_no_sim) { toast.error('No. Identitas (SIM) wajib diisi'); return; }
    if (!form.customer_alamat.trim()) { toast.error('Alamat wajib diisi'); return; }
    if (!form.kendaraan_id) { toast.error('Pilih kendaraan terlebih dahulu'); return; }
    if (!form.tanggal_mulai) { toast.error('Tanggal mulai wajib diisi'); return; }
    if (!form.tanggal_selesai) { toast.error('Tanggal selesai wajib diisi'); return; }
    if (!form.tujuan.trim()) { toast.error('Tujuan wajib diisi'); return; }
    if (form.metode_penyerahan === 'antar' && !form.alamat_jemput.trim()) { toast.error('Alamat pengantaran wajib diisi'); return; }
    if (!form.customer_id && !custFotoKtpFile) {
      toast.error('Dokumen identitas wajib diupload untuk customer baru');
      return;
    }
    const today = todayJakarta();
    if (form.tanggal_mulai < today) { toast.error('Tanggal mulai tidak boleh di masa lalu'); return; }
    if (form.tanggal_selesai < form.tanggal_mulai) { toast.error('Tanggal selesai harus setelah atau sama dengan tanggal mulai'); return; }
    if (form.tanggal_mulai === form.tanggal_selesai && form.jam_mulai && form.jam_selesai && form.jam_mulai >= form.jam_selesai) {
      toast.error('Jam mulai harus sebelum jam selesai');
      return;
    }
    const nowJam = nowWIBTime();
    if (form.tanggal_mulai === today && form.jam_mulai && form.jam_mulai <= nowJam) {
      toast.error('Jam mulai hari ini sudah terlewat — pilih jam setelah sekarang');
      return;
    }
    if (form.tanggal_selesai === today && form.jam_selesai && form.jam_selesai <= nowJam) {
      toast.error('Jam selesai hari ini sudah terlewat — pilih jam setelah sekarang');
      return;
    }
    if (form.status_pembayaran !== 'unpaid') {
      const amount = Number(form.jumlah_bayar);
      if (!form.jumlah_bayar || isNaN(amount) || amount <= 0) {
        toast.error('Jumlah dibayar wajib diisi (lebih dari 0) saat status bayar bukan Belum Dibayar');
        return;
      }
      if (amount > hargaTotal) {
        toast.error(`Jumlah dibayar tidak boleh melebihi total Rp ${hargaTotal.toLocaleString('id-ID')}`);
        return;
      }
      if (form.status_pembayaran === 'paid' && Math.abs(amount - hargaTotal) > 0.01) {
        toast.error(`Status "Lunas" harus sesuai harga total Rp ${hargaTotal.toLocaleString('id-ID')}`);
        return;
      }
      if (form.status_pembayaran === 'partial' && Math.abs(amount - hargaTotal) <= 0.01) {
        toast.error('Jumlah bayar sudah sama dengan total — gunakan status "Lunas"');
        return;
      }
    }
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {};
      Object.entries(form).forEach(([k, v]) => {
        if (v !== '' && v !== null && v !== undefined) {
          if (k === 'customer_id' && !v) return;
          payload[k] = v;
        }
      });
      if (form.customer_name) {
        payload.customer_name = form.customer_name;
      }
      const needFormData = buktiBaruFile || custFotoKtpFile;
      if (custFotoKtpDelete) payload.customer_foto_ktp_delete = true;
      if (needFormData) {
        const fd = new FormData();
        Object.entries(payload).forEach(([k, v]) => fd.append(k, String(v)));
        if (buktiBaruFile) fd.append('bukti_transfer', buktiBaruFile);
        if (custFotoKtpFile) fd.append('customer_foto_ktp', custFotoKtpFile);
        await orderAPI.create(fd);
      } else {
        await orderAPI.create(payload);
      }
      toast.success('Order berhasil dibuat dan dikonfirmasi');
      setForm(emptyForm);
      setCustomerSearch('');
      closeCreateModal();
      load();
      {
        const fetchId = ++kendaraanFetchId.current;
        kendaraanAPI
          .list({ per_page: 100 })
          .then(({ data }: { data: ListResponse<Kendaraan> }) => {
            if (fetchId === kendaraanFetchId.current) { setKendaraans(data.data); setAllKendaraans(data.data); }
          })
          .catch(() => {});
      }
    } catch (err) {
      let msg = 'Gagal membuat order';
      if (isAxiosError(err)) {
        const errors = err.response?.data?.errors as Record<string, string[]> | undefined;
        msg = err.response?.data?.message || (errors ? Object.values(errors)[0]?.[0] : undefined) || msg;
      }
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleInlineUpdate = async (id: number, field: keyof OrderForm, value: string) => {
    try {
      const { data } = await orderAPI.update(id, { [field]: value });
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...data } : item)));
      toast.success('Order berhasil diperbarui');
      // Chip statistik (total/aktif/terlambat) dihitung server-side — muat ulang
      // supaya angka ikut segar, bukan cuma baris yang diedit.
      load();
    } catch (err) {
      const msg = isAxiosError(err) ? err.response?.data?.message : undefined;
      toast.error(msg || 'Gagal memperbarui order');
      load();
    }
  };

  // Preview biaya pembatalan & refund — diambil dari server (satu sumber
  // kebenaran hitungBiayaPembatalan) setiap modal Batalkan dibuka.
  useEffect(() => {
    if (!cancelOrder) {
      setCancelPreview(null);
      return;
    }
    let active = true;
    setCancelPreviewLoading(true);
    orderAPI
      .cancelPreview(cancelOrder.id)
      .then(({ data }) => {
        if (active) setCancelPreview(data);
      })
      .catch(() => {
        if (active) setCancelPreview(null);
      })
      .finally(() => {
        if (active) setCancelPreviewLoading(false);
      });
    return () => {
      active = false;
    };
  }, [cancelOrder]);

  const handleCancelOrder = async () => {
    if (!cancelOrder) return;
    setCancelling(true);
    try {
      const { data } = await orderAPI.update(cancelOrder.id, {
        status_order: 'cancelled',
        alasan_pembatalan: cancelReason.trim() || null,
      });
      setItems((prev) => prev.map((item) => (item.id === cancelOrder.id ? { ...item, ...data } : item)));
      toast.success('Order berhasil dibatalkan');
      setCancelOrder(null);
      setCancelReason('');
      // Segarkan daftar + chip statistik (order batal mengubah hitungan).
      load();
    } catch (err) {
      const msg = isAxiosError(err) ? err.response?.data?.message : undefined;
      toast.error(msg || 'Gagal membatalkan order');
    } finally {
      setCancelling(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await orderAPI.delete(confirmDelete.id);
      toast.success('Order berhasil dihapus');
      load();
    } catch (err) {
      const msg = isAxiosError(err) ? err.response?.data?.message : undefined;
      toast.error(msg || 'Gagal menghapus order');
    }
    setConfirmDelete(null);
  };

  const setField = <K extends keyof OrderForm>(key: K, value: OrderForm[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleKendaraanSelect = (id: number) => {
    const allK = new Map([...kendaraans, ...allKendaraans].map((x) => [x.id, x]));
    const k = allK.get(id);
    setForm((prev) => ({ ...prev, kendaraan_id: String(id), harga_per_hari: k?.harga_sewa_per_hari ? String(k.harga_sewa_per_hari) : '' }));
  };

  const durasiHari = (() => {
    if (form.tanggal_mulai && form.tanggal_selesai) {
      const mulai = new Date(`${form.tanggal_mulai}T${form.jam_mulai || '08:00'}:00`);
      const selesai = new Date(`${form.tanggal_selesai}T${form.jam_selesai || '17:00'}:00`);
      const diffMs = selesai.getTime() - mulai.getTime();
      const diff = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return Math.max(diff, 1);
    }
    return 0;
  })();

  const supirTarifCreate = form.opsi_supir === 'dengan_supir' ? tarifSupirGlobal : 0;
  const hargaTotal = durasiHari * (Number(form.harga_per_hari) || 0) + supirTarifCreate * durasiHari;

  const isFormIncomplete = !form.customer_name.trim() || !form.customer_no_hp || !form.customer_no_sim || !form.customer_alamat.trim() || !form.kendaraan_id || !form.tanggal_mulai || !form.tanggal_selesai || !form.tujuan.trim() || !form.harga_per_hari || (form.metode_penyerahan === 'antar' && !form.alamat_jemput.trim()) || (!form.customer_id && !custFotoKtpFile);

  /**
   * Buka modal edit. Dipakai baik untuk edit biasa (pensil) maupun aksi cepat
   * "Sewakan" (dulu 2 blok kode terpisah yang isinya nyaris identik).
   */
  const openEditModal = (item: Order, { konfirmasi = false }: { konfirmasi?: boolean } = {}) => {
    setIsKonfirmasi(konfirmasi);
    setEditingOrder(item);
    setEditForm({
      customer_id: String(item.customer_id),
      customer_name: item.customer?.nama_lengkap || '',
      customer_no_hp: item.customer?.no_hp || '',
      customer_email: item.customer?.email || '',
      customer_alamat: item.customer?.alamat || '',
      customer_no_ktp: item.customer?.no_ktp || '',
      customer_no_sim: item.customer?.no_sim || '',
      kendaraan_id: String(item.kendaraan_id),
      tanggal_mulai: fmtDate(item.tanggal_mulai),
      tanggal_selesai: fmtDate(item.tanggal_selesai),
      jam_mulai: fmtTime(item.jam_mulai) || '08:00',
      jam_selesai: fmtTime(item.jam_selesai) || '17:00',
      status_order: konfirmasi ? 'confirmed' : item.status_order,
      status_pembayaran: item.status_pembayaran,
      metode_pembayaran: item.metode_pembayaran || 'cash',
      status_pengiriman: item.status_pengiriman,
      metode_penyerahan: item.metode_penyerahan || 'ambil',
      opsi_supir: item.opsi_supir ?? (item.supir_id ? 'dengan_supir' : 'lepas_kunci'),
      calo_id: item.calo_id ? String(item.calo_id) : '',
      alamat_jemput: item.alamat_jemput || '',
      tujuan: item.tujuan || '',
      catatan: item.catatan || '',
    });
    setEditBuktiFile(null);
    setEditBuktiPreview(item.bukti_transfer ? `/storage/${item.bukti_transfer}` : null);
    setEditBuktiNewPreview(null);
    setEditCustFotoKtpFile(null);
    setEditCustFotoKtpPreview(item.customer?.foto_ktp ? `/storage/${item.customer.foto_ktp}` : null);
    setEditCustFotoKtpDelete(false);
    setNewPaymentAmount('');
    setShowEditForm(true);
  };

  const closeEditModal = () => {
    setShowEditForm(false);
    setEditingOrder(null);
    setEditForm({});
    setEditKendaraanSearch('');
    setEditCustomerSearch('');
    if (editBuktiNewPreview) URL.revokeObjectURL(editBuktiNewPreview);
    setEditBuktiFile(null);
    setEditBuktiPreview(null);
    setEditBuktiNewPreview(null);
    if (editCustFotoKtpPreview) URL.revokeObjectURL(editCustFotoKtpPreview);
    setEditCustFotoKtpFile(null);
    setEditCustFotoKtpPreview(null);
    setEditCustFotoKtpDelete(false);
    setIsKonfirmasi(false);
    setNewPaymentAmount('');
  };

  const setEditField = <K extends keyof OrderForm>(key: K, value: OrderForm[K]) => setEditForm((prev) => ({ ...prev, [key]: value }));

  const editHargaPerHari = (() => {
    if (!editForm.kendaraan_id) return 0;
    const k = allKendaraans.find((x) => String(x.id) === String(editForm.kendaraan_id));
    return k ? Number(k.harga_sewa_per_hari) : 0;
  })();

  const editDurasi = (() => {
    if (editForm.tanggal_mulai && editForm.tanggal_selesai) {
      const mulai = new Date(`${editForm.tanggal_mulai}T${editForm.jam_mulai || '08:00'}:00`);
      const selesai = new Date(`${editForm.tanggal_selesai}T${editForm.jam_selesai || '17:00'}:00`);
      const diffMs = selesai.getTime() - mulai.getTime();
      const diff = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return Math.max(diff, 1);
    }
    return 0;
  })();

  const supirTarifEdit = editForm.opsi_supir === 'dengan_supir' ? tarifSupirGlobal : 0;
  const editTotal = editDurasi * editHargaPerHari + supirTarifEdit * editDurasi;

  // Order aktif/perlu verifikasi/selesai/dibatalkan: data inti terkunci, hanya status/pembayaran/catatan/bukti yang boleh diubah
  // Order confirmed yang sudah ber-aktivitas (pembayaran/request garasi/task diklaim) ikut terkunci — koreksi kesepakatan via Batal.
  const isConfirmedBerAktivitas =
    editingOrder?.status_order === 'confirmed' &&
    (!!editingOrder.operator_id ||
      (editingOrder.pembayarans?.length ?? 0) > 0 ||
      (editingOrder.garasi_requests?.length ?? 0) > 0);
  const isLockedOrder = ((editingOrder?.status_order === 'active' || editingOrder?.status_order === 'perlu_verifikasi' || editingOrder?.status_order === 'completed' || editingOrder?.status_order === 'cancelled') || isConfirmedBerAktivitas) && !isKonfirmasi;
  const isFullyLocked = (editingOrder?.status_order === 'completed' || editingOrder?.status_order === 'cancelled') && !isKonfirmasi;
  // Data inti terkunci di SEMUA mode (termasuk mode Konfirmasi) untuk
  // order confirmed ber-aktivitas — backend menolak (422) field inti.
  const isCoreLocked = isConfirmedBerAktivitas || isLockedOrder;
  const isPlainCoreLocked = isConfirmedBerAktivitas && !isKonfirmasi;

  const handleEditKendaraanSelect = (id: number) => {
    if (isConfirmedBerAktivitas) return;
    setEditForm((prev) => ({ ...prev, kendaraan_id: String(id) }));
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!isKonfirmasi && !isLockedOrder) {
      if (!editForm.customer_name?.trim()) { toast.error('Nama customer wajib diisi'); return; }
      if (!editForm.customer_no_hp) { toast.error('No. HP wajib diisi'); return; }
      if (!editForm.customer_no_sim) { toast.error('No. Identitas (SIM) wajib diisi'); return; }
      if (!editForm.customer_alamat?.trim()) { toast.error('Alamat wajib diisi'); return; }
      if (!editForm.kendaraan_id) { toast.error('Pilih kendaraan terlebih dahulu'); return; }
      if (!editForm.tanggal_mulai) { toast.error('Tanggal mulai wajib diisi'); return; }
      if (!editForm.tanggal_selesai) { toast.error('Tanggal selesai wajib diisi'); return; }
      if (editForm.tanggal_selesai < editForm.tanggal_mulai) { toast.error('Tanggal selesai harus setelah atau sama dengan tanggal mulai'); return; }
      if (editForm.tanggal_mulai === editForm.tanggal_selesai && editForm.jam_mulai && editForm.jam_selesai && editForm.jam_mulai >= editForm.jam_selesai) {
        toast.error('Jam mulai harus sebelum jam selesai');
        return;
      }
      const nowJam = nowWIBTime();
      if (editForm.tanggal_mulai === todayJakarta() && editForm.jam_mulai && editForm.jam_mulai <= nowJam) {
        toast.error('Jam mulai hari ini sudah terlewat — pilih jam setelah sekarang');
        return;
      }
      if (editForm.tanggal_selesai === todayJakarta() && editForm.jam_selesai && editForm.jam_selesai <= nowJam) {
        toast.error('Jam selesai hari ini sudah terlewat — pilih jam setelah sekarang');
        return;
      }
      if (!editForm.tujuan?.trim()) { toast.error('Tujuan wajib diisi'); return; }
      if (editForm.metode_penyerahan === 'antar' && !editForm.alamat_jemput?.trim()) { toast.error('Alamat pengantaran wajib diisi'); return; }
    }
    // Basic validation for konfirmasi mode — ensure required fields exist
    if (isKonfirmasi) {
      if (!editForm.kendaraan_id) { toast.error('Pilih kendaraan terlebih dahulu'); return; }
    }

    if (!editingOrder) return;

    setSubmitting(true);
    try {
      // Field yang boleh "dikosongkan" secara sengaja oleh admin (mis. melepas
      // supir/calo yang sebelumnya terpasang, atau menghapus isi catatan).
      // Field-field ini HARUS selalu ikut terkirim walau nilainya '' — kalau
      // di-filter seperti field lain, backend tidak akan pernah tahu field ini
      // sedang sengaja dikosongkan, dan nilai lama di database tidak akan
      // pernah ter-clear.
      const clearableFields: (keyof OrderForm)[] = ['calo_id', 'catatan'];

      const payload: Record<string, unknown> = {};
      Object.entries(editForm).forEach(([k, v]) => {
        if (k === 'status_order' && !isKonfirmasi) return;
        if (v !== '' && v !== null && v !== undefined) {
          payload[k] = v;
        } else if (clearableFields.includes(k as keyof OrderForm)) {
          payload[k] = '';
        }
      });
      if (editForm.customer_name) {
        payload.customer_name = editForm.customer_name;
      }

      // Order terkunci (aktif/perlu verifikasi/selesai/dibatalkan, atau
      // confirmed ber-aktivitas): data inti tidak boleh dikirim ulang —
      // backend menolak (422) jika field terlarang ikut terkirim walau
      // nilainya tidak berubah. Daftar sama dengan OrderService.
      if (isCoreLocked) {
        const lockedFields = [
          'customer_id', 'customer_name', 'customer_no_hp', 'customer_email', 'customer_alamat', 'customer_no_ktp', 'customer_no_sim',
          'kendaraan_id', 'tanggal_mulai', 'tanggal_selesai', 'jam_mulai', 'jam_selesai', 'alamat_jemput', 'tujuan',
          'metode_penyerahan', 'supir_id', 'opsi_supir', 'calo_id',
        ];
        lockedFields.forEach((k) => delete payload[k]);
      }

      // Sertakan jumlah_bayar jika form pembayaran baru diisi
      if (newPaymentAmount && isLockedOrder && !isFullyLocked) {
        const amount = Number(newPaymentAmount);
        if (isNaN(amount) || amount <= 0) { // M3: catch NaN from empty string
          toast.error('Jumlah pembayaran harus lebih dari 0');
          return;
        }
        const totalPaid = editingOrder.pembayarans?.reduce((sum, p) => sum + Number(p.jumlah), 0) ?? 0;
        const denda = editingOrder.jam_overtime_saat_ini > 0 ? Number(editingOrder.denda_overtime_saat_ini || 0) : 0;
        const sisa = Number(editingOrder.harga_total) + denda - totalPaid;
        if (amount > sisa) {
          toast.error(`Jumlah pembayaran maksimal Rp ${sisa.toLocaleString('id-ID')} (termasuk denda)`);
          return;
        }
        payload.jumlah_bayar = amount;
      }

      let res;
      const hasFile = editBuktiFile || (!isCoreLocked && editCustFotoKtpFile);
      const needsFormData = hasFile || (!isCoreLocked && editCustFotoKtpDelete);
      if (needsFormData) {
        const fd = new FormData();
        fd.append('_method', 'PUT');
        Object.entries(payload).forEach(([k, v]) => fd.append(k, String(v)));
        if (editBuktiFile) fd.append('bukti_transfer', editBuktiFile);
        if (!isCoreLocked && editCustFotoKtpFile) fd.append('customer_foto_ktp', editCustFotoKtpFile);
        if (!isCoreLocked && editCustFotoKtpDelete) fd.append('customer_foto_ktp_delete', '1');
        res = await orderAPI.updateWithFile(editingOrder.id, fd);
      } else {
        res = await orderAPI.update(editingOrder.id, payload);
      }
      setItems((prev) => prev.map((item) => (item.id === editingOrder.id ? { ...item, ...res.data } : item)));
      toast.success('Order berhasil diperbarui');
      closeEditModal();
      load();
      {
        const fetchId = ++kendaraanFetchId.current;
        kendaraanAPI
          .list({ per_page: 100 })
          .then(({ data }: { data: ListResponse<Kendaraan> }) => {
            if (fetchId === kendaraanFetchId.current) { setKendaraans(data.data); setAllKendaraans(data.data); }
          })
          .catch(() => {});
      }
    } catch (err) {
      let msg = 'Gagal memperbarui order';
      if (isAxiosError(err)) {
        const errors = err.response?.data?.errors as Record<string, string[]> | undefined;
        msg = err.response?.data?.message || (errors ? Object.values(errors)[0]?.[0] : undefined) || msg;
      }
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteOrder = async () => {
    if (!confirmComplete) return;
    // Sisa tagihan = total sewa + denda keterlambatan berjalan + kerusakan yang
    // akan ditagih − yang sudah dibayar. Bukti transfer hanya wajib bila masih
    // ada sisa; order lunas penuh tidak boleh dimintai bukti lagi.
    const totalPaid = confirmComplete.pembayarans?.reduce((sum, p) => sum + Number(p.jumlah), 0) ?? 0;
    const denda = confirmComplete.jam_overtime_saat_ini > 0 ? Number(confirmComplete.denda_overtime_saat_ini || 0) : 0;
    const sisa = Number(confirmComplete.harga_total || 0) + denda + Number(completeKerusakanAmount || 0) - totalPaid;
    if (sisa > 0 && !completePaymentFile) {
      toast.error('Bukti pembayaran wajib diunggah');
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('status_order', 'completed');
      fd.append('status_pengiriman', 'selesai');
      fd.append('status_pembayaran', 'paid');
      fd.append('tanggal_pengembalian_aktual', completeReturnTime.replace('T', ' ') + ':00');
      if (completePaymentFile) fd.append('bukti_transfer', completePaymentFile);
      // Sisa tagihan sudah termasuk denda keterlambatan yang sedang berjalan;
      // nominalnya bisa dikoreksi admin sebelum submit.
      if (sisa > 0) {
        const amount = Number(completePaymentAmount);
        if (!completePaymentAmount || isNaN(amount) || amount <= 0) {
          toast.error('Jumlah dibayar wajib diisi (lebih dari 0)');
          return;
        }
        if (amount > sisa) {
          toast.error(`Jumlah dibayar maksimal Rp ${sisa.toLocaleString('id-ID')}`);
          return;
        }
        fd.append('jumlah_bayar', String(amount));
      }
      // Selalu kirim eksplisit: angka > 0 = tagih, kosong/0 = admin
      // memaafkan kerusakan (server tidak fallback ke estimasi inspeksi).
      fd.append('biaya_kerusakan', String(Math.round(Number(completeKerusakanAmount || 0))));
      fd.append('_method', 'PUT');
      await orderAPI.updateWithFile(confirmComplete.id, fd);
      toast.success('Order berhasil diselesaikan');
      closeCompleteModal();
      load();
      {
        const fetchId = ++kendaraanFetchId.current;
        kendaraanAPI
          .list({ per_page: 100 })
          .then(({ data }: { data: ListResponse<Kendaraan> }) => {
            if (fetchId === kendaraanFetchId.current) { setKendaraans(data.data); setAllKendaraans(data.data); }
          })
          .catch(() => {});
      }
    } catch (err) {
      const msg = isAxiosError(err) ? err.response?.data?.message : undefined;
      toast.error(msg || 'Gagal menyelesaikan order');
    } finally {
      setSubmitting(false);
    }
  };

  const closeCompleteModal = () => {
    setConfirmComplete(null);
    setCompleteReturnInspeksi(null);
    setCompleteInspeksiLoading(false);
    if (completePaymentPreview) URL.revokeObjectURL(completePaymentPreview);
    setCompletePaymentFile(null);
    setCompletePaymentPreview(null);
    setCompleteReturnTime(nowWIB());
    setCompletePaymentAmount('');
    setCompleteKerusakanAmount('');
  };

  const cekInspeksiReturn = useCallback(async (order: Order) => {
    setCompleteInspeksiLoading(true);
    try {
      const { data } = await inspeksiAPI.byOrder(order.id);
      // Sama dengan aturan server (OrderService): inspeksi return TERAKHIR
      // yang menentukan — wajib bertanda tangan customer & petugas.
      const latestReturn = [...data].reverse().find((i) => i.jenis === 'return') ?? null;
      const validReturn = latestReturn && latestReturn.ttd_customer && latestReturn.ttd_petugas ? latestReturn : null;
      setCompleteReturnInspeksi(validReturn);
      const kerusakan = validReturn && Number(validReturn.biaya_kerusakan || 0) > 0 ? String(Math.round(Number(validReturn.biaya_kerusakan))) : '';
      setCompleteKerusakanAmount(kerusakan);
      const totalPaid = order.pembayarans?.reduce((sum, p) => sum + Number(p.jumlah), 0) ?? 0;
      const denda = order.jam_overtime_saat_ini > 0 ? Number(order.denda_overtime_saat_ini || 0) : 0;
      const sisa = Number(order.harga_total || 0) + denda + Number(kerusakan || 0) - totalPaid;
      setCompletePaymentAmount(sisa > 0 ? String(Math.round(sisa)) : '');
    } catch {
      setCompleteReturnInspeksi(null);
    } finally {
      setCompleteInspeksiLoading(false);
    }
  }, []);

  const openCompleteModal = async (item: Order) => {
    setConfirmComplete(item);
    setCompleteReturnInspeksi(null);
    setCompleteKerusakanAmount('');
    void cekInspeksiReturn(item);
    const totalPaid = item.pembayarans?.reduce((sum, p) => sum + Number(p.jumlah), 0) ?? 0;
    const denda = item.jam_overtime_saat_ini > 0 ? Number(item.denda_overtime_saat_ini || 0) : 0;
    const sisa = Number(item.harga_total || 0) + denda - totalPaid;
    setCompletePaymentAmount(sisa > 0 ? String(Math.round(sisa)) : '');
  };

  const completeSisa = useMemo(() => {
    if (!confirmComplete) return 0;
    const totalPaid = confirmComplete.pembayarans?.reduce((sum, p) => sum + Number(p.jumlah), 0) ?? 0;
    const denda = confirmComplete.jam_overtime_saat_ini > 0 ? Number(confirmComplete.denda_overtime_saat_ini || 0) : 0;
    return Number(confirmComplete.harga_total || 0) + denda + Number(completeKerusakanAmount || 0) - totalPaid;
  }, [confirmComplete, completeKerusakanAmount]);

  const completeSupirFee = useMemo(() => {
    if (!confirmComplete) return 0;
    if (confirmComplete.opsi_supir !== 'dengan_supir') return 0;
    return tarifSupirGlobal * confirmComplete.durasi_hari;
  }, [confirmComplete, tarifSupirGlobal]);

  const filteredKendaraanCreate = useMemo(() => {
    if (!kendaraanSearch) return kendaraans;
    const q = kendaraanSearch.toLowerCase();
    return kendaraans.filter(
      (k) => k.nama_kendaraan.toLowerCase().includes(q) || k.plat_nomor.toLowerCase().includes(q) || (k.warna && k.warna.toLowerCase().includes(q))
    );
  }, [kendaraans, kendaraanSearch]);

  const isVehicleAvailable = (k: Kendaraan) => k.status === 'tersedia' && !k.active_orders_count;

  const filteredKendaraanEdit = useMemo(() => {
    return allKendaraans.filter((k) => {
      if (!isVehicleAvailable(k) && editingOrder && k.id !== editingOrder.kendaraan_id) return false;
      if (!editKendaraanSearch) return true;
      const q = editKendaraanSearch.toLowerCase();
      return k.nama_kendaraan.toLowerCase().includes(q) || k.plat_nomor.toLowerCase().includes(q) || (k.warna && k.warna.toLowerCase().includes(q));
    });
  }, [allKendaraans, editKendaraanSearch, editingOrder]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-black-900 via-black-800 to-primary-700 p-6 text-white shadow-sm sm:p-7">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <h1 className="font-display text-2xl font-bold">Orders</h1>
            <p className="mt-1 text-sm text-black-200">Kelola pemesanan, pembayaran, dan status pengiriman kendaraan.</p>
          </div>
          {canManage && (
            <button
              onClick={() => {
                setForm(emptyForm);
                setShowForm(true);
              }}
              className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-primary-600 shadow-sm transition-colors hover:bg-black-200"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Buat Order Baru
            </button>
          )}
        </div>
      </div>

      {overdueItems.length > 0 && !alertDismissed && (
        <div className="animate-fade-in rounded-2xl border border-error-500/30 bg-error-50 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-error-500">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01M4.93 19h14.14a1 1 0 00.87-1.5L12.87 4.5a1 1 0 00-1.74 0L4.06 17.5A1 1 0 004.93 19z"
                />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-error-600">{overdueItems.length} order terlambat dikembalikan</h3>
                <button
                  onClick={() => setAlertDismissed(true)}
                  className="shrink-0 rounded-lg p-1 text-error-500 transition-colors hover:bg-error-50 hover:text-error-600"
                  title="Tutup"
                >
                  <CloseIcon className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2.5 space-y-1.5">
                {overdueItems.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg bg-white/70 px-3 py-2 text-xs">
                    <div className="min-w-0 truncate">
                      <span className="font-mono font-semibold text-error-600">{item.kode_order}</span>
                      <span className="text-error-600">
                        {' '}
                        — {item.customer?.nama_lengkap} · {item.kendaraan?.nama_kendaraan}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="whitespace-nowrap font-medium text-error-600">
                        {formatJam(item.jam_overtime_saat_ini)} · {formatRupiah(item.denda_overtime_saat_ini)}
                      </span>
                      {canManage && (
                        <button
                          onClick={() => openCompleteModal(item)}
                          className="whitespace-nowrap rounded-md bg-error-500 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-error-600"
                        >
                          Selesaikan
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {overdueItems.length > 5 && <p className="pl-1 text-xs text-error-600">+{overdueItems.length - 5} order lainnya juga terlambat</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {verifikasiItems.length > 0 && !alertVerifikasiDismissed && (
        <div className="animate-fade-in rounded-2xl border border-amber-500/30 bg-amber-50 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M16.5 5.5L4.5 19.5m12.6-.1L4.5 6.5M4.5 19.5L21 4.5M6.5 18.5h11a1 1 0 001-1v-2.5a1 1 0 00-.3-.7M6 18v-2.5a1 1 0 01.3-.7"
                />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-amber-700">{verifikasiItems.length} order perlu verifikasi pengembalian</h3>
                <button
                  onClick={() => setAlertVerifikasiDismissed(true)}
                  className="shrink-0 rounded-lg p-1 text-amber-600 transition-colors hover:bg-amber-50 hover:text-amber-700"
                  title="Tutup"
                >
                  <CloseIcon className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1 text-xs text-amber-700">
                Order lewat batas waktu yang belum dikonfirmasi. Denda telah dibekukan; periksa dan konfirmasi pengembalian untuk melepaskan denda atau menyelesaikan order.
              </p>
              <div className="mt-2.5 space-y-1.5">
                {verifikasiItems.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg bg-white/70 px-3 py-2 text-xs">
                    <div className="min-w-0 truncate">
                      <span className="font-mono font-semibold text-amber-700">{item.kode_order}</span>
                      <span className="text-amber-700">
                        {' '}
                        — {item.customer?.nama_lengkap} · {item.kendaraan?.nama_kendaraan}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="whitespace-nowrap font-medium text-amber-700">
                        {formatJam(item.jam_overtime_saat_ini)} · {formatRupiah(item.denda_overtime_saat_ini)}
                      </span>
                      {canManage && (
                        <button
                          onClick={() => openCompleteModal(item)}
                          className="whitespace-nowrap rounded-md bg-amber-500 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-amber-600"
                        >
                          Selesaikan
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {verifikasiItems.length > 5 && (
                  <p className="pl-1 text-xs text-amber-700">+{verifikasiItems.length - 5} order lainnya juga perlu verifikasi</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatChip
          label="Total Order"
          value={stats.total}
          iconBg="bg-primary-500"
          icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        />
        <StatChip label="Sedang Aktif" value={stats.aktif} iconBg="bg-accent-500" icon="M13 10V3L4 14h7v7l9-11h-7z" />
        <StatChip label="Menunggu" value={stats.menunggu} iconBg="bg-accent-500" icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        <StatChip
          label="Perlu Verifikasi"
          value={stats.perluVerifikasi}
          iconBg="bg-amber-500"
          icon="M12 9v2m0 4h.01M16.5 5.5L4.5 19.5m12.6-.1L4.5 6.5M4.5 19.5L21 4.5M6.5 18.5h11a1 1 0 001-1v-2.5a1 1 0 00-.3-.7M6 18v-2.5a1 1 0 01.3-.7"
        />
        <StatChip
          label="Terlambat"
          value={stats.terlambat}
          iconBg="bg-error-500"
          icon="M12 9v2m0 4h.01M4.93 19h14.14a1 1 0 00.87-1.5L12.87 4.5a1 1 0 00-1.74 0L4.06 17.5A1 1 0 004.93 19z"
        />
      </div>

      {/* ── Filter (disatukan) ── */}
      <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black-200">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Cari kode, nama, plat..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputClass} pl-10`}
          />
        </div>
        <StatusFilterTabs active={statusFilter} onChange={setStatusFilter} overdueCount={stats.terlambat} verifikasiCount={stats.perluVerifikasi} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 text-sm text-black-400">
            <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <span className="hidden sm:inline">Periode</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => handleDateFrom(e.target.value)}
              className={`${inputClass} max-w-[160px]`}
              aria-label="Tanggal mulai"
            />
            <span className="text-sm text-black-400">s/d</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => handleDateTo(e.target.value)}
              className={`${inputClass} max-w-[160px]`}
              aria-label="Tanggal selesai"
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={resetPeriode}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-black-200 text-black-400 transition-colors hover:bg-canvas hover:text-error-600"
                title="Reset periode"
                aria-label="Reset periode"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Create Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-black/50 p-4" onClick={closeCreateModal}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-black-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-black-900">Buat Order Baru</h2>
              <button onClick={closeCreateModal} className="rounded-lg p-1 transition-colors hover:bg-canvas" aria-label="Tutup">
                <CloseIcon />
              </button>
            </div>

            {/* Step Indicator */}
            <div className="border-b border-black-200 bg-canvas px-6 py-3">
              <div className="flex items-center justify-between">
                {[
                  { step: 1, label: 'Data Customer' },
                  { step: 2, label: 'Pilih Kendaraan' },
                  { step: 3, label: 'Jadwal & Pembayaran' },
                ].map((s, idx) => (
                  <div key={s.step} className="flex items-center">
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                          createStep > s.step
                            ? 'bg-accent-500 text-white'
                            : createStep === s.step
                              ? 'bg-primary-500 text-white'
                              : 'bg-black-200 text-black-500'
                        }`}
                      >
                        {createStep > s.step ? (
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                        ) : (
                          s.step
                        )}
                      </div>
                      <span className={`hidden text-xs font-medium sm:inline ${createStep >= s.step ? 'text-black-900' : 'text-black-400'}`}>
                        {s.label}
                      </span>
                    </div>
                    {idx < 2 && (
                      <div className={`mx-3 h-px w-8 sm:w-16 ${createStep > s.step ? 'bg-accent-400' : 'bg-black-200'}`} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              {/* Step 1: Data Customer */}
              {createStep === 1 && (
                <div>
                  <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-black-400">
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    Data Customer
                  </h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-black-700">Nama Customer *</label>
                  <div className="relative" ref={customerSearchRef}>
                    <input
                      type="text"
                      value={form.customer_id ? form.customer_name : customerSearch}
                      onChange={(e) => {
                        if (custFotoKtpPreview && custFotoKtpPreview.startsWith('blob:')) URL.revokeObjectURL(custFotoKtpPreview);
                        setCustFotoKtpFile(null);
                        setCustFotoKtpPreview(null);
                        setCustFotoKtpDelete(false);
                        setForm((prev) => ({ ...prev, customer_id: '', customer_name: e.target.value, customer_no_hp: '', customer_email: '', customer_alamat: '', customer_no_ktp: '', customer_no_sim: '' }));
                        setCustomerSearch(e.target.value);
                        setShowCustomerSuggestions(true);
                      }}
                      onFocus={() => { if (customerSearch) setShowCustomerSuggestions(true); }}
                      placeholder="Ketik nama customer..."
                      required={!form.customer_id}
                      className={inputClass}
                    />
                    {showCustomerSuggestions && filteredCustomers.length > 0 && (
                      <div className="absolute z-20 mt-1 w-full rounded-lg border border-black-200 bg-white py-1 shadow-lg">
                        {filteredCustomers.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setForm((prev) => ({ ...prev, customer_id: String(c.id), customer_name: c.nama_lengkap, customer_no_hp: c.no_hp, customer_email: c.email || '', customer_alamat: c.alamat || '', customer_no_ktp: c.no_ktp || '', customer_no_sim: c.no_sim || '' }));
                              setCustomerSearch('');
                              setShowCustomerSuggestions(false);
                            }}
                            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition hover:bg-canvas"
                          >
                            <span className="font-medium text-black-900">{c.nama_lengkap}</span>
                            <span className="text-xs text-black-400">{formatHpDisplay(c.no_hp)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {form.customer_id ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (custFotoKtpPreview && custFotoKtpPreview.startsWith('blob:')) URL.revokeObjectURL(custFotoKtpPreview);
                        setCustFotoKtpFile(null);
                        setCustFotoKtpPreview(null);
                        setCustFotoKtpDelete(false);
                        setForm((prev) => ({ ...prev, customer_id: '', customer_name: '', customer_no_hp: '', customer_email: '', customer_alamat: '', customer_no_ktp: '', customer_no_sim: '' }));
                      }}
                      className="mt-1.5 inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700"
                    >
                      <CloseIcon className="h-3 w-3" /> Ganti customer
                    </button>
                  ) : form.customer_name ? (
                    <p className="mt-1.5 text-xs text-accent-600">Customer baru akan dibuat otomatis</p>
                  ) : null}
                  {nameConflict && (
                    <p className="mt-1.5 text-xs text-amber-600">
                      Ada pelanggan bernama {nameConflict.nama_lengkap} (No. HP {formatHpDisplay(nameConflict.no_hp)}) — jika orang yang sama, pilih dari daftar pelanggan lalu perbarui No. HP.
                    </p>
                  )}
                </div>
                <div>
                      <label className="mb-1 block text-sm font-medium text-black-700">No. HP *</label>
                      <input type="text" value={form.customer_no_hp} onChange={(e) => setField('customer_no_hp', e.target.value)} required className={inputClass} placeholder="08xxx" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-black-700">No. KTP</label>
                      <input type="text" value={form.customer_no_ktp} onChange={(e) => setField('customer_no_ktp', e.target.value)} className={inputClass} placeholder="opsional" />
                      {ktpConflict && (
                        <p className="mt-1 text-xs text-amber-600">
                          No. KTP sudah terdaftar atas nama {ktpConflict.nama_lengkap} — pilih dari daftar pelanggan, atau periksa kembali No. KTP.
                        </p>
                      )}
                      {!form.customer_id && !form.customer_no_ktp?.trim() && (
                        <p className="mt-1 text-xs text-amber-600">
                          No. KTP belum diisi — sebaiknya diisi agar pelanggan bisa dikenali jika kembali.
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-black-700">No. SIM *</label>
                      <input type="text" value={form.customer_no_sim} onChange={(e) => setField('customer_no_sim', e.target.value)} required className={inputClass} placeholder="Wajib diisi" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-black-700">Email</label>
                      <input type="email" value={form.customer_email} onChange={(e) => setField('customer_email', e.target.value)} className={inputClass} placeholder="opsional" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-medium text-black-700">Alamat *</label>
                      <input type="text" value={form.customer_alamat} onChange={(e) => setField('customer_alamat', e.target.value)} required className={inputClass} placeholder="Wajib diisi" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-medium text-black-700">Dokumen Identitas * <span className="font-normal text-black-400">(wajib untuk customer baru)</span></label>
                      <p className="mb-2 text-xs text-black-400">Upload salah satu: KTP, Paspor, atau SIM</p>
                      {custFotoKtpPreview && (
                        <div className="mb-2">
                          <img src={custFotoKtpPreview} alt="Dokumen Identitas" className="h-20 w-28 rounded-lg border border-black-200 object-cover" />
                        </div>
                      )}
                      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-black-200 px-3 py-6 text-center transition-colors hover:border-primary-400 hover:bg-primary-50/50">
                        <svg className="h-5 w-5 text-black-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <span className="text-xs text-black-400">{custFotoKtpFile ? custFotoKtpFile.name : 'KTP / Paspor / SIM'}</span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0] ?? null; if (f && f.size > 2 * 1024 * 1024) { toast.error('Ukuran foto maksimal 2MB'); e.target.value = ''; return; } setCustFotoKtpFile(f); setCustFotoKtpPreview(f ? URL.createObjectURL(f) : null); }} />
                      </label>
                    </div>
              </div>
                </div>
              )}

              {/* Step 2: Pilih Kendaraan */}
              {createStep === 2 && (
                <div>
                <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-black-400">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17h.01M16 17h.01M3 11l1.5-5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.4L21 11M3 11h18M3 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-6" /></svg>
                  Pilih Kendaraan
                </h3>
                <label className="mb-1 block text-sm font-medium text-black-700">Kendaraan *</label>
                {kendaraans.length === 0 ? (
                  <p className="text-sm italic text-black-400">Tidak ada kendaraan tersedia</p>
                ) : (
                  <>
                    <div className="relative mb-2">
                      <svg
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        type="text"
                        value={kendaraanSearch}
                        onChange={(e) => setKendaraanSearch(e.target.value)}
                        placeholder="Cari nama, plat, atau warna..."
                        className={`${inputClass} pl-9`}
                      />
                      {kendaraanSearch && (
                        <button
                          type="button"
                          onClick={() => setKendaraanSearch('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-black-400 hover:text-black-700"
                          aria-label="Bersihkan pencarian"
                        >
                          <CloseIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    {filteredKendaraanCreate.length === 0 ? (
                      <p className="py-4 text-center text-sm italic text-black-400">Tidak ada kendaraan yang cocok</p>
                    ) : (
                      <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                        {filteredKendaraanCreate.map((k) => {
                          const selected = form.kendaraan_id === String(k.id);
                          const tanggalTersedia = Boolean(form.tanggal_mulai && form.tanggal_selesai);
                          // Saat tanggal diisi, server sudah memfilter mobil yang
                          // beririsan — status 'tersedia' sudah cukup.
                          const available = k.status === 'tersedia' && (tanggalTersedia || !k.active_orders_count);
                          return (
                            <div
                              key={k.id}
                              onClick={() => available && handleKendaraanSelect(k.id)}
                              className={`w-44 shrink-0 rounded-xl border-2 transition-all ${
                                !available
                                  ? 'cursor-not-allowed border-black-200 bg-canvas opacity-70'
                                  : selected
                                    ? 'cursor-pointer border-primary-500 bg-primary-50/50 ring-2 ring-primary-100'
                                    : 'cursor-pointer border-black-200 hover:border-primary-400 hover:shadow-sm'
                              }`}
                            >
                              <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-t-[10px] bg-canvas">
                                {k.foto ? (
                                  <img
                                    src={k.foto.startsWith('http') ? k.foto : `/storage/${k.foto}`}
                                    alt={k.nama_kendaraan}
                                    className={`h-full w-full object-cover ${!available ? 'grayscale blur-[1px]' : ''}`}
                                  />
                                ) : (
                                  <svg className={`h-10 w-10 text-black-200 ${!available ? 'grayscale' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={1.5}
                                      d="M8 17h.01M16 17h.01M3 11l1.5-5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.4L21 11M3 11h18M3 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-6"
                                    />
                                  </svg>
                                )}
                                {!available && (
                                  <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-error-500/90 px-2.5 py-0.5 text-[10px] font-semibold text-white shadow">
                                    {k.status === 'maintenance' ? 'Maintenance' : 'Sedang Disewa'}
                                  </span>
                                )}
                              </div>
                              <div className="space-y-1 p-3">
                                <p className={`truncate text-sm font-semibold leading-tight ${!available ? 'text-black-400' : 'text-black-900'}`}>{k.nama_kendaraan}</p>
                                <p className="font-mono text-xs text-black-400">{k.plat_nomor}</p>
                                <div className="flex items-center gap-1.5">
                                  <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-black-200" style={{ backgroundColor: warnaKendaraanHex(k.warna) || '#E5E7EB' }} />
                                  <span className="truncate text-xs text-black-400">{k.warna}</span>
                                </div>
                                <p className={`text-xs font-bold ${!available ? 'text-black-400' : 'text-primary-600'}`}>{formatRupiah(k.harga_sewa_per_hari)}/hari</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
                {form.kendaraan_id && (
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-black-700">Opsi Supir</label>
                      <div className="grid grid-cols-2 gap-2">
                        <label
                          className={`flex cursor-pointer items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 transition-all ${
                            form.opsi_supir === 'lepas_kunci'
                              ? 'border-primary-500 bg-primary-50'
                              : 'border-black-200 hover:border-black-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="opsi_supir_create"
                            className="sr-only"
                            checked={form.opsi_supir === 'lepas_kunci'}
                            onChange={() => setField('opsi_supir', 'lepas_kunci')}
                          />
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                              form.opsi_supir === 'lepas_kunci' ? 'border-primary-500' : 'border-black-300'
                            }`}
                          >
                            {form.opsi_supir === 'lepas_kunci' && <span className="h-2 w-2 rounded-full bg-primary-500" />}
                          </span>
                          <span className="text-sm font-medium text-black-900">Lepas Kunci</span>
                        </label>
                        <label
                          className={`flex cursor-pointer items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 transition-all ${
                            form.opsi_supir === 'dengan_supir'
                              ? 'border-primary-500 bg-primary-50'
                              : 'border-black-200 hover:border-black-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="opsi_supir_create"
                            className="sr-only"
                            checked={form.opsi_supir === 'dengan_supir'}
                            onChange={() => setField('opsi_supir', 'dengan_supir')}
                          />
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                              form.opsi_supir === 'dengan_supir' ? 'border-primary-500' : 'border-black-300'
                            }`}
                          >
                            {form.opsi_supir === 'dengan_supir' && <span className="h-2 w-2 rounded-full bg-primary-500" />}
                          </span>
                          <span className="text-sm font-medium text-black-900">Dengan Supir</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-black-700">Calo</label>
                      <select value={form.calo_id} onChange={(e) => setField('calo_id', e.target.value)} className={inputClass}>
                        <option value="">Pilih Calo (opsional)</option>
                        {calos
                          .filter((c) => c.status === 'active')
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nama} — {formatHpDisplay(c.no_hp)}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                )}
                </div>
              )}

              {/* Step 3: Jadwal & Pembayaran */}
              {createStep === 3 && (
                <>
                <div>
                <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-black-400">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  Jadwal & Pembayaran
                </h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-black-700">Tanggal Mulai *</label>
                  <input
                    type="date"
                    value={form.tanggal_mulai}
                    onChange={(e) => setField('tanggal_mulai', e.target.value)}
                    min={todayJakarta()}
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-black-700">Jam Mulai</label>
                  <input type="time" value={form.jam_mulai} onChange={(e) => setField('jam_mulai', e.target.value)} min={form.tanggal_mulai === todayJakarta() ? nowWIBTime() : undefined} className={inputClass} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-black-700">Tanggal Selesai *</label>
                  <input
                    type="date"
                    value={form.tanggal_selesai}
                    onChange={(e) => setField('tanggal_selesai', e.target.value)}
                    min={form.tanggal_mulai || todayJakarta()}
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-black-700">Jam Selesai</label>
                  <input type="time" value={form.jam_selesai} onChange={(e) => setField('jam_selesai', e.target.value)} min={form.tanggal_selesai === todayJakarta() ? nowWIBTime() : undefined} className={inputClass} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-black-700">Harga/Hari (Rp)</label>
                  <input
                    type="number"
                    value={form.harga_per_hari}
                    readOnly
                    className="w-full cursor-not-allowed rounded-lg border border-black-200 bg-canvas px-3 py-2 text-sm text-black-400"
                  />
                  <p className="mt-0.5 text-xs text-black-400">Otomatis dari harga kendaraan</p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-black-700">Metode Bayar</label>
                  <select value={form.metode_pembayaran} onChange={(e) => setField('metode_pembayaran', e.target.value as MetodePembayaran)} className={inputClass}>
                    {(Object.keys(metodePembayaranLabels) as MetodePembayaran[]).map((m) => (
                      <option key={m} value={m}>
                        {metodePembayaranLabels[m]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-black-700">Status Bayar</label>
                  <select
                    value={form.status_pembayaran}
                    onChange={(e) => setField('status_pembayaran', e.target.value as StatusPembayaran)}
                    className={inputClass}
                  >
                    {statusPembayaranOptions.map((s) => (
                      <option key={s} value={s}>
                        {statusPembayaranLabels[s]}
                      </option>
                    ))}
                  </select>
                </div>
                {form.status_pembayaran !== 'unpaid' && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-black-700">
                      Jumlah Dibayar (Rp) {form.status_pembayaran === 'paid' ? '*' : ''}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.jumlah_bayar}
                      onChange={(e) => setField('jumlah_bayar', e.target.value)}
                      placeholder={form.status_pembayaran === 'paid' ? formatRupiah(hargaTotal) : 'Nominal DP'}
                      className={inputClass}
                      required
                    />
                    {form.status_pembayaran === 'paid' && (
                      <p className="mt-0.5 text-xs text-black-400">Harus sama dengan total: {formatRupiah(hargaTotal)}</p>
                    )}
                    {form.status_pembayaran === 'partial' && (
                      <p className="mt-0.5 text-xs text-black-400">Kurang dari total: {formatRupiah(hargaTotal)}</p>
                    )}
                  </div>
                )}
                </div>
              </div>

              {form.tanggal_mulai && form.tanggal_selesai && form.harga_per_hari ? (
                <div className="space-y-3 rounded-xl border border-primary-100 bg-primary-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary-400">Rincian Biaya</p>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-black-900">Sewa Kendaraan</p>
                      <p className="text-xs text-black-400">
                        {durasiHari} hari × {formatRupiah(form.harga_per_hari)}/hari
                      </p>
                      <p className="mt-0.5 text-xs text-black-400">
                        {form.tanggal_mulai} {form.jam_mulai || '08:00'} → {form.tanggal_selesai} {form.jam_selesai || '17:00'} WIB
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-black-900">{formatRupiah(durasiHari * (Number(form.harga_per_hari) || 0))}</p>
                  </div>
                  {supirTarifCreate > 0 && (
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-black-900">Biaya Supir</p>
                        <p className="text-xs text-black-400">
                          Dengan supir · {durasiHari} hari × {formatRupiah(supirTarifCreate)}/hari
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold text-black-900">{formatRupiah(supirTarifCreate * durasiHari)}</p>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t border-primary-100 pt-2">
                    <span className="text-sm font-semibold text-black-900">Total</span>
                    <span className="text-lg font-bold text-primary-600">{formatRupiah(hargaTotal)}</span>
                  </div>
                </div>
              ) : null}

              <div>
                <label className="mb-1 block text-sm font-medium text-black-700">Metode Penyerahan</label>
                <div className="flex gap-4">
                  <label className={`flex items-center gap-2.5 rounded-xl border-2 px-4 py-3 transition-all flex-1 cursor-pointer ${form.metode_penyerahan === 'ambil' ? 'border-primary-500 bg-primary-50' : 'border-black-200 hover:border-black-200'}`}>
                    <input
                      type="radio"
                      name="metode_penyerahan"
                      value="ambil"
                      checked={form.metode_penyerahan === 'ambil'}
                      onChange={() => setField('metode_penyerahan', 'ambil')}
                      className="sr-only"
                    />
                    <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${form.metode_penyerahan === 'ambil' ? 'border-primary-500' : 'border-black-200'}`}>
                      {form.metode_penyerahan === 'ambil' && <div className="h-2 w-2 rounded-full bg-primary-500" />}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-black-900">Ambil Kendaraan</div>
                      <div className="text-xs text-black-400">Customer ambil sendiri di garasi</div>
                    </div>
                  </label>
                  <label className={`flex items-center gap-2.5 rounded-xl border-2 px-4 py-3 transition-all flex-1 cursor-pointer ${form.metode_penyerahan === 'antar' ? 'border-primary-500 bg-primary-50' : 'border-black-200 hover:border-black-200'}`}>
                    <input
                      type="radio"
                      name="metode_penyerahan"
                      value="antar"
                      checked={form.metode_penyerahan === 'antar'}
                      onChange={() => setField('metode_penyerahan', 'antar')}
                      className="sr-only"
                    />
                    <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${form.metode_penyerahan === 'antar' ? 'border-primary-500' : 'border-black-200'}`}>
                      {form.metode_penyerahan === 'antar' && <div className="h-2 w-2 rounded-full bg-primary-500" />}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-black-900">Antar Kendaraan</div>
                      <div className="text-xs text-black-400">Kendaraan diantar ke lokasi customer</div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-black-700">
                    {form.metode_penyerahan === 'antar' ? 'Alamat Pengantaran *' : 'Lokasi Ambil'}
                  </label>
                  <input
                    type="text"
                    value={form.alamat_jemput}
                    onChange={(e) => setField('alamat_jemput', e.target.value)}
                    required={form.metode_penyerahan === 'antar'}
                    className={inputClass}
                    placeholder={form.metode_penyerahan === 'antar' ? 'Alamat tujuan pengantaran kendaraan' : 'Opsional — lokasi ambil di luar garasi'}
                  />
                  {form.metode_penyerahan === 'antar' && <p className="mt-0.5 text-xs text-black-400">Biaya antar belum dihitung otomatis — hubungi admin untuk biaya pengantaran</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-black-700">Tujuan *</label>
                  <input type="text" value={form.tujuan} onChange={(e) => setField('tujuan', e.target.value)} required className={inputClass} placeholder="Tujuan penggunaan kendaraan" />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-black-700">Catatan</label>
                <textarea value={form.catatan} onChange={(e) => setField('catatan', e.target.value)} rows={2} className={`${inputClass} resize-none`} />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-black-700">Bukti Pembayaran</label>
                <UploadBox
                  label="Klik atau seret bukti pembayaran ke sini"
                  hint="JPG, PNG, maks 2MB (opsional)"
                  fileName={buktiBaruFile?.name}
                  icon={
                    <svg className="h-6 w-6 text-black-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  }
                  onFile={(f) => {
                    if (!f) return;
                    if (buktiBaruPreview) URL.revokeObjectURL(buktiBaruPreview);
                    setBuktiBaruFile(f);
                    setBuktiBaruPreview(URL.createObjectURL(f));
                  }}
                />
                {buktiBaruPreview && (
                  <ImagePreview
                    src={buktiBaruPreview}
                    onRemove={() => {
                      URL.revokeObjectURL(buktiBaruPreview);
                      setBuktiBaruFile(null);
                      setBuktiBaruPreview(null);
                    }}
                  />
                )}
              </div>
                </>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between gap-3 border-t border-black-200 pt-4">
                <div>
                  {createStep > 1 && (
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="flex items-center gap-2 rounded-lg border border-black-200 px-4 py-2 text-sm font-medium text-black-700 transition-colors hover:bg-canvas"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                      Kembali
                    </button>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={closeCreateModal}
                    className="rounded-lg border border-black-200 px-4 py-2 text-sm font-medium text-black-700 transition-colors hover:bg-canvas"
                  >
                    Batal
                  </button>
                  {createStep < 3 ? (
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600"
                    >
                      Selanjutnya
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={submitting || isFormIncomplete}
                      className="flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                      Buat Order
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Form Modal */}
      {showEditForm && editingOrder && (
        <div className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-black/50 p-4" onClick={closeEditModal}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-black-200 bg-white p-6">
              <div>
                <h2 className="text-lg font-semibold text-black-900">{isKonfirmasi ? 'Konfirmasi Order' : 'Edit Order'}</h2>
                <p className="font-mono text-sm text-black-400">{editingOrder.kode_order}</p>
              </div>
              <button onClick={closeEditModal} className="rounded-lg p-1 transition-colors hover:bg-canvas" aria-label="Tutup">
                <CloseIcon />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-5 p-6">
              {isCoreLocked && (
                <div className={`flex items-start gap-2 rounded-lg px-4 py-3 text-sm ${isFullyLocked ? 'border border-black-200 bg-accent-50 text-black-600' : 'border border-accent-200 bg-accent-50 text-accent-700'}`}>
                  <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M4.93 19h14.14a1 1 0 00.87-1.5L12.87 4.5a1 1 0 00-1.74 0L4.06 17.5A1 1 0 004.93 19z" /></svg>
                  <span>{isFullyLocked ? 'Order sudah final. Semua data bersifat read-only.' : isConfirmedBerAktivitas ? 'Order confirmed sudah ber-aktivitas (pembayaran/request garasi/task petugas) — data inti terkunci. Koreksi kesepakatan via Batal.' : 'Order aktif — data inti (customer, kendaraan, tanggal, harga) tidak bisa diubah. Hanya status pembayaran, metode bayar, bukti pembayaran, dan catatan yang bisa diperbarui.'}</span>
                </div>
              )}
              {(isLockedOrder || isPlainCoreLocked) && (
                <div className="space-y-5">
                  <div className="space-y-3 rounded-xl border border-black-200 bg-accent-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-black-400">Data Customer</p>
                    <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                      <div><span className="text-black-400">Nama</span><p className="font-medium text-black-900">{editingOrder.customer?.nama_lengkap || '-'}</p></div>
                      <div><span className="text-black-400">No. HP</span><p className="font-medium text-black-900">{formatHpDisplay(editingOrder.customer?.no_hp) || '-'}</p></div>
                      {editingOrder.customer?.no_ktp && <div><span className="text-black-400">No. KTP</span><p className="font-mono text-black-900">{editingOrder.customer.no_ktp}</p></div>}
                      {editingOrder.customer?.no_sim && <div><span className="text-black-400">No. SIM</span><p className="font-mono text-black-900">{editingOrder.customer.no_sim}</p></div>}
                      {editingOrder.customer?.email && <div><span className="text-black-400">Email</span><p className="text-black-900">{editingOrder.customer.email}</p></div>}
                      {editingOrder.customer?.alamat && <div className="md:col-span-2"><span className="text-black-400">Alamat</span><p className="text-black-900">{editingOrder.customer.alamat}</p></div>}
                    </div>
                  </div>
                  <div className="space-y-3 rounded-xl border border-black-200 bg-accent-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-black-400">Kendaraan</p>
                    <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                      <div><span className="text-black-400">Kendaraan</span><p className="font-medium text-black-900">{editingOrder.kendaraan?.nama_kendaraan || '-'}</p></div>
                      <div><span className="text-black-400">Plat Nomor</span><p className="font-mono text-black-900">{editingOrder.kendaraan?.plat_nomor || '-'}</p></div>
                    </div>
                  </div>
                  <div className="space-y-3 rounded-xl border border-black-200 bg-accent-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-black-400">Jadwal & Lokasi</p>
                    <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                      <div><span className="text-black-400">Tanggal Mulai</span><p className="font-medium text-black-900">{editingOrder.tanggal_mulai} {editingOrder.jam_mulai || '08:00'} WIB</p></div>
                      <div><span className="text-black-400">Tanggal Selesai</span><p className="font-medium text-black-900">{editingOrder.tanggal_selesai} {editingOrder.jam_selesai || '17:00'} WIB</p></div>
                      {editingOrder.alamat_jemput && <div className="md:col-span-2"><span className="text-black-400">Alamat Jemput</span><p className="text-black-900">{editingOrder.alamat_jemput}</p></div>}
                      {editingOrder.tujuan && <div className="md:col-span-2"><span className="text-black-400">Tujuan</span><p className="text-black-900">{editingOrder.tujuan}</p></div>}
                    </div>
                    {(editingOrder.supir || editingOrder.calo || editingOrder.opsi_supir === 'dengan_supir') && (
                      <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                        {editingOrder.supir && <div><span className="text-black-400">Supir</span><p className="font-medium text-black-900">{editingOrder.supir.nama} · {formatHpDisplay(editingOrder.supir.no_hp)}</p></div>}
                        {!editingOrder.supir && editingOrder.opsi_supir === 'dengan_supir' && <div><span className="text-black-400">Opsi Supir</span><p className="font-medium text-black-900">Dengan Supir (belum ada yang ditugaskan)</p></div>}
                        {editingOrder.calo && <div><span className="text-black-400">Calo</span><p className="font-medium text-black-900">{editingOrder.calo.nama} · {formatHpDisplay(editingOrder.calo.no_hp)}</p></div>}
                      </div>
                    )}
                  </div>
                  {isFullyLocked ? (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-black-700">Status Pembayaran</label>
                        <p className={`${inputClass} border-black-200 bg-accent-50`}>{statusPembayaranLabels[editingOrder.status_pembayaran] || '-'}</p>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-black-700">Metode Bayar</label>
                        <p className={`${inputClass} border-black-200 bg-accent-50`}>{editingOrder.metode_pembayaran ? metodePembayaranLabels[editingOrder.metode_pembayaran as MetodePembayaran] || editingOrder.metode_pembayaran : '-'}</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {/* ── Riwayat Pembayaran (locked orders) ── */}
              {(isLockedOrder || isPlainCoreLocked) && editingOrder.pembayarans && editingOrder.pembayarans.length > 0 && (
                <div className="space-y-3 rounded-xl border border-black-200 bg-accent-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-black-400">Riwayat Pembayaran</p>
                  <div className="space-y-3">
                    {editingOrder.pembayarans.map((p) => (
                      <div key={p.id} className="flex items-start gap-3 rounded-lg border border-black-200 bg-white p-3">
                        <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${p.status === 'pelunasan' ? 'bg-accent-500' : 'bg-accent-500'}`}>
                          {p.status === 'pelunasan' ? 'L' : 'D'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                            <span className="font-semibold text-black-900">{p.status === 'pelunasan' ? 'Pelunasan' : 'DP'}</span>
                            <span className="text-black-400">·</span>
                            <span className="text-black-600">{metodePembayaranLabels[p.metode_pembayaran] || p.metode_pembayaran}</span>
                            <span className="text-black-400">·</span>
                            <span className="font-medium text-black-900">Rp {Number(p.jumlah).toLocaleString('id-ID')}</span>
                          </div>
                          <p className="mt-0.5 text-xs text-black-400">{new Date(p.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                          {p.catatan && <p className="mt-1 text-xs text-black-500 italic">{p.catatan}</p>}
                        </div>
                        {p.bukti_transfer && (
                          <img src={`/storage/${p.bukti_transfer}`} alt="Bukti" className="h-12 w-16 shrink-0 rounded border border-black-200 object-cover" />
                        )}
                      </div>
                    ))}
                  </div>
                  {editingOrder && (() => {
                    const totalPaid = editingOrder.pembayarans!.reduce((sum, p) => sum + Number(p.jumlah), 0);
                    const denda = editingOrder.jam_overtime_saat_ini > 0 ? Number(editingOrder.denda_overtime_saat_ini || 0) : 0;
                    const sisa = Number(editingOrder.harga_total) + denda - totalPaid;
                    return (
                      <div className="mt-2 border-t border-black-200 pt-2">
                        <div className="flex items-center justify-between text-xs text-black-500">
                          <span>Total dibayar</span>
                          <span className="font-semibold text-black-800">Rp {totalPaid.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-black-500">
                          <span>Harga total</span>
                          <span>Rp {Number(editingOrder.harga_total).toLocaleString('id-ID')}</span>
                        </div>
                        {denda > 0 && (
                          <div className="flex items-center justify-between text-xs text-error-600">
                            <span>Denda keterlambatan (berjalan)</span>
                            <span>Rp {denda.toLocaleString('id-ID')}</span>
                          </div>
                        )}
                        {sisa > 0 && (
                          <div className="flex items-center justify-between text-xs font-medium text-error-600">
                            <span>Sisa bayar (termasuk denda)</span>
                            <span>Rp {sisa.toLocaleString('id-ID')}</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {isPlainCoreLocked && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-black-700">Status Pembayaran</label>
                    <select value={editForm.status_pembayaran || 'unpaid'} onChange={(e) => setEditField('status_pembayaran', e.target.value as StatusPembayaran)} className={inputClass}>
                      {statusPembayaranOptions.map((s) => (<option key={s} value={s}>{statusPembayaranLabels[s]}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-black-700">Metode Bayar</label>
                    <select value={editForm.metode_pembayaran || 'cash'} onChange={(e) => setEditField('metode_pembayaran', e.target.value as MetodePembayaran)} className={inputClass}>
                      {(Object.keys(metodePembayaranLabels) as MetodePembayaran[]).map((m) => (<option key={m} value={m}>{metodePembayaranLabels[m]}</option>))}
                    </select>
                  </div>
                </div>
              )}

              {/* ── Form Pembayaran Baru (active orders only, hide when paid) ── */}
              {!isKonfirmasi && isLockedOrder && !isFullyLocked && editingOrder?.status_pembayaran !== 'paid' && (
                <div className="space-y-3 rounded-xl border border-primary-200 bg-primary-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary-600">Catat Pembayaran Baru</p>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-black-700">Status Pembayaran</label>
                      <select value={editForm.status_pembayaran || 'unpaid'} onChange={(e) => setEditField('status_pembayaran', e.target.value as StatusPembayaran)} className={inputClass}>
                        <option value="unpaid" disabled>{statusPembayaranLabels.unpaid}</option>
                        {statusPembayaranOptions.filter((s) => s !== 'unpaid').map((s) => (<option key={s} value={s}>{statusPembayaranLabels[s]}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-black-700">Metode Bayar</label>
                      <select value={editForm.metode_pembayaran || 'transfer'} onChange={(e) => setEditField('metode_pembayaran', e.target.value as MetodePembayaran)} className={inputClass}>
                        {(Object.keys(metodePembayaranLabels) as MetodePembayaran[]).map((m) => (<option key={m} value={m}>{metodePembayaranLabels[m]}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-black-700">Jumlah Bayar (Rp)</label>
                      <input type="number" min="0" value={newPaymentAmount} onChange={(e) => setNewPaymentAmount(e.target.value)} className={inputClass} placeholder="0" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-black-700">Bukti Pembayaran</label>
                    {editBuktiFile && (
                      <ImagePreview
                        src={editBuktiNewPreview}
                        onRemove={() => {
                          if (editBuktiNewPreview) URL.revokeObjectURL(editBuktiNewPreview);
                          setEditBuktiFile(null);
                          setEditBuktiNewPreview(null);
                        }}
                      />
                    )}
                    <UploadBox
                      label="Upload bukti pembayaran"
                      hint="JPG, PNG, maks 2MB"
                      fileName={editBuktiFile?.name}
                      icon={
                        <svg className="h-5 w-5 text-black-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      }
                      onFile={(f) => {
                        if (!f) return;
                        if (editBuktiNewPreview) URL.revokeObjectURL(editBuktiNewPreview);
                        setEditBuktiFile(f);
                        setEditBuktiNewPreview(URL.createObjectURL(f));
                      }}
                    />
                  </div>
                </div>
              )}
              {!isCoreLocked && (<>
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-black-400">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  Data Customer
                </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-black-700">Nama Customer *</label>
                  <div className="relative" ref={editCustomerSearchRef}>
                    <input
                      type="text"
                      value={editForm.customer_id ? (editForm.customer_name || '') : editCustomerSearch}
                      onChange={(e) => {
                        setEditForm((prev) => ({ ...prev, customer_id: '', customer_name: e.target.value, customer_no_hp: '', customer_email: '', customer_alamat: '', customer_no_ktp: '', customer_no_sim: '' }));
                        setEditCustomerSearch(e.target.value);
                        setShowEditCustomerSuggestions(true);
                      }}
                      onFocus={() => { if (editCustomerSearch) setShowEditCustomerSuggestions(true); }}
                      placeholder="Ketik nama customer..."
                      disabled={isConfirmedBerAktivitas}
                      className={`${inputClass} ${isConfirmedBerAktivitas ? 'cursor-not-allowed bg-canvas text-black-400' : ''}`}
                    />
                    {showEditCustomerSuggestions && filteredEditCustomers.length > 0 && (
                      <div className="absolute z-20 mt-1 w-full rounded-lg border border-black-200 bg-white py-1 shadow-lg">
                        {filteredEditCustomers.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setEditForm((prev) => ({ ...prev, customer_id: String(c.id), customer_name: c.nama_lengkap, customer_no_hp: c.no_hp, customer_email: c.email || '', customer_alamat: c.alamat || '', customer_no_ktp: c.no_ktp || '', customer_no_sim: c.no_sim || '' }));
                              setEditCustomerSearch('');
                              setShowEditCustomerSuggestions(false);
                            }}
                            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition hover:bg-canvas"
                          >
                            <span className="font-medium text-black-900">{c.nama_lengkap}</span>
                            <span className="text-xs text-black-400">{formatHpDisplay(c.no_hp)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {editForm.customer_id && !isConfirmedBerAktivitas ? (
                    <button
                      type="button"
                      onClick={() => setEditForm((prev) => ({ ...prev, customer_id: '', customer_name: '', customer_no_hp: '', customer_email: '', customer_alamat: '', customer_no_ktp: '', customer_no_sim: '' }))}
                      className="mt-1.5 inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700"
                    >
                      <CloseIcon className="h-3 w-3" /> Ganti customer
                    </button>
                  ) : editForm.customer_name ? (
                    <p className="mt-1.5 text-xs text-accent-600">Customer baru akan dibuat otomatis</p>
                  ) : null}
                  {editNameConflict && (
                    <p className="mt-1.5 text-xs text-amber-600">
                      Ada pelanggan bernama {editNameConflict.nama_lengkap} (No. HP {formatHpDisplay(editNameConflict.no_hp)}) — jika orang yang sama, pilih dari daftar pelanggan lalu perbarui No. HP.
                    </p>
                  )}
                </div>
                {(editForm.customer_id || editForm.customer_name) && (
                  <>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-black-700">No. HP *</label>
                      <input type="text" value={editForm.customer_no_hp || ''} onChange={(e) => setEditField('customer_no_hp', e.target.value)} disabled={isConfirmedBerAktivitas} className={`${inputClass} ${isConfirmedBerAktivitas ? 'cursor-not-allowed bg-canvas text-black-400' : ''}`} placeholder="08xxx" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-black-700">No. KTP</label>
                      <input type="text" value={editForm.customer_no_ktp || ''} onChange={(e) => setEditField('customer_no_ktp', e.target.value)} disabled={isConfirmedBerAktivitas} className={`${inputClass} ${isConfirmedBerAktivitas ? 'cursor-not-allowed bg-canvas text-black-400' : ''}`} placeholder="opsional" />
                      {editKtpConflict && (
                        <p className="mt-1 text-xs text-amber-600">
                          No. KTP sudah terdaftar atas nama {editKtpConflict.nama_lengkap} — pilih dari daftar pelanggan, atau periksa kembali No. KTP.
                        </p>
                      )}
                      {!editForm.customer_id && !editForm.customer_no_ktp?.trim() && (
                        <p className="mt-1 text-xs text-amber-600">
                          No. KTP belum diisi — sebaiknya diisi agar pelanggan bisa dikenali jika kembali.
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-black-700">No. SIM *</label>
                      <input type="text" value={editForm.customer_no_sim || ''} onChange={(e) => setEditField('customer_no_sim', e.target.value)} disabled={isConfirmedBerAktivitas} className={`${inputClass} ${isConfirmedBerAktivitas ? 'cursor-not-allowed bg-canvas text-black-400' : ''}`} placeholder="Wajib diisi" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-black-700">Email</label>
                      <input type="email" value={editForm.customer_email || ''} onChange={(e) => setEditField('customer_email', e.target.value)} disabled={isConfirmedBerAktivitas} className={`${inputClass} ${isConfirmedBerAktivitas ? 'cursor-not-allowed bg-canvas text-black-400' : ''}`} placeholder="opsional" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-medium text-black-700">Alamat *</label>
                      <input type="text" value={editForm.customer_alamat || ''} onChange={(e) => setEditField('customer_alamat', e.target.value)} disabled={isConfirmedBerAktivitas} className={`${inputClass} ${isConfirmedBerAktivitas ? 'cursor-not-allowed bg-canvas text-black-400' : ''}`} placeholder="Wajib diisi" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-medium text-black-700">Dokumen Identitas</label>
                      {isKonfirmasi || isCoreLocked ? (
                        <div className="flex gap-3">
                          {editingOrder.customer?.foto_ktp ? (
                            <div>
                              <p className="mb-1 text-xs text-black-400">Dokumen Identitas</p>
                              <img src={`/storage/${editingOrder.customer.foto_ktp}`} alt="Dokumen Identitas" className="h-20 w-28 rounded-lg border border-black-200 object-cover" />
                            </div>
                          ) : (
                            <p className="text-xs italic text-black-400">Dokumen tidak diunggah</p>
                          )}
                        </div>
                      ) : (
                        <>
                          {editCustFotoKtpFile ? (
                            <ImagePreview
                              src={editCustFotoKtpPreview}
                              onRemove={() => {
                                if (editCustFotoKtpPreview) URL.revokeObjectURL(editCustFotoKtpPreview);
                                setEditCustFotoKtpFile(null);
                                setEditCustFotoKtpPreview(editingOrder.customer?.foto_ktp ? `/storage/${editingOrder.customer.foto_ktp}` : null);
                              }}
                            />
                          ) : editCustFotoKtpPreview && !editCustFotoKtpDelete ? (
                            <ImagePreview
                              src={editCustFotoKtpPreview}
                              onRemove={() => {
                                setEditCustFotoKtpPreview(null);
                                setEditCustFotoKtpDelete(true);
                              }}
                            />
                          ) : null}
                          <UploadBox
                            label="KTP / Paspor / SIM"
                            hint="JPG, PNG, maks 2MB"
                            fileName={editCustFotoKtpFile?.name}
                            icon={<svg className="h-5 w-5 text-black-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                            onFile={(f) => {
                              if (!f) return;
                              if (editCustFotoKtpPreview && editCustFotoKtpFile) URL.revokeObjectURL(editCustFotoKtpPreview);
                              setEditCustFotoKtpFile(f);
                              setEditCustFotoKtpPreview(URL.createObjectURL(f));
                              setEditCustFotoKtpDelete(false);
                            }}
                          />
                        </>
                      )}
                    </div>
                  </>
                )}
                <div>
                  <label className="mb-1 block text-sm font-medium text-black-700">Opsi Supir</label>
                  <div className="grid grid-cols-2 gap-2">
                    <label
                      className={`flex cursor-pointer items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 transition-all ${
                        editForm.opsi_supir === 'lepas_kunci'
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-black-200 hover:border-black-300'
                      } ${isConfirmedBerAktivitas ? 'pointer-events-none opacity-60' : ''}`}
                    >
                      <input
                        type="radio"
                        name="opsi_supir_edit"
                        className="sr-only"
                        checked={editForm.opsi_supir === 'lepas_kunci'}
                        onChange={() => setEditField('opsi_supir', 'lepas_kunci')}
                        disabled={isConfirmedBerAktivitas}
                      />
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                          editForm.opsi_supir === 'lepas_kunci' ? 'border-primary-500' : 'border-black-300'
                        }`}
                      >
                        {editForm.opsi_supir === 'lepas_kunci' && <span className="h-2 w-2 rounded-full bg-primary-500" />}
                      </span>
                      <span className="text-sm font-medium text-black-900">Lepas Kunci</span>
                    </label>
                    <label
                      className={`flex cursor-pointer items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 transition-all ${
                        editForm.opsi_supir === 'dengan_supir'
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-black-200 hover:border-black-300'
                      } ${isConfirmedBerAktivitas ? 'pointer-events-none opacity-60' : ''}`}
                    >
                      <input
                        type="radio"
                        name="opsi_supir_edit"
                        className="sr-only"
                        checked={editForm.opsi_supir === 'dengan_supir'}
                        onChange={() => setEditField('opsi_supir', 'dengan_supir')}
                        disabled={isConfirmedBerAktivitas}
                      />
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                          editForm.opsi_supir === 'dengan_supir' ? 'border-primary-500' : 'border-black-300'
                        }`}
                      >
                        {editForm.opsi_supir === 'dengan_supir' && <span className="h-2 w-2 rounded-full bg-primary-500" />}
                      </span>
                      <span className="text-sm font-medium text-black-900">Dengan Supir</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-black-700">Calo</label>
                  <select value={editForm.calo_id || ''} onChange={(e) => setEditField('calo_id', e.target.value)} disabled={isConfirmedBerAktivitas} className={`${inputClass} ${isConfirmedBerAktivitas ? 'cursor-not-allowed bg-canvas text-black-400' : ''}`}>
                    <option value="">Pilih Calo (opsional)</option>
                    {calos
                      .filter((c) => c.status === 'active')
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nama} — {formatHpDisplay(c.no_hp)}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              </div>

              <div>
                <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-black-400">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17h.01M16 17h.01M3 11l1.5-5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.4L21 11M3 11h18M3 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-6" /></svg>
                  Pilih Kendaraan
                </h3>
                <label className="mb-1 block text-sm font-medium text-black-700">Kendaraan</label>
                <div className="relative mb-2">
                  <svg
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={editKendaraanSearch}
                    onChange={(e) => setEditKendaraanSearch(e.target.value)}
                    disabled={isCoreLocked}
                    placeholder="Cari nama, plat, atau warna..."
                    className={`${inputClass} pl-9 ${isCoreLocked ? 'cursor-not-allowed bg-canvas text-black-400' : ''}`}
                  />
                  {editKendaraanSearch && !isCoreLocked && (
                    <button
                      type="button"
                      onClick={() => setEditKendaraanSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-black-400 hover:text-black-700"
                      aria-label="Bersihkan pencarian"
                    >
                      <CloseIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {filteredKendaraanEdit.length === 0 ? (
                  <p className="py-4 text-center text-sm italic text-black-400">Tidak ada kendaraan yang cocok</p>
                ) : (
                  <div ref={editKendaraanListRef} className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                    {filteredKendaraanEdit.map((k) => {
                      const selected = editForm.kendaraan_id === String(k.id);
                      const isCurrentVehicle = editingOrder && k.id === editingOrder.kendaraan_id;
                      const available = isVehicleAvailable(k) || isCurrentVehicle;
                      return (
                        <div
                          key={k.id}
                          data-selected={selected ? 'true' : undefined}
                          onClick={() => available && handleEditKendaraanSelect(k.id)}
                          className={`w-44 shrink-0 rounded-xl border-2 transition-all ${
                            !available
                              ? 'cursor-not-allowed border-black-200 bg-canvas opacity-70'
                              : selected
                                ? 'cursor-pointer border-primary-500 bg-primary-50/50 ring-2 ring-primary-100'
                                : 'cursor-pointer border-black-200 hover:border-primary-400 hover:shadow-sm'
                          }`}
                        >
                          <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-t-[10px] bg-canvas">
                            {k.foto ? (
                              <img
                                src={k.foto.startsWith('http') ? k.foto : `/storage/${k.foto}`}
                                alt={k.nama_kendaraan}
                                className={`h-full w-full object-cover ${!available ? 'grayscale blur-[1px]' : ''}`}
                              />
                            ) : (
                              <svg className={`h-10 w-10 text-black-200 ${!available ? 'grayscale' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1.5}
                                  d="M8 17h.01M16 17h.01M3 11l1.5-5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.4L21 11M3 11h18M3 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-6"
                                />
                              </svg>
                            )}
                            {!available && (
                              <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-error-500/90 px-2.5 py-0.5 text-[10px] font-semibold text-white shadow">
                                {k.status === 'maintenance' ? 'Maintenance' : 'Sedang Disewa'}
                              </span>
                            )}
                          </div>
                          <div className="space-y-1 p-3">
                            <p className={`truncate text-sm font-semibold leading-tight ${!available ? 'text-black-400' : 'text-black-900'}`}>{k.nama_kendaraan}</p>
                            <p className="font-mono text-xs text-black-400">{k.plat_nomor}</p>
                            <div className="flex items-center gap-1.5">
                              <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-black-200" style={{ backgroundColor: warnaKendaraanHex(k.warna) || '#E5E7EB' }} />
                              <span className="truncate text-xs text-black-400">{k.warna}</span>
                            </div>
                            <p className={`text-xs font-bold ${!available ? 'text-black-400' : 'text-primary-600'}`}>{formatRupiah(k.harga_sewa_per_hari)}/hari</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-black-400">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  Jadwal & Pembayaran
                </h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-black-700">Tanggal Mulai</label>
                  <input
                    type="date"
                    value={editForm.tanggal_mulai || ''}
                    onChange={(e) => setEditField('tanggal_mulai', e.target.value)}
                    disabled={isCoreLocked}
                    required
                    className={`${inputClass} ${isCoreLocked ? 'cursor-not-allowed bg-canvas text-black-400' : ''}`}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-black-700">Jam Mulai</label>
                  <input
                    type="time"
                    value={editForm.jam_mulai || '08:00'}
                    onChange={(e) => setEditField('jam_mulai', e.target.value)}
                    disabled={isCoreLocked}
                    min={editForm.tanggal_mulai === todayJakarta() ? nowWIBTime() : undefined}
                    className={`${inputClass} ${isCoreLocked ? 'cursor-not-allowed bg-canvas text-black-400' : ''}`}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-black-700">Tanggal Selesai</label>
                  <input
                    type="date"
                    value={editForm.tanggal_selesai || ''}
                    onChange={(e) => setEditField('tanggal_selesai', e.target.value)}
                    disabled={isCoreLocked}
                    required
                    className={`${inputClass} ${isCoreLocked ? 'cursor-not-allowed bg-canvas text-black-400' : ''}`}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-black-700">Jam Selesai</label>
                  <input
                    type="time"
                    value={editForm.jam_selesai || '17:00'}
                    onChange={(e) => setEditField('jam_selesai', e.target.value)}
                    disabled={isCoreLocked}
                    min={editForm.tanggal_selesai === todayJakarta() ? nowWIBTime() : undefined}
                    className={`${inputClass} ${isCoreLocked ? 'cursor-not-allowed bg-canvas text-black-400' : ''}`}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-black-700">Harga/Hari (Rp)</label>
                  <input
                    type="number"
                    value={editHargaPerHari}
                    readOnly
                    className="w-full cursor-not-allowed rounded-lg border border-black-200 bg-canvas px-3 py-2 text-sm text-black-400"
                  />
                  <p className="mt-0.5 text-xs text-black-400">Otomatis dari harga kendaraan</p>
                </div>
                {!isKonfirmasi && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-black-700">Status Pembayaran</label>
                  <select
                    value={editForm.status_pembayaran || 'unpaid'}
                    onChange={(e) => setEditField('status_pembayaran', e.target.value as StatusPembayaran)}
                    className={inputClass}
                  >
                    {statusPembayaranOptions.map((s) => (
                      <option key={s} value={s}>
                        {statusPembayaranLabels[s]}
                      </option>
                    ))}
                  </select>
                </div>
                )}
                {!isKonfirmasi && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-black-700">Metode Bayar</label>
                  <select
                    value={editForm.metode_pembayaran || 'cash'}
                    onChange={(e) => setEditField('metode_pembayaran', e.target.value as MetodePembayaran)}
                    className={inputClass}
                  >
                    {(Object.keys(metodePembayaranLabels) as MetodePembayaran[]).map((m) => (
                      <option key={m} value={m}>
                        {metodePembayaranLabels[m]}
                      </option>
                    ))}
                  </select>
                </div>
                )}
                {!isKonfirmasi && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-black-700">Status Pengiriman</label>
                  <select
                    value={editForm.status_pengiriman || ''}
                    onChange={(e) => setEditField('status_pengiriman', e.target.value as StatusPengiriman)}
                    className={inputClass}
                  >
                    {(Object.keys(statusPengirimanLabels) as StatusPengiriman[])
                      .filter((s) => s !== 'sudah_diantarkan')
                      .map((s) => (
                        <option key={s} value={s}>
                          {statusPengirimanLabels[s]}
                        </option>
                      ))}
                  </select>
                </div>
                )}
              </div>
              </div>
              </>)}

              {editForm.tanggal_mulai && editForm.tanggal_selesai && editHargaPerHari > 0 ? (
                <div className="space-y-3 rounded-xl border border-primary-100 bg-primary-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary-400">Rincian Biaya</p>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-black-900">Sewa Kendaraan</p>
                      <p className="text-xs text-black-400">
                        {editDurasi} hari × {formatRupiah(editHargaPerHari)}/hari
                      </p>
                      <p className="mt-0.5 text-xs text-black-400">
                        {editForm.tanggal_mulai} {editForm.jam_mulai || '08:00'} → {editForm.tanggal_selesai} {editForm.jam_selesai || '17:00'} WIB
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-black-900">{formatRupiah(editDurasi * editHargaPerHari)}</p>
                  </div>
                  {supirTarifEdit > 0 && (
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-black-900">Biaya Supir</p>
                        <p className="text-xs text-black-400">
                          Dengan supir · {editDurasi} hari × {formatRupiah(supirTarifEdit)}/hari
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold text-black-900">{formatRupiah(supirTarifEdit * editDurasi)}</p>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t border-primary-100 pt-2">
                    <span className="text-sm font-semibold text-black-900">Total</span>
                    <span className="text-lg font-bold text-primary-600">{formatRupiah(editTotal)}</span>
                  </div>
                </div>
              ) : null}

              {!isLockedOrder && !isPlainCoreLocked && (
              <>
              <div>
                <label className="mb-1 block text-sm font-medium text-black-700">Metode Penyerahan</label>
                <div className="flex gap-4">
                  <label className={`flex items-center gap-2.5 rounded-xl border-2 px-4 py-3 transition-all flex-1 ${editForm.metode_penyerahan === 'antar' ? '' : 'border-primary-500 bg-primary-50'} ${isConfirmedBerAktivitas ? 'pointer-events-none opacity-60' : 'cursor-pointer'}`}>
                    <input
                      type="radio"
                      name="edit_metode_penyerahan"
                      value="ambil"
                      checked={editForm.metode_penyerahan === 'ambil'}
                      onChange={() => setEditField('metode_penyerahan', 'ambil')}
                      disabled={isConfirmedBerAktivitas}
                      className="sr-only"
                    />
                    <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${editForm.metode_penyerahan === 'ambil' ? 'border-primary-500' : 'border-black-200'}`}>
                      {editForm.metode_penyerahan === 'ambil' && <div className="h-2 w-2 rounded-full bg-primary-500" />}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-black-900">Ambil Kendaraan</div>
                      <div className="text-xs text-black-400">Customer ambil sendiri di garasi</div>
                    </div>
                  </label>
                  <label className={`flex items-center gap-2.5 rounded-xl border-2 px-4 py-3 transition-all flex-1 ${editForm.metode_penyerahan === 'antar' ? 'border-primary-500 bg-primary-50' : 'border-black-200 hover:border-black-200'} ${isConfirmedBerAktivitas ? 'pointer-events-none opacity-60' : 'cursor-pointer'}`}>
                    <input
                      type="radio"
                      name="edit_metode_penyerahan"
                      value="antar"
                      checked={editForm.metode_penyerahan === 'antar'}
                      onChange={() => setEditField('metode_penyerahan', 'antar')}
                      disabled={isConfirmedBerAktivitas}
                      className="sr-only"
                    />
                    <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${editForm.metode_penyerahan === 'antar' ? 'border-primary-500' : 'border-black-200'}`}>
                      {editForm.metode_penyerahan === 'antar' && <div className="h-2 w-2 rounded-full bg-primary-500" />}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-black-900">Antar Kendaraan</div>
                      <div className="text-xs text-black-400">Kendaraan diantar ke lokasi customer</div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-black-700">
                    {editForm.metode_penyerahan === 'antar' ? 'Alamat Pengantaran *' : 'Lokasi Ambil'}
                  </label>
                  <input type="text" value={editForm.alamat_jemput || ''} onChange={(e) => setEditField('alamat_jemput', e.target.value)} required={editForm.metode_penyerahan === 'antar'} disabled={isConfirmedBerAktivitas} className={`${inputClass} ${isConfirmedBerAktivitas ? 'cursor-not-allowed bg-canvas text-black-400' : ''}`} placeholder={editForm.metode_penyerahan === 'antar' ? 'Alamat tujuan pengantaran kendaraan' : 'Lokasi pengambilan kendaraan'} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-black-700">Tujuan *</label>
                  <input type="text" value={editForm.tujuan || ''} onChange={(e) => setEditField('tujuan', e.target.value)} disabled={isConfirmedBerAktivitas} className={`${inputClass} ${isConfirmedBerAktivitas ? 'cursor-not-allowed bg-canvas text-black-400' : ''}`} placeholder="Tujuan penggunaan kendaraan" />
                </div>
              </div>
              </>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-black-700">Catatan</label>
                {isFullyLocked ? (
                  <p className={`${inputClass} border-black-200 bg-accent-50 whitespace-pre-wrap`}>{editForm.catatan || <span className="italic text-black-400">Tidak ada catatan</span>}</p>
                ) : (
                  <textarea
                    value={editForm.catatan || ''}
                    onChange={(e) => setEditField('catatan', e.target.value)}
                    rows={2}
                    className={`${inputClass} resize-none`}
                  />
                )}
              </div>

              {!isKonfirmasi && (isFullyLocked || !isLockedOrder) && (
              <div>
                <label className="mb-1 block text-sm font-medium text-black-700">Bukti Pembayaran</label>
                {isFullyLocked ? (
                  editingOrder.bukti_transfer ? (
                    <img src={`/storage/${editingOrder.bukti_transfer}`} alt="Bukti Pembayaran" className="h-24 w-32 rounded-lg border border-black-200 object-cover" />
                  ) : (
                    <p className="text-sm italic text-black-400">Tidak ada bukti pembayaran</p>
                  )
                ) : (
                  <>
                    {editBuktiPreview && !editBuktiFile && (
                  <ImagePreview
                    src={editBuktiPreview}
                    onRemove={() => {
                      setEditBuktiFile(null);
                      setEditBuktiPreview(null);
                    }}
                  />
                )}
                {editBuktiFile && (
                  <ImagePreview
                    src={editBuktiNewPreview}
                    onRemove={() => {
                      if (editBuktiNewPreview) URL.revokeObjectURL(editBuktiNewPreview);
                      setEditBuktiFile(null);
                      setEditBuktiPreview(editingOrder.bukti_transfer ? `/storage/${editingOrder.bukti_transfer}` : null);
                      setEditBuktiNewPreview(null);
                    }}
                  />
                )}
                <UploadBox
                  label="Ganti bukti pembayaran"
                  hint="JPG, PNG, maks 2MB"
                  fileName={editBuktiFile?.name}
                  icon={
                    <svg className="h-5 w-5 text-black-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  }
                  onFile={(f) => {
                    if (!f) return;
                    if (editBuktiNewPreview) URL.revokeObjectURL(editBuktiNewPreview);
                    setEditBuktiFile(f);
                    setEditBuktiNewPreview(URL.createObjectURL(f));
                  }}
                />
                    </>
                  )}
              </div>
              )}

              <div className="flex justify-end gap-3 border-t border-black-200 pt-4">
                {isFullyLocked ? (
                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="rounded-lg border border-black-200 px-4 py-2 text-sm font-medium text-black-700 transition-colors hover:bg-canvas"
                  >
                    Tutup
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={closeEditModal}
                      className="rounded-lg border border-black-200 px-4 py-2 text-sm font-medium text-black-700 transition-colors hover:bg-canvas"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
                    >
                      {submitting && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                      {isKonfirmasi ? 'Konfirmasi & Simpan' : 'Simpan Perubahan'}
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
 * Detail Order Modal — redesign
 * ─────────────────────────────────────────────────────────────
 * Ganti seluruh blok "{/* Detail Modal *​/}" (dari {detailOrder && ( ...
 * sampai penutupnya )} ) di Orders.tsx dengan kode di bawah ini.
 * State & handler yang dipakai (detailOrder, setDetailOrder,
 * setInvoiceOrder, overtimeRate, toast) sudah ada di file kamu,
 * tidak perlu tambahan apa pun selain kode ini.
 *
 * CATATAN: Field "Kategori / Tipe / Transmisi" pada card Kendaraan
 * di gambar referensi kemungkinan berasal dari field tambahan pada
 * objek `kendaraan` (mis. kendaraan.kategori, kendaraan.tipe,
 * kendaraan.transmisi) yang belum saya lihat di type Kendaraan kamu.
 * Saya buat opsional (hanya tampil kalau field-nya ada) — kalau
 * field itu belum ada di API/type kamu, kasih tahu saya nama field
 * aslinya biar saya sesuaikan, atau baris itu otomatis tidak muncul.
 * ───────────────────────────────────────────────────────────── */}

      {detailOrder && (
        <div className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-black/50 p-4" onClick={() => setDetailOrder(null)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white p-6">
              <div>
                <h2 className="text-lg font-semibold text-black-900">Detail Order</h2>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(detailOrder.kode_order);
                    toast.success('Kode order disalin');
                  }}
                  className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-canvas px-2.5 py-1 font-mono text-xs font-medium text-black-600 transition-colors hover:bg-black-100"
                >
                  {detailOrder.kode_order}
                  <svg className="h-3 w-3 text-black-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
              <button onClick={() => setDetailOrder(null)} className="rounded-lg p-1 transition-colors hover:bg-canvas" aria-label="Tutup">
                <CloseIcon />
              </button>
            </div>

            <div className="space-y-4 p-6">
              {/* ── Status pills ── */}
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${statusOrderColors[detailOrder.status_order]}`}>
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  {statusOrderLabels[detailOrder.status_order]}
                </span>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${statusPembayaranColors[detailOrder.status_pembayaran]}`}>
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  {statusPembayaranLabels[detailOrder.status_pembayaran]}
                </span>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${statusPengirimanColors[detailOrder.status_pengiriman]}`}>
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  {statusPengirimanLabels[detailOrder.status_pengiriman]}
                </span>
                {detailOrder.source === 'katalog' && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-100 px-3 py-1.5 text-sm font-semibold text-primary-600">
                    Pesanan Katalog
                  </span>
                )}
                {detailOrder.metode_penyerahan === 'antar' && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-100 px-3 py-1.5 text-sm font-semibold text-accent-600">
                    Diantar
                  </span>
                )}
              </div>

              {/* ── Customer ── */}
              <div className="rounded-2xl border border-gray-200 p-4">
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-black-500">
                  <svg className="h-4 w-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  Customer
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-600">
                      {detailOrder.customer?.nama_lengkap?.charAt(0)?.toLowerCase() || '?'}
                    </div>
                    <p className="truncate text-sm font-semibold text-black-900">{detailOrder.customer?.nama_lengkap}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-black-400">No. HP</p>
                    <div className="flex items-center gap-1.5 text-sm text-black-700">
                      <svg className="h-3.5 w-3.5 shrink-0 text-black-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                      {formatHpDisplay(detailOrder.customer?.no_hp)}
                    </div>
                  </div>
                  {detailOrder.customer?.alamat && (
                    <div>
                      <p className="mb-1 text-xs text-black-400">Alamat</p>
                      <div className="flex items-start gap-1.5 text-sm text-black-700">
                        <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-black-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        <span className="truncate">{detailOrder.customer.alamat}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Kendaraan ── */}
              <div className="rounded-2xl border border-gray-200 p-4">
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-black-500">
                  <svg className="h-4 w-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17h.01M16 17h.01M3 11l1.5-5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.4L21 11M3 11h18M3 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-6" /></svg>
                  Kendaraan
                </div>
                <div className="flex flex-wrap items-start gap-4">
                  <div className="flex items-center gap-3">
                    {detailOrder.kendaraan?.foto ? (
                      <img src={`/storage/${detailOrder.kendaraan.foto}`} alt="" className="h-14 w-16 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-14 w-16 shrink-0 items-center justify-center rounded-lg bg-black-50 text-black-300">
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 17h.01M16 17h.01M3 11l1.5-5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.4L21 11M3 11h18" /></svg>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-black-900">{detailOrder.kendaraan?.nama_kendaraan}</p>
                      <p className="font-mono text-xs text-black-400">{detailOrder.kendaraan?.plat_nomor}</p>
                      <span className="mt-1 inline-block rounded-full bg-canvas px-2 py-0.5 text-[11px] font-medium text-black-500">
                        {detailOrder.durasi_hari} hari
                      </span>
                    </div>
                  </div>
                  {/* Kategori/Tipe — dari relasi Kendaraan.kategori & Kendaraan.tipe (api.ts) */}
                  {detailOrder.kendaraan?.kategori?.nama_kategori && (
                    <div>
                      <p className="mb-1 text-xs text-black-400">Kategori</p>
                      <span className="inline-block rounded-full bg-canvas px-2.5 py-1 text-xs font-medium text-black-700">{detailOrder.kendaraan.kategori.nama_kategori}</span>
                    </div>
                  )}
                  {detailOrder.kendaraan?.tipe?.nama_tipe && (
                    <div>
                      <p className="mb-1 text-xs text-black-400">Tipe</p>
                      <span className="inline-block rounded-full bg-canvas px-2.5 py-1 text-xs font-medium text-black-700">{detailOrder.kendaraan.tipe.nama_tipe}</span>
                    </div>
                  )}
                  {/* Transmisi: belum ada field ini di type Kendaraan (api.ts).
                      Kalau kamu tambahkan field `transmisi` di backend + type Kendaraan,
                      tinggal aktifkan blok ini:
                  {detailOrder.kendaraan?.transmisi && (
                    <div>
                      <p className="mb-1 text-xs text-black-400">Transmisi</p>
                      <span className="inline-block rounded-full bg-canvas px-2.5 py-1 text-xs font-medium text-black-700">{detailOrder.kendaraan.transmisi}</span>
                    </div>
                  )}
                  */}
                  {detailOrder.kendaraan?.garasiPartner && (
                    <div>
                      <p className="mb-1 text-xs text-black-400">Garasi</p>
                      <span className="inline-block rounded-full bg-canvas px-2.5 py-1 text-xs font-medium text-black-700">{detailOrder.kendaraan.garasiPartner.nama_partner}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Supir & Calo ── */}
              {(detailOrder.supir || detailOrder.calo || detailOrder.opsi_supir === 'dengan_supir') && (
                <div className="rounded-2xl border border-gray-200 p-4">
                  <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-black-500">
                    <svg className="h-4 w-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    Supir & Calo
                    <span className={`ml-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${detailOrder.opsi_supir === 'dengan_supir' ? 'bg-primary-100 text-primary-700' : 'bg-canvas text-black-500'}`}>
                      {detailOrder.opsi_supir === 'dengan_supir' ? 'Dengan Supir' : 'Lepas Kunci'}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {detailOrder.opsi_supir === 'dengan_supir' && !detailOrder.supir && (
                      <p className="text-xs text-black-400">Supir akan ditentukan dari petugas yang mengklaim task inspeksi.</p>
                    )}
                    {detailOrder.supir && (
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-100 text-sm font-bold text-accent-600">
                            {detailOrder.supir.nama?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-black-900">{detailOrder.supir.nama}</p>
                            <p className="text-xs text-black-400">Supir</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-black-700">
                          <svg className="h-3.5 w-3.5 shrink-0 text-black-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                          {formatHpDisplay(detailOrder.supir.no_hp)}
                        </div>
                      </div>
                    )}
                    {detailOrder.calo && (
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-100 text-sm font-bold text-accent-600">
                            {detailOrder.calo.nama?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-black-900">{detailOrder.calo.nama}</p>
                            <p className="text-xs text-black-400">Calo</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-black-700">
                          <svg className="h-3.5 w-3.5 shrink-0 text-black-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                          {formatHpDisplay(detailOrder.calo.no_hp)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Rincian Biaya ── */}
              <div className="space-y-3 rounded-2xl border border-primary-100 bg-primary-50 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary-500">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  Rincian Biaya
                </div>
                <div className="flex items-start justify-between gap-4 border-t border-primary-100/70 pt-3">
                  <div>
                    <p className="text-sm font-semibold text-black-900">Sewa Kendaraan</p>
                    <p className="text-xs text-black-500">
                      {detailOrder.durasi_hari} hari × {formatRupiah(detailOrder.harga_per_hari)}/hari
                    </p>
                    <p className="mt-0.5 text-xs text-black-400">
                      {fmtDate(detailOrder.tanggal_mulai)} {fmtTime(detailOrder.jam_mulai) || '08:00'} → {fmtDate(detailOrder.tanggal_selesai)}{' '}
                      {fmtTime(detailOrder.jam_selesai) || '17:00'} WIB
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-black-900">{formatRupiah(Number(detailOrder.harga_per_hari) * detailOrder.durasi_hari)}</p>
                </div>
                {detailOrder.opsi_supir === 'dengan_supir' && (
                  <div className="flex items-start justify-between gap-4 border-t border-primary-100/70 pt-3">
                    <div>
                      <p className="text-sm font-medium text-black-900">Biaya Supir</p>
                      <p className="text-xs text-black-500">
                        {detailOrder.durasi_hari} hari × {formatRupiah(tarifSupirGlobal)}/hari
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-black-900">
                      {formatRupiah(detailOrder.durasi_hari * tarifSupirGlobal)}
                    </p>
                  </div>
                )}
                {detailOrder.jam_overtime > 0 && detailOrder.status_order !== 'active' && (
                  <div className="flex items-start justify-between gap-4 border-t border-primary-100/70 pt-3">
                    <div>
                      <p className="text-sm font-semibold text-error-600">Denda Overtime</p>
                      <p className="text-xs text-error-500">
                        {formatJam(detailOrder.jam_overtime)} × {formatRupiah(overtimeRate)}/jam
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-error-600">{formatRupiah(detailOrder.denda_overtime)}</p>
                  </div>
                )}
                {detailOrder.status_order === 'active' && detailOrder.jam_overtime_saat_ini > 0 && (
                  <div className="flex items-start justify-between gap-4 border-t border-primary-100/70 pt-3">
                    <div>
                      <p className="text-sm font-semibold text-error-600">Overtime saat ini</p>
                      <p className="text-xs text-error-500">
                        {formatJam(detailOrder.jam_overtime_saat_ini)} × {formatRupiah(overtimeRate)}/jam
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-error-600">{formatRupiah(detailOrder.denda_overtime_saat_ini)}</p>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-primary-200 pt-3">
                  <span className="text-sm font-semibold text-black-900">Total</span>
                  <span className="text-lg font-bold text-primary-600">
                    {formatRupiah(
                      Number(detailOrder.harga_total) +
                        ((detailOrder.status_order === 'active' || detailOrder.status_order === 'perlu_verifikasi') && detailOrder.jam_overtime_saat_ini > 0
                          ? Number(detailOrder.denda_overtime_saat_ini)
                          : 0)
                    )}
                  </span>
                </div>
              </div>

              {/* ── Alamat Jemput / Tujuan / Tanggal & Waktu ── */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {detailOrder.alamat_jemput && (
                  <div className="rounded-xl bg-canvas p-3">
                    <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-black-400">
                      <svg className="h-3.5 w-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      {detailOrder.metode_penyerahan === 'antar' ? 'Alamat Pengantaran' : 'Alamat Jemput'}
                    </div>
                    <p className="text-sm font-medium text-black-800">{detailOrder.alamat_jemput}</p>
                  </div>
                )}
                {detailOrder.tujuan && (
                  <div className="rounded-xl bg-canvas p-3">
                    <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-black-400">
                      <svg className="h-3.5 w-3.5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      Tujuan
                    </div>
                    <p className="text-sm font-medium text-black-800">{detailOrder.tujuan}</p>
                  </div>
                )}
                <div className="rounded-xl bg-canvas p-3">
                  <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-black-400">
                    <svg className="h-3.5 w-3.5 text-black-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    Tanggal & Waktu
                  </div>
                  <p className="text-sm font-medium text-black-800">
                    {fmtDate(detailOrder.tanggal_mulai)} {fmtTime(detailOrder.jam_mulai) || '08:00'}
                  </p>
                  <p className="text-xs text-black-500">
                    s/d {fmtDate(detailOrder.tanggal_selesai)} {fmtTime(detailOrder.jam_selesai) || '17:00'} WIB
                  </p>
                </div>
              </div>

              {/* ── Catatan ── */}
              {detailOrder.catatan && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-700">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    Catatan
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-black-700">{detailOrder.catatan}</p>
                </div>
              )}

              {/* ── Bukti Dokumen ── */}
              {(detailOrder.bukti_transfer || detailOrder.bukti_pengiriman || detailOrder.bukti_pengembalian) && (
<div className="rounded-2xl border border-gray-200 p-4">
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-black-500">
                  <svg className="h-4 w-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  Bukti Dokumen
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {detailOrder.bukti_transfer && (
                    <div>
                      <p className="mb-1.5 text-xs text-black-400">Bukti Pembayaran</p>
                      <a href={`/storage/${detailOrder.bukti_transfer}`} target="_blank" rel="noopener noreferrer">
                        <img
                          src={`/storage/${detailOrder.bukti_transfer}`}
                          alt="Bukti Transfer"
                          className="h-24 w-full cursor-pointer rounded-xl border border-gray-200 object-cover transition-all hover:ring-2 hover:ring-primary-400 sm:h-32"
                        />
                      </a>
                    </div>
                  )}
                  {detailOrder.bukti_pengiriman && (
                    <div>
                      <p className="mb-1.5 text-xs text-black-400">Bukti Pengiriman</p>
                      <a href={`/storage/${detailOrder.bukti_pengiriman}`} target="_blank" rel="noopener noreferrer">
                        <img
                          src={`/storage/${detailOrder.bukti_pengiriman}`}
                          alt="Bukti Pengiriman"
                          className="h-24 w-full cursor-pointer rounded-xl border border-gray-200 object-cover transition-all hover:ring-2 hover:ring-primary-400 sm:h-32"
                        />
                      </a>
                    </div>
                  )}
                  {detailOrder.bukti_pengembalian && (
                    <div>
                      <p className="mb-1.5 text-xs text-black-400">Bukti Pengembalian</p>
                      <a href={`/storage/${detailOrder.bukti_pengembalian}`} target="_blank" rel="noopener noreferrer">
                        <img
                          src={`/storage/${detailOrder.bukti_pengembalian}`}
                          alt="Bukti Pengembalian"
                          className="h-24 w-full cursor-pointer rounded-xl border border-gray-200 object-cover transition-all hover:ring-2 hover:ring-primary-400 sm:h-32"
                        />
                      </a>
                    </div>
                  )}
                </div>
              </div>
              )}

              {/* ── Footer: audit info + Lihat Invoice ── */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4">
                <div className="flex flex-wrap items-center gap-5 text-xs text-black-400">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-black-50 text-black-300">
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    </div>
                    <div>
                      <p>Dibuat oleh</p>
                      <p className="font-medium text-black-700">{detailOrder.admin?.name || '-'}</p>
                      <p>{detailOrder.created_at ? new Date(detailOrder.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-black-50 text-black-300">
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    </div>
                    <div>
                      <p>Diperbarui oleh</p>
                      <p className="font-medium text-black-700">{detailOrder.admin?.name || '-'}</p>
                      <p>{detailOrder.updated_at ? new Date(detailOrder.updated_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</p>
                    </div>
                  </div>
                </div>
                {detailOrder.status_order === 'completed' && (
                  <button
                    onClick={() => {
                      setDetailOrder(null);
                      setInvoiceOrder(detailOrder);
                    }}
                    className="flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                      />
                    </svg>
                    Lihat Invoice
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {invoiceOrder && (
        <div className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-black/50 p-4" onClick={() => setInvoiceOrder(null)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white p-6 print:hidden">
              <h2 className="text-lg font-semibold text-black-900">Invoice Sewa Kendaraan</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="rounded-lg p-1.5 text-black-400 transition-colors hover:bg-primary-50 hover:text-primary-600"
                  title="Cetak Invoice"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                    />
                  </svg>
                </button>
                <button onClick={() => setInvoiceOrder(null)} className="rounded-lg p-1 transition-colors hover:bg-canvas" aria-label="Tutup">
                  <CloseIcon />
                </button>
              </div>
            </div>
            <div className="space-y-5 p-6" id="invoice-content">
              <div className="border-b border-gray-200 pb-4 text-center">
                <h1 className="text-xl font-bold text-black-900">UDIN RENCTCAR</h1>
                <p className="mt-1 text-xs text-black-400">Sistem Manajemen Rental Kendaraan</p>
                <p className="mt-0.5 text-xs text-black-400">Jl. Contoh Alamat No. 123, Bandung</p>
              </div>

              <div className="flex justify-between text-sm">
                <div>
                  <p className="text-xs text-black-400">Invoice</p>
                  <p className="font-mono font-bold text-black-900">{invoiceOrder.kode_order}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-black-400">Tanggal</p>
                  <p className="text-black-900">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
              </div>

              <div className="rounded-xl bg-canvas p-3 text-sm">
                <p className="mb-1 text-xs text-black-400">Disewa oleh</p>
                <p className="font-medium text-black-900">{invoiceOrder.customer?.nama_lengkap}</p>
                <p className="text-xs text-black-700">{formatHpDisplay(invoiceOrder.customer?.no_hp)}</p>
                {invoiceOrder.customer?.alamat && <p className="text-xs text-black-400">{invoiceOrder.customer.alamat}</p>}
              </div>

              <div className="rounded-xl bg-canvas p-3 text-sm">
                <p className="mb-1 text-xs text-black-400">Kendaraan</p>
                <p className="font-medium text-black-900">{invoiceOrder.kendaraan?.nama_kendaraan}</p>
                <p className="font-mono text-xs text-black-700">{invoiceOrder.kendaraan?.plat_nomor}</p>
              </div>

              {(invoiceOrder.supir || invoiceOrder.calo || invoiceOrder.opsi_supir === 'dengan_supir') && (
                <div className="rounded-xl bg-canvas p-3 text-sm">
                  <p className="mb-1 text-xs text-black-400">Supir & Calo</p>
                  {invoiceOrder.supir && <p className="font-medium text-black-900">Supir: {invoiceOrder.supir.nama}</p>}
                  {!invoiceOrder.supir && invoiceOrder.opsi_supir === 'dengan_supir' && (
                    <p className="font-medium text-black-900">Dengan Supir</p>
                  )}
                  {invoiceOrder.calo && (
                    <p className="text-xs text-black-700">
                      Calo: {invoiceOrder.calo.nama}
                      {invoiceOrder.calo.komisi ? ` (${formatRupiah(invoiceOrder.calo.komisi)})` : ''}
                    </p>
                  )}
                </div>
              )}

              <div className="text-sm">
                <p className="mb-2 text-xs text-black-400">Periode Sewa</p>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-black-700">Mulai</span>
                    <span className="text-black-900">
                      {fmtDate(invoiceOrder.tanggal_mulai)}
                      {invoiceOrder.jam_mulai ? `, ${fmtTime(invoiceOrder.jam_mulai)} WIB` : ''}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-black-700">Selesai</span>
                    <span className="text-black-900">
                      {fmtDate(invoiceOrder.tanggal_selesai)}
                      {invoiceOrder.jam_selesai ? `, ${fmtTime(invoiceOrder.jam_selesai)} WIB` : ''}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 border-t border-gray-200 pt-4 text-sm">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-black-400">Rincian Biaya</p>
                <div className="flex justify-between">
                  <span className="text-black-700">
                    Sewa {invoiceOrder.durasi_hari} hari × {formatRupiah(invoiceOrder.harga_per_hari)}/hari
                  </span>
                  <span className="text-black-900">{formatRupiah(invoiceOrder.durasi_hari * invoiceOrder.harga_per_hari)}</span>
                </div>
                {invoiceOrder.opsi_supir === 'dengan_supir' ? (
                  <div className="flex justify-between">
                    <span className="text-black-700">
                      Supir {invoiceOrder.durasi_hari} hari × {formatRupiah(tarifSupirGlobal)}/hari
                    </span>
                    <span className="text-black-900">{formatRupiah(invoiceOrder.durasi_hari * tarifSupirGlobal)}</span>
                  </div>
                ) : invoiceOrder.supir && invoiceOrder.supir.tarif_per_hari ? (
                  <div className="flex justify-between">
                    <span className="text-black-700">
                      Supir {invoiceOrder.durasi_hari} hari × {formatRupiah(invoiceOrder.supir.tarif_per_hari)}/hari
                    </span>
                    <span className="text-black-900">{formatRupiah(invoiceOrder.durasi_hari * invoiceOrder.supir.tarif_per_hari)}</span>
                  </div>
                ) : null}
                {invoiceOrder.jam_overtime > 0 && (
                  <div className="flex justify-between">
                    <span className="text-error-600">
                      Denda keterlambatan {formatJam(invoiceOrder.jam_overtime)} × {formatRupiah(overtimeRate)}
                    </span>
                    <span className="font-medium text-error-600">{formatRupiah(invoiceOrder.denda_overtime)}</span>
                  </div>
                )}
<div className="flex items-center justify-between border-t border-gray-200 pt-2">
                      <span className="font-semibold text-black-900">Total</span>
                      <span className="text-xl font-bold text-black-900">{formatRupiah(invoiceOrder.harga_total)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-200 pt-2 text-xs text-black-400">
                <div className="flex items-center gap-3">
                  <span>
                    Status:{' '}
                    <span className="font-semibold text-black-700">{statusPembayaranLabels[invoiceOrder.status_pembayaran]}</span>
                  </span>
                  <span>
                    Bayar:{' '}
                    <span className="font-semibold text-black-700">
                      {(invoiceOrder.metode_pembayaran && metodePembayaranLabels[invoiceOrder.metode_pembayaran]) || '-'}
                    </span>
                  </span>
                </div>
                <span>{invoiceOrder.admin?.name ? `Dikelola oleh ${invoiceOrder.admin.name}` : ''}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!confirmDelete}
        title="Hapus Order"
        message={`Yakin ingin menghapus order "${confirmDelete?.kode_order}"? Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      <ConfirmModal
        open={!!confirmAction}
        title={confirmAction?.title || 'Konfirmasi'}
        message={confirmAction?.message || ''}
        danger={confirmAction?.danger ?? true}
        onConfirm={async () => {
          if (confirmAction?.onConfirm) await confirmAction.onConfirm();
          setConfirmAction(null);
        }}
        onCancel={() => setConfirmAction(null)}
      />

      {cancelOrder && (
        <div className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-black/50 p-4" onClick={() => setCancelOrder(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-black-900">Batalkan Order</h2>
            <p className="mt-1 text-sm text-black-600">
              Yakin ingin membatalkan order &quot;{cancelOrder.kode_order}&quot; dari {cancelOrder.customer?.nama_lengkap}?
            </p>
            {cancelPreviewLoading ? (
              <div className="mt-4 rounded-lg border border-gray-200 bg-canvas px-4 py-3 text-sm text-black-500">Menghitung biaya pembatalan…</div>
            ) : cancelPreview ? (
              <div className={`mt-4 space-y-1.5 rounded-lg border px-4 py-3 text-sm ${cancelPreview.persentase >= 100 ? 'border-error-200 bg-error-50' : 'border-amber-200 bg-amber-50'}`}>
                <p className={`font-semibold ${cancelPreview.persentase >= 100 ? 'text-error-700' : 'text-amber-700'}`}>
                  Denda pembatalan {cancelPreview.persentase}%: {formatRupiah(cancelPreview.biaya)}
                </p>
                <p className="text-xs text-black-500">{cancelPreview.keterangan}</p>
                <div className="mt-2 flex items-center justify-between border-t border-black/5 pt-2 text-xs">
                  <span className="text-black-500">Sudah dibayar: {formatRupiah(cancelPreview.total_dibayar)}</span>
                  <span className={cancelPreview.refund_estimasi > 0 ? 'font-semibold text-success-600' : 'font-semibold text-error-600'}>
                    {cancelPreview.refund_estimasi > 0
                      ? `Estimasi refund: ${formatRupiah(cancelPreview.refund_estimasi)}`
                      : 'Tidak ada refund'}
                  </span>
                </div>
              </div>
            ) : null}
            <label className="mt-4 block text-sm font-medium text-black-700">
              Alasan Pembatalan <span className="text-xs font-normal text-black-400">(disarankan)</span>
            </label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Contoh: customer membatalkan karena kebutuhan berubah..."
              className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black-900 outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => {
                  setCancelOrder(null);
                  setCancelReason('');
                }}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-black-700 transition-colors hover:bg-canvas"
              >
                Tutup
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={cancelling}
                className="rounded-lg bg-error-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-error-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {cancelling ? 'Membatalkan...' : 'Batalkan Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmComplete && (
        <div className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-black/50 p-4" onClick={closeCompleteModal}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-black-900">Selesaikan Order</h2>
              <button onClick={closeCompleteModal} className="rounded-lg p-1 transition-colors hover:bg-canvas" aria-label="Tutup">
                <CloseIcon />
              </button>
            </div>
            <div className="flex gap-6 p-6">
              <div className="flex-1 space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between rounded-lg bg-canvas p-2.5">
                    <span className="text-black-400">Kode</span>
                    <span className="font-mono font-semibold text-black-900">{confirmComplete?.kode_order}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-canvas p-2.5">
                    <span className="text-black-400">Customer</span>
                    <span className="font-medium text-black-900">{confirmComplete?.customer?.nama_lengkap}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-canvas p-2.5">
                    <span className="text-black-400">Kendaraan</span>
                    <span className="font-medium text-black-900">
                      {confirmComplete?.kendaraan?.nama_kendaraan} ({confirmComplete?.kendaraan?.plat_nomor})
                    </span>
                  </div>
                </div>

                {confirmComplete && (
                  <div className="space-y-3 rounded-xl border border-primary-100 bg-primary-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary-400">Rincian Biaya</p>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-black-900">Sewa Kendaraan</p>
                        <p className="text-xs text-black-400">
                          {confirmComplete.durasi_hari} hari × {formatRupiah(confirmComplete.harga_per_hari)}/hari
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold text-black-900">{formatRupiah(confirmComplete.durasi_hari * confirmComplete.harga_per_hari)}</p>
                    </div>
                    {confirmComplete.opsi_supir === 'dengan_supir' && completeSupirFee > 0 && (
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-black-900">Biaya Supir</p>
                          <p className="text-xs text-black-400">
                            {confirmComplete.supir?.nama ? `${confirmComplete.supir.nama} · ` : ''}Dengan supir · {confirmComplete.durasi_hari} hari × {formatRupiah(tarifSupirGlobal)}/hari
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold text-black-900">{formatRupiah(completeSupirFee)}</p>
                      </div>
                    )}
                    {confirmComplete.jam_overtime_saat_ini > 0 && (
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-error-600">Denda Overtime</p>
                          <p className="text-xs text-error-500">
                            {formatJam(confirmComplete.jam_overtime_saat_ini)} × {formatRupiah(overtimeRate)}/jam
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold text-error-600">{formatRupiah(confirmComplete.denda_overtime_saat_ini)}</p>
                      </div>
                    )}
                    {Number(completeKerusakanAmount || 0) > 0 && (
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-error-600">Biaya Kerusakan</p>
                          <p className="text-xs text-error-500">Dari inspeksi petugas (dapat dikoreksi)</p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold text-error-600">{formatRupiah(Number(completeKerusakanAmount || 0))}</p>
                      </div>
                    )}
                    <div className="flex items-center justify-between border-t border-primary-100 pt-2">
                      <span className="text-sm font-semibold text-black-900">Total</span>
                      <span className="text-lg font-bold text-primary-600">
                        {formatRupiah(
                          Number(confirmComplete.harga_total || 0) +
                            (confirmComplete.jam_overtime_saat_ini > 0
                              ? Number(confirmComplete.denda_overtime_saat_ini || 0)
                              : 0) +
                            Number(completeKerusakanAmount || 0)
                        )}
                      </span>
                    </div>
                  </div>
                )}

                {completeSisa > 0 && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-black-700">
                      Jumlah Dibayar Sekarang (Rp) <span className="text-error-500">*</span>
                    </label>
                    <p className="mb-1.5 text-xs text-black-400">Sisa tagihan termasuk denda: {formatRupiah(completeSisa)}</p>
                    <input
                      type="number"
                      min="0"
                      value={completePaymentAmount}
                      onChange={(e) => setCompletePaymentAmount(e.target.value)}
                      className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-black-900 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-sm font-medium text-black-700">
                    Waktu Pengembalian Aktual <span className="text-error-500">*</span>
                  </label>
                  <p className="mb-1.5 text-xs text-black-400">Kapan kendaraan benar-benar tiba (dipakai untuk hitung denda)</p>
                  <input
                    type="datetime-local"
                    value={completeReturnTime}
                    onChange={(e) => setCompleteReturnTime(e.target.value)}
                    className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-black-900 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-black-700">Biaya Kerusakan (Rp)</label>
                  <p className="mb-1.5 text-xs text-black-400">Isi jika ada kerusakan. Kosongkan / 0 untuk memaafkan biaya kerusakan (mengabaikan estimasi inspeksi petugas).</p>
                  <input
                    type="number"
                    min="0"
                    value={completeKerusakanAmount}
                    onChange={(e) => setCompleteKerusakanAmount(e.target.value)}
                    className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-black-900 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                  />
                </div>

                {completeInspeksiLoading ? (
                  <div className="flex items-start gap-2 rounded-lg border border-gray-200 bg-canvas px-4 py-3 text-sm text-black-500">
                    <span>Memeriksa inspeksi return…</span>
                  </div>
                ) : !completeReturnInspeksi ? (
                  <div className="flex items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    <span className="flex min-w-0 items-start gap-2">
                      <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M4.93 19h14.14a1 1 0 00.87-1.5L12.87 4.5a1 1 0 00-1.74 0L4.06 17.5A1 1 0 004.93 19z" /></svg>
                      <span>
                        Order dikunci: operator belum mencatat <strong>Inspeksi Return</strong> yang bertanda tangan customer &amp; petugas. Selesaikan Order baru bisa dilakukan setelah task <em>Return</em> di Dashboard Operator selesai.
                      </span>
                    </span>
                    <button
                      onClick={() => cekInspeksiReturn(confirmComplete)}
                      disabled={completeInspeksiLoading}
                      className="shrink-0 self-center rounded-md bg-amber-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
                    >
                      Periksa ulang
                    </button>
                  </div>
                ) : null}

                <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
                  <button
                    onClick={closeCompleteModal}
                    className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-black-700 transition-colors hover:bg-canvas"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleCompleteOrder}
                    disabled={submitting || completeInspeksiLoading || !completeReturnInspeksi}
                    className="flex items-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-600 disabled:opacity-50"
                  >
                    {submitting && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                    Ya, Selesaikan
                  </button>
                </div>
              </div>

              <div className="w-72 shrink-0 space-y-4">
                {confirmComplete &&
                  (confirmComplete.status_pembayaran !== 'paid' || confirmComplete.jam_overtime_saat_ini > 0) && (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-black-700">
                        Bukti Pembayaran <span className="text-error-500">*</span>
                      </label>
                      {completePaymentFile && (
                        <ImagePreview
                          src={completePaymentPreview}
                          onRemove={() => {
                            if (completePaymentPreview) URL.revokeObjectURL(completePaymentPreview);
                            setCompletePaymentFile(null);
                            setCompletePaymentPreview(null);
                          }}
                        />
                      )}
                      <UploadBox
                        label="Upload bukti pembayaran"
                        hint="Bukti transfer / pembayaran, JPG/PNG, maks 2MB"
                        fileName={completePaymentFile?.name}
                        icon={
                          <svg className="h-5 w-5 text-black-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        }
                        onFile={(f) => {
                          if (!f) return;
                          if (completePaymentPreview) URL.revokeObjectURL(completePaymentPreview);
                          setCompletePaymentFile(f);
                          setCompletePaymentPreview(URL.createObjectURL(f));
                        }}
                      />
                    </div>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order List — Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <div className="col-span-full rounded-2xl bg-white p-12 text-center shadow-sm ring-1 ring-black-200">
            <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
            <p className="text-sm text-black-400">Memuat data...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="col-span-full rounded-2xl bg-white p-12 text-center shadow-sm ring-1 ring-black-200">
            <svg className="mx-auto mb-3 h-12 w-12 text-black-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <p className="font-medium text-black-700">Tidak ada data order</p>
            <p className="mt-1 text-sm text-black-400">Mulai dengan membuat order baru</p>
          </div>
        ) : (
          <div className="col-span-full space-y-8">
            {groupedItems.map((group) => (
              <section key={group.key} className="space-y-4" aria-label={group.label}>
                <div className="sticky top-2 z-10 flex items-center gap-2 rounded-xl border border-black-200 bg-white/90 px-4 py-2.5 shadow-sm backdrop-blur">
                  <span className="font-display text-sm font-bold text-black-900">{group.label}</span>
                  <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-600">{group.list.length} order</span>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {group.list.map((item) => {
                    const isAktif = item.status_order === 'active';
            const isPerluVerifikasi = item.status_order === 'perlu_verifikasi';
            const isTerlambat = isAktif && item.jam_overtime_saat_ini > 0;
            const isSelesai = item.status_order === 'completed';
            const borderColor = isTerlambat ? 'border-t-error-500' : orderCardBorderColor[item.status_order];
            const canDelete =
              item.status_order === 'pending' ||
              (item.status_order === 'confirmed' && !item.operator_id && !item.pembayarans?.length && !item.garasi_requests?.length);

            return (
              <div
                key={item.id}
                className={`group flex flex-col overflow-hidden rounded-2xl border border-gray-200 border-t-4 ${borderColor} bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg`}
              >
                {/* ── Header: kode + status badge + menu ── */}
                <div className="flex items-start justify-between px-4 pt-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-black-900">{item.kode_order}</span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          isTerlambat ? OVERDUE_BADGE : statusOrderColors[item.status_order]
                        }`}
                      >
                        {isTerlambat ? 'Terlambat' : statusOrderLabels[item.status_order]}
                      </span>
                    </div>
                    {(isAktif || item.source === 'katalog') && (
                      <div className="mt-1 flex items-center gap-1.5">
                        {isAktif && (
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${isTerlambat ? 'bg-error-500' : orderStatusDotColor[item.status_order]} animate-pulse`} />
                        )}
                        {item.source === 'katalog' && (
                          <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-semibold text-primary-600">Katalog</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => setDetailOrder(item)} className="rounded-lg p-1.5 text-black-400 transition-colors hover:bg-canvas hover:text-black-700" title="Lihat detail" aria-label="Lihat detail"><EyeIcon /></button>
                    {canManage && (
                      <>
                        <button onClick={() => openEditModal(item)} className="rounded-lg p-1.5 text-black-400 transition-colors hover:bg-primary-50 hover:text-primary-600" title="Edit order" aria-label="Edit order"><PencilIcon /></button>
                        {canDelete && (
                          <button onClick={() => setConfirmDelete(item)} className="rounded-lg p-1.5 text-black-400 transition-colors hover:bg-error-50 hover:text-error-600" title="Hapus permanen" aria-label="Hapus permanen"><TrashIcon /></button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* ── Body ── */}
                <div className="flex flex-1 flex-col gap-3 p-4 pt-3">
                  {/* ── Stepper status ── */}
                  {item.status_order !== 'cancelled' ? (
                    <div className="flex items-center gap-1.5">
                      {['Dikonfirmasi', 'Disewa', 'Selesai'].map((label, i) => {
                        const stepIndex =
                          item.status_order === 'pending' ? 0
                          : item.status_order === 'confirmed' ? 1
                          : item.status_order === 'active' || item.status_order === 'perlu_verifikasi' ? 2
                          : 3;
                        const done = i < stepIndex;
                        const stepColor = done ? 'bg-primary-500' : 'bg-black-200';
                        const textColor = done ? 'text-primary-600' : 'text-black-400';
                        return (
                          <div key={label} className="flex min-w-0 flex-1 items-center gap-1.5">
                            <span className={`h-2 w-2 shrink-0 rounded-full ${i === 1 && isPerluVerifikasi ? 'bg-accent-500' : stepColor} ${isPerluVerifikasi && i === 1 ? 'animate-pulse' : ''}`} />
                            <span className={`truncate text-[10px] font-medium ${i === 1 && isPerluVerifikasi ? 'text-accent-700' : textColor}`}>{label}</span>
                            {i < 2 && <span className={`h-px flex-1 ${i + 1 < stepIndex ? 'bg-primary-300' : 'bg-black-200'}`} />}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-error-500" />
                      <span className="text-[10px] font-medium text-error-600">Order dibatalkan</span>
                    </div>
                  )}

                  {/* ── Inspeksi status banner ── */}
                  {item.status_order === 'confirmed' && item.operator_id && (
                    <div className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                      item.pickup_draft_count > 0
                        ? 'border-blue-200 bg-blue-50 text-blue-700'
                        : 'border-amber-200 bg-amber-50 text-amber-700'
                    }`}>
                      <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${
                        item.pickup_draft_count > 0 ? 'bg-blue-500 animate-pulse' : 'bg-amber-500'
                      }`} />
                      {item.pickup_draft_count > 0
                        ? `Sedang diinspeksi oleh ${item.operator?.name ?? 'petugas'}`
                        : `Menunggu inspeksi oleh ${item.operator?.name ?? 'petugas'}`
                      }
                    </div>
                  )}

                  {/* CUSTOMER */}
                  <div>
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-black-300">Customer</p>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-600">
                          {item.customer?.nama_lengkap?.charAt(0)?.toLowerCase() || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-black-900">{item.customer?.nama_lengkap}</p>
                          <p className="truncate text-xs text-black-400">{formatHpDisplay(item.customer?.no_hp)}</p>
                        </div>
                      </div>
                      {item.customer?.no_hp && (
                        <a
                          href={`tel:${item.customer.no_hp}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-black-300 transition-colors hover:bg-primary-50 hover:text-primary-600"
                          aria-label="Telepon customer"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* KENDARAAN */}
                  <div>
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-black-300">Kendaraan</p>
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black-50 text-black-400">
                        {item.kendaraan?.foto ? (
                          <img src={`/storage/${item.kendaraan.foto}`} alt="" className="h-8 w-8 rounded-lg object-cover" />
                        ) : (
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 17h.01M16 17h.01M3 11l1.5-5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.4L21 11M3 11h18" /></svg>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-black-900">{item.kendaraan?.nama_kendaraan}</p>
                        <p className="truncate font-mono text-xs text-black-400">{item.kendaraan?.plat_nomor}</p>
                      </div>
                    </div>
                  </div>

                  {/* PERIODE / TOTAL */}
                  <div className="border-t border-gray-100 pt-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-black-300">Periode</p>
                        <div className="flex items-center gap-1.5 text-xs text-black-600">
                          <svg className="h-3.5 w-3.5 shrink-0 text-black-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          <span>{fmtDate(item.tanggal_mulai)} {fmtTime(item.jam_mulai)}</span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 pl-5 text-xs text-black-600">
                          <span className="text-black-300">→</span>
                          <span>{fmtDate(item.tanggal_selesai)} {fmtTime(item.jam_selesai)}</span>
                        </div>
                        <p className="mt-1 pl-5 text-[11px] text-black-400">{item.durasi_hari} hari</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-black-300">Total</p>
                        <p className="text-sm font-bold text-black-900">
                          {formatRupiah(
                            Number(item.harga_total) +
                              ((isAktif && item.jam_overtime_saat_ini > 0 && !item.jam_overtime) || isPerluVerifikasi
                                ? Number(item.denda_overtime_saat_ini)
                                : 0)
                          )}
                        </p>
                        <p className="text-[11px] text-black-400">{formatRupiah(item.harga_per_hari)}/hari</p>
                      </div>
                    </div>
                  </div>

                  {/* LOKASI */}
                  {(item.alamat_jemput || item.tujuan) && (
                    <div className="flex items-center gap-1.5 rounded-lg border border-black-200 bg-canvas px-3 py-2 text-xs text-black-600">
                      <svg className="h-3.5 w-3.5 shrink-0 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      {item.metode_penyerahan === 'antar' ? (
                        <>
                          <span className="font-medium text-accent-600">{item.alamat_jemput || 'Diantar'}</span>
                          {item.tujuan && <span className="text-black-300">→</span>}
                          {item.tujuan && <span className="truncate">{item.tujuan}</span>}
                        </>
                      ) : (
                        <>
                          <span className="truncate">{item.alamat_jemput || item.tujuan}</span>
                          {item.alamat_jemput && item.tujuan && (
                            <>
                              <span className="text-black-300">→</span>
                              <span className="truncate">{item.tujuan}</span>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* Overtime warning */}
                  {isTerlambat && (
                    <div className="rounded-lg border border-error-500/30 bg-error-50 px-3 py-1.5 text-xs font-medium text-error-600">
                      Terlambat {formatJam(item.jam_overtime_saat_ini)} — {formatRupiah(item.denda_overtime_saat_ini)}
                    </div>
                  )}
                  {isPerluVerifikasi && (
                    <div className="rounded-lg border border-accent-500/30 bg-accent-50 px-3 py-1.5 text-xs font-medium text-accent-700">
                      Denda difreeze: {formatJam(item.jam_overtime_saat_ini)} — {formatRupiah(item.denda_overtime_saat_ini)}
                    </div>
                  )}
                  {isSelesai && item.jam_overtime > 0 && (
                    <div className="rounded-lg border border-accent-100 bg-accent-50 px-3 py-1.5 text-xs font-medium text-accent-600">
                      Terlambat {formatJam(item.jam_overtime)} — {formatRupiah(item.denda_overtime)}
                    </div>
                  )}

                  {/* Bayar / Pengiriman */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-gray-100 pt-3 text-xs">
                    <span className="text-black-400">
                      Bayar:{' '}
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusPembayaranColors[item.status_pembayaran]}`}>
                        {statusPembayaranLabels[item.status_pembayaran]}
                      </span>
                    </span>
                    <span className="text-black-400">
                      Pengiriman:{' '}
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusPengirimanColors[item.status_pengiriman]}`}>
                        {statusPengirimanLabels[item.status_pengiriman]}
                      </span>
                    </span>
                  </div>

                  {/* Actions */}
                  {canManage && item.status_order !== 'cancelled' && (
                    <div className="mt-auto flex flex-wrap gap-2 pt-1">
                        {isAktif && (
                          <>
                            <button onClick={() => openCompleteModal(item)} className="flex-1 rounded-lg bg-accent-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-500">Selesai</button>
                            <button onClick={() => setCancelOrder(item)} title="Batalkan order" className="flex-1 rounded-lg border border-error-200 bg-white px-3 py-1.5 text-xs font-medium text-error-600 transition-colors hover:bg-error-50">Batal</button>
                          </>
                        )}
                        {isSelesai && (
                          <button
                            disabled
                            title="Order sudah selesai"
                            className="flex flex-1 cursor-not-allowed items-center justify-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-black-400"
                          >
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            Selesai
                          </button>
                        )}
                        {isPerluVerifikasi && (
                          <>
                            <button onClick={() => openCompleteModal(item)} className="flex-1 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-amber-600">Selesaikan</button>
                            <button
                              onClick={() => setConfirmAction({ title: 'Kembalikan ke Sedang Disewa', message: `Kembalikan order "${item.kode_order}" ke status Sedang Disewa? Denda freeze akan dihitung ulang.`, onConfirm: () => handleInlineUpdate(item.id, 'status_order', 'active') })}
                              className="flex-1 rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-50"
                            >
                              Kembalikan ke Sedang Disewa
                            </button>
                            <button onClick={() => setCancelOrder(item)} title="Batalkan order" className="flex-1 rounded-lg border border-error-200 bg-white px-3 py-1.5 text-xs font-medium text-error-600 transition-colors hover:bg-error-50">Batal</button>
                          </>
                        )}
                        {item.status_order === 'pending' && (
                          <>
                            <button onClick={() => openEditModal(item, { konfirmasi: true })} className="flex-1 rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-600">Konfirmasi</button>
                            <button onClick={() => setCancelOrder(item)} title="Batalkan order" className="flex-1 rounded-lg border border-error-200 bg-white px-3 py-1.5 text-xs font-medium text-error-600 transition-colors hover:bg-error-50">Batal</button>
                          </>
                        )}
                        {item.status_order === 'confirmed' && (
                          <button onClick={() => setCancelOrder(item)} title="Batalkan order" className="flex-1 rounded-lg border border-error-200 bg-white px-3 py-1.5 text-xs font-medium text-error-600 transition-colors hover:bg-error-50">Batal</button>
                        )}
                    </div>
                  )}
                </div>
              </div>
            );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {meta && meta.total > 0 && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-black-400">
            Menampilkan {items.length} dari {meta.total} order{dateFrom && dateTo ? ` · ${fmtPeriode(dateFrom)} s/d ${fmtPeriode(dateTo)}` : ''}
          </p>
          {meta.current_page < meta.last_page && items.length < 240 ? (
            <button
              onClick={() => load(meta.current_page + 1, true)}
              disabled={loading}
              className="rounded-lg border border-gray-200 px-4 py-1.5 text-sm font-medium text-black-700 transition-colors hover:bg-canvas disabled:opacity-40"
            >
              {loading ? 'Memuat...' : 'Muat Lebih'}
            </button>
          ) : items.length >= 240 ? (
            <p className="text-xs text-black-400">Maksimal 240 order ditampilkan sekaligus — gunakan filter periode.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
