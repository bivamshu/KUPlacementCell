import { useCallback, useEffect, useState } from 'react';
import { Briefcase, Building2, Heart, MessageSquare, UserRound } from 'lucide-react';
import { Link } from 'react-router';
import { EmptyState } from '../../components/ui-app/EmptyState';
import { ErrorBanner } from '../../components/ui-app/ErrorBanner';
import { LoadingSpinner } from '../../components/ui-app/LoadingSpinner';
import { matchesApi, type MatchDto } from '../../lib/api';
import { messageFromError } from '../../lib/api/errorMessages';
import { useAuth } from '../../lib/auth';

function formatMatchedAt(iso: string) {
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

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function counterpartyName(match: MatchDto, role: string | undefined) {
  if (role === 'COMPANY') return match.student?.full_name ?? 'Student';
  return match.company?.company_name ?? 'Company';
}

function counterpartyAvatar(match: MatchDto, role: string | undefined) {
  if (role === 'COMPANY') return match.student?.avatar_url ?? null;
  return match.company?.logo_url ?? null;
}

export function MatchesPage() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<MatchDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setMatches(await matchesApi.listMine());
    } catch (err) {
      setMatches([]);
      setError(messageFromError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <LoadingSpinner label="Loading matches…" />;

  const isCompany = user?.role === 'COMPANY';
  const emptyAction = isCompany ? (
    <Link
      to="/app/applicants"
      className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1D4ED8]"
    >
      Open Interest inbox
    </Link>
  ) : (
    <Link
      to="/app/discover"
      className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1D4ED8]"
    >
      Go to Discover
    </Link>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-bold text-[#111827]">Your Matches</h1>
        <p className="mt-0.5 text-sm text-[#6B7280]">
          {isCompany
            ? 'Students you reciprocated after they liked a job. Messaging arrives in Phase 8.'
            : 'Companies that matched after you liked a role. Messaging arrives in Phase 8.'}
        </p>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError('')} />}

      {matches.length === 0 ? (
        <EmptyState
          title="No matches yet"
          description={
            isCompany
              ? 'When you Match a student from Interest, the connection appears here.'
              : 'Like jobs on Discover. When a company Matches you, it shows up here.'
          }
          icon={<Heart className="text-[#E5E7EB]" size={40} />}
          action={emptyAction}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {matches.map((match) => {
            const name = counterpartyName(match, user?.role);
            const avatar = counterpartyAvatar(match, user?.role);
            const jobTitle = match.job?.title ?? 'Job';
            const jobHref =
              user?.role === 'STUDENT'
                ? `/app/jobs/${match.job_id}`
                : `/app/job-post/${match.job_id}`;

            return (
              <li
                key={match.id}
                className="flex flex-col rounded-2xl border border-[#E5E7EB] bg-white p-5"
              >
                <div className="mb-4 flex items-start gap-3">
                  {avatar ? (
                    <img
                      src={avatar}
                      alt=""
                      className="h-12 w-12 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EFF6FF] text-sm font-bold text-[#2563EB]">
                      {initials(name) ||
                        (isCompany ? <UserRound size={20} /> : <Building2 size={20} />)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[#111827] truncate">{name}</p>
                    <p className="inline-flex items-center gap-1 text-xs text-[#6B7280]">
                      <Briefcase size={11} />
                      <span className="truncate">{jobTitle}</span>
                    </p>
                  </div>
                </div>

                <p className="mb-4 text-xs text-[#9CA3AF]">
                  Matched {formatMatchedAt(match.matched_at)}
                  {match.job?.status && match.job.status !== 'open'
                    ? ` · Job ${match.job.status}`
                    : ''}
                </p>

                <div className="mt-auto flex flex-wrap items-center gap-2">
                  <Link
                    to={jobHref}
                    className="rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-xs font-semibold text-[#374151] hover:border-[#2563EB] hover:text-[#2563EB]"
                  >
                    View job
                  </Link>
                  <button
                    type="button"
                    disabled
                    title="Chat opens in Phase 8"
                    className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-xs font-semibold text-[#9CA3AF]"
                  >
                    <MessageSquare size={12} />
                    Chat (Phase 8)
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
