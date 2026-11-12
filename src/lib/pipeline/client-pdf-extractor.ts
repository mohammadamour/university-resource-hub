/**
 * Client-side PDF text extractor and thumbnail renderer using pdfjs-dist (runs in the browser).
 *
 * This is used for EAGER / SPECULATIVE extraction:
 * When the user selects a file, we extract text and render page 1 onto an off-screen canvas
 * immediately in the background. By the time the user fills in the title and hits Upload,
 * the text and thumbnail blob are ready and sent alongside the file — saving server resources
 * and bypassing Vercel serverless graphics binary restrictions.
 *
 * We cap text at 300,000 characters (~50,000 words) to capture complete course summaries
 * across all chapters, fitting comfortably within Gemini 3.5 Flash's context window.
 */

const MAX_CHARS = 300_000;

export interface ClientPdfExtractionResult {
  text: string | null;
  pageCount: number;
  thumbnailBlob?: Blob | null;
}

/**
 * Extracts raw text, page count, and renders a 320px Page 1 thumbnail JPEG blob
 * from a PDF File using pdf.js running in the browser.
 *
 * @param file  The PDF File object selected by the user
 * @returns     Object containing text, pageCount, and thumbnailBlob
 */
export async function extractPdfMetadataAndText(
  file: File
): Promise<ClientPdfExtractionResult> {
  try {
    // Dynamic import using legacy build (ES2025 polyfills for mobile Android/Xiaomi/older Safari)
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

    // Point to the self-hosted pdf.js worker in /public/workers.
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/workers/pdf.worker.min.mjs";

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    const pageCount = pdf.numPages || 1;

    // ── 1. Render Page 1 Thumbnail via Off-Screen HTML5 Canvas ────────────────
    let thumbnailBlob: Blob | null = null;
    try {
      if (pdf.numPages >= 1) {
        const firstPage = await pdf.getPage(1);
        const originalViewport = firstPage.getViewport({ scale: 1.0 });
        // Target 320px width for a high-density, sharp thumbnail preview
        const targetWidth = 320;
        const scale = targetWidth / originalViewport.width;
        const viewport = firstPage.getViewport({ scale });

        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const context = canvas.getContext("2d");

        if (context) {
          // Render page 1 directly onto the off-screen canvas
          await firstPage.render({
            canvasContext: context,
            viewport,
            canvas,
          }).promise;

          thumbnailBlob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob(
              (blob) => resolve(blob),
              "image/jpeg",
              0.82
            );
          });
        }
      }
    } catch (thumbErr) {
      console.warn("[client-extractor] Could not generate page 1 thumbnail:", thumbErr);
    }

    // ── 2. Extract Text Content across Pages ──────────────────────────────────
    let fullText = "";

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      // Stop early if we've already collected enough text
      if (fullText.length >= MAX_CHARS) break;

      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      const pageText = textContent.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ");

      fullText += pageText + "\n";
    }

    const trimmed = fullText.trim().slice(0, MAX_CHARS);

    if (!trimmed) {
      // PDF is likely a scanned image with no selectable text, but thumbnailBlob is still preserved
      console.warn(
        "[client-extractor] PDF appears to be an image scan — no selectable text found."
      );
      return { text: null, pageCount, thumbnailBlob };
    }

    return { text: trimmed, pageCount, thumbnailBlob };
  } catch (err) {
    // Non-fatal: extraction failure just means the server will handle text parsing
    console.warn("[client-extractor] Failed to extract text/thumbnail from PDF:", err);
    return { text: null, pageCount: 1, thumbnailBlob: null };
  }
}

/**
 * Backward-compatible helper returning just the extracted text string.
 */
export async function extractTextFromPdf(file: File): Promise<string | null> {
  const result = await extractPdfMetadataAndText(file);
  return result.text;
}
