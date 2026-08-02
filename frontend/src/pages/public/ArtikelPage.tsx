import { BookOpen } from 'lucide-react';
import AnimatedSection from '../../components/public/landing/AnimatedSection';

const artikel = [
  { date: '18 Jul 2026', title: 'Tips Memilih Kendaraan Rental yang Tepat untuk Perjalanan Bisnis', excerpt: 'Panduan praktis memilih jenis kendaraan sesuai kebutuhan perjalanan dinas dan korporat.', category: 'Tips' },
  { date: '05 Jul 2026', title: 'Panduan Lengkap Airport Transfer: Yang Perlu Anda Ketahui', excerpt: 'Semua yang perlu diketahui tentang layanan antar jemput bandara agar perjalanan lancar.', category: 'Panduan' },
  { date: '22 Jun 2026', title: 'Manfaat Fleet Management untuk Efisiensi Operasional Perusahaan', excerpt: 'Bagaimana pengelolaan armada profesional dapat menghemat biaya transportasi perusahaan.', category: 'Insight' },
  { date: '10 Jun 2026', title: 'Etika dan Profesionalisme Sopir Transportasi Modern', excerpt: 'Standar pelayanan yang dipegang oleh driver profesional dalam industri transportasi.', category: 'Insight' },
  { date: '28 Mei 2026', title: 'Persiapan Sebelum Rental Mobil untuk Liburan Keluarga', excerpt: 'Checklist lengkap agar perjalanan liburan keluarga dengan kendaraan rental berjalan smooth.', category: 'Tips' },
  { date: '15 Mei 2026', title: 'Tren Kendaraan Listrik di Industri Rental Indonesia', excerpt: 'Bagaimana kendaraan listrik mulai mengubah lanskap industri rental di Indonesia.', category: 'Tren' },
];

export default function ArtikelPage() {
  return (
    <div className="min-h-screen">
      <section className="bg-black py-20 sm:py-28">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-20">
          <AnimatedSection>
            <span className="text-[11px] font-semibold tracking-widest uppercase text-primary-400 mb-4 block">Media</span>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight">Artikel & Insight</h1>
            <p className="mt-5 text-black-400 text-[15px] leading-relaxed max-w-xl">Tips, panduan, dan insight seputar transportasi dan mobilitas.</p>
          </AnimatedSection>
        </div>
      </section>

      <section className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-20 py-20 sm:py-28">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {artikel.map((a, i) => (
            <AnimatedSection key={a.title} delay={i * 0.06}>
              <article className="group bg-white rounded-[20px] border border-accent-100 overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5">
                <div className="aspect-[16/9] bg-accent-100 flex items-center justify-center">
                  <BookOpen size={32} className="text-black-200" />
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 bg-accent-100 text-[10px] font-semibold text-black-500 rounded">{a.category}</span>
                    <span className="text-[11px] text-black-400">{a.date}</span>
                  </div>
                  <h3 className="font-display font-semibold text-[15px] text-black group-hover:text-primary-600 transition-colors">{a.title}</h3>
                  <p className="text-sm text-black-400 mt-2 leading-relaxed">{a.excerpt}</p>
                </div>
              </article>
            </AnimatedSection>
          ))}
        </div>
      </section>
    </div>
  );
}
