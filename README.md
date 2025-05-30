# sfda_nexus 企業 AI 聊天系統

**標語**: "Connect. Create. Collaborate."  
**定位**: 企業內部 AI 服務平台 - 管理員統一配置，員工直接使用

## 🎯 項目概述

sfda_nexus 是一個企業級 AI 聊天系統，旨在為企業提供統一的 AI 服務管理平台。系統支持多種 AI 模型整合，智能體角色配置，以及工作流程自動化，讓企業能夠高效地利用 AI 技術提升工作效率。

### ✨ 核心特色

- 🏢 **企業內部 AI 服務平台**
- 👥 **管理員統一配置，員工直接使用**
- 🤖 **預設智能體角色，標準化服務**
- 📋 **工作流程自動化**
- 🔒 **權限控制與審計**
- 🚀 **多模型支持** (Ollama + Gemini)

## 🛠️ 技術架構

### 前端技術棧

- **框架**: Vue 3 (Composition API)
- **UI 庫**: Ant Design Vue 4.x
- **狀態管理**: Pinia
- **路由**: Vue Router 4
- **HTTP 客戶端**: Axios
- **實時通信**: WebSocket
- **語言**: 純 JavaScript

### 後端技術棧

- **框架**: Node.js + Express.js
- **資料庫**: MySQL 8.0
- **ORM**: 原生 SQL (mysql2)
- **認證**: JWT
- **檔案上傳**: Multer
- **API 文檔**: Swagger
- **實時通信**: WebSocket (ws)
- **語言**: 純 JavaScript

### AI 整合

- **本地模型**: Ollama (主要)
- **雲端服務**: Google Gemini (輔助)
- **向量資料庫**: Qdrant (知識庫)
- **工具協議**: MCP (Model Context Protocol)

## 📁 項目結構

```
sfda_nexus/
├── frontend/                    # 前端應用
│   ├── src/
│   │   ├── components/         # 組件
│   │   │   ├── common/        # 通用組件
│   │   │   ├── chat/          # 聊天組件
│   │   │   ├── admin/         # 管理組件
│   │   │   └── workflow/      # 工作流組件
│   │   ├── views/             # 頁面視圖
│   │   │   ├── auth/          # 認證頁面
│   │   │   ├── dashboard/     # 儀表板
│   │   │   ├── chat/          # 聊天頁面
│   │   │   ├── admin/         # 管理頁面
│   │   │   └── settings/      # 設置頁面
│   │   ├── router/            # 路由配置
│   │   ├── store/             # 狀態管理
│   │   ├── utils/             # 工具函數
│   │   ├── assets/            # 靜態資源
│   │   └── api/               # API 接口
│   ├── public/
│   ├── package.json
│   └── vite.config.js
├── backend/                     # 後端服務
│   ├── src/
│   │   ├── controllers/       # 控制器層
│   │   ├── routes/            # 路由層
│   │   ├── services/          # 業務邏輯層
│   │   ├── models/            # 數據模型層
│   │   ├── middleware/        # 中間件
│   │   ├── utils/             # 工具函數
│   │   ├── config/            # 配置文件
│   │   ├── docs/              # API文檔
│   │   └── websocket/         # WebSocket處理
│   ├── database/              # 資料庫相關
│   │   ├── migrations/        # 資料庫遷移
│   │   └── seeds/             # 初始數據
│   ├── uploads/               # 檔案上傳目錄
│   ├── logs/                  # 日誌目錄
│   ├── tests/                 # 測試文件
│   ├── server.js              # 服務器入口
│   ├── package.json
│   └── .env.example           # 環境變量範例
├── docs/                        # 項目文檔
│   └── plan/                  # 開發計劃
├── docker-compose.yml           # Docker配置
└── README.md
```

## 🚀 快速開始

### 環境要求

- Node.js >= 18.0.0
- MySQL >= 8.0
- npm 或 yarn
- Ollama (本地 AI 模型服務)

### 安裝步驟

1. **克隆項目**

   ```bash
   git clone <repository-url>
   cd sfda_nexus
   ```

2. **後端設置**

   ```bash
   cd backend
   npm install
   cp .env.example .env
   # 配置環境變量
   npm run migrate
   npm run seed
   npm run dev
   ```

3. **前端設置**

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **AI 服務設置**

   **Ollama 安裝與配置：**

   ```bash
   # 安裝 Ollama
   curl -fsSL https://ollama.ai/install.sh | sh

   # 下載模型
   ollama pull qwen3:30b

   # 啟動服務 (通常自動啟動)
   ollama serve
   ```

   **Gemini API 配置：**

   - 前往 [Google AI Studio](https://makersuite.google.com/app/apikey)
   - 獲取 API Key
   - 在 `.env` 文件中配置 `GEMINI_API_KEY`

5. **訪問應用**
   - 前端: http://localhost:5173
   - 後端 API: http://localhost:3000
   - API 文檔: http://localhost:3000/api-docs

## 📖 開發文檔

- [項目概述](./docs/plan/01_項目概述.md)
- [前端設計規劃](./docs/plan/02_前端設計規劃.md)
- [後端設計規劃](./docs/plan/03_後端設計規劃.md)
- [資料庫設計](./docs/plan/04_資料庫設計.md)

## 🔧 開發指南

### Git 提交規範

使用繁體中文進行提交訊息：

- `feat: 新增聊天介面組件`
- `fix: 修復用戶認證問題`
- `docs: 更新API文檔`

### 編程規範

- 函數命名使用 `handleXXX` 格式
- 優先使用 Ant Design Vue 組件
- 保持代碼清晰的註解

## ✅ 已完成功能

### 🔐 JWT 認證系統

- ✅ 用戶註冊/登入/登出
- ✅ JWT Token 管理 (生成/驗證/刷新/黑名單)
- ✅ 多層級權限控制 (user/admin/super_admin)
- ✅ 會話管理 (多設備登入/強制登出)
- ✅ 安全功能 (速率限制/審計日誌/密碼加密)

### 🗄️ 資料庫架構

- ✅ 用戶管理模型 (User.model.js)
- ✅ 對話管理模型 (Conversation.model.js)
- ✅ 訊息管理模型 (Message.model.js)
- ✅ 完整的資料庫結構 (schema.sql)

### 🤖 AI 服務整合

- ✅ Ollama 本地模型支持
- ✅ Google Gemini API 整合
- ✅ 統一的 AI 模型調用介面
- ✅ Token 計算和費用統計
- ✅ 模型可用性檢查

### 💬 聊天功能

- ✅ 對話創建和管理
- ✅ 訊息發送和 AI 回應
- ✅ 對話歷史和上下文管理
- ✅ 智能體支持
- ✅ 對話歸檔和置頂

### 🌐 API 服務

- ✅ RESTful API 設計
- ✅ Swagger 完整文檔
- ✅ 中間件系統
- ✅ WebSocket 支援

## 📋 待辦事項

### 高優先級

- [ ] 前端 Vue 3 聊天介面開發
- [ ] 智能體管理功能
- [ ] 檔案上傳和多媒體支持
- [ ] 工作流程設計器

### 中優先級

- [ ] 用戶管理界面
- [ ] 系統監控面板
- [ ] 訊息搜索功能
- [ ] 導出對話記錄

### 低優先級

- [ ] 多語言支持
- [ ] 主題切換
- [ ] 插件系統
- [ ] Docker 部署配置

## 🤝 貢獻指南

1. Fork 本項目
2. 創建特性分支 (`git checkout -b feature/新功能`)
3. 提交更改 (`git commit -m 'feat: 新增某功能'`)
4. 推送到分支 (`git push origin feature/新功能`)
5. 創建 Pull Request

## 📄 許可證

[MIT License](LICENSE)

## 📞 聯繫方式

如有問題或建議，請聯繫開發團隊。
