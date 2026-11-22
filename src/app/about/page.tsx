import Link from 'next/link';
import {
  ShieldCheck,
  Cpu,
  Lock,
  Layers,
  ArrowRight,
  ExternalLink,
  Info,
} from 'lucide-react';

export const metadata = {
  title: 'About CivicLens – Methodology, Severity Formula & Credits',
  description: 'How CivicLens transparent civic triage, multimodal AI scoring, and automated routing work for Madurai.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold tracking-tight text-blue-700">CivicLens</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
              Prototype
            </span>
          </Link>
          <nav className="flex items-center space-x-4 text-sm font-medium text-slate-600">
            <Link href="/" className="hover:text-blue-700">Home</Link>
            <Link href="/report" className="hover:text-blue-700">Report</Link>
            <Link href="/dashboard" className="hover:text-blue-700">Dashboard</Link>
            <Link href="/about" className="text-blue-700 font-semibold">About</Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-10 flex-1 w-full space-y-12">
        {/* Hero */}
        <section className="space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <Info className="w-3.5 h-3.5" />
            Transparent Civic Infrastructure Triage
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            How CivicLens Works
          </h1>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            CivicLens replaces slow, opaque civic complaint portals with an explainable, 
            multimodal triage engine. By analyzing photos and voice notes directly, the system 
            categorizes civic hazards, computes objective severity scores, prevents duplicate 
            complaint backlog, and verifies repairs before closing tickets.
          </p>
        </section>

        {/* Section 1: End-to-End Triage Flow */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs space-y-6">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-600" />
            End-to-End Triage Workflow
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <span className="font-bold text-blue-800 text-xs uppercase tracking-wider block">1. Citizen Submission</span>
              <p className="text-slate-600">
                Citizens submit a photo or audio recording (Tamil/English) with their device’s GPS location. 
                EXIF GPS metadata is stripped client-side in an HTML5 canvas before storage to protect user privacy.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <span className="font-bold text-blue-800 text-xs uppercase tracking-wider block">2. Multimodal AI Analysis</span>
              <p className="text-slate-600">
                Google Gemini 2.5 Flash inspects evidence to detect civic defects across 10 categories, 
                evaluating four core impact factors (0–10): safety risk, population exposure, urgency, and location sensitivity.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <span className="font-bold text-blue-800 text-xs uppercase tracking-wider block">3. 50-Meter Deduplication</span>
              <p className="text-slate-600">
                To prevent flood spam and double-dispatching, open reports within 50 meters in the same category 
                are automatically merged. Each duplicate submission increases the community signal factor.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <span className="font-bold text-blue-800 text-xs uppercase tracking-wider block">4. Closed-Loop AI Verification</span>
              <p className="text-slate-600">
                When maintenance teams finish repair work, they upload an &quot;After&quot; photo. Gemini verifies whether 
                the physical issue is genuinely resolved at the same location before marking the ticket as resolved.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: Severity Formula & Priority Bands */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs space-y-6">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-600" />
            The 0–100 Severity Formula
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Unlike black-box municipal scoring algorithms, CivicLens calculates ticket severity 
            using a deterministic, open-formula weighted sum. Every factor score and reason is 
            publicly visible on each ticket’s tracking page:
          </p>

          <div className="p-4 bg-slate-900 rounded-lg text-slate-100 font-mono text-xs sm:text-sm overflow-x-auto leading-relaxed border border-slate-800">
            <code>
              Score = 10 × ( 0.35 × SafetyRisk + 0.25 × PopulationImpact + 0.15 × UrgencySpread + 0.10 × SensitiveLocation + 0.10 × CommunitySignal + 0.05 × AgeFactor )
            </code>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50">
                  <th className="py-2.5 px-3">Factor</th>
                  <th className="py-2.5 px-3">Weight</th>
                  <th className="py-2.5 px-3">Range</th>
                  <th className="py-2.5 px-3">Evaluation Criteria</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">Safety Risk</td>
                  <td className="py-2.5 px-3 font-mono text-blue-700 font-bold">35%</td>
                  <td className="py-2.5 px-3">0 – 10</td>
                  <td className="py-2.5 px-3">Risk of vehicle collision, pedestrian injury, electrocution, or disease outbreak.</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">Population Impact</td>
                  <td className="py-2.5 px-3 font-mono text-blue-700 font-bold">25%</td>
                  <td className="py-2.5 px-3">0 – 10</td>
                  <td className="py-2.5 px-3">Density of foot traffic, arterial roadway volume, or residential density affected.</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">Urgency & Spread</td>
                  <td className="py-2.5 px-3 font-mono text-blue-700 font-bold">15%</td>
                  <td className="py-2.5 px-3">0 – 10</td>
                  <td className="py-2.5 px-3">Rate at which the defect escalates (e.g. running pipe burst vs. stagnant debris).</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">Location Sensitivity</td>
                  <td className="py-2.5 px-3 font-mono text-blue-700 font-bold">10%</td>
                  <td className="py-2.5 px-3">0 – 10</td>
                  <td className="py-2.5 px-3">Proximity to schools, hospitals, transit terminals (e.g. Periyar Bus Stand), or pilgrimage centers.</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">Community Signal</td>
                  <td className="py-2.5 px-3 font-mono text-blue-700 font-bold">10%</td>
                  <td className="py-2.5 px-3">0 – 10</td>
                  <td className="py-2.5 px-3">Calculated from duplicate citizen reports: min(10, 1 + 2 × (count - 1)).</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">Age of Open Ticket</td>
                  <td className="py-2.5 px-3 font-mono text-blue-700 font-bold">5%</td>
                  <td className="py-2.5 px-3">0 – 10</td>
                  <td className="py-2.5 px-3">Decay multiplier preventing neglected tickets from rotting: min(10, daysOpen × 1.5).</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-base font-bold text-slate-900 pt-2">Priority Bands & Service Level Agreements (SLAs)</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-950 space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider block text-red-800">P1 Critical</span>
              <p className="text-lg font-extrabold text-red-700">Score 80–100</p>
              <p className="text-xs font-semibold">24-Hour SLA</p>
              <p className="text-[11px] text-red-800">Severe danger to human life or major arterial transit gridlock.</p>
            </div>
            <div className="p-3 rounded-lg border border-orange-200 bg-orange-50 text-orange-950 space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider block text-orange-800">P2 High</span>
              <p className="text-lg font-extrabold text-orange-700">Score 60–79</p>
              <p className="text-xs font-semibold">72-Hour SLA</p>
              <p className="text-[11px] text-orange-800">Substantial disruption, health risks, or major water line bursts.</p>
            </div>
            <div className="p-3 rounded-lg border border-yellow-200 bg-yellow-50 text-yellow-950 space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider block text-yellow-800">P3 Medium</span>
              <p className="text-lg font-extrabold text-yellow-700">Score 40–59</p>
              <p className="text-xs font-semibold">7-Day SLA</p>
              <p className="text-[11px] text-yellow-800">Moderate civic defects, street lighting failures, or localized trash.</p>
            </div>
            <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-950 space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider block text-emerald-800">P4 Low</span>
              <p className="text-lg font-extrabold text-emerald-700">Score 0–39</p>
              <p className="text-xs font-semibold">14-Day SLA</p>
              <p className="text-[11px] text-emerald-800">Minor cosmetic or non-hazardous maintenance requests.</p>
            </div>
          </div>
        </section>

        {/* Section 3: Limitations & Transparency */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs space-y-4">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            Honest Limitations & Prototype Disclosures
          </h2>
          <div className="space-y-3 text-sm text-slate-600">
            <div className="flex items-start gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 shrink-0" />
              <p>
                <strong>AI Output is AI-Assisted:</strong> Machine learning vision models may hallucinate, 
                misinterpret complex scenes, or rate severity incorrectly. All AI outputs are explicitly labelled 
                &quot;AI-Assisted&quot;, and confidence scores below threshold automatically trigger a human review flag.
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 shrink-0" />
              <p>
                <strong>Simulated Dispatch:</strong> For safety and compliance during this hackathon demonstration, 
                automated department email notifications are routed strictly to an isolated demo inbox (<code className="bg-slate-100 px-1 py-0.5 rounded text-xs">DEMO_INBOX_EMAIL</code>) 
                rather than live municipal staff inboxes.
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 shrink-0" />
              <p>
                <strong>Sample Seed Data:</strong> Demonstration complaints across Madurai are explicitly flagged 
                with <span className="font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded text-xs">Sample</span> badges 
                and watermarked media to keep demo records transparently distinguishable from genuine user submissions.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: Privacy by Design */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs space-y-4">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Lock className="w-5 h-5 text-blue-600" />
            Privacy by Design
          </h2>
          <ul className="space-y-2.5 text-sm text-slate-600 list-disc list-inside">
            <li>
              <strong>No Citizen PII:</strong> No names, phone numbers, email addresses, or government identification numbers are collected or stored.
            </li>
            <li>
              <strong>Client-Side EXIF Stripping:</strong> Before camera photos leave the citizen’s browser, they are redrawn onto an HTML5 canvas and re-encoded as JPEG, stripping all EXIF GPS and device metadata.
            </li>
            <li>
              <strong>Safe Public APIs:</strong> Raw user text is stored only in the server-side database and is never exposed through public read endpoints. Public views show only the objective, AI-standardized incident summary.
            </li>
          </ul>
        </section>

        {/* Section 5: Technology Stack & Credits */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs space-y-4">
          <h2 className="text-xl font-bold text-slate-900">
            Technology Stack &amp; Credits
          </h2>
          <p className="text-sm text-slate-600">
            CivicLens is built with modern web and AI infrastructure for the IDEA//FORGE Online Hackathon:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
            <div className="p-3 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">Google Gemini 2.5 Flash</p>
                <p className="text-slate-500 text-xs">Multimodal visual &amp; audio AI triage</p>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400" />
            </div>
            <div className="p-3 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">Supabase &amp; PostgreSQL</p>
                <p className="text-slate-500 text-xs">Database with RLS &amp; media storage</p>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400" />
            </div>
            <div className="p-3 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">Next.js 16 &amp; React 19</p>
                <p className="text-slate-500 text-xs">App Router, Turbopack &amp; Server Actions</p>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400" />
            </div>
            <div className="p-3 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">Leaflet &amp; OpenStreetMap</p>
                <p className="text-slate-500 text-xs">Interactive mapping &amp; spatial pinning</p>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400" />
            </div>
            <div className="p-3 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">Recharts</p>
                <p className="text-slate-500 text-xs">Public municipal compliance analytics</p>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400" />
            </div>
            <div className="p-3 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">Resend</p>
                <p className="text-slate-500 text-xs">Simulated department dispatch delivery</p>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400" />
            </div>
            <div className="p-3 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">Vercel</p>
                <p className="text-slate-500 text-xs">Edge hosting pinned to Mumbai (bom1)</p>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400" />
            </div>
            <div className="p-3 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">Google Antigravity</p>
                <p className="text-slate-500 text-xs">Agentic system &amp; full-stack architecture</p>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400" />
            </div>
          </div>
        </section>

        {/* Back to Home / Report */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200">
          <Link
            href="/"
            className="text-sm font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1.5"
          >
            &larr; Back to Home
          </Link>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link
              href="/dashboard"
              className="px-4 py-2 text-sm font-bold border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 transition w-full sm:w-auto text-center"
            >
              Explore Dashboard
            </Link>
            <Link
              href="/report"
              className="px-4 py-2 text-sm font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition inline-flex items-center justify-center gap-1.5 w-full sm:w-auto text-center"
            >
              Report an Issue <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="max-w-4xl mx-auto px-4 text-center text-xs text-slate-500 space-y-1">
          <p>CivicLens is a hackathon prototype with simulated dispatch.</p>
          <p>© OpenStreetMap contributors • IDEA//FORGE 2026</p>
        </div>
      </footer>
    </div>
  );
}
