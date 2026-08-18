import { useState, useEffect, useCallback, useMemo, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { isAxiosError } from 'axios';
import { formatRupiah, warnaKendaraanHex } from '../lib/format';
import { fotoFileError } from '../lib/file';
import { statusPhotoClass } from '../lib/katalogStatus';
import { vehicleStatusStyles, vehicleStatusLabels, VEHICLE_STATUSES, type StatusKendaraan } from '../lib/vehicleStatus';
import {
  kendaraanAPI,
  garasiPartnerAPI,
  kategoriAPI,
  tipeAPI,
  type Kendaraan as ApiKendaraan,
  type GarasiPartner as ApiGarasiPartner,
  type KategoriKendaraan,
  type TipeKendaraan,
} from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import ConfirmModal from '../components/ConfirmModal';
import KategoriTipeQuickCreate from '../components/KategoriTipeQuickCreate';
import { RotateCcw, Pencil, Trash2, Eye } from 'lucide-react';

type Kendaraan = ApiKendaraan & {
  garasi_partner?: { nama_partner: string };
  garasi_partner_id?: number;
  kategori?: KategoriKendaraan;
  tipe?: TipeKendaraan;
  kategori_id?: number;
  tipe_id?: number;
  catatan?: string | null;
};

type GarasiPartnerLocal = ApiGarasiPartner & {
  nama_garasi: string;
};

interface KendaraanFormState {
  [key: string]: string | number;
  garasi_partner_id: string;
  kategori_id: string;
  tipe_id: string;
  nama_kendaraan: string;
  plat_nomor: string;
  merek: string;
  model: string;
  tahun: number;
  warna: string;
  kapasitas_penumpang: number;
  harga_sewa_per_hari: string | number;
  harga_partner_per_hari: string | number;
  status: StatusKendaraan;
  catatan: string;
}

interface ConfirmActionState {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void | Promise<unknown>;
}

type FilterTab = 'semua' | StatusKendaraan;

interface KendaraanCounts {
  total: number;
  tersedia: number;
  disewa: number;
  maintenance: number;
  tidak_tersedia: number;
}

/* ------------------------------------------------------------------ */
/* Constants                                                          */
/* ------------------------------------------------------------------ */

const filterTabs: { key: FilterTab; label: string }[] = [
  { key: 'semua', label: 'Semua' },
  { key: 'tersedia', label: 'Tersedia' },
  { key: 'disewa', label: 'Disewa' },
  { key: 'maintenance', label: 'Servis' },
  { key: 'tidak_tersedia', label: 'Tidak Tersedia' },
];

const emptyForm: KendaraanFormState = {
  garasi_partner_id: '',
  kategori_id: '',
  tipe_id: '',
  nama_kendaraan: '',
  plat_nomor: '',
  merek: '',
  model: '',
  tahun: new Date().getFullYear(),
  warna: '',
  kapasitas_penumpang: 7,
  harga_sewa_per_hari: '',
  harga_partner_per_hari: '',
  status: 'tersedia',
  catatan: '',
};

const fotoUrl = (foto?: string | null) => (foto ? (foto.startsWith('http') ? foto : `/storage/${foto}`) : null);

const inputClass =
  'w-full rounded-lg border border-black-200 px-3 py-2 text-sm text-black-900 outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500';

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export default function Kendaraan() {
  const toast = useToast();
  const { user } = useAuth();
  const canManageMaster = ['admin_utama', 'admin_operasional'].includes(user?.role ?? '');

  const [items, setItems] = useState<Kendaraan[]>([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<{ current_page: number; last_page: number; total: number } | null>(null);
  const [counts, setCounts] = useState<KendaraanCounts | undefined>(undefined);
  const [garasi, setGarasi] = useState<GarasiPartnerLocal[]>([]);
  const [kategoris, setKategoris] = useState<(KategoriKendaraan & { aktif?: boolean })[]>([]);
  const [tipes, setTipes] = useState<(TipeKendaraan & { aktif?: boolean })[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('semua');
  const [filterKategori, setFilterKategori] = useState('');
  const [filterTipe, setFilterTipe] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Kendaraan | null>(null);
  const [form, setForm] = useState<KendaraanFormState>(emptyForm);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [hapusFoto, setHapusFoto] = useState(false);
  useEffect(() => {
    return () => { if (fotoPreview) URL.revokeObjectURL(fotoPreview); };
  }, [fotoPreview]);
  const [lastAdded, setLastAdded] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<Kendaraan | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmActionState | null>(null);

  const [maintenanceTarget, setMaintenanceTarget] = useState<Kendaraan | null>(null);
  const [maintenanceNote, setMaintenanceNote] = useState('');
  const [maintenanceSubmitting, setMaintenanceSubmitting] = useState(false);

  const [detailItem, setDetailItem] = useState<Kendaraan | null>(null);

  const [quickCreate, setQuickCreate] = useState<'kategori' | 'tipe' | null>(null);

  /* ---------------------------- data loading --------------------------- */

  const load = useCallback(() => {
    setLoading(true);
    kendaraanAPI
      .list({
        search,
        page,
        status: activeTab === 'semua' ? undefined : activeTab,
        kategori_id: filterKategori || undefined,
        tipe_id: filterTipe || undefined,
      })
      .then(({ data }) => {
        const res = data as unknown as {
          data: Kendaraan[];
          current_page: number;
          last_page: number;
          total: number;
          counts?: KendaraanCounts;
        };
        setItems(res.data);
        setCounts(res.counts);
        setMeta({ current_page: res.current_page, last_page: res.last_page, total: res.total });
      })
      .catch(() => toast.error('Gagal memuat data kendaraan'))
      .finally(() => setLoading(false));
    // 'toast' sengaja tidak dimasukkan ke dependency array. Objek `toast` dari
    // context berubah identitas setiap kali toast.success()/error() dipanggil,
    // sehingga kalau dimasukkan ke sini, `load` akan dianggap "berubah" dan
    // memicu useEffect di bawah untuk fetch ulang SEMUA data — persis setelah
    // toast sukses muncul. Itu penyebab data terasa "refresh 2 kali".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, page, activeTab, filterKategori, filterTipe]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search, activeTab, filterKategori, filterTipe]);

  useEffect(() => {
    garasiPartnerAPI
      .list({ include_own: true })
      .then(({ data }) => setGarasi(data.data as unknown as GarasiPartnerLocal[]))
      .catch(() => {});
    // Catatan: /kategoris dan /tipes mengembalikan array LANGSUNG (tidak
    // dibungkus { data: [...] } seperti endpoint lain), jadi di sini pakai
    // `data` apa adanya — bukan `data.data`.
    kategoriAPI
      .list({})
      .then(({ data }) => setKategoris(data as unknown as (KategoriKendaraan & { aktif?: boolean })[]))
      .catch(() => {});
    tipeAPI
      .list({})
      .then(({ data }) => setTipes(data as unknown as (TipeKendaraan & { aktif?: boolean })[]))
      .catch(() => {});
  }, []);

  const handleQuickCreateCreated = (newId: number | string) => {
    if (quickCreate === 'kategori') {
      setField('kategori_id', String(newId));
      setField('tipe_id', '');
    } else if (quickCreate === 'tipe') {
      setField('tipe_id', String(newId));
    }
    setQuickCreate(null);
    kategoriAPI
      .list({})
      .then(({ data }) => setKategoris(data as unknown as (KategoriKendaraan & { aktif?: boolean })[]))
      .catch(() => {});
    tipeAPI
      .list({})
      .then(({ data }) => setTipes(data as unknown as (TipeKendaraan & { aktif?: boolean })[]))
      .catch(() => {});
  };

  /* ------------------------------ derived ------------------------------ */

  const stats = useMemo(
    () => ({
      total: counts?.total ?? meta?.total ?? items.length,
      tersedia: counts?.tersedia ?? items.filter((i) => i.status === 'tersedia').length,
      disewa: counts?.disewa ?? items.filter((i) => i.status === 'disewa').length,
      maintenance: counts?.maintenance ?? items.filter((i) => i.status === 'maintenance').length,
      tidakTersedia: counts?.tidak_tersedia ?? items.filter((i) => i.status === 'tidak_tersedia').length,
    }),
    [counts, items, meta?.total]
  );

  /* ------------------------------ handlers ------------------------------ */

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const hasFile = fotoFile instanceof File;
      if (hasFile) {
        const fd = new FormData();
        Object.entries(form).forEach(([k, v]) => {
          if (v !== '' && v !== null && v !== undefined) fd.append(k, String(v));
        });
        fd.append('foto', fotoFile as File);
        if (editItem) {
          await kendaraanAPI.updateWithFile(Number(editItem.id), fd);
        } else {
          await kendaraanAPI.create(fd);
        }
      } else {
        if (editItem) {
          const payload = { ...(form as unknown as Record<string, unknown>) };
          if (hapusFoto) payload.hapus_foto = true;
          await kendaraanAPI.update(Number(editItem.id), payload);
        } else {
          await kendaraanAPI.create(form as unknown as Record<string, unknown>);
        }
      }
      toast.success(editItem ? 'Kendaraan berhasil diperbarui' : 'Kendaraan berhasil ditambahkan');
      if (editItem) {
        setShowForm(false);
        setEditItem(null);
        setForm(emptyForm);
        setFotoFile(null);
        setFotoPreview(null);
        setHapusFoto(false);
        setLastAdded(false);
      } else {
        setForm({ ...emptyForm, garasi_partner_id: form.garasi_partner_id });
        setFotoFile(null);
        setFotoPreview(null);
        setHapusFoto(false);
        setLastAdded(true);
      }
      load();
    } catch (err) {
      let msg = 'Gagal menyimpan data';
      if (isAxiosError(err)) {
        const errors = err.response?.data?.errors as Record<string, string[]> | undefined;
        msg = err.response?.data?.message || (errors ? Object.values(errors)[0]?.[0] : undefined) || msg;
      }
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item: Kendaraan) => {
    setForm({
      garasi_partner_id: item.garasi_partner_id ? String(item.garasi_partner_id) : '',
      kategori_id: item.kategori_id ? String(item.kategori_id) : '',
      tipe_id: item.tipe_id ? String(item.tipe_id) : '',
      nama_kendaraan: item.nama_kendaraan,
      plat_nomor: item.plat_nomor,
      merek: item.merek || '',
      model: item.model || '',
      tahun: item.tahun || new Date().getFullYear(),
      warna: item.warna,
      kapasitas_penumpang: item.kapasitas_penumpang || 1,
      harga_sewa_per_hari: item.harga_sewa_per_hari,
      harga_partner_per_hari: item.harga_partner_per_hari ?? '',
      status: item.status as StatusKendaraan,
      catatan: item.catatan || '',
    });
    setFotoFile(null);
    setFotoPreview(fotoUrl(item.foto));
    setHapusFoto(false);
    setEditItem(item);
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await kendaraanAPI.delete(Number(confirmDelete.id));
      toast.success('Kendaraan berhasil dihapus');
      load();
    } catch (err) {
      const msg = isAxiosError(err) ? err.response?.data?.message : undefined;
      toast.error(msg || 'Gagal menghapus kendaraan');
    }
    setConfirmDelete(null);
  };

  const handleStatusChange = async (id: number, status: StatusKendaraan, catatan?: string) => {
    try {
      const payload: { status: StatusKendaraan; catatan?: string } = { status };
      if (catatan !== undefined) payload.catatan = catatan;
      await kendaraanAPI.update(id, payload);
      // Update state lokal pakai NILAI YANG KITA KIRIM SENDIRI, bukan dari
      // response API. Ini lebih aman karena tidak bergantung pada bentuk
      // response backend (misalnya kalau ternyata tidak dibungkus { data: {...} }
      // seperti endpoint lain) — kalau request ini tidak melempar error,
      // berarti perubahan sudah berhasil tersimpan di server.
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status, ...(catatan !== undefined ? { catatan } : {}) } : item
        )
      );
      toast.success(`Status kendaraan diubah menjadi "${vehicleStatusLabels[status]}"`);
      return true;
    } catch (err) {
      console.error('Gagal mengubah status kendaraan:', err);
      let msg = 'Gagal mengubah status kendaraan';
      if (isAxiosError(err)) {
        const errors = err.response?.data?.errors as Record<string, string[]> | undefined;
        msg = err.response?.data?.message || (errors ? Object.values(errors)[0]?.[0] : undefined) || msg;
      }
      toast.error(msg);
      return false;
    }
  };

  // Menambahkan catatan servis baru di bawah catatan lama (bukan menimpa),
  // supaya riwayat alasan servis sebelumnya tidak hilang.
  const composeMaintenanceCatatan = (item: Kendaraan, note: string) => {
    const trimmed = note.trim();
    if (!trimmed) return undefined;
    const stamp = new Date().toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const entry = `[Servis ${stamp}] ${trimmed}`;
    return item.catatan ? `${item.catatan}\n${entry}` : entry;
  };

  const handleEnterMaintenance = async () => {
    if (!maintenanceTarget) return;
    setMaintenanceSubmitting(true);
    const ok = await handleStatusChange(maintenanceTarget.id, 'maintenance', composeMaintenanceCatatan(maintenanceTarget, maintenanceNote));
    setMaintenanceSubmitting(false);
    if (ok) {
      setMaintenanceTarget(null);
      setMaintenanceNote('');
    }
  };

  /* ── 3 aksi cepat status di tiap card ── */
  const handleQuickStatus = (item: Kendaraan, target: StatusKendaraan) => {
    if (item.status === target) return; // sudah di status itu, tidak perlu apa-apa

    if (target === 'maintenance') {
      setMaintenanceTarget(item);
      setMaintenanceNote('');
      return;
    }

    if (target === 'tersedia') {
      setConfirmAction({
        title: 'Tandai Tersedia',
        message: `Ubah status "${item.nama_kendaraan}" menjadi Tersedia? Pastikan kendaraan benar-benar sudah kembali secara fisik ke garasi.`,
        confirmLabel: 'Tandai Tersedia',
        danger: false,
        onConfirm: () => handleStatusChange(item.id, 'tersedia'),
      });
      return;
    }

    // target === 'tidak_tersedia'
    setConfirmAction({
      title: 'Tandai Tidak Tersedia',
      message: `Tandai "${item.nama_kendaraan}" sebagai Tidak Tersedia? Kendaraan tidak akan muncul sebagai pilihan saat membuat booking baru.`,
      confirmLabel: 'Tandai Tidak Tersedia',
      danger: true,
      onConfirm: () => handleStatusChange(item.id, 'tidak_tersedia'),
    });
  };

  const setField = <K extends keyof KendaraanFormState>(key: K, value: KendaraanFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const openAddForm = () => {
    setForm(emptyForm);
    setEditItem(null);
    setFotoFile(null);
    setFotoPreview(null);
    setHapusFoto(false);
    setLastAdded(false);
    setShowForm(true);
  };

  /* -------------------------------- render ------------------------------- */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-black-900 via-black-800 to-primary-700 p-6 text-white shadow-sm">
        <div>
          <h1 className="font-display text-2xl font-bold">Manajemen Armada</h1>
          <p className="mt-1 text-sm text-black-200">Kelola data kendaraan, tarif, dan status ketersediaan</p>
        </div>
        <button
          onClick={openAddForm}
          className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-primary-600 shadow-sm transition-colors hover:bg-black-200"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tambah Kendaraan
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatCard
          label="Total Unit"
          value={stats.total}
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 11l1.5-5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.4L21 11M3 11h18M3 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-6"
              />
            </svg>
          }
          iconClass="bg-black-700"
        />
        <StatCard
          label="Tersedia"
          value={stats.tersedia}
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
            </svg>
          }
          iconClass="bg-success-500"
        />
        <StatCard
          label="Disewa"
          value={stats.disewa}
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 17h.01M16 17h.01M3 11l1.5-5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.4L21 11M3 11h18M3 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-6"
              />
            </svg>
          }
          iconClass="bg-primary-500"
        />
        <StatCard
          label="Dalam Servis"
          value={stats.maintenance}
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          }
          iconClass="bg-accent-500"
        />
        <StatCard
          label="Tidak Tersedia"
          value={stats.tidakTersedia}
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
          iconClass="bg-error-500"
        />
      </div>

      {/* Search + filter tabs */}
      <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black-200">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div className="relative w-full max-w-md">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Cari nama, plat, merek, tipe..."
              value={search}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              className={`${inputClass} pl-10`}
            />
          </div>
          <div className="flex items-center gap-1 self-start rounded-lg bg-canvas p-1 md:self-auto">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === tab.key ? 'bg-white text-primary-600 shadow-sm' : 'text-black-400 hover:text-black-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
          <select
            value={filterKategori}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => {
              setFilterKategori(e.target.value);
              setFilterTipe('');
            }}
            className={`${inputClass} w-auto py-1.5`}
          >
            <option value="">Semua Kategori</option>
            {kategoris
              .filter((k) => k.aktif !== false)
              .map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama_kategori}
                </option>
              ))}
          </select>
          <select
            value={filterTipe}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilterTipe(e.target.value)}
            disabled={!filterKategori}
            className={`${inputClass} w-auto py-1.5 disabled:bg-canvas disabled:text-black-400`}
          >
            <option value="">{filterKategori ? 'Semua Tipe' : 'Pilih kategori dulu'}</option>
            {tipes
              .filter((t) => t.aktif !== false && t.kategori_id?.toString() === filterKategori)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nama_tipe}
                </option>
              ))}
          </select>
          {(filterKategori || filterTipe) && (
            <button
              onClick={() => {
                setFilterKategori('');
                setFilterTipe('');
              }}
              className="rounded-md p-2 text-black-400 transition hover:bg-canvas hover:text-black-700"
              title="Reset Filter"
            >
              <RotateCcw size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Form Modal (Tambah / Edit) */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-black/50 p-4"
          onClick={() => {
            setShowForm(false);
            setEditItem(null);
          }}
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-black-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-black-900">{editItem ? 'Edit Kendaraan' : 'Tambah Kendaraan'}</h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditItem(null);
                }}
                className="rounded-lg p-1 transition-colors hover:bg-canvas"
                aria-label="Tutup"
              >
                <svg className="h-5 w-5 text-black-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              {lastAdded && !editItem && (
                <div className="flex items-center justify-between rounded-lg border border-accent-500/30 bg-accent-50 p-3">
                  <div className="flex items-center gap-2">
                    <svg className="h-5 w-5 text-accent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm font-medium text-accent-600">Kendaraan berhasil ditambahkan!</span>
                  </div>
                  <button type="button" onClick={() => setLastAdded(false)} className="text-sm font-medium text-accent-600 underline hover:text-accent-500">
                    Sembunyikan
                  </button>
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-black-700">Garasi *</label>
                  <select
                    value={form.garasi_partner_id}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => setField('garasi_partner_id', e.target.value)}
                    required
                    className={inputClass}
                  >
                    <option value="">Pilih Garasi</option>
                    {garasi.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.nama_garasi}
                        {g.status_aktif === false ? ' (nonaktif)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-black-700">Kategori</label>
                  <select
                    value={form.kategori_id}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                      setField('kategori_id', e.target.value);
                      setField('tipe_id', '');
                    }}
                    className={inputClass}
                  >
                    <option value="">Pilih Kategori</option>
                    {kategoris
                      .filter((k) => k.aktif !== false)
                      .map((k) => (
                        <option key={k.id} value={k.id}>
                          {k.nama_kategori}
                        </option>
                      ))}
                  </select>
                  {canManageMaster && (
                    <button
                      type="button"
                      onClick={() => setQuickCreate('kategori')}
                      className="mt-1.5 flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      Kategori Baru
                    </button>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-black-700">Nama Kendaraan *</label>
                  <input
                    type="text"
                    value={form.nama_kendaraan}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setField('nama_kendaraan', e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-black-700">Plat Nomor *</label>
                  <input
                    type="text"
                    value={form.plat_nomor}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setField('plat_nomor', e.target.value)}
                    required
                    className={`${inputClass} font-mono uppercase`}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-black-700">Tipe Kendaraan</label>
                  <select
                    value={form.tipe_id}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => setField('tipe_id', e.target.value)}
                    disabled={!form.kategori_id}
                    className={`${inputClass} disabled:bg-canvas disabled:text-black-400`}
                  >
                    <option value="">{form.kategori_id ? 'Pilih Tipe' : 'Pilih kategori dulu'}</option>
                    {tipes
                      .filter((t) => t.aktif !== false && t.kategori_id?.toString() === form.kategori_id)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nama_tipe}
                        </option>
                      ))}
                  </select>
                  {canManageMaster && (
                    <button
                      type="button"
                      onClick={() => setQuickCreate('tipe')}
                      disabled={!form.kategori_id}
                      className="mt-1.5 flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors disabled:text-black-300 disabled:cursor-not-allowed"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      Tipe Baru
                    </button>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-black-700">Merek *</label>
                  <input
                    type="text"
                    value={form.merek}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setField('merek', e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-black-700">Model *</label>
                  <input
                    type="text"
                    value={form.model}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setField('model', e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-black-700">Tahun *</label>
                  <input
                    type="number"
                    value={form.tahun}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setField('tahun', Number(e.target.value))}
                    required
                    min={1990}
                    max={new Date().getFullYear() + 1}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-black-700">Warna *</label>
                  <input
                    type="text"
                    value={form.warna}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setField('warna', e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-black-700">Kapasitas *</label>
                  <input
                    type="number"
                    value={form.kapasitas_penumpang}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setField('kapasitas_penumpang', Number(e.target.value))}
                    required
                    min={1}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-black-700">Harga/Hari (Rp) *</label>
                  <input
                    type="number"
                    value={form.harga_sewa_per_hari}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setField('harga_sewa_per_hari', e.target.value)}
                    required
                    min={1}
                    className={inputClass}
                  />
                </div>
                {form.garasi_partner_id && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-black-700">
                      Harga Beli/Hari (Rp) <span className="text-error-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={form.harga_partner_per_hari}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setField('harga_partner_per_hari', e.target.value)}
                      required
                      min={1}
                      className={inputClass}
                    />
                    <p className="mt-1 text-xs text-black-400">Harga yang dibayar ke garasi partner per hari</p>
                    {form.harga_sewa_per_hari && form.harga_partner_per_hari && (
                      <p className="mt-1.5 text-sm font-medium text-accent-600">
                        Margin: {formatRupiah(Number(form.harga_sewa_per_hari) - Number(form.harga_partner_per_hari))}/hari
                        ({(Math.round(((Number(form.harga_sewa_per_hari) - Number(form.harga_partner_per_hari)) / Number(form.harga_sewa_per_hari)) * 100))}%)
                      </p>
                    )}
                  </div>
                )}
                {editItem && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-black-700">Status *</label>
                    <select
                      value={form.status}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) => setField('status', e.target.value as StatusKendaraan)}
                      disabled={editItem.status === 'disewa'}
                      required
                      className={`${inputClass} ${editItem.status === 'disewa' ? 'cursor-not-allowed bg-canvas text-black-400' : ''}`}
                    >
                      {VEHICLE_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {vehicleStatusLabels[s]}
                        </option>
                      ))}
                    </select>
                    {editItem.status === 'disewa' && (
                      <p className="mt-1 text-xs text-accent-600">Status dikendalikan oleh order aktif. Selesaikan atau batalkan order terlebih dahulu.</p>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-black-700">Foto Kendaraan</label>
                <div className="flex items-start gap-4">
                  <label className="flex flex-1 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-black-200 px-4 py-6 transition-colors hover:border-primary-400 hover:bg-primary-50/50">
                    <div className="text-center">
                      <svg className="mx-auto mb-1 h-8 w-8 text-black-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <p className="text-xs text-black-400">{fotoFile ? fotoFile.name : 'Klik atau seret foto ke sini'}</p>
                      <p className="mt-0.5 text-xs text-black-400">JPG, PNG, maks 2MB</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          const err = fotoFileError(f);
                          if (err) {
                            toast.error(err);
                            e.target.value = '';
                            return;
                          }
                          setFotoFile(f);
                          setFotoPreview(URL.createObjectURL(f));
                          setHapusFoto(false);
                        }
                      }}
                    />
                  </label>
                  {editItem?.foto && !fotoFile && !hapusFoto && (
                    <div className="flex shrink-0 flex-col items-center gap-1">
                      <img src={fotoUrl(editItem.foto)} alt="Foto lama" className="h-24 w-24 rounded-lg border border-black-200 object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setFotoPreview(null);
                          setHapusFoto(true);
                        }}
                        className="text-xs font-medium text-error-600 underline-offset-2 hover:underline"
                      >
                        Hapus Foto
                      </button>
                    </div>
                  )}
                  {editItem?.foto && hapusFoto && !fotoFile && (
                    <div className="flex shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-error-300 bg-error-50 px-3 py-2">
                      <span className="text-xs text-error-600">Foto lama akan dihapus</span>
                      <button
                        type="button"
                        onClick={() => setHapusFoto(false)}
                        className="text-xs font-medium text-black-700 underline-offset-2 hover:underline"
                      >
                        Urungkan
                      </button>
                    </div>
                  )}
                  {fotoPreview && (
                    <div className="relative shrink-0">
                      <img src={fotoPreview} alt="Preview" className="h-24 w-24 rounded-lg border border-black-200 object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setFotoFile(null);
                          setFotoPreview(null);
                          if (editItem?.foto) setHapusFoto(true);
                        }}
                        className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-error-500 text-white transition-colors hover:bg-error-600"
                        aria-label="Hapus foto"
                      >
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-black-700">Catatan</label>
                <textarea
                  value={form.catatan}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setField('catatan', e.target.value)}
                  rows={2}
                  className={`${inputClass} resize-none`}
                />
              </div>
              <div className="flex justify-end gap-3 border-t border-black-200 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditItem(null);
                    setHapusFoto(false);
                    setLastAdded(false);
                  }}
                  className="rounded-lg border border-black-200 px-4 py-2 text-sm font-medium text-black-700 transition-colors hover:bg-canvas"
                >
                  Batal
                </button>
                {lastAdded && !editItem ? (
                  <button
                    type="button"
                    onClick={() => setLastAdded(false)}
                    className="flex items-center gap-2 rounded-lg bg-success-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-success-600"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Tambah Kendaraan Lainnya
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
                  >
                    {submitting && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                    {editItem ? 'Simpan' : 'Tambah'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal — foto besar di kiri, detail di kanan */}
      {detailItem && (
        <div className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-black/50 p-4" onClick={() => setDetailItem(null)}>
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-black-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-black-900">Detail Kendaraan</h2>
              <button onClick={() => setDetailItem(null)} className="rounded-lg p-1 transition-colors hover:bg-canvas" aria-label="Tutup">
                <svg className="h-5 w-5 text-black-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col gap-6 p-6 sm:flex-row">
              {/* Foto — besar, di kiri */}
              <div className="shrink-0 sm:w-64">
                {fotoUrl(detailItem.foto) ? (
                  <img
                    src={fotoUrl(detailItem.foto) as string}
                    alt={detailItem.nama_kendaraan}
                    className={`aspect-square w-full rounded-xl border border-black-200 object-cover sm:h-64 sm:w-64 ${statusPhotoClass(detailItem.status)}`}
                  />
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-canvas sm:h-64 sm:w-64">
                    <svg className="h-14 w-14 text-black-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M8 17h.01M16 17h.01M3 11l1.5-5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.4L21 11M3 11h18M3 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-6"
                      />
                    </svg>
                  </div>
                )}
                <span
                  className={`mt-3 inline-block w-full rounded-full px-2 py-1.5 text-center text-xs font-medium ${vehicleStatusStyles[detailItem.status as StatusKendaraan]}`}
                >
                  {vehicleStatusLabels[detailItem.status as StatusKendaraan]}
                </span>
              </div>

              {/* Detail — di kanan */}
              <div className="flex-1 space-y-4">
                <div>
                  <div className="text-lg font-semibold text-black-900">{detailItem.nama_kendaraan}</div>
                  <div className="text-sm text-black-400">
                    {detailItem.merek} {detailItem.model} · {detailItem.tahun}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <DetailField label="Plat Nomor" value={detailItem.plat_nomor} mono />
                  <DetailField label="Warna" value={detailItem.warna} />
                  <DetailField label="Kategori" value={detailItem.kategori?.nama_kategori || '-'} />
                  <DetailField label="Tipe" value={detailItem.tipe?.nama_tipe || '-'} />
                  <DetailField label="Kapasitas" value={`${detailItem.kapasitas_penumpang} orang`} />
                  <DetailField label="Tarif/Hari" value={formatRupiah(detailItem.harga_sewa_per_hari)} />
                  <DetailField label="Lokasi / Garasi" value={detailItem.garasi_partner?.nama_partner || '-'} full />
                  {detailItem.catatan && <DetailField label="Catatan" value={detailItem.catatan} full />}
                </div>

                <div className="flex justify-end gap-3 border-t border-black-200 pt-4">
                  <button
                    onClick={() => setDetailItem(null)}
                    className="rounded-lg border border-black-200 px-4 py-2 text-sm font-medium text-black-700 transition-colors hover:bg-canvas"
                  >
                    Tutup
                  </button>
                  <button
                    onClick={() => {
                      const item = detailItem;
                      setDetailItem(null);
                      handleEdit(item);
                    }}
                    className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600"
                  >
                    Edit Kendaraan
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!confirmDelete}
        title="Hapus Kendaraan"
        message={`Yakin ingin menghapus "${confirmDelete?.nama_kendaraan}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      <ConfirmModal
        open={!!confirmAction}
        title={confirmAction?.title || 'Konfirmasi'}
        message={confirmAction?.message || ''}
        confirmLabel={confirmAction?.confirmLabel || 'Konfirmasi'}
        danger={confirmAction?.danger ?? false}
        onConfirm={async () => {
          if (confirmAction?.onConfirm) await confirmAction.onConfirm();
          setConfirmAction(null);
        }}
        onCancel={() => setConfirmAction(null)}
      />

      <ConfirmModal
        open={!!maintenanceTarget}
        title="Masuk ke Servis"
        message={`Ubah status "${maintenanceTarget?.nama_kendaraan}" menjadi Servis? Kendaraan tidak akan bisa disewa selama dalam status ini.`}
        confirmLabel={maintenanceSubmitting ? 'Menyimpan...' : 'Masukkan Servis'}
        danger
        onConfirm={handleEnterMaintenance}
        onCancel={() => {
          setMaintenanceTarget(null);
          setMaintenanceNote('');
        }}
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-black-700">
            Catatan servis <span className="font-normal text-black-400">(opsional)</span>
          </label>
          <textarea
            value={maintenanceNote}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setMaintenanceNote(e.target.value)}
            rows={3}
            placeholder="Contoh: ganti oli & servis rutin 10.000 km, rem belakang aus, dll."
            className={`${inputClass} resize-none`}
          />
        </div>
      </ConfirmModal>

      {quickCreate && (
        <KategoriTipeQuickCreate
          mode={quickCreate}
          kategoriId={form.kategori_id}
          kategoriName={
            quickCreate === 'tipe'
              ? kategoris.find((k) => k.id?.toString() === form.kategori_id)?.nama_kategori
              : undefined
          }
          onClose={() => setQuickCreate(null)}
          onCreated={handleQuickCreateCreated}
        />
      )}

      {/* Grid Card Kendaraan */}
      {loading ? (
        <div className="rounded-2xl bg-white p-12 text-center shadow-sm ring-1 ring-black-200">
          <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          <p className="text-sm text-black-400">Memuat data...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center shadow-sm ring-1 ring-black-200">
          <svg className="mx-auto mb-3 h-12 w-12 text-black-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 17h.01M16 17h.01M3 11l1.5-5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.4L21 11M3 11h18M3 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-6"
            />
          </svg>
          {search || filterKategori || filterTipe || activeTab !== 'semua' ? (
            <>
              <p className="font-medium text-black-700">Tidak ada kendaraan yang cocok</p>
              <p className="mt-1 text-sm text-black-400">Coba ubah kata kunci atau saringan yang dipilih</p>
            </>
          ) : (
            <>
              <p className="font-medium text-black-700">Tidak ada data kendaraan</p>
              <p className="mt-1 text-sm text-black-400">Mulai dengan menambahkan kendaraan baru</p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => setDetailItem(item)}
              className="cursor-pointer overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black-200 transition-all hover:shadow-md"
            >
              {/* Foto + badge status + tombol edit/hapus */}
              <div className="relative aspect-[4/3] bg-canvas">
                {fotoUrl(item.foto) ? (
                  <img src={fotoUrl(item.foto) as string} alt={item.nama_kendaraan} className={`h-full w-full object-cover ${statusPhotoClass(item.status)}`} />
                ) : (
                  <div className={`flex h-full w-full items-center justify-center ${statusPhotoClass(item.status)}`}>
                    <svg className="h-10 w-10 text-black-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M8 17h.01M16 17h.01M3 11l1.5-5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.4L21 11M3 11h18M3 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-6"
                      />
                    </svg>
                  </div>
                )}
                <span className={`absolute left-2.5 top-2.5 rounded-full px-2.5 py-1 text-xs font-semibold ${vehicleStatusStyles[item.status as StatusKendaraan]}`}>
                  {vehicleStatusLabels[item.status as StatusKendaraan]}
                </span>
                <div className="absolute right-2.5 top-2.5 flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleEdit(item)}
                    className="rounded-lg bg-white/90 p-1.5 text-black-700 shadow-sm backdrop-blur transition-colors hover:bg-white hover:text-primary-600"
                    title="Edit"
                    aria-label="Edit kendaraan"
                  >
                    <Pencil size={14} />
                  </button>
                  {item.status !== 'disewa' && (
                    <button
                      onClick={() => setConfirmDelete(item)}
                      className="rounded-lg bg-white/90 p-1.5 text-black-700 shadow-sm backdrop-blur transition-colors hover:bg-white hover:text-error-600"
                      title="Hapus"
                      aria-label="Hapus kendaraan"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="truncate font-semibold text-black-900">
                    {item.nama_kendaraan}
                  </p>
                  <span className="shrink-0 rounded-md bg-black-900 px-2 py-0.5 font-mono text-xs font-semibold tracking-wide text-white">
                    {item.plat_nomor}
                  </span>
                </div>
                <p className="mb-2 truncate text-xs text-black-400">{item.merek} {item.model} · {item.tahun}</p>

                <div className="mb-3 flex flex-wrap gap-1.5 text-xs text-black-400">
                  {item.kategori?.nama_kategori && <span className="rounded-full bg-canvas px-2 py-0.5">{item.kategori.nama_kategori}</span>}
                  {item.tipe?.nama_tipe && <span className="rounded-full bg-canvas px-2 py-0.5">{item.tipe.nama_tipe}</span>}
                  {item.garasi_partner?.nama_partner && (
                    <>
                      <span className="rounded-full bg-canvas px-2 py-0.5">{item.garasi_partner.nama_partner}</span>
                      {canManageMaster && item.harga_partner_per_hari && item.margin_per_hari !== null && item.margin_per_hari !== undefined && (
                        <span className="rounded-full bg-accent-50 text-accent-700 px-2 py-0.5 font-medium flex items-center gap-1">
                          <span className="text-[10px]">💰</span>
                          Margin: {formatRupiah(item.margin_per_hari)} ({item.margin_persen}%)
                        </span>
                      )}
                    </>
                  )}
                  {item.warna && (
                    <span className="flex items-center gap-1.5 rounded-full bg-canvas px-2 py-0.5">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full border border-black-200"
                        style={{ backgroundColor: warnaKendaraanHex(item.warna) || '#E5E7EB' }}
                      />
                      {item.warna}
                    </span>
                  )}
                </div>

                <p className="mb-3 text-sm font-bold text-primary-600">{formatRupiah(item.harga_sewa_per_hari)}/hari</p>

                {/* 3 aksi cepat status */}
                <div className="grid grid-cols-3 gap-1.5 border-t border-black-200 pt-3" onClick={(e) => e.stopPropagation()}>
                  <QuickStatusButton
                    label="Tersedia"
                    active={item.status === 'tersedia'}
                    activeClass="bg-success-500 text-white"
                    onClick={() => handleQuickStatus(item, 'tersedia')}
                  />
                  <QuickStatusButton
                    label="Tidak Tersedia"
                    active={item.status === 'tidak_tersedia'}
                    activeClass="bg-error-500 text-white"
                    onClick={() => handleQuickStatus(item, 'tidak_tersedia')}
                  />
                  <QuickStatusButton
                    label="Servis"
                    active={item.status === 'maintenance'}
                    activeClass="bg-accent-500 text-white"
                    onClick={() => handleQuickStatus(item, 'maintenance')}
                  />
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDetailItem(item);
                  }}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium text-black-400 transition-colors hover:bg-canvas hover:text-black-700"
                >
                  <Eye size={13} />
                  Lihat Detail
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {meta && meta.last_page > 1 && (
        <nav className="flex items-center justify-center gap-2" aria-label="Paginasi">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-2 text-sm font-medium border border-black-200 rounded-lg hover:bg-canvas disabled:opacity-40 transition-colors"
          >
            Sebelumnya
          </button>
          <span className="text-sm text-black-600 px-3">
            Halaman {page} dari {meta.last_page}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
            disabled={page === meta.last_page}
            className="px-3 py-2 text-sm font-medium border border-black-200 rounded-lg hover:bg-canvas disabled:opacity-40 transition-colors"
          >
            Selanjutnya
          </button>
        </nav>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Small presentational helpers                                       */
/* ------------------------------------------------------------------ */

function StatCard({ label, value, icon, iconClass }: { label: string; value: number; icon: ReactNode; iconClass: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-black-200">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white ${iconClass}`}>{icon}</div>
      <div>
        <div className="text-xs text-black-400">{label}</div>
        <div className="text-xl font-bold text-black-900">{value}</div>
      </div>
    </div>
  );
}

function DetailField({ label, value, mono, full }: { label: string; value: string; mono?: boolean; full?: boolean }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <div className="mb-0.5 text-xs text-black-400">{label}</div>
      <div className={`text-sm text-black-900 ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  );
}

function QuickStatusButton({
  label,
  active,
  activeClass,
  onClick,
}: {
  label: string;
  active: boolean;
  activeClass: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={active}
      title={active ? `Sudah berstatus ${label}` : `Tandai sebagai ${label}`}
      className={`rounded-lg px-1.5 py-1.5 text-[11px] font-medium leading-tight transition-colors ${
        active ? `${activeClass} cursor-default` : 'bg-canvas text-black-400 hover:bg-accent-100 hover:text-black-700'
      }`}
    >
      {label}
    </button>
  );
}