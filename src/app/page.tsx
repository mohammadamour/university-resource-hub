import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import DepartmentGrid from "@/components/features/DepartmentGrid";
import HeroSection from "@/components/features/HeroSection";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_UNIVERSITY_SLUG } from "@/lib/constants";
import type { DepartmentWithCourses } from "@/types/database";

// ISR: Re-fetch data every hour (departments/courses rarely change)
export const revalidate = 3600;

/**
 * Fetches all departments (with their courses) for the default university.
 * Ordered by display_order so we control the section layout from the database.
 */
async function getDepartments(): Promise<DepartmentWithCourses[]> {
  const supabase = await createClient();

  // Get the default university
  const { data: university } = await supabase
    .from("universities")
    .select("id")
    .eq("slug", DEFAULT_UNIVERSITY_SLUG)
    .single();

  if (!university) return [];

  // Get departments with their courses and active resources
  const { data: departments } = await supabase
    .from("departments")
    .select(
      `
      *,
      courses (
        *,
        resources (
          id,
          status,
          type,
          quiz_data,
          is_featured
        )
      )
    `
    )
    .eq("university_id", university.id)
    .order("display_order", { ascending: true });

  return (departments as DepartmentWithCourses[]) || [];
}

export default async function HomePage() {
  const departments = await getDepartments();

  // Compute live counts for trust badges
  const totalCourses = departments.reduce(
    (acc, d) => acc + (d.courses?.length || 0),
    0
  );
  const totalResources = departments.reduce(
    (acc, d) =>
      acc +
      (d.courses || []).reduce(
        (cAcc, c) =>
          cAcc +
          ((c.resources || []).filter(
            (r) => (r.status || "active") === "active"
          ).length),
        0
      ),
    0
  );

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-4 sm:px-6 sm:py-6">
        {/* Dynamic Hero Section */}
        <HeroSection
          totalCourses={totalCourses > 0 ? totalCourses : 20}
          totalResources={totalResources > 0 ? totalResources : 130}
        />

        {/* Course Catalog & Department Sections */}
        <DepartmentGrid departments={departments} />
      </main>
      <Footer />
    </>
  );
}
