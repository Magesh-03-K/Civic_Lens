import Link from 'next/link';
import {
  Camera,
  Database,
  BarChart3,
} from 'lucide-react';
import { getServiceSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface ReportStatsSummary {
  totalCount: number;
  openCount: number;
  resolvedCount: number;
  slaBreaches: number;
  avgResolutionHours: number;
  hasSeedData: boolean;
}

async function getLiveHomeStats(): Promise<ReportStatsSummary> {
  try {
    const supabase = getServiceSupabase();
    const { data: reports, error } = await supabase
      .from('reports')
      .select('status, factor_scores, report_count, is_seed, created_at, sla_due_at, resolved_at');

    if (error || !reports) {
      return {
        totalCount: 0,
        openCount: 0,
        resolvedCount: 0,
        slaBreaches: 0,
        avgResolutionHours: 0,
        hasSeedData: false,
      };
    }

    const now = new Date();
    let openCount = 0;
    let resolvedCount = 0;
    let slaBreaches = 0;
    let totalResolvedHours = 0;
    let resolvedWithHoursCount = 0;
    let hasSeedData = false;

    for (const r of reports) {
      if (r.is_seed) hasSeedData = true;

      const isResolved = r.status === 'resolved';
      const slaDueDate = new Date(r.sla_due_at);

      if (isResolved) {
        resolvedCount += 1;
        if (r.resolved_at) {
          const resolvedDate = new Date(r.resolved_at);
          if (resolvedDate.getTime() > slaDueDate.getTime()) {
            slaBreaches += 1;
          }
          const diffHours = (resolvedDate.getTime() - new Date(r.created_at).getTime()) / 3600000;
          totalResolvedHours += Math.max(0, diffHours);
          resolvedWithHoursCount += 1;
        }
      } else {
        openCount += 1;
        if (now.getTime() > slaDueDate.getTime()) {
          slaBreaches += 1;
        }
      }
    }

    const avgResolutionHours =
      resolvedWithHoursCount > 0
        ? Math.round((totalResolvedHours / resolvedWithHoursCount) * 10) / 10
        : 0;

    return {
      totalCount: reports.length,
      openCount,
      resolvedCount,
      slaBreaches,
      avgResolutionHours,
      hasSeedData,
    };
  } catch (err) {
    console.error('Error fetching home stats:', err);
    return {
      totalCount: 0,
      openCount: 0,
      resolvedCount: 0,
      slaBreaches: 0,
      avgResolutionHours: 0,
      hasSeedData: false,
    };
  }
}

export default async function Home() {
  const stats = await getLiveHomeStats();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xl font-bold tracking-tight text-blue-700">CivicLens</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
              Prototype
            </span>
          </div>
          <nav className="flex items-center space-x-4 text-sm font-medium text-slate-600">
            <Link href="/" className="text-blue-700 font-semibold">Home</Link>
            <Link href="/report" className="hover:text-blue-700">Report</Link>
            <Link href="/dashboard" className="hover:text-blue-700">Dashboard</Link>
            <Link href="/about" className="hover:text-blue-700">About</Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-12 flex-1 w-full space-y-12">
        {/* Sample Data Banner */}
        {stats.hasSeedData && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Demonstration Mode:</strong> Sample grievance records are seeded to illustrate live triage and municipal response across Madurai.
              </span>
            </div>
            <Link href="/dashboard" className="text-amber-800 font-bold underline hover:no-underline shrink-0 ml-2">
              Explore Dashboard &rarr;
            </Link>
          </div>
        )}

        {/* Hero Section */}
        <section className="text-center space-y-6 pt-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            IDEA//FORGE Online Hackathon Prototype
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Transparent Civic Grievance & Infrastructure Triage
          </h1>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Report road hazards, water leaks, garbage heaps, and electrical faults with a photo or voice note.
            Multimodal AI scores severity, detects duplicates, routes tickets, and verifies repairs.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/report"
              className="w-full sm:w-auto min-h-[48px] px-6 py-3 rounded-xl bg-blue-600 text-white font-bold text-base hover:bg-blue-700 transition inline-flex items-center justify-center gap-2 shadow-sm"
            >
              <Camera className="w-5 h-5" />
              Report an Issue
            </Link>
            <Link
              href="/dashboard"
              className="w-full sm:w-auto min-h-[48px] px-6 py-3 rounded-xl border border-slate-300 text-slate-800 font-bold text-base hover:bg-slate-100 transition inline-flex items-center justify-center gap-2"
            >
              <BarChart3 className="w-5 h-5 text-slate-600" />
              View Public Dashboard
            </Link>
          </div>
        </section>

        {/* 4 Live Metric Cards */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs text-center">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Active Incidents
            </span>
            <span className="text-3xl font-extrabold text-amber-600 mt-1 block">
              {stats.openCount}
            </span>
            <span className="text-[11px] text-slate-400 mt-1 block">In municipal queue</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs text-center">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Verified Resolved
            </span>
            <span className="text-3xl font-extrabold text-emerald-600 mt-1 block">
              {stats.resolvedCount}
            </span>
            <span className="text-[11px] text-slate-400 mt-1 block">AI-verified fixes</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs text-center">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Avg Turnaround
            </span>
            <span className="text-3xl font-extrabold text-blue-600 mt-1 block">
              {stats.avgResolutionHours}h
            </span>
            <span className="text-[11px] text-slate-400 mt-1 block">Resolution time</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs text-center">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              SLA Breaches
            </span>
            <span className="text-3xl font-extrabold text-red-600 mt-1 block">
              {stats.slaBreaches}
            </span>
            <span className="text-[11px] text-slate-400 mt-1 block">Overdue tickets</span>
          </div>
        </section>

        {/* Three-Step Explainer */}
        <section className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900">How CivicLens Works</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              From report to verified resolution in three transparent steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
                1
              </div>
              <h3 className="text-base font-bold text-slate-900">Snap Photo or Voice Note</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Citizens upload evidence with automated GPS pinning. Audio notes in Tamil or English
                are transcribed and processed automatically without requiring user login.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg">
                2
              </div>
              <h3 className="text-base font-bold text-slate-900">Multimodal AI Triage & Deduplication</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Gemini evaluates safety risk, crowd exposure, and urgency. Code computes an
                explainable 0–100 score (P1–P4). Nearby duplicate reports within 50m are merged.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">
                3
              </div>
              <h3 className="text-base font-bold text-slate-900">Simulated Routing & Fix Verification</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Incidents are routed to responsible municipal departments. When repair photos are uploaded,
                AI compares before/after scenes to verify resolution before closing tickets.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="max-w-5xl mx-auto px-4 text-center text-xs text-slate-500 space-y-1">
          <p>CivicLens is a hackathon prototype with simulated dispatch.</p>
          <p>© OpenStreetMap contributors • IDEA//FORGE 2026</p>
        </div>
      </footer>
    </div>
  );
}
