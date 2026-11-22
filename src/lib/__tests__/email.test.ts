import { describe, it, expect } from 'vitest';
import { sendSimulatedDispatchEmail } from '../email';

describe('Simulated Dispatch Email (lib/email.ts)', () => {
  it('returns simulated true and graceful error when keys are missing or unconfigured', async () => {
    const originalApiKey = process.env.RESEND_API_KEY;
    const originalDemoInbox = process.env.DEMO_INBOX_EMAIL;

    delete process.env.RESEND_API_KEY;
    delete process.env.DEMO_INBOX_EMAIL;

    const result = await sendSimulatedDispatchEmail({
      ticketId: 'CL-TEST01',
      departmentName: 'Madurai Corporation – Roads & Engineering',
      category: 'pothole_damaged_road',
      title: 'Pothole on Main Road',
      summary: 'Deep pothole observed.',
      priority: 'P1',
      score: 85,
      breakdown: [],
      address: 'Simmakkal, Madurai',
      lat: 9.926,
      lng: 78.12,
      mediaUrl: null,
      slaDueAt: new Date().toISOString(),
      trackingUrl: 'http://localhost:3000/ticket/CL-TEST01',
    });

    expect(result.simulated).toBe(true);
    expect(result.success).toBe(false);
    expect(result.error).toContain('not configured');

    if (originalApiKey) process.env.RESEND_API_KEY = originalApiKey;
    if (originalDemoInbox) process.env.DEMO_INBOX_EMAIL = originalDemoInbox;
  });
});
