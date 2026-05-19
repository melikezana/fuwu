"use client";

import { useEffect, useState, ReactNode } from "react";
import Navbar from "@/components/layout/Navbar";
import { Alert } from "@/components/ui/Alerts";
import { authService } from "@/services/auth";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

interface AdminProtectedRouteProps {
  children: ReactNode;
}

export default function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    try {
      const adminStatus = await authService.isAdmin();
      setIsAdmin(adminStatus);
    } catch (err) {
      setIsAdmin(false);
    }
  };

  if (isAdmin === null) {
    return (
      <main className="min-h-screen bg-[#F5F6F8] flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="animate-pulse bg-white rounded-3xl p-8 shadow-sm h-64 w-full max-w-md"></div>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-[#F5F6F8] flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-sm text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
              <ShieldAlert size={32} />
            </div>
            <h2 className="text-2xl font-bold text-[#0D1424] mb-2">Yetkisiz Erişim</h2>
            <p className="text-gray-500 text-sm mb-6">
              Bu sayfayı görüntüleme yetkiniz bulunmamaktadır. Sadece yönetici hesapları bu alana erişebilir.
            </p>
            <Link 
              href="/"
              className="w-full bg-[#FF8A00] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#E67A00] transition-colors"
            >
              Ana Sayfaya Dön
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
