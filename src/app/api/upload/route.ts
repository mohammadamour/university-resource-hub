import { createClient } from "@supabase/supabase-js";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import dns from "node:dns";
import crypto from "node:crypto";
import type { ResourceType, TargetExam, ExternalPlatform } from "@/types/database";
import { sanitizeTextForPostgres } from "@/lib/utils";
import { SITE_URL } from "@/lib/constants";
import { sendOpsAlert } from "@/lib/ops-alerts";

// ─── Serverless & Network Runtime Config ──────────────────────────────────────
// Next.js Route Segment Config: allow up to 60s execution for background AI synthesis
export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Force IPv4 resolution first to bypass local network IPv6 routing black-holes
try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // Graceful fallback for non-Node runtimes
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ALLOWED_MIMES = ["application/pdf"];
const MAX_SIZE_BYTES = 30 * 1024 * 1024; // 30 MB

// ─── Admin Supabase Client (Bypasses RLS) ─────────────────────────────────────

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars."
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

// ─── Background Pipeline (fire-and-forget) ────────────────────────────────────

import { progressBus } from "@/lib/pipeline/progress-bus";

async function notifyNewUpload(
  supabase: ReturnType<typeof createAdminClient>,
  params: {
    courseId: string;
    title: string;
    targetStatus: "active" | "pending";
    kindLabel: string;
  }
) {
  const { data: courseRow } = await supabase
    .from("courses")
    .select("title")
    .eq("id", params.courseId)
    .maybeSingle();

  const badge =
    params.targetStatus === "pending"
      ? `📤 [بانتظار المراجعة] ${params.kindLabel} طالب جديد`
      : `✅ [نشر مباشر] ${params.kindLabel} إداري جديد`;

  await sendOpsAlert(
    `${badge}\n**العنوان:** ${params.title.trim()}\n**المادة:** ${courseRow?.title || params.courseId}\n**لوحة الإدارة:** ${SITE_URL}/admin/resources`
  );
}

/**
 * Runs after the initial DB row is inserted.
 * Steps:
 *   1. (Optional) Ghostscript compression — gated by NEXT_PUBLIC_ENABLE_COMPRESSION
 *   2. Upload the (possibly compressed) PDF to Supabase Storage
 *   3. If generateQuiz=true: keep status='processing', synthesize quiz via Gemini 3.8 Flash, then mark status='active'
 *   4. If generateQuiz=false: mark status='active' immediately after storage upload
 *
 * Telemetry: At every transition, events are published to `progressBus` so clients connected
 * to the SSE route receive instant live feedback.
 */
async function processFileInBackground(
  rawBuffer: ArrayBuffer,
  resourceId: string,
  courseId: string,
  /** Pre-extracted text from client-side pdfjs saved in DB for on-demand quiz generation */
  preExtractedText: string | null = null,
  /** Resource title */
  title: string = "",
  /** Final status to set after processing: 'active' for admin uploads, 'pending' for crowdsourced guest uploads */
  targetStatus: "active" | "pending" = "active"
) {
  const supabase = createAdminClient();
  const filePath = `courses/${courseId}/${resourceId}.pdf`;
  const {
    data: { publicUrl },
  } = supabase.storage.from("resources").getPublicUrl(filePath);

  try {
    progressBus.publish(resourceId, {
      stage: "uploading",
      percent: 20,
      message: "تم التحقق من سلامة الملف، وجارٍ بدء مراحل المعالجة...",
    });

    let finalBuffer: ArrayBuffer = rawBuffer;
    let finalSize = rawBuffer.byteLength;

    // ── Stage 2: Ghostscript Compression (conditional) ──────────────────────
    // Controlled by NEXT_PUBLIC_ENABLE_COMPRESSION env var.
    // Disabled by default on Vercel (serverless has no gs binary).
    // When enabled locally, requires: winget install ArtifexSoftware.GhostScript
    const compressionEnabled =
      process.env.NEXT_PUBLIC_ENABLE_COMPRESSION === "true";

    if (compressionEnabled) {
      try {
        progressBus.publish(resourceId, {
          stage: "processing",
          percent: 35,
          message: "جارٍ ضغط وتنقية المستند لتقليص الحجم وإزالة التهديدات (150 DPI)...",
        });

        // Dynamic import so this module is not bundled unless needed
        const { compressWithGhostscript } = await import(
          "@/lib/pipeline/ghostscript"
        );
        const compressed = await compressWithGhostscript(rawBuffer);
        finalBuffer = compressed;
        finalSize = compressed.byteLength;
        console.log(
          `[pipeline] Compressed: ${rawBuffer.byteLength} → ${finalSize} bytes`
        );
      } catch (gsError) {
        // Ghostscript failure is non-fatal — fall back to uploading the original
        console.warn(
          "[pipeline] Ghostscript compression failed, using original:",
          gsError
        );
      }
    }

    // ── Stage 2.5: Auto-Watermarking (Organic Referral Stamp) ────────────────
    // Stamps the high-contrast micro-pill badge (✦ molakhasat.me) on the bottom margin.
    // When students share the PDF on WhatsApp, it drives organic peer referrals back to the hub.
    try {
      progressBus.publish(resourceId, {
        stage: "processing",
        percent: 45,
        message: "جارٍ تضمين العلامة المرجعية للمنصة في تذييل الصفحات...",
      });
      const { watermarkPdf } = await import("@/lib/pipeline/watermark");
      finalBuffer = await watermarkPdf(finalBuffer, { resourceId });
      finalSize = finalBuffer.byteLength;
    } catch (wmError) {
      console.warn(
        "[pipeline] Watermark failed, proceeding with un-watermarked buffer:",
        wmError
      );
    }

    // ── Stage 3: Upload to Supabase Storage ─────────────────────────────────
    progressBus.publish(resourceId, {
      stage: "uploading",
      percent: 55,
      message: "جارٍ رفع المستند إلى خوادم التخزين السحابي الموثوقة...",
    });


  const filePath = `courses/${courseId}/${resourceId}.pdf`;

    // Convert ArrayBuffer → Node.js Buffer so Supabase sends raw binary correctly.
    // Passing an ArrayBuffer directly can silently corrupt the file in some runtimes.
    const fileBuffer = Buffer.from(finalBuffer);

    const { error: storageError } = await supabase.storage
      .from("resources")
      .upload(filePath, fileBuffer, {
        contentType: "application/pdf",
        cacheControl: "public, max-age=31536000, immutable", // 1 yr — UUIDs never collide
        upsert: true,
      });

    if (storageError) {
      // Detect duplicate path — Supabase returns 409 / "already exists"
      const code = (storageError as { statusCode?: string }).statusCode;
      if (code === "409" || storageError.message.toLowerCase().includes("already exists")) {
        console.error(`[pipeline] Duplicate storage path: ${filePath}`);
      }
      throw new Error(
        `Storage upload failed [${code ?? "?"}]: ${storageError.message}`
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("resources").getPublicUrl(filePath);

    const compressionRatio =
      finalSize < rawBuffer.byteLength
        ? `${((1 - finalSize / rawBuffer.byteLength) * 100).toFixed(1)}% reduction`
        : "no reduction (original kept)";

    console.log(
      `[pipeline] Uploaded ${resourceId}. ` +
        `Size: ${rawBuffer.byteLength} → ${finalSize} bytes (${compressionRatio})`
    );

    // ── Stage 4: Update DB row with storage URL & target status ──────────────
    // Decoupled architecture: resources become active (admin) or pending (crowdsourced guest)
    // immediately upon successful storage upload.
    // Pre-extracted client text is sanitized (null-byte stripped) and preserved in source_text.
    const sanitizedSourceText = sanitizeTextForPostgres(preExtractedText);
    const { error: updateError } = await supabase
      .from("resources")
      .update({
        storage_url: publicUrl,
        file_size_bytes: finalSize,
        status: targetStatus,
        source_text: sanitizedSourceText ? sanitizedSourceText.slice(0, 100_000) : null,
      })
      .eq("id", resourceId);

    if (updateError) {
      throw new Error(`DB status update failed: ${updateError.message}`);
    }

    // ── Stage 5: Notify client of 100% completion ─────────────────────────────
    const completionMessage =
      targetStatus === "active"
        ? "تم حفظ المستند، تضمين العلامة المرجعية، ونشره بنجاح للطلاب!"
        : "تم استلام الملف بنجاح! سيتم مراجعته ونشره في مكتبة المادة قريباً.";

    progressBus.publish(resourceId, {
      stage: "done",
      percent: 100,
      message: completionMessage,
      resourceId,
    });

    console.log(
      `[pipeline] ✅ Resource ${resourceId} is now ${targetStatus}. URL: ${publicUrl}`
    );

    if (targetStatus === "active") {
      try {
        revalidatePath("/");
        revalidatePath("/courses/[slug]", "page");
      } catch (revErr) {
        console.warn("[pipeline] Revalidation notice:", revErr);
      }
    }

    // Notify admin channel once the file is safely persisted in storage + DB
    await notifyNewUpload(supabase, {
      courseId,
      title,
      targetStatus,
      kindLabel: "ملف PDF",
    });
  } catch (error) {
    // Mark the row as rejected so the admin can identify failed uploads
    console.error(
      `[pipeline] ❌ Error processing resource ${resourceId}:`,
      error
    );

    const errorMessage =
      error instanceof Error ? error.message : "خطأ غير متوقع في المعالجة.";

    progressBus.publish(resourceId, {
      stage: "error",
      percent: 100,
      message: `فشلت معالجة الملف: ${errorMessage}`,
      error: errorMessage,
    });

    const { error: rollbackError } = await supabase
      .from("resources")
      .update({ status: "rejected", storage_url: publicUrl })
      .eq("id", resourceId);

    if (rollbackError) {
      console.error(
        `[pipeline] Also failed to mark resource ${resourceId} as rejected:`,
        rollbackError.message
      );
    } else {
      console.log(`[pipeline] Resource ${resourceId} marked as rejected.`);
    }

    await sendOpsAlert(
      `❌ فشل معالجة ملف PDF في الخلفية (/api/upload)\n**العنوان:** ${title.trim() || resourceId}\n**المعرّف:** \`${resourceId}\`\n**السبب:** ${errorMessage}`
    );
  }
}

// ─── POST Handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  // ── Auth gate & role evaluation ─────────────────────────────────────────────
  // If the request contains a valid ADMIN_SECRET, it is published immediately ('active')
  // and attributed to Mohammad Al-Amour.
  // Otherwise, it is treated as a crowdsourced guest upload ('pending') for admin moderation.
  const adminSecret = process.env.ADMIN_SECRET;
  const authHeader = req.headers.get("x-admin-secret");
  const isAdmin = Boolean(adminSecret && authHeader === adminSecret);

  // ── Parse multipart form ─────────────────────────────────────────────────────
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return Response.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const thumbnailFile = formData.get("thumbnail") as File | null;
  const linkUrl = (formData.get("linkUrl") as string | null)?.trim() || null;
  const courseId = formData.get("courseId") as string | null;
  const title = sanitizeTextForPostgres(formData.get("title") as string | null);
  const type = formData.get("type") as ResourceType | null;
  const generateQuiz = formData.get("generateQuiz") === "true";
  // Optional: pre-extracted text from client-side pdfjs (eager extraction optimization)
  const sourceText = sanitizeTextForPostgres(formData.get("sourceText") as string | null);

  // Metadata extensions
  const pageCountStr = formData.get("pageCount") as string | null;
  const targetExam = ((formData.get("targetExam") as string | null) || "other").trim();
  const academicYear = ((formData.get("academicYear") as string | null) || "2025/2026").trim();
  const professorName = sanitizeTextForPostgres(formData.get("professorName") as string | null);
  const authorNameInput = sanitizeTextForPostgres(formData.get("authorName") as string | null);
  const description = sanitizeTextForPostgres(formData.get("description") as string | null);

  // Author attribution: if admin, default to "Mohammad Al-Amour", else null for guests
  const authorName = isAdmin ? (authorNameInput || "Mohammad Al-Amour") : null;
  const targetStatus: "active" | "pending" = isAdmin ? "active" : "pending";

  try {
    // ── Stage 1A: External Link Ingestion (No PDF / No Ghostscript pipeline needed) ──
    if (type === "link") {
      if (!courseId || !title || !linkUrl) {
        return Response.json(
          { error: "يرجى تعبئة جميع الحقول الإلزامية وإدخال الرابط الخارجي للمورد." },
          { status: 400 }
        );
      }

      try {
        new URL(linkUrl);
      } catch {
        return Response.json(
          { error: "INVALID_URL: الرابط المدخل غير صالح. يرجى التأكد من كتابة الرابط بشكل صحيح مع https://" },
          { status: 422 }
        );
      }

      let platform: ExternalPlatform = "general";
      let linkThumbnailUrl: string | null = null;
      if (linkUrl.includes("youtube.com") || linkUrl.includes("youtu.be")) {
        platform = "youtube";
        const ytMatch = linkUrl.match(
          /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
        );
        if (ytMatch && ytMatch[1]) {
          linkThumbnailUrl = `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
        }
      } else if (linkUrl.includes("github.com")) {
        platform = "github";
      } else if (linkUrl.includes("drive.google.com")) {
        platform = "drive";
      } else if (linkUrl.includes("docs.google.com")) {
        platform = "docs";
      }

      const supabase = createAdminClient();
      const resourceId = crypto.randomUUID();

      const { data: newResource, error: insertError } = await supabase
        .from("resources")
        .insert({
          id: resourceId,
          course_id: courseId,
          title: title.trim(),
          type: "link",
          storage_url: linkUrl,
          file_size_bytes: null,
          is_admin_uploaded: isAdmin,
          status: targetStatus,
          target_exam: targetExam,
          academic_year: academicYear,
          professor_name: professorName,
          author_name: authorName,
          description,
          is_featured: false,
          external_platform: platform,
          thumbnail_url: linkThumbnailUrl,
        })
        .select("id")
        .single();

      if (insertError) {
        await sendOpsAlert(
          `❌ خطأ 500 في إدخال رابط خارجي (POST /api/upload)\n**العنوان:** ${title.trim()}\n**السبب:** ${insertError.message}`
        );
        return Response.json({ error: insertError.message }, { status: 500 });
      }

      // Notify outside the critical response path so link submissions feel instant
      after(async () => {
        await notifyNewUpload(supabase, {
          courseId,
          title,
          targetStatus,
          kindLabel: "رابط خارجي",
        });
      });

      return Response.json({
        success: true,
        resourceId: newResource.id,
        status: targetStatus,
      });
    }

  // ── Stage 1B: Input Validation & Magic Byte Check (SYNC, <10ms) ───────────────
  if (!file || !courseId || !title || !type) {
    return Response.json(
      { error: "Missing required fields: file, courseId, title, type." },
      { status: 400 }
    );
  }

  // File size gate: reject 0-byte or oversized files
  if (file.size === 0) {
    return Response.json(
      { error: "FILE_EMPTY: The uploaded file is empty." },
      { status: 422 }
    );
  }

  if (file.size > MAX_SIZE_BYTES) {
    return Response.json(
      { error: `FILE_TOO_LARGE: Max allowed size is ${MAX_SIZE_BYTES / 1024 / 1024}MB.` },
      { status: 422 }
    );
  }

  // Declared MIME check
  if (!ALLOWED_MIMES.includes(file.type)) {
    return Response.json(
      { error: "INVALID_MIME: Only PDF files are accepted." },
      { status: 422 }
    );
  }

  const validTypes: ResourceType[] = [
    "summary",
    "quiz",
    "past_exam",
    "guide",
    "link",
    "other",
  ];
  if (!validTypes.includes(type)) {
    return Response.json(
      { error: "INVALID_TYPE: Unrecognized resource type." },
      { status: 422 }
    );
  }

  // Read file buffer upfront (required before request stream terminates)
  const rawBuffer = await file.arrayBuffer();

  // Magic bytes check (%PDF- in first 1024 bytes per ISO 32000-1 standard)
  const headerSlice = new Uint8Array(rawBuffer.slice(0, 1024));
  const headerText = new TextDecoder("ascii").decode(headerSlice);
  if (!headerText.includes("%PDF-")) {
    return Response.json(
      { error: "INVALID_PDF_SIGNATURE: File content is not a valid PDF document." },
      { status: 422 }
    );
  }

  const supabase = createAdminClient();

  // ── Duplicate Defense: SHA-256 Fingerprint Check ─────────────────────────────
  const fileHash = crypto
    .createHash("sha256")
    .update(Buffer.from(rawBuffer))
    .digest("hex");

  const { data: existingDuplicate } = await supabase
    .from("resources")
    .select("id, title")
    .eq("course_id", courseId)
    .eq("file_hash", fileHash)
    .maybeSingle();

  if (existingDuplicate) {
    return Response.json(
      { error: `⚠️ هذا الملف تم رفعه مسبقاً لهذه المادة بعنوان: "${existingDuplicate.title}"` },
      { status: 409 }
    );
  }

  // ── Page Count Resolution (Client pre-extracted or server fallback via pdf-lib) ──
  let pageCount: number | null = pageCountStr ? parseInt(pageCountStr, 10) : null;
  if (!pageCount || isNaN(pageCount)) {
    try {
      const { PDFDocument } = await import("pdf-lib");
      const tempDoc = await PDFDocument.load(rawBuffer, { ignoreEncryption: true });
      pageCount = tempDoc.getPageCount();
    } catch {
      pageCount = null;
    }
  }

    // ── Stage 2: Insert initial DB row (SYNC) ────────────────────────────────────
  // Generate deterministic resourceId and publicUrl immediately.
  // This completely eliminates transient '__processing__' placeholder leaks in the UI or database.
  const resourceId = crypto.randomUUID();
  const filePath = `courses/${courseId}/${resourceId}.pdf`;
  const {
    data: { publicUrl },
  } = supabase.storage.from("resources").getPublicUrl(filePath);

  // ── Stage 2.1: Upload Client-Rendered First-Page Thumbnail (if provided) ─────
  let thumbnailUrl: string | null = null;
  if (thumbnailFile && thumbnailFile.size > 0) {
    try {
      const thumbBuffer = Buffer.from(await thumbnailFile.arrayBuffer());
      const thumbPath = `thumbnails/${resourceId}.jpg`;
      const { error: thumbErr } = await supabase.storage
        .from("resources")
        .upload(thumbPath, thumbBuffer, {
          contentType: "image/jpeg",
          cacheControl: "public, max-age=31536000, immutable",
          upsert: true,
        });

      if (!thumbErr) {
        const {
          data: { publicUrl: thumbPublicUrl },
        } = supabase.storage.from("resources").getPublicUrl(thumbPath);
        thumbnailUrl = thumbPublicUrl;
      } else {
        console.warn("[upload] Thumbnail storage upload error:", thumbErr.message);
      }
    } catch (tErr) {
      console.warn("[upload] Failed to process thumbnail file:", tErr);
    }
  }

  const { data: newResource, error: insertError } = await supabase
    .from("resources")
    .insert({
      id: resourceId,
      course_id: courseId,
      title: title.trim(),
      type,
      storage_url: publicUrl,
      file_size_bytes: file.size,
      is_admin_uploaded: isAdmin,
      status: "processing",
      file_hash: fileHash,
      page_count: pageCount,
      target_exam: targetExam,
      academic_year: academicYear,
      professor_name: professorName,
      author_name: authorName,
      description,
      is_featured: isAdmin,
      thumbnail_url: thumbnailUrl,
    })
    .select("id")
    .single();

  if (insertError || !newResource) {
    console.error("[upload] DB insert failed:", insertError);
    await sendOpsAlert(
      `❌ خطأ 500 في إنشاء سجل PDF (POST /api/upload)\n**العنوان:** ${title.trim()}\n**السبب:** ${insertError?.message || "Unknown DB insert error"}`
    );
    return Response.json(
      { error: "Database error: could not create resource record." },
      { status: 500 }
    );
  }

  // resourceId already initialized deterministically above

  // Publish initial progress event
  progressBus.publish(resourceId, {
    stage: "uploading",
    percent: 10,
    message: "تم فحص الملف والتحقق من عدم تكراره، وجارٍ بدء المعالجة في الخلفية...",
  });

  // ── Stage 3: Hand off to background pipeline via Next.js after() ─────────────
  // Using after() guarantees that serverless runtimes (like Vercel) will NOT freeze
  // or destroy the container before the background processing completes, while still
  // allowing us to return an instant 202 Accepted response to the browser.
  after(async () => {
    await processFileInBackground(
      rawBuffer,
      resourceId,
      courseId,
      sourceText,
      title,
      targetStatus
    );
  });

  // ── Respond immediately ───────────────────────────────────────────────────────
  // The client's progressive stepper will continue showing the pipeline states.
  // The frontend currently simulates step advancement after receiving this response,
  // but this endpoint is also ready to be consumed as SSE in a future upgrade.
  return Response.json(
    {
      resourceId,
      status: "processing",
      message:
        "Resource record created. Background pipeline has been started — file will be available shortly.",
      quizPending: false, // Quizzes are managed on-demand via the Admin panel
    },
    { status: 202 } // 202 Accepted = "we received it, work is in progress"
  );
  } catch (unexpectedErr) {
    const errMsg =
      unexpectedErr instanceof Error ? unexpectedErr.message : String(unexpectedErr);
    console.error("[upload] Unexpected 500:", unexpectedErr);
    await sendOpsAlert(
      `🚨 خطأ 500 غير متوقع في POST /api/upload\n**السبب:** ${errMsg}`
    );
    return Response.json(
      { error: "Unexpected server error while processing upload." },
      { status: 500 }
    );
  }
}
