import { supabase } from "@/lib/supabase/client";

export type ProviderAvailability = "müsait" | "yoğun" | "çevrimdışı";
export type ProviderStatus = "pending" | "approved" | "rejected";

export interface Provider {
  id: string;
  user_id: string;
  name: string;
  category: string;
  district: string;
  availability: ProviderAvailability;
  rating: number;
  phone: string;
  whatsapp: string;
  status: ProviderStatus;
  price_range: string;
  created_at: string;
}

export const providerService = {
  // Fetch active and approved providers
  async getProviders(filters?: { category?: string; district?: string }) {
    let query = supabase
      .from("providers")
      .select("*")
      .eq("status", "approved");

    if (filters?.category) {
      query = query.eq("category", filters.category);
    }
    if (filters?.district) {
      query = query.eq("district", filters.district);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching providers:", error.message);
      return [];
    }
    return data as Provider[];
  },

  // Apply to become a provider
  async apply(providerData: Omit<Provider, "id" | "status" | "rating" | "created_at">) {
    // Basic validation
    if (!providerData.user_id || !providerData.name || !providerData.category) {
      throw new Error("Eksik bilgi girdiniz.");
    }

    const { data, error } = await supabase
      .from("providers")
      .insert([{ ...providerData, status: "pending", rating: 0 }])
      .select()
      .single();

    if (error) {
      console.error("Provider application failed:", error.message);
      throw new Error("Başvuru sırasında bir hata oluştu.");
    }

    return data as Provider;
  },

  // Update availability
  async updateAvailability(providerId: string, availability: ProviderAvailability) {
    const { error } = await supabase
      .from("providers")
      .update({ availability })
      .eq("id", providerId);

    if (error) {
      console.error("Availability update failed:", error.message);
      throw new Error("Durum güncellenemedi.");
    }
    return true;
  }
};
