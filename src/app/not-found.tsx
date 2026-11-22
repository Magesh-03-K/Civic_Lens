import Link from 'next/link';
import { AlertCircle, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12 text-center text-slate-800">
      <div className="max-w-md w-full bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="w-14 h-14 mx-auto rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900">Ticket Not Found</h1>
        <p className="text-sm text-slate-600">
          The civic grievance ticket you requested does not exist or may have been removed.
          Please check the ticket identifier (e.g. <span className="font-mono font-semibold">CL-XXXXXX</span>) and try again.
        </p>

        <div className="pt-4 flex flex-col sm:flex-row gap-2 justify-center">
          <Link
            href="/report"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition"
          >
            File New Report
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition"
          >
            <Home className="w-4 h-4" />
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}
