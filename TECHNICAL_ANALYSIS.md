# 🧭 Molakhasat (ملخصات) — Deep Technical Analysis & Architectural Blueprint

> **LIVING TECHNICAL ARCHITECTURE MANUAL & DEVELOPER COMPANION**  
> This document is the definitive record of **why** every piece of Molakhasat was built the way it was, complete with breakdowns of tricky code snippets, environment quirks, production gotchas, and the living engineering roadmap. As you build and scale, consult and maintain this document so you never lose architectural momentum.

---

## 📑 Table of Contents

1. [The Big Picture: Mental Model & Architecture](#1-the-big-picture-mental-model--architecture)
2. [Deep Dive: The 4-Stage Ingestion Pipeline & Tricky Code Snippets](#2-deep-dive-the-4-stage-ingestion-pipeline--tricky-code-snippets)
   - [2.1 Magic Byte File Signature Verification (`%PDF-`)](#21-magic-byte-file-signature-verification-pdf-)
   - [2.2 Ghostscript PDF Compression & Exploit Neutralization](#22-ghostscript-pdf-compression--exploit-neutralization)
   - [2.3 Supabase Storage & The `ArrayBuffer` Corruption Gotcha](#23-supabase-storage--the-arraybuffer-corruption-gotcha)
   - [2.4 Eager / Speculative Client-Side Extraction via WebWorker](#24-eager--speculative-client-side-extraction-via-webworker)
   - [2.5 Robust CJS / ESM Interop for `pdf-parse`](#25-robust-cjs--esm-interop-for-pdf-parse)
   - [2.6 Decoupled On-Demand Quiz Engine & Round-Robin Key Pool](#26-decoupled-on-demand-quiz-engine--round-robin-key-pool)
3. [Deep Dive: Frontend & Interactive Components](#3-deep-dive-frontend--interactive-components)
   - [3.1 The "Topic | Title" Dynamic Grouping Pattern](#31-the-topic--title-dynamic-grouping-pattern)
   - [3.2 Next.js 16 Turbopack Segment Revalidation AST Quirk](#32-nextjs-16-turbopack-segment-revalidation-ast-quirk)
   - [3.3 The `<NativeQuiz />` 4-State Client Machine](#33-the-nativequiz--4-state-client-machine)
   - [3.4 SVG Circular Progress Ring Mathematics](#34-svg-circular-progress-ring-mathematics)
4. [Database, RLS Security & Caching Strategy](#4-database-rls-security--caching-strategy)
   - [4.1 Relational Hierarchy & "Fake Departments"](#41-relational-hierarchy--fake-departments)
   - [4.2 Row Level Security (RLS) Permission Matrix](#42-row-level-security-rls-permission-matrix)
   - [4.3 Caching & The Supabase Free-Tier Pause Defense](#43-caching--the-supabase-free-tier-pause-defense)
5. [AI Seeding Engine & Adaptive Learning Roadmap](#5-ai-seeding-engine--adaptive-learning-roadmap)
   - [5.1 Bulk Seeding Script (`scripts/seed-quizzes.ts`)](#51-bulk-seeding-script-scriptsseed-quizzests)
   - [5.2 The Master AI Prompt](#52-the-master-ai-prompt)
   - [5.3 Roadmap: 50-Question Banks & Adaptive Testing](#53-roadmap-50-question-banks--adaptive-testing)
   - [5.4 Diagnostic Mistake Remediation ("Train My Weaknesses")](#54-diagnostic-mistake-remediation-train-my-weaknesses)
6. [Phase 4 Blueprint: Server-Sent Events (SSE) Live Status Stream](#6-phase-4-blueprint-server-sent-events-sse-live-status-stream)
7. [Environment Quirks & Troubleshooting Encyclopedia](#7-environment-quirks--troubleshooting-encyclopedia)
8. [Super-Admin Resource Manager & Content Seeding Architecture](#8-super-admin-resource-manager--content-seeding-architecture)
   - [8.1 Pragmatic Zero-Auth Gate (`ADMIN_SECRET`)](#81-pragmatic-zero-auth-gate-admin_secret)
   - [8.2 What to Edit vs. What NOT to Edit (Binary Immutability)](#82-what-to-edit-vs-what-not-to-edit-binary-immutability)
   - [8.3 Atomic Storage & DB Purging (`/api/admin/resources/[id]`)](#83-atomic-storage--db-purging-apiadminresourcesid)
   - [8.4 Bidirectional RTL Formatting & Real-Time Metrics](#84-bidirectional-rtl-formatting--real-time-metrics)
9. [Strategic Roadmap & Living Engineering Backlog](#9-strategic-roadmap--living-engineering-backlog)
   - [9.1 Phase 1: Completed Architecture (The Decoupled Foundation)](#91-phase-1-completed-architecture-the-decoupled-foundation)
   - [9.2 Phase 2: Immediate Sprint Priorities (Launch Readiness)](#92-phase-2-immediate-sprint-priorities-launch-readiness)
   - [9.3 Phase 3: Student Experience & Personalization](#93-phase-3-student-experience--personalization)
   - [9.4 Phase 4: Multi-University Scaling & Advanced Admin](#94-phase-4-multi-university-scaling--advanced-admin)

---

## 1. The Big Picture: Mental Model & Architecture

### The Core Problem

University WhatsApp group chats are black holes of academic material: files get buried in minutes, links expire, students constantly re-ask for the same past exams, and freshmen are overwhelmed.

### The Molakhasat Solution

A curated, permanent, mobile-first academic hub that acts as a single source of truth. We do not try to replace WhatsApp; instead, we provide permanent, unfurlable links that students drop **inside** WhatsApp chats (`molakhasat.com/courses/calculus-1`).

### The Three UX Axioms

1. **Zero Login for Students**: Students can browse and download anything with zero registration or email prompts. (Prevents drop-off in embedded mobile webviews).
2. **Hidden Backend Complexity**: The database and routing support multiple universities, departments, instructors, and semesters, but the UI hard-assumes **Jadara University** in V1. Scaling to University #2 requires changing one constant (`DEFAULT_UNIVERSITY_SLUG`), not refactoring code.
3. **Perceived Instant Uploads**: Admins don't wait 45 seconds for Ghostscript compression, cloud upload, text parsing, and LLM calls. The server validates the file, reserves the database row, and returns `202 Accepted` in **<50ms**. Everything else runs in the background.

```
┌────────────────────────────────────────────────────────────────────────┐
│                          HIGH-LEVEL ARCHITECTURE                       │
└────────────────────────────────────────────────────────────────────────┘

 [Student on Phone]                      [Admin on /upload]
         │                                       │
         ▼                                       ▼
 ┌───────────────────────────────────────────────────────────────────────┐
 │                   Next.js 16 App Router (Turbopack)                   │
 │                                                                       │
 │  • Server Components (ISR):                                           │
 │    - /                   (revalidate = 3600s: Landing page)           │
 │    - /courses/[slug]     (revalidate = 60s: Course resources)         │
 │    - /guides/[slug]      (Static: Campus bureaucracy survival guides) │
 │                                                                       │
 │  • Interactive Client Components ("use client"):                      │
 │    - <UploadForm />      (Eager pdf.js extraction, multi-step UX)     │
 │    - <NativeQuiz />      (4-state interactive quiz player)            │
 │    - <ResourceList />    (Dynamic Topic|Title grouping, PDF viewer)   │
 └───────────────────┬───────────────────────────┬───────────────────────┘
                     │                           │
                     ▼                           ▼
        ┌─────────────────────────┐ ┌────────────────────────────────────┐
        │  Supabase (PostgreSQL)  │ │   Asynchronous Pipeline Worker     │
        │                         │ │                                    │
        │  • universities         │ │ 1. Ghostscript Compression (150DPI)│
        │  • departments          │ │ 2. Supabase Storage (.pdf)         │
        │  • courses              │ │ 3. Update DB -> status='active'    │
        │  • resources (quiz_data)│ │ 4. Gemini 3.8 Flash AI Quiz Gen    │
        │  • profiles & bookmarks │ └────────────────────────────────────┘
        └─────────────────────────┘
```

---

## 2. Deep Dive: The 4-Stage Ingestion Pipeline & Tricky Code Snippets

When an admin uploads a file via `POST /api/upload`, here is the exact code execution path:

```
POST /api/upload
  ├── 1. Auth Gate: Validate x-admin-secret header === process.env.ADMIN_SECRET
  ├── 2. Size Gate: Reject 0-byte or >30MB files
  ├── 3. Declared MIME Gate: Reject non-application/pdf
  ├── 4. Magic Byte Gate: Verify ASCII "%PDF-" in first 1024 bytes (ISO 32000-1)
  ├── 5. DB Reservation: Insert row with status='processing' and get UUID
  ├── 6. HTTP 202 Response: Sent back to client stepper in <50ms
  └── 7. processFileInBackground(rawBuffer, resourceId, ...) (FIRE-AND-FORGET)
            │
            ├── Stage 2: Ghostscript Compression (Optional / local only)
            ├── Stage 3: Supabase Storage Upload (Buffered binary)
            ├── Stage 4: DB Update (Mark active, set public storage URL)
            └── Stage 5: Gemini 3.8 Flash AI Quiz Generation -> update quiz_data
```

---

### 2.1 Magic Byte File Signature Verification (`%PDF-`)

- **File:** [`src/app/api/upload/route.ts`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/app/api/upload/route.ts)
- **Why it's needed:** A user or attacker can rename `malicious.exe` or `image.png` to `notes.pdf` and send `Content-Type: application/pdf`. Checking MIME type alone is a severe security vulnerability.
- **The Code:**

  ```typescript
  // Read first 1024 bytes into a Uint8Array
  const rawBuffer = await file.arrayBuffer();
  const headerSlice = new Uint8Array(rawBuffer.slice(0, 1024));
  const headerText = new TextDecoder("ascii").decode(headerSlice);

  if (!headerText.includes("%PDF-")) {
    return Response.json(
      {
        error:
          "INVALID_PDF_SIGNATURE: File content is not a valid PDF document.",
      },
      { status: 422 },
    );
  }
  ```

- **How it works:** Under ISO 32000-1, valid PDF documents are required to begin with `%PDF-` followed by the version (e.g. `%PDF-1.4`). Looking within the first 1024 bytes accounts for minor byte-order marks (BOM) or leading comments while ensuring genuine PDF binary structure.

---

### 2.2 Ghostscript PDF Compression & Exploit Neutralization

- **File:** [`src/lib/pipeline/ghostscript.ts`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/lib/pipeline/ghostscript.ts)
- **Why it's needed:** Phone camera scans produce 30MB–50MB files. Ghostscript downsamples images and strips potential PDF exploits (malicious embedded JavaScript, corrupt xref tables).
- **The Code:**
  ```typescript
  const args = [
    "-sDEVICE=pdfwrite",
    "-dCompatibilityLevel=1.4",
    "-dPDFSETTINGS=/ebook", // 150 DPI: ideal balance for mobile screens
    "-dNOPAUSE",
    "-dQUIET",
    "-dBATCH",
    "-dColorImageResolution=150",
    "-dGrayImageResolution=150",
    "-dMonoImageResolution=300",
    "-dDownsampleColorImages=true",
    `-sOutputFile=${outputPath}`,
    inputPath,
  ];
  ```
- **The Serverless Constraint:** Vercel/AWS Lambda containers do not include the Ghostscript binary. We gate compression behind `process.env.NEXT_PUBLIC_ENABLE_COMPRESSION === "true"`. If running locally, you enable it (`winget install ArtifexSoftware.GhostScript`); if running on Vercel, it safely skips compression and uploads the original file without crashing.

---

### 2.3 Supabase Storage & The `ArrayBuffer` Corruption Gotcha

- **File:** [`src/app/api/upload/route.ts`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/app/api/upload/route.ts)
- **The Subtle Bug:** When uploading to Supabase Storage via `supabase.storage.from(...).upload()`, passing a native Web `ArrayBuffer` directly can cause silent binary truncation or corruption depending on the Node runtime adapter.
- **The Fix:**

  ```typescript
  // Convert ArrayBuffer -> Node.js Buffer so binary streams serialize flawlessly
  const fileBuffer = Buffer.from(finalBuffer);

  const { error: storageError } = await supabase.storage
    .from("resources")
    .upload(filePath, fileBuffer, {
      contentType: "application/pdf",
      cacheControl: "public, max-age=31536000, immutable", // UUIDs never mutate
      upsert: false,
    });
  ```

- **Cache Strategy:** Because each file path is keyed by an immutable UUID (`courses/${courseId}/${resourceId}.pdf`), we set `max-age=31536000, immutable` (1 year). CDNs and student browsers cache the PDF indefinitely with zero re-download requests.

---

### 2.4 Eager / Speculative Client-Side Extraction via WebWorker

- **File:** [`src/lib/pipeline/client-pdf-extractor.ts`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/lib/pipeline/client-pdf-extractor.ts) & [`UploadForm.tsx`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/components/features/UploadForm.tsx)
- **Why it's needed:** Server-side PDF text extraction consumes heavy CPU/RAM. If 10 users upload simultaneously, server memory can spike.
- **The Innovation:** The moment a user drops a PDF into the form, a client-side WebWorker starts extracting text while the user is busy typing the resource title!
- **The Code:**

  ```typescript
  export async function extractTextFromPdf(file: File): Promise<string | null> {
    const pdfjsLib = await import("pdfjs-dist");

    // Self-hosted worker in /public/workers: zero external CDN dependency,
    // immune to university Wi-Fi blocks, and CSP compliant.
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/workers/pdf.worker.min.mjs";

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = "";
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      if (fullText.length >= 300_000) break; // Capped at 300k chars (~50k words)
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      fullText +=
        content.items.map((item) => ("str" in item ? item.str : "")).join(" ") +
        "\n";
    }
    return fullText.trim().slice(0, 300_000) || null;
  }
  ```

- **How It Connects:** `UploadForm.tsx` fires this speculative effect on file change. When the user toggles "Generate Quiz" and clicks Submit, `formData.append("sourceText", extractedSourceText)` sends the pre-parsed text. The server sees `sourceText` is already provided and **skips `pdf-parse` completely**!

---

### 2.5 Robust CJS / ESM Interop for `pdf-parse`

- **File:** [`src/app/api/upload/route.ts`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/app/api/upload/route.ts)
- **The Gotcha:** Depending on whether Next.js runs under Turbopack, Webpack, or native Node ESM, `import("pdf-parse")` can return either `{ default: [Function] }` or the callable function directly. Calling `(await import("pdf-parse")).default()` can throw `TypeError: pdfParse is not a function`.
- **The Defensive Code:**
  ```typescript
  const pdfParseModule = await import("pdf-parse");
  // Handles both CommonJS module.exports and ESM default export
  const pdfParse = (pdfParseModule as any).default || pdfParseModule;
  const pdfData = await pdfParse(Buffer.from(finalBuffer));
  sourceText = pdfData.text?.trim() ?? null;
  ```

---

### 2.6 Decoupled On-Demand Quiz Engine & Round-Robin Key Pool

- **Files:** [`src/lib/pipeline/gemini-quiz.ts`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/lib/pipeline/gemini-quiz.ts), [`src/app/api/admin/resources/[id]/quiz/route.ts`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/app/api/admin/resources/%5Bid%5D/quiz/route.ts), [`scripts/verify-gemini-pool.mjs`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/scripts/verify-gemini-pool.mjs)
- **The Decoupling Paradigm:**
  Previously, file uploads awaited AI quiz generation, exposing the ingestion pipeline to timeouts, daily quota exhaustion (`429 RESOURCE_EXHAUSTED`), and Windows IPv6 socket freezes. In the decoupled architecture:
  1. **Uploads are 100% Deterministic (< 2.5s):** [`/api/upload`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/app/api/upload/route.ts) strictly performs validation, referral watermarking (`molakhasat.me/r/:id`), and Supabase storage upload. The resource is immediately marked `status: 'active'`, releasing the user instantly.
  2. **Quizzes are On-Demand & Curated:** Admins trigger quiz synthesis selectively via [`AdminResourceManager.tsx`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/components/features/AdminResourceManager.tsx) (`[⚡ توليد كويز]` and `[🔄 إعادة توليد]`), preventing quota waste on formula sheets, slides, or past exams that do not warrant a multiple choice bank.
- **Round-Robin Multi-Key Pool (`GEMINI_API_KEYS`):**
  Supports comma-separated keys (`GEMINI_API_KEYS="key1,key2,key3,key4"`). Successive synthesis calls rotate their starting account via `roundRobinIndex`. This distributes requests evenly across all configured Google accounts, preventing any single account from exhausting its 15 RPM (Requests Per Minute) rate limit or 20 RPD daily quota.
- **429 Cooldown & Dead-Key Blacklisting:**
  If an API key triggers `429 RESOURCE_EXHAUSTED`, it is tagged with a 5-minute cooldown (`keyCooldowns.set(apiKey, Date.now() + 5 * 60 * 1000)`). The engine immediately fails over to the next candidate key. Crucially, subsequent synthesis requests automatically **skip** cooling keys, saving ~1.5s round-trip latency on known-dead accounts.
- **Automated Pool Verification (`npm run test:keys`):**
  Developers can verify key pool health anytime via `npm run test:keys` (`scripts/verify-gemini-pool.mjs`), which enforces IPv4 DNS resolution and tests each key against `gemini-3.5-flash` with sub-token latency reporting.
- **Candidate Model Fallback Chain:**
  `gemini-3.5-flash` (primary, high quota) → `gemini-flash-lite-latest` (ultra-fast fallback) → `gemini-3.8-flash`.
- **Zero Thinking Budget (`thinkingBudget: 0`):**
  Models with built-in reasoning tokens default to `thinking: true`, spending 15+ seconds thinking before returning tokens. Enforcing `thinkingConfig: { thinkingBudget: 0 }` reduces API latency to < 1.5 seconds.
- **Strict JSON Enforcement & Regex Sanitizer:**
  ````typescript
  generationConfig: {
    temperature: 0.25,
    responseMimeType: "application/json",
    thinkingConfig: { thinkingBudget: 0 },
  }
  ````
- **Validation Before Persistence:** `validateQuizData()` verifies question integrity (4 choices, 0-indexed correct answer, valid Arabic explanations, and valid difficulty levels).

---

### 2.7 Serverless Execution Protection via Next.js `after()`

- **File:** [`src/app/api/upload/route.ts`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/app/api/upload/route.ts)
- **The Pitfall:** On serverless infrastructure (Vercel, AWS Lambda), as soon as `return Response.json(..., { status: 202 })` sends the HTTP response header to the browser, the runtime freezes or tears down the micro-container. Any unawaited fire-and-forget Promise gets abruptly cut off mid-execution, leaving uploads stuck in `processing`.
- **The Solution:** Next.js 15+ `after()` from `next/server`:

  ```typescript
  after(async () => {
    await processFileInBackground(
      rawBuffer,
      resourceId,
      courseId,
      generateQuiz,
      sourceText,
      title,
    );
  });

  return Response.json({ resourceId, status: "processing" }, { status: 202 });
  ```

- **How it works:** `after()` allows the route handler to respond immediately (< 150ms) to the user's browser, while signaling the serverless execution environment to keep the container alive until the asynchronous background closure has resolved.

---

### 2.8 Auto-Watermarking Engine (The Organic Referral Loop)

- **File:** [`src/lib/pipeline/watermark.ts`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/lib/pipeline/watermark.ts) & [`src/app/api/upload/route.ts`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/app/api/upload/route.ts)
- **The Strategy:** Directly implements the viral growth loop from the README vision: when students download and forward summaries in private WhatsApp or Telegram groups, each page carries a subtle, permanent attribution stamp (`Indexed via Molakhasat • molakhasat.com — Academic Resource Hub`).
- **Pure JavaScript Implementation (`pdf-lib`):**
  - Requires **zero C++ binaries**, making it 100% portable across Windows, Linux, Docker, and Vercel Serverless.
  - Dynamically calculates `(pageWidth - textWidth) / 2` to center the footer horizontally across any document aspect ratio (A4, Letter, custom scans).
  - Uses `StandardFonts.Helvetica` with subtle opacity (`0.55`) and slate-gray tint (`rgb(0.35, 0.42, 0.52)`) positioned at `y = 14`, ensuring lecture content and diagrams are never occluded.
  - **Defensive Design:** Wrapped in try/catch to ensure corrupted or encrypted PDFs fallback gracefully without halting the upload pipeline.

---

## 3. Deep Dive: Frontend & Interactive Components

### 3.1 The "Topic | Title" Dynamic Grouping Pattern

- **File:** [`src/components/features/ResourceList.tsx`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/components/features/ResourceList.tsx)
- **The Problem:** Creating sub-categories or chapters in SQL requires extra tables (`chapters`, `topics`) with foreign keys, joins, and admin selectors. This creates massive friction for a 20-day MVP.
- **The Elegant Hack:** We use a simple pipe delimiter (`|`) in the resource title:
  - `"تفاضل 1 | ملخص النهايات والاتصال"`
  - `"تفاضل 1 | أسئلة سنوات على الاشتقاق"`
- **The Code:**

  ```typescript
  const parsedStudyMaterials = studyMaterials.map((resource) => {
    const parts = resource.title.split("|");
    if (parts.length > 1) {
      return {
        ...resource,
        topic: parts[0].trim(), // "تفاضل 1"
        displayTitle: parts.slice(1).join("|").trim(), // "ملخص النهايات والاتصال"
      };
    }
    return { ...resource, topic: "عام", displayTitle: resource.title };
  });

  const hasTopics = parsedStudyMaterials.some((r) => r.topic !== "عام");
  ```

- **Result:** If titles have `|`, the UI automatically renders grouped topic sections with distinct cards! If not, it defaults to standard resource-type grouping. Zero database schema migrations required.

---

### 3.2 Next.js 16 Turbopack Segment Revalidation AST Quirk

- **Files:** [`src/app/page.tsx`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/app/page.tsx) & [`src/app/courses/[slug]/page.tsx`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/app/courses/%5Bslug%5D/page.tsx)
- **The Error:** `⨯ "revalidate" has an invalid value: "undefined". It must be a non-negative number or "false".`
- **Why it happened:** In Next.js 16 App Router, Turbopack analyzes route segment configs statically via AST parsing **before module code executes**.
  - ❌ `export const revalidate = REVALIDATE_LANDING;` (Turbopack cannot resolve imported variables during static AST analysis).
  - ✅ `export const revalidate = 3600;` (Literal number passes AST verification).

---

### 3.3 The `<NativeQuiz />` 4-State Client Machine

- **File:** [`src/components/features/NativeQuiz.tsx`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/components/features/NativeQuiz.tsx)
- Pure client component managing 4 distinct visual states:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      NATIVE QUIZ STATE TRANSITIONS                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  State 1: Closed                                                        │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ 🎯 كويز تفاعلي لاختبار الفهم [10 أسئلة]       [ ابدأ الكويز 🎯 ]  │  │
│  └─────────────────────────────────┬─────────────────────────────────┘  │
│                                    │ (User clicks button)               │
│                                    ▼                                    │
│  State 2: In-Progress                                                   │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ السؤال 3 من 10  [=====>               ] 30%            النقاط: 2  │  │
│  │ ما هو التعقيد الزمني لخوارزمية البحث الثنائي؟                      │  │
│  │ [أ] O(1)    [ب] O(n)    [ج] O(log n)    [د] O(n^2)                │  │
│  └─────────────────────────────────┬─────────────────────────────────┘  │
│                                    │ (User clicks option or keys 1-4)   │
│                                    ▼                                    │
│  State 3: Answered                                                      │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ [أ] O(1) [ب] O(n) [ج] O(log n) ✓ (Green) [د] O(n^2) ✕ (Red)       │  │
│  │ 💡 توضيح الإجابة: لأن الخوارزمية تقسم نطاق البحث إلى النصف...     │  │
│  │                                              [ السؤال التالي ⬅ ]  │  │
│  └─────────────────────────────────┬─────────────────────────────────┘  │
│                                    │ (On final question click)          │
│                                    ▼                                    │
│  State 4: Results & Score Card                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                         [  80%  ]                                 │  │
│  │                      8 من 10 أسئلة                                │  │
│  │ 🎉 ممتاز! أداء رائع ومتميز                                        │  │
│  │ [ 8 صحيحة ]  [ 2 خاطئة ]  [ 10 المجموع ]                          │  │
│  │ [ إعادة الكويز 🔄 ]  [ مراجعة تفصيلية 📋 ]  [ إنهاء ✕ ]          │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### 3.4 SVG Circular Progress Ring Mathematics

- **File:** [`src/components/features/NativeQuiz.tsx`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/components/features/NativeQuiz.tsx)
- **The Formula:**
  - Circle radius $r = 45$.
  - Total circumference $C = 2 \times \pi \times r \approx 282.74$.
  - Stroke Dashoffset: $\text{offset} = C - \left(\frac{\text{score}}{\text{total}}\right) \times C$.
- **The Code:**

  ```tsx
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (scorePercentage / 100) * circumference;

  <svg className="h-32 w-32 -rotate-90 transform" viewBox="0 0 100 100">
    {/* Background Track */}
    <circle
      cx="50"
      cy="50"
      r={radius}
      className="stroke-secondary"
      strokeWidth="8"
      fill="transparent"
    />
    {/* Animated Score Fill */}
    <circle
      cx="50"
      cy="50"
      r={radius}
      className="stroke-accent transition-all duration-1000 ease-out"
      strokeWidth="8"
      strokeDasharray={circumference}
      strokeDashoffset={strokeDashoffset}
      strokeLinecap="round"
      fill="transparent"
    />
  </svg>;
  ```

- Rotating `-90deg` ensures the progress ring starts filling from the **12 o'clock** position instead of 3 o'clock.

---

## 4. Database, RLS Security & Caching Strategy

### 4.1 Relational Hierarchy & "Fake Departments"

The database schema (`supabase/schema.sql`) uses a 4-tier hierarchy:

```
universities (Jadara)
   └── departments (IT, English, ...)
          └── courses (CS101, Calculus, ...)
                 └── resources (PDFs, Quizzes, Links)
```

- **The "Fake Department" Strategy:** University-wide requirements (National Education, Military Sciences, Life Skills) and Placement Exam prep are modeled directly as **departments** in the `departments` table.
- **Why:** Avoids creating complex many-to-many relationship join tables (`course_departments`). Every course belongs to one department slug, keeping Supabase joins simple and fast: `.select("*, courses(*)")`.

---

### 4.2 Row Level Security (RLS) Permission Matrix

| Role                      | Universities / Departments / Courses | Resources (Read)  |     Resources (Write)     |      Bookmarks      |
| :------------------------ | :----------------------------------: | :---------------: | :-----------------------: | :-----------------: |
| **Guest (Anon)**          |           SELECT (Public)            |  SELECT (Public)  |         ❌ Denied         |      ❌ Denied      |
| **User (Student)**        |           SELECT (Public)            |  SELECT (Public)  |         ❌ Denied         | ALL (own rows only) |
| **Admin (Ambassador)**    |           SELECT (Public)            |  SELECT (Public)  | ALL (own department only) | ALL (own rows only) |
| **Super Admin (Founder)** |          ALL (Full Access)           | ALL (Full Access) |     ALL (Full Access)     |  ALL (Full Access)  |

- **Security Note:** All guest queries use the Supabase public `anon` key. Security is not enforced by hiding the key; it is enforced by PostgreSQL RLS policies directly inside the database.

---

### 4.3 Caching & The Supabase Free-Tier Pause Defense

- **The Risk:** Supabase free-tier projects automatically pause after **7 days of database inactivity**, which can bring down the entire site right before an exam.
- **The Defense:**
  1. Next.js **Incremental Static Regeneration (ISR)** caches landing pages for `3600s` and course pages for `60s`.
  2. Scheduled GitHub Action or uptime monitor pinging `/api/courses` every 24 hours generates active query traffic, preventing Supabase from ever triggering the auto-pause sequence.

---

## 5. AI Seeding Engine & Adaptive Learning Roadmap

### 5.1 Bulk Seeding Script (`scripts/seed-quizzes.ts`)

Instead of typing questions one by one, admins generate quizzes using external models (Gemini, Claude, ChatGPT), save them to `src/quiz_seeds/*.json`, and run:

```bash
npm run seed:quizzes
```

- **The Script Execution Logic:**
  1. Reads all `.json` files in `src/quiz_seeds/`.
  2. Validates JSON against `QuizData` schema (version 1, 4 options, valid correctIndex).
  3. **Idempotent Matcher**:
     - Matches existing summary by `sourceTitle` or `resourceId` ➔ Updates `quiz_data`.
     - If no resource matches, but `courseSlug` is specified ➔ Auto-inserts a new resource of type `'quiz'` under that course!
     - Running the script 10 times updates records safely without creating duplicates.

---

### 5.2 The Master AI Prompt

Always use this prompt in Gemini / Claude / ChatGPT to generate 100% compliant quiz JSON:

```text
أنت مصمم كويزات تعليمية لطلاب الجامعة.
بناءً على المادة العلمية المرفقة، قم بتوليد كويز اختيار من متعدد بصيغة JSON صارمة فقط دون أي مقدمات أو علامات markdown (NO markdown fences, pure JSON).

القواعد:
1. عدد الأسئلة: 10 أسئلة (أو حدد العدد المطلوب).
2. كل سؤال يحتوي على 4 خيارات فقط (A, B, C, D).
3. رقم الإجابة الصحيحة correctIndex يبدأ من 0 (0 = الخيار الأول، 1 = الثاني، 2 = الثالث، 3 = الرابع).
4. الشرح explanation باللغة العربية يوضح مفهوم الإجابة وسبب صحتها.
5. توزيع الصعوبة: 40% سهل، 40% متوسط، 20% متقدم/استنتاجي.
6. لا تكرر الخيارات أو الأسئلة.

الهيكل المطلوب بدقة:
{
  "version": 1,
  "generatedAt": "2026-10-14T00:00:00.000Z",
  "sourceTitle": "تفاضل وتكامل 1 | كويز تجريبي على النهايات والاتصال",
  "courseSlug": "calculus-1",
  "questions": [
    {
      "question": "نص السؤال هنا؟",
      "options": ["خيار 1", "خيار 2", "خيار 3", "خيار 4"],
      "correctIndex": 0,
      "explanation": "الشرح التوضيحي هنا...",
      "difficulty": "medium",
      "topic": "النهايات"
    }
  ]
}

المادة العلمية:
[الصق نص المحاضرة أو الملخص هنا]
```

---

### 5.3 Dynamic Question Banks & Adaptive Testing Engine (Completed)

- **The Problem with 10-Question Static Quizzes**: Once a student takes it, memorizes the answers, and scores 100%, the quiz has zero replay value. Furthermore, fixed counts fail on either thin 4-page cheat-sheets (hallucinates repeat questions) or 150-page course booklets (omits 80% of the syllabus).
- **The Sizing Formula (`src/lib/pipeline/gemini-quiz.ts`)**:
  - `< 8,000 chars` (~1–4 pages, cheat-sheets): **15 questions**
  - `8,000 – 25,000 chars` (~5–12 pages, single lectures): **25 questions**
  - `25,000 – 60,000 chars` (~13–30 pages, chapter summaries): **35 questions**
  - `> 60,000 chars` (30+ pages, full syllabus booklets): **50 questions**
- **Dynamic Sampling with Priority Backfill (`sampleAndShuffle`)**:
  - `<NativeQuiz />` provides decoupled controls for **Volume** (5, 10 [Default], 20, All) and **Difficulty** (Balanced [Default: 40% Easy, 40% Med, 20% Hard], Easy, Medium, Hard).
  - If a student requests 20 "Hard" questions from a bank that only has 10, the algorithm takes all 10 hard questions and backfills 10 from medium, displaying a friendly Arabic toast.
- **Dynamic In-Session Option Shuffling (`shuffleQuestionOptions`)**:
  - When a question mounts, options are shuffled using Fisher-Yates and `correctIndex` is remapped to match the correct option's new position. This completely eliminates letter/position memorization traps.

---

### 5.4 Student Progress & Diagnostic Telemetry Architecture (Completed)

- **Hybrid Identity Tracking**:
  - Guests generate an anonymous UUID (`guest_session_id`) in `localStorage` (`getOrCreateGuestId()`).
  - Authenticated students automatically attach `profiles.id` (`user_id`).
- **Database Tables (`supabase/migrations/20261016_quiz_tracking.sql`)**:
  - `quiz_attempts`: Session-level metrics (score, percentage, difficulty mode, duration in seconds, `guest_session_id`, `user_id`).
  - `quiz_attempt_answers`: Question-level diagnostics (`question_text`, `selected_option`, `correct_option`, `is_correct`, `topic`, `difficulty`).
- **Fire-and-Forget Beacon (`/api/quiz/record-attempt/route.ts`)**:
  - Sent asynchronously upon quiz completion via `fetch(..., { keepalive: true })`. The UI never stutters or waits for database writes.
  - Ready to power V2's _"Train My Weaknesses"_ dashboard by aggregating student mistakes by `topic`.

---

## 6. Phase 4: Server-Sent Events (SSE) Live Telemetry Stream (Completed)

Previously, the upload UI advanced pipeline steps using a client-side simulated delay. Phase 4 replaced this with **real-time, zero-latency server-sent events** backed by an in-memory event bus and a resilient database fallback.

```
[UploadForm Client]
       │
       │  1. POST /api/upload (FormData)
       ├────────────────────────────────────────► [/api/upload Handler]
       │  2. Returns 202 { resourceId } in <150ms  │ Kicks off background worker:
       │◄─────────────────────────────────────────┤ (Compress → Storage → Gemini)
       │
       │  3. Connects to SSE Stream
       │     GET /api/upload/progress/[resourceId]
       ├────────────────────────────────────────► [/api/upload/progress/[resourceId]]
       │                                           │
       │  ◄── data: {"stage": "uploading", ...} ──┤ ◄── ProgressBus Pub/Sub (0ms)
       │  ◄── data: {"stage": "processing", ...} ─┤     + Supabase Polling Fallback (2s)
       │  ◄── data: {"stage": "synthesizing",...} ┤
       │  ◄── data: {"stage": "done", ...} ───────┤
       │  ◄── Stream closed (controller.close())  ┘
```

### 6.1 The Dual-Engine Progress Architecture

1. **In-Memory `ProgressBus` (`src/lib/pipeline/progress-bus.ts`)**:
   - Background stages publish granular events (`uploading` → `processing` → `synthesizing` → `done` / `error`).
   - Active SSE connections receive events **instantly via Node.js EventEmitter**, eliminating unnecessary database read spam.
   - Includes a 10-minute sliding TTL cache so late-connecting or reconnecting clients immediately receive the latest state.
2. **Supabase Database Polling Fallback**:
   - Every 2.0 seconds, the SSE route queries the `resources` table (`status`, `storage_url`, `source_text`, `quiz_data`).
   - If the serverless instance restarted or the client connected late, the fallback detects when `status === 'active'` (marks `done`) or `status === 'rejected'` (marks `error`).
   - Guarantees eventual consistency even across distributed/multi-container deployments.

### 6.2 Key Environment & Runtime Quirks Solved

- **Next.js 16 Dynamic Route Params**: `params` in route handlers is a `Promise<{ resourceId: string }>` and must be awaited before accessing `params.resourceId`.
- **Custom Header Auth vs EventSource**: Native browser `EventSource` cannot transmit headers (e.g., `x-admin-secret`). The SSE route accepts both `x-admin-secret` (used by `UploadForm.tsx` via `fetch()`) and URL query `?key=ADMIN_SECRET`.
- **Zombie Stream & Memory Leak Prevention**:
  - `req.signal.addEventListener("abort")` unbinds all bus listeners and cancels intervals when the client disconnects.
  - A 70-second hard safety timeout forcibly terminates abandoned streams.
  - Proxy buffering disabled via `X-Accel-Buffering: no` and `Cache-Control: no-cache, no-transform`.

### 6.3 Event Payload Contract

```typescript
export interface PipelineProgressEvent {
  stage: "uploading" | "processing" | "synthesizing" | "done" | "error";
  percent: number; // 0 to 100
  message: string; // User-facing localized Arabic status message
  resourceId?: string; // Database UUID
  error?: string; // Present only when stage === 'error'
  timestamp: number; // Unix epoch ms
}
```

---

## 7. Environment Quirks & Troubleshooting Encyclopedia

### 1. Supabase IPv6 Issue on Local Networks

- **Symptom**: Instant network timeout or `InterfaceError: connection to server at "db.[project].supabase.co" failed: Connection timed out`.
- **Cause**: Local Jordanian/regional ISP does not support IPv6 routing.
- **Rule**: NEVER use the direct host `db.[project].supabase.co`. ALWAYS use the **Session Pooler** endpoint (`aws-0-[region].pooler.supabase.com:5432`) which resolves cleanly to IPv4.

### 2. Node.js DNS Resolution (`ipv4first`)

- **Symptom**: `fetch()` calls to Gemini API or external CDNs take 30+ seconds to respond or fail.
- **Cause**: Node 18+ resolves IPv6 (AAAA) before IPv4 (A). If the network drops IPv6 packets, Node hangs until timeout before falling back to IPv4.
- **Fix**: Apply `dns.setDefaultResultOrder('ipv4first')` in server-side scripts or configuration.

### 3. Next.js 16 App Router Turbopack Segment Revalidation

- **Symptom**: `⨯ "revalidate" has an invalid value: "undefined"`.
- **Cause**: AST static analysis does not evaluate imported constants like `export const revalidate = REVALIDATE_COURSE;`.
- **Fix**: Use literal numbers: `export const revalidate = 60;` or `export const revalidate = 3600;`.

### 4. Repository Openness & Living Architectural Documentation

- `TECHNICAL_ANALYSIS.md` is intentionally tracked in Git as a first-class living document. Rather than keeping design rationale, state machines, and environment lessons siloed in developer memory or scattered across chat transcripts, this master blueprint is committed alongside the codebase. It ensures zero context loss across developer cycles, transparent technical accountability, and seamless agent continuation.

---

## 8. Super-Admin Resource Manager & Content Seeding Architecture

### 8.1 Pragmatic Zero-Auth Gate (`ADMIN_SECRET`)

- During the MVP phase, multi-tenant authentication and permission hierarchies (department ambassadors vs. students) introduce unnecessary friction before content density is established.
- Both `/upload` and `/admin/resources` require `?key=${ADMIN_SECRET}`. Without this key matching `process.env.ADMIN_SECRET`, Next.js throws an immediate `notFound()` 404 to avoid exposing administrative presence.
- A shared `<AdminTabs />` component preserves `?key=${adminSecret}` across internal navigation (`[ 📤 رفع مادة جديدة ]` ⟷ `[ 🗂️ إدارة الموارد المرفوعة ]`).

### 8.2 What to Edit vs. What NOT to Edit (Binary Immutability)

- **Safe to Edit (Metadata):**
  - `title`: Fix typos (e.g., "شابتر 1 | تفاضل وتكامل") without re-processing 20MB PDFs.
  - `course_id`: Re-assign mistaken uploads to their rightful courses.
  - `type`: Change categorization (`summary`, `past_exam`, `guide`, `other`).
  - `status`: Toggle between `active` (visible to students), `pending`, `processing`, and `rejected`.
- **Immutable by Design (The PDF Binary):**
  - Replacing the binary payload in-place introduces severe cache invalidation gotchas, watermarked link desynchronization, and stale question bank artifacts.
  - If a file is wrong, the super-admin performs an atomic delete and re-uploads with clean ingestion.

### 8.3 Atomic Storage & DB Purging (`/api/admin/resources/[id]`)

- **DELETE Workflow:**
  1. Header authentication check via `x-admin-secret`.
  2. Query `resources` table with `SUPABASE_SERVICE_ROLE_KEY` to retrieve `course_id`.
  3. Derive storage path: `courses/${resource.course_id}/${resource.id}.pdf`.
  4. Purge physical binary from Supabase Storage bucket (`resources`).
  5. Delete database record in `resources` (cascading to `quiz_attempts` and `quiz_attempt_answers`).
  6. Return atomic confirmation for client-side optimistic UI removal.

### 8.4 Bidirectional RTL Formatting & Real-Time Metrics

- In Arabic RTL layouts (`dir="rtl"`), fractional numbers containing slashes (e.g., `{coursesWithContent} / {courses.length}`) are inverted by the Unicode Bidirectional Algorithm (Bidi).
- Enforcing `dir="ltr"` on numerical fractions ensures counters like `2 / 12` render in their natural mathematical order.
- Each resource entry provides one-click testing via the evergreen shortlink `/r/:id`, ensuring watermarked link fidelity before public student access.

---

---

## 9. Strategic Roadmap & Living Engineering Backlog

This living backlog serves as the authoritative North Star for future development sessions. It bridges high-level vision from [`README.md`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/README.md) with ground-level architectural realities.

### 9.1 Phase 1: Completed Architecture (The Decoupled Foundation)
*Status: Shipped & Hardened (October 2026)*

- [x] **Decoupled Upload Pipeline:** Purged blocking synchronous/background AI generation from `/api/upload`. Ingestion completes deterministically in `< 2.5s` with referral watermarks (`molakhasat.me/r/:id`).
- [x] **Multi-Account Gemini Key Pool:** Configured `GEMINI_API_KEYS` support with 4 active developer accounts to quadruple free-tier daily quotas.
- [x] **Round-Robin Load Balancing:** Rotates initial account index across synthesis calls to evenly distribute RPM (Requests Per Minute) and RPD (Requests Per Day).
- [x] **Automatic 429 Cooldown & Dead-Key Blacklisting:** Flags exhausted accounts with a 5-minute cooldown (`keyCooldowns`), instantly skipping dead keys on subsequent runs without wasted network round-trips.
- [x] **Automated Key Verifier CLI:** Added `npm run test:keys` (`scripts/verify-gemini-pool.mjs`) to test the entire key pool with forced IPv4 resolution and sub-token latency benchmarks.
- [x] **On-Demand Admin Quiz Synthesis:** Created `/api/admin/resources/[id]/quiz` (`POST`/`DELETE`) and integrated inline actions (`[⚡ توليد كويز]` / `[🔄 إعادة توليد]`) into `/admin/resources`.
- [x] **GitHub Linguist Fix:** Vendored PDF.js worker in `.gitattributes` to correct repository language classification from 83% JavaScript back to TypeScript.

---

### 9.2 Phase 2: Immediate Launch Sprint (Seed & Polish)
*Target: Freshman Semester Kickoff (Jadara University)*

- [ ] **Content Seeding Engine (7 Core Courses):**
  - Populate initial high-yield summaries for Calculus 1, C++, Data Structures, Discrete Math, Linear Algebra, and University Electives (National Education, Military Sciences) strictly following [`Content_Upload_SOP.md`](file:///c:/Users/somet/Downloads/Coding/Personal/Content_Upload_SOP.md).
- [ ] **Dynamic Homepage Metrics (`/`):**
  - Replace static/mock counters on course cards with live Supabase relational aggregations (`{resource_count} ملخص • {quiz_count} كويز`).
- [ ] **IT Student Community Portal:**
  - Embed direct Telegram/WhatsApp feedback group invite link in the application footer for freshman peer support and bug reporting.
- [ ] **Admin Question Bank Expansion Action:**
  - Build an admin-triggered "Expand Bank" feature that prompts Gemini for an additional 15–25 questions on an existing quiz, appending them into `quiz_data` to grow banks to 50+ questions over time.
- [ ] **Verified Contributor Badges:**
  - Display "Uploaded by Admin" or "Curated by Ethan" badge on verified summary detail cards to establish trust.

---

### 9.3 Phase 3: Student Personalization & Engagement
*Target: Mid-Semester Adoption & Retention*

- [ ] **Client-Side Favorites & Bookmarks:**
  - Provide one-tap bookmarking on course cards and individual summaries stored in `localStorage` (with seamless Supabase sync when logged in) for instant mobile retrieval during exam week.
- [ ] **Frictionless Auth & Basic Student Profiles:**
  - Implement zero-barrier authentication (Supabase Auth via Magic Links or Google/Telegram OAuth).
  - **Golden Architectural Rule:** *Zero-login guest reading must never be broken.* Unauthenticated visitors can always read and download freely; profiles simply unlock cloud bookmarks, quiz history, and weak-point analytics.
- [ ] **Diagnostic Mistake Remediation ("Train My Weaknesses"):**
  - Store student quiz attempt history in `quiz_attempts` / `quiz_attempt_answers`.
  - Introduce an adaptive drill mode filtering only previously missed questions grouped by Arabic topic tags (e.g., "أخطائي في المصفوفات").

---

### 9.4 Phase 4: Multi-University Scaling & Advanced Admin
*Target: Cross-Campus Expansion (JUST, Yarmouk, Jordan University)*

- [ ] **Comprehensive Super-Admin Analytics Dashboard:**
  - Visual metrics for most downloaded summaries, high-friction quiz questions (highest error rates), and real-time search term queries.
- [ ] **Multi-University Frontend Filter Activation:**
  - Enable the dormant `universities` and `departments` schema columns in UI navigation, transitioning Molakhasat from Jadara-only to Jordan-wide university selection.
- [ ] **Role-Based Ambassador Access (Ambassador RBAC):**
  - Introduce scoped permissions allowing student representatives ("Dof'ah Ambassadors") to upload and curate summaries for their specific major/faculty without granting full super-admin access.
- [ ] **Live Ingestion Progress via Server-Sent Events (SSE):**
  - Upgrade the simulated frontend stepper in `/upload` to subscribe to `/api/upload/progress/[resourceId]` via SSE for enterprise-grade real-time feedback.

---

_Maintained continuously during development. Last updated: October 18, 2026._
