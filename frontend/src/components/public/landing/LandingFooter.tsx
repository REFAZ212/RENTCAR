import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin } from 'lucide-react';
import logo from '../../../assets/logo.png';

const footerLinks = {
  layanan: [
    { label: 'Sewa Harian', to: '/katalog' },
    { label: 'Sewa Mingguan', to: '/katalog' },
    { label: 'Sewa Bulanan', to: '/katalog' },
    { label: 'Dengan Driver', to: '/kontak' },
  ],
  perusahaan: [
    { label: 'Tentang Kami', to: '/tentang' },
    { label: 'Kontak', to: '/kontak' },
    { label: 'Katalog', to: '/katalog' },
  ],
};

export default function LandingFooter() {
  return (
    <footer className="bg-ink-950 text-ink-400">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-20">
        {/* Main footer */}
        <div className="py-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link to="/katalog" className="flex items-center gap-2.5 mb-4">
              <img src={logo} alt="PILAR" className="h-9 w-auto" />
              <span className="text-white font-display font-bold text-lg">PILAR Rental</span>
            </Link>
            <p className="text-sm leading-relaxed max-w-xs">
              Solusi rental kendaraan terpercaya. Armada lengkap, proses mudah, harga bersahabat.
            </p>
            {/* Social icons */}
            <div className="flex items-center gap-2 mt-5">
              <a href="#" className="w-9 h-9 bg-ink-900 rounded-xl flex items-center justify-center hover:bg-brand-500/20 transition-colors" aria-label="Instagram">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
              </a>
              <a href="#" className="w-9 h-9 bg-ink-900 rounded-xl flex items-center justify-center hover:bg-brand-500/20 transition-colors" aria-label="Facebook">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>
              </a>
              <a href="https://wa.me/62895361054272" target="_blank" rel="noopener noreferrer" className="w-9 h-9 bg-ink-900 rounded-xl flex items-center justify-center hover:bg-avail-500/20 transition-colors" aria-label="WhatsApp">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
              </a>
            </div>
          </div>

          {/* Layanan */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Layanan</h4>
            <ul className="space-y-2.5">
              {footerLinks.layanan.map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className="text-sm hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Perusahaan */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Perusahaan</h4>
            <ul className="space-y-2.5">
              {footerLinks.perusahaan.map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className="text-sm hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Kontak */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Kontak</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5 text-sm">
                <Phone size={15} className="mt-0.5 shrink-0 text-ink-400" />
                <span>0895-3610-54272</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm">
                <Mail size={15} className="mt-0.5 shrink-0 text-ink-400" />
                <span>info@pilarrental.com</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm">
                <MapPin size={15} className="mt-0.5 shrink-0 text-ink-400" />
                <span>Jl. Contoh No. 123, Kota</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="py-6 border-t border-ink-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-400">
          <p>&copy; {new Date().getFullYear()} PILAR Rental. Hak cipta dilindungi.</p>
          <div className="flex items-center gap-4">
            <span>Senin - Sabtu: 08.00 - 17.00</span>
            <span className="w-1 h-1 bg-ink-700 rounded-full" />
            <span>Minggu: 08.00 - 12.00</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
