import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { ErrorBanner } from '../../../components/ui-app/ErrorBanner';
import { messageFromError } from '../../../lib/api/errorMessages';
import { useAuth } from '../../../lib/auth';
import { AuthShell, Field, inputClass, primaryBtnClass } from './AuthShell';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const banner = params.get('registered') === 'company';

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login({ email, password });
      navigate('/app/dashboard', { replace: true });
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Sign in"
      subtitle="Use your KUPC account credentials."
      footer={
        <>
          New here?{' '}
          <Link to="/register/student" className="font-medium text-[#2563EB] hover:underline">
            Student register
          </Link>
          {' · '}
          <Link to="/register/company" className="font-medium text-[#2563EB] hover:underline">
            Company
          </Link>
          {' · '}
          <Link to="/login/admin" className="font-medium text-[#2563EB] hover:underline">
            Admin
          </Link>
        </>
      }
    >
      {banner && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Company registered. You can sign in now — verification may still be pending.
        </div>
      )}
      <form onSubmit={onSubmit} className="space-y-1">
        {error && (
          <div className="mb-3">
            <ErrorBanner message={error} onDismiss={() => setError('')} />
          </div>
        )}
        <Field label="Email">
          <input
            type="email"
            required
            autoComplete="email"
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Password">
          <input
            type="password"
            required
            autoComplete="current-password"
            minLength={8}
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <button type="submit" disabled={submitting} className={`${primaryBtnClass} mt-2`}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthShell>
  );
}
