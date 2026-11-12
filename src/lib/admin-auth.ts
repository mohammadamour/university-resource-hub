import crypto from "node:crypto";

/**
 * Compares a caller-supplied secret against `process.env.ADMIN_SECRET` using
 * constant-time equality (`crypto.timingSafeEqual`).
 *
 * WHY SHA-256 BEFORE timingSafeEqual:
 * `crypto.timingSafeEqual` throws a RangeError if the two buffers differ in byte
 * length, and checking length upfront with `===` would reveal secret length via
 * timing side-channels. Hashing both inputs produces fixed 32-byte digests so the
 * comparison is always constant-time and safe for any string length.
 */
export function verifyAdminSecret(candidate: string | null | undefined): boolean {
  const expected = process.env.ADMIN_SECRET;
  if (!expected || !candidate) {
    return false;
  }

  const expectedDigest = crypto.createHash("sha256").update(expected, "utf8").digest();
  const candidateDigest = crypto.createHash("sha256").update(candidate, "utf8").digest();

  return crypto.timingSafeEqual(expectedDigest, candidateDigest);
}

/**
 * Checks whether an incoming Request carries a valid admin secret in the
 * `x-admin-secret` header (or optionally `?key=` for browser EventSource streams
 * that cannot attach custom HTTP headers).
 */
export function isAdminRequest(
  request: Request,
  options?: { allowQueryKey?: boolean }
): boolean {
  const headerSecret = request.headers.get("x-admin-secret");
  if (verifyAdminSecret(headerSecret)) {
    return true;
  }

  if (options?.allowQueryKey) {
    const queryKey = new URL(request.url).searchParams.get("key");
    if (verifyAdminSecret(queryKey)) {
      return true;
    }
  }

  return false;
}

