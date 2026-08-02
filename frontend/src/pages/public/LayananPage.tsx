import { Link } from 'react-router-dom';
import { Car, Briefcase, Map, Heart, ShieldCheck, Building2, ArrowRight } from 'lucide-react';
import AnimatedSection from '../../components/public/landing/AnimatedSection';

const services = [
  { slug: 'sopir', icon: ShieldCheck, title: 'Rental Dengan Sopir', desc: 'Layanan chauffeur profesional berpengalaman dan bersertifikat untuk perjalanan bisnis maupun pribadi.', highlights: ['Sopir bersertifikat', 'Berpengalaman', 'Harian & bulanan'] },
  { slug: 'corporate', icon: Briefcase, title: 'Corporate Rental', desc: 'Solusi transportasi korporat dengan dedicated account manager, harga khusus, dan fleksibilitas pembayaran.', highlights: ['Dedicated account manager', 'Harga khusus', 'Fleksibilitas pembayaran'] },
  { slug: 'airport', icon: Map, title: 'Airport Transfer', desc: 'Layanan antar jemput bandara yang tepat waktu dengan monitoring penerbangan secara real-time.', highlights: ['Monitor penerbangan', 'Tepat waktu', 'Seluruh bandara'] },
  { slug: 'wedding', icon: Heart, title: 'Wedding Car', desc: 'Kendaraan premium dan dekorasi eksklusif untuk hari pernikahan yang berkesan.', highlights: ['Kendaraan premium', 'Dekorasi', 'Paket lengkap'] },
  { slug: 'event', icon: Building2, title: 'Event Transportation', desc: 'Transportasi skala besar untuk seminar, konferensi, gathering, dan acara korporat lainnya.', highlights: ['Skala besar', 'Fleksibel', 'Termasuk driver'] },
];

export default function LayananPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-black py-20 sm:py-28">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-20">
          <AnimatedSection>
            <span className="text-[11px] font-semibold tracking-widest uppercase text-primary-400 mb-4 block">Layanan Kami</span>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight max-w-2xl">
              Solusi Transportasi Komprehensif
            </h1>
            <p className="mt-5 text-black-400 text-[15px] leading-relaxed max-w-xl">
              Beragam layanan yang dirancang untuk memenuhi kebutuhan mobilitas korporat, pemerintah, maupun individu.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Services Grid */}
      <section className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-20 py-20 sm:py-28">
        <div className="space-y-8">
          {services.map((s, i) => (
            <AnimatedSection key={s.slug} delay={i * 0.06}>
              <Link to={`/layanan/${s.slug}`} className="group block bg-white rounded-[24px] border border-accent-100 p-8 sm:p-10 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5">
                <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                  <div className="w-14 h-14 bg-canvas rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-primary-50 transition-colors">
                    <s.icon size={24} className="text-black group-hover:text-primary-600 transition-colors" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1">
                    <h2 className="font-display text-xl font-bold text-black group-hover:text-primary-600 transition-colors">{s.title}</h2>
                    <p className="mt-2 text-black-400 text-[15px] leading-relaxed max-w-2xl">{s.desc}</p>
                    <div className="flex flex-wrap gap-2 mt-4">
                      {s.highlights.map((h) => (
                        <span key={h} className="px-3 py-1 bg-canvas text-[12px] font-medium text-black-500 rounded-lg">{h}</span>
                      ))}
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary-600 shrink-0 group-hover:gap-2.5 transition-all">
                    Selengkapnya <ArrowRight size={14} />
                  </span>
                </div>
              </Link>
            </AnimatedSection>
          ))}
        </div>
      </section>

      {/* Rental Mobil CTA */}
      <section className="bg-canvas py-20 sm:py-28">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-20">
          <AnimatedSection className="text-center">
            <Car size={32} className="text-black mx-auto mb-4" strokeWidth={1.5} />
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-black tracking-tight">Rental Mobil Mandiri</h2>
            <p className="mt-3 text-black-400 text-[15px] max-w-md mx-auto">Sewa kendaraan harian, mingguan, dan bulanan tanpa sopir. Armada terawat, harga transparan.</p>
            <Link to="/katalog" className="inline-flex items-center gap-2 mt-8 px-6 py-3 bg-black text-white text-sm font-semibold rounded-lg hover:bg-black-800 transition-colors">
              Lihat Armada <ArrowRight size={15} />
            </Link>
          </AnimatedSection>
        </div>
      </section>
    </div>
  );
}
