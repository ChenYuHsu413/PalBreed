// 從 PalDB 的親代計算表（pal_breed_3）抓出每隻帕魯的所有父母組合，烤成 src/data/breeding_combos.json
// 這樣執行期離線查表，結果與 PalDB 100% 一致（PalDB 是我們的標準答案）。
// 用法：node tools/build_breeding_data.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const PALS = JSON.parse(readFileSync(join(HERE, '..', 'src', 'data', 'pals.json'), 'utf-8'));
const OUT = join(HERE, '..', 'src', 'data', 'breeding_combos.json');

const toEnUrl = (n) => n.replace(/\s+/g, '_');
const enUrlToId = new Map(PALS.map((p) => [toEnUrl(p.name_en), p.id]));

// 解析 pal_breed_3 回應：每個 class="col" 區塊含 3 個 href（父A、父B、子代），值為 enUrl
function parsePairs(html) {
  const pairs = [];
  const cols = html.split('class="col">');
  for (let i = 1; i < cols.length; i++) {
    const hrefs = [...cols[i].matchAll(/href="([A-Za-z0-9_]+)"/g)].map((m) => m[1]);
    if (hrefs.length < 3) continue;
    pairs.push([hrefs[0], hrefs[1]]);
  }
  return pairs;
}

async function fetchCombos(paldbId) {
  const url = `https://paldb.cc/tw/api/pal_breed_3?child3=${encodeURIComponent(paldbId)}`;
  const res = await fetch(url, {
    headers: { 'X-Requested-With': 'XMLHttpRequest', 'User-Agent': 'Mozilla/5.0' },
  });
  if (!res.ok) return null;
  return parsePairs(await res.text());
}

async function run() {
  const out = {};
  const unmappedEnUrl = new Set();
  let totalPairs = 0;
  const CONC = 6;
  for (let i = 0; i < PALS.length; i += CONC) {
    const batch = PALS.slice(i, i + CONC);
    const results = await Promise.all(
      batch.map((p) => fetchCombos(p.paldb_id).then((pairs) => [p, pairs]))
    );
    for (const [p, pairs] of results) {
      if (!pairs || pairs.length === 0) continue;
      const seen = new Set();
      const list = [];
      for (const [aEn, bEn] of pairs) {
        const a = enUrlToId.get(aEn);
        const b = enUrlToId.get(bEn);
        if (!a) { unmappedEnUrl.add(aEn); continue; }
        if (!b) { unmappedEnUrl.add(bEn); continue; }
        const key = a < b ? `${a}|${b}` : `${b}|${a}`;
        if (seen.has(key)) continue;
        seen.add(key);
        list.push([a, b]);
      }
      if (list.length) { out[p.id] = list; totalPairs += list.length; }
    }
    process.stdout.write(`\r${Object.keys(out).length} 種已抓`);
  }
  writeFileSync(OUT, JSON.stringify(out), 'utf-8');
  console.log(`\nchild 物種：${Object.keys(out).length}，父母組合對：${totalPairs}`);
  console.log(`輸出：${OUT}（${(JSON.stringify(out).length / 1024).toFixed(0)} KB）`);
  if (unmappedEnUrl.size) console.log(`\n對不到我們 id 的 enUrl（${unmappedEnUrl.size}）：\n  ${[...unmappedEnUrl].join(', ')}`);
}

run();
