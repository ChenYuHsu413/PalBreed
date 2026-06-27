import type { PassiveSkill } from '../../types/passive';

type Tone = 'good' | 'warn' | 'neutral';

const TONE_CLASS: Record<Tone, string> = {
  good: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
  warn: 'bg-amber-500/15 text-amber-200 ring-amber-500/30',
  neutral: 'bg-slate-700/70 text-slate-100 ring-slate-500/60',
};

interface Visual {
  tone: Tone;
  suffix: string | null;
  suffixClass?: string;
}

function getVisual(passive: PassiveSkill | undefined): Visual {
  if (!passive) {
    return { tone: 'neutral', suffix: '?', suffixClass: 'text-slate-400' };
  }
  if (passive.is_negative) {
    return { tone: 'neutral', suffix: '▼', suffixClass: 'text-rose-400' };
  }
  switch (passive.tier) {
    case 'S':
      return { tone: 'good', suffix: null };
    case 'A':
      return { tone: 'warn', suffix: '▲▲' };
    case 'B':
      return { tone: 'warn', suffix: '▲' };
    case 'C':
    case 'D':
    case 'F':
    default:
      return { tone: 'neutral', suffix: '△' };
  }
}

interface Props {
  passive?: PassiveSkill;
  fallbackId?: string;
  onRemove?: () => void;
  title?: string;
  disabled?: boolean;
}

export function PassiveTag({
  passive,
  fallbackId,
  onRemove,
  title,
  disabled = false,
}: Props) {
  const v = getVisual(passive);
  const label = passive
    ? (passive.name_zh || passive.name_en)
    : (fallbackId ?? '?');

  return (
    <span
      title={title ?? passive?.description_zh}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ring-1 ${TONE_CLASS[v.tone]} ${disabled ? 'opacity-40' : ''}`}
    >
      <span>{label}</span>
      {v.suffix && (
        <span className={`text-[10px] leading-none tracking-tighter ${v.suffixClass ?? ''}`}>
          {v.suffix}
        </span>
      )}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 opacity-70 hover:opacity-100"
          aria-label="remove"
        >
          ×
        </button>
      )}
    </span>
  );
}
