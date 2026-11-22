import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldCheck,
  Building2,
  Clock,
  ArrowRight,
  LogOut,
  AlertTriangle,
  MapPin,
  Users,
} from 'lucide-react';
import { checkAuthoritySession } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase';
import { calculateSeverity, PRIORITY_COLORS } from '@/lib/severity';
import { CATEGORY_LABELS } from '@/lib/ai/schemas';

export const dynamic = 'force-dynamic';

interface DepartmentData {
  id: number;
  name: string;
  slug: string;
}

export default async function AuthorityQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ dept?: string }>;
}) {
  const isAuthed = await checkAuthoritySession();
  if (!isAuthed) {
    redirect('/authority/login');
  }

  const { dept } = await searchParams;
  const supabase = getServiceSupabase();

  // Fetch departments for filter
  const { data: departments } = await supabase
    .from('departments')
    .select('id, name, slug');

  // Fetch all unresolved tickets
  let query = supabase
    .from('reports')
    .select(`
      id,
      ticket_id,
      category,
      title,
      summary,
      lat,
      lng,
      address,
      status,
      factor_scores,
      report_count,
      is_seed,
      needs_human_review,
      created_at,
      sla_due_at,
      resolved_at,
      departments (
        id,
        name,
        slug
      )
    `)
    .neq('status', 'resolved')
    .order('created_at', { ascending: false });

  if (dept) {
    if (/^\d+$/.test(dept)) {
      query = query.eq('department_id', parseInt(dept, 10));
    } else {
      query = query.eq('departments.slug', dept);
    }
  }

  const { data: reportsData } = await query;

  const now = new Date();
  const reports = (reportsData || []).map((r) => {
    const severity = calculateSeverity({
      factors: r.factor_scores,
      reportCount: r.report_count,
      createdAt: r.created_at,
      resolvedAt: r.resolved_at,
      now,
    });

    const slaDueDate = new Date(r.sla_due_at);
    const isBreached = now.getTime() > slaDueDate.getTime();
    const hoursRemaining = Math.round((slaDueDate.getTime() - now.getTime()) / 3600000);

    const deptInfo = Array.isArray(r.departments) ? r.departments[0] : r.departments;

    return {
      id: r.id,
      ticketId: r.ticket_id,
      category: r.category,
      title: r.title,
      summary: r.summary,
      address: r.address,
      lat: r.lat,
      lng: r.lng,
      status: r.status,
      priority: severity.priority,
      score: severity.score,
      reportCount: r.report_count,
      needsHumanReview: r.needs_human_review,
      isSeed: r.is_seed,
      createdAt: r.created_at,
      slaDueAt: r.sla_due_at,
      slaBreached: isBreached,
      hoursRemaining,
      departmentName: deptInfo?.name || 'Grievance Cell',
      daysOpen: Math.round(severity.daysOpen * 10) / 10,
    };
  });

  // Sort by live severity score (descending)
  reports.sort((a, b) => b.score - a.score);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/95 sticky top-0 z-30 shadow-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-xl font-bold tracking-tight text-blue-400">CivicLens</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700/50">
              Staff Triage Console
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              href="/dashboard"
              className="text-xs font-medium text-slate-400 hover:text-white"
            >
              Public Dashboard
            </Link>
            <form action="/api/authority/logout" method="POST">
              <button
                type="submit"
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 transition flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8 flex-1 w-full space-y-6">
        {/* Title & Department Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2">
              <ShieldCheck className="w-7 h-7 text-blue-400" />
              Unresolved Incident Triage Queue
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              {reports.length} pending civic incidents ordered by real-time risk score.
            </p>
          </div>

          {/* Department Filter Links */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <Link
              href="/authority"
              className={`px-3 py-1.5 rounded-lg border transition ${
                !dept
                  ? 'bg-blue-600 text-white border-blue-500 font-bold'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              All Departments
            </Link>
            {((departments as DepartmentData[]) || []).map((d) => (
              <Link
                key={d.id}
                href={`/authority?dept=${d.slug}`}
                className={`px-3 py-1.5 rounded-lg border transition ${
                  dept === d.slug
                    ? 'bg-blue-600 text-white border-blue-500 font-bold'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                {d.name.replace(/Madurai Corporation – |Tamil Nadu |TWAD \/ /gi, '')}
              </Link>
            ))}
          </div>
        </div>

        {/* Incident List */}
        {reports.length === 0 ? (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center text-slate-400">
            <ShieldCheck className="w-10 h-10 mx-auto text-emerald-400 mb-2" />
            <p className="font-bold text-white text-base">No pending incidents in this queue</p>
            <p className="text-xs text-slate-400 mt-1">
              All reported complaints for this department have been verified and resolved.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => {
              const priorityColor = PRIORITY_COLORS[r.priority] || '#2563eb';

              return (
                <Link
                  key={r.ticketId}
                  href={`/authority/${r.ticketId}`}
                  className="block bg-slate-800 border border-slate-700 hover:border-blue-500 rounded-xl p-4 sm:p-5 transition shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-extrabold text-sm text-white">
                          {r.ticketId}
                        </span>
                        <span
                          style={{ backgroundColor: priorityColor }}
                          className="text-white text-[11px] font-bold px-2 py-0.5 rounded shadow-xs"
                        >
                          {r.priority} ({r.score}/100)
                        </span>
                        <span className="text-xs font-semibold capitalize bg-slate-700 text-slate-300 px-2 py-0.5 rounded">
                          {r.status.replace('_', ' ')}
                        </span>
                        {r.needsHumanReview && (
                          <span className="text-[11px] font-semibold bg-amber-950 text-amber-300 border border-amber-700/60 px-2 py-0.5 rounded flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Needs Review
                          </span>
                        )}
                        {r.reportCount > 1 && (
                          <span className="text-[11px] font-semibold bg-blue-950 text-blue-300 border border-blue-700/60 px-2 py-0.5 rounded flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {r.reportCount} Merged Reports
                          </span>
                        )}
                        {r.isSeed && (
                          <span className="text-[10px] font-bold bg-amber-900/50 text-amber-300 px-1.5 py-0.5 rounded border border-amber-800">
                            Sample
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-white">{r.title}</h3>
                      <p className="text-xs text-slate-300 line-clamp-2 max-w-3xl">{r.summary}</p>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-slate-500" />
                          {r.departmentName}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-500" />
                          {r.address || `${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}`}
                        </span>
                        <span>Open: {r.daysOpen} days</span>
                        <span>Category: {CATEGORY_LABELS[r.category as keyof typeof CATEGORY_LABELS] || r.category}</span>
                      </div>
                    </div>

                    {/* Right: SLA & Action */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-700 shrink-0">
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
                          r.slaBreached
                            ? 'bg-red-950 text-red-300 border border-red-800'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        {r.slaBreached
                          ? 'SLA Breached'
                          : r.hoursRemaining > 24
                          ? `${Math.round(r.hoursRemaining / 24)}d left`
                          : `${r.hoursRemaining}h left`}
                      </span>

                      <span className="text-xs font-bold text-blue-400 mt-2 inline-flex items-center gap-1">
                        Review & Act <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900 py-4 text-center text-xs text-slate-500">
        CivicLens Municipal Staff Console • Real-Time Queue
      </footer>
    </div>
  );
}
