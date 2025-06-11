/**
 * Qwen-Agent 控制器
 * 處理 Qwen-Agent 相關的 API 請求
 */

import qwenAgentService from "../services/qwenAgent.service.js";
import chatService from "../services/chat.service.js";
import logger from "../utils/logger.util.js";

/**
 * 初始化 Qwen-Agent 服務
 */
export const initializeQwenAgent = async (req, res) => {
  try {
    const result = await qwenAgentService.initialize();

    res.json({
      success: true,
      message: "Qwen-Agent 服務初始化成功",
      data: result,
    });
  } catch (error) {
    logger.error("初始化 Qwen-Agent 失敗:", error);
    res.status(500).json({
      success: false,
      message: "初始化 Qwen-Agent 失敗",
      error: error.message,
    });
  }
};

/**
 * 取得 Qwen-Agent 狀態
 */
export const getQwenAgentStatus = async (req, res) => {
  try {
    const status = await qwenAgentService.getAgentStatus();

    res.json(status);
  } catch (error) {
    logger.error("取得 Qwen-Agent 狀態失敗:", error);
    res.status(500).json({
      success: false,
      message: "取得狀態失敗",
      error: error.message,
    });
  }
};

/**
 * 取得 MCP 工具列表
 */
export const getMcpTools = async (req, res) => {
  try {
    const tools = await qwenAgentService.getMcpTools();

    res.json({
      success: true,
      message: "取得 MCP 工具列表成功",
      data: tools,
    });
  } catch (error) {
    logger.error("取得 MCP 工具列表失敗:", error);
    res.status(500).json({
      success: false,
      message: "取得工具列表失敗",
      error: error.message,
    });
  }
};

/**
 * 調用 MCP 工具
 */
export const callMcpTool = async (req, res) => {
  try {
    const { toolName } = req.params;
    const parameters = req.body;

    const result = await qwenAgentService.callMcpTool(toolName, parameters);

    res.json({
      success: true,
      message: "工具調用完成",
      data: result,
    });
  } catch (error) {
    logger.error("調用 MCP 工具失敗:", error);
    res.status(500).json({
      success: false,
      message: "工具調用失敗",
      error: error.message,
    });
  }
};

/**
 * 處理 Qwen-Agent 對話
 */
export const processQwenAgentMessage = async (req, res) => {
  try {
    console.log("=== QWEN AGENT: 開始處理對話請求 ===");
    console.log("請求體:", JSON.stringify(req.body, null, 2));

    const { agentId, message, conversationHistory = [] } = req.body;

    // 1. 先使用 qwenAgentService 生成 AI 回應（包含工具調用指令）
    const agentConfig = {
      system_prompt: `你是一個專業的企業 AI 助理，可以協助處理 HR、財務和任務管理相關的工作。

## 可用工具列表

### HR 人力資源工具
- **get_employee_info**: 獲取員工資訊
- **get_employee_list**: 獲取員工列表  
- **get_attendance_record**: 獲取出勤記錄
- **get_salary_info**: 獲取薪資資訊
- **get_department_list**: 獲取部門列表

### 財務工具
- **get_budget_status**: 獲取預算狀態

### 任務管理工具  
- **create_task**: 創建任務
- **get_task_list**: 獲取任務列表

## 工具調用格式

當需要使用工具時，請使用以下格式：

\`\`\`
<tool_call>
工具名稱
{"參數1": "值1", "參數2": "值2"}
</tool_call>
\`\`\`

例如：
- 查詢部門列表：
\`\`\`
<tool_call>
get_department_list
{"sortBy": "code"}
</tool_call>
\`\`\`

- 獲取員工資訊：
\`\`\`
<tool_call>
get_employee_info  
{"employeeId": "A001"}
</tool_call>
\`\`\`

## 重要規則
1. 當用戶詢問需要查詢數據的問題時，**必須**使用相應的工具調用
2. 不要僅憑記憶或假設提供數據，而是使用工具獲取最新資訊
3. 工具調用完成後，將結果以友好的方式呈現給用戶
4. 如果工具調用失敗，請向用戶說明並提供可能的解決方案`,
    };

    console.log("=== 第一步：生成 AI 回應 ===");
    const aiResponse = await qwenAgentService.processMessage(
      agentConfig,
      message,
      conversationHistory
    );

    console.log("AI 原始回應:", aiResponse);

    // 2. 然後使用 chatService 解析和執行工具調用
    console.log("=== 第二步：解析和執行工具調用 ===");
    const chatResult = await chatService.processChatMessage(
      aiResponse.response,
      {
        user_id: req.user.id,
        conversation_id: agentId,
        model_id: 27,
      }
    );

    console.log("=== QWEN AGENT: 聊天服務處理結果 ===");
    console.log("has_tool_calls:", chatResult.has_tool_calls);
    console.log("tool_calls 數量:", chatResult.tool_calls?.length || 0);
    console.log("tool_results 數量:", chatResult.tool_results?.length || 0);

    // 返回與前端期望格式兼容的結果
    const result = {
      success: true,
      response: chatResult.final_response || chatResult.original_response,
      hasToolCalls: chatResult.has_tool_calls,
      toolCalls: chatResult.tool_calls || [],
      toolResults: chatResult.tool_results || [],
      metadata: {
        has_tool_calls: chatResult.has_tool_calls,
        tool_calls: chatResult.tool_calls || [],
        tool_results: chatResult.tool_results || [],
        original_response: chatResult.original_response,
      },
    };

    console.log("=== QWEN AGENT: 最終返回結果 ===");
    console.log("最終結果摘要:", {
      hasToolCalls: result.hasToolCalls,
      toolCallsCount: result.toolCalls.length,
      toolResultsCount: result.toolResults.length,
      responseLength: result.response?.length || 0,
    });

    res.json({
      success: true,
      message: "對話處理完成",
      data: result,
    });
  } catch (error) {
    console.error("=== QWEN AGENT: 處理失敗 ===", error);
    logger.error("處理 Qwen-Agent 對話失敗:", error);
    res.status(500).json({
      success: false,
      message: "對話處理失敗",
      error: error.message,
    });
  }
};

/**
 * 創建 Qwen-Agent
 */
export const createQwenAgent = async (req, res) => {
  try {
    const agentData = req.body;
    const userId = req.user.id;

    const qwenConfig = await qwenAgentService.createQwenAgent(
      agentData,
      userId
    );

    res.json({
      success: true,
      message: "Qwen-Agent 配置創建成功",
      data: qwenConfig,
    });
  } catch (error) {
    logger.error("創建 Qwen-Agent 失敗:", error);
    res.status(500).json({
      success: false,
      message: "創建 Qwen-Agent 失敗",
      error: error.message,
    });
  }
};

/**
 * 測試 Qwen-Agent 功能
 */
export const testQwenAgent = async (req, res) => {
  try {
    const { testCase = "basic" } = req.query;

    let testMessage;
    switch (testCase) {
      case "hr":
        testMessage = "請查詢所有部門的資料";
        break;
      case "tasks":
        testMessage = "幫我建立一個新的任務：整理月度報告";
        break;
      case "finance":
        testMessage = "查詢目前的預算狀況";
        break;
      default:
        testMessage = "您好，請介紹一下您可以提供什麼服務？";
    }

    const agentConfig = {
      system_prompt:
        "你是一個專業的企業 AI 助理，可以協助處理 HR、財務和任務管理相關的工作。",
    };

    const result = await qwenAgentService.processMessage(
      agentConfig,
      testMessage,
      []
    );

    res.json({
      success: true,
      message: `Qwen-Agent 測試完成 (${testCase})`,
      data: {
        testCase: testCase,
        testMessage: testMessage,
        result: result,
      },
    });
  } catch (error) {
    logger.error("測試 Qwen-Agent 失敗:", error);
    res.status(500).json({
      success: false,
      message: "測試失敗",
      error: error.message,
    });
  }
};
