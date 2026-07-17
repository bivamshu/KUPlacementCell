import { Link } from 'react-router';
import { Zap } from 'lucide-react';
import type { ReactNode } from 'react';

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4 py-10 font-['Inter']">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2563EB]">
            <Zap size={16} className="text-white" />
          </div>
          <span className="text-lg font-bold text-[#111827]">KUPC</span>
        </Link>
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold text-[#111827]">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-[#6B7280]">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <div className="mt-4 text-center text-sm text-[#6B7280]">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-sm font-medium text-[#374151]">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  'w-full rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2.5 text-sm text-[#111827] outline-none focus:border-[#2563EB]';

export const primaryBtnClass =
  'w-full rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60';
