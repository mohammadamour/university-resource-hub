/**
 * Shared utility functions used across the application.
 */

/**
 * Generates a URL-friendly slug from a string.
 * Used for creating course/department slugs from Arabic or English titles.
 * Example: "مهارات الحاسوب" → "مهارات-الحاسوب"
 * Example: "Computer Skills 101" → "computer-skills-101"
 */
export function slugify(text: string): string {
  return text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")       // Replace spaces with hyphens
    .replace(/[^\w\u0600-\u06FF-]+/g, "") // Remove non-word chars (keep Arabic + hyphens)
    .replace(/--+/g, "-")       // Replace multiple hyphens with single
    .replace(/^-+/, "")         // Trim leading hyphens
    .replace(/-+$/, "");        // Trim trailing hyphens
}

/**
 * Formats a date string to a localized Arabic date.
 * Example: "2026-09-25" → "٢٥ سبتمبر ٢٠٢٦"
 */
export function formatDateAr(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("ar-JO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Returns a human-readable file size string.
 * Example: 2048 → "2 KB"
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Strips PostgreSQL-incompatible characters from text strings:
 * - \u0000 (null bytes) which trigger Postgres error 22021: "unsupported Unicode escape sequence"
 * - Non-printable control characters (except tab \t, newline \n, carriage return \r)
 * - Lone / unpaired UTF-16 surrogates that cause JSON encoding or DB driver crashes
 */
export function sanitizeTextForPostgres(text: string): string;
export function sanitizeTextForPostgres(text: null | undefined): null;
export function sanitizeTextForPostgres(text: string | null | undefined): string | null;
export function sanitizeTextForPostgres(text: string | null | undefined): string | null {
  if (!text) return null;
  const cleaned = text
    .replace(/\0/g, "")
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "");
  return cleaned.trim() || null;
}

