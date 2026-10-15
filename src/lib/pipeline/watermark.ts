import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export interface WatermarkOptions {
  /** Custom text to stamp. Defaults to platform referral message. */
  text?: string;
  /** Opacity from 0.0 to 1.0 (default: 0.55 for subtle readability) */
  opacity?: number;
  /** Font size in points (default: 8.5) */
  fontSize?: number;
}

/**
 * Stamps a subtle, high-aesthetic referral watermark onto the bottom margin of every page in a PDF.
 *
 * WHY THIS EXISTS:
 * When students download summary notes and share them in private WhatsApp / Telegram group chats,
 * this footer acts as an organic, self-distributing referral loop back to Molakhasat.
 *
 * It uses pure JavaScript (pdf-lib) and the standard Helvetica font, meaning:
 * - Runs reliably in Node.js, Vercel Serverless, and Docker without C++ binaries.
 * - Adds < 5ms of processing time per page.
 * - Guaranteed non-fatal: if watermarking fails on a corrupted PDF, it logs a warning
 *   and returns the un-watermarked buffer so the upload pipeline never halts.
 */
export async function watermarkPdf(
  inputBuffer: ArrayBuffer,
  options: WatermarkOptions = {}
): Promise<ArrayBuffer> {
  try {
    const pdfDoc = await PDFDocument.load(inputBuffer, {
      ignoreEncryption: true,
      parseSpeed: 1,
    });

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = options.fontSize ?? 8.5;
    const opacity = options.opacity ?? 0.55;
    const text =
      options.text ??
      "Indexed via Molakhasat • molakhasat.com — Academic Resource Hub";

    const textWidth = font.widthOfTextAtSize(text, fontSize);
    const pages = pdfDoc.getPages();

    for (const page of pages) {
      const { width } = page.getSize();
      // Center the watermark horizontally at the very bottom (14 points above the edge)
      const x = (width - textWidth) / 2;
      const y = 14;

      page.drawText(text, {
        x: Math.max(10, x),
        y,
        size: fontSize,
        font,
        color: rgb(0.35, 0.42, 0.52), // Subtle slate-gray (#596A85)
        opacity,
      });
    }

    const modifiedBytes = await pdfDoc.save();
    return modifiedBytes.buffer.slice(
      modifiedBytes.byteOffset,
      modifiedBytes.byteOffset + modifiedBytes.byteLength
    ) as ArrayBuffer;
  } catch (err) {
    console.warn(
      "[watermark] Failed to watermark PDF, returning original buffer:",
      err
    );
    return inputBuffer;
  }
}
