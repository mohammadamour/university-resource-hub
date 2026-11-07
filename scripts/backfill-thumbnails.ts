import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, readFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import crypto from "node:crypto";

const execAsync = promisify(exec);
dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌ Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

function extractYouTubeVideoId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
  );
  return match ? match[1] : null;
}

async function run() {
  console.log("🔍 Fetching resources missing thumbnails...");
  const { data: resources, error } = await supabase
    .from("resources")
    .select("id, title, type, storage_url, thumbnail_url, course_id")
    .is("thumbnail_url", null);

  if (error) {
    console.error("❌ Supabase query failed:", error.message);
    return;
  }

  if (!resources || resources.length === 0) {
    console.log("✅ All resources already have thumbnails!");
    return;
  }

  console.log(`Found ${resources.length} resources without thumbnails.`);

  for (const res of resources) {
    console.log(`\nProcessing: "${res.title}" (${res.type}) [${res.id}]`);

    // ── 1. YouTube & External Links ──────────────────────────────────────────
    if (res.type === "link") {
      const ytId = extractYouTubeVideoId(res.storage_url || "");
      if (ytId) {
        const ytThumb = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
        const { error: updateErr } = await supabase
          .from("resources")
          .update({ thumbnail_url: ytThumb })
          .eq("id", res.id);

        if (updateErr) {
          console.error(`  ❌ Failed to update YouTube thumbnail: ${updateErr.message}`);
        } else {
          console.log(`  ✅ Assigned YouTube thumbnail: ${ytThumb}`);
        }
      } else {
        console.log(`  ℹ️ Link is not YouTube. Using dynamic CSS cover fallback.`);
      }
      continue;
    }

    // ── 2. PDF Documents ─────────────────────────────────────────────────────
    // For PDFs: Try Ghostscript locally if available
    let gsCmd: string | null = null;
    for (const cmd of ["gswin64c", "gs", "gswin32c"]) {
      try {
        await execAsync(`${cmd} --version`);
        gsCmd = cmd;
        break;
      } catch {
        // try next
      }
    }

    if (!gsCmd) {
      console.log(
        `  ℹ️ Ghostscript binary not found locally. Resource displays the dynamic CSS book cover.`
      );
      continue;
    }

    try {
      // Download PDF binary
      const resBlob = await fetch(res.storage_url);
      if (!resBlob.ok) {
        console.warn(`  ⚠️ Could not download PDF from ${res.storage_url}`);
        continue;
      }
      const pdfBuffer = Buffer.from(await resBlob.arrayBuffer());
      const tempId = crypto.randomUUID();
      const tempPdf = join(tmpdir(), `temp-${tempId}.pdf`);
      const tempJpg = join(tmpdir(), `temp-${tempId}.jpg`);

      await writeFile(tempPdf, pdfBuffer);

      // Render Page 1 to 150 DPI JPEG
      await execAsync(
        `${gsCmd} -dNOPAUSE -dBATCH -sDEVICE=jpeg -dFirstPage=1 -dLastPage=1 -r150 -sOutputFile="${tempJpg}" "${tempPdf}"`
      );

      const jpgBuffer = await readFile(tempJpg);
      const thumbPath = `thumbnails/${res.id}.jpg`;

      // Upload to Supabase Storage
      const { error: uploadErr } = await supabase.storage
        .from("resources")
        .upload(thumbPath, jpgBuffer, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadErr) {
        console.error(`  ❌ Storage upload failed: ${uploadErr.message}`);
      } else {
        const {
          data: { publicUrl: thumbUrl },
        } = supabase.storage.from("resources").getPublicUrl(thumbPath);

        await supabase
          .from("resources")
          .update({ thumbnail_url: thumbUrl })
          .eq("id", res.id);

        console.log(`  ✅ Successfully uploaded thumbnail: ${thumbUrl}`);
      }

      // Cleanup temp files
      await unlink(tempPdf).catch(() => {});
      await unlink(tempJpg).catch(() => {});
    } catch (pdfErr) {
      console.error(`  ❌ Failed to process PDF thumbnail:`, pdfErr);
    }
  }

  console.log("\n🎉 Backfill check complete!");
}

run();

