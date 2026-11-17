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

/** Molakhasat Meem bookmark ribbon SVG path normalized to a 10x10 bounding box */
const LOGO_MEEM_RIBBON_SVG_PATH =
  "M 2 0 C 0.9 0 0 0.9 0 2 L 0 5 C 0 6.1 0.9 7 2 7 L 7 7 L 7 10 L 8.5 8.8 L 10 10 L 10 2 C 10 0.9 9.1 0 8 0 Z M 2.2 2 L 7.8 2 L 7.8 5 L 2.2 5 Z";

const DEFAULT_BRAND_TEXT = "molakhasat.me";

/**
 * Stamps a subtle, high-contrast "Micro-Pill" watermark onto the bottom margin of every page in a PDF.
 *
 * DESIGN RATIONALE:
 * 1. Compact Non-Intrusive Footprint: Trimmed brand copy to logo + "molakhasat.me" (~99pt width),
 *    preventing the watermark from occluding lecture text and footnotes at the bottom of slides.
 * 2. Bottom Margin Hugging: Positioned at y = 5 with height = 16pt (reaches y = 21pt max),
 *    ensuring it sits safely inside the bottom gutter beneath standard presentation text.
 * 3. Semi-Translucent Glassmorphism: Set to 72% opacity so in edge-case slides where text
 *    runs all the way to the canvas edge, underlying words remain faintly readable through the pill.
 * 4. Warm Parchment Vector Accent: Uses native SVG vector operators for the Molakhasat bookmark ribbon
 *    paired with a golden yellow highlighter bar (#F2D43A) for zero bitmap memory and infinite zoom sharpness.
 * 5. Generous Clickable Hitbox: Link annotation covers the entire pill rectangle, making it easy to tap.
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
    const pillOpacity = options.opacity ?? 0.72;

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

      // Compact micro-pill typography (fixed 8.5pt keeps it non-intrusive on both A4 and 16:9 slides)
      const fontSize = options.fontSize ?? 8.5;
      const textWidth = font.widthOfTextAtSize(displayText, fontSize);
      const textHeight = font.heightAtSize(fontSize);

      // Icon & Layout Metrics (Micro footprint)
      const iconSize = 8;
      const iconScale = iconSize / 10;
      const gap = 5;
      const padX = 10;
      const padY = 3.5;

      const totalContentWidth = iconSize + gap + textWidth;
      const pillWidth = Math.round(totalContentWidth + padX * 2);
      const pillHeight = 16;

      // Hug the bottom edge (5 points above canvas bottom) to stay below lecture text
      const pillX = Math.round((width - pillWidth) / 2);
      const pillY = 5;

      // 1. Draw Glassmorphic Pill Container (Warm Parchment Ink #1B1F2A with subtle line border)
      page.drawRectangle({
        x: pillX,
        y: pillY,
        width: pillWidth,
        height: pillHeight,
        color: rgb(0.11, 0.12, 0.16), // Deep Ink (#1B1F2A)
        opacity: pillOpacity,
        borderColor: rgb(0.87, 0.84, 0.77), // Warm Line (#DDD5C4)
        borderWidth: 0.75,
        borderOpacity: 0.5,
      });

      const contentStartX = pillX + padX;

      // 2a. Draw Yellow Highlighter Stroke Accent behind Meem ribbon
      page.drawRectangle({
        x: contentStartX - 1,
        y: pillY + (pillHeight - 3.5) / 2,
        width: 6,
        height: 3.5,
        color: rgb(0.95, 0.83, 0.23), // Golden Yellow highlight (#F2D43A)
        opacity: 0.95,
      });

      // 2b. Draw Vector Meem Bookmark Ribbon in Warm Parchment White
      // In pdf-lib SVG operators, Y is scaled negatively so the passed Y marks the top of the shape
      const logoY = pillY + (pillHeight + iconSize) / 2;

      page.drawSvgPath(LOGO_MEEM_RIBBON_SVG_PATH, {
        x: contentStartX,
        y: logoY,
        scale: iconScale,
        color: rgb(0.98, 0.97, 0.95), // Warm parchment white text (#FBF8F2)
      });

      // 3. Draw Warm Parchment Brand Text
      const textX = contentStartX + iconSize + gap;
      // Align font baseline inside pill
      const textY = pillY + (pillHeight - textHeight) / 2 + 1;

      page.drawText(displayText, {
        x: textX,
        y: textY,
        size: fontSize,
        font,
        color: rgb(0.98, 0.97, 0.95), // Crisp parchment white text
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

