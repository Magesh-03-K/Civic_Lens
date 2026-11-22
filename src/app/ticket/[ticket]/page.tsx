import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  Clock,
  AlertTriangle,
  ArrowLeft,
  MapPin,
  Calendar,
  Building2,
  Mail,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { getServiceSupabase, mediaUrl } from '@/lib/supabase';
import { calculateSeverity, PRIORITY_COLORS } from '@/lib/severity';
import { CATEGORY_LABELS } from '@/lib/ai/schemas';
import TicketMiniMap from '@/components/TicketMiniMap';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ ticket: string }>;
}

export default async function TicketDetailPage({ params }: Props) {
  const { ticket } = await params;
  const cleanTicket = ticket.toUpperCase().trim();

  const supabase = getServiceSupabase();

  // 1. Fetch main report
  const { data: report, error } = await supabase
    .from('reports')
    .select(`
      id,
      ticket_id,
      category,
      sub_type,
      title,
      summary,
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

  // 2. Fetch media, timeline, resolution, and dispatch
  const [mediaRes, eventsRes, resolutionRes, dispatchRes] = await Promise.all([
    supabase
      .from('report_media')
      .select('id, path, media_type, is_primary, created_at')
      .eq('report_id', report.id)
      .order('is_primary', { ascending: false }),
    supabase
      .from('status_events')
      .select('id, status, actor, note, created_at')
      .eq('report_id', report.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('resolutions')
      .select('id, after_path, same_location, issue_resolved, confidence, reason, ai_verdict, human_override, note, created_at')
      .eq('report_id', report.id)
      .maybeSingle(),
    supabase
      .from('dispatches')
      .select('subject, created_at, simulated')
      .eq('report_id', report.id)
      .order('created_at', { ascending: false })
      .limit(1),
  ]);

  const now = new Date();
  const severity = calculateSeverity({
    factors: report.factor_scores,
    reportCount: report.report_count,
    createdAt: report.created_at,
    resolvedAt: report.resolved_at,
    now,
  });

  const slaDueDate = new Date(report.sla_due_at);
  const isResolved = report.status === 'resolved';
  const isSlaBreached = report.resolved_at
    ? new Date(report.resolved_at).getTime() > slaDueDate.getTime()
    : now.getTime() > slaDueDate.getTime();

  // SLA time calculations
  let slaStatusText = '';
  if (isResolved) {
    if (isSlaBreached) {
      const hoursOver = Math.round(
        (new Date(report.resolved_at!).getTime() - slaDueDate.getTime()) / 3600000
      );
      slaStatusText = `Resolved (SLA breached by ${hoursOver}h)`;
    } else {
      slaStatusText = 'Resolved within SLA';
    }
  } else {
    if (isSlaBreached) {
      const hoursOver = Math.round((now.getTime() - slaDueDate.getTime()) / 3600000);
      slaStatusText = `SLA Breached by ${hoursOver}h`;
    } else {
      const hoursLeft = Math.round((slaDueDate.getTime() - now.getTime()) / 3600000);
      slaStatusText = hoursLeft > 24
        ? `SLA Due in ${Math.round(hoursLeft / 24)} days`
        : `SLA Due in ${hoursLeft} hours`;
    }
  }

  const mediaList = mediaRes.data || [];
  const events = eventsRes.data || [];
  const resolution = resolutionRes.data;
  const dispatch = dispatchRes.data?.[0];
  const dept = Array.isArray(report.departments) ? report.departments[0] : report.departments;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm font-semibold">
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>
          <div className="flex items-center space-x-2">
            <span className="text-xl font-bold tracking-tight text-blue-700">CivicLens</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
              Tracking
            </span>
          </div>
          <Link
            href="/report"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            File Grievance
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 flex-1 w-full space-y-6">
        {/* Sample Data Banner */}
        {report.is_seed && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs flex items-center gap-2">
            <span className="font-bold uppercase tracking-wider bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded text-[10px]">
              Sample Data
            </span>
            <span>This ticket is seeded demonstration data created for the IDEA//FORGE Hackathon.</span>
          </div>
        )}

        {/* Ticket Header Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-6 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ticket ID</span>
                {report.needs_human_review && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300">
                    <AlertTriangle className="w-3 h-3" />
                    Needs Human Review
                  </span>
                )}
                {report.report_count > 1 && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full border border-blue-200">
                    <Users className="w-3 h-3" />
                    Reported by {report.report_count} citizens
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{report.ticket_id}</h1>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Submitted on {new Date(report.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
              </p>
            </div>

            {/* Priority & SLA Badges */}
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                <span
                  style={{ backgroundColor: PRIORITY_COLORS[severity.priority] }}
                  className="text-white text-base font-extrabold px-3 py-1 rounded-md shadow-xs"
                >
                  {severity.priority}
                </span>
                <span className="text-xl font-bold text-slate-800">{severity.score}/100</span>
              </div>
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
                  isSlaBreached
                    ? 'bg-red-100 text-red-800 border border-red-200'
                    : isResolved
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}
              >
                <Clock className="w-3 h-3" />
                {slaStatusText}
              </span>
            </div>
          </div>

          {/* AI Summary */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                AI Incident Triage & Summary
              </h2>
              <span className="text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-medium">
                AI-Assisted
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h3 className="text-lg font-bold text-slate-900 mb-1">{report.title}</h3>
              <p className="text-sm text-slate-700 leading-relaxed">{report.summary}</p>
            </div>
          </div>

          {/* Key Incident Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-xs text-slate-500 font-medium block">Category</span>
              <span className="text-sm font-semibold text-slate-800">
                {CATEGORY_LABELS[report.category as keyof typeof CATEGORY_LABELS] || report.category}
              </span>
            </div>
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-xs text-slate-500 font-medium block">Responsible Department</span>
              <span className="text-sm font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                <Building2 className="w-4 h-4 text-slate-500" />
                {dept?.name || 'General Grievance Cell'}
              </span>
            </div>
          </div>

          {/* Location & Mini Map */}
          <div className="space-y-2 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Geographic Coordinates
              </span>
              <span className="text-xs text-slate-500">
                {report.lat.toFixed(5)}, {report.lng.toFixed(5)}
              </span>
            </div>
            <p className="text-xs text-slate-600 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              {report.address || 'Address unlisted (coordinates confirmed)'}
            </p>
            <TicketMiniMap lat={report.lat} lng={report.lng} />
          </div>

          {/* Severity Score Breakdown */}
          <div className="mb-6">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Explainable Severity Breakdown (Formula: Sum of Weights = Score)
            </h2>
            <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
              <div className="grid grid-cols-5 bg-slate-100 p-2.5 font-semibold text-slate-600">
                <span className="col-span-2">Factor</span>
                <span className="text-center">Rating</span>
                <span className="text-center">Weight</span>
                <span className="text-right">Points</span>
              </div>
              {severity.breakdown.map((item) => (
                <div
                  key={item.key}
                  className="grid grid-cols-5 p-2.5 border-t border-slate-100 items-center text-slate-700"
                >
                  <div className="col-span-2">
                    <p className="font-semibold text-slate-900">{item.label}</p>
                    {item.reason && <p className="text-[11px] text-slate-500 italic">{item.reason}</p>}
                  </div>
                  <span className="text-center font-semibold text-slate-800">{item.raw}/10</span>
                  <span className="text-center text-slate-500">{Math.round(item.weight * 100)}%</span>
                  <span className="text-right font-extrabold text-slate-900">+{item.points}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Media Evidence Gallery */}
          <div className="mb-6">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Submitted Citizen Evidence
            </h2>
            {mediaList.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No media attachments available.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {mediaList.map((m) => {
                  const url = mediaUrl(m.path);
                  return (
                    <div
                      key={m.id}
                      className="border border-slate-200 rounded-lg p-2 bg-slate-50 flex flex-col items-center"
                    >
                      {m.media_type === 'image' ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={url || ''}
                          alt="Evidence capture"
                          className="w-full h-48 object-cover rounded-md"
                        />
                      ) : m.media_type === 'audio' ? (
                        <div className="w-full py-8 text-center space-y-2">
                          <p className="text-xs font-semibold text-slate-600">Voice Note Recording</p>
                          <audio controls src={url || ''} className="w-full max-w-xs mx-auto" />
                        </div>
                      ) : (
                        <div className="w-full py-8 text-center text-xs text-slate-500">
                          Video Recording Attachment
                        </div>
                      )}
                      <span className="text-[10px] text-slate-400 mt-2 block">
                        {m.is_primary ? 'Primary Report Evidence' : 'Merged Community Evidence'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Resolved Before & After Verification Card */}
          {isResolved && resolution && (
            <div className="border-2 border-emerald-500 bg-emerald-50/30 rounded-xl p-5 mb-6">
              <div className="flex items-center gap-2 text-emerald-800 font-bold mb-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>AI Fix Verification & Resolution Audit</span>
                <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  Verdict: {resolution.ai_verdict === 'resolved' ? 'VERIFIED RESOLVED' : 'NEEDS REVIEW'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <span className="text-xs font-semibold text-slate-500 block mb-1">Before (Original Hazard)</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={mediaUrl(report.media_path) || ''}
                    alt="Before fix"
                    className="w-full h-44 object-cover rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-500 block mb-1">After (Authority Repair)</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={mediaUrl(resolution.after_path) || ''}
                    alt="After fix"
                    className="w-full h-44 object-cover rounded-lg border border-slate-200"
                  />
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-lg border border-emerald-200 text-xs text-slate-700 space-y-1">
                <p>
                  <strong>AI Observation:</strong> {resolution.reason}
                </p>
                <p>
                  <strong>Visual Match Confidence:</strong> {Math.round(resolution.confidence * 100)}%
                </p>
                {resolution.human_override && (
                  <p className="text-amber-800 font-semibold pt-1 border-t border-slate-100">
                    Human Authority Override: {resolution.note || 'Manually confirmed resolved by municipal staff.'}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Status Timeline */}
          <div className="mb-6">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Incident Status Timeline
            </h2>
            <div className="space-y-4 pl-2 border-l-2 border-slate-200">
              {events.map((evt, idx) => (
                <div key={evt.id || idx} className="relative pl-6">
                  <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white border-2 border-blue-600 flex items-center justify-center" />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      {evt.status.replace('_', ' ')}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(evt.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
                    </span>
                  </div>
                  {evt.note && <p className="text-xs text-slate-600 mt-0.5">{evt.note}</p>}
                </div>
              ))}
            </div>
          </div>

          {/* Simulated Dispatch Transparency Box */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800">
              <Mail className="w-4 h-4 text-blue-600" />
              <span>Simulated Municipal Dispatch Log</span>
            </div>
            {dispatch ? (
              <div className="space-y-1 text-slate-600">
                <p><strong>Subject:</strong> {dispatch.subject}</p>
                <p>
                  <strong>Dispatched:</strong>{' '}
                  {new Date(dispatch.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
                </p>
              </div>
            ) : (
              <p className="italic text-slate-500">Dispatch record pending or queued.</p>
            )}
            <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-200">
              Notice: CivicLens operates in demonstration mode for the IDEA//FORGE Hackathon.
              Alerts are sent to a monitored sandbox inbox; municipal department emails are never messaged directly.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="max-w-4xl mx-auto px-4 text-center text-xs text-slate-500 space-y-1">
          <p>CivicLens is a hackathon prototype with simulated dispatch.</p>
          <p>© OpenStreetMap contributors • IDEA//FORGE 2026</p>
        </div>
      </footer>
    </div>
  );
}
