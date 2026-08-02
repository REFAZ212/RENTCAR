import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-accent-100 px-4">
      <div className="text-center">
        <p className="text-7xl font-bold text-primary-600">404</p>
        <h1 className="mt-4 text-xl font-semibold text-black-900">Halaman Tidak Ditemukan</h1>
        <p className="mt-2 text-black-400">Halaman yang Anda cari tidak tersedia atau telah dipindahkan.</p>
        <Link to="/" className="mt-6 inline-block px-5 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors">
          Kembali ke Dashboard
        </Link>
      </div>
    </div>
  );
}
