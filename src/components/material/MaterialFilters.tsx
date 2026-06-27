import { PASSIVES } from '../../data';
import { PalPicker } from '../common/PalPicker';

export type SortKey = 'created_desc' | 'created_asc' | 'name_asc';
export type StatusFilter = 'all' | 'material' | 'finished';

export interface FilterState {
  search: string;
  palId: string;
  passiveId: string;
  status: StatusFilter;
  sort: SortKey;
}

export const DEFAULT_FILTERS: FilterState = {
  search: '',
  palId: '',
  passiveId: '',
  status: 'all',
  sort: 'created_desc',
};

interface Props {
  value: FilterState;
  onChange: (next: FilterState) => void;
  total: number;
  shown: number;
}

export function MaterialFilters({ value, onChange, total, shown }: Props) {
  const inputClass =
    'rounded-md bg-slate-800 px-2 py-1.5 text-xs text-slate-100 ring-1 ring-slate-700 focus:outline-none focus:ring-accent';

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        <input
          type="text"
          value={value.search}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
          placeholder="搜尋帕魯／暱稱"
          className={inputClass}
        />
        <PalPicker
          value={value.palId}
          onChange={(id) => onChange({ ...value, palId: id })}
          placeholder="所有帕魯（搜尋過濾）"
          allowClear
        />
        <select
          value={value.passiveId}
          onChange={(e) => onChange({ ...value, passiveId: e.target.value })}
          className={inputClass}
        >
          <option value="">所有詞條</option>
          {PASSIVES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name_zh}
            </option>
          ))}
        </select>
        <select
          value={value.status}
          onChange={(e) =>
            onChange({ ...value, status: e.target.value as StatusFilter })
          }
          className={inputClass}
        >
          <option value="all">全部</option>
          <option value="material">只看素材</option>
          <option value="finished">只看成品</option>
        </select>
        <select
          value={value.sort}
          onChange={(e) =>
            onChange({ ...value, sort: e.target.value as SortKey })
          }
          className={inputClass}
        >
          <option value="created_desc">最新優先</option>
          <option value="created_asc">最舊優先</option>
          <option value="name_asc">名稱 A-Z</option>
        </select>
      </div>
      <div className="text-right text-xs text-slate-500">
        顯示 {shown} / 共 {total} 筆
      </div>
    </div>
  );
}
