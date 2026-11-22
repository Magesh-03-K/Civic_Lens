import { SupabaseClient } from '@supabase/supabase-js';

export interface Department {
  id: number;
  slug: string;
  name: string;
  categories: string[];
  email: string;
}

/**
 * Pure routing resolver: finds the department whose categories array
 * contains the report's category. If none matched, falls back to 'general'.
 */
export function resolveDepartmentForCategory(
  departments: Department[],
  category: string
): Department | null {
  const directMatch = departments.find((d) => d.categories.includes(category));
  if (directMatch) {
    return directMatch;
  }

  const generalFallback = departments.find((d) => d.slug === 'general');
  return generalFallback || null;
}

/**
 * Database routing function: queries the editable departments table
 * from Supabase and returns the assigned department.
 */
export async function getDepartmentForCategory(
  supabase: SupabaseClient,
  category: string
): Promise<Department> {
  const { data, error } = await supabase
    .from('departments')
    .select('id, slug, name, categories, email');

  if (error || !data || data.length === 0) {
    // Return hardcoded fallback if database query fails
    return {
      id: 6,
      slug: 'general',
      name: 'Madurai Corporation – General Grievance Cell',
      categories: ['other'],
      email: 'general@civiclens.invalid',
    };
  }

  const matched = resolveDepartmentForCategory(data as Department[], category);

  return (
    matched || {
      id: 6,
      slug: 'general',
      name: 'Madurai Corporation – General Grievance Cell',
      categories: ['other'],
      email: 'general@civiclens.invalid',
    }
  );
}
