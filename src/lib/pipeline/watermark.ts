import {
  PDFDocument,
  rgb,
  StandardFonts,
  PDFName,
  PDFArray,
  PDFString,
} from "pdf-lib";
import { SITE_URL } from "@/lib/constants";

export interface WatermarkOptions {
  /** Custom text to stamp. Defaults to platform referral message. */
  text?: string;
  /** Opacity from 0.0 to 1.0 (default: 0.60 for crisp yet non-intrusive readability) */
  opacity?: number;
  /** Font size in points (default: 8.5) */
  fontSize?: number;
  /** Resource ID for dedicated redirect route /r/:resourceId */
  resourceId?: string;
}

/**
 * Stamps a subtle, high-aesthetic referral watermark onto the bottom margin of every page in a PDF,
 * embedding an explicit clickable PDF Link Annotation pointing to the permanent /r/:id redirect route.
 *
 * WHY THIS IS AN EVERGREEN ARCHITECTURE:
 * 1. The stamped URL points to /r/:id on our primary brand domain (molakhasat.me).
 * 2. If the production domain ever changes, a 30-second Cloudflare/DNS 301 wildcard redirect
 *    (molakhasat.me/* -> newdomain.com/*) keeps every old PDF link working permanently.
 * 3. The server-side /r/:id route dynamically looks up the resource and redirects to the course,
 *    meaning PDFs remain 100% static and NEVER need binary migration or re-uploading.
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
    const opacity = options.opacity ?? 0.6;

    // Resolve domain and target redirect URL
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || SITE_URL).replace(/\/+$/, "");
    const displayDomain = siteUrl.replace(/^https?:\/\//i, "");

    const linkPath = options.resourceId ? `/r/${options.resourceId}` : "";
    const clickUrl = `${siteUrl}${linkPath}`;

    const text =
      options.text ??
      (options.resourceId
        ? `For more course summaries and resources, visit ${displayDomain}${linkPath}`
        : `For more course summaries and resources, visit ${displayDomain}`);

    const textWidth = font.widthOfTextAtSize(text, fontSize);
    const textHeight = font.heightAtSize(fontSize);
    const pages = pdfDoc.getPages();

    for (const page of pages) {
      const { width } = page.getSize();
      // Center the watermark horizontally at the very bottom (14 points above the edge)
      const x = Math.max(10, (width - textWidth) / 2);
      const y = 14;

      // 1. Draw Visual Slate-Gray Text
      page.drawText(text, {
        x,
        y,
        size: fontSize,
        font,
        color: rgb(0.35, 0.42, 0.52), // Subtle slate-gray (#596A85)
        opacity,
      });

      // 2. Embed Native PDF Clickable Link Annotation over the text bounding box
      try {
        const linkAnnot = pdfDoc.context.obj({
          Type: "Annot",
          Subtype: "Link",
          Rect: [x, y - 2, x + textWidth, y + textHeight + 2],
          Border: [0, 0, 0],
          C: [0, 0, 0],
          A: {
            Type: "Action",
            S: "URI",
            URI: PDFString.of(clickUrl),
          },
        });

        const linkAnnotRef = pdfDoc.context.register(linkAnnot);

        const rawAnnots = page.node.lookup(PDFName.of("Annots"));
        let annotsArray: PDFArray;

        if (rawAnnots instanceof PDFArray) {
          annotsArray = rawAnnots;
        } else {
          annotsArray = pdfDoc.context.obj([]);
          page.node.set(PDFName.of("Annots"), annotsArray);
        }

        annotsArray.push(linkAnnotRef);
      } catch (annotErr) {
        // Annotation failure is non-fatal — visual text remains stamped
        console.warn("[watermark] Failed to attach link annotation to page:", annotErr);
      }
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
