"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import { adminService } from "@/services/admin";
import { ServiceRequest, RequestStatus } from "@/services/requests";
import { Alert } from "@/components/ui/Alerts";
import AdminProtectedRoute from "@/components/auth/AdminProtectedRoute";

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      // Note: Admin authentication check should happen in middleware in a real app
      const data = await adminService.getAllRequests();
      setRequests(data);
    } catch (err: any) {
      setError("Talepler yüklenemedi. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: RequestStatus) => {
    try {
      await adminService.updateRequestStatus(id, newStatus);
      setRequests(reqs => reqs.map(r => r.id === id ? { ...r, status: newStatus } : r));
    } catch (err) {
      alert("Durum güncellenemedi.");
    }
  };

  return (
    <AdminProtectedRoute>
    <main className="min-h-screen bg-[#F5F6F8] flex flex-col">
      <Navbar />
      <div className="flex-1 p-6 lg:px-12 max-w-7xl mx-auto w-full">
        <h2 className="text-2xl font-bold mb-6">Müşteri Talepleri Yönetimi</h2>

        {error && <Alert type="error" message={error} className="mb-6" />}

        {loading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-white rounded-xl shadow-sm border border-gray-100"></div>
            ))}
          </div>
        ) : requests.length === 0 ? (
          <Alert type="info" message="Henüz hiçbir müşteri talebi bulunmamaktadır." />
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 font-medium">Müşteri</th>
                    <th className="px-6 py-4 font-medium">Hizmet / Bölge</th>
                    <th className="px-6 py-4 font-medium">İletişim</th>
                    <th className="px-6 py-4 font-medium">Tarih</th>
                    <th className="px-6 py-4 font-medium">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {requests.map(req => (
                    <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium">{req.customer_name}</td>
                      <td className="px-6 py-4">
                        <span className="bg-gray-100 px-2 py-1 rounded text-xs text-gray-600 mr-2">{req.category}</span>
                        <span className="text-gray-500">{req.district}</span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{req.customer_phone}</td>
                      <td className="px-6 py-4 text-gray-500">{new Date(req.created_at).toLocaleDateString("tr-TR")}</td>
                      <td className="px-6 py-4">
                        <select 
                          value={req.status}
                          onChange={(e) => handleStatusChange(req.id, e.target.value as RequestStatus)}
                          className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#FF8A00]"
                        >
                          <option value="yeni">Yeni</option>
                          <option value="inceleniyor">İnceleniyor</option>
                          <option value="ustaya_yonlendirildi">Yönlendirildi</option>
                          <option value="tamamlandi">Tamamlandı</option>
                          <option value="iptal">İptal</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
    </AdminProtectedRoute>
  );
}
