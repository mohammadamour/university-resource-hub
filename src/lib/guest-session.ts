/**
 * Shared utility for anonymous guest session identity.
 * Extracted from NativeQuiz.tsx to avoid duplication across
 * analytics, quiz telemetry, and any future personalization features.
 *
 * Uses localStorage with a crypto.randomUUID fallback for older browsers.
 * Returns a stable 'guest_ssr' sentinel during server-side rendering.
 */
export function getOrCreateGuestId(): string {
  if (typeof window === "undefined") return "guest_ssr";

  const KEY = "molakhasat_guest_uuid";
  let id = localStorage.getItem(KEY);

  if (!id) {
    // crypto.randomUUID() is available in all modern browsers (Chrome 92+, FF 95+, Safari 15.4+)
    id = `guest_${
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2, 11)
    }`;
    try {
      localStorage.setItem(KEY, id);
    } catch {
      // localStorage may throw in incognito mode or when storage quota is exceeded
    }
  }

  return id;
}

