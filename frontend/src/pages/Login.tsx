import { useEffect, useRef, useState, type FormEvent } from 'react';

import { useNavigate } from 'react-router-dom';

import {
  Mail,
  Lock,
  Loader2,
  AlertCircle,
  ShieldCheck,
  ArrowLeft,
  Car,
  Headset,
  Eye,
  EyeOff,
  LogIn,
  KeyRound,
} from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';

import logo from '../assets/logorentcar.png';

import bg from '../assets/login-bg.png';
const BACKGROUND_IMAGE: string = bg;

/* ------------------------------------------------------------------ *
 * ASET YANG BISA ANDA GANTI
 *
 * BACKGROUND_IMAGE : gambar latar full-screen (disarankan landscape,
 *   min. 1920x1080). Sisi kanan sebaiknya tidak terlalu ramai
 *   karena tertutup card login.

 *   
 *
 * LOGO_LIGHT : versi logo putih/terang untuk kiri atas.
 *   Jika kosong, logo berwarna otomatis dijadikan putih.
 *
 * FORGOT_PASSWORD_PATH : rute halaman lupa password di aplikasi Anda.
 * ------------------------------------------------------------------ */

const LOGO_LIGHT: string = '';
const FORGOT_PASSWORD_PATH = '/forgot-password';

const NAVY = 'text-[#0f2a5c]';

const inputClass =
  'w-full h-11 rounded-xl border border-[#d9e2f1] bg-white pl-11 pr-4 text-sm text-[#0f2a5c] placeholder:text-[#8a97ad] outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-400/30';

const primaryButtonClass =
  'w-full h-11 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 focus:ring-offset-white transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2';

const errorBoxClass =
  'mb-5 p-3 bg-error-500/10 border border-error-500/20 text-error-500 text-sm rounded-xl flex items-center gap-2';

const features = [
  { icon: ShieldCheck, title: 'Aman', sub: '& Terpercaya' },
  { icon: Car, title: 'Pilihan Mobil', sub: 'Lengkap' },
  { icon: Headset, title: 'Layanan', sub: '24 Jam' },
];

function getDeviceId(): string {
  const STORAGE_KEY = 'rentcar_device_id';

  let deviceId = localStorage.getItem(STORAGE_KEY);

  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, deviceId);
  }

  return deviceId;
}

export default function Login() {
  const { login, setSession } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [step, setStep] = useState<'credentials' | 'otp'>(
    'credentials'
  );

  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  const [resendIn, setResendIn] = useState(60);

  const resendTimer = useRef<ReturnType<typeof setInterval> | null>(
    null
  );

  useEffect(() => {
    if (step !== 'otp') return;

    setOtp('');
    setOtpError('');
    setResendIn(60);

    resendTimer.current = setInterval(() => {
      setResendIn((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => {
      if (resendTimer.current) {
        clearInterval(resendTimer.current);
        resendTimer.current = null;
      }
    };
  }, [step]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    setError('');
    setLoading(true);

    try {
      await login(email, password);

      // Device sudah dipercaya atau login berhasil tanpa OTP
      navigate('/');
    } catch (err: any) {
      const responseData = err.response?.data;

      /*
       * OTP login diperlukan untuk device baru
       */
      if (responseData?.requires_otp) {
        setStep('otp');
        return;
      }

      /*
       * Email belum diverifikasi.
       *
       * Ini adalah OTP verifikasi email lama,
       * bukan OTP login device.
       */
      if (responseData?.unverified) {
        setStep('otp');
        return;
      }

      if (
        responseData?.message ||
        responseData?.errors?.email?.[0]
      ) {
        setError(
          responseData?.message ||
            responseData?.errors?.email?.[0]
        );
      } else if (!err.response) {
        setError(
          err.message ||
            'Tidak dapat terhubung ke server. Periksa koneksi Anda.'
        );
      } else {
        setError('Email atau password salah');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();

    setOtpError('');

    if (otp.length !== 6) {
      setOtpError('Kode OTP terdiri dari 6 digit.');
      return;
    }

    setOtpLoading(true);

    try {
      const deviceId = getDeviceId();

      /*
       * Verifikasi OTP LOGIN.
       *
       * Endpoint ini sekaligus:
       * - memverifikasi OTP
       * - menyimpan device sebagai trusted
       * - memberikan token login
       */
      const response = await authAPI.verifyLoginOtp({
        email,
        otp,
        device_id: deviceId,
      });

      /*
       * Simpan token dan user ke state AuthContext.
       *
       * Karena endpoint OTP sudah memberikan token,
       * kita tidak memanggil login() lagi.
       */
      const { token, user } = response.data;

      setSession(token, user);
      navigate('/');
    } catch (err: any) {
      setOtpError(
        err.response?.data?.message ||
          'Kode OTP tidak valid.'
      );
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendIn > 0) return;

    setOtpError('');
    setOtpLoading(true);

    try {
      await authAPI.resendLoginOtp({
        email,
      });

      setResendIn(60);
    } catch (err: any) {
      setOtpError(
        err.response?.data?.message ||
          'Gagal mengirim ulang kode. Coba lagi sebentar lagi.'
      );
    } finally {
      setOtpLoading(false);
    }
  };

  const backToCredentials = () => {
    setStep('credentials');
    setOtp('');
    setOtpError('');
    setError('');
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0c2a5c]">
      {/* ───────── Latar belakang full image ───────── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        {BACKGROUND_IMAGE ? (
          <img
            src={BACKGROUND_IMAGE}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          /* Pengganti sementara sebelum gambar dipasang */
          <div className="h-full w-full bg-gradient-to-br from-[#0c3688] via-[#1f56b5] to-[#5f8fdc]" />
        )}

        {/* Lapisan gelap: kiri lebih pekat agar teks terbaca */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#071a3d]/80 via-[#071a3d]/55 to-[#071a3d]/35" />

        {/* Logo pada sudut kiri atas */}
        <img
          src={LOGO_LIGHT || logo}
          alt="Udin Rentcar"
          className={`absolute left-8 xl:left-14 top-8 hidden lg:block h-14 xl:h-[4.5rem] w-auto ${
            LOGO_LIGHT ? '' : 'brightness-0 invert'
          }`}
        />
      </div>

      {/* ───────── Konten ───────── */}
      <div className="relative z-10 grid min-h-screen lg:grid-cols-2">
        {/* Kiri: pesan + keunggulan (di atas gambar) */}
        <div className="hidden lg:flex items-center justify-end pr-10 xl:pr-24">
          <div className="w-full max-w-sm xl:max-w-md">
            <h1
              className={`font-display text-3xl xl:text-[2.5rem] font-bold leading-tight text-white`}
            >
              Solusi Terbaik
              <br />
              untuk Perjalanan Anda
            </h1>

            <p className="mt-4 text-base text-white/85 max-w-xs">
              Sewa mobil dengan mudah, aman dan terpercaya
              bersama Udin Rentcar.
            </p>

            <ul className="mt-10 flex items-stretch">
              {features.map(({ icon: Icon, title, sub }) => (
                <li
                  key={title}
                  className="px-4 xl:px-5 first:pl-0 border-l border-white/25 first:border-l-0"
                >
                  <div className="h-11 w-11 rounded-full bg-white/15 text-white backdrop-blur-sm flex items-center justify-center mb-3">
                    <Icon size={20} />
                  </div>

                  <p className={`text-sm font-semibold text-white`}>
                    {title}
                  </p>
                  <p className="text-sm text-white/70">
                    {sub}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Kanan: card login */}
        <div className="flex items-center justify-center px-5 py-10 sm:px-8 lg:pr-10 xl:pr-24">
          <div className="w-full max-w-[400px] rounded-3xl bg-white p-6 sm:p-7 shadow-[0_24px_60px_-18px_rgba(15,42,92,0.18)]">
            <img
              src={logo}
              alt="Udin Rentcar"
              className="h-10 w-auto mx-auto mb-5"
            />

            {step === 'credentials' ? (
              <>
                <h2
                  className={`font-display text-2xl font-bold ${NAVY}`}
                >
                  Masuk ke Akun
                </h2>

                <p className="mt-1 mb-5 text-sm text-[#8a97ad] max-w-xs">
                  Silakan login untuk melanjutkan ke sistem
                  rental kendaraan.
                </p>

                {error && (
                  <div className={errorBoxClass}>
                    <AlertCircle
                      size={16}
                      className="shrink-0"
                    />

                    {error}
                  </div>
                )}

                <form
                  onSubmit={handleSubmit}
                  className="space-y-4"
                >
                  <div className="group">
                    <label className="flex items-center gap-1.5 text-sm font-medium text-[#3a4a68] mb-1.5">
                      <span className="h-3 w-[3px] rounded-full bg-primary-500 opacity-0 transition group-focus-within:opacity-100" />
                      Email
                    </label>

                    <div className="relative">
                      <Mail
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5b6b87] pointer-events-none"
                      />

                      <input
                        type="email"
                        value={email}
                        onChange={(e) =>
                          setEmail(e.target.value)
                        }
                        className={inputClass}
                        placeholder="nama@gmail.com"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="group">
                    <label className="flex items-center gap-1.5 text-sm font-medium text-[#3a4a68] mb-1.5">
                      <span className="h-3 w-[3px] rounded-full bg-primary-500 opacity-0 transition group-focus-within:opacity-100" />
                      Password
                    </label>

                    <div className="relative">
                      <Lock
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5b6b87] pointer-events-none"
                      />

                      <input
                        type={
                          showPassword ? 'text' : 'password'
                        }
                        value={password}
                        onChange={(e) =>
                          setPassword(e.target.value)
                        }
                        className={`${inputClass} pr-12`}
                        placeholder="Masukkan password"
                        required
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword((v) => !v)
                        }
                        aria-label={
                          showPassword
                            ? 'Sembunyikan password'
                            : 'Tampilkan password'
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-[#5b6b87] hover:text-[#0f2a5c] transition"
                      >
                        {showPassword ? (
                          <Eye size={18} />
                        ) : (
                          <EyeOff size={18} />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className={primaryButtonClass}
                  >
                    {loading ? (
                      <>
                        <Loader2
                          size={16}
                          className="animate-spin"
                        />
                        Masuk...
                      </>
                    ) : (
                      <>
                        <LogIn size={18} />
                        Masuk
                      </>
                    )}
                  </button>
                </form>

                <div className="my-4 flex items-center gap-3 text-xs text-[#8a97ad]">
                  <span className="h-px flex-1 bg-[#e3e9f4]" />
                  atau
                  <span className="h-px flex-1 bg-[#e3e9f4]" />
                </div>

                <button
                  type="button"
                  onClick={() => navigate(FORGOT_PASSWORD_PATH)}
                  className="w-full h-11 rounded-xl border border-primary-200 bg-white text-primary-600 text-sm font-semibold hover:bg-primary-50 focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 focus:ring-offset-white transition flex items-center justify-center gap-2"
                >
                  <KeyRound size={18} />
                  Lupa password?
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={backToCredentials}
                  className="mb-5 inline-flex items-center gap-1 text-sm text-[#8a97ad] hover:text-[#0f2a5c] transition"
                >
                  <ArrowLeft size={14} />
                  Kembali
                </button>

                <div className="flex items-start gap-3 mb-5">
                  <div className="h-10 w-10 rounded-xl bg-[#e3edfc] text-primary-600 flex items-center justify-center shrink-0">
                    <ShieldCheck size={22} />
                  </div>

                  <div>
                    <h2
                      className={`font-display text-xl font-bold ${NAVY}`}
                    >
                      Verifikasi OTP
                    </h2>

                    <p className="text-sm text-[#8a97ad] mt-1">
                      Kode OTP 6 digit telah dikirim ke{' '}
                      <span className="font-medium text-[#3a4a68] break-all">
                        {email}
                      </span>
                      .
                    </p>
                  </div>
                </div>

                {otpError && (
                  <div className={errorBoxClass}>
                    <AlertCircle
                      size={16}
                      className="shrink-0"
                    />

                    {otpError}
                  </div>
                )}

                <form
                  onSubmit={handleVerify}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-[#3a4a68] mb-1.5">
                      Kode OTP
                    </label>

                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={otp}
                      onChange={(e) =>
                        setOtp(
                          e.target.value
                            .replace(/\D/g, '')
                            .slice(0, 6)
                        )
                      }
                      className="w-full py-3 rounded-xl border border-[#d9e2f1] bg-white text-center text-2xl font-bold tracking-[0.6em] pl-[0.6em] text-[#0f2a5c] placeholder:text-[#c3cde0] outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-400/30"
                      placeholder="000000"
                      required
                      autoFocus
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={
                      otpLoading || otp.length !== 6
                    }
                    className={primaryButtonClass}
                  >
                    {otpLoading ? (
                      <>
                        <Loader2
                          size={16}
                          className="animate-spin"
                        />
                        Memverifikasi...
                      </>
                    ) : (
                      'Verifikasi & Masuk'
                    )}
                  </button>
                </form>

                <div className="mt-5 text-center">
                  {resendIn > 0 ? (
                    <span className="text-sm text-[#8a97ad]">
                      Kirim ulang kode dalam {resendIn} detik
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={otpLoading}
                      className="text-sm font-semibold text-primary-600 hover:text-primary-700 transition disabled:opacity-50"
                    >
                      Kirim ulang kode
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}