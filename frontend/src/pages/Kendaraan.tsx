import { useState, useEffect, useCallback, useMemo, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { isAxiosError } from 'axios';
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
import ConfirmModal from '../components/ConfirmModal';
import { RotateCcw, Pencil, Trash2, Eye } from 'lucide-react';

export type StatusKendaraan = 'tersedia' | 'disewa' | 'maintenance';

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

/* ------------------------------------------------------------------ */
/* Constants                                                          */
/* ------------------------------------------------------------------ */


const statusStyles: Record<StatusKendaraan, string> = {
  tersedia: 'bg-avail-50 text-avail-600',
  disewa: 'bg-rented-50 text-rented-500',
  maintenance: 'bg-amber-100 text-amber-800',
};

const statusLabels: Record<StatusKendaraan, string> = {
  tersedia: 'Tersedia',
  disewa: 'Disewa',
  maintenance: 'Servis',
};

const filterTabs: { key: FilterTab; label: string }[] = [
  { key: 'semua', label: 'Semua' },
  { key: 'tersedia', label: 'Tersedia' },
  { key: 'disewa', label: 'Disewa' },
  { key: 'maintenance', label: 'Servis' },
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
  status: 'tersedia',
  catatan: '',
};

const formatRupiah = (value: number | string) => `Rp ${Number(value || 0).toLocaleString('id-ID')}`;

const fotoUrl = (foto?: string | null) => (foto ? (foto.startsWith('http') ? foto : `/storage/${foto}`) : null);

const inputClass =
  'w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-900 outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500';

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export default function Kendaraan() {
  const toast = useToast();

  const [items, setItems] = useState<Kendaraan[]>([]);
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
  const [lastAdded, setLastAdded] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<Kendaraan | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmActionState | null>(null);

  const [maintenanceTarget, setMaintenanceTarget] = useState<Kendaraan | null>(null);
  const [maintenanceNote, setMaintenanceNote] = useState('');
  const [maintenanceSubmitting, setMaintenanceSubmitting] = useState(false);

  const [detailItem, setDetailItem] = useState<Kendaraan | null>(null);

  /* ---------------------------- data loading --------------------------- */

  const load = useCallback(() => {
    setLoading(true);
    kendaraanAPI
      .list({ search })
      .then(({ data }) => setItems(data.data as Kendaraan[]))
      .catch(() => toast.error('Gagal memuat data kendaraan'))
      .finally(() => setLoading(false));
  }, [search, toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    garasiPartnerAPI
      .list({})
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

  /* ------------------------------ derived ------------------------------ */

  const stats = useMemo(
    () => ({
      total: items.length,
      tersedia: items.filter((i) => i.status === 'tersedia').length,
      disewa: items.filter((i) => i.status === 'disewa').length,
      maintenance: items.filter((i) => i.status === 'maintenance').length,
    }),
    [items]
  );

  const filteredItems = useMemo(
    () =>
      items.filter(
        (i) =>
          (activeTab === 'semua' || i.status === activeTab) &&
          (!filterKategori || i.kategori_id?.toString() === filterKategori) &&
          (!filterTipe || i.tipe_id?.toString() === filterTipe)
      ),
    [items, activeTab, filterKategori, filterTipe]
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
          await kendaraanAPI.update(Number(editItem.id), fd);
        } else {
          await kendaraanAPI.create(fd);
        }
      } else {
        if (editItem) {
          await kendaraanAPI.update(Number(editItem.id), form as unknown as Record<string, unknown>);
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
        setLastAdded(false);
      } else {
        setForm({ ...emptyForm, garasi_partner_id: form.garasi_partner_id });
        setFotoFile(null);
        setFotoPreview(null);
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
      status: item.status as StatusKendaraan,
      catatan: item.catatan || '',
    });
    setFotoFile(null);
    setFotoPreview(fotoUrl(item.foto));
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
      toast.success(`Status kendaraan diubah menjadi "${statusLabels[status]}"`);
      load();
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

    // target === 'disewa' (Tidak Tersedia)
    setConfirmAction({
      title: 'Tandai Tidak Tersedia',
      message: `Tandai "${item.nama_kendaraan}" sebagai Tidak Tersedia? Kendaraan tidak akan muncul sebagai pilihan saat membuat booking baru.`,
      confirmLabel: 'Tandai Tidak Tersedia',
      danger: true,
      onConfirm: () => handleStatusChange(item.id, 'disewa'),
    });
  };

  const setField = <K extends keyof KendaraanFormState>(key: K, value: KendaraanFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const openAddForm = () => {
    setForm(emptyForm);
    setEditItem(null);
    setFotoFile(null);
    setFotoPreview(null);
    setLastAdded(false);
    setShowForm(true);
  };

  /* -------------------------------- render ------------------------------- */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-ink-900 via-ink-800 to-brand-700 p-6 text-white shadow-sm">
        <div>
          <h1 className="font-display text-2xl font-bold">Manajemen Armada</h1>
          <p className="mt-1 text-sm text-ink-200">Kelola data kendaraan, tarif, dan status ketersediaan</p>
        </div>
        <button
          onClick={openAddForm}
          className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-brand-600 shadow-sm transition-colors hover:bg-ink-200"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tambah Kendaraan
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
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
          iconClass="bg-ink-700"
        />
        <StatCard
          label="Tersedia"
          value={stats.tersedia}
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
            </svg>
          }
          iconClass="bg-avail-500"
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
          iconClass="bg-rented-500"
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
          iconClass="bg-amber-500"
        />
      </div>

      {/* Search + filter tabs */}
      <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-ink-200">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div className="relative w-full max-w-md">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Cari plat, model, tipe, atau lokasi..."
              value={search}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              className={`${inputClass} pl-10`}
            />
          </div>
          <div className="flex items-center gap-1 self-start rounded-lg bg-gray-50 p-1 md:self-auto">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === tab.key ? 'bg-white text-brand-600 shadow-sm' : 'text-ink-400 hover:text-ink-700'
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
            className={`${inputClass} w-auto py-1.5 disabled:bg-gray-50 disabled:text-ink-400`}
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
              className="rounded-md p-2 text-ink-400 transition hover:bg-gray-50 hover:text-ink-700"
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
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-ink-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-ink-900">{editItem ? 'Edit Kendaraan' : 'Tambah Kendaraan'}</h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditItem(null);
                }}
                className="rounded-lg p-1 transition-colors hover:bg-gray-50"
                aria-label="Tutup"
              >
                <svg className="h-5 w-5 text-ink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              {lastAdded && !editItem && (
                <div className="flex items-center justify-between rounded-lg border border-avail-500/30 bg-avail-50 p-3">
                  <div className="flex items-center gap-2">
                    <svg className="h-5 w-5 text-avail-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm font-medium text-avail-600">Kendaraan berhasil ditambahkan!</span>
                  </div>
                  <button type="button" onClick={() => setLastAdded(false)} className="text-sm font-medium text-avail-600 underline hover:text-avail-500">
                    Sembunyikan
                  </button>
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">Garasi Partner *</label>
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
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">Kategori</label>
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
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">Nama Kendaraan *</label>
                  <input
                    type="text"
                    value={form.nama_kendaraan}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setField('nama_kendaraan', e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">Plat Nomor *</label>
                  <input
                    type="text"
                    value={form.plat_nomor}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setField('plat_nomor', e.target.value)}
                    required
                    className={`${inputClass} font-mono uppercase`}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">Tipe Kendaraan</label>
                  <select
                    value={form.tipe_id}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => setField('tipe_id', e.target.value)}
                    disabled={!form.kategori_id}
                    className={`${inputClass} disabled:bg-gray-50 disabled:text-ink-400`}
                  >
                    <option value="">{form.kategori_id ? 'Pilih Tipe' : 'Pilih kategori dulu'}</option>
                    {tipes
                      .filter((t) => t.aktif !== false)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nama_tipe}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">Merek *</label>
                  <input
                    type="text"
                    value={form.merek}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setField('merek', e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">Model *</label>
                  <input
                    type="text"
                    value={form.model}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setField('model', e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">Tahun *</label>
                  <input
                    type="number"
                    value={form.tahun}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setField('tahun', Number(e.target.value))}
                    required
                    min={1990}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">Warna *</label>
                  <input
                    type="text"
                    value={form.warna}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setField('warna', e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">Kapasitas *</label>
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
                  <label className="mb-1 block text-sm font-medium text-ink-700">Harga/Hari (Rp) *</label>
                  <input
                    type="number"
                    value={form.harga_sewa_per_hari}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setField('harga_sewa_per_hari', e.target.value)}
                    required
                    min={0}
                    className={inputClass}
                  />
                </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-ink-700">Foto Kendaraan</label>
                <div className="flex items-start gap-4">
                  <label className="flex flex-1 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-ink-200 px-4 py-6 transition-colors hover:border-brand-400 hover:bg-brand-50/50">
                    <div className="text-center">
                      <svg className="mx-auto mb-1 h-8 w-8 text-ink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <p className="text-xs text-ink-400">{fotoFile ? fotoFile.name : 'Klik atau seret foto ke sini'}</p>
                      <p className="mt-0.5 text-xs text-ink-400">JPG, PNG, maks 2MB</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          setFotoFile(f);
                          setFotoPreview(URL.createObjectURL(f));
                        }
                      }}
                    />
                  </label>
                  {fotoPreview && (
                    <div className="relative shrink-0">
                      <img src={fotoPreview} alt="Preview" className="h-24 w-24 rounded-lg border border-ink-200 object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setFotoFile(null);
                          setFotoPreview(null);
                        }}
                        className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-maint-500 text-white transition-colors hover:bg-maint-600"
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
                <label className="mb-1 block text-sm font-medium text-ink-700">Catatan</label>
                <textarea
                  value={form.catatan}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setField('catatan', e.target.value)}
                  rows={2}
                  className={`${inputClass} resize-none`}
                />
              </div>
              <div className="flex justify-end gap-3 border-t border-ink-200 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditItem(null);
                    setLastAdded(false);
                  }}
                  className="rounded-lg border border-ink-200 px-4 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-gray-50"
                >
                  Batal
                </button>
                {lastAdded && !editItem ? (
                  <button
                    type="button"
                    onClick={() => setLastAdded(false)}
                    className="flex items-center gap-2 rounded-lg bg-avail-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-avail-600"
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
                    className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
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
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-ink-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-ink-900">Detail Kendaraan</h2>
              <button onClick={() => setDetailItem(null)} className="rounded-lg p-1 transition-colors hover:bg-gray-50" aria-label="Tutup">
                <svg className="h-5 w-5 text-ink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    className="aspect-square w-full rounded-xl border border-ink-200 object-cover sm:h-64 sm:w-64"
                  />
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-gray-50 sm:h-64 sm:w-64">
                    <svg className="h-14 w-14 text-ink-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  className={`mt-3 inline-block w-full rounded-full px-2 py-1.5 text-center text-xs font-medium ${statusStyles[detailItem.status as StatusKendaraan]}`}
                >
                  {statusLabels[detailItem.status as StatusKendaraan]}
                </span>
              </div>

              {/* Detail — di kanan */}
              <div className="flex-1 space-y-4">
                <div>
                  <div className="text-lg font-semibold text-ink-900">{detailItem.nama_kendaraan}</div>
                  <div className="text-sm text-ink-400">
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

                <div className="flex justify-end gap-3 border-t border-ink-200 pt-4">
                  <button
                    onClick={() => setDetailItem(null)}
                    className="rounded-lg border border-ink-200 px-4 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-gray-50"
                  >
                    Tutup
                  </button>
                  <button
                    onClick={() => {
                      const item = detailItem;
                      setDetailItem(null);
                      handleEdit(item);
                    }}
                    className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
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
          <label className="mb-1 block text-sm font-medium text-ink-700">
            Catatan servis <span className="font-normal text-ink-400">(opsional)</span>
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

      {/* Grid Card Kendaraan */}
      {loading ? (
        <div className="rounded-2xl bg-white p-12 text-center shadow-sm ring-1 ring-ink-200">
          <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          <p className="text-sm text-ink-400">Memuat data...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center shadow-sm ring-1 ring-ink-200">
          <svg className="mx-auto mb-3 h-12 w-12 text-ink-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 17h.01M16 17h.01M3 11l1.5-5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.4L21 11M3 11h18M3 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-6"
            />
          </svg>
          <p className="font-medium text-ink-700">Tidak ada data kendaraan</p>
          <p className="mt-1 text-sm text-ink-400">Mulai dengan menambahkan kendaraan baru</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => setDetailItem(item)}
              className="cursor-pointer overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-ink-200 transition-all hover:shadow-md"
            >
              {/* Foto + badge status + tombol edit/hapus */}
              <div className="relative aspect-[4/3] bg-gray-50">
                {fotoUrl(item.foto) ? (
                  <img src={fotoUrl(item.foto) as string} alt={item.nama_kendaraan} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <svg className="h-10 w-10 text-ink-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M8 17h.01M16 17h.01M3 11l1.5-5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.4L21 11M3 11h18M3 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-6"
                      />
                    </svg>
                  </div>
                )}
                <span className={`absolute left-2.5 top-2.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[item.status as StatusKendaraan]}`}>
                  {statusLabels[item.status as StatusKendaraan]}
                </span>
                <div className="absolute right-2.5 top-2.5 flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleEdit(item)}
                    className="rounded-lg bg-white/90 p-1.5 text-ink-700 shadow-sm backdrop-blur transition-colors hover:bg-white hover:text-brand-600"
                    title="Edit"
                    aria-label="Edit kendaraan"
                  >
                    <Pencil size={14} />
                  </button>
                  {item.status !== 'disewa' && (
                    <button
                      onClick={() => setConfirmDelete(item)}
                      className="rounded-lg bg-white/90 p-1.5 text-ink-700 shadow-sm backdrop-blur transition-colors hover:bg-white hover:text-maint-600"
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
                  <p className="truncate font-semibold text-ink-900">
                    {item.merek} {item.model}
                  </p>
                  <span className="shrink-0 rounded-md bg-ink-900 px-2 py-0.5 font-mono text-xs font-semibold tracking-wide text-white">
                    {item.plat_nomor}
                  </span>
                </div>
                <p className="mb-2 truncate text-xs text-ink-400">{item.nama_kendaraan}</p>

                <div className="mb-3 flex flex-wrap gap-1.5 text-xs text-ink-400">
                  {item.kategori?.nama_kategori && <span className="rounded-full bg-gray-50 px-2 py-0.5">{item.kategori.nama_kategori}</span>}
                  {item.tipe?.nama_tipe && <span className="rounded-full bg-gray-50 px-2 py-0.5">{item.tipe.nama_tipe}</span>}
                  {item.garasi_partner?.nama_partner && <span className="rounded-full bg-gray-50 px-2 py-0.5">{item.garasi_partner.nama_partner}</span>}
                </div>

                <p className="mb-3 text-sm font-bold text-brand-600">{formatRupiah(item.harga_sewa_per_hari)}/hari</p>

                {/* 3 aksi cepat status */}
                <div className="grid grid-cols-3 gap-1.5 border-t border-ink-200 pt-3" onClick={(e) => e.stopPropagation()}>
                  <QuickStatusButton
                    label="Tersedia"
                    active={item.status === 'tersedia'}
                    activeClass="bg-avail-500 text-white"
                    onClick={() => handleQuickStatus(item, 'tersedia')}
                  />
                  <QuickStatusButton
                    label="Tidak Tersedia"
                    active={item.status === 'disewa'}
                    activeClass="bg-rented-500 text-white"
                    onClick={() => handleQuickStatus(item, 'disewa')}
                  />
                  <QuickStatusButton
                    label="Servis"
                    active={item.status === 'maintenance'}
                    activeClass="bg-amber-500 text-white"
                    onClick={() => handleQuickStatus(item, 'maintenance')}
                  />
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDetailItem(item);
                  }}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium text-ink-400 transition-colors hover:bg-gray-50 hover:text-ink-700"
                >
                  <Eye size={13} />
                  Lihat Detail
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Small presentational helpers                                       */
/* ------------------------------------------------------------------ */

function StatCard({ label, value, icon, iconClass }: { label: string; value: number; icon: ReactNode; iconClass: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-ink-200">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white ${iconClass}`}>{icon}</div>
      <div>
        <div className="text-xs text-ink-400">{label}</div>
        <div className="text-xl font-bold text-ink-900">{value}</div>
      </div>
    </div>
  );
}

function DetailField({ label, value, mono, full }: { label: string; value: string; mono?: boolean; full?: boolean }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <div className="mb-0.5 text-xs text-ink-400">{label}</div>
      <div className={`text-sm text-ink-900 ${mono ? 'font-mono' : ''}`}>{value}</div>
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
        active ? `${activeClass} cursor-default` : 'bg-gray-50 text-ink-400 hover:bg-gray-100 hover:text-ink-700'
      }`}
    >
      {label}
    </button>
  );
}