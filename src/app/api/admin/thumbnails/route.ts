import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOpsAlert } from "@/lib/ops-alerts";

function verifyAdminAuth(request: Request): boolean {
  const adminSecret = request.headers.get("x-admin-secret");
  return Boolean(
    process.env.ADMIN_SECRET && adminSecret === process.env.ADMIN_SECRET
  );
}

/**
 * POST /api/admin/thumbnails
 *
 * Accepts a client-rendered JPEG thumbnail blob, uploads it to Supabase Storage
 * at thumbnails/{resourceId}.jpg, and updates the resource's thumbnail_url column.
 */
export async function POST(request: Request) {
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const resourceId = formData.get("resourceId") as string;
    const thumbnail = formData.get("thumbnail") as File;

    if (!resourceId || !thumbnail) {
      return NextResponse.json(
        { error: "Missing resourceId or thumbnail file" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const thumbBuffer = Buffer.from(await thumbnail.arrayBuffer());
    const thumbPath = `thumbnails/${resourceId}.jpg`;

    const { error: storageError } = await supabase.storage
      .from("resources")
      .upload(thumbPath, thumbBuffer, {
        contentType: "image/jpeg",
        cacheControl: "public, max-age=31536000, immutable",
        upsert: true,
      });

    if (storageError) {
      console.error("[admin-thumbnails] Storage upload failed:", storageError);
      return NextResponse.json(
        { error: storageError.message },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("resources").getPublicUrl(thumbPath);

    const { error: dbError } = await supabase
      .from("resources")
      .update({ thumbnail_url: publicUrl })
      .eq("id", resourceId);

    if (dbError) {
      console.error("[admin-thumbnails] DB update failed:", dbError);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, thumbnailUrl: publicUrl });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    await sendOpsAlert(`🚨 خطأ 500 في POST /api/admin/thumbnails: ${msg}`);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

