import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServiceSupabase, mediaUrl } from '@/lib/supabase';
import { checkRateLimit } from '@/lib/ratelimit';
import { analyzeCivicMedia } from '@/lib/ai/analyze';
import { findNearbyDuplicate, mergeReportIntoTicket } from '@/lib/dedupe';
import { reverseGeocode } from '@/lib/geocode';
import { getDepartmentForCategory } from '@/lib/routing';
import {
  calculateSeverity,
  calculateSlaDueAt,
  generateTicketId,
} from '@/lib/severity';
import { sendSimulatedDispatchEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const CreateReportSchema = z.object({
  mediaPath: z.string().min(1).regex(/^reports\//, 'Invalid media path prefix'),
  mediaType: z.enum(['image', 'video', 'audio']),
  lat: z.number().min(6.0, 'Latitude must be within India (6°–36°)').max(36.0),
  lng: z.number().min(68.0, 'Longitude must be within India (68°–98°)').max(98.0),
  accuracy: z.number().optional(),
  userText: z.string().max(500, 'User description exceeds 500 characters').optional(),
  categoryHint: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const supabase = getServiceSupabase();
  const bucket = process.env.SUPABASE_BUCKET || 'civic-media';

  try {
    // 1. Rate limiting check (5 submissions per 10 minutes per IP)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    const rateLimit = checkRateLimit(ip, 'submit');

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: `Too many submissions from this connection. Please wait ${rateLimit.retryAfterSeconds} seconds before submitting again.`,
        },
        { status: 429 }
      );
    }

    // 2. Validate request body
    const body = await req.json();
    const parsed = CreateReportSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Validation failed for report submission.',
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const { mediaPath, mediaType, lat, lng, userText, categoryHint } = parsed.data;

    // 3. Confirm the object exists in Supabase Storage and fetch its data
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from(bucket)
      .download(mediaPath);

    if (downloadError || !fileBlob) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Uploaded media could not be located in storage. Please re-upload.',
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await fileBlob.arrayBuffer();
    const mediaBuffer = Buffer.from(arrayBuffer);
    const mimeType = fileBlob.type || (mediaType === 'image' ? 'image/jpeg' : 'audio/wav');

    // 4. Multimodal AI Analysis (with automatic fallback resilience)
    const analysis = await analyzeCivicMedia({
      mediaBuffer,
      mimeType,
      mediaType,
      userText,
      categoryHint,
    });

    // 5. Reject if AI determined this is not a civic issue
    if (!analysis.is_civic_issue) {
      // Clean up rejected media object from storage bucket
      await supabase.storage.from(bucket).remove([mediaPath]);

      return NextResponse.json(
        {
          ok: false,
          error:
            analysis.rejection_reason ||
            'The uploaded image or recording does not appear to show a public civic infrastructure problem or hazard.',
        },
        { status: 422 }
      );
    }

    const publicSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    // 6. Deduplication check: Search for open ticket with same category within 50m
    const duplicateMatch = await findNearbyDuplicate(
      supabase,
      analysis.category,
      lat,
      lng,
      50
    );

    if (duplicateMatch) {
      const mergedResult = await mergeReportIntoTicket({
        supabase,
        existingReport: duplicateMatch.match,
        mediaPath,
        mediaType,
      });

      const trackingUrl = `${publicSiteUrl}/ticket/${mergedResult.ticketId}`;

      return NextResponse.json({
        ok: true,
        data: {
          ticketId: mergedResult.ticketId,
          merged: true,
          reportCount: mergedResult.reportCount,
          priority: mergedResult.priority,
          score: mergedResult.score,
          breakdown: mergedResult.breakdown,
          category: analysis.category,
          title: duplicateMatch.match.ticket_id,
          summary: `Merged with nearby open grievance (${duplicateMatch.distanceMeters.toFixed(0)}m away).`,
          department: 'Assigned Department',
          needsHumanReview: analysis.needs_human_review,
          trackingUrl,
        },
      });
    }

    // 7. Process new ticket
    const [address, dept] = await Promise.all([
      reverseGeocode(lat, lng),
      getDepartmentForCategory(supabase, analysis.category),
    ]);

    const ticketId = generateTicketId();
    const now = new Date();

    const severity = calculateSeverity({
      factors: analysis.factors,
      reportCount: 1,
      createdAt: now,
      now,
    });

    const slaDueAt = calculateSlaDueAt(now, severity.priority);

    // Insert into reports table
    const { data: newReport, error: insertError } = await supabase
      .from('reports')
      .insert({
        ticket_id: ticketId,
        category: analysis.category,
        sub_type: analysis.sub_type || null,
        title: analysis.title,
        summary: analysis.summary,
        user_text: userText?.trim() || null,
        lat,
        lng,
        address,
        media_path: mediaPath,
        media_type: mediaType,
        factor_scores: analysis.factors,
        ai_used: analysis.ai_used,
        ai_confidence: analysis.confidence,
        needs_human_review: analysis.needs_human_review,
        status: 'submitted',
        department_id: dept.id,
        report_count: 1,
        is_seed: false,
        created_at: now.toISOString(),
        sla_due_at: slaDueAt.toISOString(),
      })
      .select('id')
      .single();

    if (insertError || !newReport) {
      throw new Error(`Failed to save report to database: ${insertError?.message}`);
    }

    const reportId = newReport.id;

    // Insert media record
    await supabase.from('report_media').insert({
      report_id: reportId,
      path: mediaPath,
      media_type: mediaType,
      is_primary: true,
    });

    // Insert initial status event
    await supabase.from('status_events').insert({
      report_id: reportId,
      status: 'submitted',
      actor: 'citizen',
      note: 'Report submitted by citizen',
    });

    // Update status to 'routed'
    await supabase
      .from('reports')
      .update({ status: 'routed' })
      .eq('id', reportId);

    // Insert routed status event
    await supabase.from('status_events').insert({
      report_id: reportId,
      status: 'routed',
      actor: 'system',
      note: `Triage complete. Routed to ${dept.name}`,
    });

    const trackingUrl = `${publicSiteUrl}/ticket/${ticketId}`;
    const mediaPublicUrl = mediaUrl(mediaPath);

    // Send simulated dispatch email to demo inbox
    const emailResult = await sendSimulatedDispatchEmail({
      ticketId,
      departmentName: dept.name,
      category: analysis.category,
      title: analysis.title,
      summary: analysis.summary,
      priority: severity.priority,
      score: severity.score,
      breakdown: severity.breakdown,
      address,
      lat,
      lng,
      mediaUrl: mediaPublicUrl,
      slaDueAt: slaDueAt.toISOString(),
      trackingUrl,
    });

    // Record dispatch in dispatches table
    await supabase.from('dispatches').insert({
      report_id: reportId,
      department_id: dept.id,
      to_email: dept.email,
      subject: `[CivicLens ${ticketId}] ${severity.priority} – ${analysis.title}`,
      body: analysis.summary,
      simulated: true,
      provider_message_id: emailResult.messageId || null,
      error: emailResult.error || null,
    });

    return NextResponse.json({
      ok: true,
      data: {
        ticketId,
        merged: false,
        reportCount: 1,
        priority: severity.priority,
        score: severity.score,
        breakdown: severity.breakdown,
        category: analysis.category,
        title: analysis.title,
        summary: analysis.summary,
        department: dept.name,
        needsHumanReview: analysis.needs_human_review,
        trackingUrl,
      },
    });
  } catch (error) {
    console.error('Fatal error in POST /api/reports:', error);
    return NextResponse.json(
      {
        ok: false,
        error: 'An unexpected error occurred while processing the report. Please try again.',
      },
      { status: 500 }
    );
  }
}
