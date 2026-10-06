"use client";

import { useState } from "react";
import type { Resource, ResourceType } from "@/types/database";
import Badge from "@/components/ui/Badge";

interface ResourceListProps {
  resources: Resource[];
}

/**
 * Renders a list of resources (PDFs, quizzes, links) for a specific course.
 * Resources are grouped into tabs by their resource_type.
 */
export default function ResourceList({ resources }: ResourceListProps) {
  // We only show tabs for resource types that actually exist in this course
  const availableTypes = Array.from(
    new Set(resources.map((r) => r.resource_type))
  ) as ResourceType[];

  // State to track the currently active tab
  const [activeTab, setActiveTab] = useState<ResourceType | null>(
    availableTypes.length > 0 ? availableTypes[0] : null
  );

  if (resources.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center">
        <p className="text-muted-foreground">
          لا توجد موارد متاحة لهذه المادة حالياً 📭
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          سيتم إضافة المحتوى قريباً. تابعونا!
        </p>
      </div>
    );
  }

  // Filter resources for the active tab
  const activeResources = resources.filter(
    (r) => r.resource_type === activeTab
  );

  // Map to get Arabic names for tabs
  const tabNames: Record<ResourceType, string> = {
    summary: "ملخصات",
    quiz: "كويزات",
    past_exam: "أسئلة سنوات",
    guide: "أدلة",
    link: "روابط",
    other: "أخرى",
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {availableTypes.map((type) => (
          <button
            key={type}
            onClick={() => setActiveTab(type)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === type
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {tabNames[type]}
          </button>
        ))}
      </div>

      {/* Active Resource List */}
      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {activeResources.map((resource) => (
          <li key={resource.id}>
            <a
              href={resource.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 transition-colors hover:bg-secondary active:bg-secondary/80 sm:gap-4"
            >
              {/* File icon */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-lg">
                {resource.resource_type === "summary" && "📄"}
                {resource.resource_type === "quiz" && "❓"}
                {resource.resource_type === "past_exam" && "📝"}
                {resource.resource_type === "guide" && "📖"}
                {resource.resource_type === "link" && "🔗"}
                {resource.resource_type === "other" && "📎"}
              </div>

              {/* Resource info */}
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="truncate text-sm font-medium text-card-foreground sm:text-base">
                  {resource.title}
                </span>
                
                {/* Verified Badge / Metadata */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {resource.is_verified && (
                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                      <span>✓</span> موثّق
                    </span>
                  )}
                  {resource.uploaded_by === "admin" && (
                    <span>• الإدارة</span>
                  )}
                </div>
              </div>

              {/* Download Icon */}
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                ⬇
              </div>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
