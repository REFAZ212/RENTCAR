import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import { kategoriAPI, tipeAPI, kendaraanAPI, type Kendaraan } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { formatRupiah } from '../lib/format';
import ConfirmModal from '../components/ConfirmModal';

const emptyKategori = { nama_kategori: '', deskripsi: '', aktif: true };
const emptyTipe = { kategori_id: '', nama_tipe: '', deskripsi: '', aktif: true };

const vehicleStatusStyles: Record<string, string> = {
  tersedia: 'bg-accent-100 text-accent-700',
  disewa: 'bg-primary-100 text-primary-700',
  maintenance: 'bg-accent-100 text-accent-700',
};

const vehicleStatusLabels: Record<string, string> = {
  tersedia: 'Tersedia',
  disewa: 'Disewa',
  maintenance: 'Maintenance',
};

const TipeSuggestions = {
  Mobil: ['MPV', 'SUV', 'Sedan', 'Hatchback', 'Pickup', 'Minibus', 'Van', 'Truk'],
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

  const [expandedTipeId, setExpandedTipeId] = useState<number | null>(null);
  const [tipeKendaraans, setTipeKendaraans] = useState<Record<number, Kendaraan[]>>({});
  const [loadingTipeKendaraans, setLoadingTipeKendaraans] = useState<Set<number>>(new Set());

  const load = useCallback(() => {
    setLoading(true);
    kategoriAPI.list()
      .then(({ data }) => setItems(data as unknown as any[]))
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

  const fetchTipeKendaraan = useCallback((tipeId: number) => {
    setLoadingTipeKendaraans((s) => new Set(s).add(tipeId));
    kendaraanAPI.list({ tipe_id: tipeId, per_page: 100 })
      .then(({ data }: any) => {
        const items = data?.data || data || [];
        setTipeKendaraans((prev) => ({ ...prev, [tipeId]: items }));
      })
      .catch(() => toast.error('Gagal memuat kendaraan'))
      .finally(() => setLoadingTipeKendaraans((s) => { const next = new Set(s); next.delete(tipeId); return next; }));
  }, [toast]);

  const toggleTipeExpand = useCallback((tipeId: number) => {
    setExpandedTipeId((prev) => {
      if (prev === tipeId) return null;
      return tipeId;
    });
  }, []);

  useEffect(() => {
    if (expandedTipeId && !tipeKendaraans[expandedTipeId]) {
      fetchTipeKendaraan(expandedTipeId);
    }
  }, [expandedTipeId, tipeKendaraans, fetchTipeKendaraan]);

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
          await tipeAPI.create({ kategori_id: newKategori.data.id, nama_tipe: nama.trim(), aktif: true });
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-black-900">Kategori & Tipe</h1>
          <p className="text-sm text-black-400 mt-1">Kelola kategori dan tipe kendaraan dalam satu tempat</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kategori atau tipe..."
              className="pl-9 pr-3 py-2 border border-black-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none w-56" />
          </div>
          <button onClick={() => { setKategoriForm(emptyKategori); setEditKategori(null); setTipeNames(['']); setShowKategoriForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Tambah Kategori
          </button>
        </div>
      </div>

      {showKategoriForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setShowKategoriForm(false); setEditKategori(null); setTipeNames(['']); }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-accent-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-black-900">{editKategori ? 'Edit Kategori' : 'Tambah Kategori'}</h2>
              <button onClick={() => { setShowKategoriForm(false); setEditKategori(null); setTipeNames(['']); }} className="p-1 hover:bg-accent-100 rounded-lg transition-colors">
                <svg className="w-5 h-5 text-black-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleKategoriSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-black-700 mb-1">Nama Kategori *</label>
                <input type="text" value={kategoriForm.nama_kategori} onChange={(e) => setKategoriField('nama_kategori', e.target.value)} required
                  placeholder="Contoh: SUV, MPV, Sedan, Hatchback"
                  className="w-full px-3 py-2 border border-black-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-black-700 mb-1">Deskripsi</label>
                <textarea value={kategoriForm.deskripsi} onChange={(e) => setKategoriField('deskripsi', e.target.value)} rows={2}
                  placeholder="Deskripsi singkat tentang kategori ini..."
                  className="w-full px-3 py-2 border border-black-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm resize-none" />
              </div>
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={kategoriForm.aktif} onChange={(e) => setKategoriField('aktif', e.target.checked)} className="sr-only peer" />
                  <div className="w-9 h-5 bg-black-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-black-200 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600" />
                </label>
                <span className="text-sm text-black-700">Aktif</span>
              </div>

              {!editKategori && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-black-700">Tambah Tipe (opsional)</label>
                  <p className="text-xs text-black-400">Masukkan nama tipe untuk kategori ini. Kosongkan jika tidak perlu.</p>
                  {matchedSuggestions && tipeNames.every((n) => !n.trim()) && (
                    <div className="flex items-center gap-2 p-2 bg-primary-50 rounded-lg border border-blue-100">
                      <svg className="w-4 h-4 text-primary-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                      <span className="text-xs text-primary-600 flex-1">Saran tipe untuk <strong>{kategoriForm.nama_kategori}</strong></span>
                      <button type="button" onClick={applySuggestions}
                        className="text-xs font-medium text-primary-600 hover:text-primary-700 underline shrink-0">Gunakan</button>
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
                        className="flex-1 px-3 py-2 border border-black-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
                      <button type="button" onClick={() => setTipeNames((prev) => prev.filter((_, j) => j !== i))}
                        className="p-1.5 text-black-400 hover:text-error-600 hover:bg-error-50 rounded-lg transition-colors shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setTipeNames((prev) => [...prev, ''])}
                    className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-600 font-medium transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Tambah Tipe Lainnya
                  </button>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-accent-100">
                <button type="button" onClick={() => { setShowKategoriForm(false); setEditKategori(null); setTipeNames(['']); }} className="px-4 py-2 text-sm font-medium text-black-700 border border-black-200 rounded-lg hover:bg-canvas transition-colors">Batal</button>
                <button type="submit" disabled={submittingKategori}
                  className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center gap-2">
                  {submittingKategori && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {editKategori ? 'Simpan' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTipeForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setShowTipeForm(false); setEditTipe(null); }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-accent-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-black-900">{editTipe ? 'Edit Tipe' : 'Tambah Tipe'}</h2>
              <button onClick={() => { setShowTipeForm(false); setEditTipe(null); }} className="p-1 hover:bg-accent-100 rounded-lg transition-colors">
                <svg className="w-5 h-5 text-black-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleTipeSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-black-700 mb-1">Kategori *</label>
                {editTipe ? (
                  <div className="w-full px-3 py-2 bg-canvas border border-black-200 rounded-lg text-sm text-black-700">
                    {items.find((k) => k.id === tipeForm.kategori_id)?.nama_kategori || '-'}
                  </div>
                ) : (
                  <select value={tipeForm.kategori_id} onChange={(e) => setTipeField('kategori_id', e.target.value)} required
                    className="w-full px-3 py-2 border border-black-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm">
                    <option value="">Pilih Kategori</option>
                    {items.filter((k) => k.aktif).map((k) => <option key={k.id} value={k.id}>{k.nama_kategori}</option>)}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-black-700 mb-1">Nama Tipe *</label>
                <input type="text" value={tipeForm.nama_tipe} onChange={(e) => setTipeField('nama_tipe', e.target.value)} required
                  placeholder="Contoh: Compact SUV, Low MPV"
                  className="w-full px-3 py-2 border border-black-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
                {matchedTipeSuggestions && !tipeForm.nama_tipe.trim() && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {matchedTipeSuggestions.map((s) => (
                      <button key={s} type="button" onClick={() => setTipeField('nama_tipe', s)}
                        className="px-2.5 py-1 text-xs font-medium bg-primary-50 text-primary-600 rounded-full border border-blue-100 hover:bg-primary-100 transition-colors">
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-black-700 mb-1">Deskripsi</label>
                <textarea value={tipeForm.deskripsi} onChange={(e) => setTipeField('deskripsi', e.target.value)} rows={2}
                  placeholder="Deskripsi singkat tentang tipe ini..."
                  className="w-full px-3 py-2 border border-black-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm resize-none" />
              </div>
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={tipeForm.aktif} onChange={(e) => setTipeField('aktif', e.target.checked)} className="sr-only peer" />
                  <div className="w-9 h-5 bg-black-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-black-200 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600" />
                </label>
                <span className="text-sm text-black-700">Aktif</span>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-accent-100">
                <button type="button" onClick={() => { setShowTipeForm(false); setEditTipe(null); }} className="px-4 py-2 text-sm font-medium text-black-700 border border-black-200 rounded-lg hover:bg-canvas transition-colors">Batal</button>
                <button type="submit" disabled={submittingTipe}
                  className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center gap-2">
                  {submittingTipe && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {editTipe ? 'Simpan' : 'Tambah'}
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
          ? `Yakin ingin menghapus "${confirmDelete?.nama_kategori}"? Tindakan ini tidak dapat dibatalkan.`
          : `Yakin ingin menghapus "${confirmDelete?.nama_tipe}"? Tindakan ini tidak dapat dibatalkan.`
        }
        onConfirm={handleDelete}
        onCancel={() => { setConfirmDelete(null); setDeleteType(null); }}
      />

      <div className="bg-white rounded-xl shadow-sm border border-black-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm text-black-400">Memuat data...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-12 h-12 text-black-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
            <p className="text-black-400 font-medium">{search ? 'Tidak ada hasil pencarian' : 'Tidak ada data kategori'}</p>
            <p className="text-sm text-black-400 mt-1">{search ? 'Coba kata kunci lain' : 'Mulai dengan menambahkan kategori baru'}</p>
          </div>
        ) : (
          <div className="divide-y divide-black-200">
            {filtered.map((kategori) => {
              const isExpanded = expandedId === kategori.id;
              return (
                <div key={kategori.id}>
                  <div
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-canvas/50 transition-colors ${isExpanded ? 'bg-primary-50/30' : ''}`}
                    onClick={() => toggleExpand(kategori.id)}
                  >
                    <svg className={`w-4 h-4 text-black-400 shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>

                    <div className="w-9 h-9 bg-primary-50 rounded-lg flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-black-900 text-sm">{kategori.nama_kategori}</div>
                      <div className="text-xs text-black-400 truncate">{kategori.deskripsi || kategori.slug}</div>
                    </div>

                    <div className="hidden sm:flex items-center gap-4 text-xs text-black-400 shrink-0">
                      <span>{kategori.tipes?.length || 0} tipe</span>
                      <span>{kategori.kendaraans_count ?? 0} unit</span>
                    </div>

                    <span className={`px-2 py-1 text-xs font-medium rounded-full shrink-0 ${kategori.aktif ? 'bg-accent-100 text-accent-700' : 'bg-accent-100 text-black-400'}`}>
                      {kategori.aktif ? 'Aktif' : 'Nonaktif'}
                    </span>

                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => {
                        setKategoriForm({ nama_kategori: kategori.nama_kategori, deskripsi: kategori.deskripsi || '', aktif: kategori.aktif });
                        setEditKategori(kategori);
                        setShowKategoriForm(true);
                      }} className="p-1.5 text-black-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" title="Edit">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => { setConfirmDelete(kategori); setDeleteType('kategori'); }} className="p-1.5 text-black-400 hover:text-error-600 hover:bg-error-50 rounded-lg transition-colors" title="Hapus">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="bg-canvas/70 border-t border-accent-100">
                      {kategori.tipes?.length > 0 ? (
                        <div className="divide-y divide-black-200">
                          {kategori.tipes.map((tipe) => {
                            const isTipeExpanded = expandedTipeId === tipe.id;
                            const kendaraanList = tipeKendaraans[tipe.id] || [];
                            const isLoadingKendaraan = loadingTipeKendaraans.has(tipe.id);
                            return (
                              <Fragment key={tipe.id}>
                                <div
                                  className={`flex items-center gap-3 pl-14 pr-4 py-2.5 hover:bg-accent-100/50 transition-colors cursor-pointer ${isTipeExpanded ? 'bg-primary-50/30' : ''}`}
                                  onClick={() => toggleTipeExpand(tipe.id)}
                                >
                                  <svg className={`w-3.5 h-3.5 text-black-400 shrink-0 transition-transform duration-200 ${isTipeExpanded ? 'rotate-90' : ''}`}
                                    fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>

                                  <div className="w-7 h-7 bg-primary-50 rounded-md flex items-center justify-center shrink-0">
                                    <svg className="w-3.5 h-3.5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <span className="text-sm font-medium text-black-900">{tipe.nama_tipe}</span>
                                  </div>

                                  <span className="text-xs text-black-400 shrink-0">{tipe.kendaraans_count ?? 0} unit</span>

                                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full shrink-0 ${tipe.aktif ? 'bg-accent-100 text-accent-700' : 'bg-accent-100 text-black-400'}`}>
                                    {tipe.aktif ? 'Aktif' : 'Nonaktif'}
                                  </span>

                                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                    <button onClick={() => {
                                      setTipeForm({ kategori_id: tipe.kategori_id || kategori.id, nama_tipe: tipe.nama_tipe, deskripsi: tipe.deskripsi || '', aktif: tipe.aktif });
                                      setEditTipe(tipe);
                                      setShowTipeForm(true);
                                    }} className="p-1.5 text-black-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" title="Edit">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                    </button>
                                    <button onClick={() => { setConfirmDelete(tipe); setDeleteType('tipe'); }} className="p-1.5 text-black-400 hover:text-error-600 hover:bg-error-50 rounded-lg transition-colors" title="Hapus">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                  </div>
                                </div>

                                {isTipeExpanded && (
                                  <div className="bg-canvas/70 border-t border-accent-100">
                                    <div className="px-14 py-4">
                                      {isLoadingKendaraan ? (
                                        <div className="flex items-center gap-2 py-4">
                                          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                          <span className="text-sm text-black-400">Memuat kendaraan...</span>
                                        </div>
                                      ) : kendaraanList.length === 0 ? (
                                        <div className="py-4 text-center">
                                          <p className="text-sm text-black-400">Belum ada kendaraan dengan tipe ini</p>
                                        </div>
                                      ) : (
                                        <div className="space-y-3">
                                          <p className="text-sm font-medium text-black-700">{kendaraanList.length} kendaraan</p>
                                          <div className="bg-white rounded-lg border border-black-200 overflow-hidden">
                                            <table className="w-full text-sm">
                                              <thead className="bg-accent-100 border-b border-black-200">
                                                <tr>
                                                  <th className="text-left px-4 py-2 font-medium text-black-400">Foto</th>
                                                  <th className="text-left px-4 py-2 font-medium text-black-400">Kendaraan</th>
                                                  <th className="text-left px-4 py-2 font-medium text-black-400">Plat</th>
                                                  <th className="text-left px-4 py-2 font-medium text-black-400">Kategori</th>
                                                  <th className="text-left px-4 py-2 font-medium text-black-400">Harga/Hari</th>
                                                  <th className="text-left px-4 py-2 font-medium text-black-400">Status</th>
                                                </tr>
                                              </thead>
                                              <tbody className="divide-y divide-black-200">
                                                {kendaraanList.map((k) => (
                                                  <tr key={k.id} className="hover:bg-canvas/50 transition-colors">
                                                    <td className="px-4 py-2.5">
                                                      {k.foto ? (
                                                        <img
                                                          src={k.foto.startsWith('http') ? k.foto : `/storage/${k.foto}`}
                                                          alt={k.nama_kendaraan}
                                                          className="w-12 h-12 object-cover rounded-lg border border-black-200"
                                                        />
                                                      ) : (
                                                        <div className="w-12 h-12 bg-accent-100 rounded-lg border border-black-200 flex items-center justify-center">
                                                          <svg className="w-5 h-5 text-black-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                        </div>
                                                      )}
                                                    </td>
                                                    <td className="px-4 py-2.5">
                                                      <div className="font-medium text-black-900">{k.nama_kendaraan}</div>
                                                      <div className="text-xs text-black-400">{k.merek} {k.model} {k.tahun}</div>
                                                    </td>
                                                    <td className="px-4 py-2.5 font-mono text-sm text-black-700">{k.plat_nomor}</td>
                                                    <td className="px-4 py-2.5 text-black-400">{k.kategori?.nama_kategori || '-'}</td>
                                                    <td className="px-4 py-2.5 text-black-700">{formatRupiah(k.harga_sewa_per_hari)}</td>
                                                    <td className="px-4 py-2.5">
                                                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${vehicleStatusStyles[k.status] || ''}`}>
                                                        {vehicleStatusLabels[k.status] || k.status}
                                                      </span>
                                                    </td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </Fragment>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-black-400 pl-14 py-3">Belum ada tipe</p>
                      )}

                      <div className="pl-14 pr-4 pb-3 pt-1">
                        <button onClick={() => {
                          setTipeForm({ ...emptyTipe, kategori_id: kategori.id });
                          setEditTipe(null);
                          setShowTipeForm(true);
                        }} className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-600 font-medium transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                          Tambah Tipe
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
