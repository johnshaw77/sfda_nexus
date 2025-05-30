# SFDA Nexus - 企業 AI 聊天系統

## 🎯 項目概述

SFDA Nexus 是一個現代化的企業級 AI 聊天系統，提供多模型支援、智能體管理、工作流自動化等功能。

## 🏗️ 系統架構

```
sfda_nexus/
├── frontend/          # Vue 3 前端應用
├── backend/           # Node.js 後端服務
├── docs/             # 項目文檔
└── README.md         # 項目說明
```

## ✨ 主要功能

### 🎯 核心功能

- **多 AI 模型支援**: Gemini、Ollama、OpenAI、Claude
- **智能體管理**: 自定義 AI 助手和專業智能體
- **實時聊天**: WebSocket 即時通訊
- **用戶管理**: 完整的認證和授權系統
- **工作流**: 自動化任務處理（規劃中）

### 🔧 技術特性

- **前端**: Vue 3 + Ant Design Vue + Pinia
- **後端**: Node.js + Express + MySQL
- **認證**: JWT Token 管理
- **實時通訊**: WebSocket
- **資料庫**: MySQL 8.0+

## 🚀 快速開始

### 📋 環境要求

- Node.js 18+
- MySQL 8.0+
- npm 或 yarn

### 🛠️ 安裝步驟

1. **克隆項目**

```bash
git clone <repository-url>
cd sfda_nexus
```

2. **安裝依賴**

```bash
# 後端依賴
cd backend
npm install

# 前端依賴
cd ../frontend
npm install
```

3. **配置環境變數**

```bash
# 複製並編輯後端環境配置
cd backend
cp .env.example .env
# 編輯 .env 文件，配置資料庫和 API 密鑰
```

4. **設置資料庫**

```bash
# 確保 MySQL 服務運行
brew services start mysql  # macOS
# 或 sudo systemctl start mysql  # Linux

# 執行資料庫設置腳本
cd backend
node setup_database.js
```

5. **填充測試數據**

```bash
# 插入 AI 模型配置和測試數據
node seed_data.js
```

6. **啟動服務**

```bash
# 啟動後端服務
cd backend
npm start

# 啟動前端服務（新終端）
cd frontend
npm run dev
```

### 🔑 默認帳號

- **管理員**: admin / admin123
- **測試用戶**: user001-user010 / password123

## 📊 項目進度

### ✅ 已完成功能

#### 🗄️ 資料庫層 (v1.0.0)

- [x] MySQL 資料庫結構設計
- [x] 用戶管理表
- [x] AI 模型配置表
- [x] 智能體管理表
- [x] 對話和訊息表
- [x] 系統配置表
- [x] 審計日誌表

#### 🔧 後端服務 (v1.1.0)

- [x] Express 服務器架構
- [x] JWT 認證中間件
- [x] 用戶管理 API
- [x] AI 服務整合（Gemini、Ollama）
- [x] WebSocket 實時通訊
- [x] 檔案上傳處理
- [x] 錯誤處理和日誌

#### 🎨 前端基礎 (v1.2.0)

- [x] Vue 3 + Vite 項目架構
- [x] Ant Design Vue UI 組件
- [x] Pinia 狀態管理
- [x] Vue Router 路由配置
- [x] 響應式佈局系統

#### 💬 聊天系統 (v1.3.0)

- [x] 聊天界面組件
- [x] 訊息發送和接收
- [x] WebSocket 連接管理
- [x] 對話歷史記錄
- [x] 智能體選擇

#### 🔐 認證系統 (v1.4.0)

- [x] 登入頁面 (Login.vue)
- [x] 註冊頁面 (Register.vue)
- [x] 儀表板頁面 (Dashboard.vue)
- [x] 設置頁面 (Settings.vue)
- [x] 路由守衛和權限控制

#### 🗄️ 資料庫部署 (v1.5.0)

- [x] MySQL 安裝和配置
- [x] 資料庫結構創建
- [x] 管理員帳號創建
- [x] AI 模型配置插入
- [x] 系統配置初始化
- [x] 測試數據生成（10 個用戶、10 個智能體）

### 🔄 進行中功能

#### 🤖 智能體管理

- [ ] 智能體創建和編輯界面
- [ ] 智能體市場和分享
- [ ] 智能體性能分析

#### 📊 管理後台

- [ ] 用戶管理界面
- [ ] 系統監控儀表板
- [ ] 日誌查看和分析

### 📅 待開發功能

#### 🔄 工作流系統

- [ ] 工作流設計器
- [ ] 任務自動化
- [ ] 觸發器和條件

#### 🔍 搜索和分析

- [ ] 對話搜索功能
- [ ] 數據分析報表
- [ ] 使用統計

#### 🔧 系統優化

- [ ] 性能優化
- [ ] 快取機制
- [ ] 負載均衡

## 🗄️ 資料庫結構

### 核心表格

- **users**: 用戶管理
- **ai_models**: AI 模型配置
- **agents**: 智能體管理
- **conversations**: 對話記錄
- **messages**: 訊息內容
- **system_configs**: 系統配置
- **audit_logs**: 審計日誌

### 已配置的 AI 模型

1. **Gemini 2.0 Flash** (默認)
2. **Qwen 3 30B** (本地 Ollama)
3. **GPT-4 Omni** (可選)
4. **Claude 3.5 Sonnet** (可選)

### 預設智能體

- 程式碼助手
- 寫作專家
- 數據分析師
- 創意設計師
- 客服助手
- 專案經理
- 行銷專家
- 翻譯助手
- 研究助手
- 通用助手

## 🔧 開發指南

### 🏗️ 項目結構

```
backend/
├── src/
│   ├── controllers/    # 控制器
│   ├── models/        # 數據模型
│   ├── routes/        # 路由定義
│   ├── middleware/    # 中間件
│   ├── services/      # 業務邏輯
│   └── utils/         # 工具函數
├── database/          # 資料庫相關
├── uploads/           # 檔案上傳
└── logs/             # 日誌文件

frontend/
├── src/
│   ├── components/    # Vue 組件
│   ├── views/        # 頁面組件
│   ├── store/        # Pinia 狀態
│   ├── router/       # 路由配置
│   └── utils/        # 工具函數
└── public/           # 靜態資源
```

### 🔄 開發流程

1. 功能設計和 API 規劃
2. 後端 API 開發和測試
3. 前端組件開發
4. 整合測試
5. 文檔更新

## 📝 更新日誌

### v1.5.0 (2025-01-30)

- ✅ 完成資料庫部署和配置
- ✅ 安裝 MySQL 9.3.0
- ✅ 創建完整資料庫結構（10 個表格）
- ✅ 插入 AI 模型配置（4 個模型）
- ✅ 初始化系統配置（10 個配置項）
- ✅ 生成測試數據（10 個用戶、10 個智能體）
- ✅ 管理員帳號設置完成

### v1.4.0 (2025-01-30)

- ✅ 完成前端認證系統
- ✅ 登入和註冊頁面
- ✅ 儀表板系統
- ✅ 用戶設置頁面
- ✅ 路由守衛和權限控制

### v1.3.0 (2025-01-29)

- ✅ 聊天界面完成
- ✅ WebSocket 實時通訊
- ✅ 智能體選擇功能
- ✅ 對話歷史管理

### v1.2.0 (2025-01-29)

- ✅ 前端基礎架構
- ✅ Vue 3 + Ant Design Vue
- ✅ 響應式佈局系統

### v1.1.0 (2025-01-28)

- ✅ 後端 API 服務
- ✅ JWT 認證系統
- ✅ AI 服務整合

### v1.0.0 (2025-01-28)

- ✅ 項目初始化
- ✅ 資料庫結構設計
- ✅ 基礎架構搭建

## 🤝 貢獻指南

1. Fork 項目
2. 創建功能分支
3. 提交更改
4. 推送到分支
5. 創建 Pull Request

## 📄 許可證

MIT License

## 📞 聯繫方式

- 項目維護者: SFDA Team
- 郵箱: admin@sfda-nexus.com

---

**SFDA Nexus** - 讓 AI 助力企業數位轉型 🚀
