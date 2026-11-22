import { describe, it, expect } from 'vitest';
import {
  calculateSeverity,
  calculateSlaDueAt,
  updateSlaDueAtOnMerge,
  generateTicketId,
} from '../severity';

describe('Severity Engine (lib/severity.ts)', () => {
  it('gives 85 and P1 when all four AI factors are 10, with 1 report and 0 age', () => {
    const now = new Date('2026-11-22T12:00:00Z');
    const result = calculateSeverity({
      factors: {
        safety_risk: 10,
        population_impact: 10,
        urgency_spread: 10,
        sensitive_location: 10,
      },
      reportCount: 1,
      createdAt: now,
      now,
    });

    // safety (3.5) + population (2.5) + urgency (1.5) + location (1.0) = 8.5 * 10 = 85
    expect(result.score).toBe(85);
    expect(result.priority).toBe('P1');
    expect(result.communityFactor).toBe(0);
    expect(result.ageFactor).toBe(0);
  });

  it('gives 0 and P4 when all factors are 0', () => {
    const now = new Date('2026-11-22T12:00:00Z');
    const result = calculateSeverity({
      factors: {
        safety_risk: 0,
        population_impact: 0,
        urgency_spread: 0,
        sensitive_location: 0,
      },
      reportCount: 1,
      createdAt: now,
      now,
    });

    expect(result.score).toBe(0);
    expect(result.priority).toBe('P4');
    expect(result.breakdown).toHaveLength(6);
  });

  it('caps community factor at 10 for 5 or more reports', () => {
    const now = new Date('2026-11-22T12:00:00Z');
    // community = min(10, 2.5 * (5 - 1)) = 10
    const result5 = calculateSeverity({
      factors: {
        safety_risk: 0,
        population_impact: 0,
        urgency_spread: 0,
        sensitive_location: 0,
      },
      reportCount: 5,
      createdAt: now,
      now,
    });
    expect(result5.communityFactor).toBe(10);
    expect(result5.score).toBe(10); // 10 * (0.10 * 10) = 10

    const result10 = calculateSeverity({
      factors: {
        safety_risk: 0,
        population_impact: 0,
        urgency_spread: 0,
        sensitive_location: 0,
      },
      reportCount: 10,
      createdAt: now,
      now,
    });
    expect(result10.communityFactor).toBe(10);
  });

  it('verifies score and priority boundaries (79/80, 59/60, 39/40)', () => {
    const now = new Date('2026-11-22T12:00:00Z');

    // 80 gives P1, 79 gives P2
    // With factors: safety=9, pop=10, urg=10, loc=9, community=0, age=0
    // sum = 0.35*9 (3.15) + 0.25*10 (2.5) + 0.15*10 (1.5) + 0.10*9 (0.9) = 8.05 -> score 81 (P1)
    // Adjust slightly to test boundary precision
    const testScore = (factors: {
      safety_risk: number;
      population_impact: number;
      urgency_spread: number;
      sensitive_location: number;
    }) =>
      calculateSeverity({
        factors,
        reportCount: 1,
        createdAt: now,
        now,
      });

    // Score ~ 80 -> P1
    const p1Boundary = testScore({
      safety_risk: 9,
      population_impact: 9,
      urgency_spread: 10,
      sensitive_location: 10,
    });
    // 0.35*9 + 0.25*9 + 0.15*10 + 0.10*10 = 3.15 + 2.25 + 1.5 + 1.0 = 7.9 -> round(79) = 79 (P2)
    expect(p1Boundary.score).toBe(79);
    expect(p1Boundary.priority).toBe('P2');

    const p1Success = testScore({
      safety_risk: 9,
      population_impact: 10,
      urgency_spread: 10,
      sensitive_location: 9,
    });
    // 0.35*9 + 0.25*10 + 0.15*10 + 0.10*9 = 3.15 + 2.5 + 1.5 + 0.9 = 8.05 -> round(81) (P1)
    expect(p1Success.score).toBe(81);
    expect(p1Success.priority).toBe('P1');

    // Score ~ 60 -> P2, 59 -> P3
    // 0.35*6 (2.1) + 0.25*7 (1.75) + 0.15*7 (1.05) + 0.10*10 (1.0) = 5.9 -> 59 (P3)
    const p2Boundary = testScore({
      safety_risk: 6,
      population_impact: 7,
      urgency_spread: 7,
      sensitive_location: 10,
    });
    expect(p2Boundary.score).toBe(59);
    expect(p2Boundary.priority).toBe('P3');

    // 0.35*6 (2.1) + 0.25*8 (2.0) + 0.15*6 (0.9) + 0.10*10 (1.0) = 6.0 -> 60 (P2)
    const p2Exact = testScore({
      safety_risk: 6,
      population_impact: 8,
      urgency_spread: 6,
      sensitive_location: 10,
    });
    expect(p2Exact.score).toBe(60);
    expect(p2Exact.priority).toBe('P2');

    // Score ~ 40 -> P3, 39 -> P4
    // 0.35*4 (1.4) + 0.25*5 (1.25) + 0.15*4 (0.6) + 0.10*7 (0.7) = 3.95 -> 40 (P3)
    const p3Exact = testScore({
      safety_risk: 4,
      population_impact: 5,
      urgency_spread: 4,
      sensitive_location: 7,
    });
    expect(p3Exact.score).toBe(40);
    expect(p3Exact.priority).toBe('P3');

    // 0.35*4 (1.4) + 0.25*5 (1.25) + 0.15*4 (0.6) + 0.10*6 (0.6) = 3.85 -> 39 (P4)
    const p4Boundary = testScore({
      safety_risk: 4,
      population_impact: 5,
      urgency_spread: 4,
      sensitive_location: 6,
    });
    expect(p4Boundary.score).toBe(39);
    expect(p4Boundary.priority).toBe('P4');
  });

  it('caps age factor at 10 for tickets open 14 days or longer', () => {
    const createdAt = new Date('2026-11-01T12:00:00Z');
    const now14Days = new Date('2026-11-15T12:00:00Z');
    const now30Days = new Date('2026-12-01T12:00:00Z');

    const result14 = calculateSeverity({
      factors: {
        safety_risk: 0,
        population_impact: 0,
        urgency_spread: 0,
        sensitive_location: 0,
      },
      createdAt,
      now: now14Days,
    });
    expect(result14.ageFactor).toBe(10);
    expect(result14.daysOpen).toBe(14);

    const result30 = calculateSeverity({
      factors: {
        safety_risk: 0,
        population_impact: 0,
        urgency_spread: 0,
        sensitive_location: 0,
      },
      createdAt,
      now: now30Days,
    });
    expect(result30.ageFactor).toBe(10);
    expect(result30.daysOpen).toBe(30);
  });

  it('freezes age on resolved tickets using resolvedAt', () => {
    const createdAt = new Date('2026-11-01T12:00:00Z');
    const resolvedAt = new Date('2026-11-08T12:00:00Z'); // 7 days open
    const currentNow = new Date('2026-11-25T12:00:00Z'); // 24 days later

    const result = calculateSeverity({
      factors: {
        safety_risk: 5,
        population_impact: 5,
        urgency_spread: 5,
        sensitive_location: 5,
      },
      createdAt,
      resolvedAt,
      now: currentNow,
    });

    expect(result.daysOpen).toBe(7);
    expect(result.ageFactor).toBe(5); // 10 * 7 / 14 = 5
  });

  it('calculates correct SLA due dates based on priority', () => {
    const created = new Date('2026-11-22T10:00:00Z');

    const slaP1 = calculateSlaDueAt(created, 'P1');
    expect((slaP1.getTime() - created.getTime()) / (1000 * 3600)).toBe(24);

    const slaP2 = calculateSlaDueAt(created, 'P2');
    expect((slaP2.getTime() - created.getTime()) / (1000 * 3600)).toBe(72);

    const slaP3 = calculateSlaDueAt(created, 'P3');
    expect((slaP3.getTime() - created.getTime()) / (1000 * 3600)).toBe(168);

    const slaP4 = calculateSlaDueAt(created, 'P4');
    expect((slaP4.getTime() - created.getTime()) / (1000 * 3600)).toBe(336);
  });

  it('updates SLA on merge to earlier due date when priority escalates', () => {
    const created = new Date('2026-11-20T10:00:00Z');
    const oldSla = calculateSlaDueAt(created, 'P3'); // +168 hours

    // Merged report raises ticket to P1 (+24 hours from created)
    const updatedSla = updateSlaDueAtOnMerge(oldSla, created, 'P1');
    expect(updatedSla.getTime()).toBeLessThan(oldSla.getTime());
    expect(updatedSla.getTime()).toBe(created.getTime() + 24 * 3600 * 1000);

    // If new SLA is somehow later, it preserves the earlier old SLA
    const retainedSla = updateSlaDueAtOnMerge(updatedSla, created, 'P4');
    expect(retainedSla.getTime()).toBe(updatedSla.getTime());
  });

  it('generates ticket IDs adhering to CL-[2-9A-HJ-NP-Z]{6}', () => {
    const pattern = /^CL-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/;
    for (let i = 0; i < 50; i++) {
      const id = generateTicketId();
      expect(id).toMatch(pattern);
      expect(id.length).toBe(9);
    }
  });
});
