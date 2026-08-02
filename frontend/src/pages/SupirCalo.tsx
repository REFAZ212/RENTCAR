import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { supirCaloAPI } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import ConfirmModal from '../components/ConfirmModal';
import { formatHpDisplay, formatHpWa, formatRupiah } from '../lib/format';

const emptyForm = {
  nama: '',
  no_hp: '',
  alamat: '',
  status: 'active',
  no_sim: '',
  komisi: '',
  tarif_per_hari: '',
  catatan: '',
};

function ImagePreview({ src, alt, className = '' }) {
  if (!src) return null;
  return <img src={src} alt={alt} className={`object-cover rounded-lg border border-black-200 ${className}`} />;
}

function FileUpload({ label, accept, file, preview, onChange, existing }) {
  return (
    <div>
      <label className="block text-sm font-medium text-black-700 mb-1">{label}</label>
      <div className="flex items-start gap-3">
        <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed border-black-200 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-primary-50/50 transition-colors">
          <svg className="w-5 h-5 text-black-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          <span className="text-sm text-black-400">{file ? file.name : 'Pilih gambar'}</span>
          <input type="file" accept={accept} onChange={onChange} className="hidden" />
        </label>
        {(preview || existing) && (
          <div className="relative shrink-0">
            <ImagePreview src={preview || existing} alt={label} className="w-20 h-20" />
            {existing && !preview && <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent-500 rounded-full flex items-center justify-center"><svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg></span>}
          </div>
        )}
      </div>
    </div>
  );
}

// Ikon WhatsApp (inline, tidak pakai library luar)
function WhatsAppIcon({ className = 'w-4 h-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.198-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.148.198 2.095 3.2 5.076 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12.001 2C6.478 2 2 6.477 2 12c0 1.892.526 3.66 1.438 5.166L2 22l4.982-1.408A9.953 9.953 0 0012.001 22C17.523 22 22 17.523 22 12S17.523 2 12.001 2zm0 18.2a8.174 8.174 0 01-4.166-1.14l-.299-.177-3.207.906.885-3.13-.194-.31A8.178 8.178 0 013.8 12c0-4.522 3.679-8.2 8.201-8.2 4.521 0 8.2 3.678 8.2 8.2 0 4.522-3.679 8.2-8.2 8.2z" />
    </svg>
  );
}

function CopyIcon({ className = 'w-3.5 h-3.5' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

// Baris info dengan tombol salin (untuk No. HP / No. SIM)
// Catatan: tidak memakai toast global agar tidak memicu reflow/getar pada layar.
// Umpan balik cukup berupa tooltip kecil lokal yang muncul & hilang sendiri.
function CopyableField({ label, value, icon }) {
  const [status, setStatus] = useState<null | 'copied' | 'error'>(null);

  useEffect(() => {
    if (!status) return;
    const t = window.setTimeout(() => setStatus(null), 1400);
    return () => window.clearTimeout(t);
  }, [status]);

  if (!value) return null;

  const handleCopy = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
      } else {
        // Fallback untuk browser/koneksi yang tidak mendukung Clipboard API
        const ta = document.createElement('textarea');
        ta.value = value;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setStatus('copied');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <div className="flex items-center gap-1.5 text-black-400 min-w-0">
        {icon}
        <span className="truncate">{value}</span>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        title={`Salin ${label}`}
        className="relative shrink-0 p-1 text-black-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
      >
        <CopyIcon />
        <span
          role="status"
          aria-live="polite"
          className={`pointer-events-none absolute top-full right-0 mt-1 whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-medium text-white shadow-sm transition-opacity duration-150 z-20 ${
            status === 'copied' ? 'opacity-100 bg-black-900' : status === 'error' ? 'opacity-100 bg-error-600' : 'opacity-0'
          }`}
        >
          {status === 'error' ? 'Gagal menyalin' : `${label} disalin`}
        </span>
      </button>
    </div>
  );
}

export default function SupirCalo() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'supir' | 'calo'>('supir');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [fotoFile, setFotoFile] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  useEffect(() => {
    return () => { if (fotoPreview) URL.revokeObjectURL(fotoPreview); };
  }, [fotoPreview]);
  const [detailItem, setDetailItem] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    supirCaloAPI.list({ search, jenis: activeTab })
      .then(({ data }) => setItems(data.data))
      .catch(() => toast.error('Gagal memuat data'))
      .finally(() => setLoading(false));
  }, [search, activeTab, toast]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('jenis', activeTab);
      Object.entries(form).forEach(([k, v]) => { if (v !== null && v !== undefined) fd.append(k, v); });
      if (fotoFile) fd.append('foto', fotoFile);

      if (editItem) {
        fd.append('_method', 'PUT');
        await supirCaloAPI.update(editItem.id, fd);
        toast.success('Data berhasil diperbarui');
      } else {
        await supirCaloAPI.create(fd);
        toast.success('Data berhasil ditambahkan');
      }
      setShowForm(false);
      setEditItem(null);
      setForm(emptyForm);
      setFotoFile(null);
      setFotoPreview(null);
      load();
    } catch (err) {
      const msg = err.response?.data?.message || Object.values(err.response?.data?.errors || {})[0]?.[0] || 'Gagal menyimpan data';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item) => {
    setForm({
      nama: item.nama,
      no_hp: item.no_hp,
      alamat: item.alamat || '',
      status: item.status,
      no_sim: item.no_sim || '',
      komisi: item.komisi || '',
      tarif_per_hari: item.tarif_per_hari || '',
      catatan: item.catatan || '',
    });
    setEditItem(item);
    setFotoFile(null);
    setFotoPreview(null);
    setShowForm(true);
  };

  const handleDelete = async () => {
    try {
      await supirCaloAPI.delete(confirmDelete.id);
      toast.success('Data berhasil dihapus');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus data');
    }
    setConfirmDelete(null);
  };

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const getFileUrl = (path) => path ? `/storage/${path}` : null;

  const openCreate = () => {
    setForm(emptyForm);
    setEditItem(null);
    setFotoFile(null);
    setFotoPreview(null);
    setShowForm(true);
  };

  const isSupir = activeTab === 'supir';
  const tabs: { key: 'supir' | 'calo'; label: string; icon: ReactNode }[] = [
    { key: 'supir', label: 'Supir', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17h.01M16 17h.01M3 11l1.5-5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.4L21 11M3 11h18M3 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-6" /></svg> },
    { key: 'calo', label: 'Calo', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-black-900">Supir & Calo</h1>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Tambah {isSupir ? 'Supir' : 'Calo'}
        </button>
      </div>

      <div className="flex items-center gap-1 bg-accent-100 p-1 rounded-lg w-fit">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => { setActiveTab(tab.key); setSearch(''); }}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-black-400 hover:text-black-700'
            }`}>
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-black-200 p-4">
        <div className="relative max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" placeholder={`Cari nama atau no HP ${isSupir ? 'supir' : 'calo'}...`} value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-black-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition" />
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => { setShowForm(false); setEditItem(null); }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-accent-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-black-900">{editItem ? `Edit ${isSupir ? 'Supir' : 'Calo'}` : `Tambah ${isSupir ? 'Supir' : 'Calo'}`}</h2>
              <button onClick={() => { setShowForm(false); setEditItem(null); }} className="p-1 hover:bg-accent-100 rounded-lg transition-colors">
                <svg className="w-5 h-5 text-black-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black-700 mb-1">Nama *</label>
                  <input type="text" value={form.nama} onChange={(e) => setField('nama', e.target.value)} required
                    className="w-full px-3 py-2 border border-black-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black-700 mb-1">No. HP *</label>
                  <input type="text" value={form.no_hp} onChange={(e) => setField('no_hp', e.target.value)} required
                    className="w-full px-3 py-2 border border-black-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-black-700 mb-1">Alamat</label>
                <textarea value={form.alamat} onChange={(e) => setField('alamat', e.target.value)} rows={2}
                  className="w-full px-3 py-2 border border-black-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-black-700 mb-1">Status</label>
                <select value={form.status} onChange={(e) => setField('status', e.target.value)}
                  className="w-full px-3 py-2 border border-black-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm">
                  <option value="active">Aktif</option>
                  <option value="inactive">Nonaktif</option>
                </select>
              </div>

              {isSupir ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-black-700 mb-1">No. SIM *</label>
                    <input type="text" value={form.no_sim} onChange={(e) => setField('no_sim', e.target.value)} required
                      className="w-full px-3 py-2 border border-black-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black-700 mb-1">Tarif/Hari (Rp)</label>
                    <input type="number" value={form.tarif_per_hari} onChange={(e) => setField('tarif_per_hari', e.target.value)} min="0"
                      placeholder="Tarif per hari untuk supir"
                      className="w-full px-3 py-2 border border-black-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
                  </div>
                  <div className="pt-2 border-t border-accent-100">
                    <h3 className="text-sm font-semibold text-black-900 mb-3">Foto Profil</h3>
                    <FileUpload
                      label="Foto"
                      accept="image/*"
                      file={fotoFile}
                      preview={fotoPreview}
                      existing={editItem?.foto ? getFileUrl(editItem.foto) : null}
                      onChange={(e) => { const f = e.target.files[0]; setFotoFile(f); setFotoPreview(f ? URL.createObjectURL(f) : null); }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-black-700 mb-1">Komisi (Rp) *</label>
                    <input type="number" value={form.komisi} onChange={(e) => setField('komisi', e.target.value)} min="0" required
                      className="w-full px-3 py-2 border border-black-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
                  </div>
                  <div className="pt-2 border-t border-accent-100">
                    <h3 className="text-sm font-semibold text-black-900 mb-3">Foto Profil</h3>
                    <FileUpload
                      label="Foto"
                      accept="image/*"
                      file={fotoFile}
                      preview={fotoPreview}
                      existing={editItem?.foto ? getFileUrl(editItem.foto) : null}
                      onChange={(e) => { const f = e.target.files[0]; setFotoFile(f); setFotoPreview(f ? URL.createObjectURL(f) : null); }}
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-black-700 mb-1">Catatan</label>
                <textarea value={form.catatan} onChange={(e) => setField('catatan', e.target.value)} rows={2}
                  className="w-full px-3 py-2 border border-black-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm resize-none" />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-accent-100">
                <button type="button" onClick={() => { setShowForm(false); setEditItem(null); }} className="px-4 py-2 text-sm font-medium text-black-700 border border-black-200 rounded-lg hover:bg-canvas transition-colors">Batal</button>
                <button type="submit" disabled={submitting}
                  className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center gap-2">
                  {submitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {editItem ? 'Simpan' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail */}
      {detailItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setDetailItem(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-accent-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-black-900">Detail {isSupir ? 'Supir' : 'Calo'}</h2>
              <button onClick={() => setDetailItem(null)} className="p-1 hover:bg-accent-100 rounded-lg transition-colors">
                <svg className="w-5 h-5 text-black-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-4">
                {detailItem.foto ? (
                  <img src={getFileUrl(detailItem.foto)} alt={detailItem.nama} className="w-20 h-20 rounded-xl object-cover border border-black-200" />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center text-2xl font-bold shrink-0">
                    {detailItem.nama.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-black-900 text-lg truncate">{detailItem.nama}</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                    detailItem.status === 'active' ? 'bg-accent-100 text-accent-700' : 'bg-accent-100 text-black-400'
                  }`}>
                    {detailItem.status === 'active' ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
              </div>

              <div className="space-y-3 bg-canvas rounded-lg p-4">
                <CopyableField
                  label="No. HP"
                  value={formatHpDisplay(detailItem.no_hp)}
                  icon={<svg className="w-4 h-4 text-black-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>}
                />
                {isSupir && (
                  <CopyableField
                    label="No. SIM"
                    value={detailItem.no_sim}
                    icon={<svg className="w-4 h-4 text-black-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>}
                  />
                )}
                <div className="flex items-start gap-1.5 text-sm text-black-400">
                  <svg className="w-4 h-4 text-black-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  <span>{detailItem.alamat || 'Alamat tidak diisi'}</span>
                </div>
                {isSupir ? (
                  <div className="text-sm text-black-400">
                    <span className="font-medium text-black-700">Tarif/Hari: </span>
                    {detailItem.tarif_per_hari ? formatRupiah(detailItem.tarif_per_hari) : '-'}
                  </div>
                ) : (
                  <div className="text-sm text-black-400">
                    <span className="font-medium text-black-700">Komisi: </span>
                    {detailItem.komisi ? formatRupiah(detailItem.komisi) : '-'}
                  </div>
                )}
                {detailItem.catatan && (
                  <div className="text-sm text-black-400 pt-2 border-t border-black-200">
                    <span className="font-medium text-black-700">Catatan: </span>
                    {detailItem.catatan}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <a
                  href={`https://wa.me/${formatHpWa(detailItem.no_hp)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-success-500 text-white text-sm font-medium rounded-lg hover:bg-success-600 transition-colors"
                >
                  <WhatsAppIcon />
                  Hubungi via WhatsApp
                </a>
                <button
                  onClick={() => { setDetailItem(null); handleEdit(detailItem); }}
                  className="px-4 py-2 text-sm font-medium text-black-700 border border-black-200 rounded-lg hover:bg-canvas transition-colors"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!confirmDelete}
        title={`Hapus ${isSupir ? 'Supir' : 'Calo'}`}
        message={`Yakin ingin menghapus "${confirmDelete?.nama}"? Data terkait akan ikut terhapus.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* Grid Card */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-black-200 p-12 text-center">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-black-400">Memuat data...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-black-200 p-12 text-center">
          <svg className="w-12 h-12 text-black-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          <p className="text-black-400 font-medium">Tidak ada data {isSupir ? 'supir' : 'calo'}</p>
          <p className="text-sm text-black-400 mt-1">Mulai dengan menambahkan {isSupir ? 'supir' : 'calo'} baru</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl shadow-sm border border-black-200 hover:shadow-md hover:border-blue-200 transition-all overflow-hidden flex flex-col cursor-pointer"
              onClick={() => setDetailItem(item)}
            >
              <div className="p-4 pb-3 flex items-center gap-3">
                {item.foto ? (
                  <img src={getFileUrl(item.foto)} alt={item.nama} className="w-14 h-14 rounded-full object-cover border border-black-200 shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-lg font-bold shrink-0">
                    {item.nama.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-black-900 truncate">{item.nama}</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${
                    item.status === 'active' ? 'bg-accent-100 text-accent-700' : 'bg-accent-100 text-black-400'
                  }`}>
                    {item.status === 'active' ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
              </div>

              <div className="px-4 space-y-1.5 flex-1">
                <CopyableField
                  label="No. HP"
                  value={formatHpDisplay(item.no_hp)}
                  icon={<svg className="w-3.5 h-3.5 text-black-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>}
                />
                {isSupir && (
                  <CopyableField
                    label="No. SIM"
                    value={item.no_sim}
                    icon={<svg className="w-3.5 h-3.5 text-black-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>}
                  />
                )}
                <p className="text-sm text-black-400 truncate">{item.alamat || 'Alamat tidak diisi'}</p>
                <p className="text-sm text-black-700 font-medium">
                  {isSupir
                    ? (item.tarif_per_hari ? `${formatRupiah(item.tarif_per_hari)} / hari` : '-')
                    : (item.komisi ? `Komisi ${formatRupiah(item.komisi)}` : '-')}
                </p>
              </div>

              <div className="p-4 pt-3 mt-3 border-t border-accent-100 flex items-center gap-2">
                <a
                  href={`https://wa.me/${formatHpWa(item.no_hp)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  title="Hubungi via WhatsApp"
                  className="flex items-center justify-center gap-1.5 flex-1 px-3 py-1.5 bg-accent-50 text-accent-600 text-xs font-medium rounded-lg hover:bg-accent-100 transition-colors"
                >
                  <WhatsAppIcon className="w-3.5 h-3.5" />
                  WA
                </a>
                <button
                  onClick={(e) => { e.stopPropagation(); setDetailItem(item); }}
                  className="px-3 py-1.5 text-xs font-medium text-black-400 border border-black-200 rounded-lg hover:bg-canvas transition-colors"
                >
                  Detail
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleEdit(item); }}
                  title="Edit"
                  className="p-1.5 text-black-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(item); }}
                  title="Hapus"
                  className="p-1.5 text-black-400 hover:text-error-600 hover:bg-error-50 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}