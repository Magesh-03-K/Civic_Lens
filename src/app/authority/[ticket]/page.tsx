import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  Building2,
  Mail,
  MapPin,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { checkAuthoritySession } from '@/lib/auth';
import { getServiceSupabase, mediaUrl } from '@/lib/supabase';
import { calculateSeverity, PRIORITY_COLORS } from '@/lib/severity';
import AuthorityActionPanel from '@/components/AuthorityActionPanel';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ ticket: string }>;
}

export default async function AuthorityTicketDetailPage({ params }: Props) {
  const isAuthed = await checkAuthoritySession();
  if (!isAuthed) {
    redirect('/authority/login');
  }

  const { ticket } = await params;
  const cleanTicket = ticket.toUpperCase().trim();
  const supabase = getServiceSupabase();

  // Fetch report
  const { data: report, error } = await supabase
    .from('reports')
    .select(`
      id,
      ticket_id,
      category,
      title,
      summary,
      user_text,
      lat,
      lng,
      address,
      status,
      media_path,
      media_type,
      factor_scores,
      ai_used,
      ai_confidence,
      needs_human_review,
      report_count,
      is_seed,
      created_at,
      sla_due_at,
      resolved_at,
      departments (
        id,
        name,
        slug
      )
    `)
    .eq('ticket_id', cleanTicket)
    .single();

  if (error || !report) {
    notFound();
  }

  // Fetch dispatch log and resolutions
  const [dispatchRes, resolutionRes, eventsRes] = await Promise.all([
    supabase
      .from('dispatches')
      .select('id, to_email, subject, body, simulated, provider_message_id, error, created_at')
      .eq('report_id', report.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('resolutions')
      .select('id, after_path, same_location, issue_resolved, confidence, reason, ai_verdict, human_override, note, created_at')
      .eq('report_id', report.id)
      .maybeSingle(),
    supabase
      .from('status_events')
      .select('id, status, actor, note, created_at')
      .eq('report_id', report.id)
      .order('created_at', { ascending: true }),
  ]);

  const now = new Date();
  const severity = calculateSeverity({
    factors: report.factor_scores,
    reportCount: report.report_count,
    createdAt: report.created_at,
    resolvedAt: report.resolved_at,
    now,
  });

  const dispatches = dispatchRes.data || [];
  const resolution = resolutionRes.data;
  const events = eventsRes.data || [];
  const deptInfo = Array.isArray(report.departments) ? report.departments[0] : report.departments;

  const isResolved = report.status === 'resolved';

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/95 sticky top-0 z-30 shadow-md">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/authority"
            className="flex items-center gap-2 text-slate-400 hover:text-white text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Authority Queue</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-sm text-white">{report.ticket_id}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700/50">
              Staff Console
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 flex-1 w-full space-y-6">
        {/* Ticket Header Card */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 sm:p-8 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-700 pb-6 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ticket</span>
                <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                  {report.status.replace('_', ' ')}
                </span>
                {report.needs_human_review && (
                  <span className="text-[11px] font-semibold bg-amber-950 text-amber-300 border border-amber-700 px-2 py-0.5 rounded flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Needs Human Review
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{report.ticket_id}</h1>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Submitted on {new Date(report.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
              </p>
            </div>

            <div className="flex flex-col items-end gap-1.5">
              <div className="flex items-center gap-2">
                <span
                  style={{ backgroundColor: PRIORITY_COLORS[severity.priority] }}
                  className="text-white text-base font-extrabold px-3 py-1 rounded shadow-xs"
                >
                  {severity.priority}
                </span>
                <span className="text-2xl font-extrabold text-white">{severity.score}/100</span>
              </div>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                SLA: {severity.slaHours} hours
              </span>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-4 mb-6">
            <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-700/80">
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wider block mb-1">
                AI Incident Classification & Summary
              </span>
              <h3 className="text-base font-bold text-white mb-1">{report.title}</h3>
              <p className="text-xs text-slate-300 leading-relaxed">{report.summary}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-700/80">
                <span className="text-slate-400 block mb-0.5">Assigned Department</span>
                <span className="font-semibold text-white flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-blue-400" />
                  {deptInfo?.name || 'General Grievance Cell'}
                </span>
              </div>
              <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-700/80">
                <span className="text-slate-400 block mb-0.5">Incident Location</span>
                <span className="font-semibold text-white flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-400" />
                  {report.address || `${report.lat.toFixed(4)}, ${report.lng.toFixed(4)}`}
                </span>
              </div>
            </div>

            {/* Original Citizen Photo Evidence */}
            {report.media_path && (
              <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-700/80">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Original Citizen Evidence Photo
                </span>
                {report.media_type === 'image' ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={mediaUrl(report.media_path) || ''}
                    alt="Citizen evidence"
                    className="max-h-64 rounded-lg border border-slate-700 object-contain mx-auto"
                  />
                ) : (
                  <audio controls src={mediaUrl(report.media_path) || ''} className="w-full" />
                )}
              </div>
            )}
          </div>

          {/* Interactive Authority Action Panel */}
          <AuthorityActionPanel
            ticketId={report.ticket_id}
            currentStatus={report.status}
            isResolved={isResolved}
            initialResolution={
              resolution
                ? {
                    id: resolution.id,
                    verdict: resolution.ai_verdict,
                    reason: resolution.reason,
                    confidence: resolution.confidence,
                    afterUrl: mediaUrl(resolution.after_path) || '',
                    humanOverride: resolution.human_override,
                    note: resolution.note,
                  }
                : null
            }
          />
        </div>

        {/* Dispatch Log (Includes Email Errors if any) */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Mail className="w-4 h-4 text-blue-400" />
            Dispatch & Automated Delivery Audit Log
          </h2>

          {dispatches.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No dispatch logs recorded for this ticket.</p>
          ) : (
            <div className="space-y-3">
              {dispatches.map((d) => (
                <div
                  key={d.id}
                  className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-700 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="font-semibold text-slate-300">
                      Dispatched to Demo Inbox ({d.simulated ? 'SIMULATED' : 'LIVE'})
                    </span>
                    <span>
                      {new Date(d.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
                    </span>
                  </div>
                  <p className="text-slate-300"><strong>Subject:</strong> {d.subject}</p>
                  {d.provider_message_id && (
                    <p className="text-slate-400 font-mono text-[11px]">
                      Provider Message ID: {d.provider_message_id}
                    </p>
                  )}
                  {d.error ? (
                    <p className="text-red-400 font-semibold pt-1">Delivery Warning/Error: {d.error}</p>
                  ) : (
                    <p className="text-emerald-400 font-semibold pt-1">✓ Delivered to sandbox demo inbox</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* History Events */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-white">Full Event Trail</h2>
          <div className="space-y-2 border-l-2 border-slate-700 pl-4 text-xs">
            {events.map((evt) => (
              <div key={evt.id} className="relative py-1">
                <span className="font-bold text-blue-400 uppercase">{evt.status}</span>
                <span className="text-slate-500 ml-2">by {evt.actor} • </span>
                <span className="text-slate-400">
                  {new Date(evt.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
                </span>
                {evt.note && <p className="text-slate-300 mt-0.5">{evt.note}</p>}
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900 py-4 text-center text-xs text-slate-500">
        CivicLens Municipal Staff Console
      </footer>
    </div>
  );
}
