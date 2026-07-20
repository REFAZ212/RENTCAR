import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Kendaraan from './pages/Kendaraan';
import Customers from './pages/Customers';
import Orders from './pages/Orders';
import GarasiPartner from './pages/GarasiPartner';
import GarasiSaya from './pages/GarasiSaya';
import KategoriTipe from './pages/KategoriTipe';
import GpsPage from './pages/GpsPage';
import Laporan from './pages/Laporan';
import Katalog from './pages/Katalog';
import KendaraanDetail from './pages/KendaraanDetail';
import NotFound from './pages/NotFound';
import Pengaturan from './pages/Pengaturan';

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Memuat...</p>
      </div>
    </div>
  );
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return user ? <Layout>{children}</Layout> : <Navigate to="/login" />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return user ? <Navigate to="/" /> : children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public katalog routes — no auth */}
          <Route path="/katalog" element={<Katalog />} />
          <Route path="/katalog/:id" element={<KendaraanDetail />} />

          {/* Auth routes */}
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

          {/* Admin routes — auth required */}
          <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/kendaraan" element={<PrivateRoute><Kendaraan /></PrivateRoute>} />
          <Route path="/kategori-tipe" element={<PrivateRoute><KategoriTipe /></PrivateRoute>} />
          <Route path="/customers" element={<PrivateRoute><Customers /></PrivateRoute>} />
          <Route path="/orders" element={<PrivateRoute><Orders /></PrivateRoute>} />
          <Route path="/gps" element={<PrivateRoute><GpsPage /></PrivateRoute>} />
          <Route path="/laporan" element={<PrivateRoute><Laporan /></PrivateRoute>} />
          <Route path="/garasi" element={<PrivateRoute><GarasiPartner /></PrivateRoute>} />
          <Route path="/garasi-saya" element={<PrivateRoute><GarasiSaya /></PrivateRoute>} />
          <Route path="/pengaturan" element={<PrivateRoute><Pengaturan /></PrivateRoute>} />


          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
