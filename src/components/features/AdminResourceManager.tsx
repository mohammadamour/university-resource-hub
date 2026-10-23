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
  is_featured?: boolean;
  is_admin_uploaded?: boolean;
  page_count?: number | null;
  target_exam?: string | null;
  academic_year?: string | null;
  professor_name?: string | null;
  author_name?: string | null;
  description?: string | null;
  external_platform?: string | null;
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
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const month = d.toLocaleString("en-US", { month: "short" });
    const day = d.getDate();
    const time = d.toLocaleString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return `${month} ${day}, ${time}`;
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
  const [viewTab, setViewTab] = useState<"active" | "pending" | "all">("active");
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
  const [editIsFeatured, setEditIsFeatured] = useState<boolean>(true);
  const [editTargetExam, setEditTargetExam] = useState<string>("other");
  const [editAcademicYear, setEditAcademicYear] = useState<string>("2025/2026");
  const [editProfessorName, setEditProfessorName] = useState<string>("");
  const [editAuthorName, setEditAuthorName] = useState<string>("");
  const [editDescription, setEditDescription] = useState<string>("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deletingResource, setDeletingResource] = useState<AdminResourceItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // 1-Click Tier Toggle (Featured vs Archive)
  const handleToggleFeatured = async (res: AdminResourceItem) => {
    const newFeatured = !Boolean(res.is_featured);
    // Optimistic update
    setResources((prev) =>
      prev.map((r) => (r.id === res.id ? { ...r, is_featured: newFeatured } : r))
    );

    try {
      const response = await fetch(`/api/admin/resources/${res.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": adminSecret,
        },
        body: JSON.stringify({ isFeatured: newFeatured }),
      });

      if (!response.ok) throw new Error("فشل تحديث مستوى المورد.");

      showNotification(
        "success",
        newFeatured
          ? `تمت ترقية "${res.title}" إلى الرف الرئيسي المميز ⭐`
          : `تم نقل "${res.title}" إلى الأرشيف الإضافي 📁`
      );
    } catch {
      // Revert optimistic update
      setResources((prev) =>
        prev.map((r) => (r.id === res.id ? { ...r, is_featured: !newFeatured } : r))
      );
      showNotification("error", "حدث خطأ أثناء تعديل تصنيف الرف.");
    }
  };

  // 1-Click Quick Moderation Approval (Approve as Core vs Approve as Archive)
  const handleQuickApprove = async (res: AdminResourceItem, isFeatured: boolean) => {
    // Optimistic update
    setResources((prev) =>
      prev.map((r) =>
        r.id === res.id ? { ...r, status: "active", is_featured: isFeatured } : r
      )
    );

    try {
      const response = await fetch(`/api/admin/resources/${res.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": adminSecret,
        },
        body: JSON.stringify({ status: "active", isFeatured }),
      });

      if (!response.ok) throw new Error("فشل اعتماد المورد.");

      showNotification(
        "success",
        isFeatured
          ? `تم اعتماد "${res.title}" ونشره فوراً في الرف الرئيسي ⭐`
          : `تم اعتماد "${res.title}" ونشره في الأرشيف الإضافي 📁`
      );
    } catch {
      // Revert optimistic update
      setResources((prev) =>
        prev.map((r) => (r.id === res.id ? { ...r, status: "pending" } : r))
      );
      showNotification("error", "حدث خطأ أثناء اعتماد ونشر المورد.");
    }
  };

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

      if (!response.ok) {
        let errorMsg = "فشل توليد بنك الأسئلة.";
        try {
          const errData = await response.json();
          errorMsg = errData.error || errorMsg;
        } catch {
          if (response.status === 504) {
            errorMsg = "انتهت مهلة استجابة الخادم (15s Timeout). يرجى المحاولة مرة أخرى.";
          } else {
            errorMsg = `خطأ من الخادم (رمز ${response.status}).`;
          }
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();

      // Update state in-place with the fresh quiz bank
      setResources((prev) =>
        prev.map((r) =>
          r.id === res.id ? { ...r, quiz_data: data.quizData } : r
        )
      );

      showNotification(
        "success",
        `تم توليد بنك الأسئلة بنجاح (${data.count} أسئلة) للمورد: "${res.title}"`
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

      if (!response.ok) {
        let errorMsg = "فشل توسيع بنك الأسئلة.";
        try {
          const errData = await response.json();
          errorMsg = errData.error || errorMsg;
        } catch {
          if (response.status === 504) {
            errorMsg = "انتهت مهلة استجابة الخادم أثناء التوسيع (15s Timeout).";
          } else {
            errorMsg = `خطأ من الخادم (رمز ${response.status}).`;
          }
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();

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

  // Global floating toast notification
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showNotification = (type: "success" | "error", text: string) => {
    setNotification({ type, text });
    setTimeout(() => {
      setNotification((curr) => (curr?.text === text ? null : curr));
    }, 5500);
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
    const activeCount = resources.filter((r) => (r.status || "active") === "active").length;
    const pendingCount = resources.filter((r) => r.status === "pending").length;

    return {
      totalCount,
      totalBytesFormatted: formatBytes(totalBytes),
      totalQuizQuestions,
      coursesWithContent,
      activeCount,
      pendingCount,
    };
  }, [resources]);

  // ─── Filtered Data ────────────────────────────────────────────────────────
  const filteredResources = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return resources.filter((res) => {
      // View Tab filter (Active vs Pending vs All)
      if (viewTab === "active" && (res.status || "active") !== "active") {
        return false;
      }
      if (viewTab === "pending" && res.status !== "pending") {
        return false;
      }

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
  }, [resources, viewTab, searchQuery, selectedCourseFilter, selectedTypeFilter, selectedStatusFilter]);

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
    setEditIsFeatured(resource.is_featured !== undefined ? Boolean(resource.is_featured) : true);
    setEditTargetExam(resource.target_exam || "other");
    setEditAcademicYear(resource.academic_year || "2025/2026");
    setEditProfessorName(resource.professor_name || "");
    setEditAuthorName(resource.author_name || "");
    setEditDescription(resource.description || "");
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
          isFeatured: editIsFeatured,
          targetExam: editTargetExam,
          academicYear: editAcademicYear,
          professorName: editProfessorName,
          authorName: editAuthorName,
          description: editDescription,
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
        is_featured: editIsFeatured,
        target_exam: editTargetExam,
        academic_year: editAcademicYear,
        professor_name: editProfessorName.trim() || null,
        author_name: editAuthorName.trim() || null,
        description: editDescription.trim() || null,
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
      {/* Floating Sticky Toast Notification (Always visible in viewport regardless of scroll position) */}
      {notification && (
        <div
          role="status"
          className={`fixed bottom-6 left-6 z-50 flex items-center justify-between gap-3 rounded-2xl border p-4 text-sm font-medium shadow-2xl backdrop-blur-md transition-all duration-300 max-w-md ${
            notification.type === "success"
              ? "border-emerald-500/40 bg-card/95 text-emerald-400"
              : "border-red-500/40 bg-card/95 text-red-400"
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

      {/* ─── Moderation Queue Tabs ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-4">
        <button
          onClick={() => {
            setViewTab("active");
            setSelectedStatusFilter("all");
          }}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
            viewTab === "active"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "border border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
          }`}
        >
          <span>📁 المعتمدة والنشطة</span>
          <span className="rounded-full bg-background/25 px-2 py-0.5 text-xs font-semibold" dir="ltr">
            {metrics.activeCount}
          </span>
        </button>

        <button
          onClick={() => {
            setViewTab("pending");
            setSelectedStatusFilter("all");
          }}
          className={`relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
            viewTab === "pending"
              ? "bg-amber-500 text-white shadow-sm"
              : "border border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
          }`}
        >
          <span>⏳ بانتظار المراجعة والاعتماد</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-bold ${
              metrics.pendingCount > 0
                ? "bg-amber-400 text-amber-950 animate-pulse"
                : "bg-background/25"
            }`}
            dir="ltr"
          >
            {metrics.pendingCount}
          </span>
        </button>

        <button
          onClick={() => {
            setViewTab("all");
            setSelectedStatusFilter("all");
          }}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
            viewTab === "all"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "border border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
          }`}
        >
          <span>🗄️ جميع الموارد</span>
          <span className="rounded-full bg-background/25 px-2 py-0.5 text-xs font-semibold" dir="ltr">
            {metrics.totalCount}
          </span>
        </button>
      </div>

      {/* Pending Moderation Queue Alert Banner */}
      {viewTab === "pending" && (
        <div className="flex items-center justify-between rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚠️</span>
            <span>
              <strong>طابور مراجعة مساهمات الطلاب:</strong> لديك {metrics.pendingCount} ملف بانتظار التدقيق. يمكنك فحص الملف واعتماده كملخص رئيسي أو في الأرشيف الإضافي بنقرة واحدة.
            </span>
          </div>
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
                  <th className="px-4 py-3.5 text-start">النوع / الرف</th>
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
                          {res.storage_url && res.storage_url !== "__processing__" ? (
                            <a
                              href={res.storage_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold text-foreground hover:text-accent hover:underline flex items-center gap-1.5"
                              title="فتح ومعاينة ملف الـ PDF الأصلي في نافذة جديدة"
                            >
                              <span>{res.title}</span>
                              <span className="text-xs text-muted-foreground">↗</span>
                            </a>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-muted-foreground">{res.title}</span>
                              {res.storage_url === "__processing__" && (
                                <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded px-1.5 py-0.5">
                                  جارٍ المعالجة...
                                </span>
                              )}
                            </div>
                          )}
                          <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-muted-foreground">
                            {res.target_exam && (
                              <span className="rounded bg-secondary px-1.5 py-0.5 text-foreground font-medium">
                                {res.target_exam === "midterm" ? "مادة الميد" : res.target_exam === "final" ? "مادة الفاينل" : "شامل"}
                              </span>
                            )}
                            {res.page_count ? (
                              <span className="rounded bg-secondary/60 px-1.5 py-0.5 font-mono">
                                📄 {res.page_count} ص
                              </span>
                            ) : null}
                            {res.author_name ? (
                              <span className="text-foreground font-medium">👤 {res.author_name}</span>
                            ) : res.is_admin_uploaded ? (
                              <span className="text-emerald-400 font-semibold">✦ إدارة المنصة</span>
                            ) : null}
                            {res.description && (
                              <span className="truncate max-w-[180px] text-muted-foreground italic" title={res.description}>
                                💬 {res.description}
                              </span>
                            )}
                          </div>
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

                      {/* Type Badge & Tier Toggle */}
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1.5 items-start">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${typeMeta.badgeClass}`}
                          >
                            <span>{typeMeta.emoji}</span>
                            <span>{typeMeta.label}</span>
                          </span>

                          <button
                            type="button"
                            onClick={() => handleToggleFeatured(res)}
                            className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold transition-all ${
                              res.is_featured
                                ? "border-amber-500/35 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                                : "border-slate-500/35 bg-slate-500/10 text-slate-400 hover:bg-slate-500/20"
                            }`}
                            title={
                              res.is_featured
                                ? "مادة مميزة بالرف الرئيسي (انقر للنقل إلى الأرشيف الإضافي)"
                                : "مادة بالأرشيف الإضافي (انقر للترقية إلى الرئيسي)"
                            }
                          >
                            <span>{res.is_featured ? "⭐ رئيسي" : "📁 أرشيف"}</span>
                          </button>
                        </div>
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
                              disabled={
                                generatingQuizId !== null ||
                                res.status === "processing" ||
                                res.storage_url === "__processing__"
                              }
                              className="inline-flex items-center gap-1 rounded-lg border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 text-xs font-medium text-purple-300 hover:bg-purple-500/20 transition-all disabled:opacity-50"
                              title={
                                res.status === "processing" || res.storage_url === "__processing__"
                                  ? "الملف قيد المعالجة والرفع السحابي حالياً"
                                  : "توليد كويز تفاعلي لهذا المورد بالذكاء الاصطناعي"
                              }
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
                      <td className="px-4 py-4 text-xs whitespace-nowrap">
                        <div className="font-semibold text-foreground" dir="ltr">
                          {formatBytes(res.file_size_bytes)}
                        </div>
                        <div className="text-[11px] mt-0.5 text-muted-foreground font-medium" dir="ltr">
                          {formatDate(res.created_at)}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-end">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Quick Moderation Approvals for Pending Items */}
                          {res.status === "pending" && (
                            <div className="inline-flex items-center gap-1 me-1">
                              <button
                                onClick={() => handleQuickApprove(res, true)}
                                className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/15 px-2.5 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/25 transition-all shadow-sm"
                                title="اعتماد كملخص رئيسي في الرف الأول"
                              >
                                <span>⭐</span>
                                <span>نشر كرئيسي</span>
                              </button>
                              <button
                                onClick={() => handleQuickApprove(res, false)}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-500/30 bg-slate-500/15 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-500/25 transition-all"
                                title="اعتماد في الأرشيف الإضافي"
                              >
                                <span>📁</span>
                                <span>نشر كأرشيف</span>
                              </button>
                            </div>
                          )}

                          {res.storage_url && res.storage_url !== "__processing__" ? (
                            <a
                              href={res.storage_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-lg border border-border bg-background p-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                              title="معاينة وتدقيق الملف الأصلي"
                            >
                              👁️
                            </a>
                          ) : (
                            <button
                              disabled
                              className="rounded-lg border border-border bg-background p-2 text-xs font-medium text-muted-foreground opacity-50 cursor-not-allowed"
                              title="الملف غير متاح للمعاينة حالياً (قيد المعالجة السحابية)"
                            >
                              👁️
                            </button>
                          )}

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
                      {res.storage_url && res.storage_url !== "__processing__" ? (
                        <a
                          href={res.storage_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-foreground hover:text-accent flex items-center gap-1"
                          title="فتح ومعاينة ملف الـ PDF الأصلي"
                        >
                          <span>{res.title}</span>
                          <span className="text-xs">↗</span>
                        </a>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-muted-foreground">{res.title}</span>
                          {res.storage_url === "__processing__" && (
                            <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded px-1.5 py-0.5">
                              جارٍ المعالجة...
                            </span>
                          )}
                        </div>
                      )}
                      <div className="mt-1 text-xs text-muted-foreground">
                        {res.course?.title} {res.course?.course_code ? `(${res.course.course_code})` : ""}
                      </div>

                      {/* Mobile Metadata Chips */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[11px] text-muted-foreground">
                        {res.target_exam && (
                          <span className="rounded bg-secondary px-1.5 py-0.5 text-foreground font-medium">
                            {res.target_exam === "midterm" ? "مادة الميد" : res.target_exam === "final" ? "مادة الفاينل" : "شامل"}
                          </span>
                        )}
                        {res.page_count ? (
                          <span className="rounded bg-secondary/60 px-1.5 py-0.5 font-mono">
                            📄 {res.page_count} ص
                          </span>
                        ) : null}
                        {res.author_name ? (
                          <span className="text-foreground font-medium">👤 {res.author_name}</span>
                        ) : res.is_admin_uploaded ? (
                          <span className="text-emerald-400 font-semibold">✦ إدارة المنصة</span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${typeMeta.badgeClass}`}
                      >
                        <span>{typeMeta.emoji}</span>
                        <span>{typeMeta.label}</span>
                      </span>

                      {/* Mobile Tier Toggle */}
                      <button
                        type="button"
                        onClick={() => handleToggleFeatured(res)}
                        className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold transition-all ${
                          res.is_featured
                            ? "border-amber-500/35 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                            : "border-slate-500/35 bg-slate-500/10 text-slate-400 hover:bg-slate-500/20"
                        }`}
                        title={res.is_featured ? "مادة بالرف الرئيسي" : "مادة بالأرشيف الإضافي"}
                      >
                        <span>{res.is_featured ? "⭐ رئيسي" : "📁 أرشيف"}</span>
                      </button>
                    </div>
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

                    <span className="font-semibold text-foreground" dir="ltr">{formatBytes(res.file_size_bytes)}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground" dir="ltr">{formatDate(res.created_at)}</span>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border">
                    {/* Quick Moderation Approvals for Pending Items */}
                    {res.status === "pending" && (
                      <div className="flex items-center gap-1 w-full sm:w-auto justify-end pb-1 border-b sm:border-b-0 border-border/50">
                        <button
                          onClick={() => handleQuickApprove(res, true)}
                          className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/15 px-2.5 py-1 text-xs font-bold text-amber-300 hover:bg-amber-500/25"
                        >
                          <span>⭐</span>
                          <span>نشر كرئيسي</span>
                        </button>
                        <button
                          onClick={() => handleQuickApprove(res, false)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-500/30 bg-slate-500/15 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-500/25"
                        >
                          <span>📁</span>
                          <span>نشر كأرشيف</span>
                        </button>
                      </div>
                    )}
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
                      disabled={
                        generatingQuizId !== null ||
                        expandingQuizId !== null ||
                        res.status === "processing" ||
                        res.storage_url === "__processing__"
                      }
                      className="inline-flex items-center gap-1 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs font-medium text-purple-300 hover:bg-purple-500/20 disabled:opacity-50"
                      title={
                        res.status === "processing" || res.storage_url === "__processing__"
                          ? "الملف قيد المعالجة والرفع السحابي حالياً"
                          : questionCount > 0
                          ? "إعادة توليد الكويز"
                          : "توليد كويز بالذكاء الاصطناعي"
                      }
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

                    {res.storage_url && res.storage_url !== "__processing__" ? (
                      <a
                        href={res.storage_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                        title="معاينة الملف الأصلي"
                      >
                        <span>👁️</span>
                        <span>معاينة</span>
                      </a>
                    ) : (
                      <button
                        disabled
                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground opacity-50 cursor-not-allowed"
                        title="الملف غير متاح للمعاينة حالياً"
                      >
                        <span>👁️</span>
                        <span>معاينة</span>
                      </button>
                    )}

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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto"
        >
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-border p-5 sm:p-6 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-foreground">تعديل بيانات المورد</h3>
                <p className="text-xs text-muted-foreground">
                  المعرف: {editingResource.id}
                </p>
              </div>
              <button
                onClick={() => setEditingResource(null)}
                disabled={isSavingEdit}
                className="text-muted-foreground hover:text-foreground text-sm font-semibold p-1.5 rounded-lg hover:bg-muted transition-colors"
                title="إغلاق"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="overflow-y-auto p-5 sm:p-6 space-y-4">
              {editError && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-medium text-red-400">
                  {editError}
                </div>
              )}

              {/* Direct PDF Preview & Inspection */}
              {editingResource.storage_url && editingResource.storage_url !== "__processing__" ? (
                <div className="flex items-center justify-between rounded-xl border border-primary/25 bg-primary/5 p-3 text-xs">
                  <div className="flex items-center gap-2 text-foreground">
                    <span>📄</span>
                    <span className="font-medium">معاينة وتدقيق المستند المرفوع</span>
                  </div>
                  <a
                    href={editingResource.storage_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 font-semibold text-primary hover:bg-primary/20 transition-colors"
                  >
                    <span>فتح ملف الـ PDF الأصلي</span>
                    <span>↗</span>
                  </a>
                </div>
              ) : editingResource.storage_url === "__processing__" ? (
                <div className="flex items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-300">
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                  <span>الملف قيد المعالجة والرفع السحابي حالياً، يرجى تحديث الصفحة بعد لحظات.</span>
                </div>
              ) : null}

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

              {/* Tier Toggle (Featured vs Archive) */}
              <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <span>⭐</span>
                    <span>عرض كملخص رئيسي معتمد (Tier 1 Core Shelf)</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    الملفات الرئيسية تظهر في الواجهة الأولى مع الكويز، بينما تذهب الملفات غير المحددة إلى الأرشيف الإضافي.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={editIsFeatured}
                  onChange={(e) => setEditIsFeatured(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-accent cursor-pointer"
                />
              </div>

              {/* Target Exam & Academic Year */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">نطاق المادة / الامتحان</label>
                  <select
                    value={editTargetExam}
                    onChange={(e) => setEditTargetExam(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="midterm">مادة الميد (Midterm)</option>
                    <option value="final">مادة الفاينل (Final)</option>
                    <option value="other">شامل / أخرى</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">السنة الأكاديمية</label>
                  <select
                    value={editAcademicYear}
                    onChange={(e) => setEditAcademicYear(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="2025/2026">2025/2026</option>
                    <option value="2024/2025">2024/2025</option>
                    <option value="2023/2024">2023/2024</option>
                    <option value="2022/2023">2022/2023</option>
                  </select>
                </div>
              </div>

              {/* Professor Name & Author / Uploader Name */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">مدرس المادة (اختياري)</label>
                  <input
                    type="text"
                    value={editProfessorName}
                    onChange={(e) => setEditProfessorName(e.target.value)}
                    placeholder="مثال: د. أحمد"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">اسم صاحب الملخص / المعد</label>
                  <input
                    type="text"
                    value={editAuthorName}
                    onChange={(e) => setEditAuthorName(e.target.value)}
                    placeholder="مثال: أنس أو إدارة المنصة"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              </div>

              {/* Quick Notes / Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">ملاحظات / وصف سريع (اختياري)</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  maxLength={150}
                  rows={2}
                  placeholder="مثال: يشمل حلول أسئلة سنوات والتلخيص المعتمد للشباتر 1 حتى 4"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                />
              </div>
            </div>

            {/* Modal Actions (Fixed Sticky Footer) */}
            <div className="flex items-center justify-end gap-3 border-t border-border p-4 sm:px-6 bg-card shrink-0">
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto"
        >
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-red-500/30 bg-card p-6 shadow-2xl">
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
