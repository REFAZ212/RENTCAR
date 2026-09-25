import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import api from '../services/api';
import { ADMIN_WA, ADMIN_HP_DISPLAY } from '../lib/format';

export interface AdminContact {
  wa: string;
  hp: string;
  email: string;
  alamat: string;
}

const DEFAULT_CONTACT: AdminContact = {
  wa: ADMIN_WA,
  hp: ADMIN_HP_DISPLAY,
  email: 'info@udin-renctcar.com',
  alamat: 'Jl. Contoh No. 123, Kota',
};

const AdminContactContext = createContext<AdminContact>(DEFAULT_CONTACT);

export function AdminContactProvider({ children }: { children: ReactNode }) {
  const [contact, setContact] = useState<AdminContact>(DEFAULT_CONTACT);

  useEffect(() => {
    api
      .get('/katalog/kontak')
      .then(({ data }) => {
        const d = data as Partial<AdminContact> | null;
        if (d?.wa) {
          setContact({
            wa: d.wa,
            hp: d.hp || `0${d.wa.slice(2)}`,
            email: d.email || DEFAULT_CONTACT.email,
            alamat: d.alamat || DEFAULT_CONTACT.alamat,
          });
        }
      })
      .catch(() => {});
  }, []);

  return <AdminContactContext.Provider value={contact}>{children}</AdminContactContext.Provider>;
}

export function useAdminContact() {
  return useContext(AdminContactContext);
}