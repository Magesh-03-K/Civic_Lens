import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xl font-bold tracking-tight text-blue-700">CivicLens</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
              M0 Setup
            </span>
          </div>
          <nav className="flex items-center space-x-4 text-sm font-medium text-slate-600">
            <Link href="/" className="text-blue-700 font-semibold">Home</Link>
            <Link href="/report" className="hover:text-blue-700">Report</Link>
            <Link href="/dashboard" className="hover:text-blue-700">Dashboard</Link>
            <Link href="/about" className="hover:text-blue-700">About</Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-12 flex-1 w-full">
        <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 mb-6">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            Hackathon Prototype — Milestone M0 Initialized
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mb-4">
            Transparent Civic Grievance & Infrastructure Triage
          </h1>
          <p className="text-base sm:text-lg text-slate-600 mb-8 max-w-2xl leading-relaxed">
            CivicLens automates incident triage with multimodal AI, explainable severity scoring,
            smart deduplication, and verified resolution tracking for Indian cities.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Status</p>
              <p className="text-sm font-semibold text-slate-800 mt-1">M0 Complete</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Health Endpoint</p>
              <Link href="/api/health" className="text-sm font-semibold text-blue-600 hover:underline mt-1 block">
                /api/health
              </Link>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Dispatch System</p>
              <p className="text-sm font-semibold text-slate-800 mt-1">Simulated Dispatch</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="max-w-5xl mx-auto px-4 text-center text-xs text-slate-500 space-y-1">
          <p>CivicLens is a hackathon prototype with simulated dispatch.</p>
          <p>© OpenStreetMap contributors • IDEA//FORGE 2026</p>
        </div>
      </footer>
    </div>
  );
}
