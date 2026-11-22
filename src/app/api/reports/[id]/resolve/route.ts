import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkAuthoritySession } from '@/lib/auth';
import { getServiceSupabase, mediaUrl } from '@/lib/supabase';
import { verifyCivicFix } from '@/lib/ai/verify';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const ResolveSchema = z.union([
  z.object({
    afterPath: z.string().min(1),
    note: z.string().optional(),
    override: z.literal(false).optional(),
    resolutionId: z.string().optional(),
  }),
  z.object({
    resolutionId: z.string().min(1, 'resolutionId is required for override'),
    override: z.literal(true),
    note: z.string().min(1, 'Reason note is required for manual override'),
  }),
]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAuthed = await checkAuthoritySession();
    if (!isAuthed) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized. Authority session required.' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = ResolveSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'Invalid resolve payload.', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();
    const bucket = process.env.SUPABASE_BUCKET || 'civic-media';

    // Find report by UUID or ticket_id
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const query = supabase.from('reports').select('id, ticket_id, media_path, media_type, status');
    const { data: report, error: findError } = isUuid
      ? await query.eq('id', id).single()
      : await query.eq('ticket_id', id.toUpperCase()).single();

    if (findError || !report) {
      return NextResponse.json({ ok: false, error: 'Report not found.' }, { status: 404 });
    }

    const payload = parsed.data;

    // Case 2: Human Override Call
    if (payload.override) {
      const now = new Date();

      // Update resolution record
      const { error: resUpdateErr } = await supabase
        .from('resolutions')
        .update({
          human_override: true,
          note: payload.note,
        })
        .eq('id', payload.resolutionId);

      if (resUpdateErr) {
        return NextResponse.json({ ok: false, error: resUpdateErr.message }, { status: 500 });
      }

      // Mark report resolved
      await supabase
        .from('reports')
        .update({
          status: 'resolved',
          resolved_at: now.toISOString(),
        })
        .eq('id', report.id);

      // Add status event
      await supabase.from('status_events').insert({
        report_id: report.id,
        status: 'resolved',
        actor: 'authority',
        note: `Resolved via manual staff override: "${payload.note}"`,
      });

      return NextResponse.json({
        ok: true,
        data: {
          resolved: true,
          humanOverride: true,
          ticketId: report.ticket_id,
        },
      });
    }

    // Case 1: Initial After Photo Upload & AI Verification
    const { afterPath, note } = payload;

    // Download before image and after image from Supabase
    if (!report.media_path) {
      return NextResponse.json(
        { ok: false, error: 'Original report has no media attachment to compare.' },
        { status: 400 }
      );
    }

    const [beforeRes, afterRes] = await Promise.all([
      supabase.storage.from(bucket).download(report.media_path),
      supabase.storage.from(bucket).download(afterPath),
    ]);

    if (beforeRes.error || !beforeRes.data || afterRes.error || !afterRes.data) {
      return NextResponse.json(
        { ok: false, error: 'Failed to retrieve media images for verification.' },
        { status: 400 }
      );
    }

    const beforeBuffer = Buffer.from(await beforeRes.data.arrayBuffer());
    const afterBuffer = Buffer.from(await afterRes.data.arrayBuffer());

    // Run AI Fix Verification
    const verification = await verifyCivicFix({
      beforeBuffer,
      beforeMimeType: beforeRes.data.type || 'image/jpeg',
      afterBuffer,
      afterMimeType: afterRes.data.type || 'image/jpeg',
      isBeforeImage: report.media_type === 'image',
    });

    const isResolvedVerdict = verification.ai_verdict === 'resolved';

    // Store in resolutions table
    const { data: resolutionRow, error: insertResError } = await supabase
      .from('resolutions')
      .insert({
        report_id: report.id,
        after_path: afterPath,
        same_location: verification.same_location,
        issue_resolved: verification.issue_resolved,
        confidence: verification.confidence,
        reason: verification.reason,
        ai_verdict: verification.ai_verdict,
        human_override: false,
        note: note?.trim() || null,
      })
      .select('id')
      .single();

    if (insertResError || !resolutionRow) {
      return NextResponse.json(
        { ok: false, error: 'Failed to record verification result.' },
        { status: 500 }
      );
    }

    const resolutionId = resolutionRow.id;

    if (isResolvedVerdict) {
      const now = new Date();
      await supabase
        .from('reports')
        .update({
          status: 'resolved',
          resolved_at: now.toISOString(),
        })
        .eq('id', report.id);

      await supabase.from('status_events').insert({
        report_id: report.id,
        status: 'resolved',
        actor: 'authority',
        note: `Resolved: ${verification.reason}`,
      });

      return NextResponse.json({
        ok: true,
        data: {
          resolved: true,
          verdict: 'resolved',
          resolutionId,
          confidence: verification.confidence,
          reason: verification.reason,
          afterUrl: mediaUrl(afterPath),
        },
      });
    }

    // Needs manual review / override
    return NextResponse.json({
      ok: true,
      data: {
        resolved: false,
        verdict: 'needs_review',
        resolutionId,
        confidence: verification.confidence,
        reason: verification.reason,
        afterUrl: mediaUrl(afterPath),
      },
    });
  } catch (err) {
    console.error('Error during grievance resolution:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error.' }, { status: 500 });
  }
}
