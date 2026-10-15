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

/**
 * Extracts raw text from a PDF File using pdf.js running in the browser.
 * Dynamically imports pdfjs-dist to keep it out of the server bundle.
 *
 * @param file  The PDF File object selected by the user
 * @returns     Extracted text (capped at MAX_CHARS) or null if extraction failed
 */
export async function extractTextFromPdf(file: File): Promise<string | null> {
  try {
    // Dynamic import: pdfjs-dist relies on browser APIs (Canvas, Worker)
    // and must NOT be imported at the top level in a Next.js app
    const pdfjsLib = await import("pdfjs-dist");

    // Point to the pdf.js worker script bundled by Next.js / webpack.
    // Setting this to the CDN keeps the worker out of the main bundle.
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

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
      console.warn("[client-extractor] PDF appears to be an image scan — no selectable text found.");
      return null;
    }

    return trimmed;
  } catch (err) {
    // Non-fatal: extraction failure just means the server will do it instead
    console.warn("[client-extractor] Failed to extract text from PDF:", err);
    return null;
  }
}
