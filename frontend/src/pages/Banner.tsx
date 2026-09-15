import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { isAxiosError } from 'axios';
import { bannerAPI, type Banner as ApiBanner } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import ConfirmModal from '../components/ConfirmModal';
import { fotoFileError } from '../lib/file';
import { storageUrl } from '../lib/storage';
import { Plus, Pencil, Trash2, Power, MoveUp, MoveDown } from 'lucide-react';

interface BannerFormState {
  judul: string;
  subjudul: string;
  tautan: string;
  tombol_label: string;
  urutan: string;
  aktif: boolean;
}

const emptyForm: BannerFormState = {
  judul: '',
  subjudul: '',
  tautan: '',
  tombol_label: 'Pesan Sekarang',
  urutan: '0',
  aktif: true,
};

const inputClass =
  'w-full rounded-lg border border-black-200 px-3 py-2 text-sm text-black-900 outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500';

export default function Banner() {
  const toast = useToast();
  const [items, setItems] = useState<ApiBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<ApiBanner | null>(null);
  const [form, setForm] = useState<BannerFormState>(emptyForm);
  const [gambarFile, setGambarFile] = useState<File | null>(null);
  const [gambarPreview, setGambarPreview] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ApiBanner | null>(null);

  useEffect(() => {
    return () => { if (gambarPreview) URL.revokeObjectURL(gambarPreview); };
  }, [gambarPreview]);

  const load = useCallback(() => {
    setLoading(true);
    bannerAPI.list()
      .then(({ data }) => setItems(data))
      .catch(() => toast.error('Gagal memuat data banner'))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const setField = (key: keyof BannerFormState, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const openCreate = () => {
    setForm(emptyForm);
    setEditItem(null);
    setGambarFile(null);
    setGambarPreview(null);
    setShowForm(true);
  };

  const handleEdit = (item: ApiBanner) => {
    setForm({
      judul: item.judul || '',
      subjudul: item.subjudul || '',
      tautan: item.tautan || '',
      tombol_label: item.tombol_label || 'Pesan Sekarang',
      urutan: String(item.urutan ?? 0),
      aktif: item.aktif,
    });
    setEditItem(item);
    setGambarFile(null);
    setGambarPreview(null);
    setShowForm(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (!editItem && !gambarFile) {
        toast.error('Gambar banner wajib diupload');
        setSubmitting(false);
        return;
      }
      if (gambarFile) {
        const err = fotoFileError(gambarFile);
        if (err) {
          toast.error(err);
          setSubmitting(false);
          return;
        }
      }

      const fd = new FormData();
      fd.append('judul', form.judul);
      fd.append('subjudul', form.subjudul);
      fd.append('tautan', form.tautan);
      fd.append('tombol_label', form.tombol_label);
      fd.append('urutan', form.urutan || '0');
      fd.append('aktif', form.aktif ? '1' : '0');
      if (gambarFile) fd.append('gambar', gambarFile);

      if (editItem) {
        await bannerAPI.update(editItem.id, fd);
        const sorted = [...items].sort((a, b) => a.urutan - b.urutan || a.id - b.id);
        const curIdx = sorted.findIndex((b) => b.id === editItem.id);
        const targetIdx = Math.max(0, Math.min(sorted.length - 1, (Number(form.urutan) || (curIdx + 1)) - 1));
        if (curIdx >= 0 && curIdx !== targetIdx) {
          const reordered = sorted.filter((b) => b.id !== editItem.id);
          reordered.splice(targetIdx, 0, editItem);
          await applyOrder(reordered);
        }
        toast.success('Banner berhasil diperbarui');
      } else {
        await bannerAPI.create(fd);
        toast.success('Banner berhasil ditambahkan');
      }
      setShowForm(false);
      setEditItem(null);
      setForm(emptyForm);
      setGambarFile(null);
      setGambarPreview(null);
      load();
    } catch (err) {
      if (isAxiosError(err)) {
        const msg = err.response?.data?.message ||
          Object.values(err.response?.data?.errors || {})[0]?.[0] ||
          'Gagal menyimpan banner';
        toast.error(msg);
      } else {
        toast.error('Gagal menyimpan banner');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await bannerAPI.remove(confirmDelete.id);
      toast.success('Banner berhasil dihapus');
      load();
    } catch (err) {
      if (isAxiosError(err)) toast.error(err.response?.data?.message || 'Gagal menghapus banner');
      else toast.error('Gagal menghapus banner');
    }
    setConfirmDelete(null);
  };

  const handleToggle = async (item: ApiBanner) => {
    try {
      await bannerAPI.toggle(item.id);
      toast.success(item.aktif ? 'Banner dinonaktifkan' : 'Banner diaktifkan');
      load();
    } catch {
      toast.error('Gagal mengubah status banner');
    }
  };

  const makeUrutanForm = (urutan: number): FormData => {
    const fd = new FormData();
    fd.append('urutan', String(urutan));
    return fd;
  };

  const applyOrder = async (ordered: ApiBanner[]): Promise<void> => {
    await Promise.all(ordered.map((b, i) => bannerAPI.update(b.id, makeUrutanForm(i + 1))));
  };

  const moveBanner = async (item: ApiBanner, dir: -1 | 1) => {
    const sorted = [...items].sort((a, b) => a.urutan - b.urutan || a.id - b.id);
    const idx = sorted.findIndex((b) => b.id === item.id);
    const target = sorted[idx + dir];
    if (!target) return;
    const reordered = [...sorted];
    [reordered[idx], reordered[idx + dir]] = [reordered[idx + dir], reordered[idx]];
    try {
      await applyOrder(reordered);
      load();
    } catch {
      toast.error('Gagal mengubah urutan');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-black-900">Banner Iklan</h1>
          <p className="text-sm text-black-400 mt-1">
            Banner tampil sebagai karusel di halaman Beranda situs publik. Rekomendasi rasio {String.fromCharCode(160)}1600×500.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex w-full items-center justify-center gap-2 px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          Tambah Banner
        </button>
      </div>

      {showForm && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => { setShowForm(false); setEditItem(null); }}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-black-200 flex items-center justify-between gap-3 sticky top-0 bg-white z-10 sm:p-6">
              <h2 className="text-lg font-semibold text-black-900">{editItem ? 'Edit Banner' : 'Tambah Banner'}</h2>
              <button onClick={() => { setShowForm(false); setEditItem(null); }} className="p-1 hover:bg-canvas rounded-lg transition-colors">
                <svg className="w-5 h-5 text-black-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4 sm:p-6">
              <div>
                <label className="block text-sm font-medium text-black-700 mb-1">
                  Gambar Banner {editItem ? '(kosongkan jika tidak diganti)' : '*'}
                </label>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <label className="w-full sm:flex-1 flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed border-black-200 rounded-lg cursor-pointer hover:border-primary-400 hover:bg-primary-50/50 transition-colors">
                    <svg className="w-5 h-5 text-black-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="truncate text-sm text-black-400">{gambarFile ? gambarFile.name : 'Pilih gambar'}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        setGambarFile(f);
                        setGambarPreview(f ? URL.createObjectURL(f) : null);
                      }}
                      className="hidden"
                    />
                  </label>
                  {(gambarPreview || (editItem && !gambarPreview)) && (
                    <img
                      src={gambarPreview || storageUrl(editItem?.gambar) || ''}
                      alt="Preview"
                      className="w-full h-16 object-cover rounded-lg border border-black-200 shrink-0 sm:w-40"
                    />
                  )}
                </div>
                <p className="mt-1 text-xs text-black-400">Disarankan ukuran 1600 x 400 piksel (format JPG/PNG, maksimal 5 MB).</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-black-700 mb-1">Judul</label>
                <input
                  type="text"
                  value={form.judul}
                  onChange={(e) => setField('judul', e.target.value)}
                  placeholder="cth. Diskon Hingga 20%"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black-700 mb-1">Subjudul</label>
                <input
                  type="text"
                  value={form.subjudul}
                  onChange={(e) => setField('subjudul', e.target.value)}
                  placeholder="Kalimat singkat pelengkap banner"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black-700 mb-1">Tautan (opsional)</label>
                <input
                  type="text"
                  value={form.tautan}
                  onChange={(e) => setField('tautan', e.target.value)}
                  placeholder="cth. /katalog atau https://..."
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-black-700 mb-1">Label Tombol</label>
                  <input
                    type="text"
                    value={form.tombol_label}
                    onChange={(e) => setField('tombol_label', e.target.value)}
                    placeholder="Pesan Sekarang"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black-700 mb-1">Urutan</label>
                  <input
                    type="number"
                    value={form.urutan}
                    onChange={(e) => setField('urutan', e.target.value)}
                    min={0}
                    className={inputClass}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-black-700">
                <input
                  type="checkbox"
                  checked={form.aktif}
                  onChange={(e) => setField('aktif', e.target.checked)}
                  className="w-4 h-4 rounded border-black-300 accent-primary-500"
                />
                Aktif (tampil di Beranda)
              </label>

              <div className="flex flex-col-reverse gap-3 pt-4 border-t border-black-200 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditItem(null); }}
                  className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-black-700 border border-black-200 rounded-lg hover:bg-canvas transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto px-4 py-2 text-sm font-medium bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
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
        title="Hapus Banner"
        message={`Yakin ingin menghapus banner "${confirmDelete?.judul || confirmDelete?.tombol_label || 'tanpa judul'}"?`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-black-200 p-12 text-center">
          <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-black-400">Memuat data...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-black-200 p-12 text-center">
          <svg className="w-12 h-12 text-black-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-black-400 font-medium">Belum ada banner</p>
          <p className="text-sm text-black-400 mt-1">Mulai dengan menambahkan banner iklan baru</p>
        </div>
      ) : (
        <>
        <div className="space-y-4 md:hidden">
          {items.map((item, i) => (
            <div key={item.id} className="bg-white rounded-xl shadow-sm border border-black-200 p-4">
              <div className="flex items-start gap-3">
                <img
                  src={storageUrl(item.gambar) || ''}
                  alt={item.judul || 'Banner'}
                  className="w-24 h-14 object-cover rounded-md border border-black-200 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-black-900 truncate">{item.judul || '-'}</p>
                  {item.tautan && <p className="text-xs text-black-400 truncate">{item.tautan}</p>}
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <button
                      onClick={() => handleToggle(item)}
                      title={item.aktif ? 'Klik untuk nonaktifkan' : 'Klik untuk aktifkan'}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        item.aktif
                          ? 'bg-success-50 text-success-600 hover:bg-success-100'
                          : 'bg-black-100 text-black-400 hover:bg-black-200'
                      }`}
                    >
                      <Power className="w-3 h-3" />
                      {item.aktif ? 'Aktif' : 'Nonaktif'}
                    </button>
                    <span className="text-xs text-black-400">Urutan #{i + 1}</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-black-100 pt-3">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveBanner(item, -1)}
                    title="Naikkan urutan"
                    className="p-1.5 text-black-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                  >
                    <MoveUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => moveBanner(item, 1)}
                    title="Turunkan urutan"
                    className="p-1.5 text-black-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                  >
                    <MoveDown className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEdit(item)}
                    title="Edit"
                    className="p-1.5 text-black-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(item)}
                    title="Hapus"
                    className="p-1.5 text-black-400 hover:text-error-600 hover:bg-error-50 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="hidden md:block bg-white rounded-xl shadow-sm border border-black-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-black-400 border-b border-black-200">
                <th className="px-4 py-3 font-medium">Preview</th>
                <th className="px-4 py-3 font-medium">Judul</th>
                <th className="px-4 py-3 font-medium">Urutan</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item.id} className="border-b border-black-100 last:border-b-0 hover:bg-canvas/50">
                  <td className="px-4 py-3">
                    <img
                      src={storageUrl(item.gambar) || ''}
                      alt={item.judul || 'Banner'}
                      className="w-40 h-14 object-cover rounded-md border border-black-200"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-black-900">{item.judul || '-'}</p>
                    {item.tautan && (
                      <p className="text-xs text-black-400 truncate max-w-[220px]">{item.tautan}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className="text-black-700 font-medium">{i + 1}</span>
                      <button
                        onClick={() => moveBanner(item, -1)}
                        title="Naikkan urutan"
                        className="p-1 text-black-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                      >
                        <MoveUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => moveBanner(item, 1)}
                        title="Turunkan urutan"
                        className="p-1 text-black-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                      >
                        <MoveDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggle(item)}
                      title={item.aktif ? 'Klik untuk nonaktifkan' : 'Klik untuk aktifkan'}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        item.aktif
                          ? 'bg-success-50 text-success-600 hover:bg-success-100'
                          : 'bg-black-100 text-black-400 hover:bg-black-200'
                      }`}
                    >
                      <Power className="w-3 h-3" />
                      {item.aktif ? 'Aktif' : 'Nonaktif'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleEdit(item)}
                        title="Edit"
                        className="p-1.5 text-black-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(item)}
                        title="Hapus"
                        className="p-1.5 text-black-400 hover:text-error-600 hover:bg-error-50 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
}