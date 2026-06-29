# PalBreed — Palworld 完美詞條培育規劃器
<a href="https://chenyuhsu413.github.io/PalBreed/">Demo Link</a>

幫《幻獸帕魯 Palworld》後期玩家規劃「完美詞條」培育路線的純前端工具。
登錄手上的素材帕魯 → 選目標物種與想要的被動詞條 → 自動算出配種組合、合併路線、繼承機率與所需蛋數。

資料全存在瀏覽器 `localStorage`，無後端、不上傳。

## 功能

- **素材庫**：管理擁有的帕魯（物種、性別、被動詞條、標籤、成品標記），含篩選/搜尋
- **配種路線**（主體）
  - 依 PalDB 配種表列出能配出目標的**所有父母組合**
  - **性別感知**：嚴格判斷一公一母能否配對（可配 / 性別不齊 / 性別待確認 / 只有一邊）
  - **最短配種樹**：指定一個親代 + 子代，列出 3 代內所有最短路徑
  - **詞條繼承機率**：估算孵一顆蛋拿到目標詞條的機率與預期蛋數
  - 詞條缺口分析 + 跨種轉移路線
- **AI 配種建議**：讀素材庫＋目標，請 LLM 給缺口分析、清理建議與下一步配種
- **匯入**：截圖辨識（Vision）、JSON、以及讀遊戲存檔的離線工具

## 技術棧

Vite · React 18 · TypeScript · Tailwind CSS · Zustand

## 快速開始

```bash
npm install
npm run dev      # 開發，http://localhost:5173
npm run build    # 型別檢查 + 打包
```

開發伺服器透過 Vite proxy 轉發 PalDB API（見 `vite.config.ts`）。

## 設定（選用）

截圖辨識與 AI 建議需要 LLM API Key，於右上「⚙ 設定」填入，支援三家（key 只存本機）：

- **Gemini**（有免費額度）
- **Groq**（免費額度、速度快）
- **Anthropic Claude**（付費、準確）

## 從遊戲存檔批次建庫

手動一筆筆輸入很慢，可用 `tools/` 的腳本從 Palworld 存檔直接匯入，詳見 [tools/README.md](tools/README.md)。
（伺服器玩家需向管理者取得伺服器的 `Level.sav`。）

## 資料來源

帕魯／配種／圖片資料來自 [PalDB.cc](https://paldb.cc)。本專案非官方工具，與 Pocketpair 無關。
