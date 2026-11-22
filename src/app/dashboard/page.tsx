'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  Clock,
  ArrowRight,
  Database,
  Building2,
  MapPin,
  RefreshCw,
  Info,
} from 'lucide-react';
import { CATEGORIES, CATEGORY_LABELS } from '@/lib/ai/schemas';
import { Priority, PRIORITY_COLORS } from '@/lib/severity';
import DashboardMap from '@/components/DashboardMap';
import DashboardCharts from '@/components/DashboardCharts';

interface PublicReportItem {
  ticketId: string;
  category: string;
  title: string;
  summary: string;
  lat: number;
  lng: number;
  address: string | null;
  status: string;
  priority: Priority;
  score: number;
  reportCount: number;
  createdAt: string;
  resolvedAt: string | null;
  slaDueAt: string;
  slaBreached: boolean;
  departmentName: string;
  thumbnailUrl: string | null;
  mediaType: string | null;
  isSeed: boolean;
  needsHumanReview: boolean;
}

interface StatsSummary {
  totalCount: number;
  openCount: number;
  resolvedCount: number;
  slaBreaches: number;
  sampleDataCount: number;
  avgResolutionHoursByDepartment: Record<string, number>;
}

export default function DashboardPage() {
  const [reports, setReports] = useState<PublicReportItem[]>([]);
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchDashboardData = () => {
    Promise.all([
      fetch('/api/reports?limit=100').then((r) => r.json()),
      fetch('/api/stats').then((r) => r.json()),
    ])
      .then(([reportsJson, statsJson]) => {
        if (reportsJson.ok) {
          setReports(reportsJson.data || []);
        }
        if (statsJson.ok) {
          setStats(statsJson.data || null);
        }
      })
      .catch((err) => {
        console.error('Failed to load dashboard data:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Filtered reports list (sorted by live score descending)
  const filteredReports = useMemo(() => {
    return reports
      .filter((r) => {
        if (statusFilter && r.status !== statusFilter) return false;
        if (priorityFilter && r.priority !== priorityFilter) return false;
        if (categoryFilter && r.category !== categoryFilter) return false;
        if (departmentFilter && !r.departmentName.toLowerCase().includes(departmentFilter.toLowerCase())) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchTitle = r.title.toLowerCase().includes(q);
          const matchSummary = r.summary.toLowerCase().includes(q);
          const matchTicket = r.ticketId.toLowerCase().includes(q);
          const matchAddress = (r.address || '').toLowerCase().includes(q);
          if (!matchTitle && !matchSummary && !matchTicket && !matchAddress) return false;
        }
        return true;
      })
      .sort((a, b) => b.score - a.score);
  }, [reports, statusFilter, priorityFilter, categoryFilter, departmentFilter, searchQuery]);

  const hasSeedData = (stats?.sampleDataCount || 0) > 0 || reports.some((r) => r.isSeed);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold tracking-tight text-blue-700">CivicLens</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
              Dashboard
            </span>
          </Link>
          <nav className="flex items-center space-x-4 text-sm font-medium text-slate-600">
            <Link href="/" className="hover:text-blue-700">Home</Link>
            <Link href="/report" className="hover:text-blue-700">Report</Link>
            <Link href="/dashboard" className="text-blue-700 font-semibold">Dashboard</Link>
            <Link href="/about" className="hover:text-blue-700">About</Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8 flex-1 w-full space-y-6">
        {/* Sample Data Banner */}
        {hasSeedData && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Demonstration Mode:</strong> The dashboard includes simulated sample records
                labeled <span className="bg-amber-200 text-amber-800 px-1 py-0.5 rounded font-bold">SAMPLE DATA</span> to illustrate platform capabilities across Madurai.
              </span>
            </div>
            <Link href="/about" className="text-amber-800 font-bold underline hover:no-underline shrink-0 ml-2">
              Learn More &rarr;
            </Link>
          </div>
        )}

        {/* Dashboard Title & Quick Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Civic Infrastructure & Grievance Triage
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Live municipal incident monitoring, explainable risk priority scoring, and resolution tracking.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchDashboardData}
              className="min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition inline-flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <Link
              href="/report"
              className="min-h-[44px] px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition inline-flex items-center gap-1.5 shadow-xs"
            >
              Report Incident &rarr;
            </Link>
          </div>
        </div>

        {/* 4 Aggregate Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Total Reports
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 block">
              {stats?.totalCount ?? reports.length}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Recorded across wards</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider block">
              Open Incidents
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-600 mt-1 block">
              {stats?.openCount ?? reports.filter((r) => r.status !== 'resolved').length}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">In active triage</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider block">
              Verified Resolved
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 mt-1 block">
              {stats?.resolvedCount ?? reports.filter((r) => r.status === 'resolved').length}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">AI-verified completions</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <span className="text-xs font-semibold text-red-700 uppercase tracking-wider block">
              SLA Breaches
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-red-600 mt-1 block">
              {stats?.slaBreaches ?? reports.filter((r) => r.slaBreached).length}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Overdue response targets</span>
          </div>
        </div>

        {/* Interactive Map */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-blue-600" />
              Geographic Incident Distribution (Madurai City)
            </h2>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 font-medium text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-red-700" /> P1
              </span>
              <span className="flex items-center gap-1 font-medium text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-600" /> P2
              </span>
              <span className="flex items-center gap-1 font-medium text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-600" /> P3
              </span>
              <span className="flex items-center gap-1 font-medium text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-green-700" /> P4
              </span>
            </div>
          </div>
          <DashboardMap reports={filteredReports} />
        </div>

        {/* 3 Recharts Visualizations */}
        <DashboardCharts
          reports={reports}
          avgResolutionHours={stats?.avgResolutionHoursByDepartment || {}}
        />

        {/* Filter Bar */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            <span>Filter Grievances</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ticket, title, locality..."
                className="w-full text-xs pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs p-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="routed">Routed</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="text-xs p-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Priorities</option>
              <option value="P1">P1 – Critical (80+)</option>
              <option value="P2">P2 – High (60–79)</option>
              <option value="P3">P3 – Moderate (40–59)</option>
              <option value="P4">P4 – Low (&lt;40)</option>
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs p-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>

            {/* Department Filter */}
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="text-xs p-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Departments</option>
              <option value="roads">Roads & Engineering</option>
              <option value="water">Water Supply & Drainage</option>
              <option value="swm">Solid Waste Management</option>
              <option value="pcb">Pollution Control Board</option>
              <option value="elec">Electricity Board</option>
              <option value="general">General Grievance Cell</option>
            </select>
          </div>
        </div>

        {/* Live Incident Queue */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">
              Live Incident Triage Queue ({filteredReports.length} results)
            </h2>
            <span className="text-xs text-slate-500">Sorted by Live Severity Score</span>
          </div>

          {filteredReports.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 space-y-2">
              <Info className="w-8 h-8 mx-auto text-slate-400" />
              <p className="font-semibold text-slate-700">No grievance reports found</p>
              <p className="text-xs">
                No tickets matched your current filter criteria. Clear filters to view all active reports.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReports.map((r) => {
                const priorityColor = PRIORITY_COLORS[r.priority] || '#2563eb';

                return (
                  <Link
                    key={r.ticketId}
                    href={`/ticket/${r.ticketId}`}
                    className="block bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs hover:border-blue-400 transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        {r.thumbnailUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={r.thumbnailUrl}
                            alt=""
                            className="w-16 h-16 rounded-lg object-cover shrink-0 border border-slate-200"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 text-slate-400 text-xs">
                            No photo
                          </div>
                        )}
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-bold text-sm text-slate-900">{r.ticketId}</span>
                            <span
                              style={{ backgroundColor: priorityColor }}
                              className="text-white text-[11px] font-bold px-2 py-0.5 rounded shadow-xs"
                            >
                              {r.priority} ({r.score}/100)
                            </span>
                            <span className="text-xs font-medium text-slate-500 capitalize bg-slate-100 px-2 py-0.5 rounded">
                              {r.status.replace('_', ' ')}
                            </span>
                            {r.reportCount > 1 && (
                              <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                {r.reportCount} reports merged
                              </span>
                            )}
                            {r.isSeed && (
                              <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                                Sample
                              </span>
                            )}
                          </div>
                          <h3 className="text-base font-bold text-slate-900 line-clamp-1">{r.title}</h3>
                          <p className="text-xs text-slate-600 line-clamp-2">{r.summary}</p>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5 text-slate-400" />
                              {r.departmentName}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              {r.address || `${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}`}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right SLA & Action */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            r.slaBreached
                              ? 'bg-red-100 text-red-800'
                              : r.status === 'resolved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          {r.slaBreached ? 'SLA Breached' : r.status === 'resolved' ? 'Resolved' : 'Within SLA'}
                        </span>
                        <span className="text-xs text-blue-600 font-bold mt-2 sm:inline-flex items-center gap-1 hidden">
                          View Ticket <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Footnote Explaining Severity Formula */}
        <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-slate-800">Transparent Severity Scoring Formula</p>
            <p className="text-slate-500 mt-0.5">
              Score (0–100) = Safety Risk (35%) + Population Impact (25%) + Urgency/Spread (15%) +
              Location Sensitivity (10%) + Community Signal (10%) + Age of Ticket (5%).
            </p>
          </div>
          <Link href="/about" className="font-bold text-blue-700 hover:underline shrink-0">
            Read Methodology &rarr;
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="max-w-6xl mx-auto px-4 text-center text-xs text-slate-500 space-y-1">
          <p>CivicLens is a hackathon prototype with simulated dispatch.</p>
          <p>© OpenStreetMap contributors • IDEA//FORGE 2026</p>
        </div>
      </footer>
    </div>
  );
}
