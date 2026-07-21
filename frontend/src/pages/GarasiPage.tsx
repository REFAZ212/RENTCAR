import { useState, useEffect, useCallback, Fragment } from 'react';
import {
  garasiPartnerAPI,
  kendaraanAPI,
  kategoriAPI,
  tipeAPI,
  type Kendaraan,
  type GarasiPartner,
} from '../services/api';
import { useToast } from '../contexts/ToastContext';
import ConfirmModal from '../components/ConfirmModal';

const emptyPartnerForm = {
  nama_garasi: '',
  nama_pemilik: '',
  alamat: '',
  no_hp: '',
  email: '',
  status_aktif: true,
  is_own: false,
  catatan: '',
};

const vehicleStatusStyles: Record<string, string> = {
  tersedia: 'bg-green-100 text-green-800',
  disewa: 'bg-blue-100 text-blue-800',
  maintenance: 'bg-yellow-100 text-yellow-800',
};

const vehicleStatusLabels: Record<string, string> = {
  tersedia: 'Tersedia',
  disewa: 'Disewa',
  maintenance: 'Maintenance',
};

function formatRupiah(n: number | string) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(n || 0));
}

/* ───────────────────────────────────────────────────────────── */
/* Garasi Partner Tab                                           */
/* ───────────────────────────────────────────────────────────── */

function GarasiPartnerTab() {
  const toast = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState(emptyPartnerForm);
  const [confirmDelete, setConfirmDelete] = useState<any>(null);

  const [showKendaraanForm, setShowKendaraanForm] = useState(false);
  const [kendaraanGarasi, setKendaraanGarasi] = useState<any>(null);
  const [kendaraanForm, setKendaraanForm] = useState<Record<string, any>>({});
  const [submittingKendaraan, setSubmittingKendaraan] = useState(false);
  const [kategoris, setKategoris] = useState<any[]>([]);
  const [tipes, setTipes] = useState<any[]>([]);
  const [kendaraanFotoFile, setKendaraanFotoFile] = useState<File | null>(null);
  const [kendaraanFotoPreview, setKendaraanFotoPreview] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [expandedKendaraans, setExpandedKendaraans] = useState<Record<number, Kendaraan[]>>({});
  const [loadingKendaraans, setLoadingKendaraans] = useState<Set<number>>(new Set());
  const [editKendaraanItem, setEditKendaraanItem] = useState<Kendaraan | null>(null);
  const [confirmDeleteKendaraan, setConfirmDeleteKendaraan] = useState<Kendaraan | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    garasiPartnerAPI
      .list({ search })
      .then(({ data }) => setItems(data.data))
      .catch(() => toast.error('Gagal memuat data garasi partner'))
      .finally(() => setLoading(false));
  }, [search, toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    kategoriAPI
      .list()
      .then(({ data }) => setKategoris(data as unknown as any[]))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!kendaraanForm.kategori_id) {
      setTipes([]);
      return;
    }
    tipeAPI
      .list({ kategori_id: kendaraanForm.kategori_id })
      .then(({ data }) => setTipes(data as unknown as any[]))
      .catch(() => {});
  }, [kendaraanForm.kategori_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editItem) {
        await garasiPartnerAPI.update(editItem.id, form);
        toast.success('Garasi partner berhasil diperbarui');
      } else {
        await garasiPartnerAPI.create(form);
        toast.success('Garasi partner berhasil ditambahkan');
      }
      setShowForm(false);
      setEditItem(null);
      setForm(emptyPartnerForm);
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

  const handleEdit = (item: any) => {
    setForm({
      nama_garasi: item.nama_garasi,
      nama_pemilik: item.nama_pemilik,
      alamat: item.alamat || '',
      no_hp: item.no_hp,
      email: item.email || '',
      status_aktif: item.status_aktif,
      is_own: item.is_own || false,
      catatan: item.catatan || '',
    });
    setEditItem(item);
    setShowForm(true);
  };

  const handleDelete = async () => {
    try {
      await garasiPartnerAPI.delete(confirmDelete.id);
      toast.success('Garasi partner berhasil dihapus');
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal menghapus garasi partner');
    }
    setConfirmDelete(null);
  };

  const setField = (key: string, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleExpand = async (id: number) => {
    if (expandedIds.has(id)) {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      return;
    }
    setExpandedIds((prev) => new Set(prev).add(id));
    setLoadingKendaraans((prev) => new Set(prev).add(id));
    try {
      const { data } = await garasiPartnerAPI.get(id);
      const d = data as unknown as any;
      setExpandedKendaraans((prev) => ({ ...prev, [id]: d?.kendaraans || [] }));
    } catch {
      setExpandedKendaraans((prev) => ({ ...prev, [id]: [] }));
    } finally {
      setLoadingKendaraans((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const openEditKendaraan = (garasi: any, k: Kendaraan) => {
    setKendaraanGarasi(garasi);
    setKendaraanForm({
      garasi_partner_id: garasi.id,
      kategori_id: k.kategori_id || '',
      tipe_id: k.tipe_id || '',
      nama_kendaraan: k.nama_kendaraan,
      plat_nomor: k.plat_nomor,
      merek: k.merek,
      model: k.model,
      tahun: k.tahun,
      warna: k.warna,
      kapasitas_penumpang: k.kapasitas_penumpang,
      harga_sewa_per_hari: k.harga_sewa_per_hari,
      status: k.status,
      catatan: k.catatan || '',
    });
    setKendaraanFotoFile(null);
    setKendaraanFotoPreview(
      k.foto
        ? k.foto.startsWith('http') ? k.foto : `/storage/${k.foto}`
        : null,
    );
    setEditKendaraanItem(k);
    setShowKendaraanForm(true);
  };

  const handleDeleteKendaraan = async () => {
    if (!confirmDeleteKendaraan) return;
    const garasiId = confirmDeleteKendaraan.garasi_partner_id;
    try {
      await kendaraanAPI.delete(confirmDeleteKendaraan.id);
      toast.success('Kendaraan berhasil dihapus');
      if (garasiId && expandedIds.has(garasiId)) {
        const { data } = await garasiPartnerAPI.get(garasiId);
        const d = data as unknown as any;
        setExpandedKendaraans((prev) => ({ ...prev, [garasiId]: d?.kendaraans || [] }));
      }
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal menghapus kendaraan');
    }
    setConfirmDeleteKendaraan(null);
  };

  const setKendaraanField = (key: string, value: any) =>
    setKendaraanForm((prev) => ({ ...prev, [key]: value }));

  const openCreateKendaraan = (garasi: any) => {
    setKendaraanGarasi(garasi);
    setKendaraanForm({
      garasi_partner_id: garasi.id,
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
    });
    setKendaraanFotoFile(null);
    setKendaraanFotoPreview(null);
    setShowKendaraanForm(true);
  };

  const handleKendaraanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingKendaraan(true);
    try {
      const hasFile = kendaraanFotoFile instanceof File;
      if (hasFile) {
        const fd = new FormData();
        Object.entries(kendaraanForm).forEach(([k, v]) => {
          if (v !== '' && v !== null && v !== undefined) fd.append(k, String(v));
        });
        fd.append('foto', kendaraanFotoFile);
        if (editKendaraanItem) {
          fd.append('_method', 'PUT');
          await kendaraanAPI.update(editKendaraanItem.id, fd);
        } else {
          await kendaraanAPI.create(fd);
        }
      } else {
        if (editKendaraanItem) {
          await kendaraanAPI.update(editKendaraanItem.id, kendaraanForm as Record<string, unknown>);
        } else {
          await kendaraanAPI.create(kendaraanForm as Record<string, unknown>);
        }
      }
      toast.success(editKendaraanItem ? 'Kendaraan berhasil diperbarui' : 'Kendaraan berhasil ditambahkan');
      const garasiId = kendaraanGarasi?.id;
      setShowKendaraanForm(false);
      setKendaraanGarasi(null);
      setEditKendaraanItem(null);
      setKendaraanFotoFile(null);
      setKendaraanFotoPreview(null);
      load();
      if (garasiId && expandedIds.has(garasiId)) {
        const { data } = await garasiPartnerAPI.get(garasiId);
        const d = data as unknown as any;
        setExpandedKendaraans((prev) => ({ ...prev, [garasiId]: d?.kendaraans || [] }));
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        Object.values(err?.response?.data?.errors || {})?.[0]?.[0] ||
        'Gagal menyimpan kendaraan';
      toast.error(msg);
    } finally {
      setSubmittingKendaraan(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative max-w-md w-full">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" placeholder="Cari nama garasi, pemilik, no HP..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition" />
        </div>
        <button onClick={() => { setForm(emptyPartnerForm); setEditItem(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shrink-0 ml-4">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Tambah Garasi
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => { setShowForm(false); setEditItem(null); }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-gray-900">{editItem ? 'Edit Garasi Partner' : 'Tambah Garasi Partner'}</h2>
              <button onClick={() => { setShowForm(false); setEditItem(null); }} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Garasi *</label>
                  <input type="text" value={form.nama_garasi} onChange={(e) => setField('nama_garasi', e.target.value)} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Pemilik *</label>
                  <input type="text" value={form.nama_pemilik} onChange={(e) => setField('nama_pemilik', e.target.value)} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">No. HP *</label>
                  <input type="text" value={form.no_hp} onChange={(e) => setField('no_hp', e.target.value)} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alamat *</label>
                <textarea value={form.alamat} onChange={(e) => setField('alamat', e.target.value)} rows={2} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                <textarea value={form.catatan} onChange={(e) => setField('catatan', e.target.value)} rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm resize-none" />
              </div>
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={form.is_own} onChange={(e) => setField('is_own', e.target.checked)} className="sr-only peer" />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
                <span className="text-sm text-gray-700">Milik Sendiri</span>
                <span className="text-xs text-gray-400">— Centang jika ini garasi milik perusahaan Anda</span>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => { setShowForm(false); setEditItem(null); }} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Batal</button>
                <button type="submit" disabled={submitting}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2">
                  {submitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {editItem ? 'Simpan' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showKendaraanForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => { setShowKendaraanForm(false); setKendaraanGarasi(null); setEditKendaraanItem(null); setKendaraanFotoFile(null); setKendaraanFotoPreview(null); }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{editKendaraanItem ? 'Edit Kendaraan' : 'Tambah Kendaraan'}</h2>
                <p className="text-sm text-gray-500">untuk {kendaraanGarasi?.nama_garasi}</p>
              </div>
              <button onClick={() => { setShowKendaraanForm(false); setKendaraanGarasi(null); setEditKendaraanItem(null); setKendaraanFotoFile(null); setKendaraanFotoPreview(null); }} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleKendaraanSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                  <select value={kendaraanForm.kategori_id || ''} onChange={(e) => { setKendaraanField('kategori_id', e.target.value); setKendaraanField('tipe_id', ''); }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm">
                    <option value="">Pilih Kategori</option>
                    {kategoris.filter((k) => k.aktif).map((k) => <option key={k.id} value={k.id}>{k.nama_kategori}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Kendaraan</label>
                  <select value={kendaraanForm.tipe_id || ''} onChange={(e) => setKendaraanField('tipe_id', e.target.value)}
                    disabled={!kendaraanForm.kategori_id}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm disabled:bg-gray-100 disabled:text-gray-400">
                    <option value="">{kendaraanForm.kategori_id ? 'Pilih Tipe' : 'Pilih kategori dulu'}</option>
                    {tipes.filter((t) => t.aktif).map((t) => <option key={t.id} value={t.id}>{t.nama_tipe}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Kendaraan *</label>
                  <input type="text" value={kendaraanForm.nama_kendaraan || ''} onChange={(e) => setKendaraanField('nama_kendaraan', e.target.value)} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plat Nomor *</label>
                  <input type="text" value={kendaraanForm.plat_nomor || ''} onChange={(e) => setKendaraanField('plat_nomor', e.target.value)} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-mono uppercase" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Merek *</label>
                  <input type="text" value={kendaraanForm.merek || ''} onChange={(e) => setKendaraanField('merek', e.target.value)} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Model *</label>
                  <input type="text" value={kendaraanForm.model || ''} onChange={(e) => setKendaraanField('model', e.target.value)} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tahun *</label>
                  <input type="number" value={kendaraanForm.tahun || new Date().getFullYear()} onChange={(e) => setKendaraanField('tahun', Number(e.target.value))} required min={1990}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Warna *</label>
                  <input type="text" value={kendaraanForm.warna || ''} onChange={(e) => setKendaraanField('warna', e.target.value)} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kapasitas *</label>
                  <input type="number" value={kendaraanForm.kapasitas_penumpang || 7} onChange={(e) => setKendaraanField('kapasitas_penumpang', Number(e.target.value))} required min={1}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Harga/Hari (Rp) *</label>
                  <input type="number" value={kendaraanForm.harga_sewa_per_hari || ''} onChange={(e) => setKendaraanField('harga_sewa_per_hari', e.target.value)} required min={0}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                <textarea value={kendaraanForm.catatan || ''} onChange={(e) => setKendaraanField('catatan', e.target.value)} rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Foto Kendaraan</label>
                <div className="flex items-start gap-4">
                  <label className="flex-1 flex items-center justify-center px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors">
                    <div className="text-center">
                      <svg className="w-8 h-8 text-gray-400 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      <p className="text-xs text-gray-500">{kendaraanFotoFile ? kendaraanFotoFile.name : 'Klik atau seret foto ke sini'}</p>
                      <p className="text-xs text-gray-400 mt-0.5">JPG, PNG, maks 2MB</p>
                    </div>
                    <input type="file" accept="image/*" className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) { setKendaraanFotoFile(f); setKendaraanFotoPreview(URL.createObjectURL(f)); }
                      }} />
                  </label>
                  {kendaraanFotoPreview && (
                    <div className="relative shrink-0">
                      <img src={kendaraanFotoPreview} alt="Preview" className="w-24 h-24 object-cover rounded-lg border border-gray-200" />
                      <button type="button" onClick={() => { setKendaraanFotoFile(null); setKendaraanFotoPreview(null); }}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => { setShowKendaraanForm(false); setKendaraanGarasi(null); setEditKendaraanItem(null); setKendaraanFotoFile(null); setKendaraanFotoPreview(null); }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Batal</button>
                <button type="submit" disabled={submittingKendaraan}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2">
                  {submittingKendaraan && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {editKendaraanItem ? 'Simpan' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!confirmDelete}
        title="Hapus Garasi Partner"
        message={`Yakin ingin menghapus "${confirmDelete?.nama_garasi}"? Semua data terkait akan ikut terhapus.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      <ConfirmModal
        open={!!confirmDeleteKendaraan}
        title="Hapus Kendaraan"
        message={`Yakin ingin menghapus "${confirmDeleteKendaraan?.nama_kendaraan}"? Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={handleDeleteKendaraan}
        onCancel={() => setConfirmDeleteKendaraan(null)}
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Garasi</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Pemilik</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">No. HP</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Kendaraan</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="p-12 text-center">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Memuat data...</p>
                </td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="p-12 text-center">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                  <p className="text-gray-500 font-medium">Tidak ada data garasi partner</p>
                  <p className="text-sm text-gray-400 mt-1">Mulai dengan menambahkan garasi partner baru</p>
                </td></tr>
              ) : items.map((item: any) => (
                <Fragment key={item.id}>
                  <tr className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => toggleExpand(item.id)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <svg className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${expandedIds.has(item.id) ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        <div>
                          <div className="font-medium text-gray-900">{item.nama_garasi}</div>
                          <div className="text-xs text-gray-500">{item.email || '-'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{item.nama_pemilik}</td>
                    <td className="px-4 py-3 text-gray-700">{item.no_hp}</td>
                    <td className="px-4 py-3 text-gray-700">{item.kendaraans_count} unit</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${item.status_aktif ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {item.status_aktif ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleEdit(item)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => setConfirmDelete(item)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Hapus">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedIds.has(item.id) && (
                    <tr>
                      <td colSpan={6} className="p-0">
                        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
                          {loadingKendaraans.has(item.id) ? (
                            <div className="flex items-center gap-2 py-4">
                              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                              <span className="text-sm text-gray-500">Memuat kendaraan...</span>
                            </div>
                          ) : (expandedKendaraans[item.id] || []).length === 0 ? (
                            <div className="py-4 text-center">
                              <p className="text-sm text-gray-400 mb-3">Belum ada kendaraan di garasi ini</p>
                              <button onClick={() => openCreateKendaraan(item)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                Tambah Kendaraan
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-gray-700">{(expandedKendaraans[item.id] || []).length} kendaraan</p>
                                <button onClick={() => openCreateKendaraan(item)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                  Tambah Kendaraan
                                </button>
                              </div>
                              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                              <table className="w-full text-sm">
                                <thead className="bg-gray-100 border-b border-gray-200">
                                  <tr>
                                    <th className="text-left px-4 py-2 font-medium text-gray-600">Foto</th>
                                    <th className="text-left px-4 py-2 font-medium text-gray-600">Kendaraan</th>
                                    <th className="text-left px-4 py-2 font-medium text-gray-600">Plat</th>
                                    <th className="text-left px-4 py-2 font-medium text-gray-600">Kategori</th>
                                    <th className="text-left px-4 py-2 font-medium text-gray-600">Harga/Hari</th>
                                    <th className="text-left px-4 py-2 font-medium text-gray-600">Status</th>
                                    <th className="text-right px-4 py-2 font-medium text-gray-600">Aksi</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {(expandedKendaraans[item.id] || []).map((k) => (
                                    <tr key={k.id} className="hover:bg-gray-50/50 transition-colors">
                                      <td className="px-4 py-2.5">
                                        {k.foto ? (
                                          <img
                                            src={k.foto.startsWith('http') ? k.foto : `/storage/${k.foto}`}
                                            alt={k.nama_kendaraan}
                                            className="w-12 h-12 object-cover rounded-lg border border-gray-200"
                                          />
                                        ) : (
                                          <div className="w-12 h-12 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                          </div>
                                        )}
                                      </td>
                                      <td className="px-4 py-2.5">
                                        <div className="font-medium text-gray-900">{k.nama_kendaraan}</div>
                                        <div className="text-xs text-gray-500">{k.merek} {k.model} {k.tahun}</div>
                                      </td>
                                      <td className="px-4 py-2.5 font-mono text-sm text-gray-700">{k.plat_nomor}</td>
                                      <td className="px-4 py-2.5 text-gray-600">{k.kategori?.nama_kategori || '-'}</td>
                                      <td className="px-4 py-2.5 text-gray-700">{formatRupiah(k.harga_sewa_per_hari)}</td>
                                      <td className="px-4 py-2.5">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${vehicleStatusStyles[k.status] || ''}`}>
                                          {vehicleStatusLabels[k.status] || k.status}
                                        </span>
                                      </td>
                                      <td className="px-4 py-2.5 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                          <button onClick={() => openEditKendaraan(item, k)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                          </button>
                                          <button onClick={() => setConfirmDeleteKendaraan(k)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Hapus">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                               </table>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────── */
/* Garasi Saya Tab                                              */
/* ───────────────────────────────────────────────────────────── */

interface GarasiWithKendaraan extends GarasiPartner {
  kendaraans: Kendaraan[];
  nama_garasi: string;
}

function makeEmptyKendaraanForm(garasiId: number | string | undefined) {
  return {
    garasi_partner_id: garasiId || '',
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
}

function GarasiSayaTab() {
  const toast = useToast();
  const [garasi, setGarasi] = useState<GarasiWithKendaraan | null>(null);
  const [items, setItems] = useState<Kendaraan[]>([]);
  const [kategoris, setKategoris] = useState<any[]>([]);
  const [tipes, setTipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Kendaraan | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Kendaraan | null>(null);
  const [lastAdded, setLastAdded] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  const loadGarasi = useCallback(() => {
    return garasiPartnerAPI.garasiSaya().then(({ data }) => {
      const d = data as unknown as GarasiWithKendaraan;
      setGarasi(d);
      setItems(d?.kendaraans || []);
      return d;
    });
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    loadGarasi()
      .catch(() => toast.error('Gagal memuat data garasi'))
      .finally(() => setLoading(false));
  }, [loadGarasi, toast]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    kategoriAPI
      .list()
      .then(({ data }) => setKategoris(data as unknown as any[]))
      .catch(() => {});
  }, []);

  const saveName = async () => {
    if (!garasi || !nameDraft.trim() || nameDraft === garasi.nama_garasi) {
      setEditingName(false);
      return;
    }
    try {
      await garasiPartnerAPI.update(garasi.id, { nama_garasi: nameDraft.trim() });
      setGarasi((prev) => prev ? { ...prev, nama_garasi: nameDraft.trim() } : prev);
      toast.success('Nama garasi berhasil diperbarui');
    } catch {
      toast.error('Gagal memperbarui nama garasi');
    }
    setEditingName(false);
  };

  useEffect(() => {
    if (!form.kategori_id) {
      setTipes([]);
      return;
    }
    tipeAPI
      .list({ kategori_id: form.kategori_id })
      .then(({ data }) => setTipes(data as unknown as any[]))
      .catch(() => {});
  }, [form.kategori_id]);

  const filtered = filterStatus
    ? items.filter((k) => k.status === filterStatus)
    : items;
  const stats = {
    total: items.length,
    tersedia: items.filter((k) => k.status === 'tersedia').length,
    disewa: items.filter((k) => k.status === 'disewa').length,
    maintenance: items.filter((k) => k.status === 'maintenance').length,
  };

  const openCreate = () => {
    setForm(makeEmptyKendaraanForm(garasi?.id));
    setEditItem(null);
    setFotoFile(null);
    setFotoPreview(null);
    setLastAdded(false);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const hasFile = fotoFile instanceof File;
      if (hasFile) {
        const fd = new FormData();
        Object.entries(form).forEach(([k, v]) => {
          if (v !== '' && v !== null && v !== undefined) fd.append(k, String(v));
        });
        fd.append('foto', fotoFile);
        if (editItem) {
          await kendaraanAPI.update(editItem.id, fd);
        } else {
          await kendaraanAPI.create(fd);
        }
      } else {
        if (editItem) {
          await kendaraanAPI.update(editItem.id, form as Record<string, unknown>);
        } else {
          await kendaraanAPI.create(form as Record<string, unknown>);
        }
      }
      toast.success(editItem ? 'Kendaraan berhasil diperbarui' : 'Kendaraan berhasil ditambahkan');
      if (editItem) {
        setShowForm(false);
        setEditItem(null);
        setFotoFile(null);
        setFotoPreview(null);
        setLastAdded(false);
      } else {
        setForm(makeEmptyKendaraanForm(garasi?.id));
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
      garasi_partner_id: item.garasi_partner_id,
      kategori_id: item.kategori_id || '',
      tipe_id: item.tipe_id || '',
      nama_kendaraan: item.nama_kendaraan,
      plat_nomor: item.plat_nomor,
      merek: item.merek,
      model: item.model,
      tahun: item.tahun,
      warna: item.warna,
      kapasitas_penumpang: item.kapasitas_penumpang,
      harga_sewa_per_hari: item.harga_sewa_per_hari,
      status: item.status,
      catatan: item.catatan || '',
    });
    setFotoFile(null);
    setFotoPreview(
      item.foto
        ? item.foto.startsWith('http')
          ? item.foto
          : `/storage/${item.foto}`
        : null,
    );
    setEditItem(item);
    setShowForm(true);
  };

  const handleDelete = async () => {
    try {
      await kendaraanAPI.delete(confirmDelete!.id);
      toast.success('Kendaraan berhasil dihapus');
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal menghapus kendaraan');
    }
    setConfirmDelete(null);
  };

  const setField = (key: string, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-48 bg-gray-200 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!garasi) {
    return (
      <div className="text-center py-16">
        <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        <p className="text-gray-500 font-medium">Belum ada garasi yang ditandai sebagai milik sendiri</p>
        <p className="text-sm text-gray-400 mt-1">Tandai garasi di tab &quot;Garasi Partner&quot; dengan centang &quot;Milik Sendiri&quot;</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm text-gray-500">Garasi:</p>
          {editingName ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
                autoFocus
                className="px-2 py-1 border border-blue-400 rounded-lg text-sm font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              <button onClick={saveName} className="p-1 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Simpan">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </button>
              <button onClick={() => setEditingName(false)} className="p-1 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors" title="Batal">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-gray-700">{garasi.nama_garasi}</span>
              <button
                onClick={() => { setNameDraft(garasi.nama_garasi); setEditingName(true); }}
                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Edit nama garasi"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </button>
            </div>
          )}
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Tambah Kendaraan
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-gray-900' },
          { label: 'Tersedia', value: stats.tersedia, color: 'text-green-600' },
          { label: 'Disewa', value: stats.disewa, color: 'text-blue-600' },
          { label: 'Servis', value: stats.maintenance, color: 'text-yellow-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 text-center">
            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative max-w-sm w-full">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" placeholder="Cari nama, plat, merek..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {['', 'tersedia', 'disewa', 'maintenance'].map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                filterStatus === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-600'
              }`}>
              {s ? vehicleStatusLabels[s] : `Semua (${stats.total})`}
            </button>
          ))}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => { setShowForm(false); setEditItem(null); }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-gray-900">{editItem ? 'Edit Kendaraan' : 'Tambah Kendaraan'}</h2>
              <button onClick={() => { setShowForm(false); setEditItem(null); }} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {lastAdded && !editItem && (
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    <span className="text-sm font-medium text-green-800">Kendaraan berhasil ditambahkan!</span>
                  </div>
                  <button type="button" onClick={() => setLastAdded(false)} className="text-sm font-medium text-green-700 hover:text-green-900 underline">Sembunyikan</button>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                  <select value={form.kategori_id} onChange={(e) => { setField('kategori_id', e.target.value); setField('tipe_id', ''); }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm">
                    <option value="">Pilih Kategori</option>
                    {kategoris.filter((k) => k.aktif).map((k) => <option key={k.id} value={k.id}>{k.nama_kategori}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Kendaraan</label>
                  <select value={form.tipe_id} onChange={(e) => setField('tipe_id', e.target.value)}
                    disabled={!form.kategori_id}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm disabled:bg-gray-100 disabled:text-gray-400">
                    <option value="">{form.kategori_id ? 'Pilih Tipe' : 'Pilih kategori dulu'}</option>
                    {tipes.filter((t) => t.aktif).map((t) => <option key={t.id} value={t.id}>{t.nama_tipe}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Kendaraan *</label>
                  <input type="text" value={form.nama_kendaraan} onChange={(e) => setField('nama_kendaraan', e.target.value)} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plat Nomor *</label>
                  <input type="text" value={form.plat_nomor} onChange={(e) => setField('plat_nomor', e.target.value)} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-mono uppercase" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Merek *</label>
                  <input type="text" value={form.merek} onChange={(e) => setField('merek', e.target.value)} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Model *</label>
                  <input type="text" value={form.model} onChange={(e) => setField('model', e.target.value)} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tahun *</label>
                  <input type="number" value={form.tahun} onChange={(e) => setField('tahun', Number(e.target.value))} required min={1990}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Warna *</label>
                  <input type="text" value={form.warna} onChange={(e) => setField('warna', e.target.value)} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kapasitas *</label>
                  <input type="number" value={form.kapasitas_penumpang} onChange={(e) => setField('kapasitas_penumpang', Number(e.target.value))} required min={1}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Harga/Hari (Rp) *</label>
                  <input type="number" value={form.harga_sewa_per_hari} onChange={(e) => setField('harga_sewa_per_hari', e.target.value)} required min={0}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Foto Kendaraan</label>
                <div className="flex items-start gap-4">
                  <label className="flex-1 flex items-center justify-center px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors">
                    <div className="text-center">
                      <svg className="w-8 h-8 text-gray-400 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      <p className="text-xs text-gray-500">{fotoFile ? fotoFile.name : 'Klik atau seret foto ke sini'}</p>
                      <p className="text-xs text-gray-400 mt-0.5">JPG, PNG, maks 2MB</p>
                    </div>
                    <input type="file" accept="image/*" className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) { setFotoFile(f); setFotoPreview(URL.createObjectURL(f)); }
                      }} />
                  </label>
                  {fotoPreview && (
                    <div className="relative shrink-0">
                      <img src={fotoPreview} alt="Preview" className="w-24 h-24 object-cover rounded-lg border border-gray-200" />
                      <button type="button" onClick={() => { setFotoFile(null); setFotoPreview(null); }}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                <textarea value={form.catatan} onChange={(e) => setField('catatan', e.target.value)} rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm resize-none" />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => { setShowForm(false); setEditItem(null); setLastAdded(false); }} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Batal</button>
                {lastAdded && !editItem ? (
                  <button type="button" onClick={() => setLastAdded(false)}
                    className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Tambah Lainnya
                  </button>
                ) : (
                  <button type="submit" disabled={submitting}
                    className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2">
                    {submitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    {editItem ? 'Simpan' : 'Tambah'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!confirmDelete}
        title="Hapus Kendaraan"
        message={`Yakin ingin menghapus "${confirmDelete?.nama_kendaraan}"? Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Kendaraan</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Plat</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Kategori</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Harga/Hari</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <p className="text-gray-500 font-medium">Tidak ada kendaraan</p>
                  </td>
                </tr>
              ) : filtered.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{item.nama_kendaraan}</div>
                    <div className="text-xs text-gray-500">{item.merek} {item.model} {item.tahun}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-gray-700">{item.plat_nomor}</td>
                  <td className="px-4 py-3 text-gray-600">{item.kategori?.nama_kategori || '-'}</td>
                  <td className="px-4 py-3 text-gray-700">{formatRupiah(item.harga_sewa_per_hari)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${vehicleStatusStyles[item.status] || ''}`}>
                      {vehicleStatusLabels[item.status] || item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleEdit(item)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => setConfirmDelete(item)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Hapus">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────── */
/* Main Page                                                     */
/* ───────────────────────────────────────────────────────────── */

const tabs = ['Garasi Partner', 'Garasi Saya'] as const;

export default function GarasiPage() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>('Garasi Partner');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Garasi</h1>
        <p className="text-sm text-gray-500 mt-1">Kelola garasi partner dan kendaraan di garasi milik sendiri</p>
      </div>

      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 self-start">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === t ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {activeTab === 'Garasi Partner' ? <GarasiPartnerTab /> : <GarasiSayaTab />}
    </div>
  );
}
