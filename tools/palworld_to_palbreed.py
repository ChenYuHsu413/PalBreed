#!/usr/bin/env python3
"""
Palworld 存檔 → PalBreed 素材庫 JSON 轉換器（一次性建庫工具）。

用法：
    pip install palworld-save-tools

    # 單機 / 自己當主機：
    python palworld_to_palbreed.py "C:\\path\\to\\Level.sav"

    # 專用伺服器存檔（含多名玩家）：先不帶 --owner 跑一次看有哪些玩家，
    # 認出自己那組後再用該 UID 篩：
    python palworld_to_palbreed.py "Level.sav" --owner <你的PlayerUId>

不給路徑時會嘗試自動尋找 Steam 單機預設存檔位置。

輸出：
    palbreed_import.json   ← 貼進 app 的「JSON 匯入」
    discovery_report.txt   ← 列出：各玩家(OwnerUId)的帕魯數、未對照的物種 / 詞條內部名稱

對照表：
    - 物種：自動用 src/data/pals.json 的 paldb_id 比對（幾乎全自動）
    - 詞條：讀同目錄的 passive_map.json（內部名 → 我們的 passive id）
            第 1 趟通常還沒有這個檔，所有詞條會列進報告，補好後再跑第 2 趟。
"""

import argparse
import glob
import json
import os
import sys

try:
    from palworld_save_tools.gvas import GvasFile
    from palworld_save_tools.palsav import decompress_sav_to_gvas
    from palworld_save_tools.paltypes import (
        PALWORLD_CUSTOM_PROPERTIES,
        PALWORLD_TYPE_HINTS,
    )
except ImportError:
    sys.exit("請先安裝：pip install palworld-save-tools")

HERE = os.path.dirname(os.path.abspath(__file__))
PALS_JSON = os.path.join(HERE, "..", "src", "data", "pals.json")
PASSIVE_MAP_JSON = os.path.join(HERE, "passive_map.json")


def find_default_save():
    base = os.path.expandvars(r"%LOCALAPPDATA%\Pal\Saved\SaveGames")
    hits = glob.glob(os.path.join(base, "*", "*", "Level.sav"))
    return hits[0] if hits else None


def unwrap(x):
    """剝掉 palworld-save-tools 的 {'value': ...} 包裝，回傳最內層純值。"""
    seen = 0
    while isinstance(x, dict) and "value" in x and seen < 8:
        x = x["value"]
        seen += 1
    return x


def load_save(path):
    with open(path, "rb") as f:
        raw = f.read()
    gvas_data, _ = decompress_sav_to_gvas(raw)
    gvas = GvasFile.read(gvas_data, PALWORLD_TYPE_HINTS, PALWORLD_CUSTOM_PROPERTIES)
    return gvas.properties["worldSaveData"]["value"]


def iter_pals(world):
    """逐一吐出每隻帕魯的 SaveParameter dict。"""
    char_map = world["CharacterSaveParameterMap"]["value"]
    for entry in char_map:
        raw = entry["value"]["RawData"]["value"]
        params = raw.get("object", {}).get("SaveParameter", {}).get("value")
        if not isinstance(params, dict):
            continue
        if "IsPlayer" in params and unwrap(params["IsPlayer"]) is True:
            continue  # 玩家本身不是帕魯
        if "CharacterID" not in params:
            continue
        yield params


def gender_of(params):
    g = str(unwrap(params.get("Gender")))
    if "Female" in g:
        return "female"
    if "Male" in g:
        return "male"
    return "unknown"


def owner_of(params):
    return str(unwrap(params.get("OwnerPlayerUId"))) if "OwnerPlayerUId" in params else "(無主/野生)"


def nick_of(params):
    n = unwrap(params.get("NickName"))
    return str(n) if isinstance(n, str) and n else ""


def passives_of(params):
    node = params.get("PassiveSkillList")
    if node is None:
        return []
    inner = node.get("value", node) if isinstance(node, dict) else node
    values = inner.get("values", inner) if isinstance(inner, dict) else inner
    return [str(v) for v in values] if isinstance(values, list) else []


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("save", nargs="?", help="Level.sav 路徑")
    ap.add_argument("--owner", help="只匯出此 OwnerPlayerUId 的帕魯（伺服器存檔用）")
    args = ap.parse_args()

    save_path = args.save or find_default_save()
    if not save_path or not os.path.exists(save_path):
        sys.exit("找不到 Level.sav，請把路徑當參數傳入。")
    print(f"讀取存檔：{save_path}")

    with open(PALS_JSON, encoding="utf-8") as f:
        pals = json.load(f)
    species_map = {p["paldb_id"].lower(): p["id"] for p in pals if p.get("paldb_id")}

    passive_map = {}
    if os.path.exists(PASSIVE_MAP_JSON):
        with open(PASSIVE_MAP_JSON, encoding="utf-8") as f:
            passive_map = {k.lower(): v for k, v in json.load(f).items()}

    world = load_save(save_path)

    out = []
    owners = {}  # uid -> {count, samples:set}
    unmapped_species = {}
    seen_passives = {}

    for params in iter_pals(world):
        owner = owner_of(params)
        cid = str(unwrap(params["CharacterID"]))
        clean = cid[5:] if cid.upper().startswith("BOSS_") else cid
        pal_id = species_map.get(clean.lower())

        # 統計每個玩家有哪些帕魯（給你認出自己那組）
        info = owners.setdefault(owner, {"count": 0, "samples": []})
        info["count"] += 1
        if len(info["samples"]) < 6:
            label = nick_of(params) or (pal_id or clean)
            info["samples"].append(label)

        if args.owner and owner != args.owner:
            continue
        if not pal_id:
            unmapped_species[clean] = unmapped_species.get(clean, 0) + 1
            continue

        mapped = []
        for raw_p in passives_of(params):
            seen_passives[raw_p] = seen_passives.get(raw_p, 0) + 1
            pid = passive_map.get(raw_p.lower())
            if pid:
                mapped.append(pid)
        out.append({"pal_id": pal_id, "gender": gender_of(params), "passives": mapped[:4]})

    with open("palbreed_import.json", "w", encoding="utf-8") as f:
        json.dump({"pals": out}, f, ensure_ascii=False, indent=2)

    lines = [f"擷取到帕魯：{len(out)} 隻" + (f"（已篩 owner={args.owner}）" if args.owner else "")]
    lines.append("")
    lines.append(f"存檔內各玩家(OwnerPlayerUId)的帕魯：")
    for uid, info in sorted(owners.items(), key=lambda x: -x[1]["count"]):
        lines.append(f"  {uid}  → {info['count']} 隻；例：{', '.join(info['samples'])}")
    lines.append("  ↑ 認出哪組是你的，把該 UID 用 --owner 傳入再跑一次")
    lines.append("")
    lines.append(f"出現過的詞條內部名稱（{len(seen_passives)} 種）：")
    for name, n in sorted(seen_passives.items(), key=lambda x: -x[1]):
        mark = "  ✓" if name.lower() in passive_map else "  ✗未對照"
        lines.append(f"{mark}  {name}  x{n}")
    if unmapped_species:
        lines.append("")
        lines.append(f"未對照到的物種代號（{len(unmapped_species)} 種，已略過）：")
        for name, n in sorted(unmapped_species.items(), key=lambda x: -x[1]):
            lines.append(f"  {name}  x{n}")

    report = "\n".join(lines)
    with open("discovery_report.txt", "w", encoding="utf-8") as f:
        f.write(report)
    print()
    print(report)
    print()
    print("→ palbreed_import.json 已輸出（詞條需 passive_map.json 對照後才會帶入）")
    print("→ discovery_report.txt 已輸出")


if __name__ == "__main__":
    main()
