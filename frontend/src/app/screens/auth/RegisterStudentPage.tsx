import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { ErrorBanner } from '../../../components/ui-app/ErrorBanner';
import { authApi } from '../../../lib/api';
import { messageFromError } from '../../../lib/api/errorMessages';
import { AuthShell, Field, inputClass, primaryBtnClass } from './AuthShell';

export function RegisterStudentPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await authApi.registerStudent({
        email,
        full_name: fullName,
        password,
      });
      navigate('/verify-otp', { state: { email } });
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Student registration"
      subtitle="Use your KU email. We’ll send a one-time password."
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
        <Field label="Full name">
          <input
            required
            minLength={2}
            className={inputClass}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </Field>
        <Field label="KU email">
          <input
            type="email"
            required
            placeholder="name@ku.edu.np"
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
          <p className="mt-1 text-xs text-[#9CA3AF]">At least 8 characters, including a number.</p>
        </Field>
        <button type="submit" disabled={submitting} className={`${primaryBtnClass} mt-2`}>
          {submitting ? 'Sending OTP…' : 'Create account'}
        </button>
      </form>
    </AuthShell>
  );
}
