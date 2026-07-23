import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { supirCaloAPI } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import ConfirmModal from '../components/ConfirmModal';

const formatRupiah = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;

const emptyForm = {
  nama: '',
  no_hp: '',
  alamat: '',
  status: 'active',
  no_sim: '',
  tarif_per_hari: '',
  catatan: '',
};

function ImagePreview({ src, alt, className = '' }) {
  if (!src) return null;
  return <img src={src} alt={alt} className={`object-cover rounded-lg border border-gray-200 ${className}`} />;
}

function FileUpload({ label, accept, file, preview, onChange, existing }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex items-start gap-3">
        <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          <span className="text-sm text-gray-500">{file ? file.name : 'Pilih gambar'}</span>
          <input type="file" accept={accept} onChange={onChange} className="hidden" />
        </label>
        {(preview || existing) && (
          <div className="relative shrink-0">
            <ImagePreview src={preview || existing} alt={label} className="w-20 h-20" />
            {existing && !preview && <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center"><svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg></span>}
          </div>
        )}
      </div>
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
        <h1 className="text-2xl font-bold text-gray-900">Supir & Calo</h1>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Tambah {isSupir ? 'Supir' : 'Calo'}
        </button>
      </div>

      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => { setActiveTab(tab.key); setSearch(''); }}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}>
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="relative max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" placeholder={`Cari nama atau no HP ${isSupir ? 'supir' : 'calo'}...`} value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition" />
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => { setShowForm(false); setEditItem(null); }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-gray-900">{editItem ? `Edit ${isSupir ? 'Supir' : 'Calo'}` : `Tambah ${isSupir ? 'Supir' : 'Calo'}`}</h2>
              <button onClick={() => { setShowForm(false); setEditItem(null); }} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama *</label>
                  <input type="text" value={form.nama} onChange={(e) => setField('nama', e.target.value)} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">No. HP *</label>
                  <input type="text" value={form.no_hp} onChange={(e) => setField('no_hp', e.target.value)} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
                <textarea value={form.alamat} onChange={(e) => setField('alamat', e.target.value)} rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={form.status} onChange={(e) => setField('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm">
                  <option value="active">Aktif</option>
                  <option value="inactive">Nonaktif</option>
                </select>
              </div>

              {isSupir && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">No. SIM *</label>
                    <input type="text" value={form.no_sim} onChange={(e) => setField('no_sim', e.target.value)} required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tarif/Hari (Rp)</label>
                    <input type="number" value={form.tarif_per_hari} onChange={(e) => setField('tarif_per_hari', e.target.value)} min="0"
                      placeholder="Tarif per hari untuk supir"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Foto Profil</label>
                    <FileUpload
                      name="foto"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                <textarea value={form.catatan} onChange={(e) => setField('catatan', e.target.value)} rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm resize-none" />
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

      <ConfirmModal
        open={!!confirmDelete}
        title={`Hapus ${isSupir ? 'Supir' : 'Calo'}`}
        message={`Yakin ingin menghapus "${confirmDelete?.nama}"? Data terkait akan ikut terhapus.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nama</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">No. HP</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Alamat</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                {isSupir && <th className="text-left px-4 py-3 font-medium text-gray-600">SIM</th>}
                {isSupir && <th className="text-left px-4 py-3 font-medium text-gray-600">Tarif/Hari</th>}
                <th className="text-right px-4 py-3 font-medium text-gray-600">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={isSupir ? 8 : 5} className="p-12 text-center">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Memuat data...</p>
                </td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={isSupir ? 8 : 5} className="p-12 text-center">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  <p className="text-gray-500 font-medium">Tidak ada data {isSupir ? 'supir' : 'calo'}</p>
                  <p className="text-sm text-gray-400 mt-1">Mulai dengan menambahkan {isSupir ? 'supir' : 'calo'} baru</p>
                </td></tr>
              ) : items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {item.foto ? (
                        <img src={getFileUrl(item.foto)} alt={item.nama} className="w-8 h-8 rounded-full object-cover border border-gray-200" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                          {item.nama.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="font-medium text-gray-900">{item.nama}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{item.no_hp}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">{item.alamat || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      item.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {item.status === 'active' ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  {isSupir && <td className="px-4 py-3 font-mono text-sm text-gray-600">{item.no_sim || '-'}</td>}
                  {isSupir && <td className="px-4 py-3 text-gray-700">{item.tarif_per_hari ? formatRupiah(item.tarif_per_hari) : '-'}</td>}
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
