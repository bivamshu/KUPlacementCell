import { useCallback, useEffect, useState } from 'react';
import { Heart, Inbox, UserRound } from 'lucide-react';
import { Link } from 'react-router';
import { EmptyState } from '../../components/ui-app/EmptyState';
import { ErrorBanner } from '../../components/ui-app/ErrorBanner';
import { LoadingSpinner } from '../../components/ui-app/LoadingSpinner';
import {
  ApiError,
  matchesApi,
  swipesApi,
  type InboundSwipeDto,
} from '../../lib/api';
import { messageFromError } from '../../lib/api/errorMessages';

function matchKey(jobId: string, studentId: string) {
  return `${jobId}:${studentId}`;
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

export function CompanyInterestPage() {
  const [items, setItems] = useState<InboundSwipeDto[]>([]);
  const [matched, setMatched] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [inbound, matches] = await Promise.all([
        swipesApi.listInbound(),
        matchesApi.listMine(),
      ]);
      setItems(inbound);
      setMatched(new Set(matches.map((m) => matchKey(m.job_id, m.student_id))));
    } catch (err) {
      setItems([]);
      setMatched(new Set());
      setError(messageFromError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onMatch(item: InboundSwipeDto) {
    const key = matchKey(item.job.id, item.student.id);
    if (matched.has(key) || busyKey) return;

    setBusyKey(key);
    setError('');
    try {
      await matchesApi.create({
        job_id: item.job.id,
        student_id: item.student.id,
      });
      setMatched((prev) => new Set(prev).add(key));
    } catch (err) {
      if (err instanceof ApiError && err.code === 'MATCH_CONFLICT') {
        setMatched((prev) => new Set(prev).add(key));
      } else {
        setError(messageFromError(err));
      }
    } finally {
      setBusyKey(null);
    }
  }

  if (loading) return <LoadingSpinner label="Loading interest…" />;

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Interest</h1>
          <p className="mt-0.5 text-sm text-[#6B7280]">
            Students who liked your jobs. Match to open a connection (chat comes in a later phase).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm font-semibold text-[#6B7280] hover:border-[#2563EB] hover:text-[#2563EB]"
          >
            Refresh
          </button>
          <Link
            to="/app/matches"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm font-semibold text-[#374151] hover:border-[#2563EB] hover:text-[#2563EB]"
          >
            <Heart size={14} />
            View matches
          </Link>
        </div>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError('')} />}

      {items.length === 0 ? (
        <EmptyState
          title="No interest yet"
          description="When students right-swipe your open jobs on Discover, they will appear here."
          icon={<Inbox className="text-[#E5E7EB]" size={40} />}
          action={
            <Link
              to="/app/job-post"
              className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1D4ED8]"
            >
              Manage job posts
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const key = matchKey(item.job.id, item.student.id);
            const isMatched = matched.has(key);
            const busy = busyKey === key;

            return (
              <li
                key={item.swipe.id}
                className="flex flex-wrap items-center gap-4 rounded-2xl border border-[#E5E7EB] bg-white p-4"
              >
                {item.student.avatar_url ? (
                  <img
                    src={item.student.avatar_url}
                    alt=""
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EFF6FF] text-sm font-bold text-[#2563EB]">
                    {initials(item.student.full_name) || <UserRound size={20} />}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[#111827]">{item.student.full_name}</p>
                  <p className="text-sm text-[#6B7280]">
                    Liked{' '}
                    <span className="font-medium text-[#374151]">{item.job.title}</span>
                    {item.job.status !== 'open' ? (
                      <span className="ml-1 text-xs uppercase text-[#9CA3AF]">
                        ({item.job.status})
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-xs text-[#9CA3AF]">
                    {[item.student.department, item.student.graduation_year]
                      .filter(Boolean)
                      .join(' · ') || 'Student'}
                    {' · '}
                    {formatWhen(item.swipe.swiped_at)}
                  </p>
                </div>

                {isMatched ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
                    <Heart size={12} fill="currentColor" />
                    Matched
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void onMatch(item)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-60"
                  >
                    <Heart size={14} />
                    {busy ? 'Matching…' : 'Match'}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
