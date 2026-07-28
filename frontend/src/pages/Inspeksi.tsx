import { useState, useEffect, useCallback, type ChangeEvent, type FormEvent } from 'react';
import { isAxiosError } from 'axios';
import { inspeksiAPI, type InspeksiKendaraan, type Order } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import ConfirmModal from '../components/ConfirmModal';
import { formatRupiah } from '../lib/format';
import { ClipboardCheck, Plus, Search, Eye, Trash2, X, Upload, AlertTriangle } from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
 * LABELS & OPTIONS
 * ───────────────────────────────────────────────────────────── */

const jenisLabels: Record<string, string> = {
  pickup: 'Serah Terima Awal (Pickup)',
  return: 'Serah Terima Akhir (Return)',
};

const fuelLabels: Record<string, string> = {
  full: 'Full',
  '3/4': '3/4',
  '1/2': '1/2',
  '1/4': '1/4',
  kosong: 'Kosong',
};

const kondisiBodyLabels: Record<string, string> = {
  baik: 'Baik',
  lecet_ringan: 'Lecet Ringan',
  lecet_parah: 'Lecet Parah',
  penyok: 'Penyok',
  retak: 'Retak',
};

const kondisiInteriorLabels: Record<string, string> = {
  baik: 'Baik',
  kotor_ringan: 'Kotor Ringan',
  kotor_banyak: 'Kotor Banyak',
  rusak: 'Rusak',
};

const kondisiBanLabels: Record<string, string> = {
  baik: 'Baik',
  tipis: 'Tipis',
  gundul: 'Gundul',
  kosong: 'Kosong',
};

const kondisiACLabels: Record<string, string> = {
  baik: 'Baik',
  tidak_baik: 'Tidak Baik',
};

const kondisiLampuLabels: Record<string, string> = {
  baik: 'Baik',
  tidak_baik: 'Tidak Baik',
};

const fuelColors: Record<string, string> = {
  full: 'bg-avail-50 text-avail-600',
  '3/4': 'bg-avail-50 text-avail-600',
  '1/2': 'bg-amber-100 text-amber-800',
  '1/4': 'bg-maint-50 text-maint-600',
  kosong: 'bg-rented-50 text-rented-600',
};

const kondisiColors: Record<string, string> = {
  baik: 'bg-avail-50 text-avail-600',
  lecet_ringan: 'bg-amber-100 text-amber-800',
  lecet_parah: 'bg-maint-50 text-maint-600',
  kotor_ringan: 'bg-amber-100 text-amber-800',
  kotor_banyak: 'bg-maint-50 text-maint-600',
  rusak: 'bg-rented-50 text-rented-600',
  tipis: 'bg-amber-100 text-amber-800',
  gundul: 'bg-maint-50 text-maint-600',
  kosong: 'bg-rented-50 text-rented-600',
  tidak_baik: 'bg-maint-50 text-maint-600',
  penyok: 'bg-maint-50 text-maint-600',
  retak: 'bg-rented-50 text-rented-600',
};

const inputClass =
  'w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-900 outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500';

/* ─────────────────────────────────────────────────────────────
 * TYPES
 * ───────────────────────────────────────────────────────────── */

interface InspeksiForm {
  order_id: string;
  jenis: 'pickup' | 'return';
  odometer: string;
  fuel_level: string;
  kondisi_body: string;
  kondisi_interior: string;
  kondisi_ban: string;
  kondisi_ac: string;
  kondisi_lampu: string;
  ada_damagenya: boolean;
  deskripsi_kondisi: string;
  catatan: string;
  inspeksi_oleh: string;
  foto: File | null;
}

const emptyForm: InspeksiForm = {
  order_id: '',
  jenis: 'pickup',
  odometer: '',
  fuel_level: 'full',
  kondisi_body: 'baik',
  kondisi_interior: 'baik',
  kondisi_ban: 'baik',
  kondisi_ac: 'baik',
  kondisi_lampu: 'baik',
  ada_damagenya: false,
  deskripsi_kondisi: '',
  catatan: '',
  inspeksi_oleh: '',
  foto: null,
};

/* ─────────────────────────────────────────────────────────────
 * BADGE COMPONENT
 * ───────────────────────────────────────────────────────────── */

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────
 * MAIN COMPONENT
 * ───────────────────────────────────────────────────────────── */

export default function Inspeksi() {
  const { error: toastError, success: toastSuccess } = useToast();

  const [inspeksis, setInspeksis] = useState<InspeksiKendaraan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState<InspeksiKendaraan | null>(null);
  const [form, setForm] = useState<InspeksiForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<InspeksiKendaraan | null>(null);

  const [filterJenis, setFilterJenis] = useState('');
  const [searchOrder, setSearchOrder] = useState('');

  const fetchInspeksis = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterJenis) params.jenis = filterJenis;
      if (searchOrder) params.order_id = searchOrder;
      const res = await inspeksiAPI.list(params);
      setInspeksis(res.data.data);
    } catch {
      toastError('Gagal memuat data inspeksi.');
    } finally {
      setLoading(false);
    }
  }, [filterJenis, searchOrder, toastError, toastSuccess]);

  useEffect(() => {
    fetchInspeksis();
  }, [fetchInspeksis]);

  const handleFormChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setForm((prev) => ({ ...prev, foto: file }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const fd = new FormData();
      fd.append('order_id', form.order_id);
      fd.append('jenis', form.jenis);
      if (form.odometer) fd.append('odometer', form.odometer);
      fd.append('fuel_level', form.fuel_level);
      fd.append('kondisi_body', form.kondisi_body);
      fd.append('kondisi_interior', form.kondisi_interior);
      fd.append('kondisi_ban', form.kondisi_ban);
      fd.append('kondisi_ac', form.kondisi_ac);
      fd.append('kondisi_lampu', form.kondisi_lampu);
      fd.append('ada_damagenya', form.ada_damagenya ? '1' : '0');
      if (form.deskripsi_kondisi) fd.append('deskripsi_kondisi', form.deskripsi_kondisi);
      if (form.catatan) fd.append('catatan', form.catatan);
      if (form.inspeksi_oleh) fd.append('inspeksi_oleh', form.inspeksi_oleh);
      if (form.foto) fd.append('foto', form.foto);

      await inspeksiAPI.create(fd);
      toastSuccess('Inspeksi berhasil disimpan.');
      setShowForm(false);
      setForm(emptyForm);
      fetchInspeksis();
    } catch (err) {
      const msg = isAxiosError(err) ? err.response?.data?.message : 'Gagal menyimpan inspeksi.';
      toastError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await inspeksiAPI.delete(deleteTarget.id);
      toastSuccess('Inspeksi berhasil dihapus.');
      setDeleteTarget(null);
      fetchInspeksis();
    } catch {
      toastError('Gagal menghapus inspeksi.');
    }
  };

  const formatDate = (d: string) => {
    return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Inspeksi Kendaraan</h1>
          <p className="text-sm text-ink-500">Pencatan kondisi kendaraan saat serah terima pickup & return</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-600"
        >
          <Plus size={16} />
          Inspeksi Baru
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex gap-2">
          <button
            onClick={() => setFilterJenis('')}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              filterJenis === '' ? 'bg-brand-500 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
            }`}
          >
            Semua
          </button>
          <button
            onClick={() => setFilterJenis('pickup')}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              filterJenis === 'pickup' ? 'bg-brand-500 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
            }`}
          >
            Pickup
          </button>
          <button
            onClick={() => setFilterJenis('return')}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              filterJenis === 'return' ? 'bg-brand-500 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
            }`}
          >
            Return
          </button>
        </div>
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            placeholder="Cari berdasarkan Order ID..."
            value={searchOrder}
            onChange={(e) => setSearchOrder(e.target.value)}
            className={`${inputClass} pl-9`}
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-ink-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink-200 bg-ink-50">
              <tr>
                <th className="px-4 py-3 font-medium text-ink-600">Tanggal</th>
                <th className="px-4 py-3 font-medium text-ink-600">Order</th>
                <th className="px-4 py-3 font-medium text-ink-600">Jenis</th>
                <th className="px-4 py-3 font-medium text-ink-600">Odometer</th>
                <th className="px-4 py-3 font-medium text-ink-600">BBM</th>
                <th className="px-4 py-3 font-medium text-ink-600">Body</th>
                <th className="px-4 py-3 font-medium text-ink-600">Ban</th>
                <th className="px-4 py-3 font-medium text-ink-600">Damage</th>
                <th className="px-4 py-3 font-medium text-ink-600">Petugas</th>
                <th className="px-4 py-3 font-medium text-ink-600">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-ink-400">Memuat...</td>
                </tr>
              ) : inspeksis.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-ink-400">Belum ada data inspeksi</td>
                </tr>
              ) : (
                inspeksis.map((item) => (
                  <tr key={item.id} className="hover:bg-ink-50 transition-colors">
                    <td className="whitespace-nowrap px-4 py-3 text-ink-700">{formatDate(item.created_at)}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-ink-900">{item.order?.kode_order ?? `#${item.order_id}`}</td>
                    <td className="px-4 py-3">
                      <Badge
                        label={item.jenis === 'pickup' ? 'Pickup' : 'Return'}
                        color={item.jenis === 'pickup' ? 'bg-avail-50 text-avail-600' : 'bg-brand-100 text-brand-600'}
                      />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-700">{item.odometer ? `${item.odometer.toLocaleString('id-ID')} km` : '-'}</td>
                    <td className="px-4 py-3">
                      <Badge label={fuelLabels[item.fuel_level] ?? item.fuel_level} color={fuelColors[item.fuel_level] ?? 'bg-ink-100 text-ink-600'} />
                    </td>
                    <td className="px-4 py-3">
                      <Badge label={kondisiBodyLabels[item.kondisi_body] ?? item.kondisi_body} color={kondisiColors[item.kondisi_body] ?? 'bg-ink-100 text-ink-600'} />
                    </td>
                    <td className="px-4 py-3">
                      <Badge label={kondisiBanLabels[item.kondisi_ban] ?? item.kondisi_ban} color={kondisiColors[item.kondisi_ban] ?? 'bg-ink-100 text-ink-600'} />
                    </td>
                    <td className="px-4 py-3">
                      {item.ada_damagenya ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-maint-600">
                          <AlertTriangle size={14} /> Ya
                        </span>
                      ) : (
                        <span className="text-xs text-ink-400">Tidak</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-600">{item.inspeksi_oleh ?? item.admin?.name ?? '-'}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setShowDetail(item)} className="text-ink-400 hover:text-brand-500 transition-colors" title="Lihat Detail">
                          <Eye size={16} />
                        </button>
                        <button onClick={() => setDeleteTarget(item)} className="text-ink-400 hover:text-red-500 transition-colors" title="Hapus">
                          <Trash2 size={16} />
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

      {/* ─────────────── FORM MODAL ─────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-ink-900">Inspeksi Kendaraan Baru</h2>
              <button onClick={() => setShowForm(false)} className="text-ink-400 hover:text-ink-600"><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Order ID & Jenis */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">Order ID <span className="text-red-500">*</span></label>
                  <input type="number" name="order_id" value={form.order_id} onChange={handleFormChange} required className={inputClass} placeholder="Masukkan ID order" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">Jenis Inspeksi <span className="text-red-500">*</span></label>
                  <select name="jenis" value={form.jenis} onChange={handleFormChange} className={inputClass}>
                    <option value="pickup">Pickup (Serah Terima Awal)</option>
                    <option value="return">Return (Serah Terima Akhir)</option>
                  </select>
                </div>
              </div>

              {/* Odometer & Fuel */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">Odometer (km)</label>
                  <input type="number" name="odometer" value={form.odometer} onChange={handleFormChange} className={inputClass} placeholder="Contoh: 45000" min="0" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">Level BBM <span className="text-red-500">*</span></label>
                  <select name="fuel_level" value={form.fuel_level} onChange={handleFormChange} className={inputClass}>
                    <option value="full">Full</option>
                    <option value="3/4">3/4</option>
                    <option value="1/2">1/2</option>
                    <option value="1/4">1/4</option>
                    <option value="kosong">Kosong</option>
                  </select>
                </div>
              </div>

              {/* Kondisi */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">Kondisi Body <span className="text-red-500">*</span></label>
                  <select name="kondisi_body" value={form.kondisi_body} onChange={handleFormChange} className={inputClass}>
                    <option value="baik">Baik</option>
                    <option value="lecet_ringan">Lecet Ringan</option>
                    <option value="lecet_parah">Lecet Parah</option>
                    <option value="penyok">Penyok</option>
                    <option value="retak">Retak</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">Kondisi Interior <span className="text-red-500">*</span></label>
                  <select name="kondisi_interior" value={form.kondisi_interior} onChange={handleFormChange} className={inputClass}>
                    <option value="baik">Baik</option>
                    <option value="kotor_ringan">Kotor Ringan</option>
                    <option value="kotor_banyak">Kotor Banyak</option>
                    <option value="rusak">Rusak</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">Kondisi Ban <span className="text-red-500">*</span></label>
                  <select name="kondisi_ban" value={form.kondisi_ban} onChange={handleFormChange} className={inputClass}>
                    <option value="baik">Baik</option>
                    <option value="tipis">Tipis</option>
                    <option value="gundul">Gundul</option>
                    <option value="kosong">Kosong</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">Kondisi AC <span className="text-red-500">*</span></label>
                  <select name="kondisi_ac" value={form.kondisi_ac} onChange={handleFormChange} className={inputClass}>
                    <option value="baik">Baik</option>
                    <option value="tidak_baik">Tidak Baik</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">Kondisi Lampu <span className="text-red-500">*</span></label>
                  <select name="kondisi_lampu" value={form.kondisi_lampu} onChange={handleFormChange} className={inputClass}>
                    <option value="baik">Baik</option>
                    <option value="tidak_baik">Tidak Baik</option>
                  </select>
                </div>
              </div>

              {/* Damage checkbox */}
              <div className="flex items-center gap-2">
                <input type="checkbox" name="ada_damagenya" checked={form.ada_damagenya} onChange={handleFormChange} className="h-4 w-4 rounded border-ink-300 text-brand-500 focus:ring-brand-500" />
                <label className="text-sm font-medium text-ink-700">Ada Kerusakan</label>
              </div>

              {/* Deskripsi & Catatan */}
              <div>
                <label className="mb-1 block text-sm font-medium text-ink-700">Deskripsi Kondisi</label>
                <textarea name="deskripsi_kondisi" value={form.deskripsi_kondisi} onChange={handleFormChange} rows={3} className={inputClass} placeholder="Deskripsikan kondisi kendaraan secara detail..." />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-ink-700">Catatan</label>
                <textarea name="catatan" value={form.catatan} onChange={handleFormChange} rows={2} className={inputClass} placeholder="Catatan tambahan..." />
              </div>

              {/* Petugas & Foto */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">Inspeksi Oleh</label>
                  <input type="text" name="inspeksi_oleh" value={form.inspeksi_oleh} onChange={handleFormChange} className={inputClass} placeholder="Nama petugas" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">Foto Kendaraan</label>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-ink-300 px-4 py-3 text-sm text-ink-500 transition-colors hover:border-brand-500 hover:text-brand-500">
                    <Upload size={16} />
                    {form.foto ? form.foto.name : 'Pilih foto...'}
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-ink-200 px-4 py-2 text-sm font-medium text-ink-600 hover:bg-ink-50">Batal</button>
                <button type="submit" disabled={submitting} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">
                  {submitting ? 'Menyimpan...' : 'Simpan Inspeksi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────── DETAIL MODAL ─────────────── */}
      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-ink-900">Detail Inspeksi #{showDetail.id}</h2>
              <button onClick={() => setShowDetail(null)} className="text-ink-400 hover:text-ink-600"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              {/* Info Dasar */}
              <div className="grid grid-cols-2 gap-4 rounded-lg bg-ink-50 p-4">
                <div>
                  <p className="text-xs font-medium text-ink-500">Order</p>
                  <p className="text-sm font-semibold text-ink-900">{showDetail.order?.kode_order ?? `#${showDetail.order_id}`}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-ink-500">Jenis</p>
                  <Badge
                    label={jenisLabels[showDetail.jenis] ?? showDetail.jenis}
                    color={showDetail.jenis === 'pickup' ? 'bg-avail-50 text-avail-600' : 'bg-brand-100 text-brand-600'}
                  />
                </div>
                <div>
                  <p className="text-xs font-medium text-ink-500">Tanggal Inspeksi</p>
                  <p className="text-sm text-ink-700">{formatDate(showDetail.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-ink-500">Petugas</p>
                  <p className="text-sm text-ink-700">{showDetail.inspeksi_oleh ?? showDetail.admin?.name ?? '-'}</p>
                </div>
              </div>

              {/* Data Kendaraan */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-ink-500">Odometer</p>
                  <p className="text-sm font-semibold text-ink-900">{showDetail.odometer ? `${showDetail.odometer.toLocaleString('id-ID')} km` : '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-ink-500">Level BBM</p>
                  <Badge label={fuelLabels[showDetail.fuel_level] ?? showDetail.fuel_level} color={fuelColors[showDetail.fuel_level] ?? 'bg-ink-100 text-ink-600'} />
                </div>
              </div>

              {/* Kondisi Detail */}
              <div>
                <p className="mb-2 text-xs font-medium text-ink-500 uppercase tracking-wider">Kondisi Kendaraan</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Body', value: showDetail.kondisi_body, labels: kondisiBodyLabels },
                    { label: 'Interior', value: showDetail.kondisi_interior, labels: kondisiInteriorLabels },
                    { label: 'Ban', value: showDetail.kondisi_ban, labels: kondisiBanLabels },
                    { label: 'AC', value: showDetail.kondisi_ac, labels: kondisiACLabels },
                    { label: 'Lampu', value: showDetail.kondisi_lampu, labels: kondisiLampuLabels },
                    { label: 'Kerusakan', value: showDetail.ada_damagenya ? 'Ya' : 'Tidak', labels: {} },
                  ].map((item) => (
                    <div key={item.label} className="rounded-lg bg-ink-50 px-3 py-2">
                      <p className="text-xs text-ink-500">{item.label}</p>
                      <Badge
                        label={item.labels[item.value] ?? item.value}
                        color={kondisiColors[item.value] ?? (item.value === 'Ya' ? 'bg-maint-50 text-maint-600' : 'bg-avail-50 text-avail-600')}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Deskripsi & Catatan */}
              {showDetail.deskripsi_kondisi && (
                <div>
                  <p className="text-xs font-medium text-ink-500">Deskripsi Kondisi</p>
                  <p className="mt-1 text-sm text-ink-700 whitespace-pre-wrap">{showDetail.deskripsi_kondisi}</p>
                </div>
              )}
              {showDetail.catatan && (
                <div>
                  <p className="text-xs font-medium text-ink-500">Catatan</p>
                  <p className="mt-1 text-sm text-ink-700 whitespace-pre-wrap">{showDetail.catatan}</p>
                </div>
              )}

              {/* Foto */}
              {showDetail.foto && (
                <div>
                  <p className="text-xs font-medium text-ink-500">Foto Kendaraan</p>
                  <img
                    src={`/storage/${showDetail.foto}`}
                    alt={`Inspeksi #${showDetail.id}`}
                    className="mt-2 max-h-64 rounded-lg object-cover"
                  />
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button onClick={() => setShowDetail(null)} className="rounded-lg border border-ink-200 px-4 py-2 text-sm font-medium text-ink-600 hover:bg-ink-50">Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────── DELETE CONFIRM ─────────────── */}
      {deleteTarget && (
        <ConfirmModal
          open={!!deleteTarget}
          title="Hapus Inspeksi"
          message={`Yakin ingin menghapus inspeksi #${deleteTarget.id} (${jenisLabels[deleteTarget.jenis]})?`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
