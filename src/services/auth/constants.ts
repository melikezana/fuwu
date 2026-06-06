import type { CurrentUserProfile, ProfileRole } from "@/types/auth";

export const profileRoles = {
  admin: "admin" as ProfileRole,
  customer: "customer" as ProfileRole,
  provider: "provider" as ProfileRole,
} as const;

export const adminProfileRole = profileRoles.admin;
export const providerProfileRole = profileRoles.provider;

export const authAccessMessages = {
  accessDenied: "Bu alana erişim yetkin yok.",
  adminRequired: "Admin paneline erişmek için yetkili hesap gerekir.",
  loginRequired: "Giriş yaparak devam etmelisin.",
  profileUnavailable: "Hesap bilgilerin doğrulanamadı. Lütfen tekrar giriş yap.",
} as const;

export function hasRole(
  profile: Pick<CurrentUserProfile, "role"> | null | undefined,
  role: ProfileRole,
) {
  return profile?.role === role;
}

export function hasAdminRole(
  profile: Pick<CurrentUserProfile, "role"> | null | undefined,
) {
  return hasRole(profile, adminProfileRole);
}

export function hasProviderRole(
  profile: Pick<CurrentUserProfile, "role"> | null | undefined,
) {
  return hasRole(profile, providerProfileRole);
}
