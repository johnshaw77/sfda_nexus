/**
 * 聊天服務
 * 處理聊天相關的業務邏輯，包含 MCP 工具整合
 */

import McpToolModel from "../models/McpTool.model.js";
import mcpToolParser from "./mcpToolParser.service.js";
import logger from "../utils/logger.util.js";
import globalPromptService from "./globalPrompt.service.js";
import AIService from "./ai.service.js";

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

      // 格式化工具結果
      const formattedResults = mcpToolParser.formatToolResults(toolResults);

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

      if (hasSuccessfulTools) {
        console.log("=== 開始二次 AI 調用 ===");

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

          // 🚀 從資料庫獲取專門的圖表回應模型 (qwen2.5vl:7b)
          try {
            const { query } = await import("../config/database.config.js");
            const { rows: chartModelRows } = await query(
              "SELECT * FROM ai_models WHERE model_id = ? AND is_active = 1",
              ["qwen2.5:1.5b"]
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
                "⚠️ [圖表場景優化] 未找到 qwen2.5vl:7b 模型，使用 fallback 輕量模型"
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
          // 🔧 修復二次調用提示詞：專門針對統計分析結果優化
          const systemPrompt = `你是一個專業的數據分析助理，基於工具執行結果，用自然語言回答用戶的問題。

工具執行結果：
${formattedResults}

重要規則：
1. 🔍 **基於實際結果**：上述工具執行結果包含了真實的數據分析，請基於這些結果回答
2. 📊 **統計結果解讀**：如果是統計分析，請用通俗易懂的語言解釋統計意義
3. 💡 **實用建議**：提供基於分析結果的實際建議和結論
4. 🚫 **禁止內容**：
   - 不要使用 <think>...</think> 標籤
   - 不要顯示思考過程
   - 不要提供 SQL 語法或技術實現
   - 不要說「沒有數據」（除非工具真的失敗了）
   - 不要編造不存在的資訊
5. ✅ **正確做法**：
   - 直接基於工具結果回答
   - 用自然語言整理和呈現數據
   - 保持回應完整和專業
   - 重點解釋統計顯著性的實際意義`;

          // 獲取用戶的原始問題
          const userQuestion =
            context.user_question ||
            context.original_question ||
            "請整理並回答用戶的問題";

          console.log("=== 二次調用用戶問題 ===");
          console.log("用戶問題:", userQuestion);
          console.log("=== 傳給二次 AI 的格式化結果 ===");
          console.log("長度:", formattedResults.length);
          console.log("內容預覽:", formattedResults.substring(0, 500) + "...");

          // 構建二次調用的消息
          const followUpMessages = [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: `用戶問題：${userQuestion}

請基於上述工具執行結果，用自然語言直接回答這個問題。

🔧 重要提醒：
- 工具已經成功執行並返回了分析結果
- 請直接基於這些結果提供回答
- 不要使用 <think>...</think> 標籤
- 不要顯示思考過程
- 直接提供清晰的最終答案`,
            },
          ];

          // 🚀 新功能：檢查是否需要流式二次調用
          const useStreamingSecondaryAI =
            context.stream === true || context.enableSecondaryStream === true;

          if (useStreamingSecondaryAI) {
            console.log("=== 啟用流式二次 AI 調用 ===");

            // 🔧 使用流式模式進行二次 AI 調用
            secondaryAIGenerator = await AIService.callModel({
              provider: secondaryModelConfig.model_type || "ollama",
              model:
                secondaryModelConfig.model_id || context.model || "qwen3:32b",
              endpoint_url:
                context.endpoint_url || secondaryModelConfig.endpoint_url,
              api_key: secondaryModelConfig.api_key_encrypted,
              messages: followUpMessages,
              temperature: 0.3, // 降低隨機性，加快生成速度
              max_tokens: 800, // 調整為適中數值，確保回應完整
              stream: true, // 🔧 啟用流式模式
            });

            // 返回包含流式生成器的結果
            return {
              original_response: aiResponse,
              has_tool_calls: true,
              tool_calls: toolCalls,
              tool_results: toolResults,
              formatted_results: formattedResults,
              final_response: null, // 流式模式下不直接提供 final_response
              secondary_ai_generator: secondaryAIGenerator, // 🔧 提供流式生成器
              used_secondary_ai: true,
              thinking_content: thinkingContent,
              is_streaming_secondary: true, // 🔧 標記為流式二次調用
            };
          } else {
            // 🚀 原有的非流式二次 AI 調用邏輯
            const secondaryAIResponse = await AIService.callModel({
              provider: secondaryModelConfig.model_type || "ollama",
              model:
                secondaryModelConfig.model_id || context.model || "qwen3:32b",
              endpoint_url:
                context.endpoint_url || secondaryModelConfig.endpoint_url,
              api_key: secondaryModelConfig.api_key_encrypted,
              messages: followUpMessages,
              temperature: 0.3, // 🚀 降低隨機性，加快生成速度
              max_tokens: 800, // 🔧 調整為適中數值，確保回應完整
            });

            // 處理二次 AI 調用的回應，提取 <think> 標籤內容
            let cleanedResponse =
              secondaryAIResponse.content || formattedResults;

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

            finalResponse = cleanedResponse || formattedResults;
            console.log("=== 二次 AI 調用成功 ===");
            console.log("原始 AI 回應內容:", secondaryAIResponse.content);
            console.log("清理後回應內容:", cleanedResponse);
            console.log(
              "二次 AI 回應長度:",
              secondaryAIResponse.content?.length || 0
            );
            console.log("最終回應:", finalResponse.substring(0, 200) + "...");
          }
        } catch (secondaryError) {
          console.error("二次 AI 調用失敗:", secondaryError.message);
          // 如果二次調用失敗，使用組合回應作為後備
          finalResponse = this.combineResponseWithResults(
            aiResponse,
            formattedResults,
            toolResults
          );
        }
      } else {
        // 如果沒有成功的工具執行，使用原有邏輯
        finalResponse = this.combineResponseWithResults(
          aiResponse,
          formattedResults,
          toolResults
        );
      }

      console.log("=== CHAT SERVICE: 處理完成 ===");
      const result = {
        original_response: aiResponse,
        has_tool_calls: true,
        tool_calls: toolCalls,
        tool_results: toolResults,
        formatted_results: formattedResults,
        final_response: finalResponse,
        used_secondary_ai: hasSuccessfulTools,
        thinking_content: thinkingContent, // 添加思考內容
        secondary_ai_generator: secondaryAIGenerator, // 🔧 添加流式生成器（如果有）
        is_streaming_secondary: !!secondaryAIGenerator, // 🔧 標記是否為流式二次調用
      };
      console.log("最終結果:", {
        has_tool_calls: result.has_tool_calls,
        tool_calls_count: result.tool_calls?.length || 0,
        tool_results_count: result.tool_results?.length || 0,
        final_response_length: result.final_response?.length || 0,
        used_secondary_ai: result.used_secondary_ai,
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

由於系統工具無法正常執行，無法獲取您所需的資料。

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
}

// 創建全局實例
const chatService = new ChatService();

export default chatService;
