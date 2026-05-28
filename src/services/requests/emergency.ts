"use server";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import type { ServiceRequestInput, ServiceRequestSubmitResult } from "@/types/request";
import { SERVICE_REQUEST_STATUSES } from "@/lib/constants/statuses";
import { getProviderDirectory } from "@/services/providers";

type ServiceRequestInsert = Database["public"]["Tables"]["service_requests"]["Insert"];

/**
 * Generates a simple 4-digit confirmation code.
 */
export async function generateJobConfirmationCode(): Promise<string> {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Calculates a base suggested price for an emergency request.
 */
export async function calculateSuggestedPrice(category: string): Promise<number> {
  // Mock base logic: Some services are more expensive
  const basePrices: Record<string, number> = {
    "Tesisat": 750,
    "Elektrik": 600,
    "Temizlik": 1000,
    "Halı Yıkama": 500,
    "Klima & Beyaz Eşya": 850,
    "Mobilya Montaj": 600,
    "Boya Badana": 2500,
    "Nakliye Yardımı": 1500,
  };
  
  return basePrices[category] || 500;
}

/**
 * Creates an emergency service request simulating a TAG-style flow.
 */
export async function createEmergencyMatchRequest(
  input: ServiceRequestInput
): Promise<ServiceRequestSubmitResult> {
  const supabase = await createClient();

  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  // 1. Resolve Category ID
  const { data: categories } = await supabase
    .from("service_categories")
    .select("id")
    .eq("name", input.serviceCategory)
    .limit(1);

  let categoryId = categories?.[0]?.id;

  if (!categoryId) {
    const { data: newCategory } = await supabase
      .from("service_categories")
      .insert({ 
        name: input.serviceCategory, 
        slug: input.serviceCategory.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description: input.serviceCategory 
      })
      .select("id")
      .single();
    if (newCategory) categoryId = newCategory.id;
  }

  // 2. Resolve District ID
  const { data: districts } = await supabase
    .from("districts")
    .select("id")
    .eq("name", input.district)
    .limit(1);

  let districtId = districts?.[0]?.id;

  if (!districtId) {
    const { data: newDistrict } = await supabase
      .from("districts")
      .insert({ 
        name: input.district, 
        slug: input.district.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        city: "Bilinmiyor" 
      })
      .select("id")
      .single();
    if (newDistrict) districtId = newDistrict.id;
  }

  if (!categoryId || !districtId) {
    throw new Error("Category or District could not be resolved.");
  }

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id || "00000000-0000-0000-0000-000000000000";

  const confirmationCode = await generateJobConfirmationCode();
  
  // Future-ready text
  const estimatedArrivalText = "15-20 dk";
  const paymentPreference = input.paymentPreference === "iban" ? "iban" : "cash";

  // Simulate assignment
  const { allProviders } = await getProviderDirectory();
  const availableProviders = allProviders.filter((p) => p.district === input.district);
  const assignedProviderId = availableProviders.length > 0 ? availableProviders[0].id : null;

  const requestInsert: ServiceRequestInsert = {
    user_id: userId,
    category_id: categoryId,
    district_id: districtId,
    address: input.fullAddress || "Yaklaşık Konum",
    urgency: input.urgencyLevel || "acil",
    urgency_type: "emergency",
    budget_tag: input.budgetTag || "acil",
    offered_price: input.offeredPrice || null,
    payment_preference: paymentPreference,
    approximate_location: input.approximateLocation || input.district,
    confirmation_code: confirmationCode,
    estimated_arrival_text: estimatedArrivalText,
    description: input.shortDescription || "Acil Hizmet Talebi",
    status: assignedProviderId ? SERVICE_REQUEST_STATUSES.ustayaYonlendirildi : SERVICE_REQUEST_STATUSES.yeni,
    emergency_status: assignedProviderId ? "accepted" : "pending",
    assigned_provider_id: assignedProviderId,
    accepted_at: assignedProviderId ? new Date().toISOString() : null,
  };

  const { data, error } = await supabase
    .from("service_requests")
    .insert(requestInsert)
    .select("id")
    .single();

  if (error) {
    console.error("Error creating emergency request:", error);
    throw new Error("Acil talep oluşturulamadı. Lütfen tekrar deneyin.");
  }

  return {
    requestCode: data.id,
    confirmationCode: confirmationCode,
  };
}
