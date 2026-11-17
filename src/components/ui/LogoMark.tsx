import Image from "next/image";

interface LogoMarkProps {
  size?: number;
  className?: string;
  variant?: "light" | "dark";
  priority?: boolean;
}

/**
 * 🏷️ Molakhasat Official Brand Logo Mark
 *
 * Represents the Arabic 'Meem' (م) fused with an academic bookmark ribbon
 * and an intersecting yellow highlighter stroke.
 *
 * Available in:
 * - 'light' (default): Dark ink ribbon on transparent background for Warm Parchment paper.
 * - 'dark': Cream parchment ribbon on dark rounded squircle for night mode.
 */
export default function LogoMark({
  size = 40,
  className = "",
  variant = "light",
  priority = false,
}: LogoMarkProps) {
  const src =
    variant === "dark"
      ? "/brand/logo-dark.png"
      : "/brand/logo-light.png";

  return (
    <Image
      src={src}
      alt="شعار ملخصات"
      width={size}
      height={size}
      priority={priority}
      className={`shrink-0 object-contain select-none ${className}`}
    />
  );
}
