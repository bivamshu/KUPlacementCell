import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  BarChart2,
  CheckCircle,
  FileText,
  RefreshCw,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react';
import { motion } from 'motion/react';
import { EmptyState } from '../../components/ui-app/EmptyState';
import { ErrorBanner } from '../../components/ui-app/ErrorBanner';
import { LoadingSpinner } from '../../components/ui-app/LoadingSpinner';
import {
  resumesApi,
  type ResumeAnalysis,
  type ResumeListItem,
} from '../../lib/api';
import { messageFromError } from '../../lib/api/errorMessages';

const MAX_POLLS = 60;
const POLL_MS = 2000;

export function ResumeAnalyzerPage() {
  const [list, setList] = useState<ResumeListItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [activeResumeId, setActiveResumeId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const pollRef = useRef<number | null>(null);
  const attemptsRef = useRef(0);

  const stopPolling = useCallback(() => {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const refreshList = useCallback(async () => {
    const items = await resumesApi.list();
    setList(items);
    return items;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const items = await refreshList();
        if (cancelled) return;
        const active = items.find((r) => r.is_active) ?? items[0];
        if (active) {
          setActiveResumeId(active.id);
          setFileName(active.file_name);
          try {
            const latest = await resumesApi.getAnalysis(active.id);
            if (!cancelled) setAnalysis(latest);
          } catch {
            // No analysis yet — fine.
          }
        }
      } catch (err) {
        if (!cancelled) setError(messageFromError(err));
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();
    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [refreshList, stopPolling]);

  function startPolling(resumeId: string) {
    stopPolling();
    attemptsRef.current = 0;
    pollRef.current = window.setInterval(async () => {
      attemptsRef.current += 1;
      try {
        const result = await resumesApi.getAnalysis(resumeId);
        setAnalysis(result);
        if (result.status === 'completed' || result.status === 'failed') {
          stopPolling();
          void refreshList();
        } else if (attemptsRef.current >= MAX_POLLS) {
          stopPolling();
          setError('Analysis is taking longer than expected. Keep this page open or check again later.');
        }
      } catch (err) {
        stopPolling();
        setError(messageFromError(err));
      }
    }, POLL_MS);
  }

  async function onUpload(file: File | null) {
    if (!file) return;
    setError('');
    setUploading(true);
    setFileName(file.name);
    setAnalysis({ analysisId: '', resumeId: '', status: 'pending', result: null });
    try {
      const accepted = await resumesApi.upload(file);
      setActiveResumeId(accepted.resumeId);
      setAnalysis({
        analysisId: accepted.analysisId,
        resumeId: accepted.resumeId,
        status: 'pending',
        result: null,
      });
      await refreshList();
      startPolling(accepted.resumeId);
    } catch (err) {
      setAnalysis(null);
      setError(messageFromError(err));
    } finally {
      setUploading(false);
    }
  }

  async function onSelectResume(id: string) {
    setError('');
    setActiveResumeId(id);
    const item = list.find((r) => r.id === id);
    if (item) setFileName(item.file_name);
    stopPolling();
    try {
      const latest = await resumesApi.getAnalysis(id);
      setAnalysis(latest);
      if (latest.status === 'pending' || latest.status === 'processing') {
        startPolling(id);
      }
    } catch (err) {
      setAnalysis(null);
      setError(messageFromError(err));
    }
  }

  async function onDelete(id: string) {
    if (!window.confirm('Delete this resume and its analysis?')) return;
    setError('');
    stopPolling();
    try {
      await resumesApi.remove(id);
      const items = await refreshList();
      if (activeResumeId === id) {
        setActiveResumeId(items[0]?.id ?? null);
        setFileName(items[0]?.file_name ?? '');
        setAnalysis(null);
        if (items[0]) {
          try {
            setAnalysis(await resumesApi.getAnalysis(items[0].id));
          } catch {
            /* none */
          }
        }
      }
    } catch (err) {
      setError(messageFromError(err));
    }
  }

  const analyzing = analysis?.status === 'pending' || analysis?.status === 'processing';
  const done = analysis?.status === 'completed' && analysis.result;
  const failed = analysis?.status === 'failed';
  const result = analysis?.result;

  const breakdown =
    result?.ats_score.breakdown.map((b) => ({
      label: b.label,
      value: Math.round((b.score / Math.max(b.max_score, 1)) * 100),
      color: '#2563EB',
    })) ?? [];

  if (loadingList) return <LoadingSpinner label="Loading resumes…" />;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#111827]">Resume Analyzer</h1>
        <p className="mt-0.5 text-sm text-[#6B7280]">
          Upload a PDF — analysis runs on the backend worker (Redis + OpenAI).
        </p>
      </div>

      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} onDismiss={() => setError('')} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[#E5E7EB] bg-white p-10 transition-colors hover:border-[#2563EB]">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
                <Upload size={24} className="text-[#2563EB]" />
              </div>
              <p className="font-semibold text-[#111827]">
                {uploading ? 'Uploading…' : 'Drop a PDF resume'}
              </p>
              <p className="text-sm text-[#6B7280]">PDF only · max 5MB</p>
              <input
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                disabled={uploading}
                onChange={(e) => void onUpload(e.target.files?.[0] ?? null)}
              />
            </label>

            {(fileName || analyzing || done || failed) && (
              <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
                    <FileText size={18} className="text-red-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#111827]">{fileName || 'Resume'}</p>
                    <p className="text-xs text-[#9CA3AF]">Status: {analysis?.status ?? 'idle'}</p>
                  </div>
                  {done && <CheckCircle size={16} className="text-green-500" />}
                  {failed && <XCircle size={16} className="text-red-500" />}
                </div>
                {analyzing && (
                  <div className="space-y-2">
                    {['Queued…', 'Extracting text…', 'Scoring with AI…'].map((t) => (
                      <div key={t} className="flex items-center gap-2 text-xs text-[#6B7280]">
                        <RefreshCw size={11} className="animate-spin text-[#2563EB]" />
                        {t}
                      </div>
                    ))}
                  </div>
                )}
                {failed && (
                  <p className="text-sm text-red-600">
                    {analysis?.error_message || 'Analysis failed. Upload again to retry.'}
                  </p>
                )}
              </div>
            )}

            {done && result && (
              <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
                <h3 className="mb-3 font-semibold text-[#111827]">Suggestions</h3>
                <div className="space-y-2.5">
                  {result.suggestions.map((s, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <AlertCircle
                        size={14}
                        className={
                          s.priority === 'high'
                            ? 'mt-0.5 shrink-0 text-red-500'
                            : 'mt-0.5 shrink-0 text-amber-500'
                        }
                      />
                      <p className="text-xs leading-relaxed text-[#374151]">{s.suggestion}</p>
                    </div>
                  ))}
                  {result.strengths.map((s, i) => (
                    <div key={`st-${i}`} className="flex items-start gap-2.5">
                      <CheckCircle size={14} className="mt-0.5 shrink-0 text-green-500" />
                      <p className="text-xs leading-relaxed text-[#374151]">{s}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {done && result ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
                <h3 className="mb-4 font-semibold text-[#111827]">Overall Score</h3>
                <div className="flex items-center gap-6">
                  <div className="relative h-24 w-24">
                    <svg width="96" height="96" className="-rotate-90">
                      <circle cx="48" cy="48" r="40" fill="none" stroke="#E5E7EB" strokeWidth="8" />
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        fill="none"
                        stroke="#2563EB"
                        strokeWidth="8"
                        strokeDasharray={`${(result.ats_score.total_score / 100) * 251} 251`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold text-[#111827]">
                        {result.ats_score.total_score}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="mb-1 font-semibold text-[#111827]">Grade {result.ats_score.grade}</p>
                    <p className="text-xs text-[#6B7280]">{result.summary}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
                <h3 className="mb-4 font-semibold text-[#111827]">Score Breakdown</h3>
                <div className="space-y-3">
                  {(breakdown.length ? breakdown : [{ label: 'ATS', value: result.ats_score.total_score, color: '#2563EB' }]).map(
                    (s) => (
                      <div key={s.label}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="font-medium text-[#374151]">{s.label}</span>
                          <span className="font-semibold text-[#111827]">{s.value}/100</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[#F3F4F6]">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${s.value}%` }}
                            transition={{ duration: 0.8 }}
                            className="h-full rounded-full"
                            style={{ background: s.color }}
                          />
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={<BarChart2 size={22} className="text-[#9CA3AF]" />}
              title="Analysis will appear here"
              description="Upload a PDF to see ATS score, breakdown, strengths, and suggestions."
            />
          )}
        </div>

        <aside className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-[#111827]">Your resumes</h3>
          {list.length === 0 ? (
            <p className="text-xs text-[#9CA3AF]">No uploads yet.</p>
          ) : (
            <ul className="space-y-2">
              {list.map((r) => (
                <li
                  key={r.id}
                  className={`rounded-xl border px-3 py-2 ${
                    r.id === activeResumeId ? 'border-blue-200 bg-blue-50' : 'border-[#E5E7EB]'
                  }`}
                >
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => void onSelectResume(r.id)}
                  >
                    <p className="truncate text-xs font-medium text-[#111827]">{r.file_name}</p>
                    <p className="text-[10px] text-[#9CA3AF]">
                      {r.is_active ? 'Active · ' : ''}
                      {new Date(r.uploaded_at).toLocaleString()}
                    </p>
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${r.file_name}`}
                    className="mt-1 inline-flex items-center gap-1 text-[10px] text-red-500 hover:underline"
                    onClick={() => void onDelete(r.id)}
                  >
                    <Trash2 size={10} /> Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
