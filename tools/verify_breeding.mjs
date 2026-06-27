// Phase 1 驗證：用 CombiRank 公式重建 beckerfelipee 的 138×138 矩陣，證明公式正確。
// 來源（皆開源）：
//   Nilyang404/PalWorld-Breeding-Calculator: data.csv(power) + unique_combo.csv
//   beckerfelipee/PalworldBreedingCalculator: Data/Pals.csv(order) + Data/AllCombos.csv(答案矩陣)
// 用法：node tools/verify_breeding.mjs

const SRC = {
  data: 'https://raw.githubusercontent.com/Nilyang404/PalWorld-Breeding-Calculator/main/data.csv',
  unique: 'https://raw.githubusercontent.com/Nilyang404/PalWorld-Breeding-Calculator/main/unique_combo.csv',
  pals: 'https://raw.githubusercontent.com/beckerfelipee/PalworldBreedingCalculator/main/Data/Pals.csv',
  combos: 'https://raw.githubusercontent.com/beckerfelipee/PalworldBreedingCalculator/main/Data/AllCombos.csv',
};

const clean = (s) => s.replace(/^﻿/, '').trim();
async function get(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} → ${r.status}`);
  return (await r.text()).replace(/\r\n?/g, '\n');
}

const [dataCsv, uniqueCsv, palsCsv, combosCsv] = await Promise.all(
  Object.values(SRC).map(get)
);

// power[name] = CombiRank, order[name] = 內部順序(NO)
const power = new Map();
const order = new Map();
for (const line of dataCsv.split('\n').slice(1)) {
  if (!clean(line)) continue;
  const [no, pw, nameEn] = line.split(',');
  power.set(clean(nameEn), Number(pw));
  order.set(clean(nameEn), Number(no));
}

// 特殊配方（雙向）
const unique = new Map();
for (const line of uniqueCsv.split('\n').slice(1)) {
  if (!clean(line)) continue;
  const [a, b, child] = line.split(',').map(clean);
  unique.set(a + '|' + b, child);
  unique.set(b + '|' + a, child);
}

// 矩陣的列/欄順序
const palOrder = palsCsv.split('\n').map(clean).filter(Boolean);
// 答案矩陣
const matrix = combosCsv.split('\n').map(clean).filter(Boolean).map((r) => r.split(';').map(clean));

// 候選池：所有有 power 的帕魯，但排除「只能由特殊配方產生」的變體。
const uniqueChildren = new Set([...unique.values()]);
const candidates = [...power.keys()].filter((n) => !uniqueChildren.has(n));

function breed(a, b) {
  const u = unique.get(a + '|' + b);
  if (u) return u;
  const pa = power.get(a), pb = power.get(b);
  if (pa == null || pb == null) return null;
  const target = Math.floor((pa + pb + 1) / 2);
  let best = null, bestDiff = Infinity, bestPow = -1;
  for (const c of candidates) {
    const d = Math.abs(power.get(c) - target);
    // 平手取 CombiRank 較大者
    if (d < bestDiff || (d === bestDiff && power.get(c) > bestPow)) {
      bestDiff = d; best = c; bestPow = power.get(c);
    }
  }
  return best;
}

// 對答案
let total = 0, ok = 0;
const mismatches = [];
for (let i = 0; i < palOrder.length; i++) {
  for (let j = 0; j < palOrder.length; j++) {
    const a = palOrder[i], b = palOrder[j];
    const expected = matrix[i]?.[j];
    if (!expected) continue;
    const got = breed(a, b);
    total++;
    if (got === expected) ok++;
    else if (mismatches.length < 25) mismatches.push(`${a} × ${b} → 公式:${got}  答案:${expected}`);
  }
}

console.log(`候選池 ${candidates.length} 隻、特殊配方 ${unique.size / 2} 組`);
console.log(`矩陣比對：${ok}/${total} 吻合（${((ok / total) * 100).toFixed(2)}%）`);
if (mismatches.length) {
  console.log('\n不吻合範例：');
  mismatches.forEach((m) => console.log('  ' + m));
}
