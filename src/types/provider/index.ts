export type Provider = {
  id: string;
  name: string;
  category: string;
  district: string;
  rating: number;
  experience: string;
  averagePrice: string;
  phone: string;
  whatsapp: string;
  availability: string;
  description: string;
  shortDescription: string;
  serviceAreas: string[];
  workingHours: string;
  servicesOffered: string[];
  trustBadges: string[];
  completedJobs: number;
  responseTime: string;
  reviewCount: number;
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
  query?: string;
};

export type ProviderFilterOptions = {
  availabilityOptions: string[];
  averagePrices: string[];
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
  fullName: string;
  phoneNumber: string;
  whatsappNumber: string;
  serviceCategory: string;
  serviceArea: string;
  yearsOfExperience: string;
  availability: string;
  hasEquipment: string;
  shortIntroduction: string;
  referenceLink: string;
  profileImage?: File | null;
};

export type ProviderApplicationSubmitMode = "live" | "demo";

export type ProviderApplicationProfileImageStatus = "uploaded" | "skipped";

export type { ProviderApplicationStatus } from "@/lib/constants/statuses";

export type ProviderApplicationSubmitResult = {
  applicationCode: string;
  mode: ProviderApplicationSubmitMode;
  profileImageStatus: ProviderApplicationProfileImageStatus;
  profileImageMessage?: string;
};
