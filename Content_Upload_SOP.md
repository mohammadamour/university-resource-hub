# 📋 Content Curation & Upload SOP

A lean, zero-friction protocol for seeding high-yield university materials, generating aesthetic PDFs, and verifying AI quizzes.

---

## 🎯 1. Definition of "Course Done" (Midterm Season MVP)

A course is considered **DONE** and ready for students when it has:
1. **Tier 1 (Core Shelf):** 1x Midterm Gold Summary (with AI Quiz) + 1x Solved Past Midterm Bank.
2. **Tier 2 (Archive Drawer):** 1x Merged Official Slides/Textbook (Midterm Scope only: Ch 1–X).
3. **Tier 3 (Toolkit Grid):** 1x Curated YouTube Playlist link (Best Arabic lecturer/channel).

*Do NOT waste time on Final exam materials right now. Win Midterm season first.*

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
