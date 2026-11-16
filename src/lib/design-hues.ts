/**
 * 🎨 Molakhasat Pastel Notebook Palette
 * 
 * Provides deterministic hue mapping for course cards and banners.
 * Automatically distributes the 7 design system hues based on course slug
 * without requiring any database columns or manual tagging.
 */

export type CourseHue =
  | "tomato"
  | "teal"
  | "indigo"
  | "ochre"
  | "plum"
  | "sky"
  | "olive";

export interface HueStyle {
  hue: CourseHue;
  tint: string;       // Pastel background color
  deep: string;       // Rich contrasting foreground/accent color
  chipBg: string;     // Transparent contrast chip background
  marginLine: string; // Left/right notebook margin guide line
  glyphColor: string; // Large background watermark Arabic glyph color
  coverBg: string;    // CSS repeating linear gradient for ruled lines
}

export const COURSE_HUES: Record<CourseHue, { tint: string; deep: string }> = {
  tomato: { tint: "#F7DDD3", deep: "#A8361C" },
  teal: { tint: "#D5ECE7", deep: "#14594F" },
  indigo: { tint: "#DDE0F5", deep: "#2E3A94" },
  ochre: { tint: "#F5E6C4", deep: "#7A4F0C" },
  plum: { tint: "#EBD5E6", deep: "#6E2563" },
  sky: { tint: "#D3E7F4", deep: "#1B5C8A" },
  olive: { tint: "#E3E8C6", deep: "#4E5B10" },
};

const HUE_ORDER: CourseHue[] = [
  "tomato",
  "teal",
  "indigo",
  "ochre",
  "plum",
  "sky",
  "olive",
];

function hexToRgba(hex: string, alpha: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Deterministically maps any string (like a course slug) to one of the 7 hues.
 */
export function getCourseHue(slug: string): CourseHue {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = (hash << 5) - hash + slug.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % HUE_ORDER.length;
  return HUE_ORDER[index];
}

/**
 * Returns the complete set of visual style properties for a course notebook cover.
 */
export function getCourseHueStyles(slug: string): HueStyle {
  const hue = getCourseHue(slug);
  const { tint, deep } = COURSE_HUES[hue];
  const line = hexToRgba(deep, 0.2);

  return {
    hue,
    tint,
    deep,
    chipBg: "rgba(255, 255, 255, 0.75)",
    marginLine: hexToRgba(deep, 0.38),
    glyphColor: hexToRgba(deep, 0.14),
    coverBg: `background-color: ${tint}; background-image: repeating-linear-gradient(to bottom, transparent 0, transparent 23px, ${line} 23px, ${line} 24px);`,
  };
}
