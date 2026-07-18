import { useCallback, useEffect, useState } from 'react';
import { Briefcase, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router';
import { EmptyState } from '../../components/ui-app/EmptyState';
import { ErrorBanner } from '../../components/ui-app/ErrorBanner';
import { LoadingSpinner } from '../../components/ui-app/LoadingSpinner';
import { jobsApi, type JobDto, type JobStatus, type JobType } from '../../lib/api';
import { messageFromError } from '../../lib/api/errorMessages';

function statusBadge(status: JobStatus) {
  const map = {
    draft: 'bg-amber-50 text-amber-700 border-amber-200',
    open: 'bg-green-50 text-green-700 border-green-200',
    closed: 'bg-slate-100 text-slate-600 border-slate-200',
  } as const;
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase ${map[status]}`}>
      {status}
    </span>
  );
}

function jobTypeLabel(type: JobType | null) {
  if (!type) return '—';
  const map: Record<JobType, string> = {
    internship: 'Internship',
    full_time: 'Full-time',
    part_time: 'Part-time',
  };
  return map[type];
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function CompanyJobsPage() {
  const [jobs, setJobs] = useState<JobDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await jobsApi.listMine();
      setJobs(list);
    } catch (err) {
      setError(messageFromError(err));
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onPublish(id: string) {
    setBusyId(id);
    setError('');
    try {
      const updated = await jobsApi.publish(id);
      setJobs((prev) => prev.map((j) => (j.id === id ? updated : j)));
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setBusyId(null);
    }
  }

  async function onClose(id: string) {
    setBusyId(id);
    setError('');
    try {
      const updated = await jobsApi.close(id);
      setJobs((prev) => prev.map((j) => (j.id === id ? updated : j)));
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setBusyId(null);
    }
  }

  async function onDelete(job: JobDto) {
    const ok = window.confirm(`Delete “${job.title}”? This cannot be undone.`);
    if (!ok) return;
    setBusyId(job.id);
    setError('');
    try {
      await jobsApi.remove(job.id);
      setJobs((prev) => prev.filter((j) => j.id !== job.id));
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <LoadingSpinner label="Loading your jobs…" />;

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Job posts</h1>
          <p className="mt-0.5 text-sm text-[#6B7280]">
            Manage drafts, publish openings, and close filled roles.
          </p>
        </div>
        <Link
          to="/app/job-post/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1D4ED8]"
        >
          <Plus size={16} />
          Post a job
        </Link>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError('')} />}

      {jobs.length === 0 ? (
        <EmptyState
          title="No jobs yet"
          description="Create a draft, then publish when you are ready for students to see it."
          icon={<Briefcase className="text-[#E5E7EB]" size={40} />}
          action={
            <Link
              to="/app/job-post/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1D4ED8]"
            >
              <Plus size={16} />
              Post a job
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {jobs.map((job) => {
            const busy = busyId === job.id;
            return (
              <li
                key={job.id}
                className="rounded-2xl border border-[#E5E7EB] bg-white p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-base font-semibold text-[#111827]">{job.title}</h2>
                      {statusBadge(job.status)}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#6B7280]">
                      <span>{jobTypeLabel(job.job_type)}</span>
                      {job.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={12} />
                          {job.location}
                        </span>
                      )}
                      {job.min_cgpa != null && <span>Min CGPA {job.min_cgpa}</span>}
                      <span>Updated {formatDate(job.updated_at)}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {job.status === 'draft' && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void onPublish(job.id)}
                        className="rounded-lg bg-[#2563EB] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-60"
                      >
                        {busy ? '…' : 'Publish'}
                      </button>
                    )}
                    {job.status === 'open' && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void onClose(job.id)}
                        className="rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-xs font-semibold text-[#374151] hover:border-[#2563EB] hover:text-[#2563EB] disabled:opacity-60"
                      >
                        {busy ? '…' : 'Close'}
                      </button>
                    )}
                    <Link
                      to={`/app/job-post/${job.id}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-xs font-semibold text-[#374151] hover:border-[#2563EB] hover:text-[#2563EB]"
                    >
                      <Pencil size={12} />
                      Edit
                    </Link>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void onDelete(job)}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-100 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                      aria-label={`Delete ${job.title}`}
                    >
                      <Trash2 size={12} />
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
