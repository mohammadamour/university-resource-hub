"use client";

import type { ReactNode } from "react";
import { track } from "@/lib/analytics";

interface TrackedExternalLinkProps {
  href: string;
  eventType: string;
  metadata?: Record<string, unknown>;
  className?: string;
  children: ReactNode;
}

/**
 * Tiny client leaf for external links rendered inside Server Components (e.g. Footer),
 * allowing behavioral click tracking without turning the parent layout into a client bundle.
 */
export default function TrackedExternalLink({
  href,
  eventType,
  metadata,
  className,
  children,
}: TrackedExternalLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={() => track({ eventType, metadata })}
    >
      {children}
    </a>
  );
}

