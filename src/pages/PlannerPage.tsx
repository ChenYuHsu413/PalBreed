import { useState } from 'react';
import { MaterialLibrarySection } from '../components/material/MaterialLibrarySection';
import { TargetSection } from '../components/target/TargetSection';
import { CoverageSection } from '../components/analysis/CoverageSection';
import { MergePlanSection } from '../components/plan/MergePlanSection';
import { AdvisorSection } from '../components/advisor/AdvisorSection';
import { SettingsModal } from '../components/common/SettingsModal';

type Tab = 'library' | 'routes';

const TABS: { id: Tab; label: string; hint: string }[] = [
  { id: 'library', label: '素材庫', hint: '建立 / 管理你的帕魯素材' },
  { id: 'routes', label: '配種路線', hint: '目標規劃 · 缺口分析 · 配種策略' },
];

export default function PlannerPage() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('routes');

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-50">
            Palworld Perfect Breeding Planner
          </h1>
          <p className="text-sm text-slate-400">
            幻獸帕魯後期完美詞條培育規劃器 · MVP v0.1
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="rounded-md bg-slate-700 px-2.5 py-1.5 text-sm text-slate-200 hover:bg-slate-600"
          title="設定"
        >
          ⚙ 設定
        </button>
      </header>

      <nav className="flex gap-2 border-b border-slate-700/60">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            title={t.hint}
            className={`-mb-px rounded-t-md border-b-2 px-4 py-2 text-sm font-medium transition ${
              tab === t.id
                ? 'border-accent text-accent'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'library' && (
        <div className="space-y-6">
          <MaterialLibrarySection />
          <AdvisorSection />
        </div>
      )}

      {tab === 'routes' && (
        <div className="space-y-6">
          <TargetSection />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <CoverageSection />
            <MergePlanSection />
          </div>
          <AdvisorSection />
        </div>
      )}

      <footer className="pt-4 text-center text-xs text-slate-500">
        v0.1 · 資料皆儲存在本機 localStorage
      </footer>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
