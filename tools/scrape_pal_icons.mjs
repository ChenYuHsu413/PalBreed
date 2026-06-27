// 一次性：抓每隻帕魯在 PalDB 的圖示 URL，輸出 src/data/pal_icons.json
// 用法：node tools/scrape_pal_icons.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const pals = JSON.parse(readFileSync(join(HERE, '..', 'src', 'data', 'pals.json'), 'utf-8'));
const OUT = join(HERE, '..', 'src', 'data', 'pal_icons.json');
const UA = { 'User-Agent': 'Mozilla/5.0' };
const ICON_RE = /https:\/\/cdn\.paldb\.cc\/image\/Pal\/Texture\/PalIcon\/Normal\/T_[^"]+_icon_normal\.webp/g;

const slug = (nameEn) => nameEn.replace(/\s+/g, '_');
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function iconFor(p) {
  const s = slug(p.name_en);
  const tries = [s, p.paldb_id].filter((v, i, a) => v && a.indexOf(v) === i);
  for (const t of tries) {
    let html;
    try {
      const res = await fetch(`https://paldb.cc/tw/${encodeURIComponent(t)}`, { headers: UA });
      if (!res.ok) continue;
      html = await res.text();
    } catch {
      continue;
    }
    // 主圖：外層 <a href="該slug"> 包住的 img
    const heroRe = new RegExp(`href="${esc(t)}"[^>]*>\\s*<img[^>]*src="(${ICON_RE.source})"`);
    const hero = html.match(heroRe);
    if (hero) return hero[1];
    // 退而求其次：頁面上出現最多次的圖示（通常是主角）
    const all = html.match(ICON_RE);
    if (all && all.length) {
      const freq = {};
      for (const u of all) freq[u] = (freq[u] || 0) + 1;
      return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
    }
  }
  return null;
}

async function run() {
  const out = {};
  const misses = [];
  const CONC = 8;
  for (let i = 0; i < pals.length; i += CONC) {
    const batch = pals.slice(i, i + CONC);
    const results = await Promise.all(batch.map((p) => iconFor(p).then((u) => [p, u])));
    for (const [p, u] of results) {
      if (u) out[p.id] = u;
      else misses.push(p.id);
    }
    process.stdout.write(`\r${Object.keys(out).length}/${pals.length} 抓到`);
  }
  writeFileSync(OUT, JSON.stringify(out, null, 0) + '\n', 'utf-8');
  console.log(`\n完成：${Object.keys(out).length} 筆 → ${OUT}`);
  if (misses.length) console.log(`沒抓到（${misses.length}）：${misses.join(', ')}`);
}

run();
