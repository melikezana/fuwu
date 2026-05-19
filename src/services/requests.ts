import { supabase } from "@/lib/supabase/client";

export type RequestStatus = "yeni" | "inceleniyor" | "ustaya_yonlendirildi" | "tamamlandi" | "iptal";

export interface ServiceRequest {
  id: string;
  customer_id: string | null; // null if guest
  customer_name: string;
  customer_phone: string;
  category: string;
  district: string;
  description: string;
  status: RequestStatus;
  assigned_provider_id: string | null;
  created_at: string;
}

export const requestService = {
  // Create a new service request
  async createRequest(requestData: Omit<ServiceRequest, "id" | "status" | "assigned_provider_id" | "created_at">) {
    if (!requestData.customer_name || !requestData.customer_phone || !requestData.category) {
      throw new Error("Lütfen zorunlu alanları doldurun.");
    }

    const { data, error } = await supabase
      .from("requests")
      .insert([{ ...requestData, status: "yeni" }])
      .select()
      .single();

    if (error) {
      console.error("Failed to create request:", error.message);
      throw new Error("Talebiniz oluşturulamadı. Lütfen tekrar deneyin.");
    }

    return data as ServiceRequest;
  },

  // Get user's requests
  async getUserRequests(userId: string) {
    const { data, error } = await supabase
      .from("requests")
      .select("*")
      .eq("customer_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch requests:", error.message);
      return [];
    }
    return data as ServiceRequest[];
  }
};
