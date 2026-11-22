'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  Camera,
  Mic,
  Upload,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ArrowRight,
  RefreshCw,
  MapPin,
} from 'lucide-react';
import { compressImage } from '@/lib/client/compressImage';
import { convertTo16kHzMonoWav } from '@/lib/client/toWav';
import { uploadMediaDirect } from '@/lib/client/upload';
import { CATEGORIES, CATEGORY_LABELS } from '@/lib/ai/schemas';
import { PRIORITY_COLORS, Priority, SeverityBreakdownItem } from '@/lib/severity';

const MapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false });

type MediaType = 'image' | 'audio';

interface SubmittedTicketData {
  ticketId: string;
  merged: boolean;
  reportCount: number;
  priority: Priority;
  score: number;
  breakdown: SeverityBreakdownItem[];
  category: string;
  title: string;
  summary: string;
  department: string;
  needsHumanReview: boolean;
  trackingUrl: string;
}

export default function ReportPage() {
  // Step state
  const [mediaType, setMediaType] = useState<MediaType>('image');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Location State (Default: Madurai, India)
  const [coords, setCoords] = useState<[number, number]>([9.9252, 78.1198]);
  const [geoStatus, setGeoStatus] = useState<string>('Detecting your location...');

  // Form Details
  const [userText, setUserText] = useState('');
  const [categoryHint, setCategoryHint] = useState('');

  // Submission Pipeline State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progressStatus, setProgressStatus] = useState('');
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmittedTicketData | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // 1. Acquire GPS location on load
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords([pos.coords.latitude, pos.coords.longitude]);
          setGeoStatus('Location pinned from GPS. Drag pin to adjust if needed.');
        },
        (err) => {
          console.warn('Geolocation failed or denied:', err.message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  }, []);

  // 2. Handle Image selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setAudioBlob(null);
      const url = URL.createObjectURL(file);
      setFilePreviewUrl(url);
    }
  };

  // 3. Audio Recording handling (Web Audio MediaRecorder, 30s cap)
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const fullAudioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        setAudioBlob(fullAudioBlob);
        setSelectedFile(null);
        setFilePreviewUrl(URL.createObjectURL(fullAudioBlob));
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 29) {
            stopRecording();
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Microphone access denied:', err);
      alert('Microphone access was denied. You can still upload an audio file directly.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setIsRecording(false);
  };

  // 4. Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissionError(null);

    const hasMedia = mediaType === 'image' ? selectedFile : audioBlob;
    if (!hasMedia) {
      setSubmissionError('Please attach a photo or record a voice note before submitting.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Step A: Client-side compression / audio resampling
      let processedBlob: Blob;
      let contentType = 'image/jpeg';

      if (mediaType === 'image') {
        setProgressStatus('Optimizing image & removing GPS metadata...');
        processedBlob = await compressImage(selectedFile!);
        contentType = 'image/jpeg';
      } else {
        setProgressStatus('Resampling audio to 16kHz mono WAV...');
        processedBlob = await convertTo16kHzMonoWav(audioBlob!);
        contentType = 'audio/wav';
      }

      // Step B: Direct upload to Supabase Storage via signed URL
      setProgressStatus('Uploading media to storage...');
      const { mediaPath } = await uploadMediaDirect(processedBlob, mediaType, contentType);

      // Step C: Trigger backend AI triage, deduplication, and routing
      setProgressStatus('AI analyzing issue, scoring severity & checking duplicates...');
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaPath,
          mediaType,
          lat: coords[0],
          lng: coords[1],
          userText: userText.trim() || undefined,
          categoryHint: categoryHint || undefined,
        }),
      });

      const json = await response.json();

      if (!response.ok || !json.ok) {
        throw new Error(json.error || 'Failed to file grievance report.');
      }

      setResult(json.data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setSubmissionError(msg);
    } finally {
      setIsSubmitting(false);
      setProgressStatus('');
    }
  };

  const copyTrackingLink = () => {
    if (result) {
      navigator.clipboard.writeText(result.trackingUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-xs">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold tracking-tight text-blue-700">CivicLens</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
              Report
            </span>
          </Link>
          <nav className="flex items-center space-x-4 text-sm font-medium text-slate-600">
            <Link href="/" className="hover:text-blue-700">Home</Link>
            <Link href="/report" className="text-blue-700 font-semibold">Report</Link>
            <Link href="/dashboard" className="hover:text-blue-700">Dashboard</Link>
            <Link href="/about" className="hover:text-blue-700">About</Link>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-2xl mx-auto px-4 py-8 flex-1 w-full">
        {result ? (
          /* Success Result Card */
          <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 text-emerald-600 mb-4">
              <CheckCircle2 className="w-8 h-8" />
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {result.merged ? 'Report Merged With Existing Grievance' : 'Grievance Registered'}
                </h2>
                <p className="text-xs text-slate-500">
                  {result.merged
                    ? 'Identical issue detected within 50 meters. Your report was merged to boost community priority.'
                    : 'Your incident was classified and routed to municipal authorities.'}
                </p>
              </div>
            </div>

            {/* Ticket & Priority Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200 mb-6">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Ticket ID
                </span>
                <span className="text-2xl font-extrabold text-slate-900">{result.ticketId}</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  style={{ backgroundColor: PRIORITY_COLORS[result.priority] }}
                  className="text-white text-sm font-bold px-3 py-1 rounded-md shadow-xs"
                >
                  {result.priority} ({result.score}/100)
                </span>
                {result.needsHumanReview && (
                  <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-1 rounded border border-amber-300">
                    Needs Human Review
                  </span>
                )}
              </div>
            </div>

            {/* AI Summary & Department */}
            <div className="space-y-4 mb-6">
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Issue Summary (AI-Assisted)
                </h3>
                <p className="text-base text-slate-800 font-medium bg-slate-50 p-3 rounded-lg border border-slate-100">
                  {result.summary}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-xs text-slate-500 font-medium block">Category</span>
                  <span className="text-sm font-semibold text-slate-800">
                    {CATEGORY_LABELS[result.category as keyof typeof CATEGORY_LABELS] || result.category}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-xs text-slate-500 font-medium block">Routed Department</span>
                  <span className="text-sm font-semibold text-slate-800">{result.department}</span>
                </div>
              </div>
            </div>

            {/* Severity Breakdown Table */}
            <div className="mb-6">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Explainable Severity Breakdown
              </h3>
              <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                <div className="grid grid-cols-4 bg-slate-100 p-2 font-semibold text-slate-600">
                  <span>Factor</span>
                  <span className="text-center">Rating</span>
                  <span className="text-center">Weight</span>
                  <span className="text-right">Points</span>
                </div>
                {result.breakdown.map((item) => (
                  <div
                    key={item.key}
                    className="grid grid-cols-4 p-2 border-t border-slate-100 items-center text-slate-700"
                  >
                    <span>{item.label}</span>
                    <span className="text-center font-medium">{item.raw}/10</span>
                    <span className="text-center text-slate-500">{Math.round(item.weight * 100)}%</span>
                    <span className="text-right font-bold text-slate-900">+{item.points}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tracking Link & Notice */}
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs mb-6">
              <p className="font-semibold mb-1">Simulated Dispatch Notice</p>
              <p>
                In this hackathon prototype, a formal dispatch notification was generated and
                dispatched to the demo test inbox. No municipal teams were actively summoned.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={copyTrackingLink}
                className="w-full sm:w-auto flex-1 min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copiedLink ? 'Link Copied to Clipboard!' : 'Copy Tracking Link'}
              </button>
              <button
                onClick={() => {
                  setResult(null);
                  setSelectedFile(null);
                  setAudioBlob(null);
                  setFilePreviewUrl(null);
                  setUserText('');
                }}
                className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition"
              >
                Report Another Issue
              </button>
            </div>
          </div>
        ) : (
          /* Report Submission Form */
          <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-sm">
            <div className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Report a Civic Grievance
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Upload a photo or voice note. AI will classify the hazard, score severity, and route
                it automatically.
              </p>
            </div>

            {/* Step 1: Media Attachment */}
            <div className="mb-6">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                Step 1: Capture or Upload Evidence
              </label>

              {/* Tabs */}
              <div className="flex rounded-lg bg-slate-100 p-1 mb-4">
                <button
                  type="button"
                  onClick={() => setMediaType('image')}
                  className={`flex-1 min-h-[44px] flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-md transition ${
                    mediaType === 'image'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Camera className="w-4 h-4" />
                  Photo
                </button>
                <button
                  type="button"
                  onClick={() => setMediaType('audio')}
                  className={`flex-1 min-h-[44px] flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-md transition ${
                    mediaType === 'audio'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Mic className="w-4 h-4" />
                  Voice Note (Tamil / Eng)
                </button>
              </div>

              {mediaType === 'image' ? (
                /* Photo Upload Area */
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-blue-500 transition">
                  {filePreviewUrl ? (
                    <div className="space-y-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={filePreviewUrl}
                        alt="Evidence preview"
                        className="max-h-56 mx-auto rounded-lg shadow-sm object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null);
                          setFilePreviewUrl(null);
                        }}
                        className="text-xs text-red-600 font-semibold hover:underline"
                      >
                        Remove Photo & Take Another
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="w-12 h-12 mx-auto rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div>
                        <label
                          htmlFor="image-upload"
                          className="min-h-[44px] inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold cursor-pointer hover:bg-blue-700 transition"
                        >
                          Snap Photo or Select File
                        </label>
                        <input
                          id="image-upload"
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handleImageChange}
                          className="hidden"
                        />
                      </div>
                      <p className="text-xs text-slate-500">
                        Supports JPEG, PNG, WebP up to 8 MB. Automatically resized and GPS metadata stripped.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* Audio Recording Area */
                <div className="border border-slate-200 rounded-xl p-6 text-center bg-slate-50">
                  <div className="space-y-4">
                    {isRecording ? (
                      <div className="space-y-3">
                        <div className="w-16 h-16 mx-auto rounded-full bg-red-100 text-red-600 flex items-center justify-center animate-pulse">
                          <Mic className="w-8 h-8" />
                        </div>
                        <div className="text-sm font-bold text-red-600">
                          Recording... {recordingSeconds}s / 30s
                        </div>
                        <button
                          type="button"
                          onClick={stopRecording}
                          className="min-h-[44px] px-6 py-2 rounded-lg bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition"
                        >
                          Stop Recording
                        </button>
                      </div>
                    ) : audioBlob ? (
                      <div className="space-y-3">
                        <p className="text-sm font-semibold text-emerald-700 flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> Voice Note Captured
                        </p>
                        <audio controls src={filePreviewUrl || ''} className="mx-auto" />
                        <button
                          type="button"
                          onClick={() => {
                            setAudioBlob(null);
                            setFilePreviewUrl(null);
                          }}
                          className="text-xs text-red-600 font-semibold hover:underline block mx-auto"
                        >
                          Delete & Record Again
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="w-12 h-12 mx-auto rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                          <Mic className="w-6 h-6" />
                        </div>
                        <p className="text-xs text-slate-600">
                          Explain the civic issue in Tamil or English (max 30 seconds).
                        </p>
                        <button
                          type="button"
                          onClick={startRecording}
                          className="min-h-[44px] px-5 py-2 rounded-lg bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition inline-flex items-center gap-2"
                        >
                          <Mic className="w-4 h-4" /> Start Recording
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Location Pinning */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Step 2: Verify Incident Location
                </label>
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  {coords[0].toFixed(4)}, {coords[1].toFixed(4)}
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-2">{geoStatus}</p>

              <MapPicker
                position={coords}
                onPositionChange={(newPos) => {
                  setCoords(newPos);
                  setGeoStatus('Location pinned manually.');
                }}
              />
            </div>

            {/* Step 3: Optional Text & Category */}
            <div className="space-y-4 mb-6">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Step 3: Optional Details
              </label>

              <div>
                <label htmlFor="user-text" className="text-xs text-slate-600 font-medium block mb-1">
                  Additional Notes (optional, max 500 characters)
                </label>
                <textarea
                  id="user-text"
                  value={userText}
                  onChange={(e) => setUserText(e.target.value.slice(0, 500))}
                  placeholder="e.g. Near Kalavasal signal, right in front of the tea stall..."
                  rows={2}
                  className="w-full text-sm p-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
                <span className="text-xs text-slate-400 block text-right">
                  {userText.length}/500
                </span>
              </div>

              <div>
                <label htmlFor="category-hint" className="text-xs text-slate-600 font-medium block mb-1">
                  Category Hint (optional)
                </label>
                <select
                  id="category-hint"
                  value={categoryHint}
                  onChange={(e) => setCategoryHint(e.target.value)}
                  className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900"
                >
                  <option value="">Let AI decide automatically (recommended)</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {CATEGORY_LABELS[cat]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Errors */}
            {submissionError && (
              <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2 mb-6">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Submission Error</p>
                  <p>{submissionError}</p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-[48px] rounded-lg bg-blue-600 text-white font-bold text-base hover:bg-blue-700 transition disabled:opacity-60 flex items-center justify-center gap-2 shadow-xs"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>{progressStatus || 'Processing...'}</span>
                  </>
                ) : (
                  <>
                    <span>Submit Grievance</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="max-w-2xl mx-auto px-4 text-center text-xs text-slate-500 space-y-1">
          <p>CivicLens is a hackathon prototype with simulated dispatch.</p>
          <p>© OpenStreetMap contributors • IDEA//FORGE 2026</p>
        </div>
      </footer>
    </div>
  );
}
