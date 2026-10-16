import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteProps {
  params: Promise<{ id: string }>;
}

/**
 * GET /r/:id
 *
 * Universal, permanent redirect route for watermarked PDFs and referral QR codes.
 *
 * WHY THIS ROUTE EXISTS:
 * PDFs circulating on student WhatsApp and Telegram groups are static immutable files.
 * Rather than stamping deep or volatile URLs directly into binary PDFs, we stamp /r/:id.
 *
 * 1. If :id matches a resource, it looks up the course and redirects to /courses/:slug.
 * 2. If :id matches a course directly, it redirects to /courses/:slug.
 * 3. If the platform domain moves (e.g. molakhasat.me -> molakhasat.com), a simple DNS 301
 *    forwarding rule forwards /r/:id to the new domain, preserving 100% of links forever.
 */
export async function GET(request: Request, props: RouteProps) {
  const { id } = await props.params;

  if (!id) {
    return NextResponse.redirect(new URL("/", request.url), 307);
  }

  try {
    const supabase = await createClient();

    // 1. Attempt lookup as a Resource ID
    const { data: resource } = await supabase
      .from("resources")
      .select("id, course_id, courses(slug)")
      .eq("id", id)
      .maybeSingle();

    const courseSlug = (resource as { courses?: { slug?: string } | null })?.courses
      ?.slug;
    if (courseSlug) {
      return NextResponse.redirect(
        new URL(
          `/courses/${courseSlug}?ref=pdf_watermark&rid=${encodeURIComponent(id)}`,
          request.url
        ),
        307
      );
    }

    // 2. Attempt lookup as a Course ID or Course Slug
    const { data: course } = await supabase
      .from("courses")
      .select("slug")
      .or(`id.eq.${id},slug.eq.${id}`)
      .maybeSingle();

    if (course?.slug) {
      return NextResponse.redirect(
        new URL(
          `/courses/${course.slug}?ref=pdf_watermark`,
          request.url
        ),
        307
      );
    }
  } catch (err) {
    console.warn(`[redirect /r/${id}] Failed to resolve target:`, err);
  }

  // Fallback: Safe redirect to homepage if resource/course not found
  return NextResponse.redirect(new URL("/", request.url), 307);
}
