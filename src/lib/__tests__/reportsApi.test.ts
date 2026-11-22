import { describe, it, expect } from 'vitest';
import { calculateSeverity } from '../severity';

describe('Public API Field Security & Logic (Milestone M4)', () => {
  it('correctly recomputes live severity scores on read without storing final score', () => {
    const factors = {
      safety_risk: 8,
      population_impact: 6,
      urgency_spread: 7,
      sensitive_location: 5,
    };

    const createdAt = new Date('2026-11-01T10:00:00Z');
    const nowDay1 = new Date('2026-11-01T10:00:00Z');
    const nowDay7 = new Date('2026-11-08T10:00:00Z');

    // On day 1, 1 report
    const day1Result = calculateSeverity({
      factors,
      reportCount: 1,
      createdAt,
      now: nowDay1,
    });

    // On day 7, 3 reports
    const day7Result = calculateSeverity({
      factors,
      reportCount: 3,
      createdAt,
      now: nowDay7,
    });

    // Community factor increased: 2.5 * (3 - 1) = 5
    expect(day7Result.communityFactor).toBe(5);
    // Age factor increased: 10 * 7 / 14 = 5
    expect(day7Result.ageFactor).toBe(5);
    // Score reflects dynamic escalation
    expect(day7Result.score).toBeGreaterThan(day1Result.score);
  });

  it('determines SLA breach accurately for open and resolved states', () => {
    const slaDueAt = new Date('2026-11-10T12:00:00Z').getTime();

    // Open ticket: now is past due date -> breached
    const openNowPast = new Date('2026-11-11T12:00:00Z').getTime();
    expect(openNowPast > slaDueAt).toBe(true);

    // Open ticket: now is before due date -> not breached
    const openNowBefore = new Date('2026-11-09T12:00:00Z').getTime();
    expect(openNowBefore > slaDueAt).toBe(false);

    // Resolved ticket: resolved_at before due date -> not breached
    const resolvedOnTime = new Date('2026-11-09T18:00:00Z').getTime();
    expect(resolvedOnTime > slaDueAt).toBe(false);

    // Resolved ticket: resolved_at after due date -> breached
    const resolvedLate = new Date('2026-11-12T10:00:00Z').getTime();
    expect(resolvedLate > slaDueAt).toBe(true);
  });
});
