export function LoadingSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#E5E7EB] border-t-[#2563EB]" />
      <p className="text-sm text-[#6B7280]">{label}</p>
    </div>
  );
}

export function FullPageSpinner({ label = 'Loading session…' }: { label?: string }) {
  return (
    <div className="flex h-screen items-center justify-center bg-[#F8FAFC] font-['Inter']">
      <LoadingSpinner label={label} />
    </div>
  );
}
