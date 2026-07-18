import { useState, useEffect } from 'react';
import { laporanAPI } from '../services/api';
import { useToast } from '../contexts/ToastContext';

const statusOrderLabels = {
  pending: 'Menunggu',
  confirmed: 'Dikonfirmasi',
  active: 'Aktif',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

const statusPembayaranLabels = {
  unpaid: 'Belum Bayar',
  partial: 'DP / Sebagian',
  paid: 'Lunas',
};

const statusPengirimanLabels = {
  belum_diambil: 'Belum Diambil',
  sudah_diantarkan: 'Sudah Diantarkan',
  dalam_penyewaan: 'Dalam Penyewaan',
  selesai: 'Selesai',
};

const metodeBayarLabels = {
  cash: 'Tunai',
  transfer: 'Transfer',
  qris: 'QRIS',
  lainnya: 'Lainnya',
};

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  active: 'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-800',
  unpaid: 'bg-red-100 text-red-800',
  partial: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  belum_diambil: 'bg-orange-100 text-orange-800',
  sudah_diantarkan: 'bg-blue-100 text-blue-800',
  dalam_penyewaan: 'bg-purple-100 text-purple-800',
  selesai: 'bg-gray-100 text-gray-600',
  tersedia: 'bg-green-100 text-green-800',
  disewa: 'bg-blue-100 text-blue-800',
  maintenance: 'bg-red-100 text-red-800',
};

const tabs = [
  {
    key: 'ringkasan',
    label: 'Ringkasan',
    icon: 'M9 3v18M3 9h18M3 15h18M3 3h18v18H3V3z',
  },
  {
    key: 'pendapatan',
    label: 'Pendapatan',
    icon: 'M12 8c-1.66 0-3 .9-3 2s1.34 2 3 2 3 .9 3 2-1.34 2-3 2m0-8V6m0 2c1.66 0 3 .9 3 2m-3 6v2m0-2c-1.66 0-3-.9-3-2M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    key: 'kendaraan',
    label: 'Kendaraan',
    icon: 'M5 17h14M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0M5 17V9a1 1 0 011-1h1l2-4h6l2 4h1a1 1 0 011 1v8',
  },
  {
    key: 'customer',
    label: 'Customer',
    icon: 'M12 12a4 4 0 100-8 4 4 0 000 8zm0 0c-4 0-7 2-7 4.5V19h14v-2.5C19 14 16 12 12 12z',
  },
  {
    key: 'order',
    label: 'Order',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 7h6m-6 4h6',
  },
];

const defaultStart = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

const defaultEnd = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatRupiah = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-5">
      <div className="h-9 w-9 rounded-xl skeleton mb-4" />
      <div className="h-3 w-24 skeleton mb-3" />
      <div className="h-7 w-32 skeleton" />
    </div>
  );
}

function TableSkeleton({ rows = 5 }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
      <div className="p-5 border-b border-gray-100">
        <div className="h-5 w-40 skeleton" />
      </div>
      <div className="divide-y divide-gray-100">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 flex items-center gap-4">
            <div className="h-3 w-1/4 skeleton" />
            <div className="h-3 w-1/6 skeleton" />
            <div className="h-3 w-1/6 skeleton ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ label = 'Belum ada data' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-5 py-12 text-gray-400">
      <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-6-4h6m2 9H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}

function SectionCard({ title, action, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function StatCard({ label, value, mono, icon, iconBg }) {
  return (
    <div className="group bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-5 transition-all hover:shadow-md hover:-translate-y-0.5">
      <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center mb-4`}>
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
        </svg>
      </div>
      <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
      <p className={`text-xl font-bold text-gray-900 truncate ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}

const ICONS = {
  order: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 7h6m-6 4h6',
  check: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  x: 'M6 18L18 6M6 6l12 12',
  money: 'M12 8c-1.66 0-3 .9-3 2s1.34 2 3 2 3 .9 3 2-1.34 2-3 2m0-8V6m0 2c1.66 0 3 .9 3 2m-3 6v2m0-2c-1.66 0-3-.9-3-2M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  alert: 'M12 9v2m0 4h.01M4.93 19h14.14a1 1 0 00.87-1.5L12.87 4.5a1 1 0 00-1.74 0L4.06 17.5A1 1 0 004.93 19z',
  wallet: 'M3 7a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z M16 12h.01',
  car: 'M5 17h14M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0M5 17V9a1 1 0 011-1h1l2-4h6l2 4h1a1 1 0 011 1v8',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zm0 0c-4 0-7 2-7 4.5V19h14v-2.5C19 14 16 12 12 12z',
  home: 'M3 12l2-2m0 0l7-7 7 7m-14 0v8a2 2 0 002 2h3m9-10l2 2m-2-2v8a2 2 0 01-2 2h-3m-6 0a2 2 0 002-2v-4a2 2 0 012-2h0a2 2 0 012 2v4a2 2 0 002 2m-6 0h6',
  users: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a4 4 0 10-4-4',
  trend: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
};

function RingkasanTab({ params }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    laporanAPI.ringkasan(params)
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (!data) return null;

  const { order: o, keuangan: k, kendaraan: v, pertumbuhan: p, garasi: g } = data;

  const cards = [
    { label: 'Total Order', value: o.total, icon: ICONS.order, iconBg: 'bg-blue-500' },
    { label: 'Order Pending', value: o.pending, icon: ICONS.alert, iconBg: 'bg-yellow-500' },
    { label: 'Order Dikonfirmasi', value: o.confirmed, icon: ICONS.check, iconBg: 'bg-blue-500' },
    { label: 'Order Aktif', value: o.active, icon: ICONS.car, iconBg: 'bg-green-500' },
    { label: 'Order Selesai', value: o.selesai, icon: ICONS.check, iconBg: 'bg-emerald-500' },
    { label: 'Order Dibatalkan', value: o.dibatalkan, icon: ICONS.x, iconBg: 'bg-red-500' },
    { label: 'Pendapatan (Lunas)', value: formatRupiah(k.pendapatan), mono: true, icon: ICONS.money, iconBg: 'bg-emerald-500' },
    { label: 'Denda Overtime', value: formatRupiah(k.denda), mono: true, icon: ICONS.alert, iconBg: 'bg-amber-500' },
    { label: 'Total Penerimaan', value: formatRupiah(k.total_penerimaan), mono: true, icon: ICONS.wallet, iconBg: 'bg-indigo-500' },
    { label: 'Rata-rata/Order', value: formatRupiah(k.rata_rata_order), mono: true, icon: ICONS.trend, iconBg: 'bg-cyan-500' },
    { label: 'Total Kendaraan', value: `${v.disewa}/${v.total} disewa (${v.utilisasi_persen}%)`, icon: ICONS.car, iconBg: 'bg-teal-500' },
    { label: 'Customer Baru', value: p.customer_baru, icon: ICONS.user, iconBg: 'bg-pink-500' },
    { label: 'Kendaraan Baru', value: p.kendaraan_baru, icon: ICONS.car, iconBg: 'bg-cyan-500' },
    { label: 'Garasi Pending', value: g.pending, icon: ICONS.home, iconBg: 'bg-orange-500' },
    { label: 'Garasi Direspon', value: g.direspon, icon: ICONS.home, iconBg: 'bg-green-500' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => <StatCard key={card.label} {...card} />)}
    </div>
  );
}

function PendapatanTab({ params }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    laporanAPI.pendapatan(params)
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params]);

  if (loading) return <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><TableSkeleton /><TableSkeleton /><TableSkeleton /></div>;
  if (!data) return null;

  const { ringkasan, pendapatan_periode, metode_pembayaran, pendapatan_kategori } = data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Total Pendapatan" value={formatRupiah(ringkasan.total_pendapatan)} mono icon={ICONS.money} iconBg="bg-emerald-500" />
        <StatCard label="Total Denda" value={formatRupiah(ringkasan.total_denda)} mono icon={ICONS.alert} iconBg="bg-amber-500" />
        <StatCard label="Total Order" value={ringkasan.total_order} icon={ICONS.order} iconBg="bg-blue-500" />
        <StatCard label="Total Customer" value={ringkasan.total_customer} icon={ICONS.user} iconBg="bg-pink-500" />
        <StatCard label="Rata-rata/Order" value={formatRupiah(ringkasan.rata_rata_order)} mono icon={ICONS.trend} iconBg="bg-cyan-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-2 gap-6">
        <SectionCard title="Pendapatan Per Periode">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Periode</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500">Order</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500">Pendapatan</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500">Denda</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500">Rata-rata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pendapatan_periode.map((row) => (
                  <tr key={row.periode} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-900">{row.periode}</td>
                    <td className="px-5 py-3 text-right text-gray-700">{row.total_order}</td>
                    <td className="px-5 py-3 text-right font-mono text-gray-900">{formatRupiah(row.total_pendapatan)}</td>
                    <td className="px-5 py-3 text-right font-mono text-gray-700">{formatRupiah(row.total_denda)}</td>
                    <td className="px-5 py-3 text-right font-mono text-gray-700">{formatRupiah(row.rata_rata)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pendapatan_periode.length === 0 && <EmptyState />}
          </div>
        </SectionCard>

        <SectionCard title="Metode Pembayaran">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Metode</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500">Order</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500">Total</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500">Rata-rata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {metode_pembayaran.map((row) => (
                  <tr key={row.metode_pembayaran} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-900">{metodeBayarLabels[row.metode_pembayaran] || row.metode_pembayaran}</td>
                    <td className="px-5 py-3 text-right text-gray-700">{row.total_order}</td>
                    <td className="px-5 py-3 text-right font-mono text-gray-900">{formatRupiah(row.total_pendapatan)}</td>
                    <td className="px-5 py-3 text-right font-mono text-gray-700">{formatRupiah(row.rata_rata)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {metode_pembayaran.length === 0 && <EmptyState />}
          </div>
        </SectionCard>
      </div>

      {pendapatan_kategori?.length > 0 && (
        <SectionCard title="Pendapatan Per Kategori Kendaraan">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Kategori</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500">Order</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500">Pendapatan</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500">Denda</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500">Rata-rata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pendapatan_kategori.map((row) => (
                  <tr key={row.nama_kategori} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-900">{row.nama_kategori}</td>
                    <td className="px-5 py-3 text-right text-gray-700">{row.total_order}</td>
                    <td className="px-5 py-3 text-right font-mono text-gray-900">{formatRupiah(row.total_pendapatan)}</td>
                    <td className="px-5 py-3 text-right font-mono text-gray-700">{formatRupiah(row.total_denda)}</td>
                    <td className="px-5 py-3 text-right font-mono text-gray-700">{formatRupiah(row.rata_rata)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </div>
  );
}

function KendaraanTab({ params }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    laporanAPI.kendaraan(params)
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params]);

  if (loading) return <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><TableSkeleton /><TableSkeleton /></div>;
  if (!data) return null;

  const { kendaraan_terpopuler, status_kendaraan, kategori_stats } = data;
  const totalKendaraan = status_kendaraan.reduce((sum, s) => sum + s.total, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Kendaraan" value={totalKendaraan} icon={ICONS.car} iconBg="bg-cyan-500" />
        {status_kendaraan.map((s) => (
          <StatCard
            key={s.status}
            label={<span className="capitalize">{s.status}</span>}
            value={s.total}
            icon={ICONS.car}
            iconBg={statusColors[s.status]?.includes('green') ? 'bg-green-500' : statusColors[s.status]?.includes('red') ? 'bg-red-500' : 'bg-blue-500'}
          />
        ))}
      </div>

      {kategori_stats?.length > 0 && (
        <SectionCard title="Statistik Per Kategori">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Kategori</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500">Total</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500">Disewa</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500">Tersedia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {kategori_stats.map((r) => (
                  <tr key={r.nama_kategori} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-900">{r.nama_kategori}</td>
                    <td className="px-5 py-3 text-right text-gray-900">{r.total_kendaraan}</td>
                    <td className="px-5 py-3 text-right text-green-700">{r.disewa}</td>
                    <td className="px-5 py-3 text-right text-gray-700">{r.tersedia}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      <SectionCard title="Kendaraan Terpopuler">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-gray-500">#</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Nama</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Plat</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Kategori</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Merek/Model</th>
                <th className="text-center px-5 py-3 font-medium text-gray-500">Tahun</th>
                <th className="text-right px-5 py-3 font-medium text-gray-500">Harga/Hari</th>
                <th className="text-right px-5 py-3 font-medium text-gray-500">Order</th>
                <th className="text-right px-5 py-3 font-medium text-gray-500">Pendapatan</th>
                <th className="text-right px-5 py-3 font-medium text-gray-500">Avg Durasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {kendaraan_terpopuler.map((k, i) => (
                <tr key={k.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 text-gray-500">{i + 1}</td>
                  <td className="px-5 py-3 font-medium text-gray-900">{k.nama_kendaraan}</td>
                  <td className="px-5 py-3 font-mono text-gray-700">{k.plat_nomor}</td>
                  <td className="px-5 py-3 text-gray-700">{k.kategori?.nama_kategori ?? '-'}</td>
                  <td className="px-5 py-3 text-gray-700">{k.merek} {k.model}</td>
                  <td className="px-5 py-3 text-center text-gray-700">{k.tahun}</td>
                  <td className="px-5 py-3 text-right font-mono text-gray-900">{formatRupiah(k.harga_sewa_per_hari)}</td>
                  <td className="px-5 py-3 text-right text-gray-900">{k.orders_count}</td>
                  <td className="px-5 py-3 text-right font-mono text-gray-900">{formatRupiah(k.orders_sum_harga_total)}</td>
                  <td className="px-5 py-3 text-right text-gray-700">{Number(k.orders_avg_durasi_hari ?? 0).toFixed(1)} hari</td>
                </tr>
              ))}
            </tbody>
          </table>
          {kendaraan_terpopuler.length === 0 && <EmptyState />}
        </div>
      </SectionCard>
    </div>
  );
}

function CustomerTab({ params }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    laporanAPI.customer(params)
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params]);

  if (loading) return <TableSkeleton />;
  if (!data) return null;

  const { customer_top, ringkasan } = data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Customer" value={ringkasan.total_customer} icon={ICONS.users} iconBg="bg-pink-500" />
        <StatCard label="Customer Baru" value={ringkasan.customer_baru} icon={ICONS.user} iconBg="bg-indigo-500" />
        <StatCard label="Customer Aktif" value={ringkasan.customer_aktif} icon={ICONS.trend} iconBg="bg-emerald-500" />
        <StatCard label="Customer Repeat" value={ringkasan.customer_repeat} icon={ICONS.users} iconBg="bg-cyan-500" />
      </div>

      <SectionCard title="Top Customer">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-gray-500">#</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Nama</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">No. HP</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Email</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Alamat</th>
                <th className="text-right px-5 py-3 font-medium text-gray-500">Total Order</th>
                <th className="text-right px-5 py-3 font-medium text-gray-500">Total Pengeluaran</th>
                <th className="text-right px-5 py-3 font-medium text-gray-500">Avg Durasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {customer_top.map((c, i) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 text-gray-500">{i + 1}</td>
                  <td className="px-5 py-3 font-medium text-gray-900">{c.nama_lengkap}</td>
                  <td className="px-5 py-3 text-gray-700">{c.no_hp}</td>
                  <td className="px-5 py-3 text-gray-700">{c.email ?? '-'}</td>
                  <td className="px-5 py-3 text-gray-700">{c.alamat ?? '-'}</td>
                  <td className="px-5 py-3 text-right text-gray-900">{c.orders_count}</td>
                  <td className="px-5 py-3 text-right font-mono text-gray-900">{formatRupiah(c.orders_sum_harga_total)}</td>
                  <td className="px-5 py-3 text-right text-gray-700">{Number(c.rata_rata_durasi_hari ?? 0).toFixed(1)} hari</td>
                </tr>
              ))}
            </tbody>
          </table>
          {customer_top.length === 0 && <EmptyState />}
        </div>
      </SectionCard>
    </div>
  );
}

function OrderTab({ params }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    laporanAPI.order(params)
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params]);

  if (loading) return <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><TableSkeleton /><TableSkeleton /></div>;
  if (!data) return null;

  const { order, order_terbaru } = data;
  const summaryCards = [
    { label: 'Total Order', value: order.total_order, icon: ICONS.order, iconBg: 'bg-blue-500' },
    { label: 'Pendapatan (Lunas)', value: formatRupiah(order.total_pendapatan), mono: true, icon: ICONS.money, iconBg: 'bg-emerald-500' },
    { label: 'Denda Overtime', value: formatRupiah(order.total_denda), mono: true, icon: ICONS.alert, iconBg: 'bg-amber-500' },
    { label: 'Rata-rata Durasi', value: `${Number(order.rata_rata_durasi ?? 0).toFixed(1)} hari`, icon: ICONS.trend, iconBg: 'bg-cyan-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((c) => <StatCard key={c.label} {...c} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SectionCard title="Status Order">
          <div className="divide-y divide-gray-100">
            {order.status_order.length === 0 ? <EmptyState /> : order.status_order.map((s) => (
              <div key={s.status_order} className="px-5 py-3 flex items-center justify-between">
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${statusColors[s.status_order]}`}>
                  {statusOrderLabels[s.status_order]}
                </span>
                <span className="text-sm font-semibold text-gray-900">{s.total}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Status Pembayaran">
          <div className="divide-y divide-gray-100">
            {order.status_pembayaran.length === 0 ? <EmptyState /> : order.status_pembayaran.map((s) => (
              <div key={s.status_pembayaran} className="px-5 py-3 flex items-center justify-between">
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${statusColors[s.status_pembayaran]}`}>
                  {statusPembayaranLabels[s.status_pembayaran]}
                </span>
                <span className="text-sm font-semibold text-gray-900">{s.total}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Status Pengiriman">
          <div className="divide-y divide-gray-100">
            {order.status_pengiriman.length === 0 ? <EmptyState /> : order.status_pengiriman.map((s) => (
              <div key={s.status_pengiriman} className="px-5 py-3 flex items-center justify-between">
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${statusColors[s.status_pengiriman]}`}>
                  {statusPengirimanLabels[s.status_pengiriman]}
                </span>
                <span className="text-sm font-semibold text-gray-900">{s.total}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Order Terbaru">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Kode</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Customer</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Kendaraan</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Plat</th>
                <th className="text-center px-5 py-3 font-medium text-gray-500">Durasi</th>
                <th className="text-right px-5 py-3 font-medium text-gray-500">Total</th>
                <th className="text-center px-5 py-3 font-medium text-gray-500">Order</th>
                <th className="text-center px-5 py-3 font-medium text-gray-500">Bayar</th>
                <th className="text-center px-5 py-3 font-medium text-gray-500">Kirim</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {order_terbaru.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-mono font-medium text-gray-900">{o.kode_order}</td>
                  <td className="px-5 py-3 text-gray-700">{o.customer?.nama_lengkap}</td>
                  <td className="px-5 py-3 text-gray-700">{o.kendaraan?.nama_kendaraan}</td>
                  <td className="px-5 py-3 font-mono text-gray-700">{o.kendaraan?.plat_nomor}</td>
                  <td className="px-5 py-3 text-center text-gray-700">{o.durasi_hari} hari</td>
                  <td className="px-5 py-3 text-right font-mono text-gray-900">{formatRupiah(o.harga_total)}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${statusColors[o.status_order]}`}>
                      {statusOrderLabels[o.status_order]}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${statusColors[o.status_pembayaran]}`}>
                      {statusPembayaranLabels[o.status_pembayaran]}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${statusColors[o.status_pengiriman]}`}>
                      {statusPengirimanLabels[o.status_pengiriman]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {order_terbaru.length === 0 && <EmptyState label="Belum ada order" />}
        </div>
      </SectionCard>
    </div>
  );
}

export default function Laporan() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('ringkasan');
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [exporting, setExporting] = useState(false);

  const params = { start_date: startDate, end_date: endDate };

  const handleDownload = async (format) => {
    setExporting(true);
    try {
      const resp = await laporanAPI.export(activeTab, format, { start_date: startDate, end_date: endDate });
      const blob = new Blob([resp.data], {
        type: format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `laporan-${activeTab}-${startDate}-${endDate}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
      toast.success('Laporan berhasil diunduh');
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) {
        toast.error('Sesi telah berakhir, silakan login kembali');
      } else {
        toast.error('Gagal mengunduh laporan');
      }
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadAll = async () => {
    setExporting(true);
    try {
      const resp = await laporanAPI.export('all', 'xlsx', { start_date: startDate, end_date: endDate });
      const blob = new Blob([resp.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `laporan-semua-${startDate}-${endDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
      toast.success('Semua laporan berhasil diunduh');
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) {
        toast.error('Sesi telah berakhir, silakan login kembali');
      } else {
        toast.error('Gagal mengunduh laporan');
      }
    } finally {
      setExporting(false);
    }
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'ringkasan': return <RingkasanTab params={params} />;
      case 'pendapatan': return <PendapatanTab params={params} />;
      case 'kendaraan': return <KendaraanTab params={params} />;
      case 'customer': return <CustomerTab params={params} />;
      case 'order': return <OrderTab params={params} />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-6 sm:p-7 text-white shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div>
            <h1 className="text-2xl font-bold">Laporan</h1>
            <p className="text-blue-100 text-sm mt-1">
              Pantau performa order, pendapatan, dan customer dalam satu tempat.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur rounded-lg px-3 py-1.5">
              <label className="text-xs text-blue-50 font-medium">Dari</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-sm text-white placeholder-blue-100 outline-none [color-scheme:dark]" />
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur rounded-lg px-3 py-1.5">
              <label className="text-xs text-blue-50 font-medium">Sampai</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-sm text-white outline-none [color-scheme:dark]" />
            </div>
            <div className="w-px h-6 bg-white/20 mx-1" />
            <button onClick={() => handleDownload('csv')} disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-white/10 hover:bg-white/20 rounded-lg disabled:opacity-50 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              {exporting ? 'Mengunduh...' : 'CSV'}
            </button>
            <button onClick={() => handleDownload('xlsx')} disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 bg-white hover:bg-blue-50 rounded-lg disabled:opacity-50 transition-colors shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              {exporting ? 'Mengunduh...' : 'Excel'}
            </button>
            <div className="w-px h-6 bg-white/20 mx-1" />
            <button onClick={() => handleDownloadAll()} disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg disabled:opacity-50 transition-colors shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              {exporting ? 'Mengunduh...' : 'Download Semua'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
              activeTab === tab.key
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
            </svg>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="text-xs text-gray-400">
        Periode: {startDate} s/d {endDate}
      </div>

      {renderTab()}
    </div>
  );
}
