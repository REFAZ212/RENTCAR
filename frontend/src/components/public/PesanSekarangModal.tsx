import { useState, useEffect, useMemo, useRef } from 'react';
import { katalogAPI, type KatalogItem, type OrderRequestPayload } from '../../services/api';
import { todayJakarta, nowWIBTime, formatRupiah, ADMIN_WA } from '../../lib/format';

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

const getFotoUrl = (foto?: string | null): string | null => {
  if (!foto) return null;
  if (foto.startsWith('http')) return foto;
  return `/storage/${foto}`;
};

const pad2 = (n: number): string => String(n).padStart(2, '0');

/** Hitung tanggal_selesai = tanggal_mulai + durasi - 1 hari, format YYYY-MM-DD. */
const computeTanggalSelesai = (tanggalMulai: string, durasi: number): string => {
  if (!tanggalMulai || durasi < 1) return '';
  const d = new Date(tanggalMulai + 'T00:00:00');
  d.setDate(d.getDate() + durasi - 1);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

export default function PesanSekarangModal({
  item,
  onClose,
  initialTanggalMulai,
  initialDurasi,
}: {
  item: KatalogItem;
  onClose: () => void;
  initialTanggalMulai?: string;
  initialDurasi?: number;
}) {
  const [form, setForm] = useState<OrderForm>(() => {
    const today = todayJakarta();
    const tanggalMulai = initialTanggalMulai && initialTanggalMulai >= today ? initialTanggalMulai : '';
    const tanggalSelesai = tanggalMulai && initialDurasi && initialDurasi > 0 ? computeTanggalSelesai(tanggalMulai, initialDurasi) : '';
    return {
      nama_lengkap: '',
      no_hp: '',
      tanggal_mulai: tanggalMulai,
      tanggal_selesai: tanggalSelesai,
      jam_mulai: '',
      jam_selesai: '',
      opsi_supir: 'lepas_kunci',
      catatan: '',
    };
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
    const nowJam = nowWIBTime();
    if (form.tanggal_mulai === today && form.jam_mulai && form.jam_mulai <= nowJam) {
      setError('Jam mulai hari ini sudah terlewat — pilih jam setelah sekarang');
      return;
    }
    if (form.tanggal_selesai === today && form.jam_selesai && form.jam_selesai <= nowJam) {
      setError('Jam selesai hari ini sudah terlewat — pilih jam setelah sekarang');
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
    const pesan = `Halo, saya tertarik dengan *${item.nama_kendaraan}* (${item.tahun}) seharga ${formatRupiah(item.harga_sewa_per_hari)}/hari.\n\nTanggal: ${tglInfo}\nOpsi: ${opsLabel}\n\nSaya ingin berkonsultasi lebih lanjut. Terima kasih.`;
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
                  <p className="text-xs text-black-400">{item.merek} &middot; {item.tahun}</p>
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
                      min={form.tanggal_mulai === today ? nowWIBTime() : undefined}
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
                      min={form.tanggal_selesai === today ? nowWIBTime() : undefined}
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