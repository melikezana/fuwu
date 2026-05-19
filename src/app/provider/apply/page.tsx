"use client";

import { useState } from "react";
import Button from "@/components/common/Button";
import Navbar from "@/components/layout/Navbar";
import { Alert } from "@/components/ui/Alerts";
import { providerService } from "@/services/providers";
import { CATEGORIES, DISTRICTS } from "@/constants/filters";

export default function ProviderApplyPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    
    try {
      await providerService.apply({
        user_id: "guest-provider-" + Date.now(), // Real auth would use logged in user id
        name: formData.get("name") as string,
        phone: formData.get("phone") as string,
        whatsapp: formData.get("whatsapp") as string,
        category: formData.get("category") as string,
        district: formData.get("district") as string,
        price_range: formData.get("price_range") as string,
        availability: "müsait", // Default
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Başvuru sırasında bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen bg-[#F5F6F8] flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-sm text-center">
            <Alert 
              type="success"
              title="Başvurunuz Alındı"
              message="Usta başvurunuz başarıyla alındı. Ekibimiz başvurunuzu inceledikten sonra onaylayacaktır."
              className="mb-6"
            />
            <Button onClick={() => window.location.href = "/"} className="w-full">
              Ana Sayfaya Dön
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F5F6F8] flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center p-6 py-12">
        <div className="max-w-2xl w-full bg-white rounded-3xl p-8 shadow-sm">
          <h2 className="text-2xl font-bold mb-2">Usta Ağına Katıl</h2>
          <p className="text-gray-600 mb-8">Fuwu ile binlerce müşteriye anında ulaşın. Aşağıdaki formu doldurarak başvurunuzu yapabilirsiniz.</p>
          
          {error && <Alert type="error" message={error} className="mb-6" />}

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Ad Soyad / Firma Adı</label>
                <input required name="name" className="px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FF8A00]" placeholder="Ad Soyad" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Fiyat Aralığı (Opsiyonel)</label>
                <input name="price_range" className="px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FF8A00]" placeholder="Örn: 500TL - 1500TL" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Telefon</label>
                <input required name="phone" type="tel" className="px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FF8A00]" placeholder="05XX XXX XX XX" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">WhatsApp</label>
                <input required name="whatsapp" type="tel" className="px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FF8A00]" placeholder="905XX XXX XX XX" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Hizmet Kategorisi</label>
                <select required name="category" className="px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FF8A00] bg-white">
                  <option value="">Seçiniz...</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Hizmet Bölgesi (İlçe)</label>
                <select required name="district" className="px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FF8A00] bg-white">
                  <option value="">Seçiniz...</option>
                  {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            <Button type="submit" className="w-full mt-4" disabled={loading}>
              {loading ? "Gönderiliyor..." : "Başvuruyu Tamamla"}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
