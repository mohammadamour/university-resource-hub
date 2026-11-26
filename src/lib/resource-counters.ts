/**
 * Client-side helpers for atomically incrementing resource engagement counters.
 *
 * WHY RPC instead of a REST PATCH?
 *   `UPDATE ... SET col = col + 1` inside a Postgres function is atomic and
 *   free of race conditions. A REST PATCH would require a read-then-write which
 *   races under concurrent students opening the same PDF.
 *
 * WHY anon key instead of service role?
 *   These are benign, public increment-only operations on public content.
 *   The anon key is safe here: the RPC functions are SECURITY DEFINER and only
 *   UPDATE existing rows; they cannot read, delete, or insert anything.
 *
 * HOW this is called:
 *   - `trackView(id)`      → pdf_reader_open events, /r/:id redirect hits
 *   - `trackDownload(id)`  → pdf_download events
 *
 * Both are fire-and-forget: they never block UI or throw visible errors.
 */

import { createPublicClient } from "@/lib/supabase/server";

/**
 * Atomically increments views_count for a resource.
 * Safe to call server-side (Route Handlers, Server Components, after() callbacks).
 */
export async function trackResourceView(resourceId: string): Promise<void> {
  try {
    const supabase = createPublicClient();
    await supabase.rpc("increment_resource_views", { resource_id: resourceId });
  } catch {
    // Fire-and-forget: never surface tracking errors to students
  }
}

/**
 * Atomically increments downloads_count for a resource.
 * Safe to call server-side (Route Handlers, Server Components, after() callbacks).
 */
export async function trackResourceDownload(resourceId: string): Promise<void> {
  try {
    const supabase = createPublicClient();
    await supabase.rpc("increment_resource_downloads", { resource_id: resourceId });
  } catch {
    // Fire-and-forget: never surface tracking errors to students
  }
}
