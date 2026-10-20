import { createClient } from "@supabase/supabase-js";
import { after } from "next/server";
import dns from "node:dns";
import crypto from "node:crypto";
import type { ResourceType, TargetExam } from "@/types/database";

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
        upsert: false,
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
    // Pre-extracted client text is preserved in source_text so admins can generate quizzes on-demand.
    const { error: updateError } = await supabase
      .from("resources")
      .update({
        storage_url: publicUrl,
        file_size_bytes: finalSize,
        status: targetStatus,
        source_text: preExtractedText ? preExtractedText.slice(0, 100_000) : null,
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
      .update({ status: "rejected" })
      .eq("id", resourceId);

    if (rollbackError) {
      console.error(
        `[pipeline] Also failed to mark resource ${resourceId} as rejected:`,
        rollbackError.message
      );
    } else {
      console.log(`[pipeline] Resource ${resourceId} marked as rejected.`);
    }
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
  const courseId = formData.get("courseId") as string | null;
  const title = formData.get("title") as string | null;
  const type = formData.get("type") as ResourceType | null;
  const generateQuiz = formData.get("generateQuiz") === "true";
  // Optional: pre-extracted text from client-side pdfjs (eager extraction optimization)
  const sourceText = (formData.get("sourceText") as string | null) || null;

  // Metadata extensions
  const pageCountStr = formData.get("pageCount") as string | null;
  const targetExam = ((formData.get("targetExam") as string | null) || "other").trim();
  const academicYear = ((formData.get("academicYear") as string | null) || "2025/2026").trim();
  const professorName = (formData.get("professorName") as string | null)?.trim() || null;
  const authorNameInput = (formData.get("authorName") as string | null)?.trim() || null;
  const description = (formData.get("description") as string | null)?.trim() || null;

  // Author attribution: if admin, default to "Mohammad Al-Amour", else null for guests
  const authorName = isAdmin ? (authorNameInput || "Mohammad Al-Amour") : null;
  const targetStatus: "active" | "pending" = isAdmin ? "active" : "pending";

  // ── Stage 1: Input Validation & Magic Byte Check (SYNC, <10ms) ───────────────
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
  // Insert with status='processing' and placeholder storage_url.
  // The background pipeline updates both once upload and watermarking finish.
  const { data: newResource, error: insertError } = await supabase
    .from("resources")
    .insert({
      course_id: courseId,
      title: title.trim(),
      type,
      storage_url: "__processing__", // Replaced by background pipeline
      file_size_bytes: file.size,    // Updated with compressed size later
      is_admin_uploaded: isAdmin,
      status: "processing",
      file_hash: fileHash,
      page_count: pageCount,
      target_exam: targetExam,
      academic_year: academicYear,
      professor_name: professorName,
      author_name: authorName,
      description,
    })
    .select("id")
    .single();

  if (insertError || !newResource) {
    console.error("[upload] DB insert failed:", insertError);
    return Response.json(
      { error: "Database error: could not create resource record." },
      { status: 500 }
    );
  }

  const resourceId = newResource.id;

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
}
