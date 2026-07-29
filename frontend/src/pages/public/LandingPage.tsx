import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Car, Shield, Clock, Star, MapPin, Phone } from 'lucide-react';
import { katalogAPI, type KatalogItem, type KategoriKendaraan } from '../../services/api';
import { formatRupiah, ADMIN_WA } from '../../lib/format';
import AnimatedSection from '../../components/public/landing/AnimatedSection';
import heroVideo from '../../assets/hero.mp4';

const getFotoUrl = (foto: string | null | undefined): string | null => {
  if (!foto) return null;
  if (foto.startsWith('http')) return foto;
  return `/storage/${foto}`;
};

const features = [
  { icon: Car, title: 'Armada Lengkap', desc: 'Pilihan kendaraan lengkap dari sedan hingga bus pariwisata.' },
  { icon: Shield, title: 'Terjamin Aman', desc: 'Seluruh kendaraan terawat dan dilengkapi asuransi.' },
  { icon: Clock, title: 'Proses Cepat', desc: 'Pemesanan mudah dan konfirmasi cepat tanpa ribet.' },
  { icon: Star, title: 'Harga Bersahabat', desc: 'Harga transparan tanpa biaya tersembunyi.' },
];

export default function LandingPage() {
  const [featured, setFeatured] = useState<KatalogItem[]>([]);
  const [kategoris, setKategoris] = useState<KategoriKendaraan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      katalogAPI.list({ page: 1, sort: 'terbaru' }),
      katalogAPI.kategoris(),
    ])
      .then(([katalogRes, katRes]) => {
        setFeatured((katalogRes.data.data as KatalogItem[]).slice(0, 8));
        setKategoris((katRes.data.data as unknown as KategoriKendaraan[]).slice(0, 6));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-ink-950 relative overflow-hidden">
        <video autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover">
          <source src={heroVideo} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/60" />
        <div className="max-w-[1600px] mx-auto px-8 sm:px-12 lg:px-24 py-20 sm:py-28 relative">
          <AnimatedSection>
            <span className="text-[11px] font-semibold tracking-widest uppercase text-brand-400 mb-4 block">
              Rental Kendaraan Terpercaya
            </span>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight max-w-3xl">
              Solusi Mobilitas
              <br />
              <span className="text-brand-400">Untuk Kebutuhan Anda</span>
            </h1>
            <p className="mt-5 text-ink-400 text-[15px] leading-relaxed max-w-xl">
              Armada lengkap, harga transparan, proses cepat. Tersedia mobil dan motor untuk kebutuhan harian, wisata, hingga bisnis di seluruh Indonesia.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/katalog"
                className="px-6 py-3 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 transition-colors shadow-lg shadow-brand-600/25 inline-flex items-center gap-2"
              >
                Lihat Katalog
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href={`https://wa.me/${ADMIN_WA}?text=Halo%2C%20saya%20ingin%20konsultasi%20tentang%20rental%20kendaraan`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 border-2 border-white/20 text-white font-semibold rounded-xl hover:bg-white/5 transition-colors"
              >
                Konsultasi Gratis
              </a>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-20 py-14">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((f, i) => (
              <AnimatedSection key={i} delay={i * 0.1}>
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center">
                    <f.icon className="w-5 h-5 text-brand-600" />
                  </div>
                  <h3 className="font-semibold text-ink-950">{f.title}</h3>
                  <p className="text-sm text-ink-400 leading-relaxed">{f.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Kategori */}
      {kategoris.length > 0 && (
        <section className="bg-gray-50">
          <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-20 py-16">
            <AnimatedSection>
              <span className="text-[11px] font-semibold tracking-widest uppercase text-brand-500 mb-3 block">
                Kategori
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink-950 tracking-tight">
                Pilih Berdasarkan Kebutuhan
              </h2>
              <p className="mt-2 text-ink-400 text-[15px]">
                Tersedia berbagai pilihan kategori kendaraan
              </p>
            </AnimatedSection>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mt-8">
              {kategoris.map((k, i) => (
                <AnimatedSection key={k.id} delay={i * 0.05}>
                  <Link
                    to="/katalog"
                    className="group block bg-white rounded-xl border border-gray-200 p-5 text-center hover:border-brand-300 hover:shadow-md transition-all"
                  >
                    <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-brand-100 transition-colors">
                      <Car className="w-5 h-5 text-brand-600" />
                    </div>
                    <h3 className="font-semibold text-ink-950 text-sm">{k.nama_kategori}</h3>
                  </Link>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Kendaraan */}
      {featured.length > 0 && (
        <section className="bg-white">
          <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-20 py-16">
            <AnimatedSection>
              <div className="flex items-end justify-between mb-8">
                <div>
                  <span className="text-[11px] font-semibold tracking-widest uppercase text-brand-500 mb-3 block">
                    Armada Kami
                  </span>
                  <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink-950 tracking-tight">
                    Kendaraan Terbaru
                  </h2>
                </div>
                <Link
                  to="/katalog"
                  className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors"
                >
                  Lihat Semua
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </AnimatedSection>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
                    <div className="h-44 bg-gray-200" />
                    <div className="p-4 space-y-3">
                      <div className="h-5 bg-gray-200 rounded w-3/4" />
                      <div className="h-4 bg-gray-200 rounded w-1/2" />
                      <div className="h-4 bg-gray-200 rounded w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {featured.map((item) => {
                  const fotoUrl = getFotoUrl(item.foto);
                  return (
                    <Link
                      key={item.id}
                      to={`/katalog/${item.id}`}
                      className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-brand-200 transition-all"
                    >
                      <div className="relative h-44 bg-gray-100 overflow-hidden">
                        {fotoUrl ? (
                          <img
                            src={fotoUrl}
                            alt={item.nama_kendaraan}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Car className="w-10 h-10 text-gray-300" />
                          </div>
                        )}
                        {item.tipe && (
                          <span className="absolute top-3 left-3 px-2.5 py-1 bg-white/90 backdrop-blur-sm text-xs font-semibold text-gray-700 rounded-lg uppercase">
                            {item.tipe.nama_tipe}
                          </span>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-ink-950 group-hover:text-brand-600 transition-colors line-clamp-1">
                          {item.nama_kendaraan}
                        </h3>
                        <p className="text-sm text-ink-400 mt-0.5">
                          {item.merek} {item.model} &middot; {item.tahun}
                        </p>
                        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                          <span className="text-lg font-bold text-brand-600">
                            {formatRupiah(item.harga_sewa_per_hari)}
                            <span className="text-xs text-ink-400 font-normal">/hari</span>
                          </span>
                          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-50 text-green-700">
                            Tersedia
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
            <div className="mt-8 text-center sm:hidden">
              <Link
                to="/katalog"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors"
              >
                Lihat Semua Kendaraan
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="bg-brand-600">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-20 py-14 text-center">
          <AnimatedSection>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Butuh Kendaraan Sekarang?
            </h2>
            <p className="mt-3 text-brand-100">
              Hubungi kami via WhatsApp untuk konsultasi dan pemesanan cepat
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
              <a
                href={`https://wa.me/${ADMIN_WA}?text=Halo%2C%20saya%20butuh%20kendaraan%20untuk%20disewa`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-3 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition-colors shadow-lg"
              >
                <Phone className="w-5 h-5" />
                Chat WhatsApp
              </a>
              <Link
                to="/kontak"
                className="inline-flex items-center gap-2 px-8 py-3 border-2 border-white/30 text-white font-semibold rounded-xl hover:bg-white/10 transition-colors"
              >
                <MapPin className="w-5 h-5" />
                Hubungi Kami
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </div>
  );
}
