import { useEffect, type ReactNode } from 'react';

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  widthClass?: string;
}

export function Modal({
  open,
  title,
  onClose,
  children,
  widthClass = 'max-w-2xl',
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-16">
      <div
        className={`w-full ${widthClass} rounded-2xl bg-bg-panel p-5 shadow-2xl ring-1 ring-white/10`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-100">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-700/60 hover:text-slate-200"
            aria-label="close"
          >
            ✕
          </button>
        </header>
        <div>{children}</div>
      </div>
      <button
        type="button"
        aria-label="close-overlay"
        className="fixed inset-0 -z-10"
        onClick={onClose}
      />
    </div>
  );
}
