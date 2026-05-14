const protocolPattern = /^[a-z][a-z0-9+.-]*:/i;

export function isSafeInternalPath(value: string) {
  const path = value.trim();

  return (
    path.startsWith("/") &&
    !path.startsWith("//") &&
    !path.includes("\\") &&
    !protocolPattern.test(path)
  );
}

export function getSafeRedirectPath(
  value: string | null | undefined,
  fallbackPath = "/",
) {
  if (!value) {
    return fallbackPath;
  }

  return isSafeInternalPath(value) ? value.trim() : fallbackPath;
}

export function createSafeRedirectUrl(
  value: string | null | undefined,
  origin: string,
  fallbackPath = "/",
) {
  return new URL(getSafeRedirectPath(value, fallbackPath), origin);
}
