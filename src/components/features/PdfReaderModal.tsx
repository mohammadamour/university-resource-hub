"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import type {
  OnProgressParameters,
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  RenderTask,
} from "pdfjs-dist/types/src/display/api";
import type { Resource } from "@/types/database";
import BookmarkIcon from "@/components/ui/BookmarkIcon";
import { track } from "@/lib/analytics";

interface PdfReaderModalProps {
  resource: Resource;
  courseSlug?: string;
  isSaved: boolean;
  onToggleSave: () => void;
  onClose: () => void;
  onStartQuiz?: (resourceId: string) => void;
}

const ZOOM_STEPS = [1, 1.25, 1.5, 2] as const;
const MAX_DPR = 2; // Cap retina scaling at 2x to keep canvas GPU/RAM low on 3x phones
const PAGE_WINDOW_RADIUS = 2; // Render current +/- 2 pages (max ~5 canvases in memory)

interface PdfCanvasSurfaceProps {
  pdf: PDFDocumentProxy;
  pageNum: number;
  targetWidth: number;
  onRendered?: (pageNum: number, pageAspectRatio: number) => void;
}

/**
 * Isolated canvas surface mounted ONLY while a page sits inside the +/-2 active window.
 *
 * Key invariants:
 * 1. Stores `onRendered` in a ref so parent state changes (visiblePage, progress, etc.)
 *    NEVER cancel/wipe mounted canvases during scroll.
 * 2. Forces `dir="ltr"`, `ctx.direction = "ltr"`, and `ctx.textAlign = "left"` — otherwise
 *    inheriting `dir="rtl"` from `<html dir="rtl">` causes Canvas2D `fillText()` to right-align
 *    each glyph, scrambling spacing and ligatures across the entire page.
 * 3. Reclaims GPU bitmap only on actual unmount (keeps old frame visible while zooming).
 */
function PdfCanvasSurface({
  pdf,
  pageNum,
  targetWidth,
  onRendered,
}: PdfCanvasSurfaceProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onRenderedRef = useRef(onRendered);

  useEffect(() => {
    onRenderedRef.current = onRendered;
  }, [onRendered]);

  const [hasPainted, setHasPainted] = useState(false);

  // Release GPU bitmap strictly when evicted from the +/-2 page window or unmounted
  useEffect(() => {
    const canvas = canvasRef.current;
    return () => {
      if (canvas) {
        canvas.width = 0;
        canvas.height = 0;
      }
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || targetWidth <= 0) return;

    let cancelled = false;
    let renderTask: RenderTask | null = null;

    async function renderPage() {
      try {
        const page = await pdf.getPage(pageNum);
        if (cancelled || !canvas) return;

        const baseViewport = page.getViewport({ scale: 1 });
        const rawDpr = window.devicePixelRatio || 1;
        // Scale down DPR slightly on heavy zoom to keep mobile GPU bitmaps fast and under budget
        const dpr =
          targetWidth > 900 ? Math.min(rawDpr, 1.5) : Math.min(rawDpr, MAX_DPR);
        const cssScale = targetWidth / baseViewport.width;
        const viewport = page.getViewport({ scale: cssScale * dpr });

        const ctx = canvas.getContext("2d", { alpha: false });
        if (!ctx) return;

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(targetWidth)}px`;
        canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;

        // Explicitly neutralize RTL CSS inheritance inside Canvas2D before pdf.js draws glyphs
        ctx.direction = "ltr";
        ctx.textAlign = "left";

        renderTask = page.render({
          canvasContext: ctx,
          viewport,
          canvas,
        });

        await renderTask.promise;
        if (cancelled) return;

        setHasPainted(true);
        onRenderedRef.current?.(pageNum, baseViewport.width / baseViewport.height);
      } catch (err) {
        const name = (err as { name?: string })?.name;
        if (name !== "RenderingCancelledException" && !cancelled) {
          console.warn(`[PdfReader] Page ${pageNum} render failed:`, err);
        }
      }
    }

    renderPage();

    return () => {
      cancelled = true;
      if (renderTask) {
        try {
          renderTask.cancel();
        } catch {
          // Safe cleanup
        }
      }
    };
  }, [pdf, pageNum, targetWidth]);

  return (
    <canvas
      ref={canvasRef}
      dir="ltr"
      className={`block bg-white transition-opacity duration-150 ${
        hasPainted ? "opacity-100" : "opacity-0"
      }`}
    />
  );
}

/**
 * Lazy-loaded, progressive in-app PDF reader modal (mobile-first).
 *
 * Performance & Campus Bandwidth Mitigations:
 * 1. Code-split via next/dynamic + dynamic pdfjs-dist import (0 KB initial SSR bundle impact).
 * 2. Range-chunk streaming (`disableAutoFetch: true` + 64KB chunks with streaming enabled).
 * 3. Renders Page 1 strictly first before enabling neighbor page rendering.
 * 4. Virtualized +/-2 page window via IntersectionObserver with explicit canvas memory release.
 * 5. Portaled to document.body at z-[80] cleanly above Header and BookmarkDrawer.
 */
export default function PdfReaderModal({
  resource,
  courseSlug,
  isSaved,
  onToggleSave,
  onClose,
  onStartQuiz,
}: PdfReaderModalProps) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState<number>(resource.page_count || 0);
  const [defaultAspectRatio, setDefaultAspectRatio] = useState<number>(1 / 1.414); // A4 fallback
  const [pageRatios, setPageRatios] = useState<Record<number, number>>({});
  const [visiblePage, setVisiblePage] = useState<number>(1);
  const [firstPageReady, setFirstPageReady] = useState<boolean>(false);
  const [zoomIndex, setZoomIndex] = useState<number>(0);
  const [containerWidth, setContainerWidth] = useState<number>(360);
  const [loadProgress, setLoadProgress] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const defaultRatioRef = useRef<number>(1 / 1.414);

  const zoomScale = ZOOM_STEPS[zoomIndex];
  const quizQuestionCount = resource.quiz_data?.questions?.length || 0;

  const trackDownload = (source: string) => {
    track({
      eventType: "pdf_download",
      resourceId: resource.id,
      courseId: resource.course_id,
      courseSlug,
      resourceTitle: resource.title,
      metadata: { source },
    });
  };

  // Lock background page scroll & bind Escape key cleanly
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  // Measure available reader width for crisp mobile-first & desktop sizing
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const updateWidth = () => {
      const horizontalPadding = window.innerWidth >= 640 ? 48 : 16;
      const measured = Math.max(
        260,
        Math.min(container.clientWidth - horizontalPadding, 820)
      );
      setContainerWidth(measured);
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Load PDF document lazily using HTTP range chunks (Page 1 bytes prioritized)
  useEffect(() => {
    let cancelled = false;
    let docReady = false;
    let lastReportedPct = -1;
    let activeLoadingTask: PDFDocumentLoadingTask | null = null;

    async function initPdf() {
      try {
        // Use pdf.js legacy build: modern pdfjs-dist v6 uses ES2025 Uint8Array.prototype.toHex(),
        // which throws `a.toHex is not a function` on Android Chrome <140 / Xiaomi MiuiBrowser.
        const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/workers/pdf.worker.min.mjs";

        // CDN base matched dynamically to installed pdfjs-dist version
        const assetBase = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}`;

        const loadingTask = pdfjsLib.getDocument({
          url: resource.storage_url,
          cMapUrl: `${assetBase}/cmaps/`,
          cMapPacked: true,
          standardFontDataUrl: `${assetBase}/standard_fonts/`,
          iccUrl: `${assetBase}/iccs/`,
          wasmUrl: `${assetBase}/wasm/`,
          rangeChunkSize: 65536, // 64 KB HTTP range chunks
          // Suppress eager full-file fetch while keeping progressive chunk streaming enabled
          disableAutoFetch: true,
        });

        activeLoadingTask = loadingTask;
        loadingTask.onProgress = ({ loaded, total }: OnProgressParameters) => {
          if (cancelled || docReady || total <= 0) return;
          const pct = Math.min(100, Math.round((loaded / total) * 100));
          if (pct !== lastReportedPct) {
            lastReportedPct = pct;
            setLoadProgress(pct);
          }
        };

        const doc = await loadingTask.promise;
        if (cancelled) {
          await loadingTask.destroy();
          return;
        }
        docReady = true;

        // Fetch Page 1 geometry before exposing the page list so skeletons match true aspect ratio
        const p1 = await doc.getPage(1);
        if (cancelled) return;

        const vp = p1.getViewport({ scale: 1 });
        if (vp.width > 0 && vp.height > 0) {
          const ratio = vp.width / vp.height;
          defaultRatioRef.current = ratio;
          setDefaultAspectRatio(ratio);
        }

        setNumPages(doc.numPages);
        setPdfDoc(doc);
      } catch (err) {
        if (!cancelled) {
          console.warn("[PdfReaderModal] Failed to load PDF:", err);
          setErrorMsg(
            "تعذر عرض الملف مباشرة داخل المتصفح (قد يمنع المصدر تحميل الأجزاء عن بُعد)."
          );
          // Track PDF load errors — helps us catch broken storage URLs or CORS issues quickly
          track({
            eventType: "pdf_reader_error",
            resourceId: resource.id,
            courseId: resource.course_id,
            courseSlug,
            resourceTitle: resource.title,
            metadata: { error: String(err) },
          });
        }
      }
    }

    initPdf();

    return () => {
      cancelled = true;
      if (activeLoadingTask) {
        activeLoadingTask.destroy().catch(() => {});
      }
    };
  }, [resource.storage_url, resource.id, resource.course_id, resource.title, courseSlug]);

  // Track visible page once Page 1 has completed painting first
  useEffect(() => {
    const root = scrollContainerRef.current;
    if (!root || !pdfDoc || !firstPageReady || numPages <= 1) return;

    const slots = Array.from(root.querySelectorAll<HTMLElement>("[data-page-slot]"));
    if (slots.length === 0) return;

    const visibilityMap = new Map<number, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const p = Number(entry.target.getAttribute("data-page-slot"));
          if (!Number.isFinite(p)) continue;
          if (entry.isIntersecting) {
            visibilityMap.set(p, entry.intersectionRatio);
          } else {
            visibilityMap.delete(p);
          }
        }

        let bestPage = 1;
        let bestRatio = -1;
        for (const [p, ratio] of visibilityMap.entries()) {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestPage = p;
          }
        }
        if (bestRatio >= 0) {
          setVisiblePage((prev) => (prev === bestPage ? prev : bestPage));
        }
      },
      {
        root,
        rootMargin: "120px 0px",
        threshold: [0.05, 0.25, 0.5, 0.75],
      }
    );

    for (const slot of slots) observer.observe(slot);
    return () => observer.disconnect();
  }, [pdfDoc, firstPageReady, numPages]);

  const handlePageRendered = useCallback((pageNum: number, ratio: number) => {
    if (pageNum === 1) {
      setFirstPageReady(true);
    }
    if (Number.isFinite(ratio) && ratio > 0) {
      setPageRatios((prev) => {
        const baseline = prev[pageNum] ?? defaultRatioRef.current;
        return Math.abs(baseline - ratio) > 0.02
          ? { ...prev, [pageNum]: ratio }
          : prev;
      });
    }
  }, []);

  const scrollToPage = (targetPage: number) => {
    const clamped = Math.max(1, Math.min(numPages || 1, targetPage));
    const slot = scrollContainerRef.current?.querySelector<HTMLElement>(
      `[data-page-slot="${clamped}"]`
    );
    if (slot) {
      setVisiblePage(clamped);
      slot.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const targetRenderWidth = Math.round(containerWidth * zoomScale);
  const pagesArray =
    numPages > 0 ? Array.from({ length: numPages }, (_, i) => i + 1) : [];

  const modalContent = (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label={`قارئ الملف: ${resource.title}`}
      className="fixed inset-0 z-[80] flex h-dvh flex-col bg-slate-950/95 text-slate-100 backdrop-blur-sm animate-in fade-in duration-150"
    >
      {/* Sticky Top Bar */}
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-slate-900/95 px-3 py-2 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق القارئ"
            className="flex h-10 w-10 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-sm font-bold text-slate-200 hover:bg-white/15 active:scale-95 transition-all cursor-pointer"
          >
            ✕
          </button>

          <div className="min-w-0">
            <h2 dir="auto" className="truncate text-xs font-bold text-white sm:text-sm">
              {resource.title}
            </h2>
            <p className="text-[11px] text-slate-400">
              {pdfDoc
                ? `صفحة ${visiblePage} من ${numPages}`
                : errorMsg
                ? "تعذر المعاينة"
                : loadProgress !== null
                ? `جارٍ تحميل الصفحات... ${loadProgress}%`
                : "جارٍ فتح الصفحة الأولى..."}
            </p>
          </div>
        </div>

        {/* Actions: Zoom (Desktop) + Save + Direct Download */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {pdfDoc && (
            <div className="hidden sm:flex items-center rounded-xl border border-white/15 bg-white/5 p-0.5 text-[11px] font-mono">
              <button
                type="button"
                onClick={() => setZoomIndex((z) => Math.max(0, z - 1))}
                disabled={zoomIndex === 0}
                aria-label="تصغير"
                className="rounded-lg px-2 py-1 text-slate-200 hover:bg-white/10 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                −
              </button>
              <span className="px-1.5 text-slate-300" dir="ltr">
                {Math.round(zoomScale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoomIndex((z) => Math.min(ZOOM_STEPS.length - 1, z + 1))}
                disabled={zoomIndex === ZOOM_STEPS.length - 1}
                aria-label="تكبير"
                className="rounded-lg px-2 py-1 text-slate-200 hover:bg-white/10 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                +
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onToggleSave}
            aria-pressed={isSaved}
            title={isSaved ? "إزالة من مواردي المحفوظة" : "حفظ في مواردي"}
            aria-label={isSaved ? "إزالة من مواردي المحفوظة" : "حفظ في مواردي"}
            className={`flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-xl border transition-all active:scale-95 cursor-pointer ${
              isSaved
                ? "border-amber-400/40 bg-amber-400/15 text-amber-300"
                : "border-white/15 bg-white/5 text-slate-300 hover:bg-white/15 hover:text-white"
            }`}
          >
            <BookmarkIcon filled={isSaved} className="h-4 w-4" />
          </button>

          <a
            href={resource.storage_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackDownload("reader_header")}
            className="inline-flex h-10 sm:h-9 items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 text-xs font-semibold text-white hover:bg-accent hover:border-accent transition-colors"
            title="تحميل أو فتح الملف الأصلي"
          >
            <span>⬇</span>
            <span className="hidden sm:inline">تحميل</span>
          </a>
        </div>
      </header>

      {/* Scrollable Canvas Viewport */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-auto overscroll-contain px-2 py-3 sm:px-6 sm:py-6"
      >
        {errorMsg ? (
          <div className="mx-auto my-12 max-w-md rounded-2xl border border-white/15 bg-slate-900 p-6 text-center space-y-4">
            <div className="text-3xl">📄</div>
            <p className="text-sm text-slate-200 leading-relaxed">{errorMsg}</p>
            <a
              href={resource.storage_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackDownload("reader_error_fallback")}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-accent/90 transition-colors"
            >
              <span>⬇</span>
              <span>فتح / تحميل الملف مباشرة</span>
            </a>
          </div>
        ) : !pdfDoc ? (
          <div className="mx-auto max-w-xl space-y-3 py-8 text-center">
            <div
              className="mx-auto w-full rounded-2xl border border-white/10 bg-slate-900/90 flex flex-col items-center justify-center gap-3 animate-pulse"
              style={{
                maxWidth: `${containerWidth}px`,
                aspectRatio: `${defaultAspectRatio}`,
              }}
            >
              <div className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
              <p className="text-xs sm:text-sm text-slate-300 font-medium">
                جارٍ تجهيز الصفحة الأولى...
              </p>
            </div>
          </div>
        ) : (
          /* LTR wrapper + w-max min-w-full lets zoomed pages scroll horizontally to both edges without Flexbox clipping */
          <div
            dir="ltr"
            className="mx-auto flex w-max min-w-full flex-col items-center gap-3 sm:gap-4"
          >
            {pagesArray.map((pageNum) => {
              // Strictly render Page 1 alone first so neighbor renders never starve initial paint
              const shouldRender =
                pageNum === 1 && !firstPageReady
                  ? true
                  : firstPageReady &&
                    Math.abs(pageNum - visiblePage) <= PAGE_WINDOW_RADIUS;
              const ratio = pageRatios[pageNum] || defaultAspectRatio;

              return (
                <div
                  key={pageNum}
                  data-page-slot={pageNum}
                  style={{
                    width: `${targetRenderWidth}px`,
                    aspectRatio: `${ratio}`,
                  }}
                  className="relative shrink-0 overflow-hidden rounded-xl border border-white/10 bg-slate-900 shadow-lg"
                >
                  {/* Lightweight placeholder shown before page renders or after eviction */}
                  <div
                    dir="rtl"
                    className="absolute inset-0 flex items-center justify-center text-xs font-mono text-slate-500 select-none"
                  >
                    صفحة {pageNum} / {numPages}
                  </div>

                  {shouldRender && (
                    <div className="relative z-10 h-full w-full">
                      <PdfCanvasSurface
                        pdf={pdfDoc}
                        pageNum={pageNum}
                        targetWidth={targetRenderWidth}
                        onRendered={handlePageRendered}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sticky Bottom Action Bar (Page Navigation + Mobile Zoom + Docked Quiz CTA) */}
      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-slate-900/95 px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] sm:px-5">
        <div className="flex flex-1 sm:flex-initial items-center justify-between sm:justify-start gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => scrollToPage(visiblePage - 1)}
              disabled={!pdfDoc || visiblePage <= 1}
              aria-label="الصفحة السابقة"
              className="min-h-9 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/15 active:scale-95 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-all"
            >
              ▲ السابقة
            </button>

            <span className="px-1.5 text-xs font-mono text-slate-300" dir="ltr">
              {pdfDoc ? `${visiblePage} / ${numPages}` : "—"}
            </span>

            <button
              type="button"
              onClick={() => scrollToPage(visiblePage + 1)}
              disabled={!pdfDoc || visiblePage >= numPages}
              aria-label="الصفحة التالية"
              className="min-h-9 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/15 active:scale-95 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-all"
            >
              التالية ▼
            </button>
          </div>

          {/* Compact mobile zoom toggle */}
          {pdfDoc && (
            <button
              type="button"
              onClick={() => setZoomIndex((z) => (z + 1) % ZOOM_STEPS.length)}
              className="sm:hidden min-h-9 rounded-xl border border-white/15 bg-white/5 px-2.5 py-1.5 text-[11px] font-mono text-slate-200 active:scale-95 transition-all cursor-pointer"
              title="تغيير التكبير"
              aria-label={`التكبير الحالي ${Math.round(zoomScale * 100)} بالمئة`}
            >
              🔍 {Math.round(zoomScale * 100)}%
            </button>
          )}
        </div>

        {/* Docked Quiz CTA */}
        {quizQuestionCount > 0 && onStartQuiz && (
          <button
            type="button"
            onClick={() => onStartQuiz(resource.id)}
            className="inline-flex w-full sm:w-auto min-h-10 items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-sm hover:bg-emerald-400 active:scale-95 transition-all cursor-pointer"
          >
            <span>✨</span>
            <span>اختبر فهمك ({quizQuestionCount} سؤال)</span>
          </button>
        )}
      </footer>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modalContent, document.body);
}
