import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { katalogAPI, type KategoriKendaraan, type TipeKendaraan, type KatalogItem, type OrderRequestPayload } from '../services/api';
import { todayJakarta } from '../lib/format';

interface KategoriWithCount extends KategoriKendaraan {
  slug: string;
  kendaraans_count: number;
}

interface TipeWithCount extends TipeKendaraan {
  slug: string;
  kendaraans_count: number;
}

interface KatalogMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

const SORT_OPTIONS = [
  { value: 'terbaru', label: 'Terbaru' },
  { value: 'harga_asc', label: 'Harga Terendah' },
  { value: 'harga_desc', label: 'Harga Tertinggi' },
  { value: 'nama', label: 'Nama A-Z' },
] as const;

const formatRupiah = (n: number): string =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n);

const getFotoUrl = (foto: string | null | undefined): string | null => {
  if (!foto) return null;
  if (foto.startsWith('http')) return foto;
  return `/storage/${foto}`;
};

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

/* ────────────────────────────────────────────────────────────────
 * MODAL — PESAN SEKARANG
 * ──────────────────────────────────────────────────────────────── */

interface OrderForm {
  nama_lengkap: string;
  no_hp: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  jam_mulai: string;
  jam_selesai: string;
  opsi_supir: 'lepas_kunci' | 'dengan_supir';
  catatan: string;
}

function PesanSekarangModal({
  item,
  onClose,
}: {
  item: KatalogItem;
  onClose: () => void;
}) {
  const [form, setForm] = useState<OrderForm>({
    nama_lengkap: '',
    no_hp: '',
    tanggal_mulai: '',
    tanggal_selesai: '',
    jam_mulai: '',
    jam_selesai: '',
    opsi_supir: 'lepas_kunci',
    catatan: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [waLink, setWaLink] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstInputRef.current?.focus();
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const today = useMemo(() => todayJakarta(), []);

  const durasiHari = useMemo(() => {
    if (!form.tanggal_mulai || !form.tanggal_selesai) return 0;

    if (form.jam_mulai && form.jam_selesai) {
      const mulai = new Date(form.tanggal_mulai + 'T' + form.jam_mulai + ':00');
      const selesai = new Date(form.tanggal_selesai + 'T' + form.jam_selesai + ':00');
      const diffHours = (selesai.getTime() - mulai.getTime()) / (1000 * 60 * 60);
      return Math.max(1, Math.ceil(diffHours / 24));
    }

    const mulai = new Date(form.tanggal_mulai + 'T00:00:00');
    const selesai = new Date(form.tanggal_selesai + 'T00:00:00');
    const diffDays = Math.ceil((selesai.getTime() - mulai.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays + 1);
  }, [form.tanggal_mulai, form.tanggal_selesai, form.jam_mulai, form.jam_selesai]);

  const totalPreview = useMemo(() => {
    return item.harga_sewa_per_hari * durasiHari;
  }, [item.harga_sewa_per_hari, durasiHari]);

  const handleChange = (field: keyof OrderForm, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmitPesanSekarang = async () => {
    if (!form.nama_lengkap.trim()) {
      setError('Nama lengkap wajib diisi');
      return;
    }
    if (!form.no_hp.trim()) {
      setError('Nomor WhatsApp wajib diisi');
      return;
    }
    if (!form.tanggal_mulai) {
      setError('Tanggal mulai wajib dipilih');
      return;
    }
    if (!form.tanggal_selesai) {
      setError('Tanggal selesai wajib dipilih');
      return;
    }
    if (durasiHari < 1) {
      setError('Tanggal selesai harus setelah tanggal mulai');
      return;
    }
    if (form.jam_mulai && !form.jam_selesai) {
      setError('Jam selesai wajib diisi jika jam mulai dipilih');
      return;
    }
    if (!form.jam_mulai && form.jam_selesai) {
      setError('Jam mulai wajib diisi jika jam selesai dipilih');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const payload: OrderRequestPayload = {
        nama_lengkap: form.nama_lengkap.trim(),
        no_hp: form.no_hp.trim(),
        kendaraan_id: item.id,
        tanggal_mulai: form.tanggal_mulai,
        tanggal_selesai: form.tanggal_selesai,
        opsi_supir: form.opsi_supir,
      };
      if (form.jam_mulai) payload.jam_mulai = form.jam_mulai;
      if (form.jam_selesai) payload.jam_selesai = form.jam_selesai;
      if (form.catatan.trim()) payload.catatan = form.catatan.trim();

      const { data } = await katalogAPI.orderRequest(payload);
      setWaLink(data.wa_link);
      setSuccess(true);
    } catch (err: unknown) {
      let msg = 'Gagal mengirim pesanan. Silakan coba lagi.';
      if (err && typeof err === 'object' && 'response' in err) {
        const resp = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }).response?.data;
        if (resp?.errors) {
          const firstKey = Object.keys(resp.errors)[0];
          if (firstKey && Array.isArray(resp.errors[firstKey]) && resp.errors[firstKey].length > 0) {
            msg = resp.errors[firstKey][0];
          }
        } else if (resp?.message) {
          msg = resp.message;
        }
      }
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleKonsultasiAdmin = () => {
    const opsLabel = form.opsi_supir === 'dengan_supir' ? 'Dengan Supir' : 'Lepas Kunci';
    const tglInfo = form.tanggal_mulai
      ? `${form.tanggal_mulai}${form.tanggal_selesai ? ' s/d ' + form.tanggal_selesai : ''}${form.jam_mulai ? ' jam ' + form.jam_mulai : ''}`
      : 'belum ditentukan';
    const pesan = `Halo, saya tertarik dengan *${item.nama_kendaraan}* (${item.merek} ${item.model} ${item.tahun}) seharga ${formatRupiah(item.harga_sewa_per_hari)}/hari.\n\nTanggal: ${tglInfo}\nOpsi: ${opsLabel}\n\nSaya ingin berkonsultasi lebih lanjut. Terima kasih.`;
    window.open(`https://wa.me/62895361054272?text=${encodeURIComponent(pesan)}`, '_blank');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Pesan kendaraan"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        ref={modalRef}
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Pesan Sekarang</h2>
            <p className="text-sm text-gray-500">{item.nama_kendaraan}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Tutup"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5">
          {success ? (
            /* ── Success State ── */
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Pesanan Terkirim!</h3>
              <p className="text-gray-500 text-sm mb-6">
                Admin akan segera mengkonfirmasi pesanan Anda via WhatsApp.
              </p>
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition-colors shadow-lg"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Buka WhatsApp
              </a>
              <button
                onClick={onClose}
                className="block mx-auto mt-3 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Tutup
              </button>
            </div>
          ) : (
            /* ── Form State ── */
            <>
              {/* Kendaraan summary */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-5">
                <div className="w-14 h-14 rounded-lg bg-gray-200 overflow-hidden shrink-0">
                  {item.foto ? (
                    <img
                      src={getFotoUrl(item.foto) ?? ''}
                      alt={item.nama_kendaraan}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 17h.01M16 17h.01M3 11l1.5-5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.4L21 11M3 11h18M3 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-6" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 text-sm line-clamp-1">{item.nama_kendaraan}</p>
                  <p className="text-xs text-gray-500">{item.merek} {item.model} &middot; {item.tahun}</p>
                  <p className="text-sm font-bold text-blue-600 mt-0.5">{formatRupiah(item.harga_sewa_per_hari)}/hari</p>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Lengkap <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={firstInputRef}
                    type="text"
                    value={form.nama_lengkap}
                    onChange={(e) => handleChange('nama_lengkap', e.target.value)}
                    placeholder="Masukkan nama lengkap"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nomor WhatsApp <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">+62</span>
                    <input
                      type="tel"
                      value={form.no_hp}
                      onChange={(e) => handleChange('no_hp', e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="8xxx"
                      className="w-full pl-12 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tanggal Mulai <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={form.tanggal_mulai}
                      min={today}
                      onChange={(e) => {
                        handleChange('tanggal_mulai', e.target.value);
                        if (form.tanggal_selesai && e.target.value && form.tanggal_selesai <= e.target.value) {
                          handleChange('tanggal_selesai', '');
                        }
                      }}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tanggal Selesai <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={form.tanggal_selesai}
                      min={form.tanggal_mulai || today}
                      onChange={(e) => handleChange('tanggal_selesai', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Jam Mulai <span className="text-gray-400 font-normal">(opsional)</span>
                    </label>
                    <input
                      type="time"
                      value={form.jam_mulai}
                      onChange={(e) => handleChange('jam_mulai', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Jam Selesai <span className="text-gray-400 font-normal">(opsional)</span>
                    </label>
                    <input
                      type="time"
                      value={form.jam_selesai}
                      onChange={(e) => handleChange('jam_selesai', e.target.value)}
                      disabled={!form.jam_mulai}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-shadow disabled:bg-gray-50 disabled:text-gray-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Opsi Supir
                  </label>
                  <div className="flex gap-4">
                    <label className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all flex-1 ${
                      form.opsi_supir === 'lepas_kunci'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <input
                        type="radio"
                        name="opsi_supir"
                        value="lepas_kunci"
                        checked={form.opsi_supir === 'lepas_kunci'}
                        onChange={() => handleChange('opsi_supir', 'lepas_kunci')}
                        className="sr-only"
                      />
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        form.opsi_supir === 'lepas_kunci' ? 'border-blue-500' : 'border-gray-300'
                      }`}>
                        {form.opsi_supir === 'lepas_kunci' && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">Lepas Kunci</div>
                        <div className="text-xs text-gray-500">Tanpa supir</div>
                      </div>
                    </label>
                    <label className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all flex-1 ${
                      form.opsi_supir === 'dengan_supir'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <input
                        type="radio"
                        name="opsi_supir"
                        value="dengan_supir"
                        checked={form.opsi_supir === 'dengan_supir'}
                        onChange={() => handleChange('opsi_supir', 'dengan_supir')}
                        className="sr-only"
                      />
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        form.opsi_supir === 'dengan_supir' ? 'border-blue-500' : 'border-gray-300'
                      }`}>
                        {form.opsi_supir === 'dengan_supir' && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">Dengan Supir</div>
                        <div className="text-xs text-gray-500">Biaya diinfo admin</div>
                      </div>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Catatan (opsional)</label>
                  <textarea
                    value={form.catatan}
                    onChange={(e) => handleChange('catatan', e.target.value)}
                    placeholder="Contoh: butuh antar ke hotel, dll"
                    rows={2}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-shadow resize-none"
                  />
                </div>

                {/* Price preview */}
                <div className="bg-blue-50 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Harga/hari</span>
                    <span className="text-sm font-medium text-gray-900">{formatRupiah(item.harga_sewa_per_hari)}</span>
                  </div>
                  {durasiHari > 0 && (
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Durasi</span>
                      <span className="text-sm font-medium text-gray-900">{durasiHari} hari</span>
                    </div>
                  )}
                  {form.opsi_supir === 'dengan_supir' && (
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Supir</span>
                      <span className="text-xs text-orange-600 font-medium">Biaya diinfo admin</span>
                    </div>
                  )}
                  <div className="border-t border-blue-200 pt-2 flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-900">Perkiraan Total</span>
                    <span className="text-lg font-bold text-blue-600">
                      {durasiHari > 0 ? formatRupiah(totalPreview) : '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-6 space-y-3">
                <button
                  onClick={handleSubmitPesanSekarang}
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-lg"
                >
                  {submitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Mengirim...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Pesan Sekarang
                    </>
                  )}
                </button>
                <button
                  onClick={handleKonsultasiAdmin}
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 disabled:opacity-50 transition-colors shadow-lg"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Konsultasi via Admin
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
 * SKELETON
 * ──────────────────────────────────────────────────────────────── */

function VehicleCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="skeleton h-44 w-full rounded-none" />
      <div className="p-4 space-y-3">
        <div className="skeleton h-5 w-3/4 rounded" />
        <div className="skeleton h-4 w-1/2 rounded" />
        <div className="skeleton h-4 w-2/3 rounded" />
        <div className="skeleton h-8 w-full rounded-lg" />
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
 * VEHICLE CARD
 * ──────────────────────────────────────────────────────────────── */

function VehicleCard({
  item,
  onPesan,
  availableForDates,
}: {
  item: KatalogItem;
  onPesan: (item: KatalogItem) => void;
  availableForDates?: boolean;
}) {
  const fotoUrl = getFotoUrl(item.foto);
  const isUnavailable = availableForDates === false;

  const handleCardClick = (e: React.MouseEvent) => {
    if (isUnavailable) return;
    if ((e.target as HTMLElement).closest('button')) return;
    window.location.href = `/katalog/${item.id}`;
  };

  return (
    <div
      onClick={handleCardClick}
      className={`group bg-white rounded-xl border overflow-hidden transition-all duration-200 ${
        isUnavailable
          ? 'border-gray-200 opacity-70'
          : 'border-gray-200 hover:shadow-lg hover:border-blue-200 cursor-pointer'
      }`}
    >
      <div className="relative h-44 bg-gray-100 overflow-hidden">
        {fotoUrl ? (
          <img
            src={fotoUrl}
            alt={`${item.merek ?? ''} ${item.model ?? ''}`}
            loading="lazy"
            className={`w-full h-full object-cover transition-transform duration-300 ${
              isUnavailable ? '' : 'group-hover:scale-105'
            }`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 17h.01M16 17h.01M3 11l1.5-5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.4L21 11M3 11h18M3 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-6" />
            </svg>
          </div>
        )}
        {item.tipe && (
          <span className="absolute top-3 left-3 px-2.5 py-1 bg-white/90 backdrop-blur-sm text-xs font-semibold text-gray-700 rounded-lg uppercase">
            {item.tipe.nama_tipe}
          </span>
        )}
        {isUnavailable && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <span className="px-3 py-1.5 bg-orange-500 text-white text-xs font-bold rounded-full shadow-lg">
              Tidak Tersedia
            </span>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className={`font-bold text-gray-900 transition-colors line-clamp-1 ${
          isUnavailable ? '' : 'group-hover:text-blue-600'
        }`}>
          {item.nama_kendaraan}
        </h3>
        <p className="text-sm text-gray-500 mt-0.5">
          {item.merek} {item.model} &middot; {item.tahun}
        </p>
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
          {item.kapasitas_penumpang && (
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {item.kapasitas_penumpang} kursi
            </span>
          )}
          {item.garasi_partner && (
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {item.garasi_partner.nama_garasi}
            </span>
          )}
        </div>
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-lg font-bold text-blue-600">{formatRupiah(item.harga_sewa_per_hari)}</span>
              <span className="text-xs text-gray-500">/hari</span>
            </div>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              isUnavailable
                ? 'text-orange-700 bg-orange-50'
                : 'text-green-700 bg-green-50'
            }`}>
              {isUnavailable ? 'Tidak Tersedia' : 'Tersedia'}
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!isUnavailable) onPesan(item);
            }}
            disabled={isUnavailable}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-colors ${
              isUnavailable
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
            {isUnavailable ? 'Tidak Tersedia' : 'Pesan Sekarang'}
          </button>
        </div>
import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import heroImg from '../assets/hero.png';
import {
  Search, SlidersHorizontal, Users, ChevronLeft, ChevronRight,
  Star, Quote, ArrowRight, ChevronDown,
  ShieldCheck, Clock, Wallet, Globe, Award, Car, Map,
  Briefcase, GraduationCap, Heart, Factory, Building2, Hotel,
  Newspaper,
} from 'lucide-react';
import { katalogAPI, type KategoriKendaraan, type TipeKendaraan } from '../services/api';
import AnimatedSection from '../components/public/landing/AnimatedSection';
import MegaMenu from '../components/public/landing/MegaMenu';
import LandingFooter from '../components/public/landing/LandingFooter';

/* ─── Helpers ────────────────────────────────────────────────────────── */

function formatRupiah(n: number | string): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(n));
}

function getFotoUrl(foto: string | null | undefined): string | null {
  if (!foto) return null;
  if (foto.startsWith('http')) return foto;
  return `/storage/${foto}`;
}

/* ─── Types ──────────────────────────────────────────────────────────── */

interface KategoriKendaraanExt extends KategoriKendaraan { slug: string; kendaraans_count: number; }
interface TipeKendaraanExt extends TipeKendaraan { slug: string; kendaraans_count: number; }

/* ─── Static Data ────────────────────────────────────────────────────── */

const highlights = [
  { value: '15+', label: 'Tahun Pengalaman' },
  { value: '150+', label: 'Armada' },
  { value: '25+', label: 'Kota Operasional' },
  { value: '20.000+', label: 'Pelanggan' },
  { value: '98%', label: 'Kepuasan' },
];

const services = [
  { icon: Car, title: 'Rental Mobil', desc: 'Sewa kendaraan harian, mingguan, dan bulanan dengan armada terawat.', href: '/katalog' },
  { icon: Briefcase, title: 'Corporate Transportation', desc: 'Solusi transportasi korporat untuk operasional bisnis Anda.', href: '/layanan/corporate' },
  { icon: Map, title: 'Airport Transfer', desc: 'Layanan antar jemput bandara yang tepat waktu dan nyaman.', href: '/layanan/airport' },
  { icon: Heart, title: 'Wedding Car', desc: 'Kendaraan premium untuk hari pernikahan yang berkesan.', href: '/layanan/wedding' },
  { icon: ShieldCheck, title: 'Chauffeur Service', desc: 'Sopir profesional berpengalaman untuk perjalanan Anda.', href: '/layanan/sopir' },
  { icon: Building2, title: 'Fleet Management', desc: 'Pengelolaan armada kendaraan perusahaan secara menyeluruh.', href: '/layanan/corporate' },
];

const whyUs = [
  { icon: ShieldCheck, title: 'Tim Profesional', desc: 'Didukung tim berpengalaman di bidang transportasi dan logistik.' },
  { icon: Clock, title: 'Layanan 24/7', desc: 'Dukungan pelanggan tersedia kapan pun Anda butuhkan.' },
  { icon: Globe, title: 'Cakupan Luas', desc: 'Beroperasi di 25+ kota di seluruh Indonesia.' },
  { icon: Award, title: 'Dipercaya Korporat', desc: 'Melayani ribuan perusahaan dan instansi pemerintah.' },
  { icon: Car, title: 'Sopir Bersertifikat', desc: 'Seluruh driver telah tersertifikasi dan terlatih.' },
  { icon: Wallet, title: 'Harga Transparan', desc: 'Tidak ada biaya tersembunyi. Harga jujur dan kompetitif.' },
];

const industries = [
  { icon: Briefcase, label: 'Corporate' },
  { icon: Building2, label: 'Government' },
  { icon: GraduationCap, label: 'Education' },
  { icon: Heart, label: 'Tourism' },
  { icon: Hotel, label: 'Hospitality' },
  { icon: Factory, label: 'Manufacturing' },
];

const timeline = [
  { year: '2009', title: 'Pendirian Perusahaan', desc: 'PT PILAR didirikan dengan fokus awal pada layanan rental kendaraan.' },
  { year: '2013', title: 'Ekspansi Regional', desc: 'Membuka cabang pertama di luar kota asal, memperluas cakupan layanan.' },
  { year: '2017', title: '100 Armada', desc: 'Mencapai milestone 100 unit kendaraan dalam armada operasional.' },
  { year: '2020', title: 'Digital Transformation', desc: 'Meluncurkan platform digital untuk pemesanan dan manajemen armada.' },
  { year: '2024', title: 'Ekspansi Nasional', desc: 'Beroperasi di 25+ kota dengan 150+ armada dan ribuan pelanggan.' },
];

const testimonials = [
  { name: 'PT Maju Bersama', role: 'Corporate Client', rating: 5, text: 'Pelayanan konsisten selama 5 tahun. Armada selalu terawat dan tepat waktu.' },
  { name: 'Dinas Pendidikan', role: 'Government', rating: 5, text: 'Solusi transportasi yang handal untuk kegiatan dinas dan kunjungan sekolah.' },
  { name: 'Harmony Travel', role: 'Travel Agent', rating: 5, text: 'Kerjasama yang sangat baik. Klien kami selalu puas dengan layanan PILAR.' },
  { name: 'PT Sejahtera', role: 'Corporate Client', rating: 5, text: 'Fleet management dari PILAR membantu operasional perusahaan kami lebih efisien.' },
];

const faqItems = [
  { q: 'Bagaimana cara melakukan reservasi?', a: 'Anda dapat melakukan reservasi melalui WhatsApp, form kontak di website, atau mengunjungi kantor cabang kami. Tim kami akan mengkonfirmasi ketersediaan dan mengirimkan penawaran harga.' },
  { q: 'Apakah melayani rental untuk perusahaan?', a: 'Ya, kami memiliki layanan khusus corporate rental dengan harga khusus, dedicated account manager, dan fleksibilitas pembayaran yang disesuaikan dengan kebutuhan perusahaan.' },
  { q: 'Area operasional mana saja yang terjangkau?', a: 'Kami beroperasi di 25+ kota di seluruh Indonesia, termasuk Jakarta, Bandung, Surabaya, Bali, Medan, Makassar, dan kota-kota besar lainnya.' },
  { q: 'Bagaimana dengan asuransi kendaraan?', a: 'Semua kendaraan kami dilengkapi dengan asuransi komprehensif. Pelanggan tidak perlu khawatir karenacoverage sudah termasuk dalam paket sewa.' },
  { q: 'Apakah bisa menyewa dengan sopir?', a: 'Tentu. Kami menyediakan layanan rental dengan sopir profesional yang bersertifikat dan berpengalaman. Biaya sopir sudah termasuk dalam paket.' },
];

const newsItems = [
  { date: '15 Jul 2026', title: 'PILAR Ekspansi ke 5 Kota Baru di Sulawesi', excerpt: 'Perusahaan terus memperluas cakupan layanan ke Indonesia bagian timur.' },
  { date: '28 Jun 2026', title: 'Peluncuran Armada Kendaraan Listrik', excerpt: 'Langkah nyata menuju operasional yang lebih ramah lingkungan.' },
  { date: '10 Jun 2026', title: 'PILAR Raih Sertifikasi ISO 9001:2015', excerpt: 'Bukti komitmen kami terhadap standar kualitas internasional.' },
];

const partners = [
  'PT Astra International', 'Telkom Indonesia', 'Bank Mandiri', 'Pertamina',
  'PT Unilever', 'Garuda Indonesia', 'PLN', 'PT Waskita Karya',
];

/* ─── Car Card ───────────────────────────────────────────────────────── */

function CarCard({ item }: { item: any }) {
  const available = item.status === 'tersedia';
  const fotoUrl = getFotoUrl(item.foto);

  return (
    <Link to={`/katalog/${item.id}`} className="group block">
      <div className={`relative bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-black/8 ${!available ? 'opacity-60' : ''}`}>
        {/* Image */}
        <div className="relative aspect-[16/10] bg-gray-100 overflow-hidden">
          {fotoUrl ? (
            <img src={fotoUrl} alt={item.nama_kendaraan} loading="lazy"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-50">
              <Car size={40} className="text-gray-200" />
            </div>
          )}

          {/* Gradient overlay bottom */}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/40 to-transparent" />

          {/* Status badge top-right */}
          <div className="absolute top-3 right-3">
            {available ? (
              <span className="px-2.5 py-1 bg-avail-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-sm">Tersedia</span>
            ) : (
              <span className="px-2.5 py-1 bg-ink-700 text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-sm">{item.status === 'disewa' ? 'Disewa' : 'Diservis'}</span>
            )}
          </div>

          {/* Tipe badge top-left */}
          {item.tipe && (
            <span className="absolute top-3 left-3 px-2.5 py-1 bg-white/90 backdrop-blur-sm text-[10px] font-bold text-ink-700 rounded-full">{item.tipe.nama_tipe}</span>
          )}

          {/* Price overlay bottom-right */}
          <div className="absolute bottom-3 right-3">
            <div className="bg-white/95 backdrop-blur-sm rounded-xl px-3 py-1.5 shadow-sm">
              <span className="font-display font-bold text-[15px] text-ink-950">{formatRupiah(item.harga_sewa_per_hari)}</span>
              <span className="text-[10px] text-ink-400 ml-0.5">/hari</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-[10px] font-bold text-brand-500 uppercase tracking-wider">{item.kategori?.nama_kategori || 'Kendaraan'}</p>
          <h3 className="font-display font-semibold text-[15px] text-ink-950 mt-1 group-hover:text-brand-600 transition-colors line-clamp-1">{item.nama_kendaraan}</h3>
          <p className="text-xs text-ink-400 mt-0.5">{item.merek} {item.model} &middot; {item.tahun}</p>

          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
            <span className="flex items-center gap-1 text-[11px] text-ink-400"><Users size={12} />{item.kapasitas_penumpang} kursi</span>
            {item.warna && <span className="flex items-center gap-1 text-[11px] text-ink-400"><span className="w-2.5 h-2.5 rounded-full border border-gray-200" style={{ backgroundColor: item.warna }} />{item.warna}</span>}
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ─── Testimonial Carousel ───────────────────────────────────────────── */

function TestimonialCarousel() {
  const [current, setCurrent] = useState(0);
  const prev = () => setCurrent((c) => (c === 0 ? testimonials.length - 1 : c - 1));
  const next = () => setCurrent((c) => (c === testimonials.length - 1 ? 0 : c + 1));

  return (
    <div className="relative">
      <div className="overflow-hidden">
        <motion.div className="flex" animate={{ x: `-${current * 100}%` }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
          {testimonials.map((t) => (
            <div key={t.name} className="w-full shrink-0 px-1">
              <div className="bg-white border border-gray-100 rounded-[20px] p-7 sm:p-8">
                <Quote size={20} className="text-gray-200 mb-4" />
                <p className="text-ink-700 text-[15px] leading-relaxed">{t.text}</p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="w-9 h-9 bg-brand-50 rounded-full flex items-center justify-center text-brand-600 font-semibold text-xs">{t.name.charAt(0)}</div>
                  <div className="flex-1">
                    <p className="font-semibold text-ink-950 text-sm">{t.name}</p>
                    <p className="text-ink-400 text-xs">{t.role}</p>
                  </div>
                  <div className="flex gap-0.5">{Array.from({ length: t.rating }).map((_, i) => <Star key={i} size={12} className="fill-amber-400 text-amber-400" />)}</div>
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
      <div className="flex items-center justify-center gap-2 mt-6">
        <button onClick={prev} className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-ink-400 hover:bg-gray-50 transition-colors"><ChevronLeft size={16} /></button>
        <div className="flex gap-1.5">{testimonials.map((_, i) => <button key={i} onClick={() => setCurrent(i)} className={`h-1.5 rounded-full transition-all duration-200 ${i === current ? 'w-5 bg-ink-950' : 'w-1.5 bg-gray-200'}`} />)}</div>
        <button onClick={next} className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-ink-400 hover:bg-gray-50 transition-colors"><ChevronRight size={16} /></button>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
 * PAGE — KATALOG
 * ──────────────────────────────────────────────────────────────── */

export default function Katalog() {
  const [items, setItems] = useState<KatalogItem[]>([]);
  const [kategoris, setKategoris] = useState<KategoriWithCount[]>([]);
  const [tipes, setTipes] = useState<TipeWithCount[]>([]);
/* ─── Main ───────────────────────────────────────────────────────────── */

export default function Katalog() {
  const location = useLocation();
  const [items, setItems] = useState<any[]>([]);
  const [kategoris, setKategoris] = useState<KategoriKendaraanExt[]>([]);
  const [tipes, setTipes] = useState<TipeKendaraanExt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [kategoriSlug, setKategoriSlug] = useState('');
  const [tipeSlug, setTipeSlug] = useState('');
  const [sort, setSort] = useState('terbaru');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<KatalogMeta | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const debouncedSearch = useDebounce(search, 300);

  const [tanggalMulai, setTanggalMulai] = useState('');
  const [durasiHari, setDurasiHari] = useState(1);
  const debouncedTanggal = useDebounce(tanggalMulai, 400);
  const debouncedDurasi = useDebounce(durasiHari, 400);

  const [modalItem, setModalItem] = useState<KatalogItem | null>(null);

  const catalogToday = useMemo(() => todayJakarta(), []);

  useEffect(() => {
    katalogAPI
      .kategoris()
      .then(({ data }) => setKategoris(data as unknown as KategoriWithCount[]))
      .catch(() => {});
  const [meta, setMeta] = useState<{ total: number; last_page: number } | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    if (location.hash === '#semua-armada') {
      const el = document.getElementById('semua-armada');
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [location.hash]);

  useEffect(() => {
    katalogAPI.kategoris().then(({ data }) => setKategoris(data as unknown as KategoriKendaraanExt[])).catch(() => {});
  }, []);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (kategoriSlug) params.kategori_slug = kategoriSlug;
    katalogAPI
      .tipes(params)
      .then(({ data }) => setTipes(data as unknown as TipeWithCount[]))
      .catch(() => {});
    katalogAPI.tipes(params).then(({ data }) => setTipes(data as unknown as TipeKendaraanExt[])).catch(() => {});
  }, [kategoriSlug]);

  const load = useCallback(() => {
    setLoading(true);
    const params: Record<string, string | number> = { page, sort };
    if (debouncedSearch) params.search = debouncedSearch;
    if (tipeSlug) params.tipe_slug = tipeSlug;
    if (kategoriSlug) params.kategori_slug = kategoriSlug;
    if (debouncedTanggal) {
      params.tanggal_mulai = debouncedTanggal;
      params.durasi_hari = debouncedDurasi;
    }
    katalogAPI
      .list(params)
      .then(({ data }) => {
        setItems(data.data);
        setMeta(data.meta ?? null);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [debouncedSearch, tipeSlug, page, sort, kategoriSlug, debouncedTanggal, debouncedDurasi]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
    setTipeSlug('');
  }, [kategoriSlug]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, tipeSlug, sort, debouncedTanggal, debouncedDurasi]);

  const totalPages = meta?.last_page ?? 1;
  const showPagination = meta && meta.last_page > 1;
    katalogAPI.list(params).then(({ data }) => { setItems(data.data); setMeta(data.meta ?? null); }).catch(() => setItems([])).finally(() => setLoading(false));
  }, [search, tipeSlug, page, sort, kategoriSlug]);

  const unavailableKategoriIds = useMemo(() => {
    if (!debouncedTanggal) return new Set<number>();
    const ids = new Set<number>();
    items.forEach((item) => {
      if (item.available_for_dates === false && item.kategori_id) {
        ids.add(item.kategori_id);
      }
    });
    return ids;
  }, [items, debouncedTanggal]);

  const unavailableTipeIds = useMemo(() => {
    if (!debouncedTanggal) return new Set<number>();
    const ids = new Set<number>();
    items.forEach((item) => {
      if (item.available_for_dates === false && item.tipe_id) {
        ids.add(item.tipe_id);
      }
    });
    return ids;
  }, [items, debouncedTanggal]);

  const serupaItems = useMemo(() => {
    if (!debouncedTanggal) return [];
    if (unavailableKategoriIds.size === 0 && unavailableTipeIds.size === 0) return [];
    return items.filter(
      (item) =>
        item.available_for_dates !== false &&
        (unavailableKategoriIds.has(item.kategori_id!) || unavailableTipeIds.has(item.tipe_id!))
    ).slice(0, 8);
  }, [items, debouncedTanggal, unavailableKategoriIds, unavailableTipeIds]);

  const unavailableCount = useMemo(() => {
    if (!debouncedTanggal) return 0;
    return items.filter((item) => item.available_for_dates === false).length;
  }, [items, debouncedTanggal]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40" role="navigation" aria-label="Navigasi utama">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link to="/katalog" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17h.01M16 17h.01M3 11l1.5-5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.4L21 11M3 11h18M3 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-6" />
              </svg>
            </div>
            <span className="text-lg font-bold text-gray-900 hidden sm:block">PILAR Rental</span>
          </Link>
          <div className="flex items-center gap-3">
            <a
              href="https://wa.me/62895361054272?text=Halo%2C%20saya%20ingin%20bertanya%20tentang%20layanan%20rental"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Hubungi Kami
            </a>
          </div>
        </div>
      </nav>
    <div className="min-h-screen bg-white">
      <MegaMenu />

      {/* ═══════ HERO ═══════ */}
      <section className="relative min-h-[90vh] flex items-center bg-ink-950 overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImg} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/80 to-transparent" />
        </div>
        <div className="relative max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-20 py-24 sm:py-32 w-full">
          <div className="max-w-2xl">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight">
              Sewa Kendaraan
              <br />
              <span className="text-blue-200">Mudah &amp; Terpercaya</span>
            </h1>
            <p className="mt-4 text-blue-100 text-lg leading-relaxed">
              Pilihan kendaraan lengkap, harga transparan, proses cepat. Tersedia mobil dan motor untuk kebutuhan harian, wisata, hingga bisnis.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="#katalog"
                className="px-6 py-3 bg-white text-blue-700 font-semibold rounded-xl hover:bg-blue-50 transition-colors shadow-lg"
              >
                Lihat Katalog
              </a>
              <a
                href="https://wa.me/62895361054272?text=Halo%2C%20saya%20ingin%20konsultasi%20tentang%20rental%20kendaraan"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 border-2 border-white/40 text-white font-semibold rounded-xl hover:bg-white/10 transition-colors"
              >
                Konsultasi Gratis
              </a>
            </div>
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
              className="inline-block text-[11px] font-semibold tracking-widest uppercase text-brand-400 mb-6">
              Solusi Transportasi & Mobilitas
            </motion.span>
            <motion.h1 initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
              className="font-display text-[2.5rem] sm:text-5xl lg:text-[3.5rem] font-bold text-white leading-[1.1] tracking-tight">
              Mitra Transportasi<br /><span className="text-white/40">Terpercaya Bisnis Anda.</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-5 text-base sm:text-lg text-ink-400 leading-relaxed max-w-lg">
              PT PILAR menyediakan solusi transportasi dan mobilitas komprehensif untuk kebutuhan korporat, pemerintah, dan individu di seluruh Indonesia.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/tentang" className="inline-flex items-center gap-2 px-6 py-3 bg-white text-ink-950 text-sm font-semibold rounded-lg hover:bg-gray-100 transition-colors duration-200">
                Pelajari Perusahaan <ArrowRight size={15} />
              </Link>
              <Link to="/katalog" className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white/50 hover:text-white transition-colors duration-200">
                Lihat Layanan
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white border-b border-gray-200" aria-label="Statistik layanan">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { icon: 'M8 17h.01M16 17h.01', label: 'Unit Tersedia', value: `${meta?.total ?? 0}+` },
              { icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', label: 'Terjamin Aman', value: '100%' },
              { icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', label: 'Proses Cepat', value: '< 5 Menit' },
              { icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z', label: 'Pelanggan Puas', value: '500+' },
            ].map((s, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={s.icon} />
                  </svg>
                </div>
                <div className="text-xl font-bold text-gray-900">{s.value}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
      {/* ═══════ COMPANY OVERVIEW ═══════ */}
      <section className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-20 py-20 sm:py-28">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <AnimatedSection>
            <span className="text-[11px] font-semibold tracking-widest uppercase text-brand-500 mb-4 block">Tentang Kami</span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink-950 tracking-tight leading-tight">
              Perusahaan transportasi nasional yang berkomitmen menyediakan solusi mobilitas terbaik.
            </h2>
            <p className="mt-5 text-ink-400 text-[15px] leading-relaxed">
              Didirikan pada tahun 2009, PT PILAR telah berkembang menjadi salah satu penyedia layanan transportasi terpercaya di Indonesia. Dengan armada lebih dari 150 kendaraan dan cakupan operasional di 25+ kota, kami melayani kebutuhan korporat, pemerintah, hingga individu.
            </p>
            <div className="mt-8 flex items-center gap-6">
              <Link to="/tentang" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-600 hover:text-brand-700 transition-colors">
                Profil Perusahaan <ArrowRight size={14} />
              </Link>
              <Link to="/kontak" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-600 hover:text-ink-950 transition-colors">
                Hubungi Kami <ArrowRight size={14} />
              </Link>
            </div>
          </AnimatedSection>
          <AnimatedSection delay={0.1}>
            <div className="bg-gray-50 rounded-[24px] p-8 sm:p-10">
              <div className="grid grid-cols-2 gap-6">
                {highlights.map((h, i) => (
                  <div key={i} className={i === highlights.length - 1 ? 'col-span-2 text-center' : ''}>
                    <div className={`font-display font-bold ${i === highlights.length - 1 ? 'text-4xl' : 'text-2xl'} text-ink-950`}>{h.value}</div>
                    <div className="text-[12px] text-ink-400 mt-1">{h.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ═══════ SERVICES ═══════ */}
      <section className="bg-gray-50 py-20 sm:py-28">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-20">
          <AnimatedSection className="max-w-xl mb-14">
            <span className="text-[11px] font-semibold tracking-widest uppercase text-brand-500 mb-4 block">Layanan Kami</span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink-950 tracking-tight">Solusi Transportasi Komprehensif</h2>
            <p className="mt-3 text-ink-400 text-[15px] leading-relaxed">Beragam layanan yang dirancang untuk memenuhi kebutuhan mobilitas Anda.</p>
          </AnimatedSection>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {services.map((s, i) => (
              <AnimatedSection key={s.title} delay={i * 0.06}>
                <Link to={s.href} className="group block bg-white rounded-[20px] border border-gray-100 p-7 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5">
                  <s.icon size={20} className="text-ink-950 mb-4" strokeWidth={1.5} />
                  <h3 className="font-display font-semibold text-[15px] text-ink-950 group-hover:text-brand-600 transition-colors">{s.title}</h3>
                  <p className="mt-2 text-ink-400 text-sm leading-relaxed">{s.desc}</p>
                  <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand-600 mt-4 group-hover:gap-2 transition-all">
                    Selengkapnya <ArrowRight size={12} />
                  </span>
                </Link>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={searchRef}
              type="text"
              placeholder="Cari merek, model, nama, kategori..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
              aria-label="Cari kendaraan"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            aria-label="Urutkan"
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Date Availability Filter */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 shrink-0">
              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-medium text-gray-700">Cek Ketersediaan:</span>
            </div>
            <input
              type="date"
              value={tanggalMulai}
              min={catalogToday}
              onChange={(e) => setTanggalMulai(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              aria-label="Tanggal mulai"
            />
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                value={durasiHari}
                min={1}
                max={365}
                onChange={(e) => setDurasiHari(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                aria-label="Durasi hari"
              />
              <span className="text-sm text-gray-500">hari</span>
            </div>
            {tanggalMulai && (
              <button
                onClick={() => { setTanggalMulai(''); setDurasiHari(1); }}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Reset
              </button>
            )}
          </div>
          {tanggalMulai && (
            <p className="text-xs text-gray-400 mt-2">
              Menampilkan ketersediaan untuk tanggal {new Date(tanggalMulai + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} selama {durasiHari} hari
            </p>
          )}
        </div>

        {/* Kategori Tabs */}
        {kategoris.length > 0 && (
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2" role="tablist" aria-label="Filter kategori">
            <button
              onClick={() => setKategoriSlug('')}
              className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${
                kategoriSlug === '' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-600'
              }`}
              role="tab"
              aria-selected={kategoriSlug === ''}
            >
              Semua Kategori
            </button>
            {kategoris.map((k) => (
              <button
                key={k.id}
                onClick={() => setKategoriSlug(k.slug)}
                className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${
                  kategoriSlug === k.slug ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-600'
                }`}
                role="tab"
                aria-selected={kategoriSlug === k.slug}
              >
                {k.nama_kategori}
                {k.kendaraans_count > 0 && (
                  <span className={`ml-1.5 text-xs ${kategoriSlug === k.slug ? 'text-blue-200' : 'text-gray-400'}`}>
                    ({k.kendaraans_count})
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Tipe Tabs */}
        {tipes.length > 0 && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2" role="tablist" aria-label="Filter tipe">
            <button
              onClick={() => setTipeSlug('')}
              className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                tipeSlug === '' ? 'bg-purple-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:border-purple-300 hover:text-purple-600'
              }`}
              role="tab"
              aria-selected={tipeSlug === ''}
            >
              Semua Tipe
            </button>
            {tipes.map((t) => (
              <button
                key={t.id}
                onClick={() => setTipeSlug(t.slug)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                  tipeSlug === t.slug ? 'bg-purple-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:border-purple-300 hover:text-purple-600'
                }`}
                role="tab"
                aria-selected={tipeSlug === t.slug}
              >
                {t.nama_tipe}
                {t.kendaraans_count > 0 && (
                  <span className={`ml-1 ${tipeSlug === t.slug ? 'text-purple-200' : 'text-gray-400'}`}>
                    ({t.kendaraans_count})
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <VehicleCardSkeleton key={i} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 17h.01M16 17h.01M3 11l1.5-5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.4L21 11M3 11h18M3 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-6" />
            </svg>
            <p className="text-gray-500 font-medium">Tidak ada kendaraan ditemukan</p>
            <p className="text-sm text-gray-400 mt-1">Coba ubah filter pencarian Anda</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {items.map((item) => (
                <VehicleCard
                  key={item.id}
                  item={item}
                  onPesan={setModalItem}
                  availableForDates={item.available_for_dates}
                />
      {/* ═══════ FULL CATALOG ═══════ */}
      <section id="semua-armada" className="bg-gray-50 py-20 sm:py-28 scroll-mt-20">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-20">
          <AnimatedSection className="mb-10">
            <span className="text-[11px] font-semibold tracking-widest uppercase text-brand-500 mb-4 block">Katalog Lengkap</span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink-950 tracking-tight">Semua Armada Kami</h2>
            <p className="mt-2 text-ink-400 text-sm">Temukan kendaraan yang sesuai dengan kebutuhan Anda.</p>
          </AnimatedSection>

          {/* Filters */}
          <AnimatedSection delay={0.05} className="mb-8">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Search bar */}
              <div className="p-4 border-b border-gray-100">
                <div className="relative">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input
                    type="text"
                    placeholder="Cari nama kendaraan, merek, atau model..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-ink-300"
                  />
                </div>
              </div>

              {/* Filter row */}
              <div className="p-4 space-y-3">
                {/* Category + Sort row */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex flex-wrap gap-1.5 flex-1">
                    <button
                      onClick={() => setKategoriSlug('')}
                      className={`px-4 py-2 text-[12px] font-semibold rounded-xl transition-all duration-200 ${
                        !kategoriSlug
                          ? 'bg-ink-950 text-white shadow-sm'
                          : 'bg-gray-100 text-ink-500 hover:bg-gray-200 hover:text-ink-700'
                      }`}
                    >
                      Semua
                    </button>
                    {kategoris.map((k) => (
                      <button
                        key={k.id}
                        onClick={() => setKategoriSlug(k.slug)}
                        className={`px-4 py-2 text-[12px] font-semibold rounded-xl transition-all duration-200 ${
                          kategoriSlug === k.slug
                            ? 'bg-ink-950 text-white shadow-sm'
                            : 'bg-gray-100 text-ink-500 hover:bg-gray-200 hover:text-ink-700'
                        }`}
                      >
                        {k.nama_kategori}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-200">
                    <SlidersHorizontal size={13} className="text-ink-400" />
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                      className="text-[12px] font-medium text-ink-600 bg-transparent border-none focus:outline-none cursor-pointer pr-1"
                    >
                      <option value="terbaru">Terbaru</option>
                      <option value="harga_terendah">Harga Terendah</option>
                      <option value="harga_tertinggi">Harga Tertinggi</option>
                      <option value="nama">Nama A-Z</option>
                    </select>
                  </div>
                </div>

                {/* Tipe pills */}
                {tipes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setTipeSlug('')}
                      className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all duration-200 border ${
                        !tipeSlug ? 'border-brand-200 bg-brand-50 text-brand-600' : 'border-gray-200 bg-white text-ink-400 hover:border-gray-300 hover:text-ink-600'
                      }`}
                    >
                      Semua Tipe
                    </button>
                    {tipes.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setTipeSlug(t.slug)}
                        className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all duration-200 border ${
                          tipeSlug === t.slug ? 'border-brand-200 bg-brand-50 text-brand-600' : 'border-gray-200 bg-white text-ink-400 hover:border-gray-300 hover:text-ink-600'
                        }`}
                      >
                        {t.nama_tipe}
                      </button>
                    ))}
                  </div>
                )}

                {/* Result count */}
                <div className="flex items-center gap-2 pt-1">
                  <div className="h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500 rounded-full transition-all duration-300" style={{ width: `${Math.min(((meta?.total ?? 0) / 50) * 100, 100)}%` }} />
                  </div>
                  <p className="text-[12px] text-ink-400 shrink-0">
                    <span className="font-semibold text-ink-700">{meta?.total ?? items.length}</span> kendaraan
                  </p>
                </div>
              </div>
            </div>
          </AnimatedSection>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-[20px] border border-gray-100 overflow-hidden">
                  <div className="aspect-[4/3] skeleton" />
                  <div className="p-5 space-y-2.5">
                    <div className="h-3 w-16 skeleton rounded" />
                    <div className="h-4 w-3/4 skeleton rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16">
              <Car size={40} className="text-gray-200 mx-auto mb-4" />
              <p className="font-semibold text-ink-950">Tidak ada kendaraan ditemukan</p>
              <p className="text-ink-400 text-sm mt-1">Coba ubah filter atau kata kunci pencarian Anda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {items.map((item) => <CarCard key={item.id} item={item} />)}
            </div>
          )}

            {/* Pagination */}
            {showPagination && (
              <nav className="flex items-center justify-center gap-2 mt-8" aria-label="Paginasi">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
                >
                  Sebelumnya
                </button>
                <span className="text-sm text-gray-600 px-3">
                  Halaman {page} dari {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
                >
                  Selanjutnya
                </button>
              </nav>
            )}
          </>
        )}
      </section>

      {/* Kendaraan Serupa */}
      {debouncedTanggal && unavailableCount > 0 && serupaItems.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Kendaraan Serupa yang Tersedia</h3>
                <p className="text-sm text-gray-500">
                  {serupaItems.length} kendaraan tersedia untuk tanggal yang dipilih
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mt-5">
              {serupaItems.map((item) => (
                <VehicleCard
                  key={item.id}
                  item={item}
                  onPesan={setModalItem}
                  availableForDates={true}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <h2 className="text-2xl font-bold text-white">Butuh Kendaraan Sekarang?</h2>
          <p className="mt-2 text-blue-100">Hubungi kami via WhatsApp untuk konsultasi dan pemesanan cepat</p>
          <a
            href="https://wa.me/62895361054272?text=Halo%2C%20saya%20butuh%20kendaraan%20untuk%20disewa"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 px-8 py-3 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition-colors shadow-lg"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Chat WhatsApp Sekarang
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17h.01M16 17h.01M3 11l1.5-5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.4L21 11M3 11h18M3 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-6" />
                  </svg>
          {/* Pagination */}
          {meta && meta.last_page > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-ink-400 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: meta.last_page }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-9 h-9 rounded-lg text-[13px] font-medium transition-colors ${
                    p === page ? 'bg-ink-950 text-white' : 'border border-gray-200 text-ink-500 hover:bg-gray-50'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
                disabled={page >= meta.last_page}
                className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-ink-400 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ═══════ WHY CHOOSE US ═══════ */}
      <section className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-20 py-20 sm:py-28">
        <AnimatedSection className="max-w-xl mb-14">
          <span className="text-[11px] font-semibold tracking-widest uppercase text-brand-500 mb-4 block">Mengapa Kami</span>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink-950 tracking-tight">Komitmen Kami Terhadap Anda</h2>
          <p className="mt-3 text-ink-400 text-[15px] leading-relaxed">Standar pelayanan tinggi yang kami jaga untuk setiap pelanggan.</p>
        </AnimatedSection>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {whyUs.map((w, i) => (
            <AnimatedSection key={w.title} delay={i * 0.06}>
              <div className="flex gap-4 p-6 rounded-[20px] border border-gray-100 bg-white hover:shadow-lg hover:shadow-black/5 transition-all duration-200">
                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center shrink-0">
                  <w.icon size={18} className="text-ink-950" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-semibold text-ink-950 text-[15px]">{w.title}</h3>
                  <p className="mt-1 text-ink-400 text-sm leading-relaxed">{w.desc}</p>
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </section>

      {/* ═══════ INDUSTRIES ═══════ */}
      <section className="bg-gray-50 py-20 sm:py-28">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-20">
          <AnimatedSection className="text-center max-w-xl mx-auto mb-14">
            <span className="text-[11px] font-semibold tracking-widest uppercase text-brand-500 mb-4 block">Industri</span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink-950 tracking-tight">Sektor yang Kami Layani</h2>
            <p className="mt-3 text-ink-400 text-[15px]">Percaya oleh berbagai sektor industri di Indonesia.</p>
          </AnimatedSection>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {industries.map((ind, i) => (
              <AnimatedSection key={ind.label} delay={i * 0.05}>
                <div className="bg-white rounded-[20px] border border-gray-100 p-6 text-center hover:shadow-lg hover:shadow-black/5 transition-all duration-200">
                  <ind.icon size={24} className="text-ink-950 mx-auto mb-3" strokeWidth={1.5} />
                  <span className="text-sm font-semibold text-ink-950">{ind.label}</span>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ PARTNERS ═══════ */}
      <section className="py-16 sm:py-20 border-y border-gray-100">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-20">
          <AnimatedSection>
            <p className="text-center text-[11px] font-semibold tracking-widest uppercase text-ink-400 mb-8">Dipercaya Oleh</p>
            <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-5">
              {partners.map((p) => <span key={p} className="text-ink-300 font-display font-semibold text-base hover:text-ink-500 transition-colors cursor-default">{p}</span>)}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ═══════ TIMELINE ═══════ */}
      <section className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-20 py-20 sm:py-28">
        <AnimatedSection className="max-w-xl mb-14">
          <span className="text-[11px] font-semibold tracking-widest uppercase text-brand-500 mb-4 block">Perjalanan Kami</span>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink-950 tracking-tight">Sejarah Perusahaan</h2>
        </AnimatedSection>
        <div className="relative">
          <div className="absolute left-[19px] top-0 bottom-0 w-px bg-gray-200" />
          <div className="space-y-10">
            {timeline.map((t, i) => (
              <AnimatedSection key={t.year} delay={i * 0.08}>
                <div className="flex gap-6">
                  <div className="w-10 h-10 bg-brand-50 border-2 border-brand-500 rounded-full flex items-center justify-center shrink-0 relative z-10">
                    <span className="text-[10px] font-bold text-brand-600">{t.year.slice(2)}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-brand-500">{t.year}</span>
                    <h3 className="font-semibold text-ink-950 text-[15px] mt-0.5">{t.title}</h3>
                    <p className="text-ink-400 text-sm mt-1 leading-relaxed">{t.desc}</p>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ NEWS ═══════ */}
      <section className="bg-gray-50 py-20 sm:py-28">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-20">
          <AnimatedSection className="flex items-end justify-between mb-10">
            <div>
              <span className="text-[11px] font-semibold tracking-widest uppercase text-brand-500 mb-4 block">Berita</span>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink-950 tracking-tight">Informasi Terkini</h2>
            </div>
            <Link to="/berita" className="hidden sm:inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-600 hover:text-brand-700 transition-colors">
              Lihat Semua <ArrowRight size={14} />
            </Link>
          </AnimatedSection>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {newsItems.map((n, i) => (
              <AnimatedSection key={n.title} delay={i * 0.08}>
                <Link to="/berita" className="group block bg-white rounded-[20px] border border-gray-100 overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5">
                  <div className="aspect-[16/9] bg-gray-100 flex items-center justify-center">
                    <Newspaper size={32} className="text-gray-200" />
                  </div>
                  <div className="p-6">
                    <span className="text-[11px] text-ink-400">{n.date}</span>
                    <h3 className="font-display font-semibold text-[15px] text-ink-950 mt-1 group-hover:text-brand-600 transition-colors">{n.title}</h3>
                    <p className="text-sm text-ink-400 mt-2 leading-relaxed">{n.excerpt}</p>
                  </div>
                </Link>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ TESTIMONIALS ═══════ */}
      <section id="testimoni" className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-20 py-20 sm:py-28">
        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-12 lg:gap-20 items-start">
          <AnimatedSection>
            <span className="text-[11px] font-semibold tracking-widest uppercase text-brand-500 mb-4 block">Testimoni</span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink-950 tracking-tight">Apa Kata Klien Kami</h2>
            <p className="mt-3 text-ink-400 text-[15px] leading-relaxed">Dipercaya oleh perusahaan, instansi pemerintah, dan agen perjalanan di seluruh Indonesia.</p>
          </AnimatedSection>
          <AnimatedSection delay={0.1}><TestimonialCarousel /></AnimatedSection>
        </div>
      </section>

      {/* ═══════ FAQ ═══════ */}
      <section className="bg-gray-50 py-20 sm:py-28">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-20">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20">
            <AnimatedSection>
              <span className="text-[11px] font-semibold tracking-widest uppercase text-brand-500 mb-4 block">FAQ</span>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink-950 tracking-tight">Pertanyaan Umum</h2>
              <p className="mt-3 text-ink-400 text-[15px] leading-relaxed">Jawaban atas pertanyaan yang sering diajukan oleh klien kami.</p>
            </AnimatedSection>
            <AnimatedSection delay={0.1}>
              <div className="space-y-3">
                {faqItems.map((item, i) => (
                  <div key={i} className="bg-white border border-gray-100 rounded-[16px] overflow-hidden hover:border-brand-200 transition-colors">
                    <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left">
                      <span className="font-semibold text-ink-950 text-[15px]">{item.q}</span>
                      <ChevronDown size={18} className={`text-ink-400 shrink-0 transition-transform duration-300 ${openFaq === i ? 'rotate-180' : ''}`} />
                    </button>
                    <div className={`overflow-hidden transition-all duration-300 ${openFaq === i ? 'max-h-40' : 'max-h-0'}`}>
                      <p className="px-6 pb-5 text-ink-400 text-sm leading-relaxed">{item.a}</p>
                    </div>
                  </div>
                ))}
              </div>
            </AnimatedSection>
          </div>
        </div>
      </footer>

      {/* Modal */}
      {modalItem && <PesanSekarangModal item={modalItem} onClose={() => setModalItem(null)} />}
      </section>

      {/* ═══════ CTA ═══════ */}
      <section className="bg-ink-950 py-20 sm:py-28">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-20 text-center">
          <AnimatedSection>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">Siap Bermitra Dengan Kami?</h2>
            <p className="mt-3 text-ink-400 text-[15px] max-w-md mx-auto">Hubungi tim kami untuk konsultasi kebutuhan transportasi perusahaan Anda.</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a href="https://wa.me/62895361054272?text=Halo%2C%20saya%20ingin%20konsultasi%20kebutuhan%20transportasi%20perusahaan" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-ink-950 text-sm font-semibold rounded-lg hover:bg-gray-100 transition-colors duration-200">
                Hubungi Kami <ArrowRight size={15} />
              </a>
              <Link to="/katalog" className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-ink-400 hover:text-white transition-colors duration-200">
                Reservasi Sekarang
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
