import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { calculateSeverity, Priority } from '@/lib/severity';
import { FactorScores } from '@/lib/ai/schemas';

export const dynamic = 'force-dynamic';

interface ReportStatsRow {
  status: string;
  category: string;
  factor_scores: FactorScores;
  report_count: number;
  is_seed: boolean;
  created_at: string;
  sla_due_at: string;
  resolved_at: string | null;
  department_id: number | null;
  departments?: {
    id: number;
    name: string;
  } | null;
}

/**
 * GET /api/stats: Aggregate analytics across tickets for dashboard & stats displays.
 * Outputs: open and resolved counts, counts by live priority and category,
 * average resolution hours per department, SLA breaches, and sample data count.
 */
export async function GET() {
  try {
    const supabase = getServiceSupabase();

    const { data, error } = await supabase
      .from('reports')
      .select(`
        status,
        category,
        factor_scores,
        report_count,
        is_seed,
        created_at,
        sla_due_at,
        resolved_at,
        department_id,
        departments (
          id,
          name
        )
      `);

    if (error) {
      console.error('Error fetching stats data:', error);
      return NextResponse.json({ ok: false, error: 'Failed to retrieve stats.' }, { status: 500 });
    }

    const reports = (data as unknown as ReportStatsRow[]) || [];
    const now = new Date();

    let openCount = 0;
    let resolvedCount = 0;
    let slaBreaches = 0;
    let sampleDataCount = 0;

    const countsByPriority: Record<Priority, number> = {
      P1: 0,
      P2: 0,
      P3: 0,
      P4: 0,
    };

    const countsByCategory: Record<string, number> = {};
    const departmentResolutionTimes: Record<string, number[]> = {};

    for (const r of reports) {
      if (r.is_seed) {
        sampleDataCount += 1;
      }

      // Live priority & score calculation
      const liveSeverity = calculateSeverity({
        factors: r.factor_scores,
        reportCount: r.report_count,
        createdAt: r.created_at,
        resolvedAt: r.resolved_at,
        now,
      });

      countsByPriority[liveSeverity.priority] += 1;

      // Category counts
      countsByCategory[r.category] = (countsByCategory[r.category] || 0) + 1;

      // Status & SLA tracking
      const slaDueDate = new Date(r.sla_due_at);
      const isResolved = r.status === 'resolved';

      if (isResolved) {
        resolvedCount += 1;

        if (r.resolved_at) {
          const resolvedDate = new Date(r.resolved_at);
          if (resolvedDate.getTime() > slaDueDate.getTime()) {
            slaBreaches += 1;
          }

          // Resolution time in hours
          const hoursToResolve = Math.max(
            0,
            (resolvedDate.getTime() - new Date(r.created_at).getTime()) / (1000 * 60 * 60)
          );

          const deptName = r.departments?.name || 'General Grievance Cell';
          if (!departmentResolutionTimes[deptName]) {
            departmentResolutionTimes[deptName] = [];
          }
          departmentResolutionTimes[deptName].push(hoursToResolve);
        }
      } else {
        openCount += 1;
        if (now.getTime() > slaDueDate.getTime()) {
          slaBreaches += 1;
        }
      }
    }

    // Compute average resolution hours per department
    const avgResolutionHoursByDepartment: Record<string, number> = {};
    for (const [dept, times] of Object.entries(departmentResolutionTimes)) {
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      avgResolutionHoursByDepartment[dept] = Math.round(avg * 10) / 10;
    }

    return NextResponse.json({
      ok: true,
      data: {
        totalCount: reports.length,
        openCount,
        resolvedCount,
        slaBreaches,
        sampleDataCount,
        countsByPriority,
        countsByCategory,
        avgResolutionHoursByDepartment,
      },
    });
  } catch (err) {
    console.error('Unexpected error in GET /api/stats:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error.' }, { status: 500 });
  }
}
