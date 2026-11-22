import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase, mediaUrl } from '@/lib/supabase';
import { calculateSeverity } from '@/lib/severity';
import { FactorScores } from '@/lib/ai/schemas';

export const dynamic = 'force-dynamic';

interface DepartmentJoin {
  id: number;
  slug: string;
  name: string;
}

interface MediaRow {
  id: string;
  path: string;
  media_type: string;
  is_primary: boolean;
  created_at: string;
}

interface StatusEventRow {
  id: string;
  status: string;
  actor: string;
  note: string | null;
  created_at: string;
}

interface ResolutionRow {
  id: string;
  after_path: string;
  same_location: boolean;
  issue_resolved: boolean;
  confidence: number;
  reason: string;
  ai_verdict: string;
  human_override: boolean;
  note: string | null;
  created_at: string;
}

interface DispatchRow {
  subject: string;
  created_at: string;
  simulated: boolean;
}

interface FullReportRow {
  id: string;
  ticket_id: string;
  category: string;
  sub_type: string | null;
  title: string;
  summary: string;
  lat: number;
  lng: number;
  address: string | null;
  status: string;
  media_path: string | null;
  media_type: string | null;
  factor_scores: FactorScores;
  ai_used: boolean;
  ai_confidence: number | null;
  needs_human_review: boolean;
  report_count: number;
  is_seed: boolean;
  created_at: string;
  sla_due_at: string;
  resolved_at: string | null;
  departments?: DepartmentJoin | null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticket: string }> }
) {
  try {
    const { ticket } = await params;
    const cleanTicketId = ticket.toUpperCase().trim();

    const supabase = getServiceSupabase();

    // 1. Fetch main report record
    const { data: reportData, error: reportError } = await supabase
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
          slug,
          name
        )
      `)
      .eq('ticket_id', cleanTicketId)
      .single();

    if (reportError || !reportData) {
      return NextResponse.json(
        { ok: false, error: `Ticket "${cleanTicketId}" was not found.` },
        { status: 404 }
      );
    }

    const report = reportData as unknown as FullReportRow;
    const reportId = report.id;

    // 2. Concurrently fetch media, timeline, resolution, and public dispatch info
    const [mediaRes, eventsRes, resolutionRes, dispatchRes] = await Promise.all([
      supabase
        .from('report_media')
        .select('id, path, media_type, is_primary, created_at')
        .eq('report_id', reportId)
        .order('is_primary', { ascending: false }),
      supabase
        .from('status_events')
        .select('id, status, actor, note, created_at')
        .eq('report_id', reportId)
        .order('created_at', { ascending: true }),
      supabase
        .from('resolutions')
        .select('id, after_path, same_location, issue_resolved, confidence, reason, ai_verdict, human_override, note, created_at')
        .eq('report_id', reportId)
        .maybeSingle(),
      supabase
        .from('dispatches')
        .select('subject, created_at, simulated')
        .eq('report_id', reportId)
        .order('created_at', { ascending: false })
        .limit(1),
    ]);

    const now = new Date();
    const liveSeverity = calculateSeverity({
      factors: report.factor_scores,
      reportCount: report.report_count,
      createdAt: report.created_at,
      resolvedAt: report.resolved_at,
      now,
    });

    const slaDueDate = new Date(report.sla_due_at);
    const slaBreached = report.resolved_at
      ? new Date(report.resolved_at).getTime() > slaDueDate.getTime()
      : now.getTime() > slaDueDate.getTime();

    const mediaList = ((mediaRes.data as MediaRow[]) || []).map((m) => ({
      id: m.id,
      url: mediaUrl(m.path),
      mediaType: m.media_type,
      isPrimary: m.is_primary,
      createdAt: m.created_at,
    }));

    const timeline = (eventsRes.data as StatusEventRow[]) || [];
    const resolution = resolutionRes.data as ResolutionRow | null;
    const dispatch = (dispatchRes.data as DispatchRow[] | null)?.[0] || null;

    return NextResponse.json({
      ok: true,
      data: {
        ticketId: report.ticket_id,
        category: report.category,
        subType: report.sub_type,
        title: report.title,
        summary: report.summary,
        lat: report.lat,
        lng: report.lng,
        address: report.address,
        status: report.status,
        priority: liveSeverity.priority,
        score: liveSeverity.score,
        breakdown: liveSeverity.breakdown,
        slaHours: liveSeverity.slaHours,
        reportCount: report.report_count,
        aiUsed: report.ai_used,
        aiConfidence: report.ai_confidence,
        needsHumanReview: report.needs_human_review,
        isSeed: report.is_seed,
        createdAt: report.created_at,
        slaDueAt: report.sla_due_at,
        resolvedAt: report.resolved_at,
        slaBreached,
        departmentName: report.departments?.name || 'Madurai Grievance Cell',
        media: mediaList,
        timeline,
        resolution: resolution
          ? {
              ...resolution,
              afterUrl: mediaUrl(resolution.after_path),
            }
          : null,
        dispatch: dispatch
          ? {
              subject: dispatch.subject,
              createdAt: dispatch.created_at,
              simulated: dispatch.simulated,
            }
          : null,
      },
    });
  } catch (err) {
    console.error('Error fetching ticket detail:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error.' }, { status: 500 });
  }
}
