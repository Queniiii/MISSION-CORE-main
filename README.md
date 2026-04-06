<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 專案建置與部署指南

這包含在本地運行你的應用程式與部署的所有所需資訊。

## 1. 本地運行 (Run Locally)

**前置作業:** 請確認已安裝 Node.js。

1. 安裝套件：
   ```bash
   npm install
   ```
2. 設定環境變數：將 `.env.local` 中的 `GEMINI_API_KEY` 設定為你的 Gemini API key
3. 啟動開發伺服器：
   ```bash
   npm run dev
   ```

## 2. 自動部署 (GitHub Actions)

專案內已設定好 GitHub Actions Workflow (`.github/workflows/deploy.yml`)。
只要將程式碼 push 推送到 GitHub 上的 `main` 分支，該 Workflow 就會自動啟動，並幫你把靜態檔案打包後部署上線到 **GitHub Pages**。
若要讓 Actions 正常運作，請至 GitHub 儲存庫的 **Settings > Pages** 中，將 Source 選擇為 **GitHub Actions**。

## 3. Git 忽略設定 (.gitignore)

專案已配置完整的 `.gitignore`，主要確保以下內容不會被推送到 Git：
- `node_modules/` 免除依賴庫造成的容量暴增
- `dist/`、`build/` 或 `coverage/` 打包及測試圖表檔
- `.env*` 避免暴露 API Key 等隱私權杖 (但不排除 `.env.example` 作為範本)
- `.DS_Store` 或其他 IDE 暫存檔
