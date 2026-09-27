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
INSERT INTO courses (department_id, title, slug, description) VALUES
  ((SELECT id FROM it_dept), 'برمجة 1 ومختبرها (C++)', 'programming-1', 'مقدمة في البرمجة والتفكير المنطقي باستخدام C++'),
  ((SELECT id FROM it_dept), 'برمجة 2 ومختبرها (C++)', 'programming-2', 'مفاهيم البرمجة المتقدمة والكائنات (OOP) باستخدام C++'),
  ((SELECT id FROM it_dept), 'احتمالات وإحصاء', 'probability-statistics', 'مفاهيم الاحتمالات والإحصاء التطبيقي'),
  ((SELECT id FROM it_dept), 'رياضيات متقطعة', 'discrete-math', 'المنطق الرياضي، المجموعات، والخوارزميات الأساسية لعلوم الحاسوب'),
  ((SELECT id FROM it_dept), 'تفاضل وتكامل 1 (Calculus 1)', 'calculus-1', 'مبادئ التفاضل والتكامل والنهايات'),
  ((SELECT id FROM it_dept), 'مقدمة في تكنولوجيا المعلومات', 'intro-to-it', 'نظرة شاملة على أنظمة الحاسوب ومكوناتها الأساسية'),
  ((SELECT id FROM it_dept), 'جبر خطي', 'linear-algebra', 'المصفوفات، المتجهات، وتطبيقاتها الرياضية');

-- 3. Insert University Required Courses
WITH req_dept AS (SELECT id FROM departments WHERE slug = 'university-requirements')
INSERT INTO courses (department_id, title, slug, description) VALUES
  ((SELECT id FROM req_dept), 'مهارات حياتية', 'life-skills', 'تطوير المهارات الشخصية، الاجتماعية، والقيادية للطالب'),
  ((SELECT id FROM req_dept), 'تاريخ الحضارة العربية والإسلامية', 'history-of-civilization', 'دراسة التطور التاريخي، العلمي، والثقافي للحضارة الإسلامية'),
  ((SELECT id FROM req_dept), 'مقدمة في الأمن السيبراني والذكاء الاصطناعي', 'cybersecurity-ai', 'المفاهيم الأساسية في حماية البيانات، الشبكات، وتقنيات AI الحديثة'),
  ((SELECT id FROM req_dept), 'مهارات الاتصال', 'communication-skills', 'تطوير مهارات التواصل الفعال، التعبير، والكتابة باللغة العربية'),
  ((SELECT id FROM req_dept), 'مقدمة في اللغة الألمانية', 'german-101', 'أساسيات وقواعد اللغة الألمانية للمبتدئين');
