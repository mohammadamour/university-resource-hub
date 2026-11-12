"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  initSessionTracking,
  updateSessionPath,
  handleSessionVisibilityChange,
  flushSessionSummary,
} from "@/lib/analytics";

/**
 * Zero-UI global session tracker mounted once in RootLayout.
 * Captures active session length, actions-before-leave, zero-action bounces,
 * and returning visit numbers via a single `session_end` beacon on hide/unload.
 */
export default function SessionTracker() {
  const pathname = usePathname();

  useEffect(() => {
    initSessionTracking(pathname);

    const onVisibilityChange = () => {
      handleSessionVisibilityChange(document.visibilityState === "visible");
    };

    const onPageHide = () => {
      handleSessionVisibilityChange(false);
      flushSessionSummary("pagehide");
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
    };
    // Run lifecycle registration once per browser tab mount; route changes handled below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    updateSessionPath(pathname);
  }, [pathname]);

  return null;
}

