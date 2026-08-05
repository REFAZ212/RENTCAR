import { Briefcase, MapPin, Clock, ArrowRight } from 'lucide-react';
import { ADMIN_WA } from '../../lib/format';
import AnimatedSection from '../../components/public/landing/AnimatedSection';

const lowongan = [
  { title: 'Driver Profesional', location: 'Jakarta', type: 'Full-time', desc: 'Mengemudikan kendaraan untuk kebutuhan korporat dan individu. Persyaratan: SIM A, pengalaman minimal 2 tahun.' },
  { title: 'Admin Operasional', location: 'Bandung', type: 'Full-time', desc: 'Mengkoordinasikan jadwal armada dan komunikasi dengan pelanggan. Persyaratan: Diploma, Excel mahir.' },
  { title: 'Marketing Executive', location: 'Surabaya', type: 'Full-time', desc: 'Mengembangkan jaringan bisnis korporat dan menjalin kemitraan baru. Persyaratan: S1, pengalaman sales.' },
  { title: 'Mekanik Kendaraan', location: 'Jakarta', type: 'Full-time', desc: 'Melakukan perawatan dan perbaikan armada kendaraan. Persyaratan: Teknik Otomotif, pengalaman 3+ tahun.' },
];

export default function KarirPage() {
  return (
    <div className="min-h-screen">
      <section className="bg-black py-20 sm:py-28">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-20">
          <AnimatedSection>
            <span className="text-[11px] font-semibold tracking-widest uppercase text-primary-400 mb-4 block">Karir</span>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight max-w-2xl">
              Bergabung Dengan Kami
            </h1>
            <p className="mt-5 text-black-400 text-[15px] leading-relaxed max-w-xl">
              UDIN RENCTCAR terus berkembang dan membutuhkan talenta terbaik untuk bergabung dalam tim kami. Temukan kesempatan karir yang sesuai dengan keahlian Anda.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Why Work Here */}
      <section className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-20 py-20 sm:py-28">
        <AnimatedSection className="max-w-xl mb-14">
          <span className="text-[11px] font-semibold tracking-widest uppercase text-primary-500 mb-4 block">Mengapa UDIN RENCTCAR</span>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-black tracking-tight">Lingkungan Kerja Terbaik</h2>
        </AnimatedSection>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { title: 'Pengembangan Karir', desc: 'Program pelatihan dan sertifikasi berkelanjutan untuk seluruh karyawan.' },
            { title: 'Lingkungan Inklusif', desc: 'Budaya kerja yang menghargai keberagaman dan kolaborasi tim.' },
            { title: 'Benefit Kompetitif', desc: 'Tunjangan kesehatan, transportasi, dan bonus kinerja.' },
          ].map((item, i) => (
            <AnimatedSection key={item.title} delay={i * 0.06}>
              <div className="p-6 rounded-[20px] border border-accent-100 bg-white hover:shadow-lg hover:shadow-black/5 transition-all duration-200">
                <h3 className="font-semibold text-black text-[15px]">{item.title}</h3>
                <p className="mt-2 text-black-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </section>

      {/* Open Positions */}
      <section className="bg-canvas py-20 sm:py-28">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-20">
          <AnimatedSection className="max-w-xl mb-14">
            <span className="text-[11px] font-semibold tracking-widest uppercase text-primary-500 mb-4 block">Lowongan</span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-black tracking-tight">Posisi Yang Tersedia</h2>
          </AnimatedSection>
          <div className="space-y-4">
            {lowongan.map((l, i) => (
              <AnimatedSection key={l.title} delay={i * 0.06}>
                <div className="bg-white rounded-[20px] border border-accent-100 p-7 flex flex-col sm:flex-row sm:items-center gap-5 hover:shadow-lg hover:shadow-black/5 transition-all duration-200">
                  <div className="w-12 h-12 bg-canvas rounded-xl flex items-center justify-center shrink-0">
                    <Briefcase size={20} className="text-black" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display font-semibold text-[15px] text-black">{l.title}</h3>
                    <p className="text-black-400 text-sm mt-1 leading-relaxed">{l.desc}</p>
                    <div className="flex items-center gap-4 mt-3">
                      <span className="flex items-center gap-1.5 text-[12px] text-black-400"><MapPin size={12} />{l.location}</span>
                      <span className="flex items-center gap-1.5 text-[12px] text-black-400"><Clock size={12} />{l.type}</span>
                    </div>
                  </div>
                  <a
                    href={`https://wa.me/${ADMIN_WA}?text=${encodeURIComponent(`Halo, saya ingin melamar untuk posisi ${l.title}.`)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-black text-white text-[13px] font-semibold rounded-lg hover:bg-black-800 transition-colors shrink-0"
                  >
                    Lamar <ArrowRight size={13} />
                  </a>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
