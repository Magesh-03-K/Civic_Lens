import { SupabaseClient } from '@supabase/supabase-js';
import { calculateSeverity, updateSlaDueAtOnMerge } from './severity';
import { FactorScores } from './ai/schemas';

/**
 * Haversine distance in meters between two lat/lng coordinates.
 * Earth radius R = 6,371,000 meters.
 */
export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculates a bounding box around a point for spatial SQL prefiltering.
 * Bounding box is approximately deltaLat ~ radiusMeters / 111,000 deg,
 * with deltaLng scaled by cos(lat).
 */
export function getBoundingBox(lat: number, lng: number, radiusMeters = 50) {
  const latDelta = radiusMeters / 111000;
  const rad = (lat * Math.PI) / 180;
  const cosLat = Math.max(0.1, Math.cos(rad));
  const lngDelta = radiusMeters / (111000 * cosLat);

  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  };
}

export interface ExistingReportCandidate {
  id: string;
  ticket_id: string;
  category: string;
  lat: number;
  lng: number;
  report_count: number;
  factor_scores: FactorScores;
  created_at: string;
  sla_due_at: string;
  status: string;
}

export interface DedupeMatchResult {
  match: ExistingReportCandidate;
  distanceMeters: number;
}

/**
 * Finds the nearest open ticket (status != 'resolved', created within 30 days)
 * with the identical category within 50 meters.
 */
export async function findNearbyDuplicate(
  supabase: SupabaseClient,
  category: string,
  lat: number,
  lng: number,
  maxDistanceMeters = 50
): Promise<DedupeMatchResult | null> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const box = getBoundingBox(lat, lng, maxDistanceMeters);

  const { data, error } = await supabase
    .from('reports')
    .select('id, ticket_id, category, lat, lng, report_count, factor_scores, created_at, sla_due_at, status')
    .eq('category', category)
    .neq('status', 'resolved')
    .gte('created_at', thirtyDaysAgo)
    .gte('lat', box.minLat)
    .lte('lat', box.maxLat)
    .gte('lng', box.minLng)
    .lte('lng', box.maxLng);

  if (error || !data || data.length === 0) {
    return null;
  }

  let closest: ExistingReportCandidate | null = null;
  let minDistance = Infinity;

  for (const report of data as ExistingReportCandidate[]) {
    const dist = haversineDistanceMeters(lat, lng, report.lat, report.lng);
    if (dist <= maxDistanceMeters && dist < minDistance) {
      minDistance = dist;
      closest = report;
    }
  }

  if (!closest) {
    return null;
  }

  return {
    match: closest,
    distanceMeters: minDistance,
  };
}

export interface MergeReportParams {
  supabase: SupabaseClient;
  existingReport: ExistingReportCandidate;
  mediaPath?: string | null;
  mediaType?: 'image' | 'video' | 'audio' | null;
}

/**
 * Merges a newly submitted report into an existing nearby ticket:
 * 1. Increments report_count
 * 2. Adds report_media entry if media provided
 * 3. Adds status_events entry
 * 4. Recalculates live severity and updates sla_due_at if priority elevated
 */
export async function mergeReportIntoTicket(params: MergeReportParams) {
  const { supabase, existingReport, mediaPath, mediaType } = params;

  const newReportCount = (existingReport.report_count || 1) + 1;

  // Recalculate severity with increased community weight
  const newSeverity = calculateSeverity({
    factors: existingReport.factor_scores,
    reportCount: newReportCount,
    createdAt: existingReport.created_at,
  });

  const updatedSlaDueAt = updateSlaDueAtOnMerge(
    existingReport.sla_due_at,
    existingReport.created_at,
    newSeverity.priority
  );

  // Update report in database
  const { error: updateError } = await supabase
    .from('reports')
    .update({
      report_count: newReportCount,
      sla_due_at: updatedSlaDueAt.toISOString(),
    })
    .eq('id', existingReport.id);

  if (updateError) {
    throw new Error(`Failed to update merged report: ${updateError.message}`);
  }

  // Insert media row if media was uploaded
  if (mediaPath && mediaType) {
    await supabase.from('report_media').insert({
      report_id: existingReport.id,
      path: mediaPath,
      media_type: mediaType,
      is_primary: false,
    });
  }

  // Insert status event
  await supabase.from('status_events').insert({
    report_id: existingReport.id,
    status: existingReport.status,
    actor: 'citizen',
    note: `Another report merged, now ${newReportCount} reports`,
  });

  return {
    merged: true,
    ticketId: existingReport.ticket_id,
    reportCount: newReportCount,
    priority: newSeverity.priority,
    score: newSeverity.score,
    breakdown: newSeverity.breakdown,
  };
}
