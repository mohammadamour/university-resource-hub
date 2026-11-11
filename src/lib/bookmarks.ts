"use client";

import { useSyncExternalStore } from "react";
import type { ResourceType } from "@/types/database";

export interface SavedCourseMeta {
  title: string;
  courseCode?: string | null;
}

export interface SavedResourceSnapshot {
  id: string;
  title: string;
  courseSlug: string;
  courseTitle: string;
  type: ResourceType;
  targetExam?: string | null;
  pageCount?: number | null;
  hasQuiz?: boolean;
  savedAt: number;
}

export interface BookmarksState {
  courses: string[]; // Array of course slugs (most recently pinned first)
  courseMeta: Record<string, SavedCourseMeta>; // Cached Arabic titles + codes keyed by slug
  resources: SavedResourceSnapshot[];
}

const STORAGE_KEY = "molakhasat:bookmarks:v1";
const CHANGE_EVENT = "molakhasat:bookmarks-change";
const MAX_SAVED_ITEMS = 40;

// Constant fallback reference required by useSyncExternalStore for SSR & unchanged reads
const EMPTY_BOOKMARKS: BookmarksState = {
  courses: [],
  courseMeta: {},
  resources: [],
};

let cachedRaw: string | null | undefined = undefined;
let cachedSnapshot: BookmarksState = EMPTY_BOOKMARKS;

function normalizeSnapshot(parsed: unknown): BookmarksState {
  if (!parsed || typeof parsed !== "object") return EMPTY_BOOKMARKS;
  const obj = parsed as Partial<BookmarksState>;

  const courses = Array.isArray(obj.courses)
    ? Array.from(
        new Set(obj.courses.filter((s): s is string => typeof s === "string" && s.length > 0))
      ).slice(0, MAX_SAVED_ITEMS)
    : [];

  const courseSlugSet = new Set(courses);
  const courseMeta: Record<string, SavedCourseMeta> = {};
  if (obj.courseMeta && typeof obj.courseMeta === "object") {
    for (const [slug, meta] of Object.entries(obj.courseMeta)) {
      if (
        courseSlugSet.has(slug) &&
        meta &&
        typeof meta === "object" &&
        typeof meta.title === "string" &&
        meta.title.trim().length > 0
      ) {
        courseMeta[slug] = {
          title: meta.title,
          courseCode: typeof meta.courseCode === "string" ? meta.courseCode : null,
        };
      }
    }
  }

  const resources = Array.isArray(obj.resources)
    ? obj.resources
        .filter(
          (r): r is SavedResourceSnapshot =>
            Boolean(
              r &&
                typeof r === "object" &&
                typeof r.id === "string" &&
                typeof r.title === "string" &&
                typeof r.courseSlug === "string"
            )
        )
        .slice(0, MAX_SAVED_ITEMS)
    : [];

  return { courses, courseMeta, resources };
}

function getBookmarksSnapshot(): BookmarksState {
  if (typeof window === "undefined") return EMPTY_BOOKMARKS;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    // Keep object identity stable when localStorage hasn't changed (required by React 19 useSyncExternalStore)
    if (raw === cachedRaw) {
      return cachedSnapshot;
    }

    cachedRaw = raw;
    if (!raw) {
      cachedSnapshot = EMPTY_BOOKMARKS;
      return cachedSnapshot;
    }

    cachedSnapshot = normalizeSnapshot(JSON.parse(raw));
    return cachedSnapshot;
  } catch {
    return EMPTY_BOOKMARKS;
  }
}

function getServerBookmarksSnapshot(): BookmarksState {
  return EMPTY_BOOKMARKS;
}

function subscribeBookmarks(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === STORAGE_KEY) {
      callback();
    }
  };
  const handleLocalChange = () => callback();

  window.addEventListener("storage", handleStorage);
  window.addEventListener(CHANGE_EVENT, handleLocalChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(CHANGE_EVENT, handleLocalChange);
  };
}

function writeBookmarks(next: BookmarksState): void {
  if (typeof window === "undefined") return;

  try {
    const serialized = JSON.stringify(next);
    window.localStorage.setItem(STORAGE_KEY, serialized);
    cachedRaw = serialized;
    cachedSnapshot = next;
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // Ignore quota / Safari private browsing write errors gracefully
  }
}

/**
 * Reactive hook backed by localStorage with SSR-safe hydration.
 */
export function useBookmarks(): BookmarksState {
  return useSyncExternalStore(
    subscribeBookmarks,
    getBookmarksSnapshot,
    getServerBookmarksSnapshot
  );
}

/**
 * Pins or unpins a course slug (caching its Arabic title & code for display in BookmarkDrawer),
 * returning its new saved state.
 */
export function toggleSavedCourse(
  courseSlug: string,
  meta?: SavedCourseMeta
): boolean {
  const current = getBookmarksSnapshot();
  const exists = current.courses.includes(courseSlug);
  const nextCourses = exists
    ? current.courses.filter((slug) => slug !== courseSlug)
    : [courseSlug, ...current.courses].slice(0, MAX_SAVED_ITEMS);

  const nextMeta = { ...current.courseMeta };
  if (exists) {
    delete nextMeta[courseSlug];
  } else if (meta?.title) {
    nextMeta[courseSlug] = {
      title: meta.title,
      courseCode: meta.courseCode ?? null,
    };
  }

  writeBookmarks({
    ...current,
    courses: nextCourses,
    courseMeta: nextMeta,
  });

  return !exists;
}

/**
 * Backfills or refreshes cached Arabic course titles/codes for already-pinned slugs
 * without triggering unnecessary writes when everything is already up to date.
 */
export function syncSavedCourseMeta(
  catalogCourses: Array<{ slug: string; title: string; courseCode?: string | null }>
): void {
  const current = getBookmarksSnapshot();
  if (current.courses.length === 0 || catalogCourses.length === 0) return;

  const pinnedSet = new Set(current.courses);
  let changed = false;
  const nextMeta = { ...current.courseMeta };

  for (const item of catalogCourses) {
    if (!pinnedSet.has(item.slug) || !item.title) continue;
    const prev = nextMeta[item.slug];
    const nextCode = item.courseCode ?? null;
    if (!prev || prev.title !== item.title || (prev.courseCode ?? null) !== nextCode) {
      nextMeta[item.slug] = { title: item.title, courseCode: nextCode };
      changed = true;
    }
  }

  if (changed) {
    writeBookmarks({
      ...current,
      courseMeta: nextMeta,
    });
  }
}

/**
 * Pins or unpins a resource snapshot (stored client-side to avoid extra DB queries on /).
 */
export function toggleSavedResource(
  resource: Omit<SavedResourceSnapshot, "savedAt">
): boolean {
  const current = getBookmarksSnapshot();
  const exists = current.resources.some((r) => r.id === resource.id);
  const nextResources = exists
    ? current.resources.filter((r) => r.id !== resource.id)
    : [{ ...resource, savedAt: Date.now() }, ...current.resources].slice(0, MAX_SAVED_ITEMS);

  writeBookmarks({
    ...current,
    resources: nextResources,
  });

  return !exists;
}

/**
 * Removes a saved resource directly by ID (used on quick-remove pills).
 */
export function removeSavedResource(resourceId: string): void {
  const current = getBookmarksSnapshot();
  if (!current.resources.some((r) => r.id === resourceId)) return;

  writeBookmarks({
    ...current,
    resources: current.resources.filter((r) => r.id !== resourceId),
  });
}
