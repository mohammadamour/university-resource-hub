-- ============================================================================
-- Molakhasat (ملخصات) — Seed Data
-- ============================================================================
-- This script populates the initial departments and courses for V1.
-- It assumes the Jadara University row was already created by schema.sql.
-- ============================================================================

-- 1. Insert All Departments
WITH jadara AS (SELECT id FROM universities WHERE slug = 'jadara')
INSERT INTO departments (university_id, name, slug, display_order) VALUES 
  ((SELECT id FROM jadara), 'إجباري جامعة (متطلبات)', 'university-requirements', 1),
  ((SELECT id FROM jadara), 'كلية تكنولوجيا المعلومات (IT)', 'it', 2),
  ((SELECT id FROM jadara), 'امتحانات المستوى', 'placement-exams', 3),
  ((SELECT id FROM jadara), 'قسم اللغة الإنجليزية', 'english', 4);

-- 2. Insert IT Department Courses
WITH it_dept AS (SELECT id FROM departments WHERE slug = 'it')
INSERT INTO courses (department_id, title, slug, description, display_order) VALUES
  ((SELECT id FROM it_dept), 'برمجة 1 ومختبرها (C++)', 'programming-1', 'مقدمة في البرمجة والتفكير المنطقي باستخدام C++', 1),
  ((SELECT id FROM it_dept), 'برمجة 2 ومختبرها (C++)', 'programming-2', 'مفاهيم البرمجة المتقدمة والكائنات (OOP) باستخدام C++', 2),
  ((SELECT id FROM it_dept), 'احتمالات وإحصاء', 'probability-statistics', 'مفاهيم الاحتمالات والإحصاء التطبيقي', 3),
  ((SELECT id FROM it_dept), 'رياضيات متقطعة', 'discrete-math', 'المنطق الرياضي، المجموعات، والخوارزميات الأساسية لعلوم الحاسوب', 4),
  ((SELECT id FROM it_dept), 'تفاضل وتكامل 1 (Calculus 1)', 'calculus-1', 'مبادئ التفاضل والتكامل والنهايات', 5),
  ((SELECT id FROM it_dept), 'مقدمة في تكنولوجيا المعلومات', 'intro-to-it', 'نظرة شاملة على أنظمة الحاسوب ومكوناتها الأساسية', 6),
  ((SELECT id FROM it_dept), 'جبر خطي', 'linear-algebra', 'المصفوفات، المتجهات، وتطبيقاتها الرياضية', 7),
  ((SELECT id FROM it_dept), 'أساسيات هندسة البرمجيات', 'software-engineering-fundamentals', 'منهجيات هندسة البرمجيات، دورة حياة النظام، التوثيق، والتصميم', 20),
  ((SELECT id FROM it_dept), 'البرمجة بلغة مختارة', 'selected-language-programming', 'تطبيقات برمجية عملية باستخدام لغة برمجة مختارة متقدمة', 21),
  ((SELECT id FROM it_dept), 'أساسيات قواعد البيانات', 'database-fundamentals', 'تصميم قواعد البيانات العلائقية، النماذج المفاهيمية (ERD)، ولغة SQL', 22),
  ((SELECT id FROM it_dept), 'التشفير وأمن المعلومات', 'cryptography-information-security', 'مبادئ التشفير المتناظر وغير المتناظر، أمن الشبكات، وسلامة البيانات', 23),
  ((SELECT id FROM it_dept), 'تحليل وتصميم النظم', 'systems-analysis-design', 'منهجيات تحليل وتصميم نظم المعلومات ومخططات UML', 24),
  ((SELECT id FROM it_dept), 'برمجة علم البيانات', 'data-science-programming', 'مفاهيم علم البيانات، معالجة وتحليل البيانات باستخدام Python والمكتبات الإحصائية', 25),
  ((SELECT id FROM it_dept), 'البرمجة المرئية', 'visual-programming', 'بناء واجهات المستخدم التفاعلية (GUI) والبرمجة الموجهة بالأحداث', 26),
  ((SELECT id FROM it_dept), 'تصميم المنطق الرقمي', 'digital-logic-design', 'الجبر البولياني، البوابات المنطقية، الدوائر التوافقية والتتابعية، وتبسيط الدوال', 27),
  ((SELECT id FROM it_dept), 'تراكيب البيانات (Data Structures)', 'data-structures', 'القوائم المترابطة، المكدسات، الطوابير، الأشجار، والرسوم البيانية وتطبيقاتها', 28),
  ((SELECT id FROM it_dept), 'أنظمة التشغيل (Operating Systems)', 'operating-systems', 'إدارة العمليات والذاكرة، جدولة المعالج، تزامن العمليات، وأنظمة الملفات', 29),
  ((SELECT id FROM it_dept), 'الشبكات وتراسل البيانات', 'networks-data-communication', 'مفاهيم شبكات الحاسوب، نموذج OSI، بروتوكولات TCP/IP، وتراسل البيانات', 30)
ON CONFLICT (department_id, slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order;

-- 3. Insert University Required Courses
WITH req_dept AS (SELECT id FROM departments WHERE slug = 'university-requirements')
INSERT INTO courses (department_id, title, slug, description, display_order) VALUES
  ((SELECT id FROM req_dept), 'مهارات حياتية', 'life-skills', 'تطوير المهارات الشخصية، الاجتماعية، والقيادية للطالب', 1),
  ((SELECT id FROM req_dept), 'تاريخ الحضارة العربية والإسلامية', 'history-of-civilization', 'دراسة التطور التاريخي، العلمي، والثقافي للحضارة الإسلامية', 2),
  ((SELECT id FROM req_dept), 'مقدمة في الأمن السيبراني والذكاء الاصطناعي', 'cybersecurity-ai', 'المفاهيم الأساسية في حماية البيانات، الشبكات، وتقنيات AI الحديثة', 3),
  ((SELECT id FROM req_dept), 'مهارات الاتصال', 'communication-skills', 'تطوير مهارات التواصل الفعال، التعبير، والكتابة باللغة العربية', 4),
  ((SELECT id FROM req_dept), 'مقدمة في اللغة الألمانية', 'german-101', 'أساسيات وقواعد اللغة الألمانية للمبتدئين', 5),
  ((SELECT id FROM req_dept), 'الريادة والابتكار', 'entrepreneurship-innovation', 'مفاهيم الريادة، إنشاء المشاريع الريادية، ونماذج الابتكار', 10),
  ((SELECT id FROM req_dept), 'القيادة والمسؤولية المجتمعية', 'leadership-social-responsibility', 'مهارات القيادة الشخصية، العمل الجماعي، والمبادرات المجتمعية', 11),
  ((SELECT id FROM req_dept), 'العلوم العسكرية', 'military-sciences', 'مبادئ وتاريخ العلوم العسكرية والتنظيم الدفاعي والوطني', 12),
  ((SELECT id FROM req_dept), 'التربية الوطنية', 'national-education', 'الهوية الوطنية الأردنية، الدستور والمؤسسات الوطنية، والتنمية المستدامة', 13),
  ((SELECT id FROM req_dept), 'تربية حل النزاعات وقبول الآخر', 'conflict-resolution', 'مهارات التفاوض، إدارة النزاعات، الحوار، وثقافة التسامح وقبول التنوع', 14)
ON CONFLICT (department_id, slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order;

-- 4. Insert Placement Exams Courses
WITH placement_dept AS (SELECT id FROM departments WHERE slug = 'placement-exams')
INSERT INTO courses (department_id, title, slug, description) VALUES
  ((SELECT id FROM placement_dept), 'امتحانات المستوى', 'placement-exams', 'نماذج ومواد تحضيرية لجميع امتحانات الكفاءة (عربي، إنجليزي، حاسوب)');
