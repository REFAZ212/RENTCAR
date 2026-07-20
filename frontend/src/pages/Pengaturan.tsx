import { useState, useEffect, type ReactNode, type FormEvent } from 'react';
import api, { isAxiosError } from './mockApi'; // ⬅️ SEMENTARA: ganti balik ke '../services/api' + 'axios' kalau backend sudah siap
import { useToast } from '../contexts/ToastContext';

/**
 * ─────────────────────────────────────────────────────────────
 * Halaman Pengaturan — 5 tab
 * Tema warna disamakan dengan Dashboard/Laporan (ink / brand / avail / maint / rented)
 *
 * CATATAN INTEGRASI (FRONTEND-ONLY MODE):
 * File ini sedang memakai `./mockApi` sebagai pengganti sementara
 * '../services/api' karena backend '/pengaturan/*' belum tersedia.
 * mockApi.ts meniru bentuk axios (get/post/put) dengan delay dan
 * data in-memory, jadi seluruh UI di bawah — loading state, toast,
 * validasi password, dsb — bisa dites end-to-end tanpa backend.
 *
 * Begitu backend jadi: cukup ganti baris import di atas jadi
 *   import api from '../services/api';
 *   import { isAxiosError } from 'axios';
 * TIDAK ADA baris lain di file ini yang perlu diubah, selama
 * kontrak endpoint backend sama dengan yang didokumentasikan
 * di dalam mockApi.ts.
 * ─────────────────────────────────────────────────────────────
 */

const tabs = [
  { key: 'profil', label: 'Profil & Keamanan', icon: 'M12 12a4 4 0 100-8 4 4 0 000 8zm0 0c-4 0-7 2-7 4.5V19h14v-2.5C19 14 16 12 12 12z' },
  {
    key: 'bisnis',
    label: 'Info Bisnis',
    icon: 'M3 21h18M5 21V7l8-4v18M13 21V11l6 3v7M9 9v.01M9 12v.01M9 15v.01',
  },
  {
    key: 'harga',
    label: 'Kebijakan Harga',
    icon: 'M12 8c-1.66 0-3 .9-3 2s1.34 2 3 2 3 .9 3 2-1.34 2-3 2m0-8V6m0 2c1.66 0 3 .9 3 2m-3 6v2m0-2c-1.66 0-3-.9-3-2M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    key: 'notifikasi',
    label: 'Notifikasi WA',
    icon: 'M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z',
  },
  {
    key: 'sistem',
    label: 'Sistem',
    icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
  },
] as const;

type TabKey = (typeof tabs)[number]['key'];

const ICONS = {
  upload: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0L8 12m4-4v12',
  check: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  lock: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  eye: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
  eyeOff: 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18',
  plus: 'M12 4v16m8-8H4',
  download: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4',
  trash: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16',
} as const;

/* ─────────────────────────────────────────────────────────────
 * TYPES
 * ───────────────────────────────────────────────────────────── */
interface ProfilForm {
  nama: string;
  email: string;
  no_hp: string;
  avatar_url: string | null;
}

interface PasswordForm {
  password_lama: string;
  password_baru: string;
  konfirmasi_password: string;
}

interface JamOperasional {
  hari: string;
  buka: string;
  tutup: string;
  libur: boolean;
}

interface BisnisForm {
  nama_usaha: string;
  alamat: string;
  no_telp: string;
  email_usaha: string;
  logo_url: string | null;
  jam_operasional: JamOperasional[];
}

interface HargaForm {
  biaya_antar_per_km: number;
  biaya_jemput_flat: number;
  biaya_dengan_driver_per_hari: number;
  minimal_dp_persen: number;
  denda_keterlambatan_per_jam: number;
  toleransi_keterlambatan_menit: number;
}

interface NotifikasiForm {
  fonnte_token: string;
  nomor_wa_owner: string;
  notif_booking_baru: boolean;
  notif_penugasan_driver: boolean;
  notif_pembayaran_masuk: boolean;
  notif_kendaraan_terlambat: boolean;
  template_penugasan_driver: string;
  template_notifikasi_owner: string;
}

interface SistemForm {
  mata_uang: string;
  zona_waktu: string;
  format_tanggal: string;
  prefix_kode_order: string;
}

const HARI_DEFAULT: JamOperasional[] = [
  { hari: 'Senin', buka: '08:00', tutup: '20:00', libur: false },
  { hari: 'Selasa', buka: '08:00', tutup: '20:00', libur: false },
  { hari: 'Rabu', buka: '08:00', tutup: '20:00', libur: false },
  { hari: 'Kamis', buka: '08:00', tutup: '20:00', libur: false },
  { hari: 'Jumat', buka: '08:00', tutup: '20:00', libur: false },
  { hari: 'Sabtu', buka: '08:00', tutup: '20:00', libur: false },
  { hari: 'Minggu', buka: '08:00', tutup: '17:00', libur: false },
];

const TEMPLATE_VARS_DRIVER = ['{nama_driver}', '{customer}', '{kendaraan}', '{plat_nomor}', '{tanggal}', '{jam}'];
const TEMPLATE_VARS_OWNER = ['{kendaraan}', '{customer}', '{driver}', '{tanggal}', '{status}'];

/* ─────────────────────────────────────────────────────────────
 * KOMPONEN DASAR (dibagi antar tab)
 * ───────────────────────────────────────────────────────────── */
function inputClass(hasError?: boolean) {
  return `w-full rounded-lg border px-3 py-2 text-sm text-ink-900 outline-none transition-colors focus:ring-1 ${
    hasError ? 'border-maint-500 focus:border-maint-500 focus:ring-maint-500' : 'border-ink-200 focus:border-brand-500 focus:ring-brand-500'
  }`;
}

function Field({ label, children, hint, error }: { label: string; children: ReactNode; hint?: string; error?: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink-700">{label}</label>
      {children}
      {error ? <p className="mt-1 text-xs text-maint-600">{error}</p> : hint ? <p className="mt-1 text-xs text-ink-400">{hint}</p> : null}
    </div>
  );
}

function SectionCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-ink-200">
      <div className="border-b border-ink-200 px-6 py-4">
        <h3 className="font-semibold text-ink-900">{title}</h3>
        {description && <p className="mt-0.5 text-xs text-ink-400">{description}</p>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium text-ink-900">{label}</p>
        {description && <p className="mt-0.5 text-xs text-ink-400">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
          checked ? 'bg-brand-500' : 'bg-ink-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

function SaveButton({ loading, label = 'Simpan Perubahan' }: { loading: boolean; label?: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading && (
        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {loading ? 'Menyimpan...' : label}
    </button>
  );
}

function AvatarUpload({
  imageUrl,
  onFileSelected,
  shape = 'circle',
  size = 96,
}: {
  imageUrl: string | null;
  onFileSelected: (file: File) => void;
  shape?: 'circle' | 'square';
  size?: number;
}) {
  const radius = shape === 'circle' ? 'rounded-full' : 'rounded-xl';
  return (
    <div className="flex items-center gap-4">
      <div
        className={`flex items-center justify-center overflow-hidden bg-canvas ring-1 ring-ink-200 ${radius}`}
        style={{ width: size, height: size }}
      >
        {imageUrl ? (
          <img src={imageUrl} alt="Preview" className="h-full w-full object-cover" />
        ) : (
          <svg className="h-8 w-8 text-ink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={ICONS.upload} />
          </svg>
        )}
      </div>
      <label className="cursor-pointer rounded-lg border border-ink-200 px-4 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-canvas">
        Ganti Gambar
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFileSelected(file);
          }}
        />
      </label>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * TAB — Profil & Keamanan
 * ───────────────────────────────────────────────────────────── */
function ProfilTab() {
  const toast = useToast();
  const [form, setForm] = useState<ProfilForm>({ nama: '', email: '', no_hp: '', avatar_url: null });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [pwForm, setPwForm] = useState<PasswordForm>({ password_lama: '', password_baru: '', konfirmasi_password: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [showPw, setShowPw] = useState({ lama: false, baru: false, konfirmasi: false });
  const [pwError, setPwError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<ProfilForm>('/pengaturan/profil')
      .then(({ data }) => setForm(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleAvatarSelect = (file: File) => {
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSubmitProfil = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = new FormData();
      payload.append('nama', form.nama);
      payload.append('email', form.email);
      payload.append('no_hp', form.no_hp);
      if (avatarFile) payload.append('avatar', avatarFile);

      await api.post('/pengaturan/profil', payload, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Profil berhasil diperbarui');
    } catch (err) {
      console.error(err);
      toast.error('Gagal menyimpan profil');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitPassword = async (e: FormEvent) => {
    e.preventDefault();
    setPwError(null);

    if (pwForm.password_baru.length < 8) {
      setPwError('Password baru minimal 8 karakter');
      return;
    }
    if (pwForm.password_baru !== pwForm.konfirmasi_password) {
      setPwError('Konfirmasi password tidak cocok');
      return;
    }

    setPwSaving(true);
    try {
      await api.put('/pengaturan/password', pwForm);
      toast.success('Password berhasil diubah');
      setPwForm({ password_lama: '', password_baru: '', konfirmasi_password: '' });
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 422) {
        setPwError('Password lama tidak sesuai');
      } else {
        toast.error('Gagal mengubah password');
      }
    } finally {
      setPwSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-64 rounded-2xl" />
        <div className="skeleton h-52 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmitProfil}>
        <SectionCard title="Informasi Profil" description="Data ini digunakan sebagai identitas Anda saat login">
          <div className="space-y-5">
            <Field label="Foto Profil">
              <AvatarUpload imageUrl={avatarPreview ?? form.avatar_url} onFileSelected={handleAvatarSelect} />
            </Field>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Nama Lengkap">
                <input
                  type="text"
                  value={form.nama}
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                  className={inputClass()}
                  required
                />
              </Field>
              <Field label="Nomor WhatsApp">
                <input
                  type="tel"
                  value={form.no_hp}
                  onChange={(e) => setForm({ ...form, no_hp: e.target.value })}
                  placeholder="08xxxxxxxxxx"
                  className={inputClass()}
                />
              </Field>
            </div>

            <Field label="Email" hint="Digunakan untuk login ke sistem">
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputClass()}
                required
              />
            </Field>

            <div className="flex justify-end border-t border-ink-200 pt-5">
              <SaveButton loading={saving} />
            </div>
          </div>
        </SectionCard>
      </form>

      <form onSubmit={handleSubmitPassword}>
        <SectionCard title="Ubah Password" description="Gunakan password yang kuat dan tidak dipakai di tempat lain">
          <div className="space-y-5">
            <Field label="Password Saat Ini" error={pwError ?? undefined}>
              <div className="relative">
                <input
                  type={showPw.lama ? 'text' : 'password'}
                  value={pwForm.password_lama}
                  onChange={(e) => setPwForm({ ...pwForm, password_lama: e.target.value })}
                  className={inputClass(!!pwError)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw({ ...showPw, lama: !showPw.lama })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700"
                  aria-label={showPw.lama ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={showPw.lama ? ICONS.eyeOff : ICONS.eye} />
                  </svg>
                </button>
              </div>
            </Field>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Password Baru" hint="Minimal 8 karakter">
                <div className="relative">
                  <input
                    type={showPw.baru ? 'text' : 'password'}
                    value={pwForm.password_baru}
                    onChange={(e) => setPwForm({ ...pwForm, password_baru: e.target.value })}
                    className={inputClass()}
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw({ ...showPw, baru: !showPw.baru })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700"
                    aria-label={showPw.baru ? 'Sembunyikan password' : 'Tampilkan password'}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={showPw.baru ? ICONS.eyeOff : ICONS.eye} />
                    </svg>
                  </button>
                </div>
              </Field>
              <Field label="Konfirmasi Password Baru">
                <input
                  type={showPw.konfirmasi ? 'text' : 'password'}
                  value={pwForm.konfirmasi_password}
                  onChange={(e) => setPwForm({ ...pwForm, konfirmasi_password: e.target.value })}
                  className={inputClass()}
                  required
                />
              </Field>
            </div>

            <div className="flex justify-end border-t border-ink-200 pt-5">
              <SaveButton loading={pwSaving} label="Ubah Password" />
            </div>
          </div>
        </SectionCard>
      </form>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * TAB — Info Bisnis
 * ───────────────────────────────────────────────────────────── */
function BisnisTab() {
  const toast = useToast();
  const [form, setForm] = useState<BisnisForm>({
    nama_usaha: '',
    alamat: '',
    no_telp: '',
    email_usaha: '',
    logo_url: null,
    jam_operasional: HARI_DEFAULT,
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get<BisnisForm>('/pengaturan/bisnis')
      .then(({ data }) => setForm({ ...data, jam_operasional: data.jam_operasional?.length ? data.jam_operasional : HARI_DEFAULT }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const updateJam = (index: number, patch: Partial<JamOperasional>) => {
    const next = [...form.jam_operasional];
    next[index] = { ...next[index], ...patch };
    setForm({ ...form, jam_operasional: next });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = new FormData();
      payload.append('nama_usaha', form.nama_usaha);
      payload.append('alamat', form.alamat);
      payload.append('no_telp', form.no_telp);
      payload.append('email_usaha', form.email_usaha);
      payload.append('jam_operasional', JSON.stringify(form.jam_operasional));
      if (logoFile) payload.append('logo', logoFile);

      await api.post('/pengaturan/bisnis', payload, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Informasi bisnis berhasil disimpan');
    } catch (err) {
      console.error(err);
      toast.error('Gagal menyimpan informasi bisnis');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="skeleton h-96 rounded-2xl" />;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <SectionCard title="Identitas Usaha" description="Ditampilkan di landing page, invoice, dan pesan WhatsApp otomatis">
        <div className="space-y-5">
          <Field label="Logo Usaha">
            <AvatarUpload imageUrl={logoPreview ?? form.logo_url} onFileSelected={(f) => { setLogoFile(f); setLogoPreview(URL.createObjectURL(f)); }} shape="square" />
          </Field>

          <Field label="Nama Usaha">
            <input
              type="text"
              value={form.nama_usaha}
              onChange={(e) => setForm({ ...form, nama_usaha: e.target.value })}
              className={inputClass()}
              placeholder="Contoh: Pilar Rental Mobil"
              required
            />
          </Field>

          <Field label="Alamat Garasi Utama">
            <textarea
              value={form.alamat}
              onChange={(e) => setForm({ ...form, alamat: e.target.value })}
              className={inputClass()}
              rows={3}
              required
            />
          </Field>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Nomor Telepon Usaha">
              <input
                type="tel"
                value={form.no_telp}
                onChange={(e) => setForm({ ...form, no_telp: e.target.value })}
                className={inputClass()}
              />
            </Field>
            <Field label="Email Usaha">
              <input
                type="email"
                value={form.email_usaha}
                onChange={(e) => setForm({ ...form, email_usaha: e.target.value })}
                className={inputClass()}
              />
            </Field>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Jam Operasional" description="Menentukan kapan booking baru bisa diproses admin">
        <div className="overflow-hidden rounded-xl border border-ink-200">
          <table className="w-full text-sm">
            <thead className="bg-canvas">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-ink-400">Hari</th>
                <th className="px-4 py-2.5 text-left font-medium text-ink-400">Buka</th>
                <th className="px-4 py-2.5 text-left font-medium text-ink-400">Tutup</th>
                <th className="px-4 py-2.5 text-center font-medium text-ink-400">Libur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-200">
              {form.jam_operasional.map((row, i) => (
                <tr key={row.hari} className={row.libur ? 'bg-canvas' : ''}>
                  <td className="px-4 py-2.5 font-medium text-ink-900">{row.hari}</td>
                  <td className="px-4 py-2.5">
                    <input
                      type="time"
                      value={row.buka}
                      disabled={row.libur}
                      onChange={(e) => updateJam(i, { buka: e.target.value })}
                      className={`${inputClass()} disabled:opacity-40`}
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      type="time"
                      value={row.tutup}
                      disabled={row.libur}
                      onChange={(e) => updateJam(i, { tutup: e.target.value })}
                      className={`${inputClass()} disabled:opacity-40`}
                    />
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={row.libur}
                      onChange={(e) => updateJam(i, { libur: e.target.checked })}
                      className="h-4 w-4 rounded border-ink-200 text-brand-500 focus:ring-brand-500"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-end">
          <SaveButton loading={saving} />
        </div>
      </SectionCard>
    </form>
  );
}

/* ─────────────────────────────────────────────────────────────
 * TAB — Kebijakan Harga
 * ───────────────────────────────────────────────────────────── */
function HargaTab() {
  const toast = useToast();
  const [form, setForm] = useState<HargaForm>({
    biaya_antar_per_km: 5000,
    biaya_jemput_flat: 25000,
    biaya_dengan_driver_per_hari: 150000,
    minimal_dp_persen: 30,
    denda_keterlambatan_per_jam: 20000,
    toleransi_keterlambatan_menit: 30,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get<HargaForm>('/pengaturan/harga')
      .then(({ data }) => setForm(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const setNum = (key: keyof HargaForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: Number(e.target.value) });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/pengaturan/harga', form);
      toast.success('Kebijakan harga berhasil disimpan');
    } catch (err) {
      console.error(err);
      toast.error('Gagal menyimpan kebijakan harga');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="skeleton h-96 rounded-2xl" />;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <SectionCard title="Biaya Pengantaran" description="Berlaku sebagai default, bisa disesuaikan manual saat booking">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Biaya Antar (per km)" hint="Dihitung dari garasi ke lokasi customer">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-400">Rp</span>
              <input type="number" min={0} value={form.biaya_antar_per_km} onChange={setNum('biaya_antar_per_km')} className={`${inputClass()} pl-9`} />
            </div>
          </Field>
          <Field label="Biaya Jemput (flat)" hint="Kalau customer minta ambil di lokasi tertentu">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-400">Rp</span>
              <input type="number" min={0} value={form.biaya_jemput_flat} onChange={setNum('biaya_jemput_flat')} className={`${inputClass()} pl-9`} />
            </div>
          </Field>
          <Field label="Biaya dengan Driver (per hari)">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-400">Rp</span>
              <input
                type="number"
                min={0}
                value={form.biaya_dengan_driver_per_hari}
                onChange={setNum('biaya_dengan_driver_per_hari')}
                className={`${inputClass()} pl-9`}
              />
            </div>
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Pembayaran & Denda">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Minimal DP" hint="Persentase minimum uang muka saat booking dikonfirmasi">
            <div className="relative">
              <input type="number" min={0} max={100} value={form.minimal_dp_persen} onChange={setNum('minimal_dp_persen')} className={`${inputClass()} pr-9`} />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-400">%</span>
            </div>
          </Field>
          <Field label="Toleransi Keterlambatan" hint="Sebelum denda mulai dihitung">
            <div className="relative">
              <input
                type="number"
                min={0}
                value={form.toleransi_keterlambatan_menit}
                onChange={setNum('toleransi_keterlambatan_menit')}
                className={`${inputClass()} pr-16`}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-400">menit</span>
            </div>
          </Field>
          <Field label="Denda Keterlambatan (per jam)">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-400">Rp</span>
              <input
                type="number"
                min={0}
                value={form.denda_keterlambatan_per_jam}
                onChange={setNum('denda_keterlambatan_per_jam')}
                className={`${inputClass()} pl-9`}
              />
            </div>
          </Field>
        </div>

        <div className="mt-6 flex justify-end border-t border-ink-200 pt-5">
          <SaveButton loading={saving} />
        </div>
      </SectionCard>
    </form>
  );
}

/* ─────────────────────────────────────────────────────────────
 * TAB — Notifikasi WhatsApp
 * ───────────────────────────────────────────────────────────── */
function TemplateEditor({
  label,
  value,
  onChange,
  variables,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  variables: string[];
}) {
  const insertVar = (v: string) => onChange(`${value}${value.endsWith(' ') || value === '' ? '' : ' '}${v}`);

  return (
    <Field label={label} hint="Klik salah satu variabel untuk menambahkannya ke dalam pesan">
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={4} className={inputClass()} />
      <div className="mt-2 flex flex-wrap gap-1.5">
        {variables.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => insertVar(v)}
            className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-600 transition-colors hover:bg-brand-100"
          >
            {v}
          </button>
        ))}
      </div>
    </Field>
  );
}

function NotifikasiTab() {
  const toast = useToast();
  const [form, setForm] = useState<NotifikasiForm>({
    fonnte_token: '',
    nomor_wa_owner: '',
    notif_booking_baru: true,
    notif_penugasan_driver: true,
    notif_pembayaran_masuk: true,
    notif_kendaraan_terlambat: true,
    template_penugasan_driver:
      'Halo {nama_driver}, ada tugas baru:\nAntar {customer} — {kendaraan} ({plat_nomor})\n{tanggal} pukul {jam}\n\nBalas SIAP jika bisa, atau TIDAK jika berhalangan.',
    template_notifikasi_owner: '[BOOKING] {kendaraan} untuk {customer}\nDriver: {driver} — {tanggal}\nStatus: {status}',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    api
      .get<NotifikasiForm>('/pengaturan/notifikasi')
      .then(({ data }) => setForm(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/pengaturan/notifikasi', form);
      toast.success('Pengaturan notifikasi berhasil disimpan');
    } catch (err) {
      console.error(err);
      toast.error('Gagal menyimpan pengaturan notifikasi');
    } finally {
      setSaving(false);
    }
  };

  const handleTestKirim = async () => {
    setTesting(true);
    try {
      await api.post('/pengaturan/notifikasi/test', { nomor: form.nomor_wa_owner });
      toast.success('Pesan test berhasil dikirim, cek WhatsApp Anda');
    } catch (err) {
      console.error(err);
      toast.error('Gagal mengirim pesan test — cek token gateway');
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <div className="skeleton h-96 rounded-2xl" />;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <SectionCard title="Koneksi WhatsApp Gateway" description="Token didapat dari dashboard penyedia gateway (mis. Fonnte)">
        <div className="space-y-5">
          <Field label="Token Gateway" hint="Jangan bagikan token ini ke siapapun">
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={form.fonnte_token}
                onChange={(e) => setForm({ ...form, fonnte_token: e.target.value })}
                className={`${inputClass()} pr-10 font-mono`}
                placeholder="•••••••••••••••••••••"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700"
                aria-label={showToken ? 'Sembunyikan token' : 'Tampilkan token'}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={showToken ? ICONS.eyeOff : ICONS.eye} />
                </svg>
              </button>
            </div>
          </Field>

          <Field label="Nomor WhatsApp Owner" hint="Nomor yang menerima ringkasan notifikasi setiap ada booking baru">
            <div className="flex gap-2">
              <input
                type="tel"
                value={form.nomor_wa_owner}
                onChange={(e) => setForm({ ...form, nomor_wa_owner: e.target.value })}
                placeholder="628xxxxxxxxxx"
                className={inputClass()}
              />
              <button
                type="button"
                onClick={handleTestKirim}
                disabled={testing || !form.nomor_wa_owner}
                className="flex-shrink-0 rounded-lg border border-ink-200 px-4 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-canvas disabled:opacity-50"
              >
                {testing ? 'Mengirim...' : 'Kirim Test'}
              </button>
            </div>
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Jenis Notifikasi Otomatis" description="Pilih kejadian mana saja yang memicu pesan WhatsApp otomatis">
        <div className="divide-y divide-ink-200">
          <ToggleSwitch
            checked={form.notif_booking_baru}
            onChange={(v) => setForm({ ...form, notif_booking_baru: v })}
            label="Booking Baru Masuk"
            description="Kirim notifikasi ke owner setiap ada pesanan baru dikonfirmasi"
          />
          <ToggleSwitch
            checked={form.notif_penugasan_driver}
            onChange={(v) => setForm({ ...form, notif_penugasan_driver: v })}
            label="Penugasan Driver"
            description="Kirim pesan tugas otomatis ke driver yang ditugaskan"
          />
          <ToggleSwitch
            checked={form.notif_pembayaran_masuk}
            onChange={(v) => setForm({ ...form, notif_pembayaran_masuk: v })}
            label="Pembayaran Masuk"
            description="Notifikasi saat status pembayaran berubah jadi DP atau Lunas"
          />
          <ToggleSwitch
            checked={form.notif_kendaraan_terlambat}
            onChange={(v) => setForm({ ...form, notif_kendaraan_terlambat: v })}
            label="Kendaraan Terlambat Kembali"
            description="Peringatan otomatis jika kendaraan melewati batas waktu sewa"
          />
        </div>
      </SectionCard>

      <SectionCard title="Template Pesan" description="Sesuaikan isi pesan otomatis yang dikirim sistem">
        <div className="space-y-6">
          <TemplateEditor
            label="Template Penugasan ke Driver"
            value={form.template_penugasan_driver}
            onChange={(v) => setForm({ ...form, template_penugasan_driver: v })}
            variables={TEMPLATE_VARS_DRIVER}
          />
          <TemplateEditor
            label="Template Notifikasi ke Owner"
            value={form.template_notifikasi_owner}
            onChange={(v) => setForm({ ...form, template_notifikasi_owner: v })}
            variables={TEMPLATE_VARS_OWNER}
          />
        </div>

        <div className="mt-6 flex justify-end border-t border-ink-200 pt-5">
          <SaveButton loading={saving} />
        </div>
      </SectionCard>
    </form>
  );
}

/* ─────────────────────────────────────────────────────────────
 * TAB — Sistem
 * ───────────────────────────────────────────────────────────── */
function SistemTab() {
  const toast = useToast();
  const [form, setForm] = useState<SistemForm>({
    mata_uang: 'IDR',
    zona_waktu: 'Asia/Jakarta',
    format_tanggal: 'DD/MM/YYYY',
    prefix_kode_order: 'RNT',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    api
      .get<SistemForm>('/pengaturan/sistem')
      .then(({ data }) => setForm(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/pengaturan/sistem', form);
      toast.success('Preferensi sistem berhasil disimpan');
    } catch (err) {
      console.error(err);
      toast.error('Gagal menyimpan preferensi sistem');
    } finally {
      setSaving(false);
    }
  };

  const handleBackup = async () => {
    setExporting(true);
    try {
      const resp = await api.get('/pengaturan/backup', { responseType: 'blob' });
      const blob = new Blob([resp.data], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-data-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Backup data berhasil diunduh');
    } catch (err) {
      console.error(err);
      toast.error('Gagal membuat backup data');
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <div className="skeleton h-96 rounded-2xl" />;

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit}>
        <SectionCard title="Preferensi Umum">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Mata Uang">
              <select
                value={form.mata_uang}
                onChange={(e) => setForm({ ...form, mata_uang: e.target.value })}
                className={inputClass()}
              >
                <option value="IDR">Rupiah (IDR)</option>
                <option value="USD">US Dollar (USD)</option>
              </select>
            </Field>

            <Field label="Zona Waktu">
              <select
                value={form.zona_waktu}
                onChange={(e) => setForm({ ...form, zona_waktu: e.target.value })}
                className={inputClass()}
              >
                <option value="Asia/Jakarta">WIB — Jakarta</option>
                <option value="Asia/Makassar">WITA — Makassar</option>
                <option value="Asia/Jayapura">WIT — Jayapura</option>
              </select>
            </Field>

            <Field label="Format Tanggal">
              <select
                value={form.format_tanggal}
                onChange={(e) => setForm({ ...form, format_tanggal: e.target.value })}
                className={inputClass()}
              >
                <option value="DD/MM/YYYY">31/12/2026</option>
                <option value="DD-MM-YYYY">31-12-2026</option>
                <option value="YYYY-MM-DD">2026-12-31</option>
              </select>
            </Field>

            <Field label="Prefix Kode Order" hint="Awalan kode unik setiap booking, contoh: RNT-0001">
              <input
                type="text"
                value={form.prefix_kode_order}
                onChange={(e) => setForm({ ...form, prefix_kode_order: e.target.value.toUpperCase() })}
                maxLength={5}
                className={`${inputClass()} font-mono uppercase`}
              />
            </Field>
          </div>

          <div className="mt-6 flex justify-end border-t border-ink-200 pt-5">
            <SaveButton loading={saving} />
          </div>
        </SectionCard>
      </form>

      <SectionCard title="Backup Data" description="Unduh salinan seluruh data booking, kendaraan, dan customer">
        <div className="flex items-center justify-between rounded-xl bg-canvas p-4">
          <div>
            <p className="text-sm font-medium text-ink-900">Backup Manual</p>
            <p className="mt-0.5 text-xs text-ink-400">File akan diunduh dalam format .zip berisi data terbaru</p>
          </div>
          <button
            type="button"
            onClick={handleBackup}
            disabled={exporting}
            className="flex items-center gap-2 rounded-lg bg-avail-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-avail-600 disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={ICONS.download} />
            </svg>
            {exporting ? 'Menyiapkan...' : 'Unduh Backup'}
          </button>
        </div>
      </SectionCard>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * HALAMAN UTAMA
 * ───────────────────────────────────────────────────────────── */
export default function Pengaturan() {
  const [activeTab, setActiveTab] = useState<TabKey>('profil');

  const renderTab = () => {
    switch (activeTab) {
      case 'profil':
        return <ProfilTab />;
      case 'bisnis':
        return <BisnisTab />;
      case 'harga':
        return <HargaTab />;
      case 'notifikasi':
        return <NotifikasiTab />;
      case 'sistem':
        return <SistemTab />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-ink-900 via-ink-800 to-brand-700 p-6 text-white shadow-sm sm:p-7">
        <h1 className="font-display text-2xl font-bold">Pengaturan</h1>
        <p className="mt-1 text-sm text-ink-200">Kelola profil, kebijakan bisnis, dan preferensi sistem Anda</p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Navigasi tab — sidebar di layar besar, tab horizontal di mobile */}
        <nav className="flex gap-1 overflow-x-auto rounded-xl bg-canvas p-1 lg:w-56 lg:flex-shrink-0 lg:flex-col lg:overflow-visible">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3.5 py-2.5 text-left text-sm font-medium transition-all ${
                activeTab === tab.key ? 'bg-surface text-brand-600 shadow-sm' : 'text-ink-400 hover:text-ink-700'
              }`}
            >
              <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
              </svg>
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="min-w-0 flex-1">{renderTab()}</div>
      </div>
    </div>
  );
}