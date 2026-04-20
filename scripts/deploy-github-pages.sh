#!/bin/bash
set -e

# 顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🚀 SmartExam - GitHub Pages 部署${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"

# 檢查是否在正確的目錄
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ 錯誤: 請在項目根目錄運行此腳本${NC}"
    exit 1
fi

# 檢查 Git 配置
if [ -z "$(git config --global user.email)" ]; then
    echo -e "${RED}❌ 錯誤: 未設定 Git 用戶信息${NC}"
    echo "請先運行:"
    echo "  git config --global user.email 'your-email@example.com'"
    echo "  git config --global user.name 'Your Name'"
    exit 1
fi

echo -e "${YELLOW}📋 步驟 1: 檢查依賴...${NC}"
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}  安裝依賴...${NC}"
    npm install
else
    echo -e "${GREEN}  ✅ 依賴已安裝${NC}"
fi

echo -e "${YELLOW}📋 步驟 2: 清理舊的構建...${NC}"
rm -rf packages/web/dist
echo -e "${GREEN}  ✅ 清理完成${NC}"

echo -e "${YELLOW}📋 步驟 3: 構建 Web 應用...${NC}"
npm run build:web
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 構建失敗${NC}"
    exit 1
fi
echo -e "${GREEN}  ✅ 構建完成${NC}"

echo -e "${YELLOW}📋 步驟 4: 準備部署...${NC}"

# 檢查 gh-pages 分支是否存在
if git rev-parse --verify origin/gh-pages >/dev/null 2>&1; then
    echo -e "${GREEN}  ✅ gh-pages 分支已存在${NC}"
else
    echo -e "${YELLOW}  建立 gh-pages 分支...${NC}"
    git checkout --orphan gh-pages
    git rm -rf .
    git commit --allow-empty -m "Initial gh-pages branch"
    git push origin gh-pages
    git checkout -
    echo -e "${GREEN}  ✅ gh-pages 分支已建立${NC}"
fi

echo -e "${YELLOW}📋 步驟 5: 部署到 GitHub Pages...${NC}"

# 使用 git subtree 部署
git subtree push --prefix packages/web/dist origin gh-pages

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 部署成功！${NC}"
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}🎉 SmartExam 已部署到 GitHub Pages！${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${YELLOW}📱 訪問你的網站:${NC}"

    # 獲取 GitHub 用戶名和倉庫名
    REPO_URL=$(git config --get remote.origin.url)
    if [[ $REPO_URL == *"github.com"* ]]; then
        # 從 HTTPS URL 提取
        if [[ $REPO_URL == https* ]]; then
            REPO_NAME=$(echo $REPO_URL | sed 's/.*github.com:\/\/.*\///;s/.git$//')
        else
            # 從 SSH URL 提取
            REPO_NAME=$(echo $REPO_URL | sed 's/.*github.com://;s/.git$//')
        fi
        USERNAME=$(echo $REPO_NAME | cut -d/ -f1)
        REPONAME=$(echo $REPO_NAME | cut -d/ -f2)

        echo -e "${BLUE}  https://${USERNAME}.github.io/${REPONAME}${NC}"
        echo ""
        echo -e "${YELLOW}⏱️  提示:${NC} 首次部署可能需要 1-5 分鐘才能生效"
        echo -e "${YELLOW}  檢查 GitHub → Settings → Pages 確認部署狀態${NC}"
    fi
    echo ""
    echo -e "${YELLOW}📊 下一步:${NC}"
    echo "  1. 進入 GitHub 倉庫"
    echo "  2. Settings → Pages"
    echo "  3. 確認 Branch 設為 'gh-pages'"
    echo "  4. 等待部署完成（檢查 Environments 標籤）"
    echo "  5. 訪問上方 URL 查看網站"
    echo ""
else
    echo -e "${RED}❌ 部署失敗！${NC}"
    echo ""
    echo -e "${YELLOW}故障排除:${NC}"
    echo "  1. 確保已推送代碼到 GitHub (git push origin main)"
    echo "  2. 檢查 GitHub 設定 (Settings → Pages)"
    echo "  3. 確保選擇了 'gh-pages' 分支"
    echo "  4. 查看 git 錯誤信息上方的詳細內容"
    exit 1
fi
