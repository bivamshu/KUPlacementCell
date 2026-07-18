import { useEffect, useState } from 'react';
import { ArrowLeft, Building2, ExternalLink } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router';
import { EmptyState } from '../../components/ui-app/EmptyState';
import { ErrorBanner } from '../../components/ui-app/ErrorBanner';
import { LoadingSpinner } from '../../components/ui-app/LoadingSpinner';
import { companiesApi, type CompanyPublicCard } from '../../lib/api';
import { messageFromError } from '../../lib/api/errorMessages';

function companyInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

export function CompanyPublicPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const [company, setCompany] = useState<CompanyPublicCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const data = await companiesApi.getPublicById(companyId);
        if (!cancelled) setCompany(data);
      } catch (err) {
        if (!cancelled) {
          setCompany(null);
          setError(messageFromError(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  if (loading) return <LoadingSpinner label="Loading company…" />;

  if (!company) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-6">
        {error ? <ErrorBanner message={error} /> : null}
        <EmptyState
          title="Company not found"
          description="Only approved companies are shown publicly."
          icon={<Building2 className="text-[#E5E7EB]" size={40} />}
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

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 text-sm font-medium text-[#6B7280] hover:text-[#2563EB]"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6">
        <div className="flex items-start gap-4">
          {company.logo_url ? (
            <img
              src={company.logo_url}
              alt=""
              className="h-16 w-16 rounded-xl object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[#EFF6FF] text-lg font-bold text-[#2563EB]">
              {companyInitials(company.company_name) || <Building2 size={28} />}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-[#111827]">{company.company_name}</h1>
            {company.industry && (
              <p className="mt-0.5 text-sm text-[#6B7280]">{company.industry}</p>
            )}
            {company.website && (
              <a
                href={company.website}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-[#2563EB] hover:underline"
              >
                {company.website}
                <ExternalLink size={12} />
              </a>
            )}
          </div>
        </div>

        {company.description && (
          <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-[#374151]">
            {company.description}
          </p>
        )}

        <div className="mt-6 border-t border-[#E5E7EB] pt-4">
          <Link
            to="/app/discover"
            className="text-sm font-medium text-[#2563EB] hover:underline"
          >
            Browse open roles on Discover
          </Link>
        </div>
      </div>
    </div>
  );
}
