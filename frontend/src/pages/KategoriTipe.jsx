import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { kategoriAPI, tipeAPI, kendaraanAPI, garasiPartnerAPI } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import ConfirmModal from '../components/ConfirmModal';

const statusStyles = { tersedia: 'bg-green-100 text-green-800', disewa: 'bg-blue-100 text-blue-800', maintenance: 'bg-yellow-100 text-yellow-800', tidak_tersedia: 'bg-red-100 text-red-800' };
const statusLabels = { tersedia: 'Tersedia', disewa: 'Disewa', maintenance: 'Maintenance', tidak_tersedia: 'Tidak Tersedia' };

function formatRupiah(n) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
}

const emptyKategori = { nama_kategori: '', deskripsi: '', aktif: true };
const emptyTipe = { kategori_id: '', nama_tipe: '', deskripsi: '', aktif: true };

const TipeSuggestions = {
  Mobil: ['MPV', 'SUV', 'Sedan', 'Hatchback', 'Pickup', 'Minibus', 'Van', 'Truk'],
  Sepeda: ['Gunung (MTB)', 'Jalan (Road Bike)', 'Lipat', 'BMX', 'Listrik', 'Kota'],
  Motor: ['Sport', 'Matic', 'Bebek', 'Trail'],
};

export default function KategoriTipe() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const [showKategoriForm, setShowKategoriForm] = useState(false);
  const [editKategori, setEditKategori] = useState(null);
  const [kategoriForm, setKategoriForm] = useState(emptyKategori);
  const [submittingKategori, setSubmittingKategori] = useState(false);
  const [tipeNames, setTipeNames] = useState(['']);

  const matchedSuggestions = useMemo(() => {
    const key = Object.keys(TipeSuggestions).find(
      (k) => k.toLowerCase() === kategoriForm.nama_kategori.trim().toLowerCase()
    );
    return key ? TipeSuggestions[key] : null;
  }, [kategoriForm.nama_kategori]);

  const applySuggestions = () => {
    if (matchedSuggestions) setTipeNames([...matchedSuggestions]);
  };

  const [showTipeForm, setShowTipeForm] = useState(false);
  const [editTipe, setEditTipe] = useState(null);
  const [tipeForm, setTipeForm] = useState(emptyTipe);
  const [submittingTipe, setSubmittingTipe] = useState(false);

  const matchedTipeSuggestions = useMemo(() => {
    if (editTipe) return null;
    const kategori = items.find((k) => k.id === Number(tipeForm.kategori_id));
    if (!kategori) return null;
    const key = Object.keys(TipeSuggestions).find(
      (k) => k.toLowerCase() === kategori.nama_kategori.trim().toLowerCase()
    );
    return key ? TipeSuggestions[key] : null;
  }, [tipeForm.kategori_id, items, editTipe]);

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleteType, setDeleteType] = useState(null);

  const [expandedTipeId, setExpandedTipeId] = useState(null);
  const [expandedTipeKendaraans, setExpandedTipeKendaraans] = useState([]);
  const [loadingTipeKendaraan, setLoadingTipeKendaraan] = useState(false);

  const [garasiPartners, setGarasiPartners] = useState([]);
  const [showKendaraanForm, setShowKendaraanForm] = useState(false);
  const [kendaraanForm, setKendaraanForm] = useState({});
  const [kendaraanFormTipe, setKendaraanFormTipe] = useState(null);
  const [kendaraanFormKategori, setKendaraanFormKategori] = useState(null);
  const [submittingKendaraan, setSubmittingKendaraan] = useState(false);
  const [fotoFile, setFotoFile] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);

  useEffect(() => { garasiPartnerAPI.list().then(({ data }) => setGarasiPartners(data.data || [])).catch(() => {}); }, []);

  const openKendaraanForm = (tipe, kategori) => {
    setKendaraanFormTipe(tipe);
    setKendaraanFormKategori(kategori);
    setKendaraanForm({
      garasi_partner_id: '',
      kategori_id: kategori.id,
      tipe_id: tipe.id,
      nama_kendaraan: '',
      plat_nomor: '',
      merek: '',
      model: '',
      tahun: new Date().getFullYear(),
      warna: '',
      kapasitas_penumpang: 7,
      harga_sewa_per_hari: '',
      catatan: '',
    });
    setFotoFile(null);
    setFotoPreview(null);
    setShowKendaraanForm(true);
  };

  const refreshTipeKendaraans = async () => {
    if (expandedTipeId) {
      const { data } = await tipeAPI.kendaraans(expandedTipeId);
      setExpandedTipeKendaraans(data);
    }
  };

  const handleKendaraanSubmit = async (e) => {
    e.preventDefault();
    setSubmittingKendaraan(true);
    try {
      const hasFile = fotoFile instanceof File;
      if (hasFile) {
        const fd = new FormData();
        Object.entries(kendaraanForm).forEach(([k, v]) => { if (v !== '' && v !== null && v !== undefined) fd.append(k, v); });
        fd.append('foto', fotoFile);
        await kendaraanAPI.create(fd);
      } else {
        await kendaraanAPI.create(kendaraanForm);
      }
      toast.success('Kendaraan berhasil ditambahkan');
      setShowKendaraanForm(false);
      load();
      refreshTipeKendaraans();
    } catch (err) {
      toast.error(err.response?.data?.message || Object.values(err.response?.data?.errors || {})[0]?.[0] || 'Gagal menyimpan kendaraan');
    } finally { setSubmittingKendaraan(false); }
  };

  const setKendField = (key, value) => setKendaraanForm((p) => ({ ...p, [key]: value }));

  const toggleTipeExpand = async (tipeId) => {
    if (expandedTipeId === tipeId) {
      setExpandedTipeId(null);
      setExpandedTipeKendaraans([]);
      return;
    }
    setExpandedTipeId(tipeId);
    setLoadingTipeKendaraan(true);
    try {
      const { data } = await tipeAPI.kendaraans(tipeId);
      setExpandedTipeKendaraans(data);
    } catch {
      toast.error('Gagal memuat kendaraan');
    }
    setLoadingTipeKendaraan(false);
  };

  const load = useCallback(() => {
    setLoading(true);
    kategoriAPI.list()
      .then(({ data }) => setItems(data))
      .catch(() => toast.error('Gagal memuat data'))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter((k) => {
    const q = search.toLowerCase();
    if (k.nama_kategori.toLowerCase().includes(q)) return true;
    if (k.tipes?.some((t) => t.nama_tipe.toLowerCase().includes(q))) return true;
    return false;
  });

  const toggleExpand = (id) => setExpandedId((prev) => (prev === id ? null : id));

  const setKategoriField = (key, value) => setKategoriForm((prev) => ({ ...prev, [key]: value }));
  const setTipeField = (key, value) => setTipeForm((prev) => ({ ...prev, [key]: value }));

  const handleKategoriSubmit = async (e) => {
    e.preventDefault();
    setSubmittingKategori(true);
    try {
      if (editKategori) {
        await kategoriAPI.update(editKategori.id, kategoriForm);
        toast.success('Kategori berhasil diperbarui');
      } else {
        const { data: newKategori } = await kategoriAPI.create(kategoriForm);
        const validTipes = tipeNames.filter((n) => n.trim());
        for (const nama of validTipes) {
          await tipeAPI.create({ kategori_id: newKategori.id, nama_tipe: nama.trim(), aktif: true });
        }
        toast.success(validTipes.length > 0
          ? `Kategori dan ${validTipes.length} tipe berhasil ditambahkan`
          : 'Kategori berhasil ditambahkan');
      }
      setShowKategoriForm(false);
      setEditKategori(null);
      setKategoriForm(emptyKategori);
      setTipeNames(['']);
      load();
    } catch (err) {
      const msg = err.response?.data?.message || Object.values(err.response?.data?.errors || {})[0]?.[0] || 'Gagal menyimpan data';
      toast.error(msg);
    } finally {
      setSubmittingKategori(false);
    }
  };

  const handleTipeSubmit = async (e) => {
    e.preventDefault();
    setSubmittingTipe(true);
    try {
      if (editTipe) {
        await tipeAPI.update(editTipe.id, tipeForm);
        toast.success('Tipe berhasil diperbarui');
      } else {
        await tipeAPI.create(tipeForm);
        toast.success('Tipe berhasil ditambahkan');
      }
      setShowTipeForm(false);
      setEditTipe(null);
      setTipeForm(emptyTipe);
      load();
    } catch (err) {
      const msg = err.response?.data?.message || Object.values(err.response?.data?.errors || {})[0]?.[0] || 'Gagal menyimpan data';
      toast.error(msg);
    } finally {
      setSubmittingTipe(false);
    }
  };

  const handleDelete = async () => {
    try {
      if (deleteType === 'kategori') {
        await kategoriAPI.delete(confirmDelete.id);
        toast.success('Kategori berhasil dihapus');
      } else {
        await tipeAPI.delete(confirmDelete.id);
        toast.success('Tipe berhasil dihapus');
      }
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus data');
    }
    setConfirmDelete(null);
    setDeleteType(null);
  };

  return (
    <div className="space-y-6">
      {/* Kategori Form Modal */}
      {showKategoriForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => { setShowKategoriForm(false); setEditKategori(null); setTipeNames(['']); }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-gray-900">{editKategori ? 'Edit Kategori' : 'Tambah Kategori'}</h2>
              <button onClick={() => { setShowKategoriForm(false); setEditKategori(null); setTipeNames(['']); }} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleKategoriSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Kategori *</label>
                <input type="text" value={kategoriForm.nama_kategori} onChange={(e) => setKategoriField('nama_kategori', e.target.value)} required
                  placeholder="Contoh: Motor, Mobil, Sepeda..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                <textarea value={kategoriForm.deskripsi} onChange={(e) => setKategoriField('deskripsi', e.target.value)} rows="2"
                  placeholder="Deskripsi singkat tentang kategori ini..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm resize-none" />
              </div>
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={kategoriForm.aktif} onChange={(e) => setKategoriField('aktif', e.target.checked)} className="sr-only peer" />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                </label>
                <span className="text-sm text-gray-700">Aktif</span>
              </div>

              {!editKategori && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Tambah Tipe (opsional)</label>
                  <p className="text-xs text-gray-400">Masukkan nama tipe untuk kategori ini. Kosongkan jika tidak perlu.</p>
                  {matchedSuggestions && tipeNames.every((n) => !n.trim()) && (
                    <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-100">
                      <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                      <span className="text-xs text-blue-700 flex-1">Saran tipe untuk <strong>{kategoriForm.nama_kategori}</strong></span>
                      <button type="button" onClick={applySuggestions}
                        className="text-xs font-medium text-blue-600 hover:text-blue-800 underline shrink-0">Gunakan</button>
                    </div>
                  )}
                  {tipeNames.map((name, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input type="text" value={name} onChange={(e) => {
                        const next = [...tipeNames];
                        next[i] = e.target.value;
                        setTipeNames(next);
                      }}
                        placeholder={`Tipe ${i + 1}`}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
                      <button type="button" onClick={() => setTipeNames((prev) => prev.filter((_, j) => j !== i))}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setTipeNames((prev) => [...prev, ''])}
                    className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Tambah Tipe Lainnya
                  </button>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => { setShowKategoriForm(false); setEditKategori(null); setTipeNames(['']); }} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Batal</button>
                <button type="submit" disabled={submittingKategori}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2">
                  {submittingKategori && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {editKategori ? 'Simpan' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tipe Form Modal */}
      {showTipeForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => { setShowTipeForm(false); setEditTipe(null); }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{editTipe ? 'Edit Tipe' : 'Tambah Tipe'}</h2>
                {tipeForm.kategori_id && <p className="text-xs text-gray-500 mt-0.5">{items.find((k) => k.id === Number(tipeForm.kategori_id))?.nama_kategori || ''}</p>}
              </div>
              <button onClick={() => { setShowTipeForm(false); setEditTipe(null); }} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleTipeSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori *</label>
                {editTipe ? (
                  <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
                    {items.find((k) => k.id === tipeForm.kategori_id)?.nama_kategori || '-'}
                  </div>
                ) : (
                  <select value={tipeForm.kategori_id} onChange={(e) => setTipeField('kategori_id', e.target.value)} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm">
                    <option value="">Pilih Kategori</option>
                    {items.filter((k) => k.aktif).map((k) => <option key={k.id} value={k.id}>{k.nama_kategori}</option>)}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Tipe *</label>
                <input type="text" value={tipeForm.nama_tipe} onChange={(e) => setTipeField('nama_tipe', e.target.value)} required
                  placeholder="Contoh: Compact SUV, Low MPV"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
                {matchedTipeSuggestions && !tipeForm.nama_tipe.trim() && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {matchedTipeSuggestions.map((s) => (
                      <button key={s} type="button" onClick={() => setTipeField('nama_tipe', s)}
                        className="px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-full border border-blue-100 hover:bg-blue-100 transition-colors">
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                <textarea value={tipeForm.deskripsi} onChange={(e) => setTipeField('deskripsi', e.target.value)} rows="2"
                  placeholder="Deskripsi singkat tentang tipe ini..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm resize-none" />
              </div>
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={tipeForm.aktif} onChange={(e) => setTipeField('aktif', e.target.checked)} className="sr-only peer" />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                </label>
                <span className="text-sm text-gray-700">Aktif</span>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => { setShowTipeForm(false); setEditTipe(null); }} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Batal</button>
                <button type="submit" disabled={submittingTipe}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2">
                  {submittingTipe && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {editTipe ? 'Simpan' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Kendaraan Form Modal */}
      {showKendaraanForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowKendaraanForm(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Tambah Kendaraan</h2>
                <p className="text-xs text-gray-500 mt-0.5">{kendaraanFormKategori?.nama_kategori} / {kendaraanFormTipe?.nama_tipe}</p>
              </div>
              <button onClick={() => setShowKendaraanForm(false)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleKendaraanSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Garasi Partner *</label>
                  <select value={kendaraanForm.garasi_partner_id} onChange={(e) => setKendField('garasi_partner_id', e.target.value)} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm">
                    <option value="">Pilih Garasi</option>
                    {garasiPartners.map((g) => <option key={g.id} value={g.id}>{g.nama_garasi}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Kendaraan *</label>
                  <input type="text" value={kendaraanForm.nama_kendaraan} onChange={(e) => setKendField('nama_kendaraan', e.target.value)} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plat Nomor *</label>
                  <input type="text" value={kendaraanForm.plat_nomor} onChange={(e) => setKendField('plat_nomor', e.target.value)} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-mono uppercase" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Merek *</label>
                  <input type="text" value={kendaraanForm.merek} onChange={(e) => setKendField('merek', e.target.value)} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Model *</label>
                  <input type="text" value={kendaraanForm.model} onChange={(e) => setKendField('model', e.target.value)} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tahun *</label>
                  <input type="number" value={kendaraanForm.tahun} onChange={(e) => setKendField('tahun', e.target.value)} required min="1990"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Warna *</label>
                  <input type="text" value={kendaraanForm.warna} onChange={(e) => setKendField('warna', e.target.value)} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kapasitas *</label>
                  <input type="number" value={kendaraanForm.kapasitas_penumpang} onChange={(e) => setKendField('kapasitas_penumpang', e.target.value)} required min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Harga/Hari (Rp) *</label>
                  <input type="number" value={kendaraanForm.harga_sewa_per_hari} onChange={(e) => setKendField('harga_sewa_per_hari', e.target.value)} required min="0"
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
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setFotoFile(f); setFotoPreview(URL.createObjectURL(f)); } }} />
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
                <textarea value={kendaraanForm.catatan} onChange={(e) => setKendField('catatan', e.target.value)} rows="2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm resize-none" />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setShowKendaraanForm(false)} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Batal</button>
                <button type="submit" disabled={submittingKendaraan}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2">
                  {submittingKendaraan && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  Tambah
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!confirmDelete}
        title={deleteType === 'kategori' ? 'Hapus Kategori' : 'Hapus Tipe'}
        message={deleteType === 'kategori'
          ? `Yakin ingin menghapus "${confirmDelete?.nama_kategori}"? Semua tipe di dalamnya akan ikut terhapus.`
          : `Yakin ingin menghapus "${confirmDelete?.nama_tipe}"? Tindakan ini tidak dapat dibatalkan.`
        }
        onConfirm={handleDelete}
        onCancel={() => { setConfirmDelete(null); setDeleteType(null); }}
      />

      {/* Header + Search */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Kategori & Tipe</h1>
        <button onClick={() => { setKategoriForm(emptyKategori); setEditKategori(null); setTipeNames(['']); setShowKategoriForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Tambah Kategori
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="relative max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" placeholder="Cari kategori atau tipe..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="w-10 px-4 py-3" />
                <th className="text-left px-4 py-3 font-medium text-gray-600">Kategori</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tipe</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Unit</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="6" className="p-12 text-center">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Memuat data...</p>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="6" className="p-12 text-center">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                  <p className="text-gray-500 font-medium">{search ? 'Tidak ada hasil pencarian' : 'Tidak ada data kategori'}</p>
                  <p className="text-sm text-gray-400 mt-1">{search ? 'Coba kata kunci lain' : 'Mulai dengan menambahkan kategori baru'}</p>
                </td></tr>
              ) : filtered.map((kategori) => (
                <React.Fragment key={kategori.id}>
                  <tr className={`hover:bg-gray-50/50 transition-colors ${expandedId === kategori.id ? 'bg-blue-50/30' : ''}`}>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleExpand(kategori.id)}
                        className={`p-1 rounded-lg transition-colors ${expandedId === kategori.id ? 'text-blue-600 bg-blue-50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}>
                        <svg className={`w-4 h-4 transition-transform ${expandedId === kategori.id ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{kategori.nama_kategori}</div>
                      <div className="text-xs text-gray-500">{kategori.deskripsi || '-'}</div>
                    </td>
                    <td className="px-4 py-3"><span className="px-2 py-1 text-xs font-medium bg-purple-50 text-purple-700 rounded-full">{kategori.tipes?.length || 0} tipe</span></td>
                    <td className="px-4 py-3"><span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">{kategori.kendaraans_count ?? 0} unit</span></td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${kategori.aktif ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {kategori.aktif ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => { setKategoriForm({ nama_kategori: kategori.nama_kategori, deskripsi: kategori.deskripsi || '', aktif: kategori.aktif }); setEditKategori(kategori); setShowKategoriForm(true); }}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => { setConfirmDelete(kategori); setDeleteType('kategori'); }}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Hapus">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === kategori.id && (
                    <tr>
                      <td colSpan="6" className="p-0">
                        <div className="bg-gray-50 border-t border-b border-gray-200 px-6 py-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-gray-700">Tipe di {kategori.nama_kategori}</h4>
                            <button onClick={() => { setTipeForm({ ...emptyTipe, kategori_id: kategori.id }); setEditTipe(null); setShowTipeForm(true); }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 transition-colors">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                              Tambah Tipe
                            </button>
                          </div>
                          {kategori.tipes?.length === 0 ? (
                            <div className="text-center py-8">
                              <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                              <p className="text-sm text-gray-500">Belum ada tipe</p>
                            </div>
                          ) : (
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                              <table className="w-full text-sm">
                                <thead className="bg-gray-100 border-b border-gray-200">
                                  <tr>
                                    <th className="w-8 px-2 py-2" />
                                    <th className="text-left px-4 py-2 font-medium text-gray-600">Tipe</th>
                                    <th className="text-left px-4 py-2 font-medium text-gray-600">Unit</th>
                                    <th className="text-left px-4 py-2 font-medium text-gray-600">Status</th>
                                    <th className="text-right px-4 py-2 font-medium text-gray-600">Aksi</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {kategori.tipes.map((tipe) => (
                                    <React.Fragment key={tipe.id}>
                                      <tr className={`hover:bg-gray-50/50 transition-colors ${expandedTipeId === tipe.id ? 'bg-blue-50/30' : ''}`}>
                                        <td className="px-2 py-2.5">
                                          <button onClick={() => toggleTipeExpand(tipe.id)}
                                            className={`p-1 rounded-lg transition-colors ${expandedTipeId === tipe.id ? 'text-blue-600 bg-blue-50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}>
                                            <svg className={`w-3.5 h-3.5 transition-transform ${expandedTipeId === tipe.id ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                          </button>
                                        </td>
                                        <td className="px-4 py-2.5">
                                          <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center shrink-0">
                                              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                            </div>
                                            <div>
                                              <div className="font-medium text-gray-900">{tipe.nama_tipe}</div>
                                              <div className="text-xs text-gray-500">{tipe.deskripsi || '-'}</div>
                                            </div>
                                          </div>
                                        </td>
                                        <td className="px-4 py-2.5"><span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">{tipe.kendaraans_count ?? 0} unit</span></td>
                                        <td className="px-4 py-2.5"><span className={`px-2 py-1 text-xs font-medium rounded-full ${tipe.aktif ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>{tipe.aktif ? 'Aktif' : 'Nonaktif'}</span></td>
                                        <td className="px-4 py-2.5 text-right">
                                          <div className="flex items-center justify-end gap-1">
                                            <button onClick={() => { setTipeForm({ kategori_id: tipe.kategori_id || kategori.id, nama_tipe: tipe.nama_tipe, deskripsi: tipe.deskripsi || '', aktif: tipe.aktif }); setEditTipe(tipe); setShowTipeForm(true); }}
                                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                            </button>
                                            <button onClick={() => { setConfirmDelete(tipe); setDeleteType('tipe'); }}
                                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Hapus">
                                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                      {expandedTipeId === tipe.id && (
                                        <tr>
                                          <td colSpan="5" className="p-0">
                                            <div className="bg-gray-50 border-t border-b border-gray-200 px-4 py-3 ml-6">
                                              <div className="flex items-center justify-between mb-2">
                                                <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Kendaraan dengan tipe {tipe.nama_tipe}</h5>
                                                <button onClick={() => openKendaraanForm(tipe, kategori)}
                                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors">
                                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                                  Tambah Kendaraan
                                                </button>
                                              </div>
                                              {loadingTipeKendaraan ? (
                                                <div className="flex items-center justify-center py-6">
                                                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                                  <span className="ml-2 text-xs text-gray-500">Memuat kendaraan...</span>
                                                </div>
                                              ) : expandedTipeKendaraans.length === 0 ? (
                                                <div className="text-center py-6">
                                                  <p className="text-xs text-gray-400">Tidak ada kendaraan</p>
                                                </div>
                                              ) : (
                                                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                                  <table className="w-full text-sm">
                                                    <thead className="bg-gray-100 border-b border-gray-200">
                                                      <tr>
                                                        <th className="text-left px-3 py-2 font-medium text-gray-600">Kendaraan</th>
                                                        <th className="text-left px-3 py-2 font-medium text-gray-600">Plat</th>
                                                        <th className="text-left px-3 py-2 font-medium text-gray-600">Garasi</th>
                                                        <th className="text-left px-3 py-2 font-medium text-gray-600">Harga/Hari</th>
                                                        <th className="text-left px-3 py-2 font-medium text-gray-600">Status</th>
                                                      </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                      {expandedTipeKendaraans.map((k) => (
                                                        <tr key={k.id} className="hover:bg-gray-50/50">
                                                          <td className="px-3 py-2">
                                                            <div className="flex items-center gap-2">
                                                              {k.foto ? (
                                                                <img src={k.foto.startsWith('http') ? k.foto : `/storage/${k.foto}`}
                                                                  alt={k.nama_kendaraan} className="w-7 h-7 rounded-md object-cover border border-gray-200 shrink-0" />
                                                              ) : (
                                                                <div className="w-7 h-7 bg-gray-100 rounded-md flex items-center justify-center shrink-0">
                                                                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 17h.01M16 17h.01M3 11l1.5-5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.4L21 11M3 11h18M3 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-6" /></svg>
                                                                </div>
                                                              )}
                                                              <div>
                                                                <div className="font-medium text-gray-900">{k.nama_kendaraan}</div>
                                                                <div className="text-xs text-gray-500">{k.merek} {k.model}</div>
                                                              </div>
                                                            </div>
                                                          </td>
                                                          <td className="px-3 py-2 font-mono text-xs text-gray-700">{k.plat_nomor}</td>
                                                          <td className="px-3 py-2 text-gray-600 text-xs">{k.garasi_partner?.nama_garasi || '-'}</td>
                                                          <td className="px-3 py-2 text-gray-700 text-xs">{formatRupiah(k.harga_sewa_per_hari)}</td>
                                                          <td className="px-3 py-2"><span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusStyles[k.status]}`}>{statusLabels[k.status]}</span></td>
                                                        </tr>
                                                      ))}
                                                    </tbody>
                                                  </table>
                                                </div>
                                              )}
                                            </div>
                                          </td>
                                        </tr>
                                      )}
                                    </React.Fragment>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
