import Link from "next/link";
import {
  SITE_NAME,
  WHATSAPP_COMMUNITY_URL,
  FOUNDER_WEBSITE_URL,
} from "@/lib/constants";
import TrackedExternalLink from "@/components/ui/TrackedExternalLink";
import LogoMark from "@/components/ui/LogoMark";
import ShareSiteButton from "@/components/ui/ShareSiteButton";

const WhatsAppIcon = ({ className = "h-4 w-4 shrink-0" }: { className?: string }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

const UserIcon = ({ className = "h-4 w-4 shrink-0 text-muted" }: { className?: string }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const ShieldIcon = ({ className = "h-4 w-4 shrink-0 text-muted" }: { className?: string }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const FlagIcon = ({ className = "h-4 w-4 shrink-0 text-muted" }: { className?: string }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <line x1="4" y1="22" x2="4" y2="15" />
  </svg>
);

/**
 * Redesigned responsive site footer (Mobile-first 2x2 quick grid + Desktop 4-column layout).
 * Remains a Server Component by isolating interactive share actions inside ShareSiteButton.
 */
export default function Footer() {
  const currentYear = new Date().getFullYear();

  const whatsappCommunityCard = (
    <div className="rounded-2xl bg-ink p-5 text-surface shadow-xs">
      <div className="flex items-center gap-2 text-sm sm:text-[15px] font-bold text-surface">
        <WhatsAppIcon className="h-4 w-4 shrink-0 text-hi" />
        <span>مجتمع ملخصات على واتساب</span>
      </div>
      <p className="mt-1.5 text-xs sm:text-[13px] leading-relaxed text-surface/75">
        شارك ملاحظاتك، اطلب ملخصًا، وساعد زملاءك.
      </p>
      <TrackedExternalLink
        href={WHATSAPP_COMMUNITY_URL}
        eventType="whatsapp_community_click"
        metadata={{ source: "footer_community_card" }}
        className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-hi px-4 text-sm font-bold text-ink transition-all hover:opacity-95 active:scale-[0.98]"
      >
        <span>انضم للقروب</span>
        <span aria-hidden="true">↗</span>
      </TrackedExternalLink>
    </div>
  );

  return (
    <footer className="mt-20 border-t border-line bg-[#EAE3D5]/75">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10" dir="rtl">
        {/* ─── Mobile Layout (< 768px) ─────────────────────────────────────── */}
        <div className="flex flex-col gap-5 md:hidden">
          {/* Brand Block */}
          <div className="flex items-center gap-3">
            <LogoMark size={40} variant="dark" />
            <div>
              <div className="font-heading text-2xl font-bold leading-none text-ink">
                {SITE_NAME}
              </div>
              <p className="mt-1 text-xs text-muted">
                مشروع طلابي مجاني لطلاب جامعة جدارا
              </p>
            </div>
          </div>

          {/* Dashed Upload Contribution Banner */}
          <Link
            href="/upload"
            className="flex items-center justify-between gap-3 rounded-2xl border-[1.5px] border-dashed border-ink/25 bg-surface/70 p-3.5 transition-colors hover:bg-surface active:scale-[0.99]"
          >
            <div>
              <div className="text-sm font-bold text-ink">
                عندك ملخص أو أسئلة؟
              </div>
              <div className="mt-0.5 text-xs text-muted">
                ساهم بها وتُراجع قبل النشر
              </div>
            </div>
            <span
              aria-hidden="true"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-hi text-xl font-bold text-ink shadow-xs"
            >
              +
            </span>
          </Link>

          {/* Dark WhatsApp Community Card */}
          {whatsappCommunityCard}

          {/* 2x2 Quick Links Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <Link
              href="/about"
              className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-line bg-surface px-3.5 py-3 text-xs font-semibold text-ink transition-all hover:border-ink/30 active:scale-[0.98]"
            >
              <UserIcon />
              <span>من أنا</span>
            </Link>

            <Link
              href="/terms"
              className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-line bg-surface px-3.5 py-3 text-xs font-semibold text-ink transition-all hover:border-ink/30 active:scale-[0.98]"
            >
              <ShieldIcon />
              <span>الشروط والخصوصية</span>
            </Link>

            <Link
              href="/terms#dmca"
              className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-line bg-surface px-3.5 py-3 text-xs font-semibold text-ink transition-all hover:border-ink/30 active:scale-[0.98]"
            >
              <FlagIcon />
              <span>إبلاغ أو إزالة محتوى</span>
            </Link>

            <ShareSiteButton variant="card" />
          </div>

          {/* Academic Independence Disclaimer */}
          <div className="flex items-start justify-center gap-2 pt-1 text-center text-xs leading-relaxed text-muted">
            <span aria-hidden="true" className="mt-0.5 shrink-0 font-mono">
              ⓘ
            </span>
            <p>
              مبادرة طلابية مستقلة وغير تابعة رسميًا للجامعة. تأكد دائمًا من
              متطلبات المادة مع مدرّسك.
            </p>
          </div>

          {/* Creator Attribution & Copyright */}
          <div className="border-t border-line pt-4 text-center text-xs text-muted space-y-1.5">
            <p>
              صُنع بواسطة{" "}
              <TrackedExternalLink
                href={FOUNDER_WEBSITE_URL}
                eventType="external_link_click"
                metadata={{ source: "footer_creator_credit" }}
                className="font-semibold text-[#1B5C8A] underline underline-offset-4 hover:opacity-80"
              >
                محمد العمور ↗
              </TrackedExternalLink>
            </p>
            <p>
              © {currentYear} {SITE_NAME} · لطلاب جامعة جدارا
            </p>
          </div>
        </div>

        {/* ─── Desktop Layout (≥ 768px) ────────────────────────────────────── */}
        <div className="hidden md:block">
          <div className="grid grid-cols-[1.35fr_0.85fr_0.85fr_1.15fr] items-start gap-8">
            {/* Brand Column */}
            <div className="max-w-xs">
              <div className="flex items-center gap-2.5">
                <LogoMark size={38} variant="dark" />
                <span className="font-heading text-2xl font-bold leading-none text-ink">
                  {SITE_NAME}
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                مشروع طلابي مجاني لطلاب جامعة جدارا. ملخصات وسلايدات وكويزات في
                مكان واحد، بدون تسجيل دخول.
              </p>
            </div>

            {/* Platform Links Column */}
            <div>
              <h3 className="mb-3 text-xs font-bold text-muted">المنصة</h3>
              <ul className="space-y-2.5 text-sm font-medium text-ink">
                <li>
                  <Link
                    href="/about"
                    className="inline-flex items-center gap-2 transition-colors hover:text-muted"
                  >
                    <UserIcon />
                    <span>من أنا</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="inline-flex items-center gap-2 transition-colors hover:text-muted"
                  >
                    <ShieldIcon />
                    <span>الشروط والخصوصية</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms#dmca"
                    className="inline-flex items-center gap-2 transition-colors hover:text-muted"
                  >
                    <FlagIcon />
                    <span>إبلاغ أو إزالة محتوى</span>
                  </Link>
                </li>
              </ul>
            </div>

            {/* Participate Links Column */}
            <div>
              <h3 className="mb-3 text-xs font-bold text-muted">شارك</h3>
              <ul className="space-y-2.5 text-sm font-medium text-ink">
                <li>
                  <Link
                    href="/upload"
                    className="inline-flex items-center gap-2 transition-colors hover:text-muted"
                  >
                    <span
                      aria-hidden="true"
                      className="inline-flex w-4 justify-center font-bold text-muted"
                    >
                      +
                    </span>
                    <span>ساهم بملف</span>
                  </Link>
                </li>
                <li>
                  <TrackedExternalLink
                    href={WHATSAPP_COMMUNITY_URL}
                    eventType="whatsapp_community_click"
                    metadata={{ source: "footer_desktop_link" }}
                    className="inline-flex items-center gap-2 transition-colors hover:text-muted"
                  >
                    <WhatsAppIcon className="h-4 w-4 shrink-0 text-muted" />
                    <span>مجتمع واتساب</span>
                  </TrackedExternalLink>
                </li>
                <li>
                  <ShareSiteButton variant="link" />
                </li>
              </ul>
            </div>

            {/* WhatsApp Community Card */}
            {whatsappCommunityCard}
          </div>

          {/* Desktop Bottom Bar */}
          <div className="mt-8 flex items-center justify-between gap-4 border-t border-line pt-5 text-xs text-muted">
            <p>
              صُنع بواسطة{" "}
              <TrackedExternalLink
                href={FOUNDER_WEBSITE_URL}
                eventType="external_link_click"
                metadata={{ source: "footer_creator_credit" }}
                className="font-semibold text-[#1B5C8A] underline underline-offset-4 hover:opacity-80"
              >
                محمد العمور ↗
              </TrackedExternalLink>{" "}
              · لطلاب جامعة جدارا
            </p>
            <p>
              مبادرة طلابية مستقلة وغير تابعة رسميًا للجامعة. © {currentYear}{" "}
              {SITE_NAME}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
