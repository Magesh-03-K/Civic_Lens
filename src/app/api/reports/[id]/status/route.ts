import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkAuthoritySession } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const StatusUpdateSchema = z.object({
  status: z.enum(['in_progress']),
  note: z.string().max(300).optional(),
});

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
    const parsed = StatusUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'Invalid status update parameters.', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { status, note } = parsed.data;
    const supabase = getServiceSupabase();

    // Find report by UUID or ticket_id
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const query = supabase.from('reports').select('id, ticket_id, status');
    const { data: report, error: findError } = isUuid
      ? await query.eq('id', id).single()
      : await query.eq('ticket_id', id.toUpperCase()).single();

    if (findError || !report) {
      return NextResponse.json({ ok: false, error: 'Report not found.' }, { status: 404 });
    }

    // Update report status
    const { error: updateError } = await supabase
      .from('reports')
      .update({ status })
      .eq('id', report.id);

    if (updateError) {
      return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
    }

    // Insert status event
    await supabase.from('status_events').insert({
      report_id: report.id,
      status,
      actor: 'authority',
      note: note?.trim() || 'Work started by municipal authority staff',
    });

    return NextResponse.json({
      ok: true,
      data: {
        ticketId: report.ticket_id,
        status,
        note,
      },
    });
  } catch (err) {
    console.error('Error updating report status:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error.' }, { status: 500 });
  }
}
