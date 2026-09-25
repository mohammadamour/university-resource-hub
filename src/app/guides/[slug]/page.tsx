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
