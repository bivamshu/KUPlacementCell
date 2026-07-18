import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  Bookmark,
  Briefcase,
  Building2,
  ExternalLink,
  MapPin,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router';
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

export function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<JobFeedCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (id: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await jobsApi.getById(id);
      setJob(data);
    } catch (err) {
      setJob(null);
      setError(messageFromError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!jobId) return;
    void load(jobId);
  }, [jobId, load]);

  async function toggleSave() {
    if (!job) return;
    setSaving(true);
    setError('');
    const nextSaved = !job.is_saved;
    setJob({ ...job, is_saved: nextSaved });
    try {
      if (nextSaved) await jobsApi.save(job.id);
      else await jobsApi.unsave(job.id);
    } catch (err) {
      setJob({ ...job, is_saved: job.is_saved });
      setError(messageFromError(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSpinner label="Loading job…" />;

  if (!job) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        {error ? <ErrorBanner message={error} /> : null}
        <EmptyState
          title="Job not found"
          description="This opening may have closed or is not available."
          icon={<Briefcase className="text-[#E5E7EB]" size={40} />}
          action={
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1D4ED8]"
            >
              Go back
            </button>
          }
        />
      </div>
    );
  }

  const typeLabel = jobTypeLabel(job.job_type);

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-sm font-medium text-[#6B7280] hover:text-[#2563EB]"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <Link to="/app/discover" className="text-sm text-[#9CA3AF] hover:text-[#2563EB]">
          Discover
        </Link>
        <Link to="/app/saved" className="text-sm text-[#9CA3AF] hover:text-[#2563EB]">
          Saved
        </Link>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError('')} />}

      <article className="space-y-5 rounded-2xl border border-[#E5E7EB] bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-[#111827]">{job.title}</h1>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-[#6B7280]">
              {typeLabel && (
                <span className="inline-flex items-center gap-1">
                  <Briefcase size={14} />
                  {typeLabel}
                </span>
              )}
              {job.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={14} />
                  {job.location}
                </span>
              )}
              {job.min_cgpa != null && <span>Min CGPA {job.min_cgpa}</span>}
            </div>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={() => void toggleSave()}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-60 ${
              job.is_saved
                ? 'border-[#F59E0B] bg-amber-50 text-[#F59E0B]'
                : 'border-[#E5E7EB] text-[#374151] hover:border-[#F59E0B] hover:text-[#F59E0B]'
            }`}
          >
            <Bookmark size={16} fill={job.is_saved ? 'currentColor' : 'none'} />
            {job.is_saved ? 'Saved' : 'Save'}
          </button>
        </div>

        <section className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
          <div className="flex items-start gap-3">
            {job.company.logo_url ? (
              <img
                src={job.company.logo_url}
                alt=""
                className="h-12 w-12 rounded-xl object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EFF6FF] text-sm font-bold text-[#2563EB]">
                {companyInitials(job.company.company_name) || <Building2 size={22} />}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-[#111827]">{job.company.company_name}</p>
              {job.company.industry && (
                <p className="text-xs text-[#6B7280]">{job.company.industry}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-3 text-xs">
                <Link
                  to={`/app/companies/${job.company.id}`}
                  className="font-medium text-[#2563EB] hover:underline"
                >
                  View company
                </Link>
                {job.company.website && (
                  <a
                    href={job.company.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-[#6B7280] hover:text-[#2563EB]"
                  >
                    Website
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-[#6B7280]">
            Description
          </h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#374151]">
            {job.description}
          </p>
        </section>
      </article>
    </div>
  );
}
