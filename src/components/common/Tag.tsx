import { type ReactNode } from 'react';

type Tone = 'neutral' | 'good' | 'warn' | 'bad' | 'accent';

const TONES: Record<Tone, string> = {
  neutral: 'bg-slate-700/70 text-slate-200 ring-slate-600',
  good: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
  warn: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
  bad: 'bg-rose-500/15 text-rose-300 ring-rose-500/30',
  accent: 'bg-sky-500/15 text-sky-300 ring-sky-500/30',
};

interface Props {
  tone?: Tone;
  children: ReactNode;
  onRemove?: () => void;
  title?: string;
}

export function Tag({ tone = 'neutral', children, onRemove, title }: Props) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ring-1 ${TONES[tone]}`}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 text-current/70 hover:text-current"
          aria-label="remove"
        >
          ×
        </button>
      )}
    </span>
  );
}
