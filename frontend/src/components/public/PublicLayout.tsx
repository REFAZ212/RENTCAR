import type { ReactNode } from 'react';
import MegaMenu from './landing/MegaMenu';
import LandingFooter from './landing/LandingFooter';

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <MegaMenu solid />
      <main className="flex-1 pt-16">{children}</main>
      <LandingFooter />
    </div>
  );
}
