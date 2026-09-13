import { useEffect, useRef, useState, type FormEvent } from 'react';

import { useNavigate } from 'react-router-dom';

import {
  Mail,
  Lock,
  Loader2,
  AlertCircle,
  ShieldCheck,
  ArrowLeft,
} from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';

import logo from '../assets/logorentcar.png';

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
    <div className="min-h-screen flex items-center justify-center bg-white px-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <img
            src={logo}
            alt="logo"
            className="h-14 w-auto mx-auto mb-4"
          />

          <p className="text-black-400 text-sm">
            Sistem Rental Kendaraan
          </p>
        </div>

        {step === 'credentials' ? (
          <div className="bg-white rounded-2xl border border-black-200 p-8">
            <h2 className="font-display text-lg font-semibold text-black mb-6">
              Masuk ke Akun
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-error-500/10 border border-error-500/20 text-error-500 text-sm rounded-lg flex items-center gap-2">
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
              <div>
                <label className="block text-sm font-medium text-black-700 mb-1.5">
                  Email
                </label>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail
                      size={16}
                      className="text-black-400"
                    />
                  </div>

                  <input
                    type="email"
                    value={email}
                    onChange={(e) =>
                      setEmail(e.target.value)
                    }
                    className="w-full pl-10 pr-4 py-2.5 bg-canvas border border-black-200 rounded-lg text-black placeholder-black-400 focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none transition text-sm"
                    placeholder="nama@gmail.com"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-black-700 mb-1.5">
                  Password
                </label>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock
                      size={16}
                      className="text-black-400"
                    />
                  </div>

                  <input
                    type="password"
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    className="w-full pl-10 pr-4 py-2.5 bg-canvas border border-black-200 rounded-lg text-black placeholder-black-400 focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none transition text-sm"
                    placeholder="Masukkan password"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 focus:ring-offset-white transition disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
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
                  'Masuk'
                )}
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-black-200 p-8">
            <button
              type="button"
              onClick={backToCredentials}
              className="mb-4 inline-flex items-center gap-1 text-sm text-black-400 hover:text-black-600 transition"
            >
              <ArrowLeft size={14} />
              Kembali
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                <ShieldCheck size={20} />
              </div>

              <div>
                <h2 className="font-display text-lg font-semibold text-black">
                  Verifikasi OTP
                </h2>

                <p className="text-sm text-black-400">
                  Kode OTP 6 digit telah dikirim ke{' '}
                  <span className="font-medium text-black-600">
                    {email}
                  </span>
                  .
                </p>
              </div>
            </div>

            {otpError && (
              <div className="mb-4 p-3 bg-error-500/10 border border-error-500/20 text-error-500 text-sm rounded-lg flex items-center gap-2">
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
                <label className="block text-sm font-medium text-black-700 mb-1.5">
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
                  className="w-full py-3 bg-canvas border border-black-200 rounded-lg text-center text-2xl font-bold tracking-[0.6em] pl-[0.6em] text-black placeholder-black-300 focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none transition"
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
                className="w-full py-2.5 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 focus:ring-offset-white transition disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
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

            <div className="mt-4 text-center">
              {resendIn > 0 ? (
                <span className="text-sm text-black-400">
                  Kirim ulang kode dalam {resendIn} detik
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={otpLoading}
                  className="text-sm font-medium text-primary-600 hover:text-primary-700 transition disabled:opacity-50"
                >
                  Kirim ulang kode
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}