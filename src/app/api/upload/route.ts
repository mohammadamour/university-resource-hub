import { createClient } from "@supabase/supabase-js";
import type { ResourceType } from "@/types/database";

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

/**
 * Runs after the initial DB row is inserted.
 * Steps:
 *   1. (Optional) Ghostscript compression — gated by NEXT_PUBLIC_ENABLE_COMPRESSION
 *   2. Upload the (possibly compressed) PDF to Supabase Storage
 *   3. Update DB row with final storage_url, file_size_bytes, status='active'
 *
 * Step 4 (quiz generation) is NOT implemented here yet — that is Phase 2, Step 2.5.
 * For now, if generateQuiz=true, the flag is stored for future use.
 */
async function processFileInBackground(
  rawBuffer: ArrayBuffer,
  resourceId: string,
  courseId: string,
  generateQuiz: boolean
) {
  const supabase = createAdminClient();

  try {
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

    // ── Stage 3: Upload to Supabase Storage ─────────────────────────────────
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

    // ── Stage 4: Update DB row — storage_url, file size, mark active ─────────
    const { error: updateError } = await supabase
      .from("resources")
      .update({
        storage_url: publicUrl,
        file_size_bytes: finalSize,
        status: "active",
        // source_text sentinel: Step 2.5 will extract real text from the PDF and overwrite.
        // null = quiz generation not requested for this resource.
        source_text: generateQuiz ? "__PENDING_EXTRACTION__" : null,
      })
      .eq("id", resourceId);

    if (updateError) {
      throw new Error(`DB status update failed: ${updateError.message}`);
    }

    console.log(
      `[pipeline] ✅ Resource ${resourceId} is now active. URL: ${publicUrl}`
    );
  } catch (error) {
    // Mark the row as rejected so the admin can identify failed uploads
    console.error(
      `[pipeline] ❌ Error processing resource ${resourceId}:`,
      error
    );

    // Use await (not .then) so failures in the rollback are also surfaced
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
  // ── Auth gate: only callable from our app with ADMIN_SECRET ─────────────────
  // (The URL key check on the page is the primary gate; this is a secondary
  //  server-side guard so the endpoint can't be called directly by outsiders.)
  const adminSecret = process.env.ADMIN_SECRET;
  const authHeader = req.headers.get("x-admin-secret");
  if (!adminSecret || authHeader !== adminSecret) {
    return Response.json(
      { error: "Unauthorized." },
      { status: 401 }
    );
  }

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

  // ── Stage 2: Insert initial DB row (SYNC) ────────────────────────────────────
  // We insert with status='processing' and a placeholder storage_url.
  // The background pipeline will update both once the upload finishes.
  const supabase = createAdminClient();

  const { data: newResource, error: insertError } = await supabase
    .from("resources")
    .insert({
      course_id: courseId,
      title: title.trim(),
      type,
      storage_url: "__processing__", // Replaced by background pipeline
      file_size_bytes: file.size,    // Updated with compressed size later
      is_admin_uploaded: true,
      status: "processing",
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

  // ── Stage 3: Hand off to background pipeline (ASYNC fire-and-forget) ─────────
  processFileInBackground(rawBuffer, resourceId, courseId, generateQuiz);

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
    },
    { status: 202 } // 202 Accepted = "we received it, work is in progress"
  );
}
