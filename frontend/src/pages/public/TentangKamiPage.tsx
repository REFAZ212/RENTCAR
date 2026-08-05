import { Link } from 'react-router-dom';
import { ArrowRight, Target, Eye, Heart, Users, Award, ShieldCheck, Clock, Globe } from 'lucide-react';
import AnimatedSection from '../../components/public/landing/AnimatedSection';

const timeline = [
  { year: '2009', title: 'Pendirian Perusahaan', desc: 'PT UDIN RENCTCAR didirikan dengan fokus awal pada layanan rental kendaraan di satu kota.' },
  { year: '2013', title: 'Ekspansi Regional', desc: 'Membuka cabang pertama di luar kota asal, memperluas cakupan layanan transportasi.' },
  { year: '2017', title: '100 Unit Armada', desc: 'Mencapai milestone 100 unit kendaraan dalam armada operasional.' },
  { year: '2020', title: 'Transformasi Digital', desc: 'Meluncurkan platform digital untuk pemesanan dan manajemen armada secara online.' },
  { year: '2024', title: 'Ekspansi Nasional', desc: 'Beroperasi di 25+ kota dengan 150+ armada dan melayani ribuan pelanggan.' },
];

const values = [
  { icon: ShieldCheck, title: 'Integritas', desc: 'Menjalankan bisnis dengan jujur, transparan, dan dapat diandalkan oleh seluruh mitra.' },
  { icon: Award, title: 'Kualitas', desc: 'Berkomitmen pada standar tertinggi dalam layanan, armada, dan pengalaman pelanggan.' },
  { icon: Heart, title: 'Pelayanan', desc: 'Menempatkan kepuasan pelanggan sebagai prioritas utama dalam setiap interaksi.' },
  { icon: Users, title: 'Kolaborasi', desc: 'Membangun tim yang solid dan menjalin kemitraan yang saling menguntungkan.' },
  { icon: Globe, title: 'Inovasi', desc: 'Terus beradaptasi dengan perkembangan teknologi dan kebutuhan pasar.' },
  { icon: Clock, title: 'Ketepatan', desc: 'Menjaga presisi waktu sebagai cerminan profesionalisme layanan kami.' },
];

const leadership = [
  { name: 'Direktur Utama', role: 'Chief Executive Officer', desc: 'Memimpin visi strategis perusahaan dan ekspansi nasional.' },
  { name: 'Direktur Operasional', role: 'Chief Operating Officer', desc: 'Mengawasi seluruh operasional armada dan layanan.' },
  { name: 'Direktur Keuangan', role: 'Chief Financial Officer', desc: 'Mengelola strategi keuangan dan pertumbuhan bisnis.' },
];

export default function TentangKamiPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-black py-20 sm:py-28">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-20">
          <AnimatedSection>
            <span className="text-[11px] font-semibold tracking-widest uppercase text-primary-400 mb-4 block">Tentang Kami</span>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight max-w-2xl">
              Mengenal PT UDIN RENCTCAR Lebih Dekat
            </h1>
            <p className="mt-5 text-black-400 text-[15px] leading-relaxed max-w-xl">
              Perusahaan transportasi nasional yang berkomitmen menyediakan solusi mobilitas terbaik bagi korporat, pemerintah, dan individu di seluruh Indonesia.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Profil */}
      <section id="profil" className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-20 py-20 sm:py-28">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <AnimatedSection>
            <span className="text-[11px] font-semibold tracking-widest uppercase text-primary-500 mb-4 block">Profil Perusahaan</span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-black tracking-tight leading-tight">
              Solusi transportasi terpercaya sejak 2009
            </h2>
            <p className="mt-5 text-black-400 text-[15px] leading-relaxed">
              PT UDIN RENCTCAR didirikan pada tahun 2009 dengan visi menjadi penyedia layanan transportasi terpercaya di Indonesia. Bermula dari sebuah usaha kecil, kami terus berkembang hingga kini beroperasi di lebih dari 25 kota dengan armada lebih dari 150 kendaraan.
            </p>
            <p className="mt-4 text-black-400 text-[15px] leading-relaxed">
              Kami melayani berbagai segmen pelanggan mulai dari perusahaan multinasional, instansi pemerintah, agen perjalanan, hingga individu yang membutuhkan solusi transportasi yang handal dan profesional.
            </p>
          </AnimatedSection>
          <AnimatedSection delay={0.1}>
            <div className="bg-canvas rounded-[24px] p-8 sm:p-10">
              <div className="grid grid-cols-2 gap-6">
                {[
                  { value: '15+', label: 'Tahun Pengalaman' },
                  { value: '150+', label: 'Armada Kendaraan' },
                  { value: '25+', label: 'Kota Operasional' },
                  { value: '20.000+', label: 'Pelanggan' },
                ].map((h, i) => (
                  <div key={i} className={i === 3 ? 'col-span-2 text-center' : ''}>
                    <div className={`font-display font-bold ${i === 3 ? 'text-4xl' : 'text-2xl'} text-black`}>{h.value}</div>
                    <div className="text-[12px] text-black-400 mt-1">{h.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Visi & Misi */}
      <section id="visi-misi" className="bg-canvas py-20 sm:py-28">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-20">
          <div className="grid lg:grid-cols-2 gap-8">
            <AnimatedSection>
              <div className="bg-white rounded-[20px] border border-accent-100 p-8 sm:p-10 h-full">
                <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center mb-6">
                  <Eye size={22} className="text-primary-600" />
                </div>
                <h3 className="font-display text-xl font-bold text-black mb-4">Visi</h3>
                <p className="text-black-400 text-[15px] leading-relaxed">
                  Menjadi perusahaan transportasi terdepan di Indonesia yang dikenal karena kualitas layanan, inovasi, dan kepuasan pelanggan.
                </p>
              </div>
            </AnimatedSection>
            <AnimatedSection delay={0.1}>
              <div className="bg-white rounded-[20px] border border-accent-100 p-8 sm:p-10 h-full">
                <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center mb-6">
                  <Target size={22} className="text-primary-600" />
                </div>
                <h3 className="font-display text-xl font-bold text-black mb-4">Misi</h3>
                <ul className="space-y-3 text-black-400 text-[15px] leading-relaxed">
                  <li className="flex gap-3"><span className="text-primary-500 mt-1">—</span>Menyediakan armada kendaraan berkualitas tinggi yang terawat dengan standar terbaik.</li>
                  <li className="flex gap-3"><span className="text-primary-500 mt-1">—</span>Memberikan layanan transportasi yang aman, nyaman, dan tepat waktu.</li>
                  <li className="flex gap-3"><span className="text-primary-500 mt-1">—</span>Terus berinovasi dalam teknologi dan layanan untuk memenuhi kebutuhan pelanggan.</li>
                  <li className="flex gap-3"><span className="text-primary-500 mt-1">—</span>Menjadi mitra transportasi yang handal bagi perusahaan dan instansi pemerintah.</li>
                </ul>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Nilai Perusahaan */}
      <section id="nilai" className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-20 py-20 sm:py-28">
        <AnimatedSection className="max-w-xl mb-14">
          <span className="text-[11px] font-semibold tracking-widest uppercase text-primary-500 mb-4 block">Nilai Perusahaan</span>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-black tracking-tight">Prinsip Yang Kami Pegang Teguh</h2>
        </AnimatedSection>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {values.map((v, i) => (
            <AnimatedSection key={v.title} delay={i * 0.06}>
              <div className="flex gap-4 p-6 rounded-[20px] border border-accent-100 bg-white hover:shadow-lg hover:shadow-black/5 transition-all duration-200 h-full">
                <div className="w-10 h-10 bg-canvas rounded-xl flex items-center justify-center shrink-0">
                  <v.icon size={18} className="text-black" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-semibold text-black text-[15px]">{v.title}</h3>
                  <p className="mt-1 text-black-400 text-sm leading-relaxed">{v.desc}</p>
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </section>

      {/* Sejarah */}
      <section id="sejarah" className="bg-canvas py-20 sm:py-28">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-20">
          <AnimatedSection className="max-w-xl mb-14">
            <span className="text-[11px] font-semibold tracking-widest uppercase text-primary-500 mb-4 block">Sejarah</span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-black tracking-tight">Perjalanan Kami</h2>
          </AnimatedSection>
          <div className="relative">
            <div className="absolute left-[19px] top-0 bottom-0 w-px bg-black-200" />
            <div className="space-y-10">
              {timeline.map((t, i) => (
                <AnimatedSection key={t.year} delay={i * 0.08}>
                  <div className="flex gap-6">
                    <div className="w-10 h-10 bg-primary-50 border-2 border-primary-500 rounded-full flex items-center justify-center shrink-0 relative z-10">
                      <span className="text-[10px] font-bold text-primary-600">{t.year.slice(2)}</span>
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-primary-500">{t.year}</span>
                      <h3 className="font-semibold text-black text-[15px] mt-0.5">{t.title}</h3>
                      <p className="text-black-400 text-sm mt-1 leading-relaxed">{t.desc}</p>
                    </div>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Leadership */}
      <section id="tim" className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-20 py-20 sm:py-28">
        <AnimatedSection className="max-w-xl mb-14">
          <span className="text-[11px] font-semibold tracking-widest uppercase text-primary-500 mb-4 block">Tim Leadership</span>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-black tracking-tight">Pimpinan Perusahaan</h2>
        </AnimatedSection>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {leadership.map((l, i) => (
            <AnimatedSection key={l.name} delay={i * 0.08}>
              <div className="bg-white rounded-[20px] border border-accent-100 p-7 text-center hover:shadow-lg hover:shadow-black/5 transition-all duration-200">
                <div className="w-20 h-20 bg-accent-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Users size={28} className="text-black-200" />
                </div>
                <h3 className="font-display font-semibold text-black text-[15px]">{l.name}</h3>
                <p className="text-[11px] font-medium text-primary-500 mt-0.5">{l.role}</p>
                <p className="text-black-400 text-sm mt-3 leading-relaxed">{l.desc}</p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-black py-20 sm:py-28">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-20 text-center">
          <AnimatedSection>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">Jadikan UDIN RENCTCAR Mitra Transportasi Anda</h2>
            <p className="mt-3 text-black-400 text-[15px] max-w-md mx-auto">Hubungi kami untuk konsultasi kebutuhan transportasi perusahaan Anda.</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link to="/kontak" className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black text-sm font-semibold rounded-lg hover:bg-accent-100 transition-colors duration-200">
                Hubungi Kami <ArrowRight size={15} />
              </Link>
              <Link to="/katalog" className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-black-400 hover:text-white transition-colors duration-200">
                Lihat Armada
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </div>
  );
}
