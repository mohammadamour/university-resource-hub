"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { ResourceType, ResourceStatus } from "@/types/database";

export interface AdminResourceCourse {
  id: string;
  title: string;
  slug: string;
  course_code: string | null;
  department?: { name: string } | null;
}

export interface AdminResourceItem {
  id: string;
  title: string;
  course_id: string;
  type: ResourceType;
  storage_url: string;
  file_size_bytes: number | null;
  status?: ResourceStatus;
  created_at: string;
  quiz_data?: {
    questions?: { question: string }[];
  } | null;
  course?: AdminResourceCourse | null;
}

export interface AdminCourseOption {
  id: string;
  title: string;
  course_code: string | null;
  slug: string;
  department?: { name: string } | null;
}

interface AdminResourceManagerProps {
  initialResources: AdminResourceItem[];
  courses: AdminCourseOption[];
  adminSecret: string;
}

const TYPE_LABELS: Record<ResourceType, { label: string; badgeClass: string; emoji: string }> = {
  summary: {
    label: "ملخص",
    badgeClass: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    emoji: "📄",
  },
  past_exam: {
    label: "أسئلة سنوات",
    badgeClass: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    emoji: "📝",
  },
  guide: {
    label: "دليل دراسي",
    badgeClass: "bg-sky-500/10 text-sky-500 border-sky-500/20",
    emoji: "📖",
  },
  quiz: {
    label: "بنك كويز",
    badgeClass: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    emoji: "✨",
  },
  link: {
    label: "رابط خارجي",
    badgeClass: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    emoji: "🔗",
  },
  other: {
    label: "أخرى",
    badgeClass: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    emoji: "📁",
  },
};

const STATUS_LABELS: Record<ResourceStatus, { label: string; badgeClass: string }> = {
  active: {
    label: "نشط ومتاح للطلاب",
    badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  processing: {
    label: "قيد المعالجة السحابية",
    badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  pending: {
    label: "قيد المراجعة والتدقيق",
    badgeClass: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  },
  rejected: {
    label: "مرفوض / مسودة",
    badgeClass: "bg-red-500/10 text-red-400 border-red-500/20",
  },
};

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} كيلوبايت`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} ميغابايت`;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("ar-JO", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function AdminResourceManager({
  initialResources,
  courses,
  adminSecret,
}: AdminResourceManagerProps) {
  const [resources, setResources] = useState<AdminResourceItem[]>(initialResources);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourseFilter, setSelectedCourseFilter] = useState("all");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");

  // Modals state
  const [editingResource, setEditingResource] = useState<AdminResourceItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCourseId, setEditCourseId] = useState("");
  const [editType, setEditType] = useState<ResourceType>("summary");
  const [editStatus, setEditStatus] = useState<ResourceStatus>("active");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deletingResource, setDeletingResource] = useState<AdminResourceItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // On-demand AI Quiz Generation state
  const [generatingQuizId, setGeneratingQuizId] = useState<string | null>(null);
  const [expandingQuizId, setExpandingQuizId] = useState<string | null>(null);

  const handleGenerateQuiz = async (res: AdminResourceItem) => {
    if (generatingQuizId || expandingQuizId) return;
    setGeneratingQuizId(res.id);

    try {
      const response = await fetch(`/api/admin/resources/${res.id}/quiz`, {
        method: "POST",
        headers: { "x-admin-secret": adminSecret },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "فشل توليد بنك الأسئلة.");
      }

      // Update state in-place with the fresh quiz bank
      setResources((prev) =>
        prev.map((r) =>
          r.id === res.id ? { ...r, quiz_data: data.quizData } : r
        )
      );

      showNotification(
        "success",
        `تم توليد بنك الأسئلة بنجاح (${data.count} سؤال) للمورد: "${res.title}"`
      );
    } catch (err) {
      showNotification(
        "error",
        err instanceof Error ? err.message : "حدث خطأ أثناء الاتصال بنموذج الذكاء الاصطناعي."
      );
    } finally {
      setGeneratingQuizId(null);
    }
  };

  const handleExpandQuiz = async (res: AdminResourceItem) => {
    if (expandingQuizId || generatingQuizId) return;
    setExpandingQuizId(res.id);

    try {
      const response = await fetch(`/api/admin/resources/${res.id}/quiz`, {
        method: "POST",
        headers: {
          "x-admin-secret": adminSecret,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "expand" }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "فشل توسيع بنك الأسئلة.");
      }

      // Update state in-place with the expanded quiz bank
      setResources((prev) =>
        prev.map((r) =>
          r.id === res.id ? { ...r, quiz_data: data.quizData } : r
        )
      );

      showNotification(
        "success",
        data.message || `تم توسيع بنك الأسئلة للمورد: "${res.title}"`
      );
    } catch (err) {
      showNotification(
        "error",
        err instanceof Error ? err.message : "حدث خطأ أثناء توسيع بنك الأسئلة."
      );
    } finally {
      setExpandingQuizId(null);
    }
  };

  // Global notification banner
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showNotification = (type: "success" | "error", text: string) => {
    setNotification({ type, text });
    setTimeout(() => {
      setNotification((curr) => (curr?.text === text ? null : curr));
    }, 4500);
  };

  // ─── Metrics Calculation ──────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const totalCount = resources.length;
    const totalBytes = resources.reduce((acc, r) => acc + (r.file_size_bytes || 0), 0);
    const totalQuizQuestions = resources.reduce(
      (acc, r) => acc + (r.quiz_data?.questions?.length || 0),
      0
    );
    const coursesWithContent = new Set(resources.map((r) => r.course_id)).size;

    return {
      totalCount,
      totalBytesFormatted: formatBytes(totalBytes),
      totalQuizQuestions,
      coursesWithContent,
    };
  }, [resources]);

  // ─── Filtered Data ────────────────────────────────────────────────────────
  const filteredResources = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return resources.filter((res) => {
      // Search query filter (title, course name, course code)
      if (q) {
        const titleMatch = res.title.toLowerCase().includes(q);
        const courseTitleMatch = res.course?.title?.toLowerCase().includes(q) || false;
        const codeMatch = res.course?.course_code?.toLowerCase().includes(q) || false;
        if (!titleMatch && !courseTitleMatch && !codeMatch) return false;
      }

      // Course filter
      if (selectedCourseFilter !== "all" && res.course_id !== selectedCourseFilter) {
        return false;
      }

      // Type filter
      if (selectedTypeFilter !== "all" && res.type !== selectedTypeFilter) {
        return false;
      }

      // Status filter
      if (selectedStatusFilter !== "all" && (res.status || "active") !== selectedStatusFilter) {
        return false;
      }

      return true;
    });
  }, [resources, searchQuery, selectedCourseFilter, selectedTypeFilter, selectedStatusFilter]);

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    selectedCourseFilter !== "all" ||
    selectedTypeFilter !== "all" ||
    selectedStatusFilter !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCourseFilter("all");
    setSelectedTypeFilter("all");
    setSelectedStatusFilter("all");
  };

  // ─── Edit Handlers ────────────────────────────────────────────────────────
  const openEditModal = (resource: AdminResourceItem) => {
    setEditingResource(resource);
    setEditTitle(resource.title);
    setEditCourseId(resource.course_id);
    setEditType(resource.type);
    setEditStatus(resource.status || "active");
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    if (!editingResource) return;
    if (!editTitle.trim()) {
      setEditError("يرجى إدخال عنوان صالح للمورد.");
      return;
    }

    setIsSavingEdit(true);
    setEditError(null);

    try {
      const response = await fetch(`/api/admin/resources/${editingResource.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": adminSecret,
        },
        body: JSON.stringify({
          title: editTitle.trim(),
          courseId: editCourseId,
          type: editType,
          status: editStatus,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "فشل تحديث بيانات المورد.");
      }

      // Optimistic state update with server response
      const updatedItem: AdminResourceItem = {
        ...editingResource,
        title: editTitle.trim(),
        course_id: editCourseId,
        type: editType,
        status: editStatus,
        course: courses.find((c) => c.id === editCourseId) || editingResource.course,
      };

      setResources((prev) =>
        prev.map((r) => (r.id === editingResource.id ? updatedItem : r))
      );

      setEditingResource(null);
      showNotification("success", "تم حفظ التعديلات بنجاح.");
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "حدث خطأ غير متوقع.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  // ─── Delete Handlers ──────────────────────────────────────────────────────
  const openDeleteModal = (resource: AdminResourceItem) => {
    setDeletingResource(resource);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingResource) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetch(`/api/admin/resources/${deletingResource.id}`, {
        method: "DELETE",
        headers: {
          "x-admin-secret": adminSecret,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "فشل حذف المورد.");
      }

      // Optimistic removal from table
      setResources((prev) => prev.filter((r) => r.id !== deletingResource.id));
      setDeletingResource(null);
      showNotification("success", "تم حذف المورد وملفه السحابي نهائياً.");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "حدث خطأ أثناء الحذف.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Toast Notification */}
      {notification && (
        <div
          role="status"
          className={`flex items-center justify-between gap-3 rounded-xl border p-4 text-sm font-medium transition-all ${
            notification.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-red-500/30 bg-red-500/10 text-red-400"
          }`}
        >
          <span>{notification.text}</span>
          <button
            onClick={() => setNotification(null)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>
      )}

      {/* ─── 1. Stats Overview Bar ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="text-xs font-medium text-muted-foreground">إجمالي الموارد المرفوعة</div>
          <div className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
            {metrics.totalCount}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">ملف معتمد ونشط</div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="text-xs font-medium text-muted-foreground">حجم التخزين السحابي</div>
          <div className="mt-2 text-2xl font-bold text-primary sm:text-3xl">
            {metrics.totalBytesFormatted}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">مستهلك في Supabase</div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="text-xs font-medium text-muted-foreground">بنك أسئلة الكويز</div>
          <div className="mt-2 text-2xl font-bold text-emerald-400 sm:text-3xl">
            {metrics.totalQuizQuestions}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">سؤال تفاعلي مولد بـ Gemini</div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="text-xs font-medium text-muted-foreground">المواد المغطاة</div>
          <div className="mt-2 text-2xl font-bold text-sky-400 sm:text-3xl" dir="ltr">
            {metrics.coursesWithContent} / {courses.length}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">مادة دراسية تحوي ملفات</div>
        </div>
      </div>

      {/* ─── 2. Search & Filters ─────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 sm:items-center">
          {/* Live Search */}
          <div className="sm:col-span-5">
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-muted-foreground">
                🔍
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث بالاسم، المادة، أو رمز المساق..."
                className="w-full rounded-xl border border-border bg-background ps-10 pe-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          {/* Course Filter Dropdown */}
          <div className="sm:col-span-3">
            <select
              value={selectedCourseFilter}
              onChange={(e) => setSelectedCourseFilter(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="all">جميع المواد الدراسية ({courses.length})</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.course_code ? `${c.course_code} - ` : ""}
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div className="sm:col-span-2">
            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="all">جميع الأنواع</option>
              <option value="summary">📄 ملخصات</option>
              <option value="past_exam">📝 أسئلة سنوات</option>
              <option value="guide">📖 أدلة دراسية</option>
              <option value="quiz">✨ بنك كويز</option>
              <option value="other">📁 أخرى</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-2">
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="all">جميع الحالات</option>
              <option value="active">🟢 نشط</option>
              <option value="pending">🔵 قيد المراجعة</option>
              <option value="processing">🟡 معالجة</option>
              <option value="rejected">🔴 مرفوض</option>
            </select>
          </div>
        </div>

        {/* Filter Summary & Clear */}
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
          <span>
            يتم عرض <strong className="text-foreground">{filteredResources.length}</strong> من أصل{" "}
            <strong>{resources.length}</strong> مورد
          </span>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-accent hover:underline font-medium"
            >
              إلغاء التصفية وإظهار الكل
            </button>
          )}
        </div>
      </div>

      {/* ─── 3. Resources Data Table & Mobile Cards ───────────────────────── */}
      {filteredResources.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <div className="text-4xl mb-3">📭</div>
          <h3 className="text-lg font-bold text-foreground">لا توجد موارد مطابقة</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            لم يتم العثور على أي ملفات تطابق معايير البحث والتصفية المحددة.
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-4 rounded-xl border border-border bg-secondary px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted"
            >
              إعادة ضبط الفلاتر
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground">
                <tr>
                  <th className="px-5 py-3.5 text-start">المورد / العنوان</th>
                  <th className="px-5 py-3.5 text-start">المادة الدراسية</th>
                  <th className="px-4 py-3.5 text-start">النوع</th>
                  <th className="px-4 py-3.5 text-start">الكويز</th>
                  <th className="px-4 py-3.5 text-start">الحالة</th>
                  <th className="px-4 py-3.5 text-start">الحجم / التاريخ</th>
                  <th className="px-5 py-3.5 text-end">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredResources.map((res) => {
                  const typeMeta = TYPE_LABELS[res.type] || TYPE_LABELS.other;
                  const statusMeta = STATUS_LABELS[res.status || "active"] || STATUS_LABELS.active;
                  const questionCount = res.quiz_data?.questions?.length || 0;

                  return (
                    <tr key={res.id} className="transition-colors hover:bg-muted/30">
                      {/* Title & Preview Link */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <Link
                            href={`/r/${res.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-foreground hover:text-accent hover:underline flex items-center gap-1.5"
                            title="فتح ومعاينة ملف الـ PDF عبر الرابط الدائم"
                          >
                            <span>{res.title}</span>
                            <span className="text-xs text-muted-foreground">↗</span>
                          </Link>
                          <span className="font-mono text-[11px] text-muted-foreground mt-0.5">
                            ID: {res.id.slice(0, 8)}...
                          </span>
                        </div>
                      </td>

                      {/* Course */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">
                            {res.course?.title || "—"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {res.course?.course_code || res.course?.department?.name || ""}
                          </span>
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${typeMeta.badgeClass}`}
                        >
                          <span>{typeMeta.emoji}</span>
                          <span>{typeMeta.label}</span>
                        </span>
                      </td>

                      {/* Quiz Badge & On-Demand Generator */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5">
                          {questionCount > 0 ? (
                            <>
                              <Link
                                href={`/courses/${res.course?.slug || ""}?quiz=${res.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-full border border-purple-500/25 bg-purple-500/10 px-2.5 py-1 text-xs font-semibold text-purple-400 transition-colors hover:bg-purple-500/20"
                                title="فتح الكويز في صفحة المادة"
                              >
                                <span>✨</span>
                                <span>{questionCount} سؤال</span>
                                <span className="text-[10px]">↗</span>
                              </Link>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleExpandQuiz(res)}
                                  disabled={expandingQuizId !== null || generatingQuizId !== null}
                                  className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50 transition-colors"
                                  title="توسيع بنك الأسئلة بأسئلة ذكية إضافية غير مكررة"
                                >
                                  {expandingQuizId === res.id ? (
                                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                                  ) : (
                                    <>
                                      <span>➕</span>
                                      <span>توسيع</span>
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() => handleGenerateQuiz(res)}
                                  disabled={generatingQuizId !== null || expandingQuizId !== null}
                                  className="rounded-md border border-purple-500/30 bg-purple-500/10 p-1 text-[11px] text-purple-300 hover:bg-purple-500/20 disabled:opacity-50 transition-colors"
                                  title="إعادة توليد بنك الأسئلة من الصفر"
                                >
                                  {generatingQuizId === res.id ? (
                                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
                                  ) : (
                                    "🔄"
                                  )}
                                </button>
                              </div>
                            </>
                          ) : (
                            <button
                              onClick={() => handleGenerateQuiz(res)}
                              disabled={generatingQuizId !== null}
                              className="inline-flex items-center gap-1 rounded-lg border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 text-xs font-medium text-purple-300 hover:bg-purple-500/20 transition-all disabled:opacity-50"
                              title="توليد كويز تفاعلي لهذا المورد بالذكاء الاصطناعي"
                            >
                              {generatingQuizId === res.id ? (
                                <>
                                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
                                  <span>جارٍ التوليد...</span>
                                </>
                              ) : (
                                <>
                                  <span>⚡</span>
                                  <span>توليد كويز</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusMeta.badgeClass}`}
                        >
                          {statusMeta.label}
                        </span>
                      </td>

                      {/* Size & Date */}
                      <td className="px-4 py-4 text-xs text-muted-foreground">
                        <div>{formatBytes(res.file_size_bytes)}</div>
                        <div className="text-[11px] mt-0.5">{formatDate(res.created_at)}</div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-end">
                        <div className="inline-flex items-center gap-1.5">
                          <Link
                            href={`/r/${res.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg border border-border bg-background p-2 text-xs font-medium text-foreground hover:bg-muted"
                            title="معاينة الملف"
                          >
                            👁️
                          </Link>

                          <button
                            onClick={() => openEditModal(res)}
                            className="rounded-lg border border-border bg-background p-2 text-xs font-medium text-foreground hover:bg-muted"
                            title="تعديل البيانات"
                          >
                            ✏️
                          </button>

                          <button
                            onClick={() => openDeleteModal(res)}
                            className="rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-xs font-medium text-red-400 hover:bg-red-500/20"
                            title="حذف نهائي"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="block divide-y divide-border md:hidden">
            {filteredResources.map((res) => {
              const typeMeta = TYPE_LABELS[res.type] || TYPE_LABELS.other;
              const statusMeta = STATUS_LABELS[res.status || "active"] || STATUS_LABELS.active;
              const questionCount = res.quiz_data?.questions?.length || 0;

              return (
                <div key={res.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
                        href={`/r/${res.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-foreground hover:text-accent flex items-center gap-1"
                      >
                        <span>{res.title}</span>
                        <span className="text-xs">↗</span>
                      </Link>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {res.course?.title} {res.course?.course_code ? `(${res.course.course_code})` : ""}
                      </div>
                    </div>

                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${typeMeta.badgeClass}`}
                    >
                      <span>{typeMeta.emoji}</span>
                      <span>{typeMeta.label}</span>
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusMeta.badgeClass}`}
                    >
                      {statusMeta.label}
                    </span>

                    {questionCount > 0 ? (
                      <Link
                        href={`/courses/${res.course?.slug || ""}?quiz=${res.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-full border border-purple-500/25 bg-purple-500/10 px-2.5 py-0.5 font-semibold text-purple-400"
                      >
                        <span>✨</span>
                        <span>{questionCount} سؤال</span>
                      </Link>
                    ) : null}

                    <span className="text-muted-foreground">{formatBytes(res.file_size_bytes)}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">{formatDate(res.created_at)}</span>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border">
                    {questionCount > 0 && (
                      <button
                        onClick={() => handleExpandQuiz(res)}
                        disabled={expandingQuizId !== null || generatingQuizId !== null}
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
                        title="توسيع بنك الأسئلة بأسئلة ذكية إضافية غير مكررة"
                      >
                        {expandingQuizId === res.id ? (
                          <>
                            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                            <span>جارٍ التوسيع...</span>
                          </>
                        ) : (
                          <>
                            <span>➕</span>
                            <span>توسيع</span>
                          </>
                        )}
                      </button>
                    )}

                    <button
                      onClick={() => handleGenerateQuiz(res)}
                      disabled={generatingQuizId !== null || expandingQuizId !== null}
                      className="inline-flex items-center gap-1 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs font-medium text-purple-300 hover:bg-purple-500/20 disabled:opacity-50"
                      title={questionCount > 0 ? "إعادة توليد الكويز" : "توليد كويز بالذكاء الاصطناعي"}
                    >
                      {generatingQuizId === res.id ? (
                        <>
                          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
                          <span>جارٍ التوليد...</span>
                        </>
                      ) : (
                        <>
                          <span>{questionCount > 0 ? "🔄" : "⚡"}</span>
                          <span>{questionCount > 0 ? "إعادة ضبط" : "توليد كويز"}</span>
                        </>
                      )}
                    </button>

                    <Link
                      href={`/r/${res.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                    >
                      <span>👁️</span>
                      <span>معاينة</span>
                    </Link>

                    <button
                      onClick={() => openEditModal(res)}
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                    >
                      <span>✏️</span>
                      <span>تعديل</span>
                    </button>

                    <button
                      onClick={() => openDeleteModal(res)}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20"
                    >
                      <span>🗑️</span>
                      <span>حذف</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── 4. Edit Resource Modal ───────────────────────────────────────── */}
      {editingResource && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl sm:p-7">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">تعديل بيانات المورد</h3>
                <p className="text-xs text-muted-foreground">
                  المعرف: {editingResource.id}
                </p>
              </div>
              <button
                onClick={() => setEditingResource(null)}
                disabled={isSavingEdit}
                className="text-muted-foreground hover:text-foreground text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            {editError && (
              <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-medium text-red-400">
                {editError}
              </div>
            )}

            <div className="mt-5 space-y-4">
              {/* Title Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  عنوان المورد <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  placeholder="مثال: شابتر 1 | تفاضل وتكامل"
                />
                <p className="text-[11px] text-muted-foreground">
                  يظهر هذا العنوان للطلاب في قائمة محتويات المادة وبطاقات التحميل.
                </p>
              </div>

              {/* Course Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  المادة الدراسية التابعة لها
                </label>
                <select
                  value={editCourseId}
                  onChange={(e) => setEditCourseId(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.course_code ? `${c.course_code} - ` : ""}
                      {c.title}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  يمكنك إعادة تعيين المورد لمساق دراسي آخر في حال تم اختياره بالخطأ أثناء الرفع.
                </p>
              </div>

              {/* Resource Type & Status Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">نوع المورد</label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as ResourceType)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="summary">📄 ملخص</option>
                    <option value="past_exam">📝 أسئلة سنوات</option>
                    <option value="guide">📖 دليل دراسي</option>
                    <option value="quiz">✨ بنك كويز</option>
                    <option value="link">🔗 رابط خارجي</option>
                    <option value="other">📁 أخرى</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">حالة النشر</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as ResourceStatus)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="active">🟢 نشط (معروض)</option>
                    <option value="pending">🔵 قيد المراجعة</option>
                    <option value="processing">🟡 معالجة</option>
                    <option value="rejected">🔴 مسودة / مخفي</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex items-center justify-end gap-3 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setEditingResource(null)}
                disabled={isSavingEdit}
                className="rounded-xl border border-border bg-secondary px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50"
              >
                {isSavingEdit ? (
                  <>
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    <span>جارٍ الحفظ...</span>
                  </>
                ) : (
                  <span>حفظ التعديلات</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 5. Delete Confirmation Modal ─────────────────────────────────── */}
      {deletingResource && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-card p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400 mb-3">
              <span className="text-2xl">⚠️</span>
              <h3 className="text-lg font-bold text-foreground">تأكيد حذف المورد نهائياً</h3>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              هل أنت متأكد من رغبتك في حذف:
            </p>

            <div className="my-3 rounded-xl border border-border bg-muted/40 p-3 text-xs">
              <div className="font-bold text-foreground">{deletingResource.title}</div>
              <div className="text-muted-foreground mt-1">
                المادة: {deletingResource.course?.title || "غير محددة"} · {formatBytes(deletingResource.file_size_bytes)}
              </div>
            </div>

            <p className="text-xs text-red-400/90 leading-relaxed">
              ⚠️ سيتم مسح ملف الـ PDF نهائياً من التخزين السحابي (Supabase Storage)، وحذف سجل قاعدة البيانات وكافة محاولات الكويز المرتبطة به. هذا الإجراء لا يمكن التراجع عنه.
            </p>

            {deleteError && (
              <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-400">
                {deleteError}
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setDeletingResource(null)}
                disabled={isDeleting}
                className="rounded-xl border border-border bg-secondary px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted"
              >
                تراجع
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 rounded-xl bg-destructive px-5 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>جارٍ الحذف الذري...</span>
                  </>
                ) : (
                  <span>تأكيد الحذف نهائياً</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
