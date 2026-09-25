import type { ResourceType } from "@/types/database";

/**
 * Maps resource types to their Arabic labels and color classes.
 */
const BADGE_CONFIG: Record<ResourceType, { label: string; className: string }> = {
  summary:   { label: "ملخص",       className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  quiz:      { label: "كويز",       className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
  past_exam: { label: "امتحان سابق", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  guide:     { label: "دليل",       className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  link:      { label: "رابط",       className: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300" },
  other:     { label: "أخرى",       className: "bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-300" },
};

interface BadgeProps {
  type: ResourceType;
}

/**
 * Color-coded badge indicating the resource type (Summary, Quiz, Past Exam, etc.).
 * Colors are distinct so students can quickly scan a list and find what they need.
 */
export default function Badge({ type }: BadgeProps) {
  const config = BADGE_CONFIG[type];

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
