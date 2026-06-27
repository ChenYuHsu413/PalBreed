import { type ReactNode } from 'react';

interface Props {
  title: string;
  hint?: string;
  action?: ReactNode;
}

export function EmptyState({ title, hint, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-600/60 px-4 py-10 text-center">
      <div>
        <p className="text-sm font-medium text-slate-300">{title}</p>
        {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      </div>
      {action}
    </div>
  );
}
