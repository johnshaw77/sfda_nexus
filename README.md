# SFDA Nexus - 企業 AI 聊天系統

## 🎯 項目概述

SFDA Nexus 是一個現代化的企業級 AI 聊天系統，提供多模型支援、智能體管理、工作流自動化等功能。系統採用現代化聊天界面設計，支援多智能體選擇和實時對話。

## 🏗️ 系統架構

```
sfda_nexus/
├── frontend/          # Vue 3 前端應用
│   ├── src/
│   │   ├── layouts/   # 佈局組件（MainLayout.vue）
│   │   ├── views/     # 頁面組件
│   │   │   ├── chat/  # 聊天相關組件
│   │   │   ├── auth/  # 認證相關組件
│   │   │   └── admin/ # 管理相關組件
│   │   ├── stores/    # Pinia 狀態管理
│   │   └── api/       # API 接口層
├── backend/           # Node.js 後端服務
├── docs/             # 項目文檔
└── README.md         # 項目說明
```

## ✨ 主要功能

### 🎯 核心功能

- **現代化聊天界面**: 類似 ChatGPT 的雙層側邊欄設計
- **AI 串流回應**: 類似 ChatGPT 的逐字顯示效果，支援 Server-Sent Events (SSE)
- **多智能體支援**: 7 個專業智能體（教育、體育、營養、金融、旅遊、閱讀、商業）
- **多 AI 模型支援**: Gemini、Ollama、OpenAI、Claude
- **智能體管理**: 自定義 AI 助手和專業智能體
- **實時聊天**: WebSocket 即時通訊
- **@ 智能體提及**: 智能提及選單，支援頭像顯示
- **用戶管理**: 完整的認證和授權系統
- **工作流**: 自動化任務處理（規劃中）

### 🤖 智能體系統

- **Arthur** - 教育專家：解釋複雜概念、學習指導
- **Fred** - 體育分析師：球隊表現分析、比賽預測
- **Nikki** - 營養師：健康飲食計劃、營養分析
- **Rich** - 金融顧問：投資建議、理財規劃
- **Travis** - 旅遊專家：行程規劃、景點推薦
- **Libby** - 閱讀顧問：書籍推薦、閱讀計劃
- **Bizzy** - 商業顧問：策略分析、市場調研

### 🔧 技術特性

- **前端**: Vue 3 + Ant Design Vue + Pinia
- **後端**: Node.js + Express + MySQL
- **認證**: JWT Token 管理
- **實時通訊**: WebSocket
- **資料庫**: MySQL 8.0+
- **UI 設計**: 現代化雙層側邊欄、滑動動畫效果

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

### ✅ 最新完成功能 (v1.9.1) - 2025-06-05

#### 🔄 QuickCommands 系統重構

- [x] **資料庫結構優化**

  - [x] 移除 quick_commands 表的 category 欄位
  - [x] 移除相關索引 (idx_category)
  - [x] 保持資料完整性，現有命令不受影響
  - [x] 創建專用 SQL 腳本進行資料庫遷移

- [x] **後端代碼重構**

  - [x] 更新 QuickCommand.model.js 移除所有分類相關邏輯
  - [x] 修改 getAllQuickCommands 和 getAllQuickCommandsWithAgents 方法
  - [x] 更新 createQuickCommand 和 updateQuickCommand 方法
  - [x] 調整 quickCommands.controller.js 移除分類參數
  - [x] 更新 Swagger API 文檔移除分類相關欄位

- [x] **前端界面重構**

  - [x] 移除管理頁面的分類選擇器和過濾器
  - [x] 更新表格欄位定義，移除分類欄
  - [x] 調整表單驗證規則，移除分類必填驗證
  - [x] 重新設計搜尋區域佈局（12-8-4 Grid）
  - [x] 更新 API 調用移除分類參數

- [x] **測試驗證**

  - [x] 創建專用測試腳本驗證重構結果
  - [x] 測試所有 CRUD 操作正常運作
  - [x] 確認分類欄位完全移除
  - [x] 驗證智能體關聯功能正常
  - [x] 所有測試通過 (4/4)

- [x] **狀態切換修復 (v1.9.1)**
  - [x] 修復 getQuickCommandById 方法中遺留的 category 欄位
  - [x] 解決資料庫 0/1 與 JavaScript 布爾值比較問題
  - [x] 增強 updateQuickCommand 方法的錯誤處理
  - [x] 創建專用狀態切換測試腳本
  - [x] 所有狀態切換測試通過 (3/3)

#### 🤖 智能體系統優化 (v1.8.2)

- [x] **移除智能體狀態指示器**

  - [x] 移除 WelcomeScreen.vue 中的 status-indicator 組件
  - [x] 移除 ChatArea.vue 中的 status-dot 相關代碼
  - [x] 清理 MainLayout.vue 中已註解的狀態相關代碼
  - [x] 移除 getStatusText 方法和相關樣式

- [x] **快速命令詞修復**

  - [x] 修正前端 API 數據提取邏輯
  - [x] 更新 getAgentQuickCommands 返回 response.data.data
  - [x] 更新 getAllQuickCommands 返回 response.data.data
  - [x] 確保快速命令詞正確顯示在聊天界面

- [x] **思考模式功能**
  - [x] 在消息輸入工具欄添加思考模式切換按鈕
  - [x] 實現思考模式狀態管理和本地存儲
  - [x] 當關閉思考模式時自動在消息前添加 /no_think 前綴
  - [x] 添加思考模式的視覺指示和提示信息

#### 🎨 錯誤處理優化 (v1.8.1)

- [x] **錯誤訊息樣式修正**

  - [x] 修正錯誤訊息背景色在亮色主題下的顯示問題
  - [x] 增強錯誤檢測邏輯，支援多種錯誤模式匹配
  - [x] 添加內聯樣式確保錯誤樣式優先級
  - [x] 優化錯誤訊息的視覺效果（紅色背景和邊框）

- [x] **錯誤訊息內容精簡**
  - [x] 實現錯誤訊息智能精簡功能
  - [x] 提取 JSON 錯誤中的關鍵信息
  - [x] 移除冗長的 API 回應內容
  - [x] 保留主要錯誤描述和詳細信息

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

#### 🔧 UI/UX 優化 (v1.6.1) - 2025-01-27

- [x] 修改 AI 思考中顯示為 display_name
- [x] 優化 API 異常錯誤處理
  - [x] 添加自定義錯誤背景色變數
  - [x] 精簡異常訊息長度
  - [x] 改善錯誤提示樣式
- [x] 模型選擇器多模態支援顯示
  - [x] 在模型列表中添加多模態標籤
  - [x] 在選中模型中顯示多模態標識
  - [x] 優化多模態標籤樣式
- [x] 後端訊息查詢優化
  - [x] 修改 Message 模型查詢包含 agent display_name
  - [x] 確保前端正確顯示 agent 顯示名稱

#### 🔧 AI 模型管理系統優化 (v1.7.0) - 2025-06-06

- [x] 修正預設模型邏輯
  - [x] 確保每個提供商只能有一個預設模型
  - [x] 修正 MySQL 事務處理問題
  - [x] 添加預設模型設置的自動調用
- [x] UI 增強功能
  - [x] 添加千分位分隔符顯示（max_tokens 欄位）
  - [x] 實現互動式預設模型開關
  - [x] 添加載入狀態和錯誤處理
- [x] 模型配置修正
  - [x] 添加 Qwen 2.5-VL 7B 和 32B 多模態模型
  - [x] 修正模型多模態支援配置
- [x] 代碼架構清理
  - [x] 移除冗餘的圖標導入（12 個文件）
  - [x] 統一使用全域圖標註冊
- [x] **重大架構修正**: AI 服務參數傳遞
  - [x] 修正 AI 服務使用資料庫模型配置而非環境變數
  - [x] 更新 `callOllama`、`callGemini` 等方法支援自定義端點和 API 密鑰
  - [x] 添加詳細的調試日誌以追蹤參數傳遞
  - [x] 創建並執行測試腳本驗證修正效果
- [x] **中文字符集問題修正**
  - [x] 修正模型管理頁面中文 `display_name` 存儲亂碼問題
  - [x] 優化資料庫連接字符集配置
  - [x] 確保每個查詢都使用 `utf8mb4` 字符集
  - [x] 創建並執行中文字符集測試驗證修正效果

#### 🤖 AI 模型管理系統優化 (v1.8.0) - 2025-06-05

- [x] 模型管理界面增強
  - [x] 新增資料庫定義欄位：is_multimodal, is_default, max_tokens, temperature, top_p, capabilities
  - [x] 表格和表單完整支援所有欄位
  - [x] 三欄佈局表單設計，邏輯分組
  - [x] 數值欄位精確度修正（temperature, top_p 支援 0.01 精度）
  - [x] 前後端欄位映射修正（api_endpoint → endpoint_url, api_key → api_key_encrypted）
- [x] 配置查看功能
  - [x] JSON 配置語法高亮顯示（Shiki）
  - [x] 自動主題切換（亮色/暗色模式）
  - [x] 結構化配置展示
- [x] 預設模型業務邏輯
  - [x] 修正預設模型設置邏輯，確保每個提供商只有一個預設模型
  - [x] 事務處理優化，避免 MySQL prepared statement 問題
  - [x] 完整的預設模型切換測試驗證
- [x] UI/UX 改進
  - [x] 最大 Tokens 數值千位分隔符顯示
  - [x] 模態框關閉功能完善
  - [x] 表單驗證和錯誤處理優化

#### 🤖 AI 模型管理增強 (v1.7.0) - 2025-01-18

- [x] 模型管理界面完善
  - [x] 添加 `is_multimodal` 多模態支援欄位顯示
  - [x] 添加 `is_default` 預設模型欄位顯示
  - [x] 添加 `max_tokens` 最大 tokens 參數配置
  - [x] 添加 `temperature` 溫度參數配置
  - [x] 添加 `top_p` top_p 參數配置
  - [x] 添加 `capabilities` 能力配置欄位
- [x] 表單驗證和用戶體驗優化
  - [x] 數字輸入組件 (InputNumber) 替代普通輸入框
  - [x] 參數範圍驗證 (tokens: 1-2097152, temperature: 0-2, top_p: 0-1)
  - [x] 詳細的參數說明和提示文字
  - [x] JSON 格式驗證和錯誤提示
- [x] 配置查看功能增強
  - [x] 結構化顯示基本配置、參數配置、詳細配置和能力配置
  - [x] 美化的配置預覽界面
- [x] 代碼改進
  - [x] 統一使用 v-model 綁定替代 :value + @change 事件
  - [x] 完善數據轉換和提交邏輯
  - [x] 優化錯誤處理機制

#### 🎯 多模態聊天功能 (v1.7.0) - 2025-06-05

- [x] **文件上傳系統修復**
  - [x] 清理孤立文件記錄（16 個無效記錄）
  - [x] 修復文件物理存儲問題
  - [x] 更新訊息附件引用（11 個訊息）
- [x] **多模態 AI 支援擴展**
  - [x] 從僅支持 Gemini 擴展到 Ollama + Gemini
  - [x] 添加 Ollama 多模態格式支援（OpenAI 兼容）
  - [x] 保持 Gemini 原生多模態格式
- [x] **圖片處理流程優化**
  - [x] 圖片讀取和 base64 編碼
  - [x] 多模態消息格式轉換
  - [x] 智能文件類型檢測
- [x] **調試系統增強**
  - [x] 詳細的文件上傳日誌
  - [x] 多模態處理過程追蹤
  - [x] AI 回應內容分析
- [x] **前端圖片預覽功能**
  - [x] 拖拽上傳支援
  - [x] 圖片縮圖預覽
  - [x] "解釋此圖"快速按鈕
  - [x] 上傳後自動聚焦輸入框

#### 🔧 資料轉換工具與狀態管理修復 (v1.7.0) - 2025-06-05

- [x] 創建資料轉換工具 (`frontend/src/utils/dataConverter.js`)
  - [x] MySQL TINYINT(1) 與 JavaScript 布林值轉換
  - [x] 批量轉換物件和陣列中的布林欄位
  - [x] 模型和用戶專用的轉換函數
  - [x] 提交資料前的布林值預處理
- [x] 修復模型管理頁面狀態開關問題
  - [x] 修正 `a-switch` 組件的 `checked` 屬性綁定
  - [x] 優化 `handleStatusChange` 方法的參數處理
  - [x] 在 API 層添加資料轉換邏輯
- [x] 修復用戶管理頁面狀態開關問題
  - [x] 應用相同的布林值轉換邏輯
  - [x] 統一狀態更新處理方式
- [x] 完善 API 層的資料處理
  - [x] `models.js` - 模型相關 API 的資料轉換
  - [x] `users.js` - 用戶相關 API 的資料轉換

#### 🤖 模型選擇系統重構 (v1.7.1) - 2025-06-04

- [x] 修復模型選擇器硬編碼問題
  - [x] 移除模型分類（Premium、Intermediate、Basic）
  - [x] 簡化為統一的模型列表顯示
  - [x] 移除底部網際網路選項
- [x] 擴展 AI 提供商支援
  - [x] 新增 OpenAI 模型支援（GPT-4o、GPT-4.1、Grok 3）
  - [x] 新增 Claude 模型支援（Claude 3.5/3.7/4 Sonnet、Claude 4 Opus）
  - [x] 保持現有 Gemini 和 Ollama 支援
- [x] 資料庫模型數據擴展
  - [x] 插入 18 個全面的 AI 模型配置
  - [x] 包含模型定價、功能和元數據
  - [x] 支援四大 AI 提供商的完整模型庫
- [x] 前端組件優化
  - [x] 重構 ModelSelector.vue 組件
  - [x] 使用 Ant Design 圖標替代自定義圖標
  - [x] 修復模型對象傳遞和狀態管理
  - [x] 更新 ChatArea.vue 中的模型處理邏輯
- [x] 後端 API 增強
  - [x] 修正 handleGetAvailableModels 支援所有提供商
  - [x] 增強錯誤處理和後備機制
  - [x] 返回完整模型信息和可用性狀態
- [x] UI/UX 改進
  - [x] 修復下拉選單位置問題，強制總是向上彈出（placement="top"）
  - [x] 更改預設箭頭方向為向上（UpOutlined）
  - [x] 完全移除 calculateDropdownPlacement 函數和所有位置計算邏輯
  - [x] 簡化 handleDropdownVisibleChange，移除 nextTick 調用
  - [x] 清理不必要的引入：DownOutlined、nextTick
  - [x] 移除不必要的 CSS 動畫類和 transition 屬性
  - [x] 優化選單最大高度和滾動處理

#### 🤖 模型選擇系統重構 (v1.7.0) - 2025-06-04

- [x] 重新設計模型選擇界面
  - [x] 創建現代化 ModelSelector 組件
  - [x] 按等級分類模型（高級、中級、基礎）
  - [x] 支援多提供商圖標顯示
  - [x] 美觀的下拉選單設計
- [x] 後端模型數據優化
  - [x] 修正 handleGetAvailableModels API
  - [x] 支援四大提供商（OpenAI、Claude、Gemini、Ollama）
  - [x] 添加完整模型配置信息
- [x] 資料庫模型數據完善
  - [x] 添加高級模型：Claude 4 Sonnet、Claude 4 Opus、GPT-4o、GPT-4.1
  - [x] 添加中級模型：Claude 3.7 Sonnet、Claude 3.5 Sonnet V2
  - [x] 添加基礎模型：Llama 3.1 405B、Perplexity、Grok 3
  - [x] 總計 18 個不同等級的 AI 模型
- [x] 模型選擇邏輯優化
  - [x] 智能等級判斷（根據模型名稱）
  - [x] 自動選擇默認模型
  - [x] 優雅的錯誤處理

#### 🏗️ 後端架構重構與 API 修復 (v1.7.0) - 2025-06-04

- [x] **後端服務架構模組化重構**

  - [x] 將 monolithic admin route (873 行) 拆分為三個專門模組
  - [x] 創建 `/api/users` 用戶管理模組 - 處理用戶 CRUD、認證等
  - [x] 創建 `/api/system` 系統管理模組 - 處理系統統計、配置等
  - [x] 創建 `/api/agents` 智能體管理模組 - 處理 AI 助手管理
  - [x] 從巨大的 admin.controller.js (1150 行) 拆分為專門控制器
  - [x] 清理重複的 quickCommands 路由文件
  - [x] 採用統一的控制器結構和錯誤處理

- [x] **API 接口規範化與統一**

  - [x] 統一 RESTful API 路由結構 (從 `/api/admin/*` 改為 `/api/*`)
  - [x] 前端 API 同步更新 - 更新所有相關的 API 調用
  - [x] Swagger 文檔更新 - 59 個路由正確註冊
  - [x] 修復 `createSuccessResponse` 參數順序錯誤問題
  - [x] 統一所有控制器的響應格式，包括 QuickCommands

- [x] **前端狀態管理統一化**

  - [x] 合併 agents.js 和 adminAgents.js stores
  - [x] 統一 agents 狀態管理架構 - 一個 store 處理所有 agent 操作
  - [x] 清理重複 API 文件 - 刪除冗余的 admin.js
  - [x] 修復前端 `fetchAgentsForAdmin` 數據訪問問題

- [x] **數據查詢錯誤修復與優化**

  - [x] 修復 MySQL 查詢結果處理 - 正確處理查詢返回的對象格式
  - [x] 解決 "is not iterable" 錯誤 - 確保數組操作的安全性
  - [x] 確保查詢結果正確解析 - 從 `result.rows` 提取實際數據
  - [x] 移除不必要的 JSON.parse（MySQL JSON 字段自動解析）
  - [x] 修復 JSON 數據完整性問題 - 更新 agents 表無效 JSON tags

- [x] **架構標準化與質量提升**
  - [x] 統一錯誤處理機制 - 所有控制器使用 `catchAsync` 和標準錯誤類
  - [x] 標準化 API 響應格式 - 統一使用 `createSuccessResponse`
  - [x] 代碼模組化 - 從巨大單文件變為清晰模組結構
  - [x] 提升代碼可讀性和維護性
  - [x] 確保前後端數據交互的一致性和穩定性

#### 🔧 前端管理優化 (v1.7.0) - 2025-06-04

- [x] 模型管理頁面優化
  - [x] 移除寫死的測試數據
  - [x] 整合後端 API 拉取真實數據
  - [x] 完善 CRUD 操作與錯誤處理
  - [x] 添加模型測試功能
- [x] 聊天界面優化
  - [x] 移除重複的 ChatContainer.vue 組件
  - [x] 將功能整合到 index.vue
  - [x] 簡化組件架構
  - [x] 優化 WebSocket 事件監聽

#### 🛠️ 後端功能增強 (v1.7.0) - 2025-06-04

- [x] 實現 PRINT_SQL 環境變數控制
  - [x] 修改資料庫配置支援 PRINT_SQL 開關
  - [x] 靈活控制 SQL 調試信息輸出
  - [x] 建立測試腳本驗證功能
- [x] 新增 Gemini AI 模型支援
  - [x] Gemini 2.5 Pro 預覽版 (gemini-2.5-pro-preview-05-06)
  - [x] Gemini 2.5 Flash 預覽版 (gemini-2.5-flash-preview-05-20)
  - [x] Gemini 1.5 Flash (gemini-1.5-flash)
  - [x] Gemini 1.5 Pro (gemini-1.5-pro)
  - [x] 配置多模態和進階能力支援
- [x] 資料庫腳本管理規範化
  - [x] 建立 add_gemini_models.sql 腳本
  - [x] 建立 test_print_sql.js 測試腳本

#### 🤖 智能體系統提示詞增強 (v1.7.0) - 2025-01-27

- [x] 聊天設置工具欄添加 tooltip 提示
- [x] 聊天設置表單自動帶入智能體系統提示詞
- [x] 發送對話時支援自定義系統提示詞
- [x] 前端智能體切換時自動更新系統提示詞
- [x] 後端 API 支援 system_prompt 參數
- [x] 系統提示詞優先級：自定義 > 智能體默認
- [x] 串流模式和普通模式都支援系統提示詞

#### 🧪 測試實驗室頁面 (v1.8.5) - 2025-01-16

- [x] 創建專門的 playground 測試頁面
- [x] 實現 Markdown 輸入框和即時預覽功能
- [x] 支援程式碼塊縮排問題調試
- [x] 提供多種預設測試案例（基本縮排、混合語言、無語言標示、複雜縮排）
- [x] 整合 CodeHighlight 組件的調試功能
- [x] 支援主題切換和渲染模式切換
- [x] 添加渲染分析和統計功能
- [x] 新增 playground 路由和導航菜單項

#### 🎛️ 即時渲染切換功能 (v1.8.4) - 2025-01-16

- [x] 在 configStore 中添加即時渲染設置
- [x] 在聊天工具欄中添加切換按鈕
- [x] 修改 CodeHighlight 組件支援即時/等待渲染模式
- [x] 實現渲染模式的本地存儲持久化
- [x] 添加切換狀態的視覺反饋

#### 💻 程式碼高亮系統重構 (v1.7.0-v1.8.3) - 2025-01-16

- [x] 第一階段重構 (v1.7.0)：使用 vueuse、markdown-it 和 shiki 取代 marked + prismjs
- [x] 串流渲染優化：實現無閃爍的串流程式碼高亮
- [x] 主題系統改進：整合 app store 主題檢測
- [x] 第二階段重構 (v1.8.0)：採用 @shikijs/markdown-it 官方插件
- [x] 簡化架構：移除複雜的手動集成邏輯，大幅簡化實現
- [x] 修正顯示問題：解決上方空白、複製按鈕間距和下底線問題
- [x] 改善複製按鈕：重新設計為浮動式半透明按鈕
- [x] 主題動態切換：支援即時主題變更

- [x] 移除舊的 marked + prismjs 技術棧
- [x] 採用現代化技術棧：vueuse + markdown-it + shiki
- [x] 完全重寫 CodeHighlight.vue 組件
- [x] 支援更優質的語法高亮效果
- [x] 新增程式碼複製功能
- [x] 完善暗色/亮色主題切換
- [x] 支援串流模式渲染
- [x] 優化關鍵字高亮功能
- [x] 改善程式碼塊樣式和排版

#### 🎨 程式碼高亮系統重構 (v1.7.0) - 2025-06-02

- [x] 創建 CodeHighlight 全域組件
  - [x] 支援 Markdown 渲染和程式碼語法高亮
  - [x] 支援亮色/暗色主題自動切換
  - [x] 支援關鍵字高亮功能
  - [x] 支援串流模式下的程式碼高亮
  - [x] 整合 Prism.js 語法高亮引擎
- [x] MessageBubble 組件重構
  - [x] 移除重複的 Markdown 渲染邏輯
  - [x] 使用 CodeHighlight 組件統一處理
  - [x] 清理不再需要的樣式和函數
- [x] 全域組件註冊
  - [x] 在 main.js 中註冊 CodeHighlight 組件
  - [x] 支援在任何組件中直接使用
- [x] 功能特性
  - [x] 程式碼塊邊框和背景樣式
  - [x] 關鍵字高亮（API、JavaScript、Vue 等）
  - [x] 主題響應式切換
  - [x] 串流完成後自動觸發高亮

#### 🚀 AI 串流系統 (v1.8.0) - 2025-05-31

- [x] ChatGPT 風格串流回應
- [x] Server-Sent Events (SSE) 實現
- [x] 逐字符打字機效果
- [x] 自動滾動和內容同步
- [x] 多模型串流支援（Gemini、Ollama）
- [x] 動態模型管理系統

#### 🚀 AI 串流系統優化 (v1.8.3) - 2025-05-31

- [x] **串流停止控制**

  - 停止按鈕在整個 AI 回應過程中持續顯示
  - 改進停止邏輯，支援所有 AI 回應階段（發送中、串流中、思考中）
  - 使用 AbortController 實現串流中斷機制

- [x] **AI 思考狀態優化**

  - 發送消息後立即顯示「思考中」動畫
  - 收到第一個 AI 回應內容時自動隱藏思考狀態
  - 改進思考狀態的觸發邏輯和視覺效果

- [x] **AI 回應工具欄**

  - 在 AI 回應卡片右下方添加浮動工具欄
  - 包含複製、重新生成、引用等實用功能
  - 優雅的懸停效果和動畫交互

- [x] **快速新對話功能**

  - 在聊天輸入工具欄添加「新對話」按鈕
  - 支援一鍵創建新對話並切換
  - 自動更新側邊欄對話列表

- [x] **長內容處理改進**

  - 默認 maxTokens 提升至 8192
  - 完善 Gemini 串流生成器的完成信號處理
  - 優化串流內容的顯示邏輯

- [x] **用戶消息展開功能**
  - 長用戶消息自動折疊（6 行以上）
  - 平滑展開/收起動畫效果
  - 漸變遮罩視覺提示
- [x] models.js - AI 模型狀態管理
- [x] agents.js - 智能體狀態管理

#### 🐛 程式碼高亮系統調試功能 (v1.8.2) - 2025-06-02

- [x] **詳細調試面板實現**
  - [x] 完整顯示原始 Markdown 內容，無截斷
  - [x] 逐行字符分析，包含字符數量和類型檢測
  - [x] 自動檢測行首空白字符、TAB 字符和程式碼塊標記
  - [x] 視覺化標記可能的問題行（空白字符警告）
- [x] **HTML 和 CSS 結構分析**
  - [x] 顯示渲染後的 HTML 結構預覽
  - [x] 實時檢查 pre 和 code 元素的 CSS 樣式
  - [x] 檢測可能導致內縮的樣式屬性（text-indent、padding、margin）
- [x] **程式碼內縮問題根本解決**
  - [x] ✨ **發現根本原因**：原始 Markdown 內容中程式碼塊本身包含前導空白字符
  - [x] ✨ **實現智能去縮排**：在 Markdown 渲染前自動檢測和移除程式碼塊的共同縮排
  - [x] ✨ **保持程式碼結構**：只移除共同的前導空白，保持程式碼內部的相對縮排結構
  - [x] 正則表達式匹配所有程式碼塊（`語言\n程式碼內容`）
  - [x] 逐行分析找出最小縮排量，忽略空行
  - [x] 智能移除共同縮排，保持程式碼邏輯結構不變
- [x] **調試功能完善**
  - [x] 強制設置 `text-indent: 0 !important` 到所有相關元素（作為備用方案）
  - [x] 確保 `text-align: left !important` 防止意外對齊
  - [x] 修正 Shiki 生成的 span 元素樣式
  - [x] 清理可能的繼承樣式問題
- [x] **用戶體驗改進**
  - [x] 調試面板響應式設計，支援暗黑模式
  - [x] 結構化顯示，便於快速定位問題
  - [x] 彩色標記不同類型的分析結果
  - [x] 滾動區域限制，避免頁面過長
- [x] **進階調試工具**
  - [x] 手動檢查按鈕：重新檢查 CSS、檢查 DOM 結構、列印當前 HTML
  - [x] DOM 元素實時位置檢查，包含距離左邊界的像素距離
  - [x] 第一行文字節點詳細分析，包含 Unicode 字符檢查
  - [x] 文字節點樹遍歷，找出所有可能的空白字符來源
  - [x] 完整的 HTML 結構控制台輸出，便於開發者工具檢查
  - [x] 程式碼塊預處理過程的詳細日誌輸出
  - [x] 縮排檢測和移除過程的可視化調試信息

#### 🎨 程式碼高亮系統優化 (v1.8.1) - 2025-06-02

- [x] **程式碼塊顯示優化**
  - [x] 修正程式碼內容內縮問題，調整 padding 為 `32px 16px 16px 16px`
  - [x] 語言標籤移至左上角，使用更精緻的小圓角設計
  - [x] 採用淺色背景和邊框設計，提升視覺層次感
  - [x] 優化複製按鈕樣式，縮小圖標和字體大小
- [x] **串流渲染優化**
  - [x] 完全重寫串流邏輯，串流期間只顯示原始文字
  - [x] AI 回應完成後一次性渲染 Markdown，避免閃爍
  - [x] 簡化處理邏輯，提升效能和穩定性
- [x] **響應式設計改進**
  - [x] 移動端語言標籤保持一致的設計風格
  - [x] 調整移動端程式碼塊 padding 適配標籤位置
  - [x] 優化小螢幕下的按鈕和標籤大小

#### 🚀 AI 串流回應系統 (v1.8.0) - 2025-05-30

- [x] **後端串流處理**
  - [x] AI 服務串流支援（Ollama、Gemini）
  - [x] Server-Sent Events (SSE) 端點
  - [x] 即時事件推送系統
  - [x] 串流內容處理和狀態管理
- [x] **前端串流渲染**
  - [x] SSE 客戶端實現
  - [x] 逐字顯示動畫效果
  - [x] 串流模式切換開關
  - [x] 用戶偏好持久化
- [x] **用戶體驗優化**
  - [x] 類似 ChatGPT 的即時回應效果
  - [x] 串流狀態指示器
  - [x] 錯誤處理和重試機制
  - [x] 性能優化和記憶體管理

#### 📚 API 文件完善 (v1.8.1) - 2025-06-01

- [x] **Swagger 文件更新**
  - [x] 串流 API 端點文件化
  - [x] Server-Sent Events 格式說明
  - [x] 串流事件類型定義
  - [x] 完整的請求/回應範例
- [x] **路由架構清理**
  - [x] 移除重複的 chat.routes.js 檔案
  - [x] 統一使用 chat.route.js
  - [x] 確保路由正確註冊和測試

#### 🔧 串流功能修正與模型管理 (v1.8.2) - 2025-06-01

- [x] **Gemini 串流修正**
  - [x] 修正 Gemini 串流生成器的 model 參數傳遞問題
  - [x] 解決 "model is not defined" 錯誤
  - [x] 完善 CORS 配置以支援 SSE 請求
- [x] **前端自動滾動優化**
  - [x] 增強串流訊息的自動滾動功能
  - [x] 深度監聽訊息陣列變化
  - [x] 串流模式下持續滾動到底部
- [x] **動態模型管理**
  - [x] 確認模型從資料庫動態載入
  - [x] 添加新的 Ollama 模型支援
  - [x] DeepSeek R1 32B 和 Gemma 3 27B 模型配置

#### 💬 聊天系統增強 (v1.7.0) - 2024-12-21

- [x] **@ 智能體提及系統**
  - [x] 智能提及選單，支援頭像顯示
  - [x] 限制每條消息只能 @ 一個智能體
  - [x] 智能定位選單（自動判斷上/下方顯示）
- [x] **聊天系統調試與修復**
  - [x] 解決 MessageBubble 組件命名衝突問題
  - [x] 修復前端 v-model 輸入問題
  - [x] 優化快速提示功能（不自動發送，支援繼續編輯）
- [x] **代碼清理與優化**
  - [x] 移除所有調試代碼，保持組件清潔
  - [x] 統一使用 Ant Design Vue 的 message 組件
  - [x] 完善錯誤處理和用戶反饋

#### 🐛 聊天系統調試與修復 (v1.7.0) - 2025-06-01

- [x] 修復後端 AI 模型調用問題
  - [x] 解決 MessageModel.create 事務問題
  - [x] 修復 findById 在事務中的連接問題
  - [x] 添加詳細的 AI 回應調試日誌
- [x] 修復前端消息顯示問題
  - [x] 解決 MessageBubble 組件命名衝突
  - [x] 修復 Vue 響應式更新問題
  - [x] 恢復完整的消息氣泡功能
- [x] 優化用戶體驗
  - [x] 修復消息輸入框無法打字問題
  - [x] 快速提示不自動發送，允許繼續編輯
  - [x] 添加輸入框自動 focus 功能
- [x] 實現智能體 @ 提及功能
  - [x] 自定義 @ 選單（帶頭像）
  - [x] 智能位置判斷（上方/下方）
  - [x] 限制每條消息只能 @ 一個智能體
  - [x] 從 store 動態載入智能體數據

#### 🌙 暗黑模式修復 (v1.6.2) - 2025-01-15

- [x] 修復 Admin 頁面暗黑模式顯示問題
- [x] 創建統一的 admin.css 樣式文件
- [x] 使用 CSS 變數替代硬編碼顏色值
- [x] 修復頁面背景色適應主題
- [x] 修復 Sidebar 底部系統狀態顏色
- [x] 統一所有 admin 頁面的 CSS 類名
- [x] 完善 Ant Design 組件的暗黑模式覆蓋樣式
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

#### ✅ 最近完成 (v1.7.0 - 2025-06-04)

- [x] **後端架構重構** - 完成 monolithic 到模組化的重大重構
- [x] **API 格式統一** - 修復所有 `createSuccessResponse` 參數順序問題
- [x] **數據查詢修復** - 解決 MySQL 查詢結果格式錯誤 (`rows` vs `data`)
- [x] **JSON 字段優化** - 移除不必要的 JSON.parse，利用 MySQL 自動解析
- [x] **前端狀態統一** - 合併重複的 store，統一架構模式
- [x] **QuickCommands 標準化** - 統一錯誤處理和響應格式
- [x] **JSON 數據修復** - 清理 agents 表中的無效 JSON 字段

#### 🔧 技術債務

- [ ] 完善其他 store 的 API 層調用（chat、websocket 等）
- [ ] 添加 API 請求重試機制
- [ ] 完善 TypeScript 類型定義
- [ ] **程式碼高亮內縮問題**：部分程式碼塊首行仍有輕微內縮，需要深入研究 Shiki 渲染機制和 CSS 繼承關係

#### 🧪 測試和驗證

- [ ] 後端 API 服務啟動測試
- [ ] 登入功能端到端測試
- [ ] WebSocket 連接測試
- [ ] 管理員功能權限測試

#### 🤖 智能體管理系統 (v1.7.0) - 2025-05-31

- [x] 管理員菜單整合
  - [x] 在 AdminLayout.vue 中添加智能體管理菜單項
  - [x] 使用 RobotOutlined 圖標
  - [x] 配置路由映射和導航
- [x] 後端 API 完善
  - [x] 創建管理員專用智能體 API 路由 (`/api/admin/agents`)
  - [x] 實現完整的 CRUD 操作（創建、讀取、更新、刪除、複製）
  - [x] 添加速率限制中間件 (`rateLimit.middleware.js`)
  - [x] 整合原有管理員路由到統一的 `admin.route.js`
- [x] 前端智能體管理
  - [x] 創建專用的管理員智能體 store (`adminAgents.js`)
  - [x] 修改智能體管理頁面使用管理員 API
  - [x] 實現頭像上傳功能（參考 ProfileForm.vue）
  - [x] 添加搜索、篩選和分頁功能
  - [x] 完善表單驗證和錯誤處理
- [x] 頭像上傳系統
  - [x] 在編輯表單中集成頭像上傳區域
  - [x] 支持圖片壓縮和格式驗證
  - [x] 實時預覽和移除功能
  - [x] 響應式設計適配

#### 🔧 智能體表單修復 (v1.7.1) - 2025-05-30

- [x] 資料庫 Schema 一致性修復
  - [x] 修正前端表單字段與資料庫 agents 表定義不一致問題
  - [x] 移除前端 `config` 字段，改為 `tags`, `capabilities`, `tools`
  - [x] 添加 `is_public` 字段支持
  - [x] 更新後端驗證規則與資料庫 schema 完全對應
- [x] 表單驗證優化
  - [x] 修復後端 `category` 字段驗證被註釋的問題
  - [x] 添加 "general" 分類選項和相關顯示邏輯
  - [x] 確保 `model_id` 字段類型轉換（字符串 → 數字）
  - [x] 完善前端表單驗證規則，與後端保持一致
- [x] 錯誤處理改進
  - [x] 前端顯示詳細的後端驗證錯誤訊息
  - [x] JSON 字段格式驗證和錯誤提示
  - [x] 改善用戶體驗，提供清晰的錯誤反饋
- [x] 數據處理優化
  - [x] 正確處理 JSON 字段的序列化和反序列化
  - [x] 編輯時正確顯示 JSON 數據格式
  - [x] 提交時確保數據類型正確性
- [x] 布爾值驗證修復
  - [x] 修復 `is_active`, `is_public` 字段驗證，支持 0/1 和 true/false
  - [x] 添加數據轉換邏輯，確保數據庫存儲的一致性
  - [x] 更新創建和編輯智能體的數據處理邏輯
- [x] 表單字段驗證完善
  - [x] 修復 "id is not allowed" 錯誤，在 updateAgent schema 中正確處理 id 字段
  - [x] 添加所有可能的只讀字段到驗證 schema，使用 strip() 忽略不需要更新的字段
  - [x] 解決前端發送完整智能體對象時的驗證問題
- [x] 頭像顯示修復
  - [x] 修正智能體卡片中的頭像顯示邏輯，正確處理 base64 圖片數據
  - [x] 移除錯誤的 avatar.color 和 avatar.icon 邏輯
  - [x] 確保更新後重新獲取數據以顯示最新頭像

### 🔄 待辦事項

#### 🚧 近期計劃

- [ ] 智能體管理優化
  - [ ] 批量操作功能（批量啟用/停用）
  - [ ] 智能體使用統計和分析
  - [ ] 智能體模板系統
- [ ] 用戶管理完善
  - [ ] 用戶角色權限細化
  - [ ] 用戶活動監控
  - [ ] 批量用戶操作
- [ ] 系統監控
  - [ ] 實時系統狀態監控
  - [ ] 性能指標收集
  - [ ] 錯誤日誌分析

#### 🎯 中期目標

- [ ] 工作流系統
  - [ ] 可視化工作流編輯器
  - [ ] 自動化任務調度
  - [ ] 條件分支和循環
- [ ] 高級聊天功能
  - [ ] 文件上傳和處理
  - [ ] 語音輸入支持
  - [ ] 多媒體消息
- [ ] 企業集成
  - [ ] SSO 單點登錄
  - [ ] LDAP 用戶同步
  - [ ] API 接口開放

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

### 預設智能體 (暫訂)

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

## 版本信息

**當前版本：v1.8.0**
**更新日期：2025-06-04**

### v1.8.3 更新內容（2025-06-04）
- ✅ **模型更新布林值修復** - 解決前端無法更新模型狀態問題
  - 修復 `handleUpdateModel` 函數中的布林值處理邏輯
  - 添加 JavaScript 布林值到 MySQL 數字的轉換
  - 確保 `is_active`、`is_default`、`is_multimodal` 字段正確更新
  - 解決前端發送 `true`/`false` 但資料庫期望 `1`/`0` 的兼容性問題

### v1.8.2 更新內容（2025-06-04）
- ✅ **後端架構重構** - 完成管理模組的模組化拆分
  - 清理重複文件：移除 quickCommands.routes.js
  - 拆分巨大的 admin.controller.js (1150行) 為三個專門模組
  - 創建 users.controller.js - 用戶管理功能
  - 創建 system.controller.js - 系統管理功能
  - 創建 agents.controller.js - 代理管理功能
  - 重構 admin.route.js 為模組化路由系統
  - 建立清晰的路由結構：/users, /system, /agents
  - 更新 index.route.js 主路由配置
  - 修正所有導入路徑和 Swagger API 文檔
  - 保持所有原有功能：速率限制、認證授權、審計日誌

### v1.8.1 更新內容（2025-06-04）
- ✅ **AI 模型管理系統** - 完整的模型 CRUD 管理功能
  - 實現完整的 MVC 架構（Model/Controller/Route層）
  - 創建 11 個核心資料庫操作方法
  - 支援按提供商分組查詢和統計
  - 實現模型測試和可用性同步功能
  - 添加完整的 Swagger API 文檔
  - 統一 response 和錯誤處理工具

### v1.8.0 更新內容（2025-06-04）
- ✅ **動態快速命令系統** - 完成前後端整合
  - 新增快速命令數據庫表結構
  - 實現後端 API 控制器和路由
  - 完成前端動態載入和顯示快速命令
  - 支援使用次數統計和智能體個性化
  - 替換硬編碼快速命令為資料庫驅動的動態系統

### v1.7.0 更新內容（2025-06-04）
- ✅ **PRINT_SQL 環境變數控制** - 靈活管理 SQL 調試輸出
- ✅ **新增 Gemini AI 模型** - 添加 4 個新的 Gemini 模型支援
- ✅ **中文字符編碼修復** - 解決資料庫中文顯示問題

## 功能特性

### 核心功能
- 🤖 **多智能體聊天** - 支援多種專業領域的 AI 智能體
- 🔄 **多模型支援** - 整合 Ollama 和 Gemini AI 模型
- 💬 **實時對話** - WebSocket 實時通訊和串流響應
- 📊 **對話管理** - 完整的對話歷史和管理功能
- ⚡ **動態快速命令** - 基於資料庫的個性化快速命令系統

### 智能體系統
- 🎓 **Arthur** - 教育專家，專精知識講解和學習指導
- 🏃 **Fred** - 體育分析師，提供運動數據和比賽分析
- 🥗 **Nikki** - 營養師，制定健康飲食計劃和營養建議
- 💰 **Rich** - 金融顧問，提供投資理財和市場分析
- ✈️ **Travis** - 旅遊專家，規劃行程和推薦景點
- 📚 **Libby** - 閱讀顧問，推薦書籍和制定閱讀計劃
- 💼 **Bizzy** - 商業分析師，提供商業策略和市場調研

### 技術特性
- 🔐 **用戶認證** - JWT Token 認證和權限管理
- 🛡️ **安全機制** - Token 黑名單和密碼加密
- 📱 **響應式設計** - 支援多種設備和螢幕尺寸
- 🎨 **現代 UI** - 基於 Ant Design Vue 的美觀界面
- 🐳 **Docker 支援** - 容器化部署和開發環境

#### 🔧 程式碼優化 (v1.9.2) - 2025-01-02

- [x] 移除前端硬編碼的智能體快速提示，統一使用資料庫動態載入
- [x] 修正後端 models.controller.js 和 Model.model.js 中的欄位錯誤
  - [x] 將所有 `available` 參數統一修正為 `is_active`（對應資料庫實際欄位）
  - [x] 移除重複的 `active` 參數，簡化 API 參數結構
  - [x] 更新 API 文檔註釋以反映正確的參數名稱
- [x] 修正前端 ChatArea.vue 和 ModelSelector.vue 中的模型狀態判斷
  - [x] 將 `model.available` 統一修正為 `model.is_active`
- [x] 更新 Swagger API 文檔
  - [x] 修正 models.route.js 中的參數說明
  - [x] 修正 chat.route.js 中的 Model schema 定義
- [x] 移除前端硬編碼的 provider 列表
  - [x] 修正 ChatArea.vue 中的 `availableModels` 計算，動態獲取所有 provider
  - [x] 修正 ModelSelector.vue 中的模型列表，動態遍歷所有 provider
  - [x] 修正 dashboard/index.vue 中的模型統計，動態計算所有 provider 的模型數量
  - [x] 修正 `findModelById` 函數，動態搜索所有 provider
- [x] 修正模型選擇器佈局問題
  - [x] 重新設計模型項目結構，正確顯示模型名稱、提供商標籤和狀態
  - [x] 新增提供商圖標和詳細信息顯示
- [x] 確保前後端資料欄位命名一致性
```
