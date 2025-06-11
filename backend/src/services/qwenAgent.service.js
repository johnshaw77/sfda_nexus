/**
 * Qwen-Agent 服務層
 * 整合 Qwen-Agent 框架與 MCP 工具到 SFDA Nexus
 */

import axios from "axios";
import logger from "../utils/logger.util.js";

class QwenAgentService {
  constructor() {
    this.mcpServerUrl = process.env.MCP_SERVER_URL || "http://localhost:8080";
    this.ollamaUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    this.qwenModel = process.env.OLLAMA_MODEL || "qwen3:32b";

    // MCP 工具快取
    this.toolsCache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 分鐘快取
  }

  /**
   * 初始化 Qwen-Agent 服務
   */
  async initialize() {
    try {
      // 檢查 MCP Server 連接
      await this.checkMcpConnection();

      // 檢查 Ollama 服務
      await this.checkOllamaConnection();

      // 載入 MCP 工具
      await this.loadMcpTools();

      logger.info("🤖 Qwen-Agent 服務初始化成功");
      return true;
    } catch (error) {
      logger.error("❌ Qwen-Agent 服務初始化失敗:", error.message);
      throw error;
    }
  }

  /**
   * 檢查 MCP Server 連接
   */
  async checkMcpConnection() {
    try {
      const response = await axios.get(`${this.mcpServerUrl}/health`, {
        timeout: 5000,
      });

      if (response.status === 200) {
        logger.info("✅ MCP Server 連接正常");
        return true;
      }
      throw new Error("MCP Server 健康檢查失敗");
    } catch (error) {
      logger.error("❌ MCP Server 連接失敗:", error.message);
      throw new Error("無法連接到 MCP Server");
    }
  }

  /**
   * 檢查 Ollama 連接
   */
  async checkOllamaConnection() {
    try {
      const response = await axios.get(`${this.ollamaUrl}/api/tags`, {
        timeout: 5000,
      });

      if (response.status === 200) {
        const models = response.data.models || [];
        const qwenModel = models.find((m) => m.name.includes("qwen"));

        if (qwenModel) {
          logger.info(`✅ Ollama 連接正常，找到 Qwen 模型: ${qwenModel.name}`);
          return true;
        } else {
          logger.warn("⚠️ Ollama 連接正常，但未找到 Qwen 模型");
        }
      }
      return true;
    } catch (error) {
      logger.error("❌ Ollama 連接失敗:", error.message);
      throw new Error("無法連接到 Ollama 服務");
    }
  }

  /**
   * 載入 MCP 工具
   */
  async loadMcpTools() {
    try {
      const tools = await this.getMcpTools();
      this.toolsCache.set("mcp_tools", {
        data: tools,
        timestamp: Date.now(),
      });

      logger.info(`📋 已載入 ${tools.length} 個 MCP 工具`);
      return tools;
    } catch (error) {
      logger.error("❌ 載入 MCP 工具失敗:", error.message);
      throw error;
    }
  }

  /**
   * 取得 MCP 工具列表
   */
  async getMcpTools() {
    try {
      // 檢查快取
      const cached = this.toolsCache.get("mcp_tools");
      if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.data;
      }

      const tools = [];

      // HR 工具
      const hrResponse = await axios.get(`${this.mcpServerUrl}/api/hr/tools`);
      if (hrResponse.data.success) {
        tools.push(...this.formatMcpTools(hrResponse.data.data, "hr"));
      }

      // 任務管理工具
      const taskResponse = await axios.get(
        `${this.mcpServerUrl}/api/tasks/tools`
      );
      if (taskResponse.data.success) {
        tools.push(...this.formatMcpTools(taskResponse.data.data, "tasks"));
      }

      // 財務工具
      const financeResponse = await axios.get(
        `${this.mcpServerUrl}/api/finance/tools`
      );
      if (financeResponse.data.success) {
        tools.push(
          ...this.formatMcpTools(financeResponse.data.data, "finance")
        );
      }

      return tools;
    } catch (error) {
      logger.error("取得 MCP 工具失敗:", error.message);
      throw error;
    }
  }

  /**
   * 格式化 MCP 工具為 Qwen-Agent 格式
   */
  formatMcpTools(tools, module) {
    return tools.map((tool) => ({
      name: `${module}.${tool.name}`,
      description: tool.description,
      parameters: tool.parameters || {},
      module: module,
      originalTool: tool,
    }));
  }

  /**
   * 調用 MCP 工具
   */
  async callMcpTool(toolName, parameters = {}) {
    try {
      const [module, toolFunction] = toolName.split(".");

      logger.info(`🔧 調用 MCP 工具: ${toolName}`, { parameters });
      logger.info(`🔧 模組: ${module}, 工具函數: ${toolFunction}`);

      const fullUrl = `${this.mcpServerUrl}/api/${module}/${toolFunction}`;
      logger.info(`🔧 完整 URL: ${fullUrl}`);
      logger.info(`🔧 MCP Server URL: ${this.mcpServerUrl}`);

      const response = await axios.post(fullUrl, parameters, {
        timeout: 30000,
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.data.success) {
        logger.info(`✅ 工具調用成功: ${toolName}`);
        return {
          success: true,
          result: response.data.result || response.data.data,
          toolName: toolName,
        };
      } else {
        throw new Error(response.data.message || "工具調用失敗");
      }
    } catch (error) {
      logger.error(`❌ 工具調用失敗: ${toolName}`, error.message);
      return {
        success: false,
        error: error.message,
        toolName: toolName,
      };
    }
  }

  /**
   * 處理 Qwen-Agent 對話
   */
  async processMessage(agentConfig, userMessage, conversationHistory = []) {
    try {
      // 建構 Qwen 對話請求
      const messages = this.buildMessages(
        agentConfig,
        userMessage,
        conversationHistory
      );

      // 取得可用工具
      const tools = await this.getMcpTools();

      // 調用 Ollama Qwen 模型
      const response = await this.callOllamaChat(messages, tools);

      // 處理工具調用
      if (response.tool_calls && response.tool_calls.length > 0) {
        const toolResults = await this.executeToolCalls(response.tool_calls);
        return {
          success: true,
          response: response.content,
          toolCalls: response.tool_calls,
          toolResults: toolResults,
          hasToolCalls: true,
        };
      }

      return {
        success: true,
        response: response.content,
        hasToolCalls: false,
      };
    } catch (error) {
      logger.error("Qwen-Agent 處理訊息失敗:", error.message);
      throw error;
    }
  }

  /**
   * 建構對話訊息
   */
  buildMessages(agentConfig, userMessage, conversationHistory) {
    const messages = [
      {
        role: "system",
        content: this.buildSystemPrompt(agentConfig),
      },
    ];

    // 添加對話歷史
    conversationHistory.forEach((msg) => {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    });

    // 添加用戶訊息
    messages.push({
      role: "user",
      content: userMessage,
    });

    return messages;
  }

  /**
   * 建構系統提示詞
   */
  buildSystemPrompt(agentConfig) {
    const basePrompt =
      agentConfig.system_prompt || "你是一個專業的企業 AI 助理。";

    const toolPrompt = `

你現在可以使用以下企業工具：

🏢 **HR 工具**：
- hr.get_employee_info - 查詢員工基本資料
- hr.get_attendance_records - 查詢出勤記錄
- hr.get_department_list - 查詢部門列表
- hr.get_salary_info - 查詢薪資資料

📋 **任務管理工具**：
- tasks.create_task - 建立新任務
- tasks.get_task_list - 查詢任務清單

💰 **財務工具**：
- finance.get_budget_info - 查詢預算資訊

**使用指南**：
1. 根據用戶需求智能選擇合適的工具
2. 多個相關工具可以組合使用
3. 用繁體中文回應，保持專業友善的語調
4. 工具調用結果要格式化呈現，便於用戶理解

請協助用戶處理各種企業相關的查詢和任務。`;

    return basePrompt + toolPrompt;
  }

  /**
   * 調用 Ollama 聊天 API
   */
  async callOllamaChat(messages, tools = []) {
    try {
      const payload = {
        model: this.qwenModel,
        messages: messages,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.8,
          max_tokens: 4096,
        },
      };

      // 如果有工具可用，添加工具定義
      if (tools.length > 0) {
        payload.tools = tools.map((tool) => ({
          type: "function",
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters,
          },
        }));
      }

      const response = await axios.post(`${this.ollamaUrl}/api/chat`, payload, {
        timeout: 60000,
        headers: {
          "Content-Type": "application/json",
        },
      });

      return response.data.message;
    } catch (error) {
      logger.error("Ollama 聊天 API 調用失敗:", error.message);
      throw error;
    }
  }

  /**
   * 執行工具調用
   */
  async executeToolCalls(toolCalls) {
    const results = [];

    for (const toolCall of toolCalls) {
      const { name: toolName, arguments: toolArgs } = toolCall.function;

      try {
        const result = await this.callMcpTool(toolName, toolArgs);
        results.push({
          toolCall: toolCall,
          result: result,
        });
      } catch (error) {
        results.push({
          toolCall: toolCall,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * 創建 Qwen-Agent 配置
   */
  async createQwenAgent(agentData, userId) {
    try {
      // 驗證 Qwen 模型可用性
      await this.checkOllamaConnection();

      // 擴展 agent 配置，添加 Qwen 特定設置
      const qwenConfig = {
        ...agentData,
        capabilities: JSON.stringify({
          ...JSON.parse(agentData.capabilities || "{}"),
          qwen_enabled: true,
          mcp_tools_enabled: true,
          auto_tool_selection: true,
        }),
        tools: JSON.stringify({
          mcp_tools: await this.getMcpTools(),
          tool_selection_mode: "auto",
        }),
      };

      return qwenConfig;
    } catch (error) {
      logger.error("創建 Qwen-Agent 配置失敗:", error.message);
      throw error;
    }
  }

  /**
   * 取得 Qwen-Agent 狀態
   */
  async getAgentStatus() {
    try {
      const [mcpStatus, ollamaStatus] = await Promise.allSettled([
        this.checkMcpConnection(),
        this.checkOllamaConnection(),
      ]);

      const tools = await this.getMcpTools();

      return {
        success: true,
        status: {
          mcp_server: mcpStatus.status === "fulfilled",
          ollama_service: ollamaStatus.status === "fulfilled",
          tools_loaded: tools.length,
          qwen_model: this.qwenModel,
          last_check: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

// 建立單例實例
const qwenAgentService = new QwenAgentService();

export default qwenAgentService;
