# 🎯 دليل إنشاء وتوليد الكويزات التفاعلية (Quiz Seeds)

هذا المجلد مخصص لحفظ ملفات الكويزات بصيغة JSON. يمكنك توليد الكويزات عبر أي نموذج ذكاء اصطناعي (Gemini, Claude, ChatGPT) باتباع الخطوات التالية:

---

## 📋 1. البرومبت المعتمد لنسخه إلى الذكاء الاصطناعي (Master Prompt)

انسخ البرومبت الموحد التالي وألصقه في محادثتك مع Claude أو ChatGPT أو Gemini مع إرفاق السلايدات أو الملخص (مطابق لمعيار [`Content_Upload_SOP.md`](file:///c:/Users/somet/Downloads/Coding/university%20resource%20hub/Content_Upload_SOP.md)):

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

## 💾 2. كيفية إضافة الكويز إلى الموقع

1. خذ رد الـ JSON واحفظه في ملف داخل هذا المجلد (`src/quiz_seeds/`) باسم واضح، مثل:
   - `calculus-limits.json`
   - `data-structures-arrays.json`
   *(أو الصق الـ JSON مباشرة في المحادثة وسيقوم المساعد بحفظه لك)*.

2. لتطبيق الكويزات ورفعها تلقائياً إلى قاعدة بيانات Supabase، شغّل الأمر:
   ```bash
   npm run seed:quizzes
   ```

3. سيقوم السكربت بمطابقة الكويز مع المورد المقابل وتحديث عمود `quiz_data` فوراً، ليظهر الكويز التفاعلي على صفحة المادة!

---

## 🚀 الرؤية المستقبلية: بنك الأسئلة التفاعلي والتعلّم التكيّفي (Adaptive Quiz Engine)

بدلاً من الاكتفاء باختبار ثابت من 10 أسئلة (تنتهي قيمته بعد محاولة واحدة)، تم تصميم المعمارية لتتوسع مستقبلاً إلى **بنك أسئلة ذكي (Question Bank)** يحتوي على 30 إلى 50 سؤالاً لكل مادة/وحدة مع وسوم وصفية:

### الميزات المخططة (Roadmap):
1. **توليد بنك أسئلة موسع (30-50 سؤال):**
   - إضافة بيانات وصفية (Metadata) لكل سؤال:
     - `difficulty`: `"easy"` | `"medium"` | `"hard"`
     - `topic` / `subtopic`: اسم الدرس أو الموضوع الفرعي (مثل: `"نهايات الدوال المثلثية"`, `"قاعدة لوبيتال"`).
     - `tags`: تصنيفات فرعية (مثل: `["قوانين وحفظ", "تطبيق حسابي", "استنتاج"]`).
2. **إمكانية إعادة الاختبار بتنوع مستمر (High Replayability):**
   - يختار النظام عشوائياً 10 أسئلة من أصل 50 في كل مرة، مما يتيح للطالب التدرب عدة مرات دون تكرار الأسئلة.
3. **الصعوبة التكيّفية (Adaptive Difficulty):**
   - يمكن للطالب اختيار نمط الاختبار: "تدريب تأسيسي (سهل)"، "محاكاة امتحان (متوازن)"، أو "تحدي الامتياز (صعب)".
   - أو اختبار ذكي يعدل صعوبة السؤال التالي بناءً على إجابة الطالب الحالية.
4. **التدريب الموجّه لنقاط الضعف (Diagnostic Remediation):**
   - عند ربط النظام بحسابات الطلاب (`Auth & Profiles`):
   - يسجل النظام المواضيع التي أخطأ فيها الطالب (مثل: ضعف في "قاعدة لوبيتال").
   - زر **"ركز على نقاط ضعفي"** يسحب تلقائياً أسئلة تركز على المفاهيم غير المتقنة حتى يتم استيعابها بالكامل.
