"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface AuthContextType {
  isAuthenticated: boolean;
  login: (accessCode: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false); // Tambahkan state untuk inisialisasi
  const router = useRouter();

  useEffect(() => {
    // Periksa status login dari localStorage saat komponen dimuat
    const storedAuth = localStorage.getItem("isAuthenticated");
    console.log("AuthProvider: storedAuth =", storedAuth);
    if (storedAuth === "true") {
      setIsAuthenticated(true);
    }
    setIsInitialized(true); // Tandai inisialisasi selesai
  }, []);

  const login = (accessCode: string) => {
    if (accessCode === "0x0AEc849b") {
      setIsAuthenticated(true);
      localStorage.setItem("isAuthenticated", "true");
      console.log("AuthProvider: Login successful, isAuthenticated =", true);
      return true;
    }
    console.log("AuthProvider: Login failed, invalid access code");
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("isAuthenticated");
    console.log("AuthProvider: Logged out");
    router.push("/");
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {isInitialized ? children : null} {/* Tunggu inisialisasi selesai */}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
