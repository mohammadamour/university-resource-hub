# 📋 SOP: Content Curation, Verification & Upload Protocol

**Purpose:** A standardized, repeatable pipeline to curate, verify, upload, and test academic resources and auto-generated quizzes for the University Resource Hub (Molakhasat).

---

## 🎯 Phase 1: Course Selection & Triage

1. **Tier 1 (Immediate / Today's Priority):**
   - Target courses you have **already completed** and have personal notes/summaries for.
   - Examples: Introduction to IT/Programming, previous core CS courses, completed electives.
   - *Why:* Zero friction, high trust, instant content to hit the 7–10 resource target today.
2. **Tier 2 (Current High-Demand Courses):**
   - Calculus 1, Discrete Mathematics, Linear Algebra, and semester core courses.
3. **Tier 3 (Missing / External Courses):**
   - Courses you aren't currently enrolled in. Sourced via WhatsApp peers and group networks.

---

## 🔍 Phase 2: Material Sanity-Check & Verification Gate

Before uploading any PDF or summary:
1. **Feed into an LLM (Gemini Pro / GPT-4o):**
   - **Prompt Checklist:**
     - Are the core theoretical concepts and equations factually accurate?
     - Is the Arabic terminology aligned with university exam conventions?
     - Are there confusing typos, incomplete sections, or bad formatting?
     - Is the text clear and cleanly extracted (no corrupt OCR or broken tables)?
2. **Greenlight Condition:** Only upload once the document passes the sanity check without major conceptual flaws.

---

## 🚀 Phase 3: Dashboard Upload & Auto-Quiz Pipeline

1. **Admin Dashboard Upload:**
   - Navigate to `/admin/resources` in the platform.
   - Fill in metadata: Title, Course, Category (Summary, Past Exam, Placement Exam, Lecture Notes), File/Buffer.
   - Upload the verified PDF.
2. **Trigger Auto-Quiz Generation:**
   - Execute the quiz generation step via the built-in AI pipeline (`gemini-3.8-flash`).
   - Ensure questions, multiple-choice options, correct answers, and Arabic explanations are generated.
3. **End-to-End QA Test:**
   - Navigate to the live public course page (`/courses/[slug]`).
   - Open and read the newly uploaded resource in the PDF viewer.
   - Launch the interactive `<NativeQuiz />`:
     - Test option selection, instant feedback, explanation rendering, and final score calculation.
     - Verify questions are directly relevant to the uploaded document content.

---

## 📦 Phase 4: Batch Target (Today: 7–10 Resources)

- Upload a minimum of **2–3 resources per completed course** across 3–4 courses.
- Goal: Beat the "empty platform" look before tomorrow's 4 lectures begin. Classmates seeing the site must see immediate value.

---

## 📚 Phase 5: Deep-Dive Enrichment & External References (Post-Launch Batch)

For students who want comprehensive, deep understanding beyond quick summaries:
1. **Curated YouTube Playlists:**
   - **Calculus 1:** High-yield playlists (e.g., Professor Leonard, Khan Academy, or top Arabic university lecturers).
   - **Discrete Mathematics:** TrevTutor, Kimberly Brehm, or equivalent structured playlists.
   - **Linear Algebra:** 3Blue1Brown (Essence of Linear Algebra) + Gilbert Strang / Arabic equivalents.
2. **Static Syllabus & Topic Roadmap:**
   - Include a static markdown/table breakdown of key midterm topics, chapter numbers, and grade weightings.
3. **Reference Textbooks & Cheat Sheets:**
   - Link recommended open/standard textbook editions and quick-reference formula sheets.

---

## 📡 Phase 6: Acquisition Loop for Missing Courses

When you need materials for courses you don't have:
1. **WhatsApp Group Reconnaissance:**
   - Locate and join active course WhatsApp / Telegram batches.
   - Ask admins or active students for past midterm exams, student summaries, and slides.
2. **Peer Network Trade:**
   - Reach out to friends taking different courses: *"Send me your lecture slides/notes, I'll turn them into a clean summary and interactive quiz on the hub."*
3. **Slide-to-Summary Synthesis:**
   - Extract raw text from slide decks using LLM -> Synthesize into clean, structured Markdown summaries -> Export to clean PDF -> Run Phase 2 & 3.

---

## ✅ Phase 7: First 3 Uploads "Flight-Check" Checklist

Use this compact checklist for your **first 3–5 uploads** to verify the entire end-to-end machinery (SSE stream, storage, watermarking, redirect, and quiz engine) before mass-seeding:

```markdown
### ✈️ Flight-Check: Resource #[____] — [Course Name]

#### 1. Ingestion & In-Flight Pipeline
- [ ] Clean Title: Follows "Topic | Description" format (e.g., `المتغيرات والتحكم | أساسيات لغة C++`).
- [ ] Instant Ack: Received fast `202 Accepted` response.
- [ ] SSE Progress Stream: Status bar transitioned cleanly through all stages:
      `[uploading 55%] ➔ [processing 45%] ➔ [synthesizing 85%] ➔ [done 100%]`.
- [ ] Auto-Quiz Seeding: Generated quality question bank (15–50 questions) with Arabic explanations.

#### 2. Admin Manager Verification (`/admin/resources?key=...`)
- [ ] Table Entry: Row shows up immediately with correct course badge, file size, and quiz status (e.g. `35 أسئلة ✨`).
- [ ] Metadata Quick-Edit: Title or category can be modified without issues.

#### 3. Watermark & Redirect Link Fidelity
- [ ] Bottom Margin Check: PDF has subtle slate-gray footer on each page:
      `For more course summaries and resources, visit molakhasat.me/r/<resourceId>`
- [ ] Clickable Annotation: Clicking the stamped link in your PDF reader opens:
      `https://molakhasat.me/r/<resourceId>` and smoothly 307-redirects to `/courses/<slug>?ref=pdf_watermark`.

#### 4. Public Student Experience (`/courses/<slug>`)
- [ ] Course Page Grouping: Resource appears under the correct topic header.
- [ ] Mobile Touch Test: Opened on smartphone — PDF downloads immediately with zero login prompts.
- [ ] Interactive Quiz Machine:
      - [ ] Answered 2 questions: Instant green/red feedback + clear explanation.
      - [ ] Completed quiz: SVG circular score ring renders final grade accurately.
```

