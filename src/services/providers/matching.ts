import { supabase } from "@/lib/supabase/client";
import { Provider } from "../providers";

export const matchingService = {
  /**
   * Matches providers based on category and district.
   * Prefer 'müsait' over 'yoğun', completely ignores 'çevrimdışı'.
   */
  async matchProviders(category: string, district: string): Promise<Provider[]> {
    try {
      const { data, error } = await supabase
        .from("providers")
        .select("*")
        .eq("status", "approved")
        .eq("category", category)
        .eq("district", district)
        // Must not be offline
        .neq("availability", "çevrimdışı");

      if (error) {
        console.error("Matching error:", error.message);
        return [];
      }

      const providers = data as Provider[];

      // Sort logic: 'müsait' comes first, then 'yoğun', then sort by rating descending.
      return providers.sort((a, b) => {
        if (a.availability === "müsait" && b.availability !== "müsait") return -1;
        if (b.availability === "müsait" && a.availability !== "müsait") return 1;
        return b.rating - a.rating;
      });
    } catch (err) {
      console.error("Failed to match providers", err);
      return [];
    }
  }
};
