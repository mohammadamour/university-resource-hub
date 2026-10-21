import { NextResponse } from "next/server";
import dns from "node:dns";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  generateQuizWithGemini,
  expandQuizWithGemini,
} from "@/lib/pipeline/gemini-quiz";

// Enforce IPv4 to bypass Windows / Jordanian ISP IPv6 black-hole
try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // Graceful fallback
}

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/resources/[id]/quiz
 * Generates, regenerates, or expands an AI question bank for an existing resource on-demand.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const adminSecret = process.env.ADMIN_SECRET;
  const authHeader = req.headers.get("x-admin-secret");

  if (!adminSecret || authHeader !== adminSecret) {
    return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
  }

  const supabase = createAdminClient();

  // 1. Fetch resource record
  const { data: resource, error: fetchError } = await supabase
    .from("resources")
    .select("id, title, storage_url, source_text, course_id, type, quiz_data")
    .eq("id", id)
    .single();

  if (fetchError || !resource) {
    return NextResponse.json(
      { error: "المورد المطلوب غير موجود في قاعدة البيانات." },
      { status: 404 }
    );
  }

  let sourceText = resource.source_text?.trim() || "";

  // 2. If source_text is missing or too short, download PDF from storage and extract text
  if (sourceText.length < 50) {
    try {
      const storagePath = `courses/${resource.course_id}/${resource.id}.pdf`;
      const { data: fileBlob, error: downloadError } = await supabase.storage
        .from("resources")
        .download(storagePath);

      if (downloadError || !fileBlob) {
        return NextResponse.json(
          { error: `تعذر تحميل ملف الـ PDF من خادم التخزين: ${downloadError?.message || "الملف مفقود"}` },
          { status: 422 }
        );
      }

      const pdfParseModule = await import("pdf-parse");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfParse = (pdfParseModule as any).default || pdfParseModule;
      const arrayBuffer = await fileBlob.arrayBuffer();
      const parsedData = await pdfParse(Buffer.from(arrayBuffer));
      sourceText = parsedData.text?.trim() || "";

      if (sourceText.length >= 50) {
        // Persist extracted text so future regenerations are instant
        await supabase
          .from("resources")
          .update({ source_text: sourceText.slice(0, 100_000) })
          .eq("id", id);
      }
    } catch (extractErr) {
      return NextResponse.json(
        {
          error: `فشل استخراج النص من ملف الـ PDF: ${
            extractErr instanceof Error ? extractErr.message : String(extractErr)
          }`,
        },
        { status: 422 }
      );
    }
  }

  if (sourceText.length < 50) {
    return NextResponse.json(
      {
        error:
          "المحتوى النصي غير كافٍ لإنشاء كويز (قد يكون المستند ممسوحاً ضوئياً أو عبارة عن صور ممسوحة).",
      },
      { status: 422 }
    );
  }

  // Parse optional JSON body
  const body = await req.json().catch(() => ({}));
  const isExpand = body?.action === "expand";
  const customCount = typeof body?.count === "number" ? body.count : undefined;

  // 3. Generate or Expand structured quiz via hardened Gemini engine
  try {
    let finalQuizData;
    let addedCount = 0;

    // Safely parse existing quiz_data in case Supabase returns it as a string
    let existingQuizData = resource.quiz_data;
    if (typeof existingQuizData === "string") {
      try {
        existingQuizData = JSON.parse(existingQuizData);
      } catch {
        existingQuizData = null;
      }
    }

    const existingQuestionsCount = Array.isArray(existingQuizData?.questions)
      ? existingQuizData.questions.length
      : 0;

    if (isExpand && existingQuestionsCount > 0) {
      finalQuizData = await expandQuizWithGemini(
        sourceText,
        resource.title,
        existingQuizData,
        customCount
      );
      addedCount = finalQuizData.questions.length - existingQuestionsCount;

      if (addedCount <= 0) {
        throw new Error("لم يتمكن الذكاء الاصطناعي من إضافة أسئلة جديدة غير مكررة لهذه المادة.");
      }
    } else {
      // Baseline generation (8 high-yield questions default, finishes in ~5-6s well within Vercel's 15s limit)
      finalQuizData = await generateQuizWithGemini(sourceText, resource.title, customCount || 8);
      addedCount = finalQuizData.questions.length;
    }

    // 4. Save quiz_data atomically to the resource
    const { error: updateError } = await supabase
      .from("resources")
      .update({ quiz_data: finalQuizData })
      .eq("id", id);

    if (updateError) {
      throw new Error(`DB update failed: ${updateError.message}`);
    }

    return NextResponse.json({
      success: true,
      quizData: finalQuizData,
      count: finalQuizData.questions.length,
      added: addedCount,
      message: isExpand
        ? `تم توسيع بنك الأسئلة بإضافة ${addedCount} أسئلة جديدة! الإجمالي الآن: ${finalQuizData.questions.length} سؤالاً.`
        : `تم توليد بنك الأسئلة بنجاح يضم ${finalQuizData.questions.length} سؤالاً تفاعلياً!`,
    });
  } catch (aiErr) {
    console.error(`[admin-quiz] Failed to process quiz for ${id}:`, aiErr);
    return NextResponse.json(
      {
        error:
          aiErr instanceof Error ? aiErr.message : "فشل توليد أو توسيع الكويز عبر الذكاء الاصطناعي.",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/resources/[id]/quiz
 * Removes the quiz_data from a resource.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const adminSecret = process.env.ADMIN_SECRET;
  const authHeader = req.headers.get("x-admin-secret");

  if (!adminSecret || authHeader !== adminSecret) {
    return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("resources")
    .update({ quiz_data: null })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: "تم حذف بنك الأسئلة من المورد بنجاح.",
  });
}
