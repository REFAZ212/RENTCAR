import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

import { authAPI } from "../services/api";

/* ============================
   Types
============================ */

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role?: string;
}

interface LoginResponse {
  token: string;
  user: User;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (
    email: string,
    password: string
  ) => Promise<LoginResponse>;
  setSession: (token: string, user: User) => void;
  logout: () => Promise<void>;
}

/* ============================
   Auth Helpers
============================ */

function clearAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

/* ============================
   Device ID
============================ */

/**
 * Mengambil device ID dari localStorage.
 *
 * Jika belum ada, buat ID unik baru.
 * ID ini akan tetap sama selama localStorage
 * browser tersebut tidak dihapus.
 */
function getDeviceId(): string {
  const STORAGE_KEY = "rentcar_device_id";

  let deviceId = localStorage.getItem(STORAGE_KEY);

  if (!deviceId) {
    deviceId = crypto.randomUUID();

    localStorage.setItem(STORAGE_KEY, deviceId);
  }

  return deviceId;
}

/* ============================
   Context
============================ */

const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

/* ============================
   Provider
============================ */

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({
  children,
}: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);

  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");

    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        clearAuth();
      }
    }

    setLoading(false);
  }, []);

  /* ============================
     Login
  ============================ */

  const login = async (
    email: string,
    password: string
  ): Promise<LoginResponse> => {
    /*
     * Ambil device ID browser ini.
     *
     * Device ID tidak berubah setiap login.
     * Device baru akan mempunyai ID berbeda.
     */
    const deviceId = getDeviceId();

    const { data } = await authAPI.login({
      email,
      password,
      device_id: deviceId,
    });

    localStorage.setItem("token", data.token);

    localStorage.setItem(
      "user",
      JSON.stringify(data.user)
    );

    setUser(data.user);

    return data;
  };

  /* ============================
     Logout
  ============================ */

  const logout = async (): Promise<void> => {
    try {
      await authAPI.logout();
    } catch {
      // abaikan jika gagal logout di server
    }

    clearAuth();
    setUser(null);
  };

const setSession = (token: string, user: User): void => {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
  setUser(user);
};

  return (
    <AuthContext.Provider
  value={{
    user,
    loading,
    login,
    setSession,
    logout,
  }}
>
      {children}
    </AuthContext.Provider>
  );
}

/* ============================
   Hook
============================ */

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth harus digunakan di dalam AuthProvider"
    );
  }

  return context;
}