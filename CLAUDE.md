# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 專案概述

SFDA Nexus 是一個企業級 AI 聊天系統，整合多種 AI 模型（Gemini、Ollama、OpenAI、Claude）、MCP (Model Context Protocol) 工具、智能體管理和檔案處理功能。系統採用 Vue 3 + Express + MySQL 的現代化架構。

## 開發指令

### 後端 (backend/)
```bash
npm run dev          # 開發模式 (nodemon)
npm run start        # 生產模式
npm test             # 執行測試
npm run lint         # ESLint 檢查
npm run format       # Prettier 格式化
npm run migrate      # 資料庫遷移
npm run seed         # 資料庫種子數據
```

### 前端 (frontend/)
```bash
npm run dev          # 開發伺服器 (Vite)
npm run build        # 建置生產版本
npm run preview      # 預覽建置結果
npm run lint         # ESLint 檢查
npm run format       # Prettier 格式化
```

### 測試指令
```bash
# 後端測試
cd backend && npm test
cd backend && npm run test:watch

# 各種整合測試腳本 (backend/database/scripts/)
node test_chat_api.js                    # 聊天 API 測試
node test_mcp_performance.js             # MCP 性能測試
node test_smart_chart_detection.js       # 圖表檢測測試
```

## 核心架構

### 後端服務架構
- **AI 整合層**: `ai.service.js`, `chat.service.js` - 多模型 AI 服務
- **MCP 生態系統**: `mcp.service.js`, `mcpToolParser.service.js` - Model Context Protocol 整合
- **檔案處理**: `pdf.service.js`, `excel.service.js`, `word.service.js` - 多格式檔案解析
- **智能功能**: `smartChartDetection.service.js` - AI 驅動圖表檢測
- **WebSocket**: `websocket/index.js` - 即時通信

### 前端架構
- **狀態管理**: Pinia stores (`chat.js`, `auth.js`, `models.js`)
- **組件設計**: 
  - `layout/MainLayout.vue` - 主要布局
  - `views/chat/` - 聊天介面組件
  - `components/common/` - 共用組件
- **API 層**: `api/` 目錄下的模組化 API 服務

### 資料庫設計
- 主要表格: `users`, `conversations`, `messages`, `ai_models`, `mcp_services`, `mcp_tools`
- 架構文件: `backend/database/DATABASE_SCHEMA.md`

## 關鍵功能模組

### MCP (Model Context Protocol) 整合
- MCP 客戶端實現於 `backend/src/services/mcp.service.js`
- 工具調用解析: `mcpToolParser.service.js`
- 支援外部工具和服務的動態整合

### AI 模型管理
- 支援 Ollama 本地模型和 Gemini Cloud API
- 模型配置存於資料庫 `ai_models` 表
- 動態模型切換和負載均衡

### 智能圖表系統
- AI 驅動的圖表類型檢測
- 自動統計分析和視覺化建議
- 整合 ECharts 圖表渲染

### 檔案處理管道
- 支援 PDF, Word, Excel, PowerPoint, CSV 等格式
- 智能內容提取和結構化解析
- 與 AI 對話的無縫整合

## 開發約定

### 前端開發規範 (遵循 .cursor/rules/guide-for-vue3.mdc)
- 使用 Vue 3 Composition API
- Pinia 狀態管理，檔案命名: `xxxStore.js`
- API 檔案命名: `xxxApi.js`
- 工具函數命名: `xxxUtils.js`
- 採用扁平化目錄結構

### 後端開發規範
- Express + MySQL，使用 ES modules
- 服務層模式: `xxxService.js`
- 控制器模式: `xxxController.js`
- 路由模組化: `xxxRoute.js`

### 代碼風格
- ESLint + Prettier 配置
- 使用繁體中文註釋和文檔
- API 返回格式標準化

## 環境配置

### 必要環境變數 (backend/.env)
```env
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=sfda_nexus
JWT_SECRET=your_jwt_secret
GEMINI_API_KEY=your_gemini_key
OLLAMA_BASE_URL=http://localhost:11434
```

### 資料庫要求
- MySQL 8.0+
- 初始化: `npm run migrate && npm run seed`

## 常見任務

### 新增 AI 模型
1. 更新 `backend/src/services/ai.service.js`
2. 在資料庫 `ai_models` 表新增配置
3. 前端 `stores/models.js` 同步更新

### 新增 MCP 工具
1. 實現工具邏輯於相應服務
2. 更新 `mcpToolParser.service.js` 解析規則
3. 資料庫註冊工具配置

### 檔案格式支援
1. 在 `backend/src/services/` 新增格式處理服務
2. 更新 `attachment.service.js` 路由
3. 前端 `composables/useFileType.js` 新增類型識別

## 故障排除

### 常見問題
- MCP 連接問題: 檢查 `backend/logs/` 日誌
- AI 模型錯誤: 確認 API 金鑰和服務狀態
- WebSocket 斷線: 檢查 `websocket/index.js` 配置

### 調試工具
- 後端日誌: `backend/logs/combined.log`
- 前端調試: Chrome DevTools
- 資料庫查詢: MySQL Workbench 或命令行