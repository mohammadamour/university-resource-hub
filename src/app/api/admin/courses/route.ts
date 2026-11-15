import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminRequest } from "@/lib/admin-auth";

/**
 * POST /api/admin/courses
 *
 * Secure endpoint for administrators to create a new course directly from the
 * Admin Resource Manager without requiring manual SQL queries in Supabase.
 *
 * Enforces:
 * 1. Constant-time admin secret validation via `isAdminRequest`.
 * 2. Strict slug validation & cleanup (kebab-case alphanumeric).
 * 3. Atomic insertion with unique constraint handling on (department_id, slug).
 */
export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json(
      { error: "غير مصرح لك بإجراء هذه العملية. يرجى التأكد من صلاحيات المشرف." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { departmentId, title, slug, description, courseCode, displayOrder } = body;

    // Validate Department
    if (!departmentId || typeof departmentId !== "string" || !departmentId.trim()) {
      return NextResponse.json(
        { error: "يرجى تحديد الكلية أو القسم التابع له المساق الدراسي." },
        { status: 400 }
      );
    }

    // Validate Title
    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { error: "يرجى إدخال اسم المساق بالعربية." },
        { status: 400 }
      );
    }

    // Validate & Normalize Slug
    if (!slug || typeof slug !== "string" || !slug.trim()) {
      return NextResponse.json(
        { error: "يرجى إدخال المعرف اللاتيني للمساق (slug)." },
        { status: 400 }
      );
    }

    const cleanedSlug = slug
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!cleanedSlug) {
      return NextResponse.json(
        {
          error:
            "المعرف اللاتيني (slug) غير صالح. يجب أن يحتوي على أحرف إنجليزية وأرقام وشرطات فقط.",
        },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Verify department exists
    const { data: dept, error: deptError } = await supabase
      .from("departments")
      .select("id, name")
      .eq("id", departmentId)
      .maybeSingle();

    if (deptError || !dept) {
      return NextResponse.json(
        { error: "القسم المحدد غير موجود في قاعدة البيانات." },
        { status: 404 }
      );
    }

    // Insert course
    const { data: newCourse, error: insertError } = await supabase
      .from("courses")
      .insert({
        department_id: departmentId,
        title: title.trim(),
        slug: cleanedSlug,
        description: description?.trim() || null,
        course_code: courseCode?.trim() || null,
        display_order:
          typeof displayOrder === "number" && !Number.isNaN(displayOrder)
            ? displayOrder
            : 0,
      })
      .select(`
        id,
        title,
        slug,
        course_code,
        department:departments (name)
      `)
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json(
          {
            error: `المعرف اللاتيني "${cleanedSlug}" مسجل مسبقاً لمساق آخر في قسم "${dept.name}". يرجى اختيار slug مختلف.`,
          },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: `فشل إنشاء المساق في قاعدة البيانات: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      course: newCourse,
      message: `تم إنشاء مساق "${newCourse.title}" بنجاح! أصبح جاهزاً الآن لرفع الملخصات والكويزات.`,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "حدث خطأ غير متوقع أثناء معالجة طلب إنشاء المساق.",
      },
      { status: 500 }
    );
  }
}
