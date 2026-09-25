import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import DepartmentGrid from "@/components/features/DepartmentGrid";
import { createClient } from "@/lib/supabase/server";
import {
  SITE_NAME,
  DEFAULT_UNIVERSITY_SLUG,
  REVALIDATE_LANDING,
} from "@/lib/constants";
import type { DepartmentWithCourses } from "@/types/database";

// ISR: Re-fetch data every hour (departments/courses rarely change)
export const revalidate = REVALIDATE_LANDING;

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

  // Get departments with their courses, ordered
  const { data: departments } = await supabase
    .from("departments")
    .select(
      `
      *,
      courses (*)
    `
    )
    .eq("university_id", university.id)
    .order("display_order", { ascending: true });

  return (departments as DepartmentWithCourses[]) || [];
}

export default async function HomePage() {
  const departments = await getDepartments();

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        {/* Hero Section */}
        <section className="mb-10 text-center sm:mb-14">
          <h1 className="text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
            {SITE_NAME}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
            ملخصات، موارد، وأدلة دراسية لطلاب الجامعة — كل شيء في مكان واحد
          </p>
        </section>

        {/* Department Sections */}
        <DepartmentGrid departments={departments} />
      </main>
      <Footer />
    </>
  );
}
