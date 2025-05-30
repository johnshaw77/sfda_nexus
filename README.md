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

#### 🎨 前端架構重構 (v1.6.0) - 2025-05-30

- [x] 前端目錄結構重新組織
- [x] 創建完整的 layout 組件系統
  - [x] AppLayout.vue - 主佈局框架
  - [x] Header.vue - 頂部導航
  - [x] Sidebar.vue - 側邊欄導航
  - [x] Footer.vue - 底部信息
- [x] 創建 UI 組件庫
  - [x] IconButton.vue - 圖標按鈕組件
  - [x] StatusTag.vue - 狀態標籤組件
- [x] 完善狀態管理系統
  - [x] models.js - AI 模型狀態管理
  - [x] agents.js - 智能體狀態管理
  - [x] workflows.js - 工作流狀態管理
  - [x] app.js - 應用全局狀態
- [x] 創建完整樣式系統
  - [x] main.css - 主樣式文件
  - [x] variables.css - CSS 變量定義
  - [x] components.css - 組件專用樣式
- [x] 用戶功能頁面
  - [x] profile.vue - 個人資料頁面
  - [x] ProfileForm.vue - 個人資料表單組件

#### 🔧 目錄結構修正 (v1.6.1) - 2025-05-30

- [x] 樣式文件位置修正
  - [x] 將 `src/styles/` 移動到 `src/assets/styles/`
  - [x] 統一樣式文件管理
- [x] 移除重複的 layout 目錄
  - [x] 刪除 `src/components/layout/` 目錄
  - [x] 統一使用 `src/layouts/` 目錄
- [x] Views 目錄結構標準化
  - [x] 所有頁面文件重命名為 `index.vue`
  - [x] 頁面組件移動到各自的 `components/` 目錄

#### 🔄 組件重組與路由優化 (v1.6.2) - 2025-05-30

- [x] 組件目錄重組
  - [x] 將 `components/ui` 移動到 `components/common`
  - [x] 將 chat 組件移動到 `views/chat/components/`
  - [x] 實現組件就近管理原則
- [x] 路由系統現代化
  - [x] 全面使用動態導入提升性能
  - [x] 修正 stores 引入路徑
  - [x] 更新所有頁面路由為 index.vue 格式

#### 🎯 側邊欄分離與頁面補全 (v1.6.3) - 2025-05-30

- [x] AppSidebar 組件創建
  - [x] 從 MainLayout 完全分離側邊欄功能
  - [x] 實現基於路由配置的自動菜單生成
  - [x] 支持動態圖標映射和權限控制
  - [x] 自動同步菜單選中狀態
- [x] 管理員頁面完整創建
  - [x] models.vue - AI 模型管理（增刪改查、測試）
  - [x] agents.vue - 智能體管理（卡片式界面）
  - [x] users.vue - 用戶管理（角色權限）
  - [x] system.vue - 系統設置（監控、日誌、配置）
- [x] 錯誤頁面
  - [x] NotFound.vue - 404 頁面
- [x] 路由系統完善
  - [x] 所有路由都有對應的頁面文件
  - [x] 智能菜單系統基於路由配置自動生成

#### 🏗️ API 架構重構 (v1.6.4) - 2025-05-30

- [x] **API 層架構建立**
  - [x] 創建統一的 axios 配置 (`api/index.js`)
  - [x] 實現請求/響應攔截器
  - [x] 自動 token 刷新機制
  - [x] 統一錯誤處理
- [x] **認證 API 模塊** (`api/auth.js`)
  - [x] 登入、註冊、登出 API
  - [x] 用戶資料管理 API
  - [x] 密碼修改和重置 API
  - [x] 郵箱驗證 API
- [x] **聊天 API 模塊** (`api/chat.js`)
  - [x] 聊天記錄和對話管理 API
  - [x] 消息發送 API
  - [x] AI 模型和智能體 API
- [x] **管理員 API 模塊** (`api/admin.js`)
  - [x] 用戶管理 API
  - [x] 模型管理 API
  - [x] 智能體管理 API
  - [x] 系統管理和統計 API
- [x] **Store 層重構**
  - [x] 移除 store 中的 axios 配置
  - [x] 所有 HTTP 請求改為調用 API 層
  - [x] 修正認證初始化函數名稱
  - [x] 統一 stores 目錄引用路徑
- [x] **路由錯誤修正**
  - [x] 修正 `authStore.handleInitialize` 函數調用
  - [x] 更新所有組件的 store 引入路徑
  - [x] 確保架構一致性
- [x] **前後端參數對齊**
  - [x] 修正登入 API 參數（`username` → `identifier`）
  - [x] 修正刷新 token 參數（`refreshToken` → `refresh_token`）
  - [x] 修正數據解構以匹配後端返回格式
  - [x] 修正 Vue 組件 v-model 錯誤

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

### 📋 待辦事項

#### 🔧 技術債務

- [ ] 完善其他 store 的 API 層調用（chat、websocket 等）
- [ ] 統一錯誤處理機制
- [ ] 添加 API 請求重試機制
- [ ] 完善 TypeScript 類型定義

#### 🧪 測試和驗證

- [ ] 後端 API 服務啟動測試
- [ ] 登入功能端到端測試
- [ ] WebSocket 連接測試
- [ ] 管理員功能權限測試

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

## 📋 更新日誌

### v1.6.9 (2025-01-27)

**個人資料頁面優化與聊天數據完善**

- 🔧 修正個人資料表單載入問題
  - 修正 `/user` 頁面中 ProfileForm 組件的數據初始化邏輯
  - 確保 authStore 完全初始化後再顯示表單
  - 添加載入狀態和錯誤處理機制
  - 優化用戶數據傳遞和響應式更新
  - 修正表單數據為空的問題，確保正確顯示用戶信息
- 🎯 完善設置頁面結構
  - 移除設置頁面中的個人資料菜單項
  - 消除功能重複，明確頁面職責分工
  - 個人資料管理統一在 `/user` 路由
  - 系統偏好設置專注在 `/settings` 路由
- 🚀 提升用戶體驗
  - 添加個人資料載入狀態提示
  - 提供重試機制處理載入失敗
  - 確保表單數據正確顯示用戶信息
  - 優化頁面載入流程和錯誤處理
- 🛠️ 調試工具完善
  - 創建 `debugAuth.js` 調試工具
  - 添加詳細的 authStore 狀態檢查功能
  - 在關鍵頁面添加調試信息輸出
  - 協助排查認證相關問題
- 💬 聊天系統數據完善
  - 修正聊天 API 認證問題，確保在 authStore 初始化後再調用
  - 統一使用 api 實例進行 HTTP 請求，確保認證頭正確設置
  - 創建聊天測試數據生成腳本 `seed_chat_data.js`
  - 生成 20 組多樣化對話主題和 120 條測試訊息
  - 涵蓋開發、健康、旅遊、教育等多個領域
  - 解決前端聊天頁面「資料庫操作失敗」錯誤
- 📁 項目結構優化
  - 創建 `backend/database/scripts/` 目錄統一管理所有資料庫腳本
  - 移動所有測試腳本（test\_\*.js）到專門目錄
  - 移動所有種子腳本（seed\_\*.js）到專門目錄
  - 移動維護腳本（reset_admin_password.js、check_admin.js）到專門目錄
  - 創建腳本目錄說明文檔，規範腳本命名和使用方式
- 🐛 修正資料庫缺失表問題
  - 發現並修正 `token_blacklist` 表缺失問題
  - 創建 `add_token_blacklist.sql` 腳本補充缺失的表結構
  - 修正 Conversation 模型中的 SQL 查詢錯誤（avatar_url → avatar）
  - 增強資料庫查詢的調試信息，便於問題排查
- 🔧 Docker MySQL 配置優化
  - 確認使用 Docker MySQL 容器而非本機服務
  - 創建 `.cursorrules` 項目規則文件
  - 記錄 Docker MySQL 的連接和操作方式
  - 建立完整的開發環境配置規範
- 📋 開發規範建立
  - 制定資料庫腳本管理規範
  - 建立 SQL 調試和錯誤處理標準
  - 確立前後端架構和代碼規範
  - 完善部署和安全配置指南

### v1.6.8 (2025-01-27)

**架構重構與組件化**

- 🏗️ 解決個人資料功能重複問題
  - 移除 settings 頁面中的重複個人資料功能
  - 統一使用 `/user` 路由的 ProfileForm.vue 組件
  - 在 settings 中添加重定向提示，引導用戶到專門的個人資料頁面
- 🧩 Settings 頁面組件化重構
  - 將 689 行的龐大 settings/index.vue 拆分為多個專門組件
  - 創建 SecuritySettings.vue（安全設置）
  - 創建 NotificationSettings.vue（通知設置）
  - 創建 AppearanceSettings.vue（外觀設置）
  - 創建 ChatSettings.vue（聊天設置）
- 📁 優化組件目錄結構
  - 新增 `frontend/src/views/settings/components/` 目錄
  - 每個設置組件職責單一，便於維護和測試
  - 主 settings 頁面作為容器，負責路由和菜單管理
- 🎯 改善用戶體驗
  - 避免功能重複，減少用戶困惑
  - 清晰的功能分離，個人資料和系統設置各司其職
  - 保持一致的設計風格和交互體驗

### v1.6.7 (2025-01-27)

**新功能與優化**

- 🎨 修正聊天頁面佈局重複問題
  - 簡化 ChatContainer 組件，移除重複的頭部和導航
  - 優化聊天頁面結構，使用統一的應用佈局
  - 改善移動端響應式設計
- 👤 增強個人資料表單功能
  - 在 ProfileForm.vue 組件中添加頭像上傳功能（base64 格式儲存）
  - 圖片格式驗證（JPG、PNG、WebP）和大小限制（5MB 原始文件）
  - 新增手機、部門、職位等字段編輯
  - 改為 Composition API 架構，提升代碼可維護性
  - 響應式設計，支持移動端操作
- 🖼️ 新增圖片壓縮工具
  - 創建 imageCompress.js 工具，智能壓縮圖片
  - 自動調整壓縮參數（目標大小 50KB，最大尺寸 300x300）
  - 保持圖片寬高比，使用高質量渲染
  - 解決資料庫 DATA_TOO_LONG 錯誤問題
- 🔧 後端支持頭像更新
  - 用戶模型支持 avatar 字段更新
  - 完善的表單驗證和錯誤處理

### v1.6.6 (2025-01-27)

**重大修正**

- 🔧 完全解決管理員登入問題
  - 修正用戶模型中的密碼哈希處理邏輯
  - 添加專用的認證查詢方法（findByUsernameForAuth、findByEmailForAuth）
  - 確保認證過程中密碼哈希字段不被移除
  - 統一資料庫查詢條件（is_active = 1）
- 🔐 優化密碼重置機制
  - 統一使用 bcryptjs 庫確保兼容性
  - 添加密碼驗證測試腳本
  - 完善錯誤診斷工具
- ✅ 驗證登入流程完整性
  - 前後端參數對齊正確
  - API 層參數轉換正常
  - 認證控制器邏輯修正
- 📝 添加詳細的調試工具
  - 創建多個測試腳本用於問題診斷
  - 完善錯誤日誌和調試信息

### v1.6.5 (2025-01-27)

**修正問題**

- 🔧 修正後端資料庫連接池初始化問題
  - 在 server.js 中添加 initializeDatabase() 調用
  - 添加資料庫連接失敗的詳細錯誤提示
  - 優化服務器優雅關閉流程
- 🎨 修正前端登入頁面排版問題
  - 重構認證路由配置，直接使用 Login/Register 組件
  - 移除重複的佈局容器，使用統一的 AuthLayout
  - 優化表單樣式和響應式設計

### v1.6.4 (2025-01-27)

**架構重構**

- 🏗️ 完成前端 API 層架構重構
  - 創建統一的 API 配置 (api/index.js)
  - 分離認證、聊天、管理員 API 模塊
  - 實現自動 token 刷新機制
- 🔧 修正前後端參數對齊問題
  - 統一登入參數格式 (username → identifier)
  - 修正 token 字段名稱對應
- 🎯 優化 Store 層架構
  - 移除 axios 配置到 API 層
  - 修正函數命名一致性
- 🐛 修正組件引用路徑問題
  - 統一 store 引入路徑 (@/stores/)
  - 修正 Vue 組件語法錯誤

### v1.6.3 (2025-01-26)

**功能完善**

- ✨ 完成聊天系統核心功能
  - 實現對話管理和消息處理
  - 添加 WebSocket 實時通信
  - 完成 AI 模型集成
- 🎨 優化用戶界面設計
  - 完善儀表板統計展示
  - 改進聊天界面交互體驗
  - 添加響應式設計支持
- 🔧 完善系統設置功能
  - 個人資料管理
  - 通知和外觀設置
  - 聊天偏好配置

### v1.6.2 (2025-01-25)

**系統優化**

- 🚀 完成管理員後台界面
  - 用戶管理功能
  - 系統監控面板
  - 模型和智能體管理
- 🔒 加強安全性措施
  - 完善權限控制系統
  - 添加審計日誌功能
  - 優化認證流程
- 📱 改進移動端適配
  - 響應式佈局優化
  - 觸控交互改進

### v1.6.1 (2025-01-24)

**基礎建設**

- 🏗️ 完成項目基礎架構搭建
  - 前後端項目結構設計
  - 資料庫結構設計和實現
  - 基礎認證系統實現
- 🎯 實現核心功能模塊
  - 用戶註冊和登入
  - 基礎聊天功能
  - 管理員權限系統
- 📚 完善開發文檔
  - API 文檔生成
  - 部署指南編寫
  - 開發規範制定

### v1.6.0 (2025-01-23)

**項目初始化**

- 🎉 項目創建和初始化
- 📋 需求分析和技術選型
- 🎨 UI/UX 設計規劃
- 🏗️ 基礎架構設計

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
