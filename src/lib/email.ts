import 'server-only';
import { Resend } from 'resend';
import { SeverityBreakdownItem, Priority } from './severity';

export interface DispatchEmailPayload {
  ticketId: string;
  departmentName: string;
  category: string;
  title: string;
  summary: string;
  priority: Priority;
  score: number;
  breakdown: SeverityBreakdownItem[];
  address: string | null;
  lat: number;
  lng: number;
  mediaUrl: string | null;
  slaDueAt: string;
  trackingUrl: string;
}

export interface DispatchEmailResult {
  simulated: boolean;
  success: boolean;
  messageId?: string;
  error?: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Sends a simulated civic grievance dispatch email via Resend to the demo inbox.
 * Strictly sends ONLY to DEMO_INBOX_EMAIL, never to real department emails.
 */
export async function sendSimulatedDispatchEmail(
  payload: DispatchEmailPayload
): Promise<DispatchEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const demoInbox = process.env.DEMO_INBOX_EMAIL;

  if (!apiKey || !demoInbox) {
    return {
      simulated: true,
      success: false,
      error: 'RESEND_API_KEY or DEMO_INBOX_EMAIL not configured.',
    };
  }

  const resend = new Resend(apiKey);
  const subject = `[CivicLens ${payload.ticketId}] ${payload.priority} – ${payload.title}`;
  const osmMapUrl = `https://www.openstreetmap.org/?mlat=${payload.lat}&mlon=${payload.lng}#map=18/${payload.lat}/${payload.lng}`;

  const breakdownRows = payload.breakdown
    .map(
      (b) =>
        `<tr>
          <td style="padding: 4px 8px; border: 1px solid #e2e8f0;">${escapeHtml(b.label)}</td>
          <td style="padding: 4px 8px; border: 1px solid #e2e8f0; text-align: center;">${b.raw}/10</td>
          <td style="padding: 4px 8px; border: 1px solid #e2e8f0; text-align: center;">${Math.round(b.weight * 100)}%</td>
          <td style="padding: 4px 8px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold;">+${b.points}</td>
        </tr>`
    )
    .join('');

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.5;">
      <div style="background-color: #1e40af; color: #ffffff; padding: 16px 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 20px; font-weight: 700;">CivicLens Grievance Dispatch Alert</h1>
        <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.9;">Simulated Dispatch Prototype</p>
      </div>

      <div style="padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; background: #ffffff;">
        <div style="margin-bottom: 16px; padding: 12px; background: #f8fafc; border-left: 4px solid #1e40af; border-radius: 4px;">
          <p style="margin: 0; font-size: 13px; color: #64748b;">Assigned Department</p>
          <p style="margin: 2px 0 0; font-size: 16px; font-weight: 600;">${escapeHtml(payload.departmentName)}</p>
        </div>

        <h2 style="font-size: 18px; margin: 0 0 8px 0;">${escapeHtml(payload.title)}</h2>
        <p style="font-size: 14px; color: #475569; margin: 0 0 16px;">${escapeHtml(payload.summary)}</p>

        <div style="display: flex; gap: 12px; margin-bottom: 16px;">
          <div style="background: #f1f5f9; padding: 8px 12px; border-radius: 6px;">
            <span style="font-size: 11px; color: #64748b; display: block;">TICKET ID</span>
            <span style="font-size: 15px; font-weight: 700; color: #0f172a;">${escapeHtml(payload.ticketId)}</span>
          </div>
          <div style="background: #fef2f2; padding: 8px 12px; border-radius: 6px;">
            <span style="font-size: 11px; color: #991b1b; display: block;">PRIORITY</span>
            <span style="font-size: 15px; font-weight: 700; color: #b91c1c;">${payload.priority} (${payload.score}/100)</span>
          </div>
          <div style="background: #f1f5f9; padding: 8px 12px; border-radius: 6px;">
            <span style="font-size: 11px; color: #64748b; display: block;">SLA DUE</span>
            <span style="font-size: 13px; font-weight: 600;">${new Date(payload.slaDueAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</span>
          </div>
        </div>

        <h3 style="font-size: 14px; font-weight: 600; margin: 16px 0 8px;">Severity Score Breakdown</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px;">
          <thead>
            <tr style="background: #f8fafc;">
              <th style="padding: 6px 8px; border: 1px solid #e2e8f0; text-align: left;">Factor</th>
              <th style="padding: 6px 8px; border: 1px solid #e2e8f0; text-align: center;">Rating</th>
              <th style="padding: 6px 8px; border: 1px solid #e2e8f0; text-align: center;">Weight</th>
              <th style="padding: 6px 8px; border: 1px solid #e2e8f0; text-align: right;">Points</th>
            </tr>
          </thead>
          <tbody>
            ${breakdownRows}
          </tbody>
        </table>

        <div style="margin-bottom: 16px; font-size: 13px;">
          <p style="margin: 4px 0;"><strong>Location:</strong> ${escapeHtml(payload.address || `${payload.lat.toFixed(5)}, ${payload.lng.toFixed(5)}`)}</p>
          <p style="margin: 4px 0;"><a href="${osmMapUrl}" target="_blank" style="color: #2563eb; text-decoration: underline;">View on OpenStreetMap</a></p>
          ${payload.mediaUrl ? `<p style="margin: 4px 0;"><a href="${payload.mediaUrl}" target="_blank" style="color: #2563eb; text-decoration: underline;">View Uploaded Evidence Media</a></p>` : ''}
        </div>

        <div style="text-align: center; margin: 24px 0 16px;">
          <a href="${payload.trackingUrl}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px; padding: 10px 20px; border-radius: 6px;">Track Ticket on CivicLens</a>
        </div>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />

        <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">
          This is a simulated grievance dispatch generated by CivicLens for the IDEA//FORGE Hackathon. No real municipal teams were paged.
        </p>
      </div>
    </div>
  `;

  try {
    const response = await resend.emails.send({
      from: 'CivicLens <onboarding@resend.dev>',
      to: demoInbox,
      subject,
      html,
    });

    if (response.error) {
      return {
        simulated: true,
        success: false,
        error: response.error.message,
      };
    }

    return {
      simulated: true,
      success: true,
      messageId: response.data?.id,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn('Simulated dispatch email delivery error:', errorMsg);
    return {
      simulated: true,
      success: false,
      error: errorMsg,
    };
  }
}
