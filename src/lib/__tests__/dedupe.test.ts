import { describe, it, expect } from 'vitest';
import { haversineDistanceMeters, getBoundingBox } from '../dedupe';

describe('Deduplication & Spatial Logic (lib/dedupe.ts)', () => {
  it('returns 0 distance for identical coordinates', () => {
    const dist = haversineDistanceMeters(9.9252, 78.1198, 9.9252, 78.1198);
    expect(dist).toBe(0);
  });

  it('computes accurate Haversine distance between known Madurai landmarks', () => {
    // Known points:
    // Meenakshi Amman Temple: 9.9195° N, 78.1193° E
    // Periyar Bus Stand: 9.9150° N, 78.1130° E
    // Expected distance is approximately 855 meters (±25m)
    const dist = haversineDistanceMeters(9.9195, 78.1193, 9.9150, 78.1130);
    expect(dist).toBeGreaterThan(830);
    expect(dist).toBeLessThan(880);
  });

  it('correctly discriminates between <=50m duplicate threshold and separated reports', () => {
    const centerLat = 9.9252;
    const centerLng = 78.1198;

    // Small offset (~30 meters north)
    // 1 deg lat is ~111,000 m, so 0.00027 deg is ~30m
    const nearLat = centerLat + 0.00027;
    const nearLng = centerLng;
    const nearDist = haversineDistanceMeters(centerLat, centerLng, nearLat, nearLng);
    expect(nearDist).toBeLessThanOrEqual(50);
    expect(nearDist).toBeGreaterThan(20);

    // Far offset (~200 meters east)
    // 0.0018 deg lng at lat ~10 deg is ~200m
    const farLat = centerLat;
    const farLng = centerLng + 0.0018;
    const farDist = haversineDistanceMeters(centerLat, centerLng, farLat, farLng);
    expect(farDist).toBeGreaterThan(150);
    expect(farDist).toBeGreaterThan(50);
  });

  it('generates a valid bounding box enclosing the search radius', () => {
    const lat = 9.9252;
    const lng = 78.1198;
    const radiusMeters = 50;

    const box = getBoundingBox(lat, lng, radiusMeters);

    expect(box.minLat).toBeLessThan(lat);
    expect(box.maxLat).toBeGreaterThan(lat);
    expect(box.minLng).toBeLessThan(lng);
    expect(box.maxLng).toBeGreaterThan(lng);

    // Verify distance from center to bounds is roughly 50m
    const latEdgeDist = haversineDistanceMeters(lat, lng, box.maxLat, lng);
    expect(latEdgeDist).toBeCloseTo(radiusMeters, -1);

    const lngEdgeDist = haversineDistanceMeters(lat, lng, lat, box.maxLng);
    expect(lngEdgeDist).toBeCloseTo(radiusMeters, -1);
  });
});
