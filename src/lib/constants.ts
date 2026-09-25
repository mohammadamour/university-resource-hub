/**
 * Application-wide constants.
 *
 * This is the "hidden complexity" strategy in action:
 * The backend schema supports multiple universities and departments,
 * but the frontend hard-assumes Jadara University for V1.
 * When we expand, we change these constants — not the database.
 */

// ─── Default University (V1: Jadara only) ───────────────────────────────────
export const DEFAULT_UNIVERSITY_SLUG = "jadara";
export const DEFAULT_UNIVERSITY_NAME = "جامعة جدارا";

// ─── Site Metadata ──────────────────────────────────────────────────────────
export const SITE_NAME = "ملخصات";
export const SITE_NAME_EN = "Molakhasat";
export const SITE_DESCRIPTION =
  "منصة أكاديمية لطلاب الجامعة — ملخصات، موارد، وأدلة دراسية";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://molakhasat.com";

// ─── Storage ────────────────────────────────────────────────────────────────
export const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "";

// ─── ISR Revalidation Intervals (seconds) ───────────────────────────────────
export const REVALIDATE_LANDING = 3600; // Landing page: every 1 hour
export const REVALIDATE_COURSE = 60;    // Course pages: every 1 minute

// ─── RBAC Role Constants ────────────────────────────────────────────────────
export const ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  USER: "user",
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];
