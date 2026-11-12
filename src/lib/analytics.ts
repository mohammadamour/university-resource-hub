/**
 * First-party behavioral & session analytics helper.
 *
 * WHY first-party instead of e.g. PostHog/Mixpanel?
 * - Zero third-party JS weight on mobile (critical for Jordanian campus 4G connections)
 * - Ad blockers often block third-party scripts (we observed ERR_BLOCKED_BY_CLIENT
 *   on /_vercel/insights/script.js), whereas navigator.sendBeacon("/api/events") survives
 * - Survives page unload and mobile tab switching via sendBeacon / keepalive
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

const IGNORE_FLAG_KEY = "molakhasat_ignore_analytics";
const VISIT_STATS_KEY = "molakhasat_visit_stats";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30-min inactivity splits visits
const LIFECYCLE_EVENTS = new Set(["session_end", "home_view", "pdf_reader_error"]);

interface VisitStats {
  count: number;
  lastActivityAt: number;
}

// Per-tab in-memory session state
let tabSessionId: string | null = null;
let entryPath = "/";
let currentPath = "/";
let sessionActionsCount = 0;
let visibleStartMs: number | null = null;
let accumulatedVisibleMs = 0;
let lastFlushedDurationSec = -1;
let lastFlushedActionsCount = -1;
let hasTrackedHomeThisVisit = false;

/**
 * Returns true if this browser belongs to local dev or a flagged founder/admin session.
 * Automatically persists the opt-out flag whenever an admin URL (/admin or /upload?key=)
 * is opened so future browsing from the founder's PC/phone never pollutes student metrics.
 */
export function isAnalyticsExcluded(): boolean {
  if (typeof window === "undefined") return true;

  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".local")) {
    return true;
  }

  const path = window.location.pathname;
  const search = window.location.search;
  const isAdminSessionUrl =
    path.startsWith("/admin") || (path === "/upload" && search.includes("key="));

  try {
    if (isAdminSessionUrl) {
      localStorage.setItem(IGNORE_FLAG_KEY, "1");
      return true;
    }
    if (localStorage.getItem(IGNORE_FLAG_KEY) === "1") {
      return true;
    }
  } catch {
    // Incognito or locked storage — only exclude if currently on an admin URL
    if (isAdminSessionUrl) return true;
  }

  return false;
}

function getOrUpdateVisitStats(): VisitStats {
  const now = Date.now();
  const fallback: VisitStats = { count: 1, lastActivityAt: now };

  if (typeof window === "undefined") return fallback;

  try {
    const raw = localStorage.getItem(VISIT_STATS_KEY);
    if (!raw) {
      localStorage.setItem(VISIT_STATS_KEY, JSON.stringify(fallback));
      return fallback;
    }

    const parsed = JSON.parse(raw) as Partial<VisitStats>;
    const prevCount = typeof parsed.count === "number" && parsed.count >= 1 ? parsed.count : 1;
    const prevLast = typeof parsed.lastActivityAt === "number" ? parsed.lastActivityAt : now;

    // Bump visit counter only when returning after >30 min of inactivity
    const nextCount = now - prevLast > SESSION_TIMEOUT_MS ? prevCount + 1 : prevCount;
    const updated: VisitStats = { count: nextCount, lastActivityAt: now };
    localStorage.setItem(VISIT_STATS_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return fallback;
  }
}

function getTabSessionId(): string {
  if (tabSessionId) return tabSessionId;
  tabSessionId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `sess_${Math.random().toString(36).slice(2, 11)}`;
  return tabSessionId;
}

function getActiveDurationSeconds(): number {
  const liveDelta = visibleStartMs !== null ? Math.max(0, Date.now() - visibleStartMs) : 0;
  return Math.round((accumulatedVisibleMs + liveDelta) / 1000);
}

function sendBeaconPayload(payload: TrackEventPayload): void {
  if (typeof window === "undefined" || isAnalyticsExcluded()) return;

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

    // Blob wrapping sets Content-Type: application/json for sendBeacon
    const blob = new Blob([body], { type: "application/json" });

    if (!navigator.sendBeacon("/api/events", blob)) {
      fetch("/api/events", {
        method: "POST",
        body,
        headers: { "Content-Type": "application/json" },
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Analytics must never surface errors to students
  }
}

/**
 * Initializes active visible-time tracking once per tab mount.
 */
export function initSessionTracking(initialPath: string): void {
  if (typeof window === "undefined" || isAnalyticsExcluded()) return;

  getTabSessionId();
  entryPath = initialPath || "/";
  currentPath = entryPath;

  if (document.visibilityState === "visible" && visibleStartMs === null) {
    visibleStartMs = Date.now();
  }

  const visitStats = getOrUpdateVisitStats();
  if (entryPath === "/" && !hasTrackedHomeThisVisit) {
    hasTrackedHomeThisVisit = true;
    let referrerHost: string | null = null;
    try {
      if (document.referrer) {
        referrerHost = new URL(document.referrer).hostname || null;
      }
    } catch {
      referrerHost = null;
    }

    sendBeaconPayload({
      eventType: "home_view",
      metadata: {
        visit_number: visitStats.count,
        is_returning: visitStats.count > 1,
        referrer_host: referrerHost,
      },
    });
  }
}

/**
 * Updates exit path on client-side Next.js route navigations.
 */
export function updateSessionPath(pathname: string): void {
  if (typeof window === "undefined" || isAnalyticsExcluded()) return;

  currentPath = pathname || "/";
  const visitStats = getOrUpdateVisitStats();

  if (pathname === "/" && !hasTrackedHomeThisVisit) {
    hasTrackedHomeThisVisit = true;
    sendBeaconPayload({
      eventType: "home_view",
      metadata: {
        visit_number: visitStats.count,
        is_returning: visitStats.count > 1,
        via: "client_nav",
      },
    });
  }
}

/**
 * Pauses/resumes active timer on tab visibility changes and flushes a summary
 * when the tab becomes hidden so mobile backgrounding still records duration.
 */
export function handleSessionVisibilityChange(isVisible: boolean): void {
  if (typeof window === "undefined" || isAnalyticsExcluded()) return;

  if (isVisible) {
    if (visibleStartMs === null) {
      visibleStartMs = Date.now();
    }
    return;
  }

  if (visibleStartMs !== null) {
    accumulatedVisibleMs += Math.max(0, Date.now() - visibleStartMs);
    visibleStartMs = null;
  }

  flushSessionSummary("hidden");
}

/**
 * Emits a deduplicatable `session_end` beacon carrying active duration,
 * action count before leaving, bounce status, and returning-visitor metadata.
 */
export function flushSessionSummary(trigger: "hidden" | "pagehide"): void {
  if (typeof window === "undefined" || isAnalyticsExcluded()) return;

  const durationSeconds = getActiveDurationSeconds();
  // Filter <2s empty flashes (e.g. accidental preloads or instant mount churn)
  if (durationSeconds < 2 && sessionActionsCount === 0) {
    return;
  }

  // Skip redundant writes if nothing meaningful changed since the last flush
  if (
    durationSeconds - lastFlushedDurationSec < 5 &&
    sessionActionsCount === lastFlushedActionsCount
  ) {
    return;
  }

  lastFlushedDurationSec = durationSeconds;
  lastFlushedActionsCount = sessionActionsCount;

  const visitStats = getOrUpdateVisitStats();
  sendBeaconPayload({
    eventType: "session_end",
    metadata: {
      session_id: getTabSessionId(),
      entry_path: entryPath,
      exit_path: currentPath,
      duration_seconds: durationSeconds,
      actions_count: sessionActionsCount,
      bounced: sessionActionsCount === 0,
      visit_number: visitStats.count,
      is_returning: visitStats.count > 1,
      trigger,
    },
  });
}

/**
 * Fire-and-forget behavioral event helper.
 * Safe to call in event handlers, useEffect hooks, and onClick callbacks.
 */
export function track(payload: TrackEventPayload): void {
  if (typeof window === "undefined" || isAnalyticsExcluded()) return;

  if (!LIFECYCLE_EVENTS.has(payload.eventType)) {
    sessionActionsCount += 1;
    getOrUpdateVisitStats();
  }

  sendBeaconPayload(payload);
}
