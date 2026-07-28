import { Tag, ArrowRight } from 'lucide-react';
import { ADMIN_WA } from '../../lib/format';
import AnimatedSection from '../../components/public/landing/AnimatedSection';

const promos = [
  { title: 'Diskon 20% Sewa Bulanan', desc: 'Nikmati potongan harga 20% untuk penyewaan kendaraan dengan durasi minimal 30 hari. Berlaku untuk seluruh tipe kendaraan.', validUntil: '31 Agustus 2026', code: 'BULAN20' },
  { title: 'Airport Transfer Mulai Rp 150.000', desc: 'Layanan antar jemput bandara dengan harga spesial. Tersedia untuk semua rute di Jawa dan Bali.', validUntil: '30 September 2026', code: 'AIRPORT150' },
  { title: 'Paket Wedding Car Premium', desc: 'Paket pernikahan lengkap dengan kendaraan premium, dekorasi, dan sopir profesional. Harga mulai Rp 3.500.000.', validUntil: '31 Desember 2026', code: 'WEDDING' },
  { title: 'Free Driver untuk Corporate', desc: 'Sewa kendaraan bulanan untuk korporat? Dapatkan layanan sopir gratis untuk 5 hari pertama.', validUntil: '30 November 2026', code: 'CORDRIVER' },
];

export default function PromoPage() {
  return (
    <div className="min-h-screen">
      <section className="bg-ink-950 py-20 sm:py-28">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-20">
          <AnimatedSection>
            <span className="text-[11px] font-semibold tracking-widest uppercase text-brand-400 mb-4 block">Media</span>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight">Promo & Penawaran</h1>
            <p className="mt-5 text-ink-400 text-[15px] leading-relaxed max-w-xl">Penawaran spesial dan diskon menarik dari PILAR Rental.</p>
          </AnimatedSection>
        </div>
      </section>

      <section className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-20 py-20 sm:py-28">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {promos.map((p, i) => (
            <AnimatedSection key={p.title} delay={i * 0.06}>
              <div className="bg-white rounded-[24px] border border-gray-100 p-8 hover:shadow-lg hover:shadow-black/5 transition-all duration-200 h-full flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center">
                    <Tag size={18} className="text-brand-600" />
                  </div>
                  <span className="px-2.5 py-1 bg-brand-50 text-[11px] font-bold text-brand-600 rounded-md">{p.code}</span>
                </div>
                <h3 className="font-display text-lg font-bold text-ink-950">{p.title}</h3>
                <p className="mt-2 text-ink-400 text-sm leading-relaxed flex-1">{p.desc}</p>
                <div className="mt-6 flex items-center justify-between">
                  <span className="text-[11px] text-ink-400">Berlaku hingga {p.validUntil}</span>
                  <a
                    href={`https://wa.me/${ADMIN_WA}?text=${encodeURIComponent(`Halo, saya ingin menggunakan promo "${p.title}" dengan kode ${p.code}.`)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-600 hover:text-brand-700 transition-colors"
                  >
                    Gunakan Promo <ArrowRight size={13} />
                  </a>
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </section>
    </div>
  );
}
