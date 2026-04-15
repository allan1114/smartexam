# 🔒 SmartExam Security Guide

安全第一。本指南解釋如何安全地配置和部署 SmartExam。

## 目錄

- [API Key 管理](#api-key-管理)
- [開發設置](#開發設置)
- [生產部署](#生產部署)
- [安全檢查清單](#安全檢查清單)

---

## API Key 管理

### ⚠️ 風險：直接 API Key

當您直接在 `.env` 中放置 API key 時會發生什麼：

```javascript
// ❌ 不安全的方式
VITE_GEMINI_API_KEY=sk_xxxxxxxxxxxxx

// 結果：
// 1. Key 被編譯到 JavaScript 中
// 2. 用戶可以在瀏覽器中看到它
// 3. 任何人都可以濫用您的配額
// 4. Google 無法區分合法和惡意用戶
```

### ✅ 安全方案：後端代理

```typescript
// 架構：
瀏覽器 → /api/proxy-gemini (你的伺服器) → Google Gemini API
                     ↓
                  [驗證]
                  [速率限制]
                  [日誌]
                  [安全檢查]
```

**優點：**
- API key 永遠不離開你的伺服器
- 可以實施速率限制和監控
- 完全的使用控制權

---

## 開發設置

### 步驟 1：獲取 API Key

```bash
# 訪問 Google AI Studio
open https://aistudio.google.com/app/apikey

# 複製你的 API key
# 格式應該類似：sk_live_xxxxxxxxxxxxx
```

### 步驟 2：配置本地環境

```bash
# 複製環境範本
cp .env.example .env.local

# 編輯 .env.local
cat > .env.local << EOF
# 開發模式：直接使用 API key（僅限本地）
VITE_GEMINI_API_KEY=your_key_here

# 或啟用代理模式（如果有後端）
# VITE_USE_GEMINI_PROXY=true
# VITE_GEMINI_PROXY_URL=http://localhost:3001/api/proxy-gemini
EOF
```

### 步驟 3：驗證配置

```bash
# 啟動開發伺服器
npm run dev

# 檢查瀏覽器控制台
# ✅ 應該沒有錯誤
# ✅ 應該能夠生成問題
```

### 步驟 4：保護開發環境

```bash
# 添加到 .gitignore（確保已添加）
echo ".env.local" >> .gitignore
echo ".env.*.local" >> .gitignore

# 驗證不會提交敏感文件
git status
# 不應該看到 .env.local
```

---

## 生產部署

### 部署到 Vercel（推薦）

#### 設置步驟

**1. 啟用代理模式**

```bash
# 更新 .env.example（開發者看到的示例）
VITE_USE_GEMINI_PROXY=true
VITE_GEMINI_PROXY_URL=/api/proxy-gemini

# 提交更改
git add .env.example
git commit -m "Enable proxy mode for production"
git push
```

**2. 在 Vercel 儀表板中添加密鑰**

```
Vercel Dashboard → Select Project → Settings → Environment Variables

添加新變數：
┌─────────────────────────────────────┐
│ Name: GEMINI_API_KEY                │
│ Value: sk_xxxxxxxxxxxxx             │
│ Scope: Production ✓                 │
│ Scope: Preview (off)                │
└─────────────────────────────────────┘

📌 重要：不要在 Preview 或 Development 中暴露密鑰
```

**3. 部署**

```bash
# 推送到部署分支
git push origin main

# 或使用 Vercel CLI
vercel --prod
```

**4. 驗證部署**

```bash
# 檢查前端代碼是否暴露了密鑰
curl https://your-app.vercel.app > build.html
grep -i "sk_\|gemini.*key\|api.*key" build.html
# 應該返回空結果 ✅

# 檢查環境變數
curl https://your-app.vercel.app -I
# 應該顯示 200 OK
```

---

## 安全檢查清單

### 部署前檢查

```bash
# ✅ 確保所有敏感文件都在 .gitignore 中
cat .gitignore | grep -E "\.env|\.secret|credentials|key"

# ✅ 檢查代碼中沒有硬編碼的密鑰
grep -r "sk_\|AIza" src/ --exclude-dir=node_modules

# ✅ 驗證環境變數未在代碼中使用
grep -r "GEMINI_API_KEY" src/ | grep -v "import.meta.env"

# ✅ 檢查依賴包是否有已知漏洞
npm audit

# ✅ 運行類型檢查
npm run type-check

# ✅ 運行測試
npm run test
```

### 部署後檢查

```bash
# ✅ 驗證代理端點可訪問
curl -X POST https://your-app.vercel.app/api/proxy-gemini \
  -H "Content-Type: application/json" \
  -d '{"model":"test","contents":{}}' \
  # 應該返回 400（缺少有效密鑰）而不是 undefined

# ✅ 檢查速率限制是否有效
for i in {1..101}; do
  curl -X POST https://your-app.vercel.app/api/proxy-gemini \
    -H "Content-Type: application/json" \
    -d '{}'
done
# 第 101 個請求應該返回 429

# ✅ 監控日誌
# Vercel 儀表板 → Logs → Runtime logs
# 應該看到 Gemini API 調用被記錄

# ✅ 設置監控警報
# Vercel 儀表板 → Analytics
# 監控異常流量或錯誤率
```

---

## 常見問題

### Q: 如果有人發現我的 API key 怎麼辦？

```bash
# 立即禁用密鑰
# Google AI Studio → 刪除泄露的密鑰
# 創建新的 API key
# 在 Vercel 中更新環境變數
# 監控 Google Cloud 控制台以查看異常使用

# 估計成本損失（如果適用）
# 可能需要聯繫 Google 支援
```

### Q: 我可以限制 API key 的使用嗎？

```bash
// 可以，通過：
1. API 限制
   - Google Cloud Console → APIs & Services
   - 設置 API key 限制（應用、IP、HTTP 引用者）

2. 配額限制
   - 設置每日/每月配額
   - 設置使用警報

3. 代理速率限制
   - 編輯 api/proxy-gemini.ts
   - 調整 RATE_LIMIT 常數
```

### Q: 我應該在生產中使用直接 API key 嗎？

```
❌ 絕對不要

原因：
1. 密鑰在所有用戶瀏覽器中可見
2. 無法區分合法使用和濫用
3. 無法實施速率限制
4. 無法實現使用監控
5. 成本無法控制

✅ 始終使用代理方法
```

---

## 監控和維護

### 定期檢查

```bash
# 每週
□ 檢查 Google Cloud 使用和成本
□ 檢查 Vercel 分析
□ 查看代理日誌是否有異常

# 每月
□ 運行安全審計 (npm audit)
□ 更新依賴包
□ 審查訪問日誌
□ 驗證速率限制有效性

# 季度
□ 輪換或重新生成 API key
□ 檢查 API 配額使用趨勢
□ 更新安全策略
```

### 設置警報

```bash
# 在 Google Cloud Console 中設置預算警報
Budget → Create Budget
├── Set amount: $50/month
├── Alert threshold: 80%, 90%, 100%
└── Notification: email

# 在 Vercel 中監控性能
Analytics → Real-time metrics
├── Error rate
├── Request latency
└── Proxy response time
```

---

## 額外資源

- [Google Gemini 安全最佳實踐](https://ai.google.dev/docs/concepts/safety)
- [Vercel 環境變數文檔](https://vercel.com/docs/projects/environment-variables)
- [OWASP API 安全檢查清單](https://owasp.org/www-project-api-security/)
- [Node.js 安全檢查清單](https://nodejs.org/en/docs/guides/security/)

---

## 報告安全問題

如果您發現安全漏洞，請**不要**在 GitHub 上發佈。

相反，請發送電子郵件至：[likwokwa@gmail.com](mailto:likwokwa@gmail.com)

請提供：
- 漏洞描述
- 複現步驟
- 潛在影響
- 建議的修復方法

---

<div align="center">

**安全是每個人的責任。感謝您幫助保護 SmartExam！**

</div>
