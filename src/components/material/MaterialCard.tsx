import type { OwnedPal } from '../../types/owned';
import { getPal, getPassive } from '../../data';
import { Tag } from '../common/Tag';
import { PassiveTag } from '../common/PassiveTag';
import { PalAvatar } from '../common/PalAvatar';
import { Button } from '../common/Button';

interface Props {
  pal: OwnedPal;
  onEdit: () => void;
  onRemove: () => void;
}

const GENDER_LABEL: Record<OwnedPal['gender'], string> = {
  male: '♂',
  female: '♀',
  unknown: '—',
};

export function MaterialCard({ pal, onEdit, onRemove }: Props) {
  const palInfo = getPal(pal.pal_id);
  const name = palInfo ? palInfo.name_zh : pal.pal_id;

  return (
    <article className="rounded-xl bg-bg-card p-4 ring-1 ring-white/5 transition hover:ring-white/10">
      <header className="mb-2 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <PalAvatar palId={pal.pal_id} size={40} />
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <h3 className="truncate text-base font-semibold text-slate-100">
                {name}
              </h3>
              <span className="text-xs text-slate-500">
                {GENDER_LABEL[pal.gender]}
              </span>
            </div>
            {pal.nickname && (
              <p className="truncate text-xs text-slate-400">{pal.nickname}</p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          {pal.is_finished && <Tag tone="accent">成品</Tag>}
          {pal.is_material && <Tag tone="neutral">素材</Tag>}
        </div>
      </header>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {pal.passives.length === 0 ? (
          <span className="text-xs text-slate-500">無詞條</span>
        ) : (
          pal.passives.map((id) => (
            <PassiveTag
              key={id}
              passive={getPassive(id)}
              fallbackId={id}
            />
          ))
        )}
      </div>

      {pal.tags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1">
          {pal.tags.map((t) => (
            <Tag key={t} tone="neutral">
              #{t}
            </Tag>
          ))}
        </div>
      )}

      {pal.note && (
        <p className="mb-3 line-clamp-2 text-xs text-slate-400">{pal.note}</p>
      )}

      <footer className="flex justify-end gap-1.5 border-t border-slate-700/40 pt-2">
        <Button size="sm" variant="ghost" onClick={onEdit}>
          編輯
        </Button>
        <Button size="sm" variant="danger" onClick={onRemove}>
          刪除
        </Button>
      </footer>
    </article>
  );
}
