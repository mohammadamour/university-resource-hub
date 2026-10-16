# Platform Architecture & Strategy Blueprint

## Molakhasat (ملخصات) - University Academic Resource Hub

> A fast, mobile-first, and curated single source of truth for university course materials and placement exams — replacing the chaos of ephemeral WhatsApp group chats.

---

## 🛠️ Quick Start: How to Run Locally

1. Open a terminal in the project root directory (`university resource hub`).
2. Run the development server:
   ```bash
   npm run dev
   ```
   _(If you've cloned fresh or added new packages, run `npm install` first)._
3. Open your browser and navigate to:
   👉 **http://localhost:3000**

---

## 1. Executive Summary & Core Vision

- **Mission:** Build a permanent, searchable, and highly curated single source of truth for university course materials.
- **Brand & Language:** Named "Molakhasat" (ملخصات), meaning summaries. The platform is primarily in Arabic to match the students' native language.
- **Target Content:** Initial focus on IT department courses (major focus) AND University Requirement/Elective courses (National Education, Communication Skills, Life Skills) which have massive cross-department enrollment.
- **Target Audience:** Newcomers and freshmen (Sanafer / سنافر), acting as their ultimate resource and guide for placement exams and introductory courses.
- **Timeline Constraints:** Aggressive 20-day timeline to launch before the first semester starts.
- **Budget Constraint:** $0/month deployment leveraging free-tier infrastructure.
- **Strategic Positioning:** Compliment, do not compete. The platform acts as a permanent link repository shared _inside_ WhatsApp.
- **Scaling Goal:** Capture 200-500 active users from Jadara University (out of 12k total) to hit a network-effect tipping point.

---

## 2. Technical Architecture & Data Model

### Infrastructure Stack (Zero-Cost Focus)

| Layer                  | Technology                       | Why                                                                                      |
| ---------------------- | -------------------------------- | ---------------------------------------------------------------------------------------- |
| **Database & Auth**    | Supabase (PostgreSQL)            | Indexed relational data + magic-link auth                                                |
| **Object Storage**     | Cloudflare R2                    | Zero-egress cost hosting of compressed PDF assets                                        |
| **Hosting & Frontend** | Vercel or Render + Next.js/React | SSR, fast deploys, generous free tier                                                    |
| **Styling**            | Tailwind CSS                     | Rapid UI development                                                                     |
| **CI/CD & DevOps**     | GitHub Actions / Vercel CI       | Automated deployments and future integrations (Sentry for error tracking, Azure for AI). |

### Infrastructure Edge Cases & Decisions

- **Storage Privacy:** Cloudflare R2 will remain **Public** for V1 to ensure maximum speed and simplicity. The risk of scrapers is deemed low initially.
- **Anonymous Access:** The platform must be completely frictionless. Guest users can read/download any file without an account. We will rely on Next.js API rate-limiting rather than forced auth to prevent abuse.
- **Rendering Strategy (Next.js):** To survive exam-night traffic spikes without exhausting the Supabase free tier, we will use **Incremental Static Regeneration (ISR)**. Next.js will cache pages statically and re-validate them periodically in the background.
- **Development Environments:** V1 will use a single production database to move fast. A separate staging environment will be introduced later as user risk increases.

### Data Model, "Doctor Shift" Mitigation & Scalability

The database schema uses an **extended hierarchy** (University → Department → Course Code → Instructor/Doctor → Semester/Year).

- **Hidden Complexity (V1 Backend):** The backend MUST be fully built out for multi-university and multi-department scaling from Day 1 (schema, foreign keys, routing logic). We will not retroactively refactor the backend when things change.
- **V1 Simplification (Frontend):** The UI will completely hide this backend complexity. The frontend will hard-assume "Jadara University" and show a flat list or basic filtering for courses initially. We just expose the UI filters later when volume dictates it.

### Auth, User Profiles & Bookmarks (Schema Foundation)

To transition from a "repository" to a "platform," the schema will include tables for users and personalization from Day 1, even if the UI for registration is hidden in V1:

- `users` (Managed by Supabase Auth).
- `profiles` (Linked to Auth, storing Major/Department).
- `bookmarks` (Join table linking `user_id` to `course_id` or `resource_id` for quick access).

### Security & Role-Based Access Control (RBAC)

We will implement strict Supabase Row Level Security (RLS) from the beginning using a multi-tiered role system:

- **Super Admin (Founder):** Can manage universities, departments, users, and all resources.
- **Admin (Future Ambassadors):** Can only upload, edit, and delete resources within their assigned department.
- **User (Students):** Can only read resources and manage their personal bookmarks.

### The PDF Compression Pipeline

Scanned notes create massive file sizes that exhaust storage.

- **Solution:** A Ghostscript pipeline downsampling embedded images to 150 DPI (`/ebook` setting).
- **Result:** Reduces 40MB raw scans to ~2MB with zero loss in readability, while flattening objects to strip out potential malicious code.

---

## 3. Core Features & Scope Management

### Phase 1 MVP (The "Anti-Feature Creep" Strategy)

| Feature                       | Decision                                                                                                                                                                                                                                                                          |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Admin Panel**               | ❌ No custom CMS in V1. Saves 60% of dev time. All V1 resource uploads and management will be done directly through the **Supabase Dashboard UI** (drag-and-drop storage + table editor) to avoid hardcoding files in the frontend.                                               |
| **UI/UX Philosophy**          | ✅ Simple, lightweight, fast (optimized for mobile data). Layout mimics the official university portal for instant familiarity, but distinct enough to avoid looking like a scam.                                                                                                 |
| **Mobile-First Design**       | ✅ Built explicitly for smartphones and iPads, as this is how 90% of students access resources on campus.                                                                                                                                                                         |
| **Unified Hierarchy**         | ✅ Single `CourseView` page dynamically renders folders (Summaries, Quizzes, Past Exams) from DB rows. Empty states handled gracefully.                                                                                                                                           |
| **In-App Browser Resilience** | ✅ UI optimized to render PDFs cleanly inside WhatsApp/Telegram embedded browsers.                                                                                                                                                                                                |
| **Trust Disclaimer**          | ✅ A clear, non-invasive footer disclaimer stating: "A student-made initiative to help peers. Not officially affiliated with the university."                                                                                                                                     |
| **"Fake Departments"**        | ✅ The UI will group courses by major (e.g., IT), but will include prominent "fake departments" for _University Electives_ and _Placement Exams/Prep_ to capture all students.                                                                                                    |
| **Campus Survival Guides**    | ✅ High-value, static guides solving the "unwritten rules" of campus: Library usage, Wi-Fi connection, Cafe menus, and navigating portals. This bypasses the toxic/unreliable nature of massive WhatsApp groups. _Constraint: Absolutely NO financial advice to avoid liability._ |

### Content Strategy & Liability Mitigation

To provide maximum value while avoiding legal or academic liability, the platform strictly adheres to these content rules:

1. **The "What is this course?" Solution:** Instead of subjective reviews, we utilize the database `description` field for a 2-sentence objective summary, and upload the **Official University Syllabus (الخطة الدراسية)** as a PDF resource for each course.
2. **Professor Offices & Contact Info:** Instead of hardcoding a directory (which raises privacy/maintenance issues), we use a static guide to explain the general building layouts, and we document a "Moodle Hack" (teaching students to check the 'Participants' tab in their e-learning courses to extract official emails/locations directly from the university system). This shifts liability and maintenance entirely back to the university.
3. **Volatile Information Exclusion:** We explicitly exclude data that changes unofficially and frequently (e.g., Campus bus schedules). If a student misses an exam because our bus schedule was wrong, the platform takes the blame. If we can't guarantee the data, we don't host it.
4. **Universal WhatsApp Directories:** Instead of trying to host every piece of communication, we will provide a curated list of "Universal WhatsApp Groups" (e.g., Book Exchange, Placement Exams prep, University Electives). This centralizes the scattered links into one trusted place without having to build a chat feature.

### The Native Interactive Quiz Engine (Implemented)

- **Architecture:** Custom `<NativeQuiz />` React 19 component rendering pre-generated JSON quizzes natively with zero external iframes and zero third-party `X-Frame-Options` blocks.
- **Dynamic Bank Sizing (15–50 Questions):** Rather than fixed 10-question tests, the synthesis engine dynamically scales bank sizes based on source character density:
  - `< 8,000 chars` (~1–4 pages, cheat-sheets): **15 questions**
  - `8,000 – 25,000 chars` (~5–12 pages, single lectures): **25 questions**
  - `25,000 – 60,000 chars` (~13–30 pages, chapter summaries): **35 questions**
  - `> 60,000 chars` (30+ pages, full course syllabus booklets): **50 questions**
- **Adaptive Launcher Modal & Decoupled Controls:**
  - Students independently choose **Volume** (`5`, `10 [Default]`, `20`, `All`) and **Difficulty** (`متوازن [Default: 40% Easy, 40% Med, 20% Hard]`, `مفاهيم (سهل)`, `امتحاني (متوسط)`, `تحدي (متقدم)`).
  - *Graceful Backfill:* If a student requests 20 "Hard" questions and the bank only has 10, the algorithm takes all 10 hard questions and backfills 10 from medium with a polite UI notification.
- **Dynamic In-Session Option Shuffling:** On every question display, option positions are randomized via Fisher-Yates and `correctIndex` is dynamically remapped in memory, completely eliminating option letter/position memorization traps.
- **Data Flow & Telemetry Lifecycle:**
  1. **Upload Pipeline / Seeding:** Asynchronous background worker calls Gemini 3.8 Flash (`gemini-quiz.ts`) with syllabus-wide scanning to output structured JSON with `topic` and `difficulty` metadata.
  2. **Storage:** Stored in a `quiz_data` (JSONB) column in the Supabase `resources` table.
  3. **Frontend Rendering:** `ResourceList.tsx` detects `quiz_data` and mounts `<NativeQuiz />` directly inline.
  4. **Diagnostic Attempt Logging:** Upon quiz completion, a fire-and-forget beacon (`/api/quiz/record-attempt`) logs session metrics and question-level responses to `quiz_attempts` and `quiz_attempt_answers` (supports anonymous guest tokens today and user profiles in V2).
- **Core Benefits:**
  - **Zero Runtime Latency:** Tests start in `0ms` on mobile with zero spinners and zero runtime API quota exhaustion during exam nights.
  - **Infinite Replayability:** Re-taking a quiz pulls a fresh random sample with freshly randomized choices.
  - **Future-Proof Diagnostic Foundation:** Structured attempt history enables upcoming V2 features like "Train My Weaknesses".

---

## 4. Operational Hurdles & Mitigation Strategy

| Existential Risk                | Root Cause                                   | Systemic Solution                                                                                                                                                 |
| ------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Trust Liability / Bad Notes** | Unverified files cause failed exams          | **Curated Excellence:** Publish only _one_ definitive guide per subject. Enforce strict **Scope Disclaimers** detailing exactly what chapters are/aren't covered. |
| **Cold-Start Seeding**          | Manually uploading 100+ files is exhausting  | **Batch Ingestion Script:** Node/Python script to process a local `/seed_files` folder and bulk-upload metadata to Supabase.                                      |
| **Endless UX Tweaking**         | Getting trapped in "fake work" before launch | **The 80/20 Rule:** If the site loads fast and a user can find their Doctor's PDF in under 3 clicks, stop tweaking and ship.                                      |

---

## 5. Growth, Launch & User Acquisition

### 1. The Freshmen Placement Hook

Capture users **before** the semester begins. Launch a "Freshmen Starter Kit" containing interactive prep quizzes for Arabic, English, and Computer Skills. This secures a captive audience looking for immediate value.

### 2. Organic Footers (The Referral Engine)

Every PDF processed through the pipeline receives a subtle footer watermark:

```
Indexed via [YourSite.com] • Original Author: [Name] / Batch '[Year]
```

When students share the raw PDF in private chats, the document itself acts as an organic referral link back to the platform.

### 3. High-Touch Manual Distribution & Targeted Drop-Links

Growth in V1 will be completely manual, organic, and face-to-face.

- Pitch the platform directly to peers and the incoming batch of freshmen to gather immediate qualitative feedback.
- Do **not** broadcast generic "Check out my site" messages or spam links everywhere, as this feels invasive and creates a bad reputation.
- Instead, when a student asks a specific question in a group chat, drop the **exact URL** as the highly relevant answer:

```
Site.com/CS101/Midterm-Quiz
```

### 4. The Front-Loaded Study Loop

Use the platform as an academic weapon for yourself:

1. When course registration opens, grab the syllabi
2. Summarize the first 3 chapters
3. Generate quizzes _before_ the semester starts
4. Lock in high grades while stocking the site with Day 1 inventory

### 5. The Ambassador Program (Long-Term Scaling)

Once the platform hits the tipping point (200-500 users), recruit "Ambassadors" from other departments (and eventually other universities).

- **Value Proposition for them:** A powerful resume booster ("X Department Admin for campus-wide resource platform").
- **Value for the platform:** Decentralized curation and monitoring. The founder transitions to an administrative/oversight role rather than a manual content creator.

### 6. User-Generated Content (UGC) Pipeline & Architecture

V1 relies on manual curation to ensure high quality and trust. True scale requires UGC (allowing users to upload their own resources), which introduces architectural risks.

To prevent the platform from becoming an unorganized "dump", V2 will implement the following UGC strategies:

1. **The "Verified" Badge Pattern:** No separate tabs for user uploads. All resources live inside their specific Course bucket. Resources uploaded by Admins/Founders receive a "Verified (موثّق)" badge. Student uploads live below them, marked as community contributions.
2. **The "Missing Course" Policy:** Users **cannot** manually type course names during upload (prevents database fragmentation like "CS 101" vs "cs101"). They must select from existing courses. If a course is missing, they submit a "Request Course" form.
3. **The Approval Queue:** Student uploads default to `status: 'pending'` in the database. They do not appear on the live site until an Ambassador or Founder reviews and marks them as `approved`. This protects the platform's academic reputation from incorrect or malicious files.
4. **Security & Sanitization:** The pipeline will require strict MIME-type validation, 10MB size limits, and Ghostscript flattening to strip embedded payloads before reaching public storage buckets (Supabase/R2).
5. **The Automated Quiz Synthesis Pipeline (Summary → AI Question Bank):**
   - **The Friction Bottleneck:** Students cannot and will not manually type out 20 questions, answer options, and explanations into an upload form. Forcing manual quiz creation guarantees zero quiz submissions.
   - **The Solution:** Students upload what they already own: **Summaries (ملخصات)** and lecture notes. During the backend ingestion pipeline:
     1. Client or server extracts text up to 300,000 characters from the uploaded PDF.
     2. An asynchronous background worker calls **Gemini 3.8 Flash** with dynamic bank sizing (`calculateDynamicBankSize` producing 15 to 50 questions depending on document volume) and syllabus-wide coverage rules.
     3. The server attaches this structured JSON to the resource in the `quiz_data` (JSONB) column in Supabase, broadcasting live progress over the Server-Sent Events (SSE) bus.
   - **The "2-for-1" Value Multiplier:** A single upload produces two assets: the watermarked PDF summary + a multi-difficulty interactive quiz bank for peers.
6. **Adaptive Question Banks & Diagnostic Quizzes (Implemented):**
   - **Dynamic Sizing & Stratification:** Generates 15–50 questions proportionally stratified (40% Easy, 40% Medium, 20% Hard) and tagged with Arabic `topic` metadata.
   - **Client-Side Adaptive Launcher:** `<NativeQuiz />` provides decoupled **Volume** (`5`, `10`, `20`, `All`) and **Difficulty** (`متوازن`, `سهل`, `متوسط`, `متقدم`) selectors with automatic priority backfill.
   - **Dynamic Option Shuffling:** Randomizes choice positions on each start to eliminate muscle-memory answer memorization.
   - **Diagnostic Telemetry Schema:** Logs session metrics to `quiz_attempts` and question-level responses to `quiz_attempt_answers` via fire-and-forget beacon (`/api/quiz/record-attempt`), powering the future *"Train My Weaknesses"* dashboard.

### 7. The AI Campus Assistant (V2+ Feature)

To strictly prevent feature creep, V1 will not include a chatbot. However, as the repository of static guides, course descriptions, and syllabi grows, V2 will introduce a Gemini Pro-powered chatbot using the **RAG (Retrieval-Augmented Generation)** pattern.

- **The RAG Constraint:** The AI will _only_ be allowed to answer questions based on the text existing in the platform's database. This completely eliminates hallucinations about university policies.
- **Value:** Instead of clicking through 5 menus to find the GPA calculation formula or the library hours, a student can just ask the AI, which will instantly retrieve and summarize the exact paragraph from the static guides.

---

## 6. Development Timeline & Code Scope

**Total estimated time to launch: 20 Days (Strict deadline before Fall semester starts)**

```
Days 1–5   │ CORE INFRASTRUCTURE & SEEDING
           │ • Setup Supabase Database (Schema for future-proof filtering)
           │ • Setup Supabase Storage for V1 file hosting (Pivot: Cloudflare R2 delayed to V2)
           │ • Skip Ghostscript/AI automation for V1 (Anti-feature creep)
           │
Days 6–14  │ FRONTEND MVP (~18–24 hours)
           │ • Build MVP (~1,000 LOC across 3 main views)
           │   ├── Landing Page (Targeted at Sanafer/Freshmen)
           │   ├── Course Hub (Simple view, no mandatory Doctor filtering yet)
           │   └── PDF Renderer
           │
Days 15–20 │ QA & LAUNCH
           │ • Seed initial database rows
           │ • QA test on mobile devices (WhatsApp in-app browser)
           │ • Deploy to Vercel and soft-launch via targeted group links
```

---

## 7. Social Dynamics & Founder Positioning

> Building this platform shifts your reputation from "student" to "execution-oriented engineer."

### Avoiding the "Utility Trap"

- **The Trap:** Becoming an unpaid 24/7 tutor or custom-making notes to win social approval.
- **The Pivot:** Use the platform to deliver value at scale. When users message with thanks, acknowledge briefly, then pivot to peer-to-peer conversation.
- **Maintain Boundaries:** Speak as an equal, not a customer service rep.

### The Integrity Firewall & Screenshot Immunity

- Treat every user — male or female — with the **exact same** direct, polite, and professional baseline.
- This guarantees zero vulnerability to out-of-context screenshots, protects your brand, and acts as a natural filter.
- Let the platform handle your "exposure area." High campus visibility + absolute professionalism = unassailable social standing.

---

## Project Status

- [x] Strategic planning & architecture design
- [x] Database schema & infrastructure setup (Supabase PostgreSQL, RLS policies, session pooler IPv4)
- [x] Frontend MVP development (Next.js 16 App Router, React 19, Vanilla CSS, RTL, mobile-first)
- [x] Real-time SSE Upload Ingestion Pipeline (Ghostscript compression, 300k-char text extraction, PDF watermarking)
- [x] Dynamic AI Question Bank Engine (15–50 questions scaling by volume, syllabus-wide scanning, topic/difficulty metadata)
- [x] Adaptive Native Quiz Player (`<NativeQuiz />` launcher modal, option shuffling, graceful backfill, telemetry beaconing)
- [ ] Seed file collection & compression (Curating definitive summaries for initial course catalog)
- [ ] QA testing & mobile optimization (WhatsApp / Telegram in-app browser validation)
- [ ] Launch & user acquisition

---

_This README serves as the living master reference for the project. It will be updated as decisions evolve and development progresses._

to do

- [ ] **Configure `.env` for Watermarking:** Add a `PLATFORM_URL` placeholder variable (e.g., `https://REDIRECT_HOLDER.com`) to use during seeding.
- [ ] **Implement `pdf-lib` Script:** Build the automated watermarking pipeline mapping clickable links to a dedicated redirect route (`/r/:id`) instead of static destinations.
- [ ] **Seed Prototype Data:** Run the ingestion pipeline to watermark and store the initial batch of PDFs using the placeholder domain.
- [ ] **Prepare Migration Script:** Save a "Find & Replace" script using `pdf-lib`'s annotation scanner as a fail-safe to update URLs in bulk upon deployment.
