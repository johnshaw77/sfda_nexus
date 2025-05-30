MCP (Model Context Protocol) 是讓 AI 能夠調用外部工具和服務的關鍵技術。

如何實現自定義的 MCP 工具：

## 🛠️ MCP 基本概念

MCP 本質上是讓 AI 模型能夠：

1. **調用外部 API**
2. **查詢資料庫**
3. **執行特定功能**
4. **獲取實時資料**

## 🏗️ MCP 架構設計

```javascript
// MCP 工具的基本結構
class MCPTool {
  constructor(config) {
    this.name = config.name;
    this.description = config.description;
    this.parameters = config.parameters;
    this.config = config.config;
  }

  async execute(parameters) {
    // 實際執行邏輯
  }

  getSchema() {
    // 返回工具的參數結構
  }
}
```

## 💼 HR MCP 實現

### 1. **HR MCP 工具定義**

```javascript
// hr-mcp.js
class HRMCPTool extends MCPTool {
  constructor() {
    super({
      name: "hr_assistant",
      description: "HR人力資源管理工具，可以查詢員工資訊、請假記錄、薪資資料等",
      parameters: {
        action: {
          type: "string",
          enum: [
            "get_employee",
            "get_leave_records",
            "get_salary_info",
            "create_leave_request",
          ],
          description: "要執行的HR操作",
        },
        employee_id: {
          type: "string",
          description: "員工ID",
        },
        start_date: {
          type: "string",
          format: "date",
          description: "開始日期 (YYYY-MM-DD)",
        },
        end_date: {
          type: "string",
          format: "date",
          description: "結束日期 (YYYY-MM-DD)",
        },
      },
    });
  }

  async execute(parameters) {
    const { action, employee_id, start_date, end_date } = parameters;

    switch (action) {
      case "get_employee":
        return await this.getEmployeeInfo(employee_id);
      case "get_leave_records":
        return await this.getLeaveRecords(employee_id, start_date, end_date);
      case "get_salary_info":
        return await this.getSalaryInfo(employee_id);
      case "create_leave_request":
        return await this.createLeaveRequest(parameters);
      default:
        throw new Error(`未知的HR操作: ${action}`);
    }
  }

  async getEmployeeInfo(employeeId) {
    // 查詢員工基本資訊
    const employee = await db.query(
      `
      SELECT e.*, d.name as department_name, p.name as position_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN positions p ON e.position_id = p.id
      WHERE e.employee_id = ?
    `,
      [employeeId]
    );

    if (!employee.length) {
      return { error: "找不到該員工" };
    }

    return {
      success: true,
      data: {
        name: employee[0].name,
        department: employee[0].department_name,
        position: employee[0].position_name,
        hire_date: employee[0].hire_date,
        email: employee[0].email,
        phone: employee[0].phone,
      },
    };
  }

  async getLeaveRecords(employeeId, startDate, endDate) {
    const records = await db.query(
      `
      SELECT lr.*, lt.name as leave_type_name
      FROM leave_requests lr
      LEFT JOIN leave_types lt ON lr.leave_type_id = lt.id
      WHERE lr.employee_id = ? 
      AND lr.start_date >= ? 
      AND lr.end_date <= ?
      ORDER BY lr.start_date DESC
    `,
      [employeeId, startDate, endDate]
    );

    return {
      success: true,
      data: records.map((record) => ({
        leave_type: record.leave_type_name,
        start_date: record.start_date,
        end_date: record.end_date,
        days: record.days,
        status: record.status,
        reason: record.reason,
      })),
    };
  }

  async getSalaryInfo(employeeId) {
    // 注意：薪資資料敏感，需要權限檢查
    const salary = await db.query(
      `
      SELECT base_salary, allowances, deductions, net_salary, pay_date
      FROM salary_records 
      WHERE employee_id = ? 
      ORDER BY pay_date DESC 
      LIMIT 3
    `,
      [employeeId]
    );

    return {
      success: true,
      data: salary,
    };
  }
}
```

## 💰 財務 MCP 實現

```javascript
// finance-mcp.js
class FinanceMCPTool extends MCPTool {
  constructor() {
    super({
      name: "finance_assistant",
      description: "財務管理工具，可以查詢財務報表、預算、費用等資訊",
      parameters: {
        action: {
          type: "string",
          enum: [
            "get_budget",
            "get_expenses",
            "get_revenue",
            "create_expense_report",
          ],
          description: "要執行的財務操作",
        },
        department: {
          type: "string",
          description: "部門名稱",
        },
        period: {
          type: "string",
          description: "查詢期間 (YYYY-MM 或 YYYY)",
        },
        category: {
          type: "string",
          description: "費用類別",
        },
      },
    });
  }

  async execute(parameters) {
    const { action, department, period, category } = parameters;

    switch (action) {
      case "get_budget":
        return await this.getBudgetInfo(department, period);
      case "get_expenses":
        return await this.getExpenses(department, period, category);
      case "get_revenue":
        return await this.getRevenue(period);
      case "create_expense_report":
        return await this.createExpenseReport(parameters);
      default:
        throw new Error(`未知的財務操作: ${action}`);
    }
  }

  async getBudgetInfo(department, period) {
    const budget = await db.query(
      `
      SELECT 
        b.category,
        b.allocated_amount,
        COALESCE(SUM(e.amount), 0) as spent_amount,
        (b.allocated_amount - COALESCE(SUM(e.amount), 0)) as remaining_amount
      FROM budgets b
      LEFT JOIN expenses e ON b.department_id = e.department_id 
        AND b.category = e.category
        AND DATE_FORMAT(e.expense_date, '%Y-%m') = ?
      WHERE b.department_name = ? AND b.period = ?
      GROUP BY b.category, b.allocated_amount
    `,
      [period, department, period]
    );

    return {
      success: true,
      data: budget.map((item) => ({
        category: item.category,
        allocated: item.allocated_amount,
        spent: item.spent_amount,
        remaining: item.remaining_amount,
        utilization_rate:
          ((item.spent_amount / item.allocated_amount) * 100).toFixed(2) + "%",
      })),
    };
  }

  async getExpenses(department, period, category) {
    let query = `
      SELECT e.*, u.name as submitted_by_name, d.name as department_name
      FROM expenses e
      LEFT JOIN users u ON e.submitted_by = u.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE DATE_FORMAT(e.expense_date, '%Y-%m') = ?
    `;
    const params = [period];

    if (department) {
      query += ` AND d.name = ?`;
      params.push(department);
    }

    if (category) {
      query += ` AND e.category = ?`;
      params.push(category);
    }

    query += ` ORDER BY e.expense_date DESC`;

    const expenses = await db.query(query, params);

    return {
      success: true,
      data: expenses,
      summary: {
        total_amount: expenses.reduce((sum, exp) => sum + exp.amount, 0),
        total_count: expenses.length,
      },
    };
  }
}
```

## 📋 品質文件 MCP 實現

```javascript
// quality-doc-mcp.js
class QualityDocMCPTool extends MCPTool {
  constructor() {
    super({
      name: "quality_doc_assistant",
      description: "品質文件管理工具，可以搜尋、查詢和管理品質相關文件",
      parameters: {
        action: {
          type: "string",
          enum: [
            "search_documents",
            "get_document",
            "get_procedures",
            "check_compliance",
          ],
          description: "要執行的品質文件操作",
        },
        keyword: {
          type: "string",
          description: "搜尋關鍵字",
        },
        document_type: {
          type: "string",
          enum: ["SOP", "WI", "FORM", "POLICY", "MANUAL"],
          description: "文件類型",
        },
        department: {
          type: "string",
          description: "相關部門",
        },
        document_id: {
          type: "string",
          description: "文件編號",
        },
      },
    });
  }

  async execute(parameters) {
    const { action, keyword, document_type, department, document_id } =
      parameters;

    switch (action) {
      case "search_documents":
        return await this.searchDocuments(keyword, document_type, department);
      case "get_document":
        return await this.getDocument(document_id);
      case "get_procedures":
        return await this.getProcedures(department);
      case "check_compliance":
        return await this.checkCompliance(parameters);
      default:
        throw new Error(`未知的品質文件操作: ${action}`);
    }
  }

  async searchDocuments(keyword, documentType, department) {
    let query = `
      SELECT 
        qd.*,
        d.name as department_name,
        u.name as created_by_name
      FROM quality_documents qd
      LEFT JOIN departments d ON qd.department_id = d.id
      LEFT JOIN users u ON qd.created_by = u.id
      WHERE qd.status = 'active'
    `;
    const params = [];

    if (keyword) {
      query += ` AND (qd.title LIKE ? OR qd.content LIKE ? OR qd.keywords LIKE ?)`;
      const searchTerm = `%${keyword}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (documentType) {
      query += ` AND qd.document_type = ?`;
      params.push(documentType);
    }

    if (department) {
      query += ` AND d.name = ?`;
      params.push(department);
    }

    query += ` ORDER BY qd.updated_at DESC LIMIT 20`;

    const documents = await db.query(query, params);

    return {
      success: true,
      data: documents.map((doc) => ({
        document_id: doc.document_id,
        title: doc.title,
        type: doc.document_type,
        department: doc.department_name,
        version: doc.version,
        effective_date: doc.effective_date,
        summary: doc.summary,
        file_url: doc.file_url,
      })),
    };
  }

  async getDocument(documentId) {
    const document = await db.query(
      `
      SELECT 
        qd.*,
        d.name as department_name,
        u1.name as created_by_name,
        u2.name as approved_by_name
      FROM quality_documents qd
      LEFT JOIN departments d ON qd.department_id = d.id
      LEFT JOIN users u1 ON qd.created_by = u1.id
      LEFT JOIN users u2 ON qd.approved_by = u2.id
      WHERE qd.document_id = ? AND qd.status = 'active'
    `,
      [documentId]
    );

    if (!document.length) {
      return { error: "找不到該文件或文件已失效" };
    }

    // 記錄文件查閱記錄
    await this.logDocumentAccess(documentId);

    return {
      success: true,
      data: document[0],
    };
  }

  async getProcedures(department) {
    const procedures = await db.query(
      `
      SELECT 
        qd.document_id,
        qd.title,
        qd.version,
        qd.effective_date,
        qd.review_date,
        CASE 
          WHEN qd.review_date < CURDATE() THEN 'OVERDUE'
          WHEN qd.review_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 'DUE_SOON'
          ELSE 'CURRENT'
        END as review_status
      FROM quality_documents qd
      LEFT JOIN departments d ON qd.department_id = d.id
      WHERE qd.document_type = 'SOP' 
      AND qd.status = 'active'
      AND d.name = ?
      ORDER BY qd.review_date ASC
    `,
      [department]
    );

    return {
      success: true,
      data: procedures,
      summary: {
        total_procedures: procedures.length,
        overdue_count: procedures.filter((p) => p.review_status === "OVERDUE")
          .length,
        due_soon_count: procedures.filter((p) => p.review_status === "DUE_SOON")
          .length,
      },
    };
  }
}
```

## 🔧 MCP 整合到系統

### 1. **MCP 註冊和管理**

```javascript
// mcp-manager.js
class MCPManager {
  constructor() {
    this.tools = new Map();
    this.loadTools();
  }

  loadTools() {
    // 註冊所有MCP工具
    this.registerTool(new HRMCPTool());
    this.registerTool(new FinanceMCPTool());
    this.registerTool(new QualityDocMCPTool());
  }

  registerTool(tool) {
    this.tools.set(tool.name, tool);

    // 保存到資料庫
    this.saveTool({
      name: tool.name,
      display_name: tool.description,
      tool_type: "custom",
      config: {
        schema: tool.getSchema(),
        parameters: tool.parameters,
      },
    });
  }

  async executeTool(toolName, parameters, context) {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`找不到工具: ${toolName}`);
    }

    // 權限檢查
    await this.checkPermissions(toolName, context.user);

    // 執行工具
    const result = await tool.execute(parameters);

    // 記錄使用日誌
    await this.logToolUsage(toolName, parameters, result, context);

    return result;
  }

  async checkPermissions(toolName, user) {
    // 檢查用戶是否有權限使用該工具
    const permissions = await db.query(
      `
      SELECT * FROM user_tool_permissions 
      WHERE user_id = ? AND tool_name = ?
    `,
      [user.id, toolName]
    );

    if (!permissions.length) {
      throw new Error("沒有權限使用此工具");
    }
  }
}
```

### 2. **AI 模型整合**

```javascript
// ai-chat-service.js
class AIChatService {
  constructor() {
    this.mcpManager = new MCPManager();
  }

  async processMessage(message, conversation) {
    // 1. 檢查是否需要調用MCP工具
    const toolCalls = await this.detectToolCalls(message);

    if (toolCalls.length > 0) {
      // 2. 執行MCP工具
      const toolResults = await this.executeTools(toolCalls, conversation);

      // 3. 將工具結果整合到AI回應中
      return await this.generateResponseWithTools(
        message,
        toolResults,
        conversation
      );
    } else {
      // 4. 普通對話
      return await this.generateNormalResponse(message, conversation);
    }
  }

  async detectToolCalls(message) {
    // 使用AI模型分析是否需要調用工具
    const systemPrompt = `
    分析用戶訊息，判斷是否需要調用以下工具：
    
    1. hr_assistant: 查詢員工資訊、請假記錄、薪資等HR相關資料
    2. finance_assistant: 查詢預算、費用、收入等財務資料
    3. quality_doc_assistant: 搜尋品質文件、SOP、作業指導書等
    
    如果需要調用工具，請返回JSON格式：
    {
      "tool_calls": [
        {
          "tool": "工具名稱",
          "parameters": {
            "參數名": "參數值"
          }
        }
      ]
    }
    
    如果不需要調用工具，返回：{"tool_calls": []}
    `;

    const response = await this.callAI([
      { role: "system", content: systemPrompt },
      { role: "user", content: message },
    ]);

    try {
      const parsed = JSON.parse(response.content);
      return parsed.tool_calls || [];
    } catch {
      return [];
    }
  }

  async executeTools(toolCalls, conversation) {
    const results = [];

    for (const toolCall of toolCalls) {
      try {
        const result = await this.mcpManager.executeTool(
          toolCall.tool,
          toolCall.parameters,
          { user: conversation.user }
        );
        results.push({
          tool: toolCall.tool,
          success: true,
          data: result,
        });
      } catch (error) {
        results.push({
          tool: toolCall.tool,
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }

  async generateResponseWithTools(message, toolResults, conversation) {
    const toolContext = toolResults
      .map((result) => {
        if (result.success) {
          return `工具 ${result.tool} 執行結果：${JSON.stringify(
            result.data,
            null,
            2
          )}`;
        } else {
          return `工具 ${result.tool} 執行失敗：${result.error}`;
        }
      })
      .join("\n\n");

    const systemPrompt = `
    基於以下工具執行結果，回答用戶的問題：
    
    ${toolContext}
    
    請用自然語言整理和解釋這些資料，提供有用的見解和建議。
    `;

    return await this.callAI([
      { role: "system", content: systemPrompt },
      { role: "user", content: message },
    ]);
  }
}
```

### 3. **前端使用界面**

```vue
<!-- MCP工具選擇器 -->
<template>
  <div class="mcp-tools">
    <h3>🛠️ 可用工具</h3>
    <div class="tool-grid">
      <div
        v-for="tool in availableTools"
        :key="tool.name"
        class="tool-card"
        @click="selectTool(tool)">
        <div class="tool-icon">{{ tool.icon }}</div>
        <div class="tool-name">{{ tool.display_name }}</div>
        <div class="tool-desc">{{ tool.description }}</div>
      </div>
    </div>

    <!-- 工具參數輸入 -->
    <div
      v-if="selectedTool"
      class="tool-params">
      <h4>{{ selectedTool.display_name }} 參數設定</h4>
      <a-form @submit="executeTool">
        <a-form-item
          v-for="(param, key) in selectedTool.parameters"
          :key="key"
          :label="param.description">
          <a-input
            v-if="param.type === 'string'"
            v-model="toolParams[key]"
            :placeholder="param.description" />
          <a-select
            v-else-if="param.enum"
            v-model="toolParams[key]">
            <a-select-option
              v-for="option in param.enum"
              :key="option"
              :value="option">
              {{ option }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-button
          type="primary"
          html-type="submit">
          執行工具
        </a-button>
      </a-form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";

const availableTools = ref([
  {
    name: "hr_assistant",
    display_name: "HR助手",
    description: "查詢員工資訊、請假記錄等",
    icon: "👥",
  },
  {
    name: "finance_assistant",
    display_name: "財務助手",
    description: "查詢預算、費用、收入等",
    icon: "💰",
  },
  {
    name: "quality_doc_assistant",
    display_name: "品質文件助手",
    description: "搜尋SOP、作業指導書等",
    icon: "📋",
  },
]);

const selectedTool = ref(null);
const toolParams = ref({});

const selectTool = (tool) => {
  selectedTool.value = tool;
  toolParams.value = {};
};

const executeTool = async () => {
  try {
    const result = await fetch("/api/mcp/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tool: selectedTool.value.name,
        parameters: toolParams.value,
      }),
    });

    const data = await result.json();
    console.log("工具執行結果:", data);
  } catch (error) {
    console.error("工具執行失敗:", error);
  }
};
</script>
```

## 🔒 安全性考量

### 1. **權限控制**

```sql
-- 用戶工具權限表
CREATE TABLE user_tool_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    tool_name VARCHAR(100) NOT NULL,
    permissions JSON, -- 具體權限配置
    granted_by INT,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (granted_by) REFERENCES users(id),
    UNIQUE KEY unique_user_tool (user_id, tool_name)
);
```

### 2. **資料脫敏**

```javascript
// 敏感資料處理
class DataMasking {
  static maskSalary(salary) {
    // 只顯示薪資範圍，不顯示具體數字
    if (salary < 30000) return "< 30K";
    if (salary < 50000) return "30K - 50K";
    if (salary < 80000) return "50K - 80K";
    return "> 80K";
  }

  static maskPersonalInfo(data) {
    return {
      ...data,
      phone: data.phone?.replace(/(\d{4})(\d{3})(\d{3})/, "$1***$3"),
      email: data.email?.replace(/(.{2}).*@/, "$1***@"),
    };
  }
}
```

## 🎯 使用場景示例

### HR 查詢對話

```
用戶: "幫我查一下員工E001的請假記錄"
AI: 正在查詢員工E001的請假記錄...
[調用 hr_assistant 工具]
AI: 根據查詢結果，員工E001在最近3個月有以下請假記錄：
- 2024/11/15-16: 事假 2天 (已核准)
- 2024/10/20-22: 年假 3天 (已核准)
- 2024/09/05: 病假 1天 (已核准)
總計使用假期6天。
```

### 財務查詢對話

```
用戶: "IT部門這個月的預算使用情況如何？"
AI: 讓我查詢IT部門本月的預算使用情況...
[調用 finance_assistant 工具]
AI: IT部門2024年11月預算使用情況：
- 硬體設備: 已使用 85% (42.5萬/50萬)
- 軟體授權: 已使用 60% (18萬/30萬)
- 維護費用: 已使用 40% (8萬/20萬)
整體預算使用率 68.5%，建議控制硬體採購支出。
```
