# SmartExam AI - 您的個人教師

<div align="center">

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19.2.3-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-3178C6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-6.2.0-646CFF?logo=vite)
![Gemini AI](https://img.shields.io/badge/Gemini%20AI-Latest-8E75FF?logo=google)
![Status](https://img.shields.io/badge/Status-Production%20Ready-green.svg)

**AI 驅動的考試練習與學習平台**

[線上演示](https://allan1114.github.io/smartexam/) • [報告錯誤](../../issues) • [請求功能](../../issues) • [英文版本](README.en.md)

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
- **Gemini 3 Flash**（預設）
- **Gemini 2.0 Flash**
- **Gemini 2.0 Pro**
- **Gemini 2.0 Flash 實驗版**

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

2. **配置考試設置**
   - 選擇模式：模擬、練習或學習
   - 設置問題數量和時長
   - 選擇答案格式和順序

3. **參加考試**
   - 互動式回答問題
   - 獲得即時反饋（練習/學習模式）
   - 追蹤您的進度

4. **查看結果**
   - 詳細的性能分析
   - 基於主題的分解
   - AI 教練見解

---

## 🏗️ 部署

### 部署到 GitHub Pages

部署 SmartExam 的最簡單方法是使用 GitHub Pages 和自動 GitHub Actions 部署：

#### 自動部署（推薦）

GitHub Actions 在每次推送到 `main` 時自動構建並部署到 GitHub Pages：

1. 只需推送到 main 分支
2. 工作流運行：構建應用並部署到 `https://allan1114.github.io/smartexam/`

#### 手動部署

```bash
# 構建 web 應用
npm run build:web

# 部署到 gh-pages 分支
git add packages/web/dist -f
git commit -m "Deploy to GitHub Pages"
git subtree push --prefix packages/web/dist origin gh-pages
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

- 📧 電子郵件：[likwokwa@gmail.com](mailto:likwokwa@gmail.com)
- 🐛 問題：[GitHub Issues](../../issues)

---

<div align="center">

**用 ❤️ 和 AI 構建**

</div>
