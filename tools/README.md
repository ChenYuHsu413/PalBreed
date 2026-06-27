# 存檔匯入工具

把 Palworld 存檔一次轉成素材庫 JSON，省去手動／截圖建庫。

## 需求
- Python 3.9+（沒有的話從 python.org 或 Microsoft Store 裝）
- `pip install palworld-save-tools`

## 存檔在哪？

- **單機 / 自己當主機**：本機
  `%LOCALAPPDATA%\Pal\Saved\SaveGames\<一串數字>\<世界資料夾>\Level.sav`
- **別人的專用伺服器（你是訪客）**：⚠ **資料在伺服器上，不在你本機**。
  需要向管理者拿那台的 `Level.sav`（位於伺服器的
  `Pal\Saved\SaveGames\0\<世界>\Level.sav`）。該檔含所有玩家的帕魯，
  跑腳本時用 `--owner <你的UID>` 篩出自己的。

建議先複製一份 `Level.sav` 出來再操作，不要動到原檔。

## 伺服器存檔：怎麼找出自己的 UID
先不帶 `--owner` 跑一次，`discovery_report.txt` 會列出每個玩家(UID)的帕魯數與幾個範例
（暱稱／物種）。認出哪組是你的，再用該 UID 加 `--owner` 跑一次即可只匯出你的帕魯。

## 第 1 趟：探查（先跑這個）
```
cd tools
python palworld_to_palbreed.py "C:\完整路徑\Level.sav"
```
（不給路徑會自動找預設位置）

產生兩個檔：
- `palbreed_import.json` — 此時只有物種＋性別，詞條還是空的
- `discovery_report.txt` — **把這份裡「✗未對照」的詞條清單貼給我**

## 第 2 趟：完成
我會給你一份 `passive_map.json`（內部名 → 詞條 id），放進 `tools/`，再跑一次同樣指令。
這次 `palbreed_import.json` 會帶上詞條，直接貼進 app 的「JSON 匯入」即可。
