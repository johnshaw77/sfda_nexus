/**
 * MCP 工具調用解析器服務
 * 負責解析 AI 回應中的工具調用指令並執行
 */

import McpToolModel from "../models/McpTool.model.js";
import mcpClient from "./mcp.service.js";
import logger from "../utils/logger.util.js";

class McpToolParser {
  constructor() {
    // 工具調用的正則模式，支援多種格式
    this.toolCallPatterns = [
      // JSON 格式: {"tool": "tool_name", "parameters": {...}}
      /```json\s*(\{[\s\S]*?\})\s*```/gi,
      // 函數調用格式: tool_name(param1="value1", param2="value2")
      /(\w+)\s*\(\s*([^)]*)\s*\)/gi,
      // 標籤格式: <tool_call name="tool_name" params="...">
      /<tool_call\s+name="([^"]+)"\s*(?:params="([^"]*)")?\s*\/?>/gi,
      // XML 格式: <tool_call><name>tool_name</name><parameters>...</parameters></tool_call>
      /<tool_call>\s*<name>([^<]+)<\/name>\s*<parameters>([\s\S]*?)<\/parameters>\s*<\/tool_call>/gi,
      // 簡單格式: <tool_call>tool_name\nparameters_json</tool_call>
      /<tool_call>([\s\S]*?)<\/tool_call>/gi,
    ];
  }

  /**
   * 解析 AI 回應中的工具調用
   * @param {string} aiResponse - AI 的回應文本
   * @param {Object} context - 調用上下文
   * @returns {Promise<Array>} 解析出的工具調用列表
   */
  async parseToolCalls(aiResponse, context = {}) {
    const toolCalls = [];

    logger.debug("開始解析工具調用", {
      responseLength: aiResponse.length,
      userId: context.user_id,
    });

    try {
      // 使用各種模式解析工具調用
      for (const pattern of this.toolCallPatterns) {
        // 重置正規表達式的 lastIndex
        pattern.lastIndex = 0;

        let match;
        const patternMatches = [];

        while ((match = pattern.exec(aiResponse)) !== null) {
          patternMatches.push(match);
        }

        // 處理匹配結果
        for (const match of patternMatches) {
          const parsedCall = await this.parseIndividualCall(match, pattern);
          if (parsedCall) {
            toolCalls.push(parsedCall);
          }
        }
      }

      // 去除重複的工具調用
      const uniqueToolCalls = this.removeDuplicateCalls(toolCalls);

      logger.info("工具調用解析完成", {
        totalMatches: toolCalls.length,
        uniqueCalls: uniqueToolCalls.length,
        userId: context.user_id,
      });

      return uniqueToolCalls;
    } catch (error) {
      logger.error("工具調用解析失敗", {
        error: error.message,
        userId: context.user_id,
      });
      return [];
    }
  }

  /**
   * 解析單個工具調用匹配
   * @param {Array} match - 正則匹配結果
   * @param {RegExp} pattern - 使用的模式
   * @returns {Promise<Object|null>} 解析出的工具調用
   */
  async parseIndividualCall(match, pattern) {
    try {
      // JSON 格式
      if (pattern.source.includes("json")) {
        const jsonStr = match[1];
        const parsed = JSON.parse(jsonStr);

        if (parsed.tool && typeof parsed.tool === "string") {
          return {
            name: parsed.tool,
            parameters: parsed.parameters || parsed.params || {},
            format: "json",
          };
        }
      }

      // 函數調用格式
      if (pattern.source.includes("\\w+")) {
        const toolName = match[1];
        const paramStr = match[2] || "";
        const parameters = this.parseParameters(paramStr);

        return {
          name: toolName,
          parameters,
          format: "function",
        };
      }

      // 標籤格式
      if (
        pattern.source.includes("tool_call") &&
        pattern.source.includes("name=")
      ) {
        const toolName = match[1];
        const paramsStr = match[2] || "{}";

        let parameters = {};
        try {
          parameters = JSON.parse(paramsStr);
        } catch {
          parameters = this.parseParameters(paramsStr);
        }

        return {
          name: toolName,
          parameters,
          format: "tag",
        };
      }

      // 簡單格式: <tool_call>tool_name\nparameters_json</tool_call>
      if (
        pattern.source.includes("tool_call") &&
        pattern.source.includes("[\\s\\S]")
      ) {
        const content = match[1]?.trim();

        if (!content) return null;

        // 按行分割內容
        const lines = content
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line);

        if (lines.length === 0) return null;

        const toolName = lines[0];
        const paramsStr = lines.length > 1 ? lines[1] : "{}";

        let parameters = {};
        try {
          parameters = JSON.parse(paramsStr);
        } catch {
          // 如果參數不是 JSON，嘗試解析為鍵值對
          parameters = this.parseParameters(paramsStr);
        }

        return {
          name: toolName,
          parameters,
          format: "simple",
        };
      }

      // XML 格式
      if (pattern.source.includes("name>")) {
        const toolName = match[1];
        const paramsStr = match[2] || "{}";

        let parameters = {};
        try {
          parameters = JSON.parse(paramsStr);
        } catch {
          parameters = this.parseXmlParameters(paramsStr);
        }

        return {
          name: toolName,
          parameters,
          format: "xml",
        };
      }

      return null;
    } catch (error) {
      logger.warn("解析單個工具調用失敗", {
        error: error.message,
        match: match[0],
      });
      return null;
    }
  }

  /**
   * 解析參數字符串
   * @param {string} paramStr - 參數字符串
   * @returns {Object} 解析出的參數對象
   */
  parseParameters(paramStr) {
    const parameters = {};

    if (!paramStr || paramStr.trim() === "") {
      return parameters;
    }

    try {
      // 嘗試 JSON 解析
      return JSON.parse(paramStr);
    } catch {
      // 解析 key=value 格式
      const paramPattern =
        /(\w+)\s*=\s*"([^"]*)"|(\w+)\s*=\s*'([^']*)'|(\w+)\s*=\s*([^,\s]+)/g;
      let match;

      while ((match = paramPattern.exec(paramStr)) !== null) {
        const key = match[1] || match[3] || match[5];
        const value = match[2] || match[4] || match[6];

        if (key && value !== undefined) {
          // 嘗試轉換為適當的數據類型
          parameters[key] = this.convertValue(value);
        }
      }
    }

    return parameters;
  }

  /**
   * 解析 XML 格式的參數
   * @param {string} xmlStr - XML 字符串
   * @returns {Object} 解析出的參數對象
   */
  parseXmlParameters(xmlStr) {
    const parameters = {};

    // 簡單的 XML 標籤解析
    const xmlPattern = /<(\w+)>(.*?)<\/\1>/g;
    let match;

    while ((match = xmlPattern.exec(xmlStr)) !== null) {
      const key = match[1];
      const value = match[2];
      parameters[key] = this.convertValue(value);
    }

    return parameters;
  }

  /**
   * 轉換值為適當的數據類型
   * @param {string} value - 字符串值
   * @returns {any} 轉換後的值
   */
  convertValue(value) {
    if (value === "true") return true;
    if (value === "false") return false;
    if (value === "null") return null;
    if (value === "undefined") return undefined;

    // 嘗試轉換為數字
    const numValue = Number(value);
    if (!isNaN(numValue) && isFinite(numValue)) {
      return numValue;
    }

    // 嘗試 JSON 解析（對於對象和數組）
    if (
      (value.startsWith("{") && value.endsWith("}")) ||
      (value.startsWith("[") && value.endsWith("]"))
    ) {
      try {
        return JSON.parse(value);
      } catch {
        // 解析失敗，返回原字符串
      }
    }

    return value;
  }

  /**
   * 去除重複的工具調用
   * @param {Array} toolCalls - 工具調用列表
   * @returns {Array} 去重後的工具調用列表
   */
  removeDuplicateCalls(toolCalls) {
    const seen = new Set();
    return toolCalls.filter((call) => {
      const key = `${call.name}:${JSON.stringify(call.parameters)}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * 執行工具調用
   * @param {Array} toolCalls - 工具調用列表
   * @param {Object} context - 執行上下文
   * @returns {Promise<Array>} 執行結果列表
   */
  async executeToolCalls(toolCalls, context = {}) {
    const results = [];

    logger.info("開始執行工具調用", {
      callCount: toolCalls.length,
      userId: context.user_id,
      conversationId: context.conversation_id,
    });

    for (const [index, toolCall] of toolCalls.entries()) {
      try {
        logger.debug(`執行工具調用 ${index + 1}/${toolCalls.length}`, {
          toolName: toolCall.name,
          parameters: toolCall.parameters,
          userId: context.user_id,
        });

        // 查找工具
        const tools = await McpToolModel.getAllMcpTools({
          is_enabled: true,
        });

        // 處理模組前綴：如果工具名稱包含點號，提取實際工具名稱
        let actualToolName = toolCall.name;
        if (actualToolName.includes(".")) {
          actualToolName = actualToolName.split(".").pop(); // 取最後一部分
        }

        const tool = tools.find(
          (t) => t.name.toLowerCase() === actualToolName.toLowerCase()
        );

        logger.info("🔧 工具查找", {
          originalName: toolCall.name,
          actualToolName: actualToolName,
          found: !!tool,
          toolId: tool?.id,
        });

        if (!tool) {
          const error = `工具 "${toolCall.name}" 不存在或已被停用`;
          logger.warn("工具不存在", {
            toolName: toolCall.name,
            userId: context.user_id,
          });

          results.push({
            tool_call: toolCall,
            success: false,
            error: error,
            timestamp: new Date().toISOString(),
          });
          continue;
        }

        // 執行工具
        const result = await mcpClient.invokeTool(
          tool.id,
          toolCall.parameters,
          context
        );

        results.push({
          tool_call: toolCall,
          tool_id: tool.id,
          tool_name: tool.name,
          service_name: tool.service_name,
          ...result,
        });

        logger.info("工具執行完成", {
          toolName: tool.name,
          success: result.success,
          userId: context.user_id,
        });
      } catch (error) {
        logger.error("工具執行失敗", {
          toolName: toolCall.name,
          error: error.message,
          userId: context.user_id,
        });

        results.push({
          tool_call: toolCall,
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    }

    logger.info("所有工具調用執行完成", {
      totalCalls: toolCalls.length,
      successCount: results.filter((r) => r.success).length,
      errorCount: results.filter((r) => !r.success).length,
      userId: context.user_id,
    });

    return results;
  }

  /**
   * 格式化工具執行結果
   * @param {Array} results - 工具執行結果列表
   * @returns {string} 格式化後的結果文本
   */
  formatToolResults(results) {
    if (!results || results.length === 0) {
      return "";
    }

    const sections = [];

    for (const result of results) {
      if (result.success) {
        sections.push(
          `✅ **${result.tool_name}** 執行成功\n` +
            `📋 **服務**: ${result.service_name}\n` +
            `📊 **結果**: ${JSON.stringify(result.result, null, 2)}\n`
        );
      } else {
        sections.push(
          `❌ **${result.tool_call.name}** 執行失敗\n` +
            `🚫 **錯誤**: ${result.error}\n`
        );
      }
    }

    return sections.join("\n---\n\n");
  }

  /**
   * 檢查文本是否包含工具調用
   * @param {string} text - 要檢查的文本
   * @returns {boolean} 是否包含工具調用
   */
  hasToolCalls(text) {
    return this.toolCallPatterns.some((pattern) => pattern.test(text));
  }
}

// 創建全局實例
const mcpToolParser = new McpToolParser();

export default mcpToolParser;
