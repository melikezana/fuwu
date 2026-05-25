import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export type HealthCheckResult = {
  status: "healthy" | "unhealthy" | "degraded";
  checks: {
    env: boolean;
    authClient: boolean;
    categoriesReadable: boolean;
    districtsReadable: boolean;
    providersReadable: boolean;
    applicationsAccessible: boolean;
    requestsAccessible: boolean;
  };
  errors: string[];
};

export async function checkBackendHealth(): Promise<HealthCheckResult> {
  const result: HealthCheckResult = {
    status: "unhealthy",
    checks: {
      env: isSupabaseConfigured,
      authClient: false,
      categoriesReadable: false,
      districtsReadable: false,
      providersReadable: false,
      applicationsAccessible: false,
      requestsAccessible: false,
    },
    errors: [],
  };

  if (!result.checks.env) {
    result.errors.push("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
    return result;
  }

  try {
    const supabase = await createSupabaseServerClient();
    
    if (!supabase) {
      result.errors.push("Failed to initialize Supabase server client.");
      return result;
    }
    
    result.checks.authClient = true;

    // Check Categories
    try {
      const { error } = await supabase.from("service_categories").select("id").limit(1);
      if (error) throw error;
      result.checks.categoriesReadable = true;
    } catch (e: any) {
      result.errors.push(`Categories read failed: ${e.message}`);
    }

    // Check Districts
    try {
      const { error } = await supabase.from("districts").select("id").limit(1);
      if (error) throw error;
      result.checks.districtsReadable = true;
    } catch (e: any) {
      result.errors.push(`Districts read failed: ${e.message}`);
    }

    // Check Providers
    try {
      const { error } = await supabase
        .from("providers")
        .select("id")
        .eq("is_active", true)
        .eq("is_approved", true)
        .limit(1);
      if (error) throw error;
      result.checks.providersReadable = true;
    } catch (e: any) {
      result.errors.push(`Providers read failed: ${e.message}`);
    }

    // Check Provider Applications
    try {
      const { error } = await supabase.from("provider_applications").select("id").limit(1);
      if (error) throw error;
      result.checks.applicationsAccessible = true;
    } catch (e: any) {
      result.errors.push(`Provider applications access failed: ${e.message}`);
    }

    // Check Service Requests
    try {
      const { error } = await supabase.from("service_requests").select("id").limit(1);
      if (error) throw error;
      result.checks.requestsAccessible = true;
    } catch (e: any) {
      result.errors.push(`Service requests access failed: ${e.message}`);
    }

    // Evaluate overall status
    const allChecksPassed = 
      result.checks.authClient && 
      result.checks.categoriesReadable && 
      result.checks.districtsReadable && 
      result.checks.providersReadable &&
      result.checks.applicationsAccessible &&
      result.checks.requestsAccessible;

    if (allChecksPassed) {
      result.status = "healthy";
    } else if (result.checks.authClient) {
      result.status = "degraded";
    }

  } catch (globalError: any) {
    result.errors.push(`Critical failure during health check: ${globalError.message}`);
  }

  return result;
}
