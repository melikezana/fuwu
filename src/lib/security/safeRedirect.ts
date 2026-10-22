const protocolPattern = /^[a-z][a-z0-9+.-]*:/i;

export function getRequestOrigin(request: { url: string; headers: Headers }) {
  const url = new URL(request.url);
  // Next normalizes 127.0.0.1 URLs to localhost. Keep the initiating local cookie host.
  const host = request.headers.get("host");
  if (["localhost", "127.0.0.1"].includes(url.hostname) && host && /^(localhost|127\.0\.0\.1)(:\d{1,5})?$/.test(host)) url.host = host;
  return url.origin;
}

export function isSafeInternalPath(value: string) {
  const path = value.trim();
  // WHATWG URLs discard tabs/newlines: /\t/evil.test otherwise becomes an external URL.
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(value) || protocolPattern.test(path)) return false;
  try {
    const decodedPath = decodeURIComponent(path.split(/[?#]/)[0]);
    return !decodedPath.startsWith("//") && !decodedPath.includes("\\") &&
      !/[\u0000-\u001f\u007f]/.test(decodedPath) &&
      new URL(path, "https://redirect.invalid").origin === "https://redirect.invalid";
  } catch { return false; }
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
