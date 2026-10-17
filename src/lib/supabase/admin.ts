import { createClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client with the Service Role key.
 * Bypasses RLS for super-admin operations (deleting resources, editing metadata, reading non-active resources).
 * NEVER expose this to client components (must run server-side only).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment."
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
