# 📋 Content Curation & Upload SOP

A lean, zero-friction protocol for seeding high-yield university materials, generating aesthetic PDFs, and verifying AI quizzes.

---

## 🎯 1. Definition of "Course Done" (Midterm Season MVP)

A course is considered **DONE** and ready for students when it has:

1. **Tier 1 (Core Shelf):** 1x Midterm Gold Summary (with AI Quiz) + 1x Solved Past Midterm Bank.
2. **Tier 2 (Archive Drawer):** 1x Merged Official Slides/Textbook (Midterm Scope only: Ch 1–X).
3. **Tier 3 (Toolkit Grid):** 1x Curated YouTube Playlist link (Best Arabic lecturer/channel).

_Do NOT waste time on Final exam materials right now. Win Midterm season first._

---

## ⚡ 2. The 4-Step Upload Workflow

```
[1. Select] ➔ [2. Generate Aesthetic PDF] ➔ [3. Ingest via Admin] ➔ [4. 3-Min Audit]
```

1. **Select Scope:** Focus strictly on Midterm chapters (e.g., Chapters 1–5).
2. **Generate Aesthetic PDF:** Use Prompt 1 below in Claude. It generates a self-contained HTML document. Open it in Chrome/Edge, press **`Ctrl + P`** ➔ **Save as PDF**. Clean vector styling in 5 seconds.
3. **Admin Ingest (`/admin/resources`):**
   - **Tier 1 (`is_featured: true`):** The primary Midterm Summary & Past Exam sheets.
   - **Tier 2 (`is_featured: false`):** The Merged Slides & individual chapter slides.
   - Title standard: `[Topic / Scope] | [Description]` (e.g., `فصول الميد (1-5) | السلايدات الرسمية المعتمَدة`).
4. **3-Minute Sanity Gate:**
   - Check TOC / Chapter alignment (30s).
   - Spot-check 1 complex formula or code block (60s).
   - Audit the generated quiz using Prompt 2 below (60s).

---

## 🧠 3. Master AI Summary Prompt (HTML-to-PDF Engine)

> Attach your raw slides or lecture notes to Claude/GPT and prepend this prompt. It autonomously selects the best structural archetype for the subject and outputs a single-file, beautifully styled HTML page ready for 1-click PDF export via **`Ctrl + P`**.

```text
You are an expert university professor and senior academic tutor preparing an ultra-focused, visually stunning "Midterm Exam Survival Guide" for university students.

Analyze the attached lecture materials and output the summary as a SINGLE, SELF-CONTAINED HTML DOCUMENT with embedded CSS, fully styled and optimized for printing to PDF (@media print).

### 1. THE PARETO PRINCIPLE (80/20 RULE):
- Do NOT produce a dense textbook. Focus exclusively on the vital 20% of concepts, formulas, code patterns, and theorems that drive 80% of exam grades.
- Eliminate historical filler, long-winded introductions, and redundant commentary.

### 2. ADAPTIVE DOCUMENT STRUCTURE:
Autonomously analyze the subject matter and select the optimal structure that best fits the material:
- For Code/Programming Courses (e.g., C++, OOP, Python): Emphasize syntax cheat sheets, execution flow, edge cases (pointers, nulls, indexing), and annotated code blocks with line-by-line breakdown.
- For Math/Theoretical Courses (e.g., Calculus, Discrete Math, Linear Algebra): Emphasize formula reference cards, step-by-step calculation ladders, theorems, and counter-example proofs.
- For Systems/Conceptual Courses (e.g., Networks, Security, OS, Database): Emphasize high-density comparison tables, architectural diagrams, mental models, and component hierarchies.

Regardless of the course type, you MUST always include:
- Visual Callouts for "Exam Traps & Common Pitfalls" (فخاخ الامتحان): Explicitly call out tricky questions, syntax traps, and common calculation mistakes professors love to test in multiple-choice exams.
- High-Yield Solved Examples: Realistic exam-level problems solved with clear step-by-step logic.
- Bilingual Terminology Glossary (at the end): A clean 3-column table bridging English and Arabic:
  | English Term | المصطلح بالعربية | الشرح المبسط (Conceptual Meaning) |

### 3. EXECUTIVE-TIER VISUAL STYLING (Embedded CSS):
The HTML must look modern, elegant, and professional when exported to PDF. Include clean internal CSS:
- Typography: Import and use Google Font 'Cairo' or 'Tajawal' with dir="rtl" on body. Set crisp line-height (1.6) and high-contrast color scheme (dark slate text on clean off-white background).
- Language Convention: Explanations in academic Arabic; all code, technical terms, math notation, and symbols strictly preserved in English.
- Callout Cards: Modern rounded cards (border-radius: 12px) with subtle background tints and colored left/right accent borders:
  * Amber/Red callout for Exam Traps (⚠️ فخ امتحاني).
  * Emerald/Blue callout for Golden Rules & Theorems (💡 قاعدة ذهبية).
  * Slate/Dark callout with monospace font for Code Blocks (💻 مثال برمجي).
- Tables: Minimalist modern borders, styled header with subtle background, alternating row shading.
- Print Formatting: Include @media print rules with @page { margin: 15mm; size: A4; } and page-break-inside: avoid on cards and tables so sections don't get awkwardly split across pages.

Return ONLY the complete raw HTML code starting with <!DOCTYPE html>.
```

---

## 🔍 4. Quick Quiz Verification Prompt (Copy-Paste to Claude/GPT)

> Use this when checking generated quizzes from Molakhasat's AI quiz generator, or click `[🧠 نسخ برومبت تدقيق]` inside the Admin Edit Modal.

```text
We auto-generate multiple-choice practice quizzes for university students using an LLM. Below is a question bank consisting of question stems, options, the flagged correct answer, and explanations.

Please audit this batch for accuracy and fairness:
1. Scientific & Logical Correctness: Are any formulas, code outputs, calculations, or statements mathematically/factually wrong?
2. Answer Key Integrity: Is the option marked as [✓ CORRECT] 100% indisputably correct? Are any distractors accidentally valid?
3. Coverage & Blindspots: Is there an obvious skew (e.g., all questions from Chapter 1 while Chapters 3-4 are neglected)?
4. Actionable Fix: If a question is defective, state its number and provide the corrected question, options, or answer key.

---
[PASTE QUESTIONS / EXPORTED JSON HERE]
```

---

## 🎯 5. Standardized AI Quiz Generation Prompt

> Use this standardized prompt with **Claude, ChatGPT, or Gemini** when generating quiz banks from lecture slides, summaries, or past exams. Paste the resulting JSON directly into the **Admin Import Drawer (`📥`)** or save it in [`src/quiz_seeds/`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/src/quiz_seeds/).

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

prompt for question extraction from screenshots and generation of pdf:
I'm uploading [screenshots / exam PDFs / course & lab PDFs] for [Course Name]. Run my 3-step Question Bank & Quiz JSON pipeline:

1. Extract & Deduplicate:
   - Extract all valid, high-value questions from the uploaded materials.
   - Remove duplicates, garbled/unclear captures, and non-question screens. If multiple batches or lecture + lab files are provided, merge them into one deduplicated bank.

2. Standardize to Quiz JSON:
   - Use this exact schema:
     {
     "version": 1,
     "sourceTitle": "[Course / Resource Title]",
     "questions": [
     {
     "chapter": "...",
     "topic": "...",
     "difficulty": "easy | medium | hard",
     "tags": ["..."],
     "question": "...",
     "options": ["...", "...", "...", "..."],
     "correctIndex": 0,
     "explanation": "..."
     }
     ]
     }
   - Language loyalty: Match the source language (Arabic for Arabic courses; English for IT/Science/Math, with brief Arabic in parentheses only for tough terms).
   - Options: Exactly 4 unique choices. No letter prefixes (A, B, C, D) and no "All/None of the above" (reframe True/False, 3-option, or "All of the above" items into 4 concrete choices).
   - Balance & Formatting: Distribute `correctIndex` evenly across 0, 1, 2, 3; target ~35% easy, 40% medium, 25% hard; use plain text + Unicode math only (never LaTeX `$...$`).
   - Provide the full JSON file for download (and a curated 30–40 high-value JSON if the full bank is larger).

3. Generate 1:1 Synced Question Bank PDF:
   - Using HTML → A4 PDF, build a clean, student-readable practice question bank PDF directly from the finalized JSON (exact same questions, 4 options, checked/highlighted correct answers, and explanations).
   - Include a Page 1 overview table of question counts by chapter/module, keep every question card intact without splitting across pages, and support proper RTL/LTR formatting.

# SYSTEM CONTEXT & PROJECT ONBOARDING: University Study Platform Pipeline

## 1. Who I Am & What We Are Building

I am building and maintaining an online university student resource-sharing platform. Rather than sharing raw, fragmented lecture slides or messy screenshots of past online exams (Moodle / MS Forms / e-learning portals), I use a standardized pipeline to turn raw course files into three polished student resources:

1. **Interactive Platform Quizzes (`JSON`)**: Standardized JSON files that my platform's quiz engine ingests directly.
2. **Synced Printable Question Bank Study Files (`PDF`)**: Clean, well-formatted A4 PDF study banks containing the exact same questions, 4 options, marked correct answers (`✓`), and concise explanations as the JSON file.
3. **Exam Survival Guide Summaries (`HTML`)**: Self-contained, 80/20 high-yield HTML study guides (Midterm or Final) that are both **mobile-first (zero horizontal scrolling on phones)** and **A4 print-ready**.

In this chat, I will upload course materials (lecture slides, lab sheets, or PDFs/screenshots of past exams) for one or more subjects and ask you to run one or more of the workflows below.

---

## 2. Core Workflows & Technical Standards

### WORKFLOW 1: Past-Exam Extraction & Question Bank Generation (`JSON` + `1:1 PDF`)

When I share past exam screenshot compilations or lecture/lab PDFs and ask for a question bank or quiz:

#### A. Extraction & Question Engineering Rules

- **Source Modes**:
  - **Past Exam Screenshots Mode**: Extract every readable question from the screenshots, deduplicate repeated screenshots, discard unreadable/garbled items, verify the correct answer scientifically (note if a student's selected radio button in a screenshot was wrong), and write a brief, clear explanation for why the correct answer is right.
  - **Lecture / Lab Material Mode**: Generate high-yield exam-style questions (definitions, edge cases, code/packet traces, and calculations) covering all attached files. If I ask for both a full bank and a curated high-value bank (e.g., top 30–40 questions), provide both.
- **Strict 4-Option Rule**:
  - Every question MUST have **exactly 4 unique options**.
  - **No letter prefixes** inside option strings (do NOT write `"A) ..."` or `"أ. ..."`).
  - **NEVER use `"All of the above"` / `"جميع ما ذكر"` or `"None of the above"` / `"لا شيء مما ذكر"`**. If an original exam question is True/False, has 2–3 options, or uses "All/None of the above", reframe the question stem or rewrite the distractor options into 4 concrete, mutually exclusive choices while testing the exact same concept.
- **Balanced Distribution**:
  - `correctIndex` (`0, 1, 2, 3`): Distribute evenly (~25% each) across the bank so the correct answer isn't always index `0` or `1`.
  - `difficulty`: Calibrate across `"easy"` (~35%), `"medium"` (~40%), and `"hard"` (~25%).
- **Formatting & Language**:
  - Plain text + Unicode symbols (`∀, ¬, ∧, ∨, →, ≤, ≥, ≠, x², √`) only — **never use LaTeX (`$...$`)** inside JSON strings.
  - **Language loyalty**: If the course material is in Arabic, write everything in clear academic Arabic. If the course material is in English (IT, CS, Math, Engineering), write questions, options, and explanations in English (adding brief Arabic translations in parentheses only for tough conceptual terms where helpful).

#### B. Required JSON Schema (`[course_name]_exam_bank.json`)

```json
{
  "version": 1,
  "sourceTitle": "[Course Name — Resource Title]",
  "questions": [
    {
      "chapter": "[Module / Chapter Name]",
      "topic": "[Specific Concept]",
      "difficulty": "easy | medium | hard",
      "tags": ["tag1", "tag2"],
      "question": "Clear question stem...",
      "options": [
        "Option 0 text",
        "Option 1 text",
        "Option 2 text",
        "Option 3 text"
      ],
      "correctIndex": 0,
      "explanation": "Concise explanation of why the correct option is right and why common traps fail."
    }
  ]
}
```
