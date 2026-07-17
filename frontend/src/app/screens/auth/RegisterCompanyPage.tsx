import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { ErrorBanner } from '../../../components/ui-app/ErrorBanner';
import { authApi } from '../../../lib/api';
import { messageFromError } from '../../../lib/api/errorMessages';
import { AuthShell, Field, inputClass, primaryBtnClass } from './AuthShell';

export function RegisterCompanyPage() {
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await authApi.registerCompany({
        company_name: companyName,
        email,
        password,
        website: website || undefined,
      });
      navigate('/login?registered=company');
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Company registration"
      subtitle="Accounts start as pending until an admin verifies you."
      footer={
        <>
          Already registered?{' '}
          <Link to="/login" className="font-medium text-[#2563EB] hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit}>
        {error && (
          <div className="mb-3">
            <ErrorBanner message={error} onDismiss={() => setError('')} />
          </div>
        )}
        <Field label="Company name">
          <input
            required
            minLength={2}
            className={inputClass}
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
        </Field>
        <Field label="Work email">
          <input
            type="email"
            required
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Website (optional)">
          <input
            type="url"
            placeholder="https://"
            className={inputClass}
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </Field>
        <Field label="Password">
          <input
            type="password"
            required
            minLength={8}
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <button type="submit" disabled={submitting} className={`${primaryBtnClass} mt-2`}>
          {submitting ? 'Creating account…' : 'Register company'}
        </button>
      </form>
    </AuthShell>
  );
}
