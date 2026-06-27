import { useMemo, useState } from 'react';
import { useOwnedPalsStore } from '../../store/useOwnedPalsStore';
import { getPal } from '../../data';
import type { OwnedPal, OwnedPalInput } from '../../types/owned';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { EmptyState } from '../common/EmptyState';
import { MaterialCard } from './MaterialCard';
import { MaterialForm } from './MaterialForm';
import { VisionImportModal } from './VisionImportModal';
import { JsonImportModal } from './JsonImportModal';
import {
  DEFAULT_FILTERS,
  MaterialFilters,
  type FilterState,
} from './MaterialFilters';

export function MaterialLibrarySection() {
  const { pals, add, update, remove } = useOwnedPalsStore();
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [editing, setEditing] = useState<OwnedPal | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [visionOpen, setVisionOpen] = useState(false);
  const [jsonOpen, setJsonOpen] = useState(false);

  const filtered = useMemo(() => {
    let list = [...pals];

    if (filters.palId) list = list.filter((p) => p.pal_id === filters.palId);
    if (filters.passiveId)
      list = list.filter((p) => p.passives.includes(filters.passiveId));
    if (filters.status === 'material')
      list = list.filter((p) => p.is_material && !p.is_finished);
    if (filters.status === 'finished')
      list = list.filter((p) => p.is_finished);

    const q = filters.search.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const palInfo = getPal(p.pal_id);
        const nameZh = palInfo?.name_zh ?? '';
        const nameEn = palInfo?.name_en.toLowerCase() ?? '';
        const nick = (p.nickname ?? '').toLowerCase();
        return (
          nameZh.includes(filters.search.trim()) ||
          nameEn.includes(q) ||
          nick.includes(q)
        );
      });
    }

    switch (filters.sort) {
      case 'created_asc':
        list.sort((a, b) => a.created_at - b.created_at);
        break;
      case 'name_asc':
        list.sort((a, b) =>
          (getPal(a.pal_id)?.name_zh ?? '').localeCompare(
            getPal(b.pal_id)?.name_zh ?? '',
            'zh-Hant'
          )
        );
        break;
      default:
        list.sort((a, b) => b.created_at - a.created_at);
    }
    return list;
  }, [pals, filters]);

  const openAdd = () => {
    setEditing(null);
    setIsOpen(true);
  };

  const openEdit = (pal: OwnedPal) => {
    setEditing(pal);
    setIsOpen(true);
  };

  const handleSubmit = (input: OwnedPalInput) => {
    if (editing) {
      update(editing.owned_id, input);
    } else {
      add(input);
    }
    setIsOpen(false);
    setEditing(null);
  };

  const handleRemove = (pal: OwnedPal) => {
    const name = getPal(pal.pal_id)?.name_zh ?? pal.pal_id;
    const label = pal.nickname ? `「${pal.nickname}」` : `這隻 ${name}`;
    if (confirm(`確定要刪除 ${label} 嗎？`)) {
      remove(pal.owned_id);
    }
  };

  return (
    <section className="space-y-4 rounded-2xl bg-bg-panel p-5 shadow-lg ring-1 ring-white/5">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">
            ① 我的素材庫
          </h2>
          <p className="text-xs text-slate-400">
            管理你擁有的帕魯素材與成品，資料保存在本機。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setJsonOpen(true)}>
            📋 JSON 匯入
          </Button>
          <Button variant="secondary" onClick={() => setVisionOpen(true)}>
            📷 截圖匯入
          </Button>
          <Button variant="primary" onClick={openAdd}>
            + 新增素材
          </Button>
        </div>
      </header>

      <MaterialFilters
        value={filters}
        onChange={setFilters}
        total={pals.length}
        shown={filtered.length}
      />

      {pals.length === 0 ? (
        <EmptyState
          title="尚未新增任何素材"
          hint="按右上「+ 新增素材」開始建立你的素材庫"
          action={
            <Button variant="primary" onClick={openAdd}>
              + 新增第一隻素材
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState title="沒有符合篩選條件的素材" />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((pal) => (
            <MaterialCard
              key={pal.owned_id}
              pal={pal}
              onEdit={() => openEdit(pal)}
              onRemove={() => handleRemove(pal)}
            />
          ))}
        </div>
      )}

      <Modal
        open={isOpen}
        onClose={() => {
          setIsOpen(false);
          setEditing(null);
        }}
        title={editing ? '編輯素材' : '新增素材'}
      >
        <MaterialForm
          initial={editing ?? undefined}
          onSubmit={handleSubmit}
          onCancel={() => {
            setIsOpen(false);
            setEditing(null);
          }}
        />
      </Modal>

      <VisionImportModal
        open={visionOpen}
        onClose={() => setVisionOpen(false)}
      />

      <JsonImportModal open={jsonOpen} onClose={() => setJsonOpen(false)} />
    </section>
  );
}
