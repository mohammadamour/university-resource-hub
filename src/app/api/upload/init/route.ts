import crypto from "node:crypto";
import type { ResourceType } from "@/types/database";
import { sanitizeTextForPostgres } from "@/lib/utils";
import { sendOpsAlert } from "@/lib/ops-alerts";
import {
  ALLOWED_UPLOAD_MIMES,
  MAX_UPLOAD_SIZE_BYTES,
  SHA256_HEX_REGEX,
  UUID_REGEX,
  VALID_RESOURCE_TYPES,
  createUploadAdminClient,
  findDuplicateResource,
} from "@/lib/pipeline/upload-helpers";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

interface InitUploadBody {
  courseId?: unknown;
  title?: unknown;
  type?: unknown;
  fileSize?: unknown;
  mimeType?: unknown;
  fileHash?: unknown;
  hasThumbnail?: unknown;
}

/**
 * Issues short-lived signed Supabase Storage upload tokens so the browser
 * uploads PDF binaries directly to Supabase Storage instead of through
 * Vercel's 4.5 MB serverless request body cap.
 */
export async function POST(req: Request) {
  try {
    let body: InitUploadBody;
    try {
      body = (await req.json()) as InitUploadBody;
    } catch {
      return Response.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const courseId = typeof body.courseId === "string" ? body.courseId.trim() : "";
    const title = sanitizeTextForPostgres(
      typeof body.title === "string" ? body.title : null
    )?.trim();
    const type = typeof body.type === "string" ? (body.type as ResourceType) : null;
    const fileSize = typeof body.fileSize === "number" ? body.fileSize : NaN;
    const mimeType = typeof body.mimeType === "string" ? body.mimeType.trim() : "";
    const fileHash =
      typeof body.fileHash === "string" && SHA256_HEX_REGEX.test(body.fileHash.trim())
        ? body.fileHash.trim().toLowerCase()
        : null;
    const hasThumbnail = body.hasThumbnail === true;

    if (!courseId || !UUID_REGEX.test(courseId) || !title || !type || type === "link") {
      return Response.json(
        { error: "يرجى تعبئة جميع الحقول الإلزامية واختيار مادة صالحة." },
        { status: 400 }
      );
    }

    if (!VALID_RESOURCE_TYPES.includes(type)) {
      return Response.json(
        { error: "INVALID_TYPE: Unrecognized resource type." },
        { status: 422 }
      );
    }

    if (!Number.isFinite(fileSize) || fileSize <= 0) {
      return Response.json(
        { error: "FILE_EMPTY: The uploaded file is empty." },
        { status: 422 }
      );
    }

    if (fileSize > MAX_UPLOAD_SIZE_BYTES) {
      return Response.json(
        {
          error: `FILE_TOO_LARGE: Max allowed size is ${
            MAX_UPLOAD_SIZE_BYTES / 1024 / 1024
          }MB.`,
        },
        { status: 422 }
      );
    }

    if (
      !ALLOWED_UPLOAD_MIMES.includes(
        mimeType as (typeof ALLOWED_UPLOAD_MIMES)[number]
      )
    ) {
      return Response.json(
        { error: "INVALID_MIME: Only PDF files are accepted." },
        { status: 422 }
      );
    }

    const supabase = createUploadAdminClient();

    // Ensure target course exists before minting a storage upload URL
    const { data: courseRow } = await supabase
      .from("courses")
      .select("id")
      .eq("id", courseId)
      .maybeSingle();

    if (!courseRow) {
      return Response.json(
        { error: "المادة المختارة غير موجودة." },
        { status: 404 }
      );
    }

    // Reject exact duplicates before the browser transfers megabytes to Storage
    if (fileHash) {
      const existingDuplicate = await findDuplicateResource(
        supabase,
        courseId,
        fileHash
      );
      if (existingDuplicate) {
        return Response.json(
          {
            error: `⚠️ هذا الملف تم رفعه مسبقاً لهذه المادة بعنوان: "${existingDuplicate.title}"`,
          },
          { status: 409 }
        );
      }
    }

    // Server generates the UUID so clients can never overwrite existing active resources
    const resourceId = crypto.randomUUID();
    const filePath = `courses/${courseId}/${resourceId}.pdf`;

    const { data: pdfSigned, error: pdfSignError } = await supabase.storage
      .from("resources")
      .createSignedUploadUrl(filePath, { upsert: true });

    if (pdfSignError || !pdfSigned) {
      throw new Error(
        pdfSignError?.message || "Failed to generate signed PDF upload URL."
      );
    }

    let thumbPath: string | null = null;
    let thumbUploadToken: string | null = null;

    if (hasThumbnail) {
      const candidateThumbPath = `thumbnails/${resourceId}.jpg`;
      const { data: thumbSigned, error: thumbSignError } = await supabase.storage
        .from("resources")
        .createSignedUploadUrl(candidateThumbPath, { upsert: true });

      if (!thumbSignError && thumbSigned) {
        thumbPath = thumbSigned.path;
        thumbUploadToken = thumbSigned.token;
      } else {
        console.warn(
          "[upload/init] Could not mint thumbnail signed URL:",
          thumbSignError?.message
        );
      }
    }

    return Response.json({
      resourceId,
      filePath: pdfSigned.path,
      pdfUploadToken: pdfSigned.token,
      thumbPath,
      thumbUploadToken,
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[upload/init] Unexpected 500:", err);
    await sendOpsAlert(
      `🚨 خطأ 500 في تهيئة الرفع المباشر (POST /api/upload/init)\n**السبب:** ${errMsg}`
    );
    return Response.json(
      { error: "تعذر تجهيز رابط الرفع المباشر، يرجى المحاولة مرة أخرى." },
      { status: 500 }
    );
  }
}

