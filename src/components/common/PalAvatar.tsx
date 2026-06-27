import { useState } from 'react';
import { getPal, getPalIcon } from '../../data';

interface Props {
  palId: string;
  size?: number;
  className?: string;
}

/** 帕魯圖示；沒有圖或載入失敗時以「首字圓底」替代。 */
export function PalAvatar({ palId, size = 32, className = '' }: Props) {
  const [failed, setFailed] = useState(false);
  const url = getPalIcon(palId);
  const name = getPal(palId)?.name_zh ?? palId;
  const style = { width: size, height: size };

  if (!url || failed) {
    return (
      <span
        style={style}
        title={name}
        className={`inline-flex shrink-0 items-center justify-center rounded-md bg-slate-700 text-[10px] text-slate-300 ${className}`}
      >
        {name.slice(0, 1)}
      </span>
    );
  }

  return (
    <img
      src={url}
      alt={name}
      title={name}
      loading="lazy"
      onError={() => setFailed(true)}
      style={style}
      className={`shrink-0 rounded-md bg-slate-900/40 object-contain ${className}`}
    />
  );
}
