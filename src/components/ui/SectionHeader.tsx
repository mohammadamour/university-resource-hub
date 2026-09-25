interface SectionHeaderProps {
  title: string;
  description?: string;
}

/**
 * Visual separator for department sections on the landing page.
 * Creates clear groupings between IT courses, Electives, Placement Exams, etc.
 */
export default function SectionHeader({ title, description }: SectionHeaderProps) {
  return (
    <div className="mb-4 mt-8 first:mt-0">
      <h2 className="text-xl font-bold text-foreground sm:text-2xl">
        {title}
      </h2>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground">
          {description}
        </p>
      )}
      <div className="mt-3 h-0.5 w-12 rounded-full bg-accent" />
    </div>
  );
}
