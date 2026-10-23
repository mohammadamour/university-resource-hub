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

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getPlatformMeta(res: Resource) {
  const url = (res.storage_url || "").toLowerCase();
  if (url.includes("youtube.com") || url.includes("youtu.be") || res.external_platform === "youtube") {
    return { name: "يوتيوب", badgeClass: "bg-red-500/10 text-red-400 border-red-500/20", icon: "▶️" };
  }
  if (url.includes("github.com") || res.external_platform === "github") {
    return { name: "GitHub", badgeClass: "bg-slate-500/10 text-slate-300 border-slate-500/20", icon: "💻" };
  }
  if (url.includes("drive.google.com") || res.external_platform === "drive") {
    return { name: "Google Drive", badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: "📁" };
  }
  return { name: "رابط خارجي", badgeClass: "bg-sky-500/10 text-sky-400 border-sky-500/20", icon: "🔗" };
}

/**
 * Renders course resources across a 3-tier architecture:
 * 1. Tier 1: 🌟 Core Verified Shelf (Prominent cards, embedded quizzes, high-yield summaries)
 * 2. Tier 2: 📁 Extended Community Archive (Collapsible drawer for student uploads & alternative notes)
 * 3. Tier 3: 🛠️ Deep-Dive External Toolkit (Curated external links, videos, and toolcards)
 */
export default function ResourceList({
  resources,
  courseId,
  courseTitle,
}: ResourceListProps) {
  const [activeEmbedId, setActiveEmbedId] = useState<string | null>(null);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);

  // Filter active resources only
  const activeResources = resources.filter((r) => (r.status || "active") === "active");

  // Tier 1: Core Curated Shelf (is_featured !== false, not external links)
  const coreFeaturedResources = activeResources.filter(
    (r) => r.is_featured !== false && r.type !== "link" && r.type !== "other"
  );

  // Tier 2: Extended Community Archive (is_featured === false, not external links)
  const communityArchiveResources = activeResources.filter(
    (r) => r.is_featured === false && r.type !== "link" && r.type !== "other"
  );

  // Tier 3: Curated Deep-Dive External Toolkit
  const externalToolkitResources = activeResources.filter(
    (r) => r.type === "link" || r.type === "other"
  );

  const availableStudyTypes = Array.from(
    new Set(coreFeaturedResources.map((r) => r.type))
  ) as ResourceType[];

  const sectionNames: Partial<Record<ResourceType, string>> = {
    summary: "ملخصات معتمدة",
    quiz: "كويزات وبنوك أسئلة",
    past_exam: "أسئلة سنوات سابقة",
    guide: "أدلة دراسية ومقررات",
  };

  // If titles use "Topic | Title", group by Topic
  const parsedCoreMaterials = coreFeaturedResources.map((resource) => {
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

  const hasTopics = parsedCoreMaterials.some((r) => r.topic !== "عام");
  const availableTopics = Array.from(
    new Set(parsedCoreMaterials.map((r) => r.topic))
  );

  // Empty Course State
  if (activeResources.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/60 p-8 sm:p-12 text-center backdrop-blur-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-2xl mb-4">
          📚
        </div>
        <h3 className="text-lg font-bold text-foreground sm:text-xl">
          لا توجد موارد أو ملخصات معتمدة لهذه المادة حتى الآن
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground sm:text-base leading-relaxed">
          كن أول من يشارك ملخصاته أو أسئلته السابقة لمساعدة زملائك الطلبة في مساق {courseTitle ? `"${courseTitle}"` : "هذه المادة"}!
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={`/upload?courseId=${courseId || ""}&title=${encodeURIComponent(`ملخص شامل | ${courseTitle || ""}`)}`}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 hover:opacity-90 active:scale-95"
          >
            <span>📤</span>
            <span>كن أول من يشارك ملخصاً</span>
          </Link>
        </div>
      </div>
    );
  }

  // Helper to render a single Tier 1 resource item
  const renderCoreResource = (resource: Resource, displayTitle?: string) => {
    const isQuiz = resource.type === "quiz";
    const examScopeLabel =
      resource.target_exam === "midterm"
        ? "مادة الميد"
        : resource.target_exam === "final"
        ? "مادة الفاينل"
        : null;

    const content = (
      <>
        {/* File icon */}
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-xl">
          {resource.type === "summary" && "📄"}
          {resource.type === "quiz" && "✨"}
          {resource.type === "past_exam" && "📝"}
          {resource.type === "guide" && "📖"}
          {resource.type === "link" && "🔗"}
          {resource.type === "other" && "📎"}
        </div>

        {/* Resource info */}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-semibold text-card-foreground sm:text-base">
              {displayTitle || resource.title}
            </span>
            {examScopeLabel && (
              <span className="rounded-full bg-accent/10 border border-accent/20 px-2 py-0.5 text-[11px] font-semibold text-accent">
                {examScopeLabel}
              </span>
            )}
            {resource.is_admin_uploaded ? (
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                ✦ المعتمد
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {resource.author_name ? (
              <span>👤 {resource.author_name}</span>
            ) : resource.is_admin_uploaded ? (
              <span>✦ إدارة المنصة</span>
            ) : null}

            {resource.professor_name ? (
              <span>• 👨‍🏫 د. {resource.professor_name}</span>
            ) : null}

            {resource.page_count ? (
              <span className="font-mono">• 📄 {resource.page_count} صفحة</span>
            ) : null}

            {resource.file_size_bytes ? (
              <span dir="ltr">• {formatBytes(resource.file_size_bytes)}</span>
            ) : null}

            {resource.academic_year ? (
              <span>• {resource.academic_year}</span>
            ) : null}
          </div>

          {resource.description && (
            <p className="text-xs text-muted-foreground/90 line-clamp-2 mt-0.5">
              {resource.description}
            </p>
          )}
        </div>

        {/* Action Trigger Icon */}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-105">
          {isQuiz 
            ? (activeEmbedId === resource.id ? "🔽" : "▶️") 
            : (resource.type === "link" || resource.type === "other" ? "↗" : "⬇")}
        </div>
      </>
    );

    return (
      <li key={resource.id} className="flex flex-col group">
        {isQuiz && !resource.quiz_data ? (
          <button
            onClick={() => setActiveEmbedId(activeEmbedId === resource.id ? null : resource.id)}
            className="flex w-full items-center gap-3 p-4 text-start transition-colors hover:bg-secondary active:bg-secondary/80 sm:gap-4 sm:p-5"
          >
            {content}
          </button>
        ) : (
          <a
            href={resource.storage_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 transition-colors hover:bg-secondary active:bg-secondary/80 sm:gap-4 sm:p-5"
          >
            {content}
          </a>
        )}

        {/* Native Quiz Player */}
        {resource.quiz_data && (
          <div className="border-t border-border/50 bg-secondary/20 p-3 sm:p-5">
            <NativeQuiz
              quizData={resource.quiz_data}
              sourceTitle={resource.title}
              defaultOpen={isQuiz}
              resourceId={resource.id}
              courseId={resource.course_id}
            />
          </div>
        )}

        {/* Embedded Iframe for legacy URL quizzes */}
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
    <div className="space-y-10" dir="rtl">
      {/* ─── 1. Tier 1: Core Curated Shelf ───────────────────────────────── */}
      {coreFeaturedResources.length > 0 && (
        <div className="space-y-8">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl flex items-center gap-2">
                <span>🌟</span>
                <span>المحتوى المعتمد والرئيسي</span>
              </h2>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                المذكرات والملخصات الأعلى تقييماً مع كويزات تفاعلية ذكية للتحضير السريع.
              </p>
            </div>
          </div>

          {hasTopics
            ? availableTopics.map((topic) => {
                const topicResources = parsedCoreMaterials.filter((r) => r.topic === topic);
                return (
                  <div key={topic} className="space-y-4">
                    <h3 className="text-base font-bold text-foreground sm:text-lg flex items-center gap-2">
                      <span className="text-primary">✦</span>
                      <span>{topic}</span>
                    </h3>
                    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                      <ul className="divide-y divide-border">
                        {topicResources.map((r) => renderCoreResource(r, r.displayTitle))}
                      </ul>
                    </div>
                  </div>
                );
              })
            : availableStudyTypes.map((type) => {
                const typeResources = coreFeaturedResources.filter((r) => r.type === type);
                return (
                  <div key={type} className="space-y-4">
                    <h3 className="text-base font-bold text-foreground sm:text-lg flex items-center gap-2">
                      <span className="text-primary">✦</span>
                      <span>{sectionNames[type] || "موارد دراسية"}</span>
                    </h3>
                    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                      <ul className="divide-y divide-border">
                        {typeResources.map((r) => renderCoreResource(r))}
                      </ul>
                    </div>
                  </div>
                );
              })}
        </div>
      )}

      {/* ─── 2. Tier 2: Extended Community Archive Drawer ────────────────── */}
      {communityArchiveResources.length > 0 && (
        <div className="rounded-2xl border border-border bg-card/70 overflow-hidden shadow-sm">
          <button
            onClick={() => setIsArchiveOpen(!isArchiveOpen)}
            className="flex w-full items-center justify-between p-4 sm:p-5 text-start hover:bg-secondary/40 transition-colors"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-bold text-foreground text-base sm:text-lg">
                <span>📁</span>
                <span>أرشيف مساهمات الدفعة والملخصات الإضافية</span>
                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-muted-foreground" dir="ltr">
                  {communityArchiveResources.length}
                </span>
              </div>
              <p className="text-xs text-muted-foreground sm:text-sm">
                ملفات إضافية، سلايدات، وتلخيصات ساهم بها زملاؤك لدعم دراستك وتغطية الشباتر المنفردة.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-accent hidden sm:inline">
                {isArchiveOpen ? "طي الأرشيف" : "عرض الملفات"}
              </span>
              <span className="rounded-lg bg-secondary p-2 text-xs font-bold text-muted-foreground transition-transform duration-200">
                {isArchiveOpen ? "▲" : "▼"}
              </span>
            </div>
          </button>

          {isArchiveOpen && (
            <div className="border-t border-border bg-background/50 divide-y divide-border">
              {communityArchiveResources.map((res) => {
                const examScopeLabel =
                  res.target_exam === "midterm"
                    ? "مادة الميد"
                    : res.target_exam === "final"
                    ? "مادة الفاينل"
                    : null;

                return (
                  <div
                    key={res.id}
                    className="flex items-center justify-between gap-3 p-3.5 sm:p-4 hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xl shrink-0">📄</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-foreground truncate">
                            {res.title}
                          </span>
                          {examScopeLabel && (
                            <span className="rounded bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                              {examScopeLabel}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          {res.author_name ? (
                            <span>مساهمة: {res.author_name}</span>
                          ) : (
                            <span>مساهمة طالب</span>
                          )}
                          {res.page_count && <span>• 📄 {res.page_count} صفحة</span>}
                          {res.file_size_bytes && <span dir="ltr">• {formatBytes(res.file_size_bytes)}</span>}
                        </div>
                      </div>
                    </div>

                    <a
                      href={res.storage_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all shrink-0"
                    >
                      <span>تحميل</span>
                      <span>⬇</span>
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── 3. Tier 3: Curated Deep-Dive External Toolkit ────────────────── */}
      {externalToolkitResources.length > 0 && (
        <div className="space-y-4">
          <div className="border-b border-border pb-3">
            <h3 className="text-lg font-bold text-foreground sm:text-xl flex items-center gap-2">
              <span>🛠️</span>
              <span>أدوات ومصادر للتعمق والإبحار بالمادة</span>
            </h3>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              شروحات يوتيوب، مستودعات برمجية، وتوثيقات رسمية لفهم المادة وتطبيقها عملياً.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {externalToolkitResources.map((res) => {
              const meta = getPlatformMeta(res);
              return (
                <a
                  key={res.id}
                  href={res.storage_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-4 transition-all duration-200 hover:border-accent hover:shadow-md active:scale-[0.99]"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.badgeClass}`}
                      >
                        <span>{meta.icon}</span>
                        <span>{meta.name}</span>
                      </span>
                      <span className="text-xs text-muted-foreground group-hover:text-accent transition-colors">
                        ↗
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-foreground group-hover:text-accent transition-colors line-clamp-2">
                      {res.title}
                    </h4>

                    {res.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {res.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                    <span>فتح المورد الخارجي</span>
                    <span className="font-semibold text-accent">زيارة الموقع ←</span>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Persistent Bottom Crowdsourcing Banner ─────────────────────── */}
      <div className="rounded-2xl border border-dashed border-border bg-card/40 p-6 text-center sm:p-8 backdrop-blur-sm">
        <h4 className="text-base font-bold text-foreground sm:text-lg">
          💡 هل لديك تلخيص أفضل أو أسئلة إضافية؟
        </h4>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm max-w-lg mx-auto leading-relaxed">
          ساهم في إثراء أرشيف المادة وساعد زملاءك في الدفعة على التفوق! يتم مراجعة الملف من قبل فريق المنصة قبل نشره.
        </p>
        <div className="mt-4">
          <Link
            href={`/upload?courseId=${courseId || ""}&title=${encodeURIComponent(`ملخص | ${courseTitle || ""}`)}`}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-sm transition-all duration-200 hover:opacity-90 active:scale-95"
          >
            <span>📤</span>
            <span>شارك ملخصك مع زملائك</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
