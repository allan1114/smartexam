# 🚀 GitHub Pages 部署指南

本指南說明如何將 SmartExam 部署到 GitHub Pages。

---

## 📋 前置要求

- ✅ GitHub 帳戶
- ✅ 本地已安裝 Git
- ✅ 已 clone 本倉庫
- ✅ Node.js 18+

---

## 方法 1️⃣: 自動部署（推薦）使用 GitHub Actions

### 步驟 1: 建立 GitHub Actions 工作流

創建文件 `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm install
      
      - name: Build web app
        run: npm run build:web
      
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./packages/web/dist
          cname: smartexam.example.com  # 可選：設定自訂域名
```

### 步驟 2: 推送到 GitHub

```bash
# 確保在正確的分支
git checkout main

# 添加 workflow 文件
git add .github/workflows/deploy.yml

# 提交
git commit -m "Add GitHub Pages deployment workflow"

# 推送
git push origin main
```

### 步驟 3: 配置 GitHub Pages 設定

1. 進入 GitHub 倉庫
2. 點擊 **Settings** → **Pages**
3. 在 **Branch** 下選擇 **gh-pages**
4. **Save**

#### 預期結果
✅ Actions 自動運行  
✅ 自動部署到 `https://username.github.io/smartexam`

---

## 方法 2️⃣: 手動部署

### 步驟 1: 建立本地部署腳本

創建文件 `scripts/deploy-github-pages.sh`:

```bash
#!/bin/bash
set -e

echo "🔨 Building web app..."
npm run build:web

echo "📦 Creating gh-pages branch..."
git add packages/web/dist -f
git commit -m "Deploy to GitHub Pages" || true

echo "🚀 Deploying to GitHub Pages..."
git subtree push --prefix packages/web/dist origin gh-pages

echo "✅ Deploy complete!"
echo "🌐 Check your app at: https://$(git config user.name | tr ' ' '-').github.io/smartexam"
```

### 步驟 2: 運行部署腳本

```bash
# 給予執行權限
chmod +x scripts/deploy-github-pages.sh

# 運行部署
./scripts/deploy-github-pages.sh
```

### 步驟 3: 配置 GitHub Pages（同方法 1 第 3 步）

---

## 方法 3️⃣: 使用 npm 腳本（最簡單）

### 步驟 1: 更新 package.json

在根目錄 `package.json` 添加：

```json
{
  "scripts": {
    "deploy:pages": "npm run build:web && git add packages/web/dist -f && git commit -m 'Deploy to GitHub Pages' || true && git subtree push --prefix packages/web/dist origin gh-pages"
  }
}
```

### 步驟 2: 運行部署

```bash
npm run deploy:pages
```

### 步驟 3: 配置 GitHub Pages（同方法 1 第 3 步）

---

## ⚙️ GitHub 倉庫設定

### 啟用 GitHub Pages

1. 進入倉庫 → **Settings**
2. 左邊菜單選 **Pages**
3. **Source** 下選擇：
   - **Branch**: `gh-pages`
   - **Folder**: `/ (root)`
4. 點 **Save**

### 等待部署

- 首次部署可能需要 1-5 分鐘
- 檢查 **Environments** 標籤確認部署狀態
- 看到綠色 ✅ 表示成功

---

## 🔗 訪問你的網站

部署完成後，訪問以下 URL：

```
https://username.github.io/smartexam
```

例如：
- `https://allan1114.github.io/smartexam`
- `https://myusername.github.io/smartexam`

---

## 🌐 自訂域名（可選）

如果你想使用自訂域名（例如 `smartexam.example.com`）：

### 步驟 1: 更新 DNS

在你的域名提供商添加 DNS 記錄：

```
Type: CNAME
Name: smartexam
Value: username.github.io
```

### 步驟 2: 設定 GitHub Pages

1. 進入 **Settings** → **Pages**
2. 在 **Custom domain** 輸入你的域名：`smartexam.example.com`
3. 勾選 **Enforce HTTPS**（推薦）
4. **Save**

### 步驟 3: 確認 CNAME 文件

GitHub 會自動在 `gh-pages` 分支創建 `CNAME` 文件。

---

## 🔐 環境變數設定

GitHub Pages 是**靜態部署**，無法訪問 server-side 環境變數。

### 方案 1: 使用 API Proxy（推薦）

在 `.env.local` 設定：

```
VITE_USE_GEMINI_PROXY=true
VITE_GEMINI_PROXY_URL=https://your-backend.vercel.app/api/proxy-gemini
```

### 方案 2: 直接 API Key（不推薦）

只在開發環境用，不要部署到 GitHub Pages。

---

## 🚀 自動化部署流程

### 完整流程（GitHub Actions）

```
1. Push to main branch
   ↓
2. GitHub Actions 自動觸發
   ↓
3. npm install（安裝依賴）
   ↓
4. npm run build:web（構建）
   ↓
5. 部署到 gh-pages 分支
   ↓
6. GitHub Pages 自動更新
   ↓
7. 網站在線 ✅
```

### 檢查部署狀態

```bash
# 查看 Actions 日誌
# GitHub 倉庫 → Actions 標籤 → 點擊最近的 workflow

# 查看 Environments 部署歷史
# GitHub 倉庫 → Environments 標籤 → 點擊 "github-pages"
```

---

## 🐛 故障排除

### ❌ 部署失敗

**問題**: GitHub Actions workflow 失敗

**解決方案**:
```bash
# 檢查日誌
# GitHub → Actions → 點擊失敗的 workflow → 查看詳細錯誤

# 常見原因：
# 1. 依賴安裝失敗 → 運行 npm install
# 2. 構建失敗 → 運行 npm run build:web 本地測試
# 3. Git 權限問題 → 確保 GitHub token 有效
```

### ❌ 網站顯示 404

**問題**: 訪問 GitHub Pages URL 顯示 404

**解決方案**:
```bash
# 檢查 gh-pages 分支是否存在
git branch -a | grep gh-pages

# 檢查 Settings → Pages 是否正確設定
# - Branch: gh-pages
# - Folder: / (root)

# 檢查 dist 文件夾是否推送到 gh-pages
git log --oneline -n 5 origin/gh-pages
```

### ❌ 樣式或資源未載入

**問題**: 網站載入但樣式缺失

**解決方案**:
```bash
# Vite 默認假設部署在根目錄，需要調整：

# 更新 vite.config.ts（packages/web/）
export default defineConfig({
  base: '/smartexam/',  // 添加這行
  // ... 其他配置
});

# 重新構建並部署
npm run build:web
npm run deploy:pages
```

---

## 📊 監控部署

### 查看部署日誌

```bash
# 本地檢查 gh-pages 分支
git log --oneline origin/gh-pages -n 10

# 檢查推送歷史
git reflog | grep "gh-pages"
```

### 檢查網站性能

訪問部署後的 URL，使用瀏覽器開發者工具：

- **Network 標籤**: 檢查資源載入
- **Console 標籤**: 檢查 JavaScript 錯誤
- **Performance**: 測試頁面速度

---

## ✅ 完成清單

部署 GitHub Pages 前的檢查：

- [ ] 本地 `npm run build:web` 成功
- [ ] `packages/web/dist/` 文件夾存在
- [ ] 設定 GitHub Pages（Settings → Pages）
- [ ] 選擇 `gh-pages` 分支
- [ ] Actions workflow 配置正確（如使用自動化）
- [ ] 訪問 `https://username.github.io/smartexam` 能打開
- [ ] 網站能正常運作

---

## 📚 進階配置

### 自訂 GitHub Actions

修改 `.github/workflows/deploy.yml` 添加額外步驟：

```yaml
# 添加類型檢查
- name: Type checking
  run: npm run type-check

# 添加測試
- name: Run tests
  run: npm test -- --run

# 添加 linting
- name: Lint code
  run: npm run lint || true  # 不中斷部署
```

### 設定 Vercel 備份部署

同時部署到 Vercel（更強大的功能）：

```bash
vercel --prod
```

這樣你就同時有：
- GitHub Pages（免費、簡單）
- Vercel（功能豐富、邊緣節點、環境變數支持）

---

## 🎉 完成！

部署後，你的 SmartExam 應該在線！

```
✅ 訪問: https://username.github.io/smartexam
✅ 支援離線訪問
✅ CDN 加速
✅ 自動 HTTPS
✅ 免費託管
```

有問題？查看故障排除部分或提交 GitHub Issue！
