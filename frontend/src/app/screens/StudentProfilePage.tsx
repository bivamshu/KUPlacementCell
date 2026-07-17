import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Award, Upload } from 'lucide-react';
import { EmptyState } from '../../components/ui-app/EmptyState';
import { ErrorBanner } from '../../components/ui-app/ErrorBanner';
import { LoadingSpinner } from '../../components/ui-app/LoadingSpinner';
import { studentsApi, type StudentProfile, type UpdateStudentProfileBody } from '../../lib/api';
import { messageFromError } from '../../lib/api/errorMessages';

const fieldClass =
  'w-full rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-sm outline-none focus:border-[#2563EB]';

export function StudentProfilePage() {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [form, setForm] = useState<UpdateStudentProfileBody>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const me = await studentsApi.getMe();
        if (cancelled) return;
        setProfile(me);
        setForm({
          full_name: me.full_name,
          phone: me.phone,
          degree: me.degree,
          bio: me.bio,
          department: me.department,
          cgpa: me.cgpa,
          graduation_year: me.graduation_year,
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
      const updated = await studentsApi.updateMe({
        full_name: form.full_name,
        phone: form.phone || null,
        degree: form.degree || null,
        bio: form.bio || null,
        department: form.department || null,
        cgpa: form.cgpa ?? null,
        graduation_year: form.graduation_year ?? null,
      });
      setProfile(updated);
      setSuccess('Profile saved.');
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setSaving(false);
    }
  }

  async function onAvatar(file: File | null) {
    if (!file) return;
    setUploading(true);
    setError('');
    setSuccess('');
    try {
      const updated = await studentsApi.uploadAvatar(file);
      setProfile(updated);
      setSuccess('Avatar updated.');
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <LoadingSpinner label="Loading profile…" />;
  if (!profile && error) {
    return (
      <div className="p-6">
        <ErrorBanner message={error} />
      </div>
    );
  }
  if (!profile) {
    return <EmptyState title="No profile" description="Student profile could not be loaded." />;
  }

  const initials = profile.full_name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-bold text-[#111827]">My profile</h1>
        <p className="mt-0.5 text-sm text-[#6B7280]">Live data from the KUPC API.</p>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError('')} />}
      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {success}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white">
        <div className="h-24 bg-gradient-to-r from-blue-500 to-blue-700" />
        <div className="flex flex-col gap-4 px-6 pb-5 sm:flex-row sm:items-end">
          <div className="-mt-10">
            {profile.profile_picture_url ? (
              <img
                src={profile.profile_picture_url}
                alt={profile.full_name}
                className="h-20 w-20 rounded-2xl object-cover ring-4 ring-white"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#2563EB] text-xl font-bold text-white ring-4 ring-white">
                {initials}
              </div>
            )}
          </div>
          <div className="flex-1 pb-1">
            <h2 className="text-xl font-bold text-[#111827]">{profile.full_name}</h2>
            <p className="text-sm text-[#6B7280]">
              KU ID {profile.ku_id}
              {profile.degree ? ` · ${profile.degree}` : ''}
              {profile.department ? ` · ${profile.department}` : ''}
            </p>
          </div>
          <label className="mb-1 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm font-medium text-[#374151] hover:border-[#2563EB] hover:text-[#2563EB]">
            <Upload size={14} />
            {uploading ? 'Uploading…' : 'Change avatar'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              disabled={uploading}
              onChange={(e) => void onAvatar(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
      </div>

      {profile.active_resume && (
        <div className="flex items-center justify-between rounded-2xl border border-[#E5E7EB] bg-white p-4">
          <div className="flex items-center gap-3">
            <Award size={18} className="text-[#2563EB]" />
            <div>
              <p className="text-sm font-semibold text-[#111827]">Active resume</p>
              <p className="text-xs text-[#6B7280]">{profile.active_resume.file_name}</p>
            </div>
          </div>
          <Link
            to="/app/resume"
            className="text-sm font-medium text-[#2563EB] hover:underline"
          >
            Open analyzer
          </Link>
        </div>
      )}

      <form onSubmit={onSave} className="space-y-4 rounded-2xl border border-[#E5E7EB] bg-white p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-[#374151]">Full name</span>
            <input
              className={fieldClass}
              value={form.full_name ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-[#374151]">Phone</span>
            <input
              className={fieldClass}
              value={form.phone ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-[#374151]">Degree</span>
            <input
              className={fieldClass}
              value={form.degree ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, degree: e.target.value }))}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-[#374151]">Department</span>
            <input
              className={fieldClass}
              value={form.department ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-[#374151]">CGPA (0–4)</span>
            <input
              type="number"
              step="0.01"
              min={0}
              max={4}
              className={fieldClass}
              value={form.cgpa ?? ''}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  cgpa: e.target.value === '' ? null : Number(e.target.value),
                }))
              }
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-[#374151]">Graduation year</span>
            <input
              type="number"
              className={fieldClass}
              value={form.graduation_year ?? ''}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  graduation_year: e.target.value === '' ? null : Number(e.target.value),
                }))
              }
            />
          </label>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-[#374151]">Bio</span>
          <textarea
            rows={4}
            className={`${fieldClass} resize-none`}
            value={form.bio ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
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
