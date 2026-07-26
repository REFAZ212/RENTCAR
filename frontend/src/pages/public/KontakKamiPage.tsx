import { useState } from 'react';
import { Phone, Mail, MapPin, Clock, Send, MessageCircle } from 'lucide-react';
import AnimatedSection from '../../components/public/landing/AnimatedSection';

const contactInfo = [
  { icon: Phone, label: 'Telepon', value: '0895-3610-54272', href: 'tel:+62895361054272' },
  { icon: Mail, label: 'Email', value: 'info@pilarrental.com', href: 'mailto:info@pilarrental.com' },
  { icon: MapPin, label: 'Alamat', value: 'Jl. Contoh No. 123, Kota', href: null },
  { icon: Clock, label: 'Jam Kerja', value: 'Senin - Sabtu: 08.00 - 17.00', href: null },
];

export default function KontakKamiPage() {
  const [form, setForm] = useState({ nama: '', email: '', telepon: '', subjek: '', pesan: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const wa = `https://wa.me/62895361054272?text=${encodeURIComponent(`Halo, saya ${form.nama}.\n\nSubjek: ${form.subjek}\n\n${form.pesan}\n\nEmail: ${form.email}\nTelepon: ${form.telepon}`)}`;
    window.open(wa, '_blank');
    setSubmitted(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-ink-950 py-20 sm:py-28">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-20">
          <AnimatedSection>
            <span className="text-[11px] font-semibold tracking-widest uppercase text-brand-400 mb-4 block">Kontak</span>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight max-w-2xl">
              Hubungi Kami
            </h1>
            <p className="mt-5 text-ink-400 text-[15px] leading-relaxed max-w-xl">
              Kami siap membantu Anda menemukan solusi transportasi yang tepat. Kirimkan pesan Anda atau hubungi langsung melalui informasi di bawah.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Contact Info + Form */}
      <section className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-20 py-20 sm:py-28">
        <div className="grid lg:grid-cols-[1fr_1.5fr] gap-12 lg:gap-20">
          {/* Info */}
          <AnimatedSection>
            <span className="text-[11px] font-semibold tracking-widest uppercase text-brand-500 mb-4 block">Informasi Kontak</span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink-950 tracking-tight mb-8">Kantor Kami</h2>
            <div className="space-y-5">
              {contactInfo.map((c) => (
                <div key={c.label} className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center shrink-0">
                    <c.icon size={18} className="text-ink-950" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-ink-400 uppercase tracking-wide">{c.label}</p>
                    {c.href ? (
                      <a href={c.href} className="text-[15px] text-ink-950 font-medium hover:text-brand-600 transition-colors">{c.value}</a>
                    ) : (
                      <p className="text-[15px] text-ink-950 font-medium">{c.value}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 p-6 bg-gray-50 rounded-[20px]">
              <div className="flex items-center gap-3 mb-3">
                <MessageCircle size={18} className="text-avail-600" />
                <span className="font-semibold text-ink-950 text-sm">Chat Langsung via WhatsApp</span>
              </div>
              <p className="text-ink-400 text-sm leading-relaxed mb-4">
                Untuk respon cepat, hubungi kami langsung melalui WhatsApp.
              </p>
              <a
                href="https://wa.me/62895361054272?text=Halo%2C%20saya%20ingin%20bertanya%20tentang%20layanan%20PILAR"
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-avail-500 text-white text-sm font-semibold rounded-lg hover:bg-avail-600 transition-colors"
              >
                Buka WhatsApp <Send size={14} />
              </a>
            </div>
          </AnimatedSection>

          {/* Form */}
          <AnimatedSection delay={0.1}>
            <div className="bg-white rounded-[24px] border border-gray-100 p-8 sm:p-10">
              <h3 className="font-display text-xl font-bold text-ink-950 mb-6">Kirim Pesan</h3>
              {submitted ? (
                <div className="text-center py-12">
                  <div className="w-14 h-14 bg-avail-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Send size={22} className="text-avail-600" />
                  </div>
                  <p className="font-semibold text-ink-950">Pesan Anda Telah Dikirim!</p>
                  <p className="text-ink-400 text-sm mt-2">Kami akan segera merespon melalui WhatsApp.</p>
                  <button onClick={() => { setSubmitted(false); setForm({ nama: '', email: '', telepon: '', subjek: '', pesan: '' }); }} className="mt-6 text-sm font-semibold text-brand-600 hover:text-brand-700">
                    Kirim Pesan Lain
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[12px] font-medium text-ink-500 mb-1.5">Nama Lengkap *</label>
                      <input type="text" name="nama" required value={form.nama} onChange={handleChange}
                        className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all" />
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-ink-500 mb-1.5">Email *</label>
                      <input type="email" name="email" required value={form.email} onChange={handleChange}
                        className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[12px] font-medium text-ink-500 mb-1.5">Telepon</label>
                      <input type="tel" name="telepon" value={form.telepon} onChange={handleChange}
                        className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all" />
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-ink-500 mb-1.5">Subjek *</label>
                      <select name="subjek" required value={form.subjek} onChange={handleChange}
                        className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all">
                        <option value="">Pilih subjek</option>
                        <option value="Rental Kendaraan">Rental Kendaraan</option>
                        <option value="Corporate Rental">Corporate Rental</option>
                        <option value="Airport Transfer">Airport Transfer</option>
                        <option value="Wedding Car">Wedding Car</option>
                        <option value="Kerjasama">Kerjasama Bisnis</option>
                        <option value="Lainnya">Lainnya</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-ink-500 mb-1.5">Pesan *</label>
                    <textarea name="pesan" required rows={5} value={form.pesan} onChange={handleChange}
                      className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all resize-none" />
                  </div>
                  <button type="submit" className="inline-flex items-center gap-2 px-6 py-3 bg-ink-950 text-white text-sm font-semibold rounded-lg hover:bg-ink-800 transition-colors">
                    Kirim via WhatsApp <Send size={14} />
                  </button>
                </form>
              )}
            </div>
          </AnimatedSection>
        </div>
      </section>
    </div>
  );
}
