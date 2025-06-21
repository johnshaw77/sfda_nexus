# SPI 服務集成到 MCP 系統開發指南

本指南詳細說明如何將新的 Python FastAPI SPI 服務集成到 MCP 系統中，讓前端能夠使用新的 `get_workorder` 功能。

## 🏗️ 系統架構概覽

```
Python FastAPI SPI 服務 (8001) 
    ↓
MCP Server (8080) 
    ↓  
SFDA Nexus Backend (3000)
    ↓
Vue3 Frontend (5173)
```

## 📋 開發流程步驟

### 步驟 1: Python FastAPI SPI 服務準備

假設您已經在 Python FastAPI 中定義了 SPI 服務和 `get_workorder` 方法：

```python
# spi_service.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI(title="SPI 服務", version="1.0.0")

class WorkOrderRequest(BaseModel):
    order_id: Optional[str] = None
    status: Optional[str] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None

class WorkOrder(BaseModel):
    id: str
    title: str
    status: str
    priority: str
    assigned_to: str
    created_date: str
    due_date: str
    description: str

@app.post("/api/v1/workorders/search", response_model=List[WorkOrder])
async def get_workorder(request: WorkOrderRequest):
    """
    獲取工單信息
    """
    # 您的業務邏輯
    workorders = []  # 從資料庫或其他數據源獲取
    return workorders

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
```

### 步驟 2: 在 MCP Server 中創建 SPI 工具模組

#### 2.1 創建 SPI 服務層

```javascript
// sfda_mcpserver/mcp-server/src/services/spi/spi-service.js
import logger from "../../config/logger.js";
import fetch from "node-fetch";

class SpiService {
  constructor() {
    this.apiBaseUrl = "http://localhost:8001/api/v1";
  }

  /**
   * 獲取工單信息
   * @param {Object} data - 查詢參數
   * @param {string} data.order_id - 工單ID
   * @param {string} data.status - 工單狀態
   * @param {string} data.date_from - 開始日期
   * @param {string} data.date_to - 結束日期
   * @param {Object} context - 查詢上下文
   * @returns {Object} 工單列表
   */
  async getWorkOrder(data, context = {}) {
    try {
      logger.info("開始獲取工單信息", {
        params: data,
        context: context.scenario,
      });

      const apiResult = await this.callSpiAPI("/workorders/search", {
        order_id: data.order_id,
        status: data.status,
        date_from: data.date_from,
        date_to: data.date_to,
      });

      return {
        success: true,
        data: apiResult,
        context,
        count: apiResult.length,
      };
    } catch (error) {
      logger.error("獲取工單信息失敗", { error: error.message });
      throw new Error(`獲取工單信息失敗: ${error.message}`);
    }
  }

  /**
   * 調用 SPI API
   * @param {string} endpoint - API 端點
   * @param {Object} payload - 請求數據
   * @returns {Object} API 回應
   */
  async callSpiAPI(endpoint, payload) {
    try {
      const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(
          `SPI API 調用失敗: ${response.status} ${response.statusText}`,
        );
      }

      const result = await response.json();
      logger.info("SPI API 調用成功", { endpoint, status: response.status });

      return result;
    } catch (error) {
      logger.error("SPI API 調用失敗", { endpoint, error: error.message });
      throw error;
    }
  }
}

export default new SpiService();
```

#### 2.2 創建 SPI 工具類

```javascript
// sfda_mcpserver/mcp-server/src/tools/spi/get-workorder.js
import { BaseTool, ToolExecutionError, ToolErrorType } from "../base-tool.js";
import spiService from "../../services/spi/spi-service.js";
import logger from "../../config/logger.js";

export class GetWorkOrderTool extends BaseTool {
  constructor() {
    super(
      "get_workorder",
      "獲取工單信息，支援多種篩選條件",
      {
        type: "object",
        properties: {
          data: {
            type: "object",
            properties: {
              order_id: {
                type: "string",
                description: "工單ID (可選)",
              },
              status: {
                type: "string",
                enum: ["pending", "in_progress", "completed", "cancelled"],
                description: "工單狀態 (可選)",
              },
              date_from: {
                type: "string",
                format: "date",
                description: "開始日期 YYYY-MM-DD (可選)",
              },
              date_to: {
                type: "string",
                format: "date",
                description: "結束日期 YYYY-MM-DD (可選)",
              },
            },
          },
          context: {
            type: "object",
            properties: {
              scenario: {
                type: "string",
                description: "查詢場景",
                examples: ["daily_report", "maintenance", "emergency"],
              },
              user_department: {
                type: "string",
                description: "用戶部門",
              },
            },
          },
        },
        required: ["data"],
      },
      {
        cacheable: true,
        cacheExpiry: 60 * 2, // 2 分鐘
      },
    );
  }

  async _execute(params) {
    try {
      logger.info("收到獲取工單請求", {
        params: params.data,
        scenario: params.context?.scenario,
      });

      // 執行工單查詢
      const result = await spiService.getWorkOrder(
        params.data,
        params.context || {},
      );

      logger.info("工單查詢執行成功", {
        toolName: this.name,
        resultCount: result.data.length,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      logger.error("工單查詢執行失敗", {
        toolName: this.name,
        params: JSON.stringify(params),
        error: error.message,
      });

      throw new ToolExecutionError(
        `工單查詢失敗: ${error.message}`,
        ToolErrorType.EXECUTION_ERROR,
        { originalError: error.message },
      );
    }
  }
}
```

#### 2.3 創建 SPI 工具模組索引

```javascript
// sfda_mcpserver/mcp-server/src/tools/spi/index.js
import { GetWorkOrderTool } from "./get-workorder.js";

// SPI 模組名稱
export const MODULE_NAME = "spi";

// SPI 模組元數據
export const moduleInfo = {
  name: "SPI 工具",
  description: "提供生產計劃與執行相關的功能",
  endpoint: "/api/spi",
  icon: "factory",
};

// 創建工具實例
const createTool = Tool => {
  const tool = new Tool();
  tool.module = MODULE_NAME;
  return tool;
};

// 導出所有 SPI 工具
export const spiTools = [
  createTool(GetWorkOrderTool),
];

// 註冊所有 SPI 工具的函數
export function registerSpiTools(toolMgr) {
  spiTools.forEach(tool => {
    toolMgr.registerTool(tool);
  });
}

export default spiTools;
```

### 步驟 3: 創建 SPI 路由

```javascript
// sfda_mcpserver/mcp-server/src/routes/spi-routes.js
import express from "express";
import logger from "../config/logger.js";
import { spiTools } from "../tools/spi/index.js";

const router = express.Router();

/**
 * 創建統一的工具執行中間件
 */
function createToolHandler(tool) {
  return async (req, res) => {
    const startTime = Date.now();
    
    try {
      logger.info(`執行 SPI 工具: ${tool.name}`, {
        parameters: req.body,
        timestamp: new Date().toISOString()
      });

      const result = await tool.execute(req.body);
      const executionTime = Date.now() - startTime;

      logger.info(`SPI 工具執行成功: ${tool.name}`, {
        executionTime: `${executionTime}ms`,
        success: result.success
      });

      res.json({
        success: true,
        module: "spi",
        tool: tool.name,
        result: result,
        executionTime,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      logger.error(`SPI 工具執行失敗: ${tool.name}`, {
        error: error.message,
        parameters: req.body,
        executionTime: `${executionTime}ms`
      });

      res.status(500).json({
        success: false,
        module: "spi",
        tool: tool.name,
        error: error.message,
        executionTime,
        timestamp: new Date().toISOString()
      });
    }
  };
}

// 動態註冊所有 SPI 工具的路由
spiTools.forEach(tool => {
  const endpoint = `/${tool.name}`;
  router.post(endpoint, createToolHandler(tool));
  
  logger.info(`註冊 SPI 工具路由: POST /api/spi${endpoint}`, {
    toolName: tool.name,
    description: tool.description
  });
});

// SPI 模組資訊端點
router.get("/info", (req, res) => {
  res.json({
    module: "spi",
    name: "SPI 工具",
    description: "提供生產計劃與執行相關的功能",
    tools: spiTools.map(tool => ({
      name: tool.name,
      description: tool.description,
      endpoint: `/api/spi/${tool.name}`
    })),
    timestamp: new Date().toISOString()
  });
});

// MCP 服務連接測試端點
router.get("/tools", (req, res) => {
  res.json({
    success: true,
    module: "spi",
    tools: spiTools.map(tool => ({
      name: tool.name,
      description: tool.description,
      endpoint: `/api/spi/${tool.name}`,
      schema: tool.schema
    })),
    timestamp: new Date().toISOString()
  });
});

export default router;
```

### 步驟 4: 註冊 SPI 路由到主路由

```javascript
// sfda_mcpserver/mcp-server/src/routes/index.js
import hrRoutes from "./hr-routes.js";
import milRoutes from "./mil-routes.js";
import statRoutes from "./stat-routes.js";
import spiRoutes from "./spi-routes.js"; // 新增
import logger from "../config/logger.js";

export function registerAllRoutes(app, toolManager) {
  logger.info("Starting module routes registration...");

  // 註冊 HR 模組路由
  app.use("/api/hr", hrRoutes);
  logger.info("HR module routes registered at /api/hr");

  // 註冊 MIL 模組路由
  app.use("/api/mil", milRoutes);
  logger.info("MIL module routes registered at /api/mil");

  // 註冊 STAT 模組路由
  app.use("/api/stat", statRoutes);
  logger.info("STAT module routes registered at /api/stat");

  // 註冊 SPI 模組路由
  app.use("/api/spi", spiRoutes);
  logger.info("SPI module routes registered at /api/spi");

  logger.info("All module routes registered successfully");
}
```

### 步驟 5: 更新資料庫配置

#### 5.1 新增 SPI 服務到資料庫

```sql
-- 新增 SPI 服務
INSERT INTO mcp_services (
  name, 
  description, 
  endpoint_url, 
  connection_type, 
  auth_type, 
  is_enabled, 
  created_at, 
  updated_at
) VALUES (
  'SPI 服務',
  '生產計劃與執行服務',
  'http://localhost:8080/api/spi',
  'http',
  'none',
  1,
  NOW(),
  NOW()
);
```

#### 5.2 新增工具定義

```sql
-- 獲取剛插入的服務 ID
SET @service_id = LAST_INSERT_ID();

-- 新增 get_workorder 工具
INSERT INTO mcp_tools (
  service_id,
  name,
  description,
  schema_definition,
  priority,
  usage_count,
  is_enabled,
  is_deleted,
  created_at,
  updated_at
) VALUES (
  @service_id,
  'get_workorder',
  '獲取工單信息，支援多種篩選條件',
  JSON_OBJECT(
    'type', 'object',
    'properties', JSON_OBJECT(
      'data', JSON_OBJECT(
        'type', 'object',
        'properties', JSON_OBJECT(
          'order_id', JSON_OBJECT(
            'type', 'string',
            'description', '工單ID (可選)'
          ),
          'status', JSON_OBJECT(
            'type', 'string',
            'enum', JSON_ARRAY('pending', 'in_progress', 'completed', 'cancelled'),
            'description', '工單狀態 (可選)'
          ),
          'date_from', JSON_OBJECT(
            'type', 'string',
            'format', 'date',
            'description', '開始日期 YYYY-MM-DD (可選)'
          ),
          'date_to', JSON_OBJECT(
            'type', 'string', 
            'format', 'date',
            'description', '結束日期 YYYY-MM-DD (可選)'
          )
        )
      ),
      'context', JSON_OBJECT(
        'type', 'object',
        'properties', JSON_OBJECT(
          'scenario', JSON_OBJECT(
            'type', 'string',
            'description', '查詢場景'
          ),
          'user_department', JSON_OBJECT(
            'type', 'string',
            'description', '用戶部門'
          )
        )
      )
    ),
    'required', JSON_ARRAY('data')
  ),
  1,
  0,
  1,
  0,
  NOW(),
  NOW()
);
```

### 步驟 6: 更新後端 MCP 服務模組映射

```javascript
// sfda_nexus/backend/src/services/mcp.service.js
// 在 getModuleName 方法中新增 SPI 模組映射

getModuleName(serviceName) {
  const moduleMapping = {
    'HR 服務': 'hr',
    'hr': 'hr',
    'Mil 服務': 'mil', 
    'mil': 'mil',
    'Stat 服務': 'stat',
    'stat': 'stat',
    'SPI 服務': 'spi',  // 新增
    'spi': 'spi'        // 新增
  };
  
  return moduleMapping[serviceName] || serviceName.toLowerCase();
}
```

### 步驟 7: 測試整合

#### 7.1 創建測試腳本

```javascript
// sfda_nexus/backend/test_spi_integration.js
import axios from 'axios';

const BACKEND_URL = 'http://localhost:3000';
const TEST_CREDENTIALS = {
  identifier: 'admin',
  password: 'admin123'
};

const TEST_DATA = {
  serviceId: null, // 將從資料庫查詢
  toolId: null,    // 將從資料庫查詢  
  toolName: 'get_workorder',
  parameters: {
    data: {
      status: "pending",
      date_from: "2025-01-01",
      date_to: "2025-12-31"
    },
    context: {
      scenario: "daily_report",
      user_department: "生產部"
    }
  }
};

async function runSpiIntegrationTest() {
  let authToken = null;
  
  try {
    console.log('🚀 開始 SPI 集成測試...');
    
    // 步驟 1: 登入
    const loginResponse = await axios.post(`${BACKEND_URL}/api/auth/login`, TEST_CREDENTIALS);
    authToken = loginResponse.data.data.access_token;
    console.log('✅ 登入成功');
    
    // 步驟 2: 查詢工具
    const toolsResponse = await axios.get(`${BACKEND_URL}/api/mcp/tools`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const getWorkOrderTool = toolsResponse.data.data.find(tool => 
      tool.name === 'get_workorder'
    );
    
    if (!getWorkOrderTool) {
      throw new Error('找不到 get_workorder 工具');
    }
    
    TEST_DATA.toolId = getWorkOrderTool.id;
    TEST_DATA.serviceId = getWorkOrderTool.service_id;
    
    console.log(`✅ 找到工具: ${getWorkOrderTool.name} (ID: ${getWorkOrderTool.id})`);
    
    // 步驟 3: 調用工具
    const toolCallResponse = await axios.post(`${BACKEND_URL}/api/mcp/tools/call`, TEST_DATA, {
      headers: { 
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (toolCallResponse.data.success) {
      console.log('✅ SPI 工具調用成功！');
      console.log('📊 工單查詢結果:', toolCallResponse.data.data);
      console.log('🎉 SPI 集成測試完成！');
    } else {
      throw new Error('工具調用失敗：' + toolCallResponse.data.message);
    }
    
  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
    if (error.response) {
      console.error('HTTP 狀態碼:', error.response.status);
      console.error('回應數據:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

runSpiIntegrationTest();
```

### 步驟 8: 啟動和測試

#### 8.1 啟動所有服務

```bash
# 1. 啟動 Python FastAPI SPI 服務
cd /path/to/spi-service
python spi_service.py

# 2. 啟動 MCP Server
cd /path/to/sfda_mcpserver/mcp-server
npm start

# 3. 啟動後端服務
cd /path/to/sfda_nexus/backend
npm start

# 4. 啟動前端服務  
cd /path/to/sfda_nexus/frontend
npm run dev
```

#### 8.2 執行測試

```bash
# 測試 MCP Server SPI 端點
curl -X GET "http://localhost:8080/api/spi/info"

# 測試工具端點
curl -X GET "http://localhost:8080/api/spi/tools"

# 執行整合測試
cd /path/to/sfda_nexus/backend
node test_spi_integration.js
```

## 🎯 前端使用方式

### 在後端管理介面中

1. 登入後端管理系統 `http://localhost:5173/admin`
2. 進入「MCP 工具測試器」頁面
3. 選擇「SPI 服務」
4. 選擇「get_workorder」工具
5. 填入測試參數：
   ```json
   {
     "data": {
       "status": "pending",
       "date_from": "2025-01-01", 
       "date_to": "2025-12-31"
     },
     "context": {
       "scenario": "daily_report",
       "user_department": "生產部"
     }
   }
   ```
6. 點擊「執行工具」查看結果

### 在前端應用中調用

```javascript
// 在 Vue 組件中使用
import { useMcpTools } from '@/composables/useMcpTools'

export default {
  setup() {
    const { callTool } = useMcpTools()
    
    const getWorkOrders = async () => {
      try {
        const result = await callTool({
          serviceId: 50, // SPI 服務 ID
          toolName: 'get_workorder',
          parameters: {
            data: {
              status: 'pending'
            },
            context: {
              scenario: 'daily_report'
            }
          }
        })
        
        console.log('工單列表:', result.data)
      } catch (error) {
        console.error('獲取工單失敗:', error)
      }
    }
    
    return {
      getWorkOrders
    }
  }
}
```

## 🔧 故障排除

### 常見問題

1. **404 錯誤 - `/api/spi` 路徑不存在**
   - 檢查 MCP Server 是否正確啟動
   - 確認 `spi-routes.js` 已創建並註冊
   - 檢查 `src/routes/index.js` 是否包含 SPI 路由註冊

2. **連接失敗 - MCP 服務未連接**
   - 確認 SPI FastAPI 服務運行在 port 8001
   - 檢查 MCP Server 能否訪問 SPI 服務
   - 驗證資料庫中的 endpoint_url 配置

3. **工具未找到**
   - 檢查資料庫中是否正確插入服務和工具記錄
   - 確認後端已同步最新的工具列表
   - 檢查工具的 schema_definition 格式是否正確

4. **參數驗證錯誤**
   - 檢查工具的 schema 定義
   - 確認傳入參數符合 schema 要求
   - 查看 MCP Server 日誌獲取詳細錯誤信息

## 📝 注意事項

1. **服務端口配置**：確保各服務使用不同端口且無衝突
2. **資料庫同步**：新增服務後需要重啟後端服務以同步工具列表
3. **錯誤處理**：在所有層級都要有適當的錯誤處理和日誌記錄
4. **安全性**：生產環境中要配置適當的認證和授權機制
5. **性能優化**：考慮添加快取機制以提升回應速度

按照此指南，您就能成功將新的 SPI 服務集成到 MCP 系統中，並在前端使用新的 `get_workorder` 功能了！ 

```mermaid
graph TD
    A[Python FastAPI<br/>SPI 服務] --> B[定義 get_workorder 方法]
    B --> C[MCP Server<br/>創建 SPI 工具模組]
    C --> D[註冊 SPI 路由]
    D --> E[更新資料庫配置]
    E --> F[後端同步工具]
    F --> G[前端管理介面]
    G --> H[用戶使用]

    A1[1. FastAPI 服務<br/>Port: 8001] --> A
    C1[2. MCP Server<br/>Port: 8080] --> C
    E1[3. MySQL 資料庫<br/>mcp_services表] --> E
    F1[4. SFDA Nexus Backend<br/>Port: 3000] --> F
    G1[5. Vue3 Frontend<br/>Port: 5173] --> G

    style A fill:#e1f5fe
    style C fill:#f3e5f5
    style E fill:#fff3e0
    style F fill:#e8f5e8
    style G fill:#fce4ec
    ```