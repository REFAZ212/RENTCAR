import { useState, useEffect, useCallback, useMemo, ChangeEvent, FormEvent } from 'react';
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

export type StatusKendaraan = 'tersedia' | 'disewa' | 'maintenance';

type Kendaraan = ApiKendaraan & {
  garasi_partner?: { nama_partner: string };
  kategori?: KategoriKendaraan;
  tipe?: TipeKendaraan;
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
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const statusStyles: Record<StatusKendaraan, string> = {
  tersedia: 'bg-green-100 text-green-800',
  disewa: 'bg-blue-100 text-blue-800',
  maintenance: 'bg-yellow-100 text-yellow-800',
};

const statusLabels: Record<StatusKendaraan, string> = {
  tersedia: 'Tersedia',
  disewa: 'Disewa',
  maintenance: 'Maintenance',
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

const formatRupiah = (value: number | string) =>
  `Rp ${Number(value || 0).toLocaleString('id-ID')}`;

const fotoUrl = (foto?: string | null) =>
  foto ? (foto.startsWith('http') ? foto : `/storage/${foto}`) : null;

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function Kendaraan() {
  const toast = useToast();

  const [items, setItems] = useState<Kendaraan[]>([]);
  const [garasi, setGarasi] = useState<GarasiPartnerLocal[]>([]);
  const [kategoris, setKategoris] = useState<KategoriKendaraan[]>([]);
  const [tipes, setTipes] = useState<TipeKendaraan[]>([]);

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

  // Dedicated (not the generic confirmAction) because it needs a live-typed
  // textarea — storing a controlled input inside confirmAction's state would
  // freeze its value at the moment the modal was opened.
  const [maintenanceTarget, setMaintenanceTarget] = useState<Kendaraan | null>(null);
  const [maintenanceNote, setMaintenanceNote] = useState('');
  const [maintenanceSubmitting, setMaintenanceSubmitting] = useState(false);

  const [detailItem, setDetailItem] = useState<Kendaraan | null>(null);
  const [openMenuId, setOpenMenuId] = useState<Kendaraan['id'] | null>(null);

  /* ---------------------------- data loading --------------------------- */

  const load = useCallback(() => {
    setLoading(true);
    kendaraanAPI
      .list({ search })
      .then(({ data }) => setItems(data.data as unknown as Kendaraan[]))
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
    kategoriAPI
      .list({})
      .then(({ data }) => setKategoris(data as unknown as KategoriKendaraan[]))
      .catch(() => {});
    tipeAPI
      .list({})
      .then(({ data }) => setTipes(data as unknown as TipeKendaraan[]))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const close = () => setOpenMenuId(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
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
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        Object.values(err?.response?.data?.errors || {})?.[0]?.[0] ||
        'Gagal menyimpan data';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item: Kendaraan) => {
    setForm({
      garasi_partner_id: String(item.garasi_partner_id),
      kategori_id: item.kategori_id ? String(item.kategori_id) : '',
      tipe_id: item.tipe_id ? String(item.tipe_id) : '',
      nama_kendaraan: item.nama_kendaraan,
      plat_nomor: item.plat_nomor,
      merek: item.merek,
      model: item.model,
      tahun: item.tahun,
      warna: item.warna,
      kapasitas_penumpang: item.kapasitas_penumpang,
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
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal menghapus kendaraan');
    }
    setConfirmDelete(null);
  };

  const handleStatusChange = async (
    id: number,
    status: StatusKendaraan,
    catatan?: string
  ) => {
    try {
      const payload: { status: StatusKendaraan; catatan?: string } = { status };
      if (catatan !== undefined) payload.catatan = catatan;
      await kendaraanAPI.update(Number(id), payload);
      toast.success(`Status kendaraan diubah menjadi "${statusLabels[status]}"`);
      load();
      return true;
    } catch (err: any) {
      // Surface the backend's real message instead of a generic one — this
      // was previously swallowed, which made "gagal mengubah status" show
      // even when the actual cause was e.g. a validation error.
      console.error('Gagal mengubah status kendaraan:', err?.response?.data || err);
      const msg =
        err?.response?.data?.message ||
        Object.values(err?.response?.data?.errors || {})?.[0]?.[0] ||
        'Gagal mengubah status kendaraan';
      toast.error(msg);
      return false;
    }
  };

  // Appends a timestamped service note to the vehicle's existing `catatan`
  // instead of overwriting it, so history of past service reasons isn't lost.
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
    const ok = await handleStatusChange(
      maintenanceTarget.id,
      'maintenance',
      composeMaintenanceCatatan(maintenanceTarget, maintenanceNote)
    );
    setMaintenanceSubmitting(false);
    if (ok) {
      setMaintenanceTarget(null);
      setMaintenanceNote('');
    }
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manajemen Armada</h1>
          <p className="text-sm text-gray-500 mt-1">
            Kelola data kendaraan, tarif, dan status ketersediaan
          </p>
        </div>
        <button
          onClick={openAddForm}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tambah Kendaraan
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Unit"
          value={stats.total}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 11l1.5-5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.4L21 11M3 11h18M3 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-6" />
            </svg>
          }
          iconClass="bg-gray-100 text-gray-600"
        />
        <StatCard
          label="Tersedia"
          value={stats.tersedia}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
            </svg>
          }
          iconClass="bg-green-100 text-green-600"
        />
        <StatCard
          label="Disewa"
          value={stats.disewa}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 17h.01M16 17h.01M3 11l1.5-5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.4L21 11M3 11h18M3 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-6" />
            </svg>
          }
          iconClass="bg-blue-100 text-blue-600"
        />
        <StatCard
          label="Dalam Servis"
          value={stats.maintenance}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          }
          iconClass="bg-red-100 text-red-600"
        />
      </div>

      {/* Search + filter tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col gap-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative max-w-md w-full">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Cari plat, model, tipe, atau lokasi..."
              value={search}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition"
            />
          </div>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 self-start md:self-auto">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3.5 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab.key
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <select
            value={filterKategori}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => {
              setFilterKategori(e.target.value);
              setFilterTipe('');
            }}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
          >
            <option value="">Semua Kategori</option>
            {kategoris.filter((k) => k.aktif).map((k) => (
              <option key={k.id} value={k.id}>{k.nama_kategori}</option>
            ))}
          </select>
          <select
            value={filterTipe}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilterTipe(e.target.value)}
            disabled={!filterKategori}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white disabled:bg-gray-100 disabled:text-gray-400"
          >
            <option value="">{filterKategori ? 'Semua Tipe' : 'Pilih kategori dulu'}</option>
            {tipes
              .filter((t) => t.aktif && t.kategori_id?.toString() === filterKategori)
              .map((t) => (
                <option key={t.id} value={t.id}>{t.nama_tipe}</option>
              ))}
          </select>
          {(filterKategori || filterTipe) && (
            <button
              onClick={() => { setFilterKategori(''); setFilterTipe(''); }}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Reset filter
            </button>
          )}
        </div>
      </div>

      {/* Form Modal (Tambah / Edit) */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => {
            setShowForm(false);
            setEditItem(null);
          }}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-gray-900">
                {editItem ? 'Edit Kendaraan' : 'Tambah Kendaraan'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditItem(null);
                }}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {lastAdded && !editItem && (
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm font-medium text-green-800">Kendaraan berhasil ditambahkan!</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLastAdded(false)}
                    className="text-sm font-medium text-green-700 hover:text-green-900 underline"
                  >
                    Sembunyikan
                  </button>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Garasi Partner *</label>
                  <select
                    value={form.garasi_partner_id}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => setField('garasi_partner_id', e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                  <select
                    value={form.kategori_id}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                      setField('kategori_id', e.target.value);
                      setField('tipe_id', '');
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                  >
                    <option value="">Pilih Kategori</option>
                    {kategoris
                      .filter((k) => k.aktif)
                      .map((k) => (
                        <option key={k.id} value={k.id}>
                          {k.nama_kategori}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Kendaraan *</label>
                  <input
                    type="text"
                    value={form.nama_kendaraan}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setField('nama_kendaraan', e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plat Nomor *</label>
                  <input
                    type="text"
                    value={form.plat_nomor}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setField('plat_nomor', e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Kendaraan</label>
                  <select
                    value={form.tipe_id}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => setField('tipe_id', e.target.value)}
                    disabled={!form.kategori_id}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    <option value="">{form.kategori_id ? 'Pilih Tipe' : 'Pilih kategori dulu'}</option>
                    {tipes
                      .filter((t) => t.aktif)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nama_tipe}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Merek *</label>
                  <input
                    type="text"
                    value={form.merek}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setField('merek', e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Model *</label>
                  <input
                    type="text"
                    value={form.model}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setField('model', e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tahun *</label>
                  <input
                    type="number"
                    value={form.tahun}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setField('tahun', Number(e.target.value))}
                    required
                    min={1990}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Warna *</label>
                  <input
                    type="text"
                    value={form.warna}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setField('warna', e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kapasitas *</label>
                  <input
                    type="number"
                    value={form.kapasitas_penumpang}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setField('kapasitas_penumpang', Number(e.target.value))}
                    required
                    min={1}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Harga/Hari (Rp) *</label>
                  <input
                    type="number"
                    value={form.harga_sewa_per_hari}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setField('harga_sewa_per_hari', e.target.value)}
                    required
                    min={0}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Foto Kendaraan</label>
                <div className="flex items-start gap-4">
                  <label className="flex-1 flex items-center justify-center px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors">
                    <div className="text-center">
                      <svg className="w-8 h-8 text-gray-400 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-xs text-gray-500">{fotoFile ? fotoFile.name : 'Klik atau seret foto ke sini'}</p>
                      <p className="text-xs text-gray-400 mt-0.5">JPG, PNG, maks 2MB</p>
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
                      <img src={fotoPreview} alt="Preview" className="w-24 h-24 object-cover rounded-lg border border-gray-200" />
                      <button
                        type="button"
                        onClick={() => {
                          setFotoFile(null);
                          setFotoPreview(null);
                        }}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                <textarea
                  value={form.catatan}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setField('catatan', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm resize-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditItem(null);
                    setLastAdded(false);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                {lastAdded && !editItem ? (
                  <button
                    type="button"
                    onClick={() => setLastAdded(false)}
                    className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Tambah Kendaraan Lainnya
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                  >
                    {submitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    {editItem ? 'Simpan' : 'Tambah'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailItem && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setDetailItem(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-gray-900">Detail Kendaraan</h2>
              <button
                onClick={() => setDetailItem(null)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-4">
                {fotoUrl(detailItem.foto) ? (
                  <img
                    src={fotoUrl(detailItem.foto) as string}
                    alt={detailItem.nama_kendaraan}
                    className="w-20 h-20 rounded-lg object-cover border border-gray-200 shrink-0"
                  />
                ) : (
                  <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 17h.01M16 17h.01M3 11l1.5-5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.4L21 11M3 11h18M3 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-6" />
                    </svg>
                  </div>
                )}
                <div>
                  <div className="text-lg font-semibold text-gray-900">{detailItem.nama_kendaraan}</div>
                  <div className="text-sm text-gray-500">
                    {detailItem.merek} {detailItem.model} · {detailItem.tahun}
                  </div>
                  <span
                    className={`inline-block mt-1.5 px-2 py-1 text-xs font-medium rounded-full ${statusStyles[detailItem.status]}`}
                  >
                    {statusLabels[detailItem.status]}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <DetailField label="Plat Nomor" value={detailItem.plat_nomor} mono />
                <DetailField label="Warna" value={detailItem.warna} />
                <DetailField label="Kategori" value={detailItem.kategori?.nama_kategori || '-'} />
                <DetailField label="Tipe" value={detailItem.tipe?.nama_tipe || '-'} />
                <DetailField label="Kapasitas" value={`${detailItem.kapasitas_penumpang} orang`} />
                <DetailField label="Tarif/Hari" value={formatRupiah(detailItem.harga_sewa_per_hari)} />
                <DetailField
                  label="Lokasi / Garasi"
                  value={detailItem.garasi_partner?.nama_garasi || '-'}
                  full
                />
                {detailItem.catatan && <DetailField label="Catatan" value={detailItem.catatan} full />}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setDetailItem(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Tutup
                </button>
                <button
                  onClick={() => {
                    const item = detailItem;
                    setDetailItem(null);
                    handleEdit(item);
                  }}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Edit Kendaraan
                </button>
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
        title="Masuk ke Maintenance"
        message={`Ubah status "${maintenanceTarget?.nama_kendaraan}" menjadi Maintenance? Kendaraan tidak akan bisa disewa selama dalam status ini.`}
        confirmLabel={maintenanceSubmitting ? 'Menyimpan...' : 'Masukkan Servis'}
        danger
        onConfirm={handleEnterMaintenance}
        onCancel={() => {
          setMaintenanceTarget(null);
          setMaintenanceNote('');
        }}
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Catatan servis <span className="text-gray-400 font-normal">(opsional)</span>
          </label>
          <textarea
            value={maintenanceNote}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setMaintenanceNote(e.target.value)}
            rows={3}
            placeholder="Contoh: ganti oli & servis rutin 10.000 km, rem belakang aus, dll."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm resize-none"
          />
        </div>
      </ConfirmModal>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 font-medium text-xs text-gray-400 uppercase tracking-wide">Plat Nomor</th>
                <th className="text-left px-4 py-3 font-medium text-xs text-gray-400 uppercase tracking-wide">Model</th>
                <th className="text-left px-4 py-3 font-medium text-xs text-gray-400 uppercase tracking-wide">Kategori</th>
                <th className="text-left px-4 py-3 font-medium text-xs text-gray-400 uppercase tracking-wide">Tipe</th>
                <th className="text-left px-4 py-3 font-medium text-xs text-gray-400 uppercase tracking-wide">Lokasi</th>
                <th className="text-left px-4 py-3 font-medium text-xs text-gray-400 uppercase tracking-wide">Tarif / Hari</th>
                <th className="text-left px-4 py-3 font-medium text-xs text-gray-400 uppercase tracking-wide">Status</th>
                <th className="text-right px-4 py-3 font-medium text-xs text-gray-400 uppercase tracking-wide">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Memuat data...</p>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center">
                    <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 17h.01M16 17h.01M3 11l1.5-5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.4L21 11M3 11h18M3 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-6" />
                    </svg>
                    <p className="text-gray-500 font-medium">Tidak ada data kendaraan</p>
                    <p className="text-sm text-gray-400 mt-1">Mulai dengan menambahkan kendaraan baru</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                    onClick={() => setDetailItem(item)}
                  >
                    <td className="px-4 py-3">
                      <span className="inline-block px-2.5 py-1 bg-gray-900 text-white text-xs font-mono font-semibold rounded-lg tracking-wide">
                        {item.plat_nomor}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {fotoUrl(item.foto) ? (
                          <img
                            src={fotoUrl(item.foto) as string}
                            alt={item.nama_kendaraan}
                            className="w-9 h-9 rounded-lg object-cover border border-gray-200 shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 17h.01M16 17h.01M3 11l1.5-5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.4L21 11M3 11h18M3 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-6" />
                            </svg>
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-gray-900">
                            {item.merek} {item.model}
                          </div>
                          <div className="text-xs text-gray-500">{item.nama_kendaraan}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{item.kategori?.nama_kategori || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{item.tipe?.nama_tipe || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{item.garasi_partner?.nama_garasi || '-'}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{formatRupiah(item.harga_sewa_per_hari)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusStyles[item.status]}`}>
                        {statusLabels[item.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right relative" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Aksi"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 6a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                      </button>
                      {openMenuId === item.id && (
                        <div
                          className="absolute right-4 top-10 z-20 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 text-left"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => {
                              setDetailItem(item);
                              setOpenMenuId(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Lihat Detail
                          </button>
                          <button
                            onClick={() => {
                              handleEdit(item);
                              setOpenMenuId(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                          </button>
                          {item.status === 'tersedia' && (
                            <button
                              onClick={() => {
                                setMaintenanceTarget(item);
                                setMaintenanceNote('');
                                setOpenMenuId(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-yellow-700 hover:bg-yellow-50 flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Masukkan Servis
                            </button>
                          )}
                          {item.status === 'maintenance' && (
                            <button
                              onClick={() => {
                                setConfirmAction({
                                  title: 'Aktifkan Kendaraan',
                                  message: `Keluarkan "${item.nama_kendaraan}" dari Maintenance? Kendaraan akan menjadi Tersedia.`,
                                  confirmLabel: 'Aktifkan',
                                  danger: false,
                                  onConfirm: () => handleStatusChange(item.id, 'tersedia'),
                                });
                                setOpenMenuId(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-green-700 hover:bg-green-50 flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Aktifkan
                            </button>
                          )}
                          {item.status !== 'disewa' && (
                            <button
                              onClick={() => {
                                setConfirmDelete(item);
                                setOpenMenuId(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Hapus
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Small presentational helpers                                        */
/* ------------------------------------------------------------------ */

function StatCard({
  label,
  value,
  icon,
  iconClass,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  iconClass: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconClass}`}>{icon}</div>
      <div>
        <div className="text-xs text-gray-500">{label}</div>
        <div className="text-xl font-bold text-gray-900">{value}</div>
      </div>
    </div>
  );
}

function DetailField({
  label,
  value,
  mono,
  full,
}: {
  label: string;
  value: string;
  mono?: boolean;
  full?: boolean;
}) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <div className="text-xs text-gray-400 mb-0.5">{label}</div>
      <div className={`text-sm text-gray-900 ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  );
}