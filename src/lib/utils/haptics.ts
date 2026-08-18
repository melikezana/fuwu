/**
 * Safely triggers haptic feedback (vibration) on supported devices (e.g. Android).
 * Fails silently on unsupported platforms (iOS, desktop) or when restricted by browser permissions.
 */
export function triggerHapticFeedback(pattern: number | number[] = 50): void {
  try {
    if (
      typeof window !== "undefined" &&
      "navigator" in window &&
      typeof window.navigator?.vibrate === "function"
    ) {
      window.navigator.vibrate(pattern);
    }
  } catch {
    // Fail silently on non-supported platforms or security restrictions
  }
}
