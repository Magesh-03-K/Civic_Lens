'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Play,
  CheckCircle2,
  AlertTriangle,
  Upload,
  RefreshCw,
  ShieldAlert,
  Camera,
} from 'lucide-react';
import { uploadMediaDirect } from '@/lib/client/upload';

interface InitialResolution {
  id: string;
  verdict: string;
  reason: string;
  confidence: number;
  afterUrl: string;
  humanOverride: boolean;
  note: string | null;
}

interface AuthorityActionPanelProps {
  ticketId: string;
  currentStatus: string;
  isResolved: boolean;
  initialResolution: InitialResolution | null;
}

export default function AuthorityActionPanel({
  ticketId,
  currentStatus,
  isResolved: initialIsResolved,
  initialResolution,
}: AuthorityActionPanelProps) {
  const router = useRouter();

  // Status transition state
  const [status, setStatus] = useState(currentStatus);
  const [isResolved, setIsResolved] = useState(initialIsResolved);
  const [inProgressNote, setInProgressNote] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Resolution workflow state
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [afterPreview, setAfterPreview] = useState<string | null>(null);
  const [verifyingFix, setVerifyingFix] = useState(false);
  const [verifyStatusText, setVerifyStatusText] = useState('');
  const [resolutionData, setResolutionData] = useState<InitialResolution | null>(initialResolution);
  const [overrideNote, setOverrideNote] = useState('');
  const [applyingOverride, setApplyingOverride] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // 1. Mark in progress
  const handleMarkInProgress = async () => {
    setActionError(null);
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/reports/${ticketId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'in_progress',
          note: inProgressNote.trim() || 'Work started on site by municipal maintenance team.',
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Failed to update status.');
      }

      setStatus('in_progress');
      router.refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Status update failed.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // 2. Select After Photo
  const handleAfterFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAfterFile(file);
      setAfterPreview(URL.createObjectURL(file));
      setActionError(null);
    }
  };

  // 3. Upload After Photo and Run AI Verification
  const handleVerifyResolution = async () => {
    if (!afterFile) {
      setActionError('Please select a repair completion photo.');
      return;
    }

    setActionError(null);
    setVerifyingFix(true);

    try {
      setVerifyStatusText('Uploading after repair photo to storage...');
      const { mediaPath, publicUrl } = await uploadMediaDirect(afterFile, 'after', afterFile.type || 'image/jpeg');

      setVerifyStatusText('AI comparing Before vs After photos for resolution verification...');
      const res = await fetch(`/api/reports/${ticketId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          afterPath: mediaPath,
          note: 'Work verified by municipal authority',
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Verification call failed.');
      }

      const resData: InitialResolution = {
        id: json.data.resolutionId,
        verdict: json.data.verdict,
        reason: json.data.reason,
        confidence: json.data.confidence,
        afterUrl: publicUrl,
        humanOverride: false,
        note: null,
      };

      setResolutionData(resData);

      if (json.data.resolved) {
        setIsResolved(true);
        setStatus('resolved');
      }

      router.refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Resolution verification failed.');
    } finally {
      setVerifyingFix(false);
      setVerifyStatusText('');
    }
  };

  // 4. Manual Override when AI flags "needs_review"
  const handleConfirmOverride = async () => {
    if (!resolutionData) return;
    if (!overrideNote.trim()) {
      setActionError('A rationale note is required to confirm manual override.');
      return;
    }

    setActionError(null);
    setApplyingOverride(true);

    try {
      const res = await fetch(`/api/reports/${ticketId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolutionId: resolutionData.id,
          override: true,
          note: overrideNote.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Override confirmation failed.');
      }

      setIsResolved(true);
      setStatus('resolved');
      setResolutionData((prev) => (prev ? { ...prev, humanOverride: true, note: overrideNote.trim() } : null));
      router.refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Override failed.');
    } finally {
      setApplyingOverride(false);
    }
  };

  return (
    <div className="border border-slate-700 bg-slate-900/80 rounded-xl p-5 space-y-5">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <span>Authority Actions & Resolution Workflow</span>
        </h3>
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 capitalize border border-slate-700">
          Status: {status.replace('_', ' ')}
        </span>
      </div>

      {actionError && (
        <div className="p-3 bg-red-950/80 border border-red-800 rounded-lg text-red-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Case A: Ticket is already marked resolved */}
      {isResolved ? (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs space-y-2">
          <p className="font-bold text-sm flex items-center gap-1.5 text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            Grievance Formally Resolved
          </p>
          <p className="text-slate-300">
            Repair works have been registered and audited. The public ticket status and SLA clock are closed.
          </p>
          {resolutionData && (
            <div className="pt-2 border-t border-emerald-800/60 text-slate-400 space-y-1">
              <p><strong>Verdict:</strong> {resolutionData.verdict.toUpperCase()}</p>
              <p><strong>Observation:</strong> {resolutionData.reason}</p>
              {resolutionData.humanOverride && (
                <p className="text-amber-300">
                  <strong>Human Override Note:</strong> {resolutionData.note}
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Case B: Ticket is still open */
        <div className="space-y-6">
          {/* Action 1: Mark In Progress (if submitted or routed) */}
          {status !== 'in_progress' && (
            <div className="space-y-3 p-4 rounded-lg bg-slate-800/80 border border-slate-700">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                1. Acknowledge & Start Repair Work
              </span>
              <input
                type="text"
                value={inProgressNote}
                onChange={(e) => setInProgressNote(e.target.value)}
                placeholder="Optional progress note (e.g. Patchwork team dispatched to site)"
                className="w-full text-xs p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500"
              />
              <button
                type="button"
                onClick={handleMarkInProgress}
                disabled={updatingStatus}
                className="min-h-[44px] px-4 py-2 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition disabled:opacity-60 inline-flex items-center gap-2"
              >
                {updatingStatus ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                Mark Incident In Progress
              </button>
            </div>
          )}

          {/* Action 2: Upload After Photo & AI Verification */}
          <div className="space-y-4 p-4 rounded-lg bg-slate-800/80 border border-slate-700">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              2. Upload Repair Completion Photo & Verify Fix
            </span>

            {afterPreview ? (
              <div className="space-y-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={afterPreview}
                  alt="Repair completion preview"
                  className="max-h-52 rounded-lg border border-slate-700 object-contain mx-auto"
                />
                <button
                  type="button"
                  onClick={() => {
                    setAfterFile(null);
                    setAfterPreview(null);
                  }}
                  className="text-xs text-red-400 font-semibold hover:underline block mx-auto"
                >
                  Change Photo
                </button>
              </div>
            ) : (
              <div>
                <label
                  htmlFor="after-photo-input"
                  className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 text-white text-xs font-semibold cursor-pointer hover:bg-slate-600 border border-slate-600 transition"
                >
                  <Camera className="w-4 h-4 text-blue-400" />
                  Select After Repair Photo
                </label>
                <input
                  id="after-photo-input"
                  type="file"
                  accept="image/*"
                  onChange={handleAfterFileChange}
                  className="hidden"
                />
              </div>
            )}

            {!resolutionData && (
              <button
                type="button"
                onClick={handleVerifyResolution}
                disabled={verifyingFix || !afterFile}
                className="w-full min-h-[44px] rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {verifyingFix ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{verifyStatusText || 'Verifying Repair...'}</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Run AI Fix Verification</span>
                  </>
                )}
              </button>
            )}

            {/* AI Verification Result & Override Choice */}
            {resolutionData && !isResolved && (
              <div className="space-y-4 pt-3 border-t border-slate-700">
                <div className="p-3.5 rounded-lg bg-amber-950/70 border border-amber-800 text-amber-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center gap-1.5 text-amber-300">
                      <ShieldAlert className="w-4 h-4" />
                      AI Verdict: NEEDS HUMAN REVIEW
                    </span>
                    <span>Confidence: {Math.round(resolutionData.confidence * 100)}%</span>
                  </div>
                  <p className="text-slate-300">{resolutionData.reason}</p>
                </div>

                <div className="p-4 rounded-lg bg-slate-900 border border-slate-700 space-y-3">
                  <span className="text-xs font-bold text-white block">
                    Choose Municipal Resolution Action:
                  </span>

                  <div className="space-y-2">
                    <input
                      type="text"
                      value={overrideNote}
                      onChange={(e) => setOverrideNote(e.target.value)}
                      placeholder="Required note explaining why repair is verified (e.g. Inspected by Ward Engineer)"
                      className="w-full text-xs p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleConfirmOverride}
                      disabled={applyingOverride || !overrideNote.trim()}
                      className="w-full min-h-[44px] px-4 py-2 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {applyingOverride ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      <span>Confirm Anyway with Required Note (Human Override)</span>
                    </button>
                  </div>

                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setResolutionData(null);
                        setAfterFile(null);
                        setAfterPreview(null);
                      }}
                      className="text-xs text-slate-400 hover:text-white underline"
                    >
                      Upload a Different Repair Photo
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
