import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, Menu, X } from 'lucide-react';
import { ADMIN_WA } from '../../../lib/format';
import logo from '../../../assets/logorentcar.png';

/* ─── Navigation Data ────────────────────────────────────────────────── */

interface NavItem {
  label: string;
  href?: string;
  children?: { label: string; href: string; desc?: string }[];
}

const navItems: NavItem[] = [
  { label: 'Beranda', href: '/' },
  {
    label: 'Tentang Kami',
    children: [
      { label: 'Profil Perusahaan', href: '/tentang', desc: 'Mengenal PT PILAR lebih dekat' },
      { label: 'Sejarah', href: '/tentang#sejarah', desc: 'Perjalanan kami sejak berdiri' },
      { label: 'Visi & Misi', href: '/tentang#visi-misi', desc: 'Arah dan tujuan perusahaan' },
      { label: 'Nilai Perusahaan', href: '/tentang#nilai', desc: 'Prinsip yang kamipegang teguh' },
      { label: 'Struktur Organisasi', href: '/tentang#tim', desc: 'Tim leadership kami' },
    ],
  },
  {
    label: 'Layanan',
    children: [
      { label: 'Rental Mobil', href: '/katalog', desc: 'Sewa kendaraan harian hingga bulanan' },
      { label: 'Rental Dengan Sopir', href: '/layanan/sopir', desc: 'Layanan chauffeur profesional' },
      { label: 'Corporate Rental', href: '/layanan/corporate', desc: 'Solusi transportasi perusahaan' },
      { label: 'Airport Transfer', href: '/layanan/airport', desc: 'Antar jemput bandara' },
      { label: 'Wedding Car', href: '/layanan/wedding', desc: 'Kendaraan premium untuk hari spesial' },
      { label: 'Event Transportation', href: '/layanan/event', desc: 'Transportasi skala besar' },
    ],
  },
  {
    label: 'Armada',
    href: '/katalog',
  },
  {
    label: 'Media',
    children: [
      { label: 'Berita', href: '/berita', desc: 'Informasi terbaru dari perusahaan' },
      { label: 'Artikel', href: '/artikel', desc: 'Tips dan panduan berguna' },
      { label: 'Promo', href: '/promo', desc: 'Penawaran dan diskon terkini' },
    ],
  },
  { label: 'Karir', href: '/karir' },
  { label: 'Kontak', href: '/kontak' },
];

/* ─── Mega Menu Dropdown ─────────────────────────────────────────────── */

function MegaDropdown({ item, onClose }: { item: NavItem; onClose: () => void }) {
  if (!item.children) return null;

  return (
    <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3 w-max">
      <div className="bg-white rounded-xl border border-accent-100 shadow-xl shadow-black/[0.06] p-5 grid grid-cols-2 gap-1 min-w-[480px]">
        {item.children.map((child) => (
          <Link
            key={child.href}
            to={child.href}
            onClick={onClose}
            className="flex flex-col gap-0.5 px-4 py-3 rounded-lg hover:bg-canvas transition-colors group"
          >
            <span className="text-[13px] font-semibold text-black group-hover:text-primary-600 transition-colors">{child.label}</span>
            {child.desc && <span className="text-[11px] text-black-400 leading-snug">{child.desc}</span>}
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ─── Mobile Menu ────────────────────────────────────────────────────── */

function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => { onClose(); }, [location.pathname]);

  if (!open) return null;

  return (
    <div className="lg:hidden fixed inset-0 top-16 z-40 bg-white overflow-y-auto">
      <div className="px-5 py-4 space-y-1">
        {navItems.map((item) => (
          <div key={item.label}>
            {item.children ? (
              <>
                <button
                  onClick={() => setExpanded(expanded === item.label ? null : item.label)}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium text-black-700 rounded-lg hover:bg-canvas"
                >
                  {item.label}
                  <ChevronDown size={16} className={`text-black-400 transition-transform ${expanded === item.label ? 'rotate-180' : ''}`} />
                </button>
                {expanded === item.label && (
                  <div className="pl-4 pb-1">
                    {item.children.map((child) => (
                      <Link key={child.href} to={child.href} onClick={onClose}
                        className="block px-3 py-2 text-sm text-black-600 rounded-lg hover:bg-canvas">
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <Link to={item.href || '#'} onClick={onClose}
                className="block px-3 py-2.5 text-sm font-medium text-black-700 rounded-lg hover:bg-canvas">
                {item.label}
              </Link>
            )}
          </div>
        ))}
        <div className="pt-3 border-t border-accent-100 mt-3">
          <a href={`https://wa.me/${ADMIN_WA}?text=Halo%2C%20saya%20ingin%20reservasi`}
            target="_blank" rel="noopener noreferrer"
            className="block px-3 py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-lg text-center">
            Reservasi
          </a>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Navbar ────────────────────────────────────────────────────── */

export default function MegaMenu({ solid = false }: { solid?: boolean }) {
  const [scrolled, setScrolled] = useState(solid);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (solid) return;
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [solid]);

  const handleMouseEnter = (label: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpenDropdown(label);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setOpenDropdown(null), 150);
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled
        ? 'bg-white/95 backdrop-blur-md shadow-md'
        : 'bg-transparent'
    }`}>
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-20 flex items-center justify-between h-16">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <img src={logo} alt="PILAR" className="h-10 w-auto" />
        </Link>

        {/* Desktop nav */}
        <div className="hidden lg:flex items-center gap-0.5">
          {navItems.map((item) => (
            <div
              key={item.label}
              className="relative"
              onMouseEnter={() => item.children && handleMouseEnter(item.label)}
              onMouseLeave={handleMouseLeave}
            >
              {item.href ? (
                <Link
                  to={item.href}
                  className="inline-flex items-center gap-1 px-3 py-2 text-[13px] font-medium rounded-lg transition-colors text-black/70 hover:text-black hover:bg-black/5"
                >
                  {item.label}
                </Link>
              ) : (
                <button className="inline-flex items-center gap-1 px-3 py-2 text-[13px] font-medium rounded-lg transition-colors text-black/70 hover:text-black hover:bg-black/5">
                  {item.label}
                  <ChevronDown size={12} className={`transition-transform duration-200 ${openDropdown === item.label ? 'rotate-180' : ''}`} />
                </button>
              )}
              {item.children && openDropdown === item.label && (
                <MegaDropdown item={item} onClose={() => setOpenDropdown(null)} />
              )}
            </div>
          ))}
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          <a
            href={`https://wa.me/${ADMIN_WA}?text=Halo%2C%20saya%20ingin%20reservasi`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center px-5 py-2 text-[13px] font-semibold rounded-lg transition-all duration-200 bg-white text-primary-600 hover:bg-accent-100"
          >
            Reservasi
          </a>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 rounded-lg transition-colors text-black hover:bg-black/5"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </nav>
  );
}
