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
  /** Custom text to stamp inside the pill. Defaults to platform brand text. */
  text?: string;
  /** Opacity of the background pill capsule from 0.0 to 1.0 (default: 0.92) */
  opacity?: number;
  /** Explicit font size override in points. If omitted, scales dynamically based on page width (9.5–13pt). */
  fontSize?: number;
  /** Resource ID for dedicated redirect route /r/:resourceId */
  resourceId?: string;
}

/** 4-pointed sparkle SVG path (✦) normalized to a 9x9 bounding box */
const SPARKLE_SVG_PATH =
  "M 4.5 0 L 5.7 3.2 L 9 4.5 L 5.7 5.8 L 4.5 9 L 3.3 5.8 L 0 4.5 L 3.3 3.2 Z";

const DEFAULT_BRAND_TEXT = "molakhasat.me • Resources & Summaries";

/**
 * Stamps a high-contrast, branded "Pill Badge" watermark onto the bottom margin of every page in a PDF.
 *
 * DESIGN RATIONALE:
 * 1. High-Contrast Dark Container: Drawing a deep slate capsule (`rgb(0.06, 0.09, 0.15)`) with a subtle
 *    slate border guarantees 100% legibility on both dark presentation slides (teal/black/blue) and white docs.
 * 2. Vector Sparkle Accent: Standard PDF fonts (Helvetica) use WinAnsi encoding and cannot encode unicode `✦`.
 *    We render a native 4-pointed sparkle via SVG vector operators in brand emerald (`rgb(0.20, 0.85, 0.65)`).
 * 3. Proportional Scaling: The font and pill scale dynamically to the page width (9.5pt on small docs,
 *    up to 13pt on wide 16:9 slides) so it's never comically small or oversized.
 * 4. Generous Touch Target: The native PDF Link Annotation covers the entire pill rectangle (~28pt height),
 *    making it effortless for mobile students on phones/tablets to tap and jump directly to /r/:id.
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

    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pillOpacity = options.opacity ?? 0.92;

    // Resolve domain and target redirect URL
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || SITE_URL).replace(/\/+$/, "");
    const linkPath = options.resourceId ? `/r/${options.resourceId}` : "";
    const clickUrl = `${siteUrl}${linkPath}`;

    // Sanitize input text: remove unicode sparkles if passed by caller to prevent WinAnsi crash
    const displayText = (options.text ?? DEFAULT_BRAND_TEXT)
      .replace(/✦/g, "")
      .trim();

    const pages = pdfDoc.getPages();

    for (const page of pages) {
      const { width } = page.getSize();

      // Proportional font sizing: ~10pt on standard A4 (595pt width), ~13pt on 16:9 slides (960pt width)
      const fontSize = options.fontSize ?? Math.max(9.5, Math.min(13, Math.round(width * 0.014)));
      const textWidth = font.widthOfTextAtSize(displayText, fontSize);
      const textHeight = font.heightAtSize(fontSize);

      // Icon & Layout Metrics
      const sparkleSize = fontSize * 0.9;
      const sparkleScale = sparkleSize / 9;
      const gap = 7;
      const padX = 14;
      const padY = 6;

      const totalContentWidth = sparkleSize + gap + textWidth;
      const pillWidth = totalContentWidth + padX * 2;
      const pillHeight = Math.max(26, textHeight + padY * 2);

      // Center pill horizontally at the bottom margin (14 points above the edge)
      const pillX = Math.round((width - pillWidth) / 2);
      const pillY = 14;

      // 1. Draw High-Contrast Pill Container (Slate-950 fill with subtle border)
      page.drawRectangle({
        x: pillX,
        y: pillY,
        width: pillWidth,
        height: pillHeight,
        color: rgb(0.06, 0.09, 0.15), // Deep slate-950 (#0f1726)
        opacity: pillOpacity,
        borderColor: rgb(0.24, 0.32, 0.44), // Subtle slate-600 border (#3d5270)
        borderWidth: 1,
        borderOpacity: 0.85,
      });

      // 2. Draw Vector Sparkle Icon (✦) in Brand Emerald-400
      const contentStartX = pillX + padX;
      // In pdf-lib SVG operators, Y is scaled negatively so the passed Y marks the top of the shape
      const sparkleY = pillY + (pillHeight + sparkleSize) / 2;

      page.drawSvgPath(SPARKLE_SVG_PATH, {
        x: contentStartX,
        y: sparkleY,
        scale: sparkleScale,
        color: rgb(0.20, 0.85, 0.65), // Emerald-400 accent
      });

      // 3. Draw Crisp White Bold Brand Text
      const textX = contentStartX + sparkleSize + gap;
      // Align font baseline inside pill
      const textY = pillY + (pillHeight - textHeight) / 2 + 1.5;

      page.drawText(displayText, {
        x: textX,
        y: textY,
        size: fontSize,
        font,
        color: rgb(0.98, 0.99, 1.0), // Crisp white text
      });

      // 4. Embed Native PDF Clickable Link Annotation over the entire Pill Bounding Box
      try {
        const linkAnnot = pdfDoc.context.obj({
          Type: "Annot",
          Subtype: "Link",
          // The clickable hitbox spans the complete pill container for easy mobile tapping
          Rect: [pillX, pillY, pillX + pillWidth, pillY + pillHeight],
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
        // Annotation failure is non-fatal — visual badge remains stamped
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

