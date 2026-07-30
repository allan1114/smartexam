# SmartExam AI - 您的個人教師

<div align="center">

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19.2.3-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-3178C6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-6.2.0-646CFF?logo=vite)
![Gemini AI](https://img.shields.io/badge/Gemini%20AI-Latest-8E75FF?logo=google)
![Status](https://img.shields.io/badge/Status-Production%20Ready-green.svg)

**AI 驅動的考試練習與學習平台**

[線上演示](https://allan1114.github.io/smartexam/) • [報告錯誤](../../issues) • [請求功能](../../issues) • [English version](README.en.md)

</div>

---

## 📚 目錄

- [🌟 功能特點](#-功能特點)
- [🚀 快速開始](#-快速開始)
- [📦 安裝](#-安裝)
- [⚙️ 配置](#️-配置)
- [🎯 使用](#-使用)
- [🏗️ 部署](#️-部署)
- [📖 文檔](#-文檔)
- [🛠️ 故障排除與除錯](#️-故障排除與除錯)
- [🤝 貢獻](#-貢獻)
- [📄 授權](#-授權)

---

## 🌟 功能特點

### 🎓 智能考試生成
- **AI 驅動的問題提取**：自動從任何文檔生成練習題目
- **多個輸入源**：上傳文件（PDF、TXT、圖像）、導入 Google Docs 或直接粘貼文本
- **可定制的考試模式**：
  - 📝 **模擬模式**：帶有自動提交的計時考試模擬
  - 🎯 **練習模式**：每個問題後即時反饋
  - 📚 **學習指南模式**：專注於詳細解釋的學習

### 🧠 高級 AI 功能
- **實時分析**：獲得對您表現的即時 AI 反饋
- **基於主題的追蹤**：按科目監控您的進度
- **掌握洞察**：由 Gemini AI 提供的深度解釋
- **有根據的證據**：每個答案都包含文檔中的源引用
- **🎯 第 3 級 - 智能重考**（新功能！）：
  - **難度追蹤**：自動將問題分類為簡單/中等/困難
  - **智能問題排序**：優先考慮薄弱環節以進行集中練習
  - **主題掌握度量**：顯示按主題的掌握百分比
  - **持久性能追蹤**：跟踪多次重考的性能
  - **目標學習**：重考首先關注困難問題

### 🎨 用戶體驗
- 🌙 **深色模式**：完整的深色模式支持
- 📱 **響應式設計**：在桌面、平板和手機上完美運行
- 📊 **進度追蹤**：可視化進度條和歷史記錄管理
- 🏆 **性能分析**：詳細的統計數據和改進建議
- 💾 **本地存儲**：您的考試歷史自動保存

### 🔧 自定義選項
- **靈活的問題格式**：多項選擇（4/5 選項）、是/否或自動檢測
- **可調整的設置**：
  - 問題數量（1-100）
  - 考試時長（30-240 分鐘）
  - 問題順序（順序/隨機）
  - 內容範圍焦點（特定頁面或章節）

### 🆕 文件管理與可靠性（最新）
- **📁 已儲存文件（免重複上傳）**：上傳或貼上過嘅文件會記入「已儲存文件」清單，下次喺主頁一鍵重開,唔使再上傳
  - 純文字／貼上內容：**完整還原**,可離線重開
  - PDF／圖像：名稱與類型存喺 localStorage,**檔案內容存喺 IndexedDB**（無 localStorage 嗰 5MB 限制）,所以上傳過嘅 PDF 會成為真正嘅「參考文件」——之後喺主頁一鍵重開就得,毋須再上傳,就算題庫快取已被淘汰亦可以由原始檔案重新抽題
  - 上限約 19MB／份；超出上限或瀏覽器唔支援 IndexedDB 時,會退回舊行為（只存中繼資料）並提示重新上傳
  - 最多保留 **20** 份,超出自動淘汰最舊嗰份
- **📄 HTML 成績報告下載**：完成考試後喺結果頁一鍵下載**自包含 HTML 報告**（內嵌 CSS、零外部資源、可離線開、可列印）,內含每題題目、你嘅作答、對／錯、正確答案、解釋、文件原文出處同總分
- **🎯 題目數量保證**：要求 40 題就出 40 題。系統會生成並去重合併題庫直到夠數;若文件真係出唔到咁多,會顯示清晰提示（而非靜靜地少出題）
- **📚 原封不動載入全部題目**：喺考試設定剔選 **Use every question**,就會用曬題庫入面文件抽取到嘅每一題,唔會抽樣、唔會被 100 題上限截住。配合 **Question Order = Sequential** 可以完全按 PDF 原本次序、原本題目與選項逐題重現整份試卷
  - 題庫面板會顯示抽取狀態：✅ 已完整抽取,或 ⚠️ 未確認完整（建議按 Regenerate 重試）
  - 若抽取未完成,開始考試時亦會有黃色提示,唔會靜靜地當作全份載入
- **🛡️ 更穩健嘅考試生成**:
  - 模型過載（429/503）**或**無效／不可用（400/404「model not found」）時自動切換到穩定備援模型
  - 每次請求設 **90 秒逾時**（AbortController）,避免連線卡死阻塞創建
  - 自動修復被截斷嘅 JSON 回應（重新平衡最後一個完整陣列元素）
  - 解析失敗時自動以較小題池**重試一次**
- **💾 考試紀錄備份**：喺主頁統計列一鍵**匯出／匯入** JSON 備份,方便跨裝置遷移或保存歷史

---

## 🚀 快速開始

### 前置要求

- **Node.js** 18.0 或更高版本
- **npm** 或 **yarn**
- **Google Gemini API 金鑰** ([在這裡取得](https://aistudio.google.com/app/apikey))

### 3 個步驟開始使用

```bash
# 1. 克隆存儲庫
git clone https://github.com/allan1114/smartexam.git
cd smartexam

# 2. 安裝依賴項
npm install

# 3. 設置環境變數
cp .env.example .env.local
# 編輯 .env.local 並添加您的 GEMINI_API_KEY

# 4. 啟動開發服務器
npm run dev
```

您的應用將在 [http://localhost:3000](http://localhost:3000) 上提供

---

## 📦 安裝

### Monorepo 結構

SmartExam 現在是一個 **monorepo**，支持 **Web** 和 **桌面 (Electron)** 應用程序，具有共享的核心代碼：

```
packages/
├── core/          # 共享代碼（組件、類型、工具、服務）
├── web/           # React Web 應用程序（Vite）
└── desktop/       # Electron 桌面應用程序
```

### 前置要求

- **Node.js** 18.0 或更高版本
- **npm** 8.0 或更高版本
- **Google Gemini API 金鑰** ([在這裡取得](https://aistudio.google.com/app/apikey))

### 安裝步驟

```bash
# 1. 克隆存儲庫
git clone https://github.com/allan1114/smartexam.git
cd smartexam

# 2. 安裝依賴項（所有工作區）
npm install

# 3. 設置環境變數
cp .env.example .env.local
# 編輯 .env.local 並添加您的 GEMINI_API_KEY
```

---

## ⚙️ 配置

### 🔐 API 金鑰管理

SmartExam 支持兩種安全的方式來配置您的 Gemini API 金鑰：

#### 方法 1️⃣：直接 API 金鑰（開發）

僅用於本地開發。API 金鑰暴露給瀏覽器：

```bash
# 1. 複製環境模板
cp .env.example .env.local

# 2. 添加您的 Gemini API 金鑰
echo "VITE_GEMINI_API_KEY=your_gemini_api_key_here" >> .env.local

# 3. 啟動開發服務器
npm run dev
```

**⚠️ 安全警告**：永遠不要將 `.env.local` 提交到版本控制。API 金鑰將在瀏覽器開發工具中對用戶可見。

---

#### 方法 2️⃣：後端代理（生產環境 - 推薦 ⭐）

使用安全的後端代理隱藏您的 API 金鑰：

```bash
# 1. 複製環境模板
cp .env.example .env.local

# 2. 啟用代理模式（開發）
echo "VITE_USE_GEMINI_PROXY=true" >> .env.local

# 3. 對於 Vercel 部署，添加服務器端環境變數：
# 轉到 Vercel Dashboard → Project Settings → Environment Variables
# 添加：GEMINI_API_KEY=your_key_here（僅服務器端）
```

**代理模式的好處**：
- ✅ API 金鑰永遠不暴露給瀏覽器
- ✅ 請求速率限制
- ✅ API 使用審計
- ✅ 更好的錯誤處理
- ✅ 生產就緒的安全性

---

### 獲取您的 Gemini API 金鑰

1. 前往 [Google AI Studio](https://aistudio.google.com/app/apikey)
2. 點擊"取得 API 金鑰"
3. 複製您的 API 金鑰
4. 將其添加到您的環境配置中

---

### 環境變數參考

| 變數 | 模式 | 值 | 需要 |
|------|------|-------|------|
| `VITE_GEMINI_API_KEY` | 開發 | 您的 API 金鑰 | 是（僅開發） |
| `VITE_USE_GEMINI_PROXY` | 兩者 | `true`/`false` | 否（預設：false） |
| `VITE_GEMINI_PROXY_URL` | 兩者 | `/api/proxy-gemini` | 否（自訂代理 URL） |
| `GEMINI_API_KEY` | 生產 | 您的 API 金鑰 | 是（僅服務器端） |

---

### 可用的腳本（根級別）

| 命令 | 說明 | 端口 |
|------|------|------|
| `npm run dev:web` | 啟動 **Web 應用** 開發服務器 | 3000 |
| `npm run dev:electron` | 啟動 **Electron 應用**（包括開發服務器） | 5173 + Electron |
| `npm run build:web` | 為生產構建 Web 應用 | - |
| `npm run build:electron` | 構建 Electron 應用（包括安裝程序） | - |
| `npm run test` | 運行所有測試（核心 + web） | - |
| `npm run type-check` | TypeScript 類型檢查 | - |
| `npm run clean` | 清理所有構建產物 | - |
| `npm run install:all` | 安裝所有工作區依賴項 | - |

---

## 🌐 Web 應用指南

### 快速開始 - Web 版本

```bash
# 啟動開發服務器（端口 3000）
npm run dev:web
```

在瀏覽器中打開 [http://localhost:3000](http://localhost:3000)。

### Web 開發

```bash
# 監視模式 - 文件更改時自動重新加載
npm run dev:web

# 類型檢查
cd packages/web && npm run type-check

# 運行測試
npm test
```

### Web 生產構建

```bash
# 構建優化的捆綁包
npm run build:web

# 預覽生產構建
cd packages/web && npm run preview
```

輸出：`packages/web/dist/`（可部署到 Vercel、Netlify 等）

### 部署 Web 應用

#### 部署到 Vercel（推薦）

```bash
# 安裝 Vercel CLI
npm i -g vercel

# 部署
vercel
```

#### 部署到 Netlify

```bash
# 安裝 Netlify CLI
npm i -g netlify-cli

# 部署
netlify deploy --prod --dir packages/web/dist
```

#### 部署到 GitHub Pages

```bash
npm run build:web
# 將 packages/web/dist 推送到 gh-pages 分支
```

---

## 🖥️ Electron（桌面）指南

### 快速開始 - Electron 桌面應用

```bash
# 啟動 Electron 開發環境
# 並行運行 Vite 開發服務器和 Electron
npm run dev:electron
```

這將：
1. 啟動 Vite 開發服務器（端口 5173）
2. 使用開發工具啟動 Electron 應用
3. 啟用 React 更改的熱重新加載

### Electron 開發

```bash
# 使用 Electron 開發工具進行開發
npm run dev:electron

# 類型檢查
cd packages/desktop && npm run type-check

# 運行測試
npm test
```

### Electron 生產構建

```bash
# 構建 Electron 應用（包括 macOS .dmg 和 Windows 安裝程序）
npm run build:electron
```

輸出：
- **macOS**: `packages/desktop/dist/SmartExam-*.dmg`
- **Windows**: `packages/desktop/dist/SmartExam-*.exe`（NSIS 安裝程序 + 便攜式）
- **Linux**: `packages/desktop/dist/smartexam-*.AppImage`

### Electron 配置

Electron 構建在 `packages/desktop/package.json` 中配置：

```json
{
  "build": {
    "appId": "com.smartexam.app",
    "productName": "SmartExam",
    "files": ["dist/**/*", "dist-electron/**/*"],
    "dmg": { /* macOS DMG 配置 */ },
    "win": { /* Windows 安裝程序配置 */ }
  }
}
```

在以下位置自訂：
- `packages/desktop/package.json` - 應用元數據和圖標
- `packages/desktop/electron/main.ts` - Electron 主程序
- `packages/desktop/vite.config.ts` - 構建配置

### 為特定平台構建

```bash
# 僅 macOS
npm run build:electron  # 在 macOS 上

# 僅 Windows
npm run build:electron  # 在 Windows 上
```

### 分發 Electron 應用

1. **簽署應用**（macOS 推薦）
2. **託管安裝程序** - 上傳到 GitHub 發布版本
3. **自動更新** - 使用 electron-updater

---

## 📊 架構比較

| 功能 | Web 應用 | 桌面 (Electron) |
|------|---------|-----------------|
| **平台** | 瀏覽器 | Windows、macOS、Linux |
| **安裝** | 無（基於 URL） | 下載並安裝 |
| **更新** | 自動 | 手動或自動更新 |
| **存儲** | localStorage | 文件系統訪問 |
| **離線** | 有限 | 完整離線支持 |
| **性能** | 良好 | 優秀 |
| **捆綁大小** | ~600KB | ~150MB（包括 Electron） |

---

## 🔄 共享代碼（packages/core）

Web 和桌面應用程序共享：

```
packages/core/src/
├── App.tsx              # 主應用組件
├── components/          # UI 組件
├── services/           # AI 服務（Gemini API）
├── types/              # TypeScript 類型
├── utils/              # 工具函數
├── __tests__/          # 測試
└── constants/          # 應用常量
```

### 運行核心測試

```bash
# 所有共享邏輯的測試
npm test

# 特定測試文件
npm test -- difficultyTracking.test.ts

# 測試覆蓋率
npm test -- --coverage
```

---

## ⚙️ 設置面板

SmartExam 包括一個全面的**設置面板**，用於在不進行代碼更改的情況下管理配置。

### 訪問設置

點擊應用標題欄右上角的**⚙️ 設置按鈕**（齒輪圖標）。

### 可用設置

#### 🔐 API 金鑰管理
- **設置/更新 API 金鑰**：直接在應用中輸入您的 Gemini API 金鑰
- **驗證**：自動驗證金鑰格式
- **安全性**：安全地存儲在瀏覽器 localStorage 中
- **清除金鑰**：選項以刪除存儲的金鑰

#### 🤖 AI 模型選擇
支援 Google AI Studio 所有 Text-out 模型：
- **Gemini 3.5 Flash** · 最新快速模型
- **Gemini 3.1 Pro** · 最新進階推理
- **Gemini 3.1 Flash Lite** · 輕量級快速
- **Gemini 3 Flash** · 熱門 Flash 模型
- **Gemini 2.5 Pro** · GA 進階模型（推薦）
- **Gemini 2.5 Flash** · GA 穩定平衡（預設）
- **Gemini 2.5 Flash Lite** · 輕量級 2.5
- **Gemini 2.0 Flash** · 可靠舊版 Flash
- **Gemini 2.0 Flash Lite** · 最便宜 2.0
- **Gemma 4 31B** · 開源備用模型

**⚡ 自動容量管理**：若選中的模型過載，應用自動切換到穩定模型（通常 `gemini-2.5-flash`），確保考試不中斷。

#### 🔄 代理配置（生產環境）
- **啟用 API 代理**：為生產部署使用後端代理
- **代理 URL**：配置自訂代理端點

#### 📋 日誌級別配置
- **DEBUG**：所有消息
- **INFO**：一般信息
- **WARN**：僅警告
- **ERROR**：僅錯誤

### 設置功能

✅ **持久存儲** - 設置保存在 localStorage 中
✅ **實時驗證** - 對輸入的即時反饋
✅ **重置選項** - 一鍵重置為預設
✅ **深色模式支持** - 設置面板適應主題

---

## 🎯 使用

### 建立您的第一次考試

1. **上傳您的材料**
   - 上傳文件（PDF、TXT 或圖像）
   - 從 Google Docs 導入
   - 或直接粘貼文本
   - 💡 之前用過嘅文件會出現喺主頁「已儲存文件」清單,一鍵重開免重複上傳

2. **配置考試設置**
   - 選擇模式：模擬、練習或學習
   - 設置問題數量和時長（系統保證出齊你要求嘅題數）
   - 選擇答案格式和順序

3. **參加考試**
   - 互動式回答問題
   - 獲得即時反饋（練習/學習模式）
   - 追蹤您的進度

4. **查看結果**
   - 詳細的性能分析
   - 基於主題的分解
   - AI 教練見解
   - 📄 點擊**下載 HTML 報告**保存／列印整份考卷（含答案與解釋）

5. **備份你嘅進度（可選）**
   - 喺主頁「Recent Progress」列點 **匯出 · Export** 下載 JSON 備份
   - 點 **匯入 · Import** 從備份還原（適合換裝置或清快取前保存）

---

## 🏗️ 部署

### 部署到 GitHub Pages

部署 SmartExam 的最簡單方法是使用 GitHub Pages 和自動 GitHub Actions 部署：

#### 自動部署（推薦 ⭐）

GitHub Actions 在每次推送到 `main` 時自動構建並部署到 GitHub Pages：

1. 只需推送到 main 分支
2. 工作流自動運行兩個部署步驟：
   - ✅ 通過 `actions/deploy-pages` 部署到 GitHub Pages
   - ✅ 同步 `packages/web/dist` 到 `gh-pages` branch（用於 branch-based source）
3. 應用發佈到 `https://allan1114.github.io/smartexam/`

**工作流細節**：`.github/workflows/deploy-github-pages.yml` 包括：
- 構建 web 應用
- 寫入 `404.html` + `.nojekyll`（SPA 路由支持）
- 上傳 Pages artifact
- 推送至 `gh-pages` branch（force-orphan，保持乾淨歷史）

#### 手動部署（備用）

```bash
# 構建 web 應用
npm run build:web

# 方法 A：推送到 gh-pages 分支
git add packages/web/dist -f
git commit -m "Deploy to GitHub Pages"
git subtree push --prefix packages/web/dist origin gh-pages

# 方法 B：使用 peaceiris/actions-gh-pages（本地）
npm install -g gh-pages
gh-pages -d packages/web/dist
```

### 部署到 Vercel（生產環境推薦）

最簡單的部署方式是使用 Vercel 和安全的 API 金鑰處理：

#### 通過 Vercel Dashboard

1. 前往 [vercel.com](https://vercel.com) 並登錄
2. 點擊 **"Add New..."** → **"Project"**
3. 導入您的 GitHub 存儲庫
4. **重要**：添加**服務器端**環境變數：
   - **名稱**：`GEMINI_API_KEY`
   - **值**：您的 Gemini API 金鑰
   - **範圍**：生產（非客戶端！）
5. 點擊 **Deploy**

#### 通過 Vercel CLI

```bash
npm i -g vercel
vercel login
vercel --prod --env GEMINI_API_KEY=your_api_key_here
```

#### 驗證安全部署

```bash
curl https://your-app.vercel.app
# 搜索頁面源 - 不應包含您的 API 金鑰 ✅
```

---

## 📖 文檔

### 項目結構

```
smartexam/
├── packages/
│   ├── core/                    # 共享庫
│   ├── web/                     # Web 應用程序（Vite）
│   └── desktop/                 # Electron 桌面應用
├── .env.example                 # 環境變數模板
├── package.json                 # 根包（工作區配置）
├── README.md                    # 本文件
└── DEPLOYMENT.md                # 部署指南
```

### 技術堆棧

- **前端**：React 19 + TypeScript + Vite
- **樣式**：Tailwind CSS
- **桌面**：Electron
- **AI**：Google Gemini API
- **Monorepo**：npm 工作區

---

## 🛠️ 故障排除與除錯

### 開啟診斷日誌

喺 **⚙️ 設置 → 📋 日誌級別** 揀 `DEBUG`,再開瀏覽器 DevTools Console 即可睇到逐步日誌（模型呼叫、備援切換、題庫存取等）。日誌帶有來源標籤,例如 `geminiService.callWithFallback`、`questionBank.appendToQuestionBank`,方便定位。

### 常見訊息與處理

| 訊息／現象 | 成因 | 處理 |
|---|---|---|
| `NETWORK_TIMEOUT: 請求超過 90s…` | 單次生成請求逾時（AbortController 上限 90 秒） | 減少題目數量或稍後再試;檢查網絡／代理 |
| `NOT_ENOUGH_QUESTIONS` | 文件內容唔夠生成所要求嘅題數 | 減少題目數量,或上傳內容更豐富嘅文件 |
| Console 出現 `Model X overloaded/unavailable — falling back to …` | 主模型過載(429/503)或無效(400/404) | 屬正常自動備援,考試會繼續;如持續發生可喺設置改揀穩定模型(如 `gemini-2.5-flash`) |
| 重開已儲存文件時提示重新上傳 | 該文件係 PDF／圖像(只存中繼資料),且題庫快取已被淘汰 | 重新上傳原檔即可 |

### 本地儲存命名空間（DevTools → Application → Local Storage）

| 鍵前綴 | 用途 | 上限 |
|---|---|---|
| `smart_exam_doclib_index` / `smart_exam_doc_*` | 已儲存文件清單與內容 | 20 份 |
| `smart_exam_bank_index` / `smart_exam_bank_*` | 題庫快取（供重考／補題） | 10 份 |
| `smart_exam_api_key` / `smart_exam_use_proxy` | API 金鑰與代理開關 | — |

> 清除呢啲鍵會重置對應功能;全部功能均為 best-effort,寫入失敗（如配額爆滿）唔會中斷上傳或考試流程。

### 針對新功能跑測試

```bash
# 已儲存文件庫
npm test -- documentLibrary.test.ts

# HTML 報告匯出
npm test -- reportExport.test.ts

# 模型錯誤分類（過載 vs 不可用）與備援
npm test -- models.test.ts

# 被截斷 JSON 的修復
npm test -- fileProcessor.test.ts
```

---

## 🤝 貢獻

歡迎貢獻！以下是您如何幫助的方式：

### 報告錯誤

- 使用 [GitHub Issues](../../issues)
- 包括詳細的重現步驟
- 如果適用，提供屏幕截圖

### 建議功能

- 使用 [GitHub Issues](../../issues)
- 清楚地描述用例

### 拉取請求

1. Fork 存儲庫
2. 創建功能分支
3. 進行更改
4. 運行測試
5. 提交並推送
6. 打開拉取請求

---

## 🔒 安全最佳實踐

### API 金鑰安全

#### 開發
```bash
# ✅ 安全：使用環境變數
VITE_GEMINI_API_KEY=sk_...

# ❌ 不安全：永遠不要硬編碼金鑰
const API_KEY = "sk_...";
```

#### 生產環境

**始終使用後端代理方法**：

1. 將 API 金鑰添加為服務器端環境變數
2. 永遠不要暴露給客戶端代碼
3. 監控使用情況並設置帳單提醒

---

## 📄 授權

本項目在 MIT 授權下 - 請參閱 [LICENSE](LICENSE) 文件以了解詳情。

---

## 🙏 致謝

- [Google Gemini AI](https://ai.google.dev/) - AI 功能
- [Vite](https://vitejs.dev/) - 構建工具
- [React](https://react.dev/) - UI 框架
- [Tailwind CSS](https://tailwindcss.com/) - 樣式

---

## 📞 支持

如果您需要幫助：

- 🐛 問題：[GitHub Issues](../../issues)

---

<div align="center">

**用 ❤️ 和 AI 構建**

</div>
