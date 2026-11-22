'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled runtime error caught in root boundary:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12 text-center text-slate-800">
      <div className="max-w-md w-full bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="w-14 h-14 mx-auto rounded-full bg-red-50 text-red-600 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Application Error</h1>
        <p className="text-sm text-slate-600">
          An unexpected problem occurred while processing this page.
          No personal data or sensitive credentials were exposed.
        </p>

        <div className="pt-4 flex flex-col sm:flex-row gap-2 justify-center">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
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
