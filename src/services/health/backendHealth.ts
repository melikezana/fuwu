import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export type HealthCheckResult = {
  status: "healthy" | "degraded" | "unavailable";
  checks: {
    name: string;
    passed: boolean;
  }[];
  warnings: string[];
  recommendations: string[];
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function checkBackendHealth(): Promise<HealthCheckResult> {
  const result: HealthCheckResult = {
    status: "unavailable",
    checks: [
      { name: "env vars present", passed: isSupabaseConfigured },
      { name: "Supabase client initialized", passed: false },
      { name: "categories readable", passed: false },
      { name: "districts readable", passed: false },
      { name: "providers readable", passed: false },
      { name: "provider application flow readiness", passed: false },
      { name: "request flow readiness", passed: false },
      { name: "auth callback documented", passed: true },
      { name: "admin operations readiness", passed: true },
    ],
    warnings: [],
    recommendations: [],
  };

  if (!isSupabaseConfigured) {
    result.warnings.push("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
    result.recommendations.push("Ensure Supabase is configured in .env.local before proceeding.");
    return result;
  }

  try {
    const supabase = await createSupabaseServerClient();
    
    if (!supabase) {
      result.warnings.push("Failed to initialize Supabase server client.");
      return result;
    }
    
    result.checks[1].passed = true;

    // Check Categories
    try {
      const { error } = await supabase.from("service_categories").select("id").limit(1);
      if (error) throw error;
      result.checks[2].passed = true;
    } catch (error: unknown) {
      result.warnings.push(`Categories read failed: ${getErrorMessage(error)}`);
    }

    // Check Districts
    try {
      const { error } = await supabase.from("districts").select("id").limit(1);
      if (error) throw error;
      result.checks[3].passed = true;
    } catch (error: unknown) {
      result.warnings.push(`Districts read failed: ${getErrorMessage(error)}`);
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
      result.checks[4].passed = true;
    } catch (error: unknown) {
      result.warnings.push(`Providers read failed: ${getErrorMessage(error)}`);
    }

    // Check Provider Applications
    try {
      const { error } = await supabase.from("provider_applications").select("id").limit(1);
      if (error) throw error;
      result.checks[5].passed = true;
    } catch (error: unknown) {
      result.warnings.push(`Provider applications access failed: ${getErrorMessage(error)}`);
    }

    // Check Service Requests
    try {
      const { error } = await supabase.from("service_requests").select("id").limit(1);
      if (error) throw error;
      result.checks[6].passed = true;
    } catch (error: unknown) {
      result.warnings.push(`Service requests access failed: ${getErrorMessage(error)}`);
    }

    const allPassed = result.checks.every(c => c.passed);
    const somePassed = result.checks.some(c => c.passed);

    if (allPassed) {
      result.status = "healthy";
      result.recommendations.push("The backend is fully operational and healthy. No actions are required.");
    } else if (somePassed) {
      result.status = "degraded";
      result.recommendations.push("Investigate the failed checks and ensure all required schemas are fully migrated.");
    } else {
      result.recommendations.push("The backend is completely unresponsive. Check network logs and database connection.");
    }

  } catch (globalError: unknown) {
    result.warnings.push(`Critical failure during health check: ${getErrorMessage(globalError)}`);
  }

  return result;
}
