import { Newspaper } from 'lucide-react';
import AnimatedSection from '../../components/public/landing/AnimatedSection';

const berita = [
  { date: '15 Jul 2026', title: 'PILAR Ekspansi ke 5 Kota Baru di Sulawesi', excerpt: 'Perusahaan terus memperluas cakupan layanan ke Indonesia bagian timur dengan membuka cabang di Makassar, Manado, Palu, Gorontalo, dan Kendari.', tag: 'Ekspansi' },
  { date: '28 Jun 2026', title: 'Peluncuran Armada Kendaraan Listrik', excerpt: 'Langkah nyata menuju operasional yang lebih ramah lingkungan. PILAR resmi meluncurkan 20 unit kendaraan listrik pertama.', tag: 'Inovasi' },
  { date: '10 Jun 2026', title: 'PILAR Raih Sertifikasi ISO 9001:2015', excerpt: 'Bukti komitmen kami terhadap standar kualitas internasional dalam seluruh aspek operasional perusahaan.', tag: 'Pencapaian' },
  { date: '05 Mei 2026', title: 'Program Pelatihan Driver Profesional Angkatan ke-12', excerpt: '20 driver baru resmi lulus dari program pelatihan dan sertifikasi profesional PILAR.', tag: 'SDM' },
  { date: '20 Apr 2026', title: 'Kerjasama Strategis dengan PT Astra International', excerpt: 'PILAR menandatangani kontrak jangka panjang untuk penyediaan armada transportasi operasional.', tag: 'Kerjasama' },
  { date: '01 Apr 2026', title: 'Donasi 50 Kendaraan Roda Dua untuk Siswa SMK', excerpt: 'Bentuk kepedulian PILAR terhadap pendidikan vokasi dan pemberdayaan pemuda.', tag: 'CSR' },
];

export default function BeritaPage() {
  return (
    <div className="min-h-screen">
      <section className="bg-black py-20 sm:py-28">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-20">
          <AnimatedSection>
            <span className="text-[11px] font-semibold tracking-widest uppercase text-primary-400 mb-4 block">Media</span>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight">Berita Terkini</h1>
            <p className="mt-5 text-black-400 text-[15px] leading-relaxed max-w-xl">Informasi terbaru seputar perkembangan dan aktivitas PT PILAR.</p>
          </AnimatedSection>
        </div>
      </section>

      <section className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-20 py-20 sm:py-28">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {berita.map((n, i) => (
            <AnimatedSection key={n.title} delay={i * 0.06}>
              <article className="group bg-white rounded-[20px] border border-accent-100 overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5">
                <div className="aspect-[16/9] bg-accent-100 flex items-center justify-center">
                  <Newspaper size={32} className="text-black-200" />
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 bg-primary-50 text-[10px] font-semibold text-primary-600 rounded">{n.tag}</span>
                    <span className="text-[11px] text-black-400">{n.date}</span>
                  </div>
                  <h3 className="font-display font-semibold text-[15px] text-black group-hover:text-primary-600 transition-colors">{n.title}</h3>
                  <p className="text-sm text-black-400 mt-2 leading-relaxed">{n.excerpt}</p>
                </div>
              </article>
            </AnimatedSection>
          ))}
        </div>
      </section>
    </div>
  );
}
