import { customAlphabet } from 'nanoid';
import { FactorScores } from './ai/schemas';

export type Priority = 'P1' | 'P2' | 'P3' | 'P4';

export const SLA_HOURS: Record<Priority, number> = {
  P1: 24,
  P2: 72,
  P3: 168,
  P4: 336,
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  P1: '#b91c1c', // red-700
  P2: '#ea580c', // orange-600
  P3: '#ca8a04', // yellow-600
  P4: '#15803d', // green-700
};

// Ticket ID format: CL-XXXXXX using nanoid custom alphabet
const nanoidTicket = customAlphabet('23456789ABCDEFGHJKMNPQRSTUVWXYZ', 6);

export function generateTicketId(): string {
  return `CL-${nanoidTicket()}`;
}

export interface SeverityBreakdownItem {
  key: string;
  label: string;
  raw: number; // 0-10
  weight: number; // Decimal weight summing to 1.0
  points: number; // points contributed towards 100
  reason?: string;
}

export interface SeverityInputs {
  factors: FactorScores;
  reportCount?: number;
  createdAt: Date | string;
  resolvedAt?: Date | string | null;
  now?: Date;
}

export interface SeverityResult {
  score: number; // 0 - 100
  priority: Priority;
  slaHours: number;
  breakdown: SeverityBreakdownItem[];
  communityFactor: number;
  ageFactor: number;
  daysOpen: number;
}

/**
 * Computes transparent severity score (0–100) and priority band (P1–P4).
 * Formula:
 * - Community factor: min(10, 2.5 * (reportCount - 1))
 * - Age factor: min(10, 10 * daysOpen / 14)
 * - Weights:
 *     Safety Risk: 35%
 *     Population Impact: 25%
 *     Urgency / Spread: 15%
 *     Sensitive Location: 10%
 *     Community Signal: 10%
 *     Age of Open Ticket: 5%
 * - Score: round(10 * sum(weight * factor))
 */
export function calculateSeverity(inputs: SeverityInputs): SeverityResult {
  const { factors, reportCount = 1, createdAt, resolvedAt, now = new Date() } = inputs;

  const createdTime = new Date(createdAt).getTime();
  const endTime = resolvedAt ? new Date(resolvedAt).getTime() : now.getTime();
  const diffMs = Math.max(0, endTime - createdTime);
  const daysOpen = diffMs / (1000 * 60 * 60 * 24);

  // Dynamic factors
  const communityFactor = Math.min(10, Math.max(0, 2.5 * (reportCount - 1)));
  const ageFactor = Math.min(10, Math.max(0, (10 * daysOpen) / 14));

  const safety = factors.safety_risk ?? 0;
  const population = factors.population_impact ?? 0;
  const urgency = factors.urgency_spread ?? 0;
  const location = factors.sensitive_location ?? 0;

  const reasons = factors.reasons || {};

  const breakdown: SeverityBreakdownItem[] = [
    {
      key: 'safety_risk',
      label: 'Safety Risk',
      raw: safety,
      weight: 0.35,
      points: Math.round(10 * 0.35 * safety * 10) / 10,
      reason: reasons.safety_risk,
    },
    {
      key: 'population_impact',
      label: 'Population Impact',
      raw: population,
      weight: 0.25,
      points: Math.round(10 * 0.25 * population * 10) / 10,
      reason: reasons.population_impact,
    },
    {
      key: 'urgency_spread',
      label: 'Urgency & Spread',
      raw: urgency,
      weight: 0.15,
      points: Math.round(10 * 0.15 * urgency * 10) / 10,
      reason: reasons.urgency_spread,
    },
    {
      key: 'sensitive_location',
      label: 'Sensitive Location',
      raw: location,
      weight: 0.10,
      points: Math.round(10 * 0.10 * location * 10) / 10,
      reason: reasons.sensitive_location,
    },
    {
      key: 'community',
      label: 'Community Signal',
      raw: Math.round(communityFactor * 10) / 10,
      weight: 0.10,
      points: Math.round(10 * 0.10 * communityFactor * 10) / 10,
      reason: `${reportCount} report${reportCount === 1 ? '' : 's'} recorded`,
    },
    {
      key: 'age',
      label: 'Age of Open Ticket',
      raw: Math.round(ageFactor * 10) / 10,
      weight: 0.05,
      points: Math.round(10 * 0.05 * ageFactor * 10) / 10,
      reason: `${daysOpen.toFixed(1)} days open`,
    },
  ];

  const rawWeightedSum =
    0.35 * safety +
    0.25 * population +
    0.15 * urgency +
    0.10 * location +
    0.10 * communityFactor +
    0.05 * ageFactor;

  const score = Math.min(100, Math.max(0, Math.round(10 * rawWeightedSum)));

  let priority: Priority;
  if (score >= 80) {
    priority = 'P1';
  } else if (score >= 60) {
    priority = 'P2';
  } else if (score >= 40) {
    priority = 'P3';
  } else {
    priority = 'P4';
  }

  return {
    score,
    priority,
    slaHours: SLA_HOURS[priority],
    breakdown,
    communityFactor,
    ageFactor,
    daysOpen,
  };
}

/**
 * Calculates initial SLA due date based on creation time and priority.
 */
export function calculateSlaDueAt(createdAt: Date | string, priority: Priority): Date {
  const createdDate = new Date(createdAt);
  const hours = SLA_HOURS[priority];
  return new Date(createdDate.getTime() + hours * 60 * 60 * 1000);
}

/**
 * On merge, if the priority increases, set SLA due date to the earlier
 * of the old value and created_at plus the new SLA.
 */
export function updateSlaDueAtOnMerge(
  oldSlaDueAt: Date | string,
  createdAt: Date | string,
  newPriority: Priority
): Date {
  const oldDate = new Date(oldSlaDueAt);
  const newDate = calculateSlaDueAt(createdAt, newPriority);
  return newDate.getTime() < oldDate.getTime() ? newDate : oldDate;
}
