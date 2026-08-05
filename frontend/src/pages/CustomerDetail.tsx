import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { customerAPI, type Customer, type Order } from '../services/api';
import { formatHpDisplay, formatHpWa, formatRupiah } from '../lib/format';
import { ArrowLeft, Phone, Search, X, FileText, Clock, CheckCircle2, XCircle, AlertCircle, Truck, MapPin, Calendar, User, Phone as PhoneIcon, Hash, Tag, DollarSign, Info, Image as ImageIcon, CreditCard, RefreshCw } from 'lucide-react';

const inputClass =
    'w-full rounded-lg border border-black-200 px-3 py-2 text-sm text-black-900 outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500';

const statusOrderLabels: Record<string, string> = {
    pending: 'Menunggu',
    confirmed: 'Dikonfirmasi',
    active: 'Aktif',
    completed: 'Selesai',
    cancelled: 'Dibatalkan',
};

const statusColors: Record<string, string> = {
    pending: 'bg-accent-100 text-accent-700',
    confirmed: 'bg-primary-50 text-primary-500',
    active: 'bg-accent-50 text-accent-600',
    completed: 'bg-black-200 text-black-700',
    cancelled: 'bg-error-50 text-error-600',
};

const statusFilters = [
    { key: 'all', label: 'Semua' },
    { key: 'active', label: 'Aktif' },
    { key: 'completed', label: 'Selesai' },
    { key: 'cancelled', label: 'Dibatalkan' },
    { key: 'pending', label: 'Menunggu' },
];

function DetailSkeleton() {
    return (
        <div className="space-y-6">
            <div className="skeleton h-5 w-48 rounded" />
            <div className="skeleton h-40 w-full rounded-2xl" />
            <div className="skeleton h-24 w-full rounded-2xl" />
            <div className="skeleton h-64 w-full rounded-2xl" />
        </div>
    );
}

function FotoModal({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
            <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
                <button
                    onClick={onClose}
                    className="absolute -top-3 -right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white text-black-600 shadow-lg hover:bg-accent-50"
                >
                    <X size={16} />
                </button>
                <img src={src} alt={alt} className="max-h-[85vh] max-w-[85vw] rounded-lg object-contain shadow-2xl" />
            </div>
        </div>
    );
}

function OrderDetailModal({ order, onClose }: { order: Order; onClose: () => void }) {
    const getStatusBadge = (status: string, type: 'order' | 'pembayaran' | 'pengiriman') => {
        const labels: Record<string, string> = {
            pending: 'Menunggu',
            confirmed: 'Dikonfirmasi',
            active: 'Aktif',
            completed: 'Selesai',
            cancelled: 'Dibatalkan',
            unpaid: 'Belum Bayar',
            partial: 'DP',
            paid: 'Lunas',
            belum_diambil: 'Belum Diambil',
            sudah_diantarkan: 'Sudah Diantarkan',
            dalam_penyewaan: 'Dalam Penyewaan',
            selesai: 'Selesai',
        };
        const colors: Record<string, string> = {
            pending: 'bg-accent-100 text-accent-700',
            confirmed: 'bg-primary-50 text-primary-500',
            active: 'bg-accent-50 text-accent-600',
            completed: 'bg-black-200 text-black-700',
            cancelled: 'bg-error-50 text-error-600',
            unpaid: 'bg-error-50 text-error-600',
            partial: 'bg-primary-50 text-primary-500',
            paid: 'bg-success-50 text-success-600',
            belum_diambil: 'bg-accent-100 text-accent-700',
            sudah_diantarkan: 'bg-primary-50 text-primary-500',
            dalam_penyewaan: 'bg-accent-50 text-accent-600',
            selesai: 'bg-black-200 text-black-700',
        };
        return (
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors[status] || 'bg-black-200 text-black-600'}`}>
                {labels[status] || status}
            </span>
        );
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-';
        return new Date(dateStr + 'T00:00:00').toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };

    const k = order.kendaraan;
    const s = order.supir;
    const c = order.calo;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Detail pesanan"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-black-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
                    <div className="flex items-center gap-3">
                        <h2 className="text-lg font-bold text-black">Detail Pesanan</h2>
                        <span className="text-xs font-mono text-black-400 bg-canvas px-2 py-0.5 rounded">{order.kode_order}</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent-100 transition-colors"
                        aria-label="Tutup"
                    >
                        <X size={16} className="text-black-400" />
                    </button>
                </div>

                <div className="px-6 py-5 space-y-5">
                    <div className="flex flex-wrap gap-2">
                        {getStatusBadge(order.status_order, 'order')}
                        {getStatusBadge(order.status_pembayaran, 'pembayaran')}
                        {getStatusBadge(order.status_pengiriman, 'pengiriman')}
                        {order.source === 'katalog' && (
                            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-primary-50 text-primary-500">
                                <Tag size={10} /> Katalog
                            </span>
                        )}
                    </div>

                    <div className="bg-canvas rounded-xl p-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-black-400 mb-3">Pelanggan</h3>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-sm">
                                {order.customer?.nama_lengkap?.charAt(0) || '?'}
                            </div>
                            <div>
                                <p className="font-medium text-black-900">{order.customer?.nama_lengkap || '-'}</p>
                                <p className="text-sm text-black-400">{formatHpDisplay(order.customer?.no_hp || '')}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-canvas rounded-xl p-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-black-400 mb-3">Kendaraan</h3>
                        <div className="flex gap-4">
                            {k?.foto ? (
                                <img
                                    src={`/storage/${k.foto}`}
                                    alt={k.nama_kendaraan}
                                    className="w-24 h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                                />
                            ) : (
                                <div className="w-24 h-20 bg-black-200 rounded-lg flex items-center justify-center">
                                    <ImageIcon size={24} className="text-black-400" />
                                </div>
                            )}
                            <div className="space-y-1">
                                <p className="font-medium text-black-900">{k?.nama_kendaraan || '-'}</p>
                                <p className="text-sm text-black-400">
                                    {k?.merek} {k?.model} {k?.tahun}
                                </p>
                                {k?.plat_nomor && (
                                    <p className="text-xs text-black-400">Plat: {k.plat_nomor}</p>
                                )}
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {order.durasi_hari && (
                                        <span className="text-xs bg-white px-2 py-0.5 rounded-full text-black-500 border border-black-200">
                                            {order.durasi_hari} hari
                                        </span>
                                    )}
                                    {k?.kategori && (
                                        <span className="text-xs bg-white px-2 py-0.5 rounded-full text-black-500 border border-black-200">
                                            {k.kategori.nama_kategori}
                                        </span>
                                    )}
                                    {k?.tipe && (
                                        <span className="text-xs bg-white px-2 py-0.5 rounded-full text-black-500 border border-black-200">
                                            {k.tipe.nama_tipe}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {(s || c) && (
                        <div className="bg-canvas rounded-xl p-4">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-black-400 mb-3">Supir / Calo</h3>
                            <div className="flex gap-4">
                                {s && (
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-accent-100 flex items-center justify-center text-accent-600 font-bold text-xs">
                                            {s.nama.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-black-900">{s.nama}</p>
                                            <p className="text-xs text-black-400">Supir &middot; {formatHpDisplay(s.no_hp)}</p>
                                        </div>
                                    </div>
                                )}
                                {c && (
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-xs">
                                            {c.nama.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-black-900">{c.nama}</p>
                                            <p className="text-xs text-black-400">Calo &middot; {formatHpDisplay(c.no_hp)}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="bg-canvas rounded-xl p-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-black-400 mb-3">Rincian Biaya</h3>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-black-400">Harga/hari</span>
                                <span className="font-medium text-black-900">{formatRupiah(order.harga_per_hari)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-black-400">Durasi</span>
                                <span className="font-medium text-black-900">{order.durasi_hari} hari</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-black-400">Subtotal</span>
                                <span className="font-medium text-black-900">{formatRupiah(order.harga_total)}</span>
                            </div>
                            {order.jam_overtime && order.jam_overtime > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-black-400">Overtime ({order.jam_overtime} jam)</span>
                                    <span className="font-medium text-error-600">{formatRupiah(order.denda_overtime)}</span>
                                </div>
                            )}
                            {order.biaya_pembatalan && order.biaya_pembatalan > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-black-400">Biaya Pembatalan</span>
                                    <span className="font-medium text-error-600">{formatRupiah(order.biaya_pembatalan)}</span>
                                </div>
                            )}
                            {order.total_refund && order.total_refund > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-black-400">Total Refund</span>
                                    <span className="font-medium text-success-600">{formatRupiah(order.total_refund)}</span>
                                </div>
                            )}
                            <div className="border-t border-black-200 pt-2 flex justify-between">
                                <span className="font-semibold text-black">Total</span>
                                <span className="font-bold text-primary-600">{formatRupiah(order.harga_total)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-canvas rounded-xl p-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-black-400 mb-3">Alamat & Waktu</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                            <div>
                                <p className="text-xs text-black-400 mb-1">Alamat Jemput</p>
                                <p className="font-medium text-black-900">{order.alamat_jemput || '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-black-400 mb-1">Tujuan</p>
                                <p className="font-medium text-black-900">{order.tujuan || '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-black-400 mb-1">Periode Sewa</p>
                                <p className="font-medium text-black-900">
                                    {formatDate(order.tanggal_mulai)}
                                    {order.jam_mulai && `, ${order.jam_mulai}`}
                                    {' - '}
                                    {formatDate(order.tanggal_selesai)}
                                    {order.jam_selesai && `, ${order.jam_selesai}`}
                                </p>
                            </div>
                        </div>
                        {order.tanggal_jatuh_tempo && (
                            <div className="mt-3 pt-3 border-t border-black-200 flex items-center gap-2 text-sm">
                                <Clock size={14} className="text-black-400" />
                                <span className="text-black-400">Jatuh tempo:</span>
                                <span className="font-medium text-black-900">{formatDate(order.tanggal_jatuh_tempo)}</span>
                            </div>
                        )}
                    </div>

                    {order.catatan && (
                        <div className="bg-accent-50 rounded-xl p-4">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-accent-600 mb-2">Catatan</h3>
                            <p className="text-sm text-black-700 whitespace-pre-line">{order.catatan}</p>
                        </div>
                    )}

                    {order.alasan_pembatalan && (
                        <div className="bg-error-50 rounded-xl p-4">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-error-600 mb-2">Alasan Pembatalan</h3>
                            <p className="text-sm text-black-700">{order.alasan_pembatalan}</p>
                        </div>
                    )}

                    {(order.bukti_transfer || order.bukti_pengiriman || order.bukti_pengembalian) && (
                        <div className="bg-canvas rounded-xl p-4">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-black-400 mb-3">Bukti Dokumen</h3>
                            <div className="flex flex-wrap gap-4">
                                {order.bukti_transfer && (
                                    <div className="text-center">
                                        <p className="text-xs text-black-400 mb-1">Bukti Transfer</p>
                                        <a
                                            href={`/storage/${order.bukti_transfer}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block w-20 h-20 rounded-lg border border-black-200 overflow-hidden hover:border-primary-300 transition-colors"
                                        >
                                            <img src={`/storage/${order.bukti_transfer}`} alt="Bukti transfer" className="w-full h-full object-cover" />
                                        </a>
                                    </div>
                                )}
                                {order.bukti_pengiriman && (
                                    <div className="text-center">
                                        <p className="text-xs text-black-400 mb-1">Bukti Pengiriman</p>
                                        <a
                                            href={`/storage/${order.bukti_pengiriman}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block w-20 h-20 rounded-lg border border-black-200 overflow-hidden hover:border-primary-300 transition-colors"
                                        >
                                            <img src={`/storage/${order.bukti_pengiriman}`} alt="Bukti pengiriman" className="w-full h-full object-cover" />
                                        </a>
                                    </div>
                                )}
                                {order.bukti_pengembalian && (
                                    <div className="text-center">
                                        <p className="text-xs text-black-400 mb-1">Bukti Pengembalian</p>
                                        <a
                                            href={`/storage/${order.bukti_pengembalian}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block w-20 h-20 rounded-lg border border-black-200 overflow-hidden hover:border-primary-300 transition-colors"
                                        >
                                            <img src={`/storage/${order.bukti_pengembalian}`} alt="Bukti pengembalian" className="w-full h-full object-cover" />
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex flex-wrap gap-4 text-xs text-black-400">
                        <span className="flex items-center gap-1">
                            <CreditCard size={12} /> Metode: {order.metode_pembayaran || '-'}
                        </span>
                        {order.created_at && (
                            <span className="flex items-center gap-1">
                                <Clock size={12} /> Dibuat: {new Date(order.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                        )}
                        {order.updated_at && (
                            <span className="flex items-center gap-1">
                                <RefreshCw size={12} /> Diperbarui: {new Date(order.updated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function CustomerDetail() {
    const { id } = useParams<{ id: string }>();
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');
    const [zoomImage, setZoomImage] = useState<string | null>(null);
    const [zoomAlt, setZoomAlt] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    useEffect(() => {
        if (!id) {
            setNotFound(true);
            setLoading(false);
            return;
        }
        setLoading(true);
        setNotFound(false);
        customerAPI
            .get(Number(id))
            .then(({ data }) => {
                setCustomer(data as unknown as Customer);
            })
            .catch(() => setNotFound(true))
            .finally(() => setLoading(false));
    }, [id]);

    const filteredOrders = useMemo(() => {
        if (!customer?.orders) return [];
        if (statusFilter === 'all') return customer.orders;
        return customer.orders.filter((o) => o.status_order === statusFilter);
    }, [customer?.orders, statusFilter]);

    const stats = useMemo(() => {
        if (!customer?.orders) return { total: 0, count: 0, totalSpent: 0, avgSpend: 0, activeCount: 0 };
        const orders = customer.orders;
        const completed = orders.filter((o) => o.status_order === 'completed');
        const totalSpent = completed.reduce((sum, o) => sum + Number(o.harga_total || 0), 0);
        return {
            total: orders.length,
            count: orders.length,
            totalSpent,
            avgSpend: completed.length > 0 ? totalSpent / completed.length : 0,
            activeCount: orders.filter((o) => o.status_order === 'active').length,
        };
    }, [customer?.orders]);

    const openZoom = (src: string, alt: string) => {
        setZoomImage(src);
        setZoomAlt(alt);
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <DetailSkeleton />
            </div>
        );
    }

    if (notFound || !customer) {
        return (
            <div className="space-y-6">
                <Link to="/customers" className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700">
                    <ArrowLeft size={16} /> Kembali ke Daftar Pelanggan
                </Link>
                <div className="flex flex-col items-center justify-center rounded-2xl border border-black-200 bg-white py-20 text-center">
                    <FileText size={48} className="mb-4 text-black-400" />
                    <h2 className="text-lg font-semibold text-black-700">Customer tidak ditemukan</h2>
                    <p className="mt-1 text-sm text-black-400">Data mungkin telah dihapus atau tidak tersedia.</p>
                </div>
            </div>
        );
    }

    const waNumber = formatHpWa(customer.no_hp);
    const waLink = `https://wa.me/${waNumber}?text=${encodeURIComponent(`Halo ${customer.nama_lengkap},`)}`;

    return (
        <div className="space-y-6">
            {zoomImage && <FotoModal src={zoomImage} alt={zoomAlt} onClose={() => setZoomImage(null)} />}
            {selectedOrder && <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}

            {/* Back link */}
            <Link to="/customers" className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700">
                <ArrowLeft size={16} /> Kembali ke Daftar Pelanggan
            </Link>

            {/* Data Diri */}
            <div className="rounded-2xl border border-black-200 bg-white p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                        <h1 className="font-display text-2xl font-bold text-black-900">{customer.nama_lengkap}</h1>
                        <p className="text-sm text-black-500">{formatHpDisplay(customer.no_hp)}</p>
                        {customer.email && <p className="text-sm text-black-500">{customer.email}</p>}
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-black-500">
                            {customer.no_ktp && (
                                <span>
                                    KTP: <span className="font-mono font-medium text-black-700">{customer.no_ktp}</span>
                                </span>
                            )}
                            {customer.no_sim && (
                                <span>
                                    SIM: <span className="font-mono font-medium text-black-700">{customer.no_sim}</span>
                                </span>
                            )}
                        </div>
                        {customer.alamat && <p className="text-sm text-black-500">{customer.alamat}</p>}
                        {customer.catatan && (
                            <p className="rounded-lg bg-accent-50 px-3 py-2 text-sm text-black-600">{customer.catatan}</p>
                        )}
                    </div>
                    <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-accent-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-600"
                    >
                        <Phone size={16} /> Hubungi
                    </a>
                </div>
            </div>

            {/* Dokumen Identitas */}
            {(customer.foto_ktp || customer.foto_sim) && (
                <div className="rounded-2xl border border-black-200 bg-white p-6">
                    <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-black-400">Dokumen Identitas</h2>
                    <div className="flex flex-wrap gap-4">
                        {customer.foto_ktp && (
                            <div className="space-y-2">
                                <p className="text-xs font-medium text-black-500">KTP</p>
                                <img
                                    src={`/storage/${customer.foto_ktp}`}
                                    alt={`KTP ${customer.nama_lengkap}`}
                                    className="h-32 w-48 cursor-pointer rounded-lg border border-black-200 object-cover transition-shadow hover:shadow-md"
                                    onClick={() => openZoom(`/storage/${customer.foto_ktp}`, `KTP ${customer.nama_lengkap}`)}
                                />
                            </div>
                        )}
                        {customer.foto_sim && (
                            <div className="space-y-2">
                                <p className="text-xs font-medium text-black-500">SIM</p>
                                <img
                                    src={`/storage/${customer.foto_sim}`}
                                    alt={`SIM ${customer.nama_lengkap}`}
                                    className="h-32 w-48 cursor-pointer rounded-lg border border-black-200 object-cover transition-shadow hover:shadow-md"
                                    onClick={() => openZoom(`/storage/${customer.foto_sim}`, `SIM ${customer.nama_lengkap}`)}
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Statistik */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-2xl border border-black-200 bg-white p-4 text-center">
                    <p className="text-2xl font-bold text-black-900">{stats.count}</p>
                    <p className="text-xs text-black-400">Total Order</p>
                </div>
                <div className="rounded-2xl border border-black-200 bg-white p-4 text-center">
                    <p className="text-2xl font-bold text-accent-600">{stats.activeCount}</p>
                    <p className="text-xs text-black-400">Order Aktif</p>
                </div>
                <div className="rounded-2xl border border-black-200 bg-white p-4 text-center">
                    <p className="text-2xl font-bold text-black-900">{formatRupiah(stats.totalSpent)}</p>
                    <p className="text-xs text-black-400">Total Pengeluaran</p>
                </div>
                <div className="rounded-2xl border border-black-200 bg-white p-4 text-center">
                    <p className="text-2xl font-bold text-black-900">{formatRupiah(stats.avgSpend)}</p>
                    <p className="text-xs text-black-400">Rata-rata Sewa</p>
                </div>
            </div>

            {/* Riwayat Pemesanan */}
            <div className="rounded-2xl border border-black-200 bg-white">
                <div className="flex flex-col gap-3 border-b border-black-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="font-display text-lg font-bold text-black-900">Riwayat Pemesanan</h2>
                    <div className="flex flex-wrap gap-2">
                        {statusFilters.map((f) => (
                            <button
                                key={f.key}
                                onClick={() => setStatusFilter(f.key)}
                                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                                    statusFilter === f.key
                                        ? 'bg-primary-500 text-white'
                                        : 'bg-black-200 text-black-600 hover:bg-black-200'
                                }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {filteredOrders.length === 0 ? (
                    <div className="flex flex-col items-center py-16 text-center">
                        <Search size={40} className="mb-3 text-black-400" />
                        <p className="text-sm text-black-500">
                            {statusFilter === 'all' ? 'Belum ada riwayat pemesanan.' : 'Tidak ada order dengan status ini.'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-black-200 text-xs uppercase tracking-wider text-black-400">
                                    <th className="px-6 py-3">Kode</th>
                                    <th className="px-6 py-3">Kendaraan</th>
                                    <th className="px-6 py-3">Periode</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3 text-right">Total</th>
                                    <th className="px-6 py-3 text-right"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black-200">
                                {filteredOrders.map((order) => (
                                    <tr
                                        key={order.id}
                                        className="cursor-pointer transition-colors hover:bg-accent-50"
                                        onClick={() => setSelectedOrder(order)}
                                    >
                                        <td className="whitespace-nowrap px-6 py-3 font-medium text-black-900">{order.kode_order}</td>
                                        <td className="px-6 py-3">
                                            <span className="text-black-700">{order.kendaraan?.nama_kendaraan || '-'}</span>
                                            {order.kendaraan?.plat_nomor && (
                                                <span className="ml-1 text-xs text-black-400">({order.kendaraan.plat_nomor})</span>
                                            )}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-3 text-black-600">
                                            {order.tanggal_mulai} - {order.tanggal_selesai}
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColors[order.status_order] || 'bg-black-200 text-black-600'}`}>
                                                {statusOrderLabels[order.status_order] || order.status_order}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-3 text-right font-medium text-black-900">
                                            {formatRupiah(order.harga_total)}
                                        </td>
                                        <td className="px-6 py-3 text-right text-black-400">
                                            &rsaquo;
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
