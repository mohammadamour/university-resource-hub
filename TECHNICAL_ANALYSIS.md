# 🧭 Molakhasat (ملخصات) — Deep Technical Analysis & Architectural Blueprint

> **LIVING TECHNICAL ARCHITECTURE MANUAL & DEVELOPER COMPANION**  
> This document is the definitive record of **why** every piece of Molakhasat was built the way it was, complete with breakdowns of tricky code snippets, environment quirks, production gotchas, and the living engineering roadmap. As you build and scale, consult and maintain this document so you never lose architectural momentum.

---

## 📑 Table of Contents

1. [The Big Picture: Mental Model & Architecture](#1-the-big-picture-mental-model--architecture)
2. [Deep Dive: The Ingestion Pipeline & Tricky Code Snippets](#2-deep-dive-the-ingestion-pipeline--tricky-code-snippets)
   - [2.1 Magic Byte File Signature Verification (`%PDF-`)](#21-magic-byte-file-signature-verification-pdf-)
   - [2.2 Ghostscript PDF Compression & Exploit Neutralization](#22-ghostscript-pdf-compression--exploit-neutralization)
   - [2.3 Supabase Storage & The `ArrayBuffer` Corruption Gotcha](#23-supabase-storage--the-arraybuffer-corruption-gotcha)
   - [2.4 Eager / Speculative Client-Side Extraction via WebWorker](#24-eager--speculative-client-side-extraction-via-webworker)
   - [2.5 Robust CJS / ESM Interop for `pdf-parse`](#25-robust-cjs--esm-interop-for-pdf-parse)
   - [2.6 Decoupled On-Demand Quiz Engine & Round-Robin Key Pool](#26-decoupled-on-demand-quiz-engine--round-robin-key-pool)
   - [2.7 Serverless Execution Protection via Next.js `after()`](#27-serverless-execution-protection-via-nextjs-after)
   - [2.8 Auto-Watermarking Engine (The Micro-Pill Badge & Referral Loop)](#28-auto-watermarking-engine-the-micro-pill-badge--anti-occlusion-referral-loop)
   - [2.9 Pre-Storage SHA-256 Duplicate Defense & Page-Count Resolution](#29-pre-storage-sha-256-duplicate-defense--page-count-resolution)
   - [2.10 Admin Preview Decoupling & Dynamic Storage Key Derivation](#210-admin-preview-decoupling--dynamic-storage-key-derivation)
3. [Deep Dive: Frontend & Interactive Components](#3-deep-dive-frontend--interactive-components)
   - [3.1 The "Topic | Title" Dynamic Grouping Pattern](#31-the-topic--title-dynamic-grouping-pattern)
   - [3.2 Next.js 16 Turbopack Segment Revalidation AST Quirk](#32-nextjs-16-turbopack-segment-revalidation-ast-quirk)
   - [3.3 The `<NativeQuiz />` 4-State Client Machine](#33-the-nativequiz--4-state-client-machine)
   - [3.4 SVG Circular Progress Ring Mathematics](#34-svg-circular-progress-ring-mathematics)
   - [3.5 Crowdsourced Empty-Course Funnel & Universal Navbar CTA](#35-crowdsourced-empty-course-funnel--universal-navbar-cta)
4. [Database, RLS Security & Caching Strategy](#4-database-rls-security--caching-strategy)
   - [4.1 Relational Hierarchy & "Fake Departments"](#41-relational-hierarchy--fake-departments)
   - [4.2 Row Level Security (RLS) Permission Matrix](#42-row-level-security-rls-permission-matrix)
   - [4.3 Caching & The Supabase Free-Tier Pause Defense](#43-caching--the-supabase-free-tier-pause-defense)
   - [4.4 Metadata Expansion & Exam Scope Architecture (Migration 20261020)](#44-metadata-expansion--exam-scope-architecture-migration-20261020)
5. [AI Seeding Engine & Adaptive Learning Roadmap](#5-ai-seeding-engine--adaptive-learning-roadmap)
   - [5.1 Bulk Seeding Script (`scripts/seed-quizzes.ts`)](#51-bulk-seeding-script-scriptsseed-quizzests)
   - [5.2 The Master AI Prompt](#52-the-master-ai-prompt)
   - [5.3 Roadmap: 50-Question Banks & Adaptive Testing](#53-roadmap-50-question-banks--adaptive-testing)
   - [5.4 Diagnostic Mistake Remediation ("Train My Weaknesses")](#54-diagnostic-mistake-remediation-train-my-weaknesses)
6. [Phase 4 Blueprint: Server-Sent Events (SSE) Live Status Stream](#6-phase-4-blueprint-server-sent-events-sse-live-status-stream)
7. [Environment Quirks & Troubleshooting Encyclopedia](#7-environment-quirks--troubleshooting-encyclopedia)
8. [Super-Admin Resource Manager & Crowdsourcing Architecture](#8-super-admin-resource-manager--content-seeding-architecture)
   - [8.1 Decoupled Public Funnel (`/upload`) vs. Admin Management](#81-decoupled-public-funnel-upload-vs-admin-management)
   - [8.2 What to Edit vs. What NOT to Edit (Binary Immutability)](#82-what-to-edit-vs-what-not-to-edit-binary-immutability)
   - [8.3 Atomic Storage & DB Purging (`/api/admin/resources/[id]`)](#83-atomic-storage--db-purging-apiadminresourcesid)
   - [8.4 Bidirectional RTL Formatting & Real-Time Metrics](#84-bidirectional-rtl-formatting--real-time-metrics)
   - [8.5 The 3-Tier Content Engine & Split-Tab Moderation Queue](#85-the-3-tier-content-engine--split-tab-moderation-queue)
9. [Strategic Roadmap & Living Engineering Backlog](#9-strategic-roadmap--living-engineering-backlog)
   - [9.1 Phase 1: Completed Architecture (The Decoupled Foundation)](#91-phase-1-completed-architecture-the-decoupled-foundation)
   - [9.2 Phase 2: Immediate Sprint Priorities (Launch Readiness)](#92-phase-2-immediate-sprint-priorities-launch-readiness)
   - [9.3 Phase 3: Student Experience & Personalization](#93-phase-3-student-experience--personalization)
   - [9.4 Phase 4: Multi-University Scaling & Advanced Admin](#94-phase-4-multi-university-scaling--advanced-admin)
10. [Pre-Launch Hardening, Risk Registry & Technical Audit (Claude Architecture Review)](#10-pre-launch-hardening-risk-registry--technical-audit-claude-architecture-review)
    - [10.1 Immediate Pre-Launch Action Items (P0 / P1)](#101-immediate-pre-launch-action-items-p0--p1)
    - [10.2 Mid-Term Architectural Backlog (Phase 3 / Post-Launch)](#102-mid-term-architectural-backlog-phase-3--post-launch)
11. [Sustainability, Non-Intrusive Monetization & Community Contributor Strategy](#11-sustainability-non-intrusive-monetization--community-contributor-strategy)
    - [11.1 The Ethical Reframing & Core Freemium Boundary](#111-the-ethical-reframing--core-freemium-boundary)
    - [11.2 The Jadara Playbook: Hyper-Local Campus B2B Sponsorships](#112-the-jadara-playbook-hyper-local-campus-b2b-sponsorships)
    - [11.3 Value-Add Freemium Horizons (Phase 4)](#113-value-add-freemium-horizons-phase-4)
    - [11.4 Contributor & Ambassador Retention Engine (The Modder Mindset)](#114-contributor--ambassador-retention-engine-the-modder-mindset)
    - [11.5 Direct Micro-Supporter Tips (Buy Me a Coffee & Jordan CliQ)](#115-direct-micro-supporter-tips-buy-me-a-coffee--jordan-cliq)
    - [11.6 Ecosystem Synergies: AI Workspace & Study Suite Upsell](#116-ecosystem-synergies-ai-workspace--study-suite-upsell)
    - [11.7 The Macro Moat: Proof of Work for Scholarships & Global Mobility](#117-the-macro-moat-proof-of-work-for-scholarships--global-mobility)

---

## 1. The Big Picture: Mental Model & Architecture

### The Core Problem

University WhatsApp group chats are black holes of academic material: files get buried in minutes, links expire, students constantly re-ask for the same past exams, and freshmen are overwhelmed.

### The Molakhasat Solution

A curated, permanent, mobile-first academic hub that acts as a single source of truth. We do not try to replace WhatsApp; instead, we provide permanent, unfurlable links that students drop **inside** WhatsApp chats (`molakhasat.me/courses/calculus-1`).

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

## 2. Deep Dive: The Ingestion Pipeline & Tricky Code Snippets

When an upload request hits `POST /api/upload` (from either guest crowdsourcing or admin publishing), here is the exact execution flow:

```
POST /api/upload
  ├── 1. Auth & Role Gate: Check x-admin-secret header === process.env.ADMIN_SECRET
  │         ├── If Admin: targetStatus = 'active', author = 'Mohammad Al-Amour', is_admin_uploaded = true
  │         └── If Guest: targetStatus = 'pending', author = null, is_admin_uploaded = false
  ├── 2. Input & Size Gate: Reject missing required fields, 0-byte, or >30MB files
  ├── 3. Magic Byte Gate: Verify ASCII "%PDF-" in first 1024 bytes (ISO 32000-1)
  ├── 4. SHA-256 Duplicate Defense: Check existing file_hash for course_id -> HTTP 409 Conflict if duplicate
  ├── 5. Page-Count Resolution: Extract client WebWorker pageCount or serverless fallback via pdf-lib
  ├── 6. DB Reservation: Insert row with status='processing', initial metadata, and return UUID
  ├── 7. HTTP 202 Response: Sent back to client instantly (< 50ms)
  └── 8. processFileInBackground(...) (Scheduled via Next.js after())
            │
            ├── Stage 1: Ghostscript Compression (Optional / local only)
            ├── Stage 2: Referral Watermarking (✦ molakhasat.me/r/:id)
            ├── Stage 3: Supabase Storage Upload (Buffered binary)
            └── Stage 4: DB Update (Mark targetStatus ['active' | 'pending'], save final size)
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
- **The Serverless Constraint & Security Boundary:** Vercel/AWS Lambda containers do not include the Ghostscript binary. We gate compression behind `process.env.NEXT_PUBLIC_ENABLE_COMPRESSION === "true"`. When running locally, Ghostscript downsamples images and neutralizes potential PDF exploits (malicious embedded scripts, corrupt xref tables); when running serverless on Vercel, compression is skipped and security relies primarily on magic-byte verification (`%PDF-`), strict `pdf-lib` parsing, and administrative moderation gates.

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
- **Candidate Model Fallback Chain & Gateway Timeout Defense:**
  - Priority chain: `gemini-3.5-flash` (primary, curriculum quality) → `gemini-3.5-flash-lite` (ultra-fast fallback, resilient to 503 demand spikes) → `gemini-flash-lite-latest` (secondary fallback).
  - *Deprecated/Stalled Models Removed:* `gemini-3.8-flash` was removed due to gateway stalling on the v1beta endpoint.
  - *Lite Model Argument Incompatibility Fix:* Google API strictly rejects `thinkingConfig` on lite model variants with `HTTP 400: INVALID_ARGUMENT`. The engine conditionally sets `thinkingBudget: 0` only on non-lite models.
  - *Per-Candidate 9-Second Timeout (`AbortSignal.timeout(9000)`):* Prevents serverless functions from hanging until Vercel's 15s cutoff (`504 FUNCTION_INVOCATION_TIMEOUT`) by aborting stalled candidate calls quickly and advancing to the next model/key.
  - *503 / 500 Demand Spike Failover:* On high-demand server spikes (`503 UNAVAILABLE`), the engine immediately pivots to `gemini-3.5-flash-lite` on the active key.
- **Baseline Question Batching (8 Questions) & Infinite Multi-Expansion:**
  - *The 15-Second Vercel Serverless Wall:* Generating 15 questions with 4 options and detailed Arabic explanations consumes ~2,500 output tokens (~14–17s), flirting with Vercel Hobby's hard 15s execution limit. Initial generation is set to **8 high-yield questions**, completing deterministically in ~5–6 seconds.
  - *Infinite Zero-Duplicate Expansion (`[➕ توسيع]`):* Admins can expand the bank on demand as many times as desired. Each expansion sends up to 40 existing question stems as strict negative prompt context (`DO NOT REPEAT OR REPHRASE`). Since input tokens process at >100k tokens/sec, sending prior question stems adds virtually zero latency (+30ms) while guaranteeing zero duplicates across successive expansions (8 → 14 → 20 → 26 questions).
- **Bulletproof Frontend Error Handling & Floating Sticky Toast:**
  - *Safe Error Body Parsing:* In [`AdminResourceManager.tsx`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/components/features/AdminResourceManager.tsx), response status is inspected before attempting `response.json()`, preventing HTML error pages (e.g. 504 timeouts) from crashing with unhandled JSON `SyntaxError`s.
  - *Fixed Floating Viewport Toast:* The notification banner is positioned with `fixed bottom-6 left-6 z-50` with high-contrast backdrop blur and a 5.5-second linger, ensuring immediate visual feedback even when the admin is scrolled deep into the table.
- **Strict JSON Enforcement & Regex Sanitizer:**
  ````typescript
  generationConfig: {
    temperature: 0.25,
    responseMimeType: "application/json",
    ...(isLite ? {} : { thinkingConfig: { thinkingBudget: 0 } }),
  }
  ````
- **Validation Before Persistence (Structural Integrity):** `validateQuizData()` strictly verifies schema structure (4 choices, 0-indexed correct answer, non-empty Arabic explanation, and valid difficulty levels). Minimum threshold is aligned to 4 valid questions. Mandatory curator spot-checking and test-playing remains essential before publishing to avoid student exam misinformation.

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

### 2.8 Auto-Watermarking Engine (The Micro-Pill Badge & Anti-Occlusion Referral Loop)

- **File:** [`src/lib/pipeline/watermark.ts`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/lib/pipeline/watermark.ts) & [`src/app/api/upload/route.ts`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/app/api/upload/route.ts)
- **The Strategy:** Directly implements the viral growth loop from the README vision: when students download and forward summaries in private WhatsApp or Telegram groups, every page carries a high-contrast, clickable attribution badge (`✦ molakhasat.me`).
- **Micro-Pill Architecture & Anti-Occlusion Design:**
  - **Compact Footprint (Anti-Occlusion):** Brand copy is strictly trimmed to `✦ molakhasat.me` (~99pt width), shrinking horizontal intrusion by >65% compared to multi-word slogans.
  - **Bottom-Gutter Hugging (`y = 5pt`, height `16pt`):** The badge spans from `y = 5` to `y = 21pt` max, seating it safely in the empty margin below standard presentation slide text and preventing occlusion of bottom lecture sentences or footnotes.
  - **Semi-Translucent Glassmorphism (`opacity: 0.72`):** Stamped with a deep slate-950 fill (`rgb(0.06, 0.09, 0.15)`) and subtle slate-600 border (`rgb(0.24, 0.32, 0.44)`). The 72% opacity ensures high contrast on both dark slides and white pages, while remaining translucent enough that words remain legible if an extreme slide writes text to the canvas edge.
  - **The WinAnsi Encoding Gotcha & Vector Sparkle:** Standard PDF 14 fonts (Helvetica) use WinAnsi (Windows-1252) encoding and instantly crash with `WinAnsi cannot encode "✦"` if passed Unicode symbols. Rather than embedding heavy TTF font binaries into serverless memory, we render the 4-pointed sparkle (`✦`) natively using SVG vector operators (`page.drawSvgPath`) tinted in brand emerald (`rgb(0.20, 0.85, 0.65)`).
  - **Mobile Touch Target:** The native PDF Link Annotation (`Subtype: Link`, `S: URI`) covers the complete pill bounding box (`Rect: [pillX, pillY, pillX + pillWidth, pillY + pillHeight]`), making it easy for mobile students on iOS/Android PDF readers to tap anywhere on the badge and deep-link directly to `/r/:id`.
  - **Defensive Design:** Wrapped in try/catch to ensure corrupted or encrypted PDFs fallback gracefully without halting the upload pipeline.

---

### 2.9 Pre-Storage SHA-256 Duplicate Defense & Page-Count Resolution

- **Files:** [`src/app/api/upload/route.ts`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/app/api/upload/route.ts), [`src/lib/pipeline/client-pdf-extractor.ts`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/lib/pipeline/client-pdf-extractor.ts)
- **The Problem:** Storage buckets fill rapidly when different students or admins repeatedly re-upload the same official syllabus or slides under slightly different titles. Furthermore, running Ghostscript compression and PDF watermarking on duplicate files wastes compute.
- **The SHA-256 Fingerprint Gate:**
  Before writing bytes to Supabase Storage or invoking the background worker, the server calculates a cryptographic SHA-256 hash of `rawBuffer`:
  ```typescript
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
  ```
- **Dual-Layer Page-Count Resolution:**
  1. **Client WebWorker (Zero Latency):** `extractPdfMetadataAndText()` captures `pdf.numPages` during speculative extraction in the browser, instantly showing a `📑 X صفحة` badge in the dropzone and passing `pageCount` in `FormData`.
  2. **Server Fallback (`pdf-lib`):** If the client worker failed or was bypassed, the server queries `tempDoc.getPageCount()` from `pdf-lib` (already loaded for watermarking) without spawning child processes.

---

### 2.10 Admin Preview Decoupling & Dynamic Storage Key Derivation

- **Files:** [`src/components/features/AdminResourceManager.tsx`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/components/features/AdminResourceManager.tsx), [`src/app/api/admin/resources/[id]/quiz/route.ts`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/app/api/admin/resources/%5Bid%5D/quiz/route.ts), [`src/app/api/admin/resources/[id]/route.ts`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/app/api/admin/resources/%5Bid%5D/route.ts)
- **The `/r/:id` Admin Pitfall:**
  Previously, preview buttons in the admin table and cards pointed to `/r/${res.id}`. The `/r/:id` route is strictly an anonymous, permanent shortlink for students with Supabase RLS `status = 'active'`. Clicking `/r/:id` for pending (`status: 'pending'`) or draft uploads returned `null`, falling back to `NextResponse.redirect('/', 307)`. Admins could not inspect newly uploaded files to approve or reject them.
- **The Direct Preview Architecture:**
  - Table rows, mobile cards, and the Edit Modal now link directly to `res.storage_url` in a new tab (`target="_blank" rel="noopener noreferrer"`).
  - Inside `AdminResourceManager.tsx`, the Edit Modal features a dedicated preview inspection banner (`📄 معاينة وتدقيق المستند المرفوع`), allowing the administrator to inspect the original PDF binary, check formatting/watermarks, and update status from `pending` to `active` in one seamless workflow.
- **In-Flight `__processing__` Guard & State Protection:**
  - Upload routes return `202 Accepted` immediately while background pipelines (`after()`) compress and upload the PDF asynchronously (`storage_url = '__processing__'`).
  - The UI cleanly disables preview and quiz generation buttons with an informative `جارٍ المعالجة...` badge until the upload completes.
  - Backend endpoints (`/api/admin/resources/[id]/quiz`) guard against premature calls with HTTP 422: `"الملف لا يزال قيد المعالجة والرفع السحابي"`.
- **Dynamic Storage Path Extraction:**
  - Rather than hardcoding storage paths as `courses/${resource.course_id}/${resource.id}.pdf`, endpoints now derive the path dynamically from `resource.storage_url.slice(marker.length)`.
  - **Why:** If an administrator reassigns a resource to a different course in the database via the Edit Modal, the underlying binary in Supabase Storage remains at its original path. Deriving the storage key from `storage_url` ensures that on-demand text extraction, AI quiz generation, and atomic deletions (`DELETE`) never fail with `Object not found`.

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

### 3.5 Crowdsourced Empty-Course Funnel & Universal Navbar CTA

- **Files:** [`src/components/layout/Header.tsx`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/components/layout/Header.tsx), [`src/components/features/ResourceList.tsx`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/components/features/ResourceList.tsx), [`src/app/courses/[slug]/page.tsx`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/app/courses/%5Bslug%5D/page.tsx), [`src/app/upload/page.tsx`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/app/upload/page.tsx)
- **Zero-Barrier Funnel Strategy:**
  To bootstrap content coverage across hundreds of university courses without manual founder overload:
  1. **Universal Navbar CTA (`Header.tsx`):** A prominent `[📤 شارك ملخصك]` action is visible on every single page across mobile and desktop, converting passive readers into contributors without auth friction.
  2. **Empty Course State Transformation (`ResourceList.tsx`):** Courses with zero approved resources render a high-converting contribution card: *"لا توجد موارد أو ملخصات لهذه المادة حتى الآن — كن أول من يشارك ملخصاته لمساعدة زملائك!"*.
  3. **Context-Preserving Funnel (`UploadPage.tsx` & `UploadForm.tsx`):** Clicking the empty state CTA passes `?courseId=UUID` (or `?course=slug`). `UploadPage` resolves the target course and automatically pre-selects it in the dropdown, eliminating search friction and driving conversion.

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

### 4.4 Metadata Expansion & Exam Scope Architecture (Migration `20261020`)

- **Migration File:** [`supabase/migrations/20261020_metadata_expansion.sql`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/supabase/migrations/20261020_metadata_expansion.sql)
- **Schema Enhancements:**
  ```sql
  ALTER TABLE resources 
  ADD COLUMN IF NOT EXISTS page_count INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS file_hash TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS target_exam TEXT NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS academic_year TEXT NOT NULL DEFAULT '2025/2026',
  ADD COLUMN IF NOT EXISTS professor_name TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS author_name TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL;
  ```
- **Hierarchical Exam Scope (`target_exam`):** Categorizes materials into `midterm` ("مادة الميد"), `final` ("مادة الفاينل"), or `other` ("شامل / أخرى"). Eliminates student confusion and analysis paralysis during exam week.
- **Academic Currency (`academic_year`):** Required dropdown pre-selected to current academic year (`2025/2026`), allowing students to distinguish active curriculum from outdated archives.
- **Deduplication & Filter Indexes:** Dedicated B-Tree indexes on `file_hash`, `target_exam`, `academic_year`, `status`, and `created_at DESC` guarantee sub-millisecond lookups and instant duplicate prevention.

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

### 8.1 Decoupled Public Funnel (`/upload`) vs. Admin Management

- **Architectural Decoupling:**
  Previously, `/upload` required `?key=${ADMIN_SECRET}` and returned a 404 for unauthenticated visitors. In Phase 2:
  - **Public Crowdsourcing (`/upload` without key):** Frictionless submission gateway for students. No password required, zero admin tabs, and resources are automatically routed to `status = 'pending'` for moderation.
  - **Admin Publishing (`/upload?key=...`):** Retains administrative tabs (`<AdminTabs />`), publishes immediately (`status = 'active'`), auto-attributes to `Mohammad Al-Amour` (`is_admin_uploaded = true`), and connects to real-time SSE telemetry streams.
- **Guest UX Protection (Frozen Appreciation State):**
  While admin uploads auto-reset after 5 seconds to facilitate rapid multi-file batch uploads, guest uploads **freeze** on submission. The green appreciation card with the permanent reference ID (`رقم المرجع: [id]`) stays visible with an explicit `[ 📤 مساهمة بملف آخر ]` button so mobile students are never left wondering if their submission went through.
- **Description Guardrail:** Optional notes field is capped at 150 characters with a live counter (`{length}/150 حرف`) to prevent uploader comment bloat.
- **Deep-Linked Pre-Selection:** Accepts `?courseId=...&title=...` query parameters to pre-fill the course dropdown and title template when students click crowdsourcing callouts from empty course pages.

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

### 8.5 The 3-Tier Content Engine & Split-Tab Moderation Queue

- **The Choice Overload Problem:** Dumping 15+ flat PDFs right before an exam causes analysis paralysis and wastes precious LLM quota synthesizing quizzes for secondary notes.
- **The 3-Tier Hierarchy:**
  - **Tier 1 (Core Curated Shelf):** Strictly capped at 2–4 high-yield assets (`is_featured: true`). Full-width cards with verified badges (`✦ إدارة المنصة`), inline `<NativeQuiz />`, and direct downloads.
  - **Tier 2 (Extended Community Archive):** Collapsible drawer for student peer submissions and past semester notes (`is_featured: false`). Lean, zero quiz token overhead. Admin can promote to Tier 1 with 1 click.
  - **Tier 3 (Deep-Dive External Toolkit):** Multi-column grid for external study links (`type === 'link'`) with auto-detected platform badges (YouTube red badge, GitHub repo, Docs, Online compilers).
- **Split-Tab Moderation Workflow (`/admin/resources`):**
  - **Active Tab:** Real-time search, inline 1-click tier flipping (`[⭐ رئيسي]` ↔ `[📁 أرشيف]`), and on-demand quiz generation (`/api/admin/resources/[id]/quiz`).
  - **Pending Tab (`بانتظار المراجعة`):** Amber badge with live pending count. Allows 1-click approval directly into either Tier 1 (`اعتماد كملخص رئيسي`) or Tier 2 (`اعتماد في الأرشيف الإضافي`), or rejection with atomic physical storage and database purging.
  - **Guest Ingestion Boundary:** Public uploads via `/upload` default to `status: 'pending'` and `is_featured: false`, while admin uploads default to `status: 'active'` and `is_featured: true`.

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

- [x] **Metadata Expansion & Exam Scope Architecture (Migration `20261020`):** Extended `resources` schema with `page_count`, `file_hash`, `target_exam` (midterm/final/other), `academic_year`, `professor_name`, `author_name`, and `description`.
- [x] **Pre-Storage SHA-256 Duplicate Defense:** Cryptographic duplicate rejection (`HTTP 409 Conflict`) preventing duplicate storage bloat and redundant serverless compute.
- [x] **Decoupled Crowdsourcing Funnel (`/upload`):** Opened public student upload gateway with pending moderation queue, frozen appreciation card, deep-linking pre-selection, and 150-char description guardrail.
- [x] **Admin Moderation Queue (`/admin/resources`):** Added pending review filter tab with one-click approve (Core vs Archive), PDF preview, and instant rejection.
- [x] **Dynamic Homepage Metrics (`/`):** Real-time Supabase relational aggregation calculating `{study_count} مورد`, `{quiz_count} كويز • {totalQuestions} سؤال`, or `قيد الإعداد ⏳` dynamically on course cards.
- [x] **The 3-Tier Content Engine:** Restructured course detail pages into Tier 1 (Core Curated Shelf), Tier 2 (Collapsible Community Archive Drawer), and Tier 3 (External Deep-Dive Toolkit Grid with YouTube/Docs/GitHub badges).
- [x] **Admin Question Bank Expansion Action:** Built admin-triggered "Expand Bank" (`[➕ توسيع]`) appending non-duplicate Gemini questions to `quiz_data`.
- [x] **Verified Contributor Badges & Metadata Chips:** Rendered `✦ المعتمد`, `✦ إدارة المنصة`, professor tags, page counts (`📄 18 ص`), and exam scope (`مادة الميد`/`مادة الفاينل`).
- [ ] **Content Seeding Engine (7 Core Courses):**
  - Populate initial high-yield summaries for Calculus 1, C++, Data Structures, Discrete Math, Linear Algebra, and University Electives (National Education, Military Sciences) strictly following [`Content_Upload_SOP.md`](file:///c:/Users/somet/Downloads/Coding/Personal/Content_Upload_SOP.md).
- [ ] **IT Student Community Portal:**
  - Embed direct Telegram/WhatsApp feedback group invite link in the application footer for freshman peer support and bug reporting.

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
- [x] **Live Ingestion Progress via Server-Sent Events (SSE):**
  - Upgraded upload stepper to subscribe to `/api/upload/progress/[resourceId]` via SSE and Node.js `progressBus` with automatic database polling fallback.

---

## 10. Pre-Launch Hardening, Risk Registry & Technical Audit (Claude Architecture Review)

> **Context:** An independent architectural audit conducted in October 2026 identified key operational, security, and scaling risks. Each item below has been verified against the active codebase and slotted into our immediate pre-launch sprint or Phase 3 roadmap.

### 10.1 🚨 Immediate Pre-Launch Action Items (P0 / P1)

1. **Admin Secret in URL (`?key=ADMIN_SECRET` Leak Risk):**
   - **Risk:** Passing credentials in query strings leaks secrets to browser history, proxy server logs, and HTTP `Referer` headers when clicking outbound links.
   - **Fix:** Migrate to an HTTP-Only authentication cookie (`admin_session`) or header-based authorization for the `/admin` portal, keeping query strings clean.
   - **Tracking:** Scheduled for Immediate Pre-Launch Hardening.

2. **Public Endpoint Abuse Protection (`/api/quiz/record-attempt`):**
   - **Risk:** The quiz attempt beacon uses the Supabase service role key to insert records without checking whether `resourceId` actually exists. A malicious script could flood `quiz_attempts` and exhaust Supabase free-tier database rows.
   - **Fix:**
     1. Verify `resourceId` exists in `resources` before inserting attempt rows.
     2. Enforce IP-based rate limiting (e.g. max 10 attempts per minute per IP via in-memory sliding window or Edge middleware).
     3. Cap payload size and reject question counts exceeding 50.

3. **Supabase Free-Tier Storage & Egress Economics:**
   - **Risk:** Supabase free tier caps storage at **1 GB** and egress at **5 GB / month**. Because Ghostscript is disabled on Vercel, phone scans (20–30 MB) can fill the storage bucket in ~35 uploads. In exam week, 300 students downloading five 10MB PDFs = 15 GB egress (triggering overage limits or site downtime).
   - **Remediation Strategy:**
     1. **Mandatory Local Pre-Compression:** Always run Ghostscript compression locally (`Content_Upload_SOP.md`) before uploading production summaries to keep file sizes under 2–4 MB.
     2. **Cloudflare R2 Pull-Forward:** Migrate PDF binary storage from Supabase Storage to Cloudflare R2 (which provides 10 GB free storage and **zero egress fees**), keeping Supabase strictly for metadata and quiz JSON.

4. **Automated Backend Validation Loop & Curator Subject-Matter Verification:**
   - **Risk:** LLM generation can occasionally produce malformed questions (bad option count, out-of-bounds `correctIndex`, duplicate choices, or empty text) or subtle sign errors in Calculus/CS questions.
   - **Completed Defense (Automated Sanity Loop):** [`sanitizeAndValidateQuestion()`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/lib/pipeline/gemini-quiz.ts) runs on every LLM-produced question before Supabase insertion (in both Baseline and Expansion phases). It strictly verifies:
     1. `options` is an array of exactly 4 non-blank strings.
     2. Zero duplicate options (`Set(options).size === 4`).
     3. `correctIndex` is an integer strictly within `[0..3]`.
     4. Question stem and explanation are non-empty strings.
     5. Malformed questions are dropped with descriptive console warnings (`[gemini-quiz] Dropping question #...: reason`) without crashing the valid batch.
   - **Next Action (Curator 1-Click Audit Modal):** Build an admin inspect modal in [`AdminResourceManager.tsx`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/components/features/AdminResourceManager.tsx) with a "📋 Copy for AI Review" button to spot-check semantic truth against Claude/ChatGPT before publishing.

5. **Shortlink (`/r/:id`) Deletion Fallback:**
   - **Risk:** The permanent watermarked shortlink `molakhasat.me/r/:id` is stamped onto hundreds of distributed PDFs. If a resource is deleted or replaced, students tapping the watermark encounter a dead 404.
   - **Fix:** Update `src/app/r/[id]/route.ts`: if the resource UUID is not found or marked deleted, gracefully 307-redirect to `/courses` or the homepage with a friendly notification rather than throwing a raw 404.

6. **Watermark Layout Resilience on Non-Standard PDFs:**
   - **Risk:** PDFs with rotated pages (`/Rotate 90` or `270`), landscape slides, or custom `CropBox` offsets can cause the micro-pill badge to render off-screen or occlude central lecture content.
   - **Verification:** Test watermarking against landscape slide decks, rotated lecture scans, and verify touch annotation tappability on mobile iOS Safari / Android PDF viewers.

---

### 10.2 📋 Mid-Term Architectural Backlog (Phase 3 / Post-Launch)

1. **Copyright & Content Takedown SOP:**
   - Add a transparent *"حقوق الملكية الفكرية وطلب إزالة المحتوى"* (DMCA / Removal Contact) link in the website footer.
   - Note the caching caveat: Because PDFs are served with `Cache-Control: immutable, max-age=31536000`, a purged file can remain cached in student browser storage and local WhatsApp downloads.

2. **Download & View Telemetry Counter:**
   - Add an atomic incrementing column `downloads_count` on `resources` triggered via `/r/:id` redirects and PDF downloads to capture usage signals before building Phase 4 analytics.

3. **Schema Normalization: Topic Column Migration:**
   - Replace pipe-delimited titles (`"تفاضل 1 | ملخص النهايات"`) with an explicit nullable column `topic TEXT` and `display_order INT` on `resources` for clean chapter sorting as the library scales beyond 100+ files per course.

4. **Arabic Search Normalization:**
   - Implement Arabic character normalization (unifying `أ`, `إ`, `آ` ➔ `ا`, `ة` ➔ `ه`, `ى` ➔ `ي`, stripping tashkeel) to support fuzzy search as requested by students.

5. **Disaster Recovery & Master Backup Cadence:**
   - Maintain an offline local archive of all original master PDFs in a structured folder (`/archive/courses/<course_code>/`).
   - Run scheduled weekly PostgreSQL schema & data dumps (`supabase db dump` / `pg_dump`).

6. **Privacy Policy (Jordan Data Protection Law Compliance):**
   - Add a concise 2-sentence privacy notice explaining that Molakhasat stores only anonymous guest session tokens in `localStorage` for quiz analytics and does not collect personal identity or track cross-site cookies.

7. **Developer Sustainability (Solo Operator Cadence):**
   - Given Ethan's 18-credit university schedule: Batch content curation strictly into pre-exam sprints (Midterm sprint, Final sprint) rather than daily ad-hoc uploads. Keep ongoing weekly maintenance to < 2 hours.

8. **Observability, Real-Time Webhook Alerts & Product Telemetry:**
   - **Operational Philosophy:** A solo founder cannot monitor production dashboards 24/7. Immediate push alerts to a mobile channel (Discord or Telegram webhook) provide instant situational awareness with zero infrastructure overhead.
   - **Automated Webhook Alerting (Low-Effort Push Notifications):**
     - *Critical Backend Failures:* Wrap AI quiz generation (`/api/admin/resources/[id]/quiz`) and upload processing in a lightweight catch helper that sends a formatted markdown message to a private Discord/Telegram webhook via standard `fetch()` when an unexpected 500 or repeated quota failure occurs.
     - *Community Ingestion Beacon:* Trigger a webhook message whenever a guest submits a new summary via `/upload`, enabling rapid moderation and approval from mobile without manually polling the admin dashboard.
   - **Telemetry & Event Logging (`analytics_events` Table):**
     - Create a lightweight Supabase table (`id, event_type, resource_id, metadata JSONB, created_at`) to log critical engagement milestones:
       1. `quiz_started` vs. `quiz_completed` (reveals question drop-off rates and completion friction).
       2. `search_query` (logs raw user queries to identify high-demand courses/topics missing from the platform).
       3. `resource_viewed` & `resource_downloaded` (pinpoints the top 20% of materials driving 80%+ of campus traffic).
   - **Key Actionable Insights:**
     - *Fill Content Gaps:* Search query logs tell Ethan exactly what subjects to source or summarize next.
     - *Calibrate Question Difficulty:* High failure rates on specific questions highlight poorly tuned AI questions or tricky exam traps.
     - *Exam Season Surge Tracking:* Measure real adoption spikes during Midterms and Finals to quantify campus penetration.

---

## 11. Sustainability, Non-Intrusive Monetization & Community Contributor Strategy

> **Context & Vision:** Molakhasat is designed to be a durable, permanent academic public utility for Jordanian university students. To survive across multiple academic years without founder burnout, the platform requires an ethical, non-intrusive sustainability engine and a structured contributor retention architecture.

---

### 11.1 The Ethical Reframing & Core Freemium Boundary

- **The Intellectual Trap of "Unethical Monetization":**
  Solo developers frequently assume that charging money or monetizing is antithetical to helping students. In software reality, un-monetized academic tools almost universally die within 12–18 months when server bills, LLM token quotas, and domain fees turn into financial drag on an exhausted student founder. Monetization is the operational engine that ensures the free tier can exist permanently.
- **The Non-Negotiable Core Boundary (The Golden Rule):**
  - **Zero-Login Reading & PDF Downloads are 100% Free Forever:** No paywalls on course summaries, slides, or formula sheets. No signup barriers for guest mobile reading.
  - **Free Tier Integrity:** The public good remains pristine. Monetization is strictly confined to B2B campus sponsorships or heavy compute power-user add-ons.

---

### 11.2 The Jadara Playbook: Hyper-Local Campus B2B Sponsorships

- **The Jordan Student Payment Reality:**
  Jordanian university students face heavy friction with digital micro-subscriptions: low credit card penetration among freshmen, cultural reliance on CliQ / cash, and extreme price sensitivity. Forcing recurring SaaS credit card billing on students is swimming upstream.
- **The Local B2B Advantage:**
  Jadara University is a prominent private university on the Irbid-Amman highway. The student demographic has high discretionary spending power, active daily vehicle/bus commutes, and sustained off-campus commercial needs. Local businesses fight for student mindshare during high-stress exam periods.
- **High-Affinity Campus Sponsorship Niches:**
  1. **Student Housing & Dormitories (سكنات الطلاب والطالبات):** High margin, year-long leases; willing to sponsor during registration and exam periods.
  2. **Study Cafés & Coffee Shops:** Direct beneficiaries of students needing Wi-Fi and quiet study environments near university gates.
  3. **Laptop, Mobile & Electronics Repair Shops:** Critical emergency services during project submission and exam weeks.
  4. **Student Transportation Lines & Private Commute Services:** Daily university transit routes between Irbid, Amman, and Jerash.
  5. **IELTS, TOEFL & Professional Training Academies:** High-yield career upskilling for graduating seniors.
- **Implementation UX (Zero Clutter, High Value):**
  - **No Invasive Ad Networks:** Never run noisy, slow Google AdSense banners or intrusive popups that degrade mobile reading speed.
  - **The "Curated Study Partner" Pill (`✦ شريك الدراسة`):** A sleek, high-contrast badge or pinned partner pill embedded seamlessly into course directory cards or footer:
    `✦ شريك الدراسة: [اسم الكافيه / السكن] — كود خصم خاص 15% لطلاب جدارا`
  - **Economics:** Just 1–2 local businesses sponsoring at **50–100 JOD / month ($70–$140)** completely pays for Supabase, Vercel, and Gemini API costs, generating recurring runway while delivering genuine local discounts to students.

---

### 11.3 Value-Add Freemium Horizons (Phase 4)

If and when student-facing paid features are introduced, they must strictly follow the "Compute-Heavy Convenience" model without gating core course notes:
1. **Mock Exam Simulator with Adaptive Weakness Training:** Unlimited on-demand full exam simulations (25–50 questions) with instant personalized mistake remediation and step-by-step breakdown.
2. **AI Audio Flashcards & Slide Summarizer:** Ingesting 100-page raw lecture slide decks into bite-sized 5-minute audio capsules or interactive flashcard decks.
3. **Exam Week Fast-Lane:** Dedicated high-priority LLM generation queues ensuring instant quiz synthesis even during nationwide midterm/final traffic spikes.

---

### 11.4 Contributor & Ambassador Retention Engine (The Modder Mindset)

- **The Reality of Volunteer Student Admins:**
  Student contributors (like Anas and future faculty representatives) quit when three friction points occur:
  1. *Repetitive Grunt Work:* Complex multi-field forms, manual OCR, or clunky UIs cause burnout in days.
  2. *Fear of Breaking Production:* Handing over raw database access or destructive super-admin credentials creates anxiety.
  3. *Zero Social Attribution:* Performing hours of invisible work with no public recognition kills motivation.
- **The Modder Playbook (Autonomy + Speed + Status):**
  - **Public Attribution Badges (`uploader_name`):** Every summary or quiz curated by an ambassador visibly displays:
    `مرفوع بواسطة: أنس (مشرف معتمد) ✦`
    When classmates download summaries, the social credit flows directly to the contributor in lecture halls and study groups.
  - **The 25-Second Curation Loop:** The decoupled `/upload` funnel (WebWorker text extraction + auto-watermarking + 6s quiz generation) allows an ambassador to curate an entire course's midterm content in ~15 minutes between lectures.
  - **Ambassador Role (RBAC Lite):** Scoped curation credentials permitting upload, metadata tagging, and quiz expansion for assigned courses while strictly isolating destructive database operations.

---

### 11.5 Direct Micro-Supporter Tips (Buy Me a Coffee & Jordan CliQ)

- **The Mechanism:** A clean, human "About the Creator" modal or footer attribution with a friendly, unpretentious message:
  *"Hey, I'm Ethan, a software engineering student building Molakhasat to eliminate the chaos of university group chats. If these summaries helped you pass an exam, consider buying me a coffee or supporting server costs."*
- **The Jordan Localization (CliQ Advantage):** While international platforms rely on Stripe/PayPal or BuyMeACoffee, in Jordan **CliQ** is universally adopted by university students with zero transfer fees. Displaying a verified CliQ alias (`ETHAN-MOLAKHASAT` or mobile number) alongside a BuyMeACoffee button eliminates payment friction. Students who cram the night before an exam and score an 'A' frequently feel genuine gratitude and will gladly send 1–3 JOD as a gesture of appreciation. Zero maintenance, zero intrusive ads.

---

### 11.6 Ecosystem Synergies: AI Workspace & Study Suite Upsell

- **The Distribution Trojan Horse:** Molakhasat is not just an isolated website; it is the top-of-funnel distribution engine for Ethan's broader software suite.
- **AI-Powered Student Workspace Integration:**
  - Ethan is engineering a tailored, AI-assisted Notion-style workspace customized for Jordanian academic curricula.
  - *The Integration Loop:* On any summary page in Molakhasat, a 1-click action: `[📂 تصدير إلى مساحة العمل الخاصة بك]` imports the summary text directly into the student's personal workspace. From there, the student can chat with an embedded AI tutor, generate custom flashcards, or create personalized revision notes.
- **Companion Utilities ("Void" Productivity Suite):**
  - Cross-promoting complementary study tooling (e.g. weighted objective tracking, OLED-safe pomodoro focus timers, and habit drills) directly to a captive audience of motivated engineering and science students.

---

### 11.7 The Macro Moat: Proof of Work for Scholarships & Global Mobility

- **The Asymmetric Return:** Direct revenue (100–300 JOD/month) is pocket change compared to the macro career value of this platform. The true ROI of Molakhasat is **indisputable, verifiable Proof of Work**.
- **The Global Mobility Moat (Germany / DAAD / Canada 2029 Strategy):**
  - Every university graduate has a transcript with GPA numbers. Less than 1% of graduates can point to a live, production-grade distributed system with:
    - Real, active users and peer adoption.
    - Full-stack modern architecture (Next.js 16, Supabase, WebWorkers, AI LLM synthesis pipelines, and binary PDF manipulation).
    - Measurable community impact and viral retention.
  - *Scholarship & Visa Weaponization:* When applying for DAAD master's scholarships, German *Werkstudent* (working student) positions, or high-tier remote engineering contracts on Mostaql/Upwork, Molakhasat serves as undeniable evidence of autonomous, senior-tier product execution.

---

_Maintained continuously during development. Last updated: October 22, 2026._



