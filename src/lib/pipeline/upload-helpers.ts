import { createClient } from "@supabase/supabase-js";
import dns from "node:dns";
import crypto from "node:crypto";
import type { ResourceType } from "@/types/database";

// Force IPv4 resolution first to bypass local network IPv6 routing black-holes
try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // Graceful fallback for non-Node runtimes
}

export const ALLOWED_UPLOAD_MIMES = ["application/pdf"] as const;
export const MAX_UPLOAD_SIZE_BYTES = 30 * 1024 * 1024; // 30 MB

export const VALID_RESOURCE_TYPES: ResourceType[] = [
  "summary",
  "quiz",
  "past_exam",
  "guide",
  "link",
  "other",
];

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const SHA256_HEX_REGEX = /^[0-9a-f]{64}$/i;

export function createUploadAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars."
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

/**
 * Verifies genuine PDF signature ("%PDF-" at byte offset 0 per ISO 32000-1).
 */
export function hasPdfMagicHeader(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 5) return false;
  const headerSlice = new Uint8Array(buffer.slice(0, 5));
  return new TextDecoder("ascii").decode(headerSlice) === "%PDF-";
}

export function computeSha256Hex(buffer: ArrayBuffer): string {
  return crypto.createHash("sha256").update(Buffer.from(buffer)).digest("hex");
}

export async function findDuplicateResource(
  supabase: ReturnType<typeof createUploadAdminClient>,
  courseId: string,
  fileHash: string
): Promise<{ id: string; title: string } | null> {
  const { data } = await supabase
    .from("resources")
    .select("id, title")
    .eq("course_id", courseId)
    .eq("file_hash", fileHash)
    .maybeSingle();

  return data;
}

