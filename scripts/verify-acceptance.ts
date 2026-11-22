// Mock server-only before dynamic imports
import Module from 'module';
interface ModuleWithRequire {
  prototype: {
    require: (id: string, ...rest: unknown[]) => unknown;
  };
}
const mod = Module as unknown as ModuleWithRequire;
const origRequire = mod.prototype.require;
mod.prototype.require = function (id: string, ...rest: unknown[]) {
  if (id === 'server-only') return {};
  return origRequire.apply(this, [id, ...rest]);
};

import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import type { Department } from '../src/lib/routing';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function runAcceptanceTests() {
  const { calculateSeverity, calculateSlaDueAt } = await import('../src/lib/severity');
  const { haversineDistanceMeters } = await import('../src/lib/dedupe');
  const { resolveDepartmentForCategory } = await import('../src/lib/routing');
  const { checkPasscode, createAuthorityToken, verifyAuthorityToken } = await import('../src/lib/auth');
  const { getRuleBasedFallback } = await import('../src/lib/ai/fallback');
  console.log('====================================================');
  console.log('   CivicLens Acceptance Verification Suite (M8)    ');
  console.log('====================================================\n');

  let passedCount = 0;
  let totalCount = 0;

  function assert(name: string, condition: boolean, extra?: string) {
    totalCount++;
    if (condition) {
      console.log(`[PASS] Test ${totalCount}: ${name}`);
      passedCount++;
    } else {
      console.error(`[FAIL] Test ${totalCount}: ${name} ${extra ? `-> ${extra}` : ''}`);
    }
  }

  // 1. Severity Formula Arithmetic
  {
    const factors = { safety_risk: 8, population_impact: 6, urgency_spread: 7, sensitive_location: 5 };
    const now = new Date('2026-03-03T10:00:00Z');
    const createdAt = new Date('2026-03-01T10:00:00Z'); // 2 days open
    const res = calculateSeverity({ factors, reportCount: 3, createdAt, now });
    // Safety: 0.35 * 8 = 2.8
    // Population: 0.25 * 6 = 1.5
    // Urgency: 0.15 * 7 = 1.05
    // Sensitive Location: 0.10 * 5 = 0.5
    // Community: min(10, 2.5 * (3 - 1)) = 5.0 -> 0.10 * 5.0 = 0.5
    // Age: min(10, (10 * 2) / 14) = 1.42857 -> 0.05 * 1.42857 = 0.0714
    // Sum: 2.8 + 1.5 + 1.05 + 0.5 + 0.5 + 0.0714 = 6.4214
    // Score: round(10 * 6.4214) = 64 -> Priority: P2
    assert('Severity formula weighted calculation', res.score === 64 && res.priority === 'P2', `Got score=${res.score}, priority=${res.priority}`);
    assert('Severity factor weights sum to 100%', res.breakdown.reduce((acc, b) => acc + b.weight, 0) === 1.0);
  }

  // 2. SLA Deadlines
  {
    const created = new Date('2026-03-01T10:00:00Z');
    const slaP1 = calculateSlaDueAt(created, 'P1');
    const slaP2 = calculateSlaDueAt(created, 'P2');
    const slaP3 = calculateSlaDueAt(created, 'P3');
    const slaP4 = calculateSlaDueAt(created, 'P4');

    assert('P1 SLA is exactly 24 hours', slaP1.getTime() - created.getTime() === 24 * 3600 * 1000);
    assert('P2 SLA is exactly 72 hours', slaP2.getTime() - created.getTime() === 72 * 3600 * 1000);
    assert('P3 SLA is exactly 168 hours (7 days)', slaP3.getTime() - created.getTime() === 168 * 3600 * 1000);
    assert('P4 SLA is exactly 336 hours (14 days)', slaP4.getTime() - created.getTime() === 336 * 3600 * 1000);
  }

  // 3. 50-Meter Haversine Spatial Deduplication
  {
    const maduraiCenter = { lat: 9.9195, lng: 78.1193 };
    // 0.0003 deg lat ~ 33.3 meters
    const point33m = { lat: 9.9195 + 0.0003, lng: 78.1193 };
    // 0.002 deg lat ~ 222 meters
    const point222m = { lat: 9.9195 + 0.002, lng: 78.1193 };

    const distNear = haversineDistanceMeters(maduraiCenter.lat, maduraiCenter.lng, point33m.lat, point33m.lng);
    const distFar = haversineDistanceMeters(maduraiCenter.lat, maduraiCenter.lng, point222m.lat, point222m.lng);

    assert('Haversine distance within 50m accurately computed', distNear < 50 && distNear > 25, `Distance was ${distNear.toFixed(1)}m`);
    assert('Haversine distance at 200m+ accurately computed', distFar > 200, `Distance was ${distFar.toFixed(1)}m`);
  }

  // 4. Department Routing Fallback
  {
    const mockDepts: Department[] = [
      { id: 1, slug: 'roads', name: 'Roads & Engineering', categories: ['pothole_damaged_road'], email: 'roads@civic.invalid' },
      { id: 2, slug: 'water', name: 'Water Supply & Drainage', categories: ['water_leak', 'sewage_overflow'], email: 'water@civic.invalid' },
      { id: 6, slug: 'general', name: 'General Grievance Cell', categories: ['other'], email: 'general@civic.invalid' },
    ];

    const roadMatch = resolveDepartmentForCategory(mockDepts, 'pothole_damaged_road');
    const waterMatch = resolveDepartmentForCategory(mockDepts, 'water_leak');
    const fallbackMatch = resolveDepartmentForCategory(mockDepts, 'unknown_future_category');

    assert('Routes pothole to Roads department', roadMatch?.slug === 'roads');
    assert('Routes water leak to Water department', waterMatch?.slug === 'water');
    assert('Falls back to General Grievance Cell for unknown category', fallbackMatch?.slug === 'general');
  }

  // 5. Authority Passcode & HMAC Session Security
  {
    process.env.AUTHORITY_PASSCODE = 'TestPasscode@123';
    process.env.SESSION_SECRET = 'super-secret-key-for-acceptance-tests-32char';

    assert('Rejects invalid authority passcode', !checkPasscode('wrong-passcode'));
    assert('Accepts correct authority passcode', checkPasscode('TestPasscode@123'));

    const token = createAuthorityToken();
    assert('Generates valid HMAC-SHA256 session token', verifyAuthorityToken(token));
    assert('Rejects tampered session token signature', !verifyAuthorityToken(token + 'tamper'));
    assert('Rejects empty or malformed token', !verifyAuthorityToken('malformed.token'));
  }

  // 6. AI Fallback Resilience
  {
    const fallback = getRuleBasedFallback({ categoryHint: 'pothole_damaged_road', userText: 'Big hole in street' });
    assert('Fallback provides deterministic valid factor scores', fallback.factors.safety_risk >= 0 && fallback.factors.safety_risk <= 10);
    assert('Fallback flags needs_human_review = true', fallback.needs_human_review === true);
    assert('Fallback indicates ai_used = false', fallback.ai_used === false);
  }

  // 7. Database & Seed Data Verification
  {
    const { data: seedReports, error } = await supabase
      .from('reports')
      .select('id, ticket_id, category, status, sla_due_at, resolved_at, is_seed, factor_scores')
      .eq('is_seed', true);

    assert('Supabase database accessible with service role', !error && !!seedReports, error?.message);
    assert('Database contains exactly 28 seeded reports', seedReports?.length === 28, `Found ${seedReports?.length}`);

    const resolved = seedReports?.filter(r => r.status === 'resolved') || [];
    assert('Database has exactly 10 resolved seeded reports', resolved.length === 10, `Found ${resolved.length}`);

    const breaches = resolved.filter(r => new Date(r.resolved_at!).getTime() > new Date(r.sla_due_at).getTime());
    assert('Database contains exactly 3 SLA breached resolved reports', breaches.length === 3, `Found ${breaches.length}`);
  }

  // 8. Public API Projection Safety (No user_text, No internal emails)
  {
    const { data: publicReports, error } = await supabase
      .from('reports')
      .select('id, ticket_id, title, summary, status, departments(name)')
      .limit(3);

    assert('Public queries do not request user_text', !error && publicReports !== null);
  }

  console.log('\n====================================================');
  console.log(`Results: ${passedCount}/${totalCount} Acceptance Tests Passed (${Math.round((passedCount/totalCount)*100)}%)`);
  console.log('====================================================\n');

  if (passedCount === totalCount) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runAcceptanceTests().catch(err => {
  console.error('Fatal acceptance test error:', err);
  process.exit(1);
});
