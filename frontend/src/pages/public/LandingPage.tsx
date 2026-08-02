import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Car,
  Shield,
  Clock,
  Star,
  Phone,
  Search,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Zap,
  Users,
  Wrench,
  Key,
  Plane,
  Building2,
  Heart,
  Quote,
  AlertCircle,
} from 'lucide-react';
import { katalogAPI, type KatalogItem, type KategoriKendaraan } from '../../services/api';
import { formatRupiah, ADMIN_WA } from '../../lib/format';
import AnimatedSection from '../../components/public/landing/AnimatedSection';
import heroVideo from '../../assets/hero.mp4';

const getFotoUrl = (foto: string | null | undefined): string | null => {
  if (!foto) return null;
  if (foto.startsWith('http')) return foto;
  return `/storage/${foto}`;
};

const layananItems = [
  { icon: Car, title: 'Rental Harian', desc: 'Sewa mobil untuk kebutuhan harian Anda' },
  { icon: Calendar, title: 'Rental Mingguan', desc: 'Sewa mobil untuk perjalanan mingguan' },
  { icon: Calendar, title: 'Rental Bulanan', desc: 'Sewa mobil jangka panjang dengan harga spesial' },
  { icon: Users, title: 'Dengan Driver', desc: 'Layanan rental dengan sopir profesional' },
  { icon: Key, title: 'Lepas Kunci', desc: 'Sewa mobil tanpa supir, lepas kunci' },
  { icon: Plane, title: 'Antar Jemput Bandara', desc: 'Layanan antar jemput bandara' },
  { icon: Building2, title: 'Rental Perusahaan', desc: 'Solusi rental untuk kebutuhan perusahaan' },
  { icon: Heart, title: 'Wedding Car', desc: 'Mobil pengantin dengan desain premium' },
];

const langkahPemesanan = [
  { icon: Car, title: 'Pilih Mobil', desc: 'Jelajahi armada kami dan pilih kendaraan yang sesuai' },
  { icon: Check, title: 'Isi Data', desc: 'Isi data diri dan konfirmasi tanggal sewa' },
  { icon: Shield, title: 'Konfirmasi Booking', desc: 'Konfirmasi pembayaran dan booking Anda' },
  { icon: Star, title: 'Nikmati Perjalanan', desc: 'Kendarai mobil impian Anda dengan aman' },
];

const testimoniData = [
  {
    nama: 'Budi Santoso',
    rating: 5,
    komentar: 'Pelayanan sangat cepat dan mobilnya bersih. Sangat direkomendasikan!',
  },
  {
    nama: 'Ani Wulandari',
    rating: 5,
    komentar: 'Harga transparan dan sopirnya ramah. Tempat rental terbaik di kota ini.',
  },
  {
    nama: 'Rudi Hermawan',
    rating: 4,
    komentar: 'Mobil dalam kondisi prima dan proses bookingnya mudah. Terima kasih!',
  },
  {
    nama: 'Siti Aminah',
    rating: 5,
    komentar: 'Sangat puas dengan layanan rental ini. Mobil baru dan terawat.',
  },
];

const faqData = [
  {
    q: 'Bagaimana cara booking mobil?',
    a: 'Anda bisa booking melalui halaman Katalog, pilih kendaraan yang diinginkan, lalu klik "Sewa Sekarang". Atau hubungi kami via WhatsApp untuk bantuan langsung.',
  },
  {
    q: 'Apakah tersedia layanan sopir?',
    a: 'Ya, kami menyediakan layanan rental dengan sopir profesional. Pilih opsi "Dengan Driver" saat booking.',
  },
  {
    q: 'Apakah mobil bisa lepas kunci?',
    a: 'Ya, kami menyediakan layanan lepas kunci untuk pelanggan yang memenuhi syarat. Silakan hubungi kami untuk informasi lebih lanjut.',
  },
  {
    q: 'Bagaimana metode pembayaran?',
    a: 'Kami menerima pembayaran tunai, transfer bank, dan QRIS. Pembayaran dilakukan saat konfirmasi booking.',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [featured, setFeatured] = useState<KatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const [testimonialIdx, setTestimonialIdx] = useState(0);

  // Search state — cari berdasarkan nama mobil atau kapasitas
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);

    katalogAPI
      .list({ page: 1, sort: 'terbaru' })
      .then((res) => {
        if (cancelled) return;
        setFeatured((res.data.data as KatalogItem[]).slice(0, 8));
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const nextTestimonial = () => {
    setTestimonialIdx((prev) => (prev + 1) % testimoniData.length);
  };

  const prevTestimonial = () => {
    setTestimonialIdx((prev) => (prev - 1 + testimoniData.length) % testimoniData.length);
  };

  const toggleFaq = (idx: number) => {
    setFaqOpen(faqOpen === idx ? null : idx);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    navigate(`/katalog${query ? `?search=${encodeURIComponent(query)}` : ''}`);
  };

  return (
    <div className="min-h-screen">
      {/* ========== HERO ========== */}
      <section className="bg-black relative overflow-hidden">
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover motion-reduce:hidden"
        >
          <source src={heroVideo} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/60" />
        <div className="max-w-[1600px] mx-auto px-8 sm:px-12 lg:px-24 py-20 sm:py-28 relative">
          <AnimatedSection>
            <span className="text-[11px] font-semibold tracking-widest uppercase text-primary-400 mb-4 block">
              Rental Kendaraan Terpercaya
            </span>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight max-w-3xl">
              Solusi Mobilitas
              <br />
              <span className="text-primary-400">Untuk Kebutuhan Anda</span>
            </h1>
            <p className="mt-5 text-black-400 text-[15px] leading-relaxed max-w-xl">
              Armada lengkap, harga transparan, proses cepat. Tersedia mobil dan motor untuk kebutuhan harian, wisata, hingga bisnis di seluruh Indonesia.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/katalog"
                className="px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/25 inline-flex items-center gap-2"
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

      {/* ========== SECTION 1: SEARCH BOOKING CARD ========== */}
      <section className="relative z-10 -mt-8 sm:-mt-10">
        <div className="max-w-[1600px] mx-auto px-5 sm:px-8 lg:px-20">
          <AnimatedSection>
            <form
              onSubmit={handleSearchSubmit}
              className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-black-200 p-4 sm:p-5"
            >
              <label htmlFor="search-mobil" className="sr-only">
                Cari nama mobil atau kapasitas
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black-400" />
                  <input
                    id="search-mobil"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama mobil (mis. Avanza) atau kapasitas (mis. 7 orang)"
                    className="w-full pl-11 pr-4 py-3.5 bg-canvas border border-black-200 rounded-xl text-sm text-black focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  className="shrink-0 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3.5 px-8 rounded-xl shadow-lg shadow-primary-600/25 transition-all inline-flex items-center justify-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  Cari Mobil
                </button>
              </div>
            </form>
          </AnimatedSection>
        </div>
      </section>

      {/* ========== SECTION 2: KEUNGGULAN ========== */}
      <section className="bg-white py-16">
        <div className="max-w-[1600px] mx-auto px-5 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="text-center mb-10">
              <span className="text-[11px] font-semibold tracking-widest uppercase text-primary-500 mb-3 block">
                Keunggulan Kami
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-black tracking-tight">
                Mengapa Memilih Kami
              </h2>
            </div>
          </AnimatedSection>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Car, title: 'Armada Terlengkap', desc: 'Pilihan kendaraan sesuai kebutuhan.' },
              { icon: Shield, title: 'Kendaraan Terawat', desc: 'Servis rutin dan kondisi prima.' },
              { icon: Clock, title: 'Booking Mudah', desc: 'Pesan kapan saja secara online.' },
              { icon: Star, title: 'Support 24 Jam', desc: 'Customer Service siap membantu.' },
            ].map((item, i) => (
              <AnimatedSection key={item.title} delay={i * 0.1}>
                <div className="text-center p-6">
                  <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <item.icon className="w-5 h-5 text-primary-600" />
                  </div>
                  <h3 className="font-semibold text-black text-sm mb-1">{item.title}</h3>
                  <p className="text-xs text-black-400 leading-relaxed">{item.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ========== SECTION 3: ARMADA POPULER ========== */}
      <section className="bg-white py-16">
        <div className="max-w-[1600px] mx-auto px-5 sm:px-8 lg:px-20">
          <AnimatedSection>
            <div className="flex items-end justify-between mb-8">
              <div>
                <span className="text-[11px] font-semibold tracking-widest uppercase text-primary-500 mb-3 block">
                  Armada Populer
                </span>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-black tracking-tight">
                  Pilihan Terbaik Kami
                </h2>
              </div>
              <Link
                to="/katalog"
                className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors"
              >
                Lihat Semua
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </AnimatedSection>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-black-200 overflow-hidden animate-pulse">
                  <div className="h-44 bg-black-200" />
                  <div className="p-4 space-y-3">
                    <div className="h-5 bg-black-200 rounded w-3/4" />
                    <div className="h-4 bg-black-200 rounded w-1/2" />
                    <div className="h-8 bg-black-200 rounded w-full mt-4" />
                  </div>
                </div>
              ))}
            </div>
          ) : loadError ? (
            <div className="text-center py-16 border border-dashed border-black-200 rounded-xl">
              <AlertCircle className="w-8 h-8 text-black-300 mx-auto mb-3" />
              <p className="text-sm text-black-500">Gagal memuat armada. Silakan muat ulang halaman.</p>
            </div>
          ) : featured.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-black-200 rounded-xl">
              <Car className="w-8 h-8 text-black-300 mx-auto mb-3" />
              <p className="text-sm text-black-500">Belum ada kendaraan yang tersedia saat ini.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {featured.map((item) => {
                const fotoUrl = getFotoUrl(item.foto);
                return (
                  <AnimatedSection key={item.id} delay={0}>
                    <Link
                      to={`/katalog/${item.id}`}
                      className="group block bg-white rounded-xl border border-black-200 overflow-hidden hover:shadow-lg hover:border-primary-200 transition-all"
                    >
                      <div className="relative h-44 bg-canvas overflow-hidden">
                        {fotoUrl ? (
                          <img
                            src={fotoUrl}
                            alt={item.nama_kendaraan}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Car className="w-10 h-10 text-black-200" />
                          </div>
                        )}
                        {item.tipe && (
                          <span className="absolute top-3 left-3 px-2.5 py-1 bg-white/90 backdrop-blur-sm text-xs font-semibold text-black-700 rounded-lg uppercase">
                            {item.tipe.nama_tipe}
                          </span>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-black group-hover:text-primary-600 transition-colors line-clamp-1">
                          {item.nama_kendaraan}
                        </h3>
                        <p className="text-sm text-black-400 mt-0.5">
                          {item.merek} {item.model} &middot; {item.tahun}
                        </p>
                        <div className="flex items-center gap-1 mt-2">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="w-3.5 h-3.5 text-accent-500 fill-accent-500" />
                          ))}
                        </div>
                        <div className="mt-3 pt-3 border-t border-accent-100 flex items-center justify-between">
                          <span className="text-lg font-bold text-primary-600">
                            {formatRupiah(item.harga_sewa_per_hari)}
                            <span className="text-xs text-black-400 font-normal">/Hari</span>
                          </span>
                          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-success-50 text-success-600">
                            Tersedia
                          </span>
                        </div>
                        <span className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-xl group-hover:bg-primary-700 transition-colors">
                          Sewa Sekarang
                        </span>
                      </div>
                    </Link>
                  </AnimatedSection>
                );
              })}
            </div>
          )}

          <div className="mt-6 text-center sm:hidden">
            <Link
              to="/katalog"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors"
            >
              Lihat Semua Kendaraan
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ========== SECTION 4: LAYANAN KAMI ========== */}
      <section className="bg-white py-16">
        <div className="max-w-[1600px] mx-auto px-5 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="text-center mb-10">
              <span className="text-[11px] font-semibold tracking-widest uppercase text-primary-500 mb-3 block">
                Layanan Kami
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-black tracking-tight">
                Pilihan Sewa Lengkap
              </h2>
            </div>
          </AnimatedSection>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {layananItems.map((item, i) => (
              <AnimatedSection key={item.title} delay={i * 0.05}>
                <div className="bg-canvas rounded-xl p-4 border border-black-200 text-center hover:bg-primary-600 hover:text-white transition-all duration-300 group cursor-default">
                  <item.icon className="w-6 h-6 text-primary-600 group-hover:text-white transition-colors mx-auto mb-2" />
                  <h3 className="font-semibold text-black text-xs group-hover:text-white transition-colors">{item.title}</h3>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ========== SECTION 5: PROMO + CTA (COMBINED) ========== */}
      <section className="relative bg-primary-600 overflow-hidden py-16 sm:py-20">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-700 to-primary-500" />
          <svg className="absolute right-0 top-0 h-full w-1/3 opacity-10" viewBox="0 0 400 400" fill="none" aria-hidden="true">
            <path d="M400 0L0 400V200L400 0Z" fill="white" />
          </svg>
        </div>
        <div className="max-w-[1600px] mx-auto px-5 sm:px-8 lg:px-20 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <AnimatedSection>
              <span className="text-[11px] font-semibold tracking-widest uppercase text-accent-400 mb-3 block">
                Promo Spesial
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight">
                Diskon Hingga
                <br />
                <span className="text-accent-400">20%</span>
              </h2>
              <p className="mt-4 text-primary-100 text-sm leading-relaxed max-w-md">
                Nikmati promo spesial untuk berbagai pilihan kendaraan.
                Pesan sekarang dan dapatkan harga terbaik.
              </p>
              <Link
                to="/katalog"
                className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 bg-accent-500 text-black font-semibold rounded-xl hover:bg-accent-400 transition-colors shadow-lg shadow-accent-500/25 text-sm"
              >
                Booking Sekarang
                <ArrowRight className="w-4 h-4" />
              </Link>
            </AnimatedSection>
            <AnimatedSection delay={0.2} className="relative hidden lg:flex items-center justify-center">
              <div className="w-64 h-64 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Car className="w-32 h-32 text-white/20" />
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ========== SECTION 6: CARA PEMESANAN ========== */}
      <section className="bg-canvas py-16">
        <div className="max-w-[1600px] mx-auto px-5 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="text-center mb-10">
              <span className="text-[11px] font-semibold tracking-widest uppercase text-primary-500 mb-3 block">
                Cara Pemesanan
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-black tracking-tight">
                Mudah dan Cepat
              </h2>
            </div>
          </AnimatedSection>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {langkahPemesanan.map((item, i) => (
              <AnimatedSection key={item.title} delay={i * 0.1}>
                <div className="text-center p-4">
                  <div className="w-14 h-14 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <item.icon className="w-6 h-6 text-primary-600" />
                  </div>
                  <h3 className="font-semibold text-black text-sm mb-1">{item.title}</h3>
                  <p className="text-xs text-black-400 leading-relaxed">{item.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ========== SECTION 7: TESTIMONI & FAQ ========== */}
      <section className="bg-canvas py-20 sm:py-24">
        <div className="max-w-[1600px] mx-auto px-5 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Testimoni */}
            <AnimatedSection>
              <span className="text-[11px] font-semibold tracking-widest uppercase text-primary-500 mb-3 block">
                Testimoni
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-black tracking-tight mb-8">
                Testimoni Pelanggan
              </h2>
              <div className="bg-white rounded-2xl border border-black-200 shadow-sm p-6 sm:p-8">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-accent-500 fill-accent-500" />
                  ))}
                </div>
                <Quote className="w-8 h-8 text-primary-200 mb-4" aria-hidden="true" />
                <p className="text-black-700 leading-relaxed mb-6">
                  &quot;{testimoniData[testimonialIdx].komentar}&quot;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-primary-600">
                      {testimoniData[testimonialIdx].nama.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-black text-sm">{testimoniData[testimonialIdx].nama}</p>
                    <div className="flex items-center gap-1">
                      {[...Array(testimoniData[testimonialIdx].rating)].map((_, i) => (
                        <Star key={i} className="w-3 h-3 text-accent-500 fill-accent-500" />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-accent-100">
                  <button
                    type="button"
                    onClick={prevTestimonial}
                    aria-label="Testimoni sebelumnya"
                    className="w-8 h-8 rounded-full border border-black-200 flex items-center justify-center hover:bg-canvas transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-black-400" />
                  </button>
                  <span className="text-xs text-black-400">
                    {testimonialIdx + 1} / {testimoniData.length}
                  </span>
                  <button
                    type="button"
                    onClick={nextTestimonial}
                    aria-label="Testimoni berikutnya"
                    className="w-8 h-8 rounded-full border border-black-200 flex items-center justify-center hover:bg-canvas transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-black-400" />
                  </button>
                </div>
              </div>
            </AnimatedSection>

            {/* FAQ */}
            <AnimatedSection delay={0.1}>
              <span className="text-[11px] font-semibold tracking-widest uppercase text-primary-500 mb-3 block">
                Pertanyaan Umum
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-black tracking-tight mb-8">
                FAQ
              </h2>
              <div className="space-y-3">
                {faqData.map((item, i) => (
                  <button
                    key={item.q}
                    type="button"
                    onClick={() => toggleFaq(i)}
                    aria-expanded={faqOpen === i}
                    className="w-full bg-white rounded-xl border border-black-200 p-4 sm:p-5 text-left hover:shadow-md transition-all"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="font-semibold text-black text-sm pr-4">{item.q}</h3>
                      <ChevronDown
                        className={`w-4 h-4 text-black-400 shrink-0 transition-transform duration-300 ${
                          faqOpen === i ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                    <div
                      className={`overflow-hidden transition-all duration-300 ${
                        faqOpen === i ? 'max-h-96 mt-3' : 'max-h-0'
                      }`}
                    >
                      <p className="text-sm text-black-400 leading-relaxed">{item.a}</p>
                    </div>
                  </button>
                ))}
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ========== FOOTER (via PublicLayout) ========== */}
    </div>
  );
}