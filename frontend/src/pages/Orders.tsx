import { useState, useEffect, useCallback, useRef, useMemo, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { isAxiosError } from 'axios';
import { orderAPI, customerAPI, kendaraanAPI, supirCaloAPI } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import ConfirmModal from '../components/ConfirmModal';

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

const statusOrderOptions: StatusOrder[] = ['pending', 'confirmed', 'active', 'completed', 'cancelled'];
const statusPembayaranOptions: StatusPembayaran[] = ['unpaid', 'partial', 'paid'];

// Status pengiriman yang mewajibkan bukti foto kendaraan diunggah.
const statusPengirimanButuhBukti: StatusPengiriman[] = ['sudah_diantarkan', 'dalam_penyewaan'];

// Tarif denda keterlambatan per jam. Harus selalu sama dengan
// App\Models\Order::OVERTIME_RATE_PER_HOUR di backend.
const OVERTIME_RATE_PER_HOUR = 25000;

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

const inputClass =
  'w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-900 outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500';

/* ─────────────────────────────────────────────────────────────
 * TYPES — ENTITAS
 * ───────────────────────────────────────────────────────────── */
interface Customer {
  id: number;
  nama_lengkap: string;
  no_hp: string;
  email?: string | null;
  alamat?: string | null;
  no_ktp?: string | null;
  no_sim?: string | null;
}

interface Kendaraan {
  id: number;
  nama_kendaraan: string;
  plat_nomor: string;
  warna: string;
  foto: string | null;
  harga_sewa_per_hari: number;
  status: string;
  merek?: string;
  model?: string;
  tahun?: number;
  kapasitas_penumpang?: number;
  garasiPartner?: { nama_partner: string };
}

interface SupirCalo {
  id: number;
  nama: string;
  no_hp: string;
  status: string;
  tarif_per_hari?: number;
  komisi?: number;
}

interface Order {
  id: number;
  kode_order: string;
  customer_id: number;
  kendaraan_id: number;
  tanggal_mulai: string;
  tanggal_selesai: string;
  jam_mulai: string | null;
  jam_selesai: string | null;
  harga_per_hari: number;
  harga_total: number;
  durasi_hari: number;
  metode_pembayaran: MetodePembayaran | null;
  status_order: StatusOrder;
  status_pembayaran: StatusPembayaran;
  status_pengiriman: StatusPengiriman;
  supir_id: number | null;
  calo_id: number | null;
  catatan: string | null;
  bukti_transfer: string | null;
  bukti_pengiriman: string | null;
  bukti_pengembalian: string | null;
  jam_overtime: number;
  denda_overtime: number;
  jam_overtime_saat_ini: number;
  denda_overtime_saat_ini: number;
  customer?: Customer;
  kendaraan?: Kendaraan;
  supir?: SupirCalo;
  calo?: SupirCalo;
  admin?: { name: string };
  created_at?: string;
  updated_at?: string;
}

interface OrderForm {
  customer_id: string;
  kendaraan_id: string;
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
  kendaraan_id: '',
  tanggal_mulai: '',
  tanggal_selesai: '',
  jam_mulai: '08:00',
  jam_selesai: '17:00',
  harga_per_hari: '',
  metode_pembayaran: 'cash',
  status_order: 'confirmed',
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

  // ── Filter (disatukan) ────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [search, setSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<OrderForm>(emptyForm);
  const [kendaraanSearch, setKendaraanSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<Order | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmActionState | null>(null);
  const [confirmComplete, setConfirmComplete] = useState<Order | null>(null);
  const [completeFile, setCompleteFile] = useState<File | null>(null);
  const [completeFilePreview, setCompleteFilePreview] = useState<string | null>(null);
  const [completePaymentFile, setCompletePaymentFile] = useState<File | null>(null);
  const [completePaymentPreview, setCompletePaymentPreview] = useState<string | null>(null);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);
  const [buktiBaruFile, setBuktiBaruFile] = useState<File | null>(null);
  const [buktiBaruPreview, setBuktiBaruPreview] = useState<string | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [isSewakan, setIsSewakan] = useState(false);
  const [editKendaraanSearch, setEditKendaraanSearch] = useState('');
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editForm, setEditForm] = useState<OrderEditForm>({});
  const [editBuktiFile, setEditBuktiFile] = useState<File | null>(null);
  const [editBuktiPreview, setEditBuktiPreview] = useState<string | null>(null);
  const [editBuktiNewPreview, setEditBuktiNewPreview] = useState<string | null>(null);
  const [editBuktiPengirimanFile, setEditBuktiPengirimanFile] = useState<File | null>(null);
  const [editBuktiPengirimanPreview, setEditBuktiPengirimanPreview] = useState<string | null>(null);
  const [editBuktiPengirimanNewPreview, setEditBuktiPengirimanNewPreview] = useState<string | null>(null);

  // Revoke semua blob preview URL saat komponen di-unmount, biar tidak numpuk di memori.
  useEffect(() => {
    return () => {
      if (buktiBaruPreview) URL.revokeObjectURL(buktiBaruPreview);
      if (editBuktiNewPreview) URL.revokeObjectURL(editBuktiNewPreview);
      if (editBuktiPengirimanNewPreview) URL.revokeObjectURL(editBuktiPengirimanNewPreview);
      if (completeFilePreview) URL.revokeObjectURL(completeFilePreview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      .list({ status: 'tersedia' })
      .then(({ data }: { data: ListResponse<Kendaraan> }) => setKendaraans(data.data))
      .catch(() => {});
    kendaraanAPI
      .list()
      .then(({ data }: { data: ListResponse<Kendaraan> }) => setAllKendaraans(data.data))
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
  useEffect(() => {
    setAlertDismissed(false);
  }, [items]);

  const closeCreateModal = () => {
    setShowForm(false);
    setKendaraanSearch('');
    if (buktiBaruPreview) URL.revokeObjectURL(buktiBaruPreview);
    setBuktiBaruFile(null);
    setBuktiBaruPreview(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (buktiBaruFile) {
        const fd = new FormData();
        Object.entries(form).forEach(([k, v]) => {
          if (v !== '' && v !== null && v !== undefined) fd.append(k, v);
        });
        fd.append('bukti_transfer', buktiBaruFile);
        await orderAPI.create(fd);
      } else {
        await orderAPI.create(form as unknown as Record<string, unknown>);
      }
      toast.success('Order berhasil ditambahkan');
      setForm(emptyForm);
      closeCreateModal();
      load();
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
      const mulai = new Date(`${form.tanggal_mulai}T${form.jam_mulai || '00:00'}`);
      const selesai = new Date(`${form.tanggal_selesai}T${form.jam_selesai || '23:59'}`);
      const diffMs = selesai.getTime() - mulai.getTime();
      const diff = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return Math.max(diff, 1);
    }
    return 0;
  })();

  const selectedSupirCreate = form.supir_id ? supirs.find((s) => String(s.id) === String(form.supir_id)) : null;
  const supirTarifCreate = selectedSupirCreate ? Number(selectedSupirCreate.tarif_per_hari || 0) : 0;
  const hargaTotal = durasiHari * (Number(form.harga_per_hari) || 0) + supirTarifCreate * durasiHari;

  /**
   * Buka modal edit. Dipakai baik untuk edit biasa (pensil) maupun aksi cepat
   * "Sewakan" (dulu 2 blok kode terpisah yang isinya nyaris identik).
   */
  const openEditModal = (item: Order, { sewakan = false }: { sewakan?: boolean } = {}) => {
    setIsSewakan(sewakan);
    setEditingOrder(item);
    setEditForm({
      customer_id: String(item.customer_id),
      kendaraan_id: String(item.kendaraan_id),
      tanggal_mulai: fmtDate(item.tanggal_mulai),
      tanggal_selesai: fmtDate(item.tanggal_selesai),
      jam_mulai: fmtTime(item.jam_mulai) || '08:00',
      jam_selesai: fmtTime(item.jam_selesai) || '17:00',
      status_order: sewakan ? 'active' : item.status_order,
      status_pembayaran: item.status_pembayaran,
      metode_pembayaran: item.metode_pembayaran || 'cash',
      status_pengiriman: sewakan ? 'dalam_penyewaan' : item.status_pengiriman,
      supir_id: item.supir_id ? String(item.supir_id) : '',
      calo_id: item.calo_id ? String(item.calo_id) : '',
      catatan: item.catatan || '',
    });
    setEditBuktiFile(null);
    setEditBuktiPreview(item.bukti_transfer ? `/storage/${item.bukti_transfer}` : null);
    setEditBuktiNewPreview(null);
    setEditBuktiPengirimanFile(null);
    setEditBuktiPengirimanPreview(item.bukti_pengiriman ? `/storage/${item.bukti_pengiriman}` : null);
    setEditBuktiPengirimanNewPreview(null);
    setShowEditForm(true);
  };

  const closeEditModal = () => {
    setShowEditForm(false);
    setEditingOrder(null);
    setEditForm({});
    setEditKendaraanSearch('');
    if (editBuktiNewPreview) URL.revokeObjectURL(editBuktiNewPreview);
    setEditBuktiFile(null);
    setEditBuktiPreview(null);
    setEditBuktiNewPreview(null);
    if (editBuktiPengirimanNewPreview) URL.revokeObjectURL(editBuktiPengirimanNewPreview);
    setEditBuktiPengirimanFile(null);
    setEditBuktiPengirimanPreview(null);
    setEditBuktiPengirimanNewPreview(null);
  };

  const setEditField = <K extends keyof OrderForm>(key: K, value: OrderForm[K]) => setEditForm((prev) => ({ ...prev, [key]: value }));

  const editHargaPerHari = (() => {
    if (!editForm.kendaraan_id) return 0;
    const k = allKendaraans.find((x) => String(x.id) === String(editForm.kendaraan_id));
    return k ? Number(k.harga_sewa_per_hari) : 0;
  })();

  const editDurasi = (() => {
    if (editForm.tanggal_mulai && editForm.tanggal_selesai) {
      const mulai = new Date(`${editForm.tanggal_mulai}T${editForm.jam_mulai || '00:00'}`);
      const selesai = new Date(`${editForm.tanggal_selesai}T${editForm.jam_selesai || '23:59'}`);
      const diffMs = selesai.getTime() - mulai.getTime();
      const diff = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return Math.max(diff, 1);
    }
    return 0;
  })();

  const selectedSupirEdit = editForm.supir_id ? supirs.find((s) => String(s.id) === String(editForm.supir_id)) : null;
  const supirTarifEdit = selectedSupirEdit ? Number(selectedSupirEdit.tarif_per_hari || 0) : 0;
  const editTotal = editDurasi * editHargaPerHari + supirTarifEdit * editDurasi;

  const handleEditKendaraanSelect = (id: number) => setEditForm((prev) => ({ ...prev, kendaraan_id: String(id) }));

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();

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
      let res;
      const hasFile = editBuktiFile || editBuktiPengirimanFile;
      if (hasFile) {
        const fd = new FormData();
        fd.append('_method', 'PUT');
        Object.entries(editForm).forEach(([k, v]) => {
          if (v !== '' && v !== null && v !== undefined) fd.append(k, v as string);
        });
        if (editBuktiFile) fd.append('bukti_transfer', editBuktiFile);
        if (editBuktiPengirimanFile) fd.append('bukti_pengiriman', editBuktiPengirimanFile);
        res = await orderAPI.updateWithFile(editingOrder.id, fd);
      } else {
        res = await orderAPI.update(editingOrder.id, editForm);
      }
      setItems((prev) => prev.map((item) => (item.id === editingOrder.id ? { ...item, ...res.data } : item)));
      toast.success('Order berhasil diperbarui');
      closeEditModal();
      load();
      kendaraanAPI
        .list({ status: 'tersedia' })
        .then(({ data }: { data: ListResponse<Kendaraan> }) => setKendaraans(data.data))
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
      if (completePaymentFile) fd.append('bukti_transfer', completePaymentFile);
      fd.append('_method', 'PUT');
      await orderAPI.updateWithFile(confirmComplete.id, fd);
      toast.success('Order berhasil diselesaikan');
      closeCompleteModal();
      load();
      kendaraanAPI
        .list({ status: 'tersedia' })
        .then(({ data }: { data: ListResponse<Kendaraan> }) => setKendaraans(data.data))
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
  };

  const filteredKendaraanCreate = useMemo(() => {
    if (!kendaraanSearch) return kendaraans;
    const q = kendaraanSearch.toLowerCase();
    return kendaraans.filter(
      (k) =>
        k.nama_kendaraan.toLowerCase().includes(q) ||
        k.plat_nomor.toLowerCase().includes(q) ||
        (k.merek && k.merek.toLowerCase().includes(q)) ||
        (k.model && k.model.toLowerCase().includes(q)) ||
        (k.warna && k.warna.toLowerCase().includes(q)) ||
        (k.kategori?.nama_kategori && k.kategori.nama_kategori.toLowerCase().includes(q)) ||
        (k.garasi_partner?.nama_garasi && k.garasi_partner.nama_garasi.toLowerCase().includes(q))
    );
  }, [kendaraans, kendaraanSearch]);

  const filteredKendaraanEdit = useMemo(() => {
    return allKendaraans.filter((k) => {
      if (k.status !== 'tersedia' && editingOrder && k.id !== editingOrder.kendaraan_id) return false;
      if (!editKendaraanSearch) return true;
      const q = editKendaraanSearch.toLowerCase();
      return (
        k.nama_kendaraan.toLowerCase().includes(q) ||
        k.plat_nomor.toLowerCase().includes(q) ||
        (k.merek && k.merek.toLowerCase().includes(q)) ||
        (k.model && k.model.toLowerCase().includes(q)) ||
        (k.warna && k.warna.toLowerCase().includes(q)) ||
        (k.kategori?.nama_kategori && k.kategori.nama_kategori.toLowerCase().includes(q)) ||
        (k.garasi_partner?.nama_garasi && k.garasi_partner.nama_garasi.toLowerCase().includes(q))
      );
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
                        {item.jam_overtime_saat_ini} jam · {formatRupiah(item.denda_overtime_saat_ini)}
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
            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">Customer *</label>
                  <select value={form.customer_id} onChange={(e) => setField('customer_id', e.target.value)} required className={inputClass}>
                    <option value="">Pilih Customer</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nama_lengkap} — {c.no_hp}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">Supir</label>
                  <select value={form.supir_id} onChange={(e) => setField('supir_id', e.target.value)} className={inputClass}>
                    <option value="">Pilih Supir (opsional)</option>
                    {supirs
                      .filter((s) => s.status === 'active')
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nama} — {s.no_hp}
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
                          {c.nama} — {c.no_hp}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
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
                          return (
                            <div
                              key={k.id}
                              onClick={() => handleKendaraanSelect(k.id)}
                              className={`w-44 shrink-0 cursor-pointer rounded-xl border-2 transition-all ${
                                selected ? 'border-brand-500 bg-brand-50/50 ring-2 ring-brand-100' : 'border-ink-200 hover:border-brand-300 hover:shadow-sm'
                              }`}
                            >
                              <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-t-[10px] bg-gray-50">
                                {k.foto ? (
                                  <img
                                    src={k.foto.startsWith('http') ? k.foto : `/storage/${k.foto}`}
                                    alt={k.nama_kendaraan}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <svg className="h-10 w-10 text-ink-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={1.5}
                                      d="M8 17h.01M16 17h.01M3 11l1.5-5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.4L21 11M3 11h18M3 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-6"
                                    />
                                  </svg>
                                )}
                              </div>
                              <div className="space-y-1 p-3">
                                <p className="truncate text-sm font-semibold leading-tight text-ink-900">{k.nama_kendaraan}</p>
                                <p className="font-mono text-xs text-ink-400">{k.plat_nomor}</p>
                                <div className="flex items-center gap-1.5">
                                  <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-ink-200" style={{ backgroundColor: k.warna }} />
                                  <span className="truncate text-xs text-ink-400">{k.warna}</span>
                                </div>
                                <p className="text-xs font-bold text-brand-600">{formatRupiah(k.harga_sewa_per_hari)}/hari</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">Tanggal Mulai *</label>
                  <input
                    type="date"
                    value={form.tanggal_mulai}
                    onChange={(e) => setField('tanggal_mulai', e.target.value)}
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

              <div className="flex justify-end gap-3 border-t border-ink-200 pt-4">
                <button
                  type="button"
                  onClick={closeCreateModal}
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
                  Buat Order
                </button>
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
                <h2 className="text-lg font-semibold text-ink-900">{isSewakan ? 'Form Penyewaan' : 'Edit Order'}</h2>
                <p className="font-mono text-sm text-ink-400">{editingOrder.kode_order}</p>
              </div>
              <button onClick={closeEditModal} className="rounded-lg p-1 transition-colors hover:bg-gray-50" aria-label="Tutup">
                <CloseIcon />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-4 p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">Customer</label>
                  <select value={editForm.customer_id || ''} onChange={(e) => setEditField('customer_id', e.target.value)} required className={inputClass}>
                    <option value="">Pilih Customer</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nama_lengkap} — {c.no_hp}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">Supir</label>
                  <select value={editForm.supir_id || ''} onChange={(e) => setEditField('supir_id', e.target.value)} className={inputClass}>
                    <option value="">Pilih Supir (opsional)</option>
                    {supirs
                      .filter((s) => s.status === 'active')
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nama} — {s.no_hp}
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
                          {c.nama} — {c.no_hp}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
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
                      return (
                        <div
                          key={k.id}
                          onClick={() => handleEditKendaraanSelect(k.id)}
                          className={`w-44 shrink-0 cursor-pointer rounded-xl border-2 transition-all ${
                            selected ? 'border-brand-500 bg-brand-50/50 ring-2 ring-brand-100' : 'border-ink-200 hover:border-brand-300 hover:shadow-sm'
                          }`}
                        >
                          <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-t-[10px] bg-gray-50">
                            {k.foto ? (
                              <img
                                src={k.foto.startsWith('http') ? k.foto : `/storage/${k.foto}`}
                                alt={k.nama_kendaraan}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <svg className="h-10 w-10 text-ink-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1.5}
                                  d="M8 17h.01M16 17h.01M3 11l1.5-5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.4L21 11M3 11h18M3 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-6"
                                />
                              </svg>
                            )}
                          </div>
                          <div className="space-y-1 p-3">
                            <p className="truncate text-sm font-semibold leading-tight text-ink-900">{k.nama_kendaraan}</p>
                            <p className="font-mono text-xs text-ink-400">{k.plat_nomor}</p>
                            <div className="flex items-center gap-1.5">
                              <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-ink-200" style={{ backgroundColor: k.warna }} />
                              <span className="truncate text-xs text-ink-400">{k.warna}</span>
                            </div>
                            <p className="text-xs font-bold text-brand-600">{formatRupiah(k.harga_sewa_per_hari)}/hari</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">Tanggal Mulai</label>
                  <input
                    type="date"
                    value={editForm.tanggal_mulai || ''}
                    onChange={(e) => setEditField('tanggal_mulai', e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">Jam Mulai</label>
                  <input
                    type="time"
                    value={editForm.jam_mulai || '08:00'}
                    onChange={(e) => setEditField('jam_mulai', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">Tanggal Selesai</label>
                  <input
                    type="date"
                    value={editForm.tanggal_selesai || ''}
                    onChange={(e) => setEditField('tanggal_selesai', e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">Jam Selesai</label>
                  <input
                    type="time"
                    value={editForm.jam_selesai || '17:00'}
                    onChange={(e) => setEditField('jam_selesai', e.target.value)}
                    className={inputClass}
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
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">Status Order</label>
                  <select
                    value={editForm.status_order || ''}
                    onChange={(e) => setEditField('status_order', e.target.value as StatusOrder)}
                    className={inputClass}
                  >
                    {statusOrderOptions.map((s) => (
                      <option key={s} value={s}>
                        {statusOrderLabels[s]}
                      </option>
                    ))}
                  </select>
                </div>
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
              </div>

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

              <div>
                <label className="mb-1 block text-sm font-medium text-ink-700">Catatan</label>
                <textarea
                  value={editForm.catatan || ''}
                  onChange={(e) => setEditField('catatan', e.target.value)}
                  rows={2}
                  className={`${inputClass} resize-none`}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-ink-700">Bukti Pembayaran</label>
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
              </div>

              {editForm.status_pengiriman && statusPengirimanButuhBukti.includes(editForm.status_pengiriman as StatusPengiriman) && (
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
                  {isSewakan ? 'Sewakan' : 'Simpan Perubahan'}
                </button>
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
              </div>

              <div className="space-y-1 rounded-xl bg-gray-50 p-4">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-400">Customer</h3>
                <div className="flex justify-between text-sm">
                  <span className="text-ink-400">Nama</span>
                  <span className="font-medium text-ink-900">{detailOrder.customer?.nama_lengkap}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-ink-400">No. HP</span>
                  <span className="text-ink-900">{detailOrder.customer?.no_hp}</span>
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
                        {detailOrder.supir.nama} — {detailOrder.supir.no_hp}
                      </span>
                    </div>
                  )}
                  {detailOrder.calo && (
                    <div className="flex justify-between text-sm">
                      <span className="text-ink-400">Calo</span>
                      <span className="text-ink-900">
                        {detailOrder.calo.nama} — {detailOrder.calo.no_hp}
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
                        {detailOrder.jam_overtime} jam × {formatRupiah(OVERTIME_RATE_PER_HOUR)}/jam
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
                        {detailOrder.jam_overtime_saat_ini} jam × {formatRupiah(OVERTIME_RATE_PER_HOUR)}/jam
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
                <p className="text-xs text-ink-700">{invoiceOrder.customer?.no_hp}</p>
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
                {invoiceOrder.jam_overtime > 0 && (
                  <div className="flex justify-between">
                    <span className="text-maint-600">
                      Denda keterlambatan {invoiceOrder.jam_overtime} jam × {formatRupiah(OVERTIME_RATE_PER_HOUR)}
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
                <div className="flex items-center justify-between rounded-lg bg-brand-50 p-2.5">
                  <span className="font-medium text-brand-600">Total</span>
                  <span className="text-lg font-bold text-brand-600">
                    {formatRupiah(
                      Number(confirmComplete?.harga_total || 0) +
                        (confirmComplete && confirmComplete.jam_overtime_saat_ini > 0 && !confirmComplete.jam_overtime
                          ? Number(confirmComplete.denda_overtime_saat_ini || 0)
                          : 0)
                    )}
                  </span>
                </div>
                {confirmComplete && confirmComplete.jam_overtime_saat_ini > 0 && (
                  <div className="flex items-center gap-2 rounded-lg border border-maint-500/30 bg-maint-50 p-2.5">
                    <svg className="h-4 w-4 flex-shrink-0 text-maint-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                      />
                    </svg>
                    <span className="text-xs text-maint-600">
                      Melewati batas waktu <strong>{confirmComplete.jam_overtime_saat_ini} jam</strong> → denda{' '}
                      <strong>{formatRupiah(confirmComplete.denda_overtime_saat_ini)}</strong> akan ditambahkan ke total
                    </span>
                  </div>
                )}
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
                            Overtime {item.jam_overtime_saat_ini} jam ({formatRupiah(item.denda_overtime_saat_ini)})
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
                              onClick={() =>
                                setConfirmAction({
                                  title: 'Konfirmasi Order',
                                  message: `Konfirmasi order "${item.kode_order}" dari ${item.customer?.nama_lengkap}?`,
                                  danger: false,
                                  onConfirm: () => handleInlineUpdate(item.id, 'status_order', 'confirmed'),
                                })
                              }
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
                              Sewakan
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
                        {isActive && (
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
                          Kendaraan terlambat dikembalikan <strong>{item.jam_overtime_saat_ini} jam</strong> — denda{' '}
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
                          Terlambat {item.jam_overtime} jam — denda {formatRupiah(item.denda_overtime)}
                        </span>
                        <button onClick={() => setInvoiceOrder(item)} className="ml-auto text-xs font-medium text-amber-700 underline hover:text-amber-900">
                          Lihat Invoice
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                      <div className="space-y-0.5">
                        <span className="text-xs uppercase tracking-wider text-ink-400">Customer</span>
                        <div className="px-2 py-1">
                          <span className="block truncate font-medium text-ink-900">{item.customer?.nama_lengkap}</span>
                          <p className="truncate text-xs text-ink-400">{item.customer?.no_hp}</p>
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-xs uppercase tracking-wider text-ink-400">Kendaraan</span>
                        <div className="px-2 py-1">
                          <span className="block truncate font-medium text-ink-900">{item.kendaraan?.nama_kendaraan}</span>
                          <p className="truncate text-xs text-ink-400">{item.kendaraan?.plat_nomor}</p>
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