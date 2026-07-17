import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { ErrorBanner } from '../../../components/ui-app/ErrorBanner';
import { authApi } from '../../../lib/api';
import { messageFromError } from '../../../lib/api/errorMessages';
import { useAuth } from '../../../lib/auth';
import { AuthShell, Field, inputClass, primaryBtnClass } from './AuthShell';

export function VerifyOtpPage() {
  const { acceptTokens } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const emailFromState = (location.state as { email?: string } | null)?.email ?? '';
  const [email, setEmail] = useState(emailFromState);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const tokens = await authApi.verifyOtp({ email, otp });
      await acceptTokens(tokens.access_token, tokens.refresh_token);
      navigate('/app/dashboard', { replace: true });
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Verify email"
      subtitle="Enter the 6-digit OTP sent to your KU email."
      footer={
        <>
          Wrong email?{' '}
          <Link to="/register/student" className="font-medium text-[#2563EB] hover:underline">
            Register again
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
        <Field label="Email">
          <input
            type="email"
            required
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="OTP">
          <input
            required
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            placeholder="••••••"
            className={`${inputClass} tracking-[0.4em]`}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          />
        </Field>
        <button type="submit" disabled={submitting || otp.length !== 6} className={`${primaryBtnClass} mt-2`}>
          {submitting ? 'Verifying…' : 'Verify & continue'}
        </button>
      </form>
    </AuthShell>
  );
}
