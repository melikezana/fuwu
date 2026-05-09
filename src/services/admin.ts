import {
  createSupabaseServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type ProviderRow = Database["public"]["Tables"]["providers"]["Row"];
type ProviderApplicationRow =
  Database["public"]["Tables"]["provider_applications"]["Row"];
type ServiceRequestRow =
  Database["public"]["Tables"]["service_requests"]["Row"];

type NamedRelation = {
  name: string | null;
};

type MaybeRelation = NamedRelation | NamedRelation[] | null;

type ProfileRelation = {
  full_name: string | null;
};

type MaybeProfileRelation = ProfileRelation | ProfileRelation[] | null;

type AdminProviderRecord = Pick<
  ProviderRow,
  "id" | "name" | "phone" | "rating" | "is_active" | "is_approved"
> & {
  districts: MaybeRelation;
  service_categories: MaybeRelation;
};

type AdminProviderApplicationRecord = Pick<
  ProviderApplicationRow,
  "id" | "full_name" | "phone" | "experience_years" | "status" | "created_at"
> & {
  districts: MaybeRelation;
  service_categories: MaybeRelation;
};

type AdminServiceRequestRecord = Pick<
  ServiceRequestRow,
  "id" | "user_id" | "urgency" | "status" | "created_at"
> & {
  districts: MaybeRelation;
  profiles: MaybeProfileRelation;
  service_categories: MaybeRelation;
};

export type AdminProvider = {
  category: string;
  district: string;
  id: string;
  isActive: boolean;
  isApproved: boolean;
  name: string;
  phone: string;
  rating: number;
};

export type AdminProviderApplication = {
  category: string;
  createdAt: string;
  district: string;
  experience: string;
  fullName: string;
  id: string;
  phone: string;
  status: string;
};

export type AdminServiceRequest = {
  category: string;
  createdAt: string;
  customerName: string;
  district: string;
  id: string;
  status: string;
  urgency: string;
};

export type AdminReadResult<T> = {
  error: string | null;
  isConfigured: boolean;
  rows: T[];
};

export type AdminDashboardSummary = {
  activeProviders: number;
  pendingApplications: number;
  serviceRequests: number;
  totalProviders: number;
};

export type AdminDashboardResult = {
  error: string | null;
  isConfigured: boolean;
  summary: AdminDashboardSummary;
};

const emptyDashboardSummary: AdminDashboardSummary = {
  activeProviders: 0,
  pendingApplications: 0,
  serviceRequests: 0,
  totalProviders: 0,
};

function getRelationName(relation: MaybeRelation) {
  const record = Array.isArray(relation) ? relation[0] : relation;
  return record?.name?.trim() || "Belirtilmedi";
}

function getProfileName(relation: MaybeProfileRelation, userId: string) {
  const record = Array.isArray(relation) ? relation[0] : relation;
  const profileName = record?.full_name?.trim();

  if (profileName) {
    return profileName;
  }

  return `Müşteri ${userId.slice(0, 8).toLocaleUpperCase("tr")}`;
}

function getAdminReadError(error: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.warn("Admin Supabase read failed.", error);
  }

  return "Supabase verisi şu anda okunamadı.";
}

function createEmptyReadResult<T>(error: string | null = null): AdminReadResult<T> {
  return {
    error,
    isConfigured: isSupabaseServerConfigured,
    rows: [],
  };
}

async function getSupabaseForAdminRead() {
  if (!isSupabaseServerConfigured) {
    return null;
  }

  return createSupabaseServerClient();
}

export async function getAdminDashboardSummary(): Promise<AdminDashboardResult> {
  const supabase = await getSupabaseForAdminRead();

  if (!supabase) {
    return {
      error: null,
      isConfigured: false,
      summary: emptyDashboardSummary,
    };
  }

  const [
    totalProvidersResult,
    activeProvidersResult,
    pendingApplicationsResult,
    serviceRequestsResult,
  ] = await Promise.all([
    supabase.from("providers").select("id", { count: "exact", head: true }),
    supabase
      .from("providers")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("provider_applications")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase.from("service_requests").select("id", { count: "exact", head: true }),
  ]);

  const results = [
    totalProvidersResult,
    activeProvidersResult,
    pendingApplicationsResult,
    serviceRequestsResult,
  ];
  const firstError = results.find((result) => result.error)?.error ?? null;

  return {
    error: firstError ? getAdminReadError(firstError) : null,
    isConfigured: true,
    summary: {
      activeProviders: activeProvidersResult.count ?? 0,
      pendingApplications: pendingApplicationsResult.count ?? 0,
      serviceRequests: serviceRequestsResult.count ?? 0,
      totalProviders: totalProvidersResult.count ?? 0,
    },
  };
}

export async function getAdminProviders(): Promise<AdminReadResult<AdminProvider>> {
  const supabase = await getSupabaseForAdminRead();

  if (!supabase) {
    return createEmptyReadResult();
  }

  const { data, error } = await supabase
    .from("providers")
    .select(
      `
        id,
        name,
        phone,
        rating,
        is_active,
        is_approved,
        service_categories(name),
        districts(name)
      `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    return createEmptyReadResult(getAdminReadError(error));
  }

  return {
    error: null,
    isConfigured: true,
    rows: ((data ?? []) as unknown as AdminProviderRecord[]).map((provider) => ({
      category: getRelationName(provider.service_categories),
      district: getRelationName(provider.districts),
      id: provider.id,
      isActive: provider.is_active,
      isApproved: provider.is_approved,
      name: provider.name,
      phone: provider.phone,
      rating: Number(provider.rating ?? 0),
    })),
  };
}

export async function getAdminProviderApplications(): Promise<
  AdminReadResult<AdminProviderApplication>
> {
  const supabase = await getSupabaseForAdminRead();

  if (!supabase) {
    return createEmptyReadResult();
  }

  const { data, error } = await supabase
    .from("provider_applications")
    .select(
      `
        id,
        full_name,
        phone,
        experience_years,
        status,
        created_at,
        service_categories(name),
        districts(name)
      `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    return createEmptyReadResult(getAdminReadError(error));
  }

  return {
    error: null,
    isConfigured: true,
    rows: ((data ?? []) as unknown as AdminProviderApplicationRecord[]).map(
      (application) => ({
        category: getRelationName(application.service_categories),
        createdAt: application.created_at,
        district: getRelationName(application.districts),
        experience: `${application.experience_years} yıl`,
        fullName: application.full_name,
        id: application.id,
        phone: application.phone,
        status: application.status,
      }),
    ),
  };
}

export async function getAdminServiceRequests(): Promise<
  AdminReadResult<AdminServiceRequest>
> {
  const supabase = await getSupabaseForAdminRead();

  if (!supabase) {
    return createEmptyReadResult();
  }

  const { data, error } = await supabase
    .from("service_requests")
    .select(
      `
        id,
        user_id,
        urgency,
        status,
        created_at,
        service_categories(name),
        districts(name),
        profiles(full_name)
      `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    return createEmptyReadResult(getAdminReadError(error));
  }

  return {
    error: null,
    isConfigured: true,
    rows: ((data ?? []) as unknown as AdminServiceRequestRecord[]).map((request) => ({
      category: getRelationName(request.service_categories),
      createdAt: request.created_at,
      customerName: getProfileName(request.profiles, request.user_id),
      district: getRelationName(request.districts),
      id: request.id,
      status: request.status,
      urgency: request.urgency,
    })),
  };
}
