"use client";

import { useState } from "react";
import { SITE_NAME, SITE_URL } from "@/lib/constants";
import { track } from "@/lib/analytics";

interface ShareSiteButtonProps {
  /** Visual variant: 'card' for mobile 2x2 grid pill, 'link' for desktop footer column. */
  variant?: "card" | "link";
  className?: string;
}

/**
 * Interactive "Share Site" leaf button for Footer.
 * Keeps Footer itself a Server Component while providing Web Share API
 * on mobile and a clean clipboard-copy fallback on desktop/WKWebView.
 */
export default function ShareSiteButton({
  variant = "card",
  className = "",
}: ShareSiteButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const shareData = {
      title: `${SITE_NAME} — لطلاب جامعة جدارا`,
      text: "ملخصات، سلايدات، وكويزات مراجعة تفاعلية في مكان واحد بدون تسجيل دخول:",
      url: SITE_URL,
    };

    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share(shareData);
        track({ eventType: "site_share", metadata: { method: "web_share", variant } });
        return;
      }
    } catch (err) {
      // User cancelled native share sheet — do not fall back to clipboard copy
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      // Otherwise (e.g. WKWebView restriction), fall through to clipboard copy
    }

    try {
      await navigator.clipboard.writeText(SITE_URL);
      setCopied(true);
      track({ eventType: "site_share", metadata: { method: "clipboard", variant } });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Last-resort silent fail if clipboard permissions are locked
    }
  };

  const icon = (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-muted"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );

  if (variant === "link") {
    return (
      <button
        type="button"
        onClick={handleShare}
        className={`inline-flex min-h-[36px] items-center gap-2 text-sm font-medium text-ink transition-colors hover:text-muted cursor-pointer ${className}`}
      >
        {icon}
        <span>{copied ? "تم نسخ الرابط ✓" : "شارك الموقع"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className={`flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-line bg-surface px-3.5 py-3 text-xs sm:text-sm font-semibold text-ink transition-all hover:border-ink/30 active:scale-[0.98] cursor-pointer ${className}`}
    >
      {icon}
      <span>{copied ? "تم نسخ الرابط ✓" : "شارك الموقع"}</span>
    </button>
  );
}
