import { useEffect, useState, type FormEvent } from 'react';
import { Building2, Upload } from 'lucide-react';
import { EmptyState } from '../../components/ui-app/EmptyState';
import { ErrorBanner } from '../../components/ui-app/ErrorBanner';
import { LoadingSpinner } from '../../components/ui-app/LoadingSpinner';
import {
  companiesApi,
  type CompanyProfile,
  type CompanyVerificationStatus,
  type UpdateCompanyProfileBody,
} from '../../lib/api';
import { messageFromError } from '../../lib/api/errorMessages';

const fieldClass =
  'w-full rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-sm outline-none focus:border-[#2563EB]';

function statusBadge(status: CompanyVerificationStatus) {
  const map = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    approved: 'bg-green-50 text-green-700 border-green-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
  } as const;
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase ${map[status]}`}>
      {status}
    </span>
  );
}

export function CompanyProfilePage() {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [form, setForm] = useState<UpdateCompanyProfileBody>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const me = await companiesApi.getMe();
        if (cancelled) return;
        setProfile(me);
        setForm({
          company_name: me.company_name,
          website: me.website,
          industry: me.industry,
          description: me.description,
        });
      } catch (err) {
        if (!cancelled) setError(messageFromError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const updated = await companiesApi.updateMe({
        company_name: form.company_name,
        website: form.website || null,
        industry: form.industry || null,
        description: form.description || null,
      });
      setProfile(updated);
      setSuccess('Company profile saved.');
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setSaving(false);
    }
  }

  async function onLogo(file: File | null) {
    if (!file) return;
    setUploading(true);
    setError('');
    setSuccess('');
    try {
      const updated = await companiesApi.uploadLogo(file);
      setProfile(updated);
      setSuccess('Logo updated.');
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <LoadingSpinner label="Loading company profile…" />;
  if (!profile && error) {
    return (
      <div className="p-6">
        <ErrorBanner message={error} />
      </div>
    );
  }
  if (!profile) {
    return <EmptyState title="No company profile" icon={<Building2 className="text-[#E5E7EB]" size={40} />} />;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Company profile</h1>
          <p className="mt-0.5 text-sm text-[#6B7280]">Public presence & verification status.</p>
        </div>
        {statusBadge(profile.verification_status)}
      </div>

      {profile.verification_status === 'pending' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Your company is pending admin verification. Job posting will unlock after approval.
        </div>
      )}
      {profile.verification_status === 'rejected' && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Verification was rejected. Contact the placement office for next steps.
        </div>
      )}

      {error && <ErrorBanner message={error} onDismiss={() => setError('')} />}
      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {success}
        </div>
      )}

      <div className="flex flex-col items-start gap-4 rounded-2xl border border-[#E5E7EB] bg-white p-5 sm:flex-row sm:items-center">
        {profile.logo_url ? (
          <img src={profile.logo_url} alt={profile.company_name} className="h-16 w-16 rounded-xl object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB]">
            <Building2 size={28} />
          </div>
        )}
        <div className="flex-1">
          <p className="font-semibold text-[#111827]">{profile.company_name}</p>
          <p className="text-xs text-[#6B7280]">
            {profile.verified_at ? `Verified ${new Date(profile.verified_at).toLocaleDateString()}` : 'Not verified yet'}
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm font-medium hover:border-[#2563EB] hover:text-[#2563EB]">
          <Upload size={14} />
          {uploading ? 'Uploading…' : 'Upload logo'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={uploading}
            onChange={(e) => void onLogo(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      <form onSubmit={onSave} className="space-y-4 rounded-2xl border border-[#E5E7EB] bg-white p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-[#374151]">Company name</span>
            <input
              className={fieldClass}
              value={form.company_name ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-[#374151]">Website</span>
            <input
              type="url"
              className={fieldClass}
              value={form.website ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
            />
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="mb-1 block font-medium text-[#374151]">Industry</span>
            <input
              className={fieldClass}
              value={form.industry ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
            />
          </label>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-[#374151]">Description</span>
          <textarea
            rows={5}
            className={`${fieldClass} resize-none`}
            value={form.description ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-[#2563EB] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}
