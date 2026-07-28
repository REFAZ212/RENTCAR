import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { customerAPI, type Customer, type Order } from '../services/api';
import { formatHpDisplay, formatHpWa, formatRupiah } from '../lib/format';
import { ArrowLeft, Phone, Search, X, FileText } from 'lucide-react';

const inputClass =
    'w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-900 outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500';

const statusOrderLabels: Record<string, string> = {
    pending: 'Menunggu',
    confirmed: 'Dikonfirmasi',
    active: 'Aktif',
    completed: 'Selesai',
    cancelled: 'Dibatalkan',
};

const statusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800',
    confirmed: 'bg-rented-50 text-rented-500',
    active: 'bg-avail-50 text-avail-600',
    completed: 'bg-ink-200 text-ink-700',
    cancelled: 'bg-maint-50 text-maint-600',
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
                    className="absolute -top-3 -right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white text-ink-600 shadow-lg hover:bg-ink-50"
                >
                    <X size={16} />
                </button>
                <img src={src} alt={alt} className="max-h-[85vh] max-w-[85vw] rounded-lg object-contain shadow-2xl" />
            </div>
        </div>
    );
}

export default function CustomerDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');
    const [zoomImage, setZoomImage] = useState<string | null>(null);
    const [zoomAlt, setZoomAlt] = useState('');

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
                <Link to="/customers" className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700">
                    <ArrowLeft size={16} /> Kembali ke Daftar Pelanggan
                </Link>
                <div className="flex flex-col items-center justify-center rounded-2xl border border-ink-200 bg-white py-20 text-center">
                    <FileText size={48} className="mb-4 text-ink-300" />
                    <h2 className="text-lg font-semibold text-ink-700">Customer tidak ditemukan</h2>
                    <p className="mt-1 text-sm text-ink-400">Data mungkin telah dihapus atau tidak tersedia.</p>
                </div>
            </div>
        );
    }

    const waNumber = formatHpWa(customer.no_hp);
    const waLink = `https://wa.me/${waNumber}?text=${encodeURIComponent(`Halo ${customer.nama_lengkap},`)}`;

    return (
        <div className="space-y-6">
            {zoomImage && <FotoModal src={zoomImage} alt={zoomAlt} onClose={() => setZoomImage(null)} />}

            {/* Back link */}
            <Link to="/customers" className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700">
                <ArrowLeft size={16} /> Kembali ke Daftar Pelanggan
            </Link>

            {/* Data Diri */}
            <div className="rounded-2xl border border-ink-200 bg-white p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                        <h1 className="font-display text-2xl font-bold text-ink-900">{customer.nama_lengkap}</h1>
                        <p className="text-sm text-ink-500">{formatHpDisplay(customer.no_hp)}</p>
                        {customer.email && <p className="text-sm text-ink-500">{customer.email}</p>}
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-500">
                            {customer.no_ktp && (
                                <span>
                                    KTP: <span className="font-mono font-medium text-ink-700">{customer.no_ktp}</span>
                                </span>
                            )}
                            {customer.no_sim && (
                                <span>
                                    SIM: <span className="font-mono font-medium text-ink-700">{customer.no_sim}</span>
                                </span>
                            )}
                        </div>
                        {customer.alamat && <p className="text-sm text-ink-500">{customer.alamat}</p>}
                        {customer.catatan && (
                            <p className="rounded-lg bg-ink-50 px-3 py-2 text-sm text-ink-600">{customer.catatan}</p>
                        )}
                    </div>
                    <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-green-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-600"
                    >
                        <Phone size={16} /> Hubungi
                    </a>
                </div>
            </div>

            {/* Dokumen Identitas */}
            {(customer.foto_ktp || customer.foto_sim) && (
                <div className="rounded-2xl border border-ink-200 bg-white p-6">
                    <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-ink-400">Dokumen Identitas</h2>
                    <div className="flex flex-wrap gap-4">
                        {customer.foto_ktp && (
                            <div className="space-y-2">
                                <p className="text-xs font-medium text-ink-500">KTP</p>
                                <img
                                    src={`/storage/${customer.foto_ktp}`}
                                    alt={`KTP ${customer.nama_lengkap}`}
                                    className="h-32 w-48 cursor-pointer rounded-lg border border-ink-200 object-cover transition-shadow hover:shadow-md"
                                    onClick={() => openZoom(`/storage/${customer.foto_ktp}`, `KTP ${customer.nama_lengkap}`)}
                                />
                            </div>
                        )}
                        {customer.foto_sim && (
                            <div className="space-y-2">
                                <p className="text-xs font-medium text-ink-500">SIM</p>
                                <img
                                    src={`/storage/${customer.foto_sim}`}
                                    alt={`SIM ${customer.nama_lengkap}`}
                                    className="h-32 w-48 cursor-pointer rounded-lg border border-ink-200 object-cover transition-shadow hover:shadow-md"
                                    onClick={() => openZoom(`/storage/${customer.foto_sim}`, `SIM ${customer.nama_lengkap}`)}
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Statistik */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-2xl border border-ink-200 bg-white p-4 text-center">
                    <p className="text-2xl font-bold text-ink-900">{stats.count}</p>
                    <p className="text-xs text-ink-400">Total Order</p>
                </div>
                <div className="rounded-2xl border border-ink-200 bg-white p-4 text-center">
                    <p className="text-2xl font-bold text-avail-600">{stats.activeCount}</p>
                    <p className="text-xs text-ink-400">Order Aktif</p>
                </div>
                <div className="rounded-2xl border border-ink-200 bg-white p-4 text-center">
                    <p className="text-2xl font-bold text-ink-900">{formatRupiah(stats.totalSpent)}</p>
                    <p className="text-xs text-ink-400">Total Pengeluaran</p>
                </div>
                <div className="rounded-2xl border border-ink-200 bg-white p-4 text-center">
                    <p className="text-2xl font-bold text-ink-900">{formatRupiah(stats.avgSpend)}</p>
                    <p className="text-xs text-ink-400">Rata-rata Sewa</p>
                </div>
            </div>

            {/* Riwayat Pemesanan */}
            <div className="rounded-2xl border border-ink-200 bg-white">
                <div className="flex flex-col gap-3 border-b border-ink-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="font-display text-lg font-bold text-ink-900">Riwayat Pemesanan</h2>
                    <div className="flex flex-wrap gap-2">
                        {statusFilters.map((f) => (
                            <button
                                key={f.key}
                                onClick={() => setStatusFilter(f.key)}
                                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                                    statusFilter === f.key
                                        ? 'bg-brand-500 text-white'
                                        : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
                                }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {filteredOrders.length === 0 ? (
                    <div className="flex flex-col items-center py-16 text-center">
                        <Search size={40} className="mb-3 text-ink-300" />
                        <p className="text-sm text-ink-500">
                            {statusFilter === 'all' ? 'Belum ada riwayat pemesanan.' : 'Tidak ada order dengan status ini.'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-ink-100 text-xs uppercase tracking-wider text-ink-400">
                                    <th className="px-6 py-3">Kode</th>
                                    <th className="px-6 py-3">Kendaraan</th>
                                    <th className="px-6 py-3">Periode</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3 text-right">Total</th>
                                    <th className="px-6 py-3 text-right"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-ink-100">
                                {filteredOrders.map((order) => (
                                    <tr
                                        key={order.id}
                                        className="cursor-pointer transition-colors hover:bg-ink-50"
                                        onClick={() => navigate(`/orders/${order.id}`)}
                                    >
                                        <td className="whitespace-nowrap px-6 py-3 font-medium text-ink-900">{order.kode_order}</td>
                                        <td className="px-6 py-3">
                                            <span className="text-ink-700">{order.kendaraan?.nama_kendaraan || '-'}</span>
                                            {order.kendaraan?.plat_nomor && (
                                                <span className="ml-1 text-xs text-ink-400">({order.kendaraan.plat_nomor})</span>
                                            )}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-3 text-ink-600">
                                            {order.tanggal_mulai} - {order.tanggal_selesai}
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColors[order.status_order] || 'bg-ink-100 text-ink-600'}`}>
                                                {statusOrderLabels[order.status_order] || order.status_order}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-3 text-right font-medium text-ink-900">
                                            {formatRupiah(order.harga_total)}
                                        </td>
                                        <td className="px-6 py-3 text-right text-ink-400">
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
