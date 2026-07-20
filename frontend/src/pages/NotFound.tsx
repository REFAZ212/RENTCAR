import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="text-center">
        <p className="text-7xl font-bold text-blue-600">404</p>
        <h1 className="mt-4 text-xl font-semibold text-gray-900">Halaman Tidak Ditemukan</h1>
        <p className="mt-2 text-gray-500">Halaman yang Anda cari tidak tersedia atau telah dipindahkan.</p>
        <Link to="/" className="mt-6 inline-block px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          Kembali ke Dashboard
        </Link>
      </div>
    </div>
  );
}
