import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import heroImg from '../assets/hero.png';
import {
  Search, SlidersHorizontal, Users, ChevronLeft, ChevronRight,
  Star, Quote, ArrowRight, ChevronDown,
  ShieldCheck, Clock, Wallet, Globe, Award, Car, Map,
  Briefcase, GraduationCap, Heart, Factory, Building2, Hotel,
  Newspaper,
} from 'lucide-react';
import { katalogAPI, type KategoriKendaraan, type TipeKendaraan } from '../services/api';
import AnimatedSection from '../components/public/landing/AnimatedSection';
import MegaMenu from '../components/public/landing/MegaMenu';
import LandingFooter from '../components/public/landing/LandingFooter';

/* ─── Helpers ────────────────────────────────────────────────────────── */

function formatRupiah(n: number | string): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(n));
}

function getFotoUrl(foto: string | null | undefined): string | null {
  if (!foto) return null;
  if (foto.startsWith('http')) return foto;
  return `/storage/${foto}`;
}

/* ─── Types ──────────────────────────────────────────────────────────── */

interface KategoriKendaraanExt extends KategoriKendaraan { slug: string; kendaraans_count: number; }
interface TipeKendaraanExt extends TipeKendaraan { slug: string; kendaraans_count: number; }

/* ─── Static Data ────────────────────────────────────────────────────── */

const highlights = [
  { value: '15+', label: 'Tahun Pengalaman' },
  { value: '150+', label: 'Armada' },
  { value: '25+', label: 'Kota Operasional' },
  { value: '20.000+', label: 'Pelanggan' },
  { value: '98%', label: 'Kepuasan' },
];

const services = [
  { icon: Car, title: 'Rental Mobil', desc: 'Sewa kendaraan harian, mingguan, dan bulanan dengan armada terawat.', href: '/katalog' },
  { icon: Briefcase, title: 'Corporate Transportation', desc: 'Solusi transportasi korporat untuk operasional bisnis Anda.', href: '/layanan/corporate' },
  { icon: Map, title: 'Airport Transfer', desc: 'Layanan antar jemput bandara yang tepat waktu dan nyaman.', href: '/layanan/airport' },
  { icon: Heart, title: 'Wedding Car', desc: 'Kendaraan premium untuk hari pernikahan yang berkesan.', href: '/layanan/wedding' },
  { icon: ShieldCheck, title: 'Chauffeur Service', desc: 'Sopir profesional berpengalaman untuk perjalanan Anda.', href: '/layanan/sopir' },
  { icon: Building2, title: 'Fleet Management', desc: 'Pengelolaan armada kendaraan perusahaan secara menyeluruh.', href: '/layanan/corporate' },
];

const whyUs = [
  { icon: ShieldCheck, title: 'Tim Profesional', desc: 'Didukung tim berpengalaman di bidang transportasi dan logistik.' },
  { icon: Clock, title: 'Layanan 24/7', desc: 'Dukungan pelanggan tersedia kapan pun Anda butuhkan.' },
  { icon: Globe, title: 'Cakupan Luas', desc: 'Beroperasi di 25+ kota di seluruh Indonesia.' },
  { icon: Award, title: 'Dipercaya Korporat', desc: 'Melayani ribuan perusahaan dan instansi pemerintah.' },
  { icon: Car, title: 'Sopir Bersertifikat', desc: 'Seluruh driver telah tersertifikasi dan terlatih.' },
  { icon: Wallet, title: 'Harga Transparan', desc: 'Tidak ada biaya tersembunyi. Harga jujur dan kompetitif.' },
];

const industries = [
  { icon: Briefcase, label: 'Corporate' },
  { icon: Building2, label: 'Government' },
  { icon: GraduationCap, label: 'Education' },
  { icon: Heart, label: 'Tourism' },
  { icon: Hotel, label: 'Hospitality' },
  { icon: Factory, label: 'Manufacturing' },
];

const timeline = [
  { year: '2009', title: 'Pendirian Perusahaan', desc: 'PT PILAR didirikan dengan fokus awal pada layanan rental kendaraan.' },
  { year: '2013', title: 'Ekspansi Regional', desc: 'Membuka cabang pertama di luar kota asal, memperluas cakupan layanan.' },
  { year: '2017', title: '100 Armada', desc: 'Mencapai milestone 100 unit kendaraan dalam armada operasional.' },
  { year: '2020', title: 'Digital Transformation', desc: 'Meluncurkan platform digital untuk pemesanan dan manajemen armada.' },
  { year: '2024', title: 'Ekspansi Nasional', desc: 'Beroperasi di 25+ kota dengan 150+ armada dan ribuan pelanggan.' },
];

const testimonials = [
  { name: 'PT Maju Bersama', role: 'Corporate Client', rating: 5, text: 'Pelayanan konsisten selama 5 tahun. Armada selalu terawat dan tepat waktu.' },
  { name: 'Dinas Pendidikan', role: 'Government', rating: 5, text: 'Solusi transportasi yang handal untuk kegiatan dinas dan kunjungan sekolah.' },
  { name: 'Harmony Travel', role: 'Travel Agent', rating: 5, text: 'Kerjasama yang sangat baik. Klien kami selalu puas dengan layanan PILAR.' },
  { name: 'PT Sejahtera', role: 'Corporate Client', rating: 5, text: 'Fleet management dari PILAR membantu operasional perusahaan kami lebih efisien.' },
];

const faqItems = [
  { q: 'Bagaimana cara melakukan reservasi?', a: 'Anda dapat melakukan reservasi melalui WhatsApp, form kontak di website, atau mengunjungi kantor cabang kami. Tim kami akan mengkonfirmasi ketersediaan dan mengirimkan penawaran harga.' },
  { q: 'Apakah melayani rental untuk perusahaan?', a: 'Ya, kami memiliki layanan khusus corporate rental dengan harga khusus, dedicated account manager, dan fleksibilitas pembayaran yang disesuaikan dengan kebutuhan perusahaan.' },
  { q: 'Area operasional mana saja yang terjangkau?', a: 'Kami beroperasi di 25+ kota di seluruh Indonesia, termasuk Jakarta, Bandung, Surabaya, Bali, Medan, Makassar, dan kota-kota besar lainnya.' },
  { q: 'Bagaimana dengan asuransi kendaraan?', a: 'Semua kendaraan kami dilengkapi dengan asuransi komprehensif. Pelanggan tidak perlu khawatir karenacoverage sudah termasuk dalam paket sewa.' },
  { q: 'Apakah bisa menyewa dengan sopir?', a: 'Tentu. Kami menyediakan layanan rental dengan sopir profesional yang bersertifikat dan berpengalaman. Biaya sopir sudah termasuk dalam paket.' },
];

const newsItems = [
  { date: '15 Jul 2026', title: 'PILAR Ekspansi ke 5 Kota Baru di Sulawesi', excerpt: 'Perusahaan terus memperluas cakupan layanan ke Indonesia bagian timur.' },
  { date: '28 Jun 2026', title: 'Peluncuran Armada Kendaraan Listrik', excerpt: 'Langkah nyata menuju operasional yang lebih ramah lingkungan.' },
  { date: '10 Jun 2026', title: 'PILAR Raih Sertifikasi ISO 9001:2015', excerpt: 'Bukti komitmen kami terhadap standar kualitas internasional.' },
];

const partners = [
  'PT Astra International', 'Telkom Indonesia', 'Bank Mandiri', 'Pertamina',
  'PT Unilever', 'Garuda Indonesia', 'PLN', 'PT Waskita Karya',
];

/* ─── Car Card ───────────────────────────────────────────────────────── */

function CarCard({ item }: { item: any }) {
  const available = item.status === 'tersedia';
  const fotoUrl = getFotoUrl(item.foto);

  return (
    <Link to={`/katalog/${item.id}`} className="group block">
      <div className={`relative bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-black/8 ${!available ? 'opacity-60' : ''}`}>
        {/* Image */}
        <div className="relative aspect-[16/10] bg-gray-100 overflow-hidden">
          {fotoUrl ? (
            <img src={fotoUrl} alt={item.nama_kendaraan} loading="lazy"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-50">
              <Car size={40} className="text-gray-200" />
            </div>
          )}

          {/* Gradient overlay bottom */}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/40 to-transparent" />

          {/* Status badge top-right */}
          <div className="absolute top-3 right-3">
            {available ? (
              <span className="px-2.5 py-1 bg-avail-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-sm">Tersedia</span>
            ) : (
              <span className="px-2.5 py-1 bg-ink-700 text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-sm">{item.status === 'disewa' ? 'Disewa' : 'Diservis'}</span>
            )}
          </div>

          {/* Tipe badge top-left */}
          {item.tipe && (
            <span className="absolute top-3 left-3 px-2.5 py-1 bg-white/90 backdrop-blur-sm text-[10px] font-bold text-ink-700 rounded-full">{item.tipe.nama_tipe}</span>
          )}

          {/* Price overlay bottom-right */}
          <div className="absolute bottom-3 right-3">
            <div className="bg-white/95 backdrop-blur-sm rounded-xl px-3 py-1.5 shadow-sm">
              <span className="font-display font-bold text-[15px] text-ink-950">{formatRupiah(item.harga_sewa_per_hari)}</span>
              <span className="text-[10px] text-ink-400 ml-0.5">/hari</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-[10px] font-bold text-brand-500 uppercase tracking-wider">{item.kategori?.nama_kategori || 'Kendaraan'}</p>
          <h3 className="font-display font-semibold text-[15px] text-ink-950 mt-1 group-hover:text-brand-600 transition-colors line-clamp-1">{item.nama_kendaraan}</h3>
          <p className="text-xs text-ink-400 mt-0.5">{item.merek} {item.model} &middot; {item.tahun}</p>

          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
            <span className="flex items-center gap-1 text-[11px] text-ink-400"><Users size={12} />{item.kapasitas_penumpang} kursi</span>
            {item.warna && <span className="flex items-center gap-1 text-[11px] text-ink-400"><span className="w-2.5 h-2.5 rounded-full border border-gray-200" style={{ backgroundColor: item.warna }} />{item.warna}</span>}
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ─── Testimonial Carousel ───────────────────────────────────────────── */

function TestimonialCarousel() {
  const [current, setCurrent] = useState(0);
  const prev = () => setCurrent((c) => (c === 0 ? testimonials.length - 1 : c - 1));
  const next = () => setCurrent((c) => (c === testimonials.length - 1 ? 0 : c + 1));

  return (
    <div className="relative">
      <div className="overflow-hidden">
        <motion.div className="flex" animate={{ x: `-${current * 100}%` }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
          {testimonials.map((t) => (
            <div key={t.name} className="w-full shrink-0 px-1">
              <div className="bg-white border border-gray-100 rounded-[20px] p-7 sm:p-8">
                <Quote size={20} className="text-gray-200 mb-4" />
                <p className="text-ink-700 text-[15px] leading-relaxed">{t.text}</p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="w-9 h-9 bg-brand-50 rounded-full flex items-center justify-center text-brand-600 font-semibold text-xs">{t.name.charAt(0)}</div>
                  <div className="flex-1">
                    <p className="font-semibold text-ink-950 text-sm">{t.name}</p>
                    <p className="text-ink-400 text-xs">{t.role}</p>
                  </div>
                  <div className="flex gap-0.5">{Array.from({ length: t.rating }).map((_, i) => <Star key={i} size={12} className="fill-amber-400 text-amber-400" />)}</div>
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
      <div className="flex items-center justify-center gap-2 mt-6">
        <button onClick={prev} className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-ink-400 hover:bg-gray-50 transition-colors"><ChevronLeft size={16} /></button>
        <div className="flex gap-1.5">{testimonials.map((_, i) => <button key={i} onClick={() => setCurrent(i)} className={`h-1.5 rounded-full transition-all duration-200 ${i === current ? 'w-5 bg-ink-950' : 'w-1.5 bg-gray-200'}`} />)}</div>
        <button onClick={next} className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-ink-400 hover:bg-gray-50 transition-colors"><ChevronRight size={16} /></button>
      </div>
    </div>
  );
}

/* ─── Main ───────────────────────────────────────────────────────────── */

export default function Katalog() {
  const location = useLocation();
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
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    if (location.hash === '#semua-armada') {
      const el = document.getElementById('semua-armada');
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [location.hash]);

  useEffect(() => {
    katalogAPI.kategoris().then(({ data }) => setKategoris(data as unknown as KategoriKendaraanExt[])).catch(() => {});
  }, []);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (kategoriSlug) params.kategori_slug = kategoriSlug;
    katalogAPI.tipes(params).then(({ data }) => setTipes(data as unknown as TipeKendaraanExt[])).catch(() => {});
  }, [kategoriSlug]);

  const load = useCallback(() => {
    setLoading(true);
    const params: Record<string, string | number> = { page, sort };
    if (search) params.search = search;
    if (tipeSlug) params.tipe_slug = tipeSlug;
    if (kategoriSlug) params.kategori_slug = kategoriSlug;
    katalogAPI.list(params).then(({ data }) => { setItems(data.data); setMeta(data.meta ?? null); }).catch(() => setItems([])).finally(() => setLoading(false));
  }, [search, tipeSlug, page, sort, kategoriSlug]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); setTipeSlug(''); }, [kategoriSlug]);
  useEffect(() => { setPage(1); }, [search, tipeSlug, sort]);

  return (
    <div className="min-h-screen bg-white">
      <MegaMenu />

      {/* ═══════ HERO ═══════ */}
      <section className="relative min-h-[90vh] flex items-center bg-ink-950 overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImg} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/80 to-transparent" />
        </div>
        <div className="relative max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-20 py-24 sm:py-32 w-full">
          <div className="max-w-2xl">
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
              className="inline-block text-[11px] font-semibold tracking-widest uppercase text-brand-400 mb-6">
              Solusi Transportasi & Mobilitas
            </motion.span>
            <motion.h1 initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
              className="font-display text-[2.5rem] sm:text-5xl lg:text-[3.5rem] font-bold text-white leading-[1.1] tracking-tight">
              Mitra Transportasi<br /><span className="text-white/40">Terpercaya Bisnis Anda.</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-5 text-base sm:text-lg text-ink-400 leading-relaxed max-w-lg">
              PT PILAR menyediakan solusi transportasi dan mobilitas komprehensif untuk kebutuhan korporat, pemerintah, dan individu di seluruh Indonesia.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/tentang" className="inline-flex items-center gap-2 px-6 py-3 bg-white text-ink-950 text-sm font-semibold rounded-lg hover:bg-gray-100 transition-colors duration-200">
                Pelajari Perusahaan <ArrowRight size={15} />
              </Link>
              <Link to="/katalog" className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white/50 hover:text-white transition-colors duration-200">
                Lihat Layanan
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════ COMPANY OVERVIEW ═══════ */}
      <section className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-20 py-20 sm:py-28">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <AnimatedSection>
            <span className="text-[11px] font-semibold tracking-widest uppercase text-brand-500 mb-4 block">Tentang Kami</span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink-950 tracking-tight leading-tight">
              Perusahaan transportasi nasional yang berkomitmen menyediakan solusi mobilitas terbaik.
            </h2>
            <p className="mt-5 text-ink-400 text-[15px] leading-relaxed">
              Didirikan pada tahun 2009, PT PILAR telah berkembang menjadi salah satu penyedia layanan transportasi terpercaya di Indonesia. Dengan armada lebih dari 150 kendaraan dan cakupan operasional di 25+ kota, kami melayani kebutuhan korporat, pemerintah, hingga individu.
            </p>
            <div className="mt-8 flex items-center gap-6">
              <Link to="/tentang" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-600 hover:text-brand-700 transition-colors">
                Profil Perusahaan <ArrowRight size={14} />
              </Link>
              <Link to="/kontak" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-600 hover:text-ink-950 transition-colors">
                Hubungi Kami <ArrowRight size={14} />
              </Link>
            </div>
          </AnimatedSection>
          <AnimatedSection delay={0.1}>
            <div className="bg-gray-50 rounded-[24px] p-8 sm:p-10">
              <div className="grid grid-cols-2 gap-6">
                {highlights.map((h, i) => (
                  <div key={i} className={i === highlights.length - 1 ? 'col-span-2 text-center' : ''}>
                    <div className={`font-display font-bold ${i === highlights.length - 1 ? 'text-4xl' : 'text-2xl'} text-ink-950`}>{h.value}</div>
                    <div className="text-[12px] text-ink-400 mt-1">{h.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ═══════ SERVICES ═══════ */}
      <section className="bg-gray-50 py-20 sm:py-28">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-20">
          <AnimatedSection className="max-w-xl mb-14">
            <span className="text-[11px] font-semibold tracking-widest uppercase text-brand-500 mb-4 block">Layanan Kami</span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink-950 tracking-tight">Solusi Transportasi Komprehensif</h2>
            <p className="mt-3 text-ink-400 text-[15px] leading-relaxed">Beragam layanan yang dirancang untuk memenuhi kebutuhan mobilitas Anda.</p>
          </AnimatedSection>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {services.map((s, i) => (
              <AnimatedSection key={s.title} delay={i * 0.06}>
                <Link to={s.href} className="group block bg-white rounded-[20px] border border-gray-100 p-7 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5">
                  <s.icon size={20} className="text-ink-950 mb-4" strokeWidth={1.5} />
                  <h3 className="font-display font-semibold text-[15px] text-ink-950 group-hover:text-brand-600 transition-colors">{s.title}</h3>
                  <p className="mt-2 text-ink-400 text-sm leading-relaxed">{s.desc}</p>
                  <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand-600 mt-4 group-hover:gap-2 transition-all">
                    Selengkapnya <ArrowRight size={12} />
                  </span>
                </Link>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ FULL CATALOG ═══════ */}
      <section id="semua-armada" className="bg-gray-50 py-20 sm:py-28 scroll-mt-20">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-20">
          <AnimatedSection className="mb-10">
            <span className="text-[11px] font-semibold tracking-widest uppercase text-brand-500 mb-4 block">Katalog Lengkap</span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink-950 tracking-tight">Semua Armada Kami</h2>
            <p className="mt-2 text-ink-400 text-sm">Temukan kendaraan yang sesuai dengan kebutuhan Anda.</p>
          </AnimatedSection>

          {/* Filters */}
          <AnimatedSection delay={0.05} className="mb-8">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Search bar */}
              <div className="p-4 border-b border-gray-100">
                <div className="relative">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input
                    type="text"
                    placeholder="Cari nama kendaraan, merek, atau model..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-ink-300"
                  />
                </div>
              </div>

              {/* Filter row */}
              <div className="p-4 space-y-3">
                {/* Category + Sort row */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex flex-wrap gap-1.5 flex-1">
                    <button
                      onClick={() => setKategoriSlug('')}
                      className={`px-4 py-2 text-[12px] font-semibold rounded-xl transition-all duration-200 ${
                        !kategoriSlug
                          ? 'bg-ink-950 text-white shadow-sm'
                          : 'bg-gray-100 text-ink-500 hover:bg-gray-200 hover:text-ink-700'
                      }`}
                    >
                      Semua
                    </button>
                    {kategoris.map((k) => (
                      <button
                        key={k.id}
                        onClick={() => setKategoriSlug(k.slug)}
                        className={`px-4 py-2 text-[12px] font-semibold rounded-xl transition-all duration-200 ${
                          kategoriSlug === k.slug
                            ? 'bg-ink-950 text-white shadow-sm'
                            : 'bg-gray-100 text-ink-500 hover:bg-gray-200 hover:text-ink-700'
                        }`}
                      >
                        {k.nama_kategori}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-200">
                    <SlidersHorizontal size={13} className="text-ink-400" />
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                      className="text-[12px] font-medium text-ink-600 bg-transparent border-none focus:outline-none cursor-pointer pr-1"
                    >
                      <option value="terbaru">Terbaru</option>
                      <option value="harga_terendah">Harga Terendah</option>
                      <option value="harga_tertinggi">Harga Tertinggi</option>
                      <option value="nama">Nama A-Z</option>
                    </select>
                  </div>
                </div>

                {/* Tipe pills */}
                {tipes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setTipeSlug('')}
                      className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all duration-200 border ${
                        !tipeSlug ? 'border-brand-200 bg-brand-50 text-brand-600' : 'border-gray-200 bg-white text-ink-400 hover:border-gray-300 hover:text-ink-600'
                      }`}
                    >
                      Semua Tipe
                    </button>
                    {tipes.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setTipeSlug(t.slug)}
                        className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all duration-200 border ${
                          tipeSlug === t.slug ? 'border-brand-200 bg-brand-50 text-brand-600' : 'border-gray-200 bg-white text-ink-400 hover:border-gray-300 hover:text-ink-600'
                        }`}
                      >
                        {t.nama_tipe}
                      </button>
                    ))}
                  </div>
                )}

                {/* Result count */}
                <div className="flex items-center gap-2 pt-1">
                  <div className="h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500 rounded-full transition-all duration-300" style={{ width: `${Math.min(((meta?.total ?? 0) / 50) * 100, 100)}%` }} />
                  </div>
                  <p className="text-[12px] text-ink-400 shrink-0">
                    <span className="font-semibold text-ink-700">{meta?.total ?? items.length}</span> kendaraan
                  </p>
                </div>
              </div>
            </div>
          </AnimatedSection>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-[20px] border border-gray-100 overflow-hidden">
                  <div className="aspect-[4/3] skeleton" />
                  <div className="p-5 space-y-2.5">
                    <div className="h-3 w-16 skeleton rounded" />
                    <div className="h-4 w-3/4 skeleton rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16">
              <Car size={40} className="text-gray-200 mx-auto mb-4" />
              <p className="font-semibold text-ink-950">Tidak ada kendaraan ditemukan</p>
              <p className="text-ink-400 text-sm mt-1">Coba ubah filter atau kata kunci pencarian Anda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {items.map((item) => <CarCard key={item.id} item={item} />)}
            </div>
          )}

          {/* Pagination */}
          {meta && meta.last_page > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-ink-400 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: meta.last_page }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-9 h-9 rounded-lg text-[13px] font-medium transition-colors ${
                    p === page ? 'bg-ink-950 text-white' : 'border border-gray-200 text-ink-500 hover:bg-gray-50'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
                disabled={page >= meta.last_page}
                className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-ink-400 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ═══════ WHY CHOOSE US ═══════ */}
      <section className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-20 py-20 sm:py-28">
        <AnimatedSection className="max-w-xl mb-14">
          <span className="text-[11px] font-semibold tracking-widest uppercase text-brand-500 mb-4 block">Mengapa Kami</span>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink-950 tracking-tight">Komitmen Kami Terhadap Anda</h2>
          <p className="mt-3 text-ink-400 text-[15px] leading-relaxed">Standar pelayanan tinggi yang kami jaga untuk setiap pelanggan.</p>
        </AnimatedSection>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {whyUs.map((w, i) => (
            <AnimatedSection key={w.title} delay={i * 0.06}>
              <div className="flex gap-4 p-6 rounded-[20px] border border-gray-100 bg-white hover:shadow-lg hover:shadow-black/5 transition-all duration-200">
                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center shrink-0">
                  <w.icon size={18} className="text-ink-950" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-semibold text-ink-950 text-[15px]">{w.title}</h3>
                  <p className="mt-1 text-ink-400 text-sm leading-relaxed">{w.desc}</p>
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </section>

      {/* ═══════ INDUSTRIES ═══════ */}
      <section className="bg-gray-50 py-20 sm:py-28">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-20">
          <AnimatedSection className="text-center max-w-xl mx-auto mb-14">
            <span className="text-[11px] font-semibold tracking-widest uppercase text-brand-500 mb-4 block">Industri</span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink-950 tracking-tight">Sektor yang Kami Layani</h2>
            <p className="mt-3 text-ink-400 text-[15px]">Percaya oleh berbagai sektor industri di Indonesia.</p>
          </AnimatedSection>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {industries.map((ind, i) => (
              <AnimatedSection key={ind.label} delay={i * 0.05}>
                <div className="bg-white rounded-[20px] border border-gray-100 p-6 text-center hover:shadow-lg hover:shadow-black/5 transition-all duration-200">
                  <ind.icon size={24} className="text-ink-950 mx-auto mb-3" strokeWidth={1.5} />
                  <span className="text-sm font-semibold text-ink-950">{ind.label}</span>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ PARTNERS ═══════ */}
      <section className="py-16 sm:py-20 border-y border-gray-100">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-20">
          <AnimatedSection>
            <p className="text-center text-[11px] font-semibold tracking-widest uppercase text-ink-400 mb-8">Dipercaya Oleh</p>
            <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-5">
              {partners.map((p) => <span key={p} className="text-ink-300 font-display font-semibold text-base hover:text-ink-500 transition-colors cursor-default">{p}</span>)}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ═══════ TIMELINE ═══════ */}
      <section className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-20 py-20 sm:py-28">
        <AnimatedSection className="max-w-xl mb-14">
          <span className="text-[11px] font-semibold tracking-widest uppercase text-brand-500 mb-4 block">Perjalanan Kami</span>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink-950 tracking-tight">Sejarah Perusahaan</h2>
        </AnimatedSection>
        <div className="relative">
          <div className="absolute left-[19px] top-0 bottom-0 w-px bg-gray-200" />
          <div className="space-y-10">
            {timeline.map((t, i) => (
              <AnimatedSection key={t.year} delay={i * 0.08}>
                <div className="flex gap-6">
                  <div className="w-10 h-10 bg-brand-50 border-2 border-brand-500 rounded-full flex items-center justify-center shrink-0 relative z-10">
                    <span className="text-[10px] font-bold text-brand-600">{t.year.slice(2)}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-brand-500">{t.year}</span>
                    <h3 className="font-semibold text-ink-950 text-[15px] mt-0.5">{t.title}</h3>
                    <p className="text-ink-400 text-sm mt-1 leading-relaxed">{t.desc}</p>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ NEWS ═══════ */}
      <section className="bg-gray-50 py-20 sm:py-28">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-20">
          <AnimatedSection className="flex items-end justify-between mb-10">
            <div>
              <span className="text-[11px] font-semibold tracking-widest uppercase text-brand-500 mb-4 block">Berita</span>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink-950 tracking-tight">Informasi Terkini</h2>
            </div>
            <Link to="/berita" className="hidden sm:inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-600 hover:text-brand-700 transition-colors">
              Lihat Semua <ArrowRight size={14} />
            </Link>
          </AnimatedSection>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {newsItems.map((n, i) => (
              <AnimatedSection key={n.title} delay={i * 0.08}>
                <Link to="/berita" className="group block bg-white rounded-[20px] border border-gray-100 overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5">
                  <div className="aspect-[16/9] bg-gray-100 flex items-center justify-center">
                    <Newspaper size={32} className="text-gray-200" />
                  </div>
                  <div className="p-6">
                    <span className="text-[11px] text-ink-400">{n.date}</span>
                    <h3 className="font-display font-semibold text-[15px] text-ink-950 mt-1 group-hover:text-brand-600 transition-colors">{n.title}</h3>
                    <p className="text-sm text-ink-400 mt-2 leading-relaxed">{n.excerpt}</p>
                  </div>
                </Link>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ TESTIMONIALS ═══════ */}
      <section id="testimoni" className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-20 py-20 sm:py-28">
        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-12 lg:gap-20 items-start">
          <AnimatedSection>
            <span className="text-[11px] font-semibold tracking-widest uppercase text-brand-500 mb-4 block">Testimoni</span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink-950 tracking-tight">Apa Kata Klien Kami</h2>
            <p className="mt-3 text-ink-400 text-[15px] leading-relaxed">Dipercaya oleh perusahaan, instansi pemerintah, dan agen perjalanan di seluruh Indonesia.</p>
          </AnimatedSection>
          <AnimatedSection delay={0.1}><TestimonialCarousel /></AnimatedSection>
        </div>
      </section>

      {/* ═══════ FAQ ═══════ */}
      <section className="bg-gray-50 py-20 sm:py-28">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-20">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20">
            <AnimatedSection>
              <span className="text-[11px] font-semibold tracking-widest uppercase text-brand-500 mb-4 block">FAQ</span>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink-950 tracking-tight">Pertanyaan Umum</h2>
              <p className="mt-3 text-ink-400 text-[15px] leading-relaxed">Jawaban atas pertanyaan yang sering diajukan oleh klien kami.</p>
            </AnimatedSection>
            <AnimatedSection delay={0.1}>
              <div className="space-y-3">
                {faqItems.map((item, i) => (
                  <div key={i} className="bg-white border border-gray-100 rounded-[16px] overflow-hidden hover:border-brand-200 transition-colors">
                    <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left">
                      <span className="font-semibold text-ink-950 text-[15px]">{item.q}</span>
                      <ChevronDown size={18} className={`text-ink-400 shrink-0 transition-transform duration-300 ${openFaq === i ? 'rotate-180' : ''}`} />
                    </button>
                    <div className={`overflow-hidden transition-all duration-300 ${openFaq === i ? 'max-h-40' : 'max-h-0'}`}>
                      <p className="px-6 pb-5 text-ink-400 text-sm leading-relaxed">{item.a}</p>
                    </div>
                  </div>
                ))}
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ═══════ CTA ═══════ */}
      <section className="bg-ink-950 py-20 sm:py-28">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-20 text-center">
          <AnimatedSection>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">Siap Bermitra Dengan Kami?</h2>
            <p className="mt-3 text-ink-400 text-[15px] max-w-md mx-auto">Hubungi tim kami untuk konsultasi kebutuhan transportasi perusahaan Anda.</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a href="https://wa.me/62895361054272?text=Halo%2C%20saya%20ingin%20konsultasi%20kebutuhan%20transportasi%20perusahaan" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-ink-950 text-sm font-semibold rounded-lg hover:bg-gray-100 transition-colors duration-200">
                Hubungi Kami <ArrowRight size={15} />
              </a>
              <Link to="/katalog" className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-ink-400 hover:text-white transition-colors duration-200">
                Reservasi Sekarang
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
