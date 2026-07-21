import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { katalogAPI, type KategoriKendaraan, type TipeKendaraan } from '../services/api';

interface KategoriKendaraanExt extends KategoriKendaraan {
  slug: string;
  kendaraans_count: number;
}

interface TipeKendaraanExt extends TipeKendaraan {
  slug: string;
  kendaraans_count: number;
}

const sortOptions = [
  { value: 'terbaru', label: 'Terbaru' },
  { value: 'harga_asc', label: 'Harga Terendah' },
  { value: 'harga_desc', label: 'Harga Tertinggi' },
  { value: 'nama', label: 'Nama A-Z' },
];

function formatRupiah(n) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
}

function getFotoUrl(foto) {
  if (!foto) return null;
  if (foto.startsWith('http')) return foto;
  return `/storage/${foto}`;
}

export default function Katalog() {
  const [items, setItems] = useState<any[]>([]);
  const [kategoris, setKategoris] = useState<KategoriKendaraanExt[]>([]);
  const [tipes, setTipes] = useState<TipeKendaraanExt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [kategoriSlug, setKategoriSlug] = useState('');
  const [tipeSlug, setTipeSlug] = useState('');
  const [sort, setSort] = useState('terbaru');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<{ total: number; last_page: number } | null>(null);

  useEffect(() => {
    katalogAPI.kategoris()
      .then(({ data }) => setKategoris(data.data as KategoriKendaraanExt[]))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (kategoriSlug) params.kategori_slug = kategoriSlug;
    katalogAPI.tipes(params)
      .then(({ data }) => setTipes(data.data as TipeKendaraanExt[]))
      .catch(() => {});
  }, [kategoriSlug]);

  const load = useCallback(() => {
    setLoading(true);
    const params: Record<string, string | number> = { page, sort };
    if (search) params.search = search;
    if (tipeSlug) params.tipe_slug = tipeSlug;
    if (kategoriSlug) params.kategori_slug = kategoriSlug;
    katalogAPI.list(params)
      .then(({ data }) => { setItems(data.data); setMeta(data.meta ?? null); })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [search, tipeSlug, page, sort, kategoriSlug]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); setTipeSlug(''); }, [kategoriSlug]);
  useEffect(() => { setPage(1); }, [search, tipeSlug, sort]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link to="/katalog" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17h.01M16 17h.01M3 11l1.5-5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.4L21 11M3 11h18M3 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-6" /></svg>
            </div>
            <span className="text-lg font-bold text-gray-900 hidden sm:block">PILAR Rental</span>
          </Link>
          <div className="flex items-center gap-3">
            <a href="https://wa.me/62895361054272?text=Halo%2C%20saya%20ingin%20bertanya%20tentang%20layanan%20rental"
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
              Hubungi Kami
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="max-w-2xl">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight">
              Sewa Kendaraan<br />
              <span className="text-blue-200">Mudah & Terpercaya</span>
            </h1>
            <p className="mt-4 text-blue-100 text-lg leading-relaxed">
              Pilihan kendaraan lengkap, harga transparan, proses cepat. Tersedia mobil dan motor untuk kebutuhan harian, wisata, hingga bisnis.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a href="#katalog"
                className="px-6 py-3 bg-white text-blue-700 font-semibold rounded-xl hover:bg-blue-50 transition-colors shadow-lg">
                Lihat Katalog
              </a>
              <a href="https://wa.me/62895361054272?text=Halo%2C%20saya%20ingin%20konsultasi%20tentang%20rental%20kendaraan"
                target="_blank" rel="noopener noreferrer"
                className="px-6 py-3 border-2 border-white/40 text-white font-semibold rounded-xl hover:bg-white/10 transition-colors">
                Konsultasi Gratis
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { icon: 'M8 17h.01M16 17h.01', label: 'Unit Tersedia', value: `${meta?.total || 0}+` },
              { icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', label: 'Terjamin Aman', value: '100%' },
              { icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', label: 'Proses Cepat', value: '< 5 Menit' },
              { icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z', label: 'Pelanggan Puas', value: '500+' },
            ].map((s, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={s.icon} /></svg>
                </div>
                <div className="text-xl font-bold text-gray-900">{s.value}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Katalog */}
      <section id="katalog" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Katalog Kendaraan</h2>
            <p className="text-sm text-gray-500 mt-1">Pilih kendaraan yang sesuai kebutuhan Anda</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input type="text" placeholder="Cari merek, model, nama..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
            {sortOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        {/* Kategori Tabs */}
        {kategoris.length > 0 && (
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            <button onClick={() => setKategoriSlug('')}
              className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${kategoriSlug === '' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-600'}`}>
              Semua Kategori
            </button>
            {kategoris.map((k) => (
              <button key={k.id} onClick={() => setKategoriSlug(k.slug)}
                className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${kategoriSlug === k.slug ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-600'}`}>
                {k.nama_kategori}
                {k.kendaraans_count > 0 && <span className={`ml-1.5 text-xs ${kategoriSlug === k.slug ? 'text-blue-200' : 'text-gray-400'}`}>({k.kendaraans_count})</span>}
              </button>
            ))}
          </div>
        )}

        {/* Tipe Tabs */}
        {tipes.length > 0 && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            <button onClick={() => setTipeSlug('')}
              className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${tipeSlug === '' ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-purple-300 hover:text-purple-600'}`}>
              Semua Tipe
            </button>
            {tipes.map((t) => (
              <button key={t.id} onClick={() => setTipeSlug(t.slug)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${tipeSlug === t.slug ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-purple-300 hover:text-purple-600'}`}>
                {t.nama_tipe}
                {t.kendaraans_count > 0 && <span className={`ml-1 ${tipeSlug === t.slug ? 'text-purple-200' : 'text-gray-400'}`}>({t.kendaraans_count})</span>}
              </button>
            ))}
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="skeleton h-44 w-full" />
                <div className="p-4 space-y-3">
                  <div className="skeleton h-5 w-3/4 rounded" />
                  <div className="skeleton h-4 w-1/2 rounded" />
                  <div className="skeleton h-8 w-full rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 17h.01M16 17h.01M3 11l1.5-5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.4L21 11M3 11h18M3 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-6" /></svg>
            <p className="text-gray-500 font-medium">Tidak ada kendaraan ditemukan</p>
            <p className="text-sm text-gray-400 mt-1">Coba ubah filter pencarian Anda</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {items.map((item) => (
                <Link key={item.id} to={`/katalog/${item.id}`}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-blue-200 transition-all group">
                  <div className="h-44 bg-gray-100 overflow-hidden relative">
                    {item.foto ? (
                      <img src={getFotoUrl(item.foto)} alt={item.nama_kendaraan}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 17h.01M16 17h.01M3 11l1.5-5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.4L21 11M3 11h18M3 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-6" /></svg>
                      </div>
                    )}
                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-1 bg-white/90 backdrop-blur-sm text-xs font-semibold text-gray-700 rounded-lg uppercase">
                        {item.tipe}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {item.nama_kendaraan}
                    </h3>
                    <p className="text-sm text-gray-500 mt-0.5">{item.merek} {item.model} &middot; {item.tahun}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        {item.kapasitas_penumpang} kursi
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        {item.garasi_partner?.nama_garasi}
                      </span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                      <div>
                        <span className="text-lg font-bold text-blue-600">{formatRupiah(item.harga_sewa_per_hari)}</span>
                        <span className="text-xs text-gray-500">/hari</span>
                      </div>
                      {item.status === 'tersedia' ? (
                        <span className="text-xs font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-full">Tersedia</span>
                      ) : item.status === 'disewa' ? (
                        <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full">Disewa</span>
                      ) : (
                        <span className="text-xs font-medium text-orange-700 bg-orange-50 px-2.5 py-1 rounded-full">Sedang Diservis</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {meta && meta.last_page > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors">
                  Sebelumnya
                </button>
                <span className="text-sm text-gray-600 px-3">Halaman {page} dari {meta.last_page}</span>
                <button onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))} disabled={page === meta.last_page}
                  className="px-3 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors">
                  Selanjutnya
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* CTA */}
      <section className="bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <h2 className="text-2xl font-bold text-white">Butuh Kendaraan Sekarang?</h2>
          <p className="mt-2 text-blue-100">Hubungi kami via WhatsApp untuk konsultasi dan pemesanan cepat</p>
          <a href="https://wa.me/62895361054272?text=Halo%2C%20saya%20butuh%20kendaraan%20untuk%20disewa"
            target="_blank" rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 px-8 py-3 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition-colors shadow-lg">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
            Chat WhatsApp Sekarang
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17h.01M16 17h.01M3 11l1.5-5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.4L21 11M3 11h18M3 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-6" /></svg>
                </div>
                <span className="text-white font-bold">PILAR Rental</span>
              </div>
              <p className="text-sm leading-relaxed">Solusi rental kendaraan terpercaya. Armada lengkap, proses mudah, harga bersahabat.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Kontak</h4>
              <div className="space-y-2 text-sm">
                <p>WhatsApp: 0895-3610-54272</p>
                <p>Email: info@pilarrental.com</p>
                <p>Jl. Contoh No. 123, Kota</p>
              </div>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Jam Operasional</h4>
              <div className="space-y-2 text-sm">
                <p>Senin - Sabtu: 08.00 - 17.00</p>
                <p>Minggu: 08.00 - 12.00</p>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-gray-800 text-center text-sm">
            &copy; {new Date().getFullYear()} PILAR Rental. Hak cipta dilindungi.
          </div>
        </div>
      </footer>
    </div>
  );
}
