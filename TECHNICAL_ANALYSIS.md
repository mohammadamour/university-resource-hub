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
   - [3.1 The 4-Tier Semantic Shelf Architecture](#31-the-4-tier-semantic-shelf-architecture)
   - [3.2 Next.js 16 Turbopack Segment Revalidation AST Quirk](#32-nextjs-16-turbopack-segment-revalidation-ast-quirk)
   - [3.3 The `<NativeQuiz />` 4-State Client Machine](#33-the-nativequiz--4-state-client-machine)
   - [3.4 SVG Circular Progress Ring Mathematics](#34-svg-circular-progress-ring-mathematics)
   - [3.5 Crowdsourced Empty-Course Funnel & Universal Navbar CTA](#35-crowdsourced-empty-course-funnel--universal-navbar-cta)
   - [3.6 Upload Form Taxonomy, Exam Scope & Curated Syllabus Toggle](#36-upload-form-taxonomy-exam-scope--curated-syllabus-toggle)
   - [3.7 Segment Switcher, Course Quick-Jump Selector & 2-Column Mobile Grid](#37-segment-switcher-course-quick-jump-selector--2-column-mobile-grid)
   - [3.8 Client-Side First-Page Thumbnail Generation & Dynamic CSS Book Covers](#38-client-side-first-page-thumbnail-generation--dynamic-css-book-covers)
   - [3.9 Decoupled Standalone Card Architecture & Docked Quiz Trays](#39-decoupled-standalone-card-architecture--docked-quiz-trays)
4. [Database, RLS Security & Caching Strategy](#4-database-rls-security--caching-strategy)
   - [4.1 Relational Hierarchy & "Fake Departments"](#41-relational-hierarchy--fake-departments)
   - [4.2 Row Level Security (RLS) Permission Matrix](#42-row-level-security-rls-permission-matrix)
   - [4.3 Caching & The Supabase Free-Tier Pause Defense](#43-caching--the-supabase-free-tier-pause-defense)
   - [4.4 Metadata Expansion & Exam Scope Architecture (Migration 20261020)](#44-metadata-expansion--exam-scope-architecture-migration-20261020)
   - [4.5 Granular Resource Ordering (display_order) & Shelf Sorting](#45-granular-resource-ordering-display_order--shelf-sorting)
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
   - [9.5 Consolidated Active Priority Queue (Deduplicated Backlog)](#95-consolidated-active-priority-queue-deduplicated-backlog)
10. [Pre-Launch Hardening, Risk Registry & Technical Audit (Claude Architecture Review)](#10-pre-launch-hardening-risk-registry--technical-audit-claude-architecture-review)
    - [10.1 Immediate Pre-Launch Action Items (P0 / P1)](#101-immediate-pre-launch-action-items-p0--p1)
    - [10.2 Mid-Term Architectural Backlog (Phase 3 / Post-Launch)](#102-mid-term-architectural-backlog-phase-3--post-launch)
    - [10.3 Production Incident & Bug Pattern Log](#103-production-incident--bug-pattern-log)
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
  - _Deprecated/Stalled Models Removed:_ `gemini-3.8-flash` was removed due to gateway stalling on the v1beta endpoint.
  - _Lite Model Argument Incompatibility Fix:_ Google API strictly rejects `thinkingConfig` on lite model variants with `HTTP 400: INVALID_ARGUMENT`. The engine conditionally sets `thinkingBudget: 0` only on non-lite models.
  - _Per-Candidate 9-Second Timeout (`AbortSignal.timeout(9000)`):_ Prevents serverless functions from hanging until Vercel's 15s cutoff (`504 FUNCTION_INVOCATION_TIMEOUT`) by aborting stalled candidate calls quickly and advancing to the next model/key.
  - _503 / 500 Demand Spike Failover:_ On high-demand server spikes (`503 UNAVAILABLE`), the engine immediately pivots to `gemini-3.5-flash-lite` on the active key.
- **Baseline Question Batching (8 Questions) & Infinite Multi-Expansion:**
  - _The 15-Second Vercel Serverless Wall:_ Generating 15 questions with 4 options and detailed Arabic explanations consumes ~2,500 output tokens (~14–17s), flirting with Vercel Hobby's hard 15s execution limit. Initial generation is set to **8 high-yield questions**, completing deterministically in ~5–6 seconds.
  - _Infinite Zero-Duplicate Expansion (`[➕ توسيع]`):_ Admins can expand the bank on demand as many times as desired. Each expansion sends up to 40 existing question stems as strict negative prompt context (`DO NOT REPEAT OR REPHRASE`). Since input tokens process at >100k tokens/sec, sending prior question stems adds virtually zero latency (+30ms) while guaranteeing zero duplicates across successive expansions (8 → 14 → 20 → 26 questions).
- **Bulletproof Frontend Error Handling & Floating Sticky Toast:**
  - _Safe Error Body Parsing:_ In [`AdminResourceManager.tsx`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/components/features/AdminResourceManager.tsx), response status is inspected before attempting `response.json()`, preventing HTML error pages (e.g. 504 timeouts) from crashing with unhandled JSON `SyntaxError`s.
  - _Fixed Floating Viewport Toast:_ The notification banner is positioned with `fixed bottom-6 left-6 z-50` with high-contrast backdrop blur and a 5.5-second linger, ensuring immediate visual feedback even when the admin is scrolled deep into the table.
- **Strict JSON Enforcement & Regex Sanitizer:**
  ```typescript
  generationConfig: {
    temperature: 0.25,
    responseMimeType: "application/json",
    ...(isLite ? {} : { thinkingConfig: { thinkingBudget: 0 } }),
  }
  ```
- **Validation Before Persistence (Structural Integrity & Blind Consensus):**
  - _Grounded CoT Generation Layer:_ Prompts require an exact verbatim `source_quote` from the uploaded text (preventing off-syllabus hallucinations) and a `step_by_step_derivation` solving the problem before emitting the `correct_answer`.
  - _In-Memory Fisher-Yates Shuffle:_ Generates `correct_answer` and 3 `distractors` separately, then deterministically shuffles the 4 options in TypeScript memory. This eradicates option position bias (no more artificial skew toward option A or B).
  - _Automated Dual-Pass Blind Solver Audit:_ Prior to database insertion, an independent audit pass evaluates the generated question stems and options blindly without access to answer keys or explanations. Using dual verification (Letter Option Label [A-D] + Option Text Matching), questions that yield key disagreements, calculation mismatches, or ambiguity are automatically dropped from the batch. Only consensus-verified questions enter the course bank.

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
      {
        error: `⚠️ هذا الملف تم رفعه مسبقاً لهذه المادة بعنوان: "${existingDuplicate.title}"`,
      },
      { status: 409 },
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

### 3.1 The 4-Tier Semantic Shelf Architecture

- **File:** [`src/components/features/ResourceList.tsx`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/components/features/ResourceList.tsx)
- **Evolution from Pipe Delimiters:** Earlier iterations used a title pipe hack (`"الموضوع | العنوان"`) to group materials. In Step 4, this hack and the ambiguous generic badges (`✦ المعتمد`) were completely retired in favor of a clean, deterministic 4-tier shelf layout:
  1. **Shelf 1 — 📚 المادة الرسمية / Official Syllabus:**
     - _Filter:_ `is_featured === true`
     - _Badge:_ Exclusive `⭐ رسمي` badge.
     - _Purpose:_ Official textbook chapters, curriculum syllabi, and faculty slides anchoring the top of the course page.
  2. **Shelf 2 — 🌟 ملخصات ومراجعات:**
     - _Filter:_ `type === "summary" && !is_featured`
     - _Deterministic Sort:_ `target_exam === "midterm"` first ➔ `"final"` second ➔ `"other"` third, then `display_order ASC`, then `created_at ASC`.
     - _Interactive Integration:_ Renders inline `<NativeQuiz />` directly attached to summaries containing `quiz_data`.
  3. **Shelf 3 — 📝 أسئلة ونماذج امتحانات:**
     - _Filter:_ `type === "past_exam" && !is_featured`
     - _Sort:_ `display_order ASC, created_at ASC`.
     - _Zero-Ghost Rule:_ Hides the entire section and header when no past exams exist (no empty placeholders).
  4. **Shelf 4 — 🗂️ أرشيف إضافي ومصادر خارجية (Collapsible Drawer):**
     - _Filter:_ All remaining active items (`type === "link"`, `type === "other"`, `type === "guide"`).
     - _Drawer Experience:_ Collapsed by default via subtle toggle. Features categorized sub-headers only when items exist:
       - 🔗 `روابط ومصادر خارجية` (YouTube, GitHub, Drive platform cards)
       - 📎 `سلايدات وفصول إضافية` (Chapter notes and reference guides)
       - 👥 `مساهمات الطلاب` (Student community submissions)

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
  2. **Empty Course State Transformation (`ResourceList.tsx`):** Courses with zero approved resources render a high-converting contribution card: _"لا توجد موارد أو ملخصات لهذه المادة حتى الآن — كن أول من يشارك ملخصاته لمساعدة زملائك!"_.
  3. **Context-Preserving Funnel (`UploadPage.tsx` & `UploadForm.tsx`):** Clicking the empty state CTA passes `?courseId=UUID` (or `?course=slug`). `UploadPage` resolves the target course and automatically pre-selects it in the dropdown, eliminating search friction and driving conversion.

### 3.6 Upload Form Taxonomy, Exam Scope & Curated Syllabus Toggle

- **Files:** [`src/components/features/UploadForm.tsx`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/components/features/UploadForm.tsx), [`src/app/api/upload/route.ts`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/app/api/upload/route.ts), [`src/components/features/AdminResourceManager.tsx`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/components/features/AdminResourceManager.tsx)
- **Problem Solved:** Legacy upload selectors lacked alignment with the database taxonomy, required dummy PDFs for external links, and buried exam scope categorization.
- **Architectural Enhancements:**
  1. **Full Taxonomy Dropdown:** Expanded `ResourceType` selector to cover `summary | past_exam | guide | link | other` using an accessible native dropdown.
  2. **Prominent Exam Scope (`target_exam`):** Elevated midterm/final/general scope into high-contrast interactive pill cards with Arabic helper descriptions explaining shelf placement.
  3. **Smart Preset Coupling:** Selecting `guide`, `link`, or `other` automatically couples `target_exam` to `"other"`, while choosing `summary` or `past_exam` restores `"midterm"` default.
  4. **Dynamic External Link Ingestion (`type: "link"`):** When `type === "link"` is selected, the file dropzone dynamically swaps into an explicit URL input field (`https://...`). The backend registers the link immediately without requiring a dummy PDF or invoking the Ghostscript/watermarking pipeline, and automatically resolves `external_platform` (`youtube`, `github`, `drive`, `docs`).
  5. **Admin-Gated Syllabus Pinning (`is_featured`):** The **"مادة رسمية (Official Syllabus)"** toggle is exclusively visible in admin sessions (`Boolean(adminSecret)`), preventing untrusted guest uploads from pinning files to Tier 1 / Shelf 1.
  6. **Retirement of Title Pipe Hack:** Replaced legacy `"الموضوع | العنوان"` prompt with clear descriptive naming guidance in preparation for the semantic shelf architecture.
  7. **Admin Dashboard Parity:** Synced the edit resource modal in `AdminResourceManager.tsx` with identical taxonomy labels, exam badges, and official syllabus pinning controls.
  8. **Optimistic Previews:** Updated optimistic course resource badge renderers to support icons for all 6 resource types.

---

### 3.7 Segment Switcher, Course Quick-Jump Selector & 2-Column Mobile Grid

- **Files:** [`src/components/features/DepartmentGrid.tsx`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/components/features/DepartmentGrid.tsx), [`src/components/ui/Card.tsx`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/components/ui/Card.tsx), [`src/app/page.tsx`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/app/page.tsx)
- **Problem Solved:** Previously, the landing page linearly stacked all departments and courses with large section headers in a single-column layout on mobile devices. For students navigating between IT faculty courses and General University Requirements, this created excessive vertical scrolling and friction.
- **Architectural Enhancements:**
  1. **Toggleable Segment Switcher (Unfiltered Default):** Converted `DepartmentGrid` to a high-performance client component. On initial visit, no filter is applied (`activeDeptId === null`), presenting all department sections. Clicking either `[ 💻 مواد IT ]` or `[ 🏛️ إجباري جامعة ]` isolates that department; clicking the active button again toggles the filter off and restores the full view.
  2. **Direct Course Quick-Jump Selector:** Instead of a redundant fuzzy text input on a small course catalog, an ergonomic native `<select>` dropdown sits directly beneath the segment tabs. When unfiltered, courses are organized by `<optgroup>` across all departments; when filtered, it isolates that department's courses. Selecting a course triggers immediate programmatic navigation (`router.push('/courses/' + course.slug)`).
  3. **High-Density 2-Column Mobile Grid:** Upgraded mobile layout from `grid-cols-1` to `grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3`.
  4. **Compact Card Optimization (`Card.tsx`):** Adjusted internal padding (`p-3.5 sm:p-5`), title font clamp (`line-clamp-2` with `justify-between` flexbox), and compact micro-badges (`text-[10px] sm:text-[11px]`) to ensure cards maintain consistent heights without overflowing narrow 360px mobile viewports.
  5. **Smart Course Ordering:** Courses within each active department are intelligently prioritized so courses with active resources and quizzes appear first, while emerging courses retain the `قيد الإعداد ⏳` indicator to drive crowdsourced contributions.
  6. **Slug Substring Collision Defense:** Addressed an insidious substring gotcha where `"university-requirements".includes("it")` evaluated to `true` (due to the letters `it` inside `university`), causing both buttons to mislabel as IT courses. Fixed with exact slug matching (`slug === "it" || slug.startsWith("it-")`).
  7. **Empty Course Auto-Hiding & "Lazy Lighting":** To ensure the public homepage never looks like a half-empty construction site, `DepartmentGrid` automatically hides courses with 0 active resources. All courses remain selectable in `/upload` and the Admin panel. As soon as at least one resource is published to an empty course, it instantly lights up and appears on the homepage grid.
  8. **Department-Grouped Course Ingestion Dropdown (`UploadForm.tsx`):** With the catalog expanded to 27 courses, the upload dropdown organizes all courses into clean `<optgroup>` clusters by department, drastically accelerating material uploads.

---

### 3.8 Client-Side First-Page Thumbnail Generation & Dynamic CSS Book Covers

- **Files:** [`src/lib/pipeline/client-pdf-extractor.ts`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/lib/pipeline/client-pdf-extractor.ts), [`src/components/features/UploadForm.tsx`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/components/features/UploadForm.tsx), [`src/app/api/upload/route.ts`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/app/api/upload/route.ts), [`src/components/features/ResourceList.tsx`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/components/features/ResourceList.tsx), [`scripts/backfill-thumbnails.ts`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/scripts/backfill-thumbnails.ts)
- **Problem Solved:** Resource cards previously displayed generic square emoji blocks (`📄`, `📝`). However, generating PDF thumbnails server-side fails in Vercel serverless environments because Lambda containers lack native rasterization binaries (Ghostscript, Poppler, or Cairo/node-canvas).
- **Architectural Enhancements:**
  1. **Client-Side HTML5 Canvas Off-Screen Extraction:** When a PDF is dropped into `UploadForm.tsx`, the client-side `pdfjs-dist` worker renders Page 1 onto an off-screen `<canvas>` scaled to 320px width. The canvas converts the image into an optimized JPEG blob (`canvas.toBlob("image/jpeg", 0.82)`) and attaches it to `FormData`.
  2. **Synchronous Thumbnail Ingestion:** The `/api/upload` endpoint uploads the ~25KB JPEG blob directly to Supabase Storage (`resources` bucket under `thumbnails/${resourceId}.jpg`) and persists `thumbnail_url` into the `resources` table during the initial sync insert.
  3. **Zero-Cost YouTube Thumbnails:** For external link resources (`type === "link"`), the ingestion pipeline parses the YouTube video ID via regex and automatically sets `thumbnail_url = https://img.youtube.com/vi/${videoId}/hqdefault.jpg`, achieving instant visual fidelity with zero storage costs.
  4. **Graceful Fallback CSS Digital Book Cover:** On resource cards (`ResourceCover` in `ResourceList.tsx`), if a thumbnail is missing or fails to load, it dynamically renders an elegant CSS binder cover with category-specific gradients (Blue for summaries, Amber for exams, Emerald for guides, Violet for links), clean format badges (`PDF` / `LINK`), and an RTL-aligned decorative book spine, completely eliminating redundant title text inside the cover.
  5. **Streamlined 2-Row Mobile Card & Docked Quiz Strip:** Restructured resource cards into a strict 2-row hierarchy on mobile (bold title + inline scope badges; single-line breadcrumb with doctor/author, page count, and file size). Replaced the bloated, detached quiz block with an integrated docked action strip (`🎯 كويز تفاعلي لاختبار الفهم [ابدأ الكويز ❯]`) that reduces mobile card height by over 50%.
  6. **Browser-Powered 1-Click Backfill Engine (`/admin/resources` & `/api/admin/thumbnails`):** Built an automated in-browser backfill utility in the Admin Resource Manager. Because standard browsers natively run HTML5 `<canvas>` and `pdfjs-dist`, clicking the backfill banner extracts Page 1 JPEG covers for all legacy PDFs and persists them via `/api/admin/thumbnails` without requiring local CLI tools or server-side binaries.

---

### 3.9 Decoupled Standalone Card Architecture & Docked Quiz Trays

- **Files:** [`src/components/features/ResourceList.tsx`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/components/features/ResourceList.tsx), [`src/components/features/NativeQuiz.tsx`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/components/features/NativeQuiz.tsx)
- **Problem Solved:** Previously, all materials inside Shelves 1, 2, and 3 were wrapped in a monolithic `<div className="rounded-2xl border ... bg-card"><ul className="divide-y divide-border">` block. On mobile screens, this compressed all resources and interactive quizzes into one continuous, uninterrupted slab with only 1px dividers, obscuring where one resource ended and the next began, and detaching the visual connection between a summary and its quiz.
- **Architectural Enhancements:**
  1. **Decoupled Card Islands (`space-y-3`):** Removed the monolithic outer shelf container and replaced it with an unconstrained `<ul className="space-y-3 sm:space-y-3.5 list-none">`. Every resource item is elevated into its own standalone `<li className="rounded-2xl border bg-card shadow-xs">` island with physical vertical whitespace between cards.
  2. **Dedicated Badges Micro-Row:** To eliminate chaotic line-wrapping on narrow 360px mobile viewports when Arabic titles are long, badges (`[⭐ رسمي]`, `[مادة الفاينل]`, `[مادة الميد]`) are extracted into a dedicated top micro-row above the title. This establishes a clean visual hierarchy: Badges ➔ Bold Title ➔ Doctor/Author & Metadata.
  3. **Docked Quiz Action Tray:** The interactive `<NativeQuiz />` bar is physically docked inside the resource card container at the bottom (`border-t border-border/50 bg-accent/[0.04]`), seamlessly clipped by the card's rounded bottom corners. This makes it unmistakable that the quiz belongs to that exact summary, while maintaining a clean separation from the next resource below it.
  4. **1-Tap WhatsApp Resource Share & Deep-Link Pulse (`#res-[id]`):** Each resource card features a dedicated WhatsApp share trigger next to the download button. Tapping it opens WhatsApp with a pre-filled Arabic recommendation message containing a targeted UTM deep link (`?res=${id}&utm_source=whatsapp&utm_medium=resource_share#res-${id}`) and copies the URL to the clipboard. On arrival, the receiving page smoothly scrolls to the card and triggers a 2.5-second highlight pulse effect (`ring-2 ring-accent shadow-md`).
  5. **Completion-Only Anonymous Quiz Retention (`localStorage`):** Solved the quiz state dilemma without backend overhead by tracking completed quiz scores in `localStorage` under `molakhasat_quiz_history`. Unfinished or abandoned sessions are discarded to prevent clutter. When a student returns, the docked quiz bar detects their prior score and transforms from `[ ابدأ الكويز ❯ ]` into `[ نتيجتك السابقة: 9/10 (90%) 🏆 ] [ إعادة الكويز ↺ ]`.
  6. **Future Exam Readiness Schema:** Added optional `midterm_exam_date` and `final_exam_date` fields to the `Course` type definition and database schema without adding any unannounced clutter or placeholder dates to the user-facing UI.

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

### 4.5 Granular Resource Ordering (`display_order`) & Shelf Sorting

- **Files:** [`src/types/database.ts`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/types/database.ts), [`src/app/api/admin/resources/[id]/route.ts`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/app/api/admin/resources/%5Bid%5D/route.ts), [`src/components/features/AdminResourceManager.tsx`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/components/features/AdminResourceManager.tsx), [`src/components/features/ResourceList.tsx`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/components/features/ResourceList.tsx)
- **Schema Migration:**
  ```sql
  ALTER TABLE resources ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;
  ```
- **Admin Manual Curation Controls:**
  - Added `display_order` numeric field to the resource edit modal in `AdminResourceManager.tsx`. Curators can set explicit priorities (e.g., `1`, `2`, `3`), where smaller numbers surface first.
  - Surface visual order chips (`#1`, `#2`) on both desktop table and mobile card views in the admin console.
- **Client-Side Deterministic Shelf Sorting:**
  - In `ResourceList.tsx`, materials within every shelf section are deterministically sorted via:
    `display_order ASC (default 0), created_at ASC`
    guaranteeing that top-priority summaries or official syllabus slides appear first regardless of upload time.

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

Always use this standardized prompt in Claude / ChatGPT / Gemini to generate 100% compliant quiz JSON (synchronized with [`Content_Upload_SOP.md`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/Content_Upload_SOP.md) and [`src/quiz_seeds/README.md`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/quiz_seeds/README.md)):

- **Language Loyalty:** Match the source material's language (English for IT/Science/Math, with brief Arabic parentheses glosses only for tough terms; Arabic for Humanities/General Requirements). [`NativeQuiz.tsx`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/components/features/NativeQuiz.tsx) applies `dir="auto"` on questions, options, and explanations so both English and Arabic render natively.
- **Personalization Metadata:** Every question tracks `chapter`, `topic`, `difficulty`, and `tags` inside `quiz_data` JSONB (preserved by [`import/route.ts`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/app/api/admin/resources/%5Bid%5D/quiz/import/route.ts)) to power future chapter filtering and mistake remediation without UI clutter today.

```text
Generate [15] multiple-choice questions strictly from the attached material. Return valid JSON only (no markdown fences, no intro text).

Rules:
- Language loyalty: Match the source material's language (English for IT/Science/Math; Arabic for Arabic courses). For English materials, keep exam phrasing in English and optionally add a short Arabic translation in parentheses only for tough terms, e.g. `volatile (متطاير)`.
- `options`: Exactly 4 unique choices. No "All/None of the above", no letter prefixes (A, B, C, D).
- `correctIndex`: 0-based integer (0–3), distributed evenly across 0, 1, 2, 3.
- `difficulty`: ~35% "easy", 40% "medium", 25% "hard".
- Formatting: Plain text + Unicode math (∀, ¬, ∧, ∨, →, ≤, ≥, ≠, x², √). Never use LaTeX ($...$).

JSON template:
{
  "version": 1,
  "sourceTitle": "[Course / Resource Title]",
  "questions": [
    {
      "chapter": "Ch 1: Information Technology, the Internet, and You",
      "topic": "Software Purpose",
      "difficulty": "easy",
      "tags": ["definition"],
      "question": "What is the purpose of software?",
      "options": [
        "To store data permanently",
        "To connect computers to the Internet",
        "To convert data into information",
        "To display information on a monitor"
      ],
      "correctIndex": 2,
      "explanation": "Software processes raw data into useful information."
    }
  ]
}
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

### 5. Supabase Storage `__processing__` Leak & Relative 404 Defense

- **Symptom**: Clicking an uploaded resource navigates to `https://.../__processing__` and triggers a Next.js `404 | This page could not be found`.
- **Root Cause**: On initial sync DB insertion, `storage_url` was populated with `"__processing__"`. If the background pipeline encountered an error (or a 409 conflict from `upsert: false`), the catch block marked `status = 'rejected'` while leaving `storage_url = "__processing__"`. When an admin later manually activated the resource via the dashboard, the edit handler updated status but left `storage_url` unchanged. On the client, `<a href={resource.storage_url}>` treated the non-prefixed string as a relative path, resulting in a local 404 route failure.
- **Fix (Tri-Layer Defense)**:
  1. **Deterministic Upfront Allocation (`route.ts`):** Client generates `resourceId = crypto.randomUUID()` and computes `publicUrl` deterministically before inserting the row. `storage_url` is NEVER `"__processing__"` in the database.
  2. **Storage Upsert Immunity:** Enabled `upsert: true` on Supabase Storage upload calls to prevent 409 conflict rejections on concurrent or retried uploads.
  3. **Self-Healing Admin PATCH & Safe Client Guard:** The admin PATCH endpoint (`/api/admin/resources/[id]`) automatically resolves missing or placeholder URLs from `courses/${courseId}/${id}.pdf`. The frontend `<ResourceList />` checks `isValidResourceUrl()` to prevent navigating to broken relative routes.

### 6. PostgreSQL UTF-8 Null-Byte (`\u0000`) Ingestion Crash

- **Symptom**: File upload pipeline crashes with `DB status update failed: unsupported Unicode escape sequence` (PostgreSQL error 22021), marking the newly uploaded resource as `rejected`.
- **Root Cause**: Client-side (`pdfjs-dist`) or server-side (`pdf-parse`) text extraction encountering malformed embedded fonts, missing glyph mappings, or binary PDF streams frequently emits `\u0000` (null bytes) into extracted strings. PostgreSQL stores `TEXT` as null-terminated strings and strictly prohibits `\u0000` escape sequences. When `route.ts` attempts to update `source_text`, Postgres aborts the transaction.
- **Fix**: Implemented [`sanitizeTextForPostgres()`](file:///src/lib/utils.ts) in `src/lib/utils.ts`. Strips `\0` null characters, ASCII non-printable control codes (`[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]`), and unpaired UTF-16 surrogates before updating `source_text`, `title`, or `description` in `src/app/api/upload/route.ts` and `src/app/api/admin/resources/[id]/quiz/route.ts`.

### 7. Campus Wi-Fi 10s Load Latency & Edge Co-location Defense

- **Symptom**: Site takes ~10 seconds to load on Jordanian campus Wi-Fi (Jadara University).
- **Root Causes**:
  1. _Default Serverless Region Disconnect:_ Without `vercel.json`, Vercel deploys functions to `iad1` (Washington DC). Connecting across the Atlantic to Supabase in Frankfurt (`fra1`) added ~700ms raw latency, stretching to 5–8s with mobile packet loss, TLS renegotiation, and serverless cold starts.
  2. _Frequent Edge Cache Expirations:_ Course pages used `revalidate = 60`, forcing frequent cache regenerations on sporadic student visits.
  3. _Unused Latin Webfonts:_ `layout.tsx` was loading Google Fonts Geist/Geist Mono for Latin subsets on an Arabic-first application, introducing font-fetching stalls and FOUT/FOIT.
- **The Tri-Layer Fix**:
  1. **Vercel Compute Co-location (`vercel.json`):** Configured `"regions": ["fra1"]` (Frankfurt) so serverless compute runs in the exact same European cloud region as Supabase, slashing server round-trips from Jordan to ~150ms.
  2. **1-Hour Edge ISR with Instant On-Demand Invalidation:** Raised course page ISR to `revalidate = 3600` (1 hour) and added `revalidatePath('/')` and `revalidatePath('/courses/[slug]')` to all resource and quiz mutation handlers (`/api/upload`, `/api/admin/resources/[id]`). 100% of student traffic receives instant (<30ms) edge cache hits while updates reflect instantly.
  3. **Zero-Byte Native Arabic Typography:** Replaced remote font fetches with a zero-latency native font stack (`system-ui, "Segoe UI", "Tajawal", "Cairo", Arial`) in `globals.css` and added HTTP Brotli/Gzip compression with immutable caching headers in `next.config.ts`.

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

_Status: Shipped & Hardened (October 2026)_

- [x] **Decoupled Upload Pipeline:** Purged blocking synchronous/background AI generation from `/api/upload`. Ingestion completes deterministically in `< 2.5s` with referral watermarks (`molakhasat.me/r/:id`).
- [x] **Multi-Account Gemini Key Pool:** Configured `GEMINI_API_KEYS` support with 4 active developer accounts to quadruple free-tier daily quotas.
- [x] **Round-Robin Load Balancing:** Rotates initial account index across synthesis calls to evenly distribute RPM (Requests Per Minute) and RPD (Requests Per Day).
- [x] **Automatic 429 Cooldown & Dead-Key Blacklisting:** Flags exhausted accounts with a 5-minute cooldown (`keyCooldowns`), instantly skipping dead keys on subsequent runs without wasted network round-trips.
- [x] **Automated Key Verifier CLI:** Added `npm run test:keys` (`scripts/verify-gemini-pool.mjs`) to test the entire key pool with forced IPv4 resolution and sub-token latency benchmarks.
- [x] **On-Demand Admin Quiz Synthesis:** Created `/api/admin/resources/[id]/quiz` (`POST`/`DELETE`) and integrated inline actions (`[⚡ توليد كويز]` / `[🔄 إعادة توليد]`) into `/admin/resources`.
- [x] **GitHub Linguist Fix:** Vendored PDF.js worker in `.gitattributes` to correct repository language classification from 83% JavaScript back to TypeScript.

---

### 9.2 Phase 2: Immediate Launch Sprint (Seed & Polish)

_Target: Freshman Semester Kickoff (Jadara University)_

- [x] **Phase 0 (P0 Hotfix): Frictionless Navigation & Campus Latency Defense:**
  - _Top Course Back Pill & Breadcrumbs:_ Sticky/top `[ ← العودة للرئيسية ]` pill in `courses/[slug]` so visitors from WhatsApp links never feel trapped.
  - _Campus Wi-Fi Latency Defense (~10s TTFB):_ Co-locate Vercel compute to Frankfurt (`vercel.json` regions: `["fra1"]`) to eliminate cross-continental ping between Jordan, US serverless, and EU Supabase. Optimized ISR cache windows to 1 hour (`revalidate = 3600`) backed by programmatic on-demand `revalidatePath` in upload/admin mutations.
  - _Zero-Byte Native Arabic Typography & HTTP Compression:_ Replaced unused Latin webfonts with a high-performance native Arabic typography stack and added Brotli compression + immutable asset caching headers in `next.config.ts`.
- [ ] **Phase 5: Discrete Mathematics Modular Tool Engine (Academic Group Project Deliverable):**
  - _Deterministic Client-Side Propositional Logic Parser:_ Pure TypeScript Shunting-yard AST parser (`src/lib/academic-tools/discrete-math/`) generating full truth tables, tautology/contradiction classifications, and logical equivalence proofs in <2ms.
  - _Zero LLM Dependency:_ 100% deterministic mathematical accuracy, zero latency, $0 API costs, and full offline functionality on dead campus networks.
  - _Modular Tool Framework:_ Pluggable `AcademicTool` interface extensible to Linear Algebra (Matrix Solvers) and Calculus.
- [ ] **Phase 6: The "Benevolent Dictator" Contributor Dashboard (Classmate Onboarding):**
  - _Repository & Infra Isolation:_ Sole developer maintains exclusive access to GitHub, Supabase credentials, and Vercel deployments. Classmates receive zero Git or direct database access.
  - _Lightweight Reviewer Portal:_ Simple passcode-gated interface (`/admin/contributor`) for syllabus taxonomy mapping, logic test-case submissions, question bank QA, and generating academic presentation binders for professor grading.
- [x] **Metadata Expansion & Exam Scope Architecture (Migration `20261020`):** Extended `resources` schema with `page_count`, `file_hash`, `target_exam` (midterm/final/other), `academic_year`, `professor_name`, `author_name`, and `description`.
- [x] **Pre-Storage SHA-256 Duplicate Defense:** Cryptographic duplicate rejection (`HTTP 409 Conflict`) preventing duplicate storage bloat and redundant serverless compute.
- [x] **Decoupled Crowdsourcing Funnel (`/upload`):** Opened public student upload gateway with pending moderation queue, frozen appreciation card, deep-linking pre-selection, and 150-char description guardrail.
- [x] **Admin Moderation Queue (`/admin/resources`):** Added pending review filter tab with one-click approve (Core vs Archive), PDF preview, and instant rejection.
- [x] **Dynamic Homepage Metrics (`/`):** Real-time Supabase relational aggregation calculating `{study_count} مورد`, `{quiz_count} كويز • {totalQuestions} سؤال`, or `قيد الإعداد ⏳` dynamically on course cards.
- [x] **The 3-Tier Content Engine:** Restructured course detail pages into Tier 1 (Core Curated Shelf), Tier 2 (Collapsible Community Archive Drawer), and Tier 3 (External Deep-Dive Toolkit Grid with YouTube/Docs/GitHub badges).
- [x] **Admin Question Bank Expansion Action:** Built admin-triggered "Expand Bank" (`[➕ توسيع]`) appending non-duplicate Gemini questions to `quiz_data`.
- [x] **Verified Contributor Badges & Metadata Chips:** Rendered `✦ المعتمد`, `✦ إدارة المنصة`, professor tags, page counts (`📄 18 ص`), and exam scope (`مادة الميد`/`مادة الفاينل`).
- [x] **IT Student Community Portal & First-Party Observability Stack:**
  - Embedded prominent WhatsApp community gateway card in [`Footer.tsx`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/components/layout/Footer.tsx) (`WHATSAPP_COMMUNITY_URL` via `NEXT_PUBLIC_WHATSAPP_COMMUNITY_URL`) for freshman peer support and resource requests.
  - Added `@vercel/analytics` + `@vercel/speed-insights` in [`layout.tsx`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/app/layout.tsx) for real Web Vitals (LCP, CLS, INP) from Jordanian mobile networks without third-party SDK bloat.
  - Built zero-weight first-party event tracking ([`src/lib/analytics.ts`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/lib/analytics.ts) via `navigator.sendBeacon` -> [`POST /api/events`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/app/api/events/route.ts) -> [`analytics_events`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/supabase/migrations/20261116_analytics_events.sql)) covering `resource_view`, `pdf_reader_open`, `pdf_reader_error`, `pdf_download`, `external_link_click`, `whatsapp_share`, `bookmark_add`, `bookmark_remove`, `course_pin`, `course_unpin`, `quiz_start`, and `quiz_complete`, sharing anonymous guest IDs via [`src/lib/guest-session.ts`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/lib/guest-session.ts).
  - Added Discord & Telegram ops alerts ([`src/lib/ops-alerts.ts`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/lib/ops-alerts.ts)) triggered on new `/api/upload` submissions (via `after()`) and unexpected `500` API errors across upload, quiz generation, attempt recording, and admin routes (never embedding `ADMIN_SECRET` in webhook URLs).
- [x] **Curator 1-Click AI Audit Modal & Prompt Exporter:**
  - Embedded inside the Edit Resource modal in [`AdminResourceManager.tsx`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/components/features/AdminResourceManager.tsx) to prevent dashboard clutter. Features in-modal question inspection with answer keys, raw JSON export, and a 1-click "Copy Verification Prompt for AI" formatted for instant Claude/ChatGPT auditing.
- [x] **Phase 1: Custom Question Bank JSON Importer (Phase 1.1 + 1.2):**
  - **API Endpoint** [`POST /api/admin/resources/[id]/quiz/import`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/app/api/admin/resources/%5Bid%5D/quiz/import/route.ts): Tolerant JSON sanitizer accepting markdown-fenced input, bare arrays, and `{ questions: [] }` wrappers. Supports `replace` mode (full overwrite) and `append` mode (stem-based deduplication merge). Auto-corrects 1-indexed `correctIndex` and resolves `correctAnswer` text strings to `correctIndex`. Validates all 4 options unique, non-empty, and in range.
  - **Admin Import Drawer** in [`AdminResourceManager.tsx`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/components/features/AdminResourceManager.tsx): `📥` sky-blue button on every resource row (desktop table + mobile cards) opens a full modal with mode toggle (replace vs append), large JSON paste textarea, real-time client-side preview validator (`✓ جاهز لاستيراد X سؤالاً`), and expandable format guide. After successful import, `quiz_data` updates in-place in both the resource table and any open Edit modal.
- [ ] **Content Seeding Engine (7 Core Courses):**
  - Populate initial high-yield summaries for Calculus 1, C++, Data Structures, Discrete Math, Linear Algebra, and University Electives (National Education, Military Sciences) strictly following [`Content_Upload_SOP.md`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/Content_Upload_SOP.md).

---

### 9.3 Phase 3: Student Personalization & Engagement

_Target: Mid-Semester Adoption & Retention_

- [ ] **Quiz Results "Share My Score" WhatsApp Challenge:**
  - When a student achieves a high score on the Results screen (`isFinished === true`), render a prominent `[ 🏆 شارك نتيجتك وتحدّ زملاءك على واتساب ]` action.
  - Generates a viral peer-challenge message (`"جبت 9 من 10 في كويز مادة الجبر الخطي! بتقدر تجيب علامة أعلى؟ حل الكويز من هون: [Link]"`) to turn individual study sessions into viral group-chat acquisition loops.
- [ ] **Dynamic OpenGraph & WhatsApp Social Unfurl Cards:**
  - Add dynamic `generateMetadata` in `src/app/courses/[slug]/page.tsx` with high-impact OpenGraph tags (`og:title`, `og:description`, `og:image`).
  - When links are posted to university WhatsApp/Telegram groups, they render a rich graphic preview showcasing course title, approved summaries count, and active question bank volume.
- [x] **"My Saved Courses" & Saved Resources (`localStorage` + Navbar [`BookmarkDrawer.tsx`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/components/features/BookmarkDrawer.tsx)):**
  - Implemented zero-login client store [`src/lib/bookmarks.ts`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/lib/bookmarks.ts) using React 19 `useSyncExternalStore` (stable snapshots, cached `courseMeta` Arabic titles/codes, and multi-tab `"storage"` sync) without adding Supabase queries to `/`.
  - Added bookmark toggles on [`Card.tsx`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/components/ui/Card.tsx) (valid sibling `<button>` outside `<Link>`), [`CoursePinButton.tsx`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/components/features/CoursePinButton.tsx) in [`courses/[slug]/page.tsx`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/app/courses/%5Bslug%5D/page.tsx), and resource cards in [`ResourceList.tsx`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/components/features/ResourceList.tsx).
  - Kept the homepage clean by placing saved courses (`مقرراتي المحفوظة`) and saved resources (`مواردي المحفوظة`) inside a mobile-first slide-over [`BookmarkDrawer.tsx`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/components/features/BookmarkDrawer.tsx) triggered from [`Header.tsx`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/components/layout/Header.tsx). Critical CSS quirk solved: portaled via `createPortal(..., document.body)` because `<header>` uses `backdrop-blur-sm` (which otherwise traps `position: fixed` descendants inside the 64px header bar), anchored at physical `left-0` with `-translate-x-full` + `invisible` when closed.
- [x] **In-App Mobile Fullscreen PDF Reading Sheet ([`PdfReaderModal.tsx`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/components/features/PdfReaderModal.tsx)):**
  - Code-split via `next/dynamic(..., { ssr: false })` + dynamic `await import("pdfjs-dist/legacy/build/pdf.mjs")` (paired with the `legacy/build/pdf.worker.min.mjs` worker in `public/workers/`) in [`ResourceList.tsx`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/components/features/ResourceList.tsx) and [`client-pdf-extractor.ts`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/lib/pipeline/client-pdf-extractor.ts) (`0 KB` initial bundle impact on `/courses/[slug]`), portaled cleanly at `z-[80]`. Legacy build is required because modern `pdfjs-dist` v6 uses ES2025 `Uint8Array.prototype.toHex()`, which threw `a.toHex is not a function` on Android Chrome <140 / Xiaomi MiuiBrowser.
  - Configured HTTP range-chunk streaming (`disableAutoFetch: true`, `rangeChunkSize: 65536` with streaming enabled), `cMapUrl` + `standardFontDataUrl` + `iccUrl` + `wasmUrl` via `cdn.jsdelivr.net` matched to `pdfjsLib.version`, strict Page-1-first paint, `onRendered` ref isolation (preventing canvas wipes during scroll), `dir="ltr"` + `ctx.direction = "ltr"` / `ctx.textAlign = "left"` (preventing Canvas2D RTL glyph displacement on Arabic `<html dir="rtl">`), `w-max min-w-full` horizontal zoom scrolling, DPR capping, and an `IntersectionObserver` `±2` page window with unmount bitmap cleanup + docked Quiz launcher.
- [ ] **Exam Countdown Alert Pill:**
  - A smart contextual countdown widget placed in the course header when `midterm_exam_date` or `final_exam_date` is populated in Supabase, creating study urgency during exam weeks.
- [x] **Client-Side Favorites & Bookmarks (Local Phase Complete; Cloud Sync Post-Auth):**
  - Completed local-first course and resource bookmarking across homepage cards, course headers, resource rows, and the in-app PDF reader bar using compact metadata snapshots in `localStorage` (seamless Supabase profile sync deferred until auth lands).
- [ ] **Frictionless Auth & Basic Student Profiles:**
  - Implement zero-barrier authentication (Supabase Auth via Magic Links or Google/Telegram OAuth).
  - **Golden Architectural Rule:** _Zero-login guest reading must never be broken._ Unauthenticated visitors can always read and download freely; profiles simply unlock cloud bookmarks, quiz history, and weak-point analytics.
- [ ] **Diagnostic Mistake Remediation ("Train My Weaknesses"):**
  - Store student quiz attempt history in `quiz_attempts` / `quiz_attempt_answers`.
  - Introduce an adaptive drill mode filtering only previously missed questions grouped by Arabic topic tags (e.g., "أخطائي في المصفوفات").
- [ ] **Cohesive Course Card & Header Backgrounds (Deferred — Campus Performance Priority):**
  - **Guardrails:** Never sacrifice homepage load speed on slow campus mobile networks or legibility on 2-column Arabic cards (`Card.tsx`). Avoid watermarked stock images, third-party textbook covers, baked-in text overlays, and mismatched visual styles across light/dark modes.
  - **Viable Paths to Revisit Later:**
    1. _Shared Domain-Familiar or Matched AI-Generated WebP/AVIF Assets:_ Reuse a small, cohesive set of text-free domain backgrounds (e.g., coding backdrop for PL1/PL2, math/geometry for Calculus/Discrete Math) paired with a consistent gradient scrim for text contrast.
    2. _Zero-Byte Inline SVG Motifs + Accent Tints:_ Lightweight corner vector symbols per subject family for instant load and native light/dark theme compatibility.

---

### 9.4 Phase 4: Multi-University Scaling & Advanced Admin

_Target: Cross-Campus Expansion (JUST, Yarmouk, Jordan University)_

- [ ] **Comprehensive Super-Admin Analytics Dashboard:**
  - Visual metrics for most downloaded summaries, high-friction quiz questions (highest error rates), and real-time search term queries.
- [ ] **Multi-University Frontend Filter Activation:**
  - Enable the dormant `universities` and `departments` schema columns in UI navigation, transitioning Molakhasat from Jadara-only to Jordan-wide university selection.
- [ ] **Role-Based Ambassador Access (Ambassador RBAC):**
  - Introduce scoped permissions allowing student representatives ("Dof'ah Ambassadors") to upload and curate summaries for their specific major/faculty without granting full super-admin access.
- [x] **Live Ingestion Progress via Server-Sent Events (SSE):**
  - Upgraded upload stepper to subscribe to `/api/upload/progress/[resourceId]` via SSE and Node.js `progressBus` with automatic database polling fallback.

---

### 9.5 Consolidated Active Priority Queue (Deduplicated Backlog)

_Synthesized Nov 11, 2026 after pruning shipped sprints (`sprint_plan.md`, Phase 0/1/4) and obsolete plans (Sentry -> Vercel Speed Insights + `analytics_events` + Discord ops alerts)._

- **Tier 1 (P0 Security & Schema Hardening — Priority with Active Campus Traffic):**
  1. [x] **Tier 1A Completed (Nov 12, 2026):** Centralized constant-time admin secret verification (`crypto.timingSafeEqual` over SHA-256 digests in `src/lib/admin-auth.ts`) across all admin pages & routes (`C-02`), replaced `/r/[id]` `.or()` string interpolation with UUID-validated `.eq()` queries (`H-03`), eliminated duplicate `filePath`/`publicUrl` computations (`H-04`) and enforced offset-0 `%PDF-` bytes in `/api/upload` (`M-02`), synced doc model refs (`gemini-3.5-flash`) + `.env.example` (`ADMIN_SECRET`, `GEMINI_API_KEYS`), and added `supabase/migrations/20261117_schema_sync.sql` (`H-01` 6 ghost columns + `quiz_attempts` RLS tightening — run in Supabase SQL Editor).
  2. [ ] Add IP rate limiting on `/api/upload`, `/api/quiz/record-attempt`, and `/api/events` (`C-03`).
  3. [ ] Migrate admin auth from URL `?key=` to an HttpOnly cookie session (`C-01` / `M-03`).
  4. [ ] Add Vitest unit guardrails (admin auth, `sanitizeTextForPostgres`, quiz shuffle invariant, offset-0 PDF validation).
- **Tier 2 (Viral Growth Quick Wins):**
  1. Dynamic course `openGraph` tags in `src/app/courses/[slug]/page.tsx` for rich WhatsApp link previews.
  2. "Share My Score" WhatsApp Challenge button on `NativeQuiz.tsx` high-score results.
- **Tier 3 (Discrete Math Group Project):**
  1. Build deterministic TypeScript tokenizer, Shunting-yard parser, and interactive truth-table/equivalence UI (`Phase 5` in `src/lib/academic-tools/discrete-math/`). _Note: Defer custom `/admin/contribute` portal (`Phase 6`) until volunteer count justifies the auth surface; keep Git/Vercel/Supabase keys isolated to the lead dev._

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
   - **Completed (Curator Audit Modal):** Built inside the Edit Resource modal in [`AdminResourceManager.tsx`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/components/features/AdminResourceManager.tsx) with answer-key inspection, raw JSON export, and 1-click "Copy Verification Prompt for AI" (alongside JSON quiz importer in Phase 1).

5. **Shortlink (`/r/:id`) Deletion Fallback:**
   - **Risk:** The permanent watermarked shortlink `molakhasat.me/r/:id` is stamped onto hundreds of distributed PDFs. If a resource is deleted or replaced, students tapping the watermark encounter a dead 404.
   - **Fix:** Update `src/app/r/[id]/route.ts`: if the resource UUID is not found or marked deleted, gracefully 307-redirect to `/courses` or the homepage with a friendly notification rather than throwing a raw 404.

6. **Watermark Layout Resilience on Non-Standard PDFs:**
   - **Risk:** PDFs with rotated pages (`/Rotate 90` or `270`), landscape slides, or custom `CropBox` offsets can cause the micro-pill badge to render off-screen or occlude central lecture content.
   - **Verification:** Test watermarking against landscape slide decks, rotated lecture scans, and verify touch annotation tappability on mobile iOS Safari / Android PDF viewers.

---

### 10.2 📋 Mid-Term Architectural Backlog (Phase 3 / Post-Launch)

1. **Copyright & Content Takedown SOP:**
   - Add a transparent _"حقوق الملكية الفكرية وطلب إزالة المحتوى"_ (DMCA / Removal Contact) link in the website footer.
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

8. **Observability, Real-Time Webhook Alerts & Product Telemetry (Implemented — Nov 2026):**
   - **Operational Philosophy:** Instead of heavy third-party SDKs (Sentry ~30-50 KB + Session Replay, PostHog) that hurt Jordanian mobile 4G load budgets, Molakhasat uses a three-part zero-bloat stack:
     1. **Vercel Speed Insights + Web Analytics ([`layout.tsx`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/app/layout.tsx)):** Captures real device Web Vitals (LCP, INP, CLS, TTFB) and referrer traffic (WhatsApp/Telegram vs Direct) directly inside the Vercel Dashboard.
     2. **Automated Webhook Alerting ([`src/lib/ops-alerts.ts`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/lib/ops-alerts.ts)):** Sends real-time push alerts via `DISCORD_WEBHOOK_URL` and/or `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` on new uploads (`/api/upload` inside `after()`) and unexpected HTTP 500 errors (`/api/upload`, `/api/admin/resources/[id]/quiz`, `/api/quiz/record-attempt`, `/api/admin/resources/[id]`, `/api/admin/thumbnails`, `/api/admin/resources/[id]/quiz/import`). Webhook messages purposefully link to `/admin/resources` without appending `ADMIN_SECRET`.
     3. **First-Party Behavioral Event Log ([`src/lib/analytics.ts`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/lib/analytics.ts) ➔ [`POST /api/events`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/app/api/events/route.ts) ➔ [`analytics_events`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/supabase/migrations/20261116_analytics_events.sql)):** Uses `navigator.sendBeacon` (with `fetch(..., { keepalive: true })` fallback) so events never block downloads, shares, or page navigation. Server route reuses `createAdminClient()`, validates UUIDs safely (handling non-UUID mock course IDs like `placement-exams`), retries without FK IDs on Postgres `23503`, and always returns HTTP 200 to prevent client retry storms.
   - **Tracked Events Coverage (`analytics_events.event_type`):**
     - **Lifecycle & Session Metrics ([`SessionTracker.tsx`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/components/features/SessionTracker.tsx) + [`src/lib/analytics.ts`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/lib/analytics.ts)):** `home_view` (landing on `/`, with `visit_number` + `is_returning`), `session_end` (fired on `visibilitychange -> hidden` / `pagehide` carrying `session_id`, active visible `duration_seconds`, `actions_count`, `bounced`, `entry_path`, `exit_path`, `visit_number`, `is_returning`). Founder/admin devices (`localhost`, `/admin/*`, `/upload?key=*`) are automatically excluded via `molakhasat_ignore_analytics`.
     - **Behavioral Interactions:** `resource_view`, `department_filter`, `quick_select_course`, `pdf_reader_open`, `pdf_reader_error`, `pdf_download`, `external_link_click`, `whatsapp_share`, `whatsapp_community_click`, `bookmark_add`, `bookmark_remove`, `course_pin`, `course_unpin`, `saved_course_open`, `saved_resource_open`, `quiz_start`, `quiz_complete`.
   - **Production Configuration Checklist:**
     - Migration applied in Supabase SQL Editor: [`supabase/migrations/20261116_analytics_events.sql`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/supabase/migrations/20261116_analytics_events.sql) (RLS enabled, public `INSERT` only, `SELECT` restricted to service role).
     - Vercel Environment Variables: `DISCORD_WEBHOOK_URL` (Production Secret) and optional `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`.
   - **Saved Supabase Diagnostic SQL Queries (Run in Supabase → SQL Editor):**

     ```sql
     -- 1. Human-readable live activity feed (Amman time + device type)
     SELECT
       to_char(created_at AT TIME ZONE 'Asia/Amman', 'MM-DD HH24:MI') AS amman_time,
       event_type,
       course_slug,
       resource_title,
       LEFT(guest_session_id, 14) AS student_id,
       CASE
         WHEN user_agent ILIKE '%Android%' OR user_agent ILIKE '%iPhone%' THEN 'Mobile'
         ELSE 'Desktop'
       END AS device
     FROM analytics_events
     ORDER BY created_at DESC
     LIMIT 50;

     -- 2. Session length, actions before leaving & zero-action bounce rate (deduped by session_id)
     WITH sessions AS (
       SELECT
         metadata->>'session_id' AS session_id,
         MAX((metadata->>'duration_seconds')::int) AS duration_sec,
         MAX((metadata->>'actions_count')::int) AS actions_count,
         BOOL_AND((metadata->>'bounced')::boolean) AS bounced,
         BOOL_OR((metadata->>'is_returning')::boolean) AS is_returning
       FROM analytics_events
       WHERE event_type = 'session_end'
         AND created_at >= now() - interval '7 days'
         AND metadata->>'session_id' IS NOT NULL
       GROUP BY metadata->>'session_id'
     )
     SELECT
       COUNT(*) AS total_sessions,
       ROUND(AVG(duration_sec)) AS avg_seconds,
       PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_sec) AS median_seconds,
       ROUND(AVG(actions_count), 1) AS avg_actions,
       ROUND(100.0 * COUNT(*) FILTER (WHERE bounced) / NULLIF(COUNT(*), 0), 1) AS zero_action_bounce_pct,
       ROUND(100.0 * COUNT(*) FILTER (WHERE is_returning) / NULLIF(COUNT(*), 0), 1) AS returning_session_pct
     FROM sessions;

     -- 3. How often students come back (distinct active days & multi-visit students)
     WITH per_student AS (
       SELECT
         guest_session_id,
         COUNT(DISTINCT DATE(created_at AT TIME ZONE 'Asia/Amman')) AS active_days,
         COUNT(*) FILTER (WHERE event_type <> 'session_end') AS total_actions
       FROM analytics_events
       WHERE guest_session_id IS NOT NULL
       GROUP BY guest_session_id
     )
     SELECT
       COUNT(*) AS total_students,
       COUNT(*) FILTER (WHERE active_days >= 2) AS came_back_2plus_days,
       ROUND(AVG(active_days), 2) AS avg_active_days,
       ROUND(AVG(total_actions), 1) AS avg_lifetime_actions
     FROM per_student;

     -- 4. Event trends & unique students (last 7 days)
     SELECT event_type, COUNT(*) AS total, COUNT(DISTINCT guest_session_id) AS unique_students
     FROM analytics_events
     WHERE created_at >= now() - interval '7 days'
     GROUP BY event_type
     ORDER BY total DESC;

     -- 5. Top read, downloaded, and WhatsApp-shared resources
     SELECT resource_title, course_slug, event_type, COUNT(*) AS hits
     FROM analytics_events
     WHERE event_type IN ('pdf_reader_open', 'pdf_download', 'whatsapp_share')
     GROUP BY resource_title, course_slug, event_type
     ORDER BY hits DESC
     LIMIT 20;

     -- 6. Broken PDFs / client render errors (Amman time + device)
     SELECT
       to_char(created_at AT TIME ZONE 'Asia/Amman', 'MM-DD HH24:MI') AS amman_time,
       resource_title,
       course_slug,
       metadata->>'error' AS error_msg,
       user_agent
     FROM analytics_events
     WHERE event_type = 'pdf_reader_error'
     ORDER BY created_at DESC
     LIMIT 20;

     -- 7. Quiz start -> completion funnel & viral referral sources
     SELECT event_type, COUNT(*) AS total, COUNT(DISTINCT guest_session_id) AS unique_students
     FROM analytics_events
     WHERE event_type IN ('quiz_start', 'quiz_complete')
     GROUP BY event_type;

     SELECT
       COALESCE(metadata->>'utm_source', metadata->>'ref', 'direct') AS source,
       COUNT(*) AS visits
     FROM analytics_events
     WHERE event_type = 'resource_view'
     GROUP BY source
     ORDER BY visits DESC;
     ```

   - **Remaining Future Enhancement:** Wire a `search_query` event if/when a live keyword search bar is introduced on `/`.

---

### 10.3 🐛 Production Incident & Bug Pattern Log

> **Why keep this log:** Logging every real production failure reveals recurring patterns across Jordanian mobile devices, Supabase storage/migrations, and deployment drift so future fixes target root causes rather than symptoms.

#### 📱 Observed Traffic & Device Baseline (Nov 2026)

- **Mix:** ~90% mobile traffic (primarily WhatsApp group/status referrals), with **~60% on iOS** (iPhone Safari + WhatsApp in-app browser) and ~40% on Android.
- **Founder Blindspot:** Primary local testing happens on Android, making iOS WebKit (`WKWebView` / Safari) regressions easy to miss without explicit guardrails and telemetry (`pdf_reader_error`, `Speed Insights`).
- **iOS / WhatsApp `WKWebView` Engineering Watchouts:**
  1. **Input Auto-Zoom (`DepartmentGrid.tsx`):** Public `<select>` / `<input>` elements with `< 16px` mobile font-size (`text-xs`) trigger automatic viewport zoom on iOS Safari when tapped. Use `text-base sm:text-sm` on mobile inputs/selects.
  2. **WhatsApp In-App Browser Handoff (`ResourceList.tsx`):** `window.open(waUrl, "_blank", ...)` inside WhatsApp's in-app browser or iOS Safari can be popup-blocked or behave awkwardly; direct navigation / `<a href>` / `navigator.share` fallback is more reliable for returning to the native WhatsApp app.
  3. **Isolated `WKWebView` Storage:** WhatsApp's iOS in-app browser does not always share `localStorage` with standalone Safari. As a result, `molakhasat_guest_uuid`, `molakhasat_bookmarks`, and `molakhasat_quiz_history` can fragment per browser container (slightly inflating unique student counts and hiding bookmarks if a student switches to Safari).
  4. **iOS Canvas & PDF Download UX (`PdfReaderModal.tsx`):** Keeping `PdfReaderModal` as the primary PDF entry point is a win on iOS (since `<a target="_blank">` PDFs in `WKWebView` hijack the tab with QuickLook and hide the quiz CTA), while `MAX_DPR = 2` + `PAGE_WINDOW_RADIUS = 2` + bitmap zeroing protect against WebKit's strict total canvas memory cap. Still verify `ZOOM_STEPS = 2` (200%) on wide landscape slide decks on iPhone.
  5. **iOS Background Lifecycle:** Keep `visibilitychange` + `pagehide` + `navigator.sendBeacon` in `analytics.ts` (never rely on `beforeunload`, which iOS Safari drops).

| Date | Incident / Symptom | Affected Surface | Root Cause | Fix & Pattern Takeaway |
| :--- | :--- | :--- | :--- | :--- |
| **Nov 12, 2026** | `ERROR: 42P01: relation "quiz_attempts" does not exist` when applying schema sync | Production quizzes (`NativeQuiz.tsx` -> `/api/quiz/record-attempt`) | [`20261016_quiz_tracking.sql`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/supabase/migrations/20261016_quiz_tracking.sql) was committed to git but never executed in production Supabase SQL Editor; unguarded `DROP POLICY IF EXISTS` failed when the table didn't exist. | Executed `20261016_quiz_tracking.sql` in production and wrapped `DROP POLICY` in `to_regclass(...) IS NOT NULL` inside [`20261117_schema_sync.sql`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/supabase/migrations/20261117_schema_sync.sql). **Pattern:** Treat SQL files in git as pending until verified in Supabase Table Editor. |
| **Nov 11–12, 2026** | `UnknownErrorException: a.toHex is not a function` logged via `pdf_reader_error` | Android 13 Redmi 12 / Xiaomi `MiuiBrowser` (`Chrome/135`) on [`PdfReaderModal.tsx`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/components/features/PdfReaderModal.tsx) | Modern `pdfjs-dist@6.4.299` uses ES2025 `Uint8Array.prototype.toHex()`, unsupported on Chromium `<140`, Xiaomi MiuiBrowser, and older Android WebViews. | Switched [`PdfReaderModal.tsx`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/components/features/PdfReaderModal.tsx) & [`client-pdf-extractor.ts`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/lib/pipeline/client-pdf-extractor.ts) to `pdfjs-dist/legacy/build/pdf.mjs` + `legacy/build/pdf.worker.min.mjs` (`core-js` polyfills). **Pattern:** Always ship legacy/polyfilled builds for campus Android diversity. |
| **Nov 11–12, 2026** | `ResponseException: Unexpected server response (400)` logged via `pdf_reader_error` on `Arrays D1` | iPhone OS 18.7 Safari (`programming-2` / `Arrays D1`) | Inspecting the Supabase Storage URL returned HTTP 400 `{"statusCode":"404","error":"not_found","message":"Object not found","code":"NoSuchKey"}`: DB row existed in `resources` without a matching PDF in the `resources` bucket. | Flagged `Arrays D1` for deletion/re-upload in `/admin/resources`. **Pattern:** Never assume DB row existence guarantees Storage object existence; always keep upload/delete atomic or verify before marking `active`. |
| **Nov 12, 2026** | `?key=` admin secret visible in browser window title bar + React `#418` hydration error in DevTools on `/upload` | Admin DevTools inspection (`/upload?key=...`) | Admin gating relies on URL query strings (`C-01`), exposing secrets in window titles, history, and screenshots. | Scheduled `HttpOnly` cookie session replacement in **Tier 1B** + rotated `ADMIN_SECRET`. **Pattern:** Never keep bearer secrets in URLs past MVP bootstrap. |

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
  1. _Repetitive Grunt Work:_ Complex multi-field forms, manual OCR, or clunky UIs cause burnout in days.
  2. _Fear of Breaking Production:_ Handing over raw database access or destructive super-admin credentials creates anxiety.
  3. _Zero Social Attribution:_ Performing hours of invisible work with no public recognition kills motivation.
- **The Modder Playbook (Autonomy + Speed + Status):**
  - **Public Attribution Badges (`uploader_name`):** Every summary or quiz curated by an ambassador visibly displays:
    `مرفوع بواسطة: أنس (مشرف معتمد) ✦`
    When classmates download summaries, the social credit flows directly to the contributor in lecture halls and study groups.
  - **The 25-Second Curation Loop:** The decoupled `/upload` funnel (WebWorker text extraction + auto-watermarking + 6s quiz generation) allows an ambassador to curate an entire course's midterm content in ~15 minutes between lectures.
  - **Ambassador Role (RBAC Lite):** Scoped curation credentials permitting upload, metadata tagging, and quiz expansion for assigned courses while strictly isolating destructive database operations.

---

### 11.5 Direct Micro-Supporter Tips (Buy Me a Coffee & Jordan CliQ)

- **The Mechanism:** A clean, human "About the Creator" modal or footer attribution with a friendly, unpretentious message:
  _"Hey, I'm Ethan, a software engineering student building Molakhasat to eliminate the chaos of university group chats. If these summaries helped you pass an exam, consider buying me a coffee or supporting server costs."_
- **The Jordan Localization (CliQ Advantage):** While international platforms rely on Stripe/PayPal or BuyMeACoffee, in Jordan **CliQ** is universally adopted by university students with zero transfer fees. Displaying a verified CliQ alias (`ETHAN-MOLAKHASAT` or mobile number) alongside a BuyMeACoffee button eliminates payment friction. Students who cram the night before an exam and score an 'A' frequently feel genuine gratitude and will gladly send 1–3 JOD as a gesture of appreciation. Zero maintenance, zero intrusive ads.

---

### 11.6 Ecosystem Synergies: AI Workspace & Study Suite Upsell

- **The Distribution Trojan Horse:** Molakhasat is not just an isolated website; it is the top-of-funnel distribution engine for Ethan's broader software suite.
- **AI-Powered Student Workspace Integration:**
  - Ethan is engineering a tailored, AI-assisted Notion-style workspace customized for Jordanian academic curricula.
  - _The Integration Loop:_ On any summary page in Molakhasat, a 1-click action: `[📂 تصدير إلى مساحة العمل الخاصة بك]` imports the summary text directly into the student's personal workspace. From there, the student can chat with an embedded AI tutor, generate custom flashcards, or create personalized revision notes.
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
  - _Scholarship & Visa Weaponization:_ When applying for DAAD master's scholarships, German _Werkstudent_ (working student) positions, or high-tier remote engineering contracts on Mostaql/Upwork, Molakhasat serves as undeniable evidence of autonomous, senior-tier product execution.

---

_Maintained continuously during development. Last updated: November 11, 2026._
