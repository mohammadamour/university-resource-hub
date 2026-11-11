import dns from "node:dns";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Dynamic route: reads incoming beacon payloads on every request
export const dynamic = "force-dynamic";

// Match project IPv4-first workaround for Windows local dev environments
try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // Non-Node runtimes can ignore
}

// ─── Constants & Validation Helpers ──────────────────────────────────────────

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return UUID_RE.test(trimmed) ? trimmed : null;
}

function capText(value: unknown, maxLen: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLen) : null;
}

interface EventBody {
  event_type: unknown;
  resource_id?: unknown;
  course_id?: unknown;
  course_slug?: unknown;
  resource_title?: unknown;
  metadata?: unknown;
  guest_session_id?: unknown;
}

// ─── POST /api/events ─────────────────────────────────────────────────────────

/**
 * First-party behavioral telemetry endpoint designed for `navigator.sendBeacon`.
 * Always returns HTTP 200 `{ ok: true }` so failed tracking writes never pollute
 * student browser consoles or retry uselessly on beacon unload.
 *
 * [BLINDSPOT]: Unauthenticated public write endpoint; protected only by payload
 * size/type caps and Supabase service-role insertion. Add rate limiting if spam occurs.
 */
export async function POST(req: NextRequest) {
  try {
    let body: EventBody;

    try {
      body = (await req.json()) as EventBody;
    } catch {
      return Response.json({ ok: true }, { status: 200 });
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return Response.json({ ok: true }, { status: 200 });
    }

    const eventType = capText(body.event_type, 64);
    if (!eventType) {
      return Response.json({ ok: true }, { status: 200 });
    }

    // Reject oversized or non-object metadata bags (2 KB cap)
    let metadata: Record<string, unknown> = {};
    if (
      body.metadata &&
      typeof body.metadata === "object" &&
      !Array.isArray(body.metadata)
    ) {
      try {
        if (JSON.stringify(body.metadata).length <= 2048) {
          metadata = body.metadata as Record<string, unknown>;
        }
      } catch {
        metadata = {};
      }
    }

    const row = {
      event_type: eventType,
      // Convert mock/non-UUID IDs (e.g. placement-exams fallback) to null so Postgres UUID insert succeeds
      resource_id: normalizeUuid(body.resource_id),
      course_id: normalizeUuid(body.course_id),
      course_slug: capText(body.course_slug, 200),
      resource_title: capText(body.resource_title, 300),
      metadata,
      guest_session_id: capText(body.guest_session_id, 128),
      user_agent: capText(req.headers.get("user-agent"), 512),
    };

    const supabase = createAdminClient();
    const { error } = await supabase.from("analytics_events").insert(row);

    // If a stale ISR cache referenced a recently deleted resource/course (FK 23503),
    // preserve the event anyway with slug/title instead of dropping telemetry.
    if (error?.code === "23503") {
      const { error: retryErr } = await supabase
        .from("analytics_events")
        .insert({ ...row, resource_id: null, course_id: null });
      if (retryErr) {
        console.warn("[events] Fallback insert failed:", retryErr.message);
      }
    } else if (error) {
      console.warn("[events] Insert failed:", error.message);
    }
  } catch (err) {
    console.warn("[events] Unexpected handler error:", err);
  }

  return Response.json({ ok: true }, { status: 200 });
}
