"use client";

import { useState } from "react";
import Link from "next/link";
import type { Resource, ResourceType } from "@/types/database";
import NativeQuiz from "@/components/features/NativeQuiz";

interface ResourceListProps {
  resources: Resource[];
  courseId?: string;
  courseTitle?: string;
}

/**
 * Renders a list of resources for a specific course.
 * Separates core study materials (summaries, quizzes) into tabs,
 * and external deep-dive resources (links, videos) into a separate section.
 */
export default function ResourceList({
  resources,
  courseId,
  courseTitle,
}: ResourceListProps) {
  const [activeEmbedId, setActiveEmbedId] = useState<string | null>(null);

  // Separate resources into primary study materials vs deep dive external links
  const studyMaterials = resources.filter(
    (r) => r.type !== "link" && r.type !== "other"
  );
  const deepDiveResources = resources.filter(
    (r) => r.type === "link" || r.type === "other"
  );

  const availableStudyTypes = Array.from(
    new Set(studyMaterials.map((r) => r.type))
  ) as ResourceType[];

  const sectionNames: Partial<Record<ResourceType, string>> = {
    summary: "ملخصات",
    quiz: "كويزات",
    past_exam: "أسئلة سنوات",
    guide: "أدلة",
  };

  // Advanced feature: If titles use "Topic | Title", group by Topic instead of Type
  // Example: "لغة عربية | كويز تجريبي" -> Groups under "لغة عربية"
  const parsedStudyMaterials = studyMaterials.map((resource) => {
    const parts = resource.title.split("|");
    if (parts.length > 1) {
      return {
        ...resource,
        topic: parts[0].trim(),
        displayTitle: parts.slice(1).join("|").trim(),
      };
    }
    return { ...resource, topic: "عام", displayTitle: resource.title };
  });

  const hasTopics = parsedStudyMaterials.some((r) => r.topic !== "عام");
  const availableTopics = Array.from(
    new Set(parsedStudyMaterials.map((r) => r.topic))
  );

  if (resources.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/60 p-8 sm:p-12 text-center backdrop-blur-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-2xl mb-4">
          📚
        </div>
        <h3 className="text-lg font-bold text-foreground sm:text-xl">
          لا توجد موارد أو ملخصات لهذه المادة حتى الآن
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground sm:text-base leading-relaxed">
          كن أول من يشارك ملخصاته أو أسئلته السابقة لمساعدة زملائك الطلبة في مادة {courseTitle ? `"${courseTitle}"` : "هذا المساق"}!
        </p>
        <div className="mt-6">
          <Link
            href={`/upload?courseId=${encodeURIComponent(courseId || "")}`}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-95"
          >
            <span>📤</span>
            <span>كن أول من يشارك ملخصاً</span>
          </Link>
        </div>
      </div>
    );
  }

  // Helper to render a resource item
  const renderResource = (resource: Resource, displayTitle?: string) => {
    const isQuiz = resource.type === "quiz";

    const content = (
      <>
        {/* File icon */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-lg">
          {resource.type === "summary" && "📄"}
          {resource.type === "quiz" && "❓"}
          {resource.type === "past_exam" && "📝"}
          {resource.type === "guide" && "📖"}
          {resource.type === "link" && "🔗"}
          {resource.type === "other" && "📎"}
        </div>

        {/* Resource info */}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-sm font-medium text-card-foreground sm:text-base">
            {displayTitle || resource.title}
          </span>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {resource.uploaded_by && <span>• الإدارة</span>}
            {resource.file_size_bytes ? (
              <span>• {(resource.file_size_bytes / 1024 / 1024).toFixed(1)} MB</span>
            ) : null}
          </div>
        </div>

        {/* Download / Link / Expand Icon */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          {isQuiz 
            ? (activeEmbedId === resource.id ? "🔽" : "▶️") 
            : (resource.type === "link" || resource.type === "other" ? "↗" : "⬇")}
        </div>
      </>
    );

    return (
      <li key={resource.id} className="flex flex-col">
        {isQuiz && !resource.quiz_data ? (
          <button
            onClick={() => setActiveEmbedId(activeEmbedId === resource.id ? null : resource.id)}
            className="flex w-full items-center gap-3 p-4 text-start transition-colors hover:bg-secondary active:bg-secondary/80 sm:gap-4"
          >
            {content}
          </button>
        ) : (
          <a
            href={resource.storage_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 transition-colors hover:bg-secondary active:bg-secondary/80 sm:gap-4"
          >
            {content}
          </a>
        )}

        {/* Native Quiz Player (if quiz_data is present) */}
        {resource.quiz_data && (
          <div className="border-t border-border/50 bg-secondary/20 p-3 sm:p-4">
            <NativeQuiz
              quizData={resource.quiz_data}
              sourceTitle={resource.title}
              defaultOpen={isQuiz}
              resourceId={resource.id}
              courseId={resource.course_id}
            />
          </div>
        )}

        {/* Embedded Iframe for legacy URL-based Quizzes (without structured quiz_data) */}
        {isQuiz && !resource.quiz_data && activeEmbedId === resource.id && (
          <div className="border-t border-border bg-muted/30 p-4 sm:p-6">
            <iframe
              src={resource.storage_url}
              className="min-h-150 w-full rounded-lg border border-border bg-background shadow-sm"
              allowFullScreen
            />
          </div>
        )}
      </li>
    );
  };

  return (
    <div className="space-y-10">
      {/* 1. Primary Study Materials */}
      {studyMaterials.length > 0 && (
        <div className="space-y-8">
          {hasTopics
            ? availableTopics.map((topic) => {
                const topicResources = parsedStudyMaterials.filter(
                  (r) => r.topic === topic
                );
                return (
                  <div key={topic} className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground">
                      {topic}
                    </h3>
                    <div className="rounded-xl border border-border bg-card overflow-hidden">
                      <ul className="divide-y divide-border">
                        {topicResources.map((r) =>
                          renderResource(r, r.displayTitle)
                        )}
                      </ul>
                    </div>
                  </div>
                );
              })
            : availableStudyTypes.map((type) => {
                const typeResources = studyMaterials.filter(
                  (r) => r.type === type
                );
                return (
                  <div key={type} className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground">
                      {sectionNames[type]}
                    </h3>
                    <div className="rounded-xl border border-border bg-card overflow-hidden">
                      <ul className="divide-y divide-border">
                        {typeResources.map((r) => renderResource(r))}
                      </ul>
                    </div>
                  </div>
                );
              })}
        </div>
      )}

      {/* 2. Deep Dive / External Resources */}
      {deepDiveResources.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">
            مصادر الشرح والتعمق 📺
          </h3>
          <p className="text-sm text-muted-foreground">
            شروحات يوتيوب، دورات، ومراجع خارجية لفهم المادة بشكل أعمق.
          </p>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <ul className="divide-y divide-border">
              {deepDiveResources.map((r) => renderResource(r))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
