import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { orderAPI, settingsAPI, type Order } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { formatHpDisplay, formatRupiah } from '../lib/format';
import { ArrowLeft } from 'lucide-react';

const DEFAULT_OVERTIME_RATE = 25000;

type StatusOrder = 'pending' | 'confirmed' | 'active' | 'perlu_verifikasi' | 'completed' | 'cancelled';

const statusOrderLabels: Record<StatusOrder, string> = {
    pending: 'Menunggu',
    confirmed: 'Dikonfirmasi',
    active: 'Sedang Disewa',
    perlu_verifikasi: 'Perlu Verifikasi',
    completed: 'Selesai',
    cancelled: 'Dibatalkan',
};

const statusPembayaranLabels: Record<string, string> = {
    unpaid: 'Belum Bayar',
    partial: 'DP / Sebagian',
    paid: 'Lunas',
};

const statusPengirimanLabels: Record<string, string> = {
    belum_diambil: 'Belum Diambil',
    sudah_diantarkan: 'Sudah Diantarkan',
    dalam_penyewaan: 'Dalam Penyewaan',
    selesai: 'Selesai',
    sudah_dikembalikan: 'Sudah Dikembalikan',
};

const metodePembayaranLabels: Record<string, string> = {
    cash: 'Tunai',
    transfer: 'Transfer',
    qris: 'QRIS',
    lainnya: 'Lainnya',
};

// Badge warna per domain status — token tema: primary (biru), accent (amber), success (hijau), error (merah)
const statusOrderColors: Record<string, string> = {
    pending: 'bg-accent-50 text-accent-700',
    confirmed: 'bg-primary-50 text-primary-500',
    active: 'bg-primary-100 text-primary-600',
    perlu_verifikasi: 'bg-accent-50 text-accent-700',
    completed: 'bg-success-50 text-success-600',
    cancelled: 'bg-error-50 text-error-600',
};

const statusPembayaranColors: Record<string, string> = {
    unpaid: 'bg-error-50 text-error-600',
    partial: 'bg-accent-50 text-accent-600',
    paid: 'bg-success-50 text-success-600',
};

const statusPengirimanColors: Record<string, string> = {
    belum_diambil: 'bg-accent-100 text-accent-700',
    sudah_diantarkan: 'bg-primary-50 text-primary-500',
    dalam_penyewaan: 'bg-primary-100 text-primary-600',
    selesai: 'bg-success-50 text-success-600',
    sudah_dikembalikan: 'bg-success-50 text-success-600',
};

const formatJam = (jam: number): string => {
    const hari = Math.floor(jam / 24);
    const sisaJam = jam % 24;
    if (hari === 0) return `${sisaJam} jam`;
    if (sisaJam === 0) return `${hari} hari`;
    return `${hari} hari ${sisaJam} jam`;
};

const fmtDate = (d: string | null | undefined) => {
    if (!d) return '-';
    const s = typeof d === 'string' ? d.split('T')[0] : d;
    return s || '-';
};

const fmtTime = (t: string | null | undefined) => {
    if (!t) return '';
    return t.length > 5 ? t.substring(0, 5) : t;
};

const SectionHeading = ({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) => (
    <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-black-500">
        {icon}
        {children}
    </div>
);

const UserIcon = () => (
    <svg className="h-4 w-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
);

const CarIcon = () => (
    <svg className="h-4 w-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17h.01M16 17h.01M3 11l1.5-5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.4L21 11M3 11h18M3 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-6" /></svg>
);

const DocumentIcon = () => (
    <svg className="h-4 w-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
);

const MapPinIcon = ({ color }: { color: string }) => (
    <svg className={`h-3.5 w-3.5 ${color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
);

const DetailsPinIcon = MapPinIcon;

const CalendarIcon = () => (
    <svg className="h-3.5 w-3.5 text-black-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
);

const PhoneIcon = () => (
    <svg className="h-3.5 w-3.5 shrink-0 text-black-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
);

const CloseIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

function DetailSkeleton() {
    return (
        <div className="space-y-6">
            <div className="skeleton h-5 w-56 rounded" />
            <div className="skeleton h-40 w-full rounded-2xl" />
            <div className="skeleton h-40 w-full rounded-2xl" />
        </div>
    );
}

export default function OrderDetail() {
    const { id } = useParams<{ id: string }>();
    const toast = useToast();
    const { user } = useAuth();
    const canManage = ['admin_utama', 'admin_operasional'].includes(user?.role ?? '');
    const [order, setOrder] = useState<Order | null>(null);
    const [overtimeRate, setOvertimeRate] = useState(DEFAULT_OVERTIME_RATE);
    const [tarifSupirGlobal, setTarifSupirGlobal] = useState(150000);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [showInvoice, setShowInvoice] = useState(false);

    const load = useCallback(async (silent = false) => {
        if (!id) return;
        if (!silent) setLoading(true);
        setNotFound(false);
        setErrorMsg(null);
        try {
            const { data } = await orderAPI.get(Number(id));
            setOrder(data);
        } catch (err) {
            if (isAxiosError(err) && err.response?.status === 404) {
                setNotFound(true);
            } else {
                const msg = isAxiosError(err) ? err.response?.data?.message : undefined;
                setErrorMsg(typeof msg === 'string' && msg ? msg : 'Terjadi kesalahan saat memuat detail order.');
            }
        } finally {
            if (!silent) setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        load();
        const interval = setInterval(() => void load(true), 30000);
        return () => clearInterval(interval);
    }, [load]);

    useEffect(() => {
        settingsAPI.get().then(({ data }) => {
            setOvertimeRate(data.overtime_rate_per_hour);
            if (data.biaya_dengan_driver_per_hari != null) {
                setTarifSupirGlobal(data.biaya_dengan_driver_per_hari);
            }
        }).catch(() => {});
    }, []);

    if (loading) {
        return (
            <div>
                <div className="mb-6">
                    <div className="skeleton h-8 w-40 rounded-lg" />
                    <div className="skeleton mt-2 h-4 w-64 rounded" />
                </div>
                <DetailSkeleton />
            </div>
        );
    }

    if (errorMsg) {
        return (
            <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-error-50 text-error-500">
                    <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M4.93 19h14.14a1 1 0 00.87-1.5L12.87 4.5a1 1 0 00-1.74 0L4.06 17.5A1 1 0 004.93 19z" />
                    </svg>
                </div>
                <h2 className="mt-4 text-lg font-semibold text-black-900">Gagal memuat detail order</h2>
                <p className="mt-1 max-w-sm text-sm text-black-500">{errorMsg}</p>
                <button
                    onClick={() => void load()}
                    className="mt-5 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600"
                >
                    Coba Lagi
                </button>
            </div>
        );
    }

    if (notFound || !order) {
        return (
            <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-error-50 text-error-500">
                    <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h2 className="mt-4 text-lg font-semibold text-black-900">Order tidak ditemukan</h2>
                <p className="mt-1 text-sm text-black-500">Data order ini tidak ada atau sudah dihapus.</p>
                <Link
                    to="/orders"
                    className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Kembali ke Orders
                </Link>
            </div>
        );
    }

    const isActiveOvertime = order.status_order === 'active' && order.jam_overtime_saat_ini > 0;
    const dendaTambahan =
      (order.status_order === 'active' || order.status_order === 'perlu_verifikasi') && order.jam_overtime_saat_ini > 0
        ? Number(order.denda_overtime_saat_ini || 0)
        : 0;

    return (
        <div>
            {/* Back + header */}
            <div className="mb-6">
                <Link
                    to="/orders"
                    className="inline-flex items-center gap-2 text-sm font-medium text-black-500 transition-colors hover:text-primary-600"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Kembali ke Orders
                </Link>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                    <h1 className="text-xl font-bold text-black-900">Detail Order</h1>
                    <button
                        onClick={() => {
                            navigator.clipboard?.writeText(order.kode_order);
                            toast.success('Kode order disalin');
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full bg-canvas px-2.5 py-1 font-mono text-xs font-medium text-black-600 transition-colors hover:bg-black-100"
                    >
                        {order.kode_order}
                        <svg className="h-3 w-3 text-black-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    </button>
                </div>
            </div>

            <div className="max-w-2xl space-y-4">
                {/* ── Status pills ── */}
                <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${statusOrderColors[order.status_order]}`}>
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                        {statusOrderLabels[order.status_order]}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${statusPembayaranColors[order.status_pembayaran]}`}>
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        {statusPembayaranLabels[order.status_pembayaran]}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${statusPengirimanColors[order.status_pengiriman]}`}>
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                        {statusPengirimanLabels[order.status_pengiriman]}
                    </span>
                    {order.source === 'katalog' && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-100 px-3 py-1.5 text-sm font-semibold text-primary-600">
                            Pesanan Katalog
                        </span>
                    )}
                    {order.metode_penyerahan === 'antar' && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-100 px-3 py-1.5 text-sm font-semibold text-accent-600">
                            Diantar
                        </span>
                    )}
                </div>

                {/* ── Customer ── */}
                <div className="rounded-2xl border border-gray-200 p-4">
                    <SectionHeading icon={<UserIcon />}>Customer</SectionHeading>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-600">
                                {order.customer?.nama_lengkap?.charAt(0)?.toLowerCase() || '?'}
                            </div>
                            <p className="truncate text-sm font-semibold text-black-900">{order.customer?.nama_lengkap}</p>
                        </div>
                        <div>
                            <p className="mb-1 text-xs text-black-400">No. HP</p>
                            <div className="flex items-center gap-1.5 text-sm text-black-700">
                                <PhoneIcon />
                                {formatHpDisplay(order.customer?.no_hp)}
                            </div>
                        </div>
                        {order.customer?.alamat && (
                            <div>
                                <p className="mb-1 text-xs text-black-400">Alamat</p>
                                <div className="flex items-start gap-1.5 text-sm text-black-700">
                                    <MapPinIcon color="text-black-300" />
                                    <span className="truncate">{order.customer.alamat}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Kendaraan ── */}
                <div className="rounded-2xl border border-gray-200 p-4">
                    <SectionHeading icon={<CarIcon />}>Kendaraan</SectionHeading>
                    <div className="flex flex-wrap items-start gap-4">
                        <div className="flex items-center gap-3">
                            {order.kendaraan?.foto ? (
                                <img src={`/storage/${order.kendaraan.foto}`} alt="" className="h-14 w-16 shrink-0 rounded-lg object-cover" />
                            ) : (
                                <div className="flex h-14 w-16 shrink-0 items-center justify-center rounded-lg bg-black-50 text-black-300">
                                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 17h.01M16 17h.01M3 11l1.5-5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.4L21 11M3 11h18" /></svg>
                                </div>
                            )}
                            <div>
                                <p className="text-sm font-semibold text-black-900">{order.kendaraan?.nama_kendaraan}</p>
                                <p className="font-mono text-xs text-black-400">{order.kendaraan?.plat_nomor}</p>
                                <span className="mt-1 inline-block rounded-full bg-canvas px-2 py-0.5 text-[11px] font-medium text-black-500">
                                    {order.durasi_hari} hari
                                </span>
                            </div>
                        </div>
                        {order.kendaraan?.kategori?.nama_kategori && (
                            <div>
                                <p className="mb-1 text-xs text-black-400">Kategori</p>
                                <span className="inline-block rounded-full bg-canvas px-2.5 py-1 text-xs font-medium text-black-700">{order.kendaraan.kategori.nama_kategori}</span>
                            </div>
                        )}
                        {order.kendaraan?.tipe?.nama_tipe && (
                            <div>
                                <p className="mb-1 text-xs text-black-400">Tipe</p>
                                <span className="inline-block rounded-full bg-canvas px-2.5 py-1 text-xs font-medium text-black-700">{order.kendaraan.tipe.nama_tipe}</span>
                            </div>
                        )}
                        {order.kendaraan?.garasiPartner && (
                            <div>
                                <p className="mb-1 text-xs text-black-400">Garasi</p>
                                <span className="inline-block rounded-full bg-canvas px-2.5 py-1 text-xs font-medium text-black-700">{order.kendaraan.garasiPartner.nama_partner}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Supir & Calo ── */}
                {(order.supir || order.calo || order.opsi_supir === 'dengan_supir') && (
                    <div className="rounded-2xl border border-gray-200 p-4">
                        <div className="mb-3 flex items-center gap-2">
                            <SectionHeading icon={<UserIcon />}>Supir & Calo</SectionHeading>
                            <span className={`ml-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${order.opsi_supir === 'dengan_supir' ? 'bg-primary-100 text-primary-700' : 'bg-canvas text-black-500'}`}>
                                {order.opsi_supir === 'dengan_supir' ? 'Dengan Supir' : 'Lepas Kunci'}
                            </span>
                        </div>
                        <div className="space-y-3">
                            {order.opsi_supir === 'dengan_supir' && !order.supir && (
                                <p className="text-xs text-black-400">Supir akan ditentukan dari petugas yang mengklaim task inspeksi.</p>
                            )}
                            {order.supir && (
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-100 text-sm font-bold text-accent-600">
                                            {order.supir.nama?.charAt(0)?.toUpperCase() || '?'}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-black-900">{order.supir.nama}</p>
                                            <p className="text-xs text-black-400">Supir</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-sm text-black-700">
                                        <PhoneIcon />
                                        {formatHpDisplay(order.supir.no_hp)}
                                    </div>
                                </div>
                            )}
                            {order.calo && (
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-100 text-sm font-bold text-accent-600">
                                            {order.calo.nama?.charAt(0)?.toUpperCase() || '?'}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-black-900">{order.calo.nama}</p>
                                            <p className="text-xs text-black-400">Calo</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-sm text-black-700">
                                        <PhoneIcon />
                                        {formatHpDisplay(order.calo.no_hp)}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Rincian Biaya ── */}
                <div className="space-y-3 rounded-2xl border border-primary-100 bg-primary-50 p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary-500">
                        <DocumentIcon />
                        Rincian Biaya
                    </div>
                    <div className="flex items-start justify-between gap-4 border-t border-primary-100/70 pt-3">
                        <div>
                            <p className="text-sm font-semibold text-black-900">Sewa Kendaraan</p>
                            <p className="text-xs text-black-500">
                                {order.durasi_hari} hari × {formatRupiah(order.harga_per_hari)}/hari
                            </p>
                            <p className="mt-0.5 text-xs text-black-400">
                                {fmtDate(order.tanggal_mulai)} {fmtTime(order.jam_mulai) || '08:00'} → {fmtDate(order.tanggal_selesai)}{' '}
                                {fmtTime(order.jam_selesai) || '17:00'} WIB
                            </p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold text-black-900">{formatRupiah(Number(order.harga_per_hari) * order.durasi_hari)}</p>
                    </div>
                    {order.jam_overtime > 0 && (
                        <div className="flex items-start justify-between gap-4 border-t border-primary-100/70 pt-3">
                            <div>
                                <p className="text-sm font-semibold text-error-600">Denda Overtime</p>
                                <p className="text-xs text-error-500">
                                    {formatJam(order.jam_overtime)} × {formatRupiah(overtimeRate)}/jam
                                </p>
                            </div>
                            <p className="shrink-0 text-sm font-semibold text-error-600">{formatRupiah(order.denda_overtime)}</p>
                        </div>
                    )}
                    {isActiveOvertime && (
                        <div className="flex items-start justify-between gap-4 border-t border-primary-100/70 pt-3">
                            <div>
                                <p className="text-sm font-semibold text-error-600">Overtime saat ini</p>
                                <p className="text-xs text-error-500">
                                    {formatJam(order.jam_overtime_saat_ini)} × {formatRupiah(overtimeRate)}/jam
                                </p>
                            </div>
                            <p className="shrink-0 text-sm font-semibold text-error-600">{formatRupiah(order.denda_overtime_saat_ini)}</p>
                        </div>
                    )}
                    <div className="flex items-center justify-between border-t border-primary-200 pt-3">
                        <span className="text-sm font-semibold text-black-900">Total</span>
                        <span className="text-lg font-bold text-primary-600">
                            {formatRupiah(Number(order.harga_total) + dendaTambahan)}
                        </span>
                    </div>
                </div>

                {/* ── Alamat Jemput / Tujuan / Tanggal & Waktu ── */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {order.alamat_jemput && (
                        <div className="rounded-xl bg-canvas p-3">
                            <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-black-400">
                                <DetailsPinIcon color="text-green-500" />
                                {order.metode_penyerahan === 'antar' ? 'Alamat Pengantaran' : 'Alamat Jemput'}
                            </div>
                            <p className="text-sm font-medium text-black-800">{order.alamat_jemput}</p>
                        </div>
                    )}
                    {order.tujuan && (
                        <div className="rounded-xl bg-canvas p-3">
                            <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-black-400">
                                <DetailsPinIcon color="text-primary-500" />
                                Tujuan
                            </div>
                            <p className="text-sm font-medium text-black-800">{order.tujuan}</p>
                        </div>
                    )}
                    <div className="rounded-xl bg-canvas p-3">
                        <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-black-400">
                            <CalendarIcon />
                            Tanggal & Waktu
                        </div>
                        <p className="text-sm font-medium text-black-800">
                            {fmtDate(order.tanggal_mulai)} {fmtTime(order.jam_mulai) || '08:00'}
                        </p>
                        <p className="text-xs text-black-500">
                            s/d {fmtDate(order.tanggal_selesai)} {fmtTime(order.jam_selesai) || '17:00'} WIB
                        </p>
                    </div>
                </div>

                {/* ── Catatan ── */}
                {order.catatan && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                        <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-700">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            Catatan
                        </div>
                        <p className="whitespace-pre-wrap text-sm text-black-700">{order.catatan}</p>
                    </div>
                )}

                {/* ── Bukti Dokumen ── */}
                {(order.bukti_transfer || order.bukti_pengiriman || order.bukti_pengembalian) && (
                    <div className="rounded-2xl border border-gray-200 p-4">
                        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-black-500">
                            <DocumentIcon />
                            Bukti Dokumen
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            {order.bukti_transfer && (
                                <div>
                                    <p className="mb-1.5 text-xs text-black-400">Bukti Pembayaran</p>
                                    <a href={`/storage/${order.bukti_transfer}`} target="_blank" rel="noopener noreferrer">
                                        <img
                                            src={`/storage/${order.bukti_transfer}`}
                                            alt="Bukti Transfer"
                                            className="h-24 w-full cursor-pointer rounded-xl border border-gray-200 object-cover transition-all hover:ring-2 hover:ring-primary-400 sm:h-32"
                                        />
                                    </a>
                                </div>
                            )}
                            {order.bukti_pengiriman && (
                                <div>
                                    <p className="mb-1.5 text-xs text-black-400">Bukti Pengiriman</p>
                                    <a href={`/storage/${order.bukti_pengiriman}`} target="_blank" rel="noopener noreferrer">
                                        <img
                                            src={`/storage/${order.bukti_pengiriman}`}
                                            alt="Bukti Pengiriman"
                                            className="h-24 w-full cursor-pointer rounded-xl border border-gray-200 object-cover transition-all hover:ring-2 hover:ring-primary-400 sm:h-32"
                                        />
                                    </a>
                                </div>
                            )}
                            {order.bukti_pengembalian && (
                                <div>
                                    <p className="mb-1.5 text-xs text-black-400">Bukti Pengembalian</p>
                                    <a href={`/storage/${order.bukti_pengembalian}`} target="_blank" rel="noopener noreferrer">
                                        <img
                                            src={`/storage/${order.bukti_pengembalian}`}
                                            alt="Bukti Pengembalian"
                                            className="h-24 w-full cursor-pointer rounded-xl border border-gray-200 object-cover transition-all hover:ring-2 hover:ring-primary-400 sm:h-32"
                                        />
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Footer: audit info + Lihat Invoice ── */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4">
                    <div className="flex flex-wrap items-center gap-5 text-xs text-black-400">
                        <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-black-50 text-black-300">
                                <UserIcon />
                            </div>
                            <div>
                                <p>Dibuat oleh</p>
                                <p className="font-medium text-black-700">{order.admin?.name || '-'}</p>
                                <p>{order.created_at ? new Date(order.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-black-50 text-black-300">
                                <UserIcon />
                            </div>
                            <div>
                                <p>Diperbarui oleh</p>
                                <p className="font-medium text-black-700">{order.admin?.name || '-'}</p>
                                <p>{order.updated_at ? new Date(order.updated_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</p>
                            </div>
                        </div>
                    </div>
                    {order.status_order === 'completed' && canManage && (
                        <button
                            onClick={() => setShowInvoice(true)}
                            className="flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600"
                        >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                                />
                            </svg>
                            Lihat Invoice
                        </button>
                    )}
                </div>
            </div>

            {/* Invoice Modal */}
            {showInvoice && order && (
                <div className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-black/50 p-4" onClick={() => setShowInvoice(false)}>
                    <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
                        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white p-6 print:hidden">
                            <h2 className="text-lg font-semibold text-black-900">Invoice Sewa Kendaraan</h2>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => window.print()}
                                    className="rounded-lg p-1.5 text-black-400 transition-colors hover:bg-primary-50 hover:text-primary-600"
                                    title="Cetak Invoice"
                                >
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                                        />
                                    </svg>
                                </button>
                                <button onClick={() => setShowInvoice(false)} className="rounded-lg p-1 transition-colors hover:bg-canvas" aria-label="Tutup">
                                    <CloseIcon />
                                </button>
                            </div>
                        </div>
                        <div className="space-y-5 p-6" id="invoice-content">
                            <div className="border-b border-gray-200 pb-4 text-center">
                                <h1 className="text-xl font-bold text-black-900">UDIN RENCTCAR</h1>
                                <p className="mt-1 text-xs text-black-400">Sistem Manajemen Rental Kendaraan</p>
                                <p className="mt-0.5 text-xs text-black-400">Jl. Contoh Alamat No. 123, Bandung</p>
                            </div>

                            <div className="flex justify-between text-sm">
                                <div>
                                    <p className="text-xs text-black-400">Invoice</p>
                                    <p className="font-mono font-bold text-black-900">{order.kode_order}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-black-400">Tanggal</p>
                                    <p className="text-black-900">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                </div>
                            </div>

                            <div className="rounded-xl bg-canvas p-3 text-sm">
                                <p className="mb-1 text-xs text-black-400">Disewa oleh</p>
                                <p className="font-medium text-black-900">{order.customer?.nama_lengkap}</p>
                                <p className="text-xs text-black-700">{formatHpDisplay(order.customer?.no_hp)}</p>
                                {order.customer?.alamat && <p className="text-xs text-black-400">{order.customer.alamat}</p>}
                            </div>

                            <div className="rounded-xl bg-canvas p-3 text-sm">
                                <p className="mb-1 text-xs text-black-400">Kendaraan</p>
                                <p className="font-medium text-black-900">{order.kendaraan?.nama_kendaraan}</p>
                                <p className="font-mono text-xs text-black-700">{order.kendaraan?.plat_nomor}</p>
                            </div>

                            {(order.supir || order.calo) && (
                                <div className="rounded-xl bg-canvas p-3 text-sm">
                                    <p className="mb-1 text-xs text-black-400">Supir & Calo</p>
                                    {order.supir && <p className="font-medium text-black-900">Supir: {order.supir.nama}</p>}
                                    {order.calo && (
                                        <p className="text-xs text-black-700">
                                            Calo: {order.calo.nama}
                                            {order.calo.komisi ? ` (${formatRupiah(order.calo.komisi)})` : ''}
                                        </p>
                                    )}
                                </div>
                            )}

                            <div className="text-sm">
                                <p className="mb-2 text-xs text-black-400">Periode Sewa</p>
                                <div className="space-y-1">
                                    <div className="flex justify-between">
                                        <span className="text-black-700">Mulai</span>
                                        <span className="text-black-900">
                                            {fmtDate(order.tanggal_mulai)}
                                            {order.jam_mulai ? `, ${fmtTime(order.jam_mulai)} WIB` : ''}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-black-700">Selesai</span>
                                        <span className="text-black-900">
                                            {fmtDate(order.tanggal_selesai)}
                                            {order.jam_selesai ? `, ${fmtTime(order.jam_selesai)} WIB` : ''}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 border-t border-gray-200 pt-4 text-sm">
                                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-black-400">Rincian Biaya</p>
                                <div className="flex justify-between">
                                    <span className="text-black-700">
                                        Sewa {order.durasi_hari} hari × {formatRupiah(order.harga_per_hari)}/hari
                                    </span>
                                    <span className="text-black-900">{formatRupiah(order.durasi_hari * order.harga_per_hari)}</span>
                                </div>
                                {order.opsi_supir === 'dengan_supir' ? (
                                    <div className="flex justify-between">
                                        <span className="text-black-700">
                                            Supir {order.durasi_hari} hari × {formatRupiah(tarifSupirGlobal)}/hari
                                        </span>
                                        <span className="text-black-900">{formatRupiah(order.durasi_hari * tarifSupirGlobal)}</span>
                                    </div>
                                ) : order.supir && order.supir.tarif_per_hari ? (
                                    <div className="flex justify-between">
                                        <span className="text-black-700">
                                            Supir {order.durasi_hari} hari × {formatRupiah(order.supir.tarif_per_hari)}/hari
                                        </span>
                                        <span className="text-black-900">{formatRupiah(order.durasi_hari * order.supir.tarif_per_hari)}</span>
                                    </div>
                                ) : null}
{order.jam_overtime > 0 && order.status_order !== 'active' && (
                                    <div className="flex justify-between">
                                        <span className="text-error-600">
                                            Denda keterlambatan {formatJam(order.jam_overtime)} × {formatRupiah(overtimeRate)}
                                        </span>
                                        <span className="font-medium text-error-600">{formatRupiah(order.denda_overtime)}</span>
                                    </div>
                                )}
                                <div className="flex items-center justify-between border-t border-gray-200 pt-2">
                                    <span className="font-semibold text-black-900">Total</span>
                                    <span className="text-xl font-bold text-black-900">{formatRupiah(order.harga_total)}</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between border-t border-gray-200 pt-2 text-xs text-black-400">
                                <div className="flex items-center gap-3">
                                    <span>
                                        Status: <span className="font-semibold text-black-700">{statusPembayaranLabels[order.status_pembayaran]}</span>
                                    </span>
                                    <span>
                                        Bayar: <span className="font-semibold text-black-700">{(order.metode_pembayaran && metodePembayaranLabels[order.metode_pembayaran]) || '-'}</span>
                                    </span>
                                </div>
                                <span>{order.admin?.name ? `Dikelola oleh ${order.admin.name}` : ''}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}