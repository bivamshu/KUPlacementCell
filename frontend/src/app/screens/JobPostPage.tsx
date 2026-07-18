import { useEffect, useState, type FormEvent } from 'react';
import { Briefcase } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router';
import { EmptyState } from '../../components/ui-app/EmptyState';
import { ErrorBanner } from '../../components/ui-app/ErrorBanner';
import { LoadingSpinner } from '../../components/ui-app/LoadingSpinner';
import {
  jobsApi,
  type JobDto,
  type JobStatus,
  type JobType,
} from '../../lib/api';
import { messageFromError } from '../../lib/api/errorMessages';

const fieldClass =
  'w-full rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2.5 text-sm text-[#374151] outline-none focus:border-[#2563EB]';

const JOB_TYPE_OPTIONS: { value: JobType | ''; label: string }[] = [
  { value: '', label: 'Select type' },
  { value: 'internship', label: 'Internship' },
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
];

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

type FormState = {
  title: string;
  description: string;
  location: string;
  job_type: JobType | '';
  min_cgpa: string;
};

const emptyForm: FormState = {
  title: '',
  description: '',
  location: '',
  job_type: '',
  min_cgpa: '',
};

function formFromJob(job: JobDto): FormState {
  return {
    title: job.title,
    description: job.description,
    location: job.location ?? '',
    job_type: job.job_type ?? '',
    min_cgpa: job.min_cgpa != null ? String(job.min_cgpa) : '',
  };
}

function toBody(form: FormState) {
  const minCgpaRaw = form.min_cgpa.trim();
  const min_cgpa = minCgpaRaw === '' ? null : Number(minCgpaRaw);
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    location: form.location.trim() || null,
    job_type: form.job_type || null,
    min_cgpa: Number.isFinite(min_cgpa) ? min_cgpa : null,
  };
}

export function JobPostPage() {
  const { jobId } = useParams<{ jobId?: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(jobId);

  const [job, setJob] = useState<JobDto | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!jobId) {
      setJob(null);
      setForm(emptyForm);
      setLoading(false);
      setError('');
      setSuccess('');
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      setSuccess('');
      try {
        const mine = await jobsApi.getMine(jobId);
        if (cancelled) return;
        setJob(mine);
        setForm(formFromJob(mine));
      } catch (err) {
        if (!cancelled) {
          setJob(null);
          setError(messageFromError(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [jobId]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const body = toBody(form);
      if (isEdit && jobId) {
        const updated = await jobsApi.updateMine(jobId, body);
        setJob(updated);
        setForm(formFromJob(updated));
        setSuccess('Job updated.');
      } else {
        const created = await jobsApi.create(body);
        setSuccess('Draft saved.');
        navigate(`/app/job-post/${created.id}`, { replace: true });
      }
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setSaving(false);
    }
  }

  async function onPublish() {
    if (!jobId) return;
    setPublishing(true);
    setError('');
    setSuccess('');
    try {
      // Persist latest form before publish so draft fields are not stale.
      const body = toBody(form);
      await jobsApi.updateMine(jobId, body);
      const published = await jobsApi.publish(jobId);
      setJob(published);
      setForm(formFromJob(published));
      setSuccess('Job published — students can see it on Discover.');
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setPublishing(false);
    }
  }

  if (loading) return <LoadingSpinner label="Loading job…" />;

  if (isEdit && !job && error) {
    return (
      <div className="space-y-4 p-6">
        <ErrorBanner message={error} />
        <Link to="/app/job-post" className="text-sm font-medium text-[#2563EB] hover:underline">
          Back to job posts
        </Link>
      </div>
    );
  }

  if (isEdit && !job) {
    return (
      <EmptyState title="Job not found" icon={<Briefcase className="text-[#E5E7EB]" size={40} />} />
    );
  }

  const busy = saving || publishing;
  const canPublish = job?.status === 'draft';

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">
            {isEdit ? 'Edit job' : 'Post a new job'}
          </h1>
          <p className="mt-0.5 text-sm text-[#6B7280]">
            {isEdit
              ? 'Update the role details. Status changes only via Publish.'
              : 'Saves as a draft first. Publish when the listing is ready.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {job ? statusBadge(job.status) : null}
          <Link to="/app/job-post" className="text-sm font-medium text-[#6B7280] hover:text-[#2563EB]">
            All jobs
          </Link>
        </div>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError('')} />}
      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {success}
        </div>
      )}

      <form onSubmit={onSave} className="space-y-5 rounded-2xl border border-[#E5E7EB] bg-white p-6">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#374151]">Job title</label>
          <input
            required
            minLength={2}
            maxLength={120}
            value={form.title}
            onChange={(e) => setField('title', e.target.value)}
            placeholder="e.g. Senior React Developer"
            className={fieldClass}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#374151]">Location</label>
          <input
            value={form.location}
            onChange={(e) => setField('location', e.target.value)}
            placeholder="e.g. Dhulikhel, Nepal"
            className={fieldClass}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#374151]">Job type</label>
            <select
              value={form.job_type}
              onChange={(e) => setField('job_type', e.target.value as JobType | '')}
              className={fieldClass}
            >
              {JOB_TYPE_OPTIONS.map((opt) => (
                <option key={opt.label} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#374151]">Min CGPA (optional)</label>
            <input
              type="number"
              min={0}
              max={4}
              step={0.01}
              value={form.min_cgpa}
              onChange={(e) => setField('min_cgpa', e.target.value)}
              placeholder="e.g. 3.0"
              className={fieldClass}
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#374151]">Description</label>
          <textarea
            required
            minLength={20}
            maxLength={10000}
            rows={8}
            value={form.description}
            onChange={(e) => setField('description', e.target.value)}
            placeholder="Describe the role, responsibilities, and requirements…"
            className={`${fieldClass} resize-y`}
          />
          <p className="mt-1 text-xs text-[#9CA3AF]">At least 20 characters.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-[#E5E7EB] pt-4">
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1D4ED8] disabled:opacity-60"
          >
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save draft'}
          </button>
          {canPublish && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void onPublish()}
              className="rounded-lg border border-[#2563EB] px-4 py-2 text-sm font-semibold text-[#2563EB] transition-colors hover:bg-[#EFF6FF] disabled:opacity-60"
            >
              {publishing ? 'Publishing…' : 'Publish'}
            </button>
          )}
          <Link
            to="/app/job-post"
            className="ml-auto text-sm font-medium text-[#6B7280] hover:text-[#2563EB]"
          >
            Back to list
          </Link>
        </div>
      </form>
    </div>
  );
}
