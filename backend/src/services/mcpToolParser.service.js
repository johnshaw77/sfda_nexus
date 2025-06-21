/**
 * MCP 工具調用解析器服務
 * 負責解析 AI 回應中的工具調用指令並執行
 */

import McpToolModel from "../models/McpTool.model.js";
import mcpClient from "./mcp.service.js";
import logger from "../utils/logger.util.js";

class McpToolParser {
  constructor() {
    // 工具調用的正則模式，支援多種格式（移除容易誤判的函數調用格式）
    this.toolCallPatterns = [
      // JSON 格式: {"tool": "tool_name", "parameters": {...}}
      /```json\s*(\{[\s\S]*?\})\s*```/gi,
      // 直接 JSON 格式（沒有 ```json 包裝）
      /\{(?:[^{}]|{[^{}]*})*"tool"(?:[^{}]|{[^{}]*})*\}/g,
      // 標籤格式: <tool_call name="tool_name" params="...">
      /<tool_call\s+name="([^"]+)"\s*(?:params="([^"]*)")?\s*\/?>/gi,
      // XML 格式: <tool_call><name>tool_name</name><parameters>...</parameters></tool_call>
      /<tool_call>\s*<name>([^<]+)<\/name>\s*<parameters>([\s\S]*?)<\/parameters>\s*<\/tool_call>/gi,
      // 簡單格式: <tool_call>tool_name\nparameters_json</tool_call>
      /<tool_call>([\s\S]*?)<\/tool_call>/gi,
    ];

    // 常見的非工具調用模式，用於排除誤判
    this.excludePatterns = [
      // 數學函數
      /\b(sin|cos|tan|log|ln|exp|sqrt|abs|max|min|floor|ceil|round)\s*\(/gi,
      // 編程概念
      /\b(function|method|class|if|for|while|return|console|print)\s*\(/gi,
      // 量子計算術語
      /\b(qubit|gate|circuit|measure|hadamard|cnot|pauli)\s*\(/gi,
      // 其他常見模式
      /\b(example|demo|test|sample)\s*\(/gi,
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
      // JSON 格式（包括 ```json 包裝和直接 JSON）
      if (
        pattern.source.includes("json") ||
        pattern.source.includes('"tool"')
      ) {
        let jsonStr;

        if (pattern.source.includes("json")) {
          // ```json 包裝格式
          jsonStr = match[1];
        } else {
          // 直接 JSON 格式
          jsonStr = match[0];
        }

        const parsed = JSON.parse(jsonStr);

        if (parsed.tool && typeof parsed.tool === "string") {
          return {
            name: parsed.tool,
            parameters: parsed.parameters || parsed.params || {},
            format: "json",
          };
        }
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

    /*
    logger.info("開始執行工具調用", {
      callCount: toolCalls.length,
      userId: context.user_id,
      conversationId: context.conversation_id,
    });
    */

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
        // 格式化員工資訊等結構化數據
        let formattedData = "";
        if (result.data && typeof result.data === "object") {
          if (result.data.basic) {
            formattedData += `**基本資訊：**\n`;
            formattedData += `- 姓名：${result.data.basic.name || "未知"}\n`;
            formattedData += `- 英文名：${result.data.basic.englishName || "未知"}\n`;
            formattedData += `- 性別：${result.data.basic.gender || "未知"}\n`;
            formattedData += `- 生日：${result.data.basic.birthDate || "未知"}\n`;
            formattedData += `- 員工編號：${result.data.basic.employeeId || "未知"}\n`;
            formattedData += `- 入職日期：${result.data.basic.hireDate || "未知"}\n\n`;
          }

          if (result.data.contact) {
            formattedData += `**聯絡資訊：**\n`;
            formattedData += `- 郵箱：${result.data.contact.email || "未知"}\n`;
            formattedData += `- 電話：${result.data.contact.phone || "未知"}\n`;
            formattedData += `- 地址：${result.data.contact.address || "未知"}\n\n`;
          }

          if (result.data.department) {
            formattedData += `**部門資訊：**\n`;
            formattedData += `- 部門：${result.data.department.departmentName || "未知"}\n`;
            formattedData += `- 部門代碼：${result.data.department.departmentCode || "未知"}\n`;
            formattedData += `- 主管：${result.data.department.manager || "未知"}\n`;
            formattedData += `- 辦公地點：${result.data.department.location || "未知"}\n\n`;
          }

          if (result.data.position) {
            formattedData += `**職位資訊：**\n`;
            formattedData += `- 職位：${result.data.position.jobTitle || "未知"}\n`;
            formattedData += `- 職級：${result.data.position.jobLevel || "未知"}\n`;
            formattedData += `- 職系：${result.data.position.jobFamily || "未知"}\n`;
            formattedData += `- 直屬主管：${result.data.position.reportingManager || "未知"}\n`;
          }
        }

        // 🔧 修復：如果沒有特定格式，嘗試智能格式化
        if (!formattedData) {
          // 🆕 檢查是否為統計分析工具
          if (this.isStatisticalTool(result.tool_name)) {
            formattedData = this.formatStatisticalData(result.data, result.tool_name);
          } else {
            formattedData = this.formatGeneralData(result.data);
          }
        }

        sections.push(
          `✅ **${result.tool_name}** 執行成功\n` +
            `📋 **服務**: ${result.service_name}\n` +
            `⏱️ **執行時間**: ${result.execution_time}ms\n\n` +
            formattedData
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
   * 🆕 檢查是否為統計分析工具
   * @param {string} toolName - 工具名稱
   * @returns {boolean} 是否為統計工具
   */
  isStatisticalTool(toolName) {
    const statisticalTools = [
      'perform_ttest',
      'perform_anova', 
      'perform_chisquare',
      'perform_correlation',
      'analyze_data',
      'descriptive_stats'
    ];
    return statisticalTools.includes(toolName);
  }

  /**
   * 🆕 格式化統計分析結果
   * @param {any} data - 統計結果數據
   * @param {string} toolName - 工具名稱
   * @returns {string} 格式化後的統計報告
   */
  formatStatisticalData(data, toolName) {
    if (!data) return "無統計結果";

    let formatted = "";

    try {
      // 嘗試從不同路徑提取統計結果
      let result = data;
      if (data.data && data.data.result) {
        result = data.data.result;
      } else if (data.result) {
        result = data.result;
      }

      switch (toolName) {
        case 'perform_ttest':
          formatted = this.formatTTestResult(result, data);
          break;
        case 'perform_anova':
          formatted = this.formatANOVAResult(result, data);
          break;
        case 'perform_chisquare':
          formatted = this.formatChiSquareResult(result, data);
          break;
        case 'perform_correlation':
          formatted = this.formatCorrelationResult(result, data);
          break;
        default:
          formatted = this.formatGeneralStatisticalResult(result, data);
      }

      // 如果格式化失敗，回退到通用格式
      if (!formatted || formatted === "無統計結果") {
        formatted = this.formatGeneralData(data);
      }

    } catch (error) {
      console.error(`格式化統計結果時發生錯誤 (${toolName}):`, error);
      formatted = this.formatGeneralData(data);
    }

    return formatted;
  }

  /**
   * 🆕 格式化 t 檢定結果
   * @param {Object} result - t 檢定結果
   * @param {Object} originalData - 原始數據
   * @returns {string} 格式化的 t 檢定報告
   */
  formatTTestResult(result, originalData) {
    if (!result) return "無 t 檢定結果";

    let formatted = "## 📊 配對 t 檢定分析結果\n\n";

    // 基本統計量
    formatted += "### 🔍 統計量\n";
    if (result.t_statistic !== undefined) {
      formatted += `- **t 統計量**: ${Number(result.t_statistic).toFixed(4)}\n`;
    }
    if (result.degrees_of_freedom !== undefined) {
      formatted += `- **自由度**: ${result.degrees_of_freedom}\n`;
    }
    if (result.p_value !== undefined) {
      const pValue = Number(result.p_value);
      formatted += `- **p 值**: ${pValue < 0.001 ? 'p < 0.001' : `p = ${pValue.toFixed(4)}`}\n`;
    }
    if (result.alpha !== undefined) {
      formatted += `- **顯著水準**: α = ${result.alpha}\n`;
    }

    formatted += "\n";

    // 置信區間
    if (result.confidence_interval) {
      formatted += "### 📈 95% 置信區間\n";
      const ci = result.confidence_interval;
      formatted += `- **置信區間**: [${Number(ci[0]).toFixed(2)}, ${Number(ci[1]).toFixed(2)}]\n\n`;
    }

    // 統計決策
    const isSignificant = result.p_value < (result.alpha || 0.05);
    formatted += "### 🎯 統計決策\n";
    formatted += `- **結果**: ${isSignificant ? '**統計顯著** ✅' : '**統計不顯著** ❌'}\n`;
    if (isSignificant) {
      formatted += `- **解釋**: 在 α = ${result.alpha || 0.05} 的顯著水準下，拒絕虛無假設\n`;
      formatted += `- **結論**: 治療前後的血壓存在顯著差異\n`;
    } else {
      formatted += `- **解釋**: 在 α = ${result.alpha || 0.05} 的顯著水準下，無法拒絕虛無假設\n`;
      formatted += `- **結論**: 治療前後的血壓沒有顯著差異\n`;
    }

    formatted += "\n";

    // 效果量
    if (result.effect_size !== undefined) {
      formatted += "### 📏 效果量\n";
      formatted += `- **Cohen's d**: ${Number(result.effect_size).toFixed(3)}\n\n`;
    }

    // 樣本信息
    if (result.sample_size !== undefined) {
      formatted += "### 👥 樣本信息\n";
      formatted += `- **樣本數量**: ${result.sample_size} 對\n`;
    }

    // 原始數據摘要（如果有）
    if (originalData.user_friendly_report) {
      formatted += "\n### 💡 詳細報告\n";
      formatted += originalData.user_friendly_report + "\n";
    }

    return formatted;
  }

  /**
   * 🆕 格式化通用統計結果
   * @param {Object} result - 統計結果
   * @param {Object} originalData - 原始數據
   * @returns {string} 格式化的統計報告
   */
  formatGeneralStatisticalResult(result, originalData) {
    if (!result) return "無統計結果";

    let formatted = "## 📊 統計分析結果\n\n";

    // 檢查常見的統計量
    const commonStats = [
      { key: 'statistic', label: '統計量' },
      { key: 't_statistic', label: 't 統計量' },
      { key: 'f_statistic', label: 'F 統計量' },
      { key: 'chi2_statistic', label: 'χ² 統計量' },
      { key: 'p_value', label: 'p 值' },
      { key: 'degrees_of_freedom', label: '自由度' },
      { key: 'df', label: '自由度' },
      { key: 'alpha', label: '顯著水準' },
      { key: 'confidence_interval', label: '置信區間' },
      { key: 'effect_size', label: '效果量' },
      { key: 'sample_size', label: '樣本數量' }
    ];

    let hasStats = false;
    for (const stat of commonStats) {
      if (result[stat.key] !== undefined) {
        if (!hasStats) {
          formatted += "### 🔍 主要統計量\n";
          hasStats = true;
        }
        
        let value = result[stat.key];
        if (stat.key === 'p_value' && typeof value === 'number') {
          value = value < 0.001 ? 'p < 0.001' : `p = ${value.toFixed(4)}`;
        } else if (typeof value === 'number') {
          value = value.toFixed(4);
        } else if (Array.isArray(value)) {
          value = `[${value.map(v => Number(v).toFixed(2)).join(', ')}]`;
        }
        
        formatted += `- **${stat.label}**: ${value}\n`;
      }
    }

    if (hasStats) {
      formatted += "\n";
    }

    // 添加用戶友好報告（如果有）
    if (originalData.user_friendly_report) {
      formatted += "### 💡 分析報告\n";
      formatted += originalData.user_friendly_report + "\n\n";
    }

    // 如果沒有找到統計量，使用通用格式
    if (!hasStats && !originalData.user_friendly_report) {
      return this.formatGeneralData(result);
    }

    return formatted;
  }

  /**
   * 🔧 新增：智能格式化通用數據
   * @param {any} data - 要格式化的數據
   * @returns {string} 格式化後的文本
   */
  formatGeneralData(data) {
    if (!data) return "無數據";

    // 如果是數組，可能是表格數據
    if (Array.isArray(data)) {
      if (data.length === 0) return "查詢結果為空";

      let formatted = `**查詢結果** (共 ${data.length} 條記錄):\n\n`;

      // 取前幾條記錄做格式化，避免數據過長
      const displayCount = Math.min(data.length, 20);

      for (let i = 0; i < displayCount; i++) {
        const item = data[i];
        formatted += `**記錄 ${i + 1}:**\n`;

        if (typeof item === "object" && item !== null) {
          // 格式化對象的每個屬性
          for (const [key, value] of Object.entries(item)) {
            if (value !== null && value !== undefined) {
              formatted += `- ${key}: ${value}\n`;
            }
          }
        } else {
          formatted += `- 值: ${item}\n`;
        }
        formatted += "\n";
      }

      if (data.length > displayCount) {
        formatted += `... 還有 ${data.length - displayCount} 條記錄\n`;
      }

      return formatted;
    }

    // 如果是對象
    if (typeof data === "object" && data !== null) {
      let formatted = "**查詢結果:**\n\n";
      for (const [key, value] of Object.entries(data)) {
        if (value !== null && value !== undefined) {
          if (Array.isArray(value)) {
            formatted += `**${key}** (${value.length} 項):\n`;
            value.slice(0, 10).forEach((item, index) => {
              formatted += `  ${index + 1}. ${typeof item === "object" ? JSON.stringify(item) : item}\n`;
            });
            if (value.length > 10) {
              formatted += `  ... 還有 ${value.length - 10} 項\n`;
            }
          } else {
            formatted += `**${key}**: ${value}\n`;
          }
        }
      }
      return formatted;
    }

    // 其他類型直接轉字符串
    return String(data);
  }

  /**
   * 檢查文本是否包含工具調用
   * @param {string} text - 要檢查的文本
   * @param {Object} context - 額外的上下文信息，如附件
   * @returns {boolean} 是否包含工具調用
   */
  hasToolCalls(text, context = {}) {
    // 🚨 新增：如果有文件上傳，強制阻止工具調用檢測
    const hasAttachments = context.attachments && context.attachments.length > 0;
    
    if (hasAttachments) {
      // 檢查是否為CSV/Excel等數據分析請求
      const dataAnalysisPatterns = [
        /分析.*csv/i,
        /分析.*excel/i,
        /分析.*數據/i,
        /分析.*檔案/i,
        /統計.*摘要/i,
        /數據.*洞察/i,
        /請分析/i,
        /幫我分析/i,
        /分析這個/i,
        /提供.*統計/i,
        /統計.*分析/i,
      ];
      
      const isDataAnalysisRequest = dataAnalysisPatterns.some(pattern => 
        pattern.test(text)
      );
      
      if (isDataAnalysisRequest) {
        console.log("🚨 檢測到文件上傳 + 數據分析請求，強制阻止工具調用");
        return false;
      }
    }

    // 🔧 快速檢查：如果文本包含明確的工具調用語法，直接返回 true
    const hasExplicitToolCall = this.toolCallPatterns.some((pattern) =>
      pattern.test(text)
    );

    if (hasExplicitToolCall) {
      // 🚨 即使有明確語法，如果是文件分析請求也要阻止
      if (hasAttachments) {
        console.log("🚨 雖然有工具調用語法，但檢測到文件上傳，阻止工具調用");
        return false;
      }
      console.log("🔧 檢測到明確的工具調用語法");
      return true;
    }

    // 🔧 快速檢查：如果是純理論問題或一般性問題，直接返回 false
    const theoreticalPatterns = [
      /什麼是/i,
      /如何.*管理/i,
      /專案管理.*方法/i,
      /.*的優點/i,
      /.*的缺點/i,
      /.*的特點/i,
      /.*的原則/i,
      /.*的流程/i,
      /.*的步驟/i,
      /建議.*做法/i,
      /推薦.*方式/i,
      /.*最佳實踐/i,
      /.*best practice/i,
      /如何提升/i,
      /如何改善/i,
      /如何優化/i,
      /請解釋/i,
      /請說明/i,
      /請介紹/i,
      /告訴我.*關於/i,
      /.*的定義/i,
      /.*的概念/i,
      /.*的理論/i,
      /.*的框架/i,
      /.*的模型/i,
    ];

    const isTheoreticalQuestion = theoreticalPatterns.some((pattern) =>
      pattern.test(text)
    );

    if (isTheoreticalQuestion) {
      console.log("🔧 檢測到理論性問題，無需工具調用");
      return false;
    }

    // 🔧 檢查是否有文件上傳（已在上面宣告過）

    if (hasAttachments) {
      console.log("🔍 檢測到文件上傳，檢查是否為工具調用意圖");

      // 檢查是否有非常明確的數據查詢意圖
      const strongQueryPatterns = [
        /get-mil-list/i,
        /get-employee/i,
        /list.*延遲/i,
        /查詢.*延遲.*天/i,
        /找出.*超過.*天/i,
        /延遲天數.*超過/i,
        /DelayDay.*超過/i,
        /專案.*延遲.*超過/i,
      ];

      const hasStrongQueryIntent = strongQueryPatterns.some((pattern) =>
        pattern.test(text)
      );

      if (hasStrongQueryIntent) {
        console.log("🔧 檢測到強烈的數據查詢意圖，允許工具調用");
        return true;
      }

      // 檢查是否為純文件分享或分析請求
      const fileAnalysisPatterns = [
        /^這是/i,
        /^上傳/i,
        /^附件/i,
        /^文件$/i,
        /^檔案$/i,
        /^請看/i,
        /^請參考/i,
        /^分享/i,
        /^給你/i,
        /請分析.*檔案/i,
        /請幫我分析/i,
        /請總結.*檔案/i,
        /請處理.*檔案/i,
        /幫我看看/i,
        /檔案.*內容/i,
        /文件.*分析/i,
        /^分析$/i,
        /^總結$/i,
        /^處理$/i,
        // 空白或很短的文本也視為純文件分享
        /^.{0,10}$/,
      ];

      const isFileAnalysisRequest = fileAnalysisPatterns.some((pattern) =>
        pattern.test(text.trim())
      );

      if (isFileAnalysisRequest) {
        console.log("🔧 檢測到純文件分析請求，跳過工具調用檢查");
        return false;
      }

      // 如果文本很短且沒有明確的查詢關鍵詞，視為文件分享
      if (text.trim().length < 20) {
        console.log("🔧 檢測到短文本 + 文件上傳，視為純文件分享");
        return false;
      }

      // 檢查是否有一般的查詢意圖
      const generalQueryKeywords = [
        "查詢",
        "搜尋",
        "找出",
        "列出",
        "顯示",
        "統計",
        "數量",
        "多少",
        "有哪些",
      ];

      const hasGeneralQueryIntent = generalQueryKeywords.some((keyword) =>
        text.toLowerCase().includes(keyword.toLowerCase())
      );

      if (!hasGeneralQueryIntent) {
        console.log("🔧 沒有檢測到查詢意圖，跳過工具調用檢查");
        return false;
      }

      console.log("🔧 檢測到一般查詢意圖，允許工具調用");
      return true;
    }

    // 🔧 無附件時，快速檢查是否有數據查詢意圖
    const dataQueryKeywords = [
      "查詢",
      "搜尋",
      "找出",
      "列出",
      "顯示",
      "統計",
      "數量",
      "多少",
      "有哪些",
      "get-",
      "list-",
      "show-",
      "find-",
    ];

    const hasDataQueryIntent = dataQueryKeywords.some((keyword) =>
      text.toLowerCase().includes(keyword.toLowerCase())
    );

    if (!hasDataQueryIntent) {
      console.log("🔧 無數據查詢意圖，跳過工具調用檢查");
      return false;
    }

    console.log("🔧 檢測到可能的數據查詢意圖");
    return false; // 🔧 保守策略：除非有明確的工具調用語法，否則不調用工具
  }
}

// 創建全局實例
const mcpToolParser = new McpToolParser();

export default mcpToolParser;
