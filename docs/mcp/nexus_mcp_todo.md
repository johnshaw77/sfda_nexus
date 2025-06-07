# SFDA Nexus 與 MCP Server 整合 TODO 清單

## 📋 階段一：資料庫準備

### 1. 建立 MCP 相關資料表

- [x] 建立 `add_mcp_tables.sql` 腳本
- [x] 執行 `mcp_services` 資料表建立語法
- [x] 執行 `mcp_tools` 資料表建立語法
- [x] 建立資料表索引優化查詢效能
- [x] 新增預設的 MCP Server 服務記錄

```sql
-- 建立 MCP 服務表
CREATE TABLE mcp_services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    endpoint_url VARCHAR(255),
    description VARCHAR(255),
    is_active TINYINT(1) DEFAULT 1,
    version INT DEFAULT 1,
    owner VARCHAR(100),
    icon VARCHAR(255),
    is_deleted TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 建立 MCP 工具表
CREATE TABLE mcp_tools (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mcp_service_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    input_schema JSON,
    category VARCHAR(50) DEFAULT 'general',
    priority INT DEFAULT 1,
    usage_count INT DEFAULT 0,
    is_enabled TINYINT(1) DEFAULT 1,
    is_deleted TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (mcp_service_id) REFERENCES mcp_services(id)
);

-- 建立索引
CREATE INDEX idx_mcp_services_active ON mcp_services(is_active, is_deleted);
CREATE INDEX idx_mcp_tools_enabled ON mcp_tools(mcp_service_id, is_enabled, is_deleted);
CREATE INDEX idx_mcp_tools_category ON mcp_tools(category, is_enabled);

-- 新增預設 MCP 服務
INSERT INTO mcp_services (name, endpoint_url, description, owner)
VALUES ('本地 MCP Server', 'http://localhost:8080', '本地開發用 MCP 工具服務', 'system');
```

### 2. 資料庫連線設定

- [x] 測試資料庫連線是否正常

---

## 📋 階段二：後端 Model & Controller & Route 開發

### 1. MCP 模型層 (Models)

- [x] 建立 `McpService.model.js` 模型檔案
- [x] 實作 MCP 服務的資料庫操作方法：

  - [x] `getAllMcpServices(options)` - 取得所有 MCP 服務
  - [x] `getMcpServiceById(serviceId)` - 根據 ID 取得服務
  - [x] `createMcpService(serviceData)` - 新增 MCP 服務
  - [x] `updateMcpService(serviceId, updateData)` - 更新 MCP 服務
  - [x] `deleteMcpService(serviceId)` - 軟刪除 MCP 服務
  - [x] `toggleMcpServiceStatus(serviceId, isActive)` - 啟用/停用服務

- [x] 建立 `McpTool.model.js` 模型檔案
- [x] 實作 MCP 工具的資料庫操作方法：
  - [x] `getAllMcpTools(options)` - 取得所有工具
  - [x] `getMcpToolsByServiceId(serviceId)` - 根據服務 ID 取得工具
  - [x] `getEnabledMcpTools()` - 取得已啟用的工具
  - [x] `createMcpTool(toolData)` - 新增 MCP 工具
  - [x] `updateMcpTool(toolId, updateData)` - 更新工具
  - [x] `deleteMcpTool(toolId)` - 軟刪除工具
  - [x] `syncToolsForService(serviceId, tools)` - 同步服務工具

### 2. MCP 控制器層 (Controllers)

- [x] 建立 `mcpServices.controller.js` 控制器檔案
- [x] 實作 MCP 服務相關的 HTTP 請求處理：

  - [x] `handleGetAllMcpServices` - 處理取得所有服務請求
  - [x] `handleGetMcpServiceById` - 處理取得單一服務請求
  - [x] `handleCreateMcpService` - 處理新增服務請求
  - [x] `handleUpdateMcpService` - 處理更新服務請求
  - [x] `handleDeleteMcpService` - 處理刪除服務請求
  - [x] `handleToggleMcpService` - 處理啟用/停用服務請求
  - [x] `handleTestMcpConnection` - 處理測試連線請求

- [x] 建立 `mcpTools.controller.js` 控制器檔案
- [x] 實作 MCP 工具相關的 HTTP 請求處理：
  - [x] `handleGetAllMcpTools` - 處理取得所有工具請求
  - [x] `handleGetMcpToolsByService` - 處理根據服務取得工具請求
  - [x] `handleSyncToolsForService` - 處理同步服務工具請求
  - [x] `handleUpdateMcpToolStatus` - 處理更新工具狀態請求

### 3. MCP 路由層 (Routes)

- [x] 建立 `mcpServices.route.js` 路由檔案
- [x] 實作 MCP 服務相關的路由：

  - [x] `GET /api/mcp/services` - 取得所有 MCP 服務
  - [x] `GET /api/mcp/services/:id` - 取得指定 MCP 服務
  - [x] `POST /api/mcp/services` - 新增 MCP 服務
  - [x] `PUT /api/mcp/services/:id` - 更新 MCP 服務
  - [x] `DELETE /api/mcp/services/:id` - 刪除 MCP 服務
  - [x] `PATCH /api/mcp/services/:id/toggle` - 啟用/停用服務
  - [x] `POST /api/mcp/services/:id/test` - 測試服務連線

- [x] 建立 `mcpTools.route.js` 路由檔案
- [x] 實作 MCP 工具相關的路由：

  - [x] `GET /api/mcp/tools` - 取得所有工具
  - [x] `GET /api/mcp/tools/enabled` - 取得已啟用的工具
  - [x] `GET /api/mcp/services/:serviceId/tools` - 取得指定服務的工具
  - [x] `POST /api/mcp/services/:serviceId/tools/sync` - 同步指定服務的工具
  - [x] `PATCH /api/mcp/tools/:id/status` - 更新工具狀態

- [x] 在 `index.route.js` 中註冊 MCP 路由

### 4. MCP 服務層 (Services)

- [x] 建立 `mcp.service.js` 服務檔案
- [x] 實作 MCP 客戶端功能：
  - [x] `getMcpToolsFromServer(serviceUrl)` - 從 MCP Server 取得工具清單
  - [x] `callMcpTool(serviceUrl, toolName, params)` - 調用指定工具
  - [x] `testMcpConnection(serviceUrl)` - 測試 MCP 服務連線
  - [x] `syncMcpToolsForService(serviceId)` - 同步服務工具

---

## 📋 階段三：聊天系統整合

### 1. 動態 System Prompt 生成

- [x] 修改 `services/chat-service.js`
- [x] 新增 `generateSystemPrompt()` 方法：
  - [x] 從資料庫讀取已啟用的 MCP 工具
  - [x] 生成包含工具資訊的 system prompt
  - [x] 格式化工具描述和使用說明

### 2. 工具調用解析器

- [x] 建立 `mcpToolParser.service.js` 解析器
- [x] 實作以下功能：
  - [x] `parseToolCalls(aiResponse)` - 解析 AI 回應中的工具調用
  - [x] `executeToolCalls(toolCalls)` - 執行工具調用
  - [x] `formatToolResults(results)` - 格式化工具執行結果

### 3. 聊天流程改造

- [x] 修改 `controllers/chat.controller.js`：
  - [x] 在發送給 AI 前，動態生成 system prompt
  - [x] 解析 AI 回應中的工具調用指令
  - [x] 執行工具並取得結果
  - [x] 將工具結果整合到最終回應
  - [x] 支援普通模式和串流模式

### 4. 錯誤處理機制

- [x] 實作工具調用的錯誤處理：
  - [x] MCP 服務無法連線時的降級處理
  - [x] 工具執行失敗時的錯誤回報
  - [x] 超時處理和重試機制

### 5. 權限控制系統

- [x] 建立 `mcp_agent_services` 權限控制表
- [x] 實作智能體與服務的關聯控制
- [x] 移除 `mcp_tools` 表的 `category` 字段
- [x] 優化資料庫結構和索引

### 6. MCP 服務同步與管理系統

#### 6.1 核心架構重構

- [x] 建立 `sync_mcp_services.js` 同步腳本
- [x] 實作從 MCP Server 自動同步服務和工具
- [x] 支援完全動態的服務發現（移除所有硬編碼）
- [ ] **架構重構**：將核心邏輯抽取到 service 層
  - [ ] 建立 `services/mcpSync.service.js` - 核心同步邏輯
  - [ ] 建立 `services/mcpDiscovery.service.js` - MCP 服務發現邏輯
  - [ ] 修改 `database/scripts/sync_mcp_services.js` - 輕量執行腳本
  - [ ] 更新現有的 MCP controllers 和 routes

#### 6.2 服務發現與管理 API

- [ ] **服務發現 API**

  - [ ] `GET /api/mcp/discover` - 探索 MCP Server 有哪些服務
  - [ ] `GET /api/mcp/discover/diff` - 檢查與現有資料的差異
  - [ ] `GET /api/mcp/services/available` - 列出所有可用服務和工具

- [ ] **服務管理 API**

  - [ ] `POST /api/mcp/services/enable` - 啟用選中的服務
  - [ ] `POST /api/mcp/services/disable` - 停用服務
  - [ ] `POST /api/mcp/services/sync-changes` - 套用選中的變更
  - [ ] `GET /api/mcp/services/enabled` - 查看已啟用的服務
  - [ ] `GET /api/mcp/services/status` - 查看所有服務的同步狀態

- [ ] **智能體權限管理 API**
  - [ ] `POST /api/mcp/agents/:agentId/services` - 為智能體分配服務權限
  - [ ] `GET /api/mcp/agents/:agentId/services` - 查看智能體可用的服務
  - [ ] `DELETE /api/mcp/agents/:agentId/services/:serviceId` - 移除智能體服務權限

#### 6.3 多種同步執行方式

- [x] **手動執行腳本**：`node database/scripts/sync_mcp_services.js`
- [ ] **定時任務支援**：設定 cron job 自動執行
- [ ] **前端觸發同步**：
  - [ ] 完整同步：`POST /api/mcp/services/sync`
  - [ ] 增量同步：`POST /api/mcp/services/sync-incremental`
  - [ ] 特定服務同步：`POST /api/mcp/services/:id/sync`
- [ ] **部署時自動執行**：在 CI/CD 流程中整合同步腳本

#### 6.4 增量更新與差異處理

- [ ] **版本比較機制**

  - [ ] 記錄 MCP Server 版本號
  - [ ] 比較現有清單與 Server 清單
  - [ ] 標記新增、移除、變更的工具

- [ ] **差異處理流程**

  - [ ] 情況一：MCP Server 新增服務/工具
  - [ ] 情況二：現有服務的工具變更
  - [ ] 情況三：服務版本更新和參數結構變更

- [ ] **用戶確認機制**
  - [ ] 顯示發現的新工具和變更
  - [ ] 讓用戶選擇要套用的變更
  - [ ] 提供批次操作和個別選擇

#### 6.5 資料庫支援

- [x] 執行資料庫結構更新腳本 (`add_agent_services_table.sql`)
- [ ] 執行初始 MCP 服務同步腳本
- [ ] 新增同步歷史記錄表 (可選)
- [ ] 新增版本追蹤機制 (可選)

### 7. 聊天系統增強功能

- [x] 新增工具統計 API (`/api/chat/tools/stats`)
- [x] 新增系統提示詞預覽 API (`/api/chat/system-prompt/preview`)
- [x] 新增快取管理 API (`/api/chat/system-prompt/clear-cache`)
- [x] 完整的 Swagger API 文檔

---

## 📋 階段四：前端管理介面

### 1. MCP 服務發現與管理頁面

- [ ] 建立 `views/admin/McpDiscovery.vue` 服務發現頁面
- [ ] 實作功能：
  - [ ] 連接到 MCP Server 並探索可用服務
  - [ ] 樹狀結構顯示服務和工具清單
  - [ ] 批次選擇和個別選擇功能
  - [ ] 即時顯示服務狀態（新增、變更、移除）

### 2. MCP 服務管理主頁面

- [ ] 建立 `views/admin/McpServices.vue` 服務管理頁面
- [ ] 實作功能：
  - [ ] 顯示已啟用的 MCP 服務清單
  - [ ] 服務啟用/停用切換
  - [ ] 檢查更新和差異比較
  - [ ] 增量同步選擇界面

### 3. MCP 工具詳細管理

- [ ] 建立 `views/admin/McpTools.vue` 工具管理頁面
- [ ] 實作功能：
  - [ ] 顯示所有工具清單（按服務分組）
  - [ ] 工具啟用/停用個別控制
  - [ ] 查看工具詳細資訊和參數結構
  - [ ] 工具使用統計和監控

### 4. 智能體權限管理

- [ ] 建立 `views/admin/AgentServicePermissions.vue` 權限管理頁面
- [ ] 實作功能：
  - [ ] 為智能體分配 MCP 服務權限
  - [ ] 批次權限設定和複製
  - [ ] 權限矩陣視圖（智能體 vs 服務）
  - [ ] 權限變更歷史記錄

### 5. MCP 同步操作界面

- [ ] 建立 `components/admin/McpSyncControls.vue` 同步控制組件
- [ ] 實作功能：
  - [ ] 手動觸發完整同步
  - [ ] 增量同步操作
  - [ ] 同步進度顯示
  - [ ] 同步結果和錯誤報告

### 6. API 服務層

- [ ] 建立 `api/mcp.js` API 服務模組
- [ ] 實作前端 API 調用方法：
  - [ ] 服務發現相關 API
  - [ ] 服務管理相關 API
  - [ ] 權限管理相關 API
  - [ ] 同步操作相關 API

### 7. 聊天介面優化

- [ ] 修改聊天介面顯示工具調用過程：
  - [ ] 顯示「正在調用工具...」的載入狀態
  - [ ] 顯示工具執行結果的格式化內容
  - [ ] 區分 AI 回應和工具執行結果
  - [ ] 工具調用失敗的友善錯誤提示

### 8. 導航選單更新

- [ ] 在管理員選單中新增 MCP 管理選項：
  - [ ] MCP 服務發現
  - [ ] MCP 服務管理
  - [ ] 智能體權限設定
- [ ] 設定適當的權限控制

### 9. 響應式設計與用戶體驗

- [ ] 實作響應式布局適配
- [ ] 新增載入狀態和骨架屏
- [ ] 優化大量資料的虛擬滾動
- [ ] 實作搜尋和篩選功能

---

## 📋 階段五：測試與優化

### 1. 單元測試

- [ ] 為 MCP 模型編寫測試
- [ ] 為 MCP 服務編寫測試
- [ ] 為聊天整合功能編寫測試

### 2. 整合測試

- [ ] 測試完整的聊天工具調用流程
- [ ] 測試多個 MCP 服務的並行調用
- [ ] 測試錯誤情況的處理

### 3. 效能優化

- [ ] 實作工具調用結果的快取機制
- [ ] 優化資料庫查詢效能
- [ ] 實作工具調用的非同步處理

### 4. 監控與日誌

- [ ] 新增 MCP 工具調用的日誌記錄
- [ ] 實作工具使用統計功能
- [ ] 監控 MCP 服務的健康狀態

---

## 📋 階段六：部署與維護

### 1. 設定檔管理

- [ ] 建立 MCP 服務的環境變數設定
- [ ] 設定不同環境的 MCP 端點
- [ ] 實作設定檔的動態載入

### 2. 文件撰寫

- [ ] 撰寫 MCP 整合使用手冊
- [ ] 建立工具開發指南
- [ ] 更新 API 文件
- [ ] 更新 README.md 文件

### 3. 安全性考量

- [ ] 實作 MCP 服務的身份驗證
- [ ] 設定工具調用的權限控制
- [ ] 實作 API 呼叫的頻率限制

---

## 🎯 預期完成時程

- **階段一～二**：✅ **已完成**（後端基礎建設）
- **階段三**：✅ **已完成**（聊天系統整合 + 權限控制）
- **階段四**：3-4 天（前端管理介面 + MCP 服務發現系統）
- **階段五～六**：2-3 天（測試與優化）

**總預估時程：5-7 天（剩餘）**

---

## 🎯 **當前專案狀態總覽**

### ✅ **已完成 (85%)**

- 完整的 MCP 後端基礎架構
- 資料庫設計和權限控制系統
- 聊天系統的 MCP 工具整合
- 動態 System Prompt 生成
- 完全動態的 MCP 服務同步腳本

### 🚀 **下一階段重點**

- 架構重構：將同步邏輯抽取到 service 層
- 建立完整的服務發現和管理 API
- 開發前端 MCP 管理界面
- 實作增量更新和差異處理機制

### 💡 **核心創新功能**

1. **服務發現系統**：動態探索和選擇 MCP 服務
2. **增量更新機制**：智能處理服務變更和版本更新
3. **細粒度權限控制**：智能體級別的服務權限管理
4. **多執行方式支援**：手動、定時、前端觸發的彈性同步

---

## 📝 **架構設計亮點**

### 🏗️ **混合架構模式**

```
Scripts 層：輕量執行腳本 (定時任務、手動執行)
    ↓
Service 層：核心業務邏輯 (同步、發現、管理)
    ↓
API 層：RESTful 介面 (前端整合、即時操作)
    ↓
Frontend：管理界面 (用戶交互、可視化控制)
```

### 🔄 **三階段 MCP 管理流程**

1. **發現階段**：探索 MCP Server 可用服務
2. **選擇階段**：用戶勾選要啟用的服務/工具
3. **管理階段**：權限分配、增量更新、監控
4. **遵循現有架構**：所有新建立的檔案都要遵循現有的命名規範和目錄結構
5. **資料庫腳本管理**：所有資料庫相關腳本統一放在 `backend/database/scripts/` 目錄
6. **權限控制**：MCP 管理功能需要管理員權限
7. **錯誤處理**：使用現有的錯誤處理中間件
8. **日誌記錄**：使用現有的 logger 工具
9. **API 文件**：為所有新 API 添加 Swagger 文件

## ✅ **階段一～三已完成** 🎉

**已建立完整的 MCP 後端基礎架構：**

- 資料庫表和索引 ✅
- Model 層（McpService、McpTool）✅
- Controller 層（完整的 CRUD 操作）✅
- Route 層（包含 Swagger 文檔）✅
- Service 層（MCP 客戶端功能）✅
- 聊天系統整合（動態 System Prompt、工具調用解析、權限控制）✅
- MCP 服務同步腳本 ✅

**接下來進入階段四：前端管理介面** 🚀

### 🔄 當前任務狀態

**準備執行的腳本：**

1. `backend/database/scripts/add_agent_services_table.sql` - 建立權限控制表
2. `backend/database/scripts/sync_mcp_services.js` - 同步 MCP 服務和工具

**建議執行順序：**

```bash
# 1. 執行資料庫結構更新
docker exec -i mysql-server mysql -u root -pMyPwd@1234 sfda_nexus < backend/database/scripts/add_agent_services_table.sql

# 2. 執行服務同步（需要 MCP Server 運行）
cd backend && node database/scripts/sync_mcp_services.js
```

---

## 📝 **重要注意事項**

### 🏗️ **架構規範**

1. **遵循現有架構**：所有新建立的檔案都要遵循現有的命名規範和目錄結構
2. **資料庫腳本管理**：所有資料庫相關腳本統一放在 `backend/database/scripts/` 目錄
3. **動態配置原則**：模型配置從資料庫動態載入，絕不硬編碼

### 🔐 **安全與權限**

4. **權限控制**：MCP 管理功能需要管理員權限
5. **智能體隔離**：每個智能體只能存取被授權的 MCP 服務
6. **API 安全**：所有 MCP 相關 API 都需要身份驗證

### 🛠️ **開發規範**

7. **錯誤處理**：使用現有的錯誤處理中間件
8. **日誌記錄**：使用現有的 logger 工具
9. **API 文件**：為所有新 API 添加完整的 Swagger 文件
10. **測試覆蓋**：核心功能必須包含單元測試和整合測試

---

## 🎯 **總結**

SFDA Nexus 的 MCP 整合專案現已進入**最後衝刺階段**！我們已經建立了一個**創新的 MCP 服務管理系統**，具備：

✨ **核心特色**：

- **動態服務發現**：無需硬編碼，自動適應任何 MCP Server
- **智能增量更新**：優雅處理服務版本演進
- **細粒度權限控制**：智能體級別的精確權限管理
- **混合執行架構**：支援手動、自動、前端觸發的靈活同步

🚀 **技術突破**：

- 完全去除硬編碼的動態架構
- 多階段服務管理流程
- 一體化的聊天系統工具整合
- 企業級的權限控制機制

**下一步：開始階段四的前端開發，讓這個強大的後端系統擁有直觀易用的管理界面！** 🎉
