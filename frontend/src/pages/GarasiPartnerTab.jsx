import React, { useState, useEffect, useCallback } from 'react';
import { kendaraanAPI, garasiPartnerAPI, kategoriAPI, tipeAPI } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import ConfirmModal from '../components/ConfirmModal';

const statuses = ['tersedia', 'disewa', 'maintenance', 'tidak_tersedia'];
const statusStyles = { tersedia: 'bg-green-100 text-green-800', disewa: 'bg-blue-100 text-blue-800', maintenance: 'bg-yellow-100 text-yellow-800', tidak_tersedia: 'bg-red-100 text-red-800' };
const statusLabels = { tersedia: 'Tersedia', disewa: 'Disewa', maintenance: 'Maintenance', tidak_tersedia: 'Tidak Tersedia' };
const emptyGarasiForm = { nama_garasi: '', nama_pemilik: '', alamat: '', no_hp: '', email: '', status_aktif: true, catatan: '' };

function formatRupiah(n) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
}

function makeKendaraanForm(garasiId) {
  return { garasi_partner_id: garasiId || '', kategori_id: '', tipe_id: '', nama_kendaraan: '', plat_nomor: '', merek: '', model: '', tahun: new Date().getFullYear(), warna: '', kapasitas_penumpang: 7, harga_sewa_per_hari: '', status: 'tersedia', catatan: '' };
}

export default function GarasiPartnerTab() {
  const toast = useToast();
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [expandedKendaraans, setExpandedKendaraans] = useState([]);
  const [loadingKendaraan, setLoadingKendaraan] = useState(false);

  const [showGarasiForm, setShowGarasiForm] = useState(false);
  const [editGarasi, setEditGarasi] = useState(null);
  const [garasiForm, setGarasiForm] = useState(emptyGarasiForm);
  const [submittingGarasi, setSubmittingGarasi] = useState(false);
  const [confirmDeleteGarasi, setConfirmDeleteGarasi] = useState(null);

  const [showKendaraanForm, setShowKendaraanForm] = useState(false);
  const [editKendaraan, setEditKendaraan] = useState(null);
  const [kendaraanGarasiId, setKendaraanGarasiId] = useState(null);
  const [kendaraanGarasiName, setKendaraanGarasiName] = useState('');
  const [kendaraanForm, setKendaraanForm] = useState({});
  const [fotoFile, setFotoFile] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [submittingKendaraan, setSubmittingKendaraan] = useState(false);
  const [confirmDeleteKendaraan, setConfirmDeleteKendaraan] = useState(null);
  const [lastAdded, setLastAdded] = useState(false);

  const [kategoris, setKategoris] = useState([]);
  const [tipes, setTipes] = useState([]);
  const [selectedKategoriId, setSelectedKategoriId] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    garasiPartnerAPI.list({ search })
      .then(({ data }) => setPartners(data.data))
      .catch(() => toast.error('Gagal memuat data garasi partner'))
      .finally(() => setLoading(false));
  }, [search, toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { kategoriAPI.list().then(({ data }) => setKategoris(data)).catch(() => {}); }, []);
  useEffect(() => {
    if (!selectedKategoriId) { setTipes([]); return; }
    tipeAPI.list({ kategori_id: selectedKategoriId }).then(({ data }) => setTipes(data)).catch(() => {});
  }, [selectedKategoriId]);

  const toggleExpand = async (partner) => {
    if (expandedId === partner.id) { setExpandedId(null); setExpandedKendaraans([]); return; }
    setExpandedId(partner.id);
    setLoadingKendaraan(true);
    try { const { data } = await garasiPartnerAPI.get(partner.id); setExpandedKendaraans(data.kendaraans || []); }
    catch { toast.error('Gagal memuat kendaraan'); }
    setLoadingKendaraan(false);
  };

  const openKendaraanForm = (garasiId, garasiName, item = null) => {
    setKendaraanGarasiId(garasiId);
    setKendaraanGarasiName(garasiName);
    setEditKendaraan(item);
    setSelectedKategoriId(item?.kategori_id || '');
    if (item) {
      setKendaraanForm({ garasi_partner_id: item.garasi_partner_id, kategori_id: item.kategori_id || '', tipe_id: item.tipe_id || '', nama_kendaraan: item.nama_kendaraan, plat_nomor: item.plat_nomor, merek: item.merek, model: item.model, tahun: item.tahun, warna: item.warna, kapasitas_penumpang: item.kapasitas_penumpang, harga_sewa_per_hari: item.harga_sewa_per_hari, status: item.status, catatan: item.catatan || '' });
      setFotoFile(null);
      setFotoPreview(item.foto ? (item.foto.startsWith('http') ? item.foto : `/storage/${item.foto}`) : null);
    } else {
      setKendaraanForm(makeKendaraanForm(garasiId));
      setFotoFile(null);
      setFotoPreview(null);
    }
    setLastAdded(false);
    setShowKendaraanForm(true);
  };

  const refreshExpanded = async () => {
    if (expandedId) { const { data } = await garasiPartnerAPI.get(expandedId); setExpandedKendaraans(data.kendaraans || []); }
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
        if (editKendaraan) await kendaraanAPI.update(editKendaraan.id, fd);
        else await kendaraanAPI.create(fd);
      } else {
        if (editKendaraan) await kendaraanAPI.update(editKendaraan.id, kendaraanForm);
        else await kendaraanAPI.create(kendaraanForm);
      }
      toast.success(editKendaraan ? 'Kendaraan berhasil diperbarui' : 'Kendaraan berhasil ditambahkan');
      if (editKendaraan) { setShowKendaraanForm(false); setEditKendaraan(null); setLastAdded(false); }
      else { setLastAdded(true); }
      load();
      refreshExpanded();
    } catch (err) {
      toast.error(err.response?.data?.message || Object.values(err.response?.data?.errors || {})[0]?.[0] || 'Gagal menyimpan kendaraan');
    } finally { setSubmittingKendaraan(false); }
  };

  const handleDeleteKendaraan = async () => {
    try { await kendaraanAPI.delete(confirmDeleteKendaraan.id); toast.success('Kendaraan berhasil dihapus'); setShowKendaraanForm(false); setEditKendaraan(null); load(); refreshExpanded(); }
    catch (err) { toast.error(err.response?.data?.message || 'Gagal menghapus kendaraan'); }
    setConfirmDeleteKendaraan(null);
  };

  const handleGarasiSubmit = async (e) => {
    e.preventDefault();
    setSubmittingGarasi(true);
    try {
      if (editGarasi) { await garasiPartnerAPI.update(editGarasi.id, garasiForm); toast.success('Garasi partner berhasil diperbarui'); }
      else { await garasiPartnerAPI.create({ ...garasiForm, is_own: false }); toast.success('Garasi partner berhasil ditambahkan'); }
      setShowGarasiForm(false); setEditGarasi(null); setGarasiForm(emptyGarasiForm); load();
    } catch (err) { toast.error(err.response?.data?.message || Object.values(err.response?.data?.errors || {})[0]?.[0] || 'Gagal menyimpan garasi'); }
    finally { setSubmittingGarasi(false); }
  };

  const handleDeleteGarasi = async () => {
    try { await garasiPartnerAPI.delete(confirmDeleteGarasi.id); toast.success('Garasi partner berhasil dihapus'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Gagal menghapus garasi partner'); }
    setConfirmDeleteGarasi(null);
  };

  const setKendField = (key, value) => setKendaraanForm((p) => ({ ...p, [key]: value }));
  const setGarasiField = (key, value) => setGarasiForm((p) => ({ ...p, [key]: value }));

  return (
    <div className="space-y-6">
      {/* Garasi Form Modal */}
      {showGarasiForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => { setShowGarasiForm(false); setEditGarasi(null); }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-gray-900">{editGarasi ? 'Edit Garasi Partner' : 'Tambah Garasi Partner'}</h2>
              <button onClick={() => { setShowGarasiForm(false); setEditGarasi(null); }} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleGarasiSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Garasi *</label>
                  <input type="text" value={garasiForm.nama_garasi} onChange={(e) => setGarasiField('nama_garasi', e.target.value)} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Pemilik *</label>
                  <input type="text" value={garasiForm.nama_pemilik} onChange={(e) => setGarasiField('nama_pemilik', e.target.value)} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">No. HP *</label>
                  <input type="text" value={garasiForm.no_hp} onChange={(e) => setGarasiField('no_hp', e.target.value)} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={garasiForm.email} onChange={(e) => setGarasiField('email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alamat *</label>
                <textarea value={garasiForm.alamat} onChange={(e) => setGarasiField('alamat', e.target.value)} rows="2" required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                <textarea value={garasiForm.catatan} onChange={(e) => setGarasiField('catatan', e.target.value)} rows="2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm resize-none" />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => { setShowGarasiForm(false); setEditGarasi(null); }} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Batal</button>
                <button type="submit" disabled={submittingGarasi}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2">
                  {submittingGarasi && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {editGarasi ? 'Simpan' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Kendaraan Form Modal */}
      {showKendaraanForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => { setShowKendaraanForm(false); setEditKendaraan(null); setLastAdded(false); }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{editKendaraan ? 'Edit Kendaraan' : 'Tambah Kendaraan'}</h2>
                {kendaraanGarasiName && <p className="text-xs text-gray-500 mt-0.5">{kendaraanGarasiName}</p>}
              </div>
              <button onClick={() => { setShowKendaraanForm(false); setEditKendaraan(null); setLastAdded(false); }} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleKendaraanSubmit} className="p-6 space-y-4">
              {lastAdded && !editKendaraan && (
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
                  <select value={kendaraanForm.kategori_id} onChange={(e) => { setKendField('kategori_id', e.target.value); setKendField('tipe_id', ''); setSelectedKategoriId(e.target.value); }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm">
                    <option value="">Pilih Kategori</option>
                    {kategoris.filter((k) => k.aktif).map((k) => <option key={k.id} value={k.id}>{k.nama_kategori}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Kendaraan</label>
                  <select value={kendaraanForm.tipe_id} onChange={(e) => setKendField('tipe_id', e.target.value)}
                    disabled={!kendaraanForm.kategori_id}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm disabled:bg-gray-100 disabled:text-gray-400">
                    <option value="">{kendaraanForm.kategori_id ? 'Pilih Tipe' : 'Pilih kategori dulu'}</option>
                    {tipes.filter((t) => t.aktif).map((t) => <option key={t.id} value={t.id}>{t.nama_tipe}</option>)}
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
                {editKendaraan && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                    <select value={kendaraanForm.status} onChange={(e) => setKendField('status', e.target.value)} required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm">
                      {statuses.map((s) => <option key={s} value={s}>{statusLabels[s]}</option>)}
                    </select>
                  </div>
                )}
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
                <button type="button" onClick={() => { setShowKendaraanForm(false); setEditKendaraan(null); setLastAdded(false); }} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Batal</button>
                {lastAdded && !editKendaraan ? (
                  <button type="button" onClick={() => setLastAdded(false)}
                    className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Tambah Kendaraan Lainnya
                  </button>
                ) : (
                  <button type="submit" disabled={submittingKendaraan}
                    className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2">
                    {submittingKendaraan && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    {editKendaraan ? 'Simpan' : 'Tambah'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal open={!!confirmDeleteKendaraan} title="Hapus Kendaraan"
        message={`Yakin ingin menghapus "${confirmDeleteKendaraan?.nama_kendaraan}"? Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={handleDeleteKendaraan} onCancel={() => setConfirmDeleteKendaraan(null)} />

      <ConfirmModal open={!!confirmDeleteGarasi} title="Hapus Garasi Partner"
        message={`Yakin ingin menghapus "${confirmDeleteGarasi?.nama_garasi}"? Semua kendaraan di dalamnya akan ikut terhapus.`}
        onConfirm={handleDeleteGarasi} onCancel={() => setConfirmDeleteGarasi(null)} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Garasi Partner</h1>
        <button onClick={() => { setGarasiForm(emptyGarasiForm); setEditGarasi(null); setShowGarasiForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Tambah Garasi
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="relative max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" placeholder="Cari nama garasi, pemilik, no HP..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition" />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="w-10 px-4 py-3" />
                <th className="text-left px-4 py-3 font-medium text-gray-600">Garasi</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Pemilik</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">No. HP</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Unit</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="7" className="p-12 text-center">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Memuat data...</p>
                </td></tr>
              ) : partners.length === 0 ? (
                <tr><td colSpan="7" className="p-12 text-center">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                  <p className="text-gray-500 font-medium">Tidak ada garasi partner</p>
                  <p className="text-sm text-gray-400 mt-1">Mulai dengan menambahkan garasi partner baru</p>
                </td></tr>
              ) : partners.map((item) => (
                <React.Fragment key={item.id}>
                  <tr className={`hover:bg-gray-50/50 transition-colors ${expandedId === item.id ? 'bg-blue-50/30' : ''}`}>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleExpand(item)}
                        className={`p-1 rounded-lg transition-colors ${expandedId === item.id ? 'text-blue-600 bg-blue-50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}>
                        <svg className={`w-4 h-4 transition-transform ${expandedId === item.id ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{item.nama_garasi}</div>
                      <div className="text-xs text-gray-500">{item.email || '-'}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{item.nama_pemilik}</td>
                    <td className="px-4 py-3 text-gray-700">{item.no_hp}</td>
                    <td className="px-4 py-3"><span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">{item.kendaraans_count} unit</span></td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${item.status_aktif ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {item.status_aktif ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => { setGarasiForm({ nama_garasi: item.nama_garasi, nama_pemilik: item.nama_pemilik, alamat: item.alamat || '', no_hp: item.no_hp, email: item.email || '', status_aktif: item.status_aktif, catatan: item.catatan || '' }); setEditGarasi(item); setShowGarasiForm(true); }}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => setConfirmDeleteGarasi(item)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Hapus">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === item.id && (
                    <tr>
                      <td colSpan="7" className="p-0">
                        <div className="bg-gray-50 border-t border-b border-gray-200 px-6 py-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-gray-700">Kendaraan di {item.nama_garasi}</h4>
                            <button onClick={() => openKendaraanForm(item.id, item.nama_garasi)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                              Tambah Kendaraan
                            </button>
                          </div>
                          {loadingKendaraan ? (
                            <div className="flex items-center justify-center py-8">
                              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                              <span className="ml-2 text-sm text-gray-500">Memuat kendaraan...</span>
                            </div>
                          ) : expandedKendaraans.length === 0 ? (
                            <div className="text-center py-8">
                              <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 17h.01M16 17h.01M3 11l1.5-5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.4L21 11M3 11h18M3 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-6" /></svg>
                              <p className="text-sm text-gray-500">Belum ada kendaraan</p>
                            </div>
                          ) : (
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                              <table className="w-full text-sm">
                                <thead className="bg-gray-100 border-b border-gray-200">
                                  <tr>
                                    <th className="text-left px-4 py-2 font-medium text-gray-600">Kendaraan</th>
                                    <th className="text-left px-4 py-2 font-medium text-gray-600">Plat</th>
                                    <th className="text-left px-4 py-2 font-medium text-gray-600">Kategori</th>
                                    <th className="text-left px-4 py-2 font-medium text-gray-600">Tipe</th>
                                    <th className="text-left px-4 py-2 font-medium text-gray-600">Harga/Hari</th>
                                    <th className="text-left px-4 py-2 font-medium text-gray-600">Status</th>
                                    <th className="text-right px-4 py-2 font-medium text-gray-600">Aksi</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {expandedKendaraans.map((k) => (
                                    <tr key={k.id} className="hover:bg-gray-50/50">
                                      <td className="px-4 py-2.5">
                                        <div className="flex items-center gap-2.5">
                                          {k.foto ? (
                                            <img src={k.foto.startsWith('http') ? k.foto : `/storage/${k.foto}`}
                                              alt={k.nama_kendaraan} className="w-8 h-8 rounded-lg object-cover border border-gray-200 shrink-0" />
                                          ) : (
                                            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 17h.01M16 17h.01M3 11l1.5-5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.4L21 11M3 11h18M3 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-6" /></svg>
                                            </div>
                                          )}
                                          <div>
                                            <div className="font-medium text-gray-900">{k.nama_kendaraan}</div>
                                            <div className="text-xs text-gray-500">{k.merek} {k.model}</div>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-4 py-2.5 font-mono text-sm text-gray-700">{k.plat_nomor}</td>
                                      <td className="px-4 py-2.5 text-gray-600">{k.kategori?.nama_kategori || '-'}</td>
                                      <td className="px-4 py-2.5 text-gray-600">{k.tipe?.nama_tipe || '-'}</td>
                                      <td className="px-4 py-2.5 text-gray-700">{formatRupiah(k.harga_sewa_per_hari)}</td>
                                      <td className="px-4 py-2.5"><span className={`px-2 py-1 text-xs font-medium rounded-full ${statusStyles[k.status]}`}>{statusLabels[k.status]}</span></td>
                                      <td className="px-4 py-2.5 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                          <button onClick={() => openKendaraanForm(item.id, item.nama_garasi, k)}
                                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                          </button>
                                          {k.status !== 'disewa' && (
                                            <button onClick={() => setConfirmDeleteKendaraan(k)}
                                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Hapus">
                                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                          )}
                                        </div>
                                      </td>
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
      </div>
    </div>
  );
}
