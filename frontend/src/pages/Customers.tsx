import { useState, useEffect, useCallback, type ChangeEvent, type FormEvent } from 'react';
import { isAxiosError } from 'axios';
import { customerAPI, type Customer, type ListResponse } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import ConfirmModal from '../components/ConfirmModal';

/* ─────────────────────────────────────────────────────────────
 * TYPES
 * ───────────────────────────────────────────────────────────── */
interface CustomerForm {
  nama_lengkap: string;
  no_hp: string;
  email: string;
  alamat: string;
  no_ktp: string;
  no_sim: string;
  catatan: string;
}

const emptyForm: CustomerForm = {
  nama_lengkap: '',
  no_hp: '',
  email: '',
  alamat: '',
  no_ktp: '',
  no_sim: '',
  catatan: '',
};

/**
 * CATATAN: bg-white dan bg-gray-50 dipakai sengaja (bukan bg-surface/bg-canvas)
 * karena token custom itu belum ter-generate dengan benar oleh Tailwind di
 * project ini. Setelah root cause-nya ditemukan, bisa diganti balik ke
 * bg-surface / bg-canvas agar konsisten dengan token tema.
 */
const inputClass =
  'w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-900 outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500';

/* ─────────────────────────────────────────────────────────────
 * KOMPONEN BANTU
 * ───────────────────────────────────────────────────────────── */
function ImagePreview({ src, alt, className = '' }: { src: string | null; alt: string; className?: string }) {
  if (!src) return null;
  return <img src={src} alt={alt} className={`rounded-lg border border-ink-200 object-cover ${className}`} />;
}

function FileUpload({
  label,
  accept,
  file,
  preview,
  existing,
  onChange,
}: {
  label: string;
  accept: string;
  file: File | null;
  preview: string | null;
  existing: string | null;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-ink-700">{label}</label>
      <div className="flex items-start gap-3">
        <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-ink-200 px-3 py-2 transition-colors hover:border-brand-400 hover:bg-brand-50/50">
          <svg className="h-5 w-5 text-ink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="text-sm text-ink-400">{file ? file.name : 'Pilih gambar'}</span>
          <input type="file" accept={accept} onChange={onChange} className="hidden" />
        </label>
        {(preview || existing) && (
          <div className="relative shrink-0">
            <ImagePreview src={preview || existing} alt={label} className="h-20 w-20" />
            {existing && !preview && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-avail-500">
                <svg className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * HALAMAN UTAMA
 * ───────────────────────────────────────────────────────────── */
export default function Customers() {
  const toast = useToast();
  const [items, setItems] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [confirmDelete, setConfirmDelete] = useState<Customer | null>(null);

  const [fotoKtpFile, setFotoKtpFile] = useState<File | null>(null);
  const [fotoKtpPreview, setFotoKtpPreview] = useState<string | null>(null);
  const [fotoSimFile, setFotoSimFile] = useState<File | null>(null);
  const [fotoSimPreview, setFotoSimPreview] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    customerAPI
      .list({ search })
      .then(({ data }: { data: ListResponse<Customer> }) => setItems(data.data))
      .catch(() => toast.error('Gagal memuat data customer'))
      .finally(() => setLoading(false));
  }, [search, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const resetFormState = () => {
    setForm(emptyForm);
    setEditItem(null);
    setFotoKtpFile(null);
    setFotoKtpPreview(null);
    setFotoSimFile(null);
    setFotoSimPreview(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v !== null && v !== undefined) fd.append(k, v);
      });
      if (fotoKtpFile) fd.append('foto_ktp', fotoKtpFile);
      if (fotoSimFile) fd.append('foto_sim', fotoSimFile);

      if (editItem) {
        fd.append('_method', 'PUT');
        await customerAPI.update(editItem.id, fd);
        toast.success('Customer berhasil diperbarui');
      } else {
        await customerAPI.create(fd);
        toast.success('Customer berhasil ditambahkan');
      }

      setShowForm(false);
      resetFormState();
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

  const handleEdit = (item: Customer) => {
    setForm({
      nama_lengkap: item.nama_lengkap,
      no_hp: item.no_hp,
      email: item.email || '',
      alamat: item.alamat || '',
      no_ktp: item.no_ktp || '',
      no_sim: item.no_sim || '',
      catatan: item.catatan || '',
    });
    setEditItem(item);
    setFotoKtpFile(null);
    setFotoKtpPreview(null);
    setFotoSimFile(null);
    setFotoSimPreview(null);
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await customerAPI.delete(confirmDelete.id);
      toast.success('Customer berhasil dihapus');
      load();
    } catch (err) {
      const msg = isAxiosError(err) ? err.response?.data?.message : undefined;
      toast.error(msg || 'Gagal menghapus customer');
    }
    setConfirmDelete(null);
  };

  const setField = <K extends keyof CustomerForm>(key: K, value: CustomerForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const getFileUrl = (path: string | null) => (path ? `/storage/${path}` : null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-ink-900">Customers</h1>
        <button
          onClick={() => {
            resetFormState();
            setShowForm(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tambah Customer
        </button>
      </div>

      <div className="rounded-xl border border-ink-200 bg-white p-4 shadow-sm">
        <div className="relative max-w-md">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Cari nama, no HP, no KTP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputClass} pl-10`}
          />
        </div>
      </div>

      {showForm && (
        <div
          className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-black/50 p-4"
          onClick={() => {
            setShowForm(false);
            setEditItem(null);
          }}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-ink-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-ink-900">{editItem ? 'Edit Customer' : 'Tambah Customer'}</h2>
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
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">Nama Lengkap *</label>
                  <input
                    type="text"
                    value={form.nama_lengkap}
                    onChange={(e) => setField('nama_lengkap', e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">No. HP *</label>
                  <input
                    type="text"
                    value={form.no_hp}
                    onChange={(e) => setField('no_hp', e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">Email</label>
                  <input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">No. KTP</label>
                  <input type="text" value={form.no_ktp} onChange={(e) => setField('no_ktp', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">No. SIM</label>
                  <input type="text" value={form.no_sim} onChange={(e) => setField('no_sim', e.target.value)} className={inputClass} />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-ink-700">Alamat</label>
                <textarea
                  value={form.alamat}
                  onChange={(e) => setField('alamat', e.target.value)}
                  rows={2}
                  className={`${inputClass} resize-none`}
                />
              </div>

              <div className="border-t border-ink-200 pt-2">
                <h3 className="mb-3 text-sm font-semibold text-ink-900">Dokumen</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FileUpload
                    label="Foto KTP"
                    accept="image/*"
                    file={fotoKtpFile}
                    preview={fotoKtpPreview}
                    existing={editItem?.foto_ktp ? getFileUrl(editItem.foto_ktp) : null}
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      setFotoKtpFile(f);
                      setFotoKtpPreview(f ? URL.createObjectURL(f) : null);
                    }}
                  />
                  <FileUpload
                    label="Foto SIM"
                    accept="image/*"
                    file={fotoSimFile}
                    preview={fotoSimPreview}
                    existing={editItem?.foto_sim ? getFileUrl(editItem.foto_sim) : null}
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      setFotoSimFile(f);
                      setFotoSimPreview(f ? URL.createObjectURL(f) : null);
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-ink-700">Catatan</label>
                <textarea
                  value={form.catatan}
                  onChange={(e) => setField('catatan', e.target.value)}
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
                  }}
                  className="rounded-lg border border-ink-200 px-4 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
                >
                  {submitting && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                  {editItem ? 'Simpan' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!confirmDelete}
        title="Hapus Customer"
        message={`Yakin ingin menghapus "${confirmDelete?.nama_lengkap}"? Semua data terkait akan ikut terhapus.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      <div className="overflow-hidden rounded-xl border border-ink-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-ink-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-ink-400">Nama</th>
                <th className="px-4 py-3 text-left font-medium text-ink-400">No. HP</th>
                <th className="px-4 py-3 text-left font-medium text-ink-400">No. KTP</th>
                <th className="px-4 py-3 text-left font-medium text-ink-400">Dokumen</th>
                <th className="px-4 py-3 text-left font-medium text-ink-400">Order</th>
                <th className="px-4 py-3 text-right font-medium text-ink-400">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                    <p className="text-sm text-ink-400">Memuat data...</p>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <svg className="mx-auto mb-3 h-12 w-12 text-ink-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <p className="font-medium text-ink-700">Tidak ada data customer</p>
                    <p className="mt-1 text-sm text-ink-400">Mulai dengan menambahkan customer baru</p>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-ink-900">{item.nama_lengkap}</td>
                    <td className="px-4 py-3 text-ink-700">{item.no_hp}</td>
                    <td className="px-4 py-3 font-mono text-sm text-ink-700">{item.no_ktp || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {item.foto_ktp && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rented-50 px-2 py-0.5 text-xs font-medium text-rented-500">
                            KTP
                          </span>
                        )}
                        {item.foto_sim && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-avail-50 px-2 py-0.5 text-xs font-medium text-avail-600">
                            SIM
                          </span>
                        )}
                        {!item.foto_ktp && !item.foto_sim && <span className="text-xs text-ink-400">-</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-700">{item.orders_count}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(item)}
                          className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-brand-50 hover:text-brand-600"
                          title="Edit"
                          aria-label={`Edit ${item.nama_lengkap}`}
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => setConfirmDelete(item)}
                          className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-maint-50 hover:text-maint-600"
                          title="Hapus"
                          aria-label={`Hapus ${item.nama_lengkap}`}
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
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