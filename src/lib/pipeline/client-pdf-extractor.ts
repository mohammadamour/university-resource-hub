/**
 * Client-side PDF text extractor using pdfjs-dist (runs in the browser).
 *
 * This is used for EAGER / SPECULATIVE extraction:
 * When the user selects a file and enables "Generate Quiz", we start extracting
 * text immediately in the background. By the time the user fills in the title
 * and hits Upload, the text is ready and can be sent alongside the file — so
 * the server skips its own extraction step entirely.
 *
 * We cap at 300,000 characters (~50,000 words) to capture complete course summaries
 * across all chapters, fitting comfortably within Gemini 3.8 Flash's 1M token context.
 */

const MAX_CHARS = 300_000;

export interface ClientPdfExtractionResult {
  text: string | null;
  pageCount: number;
}

/**
 * Extracts raw text and page count from a PDF File using pdf.js running in the browser.
 * Dynamically imports pdfjs-dist to keep it out of the server bundle.
 *
 * @param file  The PDF File object selected by the user
 * @returns     Object containing extracted text (capped at MAX_CHARS) and pageCount
 */
export async function extractPdfMetadataAndText(
  file: File
): Promise<ClientPdfExtractionResult> {
  try {
    // Dynamic import: pdfjs-dist relies on browser APIs (Canvas, Worker)
    // and must NOT be imported at the top level in a Next.js app
    const pdfjsLib = await import("pdfjs-dist");

    // Point to the self-hosted pdf.js worker in /public/workers.
    // Self-hosting eliminates CDN network latency, CDN blocking on university Wi-Fi,
    // and satisfies strict Content Security Policies (worker-src 'self').
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/workers/pdf.worker.min.mjs";

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    const pageCount = pdf.numPages || 1;
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
      // PDF is likely a scanned image with no selectable text
      console.warn(
        "[client-extractor] PDF appears to be an image scan — no selectable text found."
      );
      return { text: null, pageCount };
    }

    return { text: trimmed, pageCount };
  } catch (err) {
    // Non-fatal: extraction failure just means the server will do it instead
    console.warn("[client-extractor] Failed to extract text from PDF:", err);
    return { text: null, pageCount: 1 };
  }
}

/**
 * Backward-compatible helper returning just the extracted text string.
 */
export async function extractTextFromPdf(file: File): Promise<string | null> {
  const result = await extractPdfMetadataAndText(file);
  return result.text;
}
