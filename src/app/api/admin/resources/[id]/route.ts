import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ResourceType, ResourceStatus } from "@/types/database";
import { sendOpsAlert } from "@/lib/ops-alerts";
import { isAdminRequest } from "@/lib/admin-auth";

interface RouteProps {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/admin/resources/[id]
 *
 * Atomically purges a resource:
 * 1. Deletes the physical PDF binary from Supabase Storage.
 * 2. Deletes the database row from `resources` (cascading cleanly to quiz_attempts/bookmarks).
 */
export async function DELETE(request: Request, props: RouteProps) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await props.params;
  if (!id) {
    return NextResponse.json({ error: "Missing resource ID" }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();

    // 1. Fetch resource metadata to identify course_id and storage target
    const { data: resource, error: fetchError } = await supabase
      .from("resources")
      .select("id, course_id, storage_url")
      .eq("id", id)
      .single();

    if (fetchError || !resource) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    // 2. Derive storage file path from storage_url or fallback to courses/:courseId/:resourceId.pdf
    let filePath = `courses/${resource.course_id}/${resource.id}.pdf`;
    if (
      resource.storage_url &&
      resource.storage_url.includes("/storage/v1/object/public/resources/")
    ) {
      const marker = "/storage/v1/object/public/resources/";
      filePath = decodeURIComponent(
        resource.storage_url.slice(resource.storage_url.indexOf(marker) + marker.length)
      );
    }

    // Attempt storage deletion (PDF and its thumbnail, non-fatal if already removed)
    const { error: storageError } = await supabase.storage
      .from("resources")
      .remove([filePath, `thumbnails/${resource.id}.jpg`]);

    if (storageError) {
      console.warn(
        `[admin-crud] Storage deletion warning for ${filePath}:`,
        storageError.message
      );
    }

    // 3. Delete database row
    const { error: dbError } = await supabase
      .from("resources")
      .delete()
      .eq("id", id);

    if (dbError) {
      console.error(`[admin-crud] Failed to delete database row ${id}:`, dbError);
      return NextResponse.json(
        { error: `Database deletion failed: ${dbError.message}` },
        { status: 500 }
      );
    }

    // Invalidate edge cache so public course pages and catalog update immediately
    revalidatePath("/");
    revalidatePath("/courses/[slug]", "page");

    return NextResponse.json({
      success: true,
      deletedId: id,
      message: "تم حذف المورد وملف التخزين بنجاح.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[admin-crud] DELETE error:", err);
    await sendOpsAlert(`🚨 خطأ 500 في DELETE /api/admin/resources/${id}: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/resources/[id]
 *
 * Updates resource metadata (Title, Course reassignment, Resource Type, Status).
 */
export async function PATCH(request: Request, props: RouteProps) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await props.params;
  if (!id) {
    return NextResponse.json({ error: "Missing resource ID" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (typeof body.title === "string" && body.title.trim()) {
      updateData.title = body.title.trim();
    }

    if (typeof body.courseId === "string" && body.courseId.trim()) {
      updateData.course_id = body.courseId.trim();
    }

    if (
      body.type === "summary" ||
      body.type === "quiz" ||
      body.type === "past_exam" ||
      body.type === "guide" ||
      body.type === "link" ||
      body.type === "other"
    ) {
      updateData.type = body.type as ResourceType;
    }

    if (
      body.status === "active" ||
      body.status === "processing" ||
      body.status === "pending" ||
      body.status === "rejected"
    ) {
      updateData.status = body.status as ResourceStatus;
    }

    if (typeof body.isFeatured === "boolean") {
      updateData.is_featured = body.isFeatured;
    } else if (typeof body.is_featured === "boolean") {
      updateData.is_featured = body.is_featured;
    }

    if (body.targetExam === "midterm" || body.targetExam === "final" || body.targetExam === "other") {
      updateData.target_exam = body.targetExam;
    }

    if (typeof body.academicYear === "string" && body.academicYear.trim()) {
      updateData.academic_year = body.academicYear.trim();
    }

    if (body.professorName !== undefined) {
      updateData.professor_name = body.professorName ? String(body.professorName).trim() : null;
    }

    if (body.authorName !== undefined) {
      updateData.author_name = body.authorName ? String(body.authorName).trim() : null;
    }

    if (body.description !== undefined) {
      updateData.description = body.description ? String(body.description).trim() : null;
    }

    if (body.externalPlatform !== undefined) {
      updateData.external_platform = body.externalPlatform || null;
    }

    if (body.displayOrder !== undefined || body.display_order !== undefined) {
      const parsedOrder = parseInt(String(body.displayOrder ?? body.display_order), 10);
      if (!isNaN(parsedOrder)) {
        updateData.display_order = parsedOrder;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields provided for update" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Self-healing: if storage_url is placeholder or missing, resolve it deterministically
    const { data: currentRes } = await supabase
      .from("resources")
      .select("id, course_id, storage_url")
      .eq("id", id)
      .single();

    if (
      currentRes &&
      (!currentRes.storage_url ||
        currentRes.storage_url === "__processing__" ||
        !currentRes.storage_url.startsWith("http"))
    ) {
      const targetCourseId =
        (typeof updateData.course_id === "string" ? updateData.course_id : null) ||
        currentRes.course_id;
      const filePath = `courses/${targetCourseId}/${id}.pdf`;
      const {
        data: { publicUrl },
      } = supabase.storage.from("resources").getPublicUrl(filePath);
      updateData.storage_url = publicUrl;
    }

    const { data: updatedResource, error: updateError } = await supabase
      .from("resources")
      .update(updateData)
      .eq("id", id)
      .select("*, course:courses(id, title, slug, course_code, department:departments(name))")
      .single();

    if (updateError) {
      console.error(`[admin-crud] Failed to update resource ${id}:`, updateError);
      return NextResponse.json(
        { error: `Update failed: ${updateError.message}` },
        { status: 500 }
      );
    }

    // Invalidate edge cache so public views update immediately
    revalidatePath("/");
    if (updatedResource?.course?.slug) {
      revalidatePath(`/courses/${updatedResource.course.slug}`);
    } else {
      revalidatePath("/courses/[slug]", "page");
    }

    return NextResponse.json({
      success: true,
      resource: updatedResource,
      message: "تم تحديث بيانات المورد بنجاح.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[admin-crud] PATCH error:", err);
    await sendOpsAlert(`🚨 خطأ 500 في PATCH /api/admin/resources/${id}: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
