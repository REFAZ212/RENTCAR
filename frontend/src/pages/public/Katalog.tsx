import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Star } from 'lucide-react';
import { katalogAPI, type KategoriKendaraan, type TipeKendaraan, type KatalogItem, type OrderRequestPayload } from '../../services/api';
import { todayJakarta, formatRupiah, ADMIN_WA } from '../../lib/format';
import AnimatedSection from '../../components/public/landing/AnimatedSection';
import logo from '../../assets/logorentcar.png';
import logoFooter from '../../assets/logofooter.png';

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

function getStatusInfo(item: KatalogItem, availableForDates?: boolean) {
  if (item.status === 'maintenance') {
    return {
      label: 'Sedang Servis',
      color: 'bg-accent-500',
      textColor: 'text-accent-600',
      bgColor: 'bg-accent-50',
      borderColor: 'border-accent-200',
      // "disabled" here only means "can't be ordered directly" ÔÇö the detail page is still viewable.
      disabled: true,
      reason: 'maintenance' as const,
    };
  }
  if (item.status === 'disewa') {
    return {
      label: 'Sedang Disewa',
      color: 'bg-error-500',
      textColor: 'text-error-600',
      bgColor: 'bg-error-50',
      borderColor: 'border-error-200',
      disabled: true,
      reason: 'disewa' as const,
      estimatedReturn: item.estimated_return_date,
    };
  }
  if (availableForDates === false) {
    return {
      label: 'Tidak Tersedia',
      color: 'bg-accent-500',
      textColor: 'text-accent-600',
      bgColor: 'bg-accent-50',
      borderColor: 'border-accent-200',
      disabled: true,
      reason: 'booked' as const,
    };
  }
  return {
    label: 'Tersedia',
    color: 'bg-success-500',
    textColor: 'text-success-600',
    bgColor: 'bg-success-50',
    borderColor: 'border-success-200',
    disabled: false,
    reason: null as null,
  };
}

/* --- MODAL --- PESAN SEKARANG --- */
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
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [waLink, setWaLink] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const today = todayJakarta();

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    firstInputRef.current?.focus();
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const durasiHari = useMemo(() => {
    if (!form.tanggal_mulai || !form.tanggal_selesai) return 0;
    const mulai = new Date(form.tanggal_mulai + 'T00:00:00');
    const selesai = new Date(form.tanggal_selesai + 'T00:00:00');
    const diff = selesai.getTime() - mulai.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24))) + 1;
  }, [form.tanggal_mulai, form.tanggal_selesai]);

  const totalPreview = useMemo(() => {
    if (durasiHari < 1) return 0;
    return item.harga_sewa_per_hari * durasiHari;
  }, [durasiHari, item.harga_sewa_per_hari]);

  const handleChange = (key: keyof OrderForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
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
    window.open(`https://wa.me/${ADMIN_WA}?text=${encodeURIComponent(pesan)}`, '_blank');
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
        <div className="sticky top-0 bg-white border-b border-accent-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div>
            <h2 className="text-lg font-bold text-black">Pesan Sekarang</h2>
            <p className="text-sm text-black-400">{item.nama_kendaraan}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent-100 transition-colors"
            aria-label="Tutup"
          >
            <svg className="w-5 h-5 text-black-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5">
          {success ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-accent-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-accent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-black mb-2">Pesanan Terkirim!</h3>
              <p className="text-black-400 text-sm mb-6">
                Admin akan segera mengkonfirmasi pesanan Anda via WhatsApp.
              </p>
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-success-500 text-white font-semibold rounded-xl hover:bg-success-600 transition-colors shadow-lg"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Buka WhatsApp
              </a>
              <button
                onClick={onClose}
                className="block mx-auto mt-3 text-sm text-black-400 hover:text-black-600 transition-colors"
              >
                Tutup
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 p-3 bg-canvas rounded-xl mb-5">
                <div className="w-14 h-14 rounded-lg bg-black-200 overflow-hidden shrink-0">
                  {item.foto ? (
                    <img
                      src={getFotoUrl(item.foto) ?? ''}
                      alt={item.nama_kendaraan}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-black-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 17h.01M16 17h.01M3 11l1.5-5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.4L21 11M3 11h18M3 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-6" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-black text-sm line-clamp-1">{item.nama_kendaraan}</p>
                  <p className="text-xs text-black-400">{item.merek} {item.model} &middot; {item.tahun}</p>
                  <p className="text-sm font-bold text-primary-600 mt-0.5">{formatRupiah(item.harga_sewa_per_hari)}/hari</p>
                </div>
              </div>
              {error && (
                <div className="mb-4 p-3 bg-error-50 border border-error-50 rounded-xl text-sm text-error-600">
                  {error}
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-black-700 mb-1">
                    Nama Lengkap <span className="text-error-500">*</span>
                  </label>
                  <input
                    ref={firstInputRef}
                    type="text"
                    value={form.nama_lengkap}
                    onChange={(e) => handleChange('nama_lengkap', e.target.value)}
                    placeholder="Masukkan nama lengkap"
                    className="w-full px-4 py-2.5 border border-black-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-shadow"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black-700 mb-1">
                    Nomor WhatsApp <span className="text-error-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-black-400">+62</span>
                    <input
                      type="tel"
                      value={form.no_hp}
                      onChange={(e) => handleChange('no_hp', e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="8xxx"
                      className="w-full pl-12 pr-4 py-2.5 border border-black-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-shadow"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-black-700 mb-1">
                      Tanggal Mulai <span className="text-error-500">*</span>
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
                      className="w-full px-4 py-2.5 border border-black-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-shadow"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black-700 mb-1">
                      Tanggal Selesai <span className="text-error-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={form.tanggal_selesai}
                      min={form.tanggal_mulai || today}
                      onChange={(e) => handleChange('tanggal_selesai', e.target.value)}
                      className="w-full px-4 py-2.5 border border-black-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-shadow"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-black-700 mb-1">
                      Jam Mulai <span className="text-black-400 font-normal">(opsional)</span>
                    </label>
                    <input
                      type="time"
                      value={form.jam_mulai}
                      onChange={(e) => handleChange('jam_mulai', e.target.value)}
                      className="w-full px-4 py-2.5 border border-black-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-shadow"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black-700 mb-1">
                      Jam Selesai <span className="text-black-400 font-normal">(opsional)</span>
                    </label>
                    <input
                      type="time"
                      value={form.jam_selesai}
                      onChange={(e) => handleChange('jam_selesai', e.target.value)}
                      disabled={!form.jam_mulai}
                      className="w-full px-4 py-2.5 border border-black-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-shadow disabled:bg-canvas disabled:text-black-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-black-700 mb-2">Opsi Supir</label>
                  <div className="flex gap-4">
                    <label className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all flex-1 ${
                      form.opsi_supir === 'lepas_kunci'
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-black-200 hover:border-black-200'
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
                        form.opsi_supir === 'lepas_kunci' ? 'border-primary-500' : 'border-black-200'
                      }`}>
                        {form.opsi_supir === 'lepas_kunci' && <div className="w-2 h-2 rounded-full bg-primary-500" />}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-black">Lepas Kunci</div>
                        <div className="text-xs text-black-400">Tanpa supir</div>
                      </div>
                    </label>
                    <label className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all flex-1 ${
                      form.opsi_supir === 'dengan_supir'
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-black-200 hover:border-black-200'
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
                        form.opsi_supir === 'dengan_supir' ? 'border-primary-500' : 'border-black-200'
                      }`}>
                        {form.opsi_supir === 'dengan_supir' && <div className="w-2 h-2 rounded-full bg-primary-500" />}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-black">Dengan Supir</div>
                        <div className="text-xs text-black-400">Biaya diinfo admin</div>
                      </div>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-black-700 mb-1">Catatan (opsional)</label>
                  <textarea
                    value={form.catatan}
                    onChange={(e) => handleChange('catatan', e.target.value)}
                    placeholder="Contoh: butuh antar ke hotel, dll"
                    rows={2}
                    className="w-full px-4 py-2.5 border border-black-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-shadow resize-none"
                  />
                </div>
                <div className="bg-primary-50 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-black-500">Harga/hari</span>
                    <span className="text-sm font-medium text-black">{formatRupiah(item.harga_sewa_per_hari)}</span>
                  </div>
                  {durasiHari > 0 && (
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-black-500">Durasi</span>
                      <span className="text-sm font-medium text-black">{durasiHari} hari</span>
                    </div>
                  )}
                  {form.opsi_supir === 'dengan_supir' && (
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-black-500">Supir</span>
                      <span className="text-xs text-accent-600 font-medium">Biaya diinfo admin</span>
                    </div>
                  )}
                  <div className="border-t border-primary-200 pt-2 flex justify-between items-center">
                    <span className="text-sm font-semibold text-black">Perkiraan Total</span>
                    <span className="text-lg font-bold text-primary-600">
                      {durasiHari > 0 ? formatRupiah(totalPreview) : '-'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-6 space-y-3">
                <button
                  onClick={handleSubmitPesanSekarang}
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-lg"
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
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-success-500 text-white font-semibold rounded-xl hover:bg-success-600 disabled:opacity-50 transition-colors shadow-lg"
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

/* --- SKELETON --- */
function VehicleCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-black-200 overflow-hidden">
      <div className="h-44 w-full bg-black-200 animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="h-5 w-3/4 bg-black-200 rounded animate-pulse" />
        <div className="h-4 w-1/2 bg-black-200 rounded animate-pulse" />
        <div className="h-4 w-2/3 bg-black-200 rounded animate-pulse" />
        <div className="h-8 w-full bg-black-200 rounded-lg animate-pulse" />
      </div>
    </div>
  );
}

/* --- VEHICLE CARD --- */
function VehicleCard({
  item,
  onPesan,
  availableForDates,
}: {
  item: KatalogItem;
  onPesan: (item: KatalogItem) => void;
  availableForDates?: boolean;
}) {
  const navigate = useNavigate();
  const fotoUrl = getFotoUrl(item.foto);
  const status = getStatusInfo(item, availableForDates);
  // "isDisabled" only blocks ordering ÔÇö the card itself always navigates to the detail page,
  // so customers can still see specs, estimated availability, and similar-vehicle suggestions.
  const isDisabled = status.disabled;

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    navigate(`/katalog/${item.id}`);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div
      onClick={handleCardClick}
      className={`group bg-white rounded-xl border overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary-200 ${
        isDisabled ? 'border-black-200 opacity-80' : 'border-black-200'
      }`}
    >
      <div className="relative h-44 bg-accent-100 overflow-hidden">
        {fotoUrl ? (
          <img
            src={fotoUrl}
            alt={`${item.merek ?? ''} ${item.model ?? ''}`}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-12 h-12 text-black-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 17h.01M16 17h.01M3 11l1.5-5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.4L21 11M3 11h18M3 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-6" />
            </svg>
          </div>
        )}
        {item.tipe && (
          <span className="absolute top-3 left-3 px-2.5 py-1 bg-white/90 backdrop-blur-sm text-xs font-semibold text-black-700 rounded-lg uppercase">
            {item.tipe.nama_tipe}
          </span>
        )}
        {isDisabled && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <span className={`px-3 py-1.5 ${status.color} text-white text-xs font-bold rounded-full shadow-lg`}>
              {status.label}
            </span>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className={`font-bold text-black transition-colors line-clamp-1 group-hover:text-primary-600`}>
          {item.nama_kendaraan}
        </h3>
        <p className="text-sm text-black-400 mt-0.5">
          {item.merek} {item.model} &middot; {item.tahun}
        </p>
        <div className="flex items-center gap-1 mt-2">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="w-3.5 h-3.5 text-accent-500 fill-accent-500" />
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-accent-100 flex items-center justify-between">
          <span className="text-lg font-bold text-primary-600">
            {formatRupiah(item.harga_sewa_per_hari)}
            <span className="text-xs text-black-400 font-normal">/hari</span>
          </span>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${status.bgColor} ${status.textColor}`}>
            {status.label}
          </span>
        </div>
        {status.reason === 'disewa' && status.estimatedReturn && (
          <p className="text-[11px] text-black-400 mt-1.5">
            Perkiraan kembali: {formatDate(status.estimatedReturn)}
          </p>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (isDisabled) {
              navigate(`/katalog/${item.id}`);
            } else {
              onPesan(item);
            }
          }}
          className={`mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-colors ${
            isDisabled
              ? 'bg-canvas text-black-600 border border-black-200 hover:bg-black-200'
              : 'bg-primary-600 text-white hover:bg-primary-700'
          }`}
        >
          {isDisabled ? 'Lihat Detail' : 'Sewa Sekarang'}
        </button>
      </div>
    </div>
  );
}

/* --- PAGE --- KATALOG --- */
export default function Katalog() {
  const [items, setItems] = useState<KatalogItem[]>([]);
  const [kategoris, setKategoris] = useState<KategoriWithCount[]>([]);
  const [tipes, setTipes] = useState<TipeWithCount[]>([]);
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
  }, []);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (kategoriSlug) params.kategori_slug = kategoriSlug;
    katalogAPI
      .tipes(params)
      .then(({ data }) => setTipes(data as unknown as TipeWithCount[]))
      .catch(() => {});
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

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    setPage(1);
    setTipeSlug('');
  }, [kategoriSlug]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, tipeSlug, sort, debouncedTanggal, debouncedDurasi]);

  const totalPages = meta?.last_page ?? 1;
  const showPagination = meta && meta.last_page > 1;

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

  const statusCounts = useMemo(() => {
    const tersedia = items.filter((i) => i.status === 'tersedia').length;
    const disewa = items.filter((i) => i.status === 'disewa').length;
    const servis = items.filter((i) => i.status === 'maintenance').length;
    return { tersedia, disewa, servis };
  }, [items]);

  return (
    <div className="min-h-screen bg-canvas">
      {/* Navbar */}
      <nav className="bg-white border-b border-black-200 sticky top-0 z-40" role="navigation" aria-label="Navigasi utama">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <img src={logo} alt="UDIN RENCTCAR" className="h-10 w-auto" />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center gap-2 px-4 py-2 bg-accent-100 text-black-700 text-sm font-medium rounded-lg hover:bg-black-200 transition-colors"
            >
              Beranda
            </Link>
            <a
              href={`https://wa.me/${ADMIN_WA}?text=Halo%2C%20saya%20ingin%20bertanya%20tentang%20layanan%20rental`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-success-500 text-white text-sm font-medium rounded-lg hover:bg-success-600 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Hubungi Kami
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
          <AnimatedSection>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight tracking-tight">
              Sewa Kendaraan
              <br />
              <span className="text-primary-400">Mudah &amp; Terpercaya</span>
            </h1>
            <p className="mt-4 text-black-400 text-lg leading-relaxed max-w-2xl">
              Pilihan kendaraan lengkap, harga transparan, proses cepat. Tersedia mobil dan motor untuk kebutuhan harian, wisata, hingga bisnis.
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <a
                href="#katalog"
                className="px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/25"
              >
                Lihat Katalog
              </a>
              <a
                href={`https://wa.me/${ADMIN_WA}?text=Halo%2C%20saya%20ingin%20konsultasi%20tentang%20rental%20kendaraan`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 border-2 border-white/20 text-white font-semibold rounded-xl hover:bg-white/5 transition-colors"
              >
                Konsultasi Gratis
              </a>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white border-b border-black-200" aria-label="Statistik layanan">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { label: 'Unit Tersedia', value: `${statusCounts.tersedia}`, color: 'text-success-600' },
              { label: 'Sedang Disewa', value: `${statusCounts.disewa}`, color: 'text-error-500' },
              { label: 'Sedang Servis', value: `${statusCounts.servis}`, color: 'text-accent-500' },
              { label: 'Total Unit', value: `${meta?.total ?? 0}`, color: 'text-primary-600' },
            ].map((s, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-black-400">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Katalog */}
      <section id="katalog" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-black">Katalog Kendaraan</h2>
            <p className="text-sm text-black-400 mt-1">Pilih kendaraan yang sesuai kebutuhan Anda</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-black-200 p-4 mb-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={searchRef}
              type="text"
              placeholder="Cari merek, model, nama, kategori..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-black-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-shadow"
              aria-label="Cari kendaraan"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-2 border border-black-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
            aria-label="Urutkan"
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Date Availability Filter */}
        <div className="bg-white rounded-xl border border-black-200 p-4 mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 shrink-0">
              <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-medium text-black-700">Cek Ketersediaan:</span>
            </div>
            <input
              type="date"
              value={tanggalMulai}
              min={catalogToday}
              onChange={(e) => setTanggalMulai(e.target.value)}
              className="px-3 py-2 border border-black-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              aria-label="Tanggal mulai"
            />
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                value={durasiHari}
                min={1}
                max={365}
                onChange={(e) => setDurasiHari(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 px-3 py-2 border border-black-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                aria-label="Durasi hari"
              />
              <span className="text-sm text-black-400">hari</span>
            </div>
            {tanggalMulai && (
              <button
                onClick={() => { setTanggalMulai(''); setDurasiHari(1); }}
                className="text-sm text-black-400 hover:text-black-600 transition-colors flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Reset
              </button>
            )}
          </div>
          {tanggalMulai && (
            <p className="text-xs text-black-400 mt-2">
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
                kategoriSlug === '' ? 'bg-primary-600 text-white shadow-sm' : 'bg-white text-black-600 border border-black-200 hover:border-primary-400 hover:text-primary-600'
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
                  kategoriSlug === k.slug ? 'bg-primary-600 text-white shadow-sm' : 'bg-white text-black-600 border border-black-200 hover:border-primary-400 hover:text-primary-600'
                }`}
                role="tab"
                aria-selected={kategoriSlug === k.slug}
              >
                {k.nama_kategori}
                {k.kendaraans_count > 0 && (
                  <span className={`ml-1.5 text-xs ${kategoriSlug === k.slug ? 'text-primary-200' : 'text-black-400'}`}>
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
                tipeSlug === '' ? 'bg-primary-600 text-white shadow-sm' : 'bg-white text-black-600 border border-black-200 hover:border-primary-300 hover:text-primary-600'
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
                  tipeSlug === t.slug ? 'bg-primary-600 text-white shadow-sm' : 'bg-white text-black-600 border border-black-200 hover:border-primary-300 hover:text-primary-600'
                }`}
                role="tab"
                aria-selected={tipeSlug === t.slug}
              >
                {t.nama_tipe}
                {t.kendaraans_count > 0 && (
                  <span className={`ml-1 ${tipeSlug === t.slug ? 'text-primary-200' : 'text-black-400'}`}>
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
            <svg className="w-16 h-16 text-black-200 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 17h.01M16 17h.01M3 11l1.5-5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.4L21 11M3 11h18M3 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-6" />
            </svg>
            <p className="text-black-500 font-medium">Tidak ada kendaraan ditemukan</p>
            <p className="text-sm text-black-400 mt-1">Coba ubah filter pencarian Anda</p>
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
              ))}
            </div>
            {showPagination && (
              <nav className="flex items-center justify-center gap-2 mt-8" aria-label="Paginasi">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-2 text-sm font-medium border border-black-200 rounded-lg hover:bg-canvas disabled:opacity-40 transition-colors"
                >
                  Sebelumnya
                </button>
                <span className="text-sm text-black-600 px-3">
                  Halaman {page} dari {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-2 text-sm font-medium border border-black-200 rounded-lg hover:bg-canvas disabled:opacity-40 transition-colors"
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
          <div className="bg-gradient-to-r from-primary-50 to-indigo-50 rounded-2xl border border-primary-100 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-black">Kendaraan Serupa yang Tersedia</h3>
                <p className="text-sm text-black-400">
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
      <section className="bg-primary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <h2 className="text-2xl font-bold text-white">Butuh Kendaraan Sekarang?</h2>
          <p className="mt-2 text-primary-100">Hubungi kami via WhatsApp untuk konsultasi dan pemesanan cepat</p>
          <a
            href={`https://wa.me/${ADMIN_WA}?text=Halo%2C%20saya%20butuh%20kendaraan%20untuk%20disewa`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 px-8 py-3 bg-success-500 text-white font-semibold rounded-xl hover:bg-success-600 transition-colors shadow-lg"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Chat WhatsApp Sekarang
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-black-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <img src={logoFooter} alt="UDIN RENCTCAR" className="h-12 w-auto" />
              </div>
              <p className="text-sm leading-relaxed mt-1">Solusi rental kendaraan terpercaya. Armada lengkap, proses mudah, harga bersahabat.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Kontak</h4>
              <div className="space-y-2 text-sm">
                <p>WhatsApp: 0895-3610-54272</p>
                <p>Email: info@udin-renctcar.com</p>
                <p>Jl. Contoh No. 123, Kota</p>
              </div>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Jam Operasional</h4>
              <div className="space-y-2 text-sm">
                <p>Senin - Sabtu: 08.00 - 17.00</p>
                <p>Minggu: 08.00 - 12.00</p>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-black-800 text-center text-sm">
            &copy; {new Date().getFullYear()} UDIN RENCTCAR. Hak cipta dilindungi.
          </div>
        </div>
      </footer>

      {/* Modal */}
      {modalItem && <PesanSekarangModal item={modalItem} onClose={() => setModalItem(null)} />}
    </div>
  );
}
