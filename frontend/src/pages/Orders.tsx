import { useState, useEffect, useCallback, useRef, useMemo, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { isAxiosError } from 'axios';
import { orderAPI, customerAPI, kendaraanAPI, supirCaloAPI, settingsAPI, type Customer, type Kendaraan, type SupirCalo, type Order } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import ConfirmModal from '../components/ConfirmModal';
import { formatHpDisplay, todayJakarta } from '../lib/format';

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

type StatusOrder = 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';
type StatusPembayaran = 'unpaid' | 'partial' | 'paid';
type StatusPengiriman = 'belum_diambil' | 'sudah_diantarkan' | 'dalam_penyewaan' | 'selesai';
type MetodePembayaran = 'cash' | 'transfer' | 'qris' | 'lainnya';
type StatusFilter = '' | StatusOrder | 'overdue';

const statusPembayaranOptions: StatusPembayaran[] = ['unpaid', 'partial', 'paid'];

// Status pengiriman yang mewajibkan bukti foto kendaraan diunggah.
const statusPengirimanButuhBukti: StatusPengiriman[] = ['sudah_diantarkan', 'dalam_penyewaan'];

// Tarif denda keterlambatan per jam — diambil dari backend supaya
// selalu konsisten (single source of truth di OvertimeCalculator).
const DEFAULT_OVERTIME_RATE = 25000;

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

const metodePembayaranLabels: Record<MetodePembayaran, string> = {
  cash: 'Tunai',
  transfer: 'Transfer',
  qris: 'QRIS',
  lainnya: 'Lainnya',
};

// Badge status — dipetakan ke token tema (avail/rented/maint/ink + amber bawaan untuk "menunggu")
const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-rented-50 text-rented-500',
  active: 'bg-avail-50 text-avail-600',
  completed: 'bg-ink-200 text-ink-700',
  cancelled: 'bg-maint-50 text-maint-600',
  unpaid: 'bg-maint-50 text-maint-600',
  partial: 'bg-amber-100 text-amber-800',
  paid: 'bg-avail-50 text-avail-600',
  belum_diambil: 'bg-amber-100 text-amber-800',
  sudah_diantarkan: 'bg-rented-50 text-rented-500',
  dalam_penyewaan: 'bg-brand-100 text-brand-600',
  selesai: 'bg-ink-200 text-ink-700',
};

const formatJam = (jam: number): string => {
  const hari = Math.floor(jam / 24);
  const sisaJam = jam % 24;
  if (hari === 0) return `${sisaJam} jam`;
  if (sisaJam === 0) return `${hari} hari`;
  return `${hari} hari ${sisaJam} jam`;
};

const inputClass =
  'w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-900 outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500';

/* ─────────────────────────────────────────────────────────────
 * TYPES — ENTITAS (di-import dari api.ts sebagai single source of truth)
 * ───────────────────────────────────────────────────────────── */

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
  supir_id: string;
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
  status_order: 'pending',
  status_pembayaran: 'unpaid',
  status_pengiriman: 'belum_diambil',
  supir_id: '',
  calo_id: '',
  catatan: '',
};

const formatRupiah = (n: number | string | null | undefined) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;

const fmtDate = (d: string | null | undefined) => {
  if (!d) return '-';
  const s = typeof d === 'string' ? d.split('T')[0] : d;
  return s || '-';
};

const fmtTime = (t: string | null | undefined) => {
  if (!t) return '';
  return t.length > 5 ? t.substring(0, 5) : t;
};

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
    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ink-200 px-4 py-3 transition-colors hover:border-brand-400 hover:bg-brand-50/50">
      {icon}
      <div className="text-center">
        <p className="text-sm text-ink-700">{fileName || label}</p>
        <p className="text-xs text-ink-400">{hint}</p>
      </div>
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e: ChangeEvent<HTMLInputElement>) => onFile(e.target.files?.[0] ?? null)}
      />
    </label>
  );
}

function ImagePreview({ src, onRemove }: { src: string | null; onRemove?: () => void }) {
  if (!src) return null;
  return (
    <div className="relative mb-2 inline-block">
      <img src={src} alt="Preview" className="h-32 w-32 rounded-xl border border-ink-200 object-cover" />
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-maint-500 text-white transition-colors hover:bg-maint-600"
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
    <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-ink-200">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
        <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
        </svg>
      </div>
      <div>
        <p className="text-lg font-bold leading-tight text-ink-900">{value}</p>
        <p className="text-xs text-ink-400">{label}</p>
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
  { key: 'active', label: 'Aktif' },
  { key: 'overdue', label: 'Terlambat' },
  { key: 'completed', label: 'Selesai' },
  { key: 'cancelled', label: 'Dibatalkan' },
];

function StatusFilterTabs({
  active,
  onChange,
  overdueCount,
}: {
  active: StatusFilter;
  onChange: (v: StatusFilter) => void;
  overdueCount: number;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-xl bg-gray-50 p-1">
      {STATUS_TABS.map((tab) => (
        <button
          key={tab.key || 'semua'}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${
            active === tab.key ? 'bg-white text-brand-600 shadow-sm' : 'text-ink-400 hover:text-ink-700'
          }`}
        >
          {tab.label}
          {tab.key === 'overdue' && overdueCount > 0 && (
            <span className="rounded-full bg-maint-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">{overdueCount}</span>
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
  const [items, setItems] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [kendaraans, setKendaraans] = useState<Kendaraan[]>([]);
  const [allKendaraans, setAllKendaraans] = useState<Kendaraan[]>([]);
  const [supirs, setSupirs] = useState<SupirCalo[]>([]);
  const [calos, setCalos] = useState<SupirCalo[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [overtimeRate, setOvertimeRate] = useState(DEFAULT_OVERTIME_RATE);

  // ── Filter (disatukan) ────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [search, setSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [form, setForm] = useState<OrderForm>(emptyForm);
  const [kendaraanSearch, setKendaraanSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<Order | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmActionState | null>(null);
  const [confirmComplete, setConfirmComplete] = useState<Order | null>(null);
  const [completeFile, setCompleteFile] = useState<File | null>(null);
  const [completeFilePreview, setCompleteFilePreview] = useState<string | null>(null);
  const [completePaymentFile, setCompletePaymentFile] = useState<File | null>(null);
  const [completePaymentPreview, setCompletePaymentPreview] = useState<string | null>(null);
  const [completeReturnTime, setCompleteReturnTime] = useState(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  });
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);
  const [buktiBaruFile, setBuktiBaruFile] = useState<File | null>(null);
  const [buktiBaruPreview, setBuktiBaruPreview] = useState<string | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [isSewakan, setIsSewakan] = useState(false);
  const [isKonfirmasi, setIsKonfirmasi] = useState(false);
  const [editKendaraanSearch, setEditKendaraanSearch] = useState('');
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editForm, setEditForm] = useState<OrderEditForm>({});
  const [editBuktiFile, setEditBuktiFile] = useState<File | null>(null);
  const [editBuktiPreview, setEditBuktiPreview] = useState<string | null>(null);
  const [editBuktiNewPreview, setEditBuktiNewPreview] = useState<string | null>(null);
  const [editBuktiPengirimanFile, setEditBuktiPengirimanFile] = useState<File | null>(null);
  const [editBuktiPengirimanPreview, setEditBuktiPengirimanPreview] = useState<string | null>(null);
  const [editBuktiPengirimanNewPreview, setEditBuktiPengirimanNewPreview] = useState<string | null>(null);
  const [newPaymentAmount, setNewPaymentAmount] = useState<string>('');

  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [editCustomerSearch, setEditCustomerSearch] = useState('');
  const [showEditCustomerSuggestions, setShowEditCustomerSuggestions] = useState(false);
  const customerSearchRef = useRef<HTMLDivElement>(null);
  const editCustomerSearchRef = useRef<HTMLDivElement>(null);

  const [custFotoKtpFile, setCustFotoKtpFile] = useState<File | null>(null);
  const [custFotoKtpPreview, setCustFotoKtpPreview] = useState<string | null>(null);
  const [custFotoKtpDelete, setCustFotoKtpDelete] = useState(false);
  const [editCustFotoKtpFile, setEditCustFotoKtpFile] = useState<File | null>(null);
  const [editCustFotoKtpPreview, setEditCustFotoKtpPreview] = useState<string | null>(null);

  // Revoke semua blob preview URL saat komponen di-unmount, biar tidak numpuk di memori.
  useEffect(() => {
    return () => {
      if (buktiBaruPreview) URL.revokeObjectURL(buktiBaruPreview);
      if (editBuktiNewPreview) URL.revokeObjectURL(editBuktiNewPreview);
      if (editBuktiPengirimanNewPreview) URL.revokeObjectURL(editBuktiPengirimanNewPreview);
      if (completeFilePreview) URL.revokeObjectURL(completeFilePreview);
      if (custFotoKtpPreview) URL.revokeObjectURL(custFotoKtpPreview);
      if (editCustFotoKtpPreview) URL.revokeObjectURL(editCustFotoKtpPreview);
      if (completePaymentPreview) URL.revokeObjectURL(completePaymentPreview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ambil pengaturan dari backend (tarif denda overtime, dll.)
  useEffect(() => {
    settingsAPI.get().then(({ data }) => setOvertimeRate(data.overtime_rate_per_hour)).catch(() => {});
  }, []);

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
    return customers.filter((c) => c.nama_lengkap.toLowerCase().includes(q)).slice(0, 8);
  }, [customerSearch, customers]);

  const filteredEditCustomers = useMemo(() => {
    if (!editCustomerSearch) return [];
    const q = editCustomerSearch.toLowerCase();
    return customers.filter((c) => c.nama_lengkap.toLowerCase().includes(q)).slice(0, 8);
  }, [editCustomerSearch, customers]);


  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const load = useCallback(() => {
    setLoading(true);
    const params: Record<string, string> = { search: debouncedSearch };

    // 'overdue' bukan status asli di database — ambil order aktif dari API,
    // lalu saring lagi di client berdasarkan jam_overtime_saat_ini.
    if (statusFilter === 'overdue') {
      params.status_order = 'active';
    } else if (statusFilter) {
      params.status_order = statusFilter;
    }

    orderAPI
      .list(params)
      .then(({ data }: { data: ListResponse<Order> }) => {
        const result = statusFilter === 'overdue' ? data.data.filter((o) => o.jam_overtime_saat_ini > 0) : data.data;
        setItems(result);
      })
      .catch(() => toast.error('Gagal memuat data order'))
      .finally(() => setLoading(false));
  }, [debouncedSearch, statusFilter, toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    customerAPI
      .list()
      .then(({ data }: { data: ListResponse<Customer> }) => setCustomers(data.data))
      .catch(() => {});
    kendaraanAPI
      .list()
      .then(({ data }: { data: ListResponse<Kendaraan> }) => { setKendaraans(data.data); setAllKendaraans(data.data); })
      .catch(() => {});
    supirCaloAPI
      .list({ jenis: 'supir' })
      .then(({ data }: { data: ListResponse<SupirCalo> }) => setSupirs(data.data))
      .catch(() => {});
    supirCaloAPI
      .list({ jenis: 'calo' })
      .then(({ data }: { data: ListResponse<SupirCalo> }) => setCalos(data.data))
      .catch(() => {});
  }, []);

  // Ringkasan cepat dari data yang sedang ditampilkan (mengikuti filter aktif).
  const stats = useMemo(
    () => ({
      total: items.length,
      aktif: items.filter((i) => i.status_order === 'active').length,
      menunggu: items.filter((i) => i.status_order === 'pending').length,
      terlambat: items.filter((i) => i.status_order === 'active' && i.jam_overtime_saat_ini > 0).length,
    }),
    [items]
  );

  // Order yang sedang aktif TAPI sudah lewat batas waktu pengembalian.
  const overdueItems = useMemo(() => items.filter((i) => i.status_order === 'active' && i.jam_overtime_saat_ini > 0), [items]);
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
    if (!form.customer_id && !custFotoKtpFile) {
      toast.error('Dokumen identitas wajib diupload untuk customer baru');
      return;
    }
    const today = todayJakarta();
    if (form.tanggal_mulai < today) { toast.error('Tanggal mulai tidak boleh di masa lalu'); return; }
    if (form.tanggal_selesai < form.tanggal_mulai) { toast.error('Tanggal selesai harus setelah atau sama dengan tanggal mulai'); return; }
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
      // Order manual dengan data lengkap → langsung dikonfirmasi
      payload.status_order = 'confirmed';
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
      toast.success('Order berhasil ditambahkan');
      setForm(emptyForm);
      setCustomerSearch('');
      closeCreateModal();
      load();
      kendaraanAPI
        .list()
        .then(({ data }: { data: ListResponse<Kendaraan> }) => { setKendaraans(data.data); setAllKendaraans(data.data); })
        .catch(() => {});
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
    } catch (err) {
      const msg = isAxiosError(err) ? err.response?.data?.message : undefined;
      toast.error(msg || 'Gagal memperbarui order');
      load();
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
    const k = [...kendaraans, ...allKendaraans].find((x) => x.id === id);
    setForm((prev) => ({ ...prev, kendaraan_id: String(id), harga_per_hari: k?.harga_sewa_per_hari ? String(k.harga_sewa_per_hari) : '' }));
  };

  const durasiHari = (() => {
    if (form.tanggal_mulai && form.tanggal_selesai) {
      const mulai = new Date(`${form.tanggal_mulai}T00:00:00`);
      const selesai = new Date(`${form.tanggal_selesai}T00:00:00`);
      const diffMs = selesai.getTime() - mulai.getTime();
      const diff = Math.round(diffMs / (1000 * 60 * 60 * 24));
      return Math.max(diff, 1);
    }
    return 0;
  })();

  const selectedSupirCreate = form.supir_id ? supirs.find((s) => String(s.id) === String(form.supir_id)) : null;
  const supirTarifCreate = selectedSupirCreate ? Number(selectedSupirCreate.tarif_per_hari || 0) : 0;
  const hargaTotal = durasiHari * (Number(form.harga_per_hari) || 0) + supirTarifCreate * durasiHari;

  const isFormIncomplete = !form.customer_name.trim() || !form.customer_no_hp || !form.customer_no_sim || !form.customer_alamat.trim() || !form.kendaraan_id || !form.tanggal_mulai || !form.tanggal_selesai || !form.tujuan.trim() || (!form.customer_id && !custFotoKtpFile);

  /**
   * Buka modal edit. Dipakai baik untuk edit biasa (pensil) maupun aksi cepat
   * "Sewakan" (dulu 2 blok kode terpisah yang isinya nyaris identik).
   */
  const openEditModal = (item: Order, { sewakan = false, konfirmasi = false }: { sewakan?: boolean; konfirmasi?: boolean } = {}) => {
    setIsSewakan(sewakan);
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
      status_order: konfirmasi ? 'confirmed' : sewakan ? 'active' : item.status_order,
      status_pembayaran: item.status_pembayaran,
      metode_pembayaran: item.metode_pembayaran || 'cash',
      status_pengiriman: sewakan ? 'sudah_diantarkan' : item.status_pengiriman,
      supir_id: item.supir_id ? String(item.supir_id) : '',
      calo_id: item.calo_id ? String(item.calo_id) : '',
      alamat_jemput: item.alamat_jemput || '',
      tujuan: item.tujuan || '',
      catatan: item.catatan || '',
    });
    setEditBuktiFile(null);
    setEditBuktiPreview(item.bukti_transfer ? `/storage/${item.bukti_transfer}` : null);
    setEditBuktiNewPreview(null);
    setEditBuktiPengirimanFile(null);
    setEditBuktiPengirimanPreview(item.bukti_pengiriman ? `/storage/${item.bukti_pengiriman}` : null);
    setEditBuktiPengirimanNewPreview(null);
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
    if (editBuktiPengirimanNewPreview) URL.revokeObjectURL(editBuktiPengirimanNewPreview);
    setEditBuktiPengirimanFile(null);
    setEditBuktiPengirimanPreview(null);
    setEditBuktiPengirimanNewPreview(null);
    if (editCustFotoKtpPreview) URL.revokeObjectURL(editCustFotoKtpPreview);
    setEditCustFotoKtpFile(null);
    setEditCustFotoKtpPreview(null);
    setIsSewakan(false);
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
      const mulai = new Date(`${editForm.tanggal_mulai}T00:00:00`);
      const selesai = new Date(`${editForm.tanggal_selesai}T00:00:00`);
      const diffMs = selesai.getTime() - mulai.getTime();
      const diff = Math.round(diffMs / (1000 * 60 * 60 * 24));
      return Math.max(diff, 1);
    }
    return 0;
  })();

  const selectedSupirEdit = editForm.supir_id ? supirs.find((s) => String(s.id) === String(editForm.supir_id)) : null;
  const supirTarifEdit = selectedSupirEdit ? Number(selectedSupirEdit.tarif_per_hari || 0) : 0;
  const editTotal = editDurasi * editHargaPerHari + supirTarifEdit * editDurasi;

  // Order aktif: data inti terkunci, hanya status/pembayaran/catatan/bukti yang boleh diubah
  const isLockedOrder = (editingOrder?.status_order === 'active' || editingOrder?.status_order === 'completed' || editingOrder?.status_order === 'cancelled') && !isSewakan && !isKonfirmasi;
  const isFullyLocked = (editingOrder?.status_order === 'completed' || editingOrder?.status_order === 'cancelled') && !isSewakan && !isKonfirmasi;

  const handleEditKendaraanSelect = (id: number) => setEditForm((prev) => ({ ...prev, kendaraan_id: String(id) }));

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!isSewakan && !isKonfirmasi && !isLockedOrder) {
      if (!editForm.customer_name?.trim()) { toast.error('Nama customer wajib diisi'); return; }
      if (!editForm.customer_no_hp) { toast.error('No. HP wajib diisi'); return; }
      if (!editForm.customer_no_sim) { toast.error('No. Identitas (SIM) wajib diisi'); return; }
      if (!editForm.customer_alamat?.trim()) { toast.error('Alamat wajib diisi'); return; }
      if (!editForm.kendaraan_id) { toast.error('Pilih kendaraan terlebih dahulu'); return; }
      if (!editForm.tanggal_mulai) { toast.error('Tanggal mulai wajib diisi'); return; }
      if (!editForm.tanggal_selesai) { toast.error('Tanggal selesai wajib diisi'); return; }
      if (editForm.tanggal_selesai < editForm.tanggal_mulai) { toast.error('Tanggal selesai harus setelah atau sama dengan tanggal mulai'); return; }
      if (!editForm.tujuan?.trim()) { toast.error('Tujuan wajib diisi'); return; }
    }

    const butuhBuktiPengiriman = editForm.status_pengiriman
      ? statusPengirimanButuhBukti.includes(editForm.status_pengiriman as StatusPengiriman)
      : false;
    const sudahAdaBuktiPengiriman = editBuktiPengirimanFile || editBuktiPengirimanPreview;
    if (butuhBuktiPengiriman && !sudahAdaBuktiPengiriman) {
      toast.error('Bukti foto pengiriman wajib diunggah untuk status pengiriman ini');
      return;
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
      const clearableFields: (keyof OrderForm)[] = ['supir_id', 'calo_id', 'catatan'];

      const payload: Record<string, unknown> = {};
      Object.entries(editForm).forEach(([k, v]) => {
        if (k === 'status_order' && !isSewakan && !isKonfirmasi) return;
        if (v !== '' && v !== null && v !== undefined) {
          payload[k] = v;
        } else if (clearableFields.includes(k as keyof OrderForm)) {
          payload[k] = '';
        }
      });
      if (editForm.customer_name) {
        payload.customer_name = editForm.customer_name;
      }

      // Sertakan jumlah_bayar jika form pembayaran baru diisi
      if (newPaymentAmount && isLockedOrder && !isFullyLocked) {
        payload.jumlah_bayar = Number(newPaymentAmount);
      }

      let res;
      const hasFile = editBuktiFile || editBuktiPengirimanFile || editCustFotoKtpFile;
      if (hasFile) {
        const fd = new FormData();
        fd.append('_method', 'PUT');
        Object.entries(payload).forEach(([k, v]) => fd.append(k, String(v)));
        if (editBuktiFile) fd.append('bukti_transfer', editBuktiFile);
        if (editBuktiPengirimanFile) fd.append('bukti_pengiriman', editBuktiPengirimanFile);
        if (editCustFotoKtpFile) fd.append('customer_foto_ktp', editCustFotoKtpFile);
        res = await orderAPI.updateWithFile(editingOrder.id, fd);
      } else {
        res = await orderAPI.update(editingOrder.id, payload);
      }
      setItems((prev) => prev.map((item) => (item.id === editingOrder.id ? { ...item, ...res.data } : item)));
      toast.success('Order berhasil diperbarui');
      closeEditModal();
      load();
      kendaraanAPI
        .list()
        .then(({ data }: { data: ListResponse<Kendaraan> }) => { setKendaraans(data.data); setAllKendaraans(data.data); })
        .catch(() => {});
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
    if (!completeFile) {
      toast.error('Foto pengembalian wajib diunggah');
      return;
    }
    const needsPaymentProof =
      confirmComplete.status_pembayaran !== 'paid' || (confirmComplete.jam_overtime_saat_ini > 0 && !confirmComplete.jam_overtime);
    if (needsPaymentProof && !completePaymentFile) {
      toast.error('Bukti pembayaran wajib diunggah');
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('status_order', 'completed');
      fd.append('status_pengiriman', 'selesai');
      fd.append('status_pembayaran', 'paid');
      fd.append('bukti_pengembalian', completeFile);
      fd.append('tanggal_pengembalian_aktual', completeReturnTime.replace('T', ' ') + ':00');
      if (completePaymentFile) fd.append('bukti_transfer', completePaymentFile);
      fd.append('_method', 'PUT');
      await orderAPI.updateWithFile(confirmComplete.id, fd);
      toast.success('Order berhasil diselesaikan');
      closeCompleteModal();
      load();
      kendaraanAPI
        .list()
        .then(({ data }: { data: ListResponse<Kendaraan> }) => { setKendaraans(data.data); setAllKendaraans(data.data); })
        .catch(() => {});
    } catch (err) {
      const msg = isAxiosError(err) ? err.response?.data?.message : undefined;
      toast.error(msg || 'Gagal menyelesaikan order');
    } finally {
      setSubmitting(false);
    }
  };

  const closeCompleteModal = () => {
    setConfirmComplete(null);
    if (completeFilePreview) URL.revokeObjectURL(completeFilePreview);
    setCompleteFile(null);
    setCompleteFilePreview(null);
    if (completePaymentPreview) URL.revokeObjectURL(completePaymentPreview);
    setCompletePaymentFile(null);
    setCompletePaymentPreview(null);
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    setCompleteReturnTime(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`);
  };

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
      <div className="rounded-2xl bg-gradient-to-r from-ink-900 via-ink-800 to-brand-700 p-6 text-white shadow-sm sm:p-7">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <h1 className="font-display text-2xl font-bold">Orders</h1>
            <p className="mt-1 text-sm text-ink-200">Kelola pemesanan, pembayaran, dan status pengiriman kendaraan.</p>
          </div>
          <button
            onClick={() => {
              setForm(emptyForm);
              setShowForm(true);
            }}
            className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-brand-600 shadow-sm transition-colors hover:bg-ink-200"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Buat Order Baru
          </button>
        </div>
      </div>

      {overdueItems.length > 0 && !alertDismissed && (
        <div className="animate-fade-in rounded-2xl border border-maint-500/30 bg-maint-50 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-maint-500">
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
                <h3 className="text-sm font-semibold text-maint-600">{overdueItems.length} order terlambat dikembalikan</h3>
                <button
                  onClick={() => setAlertDismissed(true)}
                  className="shrink-0 rounded-lg p-1 text-maint-500 transition-colors hover:bg-maint-100 hover:text-maint-600"
                  title="Tutup"
                >
                  <CloseIcon className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2.5 space-y-1.5">
                {overdueItems.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg bg-white/70 px-3 py-2 text-xs">
                    <div className="min-w-0 truncate">
                      <span className="font-mono font-semibold text-maint-600">{item.kode_order}</span>
                      <span className="text-maint-600">
                        {' '}
                        — {item.customer?.nama_lengkap} · {item.kendaraan?.nama_kendaraan}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="whitespace-nowrap font-medium text-maint-600">
                        {formatJam(item.jam_overtime_saat_ini)} · {formatRupiah(item.denda_overtime_saat_ini)}
                      </span>
                      <button
                        onClick={() => setConfirmComplete(item)}
                        className="whitespace-nowrap rounded-md bg-maint-500 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-maint-600"
                      >
                        Selesaikan
                      </button>
                    </div>
                  </div>
                ))}
                {overdueItems.length > 5 && <p className="pl-1 text-xs text-maint-600">+{overdueItems.length - 5} order lainnya juga terlambat</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatChip
          label="Total Order"
          value={stats.total}
          iconBg="bg-brand-500"
          icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        />
        <StatChip label="Sedang Aktif" value={stats.aktif} iconBg="bg-avail-500" icon="M13 10V3L4 14h7v7l9-11h-7z" />
        <StatChip label="Menunggu" value={stats.menunggu} iconBg="bg-amber-500" icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        <StatChip
          label="Terlambat"
          value={stats.terlambat}
          iconBg="bg-maint-500"
          icon="M12 9v2m0 4h.01M4.93 19h14.14a1 1 0 00.87-1.5L12.87 4.5a1 1 0 00-1.74 0L4.06 17.5A1 1 0 004.93 19z"
        />
      </div>

      {/* ── Filter (disatukan) ── */}
      <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-ink-200">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <StatusFilterTabs active={statusFilter} onChange={setStatusFilter} overdueCount={stats.terlambat} />
      </div>

      {/* Create Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-black/50 p-4" onClick={closeCreateModal}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-ink-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-ink-900">Buat Order Baru</h2>
              <button onClick={closeCreateModal} className="rounded-lg p-1 transition-colors hover:bg-gray-50" aria-label="Tutup">
                <CloseIcon />
              </button>
            </div>

            {/* Step Indicator */}
            <div className="border-b border-ink-200 bg-gray-50 px-6 py-3">
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
                            ? 'bg-avail-500 text-white'
                            : createStep === s.step
                              ? 'bg-brand-500 text-white'
                              : 'bg-ink-200 text-ink-500'
                        }`}
                      >
                        {createStep > s.step ? (
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                        ) : (
                          s.step
                        )}
                      </div>
                      <span className={`hidden text-xs font-medium sm:inline ${createStep >= s.step ? 'text-ink-900' : 'text-ink-400'}`}>
                        {s.label}
                      </span>
                    </div>
                    {idx < 2 && (
                      <div className={`mx-3 h-px w-8 sm:w-16 ${createStep > s.step ? 'bg-avail-400' : 'bg-ink-200'}`} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              {/* Step 1: Data Customer */}
              {createStep === 1 && (
                <div>
                  <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    Data Customer
                  </h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-ink-700">Nama Customer *</label>
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
                      <div className="absolute z-20 mt-1 w-full rounded-lg border border-ink-200 bg-white py-1 shadow-lg">
                        {filteredCustomers.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setForm((prev) => ({ ...prev, customer_id: String(c.id), customer_name: c.nama_lengkap, customer_no_hp: c.no_hp, customer_email: c.email || '', customer_alamat: c.alamat || '', customer_no_ktp: c.no_ktp || '', customer_no_sim: c.no_sim || '' }));
                              setCustomerSearch('');
                              setShowCustomerSuggestions(false);
                            }}
                            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition hover:bg-gray-50"
                          >
                            <span className="font-medium text-ink-900">{c.nama_lengkap}</span>
                            <span className="text-xs text-ink-400">{formatHpDisplay(c.no_hp)}</span>
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
                      className="mt-1.5 inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700"
                    >
                      <CloseIcon className="h-3 w-3" /> Ganti customer
                    </button>
                  ) : form.customer_name ? (
                    <p className="mt-1.5 text-xs text-amber-600">Customer baru akan dibuat otomatis</p>
                  ) : null}
                </div>
                <div>
                      <label className="mb-1 block text-sm font-medium text-ink-700">No. HP *</label>
                      <input type="text" value={form.customer_no_hp} onChange={(e) => setField('customer_no_hp', e.target.value)} required className={inputClass} placeholder="08xxx" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-ink-700">No. KTP</label>
                      <input type="text" value={form.customer_no_ktp} onChange={(e) => setField('customer_no_ktp', e.target.value)} className={inputClass} placeholder="opsional" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-ink-700">No. SIM *</label>
                      <input type="text" value={form.customer_no_sim} onChange={(e) => setField('customer_no_sim', e.target.value)} required className={inputClass} placeholder="Wajib diisi" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-ink-700">Email</label>
                      <input type="email" value={form.customer_email} onChange={(e) => setField('customer_email', e.target.value)} className={inputClass} placeholder="opsional" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-medium text-ink-700">Alamat *</label>
                      <input type="text" value={form.customer_alamat} onChange={(e) => setField('customer_alamat', e.target.value)} required className={inputClass} placeholder="Wajib diisi" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-medium text-ink-700">Dokumen Identitas * <span className="font-normal text-ink-400">(wajib untuk customer baru)</span></label>
                      <p className="mb-2 text-xs text-ink-400">Upload salah satu: KTP, Paspor, atau SIM</p>
                      {custFotoKtpPreview && (
                        <div className="mb-2">
                          <img src={custFotoKtpPreview} alt="Dokumen Identitas" className="h-20 w-28 rounded-lg border border-ink-200 object-cover" />
                        </div>
                      )}
                      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-ink-200 px-3 py-6 text-center transition-colors hover:border-brand-400 hover:bg-brand-50/50">
                        <svg className="h-5 w-5 text-ink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <span className="text-xs text-ink-400">{custFotoKtpFile ? custFotoKtpFile.name : 'KTP / Paspor / SIM'}</span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0] ?? null; setCustFotoKtpFile(f); setCustFotoKtpPreview(f ? URL.createObjectURL(f) : null); }} />
                      </label>
                    </div>
              </div>
                </div>
              )}

              {/* Step 2: Pilih Kendaraan */}
              {createStep === 2 && (
                <div>
                <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17h.01M16 17h.01M3 11l1.5-5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.4L21 11M3 11h18M3 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-6" /></svg>
                  Pilih Kendaraan
                </h3>
                <label className="mb-1 block text-sm font-medium text-ink-700">Kendaraan *</label>
                {kendaraans.length === 0 ? (
                  <p className="text-sm italic text-ink-400">Tidak ada kendaraan tersedia</p>
                ) : (
                  <>
                    <div className="relative mb-2">
                      <svg
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
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
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700"
                          aria-label="Bersihkan pencarian"
                        >
                          <CloseIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    {filteredKendaraanCreate.length === 0 ? (
                      <p className="py-4 text-center text-sm italic text-ink-400">Tidak ada kendaraan yang cocok</p>
                    ) : (
                      <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                        {filteredKendaraanCreate.map((k) => {
                          const selected = form.kendaraan_id === String(k.id);
                          const available = isVehicleAvailable(k);
                          return (
                            <div
                              key={k.id}
                              onClick={() => available && handleKendaraanSelect(k.id)}
                              className={`w-44 shrink-0 rounded-xl border-2 transition-all ${
                                !available
                                  ? 'cursor-not-allowed border-ink-100 bg-gray-50 opacity-70'
                                  : selected
                                    ? 'cursor-pointer border-brand-500 bg-brand-50/50 ring-2 ring-brand-100'
                                    : 'cursor-pointer border-ink-200 hover:border-brand-300 hover:shadow-sm'
                              }`}
                            >
                              <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-t-[10px] bg-gray-50">
                                {k.foto ? (
                                  <img
                                    src={k.foto.startsWith('http') ? k.foto : `/storage/${k.foto}`}
                                    alt={k.nama_kendaraan}
                                    className={`h-full w-full object-cover ${!available ? 'grayscale blur-[1px]' : ''}`}
                                  />
                                ) : (
                                  <svg className={`h-10 w-10 text-ink-200 ${!available ? 'grayscale' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={1.5}
                                      d="M8 17h.01M16 17h.01M3 11l1.5-5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.4L21 11M3 11h18M3 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-6"
                                    />
                                  </svg>
                                )}
                                {!available && (
                                  <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-red-500/90 px-2.5 py-0.5 text-[10px] font-semibold text-white shadow">
                                    {k.status === 'maintenance' ? 'Maintenance' : 'Sedang Disewa'}
                                  </span>
                                )}
                              </div>
                              <div className="space-y-1 p-3">
                                <p className={`truncate text-sm font-semibold leading-tight ${!available ? 'text-ink-400' : 'text-ink-900'}`}>{k.nama_kendaraan}</p>
                                <p className="font-mono text-xs text-ink-400">{k.plat_nomor}</p>
                                <div className="flex items-center gap-1.5">
                                  <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-ink-200" style={{ backgroundColor: k.warna }} />
                                  <span className="truncate text-xs text-ink-400">{k.warna}</span>
                                </div>
                                <p className={`text-xs font-bold ${!available ? 'text-ink-300' : 'text-brand-600'}`}>{formatRupiah(k.harga_sewa_per_hari)}/hari</p>
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
                      <label className="mb-1 block text-sm font-medium text-ink-700">Supir</label>
                      <select value={form.supir_id} onChange={(e) => setField('supir_id', e.target.value)} className={inputClass}>
                        <option value="">Pilih Supir (opsional)</option>
                        {supirs
                          .filter((s) => s.status === 'active')
                          .map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.nama} — {formatHpDisplay(s.no_hp)}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-ink-700">Calo</label>
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
                <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  Jadwal & Pembayaran
                </h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">Tanggal Mulai *</label>
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
                  <label className="mb-1 block text-sm font-medium text-ink-700">Jam Mulai</label>
                  <input type="time" value={form.jam_mulai} onChange={(e) => setField('jam_mulai', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">Tanggal Selesai *</label>
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
                  <label className="mb-1 block text-sm font-medium text-ink-700">Jam Selesai</label>
                  <input type="time" value={form.jam_selesai} onChange={(e) => setField('jam_selesai', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">Harga/Hari (Rp)</label>
                  <input
                    type="number"
                    value={form.harga_per_hari}
                    readOnly
                    className="w-full cursor-not-allowed rounded-lg border border-ink-200 bg-gray-50 px-3 py-2 text-sm text-ink-400"
                  />
                  <p className="mt-0.5 text-xs text-ink-400">Otomatis dari harga kendaraan</p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">Metode Bayar</label>
                  <select value={form.metode_pembayaran} onChange={(e) => setField('metode_pembayaran', e.target.value as MetodePembayaran)} className={inputClass}>
                    {(Object.keys(metodePembayaranLabels) as MetodePembayaran[]).map((m) => (
                      <option key={m} value={m}>
                        {metodePembayaranLabels[m]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">Status Bayar</label>
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
                </div>
              </div>

              {form.tanggal_mulai && form.tanggal_selesai && form.harga_per_hari ? (
                <div className="space-y-3 rounded-xl border border-brand-100 bg-brand-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-brand-400">Rincian Biaya</p>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-ink-900">Sewa Kendaraan</p>
                      <p className="text-xs text-ink-400">
                        {durasiHari} hari × {formatRupiah(form.harga_per_hari)}/hari
                      </p>
                      <p className="mt-0.5 text-xs text-ink-400">
                        {form.tanggal_mulai} {form.jam_mulai || '08:00'} → {form.tanggal_selesai} {form.jam_selesai || '17:00'} WIB
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-ink-900">{formatRupiah(durasiHari * (Number(form.harga_per_hari) || 0))}</p>
                  </div>
                  {supirTarifCreate > 0 && (
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-ink-900">Biaya Supir</p>
                        <p className="text-xs text-ink-400">
                          {selectedSupirCreate?.nama} · {durasiHari} hari × {formatRupiah(supirTarifCreate)}/hari
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold text-ink-900">{formatRupiah(supirTarifCreate * durasiHari)}</p>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t border-brand-100 pt-2">
                    <span className="text-sm font-semibold text-ink-900">Total</span>
                    <span className="text-lg font-bold text-brand-600">{formatRupiah(hargaTotal)}</span>
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">Alamat Jemput</label>
                  <input type="text" value={form.alamat_jemput} onChange={(e) => setField('alamat_jemput', e.target.value)} className={inputClass} placeholder="Lokasi pengambilan kendaraan" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">Tujuan *</label>
                  <input type="text" value={form.tujuan} onChange={(e) => setField('tujuan', e.target.value)} required className={inputClass} placeholder="Tujuan penggunaan kendaraan" />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-ink-700">Catatan</label>
                <textarea value={form.catatan} onChange={(e) => setField('catatan', e.target.value)} rows={2} className={`${inputClass} resize-none`} />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-ink-700">Bukti Pembayaran</label>
                <UploadBox
                  label="Klik atau seret bukti pembayaran ke sini"
                  hint="JPG, PNG, maks 2MB (opsional)"
                  fileName={buktiBaruFile?.name}
                  icon={
                    <svg className="h-6 w-6 text-ink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <div className="flex justify-between gap-3 border-t border-ink-200 pt-4">
                <div>
                  {createStep > 1 && (
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="flex items-center gap-2 rounded-lg border border-ink-200 px-4 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-gray-50"
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
                    className="rounded-lg border border-ink-200 px-4 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-gray-50"
                  >
                    Batal
                  </button>
                  {createStep < 3 ? (
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
                    >
                      Selanjutnya
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={submitting || isFormIncomplete}
                      className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
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
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-ink-200 bg-white p-6">
              <div>
                <h2 className="text-lg font-semibold text-ink-900">{isKonfirmasi ? 'Konfirmasi Order' : isSewakan ? 'Kirim Kendaraan' : 'Edit Order'}</h2>
                <p className="font-mono text-sm text-ink-400">{editingOrder.kode_order}</p>
              </div>
              <button onClick={closeEditModal} className="rounded-lg p-1 transition-colors hover:bg-gray-50" aria-label="Tutup">
                <CloseIcon />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-5 p-6">
              {isLockedOrder && (
                <div className={`flex items-start gap-2 rounded-lg px-4 py-3 text-sm ${isFullyLocked ? 'border border-ink-200 bg-ink-50 text-ink-600' : 'border border-amber-200 bg-amber-50 text-amber-800'}`}>
                  <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M4.93 19h14.14a1 1 0 00.87-1.5L12.87 4.5a1 1 0 00-1.74 0L4.06 17.5A1 1 0 004.93 19z" /></svg>
                  <span>{isFullyLocked ? 'Order sudah final. Semua data bersifat read-only.' : 'Order aktif — data inti (customer, kendaraan, tanggal, harga) tidak bisa diubah. Hanya status pembayaran, metode bayar, bukti pembayaran, dan catatan yang bisa diperbarui.'}</span>
                </div>
              )}
              {isSewakan && (
                <div className="space-y-4 rounded-xl border border-ink-100 bg-ink-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Ringkasan Pesanan</p>
                  <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                    <div>
                      <span className="text-ink-400">Customer</span>
                      <p className="font-medium text-ink-900">{editingOrder.customer?.nama_lengkap || '-'}</p>
                    </div>
                    <div>
                      <span className="text-ink-400">No. HP</span>
                      <p className="font-medium text-ink-900">{formatHpDisplay(editingOrder.customer?.no_hp) || '-'}</p>
                    </div>
                    <div>
                      <span className="text-ink-400">Kendaraan</span>
                      <p className="font-medium text-ink-900">{editingOrder.kendaraan?.nama_kendaraan || '-'}</p>
                    </div>
                    <div>
                      <span className="text-ink-400">Plat Nomor</span>
                      <p className="font-medium font-mono text-ink-900">{editingOrder.kendaraan?.plat_nomor || '-'}</p>
                    </div>
                    <div>
                      <span className="text-ink-400">Tanggal Mulai</span>
                      <p className="font-medium text-ink-900">{editingOrder.tanggal_mulai} {editingOrder.jam_mulai || '08:00'}</p>
                    </div>
                    <div>
                      <span className="text-ink-400">Tanggal Selesai</span>
                      <p className="font-medium text-ink-900">{editingOrder.tanggal_selesai} {editingOrder.jam_selesai || '17:00'}</p>
                    </div>
                  </div>
                </div>
              )}
              {!isSewakan && isLockedOrder && (
                <div className="space-y-5">
                  <div className="space-y-3 rounded-xl border border-ink-100 bg-ink-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Data Customer</p>
                    <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                      <div><span className="text-ink-400">Nama</span><p className="font-medium text-ink-900">{editingOrder.customer?.nama_lengkap || '-'}</p></div>
                      <div><span className="text-ink-400">No. HP</span><p className="font-medium text-ink-900">{formatHpDisplay(editingOrder.customer?.no_hp) || '-'}</p></div>
                      {editingOrder.customer?.no_ktp && <div><span className="text-ink-400">No. KTP</span><p className="font-mono text-ink-900">{editingOrder.customer.no_ktp}</p></div>}
                      {editingOrder.customer?.no_sim && <div><span className="text-ink-400">No. SIM</span><p className="font-mono text-ink-900">{editingOrder.customer.no_sim}</p></div>}
                      {editingOrder.customer?.email && <div><span className="text-ink-400">Email</span><p className="text-ink-900">{editingOrder.customer.email}</p></div>}
                      {editingOrder.customer?.alamat && <div className="md:col-span-2"><span className="text-ink-400">Alamat</span><p className="text-ink-900">{editingOrder.customer.alamat}</p></div>}
                    </div>
                  </div>
                  <div className="space-y-3 rounded-xl border border-ink-100 bg-ink-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Kendaraan</p>
                    <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                      <div><span className="text-ink-400">Kendaraan</span><p className="font-medium text-ink-900">{editingOrder.kendaraan?.nama_kendaraan || '-'}</p></div>
                      <div><span className="text-ink-400">Plat Nomor</span><p className="font-mono text-ink-900">{editingOrder.kendaraan?.plat_nomor || '-'}</p></div>
                    </div>
                  </div>
                  <div className="space-y-3 rounded-xl border border-ink-100 bg-ink-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Jadwal & Lokasi</p>
                    <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                      <div><span className="text-ink-400">Tanggal Mulai</span><p className="font-medium text-ink-900">{editingOrder.tanggal_mulai} {editingOrder.jam_mulai || '08:00'} WIB</p></div>
                      <div><span className="text-ink-400">Tanggal Selesai</span><p className="font-medium text-ink-900">{editingOrder.tanggal_selesai} {editingOrder.jam_selesai || '17:00'} WIB</p></div>
                      {editingOrder.alamat_jemput && <div className="md:col-span-2"><span className="text-ink-400">Alamat Jemput</span><p className="text-ink-900">{editingOrder.alamat_jemput}</p></div>}
                      {editingOrder.tujuan && <div className="md:col-span-2"><span className="text-ink-400">Tujuan</span><p className="text-ink-900">{editingOrder.tujuan}</p></div>}
                    </div>
                    {(editingOrder.supir || editingOrder.calo) && (
                      <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                        {editingOrder.supir && <div><span className="text-ink-400">Supir</span><p className="font-medium text-ink-900">{editingOrder.supir.nama} · {formatHpDisplay(editingOrder.supir.no_hp)}</p></div>}
                        {editingOrder.calo && <div><span className="text-ink-400">Calo</span><p className="font-medium text-ink-900">{editingOrder.calo.nama} · {formatHpDisplay(editingOrder.calo.no_hp)}</p></div>}
                      </div>
                    )}
                  </div>
                  {isFullyLocked ? (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-ink-700">Status Pembayaran</label>
                        <p className={`${inputClass} border-ink-200 bg-ink-50`}>{statusPembayaranLabels[editingOrder.status_pembayaran] || '-'}</p>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-ink-700">Metode Bayar</label>
                        <p className={`${inputClass} border-ink-200 bg-ink-50`}>{editingOrder.metode_pembayaran ? metodePembayaranLabels[editingOrder.metode_pembayaran as MetodePembayaran] || editingOrder.metode_pembayaran : '-'}</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {/* ── Riwayat Pembayaran (locked orders) ── */}
              {!isSewakan && isLockedOrder && editingOrder.pembayarans && editingOrder.pembayarans.length > 0 && (
                <div className="space-y-3 rounded-xl border border-ink-100 bg-ink-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Riwayat Pembayaran</p>
                  <div className="space-y-3">
                    {editingOrder.pembayarans.map((p) => (
                      <div key={p.id} className="flex items-start gap-3 rounded-lg border border-ink-200 bg-white p-3">
                        <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${p.status === 'pelunasan' ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                          {p.status === 'pelunasan' ? 'L' : 'D'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                            <span className="font-semibold text-ink-900">{p.status === 'pelunasan' ? 'Pelunasan' : 'DP'}</span>
                            <span className="text-ink-400">·</span>
                            <span className="text-ink-600">{metodePembayaranLabels[p.metode_pembayaran] || p.metode_pembayaran}</span>
                            <span className="text-ink-400">·</span>
                            <span className="font-medium text-ink-900">Rp {Number(p.jumlah).toLocaleString('id-ID')}</span>
                          </div>
                          <p className="mt-0.5 text-xs text-ink-400">{new Date(p.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                          {p.catatan && <p className="mt-1 text-xs text-ink-500 italic">{p.catatan}</p>}
                        </div>
                        {p.bukti_transfer && (
                          <img src={`/storage/${p.bukti_transfer}`} alt="Bukti" className="h-12 w-16 shrink-0 rounded border border-ink-200 object-cover" />
                        )}
                      </div>
                    ))}
                  </div>
                  {editingOrder && (() => {
                    const totalPaid = editingOrder.pembayarans!.reduce((sum, p) => sum + Number(p.jumlah), 0);
                    const sisa = Number(editingOrder.harga_total) - totalPaid;
                    return (
                      <div className="mt-2 border-t border-ink-200 pt-2">
                        <div className="flex items-center justify-between text-xs text-ink-500">
                          <span>Total dibayar</span>
                          <span className="font-semibold text-ink-800">Rp {totalPaid.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-ink-500">
                          <span>Harga total</span>
                          <span>Rp {Number(editingOrder.harga_total).toLocaleString('id-ID')}</span>
                        </div>
                        {sisa > 0 && (
                          <div className="flex items-center justify-between text-xs font-medium text-maint-600">
                            <span>Sisa bayar</span>
                            <span>Rp {sisa.toLocaleString('id-ID')}</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* ── Form Pembayaran Baru (active orders only, hide when paid) ── */}
              {!isSewakan && !isKonfirmasi && isLockedOrder && !isFullyLocked && editingOrder?.status_pembayaran !== 'paid' && (
                <div className="space-y-3 rounded-xl border border-brand-200 bg-brand-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">Catat Pembayaran Baru</p>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-ink-700">Status Pembayaran</label>
                      <select value={editForm.status_pembayaran || 'partial'} onChange={(e) => setEditField('status_pembayaran', e.target.value as StatusPembayaran)} className={inputClass}>
                        {statusPembayaranOptions.filter((s) => s !== 'unpaid').map((s) => (<option key={s} value={s}>{statusPembayaranLabels[s]}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-ink-700">Metode Bayar</label>
                      <select value={editForm.metode_pembayaran || 'transfer'} onChange={(e) => setEditField('metode_pembayaran', e.target.value as MetodePembayaran)} className={inputClass}>
                        {(Object.keys(metodePembayaranLabels) as MetodePembayaran[]).map((m) => (<option key={m} value={m}>{metodePembayaranLabels[m]}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-ink-700">Jumlah Bayar (Rp)</label>
                      <input type="number" min="0" value={newPaymentAmount} onChange={(e) => setNewPaymentAmount(e.target.value)} className={inputClass} placeholder="0" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-ink-700">Bukti Pembayaran</label>
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
                        <svg className="h-5 w-5 text-ink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              {!isSewakan && !isLockedOrder && (<>
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  Data Customer
                </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-ink-700">Nama Customer *</label>
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
                      className={inputClass}
                    />
                    {showEditCustomerSuggestions && filteredEditCustomers.length > 0 && (
                      <div className="absolute z-20 mt-1 w-full rounded-lg border border-ink-200 bg-white py-1 shadow-lg">
                        {filteredEditCustomers.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setEditForm((prev) => ({ ...prev, customer_id: String(c.id), customer_name: c.nama_lengkap, customer_no_hp: c.no_hp, customer_email: c.email || '', customer_alamat: c.alamat || '', customer_no_ktp: c.no_ktp || '', customer_no_sim: c.no_sim || '' }));
                              setEditCustomerSearch('');
                              setShowEditCustomerSuggestions(false);
                            }}
                            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition hover:bg-gray-50"
                          >
                            <span className="font-medium text-ink-900">{c.nama_lengkap}</span>
                            <span className="text-xs text-ink-400">{formatHpDisplay(c.no_hp)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {editForm.customer_id ? (
                    <button
                      type="button"
                      onClick={() => setEditForm((prev) => ({ ...prev, customer_id: '', customer_name: '', customer_no_hp: '', customer_email: '', customer_alamat: '', customer_no_ktp: '', customer_no_sim: '' }))}
                      className="mt-1.5 inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700"
                    >
                      <CloseIcon className="h-3 w-3" /> Ganti customer
                    </button>
                  ) : editForm.customer_name ? (
                    <p className="mt-1.5 text-xs text-amber-600">Customer baru akan dibuat otomatis</p>
                  ) : null}
                </div>
                {(editForm.customer_id || editForm.customer_name) && (
                  <>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-ink-700">No. HP *</label>
                      <input type="text" value={editForm.customer_no_hp || ''} onChange={(e) => setEditField('customer_no_hp', e.target.value)} className={inputClass} placeholder="08xxx" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-ink-700">No. KTP</label>
                      <input type="text" value={editForm.customer_no_ktp || ''} onChange={(e) => setEditField('customer_no_ktp', e.target.value)} className={inputClass} placeholder="opsional" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-ink-700">No. SIM *</label>
                      <input type="text" value={editForm.customer_no_sim || ''} onChange={(e) => setEditField('customer_no_sim', e.target.value)} className={inputClass} placeholder="Wajib diisi" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-ink-700">Email</label>
                      <input type="email" value={editForm.customer_email || ''} onChange={(e) => setEditField('customer_email', e.target.value)} className={inputClass} placeholder="opsional" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-medium text-ink-700">Alamat *</label>
                      <input type="text" value={editForm.customer_alamat || ''} onChange={(e) => setEditField('customer_alamat', e.target.value)} className={inputClass} placeholder="Wajib diisi" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-medium text-ink-700">Dokumen Identitas</label>
                      {isSewakan || isKonfirmasi ? (
                        <div className="flex gap-3">
                          {editingOrder.customer?.foto_ktp ? (
                            <div>
                              <p className="mb-1 text-xs text-ink-400">Dokumen Identitas</p>
                              <img src={`/storage/${editingOrder.customer.foto_ktp}`} alt="Dokumen Identitas" className="h-20 w-28 rounded-lg border border-ink-200 object-cover" />
                            </div>
                          ) : (
                            <p className="text-xs italic text-ink-400">Dokumen tidak diunggah</p>
                          )}
                        </div>
                      ) : (
                        <>
                          {editCustFotoKtpPreview && (
                            <div className="mb-2">
                              <img src={editCustFotoKtpPreview} alt="Dokumen Identitas" className="h-20 w-28 rounded-lg border border-ink-200 object-cover" />
                            </div>
                          )}
                          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-ink-200 px-3 py-6 text-center transition-colors hover:border-brand-400 hover:bg-brand-50/50">
                            <svg className="h-5 w-5 text-ink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            <span className="text-xs text-ink-400">{editCustFotoKtpFile ? editCustFotoKtpFile.name : 'KTP / Paspor / SIM'}</span>
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0] ?? null; setEditCustFotoKtpFile(f); setEditCustFotoKtpPreview(f ? URL.createObjectURL(f) : null); }} />
                          </label>
                        </>
                      )}
                    </div>
                  </>
                )}
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">Supir</label>
                  <select value={editForm.supir_id || ''} onChange={(e) => setEditField('supir_id', e.target.value)} className={inputClass}>
                    <option value="">Pilih Supir (opsional)</option>
                    {supirs
                      .filter((s) => s.status === 'active')
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nama} — {formatHpDisplay(s.no_hp)}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">Calo</label>
                  <select value={editForm.calo_id || ''} onChange={(e) => setEditField('calo_id', e.target.value)} className={inputClass}>
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
                <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17h.01M16 17h.01M3 11l1.5-5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.4L21 11M3 11h18M3 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-6" /></svg>
                  Pilih Kendaraan
                </h3>
                <label className="mb-1 block text-sm font-medium text-ink-700">Kendaraan</label>
                <div className="relative mb-2">
                  <svg
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
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
                    placeholder="Cari nama, plat, atau warna..."
                    className={`${inputClass} pl-9`}
                  />
                  {editKendaraanSearch && (
                    <button
                      type="button"
                      onClick={() => setEditKendaraanSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700"
                      aria-label="Bersihkan pencarian"
                    >
                      <CloseIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {filteredKendaraanEdit.length === 0 ? (
                  <p className="py-4 text-center text-sm italic text-ink-400">Tidak ada kendaraan yang cocok</p>
                ) : (
                  <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                    {filteredKendaraanEdit.map((k) => {
                      const selected = editForm.kendaraan_id === String(k.id);
                      const isCurrentVehicle = editingOrder && k.id === editingOrder.kendaraan_id;
                      const available = isVehicleAvailable(k) || isCurrentVehicle;
                      return (
                        <div
                          key={k.id}
                          onClick={() => available && handleEditKendaraanSelect(k.id)}
                          className={`w-44 shrink-0 rounded-xl border-2 transition-all ${
                            !available
                              ? 'cursor-not-allowed border-ink-100 bg-gray-50 opacity-70'
                              : selected
                                ? 'cursor-pointer border-brand-500 bg-brand-50/50 ring-2 ring-brand-100'
                                : 'cursor-pointer border-ink-200 hover:border-brand-300 hover:shadow-sm'
                          }`}
                        >
                          <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-t-[10px] bg-gray-50">
                            {k.foto ? (
                              <img
                                src={k.foto.startsWith('http') ? k.foto : `/storage/${k.foto}`}
                                alt={k.nama_kendaraan}
                                className={`h-full w-full object-cover ${!available ? 'grayscale blur-[1px]' : ''}`}
                              />
                            ) : (
                              <svg className={`h-10 w-10 text-ink-200 ${!available ? 'grayscale' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1.5}
                                  d="M8 17h.01M16 17h.01M3 11l1.5-5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.4L21 11M3 11h18M3 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-6"
                                />
                              </svg>
                            )}
                            {!available && (
                              <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-red-500/90 px-2.5 py-0.5 text-[10px] font-semibold text-white shadow">
                                {k.status === 'maintenance' ? 'Maintenance' : 'Sedang Disewa'}
                              </span>
                            )}
                          </div>
                          <div className="space-y-1 p-3">
                            <p className={`truncate text-sm font-semibold leading-tight ${!available ? 'text-ink-400' : 'text-ink-900'}`}>{k.nama_kendaraan}</p>
                            <p className="font-mono text-xs text-ink-400">{k.plat_nomor}</p>
                            <div className="flex items-center gap-1.5">
                              <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-ink-200" style={{ backgroundColor: k.warna }} />
                              <span className="truncate text-xs text-ink-400">{k.warna}</span>
                            </div>
                            <p className={`text-xs font-bold ${!available ? 'text-ink-300' : 'text-brand-600'}`}>{formatRupiah(k.harga_sewa_per_hari)}/hari</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  Jadwal & Pembayaran
                </h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-ink-700">Tanggal Mulai</label>
                  <input
                    type="date"
                    value={editForm.tanggal_mulai || ''}
                    onChange={(e) => setEditField('tanggal_mulai', e.target.value)}
                    disabled={isLockedOrder}
                    required
                    className={`${inputClass} ${isLockedOrder ? 'cursor-not-allowed bg-gray-50 text-ink-400' : ''}`}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">Jam Mulai</label>
                  <input
                    type="time"
                    value={editForm.jam_mulai || '08:00'}
                    onChange={(e) => setEditField('jam_mulai', e.target.value)}
                    disabled={isLockedOrder}
                    className={`${inputClass} ${isLockedOrder ? 'cursor-not-allowed bg-gray-50 text-ink-400' : ''}`}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">Tanggal Selesai</label>
                  <input
                    type="date"
                    value={editForm.tanggal_selesai || ''}
                    onChange={(e) => setEditField('tanggal_selesai', e.target.value)}
                    disabled={isLockedOrder}
                    required
                    className={`${inputClass} ${isLockedOrder ? 'cursor-not-allowed bg-gray-50 text-ink-400' : ''}`}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">Jam Selesai</label>
                  <input
                    type="time"
                    value={editForm.jam_selesai || '17:00'}
                    onChange={(e) => setEditField('jam_selesai', e.target.value)}
                    disabled={isLockedOrder}
                    className={`${inputClass} ${isLockedOrder ? 'cursor-not-allowed bg-gray-50 text-ink-400' : ''}`}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">Harga/Hari (Rp)</label>
                  <input
                    type="number"
                    value={editHargaPerHari}
                    readOnly
                    className="w-full cursor-not-allowed rounded-lg border border-ink-200 bg-gray-50 px-3 py-2 text-sm text-ink-400"
                  />
                  <p className="mt-0.5 text-xs text-ink-400">Otomatis dari harga kendaraan</p>
                </div>
                {!isSewakan && !isKonfirmasi && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">Status Pembayaran</label>
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
                {!isSewakan && !isKonfirmasi && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">Metode Bayar</label>
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
                {!isSewakan && !isKonfirmasi && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">Status Pengiriman</label>
                  <select
                    value={editForm.status_pengiriman || ''}
                    onChange={(e) => setEditField('status_pengiriman', e.target.value as StatusPengiriman)}
                    className={inputClass}
                  >
                    {(Object.keys(statusPengirimanLabels) as StatusPengiriman[]).map((s) => (
                      <option key={s} value={s}>
                        {statusPengirimanLabels[s]}
                      </option>
                    ))}
                  </select>
                  {editForm.status_pengiriman && statusPengirimanButuhBukti.includes(editForm.status_pengiriman as StatusPengiriman) && (
                    <p className="mt-1 text-xs text-amber-600">Status ini wajib disertai bukti foto pengiriman di bawah.</p>
                  )}
                </div>
                )}
              </div>
              </div>
              </>)}

              {editForm.tanggal_mulai && editForm.tanggal_selesai && editHargaPerHari > 0 ? (
                <div className="space-y-3 rounded-xl border border-brand-100 bg-brand-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-brand-400">Rincian Biaya</p>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-ink-900">Sewa Kendaraan</p>
                      <p className="text-xs text-ink-400">
                        {editDurasi} hari × {formatRupiah(editHargaPerHari)}/hari
                      </p>
                      <p className="mt-0.5 text-xs text-ink-400">
                        {editForm.tanggal_mulai} {editForm.jam_mulai || '08:00'} → {editForm.tanggal_selesai} {editForm.jam_selesai || '17:00'} WIB
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-ink-900">{formatRupiah(editDurasi * editHargaPerHari)}</p>
                  </div>
                  {supirTarifEdit > 0 && (
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-ink-900">Biaya Supir</p>
                        <p className="text-xs text-ink-400">
                          {selectedSupirEdit?.nama} · {editDurasi} hari × {formatRupiah(supirTarifEdit)}/hari
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold text-ink-900">{formatRupiah(supirTarifEdit * editDurasi)}</p>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t border-brand-100 pt-2">
                    <span className="text-sm font-semibold text-ink-900">Total</span>
                    <span className="text-lg font-bold text-brand-600">{formatRupiah(editTotal)}</span>
                  </div>
                </div>
              ) : null}

              {!isLockedOrder && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">Alamat Jemput</label>
                  <input type="text" value={editForm.alamat_jemput || ''} onChange={(e) => setEditField('alamat_jemput', e.target.value)} className={inputClass} placeholder="Lokasi pengambilan kendaraan" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">Tujuan *</label>
                  <input type="text" value={editForm.tujuan || ''} onChange={(e) => setEditField('tujuan', e.target.value)} className={inputClass} placeholder="Tujuan penggunaan kendaraan" />
                </div>
              </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-ink-700">Catatan</label>
                {isFullyLocked ? (
                  <p className={`${inputClass} border-ink-200 bg-ink-50 whitespace-pre-wrap`}>{editForm.catatan || <span className="italic text-ink-400">Tidak ada catatan</span>}</p>
                ) : (
                  <textarea
                    value={editForm.catatan || ''}
                    onChange={(e) => setEditField('catatan', e.target.value)}
                    rows={2}
                    className={`${inputClass} resize-none`}
                  />
                )}
              </div>

              {!isSewakan && !isKonfirmasi && (isFullyLocked || !isLockedOrder) && (
              <div>
                <label className="mb-1 block text-sm font-medium text-ink-700">Bukti Pembayaran</label>
                {isFullyLocked ? (
                  editingOrder.bukti_transfer ? (
                    <img src={`/storage/${editingOrder.bukti_transfer}`} alt="Bukti Pembayaran" className="h-24 w-32 rounded-lg border border-ink-200 object-cover" />
                  ) : (
                    <p className="text-sm italic text-ink-400">Tidak ada bukti pembayaran</p>
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
                    <svg className="h-5 w-5 text-ink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

              {!isLockedOrder && (isSewakan || (editForm.status_pengiriman && statusPengirimanButuhBukti.includes(editForm.status_pengiriman as StatusPengiriman))) && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">
                    Bukti Foto Pengiriman <span className="text-maint-500">*</span>
                  </label>
                  {editBuktiPengirimanPreview && !editBuktiPengirimanFile && (
                    <ImagePreview
                      src={editBuktiPengirimanPreview}
                      onRemove={() => {
                        setEditBuktiPengirimanFile(null);
                        setEditBuktiPengirimanPreview(null);
                      }}
                    />
                  )}
                  {editBuktiPengirimanFile && (
                    <ImagePreview
                      src={editBuktiPengirimanNewPreview}
                      onRemove={() => {
                        if (editBuktiPengirimanNewPreview) URL.revokeObjectURL(editBuktiPengirimanNewPreview);
                        setEditBuktiPengirimanFile(null);
                        setEditBuktiPengirimanPreview(editingOrder.bukti_pengiriman ? `/storage/${editingOrder.bukti_pengiriman}` : null);
                        setEditBuktiPengirimanNewPreview(null);
                      }}
                    />
                  )}
                  <UploadBox
                    label="Upload foto pengiriman"
                    hint="Foto kendaraan saat diambil/diantarkan, JPG/PNG, maks 2MB"
                    fileName={editBuktiPengirimanFile?.name}
                    icon={
                      <svg className="h-5 w-5 text-ink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                        />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    }
                    onFile={(f) => {
                      if (!f) return;
                      if (editBuktiPengirimanNewPreview) URL.revokeObjectURL(editBuktiPengirimanNewPreview);
                      setEditBuktiPengirimanFile(f);
                      setEditBuktiPengirimanNewPreview(URL.createObjectURL(f));
                    }}
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 border-t border-ink-200 pt-4">
                {isFullyLocked ? (
                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="rounded-lg border border-ink-200 px-4 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-gray-50"
                  >
                    Tutup
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={closeEditModal}
                      className="rounded-lg border border-ink-200 px-4 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-gray-50"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
                    >
                      {submitting && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                      {isKonfirmasi ? 'Konfirmasi & Simpan' : isSewakan ? 'Kirim Kendaraan' : 'Simpan Perubahan'}
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailOrder && (
        <div className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-black/50 p-4" onClick={() => setDetailOrder(null)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-ink-200 bg-white p-6">
              <div>
                <h2 className="text-lg font-semibold text-ink-900">Detail Order</h2>
                <p className="font-mono text-sm text-ink-400">{detailOrder.kode_order}</p>
              </div>
              <button onClick={() => setDetailOrder(null)} className="rounded-lg p-1 transition-colors hover:bg-gray-50" aria-label="Tutup">
                <CloseIcon />
              </button>
            </div>
            <div className="space-y-5 p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-sm font-semibold ${statusColors[detailOrder.status_order]}`}>
                  {statusOrderLabels[detailOrder.status_order]}
                </span>
                <span className={`rounded-full px-3 py-1 text-sm font-semibold ${statusColors[detailOrder.status_pembayaran]}`}>
                  {statusPembayaranLabels[detailOrder.status_pembayaran]}
                </span>
                <span className={`rounded-full px-3 py-1 text-sm font-semibold ${statusColors[detailOrder.status_pengiriman]}`}>
                  {statusPengirimanLabels[detailOrder.status_pengiriman]}
                </span>
                {detailOrder.source === 'katalog' && (
                  <span className="rounded-full bg-brand-100 px-3 py-1 text-sm font-semibold text-brand-600">
                    Pesanan Katalog
                  </span>
                )}
              </div>

              <div className="space-y-1 rounded-xl bg-gray-50 p-4">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-400">Customer</h3>
                <div className="flex justify-between text-sm">
                  <span className="text-ink-400">Nama</span>
                  <span className="font-medium text-ink-900">{detailOrder.customer?.nama_lengkap}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-ink-400">No. HP</span>
                  <span className="text-ink-900">{formatHpDisplay(detailOrder.customer?.no_hp)}</span>
                </div>
                {detailOrder.customer?.email && (
                  <div className="flex justify-between text-sm">
                    <span className="text-ink-400">Email</span>
                    <span className="text-ink-900">{detailOrder.customer.email}</span>
                  </div>
                )}
                {detailOrder.customer?.alamat && (
                  <div className="flex justify-between text-sm">
                    <span className="text-ink-400">Alamat</span>
                    <span className="max-w-[60%] text-right text-ink-900">{detailOrder.customer.alamat}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1 rounded-xl bg-gray-50 p-4">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-400">Kendaraan</h3>
                <div className="flex justify-between text-sm">
                  <span className="text-ink-400">Nama</span>
                  <span className="font-medium text-ink-900">{detailOrder.kendaraan?.nama_kendaraan}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-ink-400">Plat Nomor</span>
                  <span className="font-mono text-ink-900">{detailOrder.kendaraan?.plat_nomor}</span>
                </div>
                {detailOrder.kendaraan?.garasiPartner && (
                  <div className="flex justify-between text-sm">
                    <span className="text-ink-400">Garasi</span>
                    <span className="text-ink-900">{detailOrder.kendaraan.garasiPartner.nama_partner}</span>
                  </div>
                )}
              </div>

              {(detailOrder.supir || detailOrder.calo) && (
                <div className="space-y-1 rounded-xl bg-gray-50 p-4">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-400">Supir & Calo</h3>
                  {detailOrder.supir && (
                    <div className="flex justify-between text-sm">
                      <span className="text-ink-400">Supir</span>
                      <span className="text-ink-900">
                        {detailOrder.supir.nama} — {formatHpDisplay(detailOrder.supir.no_hp)}
                      </span>
                    </div>
                  )}
                  {detailOrder.calo && (
                    <div className="flex justify-between text-sm">
                      <span className="text-ink-400">Calo</span>
                      <span className="text-ink-900">
                        {detailOrder.calo.nama} — {formatHpDisplay(detailOrder.calo.no_hp)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-3 rounded-xl border border-brand-100 bg-brand-50 p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-400">Rincian Biaya</h3>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-ink-900">Sewa Kendaraan</p>
                    <p className="text-xs text-ink-400">
                      {detailOrder.durasi_hari} hari × {formatRupiah(detailOrder.harga_per_hari)}/hari
                    </p>
                    <p className="mt-0.5 text-xs text-ink-400">
                      {fmtDate(detailOrder.tanggal_mulai)} {fmtTime(detailOrder.jam_mulai) || '08:00'} → {fmtDate(detailOrder.tanggal_selesai)}{' '}
                      {fmtTime(detailOrder.jam_selesai) || '17:00'} WIB
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-ink-900">{formatRupiah(Number(detailOrder.harga_per_hari) * detailOrder.durasi_hari)}</p>
                </div>
                {detailOrder.jam_overtime > 0 && (
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-maint-600">Denda Overtime</p>
                      <p className="text-xs text-maint-500">
                        {formatJam(detailOrder.jam_overtime)} × {formatRupiah(overtimeRate)}/jam
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-maint-600">{formatRupiah(detailOrder.denda_overtime)}</p>
                  </div>
                )}
                {detailOrder.status_order === 'active' && detailOrder.jam_overtime_saat_ini > 0 && !detailOrder.jam_overtime && (
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-maint-600">Overtime saat ini</p>
                      <p className="text-xs text-maint-500">
                        {formatJam(detailOrder.jam_overtime_saat_ini)} × {formatRupiah(overtimeRate)}/jam
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-maint-600">{formatRupiah(detailOrder.denda_overtime_saat_ini)}</p>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-brand-100 pt-2">
                  <span className="text-sm font-semibold text-ink-900">Total</span>
                  <span className="text-lg font-bold text-brand-600">
                    {formatRupiah(
                      Number(detailOrder.harga_total) +
                        (detailOrder.status_order === 'active' && detailOrder.jam_overtime_saat_ini > 0 && !detailOrder.jam_overtime
                          ? Number(detailOrder.denda_overtime_saat_ini)
                          : 0)
                    )}
                  </span>
                </div>
              </div>

              {(detailOrder.alamat_jemput || detailOrder.tujuan) && (
                <div className="grid grid-cols-1 gap-3 rounded-xl bg-gray-50 p-4 sm:grid-cols-2">
                  {detailOrder.alamat_jemput && (
                    <div>
                      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink-400">Alamat Jemput</h3>
                      <p className="text-sm text-ink-700">{detailOrder.alamat_jemput}</p>
                    </div>
                  )}
                  {detailOrder.tujuan && (
                    <div>
                      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink-400">Tujuan</h3>
                      <p className="text-sm text-ink-700">{detailOrder.tujuan}</p>
                    </div>
                  )}
                </div>
              )}

              {detailOrder.catatan && (
                <div className="rounded-xl bg-gray-50 p-4">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-400">Catatan</h3>
                  <p className="whitespace-pre-wrap text-sm text-ink-700">{detailOrder.catatan}</p>
                </div>
              )}

              {(detailOrder.bukti_transfer || detailOrder.bukti_pengiriman || detailOrder.bukti_pengembalian) && (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-400">Bukti Foto</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {detailOrder.bukti_transfer && (
                      <div>
                        <p className="mb-1 text-xs text-ink-400">Bukti Pembayaran</p>
                        <a href={`/storage/${detailOrder.bukti_transfer}`} target="_blank" rel="noopener noreferrer">
                          <img
                            src={`/storage/${detailOrder.bukti_transfer}`}
                            alt="Bukti Transfer"
                            className="h-32 w-full cursor-pointer rounded-xl border border-ink-200 object-cover transition-all hover:ring-2 hover:ring-brand-400"
                          />
                        </a>
                      </div>
                    )}
                    {detailOrder.bukti_pengiriman && (
                      <div>
                        <p className="mb-1 text-xs text-ink-400">Bukti Pengiriman</p>
                        <a href={`/storage/${detailOrder.bukti_pengiriman}`} target="_blank" rel="noopener noreferrer">
                          <img
                            src={`/storage/${detailOrder.bukti_pengiriman}`}
                            alt="Bukti Pengiriman"
                            className="h-32 w-full cursor-pointer rounded-xl border border-ink-200 object-cover transition-all hover:ring-2 hover:ring-brand-400"
                          />
                        </a>
                      </div>
                    )}
                    {detailOrder.bukti_pengembalian && (
                      <div>
                        <p className="mb-1 text-xs text-ink-400">Bukti Pengembalian</p>
                        <a href={`/storage/${detailOrder.bukti_pengembalian}`} target="_blank" rel="noopener noreferrer">
                          <img
                            src={`/storage/${detailOrder.bukti_pengembalian}`}
                            alt="Bukti Pengembalian"
                            className="h-32 w-full cursor-pointer rounded-xl border border-ink-200 object-cover transition-all hover:ring-2 hover:ring-brand-400"
                          />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-1 border-t border-ink-200 pt-2 text-xs text-ink-400">
                <div className="flex justify-between">
                  <span>Dibuat</span>
                  <span>{detailOrder.created_at ? new Date(detailOrder.created_at).toLocaleString('id-ID') : '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Diperbarui</span>
                  <span>{detailOrder.updated_at ? new Date(detailOrder.updated_at).toLocaleString('id-ID') : '-'}</span>
                </div>
                {detailOrder.admin?.name && (
                  <div className="flex justify-between">
                    <span>Admin</span>
                    <span>{detailOrder.admin.name}</span>
                  </div>
                )}
              </div>

              {detailOrder.status_order === 'completed' && (
                <button
                  onClick={() => {
                    setDetailOrder(null);
                    setInvoiceOrder(detailOrder);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
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
      )}

      {/* Invoice Modal */}
      {invoiceOrder && (
        <div className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-black/50 p-4" onClick={() => setInvoiceOrder(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-ink-200 p-6 print:hidden">
              <h2 className="text-lg font-semibold text-ink-900">Invoice Sewa Kendaraan</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-brand-50 hover:text-brand-600"
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
                <button onClick={() => setInvoiceOrder(null)} className="rounded-lg p-1 transition-colors hover:bg-gray-50" aria-label="Tutup">
                  <CloseIcon />
                </button>
              </div>
            </div>
            <div className="space-y-5 p-6" id="invoice-content">
              <div className="border-b border-ink-200 pb-4 text-center">
                <h1 className="text-xl font-bold text-ink-900">CVPILAR</h1>
                <p className="mt-1 text-xs text-ink-400">Sistem Manajemen Rental Kendaraan</p>
                <p className="mt-0.5 text-xs text-ink-400">Jl. Contoh Alamat No. 123, Bandung</p>
              </div>

              <div className="flex justify-between text-sm">
                <div>
                  <p className="text-xs text-ink-400">Invoice</p>
                  <p className="font-mono font-bold text-ink-900">{invoiceOrder.kode_order}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-ink-400">Tanggal</p>
                  <p className="text-ink-900">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
              </div>

              <div className="rounded-xl bg-gray-50 p-3 text-sm">
                <p className="mb-1 text-xs text-ink-400">Disewa oleh</p>
                <p className="font-medium text-ink-900">{invoiceOrder.customer?.nama_lengkap}</p>
                <p className="text-xs text-ink-700">{formatHpDisplay(invoiceOrder.customer?.no_hp)}</p>
                {invoiceOrder.customer?.alamat && <p className="text-xs text-ink-400">{invoiceOrder.customer.alamat}</p>}
              </div>

              <div className="rounded-xl bg-gray-50 p-3 text-sm">
                <p className="mb-1 text-xs text-ink-400">Kendaraan</p>
                <p className="font-medium text-ink-900">{invoiceOrder.kendaraan?.nama_kendaraan}</p>
                <p className="font-mono text-xs text-ink-700">{invoiceOrder.kendaraan?.plat_nomor}</p>
              </div>

              {(invoiceOrder.supir || invoiceOrder.calo) && (
                <div className="rounded-xl bg-gray-50 p-3 text-sm">
                  <p className="mb-1 text-xs text-ink-400">Supir & Calo</p>
                  {invoiceOrder.supir && <p className="font-medium text-ink-900">Supir: {invoiceOrder.supir.nama}</p>}
                  {invoiceOrder.calo && (
                    <p className="text-xs text-ink-700">
                      Calo: {invoiceOrder.calo.nama}
                      {invoiceOrder.calo.komisi ? ` (${formatRupiah(invoiceOrder.calo.komisi)})` : ''}
                    </p>
                  )}
                </div>
              )}

              <div className="text-sm">
                <p className="mb-2 text-xs text-ink-400">Periode Sewa</p>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-ink-700">Mulai</span>
                    <span className="text-ink-900">
                      {fmtDate(invoiceOrder.tanggal_mulai)}
                      {invoiceOrder.jam_mulai ? `, ${fmtTime(invoiceOrder.jam_mulai)} WIB` : ''}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-700">Selesai</span>
                    <span className="text-ink-900">
                      {fmtDate(invoiceOrder.tanggal_selesai)}
                      {invoiceOrder.jam_selesai ? `, ${fmtTime(invoiceOrder.jam_selesai)} WIB` : ''}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 border-t border-ink-200 pt-4 text-sm">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-400">Rincian Biaya</p>
                <div className="flex justify-between">
                  <span className="text-ink-700">
                    Sewa {invoiceOrder.durasi_hari} hari × {formatRupiah(invoiceOrder.harga_per_hari)}/hari
                  </span>
                  <span className="text-ink-900">{formatRupiah(invoiceOrder.durasi_hari * invoiceOrder.harga_per_hari)}</span>
                </div>
                {invoiceOrder.supir && invoiceOrder.supir.tarif_per_hari ? (
                  <div className="flex justify-between">
                    <span className="text-ink-700">
                      Supir {invoiceOrder.durasi_hari} hari × {formatRupiah(invoiceOrder.supir.tarif_per_hari)}/hari
                    </span>
                    <span className="text-ink-900">{formatRupiah(invoiceOrder.durasi_hari * invoiceOrder.supir.tarif_per_hari)}</span>
                  </div>
                ) : null}
                {invoiceOrder.jam_overtime > 0 && (
                  <div className="flex justify-between">
                    <span className="text-maint-600">
                      Denda keterlambatan {formatJam(invoiceOrder.jam_overtime)} × {formatRupiah(overtimeRate)}
                    </span>
                    <span className="font-medium text-maint-600">{formatRupiah(invoiceOrder.denda_overtime)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-ink-200 pt-2">
                  <span className="font-semibold text-ink-900">Total</span>
                  <span className="text-xl font-bold text-ink-900">{formatRupiah(invoiceOrder.harga_total)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-ink-200 pt-2 text-xs text-ink-400">
                <div className="flex items-center gap-3">
                  <span>
                    Status:{' '}
                    <span className="font-semibold text-ink-700">{statusPembayaranLabels[invoiceOrder.status_pembayaran]}</span>
                  </span>
                  <span>
                    Bayar:{' '}
                    <span className="font-semibold text-ink-700">
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

      {confirmComplete && (
        <div className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-black/50 p-4" onClick={closeCompleteModal}>
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-ink-200 p-6">
              <h2 className="text-lg font-semibold text-ink-900">Selesaikan Order</h2>
              <button onClick={closeCompleteModal} className="rounded-lg p-1 transition-colors hover:bg-gray-50" aria-label="Tutup">
                <CloseIcon />
              </button>
            </div>
            <div className="space-y-4 p-6">
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between rounded-lg bg-gray-50 p-2.5">
                  <span className="text-ink-400">Kode</span>
                  <span className="font-mono font-semibold text-ink-900">{confirmComplete?.kode_order}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-gray-50 p-2.5">
                  <span className="text-ink-400">Customer</span>
                  <span className="font-medium text-ink-900">{confirmComplete?.customer?.nama_lengkap}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-gray-50 p-2.5">
                  <span className="text-ink-400">Kendaraan</span>
                  <span className="font-medium text-ink-900">
                    {confirmComplete?.kendaraan?.nama_kendaraan} ({confirmComplete?.kendaraan?.plat_nomor})
                  </span>
                </div>
              </div>

              {confirmComplete && (
                <div className="space-y-3 rounded-xl border border-brand-100 bg-brand-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-brand-400">Rincian Biaya</p>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-ink-900">Sewa Kendaraan</p>
                      <p className="text-xs text-ink-400">
                        {confirmComplete.durasi_hari} hari × {formatRupiah(confirmComplete.harga_per_hari)}/hari
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-ink-900">{formatRupiah(confirmComplete.durasi_hari * confirmComplete.harga_per_hari)}</p>
                  </div>
                  {confirmComplete.supir && (
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-ink-900">Biaya Supir</p>
                        <p className="text-xs text-ink-400">{confirmComplete.supir.nama}</p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold text-ink-900">-</p>
                    </div>
                  )}
                  {confirmComplete.jam_overtime_saat_ini > 0 && !confirmComplete.jam_overtime && (
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-maint-600">Denda Overtime</p>
                        <p className="text-xs text-maint-500">
                          {formatJam(confirmComplete.jam_overtime_saat_ini)} × {formatRupiah(overtimeRate)}/jam
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold text-maint-600">{formatRupiah(confirmComplete.denda_overtime_saat_ini)}</p>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t border-brand-100 pt-2">
                    <span className="text-sm font-semibold text-ink-900">Total</span>
                    <span className="text-lg font-bold text-brand-600">
                      {formatRupiah(
                        Number(confirmComplete.harga_total || 0) +
                          (confirmComplete.jam_overtime_saat_ini > 0 && !confirmComplete.jam_overtime
                            ? Number(confirmComplete.denda_overtime_saat_ini || 0)
                            : 0)
                      )}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-ink-700">
                  Waktu Pengembalian Aktual <span className="text-maint-500">*</span>
                </label>
                <p className="mb-1.5 text-xs text-ink-400">Kapan kendaraan benar-benar tiba (dipakai untuk hitung denda)</p>
                <input
                  type="datetime-local"
                  value={completeReturnTime}
                  onChange={(e) => setCompleteReturnTime(e.target.value)}
                  className="block w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 shadow-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-ink-700">
                  Foto Pengembalian Kendaraan <span className="text-maint-500">*</span>
                </label>
                {completeFile && (
                  <ImagePreview
                    src={completeFilePreview}
                    onRemove={() => {
                      if (completeFilePreview) URL.revokeObjectURL(completeFilePreview);
                      setCompleteFile(null);
                      setCompleteFilePreview(null);
                    }}
                  />
                )}
                <UploadBox
                  label="Upload foto kendaraan dikembalikan"
                  hint="Foto kondisi kendaraan saat dikembalikan, JPG/PNG, maks 2MB"
                  fileName={completeFile?.name}
                  icon={
                    <svg className="h-5 w-5 text-ink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                      />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  }
                  onFile={(f) => {
                    if (!f) return;
                    if (completeFilePreview) URL.revokeObjectURL(completeFilePreview);
                    setCompleteFile(f);
                    setCompleteFilePreview(URL.createObjectURL(f));
                  }}
                />
              </div>

              {confirmComplete &&
                (confirmComplete.status_pembayaran !== 'paid' || (confirmComplete.jam_overtime_saat_ini > 0 && !confirmComplete.jam_overtime)) && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-ink-700">
                      Bukti Pembayaran <span className="text-maint-500">*</span>
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
                        <svg className="h-5 w-5 text-ink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <div className="flex justify-end gap-3 border-t border-ink-200 p-6">
              <button
                onClick={closeCompleteModal}
                className="rounded-lg border border-ink-200 px-4 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={handleCompleteOrder}
                disabled={submitting}
                className="flex items-center gap-2 rounded-lg bg-avail-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-avail-600 disabled:opacity-50"
              >
                {submitting && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                Ya, Selesaikan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order List */}
      <div className="space-y-3">
        {loading ? (
          <div className="rounded-2xl bg-white p-12 text-center shadow-sm ring-1 ring-ink-200">
            <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
            <p className="text-sm text-ink-400">Memuat data...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl bg-white p-12 text-center shadow-sm ring-1 ring-ink-200">
            <svg className="mx-auto mb-3 h-12 w-12 text-ink-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              />
            </svg>
            <p className="font-medium text-ink-700">Tidak ada data order</p>
            <p className="mt-1 text-sm text-ink-400">Mulai dengan membuat order baru</p>
          </div>
        ) : (
          items.map((item) => {
            const isOpen = item.status_order === 'pending' || item.status_order === 'confirmed';
            const isActive = item.status_order === 'active';
            const isTerlambat = isActive && item.jam_overtime_saat_ini > 0;

            const sideBarColor =
              item.status_order === 'pending'
                ? 'bg-amber-400'
                : item.status_order === 'confirmed'
                  ? 'bg-rented-500'
                  : item.status_order === 'active'
                    ? 'bg-avail-500'
                    : item.status_order === 'completed'
                      ? 'bg-ink-400'
                      : 'bg-maint-500';

            return (
              <div
                key={item.id}
                className={`rounded-2xl bg-white shadow-sm ring-1 transition-all hover:shadow-md ${
                  isActive ? 'ring-avail-500/30' : isOpen ? 'ring-amber-500/30' : 'ring-ink-200'
                }`}
              >
                <div className="flex items-stretch">
                  <div className={`w-1.5 shrink-0 rounded-l-2xl ${sideBarColor}`} />

                  <div className="flex-1 p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-mono text-sm font-bold text-ink-900">{item.kode_order}</span>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColors[item.status_order]}`}>
                          {statusOrderLabels[item.status_order]}
                        </span>
                        {item.source === 'katalog' && (
                          <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-600">
                            Pesanan Katalog
                          </span>
                        )}
                        {isActive && (
                          <span className="flex items-center gap-1 text-xs font-medium text-avail-600">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-avail-500" />
                            Aktif
                          </span>
                        )}
                        {isTerlambat && (
                          <span className="flex items-center gap-1 rounded-full bg-maint-50 px-2 py-0.5 text-xs font-semibold text-maint-600">
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                              />
                            </svg>
                            Overtime {formatJam(item.jam_overtime_saat_ini)} ({formatRupiah(item.denda_overtime_saat_ini)})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setDetailOrder(item)}
                          className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-gray-50 hover:text-ink-700"
                          title="Lihat detail"
                          aria-label="Lihat detail"
                        >
                          <EyeIcon />
                        </button>
                        <button
                          onClick={() => openEditModal(item)}
                          className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-brand-50 hover:text-brand-600"
                          title="Edit order"
                          aria-label="Edit order"
                        >
                          <PencilIcon />
                        </button>
                        {item.status_order === 'pending' && (
                          <>
                            <button
                              onClick={() => openEditModal(item, { konfirmasi: true })}
                              className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-600"
                            >
                              Konfirmasi
                            </button>
                            <button
                              onClick={() =>
                                setConfirmAction({
                                  title: 'Batalkan Order',
                                  message: `Batalkan order "${item.kode_order}" dari ${item.customer?.nama_lengkap}?`,
                                  danger: true,
                                  onConfirm: () => handleInlineUpdate(item.id, 'status_order', 'cancelled'),
                                })
                              }
                              className="rounded-lg bg-maint-50 px-3 py-1.5 text-xs font-medium text-maint-600 transition-colors hover:bg-maint-100"
                            >
                              Batal
                            </button>
                          </>
                        )}
                        {item.status_order === 'confirmed' && (
                          <>
                            <button
                              onClick={() => openEditModal(item, { sewakan: true })}
                              className="flex items-center gap-1 rounded-lg bg-avail-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-avail-600"
                            >
                              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Kirim Kendaraan
                            </button>
                            <button
                              onClick={() =>
                                setConfirmAction({
                                  title: 'Batalkan Order',
                                  message: `Batalkan order "${item.kode_order}" dari ${item.customer?.nama_lengkap}?`,
                                  danger: true,
                                  onConfirm: () => handleInlineUpdate(item.id, 'status_order', 'cancelled'),
                                })
                              }
                              className="rounded-lg bg-maint-50 px-3 py-1.5 text-xs font-medium text-maint-600 transition-colors hover:bg-maint-100"
                            >
                              Batal
                            </button>
                          </>
                        )}
                        {isActive && item.status_pengiriman === 'sudah_diantarkan' && item.bukti_pengiriman && (
                          <button
                            onClick={() =>
                              setConfirmAction({
                                title: 'Mulai Sewa',
                                message: `Mulai penyewaan "${item.kode_order}" dari ${item.customer?.nama_lengkap}?`,
                                danger: false,
                                onConfirm: () => handleInlineUpdate(item.id, 'status_pengiriman', 'dalam_penyewaan'),
                              })
                            }
                            className="flex items-center gap-1 rounded-lg bg-avail-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-avail-600"
                          >
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Mulai Sewa
                          </button>
                        )}
                        {isActive && item.status_pengiriman !== 'sudah_diantarkan' && (
                          <button
                            onClick={() => setConfirmComplete(item)}
                            className="flex items-center gap-1 rounded-lg bg-avail-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-avail-500"
                          >
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Selesai
                          </button>
                        )}
                        {isOpen && (
                          <button
                            onClick={() => setConfirmDelete(item)}
                            className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-maint-50 hover:text-maint-600"
                            title="Hapus"
                            aria-label="Hapus"
                          >
                            <TrashIcon />
                          </button>
                        )}
                      </div>
                    </div>

                    {isTerlambat && (
                      <div className="mb-3 flex items-center gap-2 rounded-lg border border-maint-500/30 bg-maint-50 px-3 py-2">
                        <svg className="h-4 w-4 flex-shrink-0 text-maint-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs font-medium text-maint-600">
                          Kendaraan terlambat dikembalikan <strong>{formatJam(item.jam_overtime_saat_ini)}</strong> — denda{' '}
                          <strong>{formatRupiah(item.denda_overtime_saat_ini)}</strong>
                        </span>
                      </div>
                    )}

                    {item.status_order === 'completed' && item.jam_overtime > 0 && (
                      <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                        <svg className="h-4 w-4 flex-shrink-0 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs font-medium text-amber-700">
                          Terlambat {formatJam(item.jam_overtime)} — denda {formatRupiah(item.denda_overtime)}
                        </span>
                        <button onClick={() => setInvoiceOrder(item)} className="ml-auto text-xs font-medium text-amber-700 underline hover:text-amber-900">
                          Lihat Invoice
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                      <div className="space-y-0.5">
                        <span className="text-xs uppercase tracking-wider text-ink-400">Customer</span>
                        <div className="flex items-center gap-2 px-2 py-1">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-600">
                            {item.customer?.nama_lengkap?.charAt(0) || '?'}
                          </div>
                          <div className="min-w-0">
                            <span className="block truncate font-medium text-ink-900">{item.customer?.nama_lengkap}</span>
                            <p className="truncate text-xs text-ink-400">{formatHpDisplay(item.customer?.no_hp)}</p>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-xs uppercase tracking-wider text-ink-400">Kendaraan</span>
                        <div className="flex items-center gap-2 px-2 py-1">
                          {item.kendaraan?.foto ? (
                            <img src={`/storage/${item.kendaraan.foto}`} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover" />
                          ) : (
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-400">
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 17h.01M16 17h.01M3 11l1.5-5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.4L21 11M3 11h18" /></svg>
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="block truncate font-medium text-ink-900">{item.kendaraan?.nama_kendaraan}</span>
                            <p className="truncate text-xs text-ink-400">{item.kendaraan?.plat_nomor}</p>
                          </div>
                        </div>
                      </div>
                      {(item.supir || item.calo) && (
                        <div className="space-y-0.5">
                          <span className="text-xs uppercase tracking-wider text-ink-400">Supir / Calo</span>
                          <div className="px-2 py-1">
                            {item.supir && <span className="block truncate text-ink-900">{item.supir.nama}</span>}
                            {item.calo && <p className="truncate text-xs text-ink-400">{item.calo.nama}</p>}
                            {!item.supir && !item.calo && <span className="text-ink-400">-</span>}
                          </div>
                        </div>
                      )}
                      <div className="space-y-0.5">
                        <span className="text-xs uppercase tracking-wider text-ink-400">Periode</span>
                        <div className="px-2 py-1">
                          <span className="block text-ink-900">
                            {fmtDate(item.tanggal_mulai)} {fmtTime(item.jam_mulai) || '08:00'} → {fmtDate(item.tanggal_selesai)} {fmtTime(item.jam_selesai) || '17:00'} WIB
                          </span>
                          <p className="text-xs text-ink-400">{item.durasi_hari} hari</p>
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-xs uppercase tracking-wider text-ink-400">Total</span>
                        <div className="px-2 py-1">
                          <span className="font-bold text-ink-900">
                            {formatRupiah(
                              Number(item.harga_total) +
                                (item.status_order === 'active' && item.jam_overtime_saat_ini > 0 && !item.jam_overtime
                                  ? Number(item.denda_overtime_saat_ini)
                                  : 0)
                            )}
                          </span>
                          <p className="text-xs text-ink-400">{formatRupiah(item.harga_per_hari)}/hari</p>
                        </div>
                      </div>
                    </div>

                    {(item.alamat_jemput || item.tujuan) && (
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-500">
                        {item.alamat_jemput && (
                          <span className="flex items-center gap-1.5">
                            <svg className="h-3.5 w-3.5 shrink-0 text-ink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            {item.alamat_jemput}
                          </span>
                        )}
                        {item.alamat_jemput && item.tujuan && <span className="text-ink-300">→</span>}
                        {item.tujuan && (
                          <span className="flex items-center gap-1.5">
                            <svg className="h-3.5 w-3.5 shrink-0 text-ink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><circle cx="12" cy="11" r="3" /></svg>
                            {item.tujuan}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-ink-200 pt-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-ink-400">Bayar:</span>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColors[item.status_pembayaran]}`}>
                          {statusPembayaranLabels[item.status_pembayaran]}
                        </span>
                        {item.bukti_transfer && (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-avail-50" title="Bukti transfer terlampir">
                            <svg className="h-3 w-3 text-avail-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                        )}
                        {item.bukti_pengiriman && (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rented-50" title="Bukti pengiriman terlampir">
                            <svg className="h-3 w-3 text-rented-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                              />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-ink-400">Pengiriman:</span>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColors[item.status_pengiriman]}`}>
                          {statusPengirimanLabels[item.status_pengiriman]}
                        </span>
                      </div>

                      <div className="ml-auto text-xs text-ink-400">{item.admin?.name && `oleh ${item.admin.name}`}</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
