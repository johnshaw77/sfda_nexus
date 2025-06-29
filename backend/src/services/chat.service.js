/**
 * 聊天服務
 * 處理聊天相關的業務邏輯，包含 MCP 工具整合
 */

import McpToolModel from "../models/McpTool.model.js";
import mcpToolParser from "./mcpToolParser.service.js";
import logger from "../utils/logger.util.js";
import globalPromptService from "./globalPrompt.service.js";
import AIService from "./ai.service.js";
import McpServiceModel from "../models/McpService.model.js";

class ChatService {
  constructor() {
    this.systemPromptCache = null;
    this.cacheExpiry = null;
    this.cacheTimeout = 5 * 60 * 1000; // 5分鐘快取
  }

  /**
   * 生成動態 System Prompt，包含全域規則和 MCP 工具資訊
   * @param {string} basePrompt - 基礎系統提示詞
   * @param {Object} options - 選項
   * @returns {Promise<string>} 完整的系統提示詞
   */
  async generateSystemPrompt(basePrompt = "", options = {}) {
    try {
      // 🔒 第一步：整合全域行為規則
      const baseWithGlobalRules =
        await globalPromptService.integrateGlobalRules(basePrompt);

      // 檢查工具快取
      if (
        this.systemPromptCache &&
        this.cacheExpiry &&
        Date.now() < this.cacheExpiry
      ) {
        logger.debug("使用快取的系統提示詞");
        return this.combinePrompts(baseWithGlobalRules, this.systemPromptCache);
      }

      // 獲取已啟用的 MCP 工具
      const enabledTools = await McpToolModel.getEnabledMcpTools();

      if (enabledTools.length === 0) {
        logger.debug("未發現啟用的 MCP 工具，使用基礎系統提示詞（含全域規則）");
        return baseWithGlobalRules;
      }

      // 按服務分組工具
      const toolsByService = this.groupToolsByService(enabledTools);

      // 生成工具相關的系統提示詞
      const toolPrompt = await this.generateToolPrompt(toolsByService);

      // 更新快取
      this.systemPromptCache = toolPrompt;
      this.cacheExpiry = Date.now() + this.cacheTimeout;

      logger.info("動態系統提示詞生成完成", {
        toolCount: enabledTools.length,
        serviceCount: Object.keys(toolsByService).length,
        promptLength: toolPrompt.length,
        hasGlobalRules: true,
      });

      return this.combinePrompts(baseWithGlobalRules, toolPrompt);
    } catch (error) {
      logger.error("生成系統提示詞失敗", {
        error: error.message,
      });
      // 降級處理：至少確保全域規則被應用
      try {
        return await globalPromptService.integrateGlobalRules(basePrompt);
      } catch (fallbackError) {
        logger.error("全域規則整合也失敗", { error: fallbackError.message });
        return basePrompt; // 最後降級到基礎提示詞
      }
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
   * @returns {Promise<string>} 工具提示詞
   */
  async generateToolPrompt(toolsByService) {
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

    // 從資料庫讀取 MCP 工具調用指導
    try {
      const { query } = await import("../config/database.config.js");
      const { rows } = await query(
        "SELECT config_value FROM system_configs WHERE config_key = 'mcp_tool_guidance'"
      );

      if (rows && rows.length > 0) {
        sections.push("");
        sections.push(rows[0].config_value);
        sections.push("");
      } else {
        logger.warn("資料庫中未找到 MCP 工具調用指導，使用預設規則");
        sections.push("");
        sections.push("## 📝 工具調用格式");
        sections.push("使用 JSON 格式調用工具：");
        sections.push(
          '```json\n{"tool": "工具名稱", "parameters": {"參數": "值"}}\n```'
        );
        sections.push("");
      }
    } catch (error) {
      logger.error("載入 MCP 工具調用指導失敗", { error: error.message });
      sections.push("");
      sections.push("## 📝 工具調用格式");
      sections.push("使用 JSON 格式調用工具：");
      sections.push(
        '```json\n{"tool": "工具名稱", "parameters": {"參數": "值"}}\n```'
      );
      sections.push("");
    }

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
        let paramDesc = `${name} (${prop.type || "unknown"})`;

        if (prop.description) {
          paramDesc += ` - ${prop.description}`;
        }

        // 🔧 改進：處理格式約束 (pattern)
        if (prop.pattern) {
          // 為常見格式提供友好的說明
          const formatExamples = {
            "^[A-Z]\\\\d{6}$": "A123456",
            "^[A-Z]\\\\\\\\d{6}$": "A123456", // 處理雙重轉義
            "^\\\\d{4}-\\\\d{2}-\\\\d{2}$": "2024-12-31",
            "^\\\\d{4}-\\\\d{2}$": "2024-12",
            "^[A-Z]{2,3}\\\\d{3}$": "HR001",
          };

          const example = formatExamples[prop.pattern];
          if (example) {
            paramDesc += ` **格式要求**: ${prop.pattern} (例如: ${example})`;
          } else {
            paramDesc += ` **格式要求**: ${prop.pattern}`;
          }
        }

        // 🔧 新增：處理枚舉值
        if (prop.enum) {
          paramDesc += ` **可選值**: ${prop.enum.join(", ")}`;
        }

        // 🔧 新增：處理預設值
        if (prop.default !== undefined) {
          paramDesc += ` **預設**: ${prop.default}`;
        }

        // 🔧 新增：處理數值範圍
        if (prop.minimum !== undefined || prop.maximum !== undefined) {
          const ranges = [];
          if (prop.minimum !== undefined) ranges.push(`最小: ${prop.minimum}`);
          if (prop.maximum !== undefined) ranges.push(`最大: ${prop.maximum}`);
          if (ranges.length > 0) {
            paramDesc += ` **範圍**: ${ranges.join(", ")}`;
          }
        }

        // 🔧 新增：標記必填欄位
        if (schema.required && schema.required.includes(name)) {
          paramDesc += " **必填**";
        }

        params.push(paramDesc);
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
    // console.log("=== CHAT SERVICE: 開始處理聊天消息 ===");
    // console.log("AI 回應長度:", aiResponse.length);
    // console.log("AI 回應內容:", aiResponse);

    try {
      // 首先提取思考內容（無論是否有工具調用）
      let thinkingContent = null;
      let cleanedAIResponse = aiResponse;

      const thinkMatch = aiResponse.match(/<think>([\s\S]*?)<\/think>/);
      if (thinkMatch) {
        thinkingContent = thinkMatch[1].trim();
        // 移除 <think>...</think> 標籤及其內容
        cleanedAIResponse = aiResponse
          .replace(/<think>[\s\S]*?<\/think>\s*/g, "")
          .trim();
        console.log("=== 提取到思考內容 ===");
        console.log("思考內容長度:", thinkingContent.length);
        console.log("清理後回應長度:", cleanedAIResponse.length);
      }

      // 檢查是否包含工具調用
      console.log("=== 檢查工具調用 ===");
      console.log("上下文信息:", {
        hasAttachments: context.attachments && context.attachments.length > 0,
        attachmentCount: context.attachments ? context.attachments.length : 0,
        userQuestion: context.user_question || context.original_question || "",
        responseLength: cleanedAIResponse.length,
      });

      const hasTools = mcpToolParser.hasToolCalls(cleanedAIResponse, context);
      console.log("包含工具調用:", hasTools);

      if (!hasTools) {
        console.log("=== 無工具調用，直接返回 ===");
        return {
          original_response: aiResponse,
          has_tool_calls: false,
          final_response: cleanedAIResponse,
          thinking_content: thinkingContent, // 即使沒有工具調用也返回思考內容
        };
      }

      logger.info("檢測到工具調用", {
        userId: context.user_id,
        conversationId: context.conversation_id,
        responseLength: aiResponse.length,
      });

      // 解析工具調用
      console.log("=== 開始解析工具調用 ===");
      const toolCalls = await mcpToolParser.parseToolCalls(
        cleanedAIResponse,
        context
      );
      console.log("解析到工具調用數量:", toolCalls.length);

      if (toolCalls.length > 0) {
        console.log("工具調用詳情:", JSON.stringify(toolCalls, null, 2));
      }

      if (toolCalls.length === 0) {
        console.log("=== 工具調用解析失敗，返回原始回應 ===");
        return {
          original_response: aiResponse,
          has_tool_calls: false,
          final_response: aiResponse,
          tool_calls: [],
        };
      }

      // 執行工具調用
      console.log("=== 開始執行工具調用 ===");
      const toolResults = await mcpToolParser.executeToolCalls(
        toolCalls,
        context
      );
      console.log("工具執行結果數量:", toolResults.length);

      if (toolResults.length > 0) {
        console.log("工具執行結果:", JSON.stringify(toolResults, null, 2));
      }

      // 🎬 格式化工具結果（使用串流版本）
      let formattedResults = "";

      // 檢查是否需要串流格式化
      if (context.stream && context.onToolResultSection) {
        console.log("=== 使用串流格式化工具結果 ===");
        formattedResults = await mcpToolParser.formatToolResultsStream(
          toolResults,
          context.onToolResultSection
        );

        // 🎬 工具結果完成後，開始AI總結階段
        if (context.onAISummaryStart) {
          context.onAISummaryStart();
        }
      } else {
        console.log("=== 使用標準格式化工具結果 ===");
        formattedResults = await mcpToolParser.formatToolResults(toolResults);
      }

      // 檢查是否有成功的工具執行，如果有，需要進行二次 AI 調用
      const hasSuccessfulTools = toolResults.some((result) => result.success);
      let finalResponse;
      let secondaryAIGenerator = null; // 🔧 新增：二次 AI 調用的流式生成器
      // thinkingContent 已在上面定義，不需要重新宣告

      console.log("=== 工具結果檢查 ===");
      console.log("工具結果數量:", toolResults.length);
      console.log(
        "工具結果詳情:",
        toolResults.map((r) => ({
          tool_name: r.tool_name,
          success: r.success,
          error: r.error,
        }))
      );
      console.log("hasSuccessfulTools:", hasSuccessfulTools);

      // 🚨 重要修正：如果所有工具調用都失敗，立即返回錯誤信息，避免 AI 胡說八道
      if (!hasSuccessfulTools) {
        console.log("=== 所有工具調用都失敗，返回錯誤信息 ===");

        const errorMessage = `由於系統工具無法正常執行，無法獲取您所需的資料。請稍後重試或聯繫技術支援。

**工具執行狀況：**
${formattedResults}`;

        return {
          original_response: aiResponse,
          has_tool_calls: true,
          tool_calls: toolCalls,
          tool_results: toolResults,
          final_response: errorMessage,
          used_secondary_ai: false,
          used_summary: false,
          thinking_content: thinkingContent,
          debug_info: null,
        };
      }

      // 🔧 提升變數到正確作用域
      let hasCompleteData = false;
      let debugInfo = null;

      if (hasSuccessfulTools) {
        // 🎯 恢復到可靠模式：直接返回格式化結果，不進行二次AI調用
        console.log("=== 使用可靠模式：直接返回格式化結果 ===");

        // 檢查格式化結果是否已經足夠完整
        hasCompleteData =
          formattedResults.includes("📋 原始工具數據") &&
          formattedResults.includes("📊 專案摘要") &&
          formattedResults.length > 1000;

        console.log("格式化結果完整性:", hasCompleteData);
        console.log("格式化結果長度:", formattedResults.length);

        if (hasCompleteData) {
          console.log(
            "=== 格式化結果完整，但跳過舊的AI總結（使用新的流式總結） ==="
          );
          // 🎬 新策略：禁用舊的二次AI調用，只使用新的流式總結
          console.log("🎬 已禁用舊的AI總結機制，將使用新的流式總結");

          // 直接返回格式化結果，不進行二次AI調用
          return {
            original_response: aiResponse,
            has_tool_calls: true,
            tool_calls: toolCalls,
            tool_results: toolResults,
            final_response: formattedResults,
            used_secondary_ai: false, // 標記為未使用舊的二次AI
            used_summary: false,
            thinking_content: thinkingContent,
            debug_info: null,
          };
        }

        // 🔧 新增：檢查是否有 Summary，如果有就直接使用，跳過二次 AI 調用
        console.log("=== 開始檢查 Summary ===");
        console.log("工具結果數量:", toolResults.length);

        const hasSummary = toolResults.some((result, index) => {
          console.log(`檢查工具 ${index + 1}:`, result.tool_name);
          console.log("工具成功:", result.success);

          if (!result.success) {
            console.log("工具失敗，跳過");
            return false;
          }

          // 🔧 修復：檢查多個可能的數據位置
          const dataToCheck = result.result || result.data || result;

          if (!dataToCheck || typeof dataToCheck !== "object") {
            console.log("工具無有效結果，跳過");
            return false;
          }

          console.log("工具結果結構檢查:");
          console.log("- 檢查 result.result:", !!result.result);
          console.log("- 檢查 result.data:", !!result.data);
          console.log(
            "- 使用數據源:",
            result.result
              ? "result.result"
              : result.data
                ? "result.data"
                : "result"
          );
          console.log("- 數據根級別鍵:", Object.keys(dataToCheck));

          // 檢查數據內部結構
          if (dataToCheck.data) {
            console.log("- 內部 data 欄位存在，類型:", typeof dataToCheck.data);
            if (typeof dataToCheck.data === "object") {
              console.log("- 內部 data 鍵:", Object.keys(dataToCheck.data));
            }
          }

          // 檢查 statistics 欄位
          if (dataToCheck.statistics) {
            console.log(
              "- statistics 欄位存在，類型:",
              typeof dataToCheck.statistics
            );
            if (typeof dataToCheck.statistics === "object") {
              console.log(
                "- statistics 鍵:",
                Object.keys(dataToCheck.statistics)
              );
              if (dataToCheck.statistics.summary) {
                console.log(
                  "- statistics.summary 存在，類型:",
                  typeof dataToCheck.statistics.summary
                );
                console.log(
                  "- statistics.summary 預覽:",
                  dataToCheck.statistics.summary.substring(0, 100) + "..."
                );
              }
            }
          }

          console.log(
            "工具結果內容預覽:",
            JSON.stringify(dataToCheck, null, 2).substring(0, 1000) + "..."
          );

          // 深度搜索 Summary
          function findSummary(obj, path = "") {
            if (!obj || typeof obj !== "object") return null;

            console.log(`🔍 搜索路徑: ${path || "root"}`);
            console.log(`🔍 當前對象鍵:`, Object.keys(obj));

            // 檢查常見的 Summary 欄位名稱
            const summaryFields = ["Summary", "summary", "SUMMARY"];
            for (const field of summaryFields) {
              if (obj.hasOwnProperty(field)) {
                console.log(`🔍 找到欄位 '${field}' 在路徑 '${path}.${field}'`);
                console.log(`🔍 欄位類型:`, typeof obj[field]);
                console.log(
                  `🔍 欄位值預覽:`,
                  obj[field]?.toString().substring(0, 100) + "..."
                );

                if (
                  obj[field] &&
                  typeof obj[field] === "string" &&
                  obj[field].trim()
                ) {
                  console.log(
                    `✅ 在路徑 '${path}.${field}' 找到有效 Summary:`,
                    obj[field].substring(0, 100) + "..."
                  );
                  return obj[field];
                }
              }
            }

            // 遞歸搜索
            for (const key in obj) {
              if (typeof obj[key] === "object" && obj[key] !== null) {
                const newPath = path ? `${path}.${key}` : key;
                console.log(`🔍 遞歸搜索: ${newPath}`);
                const found = findSummary(obj[key], newPath);
                if (found) return found;
              }
            }

            return null;
          }

          const foundSummary = findSummary(dataToCheck);
          console.log("🎯 Summary 搜索結果:", !!foundSummary);
          if (foundSummary) {
            console.log(
              "🎯 找到的 Summary 內容:",
              foundSummary.substring(0, 200) + "..."
            );
          }
          return foundSummary !== null;
        });

        console.log("=== Summary 檢查結果:", hasSummary, "===");

        if (hasSummary) {
          console.log(
            "=== 檢測到 Summary，但仍進行 AI 二次處理以提供智能分析 ==="
          );
        } else {
          console.log("=== 未檢測到 Summary，開始 AI 二次調用 ===");
        }

        // 🔧 簡化：直接標記是否有 Summary，後續在結果中使用
        const extractedSummaries = [];

        // 獲取模型配置
        const modelConfig = context.model_config || {};

        // 🎯 檢測是否為圖表創建場景，使用專門的輕量模型
        const hasChartTools = toolCalls.some(
          (call) =>
            call.function?.name === "create_chart" ||
            call.name === "create_chart"
        );

        let secondaryModelConfig = { ...modelConfig };

        if (hasChartTools) {
          console.log(
            "🎨 [圖表場景優化] 檢測到圖表創建工具調用，使用專門的輕量模型"
          );

          // 🚀 從資料庫獲取專門的圖表回應模型
          try {
            const { query } = await import("../config/database.config.js");
            // 🔧 使用環境變數配置的輕量模型
            const lightModelName =
              process.env.PROMPT_OPTIMIZATION_MODEL_NAME || "qwen2.5:1.5b";
            const { rows: chartModelRows } = await query(
              "SELECT * FROM ai_models WHERE model_id = ? AND is_active = 1",
              [lightModelName]
            );

            if (chartModelRows.length > 0) {
              const chartModel = chartModelRows[0];
              secondaryModelConfig = {
                model_type: chartModel.model_type,
                model_id: chartModel.model_id,
                endpoint_url: chartModel.endpoint_url,
                api_key_encrypted: chartModel.api_key_encrypted,
              };

              console.log(
                `🎨 [圖表場景優化] 使用專門模型: ${chartModel.model_id} (${chartModel.endpoint_url})`
              );
            } else {
              console.log(
                `⚠️ [圖表場景優化] 未找到 ${lightModelName} 模型，使用 fallback 輕量模型`
              );
              // fallback 到任何可用的輕量模型
              const { rows: lightModelRows } = await query(
                "SELECT * FROM ai_models WHERE (model_id LIKE '%1.5b%' OR model_id LIKE '%3b%' OR model_id LIKE '%7b%') AND is_active = 1 LIMIT 1"
              );

              if (lightModelRows.length > 0) {
                const lightModel = lightModelRows[0];
                secondaryModelConfig = {
                  model_type: lightModel.model_type,
                  model_id: lightModel.model_id,
                  endpoint_url: lightModel.endpoint_url,
                  api_key_encrypted: lightModel.api_key_encrypted,
                };
                console.log(
                  `🎨 [圖表場景優化] 使用 fallback 輕量模型: ${lightModel.model_id}`
                );
              }
            }
          } catch (dbError) {
            console.error("🎨 [圖表場景優化] 資料庫查詢失敗:", dbError.message);
            console.log("🎨 [圖表場景優化] 繼續使用原始模型配置");
          }
        }

        // 🚀 標記正在進行二次調用，供前端顯示加載狀態
        if (context.onSecondaryAIStart) {
          context.onSecondaryAIStart();
        }

        try {
          // 🚨 緊急修復：移除過度複雜的系統提示詞
          const systemPrompt = `數據分析助理，直接分析工具結果。`;

          // 獲取用戶的原始問題
          const userQuestion =
            context.user_question ||
            context.original_question ||
            "請整理並回答用戶的問題";

          console.log("=== 二次調用用戶問題 ===");
          console.log("用戶問題:", userQuestion);
          console.log("=== 傳給二次 AI 的格式化結果 ===");
          console.log("長度:", formattedResults.length);
          console.log("🔍 完整格式化結果:", formattedResults);
          console.log(
            "📊 工具結果摘要:",
            toolResults.map((r) => ({
              tool_name: r.tool_name,
              success: r.success,
              data_count: r.data?.data?.length || 0,
              has_data: !!r.data,
            }))
          );

          // 🎯 使用原始數據而非格式化文本，避免幻覺
          const rawData = toolResults
            .filter((r) => r.success && r.data?.data)
            .map((r) => r.data.data)
            .flat()
            .slice(0, 10); // 只取前10筆避免過長

          const followUpMessages = [
            {
              role: "system",
              content: `你是數據分析專家。基於以下原始數據提供簡潔分析：

${JSON.stringify(rawData, null, 2)}

要求：3句話總結，每句不超過50字。`,
            },
            {
              role: "user",
              content: `${userQuestion}

基於上方數據，請用3句話總結：
1. 主要問題
2. 優先建議  
3. 改善方向

總計150字內，不要創造數據中沒有的欄位。`,
            },
          ];

          // 🔧 調試信息：記錄完整的二次調用提示詞
          debugInfo = {
            secondaryAI: {
              systemPrompt: systemPrompt,
              userPrompt: followUpMessages[1].content,
              fullMessages: followUpMessages,
              modelConfig: secondaryModelConfig,
              formattedResults: formattedResults,
              userQuestion: userQuestion,
              timestamp: new Date().toISOString(),
            },
          };

          console.log("=== 二次 AI 調用調試信息 ===");
          console.log("System Prompt:", systemPrompt);
          console.log("User Prompt:", followUpMessages[1].content);
          console.log("Model Config:", secondaryModelConfig);

          // 🚀 使用快速非流式二次調用
          const useStreamingSecondaryAI = false; // 使用非流式以確保結果組合正確

          if (useStreamingSecondaryAI) {
            console.log("=== 啟用流式二次 AI 調用 ===");

            // 🔧 使用流式模式進行二次 AI 調用
            secondaryAIGenerator = await AIService.callModel({
              provider: secondaryModelConfig.model_type || "ollama",
              model:
                secondaryModelConfig.model_id ||
                context.model ||
                "qwen2.5vl:32b",
              endpoint_url:
                context.endpoint_url || secondaryModelConfig.endpoint_url,
              api_key: secondaryModelConfig.api_key_encrypted,
              messages: followUpMessages,
              temperature: 0.0, // 🚨 完全確定性輸出，徹底防止幻覺
              max_tokens: 8192, // 🚀 大幅提升token限制，支援大數據分析和完整總結
              stream: true, // 🔧 啟用流式模式
            });

            // 🎯 流式模式：用戶先看到格式化結果，然後流式接收 AI 額外分析
            return {
              original_response: aiResponse,
              has_tool_calls: true,
              tool_calls: toolCalls,
              tool_results: toolResults,
              formatted_results: formattedResults, // 🔧 立即可用的可靠數據
              final_response: formattedResults, // 🎯 新策略：流式模式下也先提供格式化結果
              secondary_ai_generator: secondaryAIGenerator, // 🔧 額外的 AI 分析流
              used_secondary_ai: true,
              thinking_content: thinkingContent,
              is_streaming_secondary: true, // 🔧 標記為流式二次調用
              debug_info: debugInfo, // 🔧 添加調試信息
            };
          } else {
            // 🚀 快速二次AI調用：使用輕量模型進行快速總結
            // 🔧 使用環境變數配置的總結模型
            const summaryModelName =
              process.env.AI_SUMMARY_MODEL_NAME || "qwen2.5:14b";
            const secondaryAIResponse = await AIService.callModel({
              provider: secondaryModelConfig.model_type || "ollama",
              model: secondaryModelConfig.model_id || summaryModelName, // 🎯 使用配置的模型
              endpoint_url:
                context.endpoint_url || secondaryModelConfig.endpoint_url,
              api_key: secondaryModelConfig.api_key_encrypted,
              messages: followUpMessages,
              temperature: 0.0, // 確定性輸出
              max_tokens: 1200, // 🎯 您設定的token限制
            });

            // 處理二次 AI 調用的回應，提取 <think> 標籤內容
            let cleanedResponse = secondaryAIResponse.content || "";

            // 提取 <think>...</think> 標籤內容（如果二次調用中也有思考內容）
            const secondaryThinkMatch = cleanedResponse.match(
              /<think>([\s\S]*?)<\/think>/
            );
            if (secondaryThinkMatch) {
              // 如果二次調用中也有思考內容，合併或替換
              const secondaryThinking = secondaryThinkMatch[1].trim();
              thinkingContent = thinkingContent
                ? `${thinkingContent}\n\n--- 二次思考 ---\n${secondaryThinking}`
                : secondaryThinking;
              // 移除 <think>...</think> 標籤及其內容
              cleanedResponse = cleanedResponse
                .replace(/<think>[\s\S]*?<\/think>\s*/g, "")
                .trim();
            }

            // 🎯 新策略：總是先提供格式化結果，然後添加 AI 的額外分析
            if (
              cleanedResponse &&
              cleanedResponse.trim() &&
              cleanedResponse !== formattedResults
            ) {
              // AI 提供了有效的額外分析
              finalResponse = `${formattedResults}

---

## 🧠 AI 智能分析總結

${cleanedResponse}`;
            } else {
              // AI 沒有提供有效內容或出現問題，只使用格式化結果
              finalResponse = formattedResults;
            }

            // 🔧 更新調試信息，包含實際的 AI 回應
            debugInfo.secondaryAI.actualResponse = {
              original: secondaryAIResponse.content,
              cleaned: cleanedResponse,
              final: finalResponse,
              strategy:
                cleanedResponse && cleanedResponse.trim()
                  ? "formatted_plus_ai"
                  : "formatted_only",
            };

            console.log("=== 二次 AI 調用完成，採用新策略 ===");
            console.log("格式化結果長度:", formattedResults.length);
            console.log(
              "格式化結果預覽:",
              formattedResults.substring(0, 200) + "..."
            );
            console.log("AI 額外分析長度:", cleanedResponse?.length || 0);
            console.log(
              "AI 額外分析預覽:",
              cleanedResponse?.substring(0, 200) + "..."
            );
            console.log(
              "採用策略:",
              debugInfo.secondaryAI.actualResponse.strategy
            );
            console.log("最終回應長度:", finalResponse.length);
            console.log(
              "最終回應預覽:",
              finalResponse.substring(0, 300) + "..."
            );
          }
        } catch (secondaryError) {
          console.error("二次 AI 調用失敗:", secondaryError.message);
          // 🎯 新策略：即使二次調用失敗，至少提供可靠的格式化結果
          finalResponse = `${formattedResults}

---

## ⚠️ AI 分析狀態

二次分析功能暫時不可用，但上方的完整數據報告是可靠的。

錯誤信息：${secondaryError.message}`;

          // 記錄失敗信息到調試信息
          debugInfo.secondaryAI.error = {
            message: secondaryError.message,
            strategy: "formatted_with_error_note",
          };
        }
      }
      // 注意：如果沒有成功的工具執行，已經在前面提早返回了

      console.log("=== CHAT SERVICE: 處理完成 ===");
      const result = {
        original_response: aiResponse,
        has_tool_calls: true,
        tool_calls: toolCalls,
        tool_results: toolResults,
        formatted_results: formattedResults,
        final_response: finalResponse,
        used_secondary_ai: hasSuccessfulTools,
        used_summary: hasCompleteData, // 🔧 使用完整數據檢測結果
        thinking_content: thinkingContent, // 添加思考內容
        secondary_ai_generator: secondaryAIGenerator, // 🔧 添加流式生成器（如果有）
        is_streaming_secondary: !!secondaryAIGenerator, // 🔧 標記是否為流式二次調用
        debug_info: null, // 🔧 暫時移除調試信息以簡化
      };
      console.log("最終結果:", {
        has_tool_calls: result.has_tool_calls,
        tool_calls_count: result.tool_calls?.length || 0,
        tool_results_count: result.tool_results?.length || 0,
        final_response_length: result.final_response?.length || 0,
        used_secondary_ai: result.used_secondary_ai,
        used_summary: result.used_summary, // 🔧 新增：顯示 Summary 使用狀態
        is_streaming_secondary: result.is_streaming_secondary,
      });

      return result;
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
    // 檢查是否有成功的工具執行
    const hasSuccessfulTools = toolResults.some((result) => result.success);

    if (!hasSuccessfulTools) {
      // 🚨 關鍵修正：當所有工具調用都失敗時，絕對不返回 AI 的原始回應
      // 因為原始回應可能包含編造的數據，違反全域規則
      return `❌ **工具調用失敗**

由於系統工具無法正常執行，無法獲取您所需的資料。請稍後重試或聯繫技術支援。

**工具執行狀況：**
${formattedResults}

⚠️ **重要提醒**：為確保資料準確性，我無法提供未經工具驗證的資訊。請檢查系統狀態或聯繫管理員。`;
    }

    // 當工具調用成功時，返回格式化的工具結果
    // 注意：這裡只返回工具結果，後續需要進行二次 AI 調用來生成完整回應
    return formattedResults;
  }

  /**
   * 清除系統提示詞快取
   */
  clearCache() {
    this.systemPromptCache = null;
    this.cacheExpiry = null;
    // 同時清除全域提示詞快取
    globalPromptService.clearCache();
    logger.debug("系統提示詞快取已清除（包含全域規則）");
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
        cache_info: {
          is_system_prompt_cached: !!this.systemPromptCache,
          cache_expiry: this.cacheExpiry,
          global_rules_stats: globalPromptService.getRulesStats(),
        },
        last_updated: new Date().toISOString(),
      };
    } catch (error) {
      logger.error("獲取工具統計失敗", { error: error.message });
      return null;
    }
  }

  /**
   * 獲取全域提示詞規則預覽
   * @returns {Promise<string>} 全域規則內容
   */
  async getGlobalRulesPreview() {
    try {
      return await globalPromptService.getGlobalPromptRules();
    } catch (error) {
      logger.error("獲取全域規則預覽失敗", {
        error: error.message,
      });
      return "";
    }
  }

  /**
   * 生成包含全域規則的完整系統提示詞預覽
   * @param {string} basePrompt - 智能體的基礎提示詞
   * @returns {Promise<string>} 完整系統提示詞
   */
  async getFullSystemPromptPreview(basePrompt = "") {
    try {
      return await this.generateSystemPrompt(basePrompt);
    } catch (error) {
      logger.error("生成完整系統提示詞預覽失敗", {
        error: error.message,
      });
      return basePrompt;
    }
  }

  /**
   * 🎬 生成AI總結（流式打字機效果）
   * @param {Array} coreData - 結構化的核心數據
   * @param {string} userQuestion - 用戶問題
   * @param {Object} context - 上下文
   * @returns {AsyncGenerator} 流式生成器
   */
  async *generateAISummaryStream(coreData, userQuestion, context) {
    try {
      console.log("=== 開始生成AI總結流 ===");
      logger.info("AI總結 - 接收到的核心數據", {
        coreDataCount: coreData.length,
        coreData: JSON.stringify(coreData, null, 2),
      });
      console.log("核心數據:", JSON.stringify(coreData, null, 2));

      // 🎯 構建精確的數據摘要 - 包含實際數據內容
      const dataFormat = coreData
        .map((item) => {
          // 提取關鍵數據點
          let keyPoints = {};
          if (Array.isArray(item.data)) {
            keyPoints.total_records = item.data.length;
            if (item.data.length > 0) {
              keyPoints.sample_fields = Object.keys(item.data[0]);
              // 🔧 關鍵修復：包含實際數據內容，不只是統計信息
              keyPoints.actual_data = item.data;
            }
          } else if (item.data && typeof item.data === "object") {
            keyPoints = item.data;
          } else if (typeof item.data === "string") {
            keyPoints.content = item.data;
          }

          return {
            tool: item.tool,
            key_data: keyPoints,
            summary: item.summary,
          };
        })
        .filter(
          (item) => item.key_data && Object.keys(item.key_data).length > 0
        );

      // 🔍 調試：記錄傳遞給AI的數據格式
      logger.info("AI總結 - 傳遞給AI的數據格式", {
        dataFormat: JSON.stringify(dataFormat, null, 2),
      });
      console.log(
        "🔍 [調試] 傳遞給AI的數據格式:",
        JSON.stringify(dataFormat, null, 2)
      );

      // 📋 準備更精確的總結提示詞 - 確保AI能看到完整數據
      const summaryPrompt = `請根據以下查詢結果，為用戶提供簡潔的分析總結：

**用戶問題**: ${userQuestion}

**原始工具數據**:
${JSON.stringify(coreData, null, 2)}

**處理後的數據摘要**:
${JSON.stringify(dataFormat, null, 2)}

**分析要求**:
1. 用2-3句話簡潔回答用戶問題
2. 仔細檢查數據中的延遲天數(Delay_Day)等關鍵字段
3. 基於實際數據提供關鍵洞察
4. 不要編造數據中沒有的信息
5. 保持對話式語調，避免技術術語
6. 如果數據不足以回答問題，請誠實說明

請特別注意：數據中包含的延遲天數信息，並據此回答用戶的問題。

請提供分析：`;

      // 🔍 調試：記錄提示詞
      logger.info("AI總結 - 生成的提示詞", {
        promptLength: summaryPrompt.length,
        prompt: summaryPrompt,
      });

      // 🎯 使用更強大的模型進行總結
      const summaryModelConfig = await this.getSummaryModelConfig(context);

      console.log("總結模型配置:", summaryModelConfig);

      // 📡 調用AI進行總結
      const summaryResponse = await AIService.callModel({
        provider: summaryModelConfig.model_type,
        model: summaryModelConfig.model_id,
        endpoint_url: summaryModelConfig.endpoint_url,
        api_key: summaryModelConfig.api_key_encrypted,
        messages: [
          {
            role: "user",
            content: summaryPrompt,
          },
        ],
        temperature: 0.8, // 稍高的創造性
        max_tokens: 2048,
      });

      // 🎬 模擬打字機效果 - 逐字返回
      const summaryContent = summaryResponse.content || "";
      const words = summaryContent.split("");

      for (let i = 0; i < words.length; i++) {
        // 🎯 控制打字速度 - 更自然的速度
        const delay = Math.random() * 30 + 20; // 20-50ms隨機延遲
        await new Promise((resolve) => setTimeout(resolve, delay));

        yield {
          type: "ai_summary_delta",
          content: words[i],
          timestamp: new Date().toISOString(),
          progress: Math.round(((i + 1) / words.length) * 100),
        };
      }

      console.log("=== AI總結流生成完成 ===");
    } catch (error) {
      logger.error("生成AI總結流失敗", {
        error: error.message,
        userQuestion,
        context: context.conversation_id,
      });

      // 💔 流式錯誤處理
      yield {
        type: "ai_summary_error",
        error: "抱歉，AI總結生成失敗，請稍後重試。",
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 🎯 獲取總結專用的模型配置（使用更強大的模型）
   * @param {Object} context - 上下文
   * @returns {Object} 模型配置
   */
  async getSummaryModelConfig(context) {
    try {
      // 🔧 從環境變數讀取 AI 總結專用模型配置
      const targetModelId = process.env.AI_SUMMARY_MODEL_ID || 47;
      const targetModelName =
        process.env.AI_SUMMARY_MODEL_NAME || "qwen2.5:14b";

      logger.info("AI總結模型配置", {
        targetModelId: targetModelId,
        targetModelName: targetModelName,
      });

      const { query } = await import("../config/database.config.js");

      // 🎯 優先使用環境變數指定的模型 ID
      const { rows } = await query(
        `
        SELECT * FROM ai_models 
        WHERE is_active = 1 
        AND id = ?
        LIMIT 1
      `,
        [targetModelId]
      );

      if (rows.length > 0) {
        logger.info("使用指定的本地模型進行AI總結", {
          model: rows[0].model_id,
          provider: rows[0].model_type,
          endpoint: rows[0].endpoint_url,
        });
        return rows[0];
      }

      // 🔧 如果指定 ID 的模型不存在，嘗試按模型名稱查找
      const { rows: nameMatchRows } = await query(
        `
        SELECT * FROM ai_models 
        WHERE is_active = 1 
        AND model_id = ?
        LIMIT 1
      `,
        [targetModelName]
      );

      if (nameMatchRows.length > 0) {
        logger.info("指定 ID 模型不存在，使用名稱匹配的模型進行AI總結", {
          model: nameMatchRows[0].model_id,
          provider: nameMatchRows[0].model_type,
          endpoint: nameMatchRows[0].endpoint_url,
        });
        return nameMatchRows[0];
      }

      // 如果指定模型不可用，查找其他 qwen 模型
      const { rows: qwenRows } = await query(`
        SELECT * FROM ai_models 
        WHERE is_active = 1 
        AND model_id LIKE '%qwen%'
        ORDER BY id DESC
        LIMIT 1
      `);

      if (qwenRows.length > 0) {
        logger.warn("指定模型不可用，使用備選 qwen 模型進行AI總結", {
          model: qwenRows[0].model_id,
          provider: qwenRows[0].model_type,
          endpoint: qwenRows[0].endpoint_url,
        });
        return qwenRows[0];
      }

      // 最終回退到用戶選擇的模型
      logger.warn("所有指定模型都不可用，回退到用戶選擇的模型");
      return (
        context.model_config || {
          model_type: "ollama",
          model_id: targetModelName,
          endpoint_url: "http://10.8.32.39:8000/ollama",
          api_key_encrypted: null,
        }
      );
    } catch (error) {
      logger.error("獲取總結模型配置失敗", { error: error.message });

      // 最終回退
      return {
        model_type: "gemini",
        model_id: "gemini-1.5-flash",
        endpoint_url: null,
        api_key_encrypted: null,
      };
    }
  }
}

// 創建全局實例
const chatService = new ChatService();

export default chatService;
