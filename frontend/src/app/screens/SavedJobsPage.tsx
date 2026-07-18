import { useCallback, useEffect, useState } from 'react';
import { Bookmark, Briefcase, Building2, MapPin, Trash2 } from 'lucide-react';
import { Link } from 'react-router';
import { EmptyState } from '../../components/ui-app/EmptyState';
import { ErrorBanner } from '../../components/ui-app/ErrorBanner';
import { LoadingSpinner } from '../../components/ui-app/LoadingSpinner';
import { jobsApi, type JobFeedCard, type JobType } from '../../lib/api';
import { messageFromError } from '../../lib/api/errorMessages';

function jobTypeLabel(type: JobType | null) {
  if (!type) return null;
  const map: Record<JobType, string> = {
    internship: 'Internship',
    full_time: 'Full-time',
    part_time: 'Part-time',
  };
  return map[type];
}

function companyInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

export function SavedJobsPage() {
  const [jobs, setJobs] = useState<JobFeedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await jobsApi.listSaved();
      setJobs(list);
    } catch (err) {
      setJobs([]);
      setError(messageFromError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onUnsave(job: JobFeedCard) {
    setBusyId(job.id);
    setError('');
    setJobs((prev) => prev.filter((j) => j.id !== job.id));
    try {
      await jobsApi.unsave(job.id);
    } catch (err) {
      setJobs((prev) => [...prev, job].sort((a, b) => a.title.localeCompare(b.title)));
      setError(messageFromError(err));
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <LoadingSpinner label="Loading saved jobs…" />;

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Saved jobs</h1>
          <p className="mt-0.5 text-sm text-[#6B7280]">
            Bookmarks sync to your account and survive reload.
          </p>
        </div>
        <Link
          to="/app/discover"
          className="text-sm font-medium text-[#2563EB] hover:underline"
        >
          Back to Discover
        </Link>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError('')} />}

      {jobs.length === 0 ? (
        <EmptyState
          title="No saved jobs"
          description="Star an opening on Discover to keep it here."
          icon={<Bookmark className="text-[#E5E7EB]" size={40} />}
          action={
            <Link
              to="/app/discover"
              className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1D4ED8]"
            >
              Browse Discover
            </Link>
          }
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {jobs.map((job) => {
            const typeLabel = jobTypeLabel(job.job_type);
            const busy = busyId === job.id;
            return (
              <li
                key={job.id}
                className="flex flex-col rounded-2xl border border-[#E5E7EB] bg-white p-5 transition-shadow hover:shadow-md"
              >
                <div className="mb-3 flex items-start gap-3">
                  {job.company.logo_url ? (
                    <img
                      src={job.company.logo_url}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] text-xs font-bold text-[#2563EB]">
                      {companyInitials(job.company.company_name) || (
                        <Building2 size={18} />
                      )}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[#111827]">{job.title}</p>
                    <p className="text-xs text-[#6B7280]">{job.company.company_name}</p>
                    {job.company.industry && (
                      <p className="text-xs text-[#9CA3AF]">{job.company.industry}</p>
                    )}
                  </div>
                  <Bookmark size={15} className="shrink-0 fill-[#F59E0B] text-[#F59E0B]" />
                </div>

                <div className="mb-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#9CA3AF]">
                  {typeLabel && (
                    <span className="inline-flex items-center gap-1">
                      <Briefcase size={10} />
                      {typeLabel}
                    </span>
                  )}
                  {job.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={10} />
                      {job.location}
                    </span>
                  )}
                  {job.min_cgpa != null && <span>Min CGPA {job.min_cgpa}</span>}
                </div>

                <p className="mb-4 line-clamp-3 flex-1 text-xs leading-relaxed text-[#6B7280]">
                  {job.description}
                </p>

                <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-[#F3F4F6] pt-3">
                  {/* Job detail: /app/jobs/:id */}
                  <Link
                    to={`/app/jobs/${job.id}`}
                    className="text-xs font-semibold text-[#2563EB] hover:underline"
                  >
                    View details
                  </Link>
                  {job.company.website && (
                    <a
                      href={job.company.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-medium text-[#6B7280] hover:text-[#2563EB]"
                    >
                      Company site
                    </a>
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void onUnsave(job)}
                    className="ml-auto inline-flex items-center gap-1 rounded-lg border border-red-100 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                  >
                    <Trash2 size={12} />
                    {busy ? '…' : 'Unsave'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
