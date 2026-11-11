/**
 * First-party analytics helper.
 *
 * WHY first-party instead of e.g. PostHog/Mixpanel?
 * - Zero third-party JS weight on mobile (critical for Jordanian campus 4G connections)
 * - Data stored in our own Supabase table — no GDPR/privacy concerns to explain to students
 * - navigator.sendBeacon fires even when the tab is closing (download clicks, share clicks)
 *
 * HOW it works:
 * 1. track() serialises the event to JSON
 * 2. It hands the blob to navigator.sendBeacon (non-blocking, survives page unload)
 * 3. If sendBeacon fails (rare — quota exceeded), it falls back to fetch with keepalive:true
 * 4. The /api/events route inserts one row into the analytics_events Supabase table
 */

import { getOrCreateGuestId } from "./guest-session";

export interface TrackEventPayload {
  /** Snake_case event name, e.g. 'pdf_reader_open' */
  eventType: string;
  resourceId?: string;
  courseId?: string;
  courseSlug?: string;
  resourceTitle?: string;
  /** Any extra structured data for this event (kept under 2 KB) */
  metadata?: Record<string, unknown>;
}

/**
 * Fire-and-forget analytics event.
 * Safe to call in event handlers, useEffect hooks, and onClick callbacks.
 * Never throws — all errors are silently swallowed so a tracking bug
 * can never break a student's session.
 */
export function track(payload: TrackEventPayload): void {
  // Never run on the server — sendBeacon doesn't exist in Node.js
  if (typeof window === "undefined") return;

  try {
    const body = JSON.stringify({
      event_type: payload.eventType,
      resource_id: payload.resourceId,
      course_id: payload.courseId,
      course_slug: payload.courseSlug,
      resource_title: payload.resourceTitle,
      metadata: payload.metadata ?? {},
      guest_session_id: getOrCreateGuestId(),
    });

    // Blob wrapping is required for sendBeacon to send JSON with the correct Content-Type.
    // Without the Blob, the browser sends it as text/plain which breaks our API route parser.
    const blob = new Blob([body], { type: "application/json" });

    if (!navigator.sendBeacon("/api/events", blob)) {
      // sendBeacon returns false when the browser's beacon queue is full (very rare)
      fetch("/api/events", {
        method: "POST",
        body,
        headers: { "Content-Type": "application/json" },
        keepalive: true, // keepalive:true mimics sendBeacon — survives page unload
      }).catch(() => {});
    }
  } catch {
    // Completely silenced — analytics must NEVER surface errors to students
  }
}

