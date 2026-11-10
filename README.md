# Molakhasat (ملخصات) — University Academic Resource Hub

> A fast, mobile-first, and curated single source of truth for university course materials and placement exams — replacing the chaos of ephemeral WhatsApp group chats.

**Live Domain:** `molakhasat.me` · **Target Audience:** Jadara University freshmen (Sanafer / سنافر), expanding to multi-university · **Status:** Pre-launch seeding phase

---

## 🚀 Quick Start

```bash
# 1. Start the local dev server (Turbopack, http://localhost:3000)
npm run dev

# 2. Type-check the entire codebase without emitting
npx tsc --noEmit

# 3. Production build (Webpack; avoids Turbopack source-map panic in CI)
npx next build --webpack

# 4. Seed pre-generated quiz banks from src/quiz_seeds/*.json into Supabase
npm run seed:quizzes

# 5. Backfill missing PDF thumbnails via browser-powered HTML5 canvas pipeline
npm run backfill:thumbnails

# 6. Verify & benchmark the 4-account Gemini API key pool
npm run test:keys
```

---

## 1. Executive Summary & Core Vision

| Dimension                | Detail                                                                                                                                                            |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mission**              | Permanent, searchable, curated single source of truth for university course materials                                                                             |
| **Brand**                | "Molakhasat" (ملخصات) — Arabic for "Summaries". Full RTL UI (`dir="rtl"`, `lang="ar"`) with Tajawal & Cairo typography                                            |
| **UX Philosophy**        | **Zero-login guest experience.** Students browse, read, and download every file with zero registration or email prompts. Auth is a future opt-in, never a barrier |
| **Permanent Links**      | Clean, unfurlable shortlinks (`molakhasat.me/r/:id`) safe for Telegram and WhatsApp study groups                                                                  |
| **Budget Target**        | \$0/month on free-tier infrastructure (Vercel + Supabase + Gemini free quota)                                                                                     |
| **Scale Goal**           | 200–500 active users at Jadara University (12k total) to trigger network-effect tipping point                                                                     |
| **Scaling Architecture** | Multi-university DB schema ready. Switching to University #2 requires changing one constant (`DEFAULT_UNIVERSITY_SLUG`), not a refactor                           |

---

## 2. Technology Stack

| Layer              | Technology                                                                                                                              | Notes                                                                                |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **Framework**      | **Next.js 16.3.6** (App Router + Turbopack, React 19, TypeScript 5)                                                                     | ISR with literal revalidation values (`60`s / `3600`s) — Turbopack AST requirement   |
| **Styling**        | **Pure Vanilla CSS** (`src/app/globals.css` with CSS custom properties)                                                                 | No TailwindCSS in runtime. Tailwind v4 is listed as a devDependency for tooling only |
| **Database**       | **Supabase PostgreSQL** with Row Level Security (RLS)                                                                                   | 4-tier hierarchy: Universities → Departments → Courses → Resources                   |
| **Object Storage** | **Supabase Storage** (`materials` bucket)                                                                                               | Public bucket; IPv4 Session Pooler required on local Jordanian networks              |
| **Hosting**        | **Vercel** (serverless, free tier)                                                                                                      | No native binaries in Lambda — all PDF rasterization delegated to client             |
| **AI Engine**      | **Google Gemini** (`gemini-3.8-flash:generateContent`) via direct REST                                                                  | 4-account round-robin key pool with 429 cooldown & dead-key blacklisting             |
| **PDF Pipeline**   | `pdfjs-dist` (client WebWorker) + `pdf-parse` (server fallback) + `pdf-lib` (watermarking) + `Ghostscript gswin64c` (local compression) | Client-first extraction; Ghostscript runs locally pre-upload, not in serverless      |
| **Analytics**      | `@vercel/analytics`                                                                                                                     | Tracks WhatsApp/Telegram referrer attribution from watermarked PDFs                  |
| **CI/CD**          | Vercel GitHub Integration                                                                                                               | Auto-deploys on `main` push                                                          |

> **Critical Environment Quirk:** The local Jordanian ISP network does not support IPv6. Always use the **Session Pooler** endpoint (`aws-0-[region].pooler.supabase.com:5432`) for all Supabase connections. Direct `db.[project].supabase.co` hostnames time out immediately. In Node.js scripts, enforce `dns.setDefaultResultOrder('ipv4first')`.

---

## 3. Feature Architecture & Shipped Milestones

### 3.1 Content Catalog & 4-Tier Semantic Shelf

The course detail page (`/courses/[slug]`) renders materials in 4 deterministic shelves — no title-pipe hacks, no empty ghost sections:

| Shelf                                      | Filter                                  | Purpose                                                                                                    |
| ------------------------------------------ | --------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **📚 Shelf 1 — المادة الرسمية**            | `is_featured === true`                  | Official textbook chapters, curriculum syllabi, faculty slides. Exclusive `⭐ رسمي` badge                  |
| **🌟 Shelf 2 — ملخصات ومراجعات**           | `type === "summary" && !is_featured`    | Student summaries sorted: Midterm → Final → Other, then `display_order ASC`. Hosts inline `<NativeQuiz />` |
| **📝 Shelf 3 — أسئلة ونماذج امتحانات**     | `type === "past_exam" && !is_featured`  | Past exams. Entire section hidden when empty (Zero-Ghost Rule)                                             |
| **🗂️ Shelf 4 — أرشيف إضافي (Collapsible)** | `type === "link" \| "other" \| "guide"` | Collapsible drawer: external links (YouTube/GitHub/Drive badges), chapter notes, student contributions     |

**Homepage Catalog:** 27 courses seeded in DB; only courses with `status = 'active'` resources are visible on `/`. Real-time metrics on course cards (`{n} مورد • {m} سؤال`). Segment switcher (IT ↔ General Requirements) + `<select>` quick-jump + 2-column mobile grid.

### 3.2 Ingestion Pipeline

Upload flow (`/api/upload`):

```
[Admin on /upload]
      │
      ├─ Client: pdfjs-dist WebWorker extracts text (up to 300k chars) + renders Page 1 canvas thumbnail
      │
      │  POST /api/upload (FormData)
      ├──────────────────────────────► [/api/upload Handler]
      │  202 { resourceId } in <150ms │  ┌─ SHA-256 duplicate check (409 on collision)
      │◄─────────────────────────────── │  ├─ Ghostscript compression (40MB → ~2MB, /ebook 150 DPI)
      │                                 │  ├─ pdf-lib watermarking (micro-pill badge + native PDF Link Annotation)
      │  GET /api/upload/progress/:id   │  ├─ Supabase Storage upload (Buffer.from(arrayBuffer) — no ArrayBuffer corruption)
      ├──────────────────────────────► │  └─ Gemini quiz synthesis (async, via Next.js after())
      │◄── SSE events (ProgressBus) ───┘
      │    uploading → processing → synthesizing → done
```

Key pipeline safeguards:

- **Magic byte verification** (`%PDF-` signature check before any processing)
- **SHA-256 duplicate gate** — HTTP 409 on collision, preventing storage bloat
- **`Buffer.from(arrayBuffer)` enforcement** — prevents silent binary truncation on Supabase Storage uploads
- **`sanitizeTextForPostgres()`** — strips `\u0000` null bytes that crash PostgreSQL UTF-8 storage
- **SSE dual-engine** — in-memory `ProgressBus` (0ms) + Supabase polling fallback (2s) for distributed deployments
- **`__processing__` leak defense** — `resourceId` and `publicUrl` are computed client-side before the first DB insert; `storage_url` is never a placeholder sentinel in production

### 3.3 Dynamic AI Question Bank Engine

| Document Volume                  | Characters      | Bank Size        |
| -------------------------------- | --------------- | ---------------- |
| Cheat-sheets (1–4 pages)         | < 8,000         | **15 questions** |
| Single lectures (5–12 pages)     | 8,000 – 25,000  | **25 questions** |
| Chapter summaries (13–30 pages)  | 25,000 – 60,000 | **35 questions** |
| Full course booklets (30+ pages) | > 60,000        | **50 questions** |

- Stratified by difficulty: **40% Easy / 40% Medium / 20% Hard**
- Each question tagged with Arabic `topic` and `subtopic` metadata for V2 adaptive drilling
- **4-Account Round-Robin Key Pool** (`GEMINI_API_KEYS`): rotates initial account index, flags exhausted keys with 5-minute cooldown (`keyCooldowns`), blacklists dead keys to skip wasted network round-trips
- On-demand admin re-generation via `/api/admin/resources/[id]/quiz` (`POST` / `DELETE`)
- Admin "Expand Bank" action appends non-duplicate questions to existing `quiz_data` JSONB

### 3.4 Native Quiz Player (`<NativeQuiz />`)

A pure client React 19 component with 4 visual states (Closed → Launcher Modal → Active Session → Results):

- **Zero runtime latency:** Pre-generated JSON starts in `0ms` on mobile — no spinners, no API calls on exam night
- **Adaptive Launcher:** Students independently pick **Volume** (`5` / `10 [default]` / `20` / `All`) and **Difficulty** (`متوازن` / `سهل` / `امتحاني` / `تحدي`). Graceful backfill if fewer hard questions exist than requested
- **Fisher-Yates option shuffling** on every session render — eliminates position-memorization traps by remapping `correctIndex` dynamically in memory
- **SVG circular score ring** (circumference math: `r=42, C=2πr`) with color-coded performance tiers
- **Fire-and-forget telemetry** (`/api/quiz/record-attempt`, `fetch(..., { keepalive: true })`) logging session metrics to `quiz_attempts` and question-level diagnostics to `quiz_attempt_answers`
- **localStorage score retention:** Completed scores persist across sessions (`molakhasat_quiz_history`). Docked quiz bar transforms from `[ ابدأ الكويز ❯ ]` to `[ نتيجتك السابقة: 9/10 (90%) 🏆 ] [ إعادة ↺ ]` on return

### 3.5 Thumbnail Engine

Generating PDF thumbnails server-side is impossible in Vercel Lambda (no native rasterization binaries):

1. **Client HTML5 Canvas (Primary):** `pdfjs-dist` worker renders Page 1 off-screen to a `<canvas>` (320px wide) → converts to JPEG blob (`quality: 0.82`) → attached to `FormData` → stored to `thumbnails/${resourceId}.jpg` in Supabase Storage
2. **YouTube zero-cost thumbnails:** Regex extracts video ID → sets `thumbnail_url = https://img.youtube.com/vi/${videoId}/hqdefault.jpg` with zero storage overhead
3. **CSS Digital Book Cover fallback:** If `thumbnail_url` is null or fails to load, renders an elegant CSS binder cover with category-specific gradients (Blue: summaries, Amber: exams, Emerald: guides, Violet: links), format badge (`PDF` / `LINK`), and decorative RTL book spine
4. **In-browser backfill** (`npm run backfill:thumbnails` / `/api/admin/thumbnails`): backfills legacy resources via browser canvas without CLI tools or server binaries

### 3.6 WhatsApp Virality Loops

Every feature is engineered to generate organic peer sharing:

- **Watermarked PDFs:** Every ingested PDF receives a micro-pill badge (`✦ molakhasat.me`, ~99pt wide, `opacity: 0.72` semi-translucent glassmorphism) stamped at bottom-gutter `y=5pt`. Native PDF Link Annotation covers the full pill bounding box — mobile students tap it to deep-link directly to `/r/:id`. SVG vector sparkle (`✦`) avoids the WinAnsi encoding crash of standard Helvetica fonts
- **Universal Redirect Engine (`/r/:id`):** `src/app/r/[id]/route.ts` dynamically resolves resource → course. Future domain/route changes are handled at DNS level without touching stored PDFs
- **1-Tap Resource Share:** Each card has a WhatsApp share trigger that pre-fills an Arabic recommendation message with a UTM deep link (`?res=${id}&utm_source=whatsapp&utm_medium=resource_share#res-${id}`). On arrival, the page scrolls to the card and triggers a **2.5-second highlight pulse** (`ring-2 ring-accent shadow-md`)
- **Quiz Score Challenge (Phase 3):** Results screen will generate a viral challenge message (`"جبت 9/10 في الجبر! بتقدر تجيب أعلى؟"`) for WhatsApp forwarding

### 3.7 Admin & Moderation System

- **Decoupled upload funnels:** `/upload` (no key) → public crowdsourcing, `status = 'pending'`. `/upload?key=...` → admin, `status = 'active'`
- **Split-tab moderation queue** (`/admin/resources`): Active tab + Pending tab with 1-click approve-to-Core / approve-to-Archive / reject with atomic storage purge
- **Binary immutability:** Replacing stored PDFs is prohibited. Wrong files are atomically deleted and re-uploaded clean. Metadata fields (`title`, `type`, `status`, `course_id`) are freely editable
- **Atomic DELETE:** `DELETE /api/admin/resources/[id]` purges physical binary from Supabase Storage then cascades DB deletion (`quiz_attempts` + `quiz_attempt_answers`)
- **1-Click AI Audit Modal:** Embedded in the Edit Resource modal — inline question inspection with answer keys, raw JSON export, and "Copy Verification Prompt for Claude/ChatGPT" for instant human review

---

## 4. Database Schema Contracts

**Key TypeScript types** (`src/types/database.ts`):

```typescript
// Resource taxonomy
type ResourceType =
  | "summary"
  | "quiz"
  | "past_exam"
  | "guide"
  | "link"
  | "other";
type TargetExam = "midterm" | "final" | "other";
type ResourceStatus = "processing" | "active" | "pending" | "rejected";

// Quiz JSON stored in resources.quiz_data (JSONB)
interface QuizData {
  version: 1;
  questions: QuizQuestion[]; // 15 | 25 | 35 | 50 based on doc volume
  generatedAt: string; // ISO timestamp
  sourceTitle?: string;
}

interface QuizQuestion {
  question: string;
  options: string[]; // Always exactly 4 options
  correctIndex: number; // 0-indexed
  explanation: string;
  difficulty?: "easy" | "medium" | "hard";
  topic?: string; // Arabic topic tag for adaptive drilling
  subtopic?: string;
}
```

**4-tier relational hierarchy:**

```
universities  (Jadara University)
  └── departments  (IT, English, University Requirements, Placement Exams, ...)
        └── courses  (CS101, Calculus 1, National Education, ...)
              └── resources  (PDFs, Quizzes, External Links)
```

**RLS Permission Matrix:**

| Role                      | Read Courses/Resources | Write Resources   | Bookmarks   |
| ------------------------- | ---------------------- | ----------------- | ----------- |
| **Guest (Anon)**          | ✅ Public SELECT       | ❌                | ❌          |
| **Student**               | ✅ Public SELECT       | ❌                | ✅ Own rows |
| **Admin (Ambassador)**    | ✅                     | ✅ Own department | ✅ Own rows |
| **Super Admin (Founder)** | ✅ Full                | ✅ Full           | ✅ Full     |

---

## 5. Operational Scripts

| Script              | Command                       | Description                                                                       |
| ------------------- | ----------------------------- | --------------------------------------------------------------------------------- |
| Dev server          | `npm run dev`                 | Next.js 16 + Turbopack at `localhost:3000`                                        |
| Type-check          | `npx tsc --noEmit`            | Full codebase type validation                                                     |
| Production build    | `npx next build --webpack`    | Webpack build (avoids Turbopack production source-map panic)                      |
| Seed quizzes        | `npm run seed:quizzes`        | Idempotent upsert of `src/quiz_seeds/*.json` → Supabase `resources.quiz_data`     |
| Backfill thumbnails | `npm run backfill:thumbnails` | Browser-canvas Page 1 JPEG extraction for legacy PDFs via `/api/admin/thumbnails` |
| Verify Gemini pool  | `npm run test:keys`           | Tests all 4 Gemini API keys with forced IPv4 + sub-token latency benchmarks       |

---

## 6. Project Status

### ✅ Phase 1 — Decoupled Foundation (Shipped, October 2026)

- [x] Supabase PostgreSQL schema (4-tier hierarchy, RLS policies, session pooler IPv4)
- [x] Next.js 16 App Router + React 19 + Vanilla CSS RTL mobile-first frontend
- [x] Real-time SSE Upload Pipeline (`ProgressBus` + DB polling fallback)
- [x] Ghostscript compression (40MB → ~2MB, `/ebook` 150 DPI, exploit flattening)
- [x] `pdf-lib` watermarking (micro-pill badge, SVG sparkle, native PDF Link Annotation)
- [x] Universal Redirect Engine (`/r/:id`) — permanent shortlinks
- [x] Dynamic AI Question Bank Engine (15–50 questions, `calculateDynamicBankSize`)
- [x] Adaptive `<NativeQuiz />` Player (launcher modal, Fisher-Yates shuffling, SVG score ring, telemetry)
- [x] 4-Account Gemini round-robin key pool + 429 cooldown + dead-key blacklisting
- [x] `npm run test:keys` automated key pool verifier
- [x] On-demand admin quiz synthesis (`/api/admin/resources/[id]/quiz`)
- [x] SHA-256 duplicate gate (HTTP 409 Conflict)
- [x] GitHub Linguist fix (PDF.js worker vendored in `.gitattributes`)

### ✅ Phase 2 — Launch Readiness Sprint (Shipped, October 2026)

- [x] Metadata expansion migration `20261020` (`page_count`, `file_hash`, `target_exam`, `academic_year`, `professor_name`, `author_name`)
- [x] 4-tier semantic shelf architecture (`ResourceList.tsx`)
- [x] Decoupled card islands + docked quiz action trays (mobile card height ↓50%)
- [x] Client-side HTML5 canvas PDF thumbnail generator + YouTube zero-cost thumbnails + CSS digital book cover fallback
- [x] In-browser thumbnail backfill engine (`/api/admin/thumbnails`)
- [x] 1-tap WhatsApp resource share + UTM deep-link + `#res-[id]` highlight pulse
- [x] `localStorage` quiz score retention (prior score badge on return)
- [x] Crowdsourcing funnel (`/upload` public, `pending` queue, frozen appreciation card, deep-link pre-selection)
- [x] Admin moderation queue (`/admin/resources`) — split-tab, 1-click approve/reject, atomic purge
- [x] Dynamic homepage metrics (`{n} مورد • {m} كويز • {q} سؤال` per course card)
- [x] 3-tier content engine (Core Curated Shelf / Community Archive Drawer / External Toolkit Grid)
- [x] Admin "Expand Bank" action (append non-duplicate Gemini questions)
- [x] Verified contributor badges + metadata chips (`📄 18 ص`, `مادة الميد`, `مادة الفاينل`)
- [x] WhatsApp community gateway card (Footer, `NEXT_PUBLIC_WHATSAPP_COMMUNITY_URL`)
- [x] `@vercel/analytics` integration (referrer detection, watermarked PDF UTM tracking)
- [x] 1-click AI Audit Modal + raw JSON export + verification prompt exporter
- [x] `sanitizeTextForPostgres()` — strips `\u0000` null bytes that crash PostgreSQL
- [x] `__processing__` storage_url leak defense (tri-layer: upfront URL allocation, upsert immunity, self-healing PATCH)
- [ ] **Content seeding** — 7 core courses (Calculus 1, C++, Data Structures, Discrete Math, Linear Algebra, National Education, Military Sciences)

### 🔜 Phase 3 — Student Personalization (Upcoming)

- [ ] Dynamic OpenGraph / WhatsApp social unfurl cards (`generateMetadata` on course pages)
- [ ] Quiz "Share My Score" WhatsApp challenge (viral peer acquisition loop)
- [ ] "My Saved Courses" `localStorage` carousel on homepage (`مقرراتي المحفوظة 📌`)
- [ ] In-app mobile fullscreen PDF reading sheet (sticky bottom action bar)
- [ ] Exam countdown alert pill (from `midterm_exam_date` / `final_exam_date` on `Course`)
- [ ] Frictionless auth (Supabase Magic Links / Google OAuth) — zero-login guest reading is never broken
- [ ] Diagnostic "Train My Weaknesses" mode (adaptive drilling from `quiz_attempt_answers` by Arabic topic tag)

### 🗺️ Phase 4 — Multi-University Scaling

- [ ] Multi-university routing (activate `DEFAULT_UNIVERSITY_SLUG` switching)
- [ ] Ambassador RBAC portal (scoped curation credentials per department)
- [ ] AI Campus Assistant RAG chatbot (Gemini Pro + Supabase vector store, hallucination-free)
- [ ] Hyper-local B2B campus sponsorships (Study Café / Student Housing partner pills)

---

## 7. Architecture Decisions & Gotchas

| Gotcha                              | Cause                                                                             | Fix                                                                                                                           |
| ----------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Supabase IPv6 timeout**           | Local Jordanian ISP drops IPv6 packets                                            | Always use Session Pooler (`aws-0-[region].pooler.supabase.com:5432`). Node scripts: `dns.setDefaultResultOrder('ipv4first')` |
| **Turbopack `revalidate` crash**    | AST static analysis can't resolve imported constants                              | Use literal numbers: `export const revalidate = 60;` — never `export const revalidate = CONSTANT;`                            |
| **Supabase ArrayBuffer corruption** | Web `ArrayBuffer` passed directly to `supabase.storage.upload()` truncates binary | Always wrap: `Buffer.from(arrayBuffer)`                                                                                       |
| **WinAnsi `✦` encoding crash**      | Helvetica/standard PDF fonts use Windows-1252 encoding                            | Render sparkle via `page.drawSvgPath()` SVG vector operators instead                                                          |
| **Gemini model 404**                | `gemini-2.0-flash` and `gemini-2.5-*` endpoints return HTTP 404                   | Always target `gemini-3.8-flash:generateContent`                                                                              |
| **PostgreSQL null-byte crash**      | `pdfjs-dist` / `pdf-parse` emits `\u0000` from malformed PDFs                     | Run `sanitizeTextForPostgres()` on `source_text`, `title`, `description` before DB writes                                     |
| **Supabase free-tier pause**        | Auto-pauses after 7 days of inactivity                                            | ISR + scheduled uptime monitor pinging `/api/courses` every 24h keeps queries active                                          |

---

## 8. Content Strategy & Liability

1. **Curated Excellence over Volume:** One definitive guide per subject, not 15 unverified uploads. Strict scope disclaimers on every resource
2. **Legal-Safe Professor Info:** No hardcoded contact directory. Static guide teaches students to use the university Moodle "Participants" tab (shifts maintenance liability back to the university)
3. **Volatile Data Exclusion:** No bus schedules, cafeteria hours, or anything that changes unofficially. If we can't guarantee accuracy, we don't host it
4. **Trust Disclaimer:** Non-invasive footer: "مبادرة طلابية لمساعدة الزملاء. غير تابعة رسمياً للجامعة"
5. **UGC Approval Queue:** Student uploads default to `status: 'pending'`, invisible to public until an admin approves

---

## 9. Growth & Acquisition Strategy

- **Freshmen Placement Hook:** Launch "Starter Kit" quizzes for Arabic, English, and Computer Skills placement exams before the semester begins — capturing users when they're most anxious and most receptive
- **Targeted Drop-Links:** When a student asks for a resource in a WhatsApp group, respond with the exact URL (`molakhasat.me/courses/calculus-1`) — not a generic "check my site"
- **Self-Referencing PDF Watermarks:** Every shared PDF carries the `molakhasat.me/r/:id` shortlink, turning peer file-forwarding into passive organic acquisition
- **The Ambassador Program:** At 200–500 users, recruit per-department "Ambassadors" (resume value: "IT Department Admin for campus-wide platform") to decentralize curation and monitoring

---

## 10. Sustainability & Monetization

**Core Golden Rule: Zero-login PDF reading is 100% free forever. No paywalls on course notes.**

- **Hyper-local B2B campus sponsorships** (Study Cafés, Student Housing, Electronics Repair shops near Jadara gates) — 1–2 sponsors at 50–100 JOD/month covers all infrastructure costs
- **No invasive ad networks.** Sponsorships rendered as curated "شريك الدراسة" partner pills — high-contrast, non-intrusive
- **Jordan CliQ tips** — friction-free micro-support from grateful students with no credit card required
- **The Macro Moat:** Live production system with real users is undeniable Proof of Work for DAAD scholarships, German Werkstudent positions, and remote engineering contracts

---

## 11. Key File Map

| File / Directory                                                                                                                                                                 | Purpose                                                                                                              |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| [`src/app/page.tsx`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/app/page.tsx)                                                                       | Landing page with segment switcher, course grid, real-time metrics (ISR `revalidate = 3600`)                         |
| [`src/app/courses/[slug]/page.tsx`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/app/courses/%5Bslug%5D/page.tsx)                                     | Course detail page with 4-tier shelf (ISR `revalidate = 60`)                                                         |
| [`src/app/r/[id]/route.ts`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/app/r/%5Bid%5D/route.ts)                                                     | Universal redirect engine — permanent shortlinks                                                                     |
| [`src/app/api/upload/route.ts`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/app/api/upload/route.ts)                                                 | Main ingestion pipeline (202 fast-accept + background worker)                                                        |
| [`src/app/api/upload/progress/[resourceId]/route.ts`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/app/api/upload/progress/%5BresourceId%5D/route.ts) | SSE live progress stream (`ProgressBus` + DB fallback)                                                               |
| [`src/app/api/admin/resources/[id]/quiz/route.ts`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/app/api/admin/resources/%5Bid%5D/quiz/route.ts)       | On-demand quiz generation / deletion                                                                                 |
| [`src/components/features/ResourceList.tsx`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/components/features/ResourceList.tsx)                       | 4-tier shelf renderer + card islands + WhatsApp share + highlight pulse                                              |
| [`src/components/features/NativeQuiz.tsx`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/components/features/NativeQuiz.tsx)                           | 4-state quiz client component (launcher → session → results)                                                         |
| [`src/components/features/UploadForm.tsx`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/components/features/UploadForm.tsx)                           | Upload form with WebWorker extraction + canvas thumbnail + SSE progress bar                                          |
| [`src/components/features/AdminResourceManager.tsx`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/components/features/AdminResourceManager.tsx)       | Admin CRUD console with moderation queue, audit modal, thumbnail backfill                                            |
| [`src/lib/pipeline/client-pdf-extractor.ts`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/lib/pipeline/client-pdf-extractor.ts)                       | `pdfjs-dist` WebWorker — text extraction + page count + thumbnail canvas render                                      |
| [`src/lib/pipeline/progress-bus.ts`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/lib/pipeline/progress-bus.ts)                                       | In-memory EventEmitter pub/sub for SSE pipeline events                                                               |
| [`src/lib/pipeline/gemini-quiz.ts`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/lib/pipeline/gemini-quiz.ts)                                         | Gemini REST client — round-robin key pool, 429 cooldown, dynamic bank sizing                                         |
| [`src/types/database.ts`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/types/database.ts)                                                             | TypeScript contracts for all DB tables — source of truth for schema                                                  |
| [`src/quiz_seeds/`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/quiz_seeds)                                                                          | Pre-generated quiz JSON banks for `npm run seed:quizzes`                                                             |
| [`scripts/seed-quizzes.ts`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/scripts/seed-quizzes.ts)                                                         | Idempotent upsert script — validates against `QuizData` schema, matches by `sourceTitle`                             |
| [`scripts/backfill-thumbnails.ts`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/scripts/backfill-thumbnails.ts)                                           | Node.js thumbnail backfill runner                                                                                    |
| [`scripts/verify-gemini-pool.mjs`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/scripts/verify-gemini-pool.mjs)                                           | Gemini key pool health checker (`npm run test:keys`)                                                                 |
| [`TECHNICAL_ANALYSIS.md`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/TECHNICAL_ANALYSIS.md)                                                             | **Living architectural master reference** — state machines, code breakdowns, environment quirks, engineering backlog |
| [`supabase/schema.sql`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/supabase/schema.sql)                                                                 | Full PostgreSQL schema with RLS policies                                                                             |
| [`supabase/seed.sql`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/supabase/seed.sql)                                                                     | Seed data (universities, departments, 27 courses)                                                                    |

---

_This README is the public-facing project overview. For deep architectural rationale, state machine diagrams, and environment troubleshooting, see [`TECHNICAL_ANALYSIS.md`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/TECHNICAL_ANALYSIS.md). Last updated: November 2026._
