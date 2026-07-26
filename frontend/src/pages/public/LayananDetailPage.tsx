import { useParams, Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import AnimatedSection from '../../components/public/landing/AnimatedSection';

const layananData: Record<string, {
  title: string;
  subtitle: string;
  desc: string;
  features: { title: string; desc: string }[];
  cta: string;
}> = {
  sopir: {
    title: 'Rental Dengan Sopir',
    subtitle: 'Chauffeur Service',
    desc: 'Nikmati perjalanan tanpa khawatir dengan layanan sopir profesional kami. Seluruh driver telah tersertifikasi, berpengalaman, dan terlatih untuk memberikan kenyamanan serta keamanan optimal selama perjalanan Anda.',
    features: [
      { title: 'Sopir Bersertifikat', desc: 'Seluruh driver memiliki SIM dan sertifikasi resmi dari instansi terkait.' },
      { title: 'Berpengalaman', desc: 'Rata-rata pengalaman driver kami lebih dari 5 tahun di bidang transportasi.' },
      { title: 'Pilihan Kendaraan', desc: 'Tersedia berbagai pilihan kendaraan dari sedan hingga bus pariwisata.' },
      { title: 'Fleksibilitas Waktu', desc: 'Layanan per jam, harian, hingga bulanan sesuai kebutuhan Anda.' },
    ],
    cta: 'Reservasi dengan Sopir',
  },
  corporate: {
    title: 'Corporate Rental',
    subtitle: 'Solusi Transportasi Perusahaan',
    desc: 'Kami memahami kebutuhan transportasi korporat yang kompleks. Layanan corporate kami dirancang khusus untuk perusahaan dengan dedicated account manager, harga khusus, dan fleksibilitas pembayaran yang disesuaikan.',
    features: [
      { title: 'Dedicated Account Manager', desc: 'Satu kontak khusus untuk seluruh kebutuhan transportasi perusahaan Anda.' },
      { title: 'Harga Khusus Korporat', desc: 'Negosiasi harga volume dengan kontrak jangka panjang.' },
      { title: 'Fleksibilitas Pembayaran', desc: 'Tersedia pembayaran dengan invoice, transfer, dan berbagai metode lainnya.' },
      { title: 'Reporting & Invoicing', desc: 'Laporan penggunaan armada dan invoice terperinci setiap bulan.' },
    ],
    cta: 'Hubungi Tim Korporat',
  },
  airport: {
    title: 'Airport Transfer',
    subtitle: 'Antar Jemput Bandara',
    desc: 'Layanan antar jemput bandara yang tepat waktu dan nyaman. Kami memantau jadwal penerbangan Anda secara real-time untuk memastikan ketepatan waktu, bahkan jika jadwal berubah.',
    features: [
      { title: 'Real-time Flight Monitoring', desc: 'Kami memantau jadwal penerbangan dan menyesuaikan waktu penjemputan.' },
      { title: 'Tepat Waktu', desc: 'Jaminan ketepatan waktu dengan SOP yang ketat.' },
      { title: 'Meet & Greet', desc: 'Driver akan menjemput Anda di area kedatangan dengan papan nama.' },
      { title: 'Seluruh Bandara', desc: 'Melayani semua bandara utama di Indonesia.' },
    ],
    cta: 'Pesan Airport Transfer',
  },
  wedding: {
    title: 'Wedding Car',
    subtitle: 'Kendaraan Premium Pernikahan',
    desc: 'Hari pernikahan Anda layak mendapatkan yang terbaik. Kami menyediakan kendaraan premium dengan dekorasi eksklusif dan sopir berpenampilan rapi untuk momen spesial Anda.',
    features: [
      { title: 'Kendaraan Premium', desc: 'Pilihan mobil mewah dari berbagai merek premium.' },
      { title: 'Dekorasi Eksklusif', desc: 'Dekorasi bunga dan aksesoris pernikahan yang elegan.' },
      { title: 'Sopir Berpenampilan Rapi', desc: 'Driver berseragam formal untuk menambah kesan istimewa.' },
      { title: 'Paket Lengkap', desc: 'Tersedia paket include dokumentasi dan koordinasi.' },
    ],
    cta: 'Konsultasi Wedding Car',
  },
  event: {
    title: 'Event Transportation',
    subtitle: 'Transportasi Skala Besar',
    desc: 'Kebutuhan transportasi untuk seminar, konferensi, gathering, atau acara korporat lainnya? Kami menyediakan armada dalam jumlah besar dengan koordinasi yang profesional.',
    features: [
      { title: 'Armada Besar', desc: 'Tersedia puluhan hingga ratusan kendaraan untuk skala acara Anda.' },
      { title: 'Koordinasi Profesional', desc: 'Tim khusus yang mengatur jadwal dan koordinasi armada.' },
      { title: 'Berbagai Jenis Kendaraan', desc: 'Minibus, medium bus, hingga bus besar sesuai kebutuhan.' },
      { title: 'Paket All-in-One', desc: 'Termasuk driver, bahan bakar, dan asuransi perjalanan.' },
    ],
    cta: 'Minta Penawaran Event',
  },
};

export default function LayananDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const data = slug ? layananData[slug] : null;

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold text-ink-950 mb-2">Layanan Tidak Ditemukan</h1>
          <p className="text-ink-400 text-sm mb-6">Layanan yang Anda cari belum tersedia.</p>
          <Link to="/layanan" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700">
            <ArrowRight size={14} className="rotate-180" /> Kembali ke Layanan
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-ink-950 py-20 sm:py-28">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-20">
          <AnimatedSection>
            <Link to="/layanan" className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-400 hover:text-white transition-colors mb-6">
              <ArrowRight size={12} className="rotate-180" /> Semua Layanan
            </Link>
            <span className="text-[11px] font-semibold tracking-widest uppercase text-brand-400 mb-4 block">{data.subtitle}</span>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight max-w-2xl">
              {data.title}
            </h1>
            <p className="mt-5 text-ink-400 text-[15px] leading-relaxed max-w-xl">{data.desc}</p>
          </AnimatedSection>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-20 py-20 sm:py-28">
        <div className="grid sm:grid-cols-2 gap-5">
          {data.features.map((f, i) => (
            <AnimatedSection key={f.title} delay={i * 0.06}>
              <div className="bg-white rounded-[20px] border border-gray-100 p-7 hover:shadow-lg hover:shadow-black/5 transition-all duration-200 h-full">
                <CheckCircle2 size={18} className="text-avail-500 mb-4" />
                <h3 className="font-semibold text-ink-950 text-[15px]">{f.title}</h3>
                <p className="mt-2 text-ink-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gray-50 py-20 sm:py-28">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-20 text-center">
          <AnimatedSection>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink-950 tracking-tight">Tertarik dengan {data.title}?</h2>
            <p className="mt-3 text-ink-400 text-[15px] max-w-md mx-auto">Hubungi kami untuk konsultasi dan penawaran harga terbaik.</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a
                href={`https://wa.me/62895361054272?text=${encodeURIComponent(`Halo, saya tertarik dengan layanan ${data.title}. Mohon informasi lebih lanjut.`)}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-ink-950 text-white text-sm font-semibold rounded-lg hover:bg-ink-800 transition-colors"
              >
                {data.cta} <ArrowRight size={15} />
              </a>
              <Link to="/layanan" className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-ink-500 hover:text-ink-950 transition-colors">
                Lihat Layanan Lain
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </div>
  );
}
