import type { ProviderAvailabilityStatus } from "@/lib/constants/statuses";
import type {
  ProviderOperationalStatus,
  ProviderTrustBadge,
} from "@/lib/providers/trust";

export type Provider = {
  id: string;
  name: string;
  categoryId?: string;
  category: string;
  districtId?: string;
  district: string;
  rating: number;
  experience: string;
  averagePriceMin?: number | null;
  averagePriceMax?: number | null;
  averagePrice: string;
  availabilityStatus: ProviderOperationalStatus;
  phone: string;
  profileImageUrl?: string;
  whatsapp: string;
  availability: ProviderAvailabilityStatus;
  description: string;
  shortDescription: string;
  serviceAreas: string[];
  workingHours: string;
  servicesOffered: string[];
  trustBadges: ProviderTrustBadge[];
  completedJobs: number;
  responseTime: string;
  responseTimeMinutes?: number | null;
  reviewCount: number;
  isVerified?: boolean;
  phoneVerified?: boolean;
  identityVerified?: boolean;
  lastActiveAt?: string | null;
  profileCompletionScore: number;
  profileCompletionMissingFields: string[];
  featured?: boolean;
  source?: "supabase" | "mock";
};

export type ProviderDataSource = "supabase" | "fallback";

export type ProviderFilters = {
  category?: string;
  district?: string;
  maximumPrice?: string;
  minimumPrice?: string;
  price?: string;
  rating?: string;
  availability?: string;
  budget?: string;
  query?: string;
};

export type ProviderFilterOptions = {
  availabilityOptions: string[];
  averagePrices: string[];
  budgetOptions: string[];
  categories: string[];
  districts: string[];
};

export type ProviderDirectory = {
  allProviders: Provider[];
  filterOptions: ProviderFilterOptions;
  providers: Provider[];
  source: ProviderDataSource;
  totalCount: number;
};

export type ProviderApplicationInput = {
  availability: string;
  categoryId: string;
  districtId: string;
  experienceYears: string;
  fullName: string;
  hasEquipment: string;
  introduction: string;
  phone: string;
  portfolioUrl: string;
  profileImagePath?: string;
  profileImageUrl?: string;
  verificationDocumentPath?: string;
  verificationDocumentUrl?: string;
};

export type ProviderApplicationOption = {
  id: string;
  name: string;
};

export type ProviderApplicationSubmitMode = "live" | "demo";

export type { ProviderApplicationStatus } from "@/lib/constants/statuses";

export type ProviderApplicationSubmitResult = {
  applicationCode: string;
  mode: ProviderApplicationSubmitMode;
};

export type ProviderApplicationSubmitActionResult =
  | {
      ok: true;
      result: ProviderApplicationSubmitResult;
    }
  | {
      errorCode: "auth-required" | "rate-limit" | "server" | "validation";
      message: string;
      ok: false;
    };
