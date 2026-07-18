import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Bookmark,
  Briefcase,
  Building2,
  Compass,
  Heart,
  MapPin,
  Search,
  SlidersHorizontal,
  Star,
  X,
} from 'lucide-react';
import { Link } from 'react-router';
import { EmptyState } from '../../components/ui-app/EmptyState';
import { ErrorBanner } from '../../components/ui-app/ErrorBanner';
import { LoadingSpinner } from '../../components/ui-app/LoadingSpinner';
import {
  jobsApi,
  type JobFeedCard,
  type JobFeedQuery,
  type JobType,
} from '../../lib/api';
import { messageFromError } from '../../lib/api/errorMessages';

const fieldClass =
  'w-full rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-xs text-[#374151] outline-none focus:border-[#2563EB]';

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

type FilterState = {
  q: string;
  job_type: JobType | '';
  location: string;
  min_cgpa: string;
};

const emptyFilters: FilterState = {
  q: '',
  job_type: '',
  location: '',
  min_cgpa: '',
};

function toQuery(filters: FilterState): JobFeedQuery {
  const minRaw = filters.min_cgpa.trim();
  const min_cgpa = minRaw === '' ? undefined : Number(minRaw);
  return {
    q: filters.q.trim() || undefined,
    job_type: filters.job_type || undefined,
    location: filters.location.trim() || undefined,
    min_cgpa: Number.isFinite(min_cgpa) ? min_cgpa : undefined,
    limit: 50,
  };
}

export function DiscoverPage() {
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [draft, setDraft] = useState<FilterState>(emptyFilters);
  const [jobs, setJobs] = useState<JobFeedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cardIndex, setCardIndex] = useState(0);
  const [direction, setDirection] = useState<'left' | 'right' | null>(null);
  const [dragX, setDragX] = useState(0);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async (nextFilters: FilterState) => {
    setLoading(true);
    setError('');
    try {
      const list = await jobsApi.listFeed(toQuery(nextFilters));
      setJobs(list);
      setCardIndex(0);
      setDirection(null);
      setDragX(0);
    } catch (err) {
      setJobs([]);
      setError(messageFromError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(emptyFilters);
  }, [load]);

  const job = jobs[cardIndex] ?? null;
  const remaining = Math.max(0, jobs.length - cardIndex);

  // MOCK: Phase 7 — swipe only advances the local deck; no match persistence.
  function advance(dir: 'left' | 'right') {
    setDirection(dir);
    setTimeout(() => {
      setCardIndex((i) => i + 1);
      setDirection(null);
      setDragX(0);
    }, 320);
  }

  async function toggleSave(target: JobFeedCard) {
    setSavingId(target.id);
    setError('');
    const nextSaved = !target.is_saved;
    setJobs((prev) =>
      prev.map((j) => (j.id === target.id ? { ...j, is_saved: nextSaved } : j)),
    );
    try {
      if (nextSaved) await jobsApi.save(target.id);
      else await jobsApi.unsave(target.id);
    } catch (err) {
      setJobs((prev) =>
        prev.map((j) => (j.id === target.id ? { ...j, is_saved: target.is_saved } : j)),
      );
      setError(messageFromError(err));
    } finally {
      setSavingId(null);
    }
  }

  function applyFilters(e: FormEvent) {
    e.preventDefault();
    setFilters(draft);
    void load(draft);
  }

  function clearFilters() {
    setDraft(emptyFilters);
    setFilters(emptyFilters);
    void load(emptyFilters);
  }

  const rotation = dragX / 20;
  const likeOpacity = Math.max(0, dragX / 80);
  const nopeOpacity = Math.max(0, -dragX / 80);

  return (
    <div className="flex h-full gap-4 overflow-hidden p-4">
      {/* Side: session context */}
      <aside className="hidden w-52 shrink-0 space-y-3 lg:block">
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
            Discover
          </h3>
          <p className="text-xs leading-relaxed text-[#9CA3AF]">
            Browse open roles from verified companies. Swipe is local for now — matches land in Phase 7.
          </p>
        </div>
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
            Saved
          </h3>
          <Link
            to="/app/saved"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2563EB] hover:underline"
          >
            <Bookmark size={12} />
            Open saved jobs
          </Link>
        </div>
      </aside>

      {/* Center deck */}
      <div className="relative flex flex-1 flex-col items-center justify-center gap-4">
        {error && (
          <div className="absolute left-0 right-0 top-0 z-20 mx-auto max-w-md">
            <ErrorBanner message={error} onDismiss={() => setError('')} />
          </div>
        )}

        {loading ? (
          <LoadingSpinner label="Loading openings…" />
        ) : !job ? (
          <EmptyState
            title={jobs.length === 0 ? 'No open jobs' : 'You’re caught up'}
            description={
              jobs.length === 0
                ? filters.q || filters.job_type || filters.location || filters.min_cgpa
                  ? 'Try clearing filters or broadening your search.'
                  : 'When companies publish roles, they will show up here.'
                : 'You’ve reviewed every job in this feed. Refresh or change filters to see more.'
            }
            icon={<Compass className="text-[#E5E7EB]" size={40} />}
            action={
              <div className="flex flex-wrap justify-center gap-2">
                {jobs.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setCardIndex(0);
                      setDirection(null);
                      setDragX(0);
                    }}
                    className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#374151] hover:border-[#2563EB] hover:text-[#2563EB]"
                  >
                    Restart deck
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void load(filters)}
                  className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1D4ED8]"
                >
                  Refresh
                </button>
              </div>
            }
          />
        ) : (
          <>
            <div className="relative" style={{ width: 360, height: 520 }}>
              {/* Stack peek */}
              {jobs.slice(cardIndex + 1, cardIndex + 3).map((peek, i) => (
                <div
                  key={peek.id}
                  className="absolute inset-0 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-md"
                  style={{
                    transform: `scale(${1 - (i + 1) * 0.04}) translateY(${(i + 1) * 14}px)`,
                    zIndex: 2 - i,
                  }}
                >
                  <div className="h-36 bg-gradient-to-br from-[#EFF6FF] to-[#F8FAFC]" />
                  <div className="p-5">
                    <p className="font-bold text-[#111827]">{peek.company.company_name}</p>
                    <p className="text-sm text-[#6B7280]">{peek.title}</p>
                  </div>
                </div>
              ))}

              <AnimatePresence>
                <motion.div
                  key={job.id}
                  className="absolute inset-0 cursor-grab overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-xl active:cursor-grabbing"
                  style={{ zIndex: 10 }}
                  drag="x"
                  dragConstraints={{ left: -200, right: 200 }}
                  onDrag={(_, info) => setDragX(info.offset.x)}
                  onDragEnd={(_, info) => {
                    if (info.offset.x > 80) advance('right');
                    else if (info.offset.x < -80) advance('left');
                    else setDragX(0);
                  }}
                  animate={
                    direction
                      ? {
                          x: direction === 'right' ? 500 : -500,
                          opacity: 0,
                          rotate: direction === 'right' ? 20 : -20,
                        }
                      : { x: dragX, rotate: rotation }
                  }
                  transition={
                    direction
                      ? { duration: 0.32 }
                      : { type: 'spring', stiffness: 400, damping: 40 }
                  }
                >
                  <div
                    className="absolute left-6 top-6 z-20 rotate-[-12deg] rounded-lg border-4 border-green-500 px-3 py-1"
                    style={{ opacity: likeOpacity }}
                  >
                    <span className="text-xl font-black tracking-widest text-green-500">LIKE</span>
                  </div>
                  <div
                    className="absolute right-6 top-6 z-20 rotate-12 rounded-lg border-4 border-red-500 px-3 py-1"
                    style={{ opacity: nopeOpacity }}
                  >
                    <span className="text-xl font-black tracking-widest text-red-500">NOPE</span>
                  </div>

                  <div className="relative flex h-36 items-end bg-gradient-to-br from-[#DBEAFE] via-[#EFF6FF] to-[#F8FAFC] p-4">
                    {job.company.logo_url ? (
                      <img
                        src={job.company.logo_url}
                        alt=""
                        className="absolute left-4 top-4 h-14 w-14 rounded-xl border border-white object-cover shadow-sm"
                      />
                    ) : (
                      <div className="absolute left-4 top-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[#2563EB] text-sm font-bold text-white shadow-sm">
                        {companyInitials(job.company.company_name) || <Building2 size={22} />}
                      </div>
                    )}
                    {jobTypeLabel(job.job_type) && (
                      <span className="ml-auto rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-semibold text-[#2563EB]">
                        {jobTypeLabel(job.job_type)}
                      </span>
                    )}
                  </div>

                  <div className="space-y-3 overflow-y-auto p-5" style={{ maxHeight: 320 }}>
                    <div>
                      <Link
                        to={`/app/jobs/${job.id}`}
                        className="text-lg font-bold text-[#111827] hover:text-[#2563EB]"
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        {job.title}
                      </Link>
                      <p className="text-sm font-medium text-[#374151]">{job.company.company_name}</p>
                      {job.company.industry && (
                        <p className="text-xs text-[#9CA3AF]">{job.company.industry}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-3 text-xs text-[#6B7280]">
                      {job.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={11} />
                          {job.location}
                        </span>
                      )}
                      {job.min_cgpa != null && (
                        <span className="inline-flex items-center gap-1">
                          <Briefcase size={11} />
                          Min CGPA {job.min_cgpa}
                        </span>
                      )}
                    </div>

                    <p className="text-xs leading-relaxed text-[#6B7280] whitespace-pre-wrap">
                      {job.description.length > 420
                        ? `${job.description.slice(0, 420)}…`
                        : job.description}
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-5">
              <button
                type="button"
                onClick={() => advance('left')}
                className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#EF4444] bg-white text-[#EF4444] shadow-md transition-all hover:scale-105 hover:bg-red-50"
                aria-label="Skip"
              >
                <X size={22} />
              </button>
              <button
                type="button"
                disabled={savingId === job.id}
                onClick={() => void toggleSave(job)}
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 bg-white shadow-md transition-all hover:scale-105 disabled:opacity-60 ${
                  job.is_saved
                    ? 'border-[#F59E0B] text-[#F59E0B] bg-amber-50'
                    : 'border-[#F59E0B] text-[#F59E0B] hover:bg-amber-50'
                }`}
                aria-label={job.is_saved ? 'Unsave job' : 'Save job'}
              >
                <Star size={16} fill={job.is_saved ? 'currentColor' : 'none'} />
              </button>
              {/* MOCK: Phase 7 — like does not create a match yet */}
              <button
                type="button"
                onClick={() => advance('right')}
                className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#22C55E] bg-white text-[#22C55E] shadow-md transition-all hover:scale-105 hover:bg-green-50"
                aria-label="Like (preview)"
              >
                <Heart size={22} />
              </button>
            </div>

            <p className="text-xs text-[#9CA3AF]">
              Drag or use buttons · {remaining} opening{remaining === 1 ? '' : 's'} left
              {job.is_saved ? ' · Saved' : ''}
            </p>
          </>
        )}
      </div>

      {/* Filters */}
      <aside className="hidden w-56 shrink-0 md:block">
        <form
          onSubmit={applyFilters}
          className="space-y-4 rounded-2xl border border-[#E5E7EB] bg-white p-4"
        >
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={14} className="text-[#6B7280]" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
              Filters
            </h3>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium text-[#374151]">Search</p>
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-2 text-[#9CA3AF]" />
              <input
                value={draft.q}
                onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))}
                placeholder="Title or keywords"
                className={`${fieldClass} pl-7`}
              />
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium text-[#374151]">Job type</p>
            <select
              value={draft.job_type}
              onChange={(e) =>
                setDraft((d) => ({ ...d, job_type: e.target.value as JobType | '' }))
              }
              className={fieldClass}
            >
              <option value="">All</option>
              <option value="full_time">Full-time</option>
              <option value="internship">Internship</option>
              <option value="part_time">Part-time</option>
            </select>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium text-[#374151]">Location</p>
            <input
              value={draft.location}
              onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))}
              placeholder="e.g. Dhulikhel"
              className={fieldClass}
            />
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium text-[#374151]">Min CGPA</p>
            <input
              type="number"
              min={0}
              max={4}
              step={0.01}
              value={draft.min_cgpa}
              onChange={(e) => setDraft((d) => ({ ...d, min_cgpa: e.target.value }))}
              placeholder="e.g. 3.0"
              className={fieldClass}
            />
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <button
              type="submit"
              className="rounded-lg bg-[#2563EB] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1D4ED8]"
            >
              Apply filters
            </button>
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-lg border border-[#E5E7EB] px-3 py-2 text-xs font-semibold text-[#6B7280] hover:border-[#2563EB] hover:text-[#2563EB]"
            >
              Clear
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
