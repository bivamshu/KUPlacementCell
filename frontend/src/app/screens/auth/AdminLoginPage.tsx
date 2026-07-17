import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { ErrorBanner } from '../../../components/ui-app/ErrorBanner';
import { messageFromError } from '../../../lib/api/errorMessages';
import { useAuth } from '../../../lib/auth';
import { AuthShell, Field, inputClass, primaryBtnClass } from './AuthShell';

export function AdminLoginPage() {
  const { adminLogin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await adminLogin({
        email,
        password,
        totp_code: totp || undefined,
      });
      navigate('/app/dashboard', { replace: true });
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Admin sign in"
      subtitle="Restricted to KUPC administrators."
      footer={
        <Link to="/login" className="font-medium text-[#2563EB] hover:underline">
          Back to student / company login
        </Link>
      }
    >
      <form onSubmit={onSubmit}>
        {error && (
          <div className="mb-3">
            <ErrorBanner message={error} onDismiss={() => setError('')} />
          </div>
        )}
        <Field label="Email">
          <input
            type="email"
            required
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Password">
          <input
            type="password"
            required
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Field label="TOTP (if enabled)">
          <input
            inputMode="numeric"
            maxLength={6}
            className={inputClass}
            value={totp}
            onChange={(e) => setTotp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          />
        </Field>
        <button type="submit" disabled={submitting} className={`${primaryBtnClass} mt-2`}>
          {submitting ? 'Signing in…' : 'Admin sign in'}
        </button>
      </form>
    </AuthShell>
  );
}
