/**
 * 聊天服務
 * 處理聊天相關的業務邏輯，包含 MCP 工具整合
 */

import McpToolModel from "../models/McpTool.model.js";
import mcpToolParser from "./mcpToolParser.service.js";
import logger from "../utils/logger.util.js";

class ChatService {
  constructor() {
    this.systemPromptCache = null;
    this.cacheExpiry = null;
    this.cacheTimeout = 5 * 60 * 1000; // 5分鐘快取
  }

  /**
   * 生成動態 System Prompt，包含 MCP 工具資訊
   * @param {string} basePrompt - 基礎系統提示詞
   * @param {Object} options - 選項
   * @returns {Promise<string>} 完整的系統提示詞
   */
  async generateSystemPrompt(basePrompt = "", options = {}) {
    try {
      // 檢查快取
      if (
        this.systemPromptCache &&
        this.cacheExpiry &&
        Date.now() < this.cacheExpiry
      ) {
        logger.debug("使用快取的系統提示詞");
        return this.combinePrompts(basePrompt, this.systemPromptCache);
      }

      // 獲取已啟用的 MCP 工具
      const enabledTools = await McpToolModel.getEnabledMcpTools();

      if (enabledTools.length === 0) {
        logger.debug("未發現啟用的 MCP 工具，使用基礎系統提示詞");
        return basePrompt;
      }

      // 按服務分組工具
      const toolsByService = this.groupToolsByService(enabledTools);

      // 生成工具相關的系統提示詞
      const toolPrompt = this.generateToolPrompt(toolsByService);

      // 更新快取
      this.systemPromptCache = toolPrompt;
      this.cacheExpiry = Date.now() + this.cacheTimeout;

      logger.info("動態系統提示詞生成完成", {
        toolCount: enabledTools.length,
        serviceCount: Object.keys(toolsByService).length,
        promptLength: toolPrompt.length,
      });

      return this.combinePrompts(basePrompt, toolPrompt);
    } catch (error) {
      logger.error("生成系統提示詞失敗", {
        error: error.message,
      });
      return basePrompt; // 降級到基礎提示詞
    }
  }

  /**
   * 按服務分組工具
   * @param {Array} tools - 工具列表
   * @returns {Object} 按服務分組的工具
   */
  groupToolsByService(tools) {
    const grouped = {};

    for (const tool of tools) {
      const serviceName = tool.service_name || "未知服務";

      if (!grouped[serviceName]) {
        grouped[serviceName] = {
          service_name: serviceName,
          endpoint: tool.service_endpoint,
          tools: [],
        };
      }

      grouped[serviceName].tools.push({
        name: tool.name,
        description: tool.description,
        category: tool.category,
        priority: tool.priority,
        input_schema: tool.input_schema,
        usage_count: tool.usage_count,
      });
    }

    // 按優先級排序工具
    for (const service of Object.values(grouped)) {
      service.tools.sort((a, b) => (b.priority || 1) - (a.priority || 1));
    }

    return grouped;
  }

  /**
   * 生成工具相關的系統提示詞
   * @param {Object} toolsByService - 按服務分組的工具
   * @returns {string} 工具提示詞
   */
  generateToolPrompt(toolsByService) {
    const sections = [];

    sections.push("## 🛠️ 可用工具系統");
    sections.push("");
    sections.push(
      "您現在可以使用以下 MCP (Model Context Protocol) 工具來協助用戶："
    );
    sections.push("");

    // 為每個服務生成說明
    for (const [serviceName, serviceInfo] of Object.entries(toolsByService)) {
      sections.push(`### 📋 ${serviceName}`);
      if (serviceInfo.endpoint) {
        sections.push(`**端點**: ${serviceInfo.endpoint}`);
      }
      sections.push("");

      // 為每個工具生成說明
      for (const tool of serviceInfo.tools) {
        sections.push(`#### 🔧 ${tool.name}`);

        if (tool.description) {
          sections.push(`**說明**: ${tool.description}`);
        }

        if (tool.category && tool.category !== "general") {
          sections.push(`**分類**: ${tool.category}`);
        }

        // 生成參數說明
        if (tool.input_schema && typeof tool.input_schema === "object") {
          const paramText = this.generateParameterText(tool.input_schema);
          if (paramText) {
            sections.push(`**參數**: ${paramText}`);
          }
        }

        // 使用統計
        if (tool.usage_count > 0) {
          sections.push(`**使用次數**: ${tool.usage_count}`);
        }

        sections.push("");
      }
    }

    // 添加使用說明
    sections.push("## 📝 工具調用格式");
    sections.push("");
    sections.push("您可以使用以下任一格式調用工具：");
    sections.push("");
    sections.push("### 1. JSON 格式（推薦）");
    sections.push("```json");
    sections.push(`{`);
    sections.push(`  "tool": "工具名稱",`);
    sections.push(`  "parameters": {`);
    sections.push(`    "參數1": "值1",`);
    sections.push(`    "參數2": "值2"`);
    sections.push(`  }`);
    sections.push(`}`);
    sections.push("```");
    sections.push("");

    sections.push("### 2. 函數調用格式");
    sections.push('工具名稱(參數1="值1", 參數2="值2")');
    sections.push("");

    sections.push("### 3. XML 格式");
    sections.push("<tool_call>");
    sections.push("  <name>工具名稱</name>");
    sections.push(
      '  <parameters>{"參數1": "值1", "參數2": "值2"}</parameters>'
    );
    sections.push("</tool_call>");
    sections.push("");

    // 添加注意事項
    sections.push("## ⚠️ 重要提醒");
    sections.push("");
    sections.push("1. **工具調用時機**: 只在用戶明確需要特定功能時才調用工具");
    sections.push("2. **參數驗證**: 確保提供的參數符合工具要求的格式");
    sections.push(
      "3. **錯誤處理**: 如果工具調用失敗，請向用戶解釋並提供替代方案"
    );
    sections.push("4. **結果說明**: 工具執行後，請向用戶清楚說明結果");
    sections.push("5. **隱私保護**: 不要在工具調用中包含敏感或個人資訊");
    sections.push("");

    return sections.join("\n");
  }

  /**
   * 生成參數說明文本
   * @param {Object} schema - 參數模式
   * @returns {string} 參數說明
   */
  generateParameterText(schema) {
    if (!schema || typeof schema !== "object") {
      return "";
    }

    const params = [];

    // 處理 JSON Schema 格式
    if (schema.properties) {
      for (const [name, prop] of Object.entries(schema.properties)) {
        let paramDesc = name;

        if (prop.type) {
          paramDesc += ` (${prop.type})`;
        }

        if (prop.description) {
          paramDesc += ` - ${prop.description}`;
        }

        if (schema.required && schema.required.includes(name)) {
          paramDesc += " *必填*";
        }

        params.push(paramDesc);
      }
    } else {
      // 簡單的對象格式
      for (const [name, value] of Object.entries(schema)) {
        if (typeof value === "string") {
          params.push(`${name} - ${value}`);
        } else {
          params.push(name);
        }
      }
    }

    return params.join(", ");
  }

  /**
   * 組合基礎提示詞和工具提示詞
   * @param {string} basePrompt - 基礎提示詞
   * @param {string} toolPrompt - 工具提示詞
   * @returns {string} 組合後的提示詞
   */
  combinePrompts(basePrompt, toolPrompt) {
    if (!toolPrompt) {
      return basePrompt;
    }

    if (!basePrompt) {
      return toolPrompt;
    }

    return `${basePrompt}\n\n${toolPrompt}`;
  }

  /**
   * 處理聊天消息，包含工具調用檢測和執行
   * @param {string} aiResponse - AI 的回應
   * @param {Object} context - 聊天上下文
   * @returns {Promise<Object>} 處理結果
   */
  async processChatMessage(aiResponse, context = {}) {
    try {
      // 檢查是否包含工具調用
      if (!mcpToolParser.hasToolCalls(aiResponse)) {
        return {
          original_response: aiResponse,
          has_tool_calls: false,
          final_response: aiResponse,
        };
      }

      logger.info("檢測到工具調用", {
        userId: context.user_id,
        conversationId: context.conversation_id,
        responseLength: aiResponse.length,
      });

      // 解析工具調用
      const toolCalls = await mcpToolParser.parseToolCalls(aiResponse, context);

      if (toolCalls.length === 0) {
        return {
          original_response: aiResponse,
          has_tool_calls: false,
          final_response: aiResponse,
          tool_calls: [],
        };
      }

      // 執行工具調用
      const toolResults = await mcpToolParser.executeToolCalls(
        toolCalls,
        context
      );

      // 格式化工具結果
      const formattedResults = mcpToolParser.formatToolResults(toolResults);

      // 組合最終回應
      const finalResponse = this.combineResponseWithResults(
        aiResponse,
        formattedResults,
        toolResults
      );

      return {
        original_response: aiResponse,
        has_tool_calls: true,
        tool_calls: toolCalls,
        tool_results: toolResults,
        formatted_results: formattedResults,
        final_response: finalResponse,
      };
    } catch (error) {
      logger.error("處理聊天消息失敗", {
        error: error.message,
        userId: context.user_id,
        conversationId: context.conversation_id,
      });

      return {
        original_response: aiResponse,
        has_tool_calls: false,
        final_response: aiResponse,
        error: error.message,
      };
    }
  }

  /**
   * 組合 AI 回應和工具執行結果
   * @param {string} originalResponse - 原始 AI 回應
   * @param {string} formattedResults - 格式化的工具結果
   * @param {Array} toolResults - 工具執行結果
   * @returns {string} 組合後的回應
   */
  combineResponseWithResults(originalResponse, formattedResults, toolResults) {
    // 移除原始回應中的工具調用指令
    let cleanResponse = originalResponse;

    // 移除 JSON 格式的工具調用
    cleanResponse = cleanResponse.replace(/```json\s*\{[\s\S]*?\}\s*```/gi, "");

    // 移除 XML 格式的工具調用
    cleanResponse = cleanResponse.replace(
      /<tool_call[\s\S]*?<\/tool_call>/gi,
      ""
    );

    // 清理多餘的空白
    cleanResponse = cleanResponse.replace(/\n\s*\n\s*\n/g, "\n\n").trim();

    // 檢查是否有成功的工具執行
    const hasSuccessfulTools = toolResults.some((result) => result.success);

    if (!hasSuccessfulTools) {
      return `${cleanResponse}\n\n⚠️ **工具執行遇到問題**\n\n${formattedResults}`;
    }

    // 組合回應
    const sections = [];

    if (cleanResponse) {
      sections.push(cleanResponse);
    }

    sections.push("## 🔧 工具執行結果");
    sections.push("");
    sections.push(formattedResults);

    return sections.join("\n\n");
  }

  /**
   * 清除系統提示詞快取
   */
  clearCache() {
    this.systemPromptCache = null;
    this.cacheExpiry = null;
    logger.debug("系統提示詞快取已清除");
  }

  /**
   * 獲取工具統計資訊
   * @returns {Promise<Object>} 工具統計
   */
  async getToolStats() {
    try {
      const allTools = await McpToolModel.getAllMcpTools();
      const enabledTools = allTools.filter((tool) => tool.is_enabled);

      const categoryStats = {};
      let totalUsage = 0;

      for (const tool of enabledTools) {
        const category = tool.category || "general";

        if (!categoryStats[category]) {
          categoryStats[category] = {
            count: 0,
            usage: 0,
          };
        }

        categoryStats[category].count++;
        categoryStats[category].usage += tool.usage_count || 0;
        totalUsage += tool.usage_count || 0;
      }

      return {
        total_tools: allTools.length,
        enabled_tools: enabledTools.length,
        total_usage: totalUsage,
        category_stats: categoryStats,
        last_updated: new Date().toISOString(),
      };
    } catch (error) {
      logger.error("獲取工具統計失敗", { error: error.message });
      return null;
    }
  }
}

// 創建全局實例
const chatService = new ChatService();

export default chatService;
