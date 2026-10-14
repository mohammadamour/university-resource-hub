import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import type { QuizData } from "../src/types/database";

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

interface QuizSeedJson extends QuizData {
  resourceId?: string;
  courseCode?: string;
  courseSlug?: string;
}

function validateQuizStructure(raw: unknown, filename: string): QuizSeedJson {
  if (typeof raw !== "object" || raw === null) {
    throw new Error(`File ${filename} is not a valid JSON object`);
  }

  const obj = raw as Record<string, unknown>;

  if (obj.version !== 1) {
    throw new Error(`File ${filename}: version must be 1 (got ${obj.version})`);
  }

  if (!Array.isArray(obj.questions) || obj.questions.length === 0) {
    throw new Error(`File ${filename}: questions array is missing or empty`);
  }

  for (const [i, q] of (obj.questions as unknown[]).entries()) {
    const question = q as Record<string, unknown>;
    if (
      typeof question.question !== "string" ||
      !Array.isArray(question.options) ||
      question.options.length !== 4 ||
      typeof question.correctIndex !== "number" ||
      question.correctIndex < 0 ||
      question.correctIndex > 3 ||
      typeof question.explanation !== "string"
    ) {
      throw new Error(`File ${filename}: question at index ${i} is malformed (needs question, 4 options, 0-3 correctIndex, explanation)`);
    }
  }

  return raw as QuizSeedJson;
}

async function runSeed() {
  const quizDir = path.resolve(process.cwd(), "src/quiz_seeds");

  if (!fs.existsSync(quizDir)) {
    console.error(`❌ Quiz directory not found: ${quizDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(quizDir).filter((f) => f.endsWith(".json"));

  if (files.length === 0) {
    console.log("ℹ️ No .json seed files found in src/quiz_seeds/");
    return;
  }

  console.log(`\n🔍 Found ${files.length} quiz seed file(s) in src/quiz_seeds/...\n`);

  let updatedCount = 0;
  let createdCount = 0;
  let skippedCount = 0;

  for (const file of files) {
    const filePath = path.join(quizDir, file);
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(content);
      const seedData = validateQuizStructure(parsed, file);
      const targetTitle = seedData.sourceTitle?.trim() || "";

      // 1. Try finding resource by ID if given
      if (seedData.resourceId) {
        const { data: resById, error: errById } = await supabase
          .from("resources")
          .select("id, title")
          .eq("id", seedData.resourceId)
          .single();

        if (resById && !errById) {
          const { error: updErr } = await supabase
            .from("resources")
            .update({ quiz_data: seedData })
            .eq("id", resById.id);

          if (updErr) throw updErr;
          console.log(`✅ [Updated by ID] ${file} ➔ "${resById.title}" (${resById.id})`);
          updatedCount++;
          continue;
        }
      }

      // 2. Try finding resource by exact or partial title
      if (targetTitle) {
        const { data: matchedResources, error: searchErr } = await supabase
          .from("resources")
          .select("id, title")
          .ilike("title", `%${targetTitle}%`)
          .limit(1);

        if (searchErr) throw searchErr;

        if (matchedResources && matchedResources.length > 0) {
          const matched = matchedResources[0];
          const { error: updErr } = await supabase
            .from("resources")
            .update({ quiz_data: seedData })
            .eq("id", matched.id);

          if (updErr) throw updErr;
          console.log(`✅ [Updated by Title] ${file} ➔ "${matched.title}" (${matched.id})`);
          updatedCount++;
          continue;
        }
      }

      // 3. Optional: Create a standalone quiz resource if courseCode or courseSlug is specified
      if (seedData.courseCode || seedData.courseSlug) {
        let courseQuery = supabase.from("courses").select("id, title");
        if (seedData.courseCode) {
          courseQuery = courseQuery.eq("course_code", seedData.courseCode);
        } else if (seedData.courseSlug) {
          courseQuery = courseQuery.eq("slug", seedData.courseSlug);
        }

        const { data: course, error: courseErr } = await courseQuery.single();

        if (course && !courseErr) {
          const { data: newRes, error: insertErr } = await supabase
            .from("resources")
            .insert({
              course_id: course.id,
              title: targetTitle || `كويز تجريبي - ${course.title}`,
              type: "quiz",
              storage_url: "#",
              is_admin_uploaded: true,
              status: "active",
              quiz_data: seedData,
            })
            .select("id, title")
            .single();

          if (insertErr) throw insertErr;
          console.log(`➕ [Created New Resource] ${file} ➔ "${newRes.title}" under ${course.title} (${newRes.id})`);
          createdCount++;
          continue;
        }
      }

      console.warn(
        `⚠️ [Skipped] ${file}: No matching resource found with title "${targetTitle}".` +
        `\n   ↳ Tip: Ensure a resource with this title exists in Supabase, or add "resourceId" / "courseCode" to the JSON.`
      );
      skippedCount++;
    } catch (err) {
      console.error(`❌ [Error in ${file}]:`, err instanceof Error ? err.message : err);
      skippedCount++;
    }
  }

  console.log(`\n📊 Summary: ${updatedCount} updated, ${createdCount} created, ${skippedCount} skipped.\n`);
}

runSeed().catch((err) => {
  console.error("Fatal seed error:", err);
  process.exit(1);
});
