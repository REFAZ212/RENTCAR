//private routes are wrapped in <Layout> component, public routes are not
import type { PropsWithChildren } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Kendaraan from './pages/Kendaraan';
import Customers from './pages/Customers';
import Orders from './pages/Orders';
import GarasiPage from './pages/GarasiPage';
import KategoriTipe from './pages/KategoriTipe';
import GpsPage from './pages/GpsPage';
import Laporan from './pages/Laporan';
import Katalog from './pages/Katalog';
import KendaraanDetail from './pages/KendaraanDetail';
import NotFound from './pages/NotFound';
import Pengaturan from './pages/Pengaturan';
import SupirCalo from './pages/SupirCalo';

//public route will redirect to / if user is logged in, private route will redirect to /login if user is not logged in

import PublicLayout from './components/public/PublicLayout';
import TentangKamiPage from './pages/public/TentangKamiPage';
import KontakKamiPage from './pages/public/KontakKamiPage';
import LayananPage from './pages/public/LayananPage';
import LayananDetailPage from './pages/public/LayananDetailPage';
import BeritaPage from './pages/public/BeritaPage';
import ArtikelPage from './pages/public/ArtikelPage';
import PromoPage from './pages/public/PromoPage';
import KarirPage from './pages/public/KarirPage';


function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Memuat...</p>
      </div>
    </div>
  );
}

function PrivateRoute({ children }: PropsWithChildren) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return user ? <Layout>{children}</Layout> : <Navigate to="/admin/login" />;
}

function RoleRoute({ children, allowedRoles }: PropsWithChildren & { allowedRoles: string[] }) {
  const { user } = useAuth();
  if (!user || !allowedRoles.includes(user.role ?? '')) {
    return <Navigate to="/" />;
  }
  return <>{children}</>;
}

function PublicRoute({ children }: PropsWithChildren) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return user ? <Navigate to="/admin" /> : children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public katalog routes — no auth */}
          <Route path="/" element={<Katalog />} />
          <Route path="/katalog" element={<Katalog />} />
          <Route path="/katalog/:id" element={<KendaraanDetail />} />

          {/* Public corporate pages — no auth */}
          <Route path="/tentang" element={<PublicLayout><TentangKamiPage /></PublicLayout>} />
          <Route path="/kontak" element={<PublicLayout><KontakKamiPage /></PublicLayout>} />
          <Route path="/layanan" element={<PublicLayout><LayananPage /></PublicLayout>} />
          <Route path="/layanan/:slug" element={<PublicLayout><LayananDetailPage /></PublicLayout>} />
          <Route path="/berita" element={<PublicLayout><BeritaPage /></PublicLayout>} />
          <Route path="/artikel" element={<PublicLayout><ArtikelPage /></PublicLayout>} />
          <Route path="/promo" element={<PublicLayout><PromoPage /></PublicLayout>} />
          <Route path="/karir" element={<PublicLayout><KarirPage /></PublicLayout>} />

          {/* Auth routes */}
          <Route path="/admin/login" element={<PublicRoute><Login /></PublicRoute>} />

          {/* Admin routes — auth required */}
          <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/kendaraan" element={<PrivateRoute><Kendaraan /></PrivateRoute>} />
          <Route path="/kategori-tipe" element={<PrivateRoute><KategoriTipe /></PrivateRoute>} />
          <Route path="/customers" element={<PrivateRoute><Customers /></PrivateRoute>} />
          <Route path="/supir-calo" element={<PrivateRoute><SupirCalo /></PrivateRoute>} />
          <Route path="/orders" element={<PrivateRoute><Orders /></PrivateRoute>} />
          <Route path="/gps" element={<PrivateRoute><GpsPage /></PrivateRoute>} />
          <Route path="/laporan" element={<PrivateRoute><RoleRoute allowedRoles={['admin']}><Laporan /></RoleRoute></PrivateRoute>} />
          <Route path="/garasi" element={<PrivateRoute><GarasiPage /></PrivateRoute>} />
          <Route path="/pengaturan" element={<PrivateRoute><RoleRoute allowedRoles={['admin']}><Pengaturan /></RoleRoute></PrivateRoute>} />
          <Route path="/admin" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/admin/kendaraan" element={<PrivateRoute><Kendaraan /></PrivateRoute>} />
          <Route path="/admin/kategori-tipe" element={<PrivateRoute><KategoriTipe /></PrivateRoute>} />
          <Route path="/admin/customers" element={<PrivateRoute><Customers /></PrivateRoute>} />
          <Route path="/admin/supir-calo" element={<PrivateRoute><SupirCalo /></PrivateRoute>} />
          <Route path="/admin/orders" element={<PrivateRoute><Orders /></PrivateRoute>} />
          <Route path="/admin/gps" element={<PrivateRoute><GpsPage /></PrivateRoute>} />
          <Route path="/admin/laporan" element={<PrivateRoute><Laporan /></PrivateRoute>} />
          <Route path="/admin/garasi" element={<PrivateRoute><GarasiPage /></PrivateRoute>} />
          <Route path="/admin/pengaturan" element={<PrivateRoute><Pengaturan /></PrivateRoute>} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
