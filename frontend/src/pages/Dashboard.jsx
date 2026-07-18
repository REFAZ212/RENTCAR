import { useState, useEffect } from 'react';
import { dashboardAPI } from '../services/api';
import { Link } from 'react-router-dom';

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  active: 'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-800',
  tersedia: 'bg-green-100 text-green-800',
  tidak_terjawab: 'bg-red-100 text-red-800',
};

function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-lg skeleton" />
        <div className="flex-1">
          <div className="h-3 w-20 skeleton mb-2" />
          <div className="h-5 w-16 skeleton" />
        </div>
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-5 border-b border-gray-100">
        <div className="h-5 w-40 skeleton" />
      </div>
      <div className="p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg skeleton" />
            <div className="flex-1">
              <div className="h-3.5 w-32 skeleton mb-2" />
              <div className="h-3 w-48 skeleton" />
            </div>
            <div className="h-6 w-16 skeleton rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

const statIcons = {
  kendaraan_tersedia: <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
  kendaraan_disewa: <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>,
  orders_aktif: <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
  orders_pending: <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  pendapatan_hari: <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  pendapatan_bulan: <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  garasi_pending: <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
  total_customer: <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    dashboardAPI.get()
      .then(({ data }) => {
        setData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Gagal memuat data dashboard');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-40 skeleton" />
          <div className="h-4 w-56 skeleton" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <StatCardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ListSkeleton />
          <ListSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <svg className="w-12 h-12 text-red-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
          <p className="text-gray-600 font-medium">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-3 text-sm text-blue-600 hover:underline">Muat ulang</button>
        </div>
      </div>
    );
  }

  const { stats, recent_orders, recent_garasi_requests } = data;

  const formatRupiah = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;

  const statCards = [
    { key: 'kendaraan_tersedia', label: 'Kendaraan Tersedia', value: stats.kendaraan_tersedia, total: stats.total_kendaraan, color: 'bg-emerald-500' },
    { key: 'kendaraan_disewa', label: 'Sedang Disewa', value: stats.kendaraan_disewa, color: 'bg-blue-500' },
    { key: 'orders_aktif', label: 'Order Aktif', value: stats.orders_aktif, color: 'bg-indigo-500' },
    { key: 'orders_pending', label: 'Order Pending', value: stats.orders_pending, color: 'bg-amber-500' },
    { key: 'pendapatan_hari', label: 'Pendapatan Hari Ini', value: formatRupiah(stats.pendapatan_hari_ini), color: 'bg-teal-500', isCurrency: true },
    { key: 'pendapatan_bulan', label: 'Pendapatan Bulan Ini', value: formatRupiah(stats.pendapatan_bulan_ini), color: 'bg-cyan-600', isCurrency: true },
    { key: 'garasi_pending', label: 'Garasi Pending', value: stats.garasi_pending, color: 'bg-orange-500' },
    { key: 'total_customer', label: 'Total Customer', value: stats.total_customer, color: 'bg-pink-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="text-sm text-gray-500">
          {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.key} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-lg ${card.color} flex items-center justify-center shrink-0`}>
                {statIcons[card.key]}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 font-medium">{card.label}</p>
                <p className="text-xl font-bold text-gray-900 truncate">
                  {card.isCurrency ? card.value : (card.total ? `${card.value}/${card.total}` : card.value)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Order Terbaru</h2>
            <Link to="/orders" className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors">Lihat Semua</Link>
          </div>
          <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
            {recent_orders.length === 0 ? (
              <div className="p-8 text-center">
                <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                <p className="text-sm text-gray-500">Belum ada order</p>
              </div>
            ) : recent_orders.map((order) => (
              <div key={order.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-gray-900 font-mono">{order.kode_order}</p>
                    <p className="text-xs text-gray-500 truncate">{order.customer?.nama_lengkap} — {order.kendaraan?.nama_kendaraan}</p>
                  </div>
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full shrink-0 ${statusColors[order.status_order] || 'bg-gray-100 text-gray-600'}`}>
                    {order.status_order}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Garasi Requests */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Permintaan Garasi Terbaru</h2>
            <Link to="/garasi" className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors">Lihat Semua</Link>
          </div>
          <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
            {recent_garasi_requests.length === 0 ? (
              <div className="p-8 text-center">
                <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                <p className="text-sm text-gray-500">Belum ada permintaan</p>
              </div>
            ) : recent_garasi_requests.map((req) => (
              <div key={req.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-gray-900">{req.garasi_partner?.nama_garasi}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {req.order?.kode_order} — {req.order?.kendaraan?.nama_kendaraan}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full shrink-0 ${statusColors[req.status_permintaan] || 'bg-gray-100 text-gray-600'}`}>
                    {req.status_permintaan}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
