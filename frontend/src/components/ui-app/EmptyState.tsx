import type { ReactNode } from 'react';

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[#E5E7EB] bg-white p-10 text-center">
      {icon}
      <p className="font-medium text-[#374151]">{title}</p>
      {description && <p className="max-w-sm text-sm text-[#9CA3AF]">{description}</p>}
      {action}
    </div>
  );
}
