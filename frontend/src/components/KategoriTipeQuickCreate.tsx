import { useState } from 'react';
import { kategoriAPI, tipeAPI } from '../services/api';
import { useToast } from '../contexts/ToastContext';

interface Props {
  mode: 'kategori' | 'tipe';
  kategoriId?: number | string;
  kategoriName?: string;
  onClose: () => void;
  onCreated: (newId: number | string) => void;
}

export default function KategoriTipeQuickCreate({ mode, kategoriId, kategoriName, onClose, onCreated }: Props) {
  const toast = useToast();
  const [nama, setNama] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isKategori = mode === 'kategori';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isKategori) {
        const { data } = await kategoriAPI.create({ nama_kategori: nama, deskripsi, aktif: true });
        const id = (data as { data?: { id: number } }).data?.id ?? (data as { id?: number }).id;
        toast.success(`Kategori "${nama}" berhasil ditambahkan`);
        onCreated(id ?? nama);
      } else {
        const { data } = await tipeAPI.create({ kategori_id: kategoriId, nama_tipe: nama, deskripsi, aktif: true });
        const id = (data as { data?: { id: number } }).data?.id ?? (data as { id?: number }).id;
        toast.success(`Tipe "${nama}" berhasil ditambahkan`);
        onCreated(id ?? nama);
      }
    } catch (err) {
      const msg = err.response?.data?.message || Object.values(err.response?.data?.errors || {})[0]?.[0] || 'Gagal menyimpan data';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-accent-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-black-900">
            {isKategori ? 'Kategori Baru' : `Tipe Baru${kategoriName ? ` — ${kategoriName}` : ''}`}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-accent-100 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-black-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-black-700 mb-1">
              {isKategori ? 'Nama Kategori' : 'Nama Tipe'} *
            </label>
            <input
              type="text"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              required
              placeholder={isKategori ? 'Contoh: SUV, MPV, Sedan' : 'Contoh: Compact SUV, Low MPV'}
              className="w-full px-3 py-2 border border-black-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-black-700 mb-1">Deskripsi</label>
            <textarea
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              rows={2}
              placeholder="Deskripsi singkat (opsional)"
              className="w-full px-3 py-2 border border-black-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-accent-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-black-700 border border-black-200 rounded-lg hover:bg-canvas transition-colors">Batal</button>
            <button type="submit" disabled={submitting}
              className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center gap-2">
              {submitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Tambah
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}