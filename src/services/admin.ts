import { supabase } from "@/lib/supabase/client";
import { ProviderStatus } from "./providers";
import { RequestStatus } from "./requests";

export const adminService = {
  // Check if current user is admin
  async isAdmin(userId: string) {
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (error || !data) return false;
    return data.role === "admin";
  },

  // Get all pending provider applications
  async getPendingProviders() {
    const { data, error } = await supabase
      .from("providers")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Admin fetch providers error:", error.message);
      return [];
    }
    return data;
  },

  // Update provider status (approve/reject)
  async updateProviderStatus(providerId: string, status: ProviderStatus) {
    const { error } = await supabase
      .from("providers")
      .update({ status })
      .eq("id", providerId);

    if (error) {
      console.error("Failed to update provider status:", error.message);
      throw new Error("İşlem başarısız oldu.");
    }
    return true;
  },

  // Get all requests
  async getAllRequests() {
    const { data, error } = await supabase
      .from("requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Admin fetch requests error:", error.message);
      return [];
    }
    return data;
  },

  // Update request status
  async updateRequestStatus(requestId: string, status: RequestStatus) {
    const { error } = await supabase
      .from("requests")
      .update({ status })
      .eq("id", requestId);

    if (error) {
      console.error("Failed to update request status:", error.message);
      throw new Error("Durum güncellenemedi.");
    }
    return true;
  }
};
