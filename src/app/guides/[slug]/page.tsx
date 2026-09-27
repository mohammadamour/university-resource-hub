import { notFound } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { SITE_NAME } from "@/lib/constants";
import type { Metadata } from "next";

interface GuidePageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Individual guide page. Content is stored as simple objects for V1.
 * In the future, this can be migrated to MDX files or a Supabase table.
 */

interface GuideContent {
  title: string;
  emoji: string;
  sections: { heading: string; content: string }[];
}

const GUIDE_CONTENT: Record<string, GuideContent> = {
  "getting-started": {
    title: "دليل الطالب الجديد",
    emoji: "🎓",
    sections: [
      {
        heading: "مرحباً بك في الجامعة! 👋",
        content:
          "هذا الدليل يساعدك على فهم كيفية التنقل في الجامعة وأهم الأشياء التي يجب معرفتها كطالب جديد.",
      },
      {
        heading: "البوابات والأنظمة المهمة",
        content:
          "سيتم تحديث هذا القسم بروابط مباشرة لبوابات الجامعة الإلكترونية وشرح كيفية استخدامها.",
      },
      {
        heading: "نصائح للتسجيل",
        content:
          "سيتم إضافة نصائح عملية حول كيفية اختيار المواد وتنظيم جدولك الدراسي.",
      },
    ],
  },
  "library-guide": {
    title: "دليل مكتبة الجامعة",
    emoji: "📚",
    sections: [
      {
        heading: "الكنز المخفي",
        content:
          "المكتبة ليست فقط مكاناً للكتب، بل هي أفضل مكان للهروب من الإزعاج والدراسة بتركيز قبل الامتحانات. الكثير من الطلاب لا يكتشفونها إلا متأخراً.",
      },
      {
        heading: "كيف تستعير الكتب؟",
        content:
          "تحتاج فقط إلى هويتك الجامعية (البطاقة). يمكنك استعارة الكتب لمدة محددة وتجديدها إذا لم يطلبها شخص آخر. يمكنك أيضاً البحث عن الكتب في فهرس المكتبة الإلكتروني لتوفير الوقت.",
      },
    ],
  },
  "campus-wifi": {
    title: "كيف تتصل بشبكة الـ Wi-Fi",
    emoji: "📶",
    sections: [
      {
        heading: "الشبكة الجامعية",
        content:
          "لا تستهلك حزم البيانات (4G) الخاصة بك وأنت في الحرم الجامعي! الجامعة توفر شبكة لاسلكية لجميع الطلاب.",
      },
      {
        heading: "طريقة الاتصال",
        content:
          "عادةً ما تكون الشبكة باسم الجامعة. عند الاتصال، سيتم تحويلك إلى صفحة تسجيل دخول (Portal). استخدم رقمك الجامعي كاسم مستخدم، وكلمة المرور الخاصة بك (نفسها المستخدمة في بوابة الطالب).",
      },
    ],
  },
  "campus-cafes": {
    title: "دليل كافتيريات الجامعة",
    emoji: "☕",
    sections: [
      {
        heading: "أين تأكل؟",
        content:
          "هناك عدة كافتيريات وأكشاك موزعة في الجامعة. بعضها مزدحم دائماً، وبعضها هادئ ومناسب للجلوس بين المحاضرات.",
      },
      {
        heading: "قوائم الطعام (المنيو)",
        content:
          "سيتم تحديث هذا القسم قريباً بصور لقوائم الطعام وأسعارها (تم التقاطها بإذن من أصحابها) حتى تتمكن من اتخاذ قرارك قبل الوقوف في الطابور الطويل!",
      },
    ],
  },
  "github-education": {
    title: "كيف تحصل على GitHub Education Pack",
    emoji: "🐙",
    sections: [
      {
        heading: "ما هو GitHub Education Pack؟",
        content:
          "GitHub Education Pack هو حزمة مجانية من الأدوات والخدمات بقيمة آلاف الدولارات، متاحة لجميع طلاب الجامعات. تشمل GitHub Copilot، نطاقات مجانية من Namecheap، رصيد Azure، وأكثر من 100 أداة أخرى.",
      },
      {
        heading: "كيف تتقدم؟",
        content:
          "1. اذهب إلى education.github.com\n2. سجل دخول بحساب GitHub\n3. استخدم بريدك الجامعي للتحقق\n4. قد تحتاج لرفع صورة من بطاقتك الجامعية\n5. انتظر الموافقة (عادةً خلال أيام)",
      },
    ],
  },
  "gemini-pro": {
    title: "كيف تفعّل Gemini Pro مجاناً",
    emoji: "✨",
    sections: [
      {
        heading: "Gemini Pro للطلاب",
        content:
          "Google تقدم Gemini Pro مجاناً لطلاب الجامعات عبر Google Workspace for Education. كل ما تحتاجه هو بريدك الجامعي.",
      },
      {
        heading: "خطوات التفعيل",
        content:
          "سيتم تحديث هذا القسم بالخطوات الدقيقة للتفعيل بمجرد التحقق من التوافر لجامعتنا.",
      },
    ],
  },
  "it-survival-guide": {
    title: "دليل البقاء لطلاب تكنولوجيا المعلومات",
    emoji: "💻",
    sections: [
      {
        heading: "مرحباً يا مبرمج المستقبل! 🚀",
        content:
          "هذا الدليل مبني على تجارب حقيقية من طلاب سبقوك. الهدف هو مساعدتك على تجنب الأخطاء الشائعة والتفوق في تخصصك.",
      },
      {
        heading: "أهم النصائح",
        content:
          "1. ابدأ بتعلم البرمجة مبكراً — لا تعتمد فقط على المحاضرات\n2. استثمر في GitHub Education Pack\n3. ابنِ مشاريع شخصية — هذا ما يميزك في سوق العمل\n4. انضم لمجتمعات البرمجة المحلية والعالمية",
      },
    ],
  },
  "contact-professors": {
    title: "كيف تجد إيميل أو مكتب أي دكتور",
    emoji: "🔍",
    sections: [
      {
        heading: "حيلة بسيطة من بوابة التعلم الإلكتروني",
        content:
          "هل تحتاج إلى التواصل مع دكتور المادة ولكنك لا تعرف بريده الإلكتروني أو رقم مكتبه؟ لا داعي لسؤال المجموعات وانتظار الرد. الحل موجود في نظام Moodle (التعلم الإلكتروني) نفسه!",
      },
      {
        heading: "الخطوات:",
        content:
          "1. سجل الدخول إلى بوابة التعلم الإلكتروني (E-Learning) للجامعة.\n2. ادخل إلى المادة التي يدرسها الدكتور.\n3. من القائمة، ابحث عن تبويب 'المشاركون' (Participants).\n4. ستجد قائمة بجميع الطلاب والدكاترة المسجلين في المادة. يمكنك استخدام الفلتر لتحديد 'Teacher' (معلم).\n5. اضغط على اسم الدكتور، وسيظهر لك ملفه الشخصي الذي يحتوي غالباً على بريده الإلكتروني الرسمي وموقعه.",
      },
    ],
  },
};

export async function generateMetadata({
  params,
}: GuidePageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = GUIDE_CONTENT[slug];

  if (!guide) {
    return { title: "غير موجود" };
  }

  return {
    title: `${guide.title} | ${SITE_NAME}`,
    description: guide.sections[0]?.content.slice(0, 150),
  };
}

export default async function GuidePage({ params }: GuidePageProps) {
  const { slug } = await params;
  const guide = GUIDE_CONTENT[slug];

  if (!guide) {
    notFound();
  }

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        <div className="mb-8">
          <span className="text-3xl">{guide.emoji}</span>
          <h1 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
            {guide.title}
          </h1>
        </div>

        <div className="space-y-8">
          {guide.sections.map((section, index) => (
            <section key={index}>
              <h2 className="text-lg font-semibold text-foreground sm:text-xl">
                {section.heading}
              </h2>
              <div className="mt-3 whitespace-pre-line text-muted-foreground leading-relaxed">
                {section.content}
              </div>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
