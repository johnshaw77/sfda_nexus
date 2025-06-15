/**
 * AI服務
 * 整合 Ollama 和 Gemini 等 AI 模型服務
 */

import axios from "axios";
import { appConfig } from "../config/app.config.js";
import logger from "../utils/logger.util.js";

export class AIService {
  /**
   * 調用 Ollama 模型
   * @param {Object} options - 調用選項
   * @returns {Promise<Object>} AI回應結果
   */
  static async callOllama(options) {
    const {
      model = "qwen3:30b",
      messages = [],
      temperature = 0.7,
      max_tokens = 4096,
      stream = false,
      endpoint_url,
      enable_thinking = true, // 新增：啟用思考模式參數
    } = options;

    try {
      const ollamaEndpoint =
        endpoint_url || process.env.OLLAMA_ENDPOINT || "http://localhost:11434";

      // 檢查是否有多模態內容
      const hasMultimodal = messages.some((msg) => Array.isArray(msg.content));

      console.log("=== OLLAMA 調用開始 ===");
      console.log("模型:", model);
      console.log("端點URL:", ollamaEndpoint);
      console.log("消息數量:", messages.length);
      console.log("多模態內容:", hasMultimodal ? "是" : "否");
      console.log("使用資料庫配置的端點:", endpoint_url ? "是" : "否");

      if (hasMultimodal) {
        console.log("=== 多模態消息詳情 ===");
        messages.forEach((msg, index) => {
          if (Array.isArray(msg.content)) {
            console.log(`消息 ${index + 1} (${msg.role}):`);
            msg.content.forEach((part, partIndex) => {
              if (part.type === "text") {
                console.log(
                  `  文字部分 ${partIndex + 1}: "${(part.text || "").substring(0, 50)}..."`
                );
              } else if (part.type === "image_url") {
                console.log(
                  `  圖片部分 ${partIndex + 1}: ${(part.image_url?.url || "").substring(0, 50)}...`
                );
              }
            });
          } else {
            console.log(`消息 ${index + 1} (${msg.role}): 純文字`);
          }
        });
      }

      // 轉換多模態消息為 Ollama 原生格式
      const ollamaMessages = hasMultimodal
        ? this.convertToOllamaFormat(messages)
        : messages;

      // 檢查是否為支援思考模式的模型
      const isThinkingModel =
        model.toLowerCase().includes("qwen3") ||
        model.toLowerCase().includes("deepseek-r1") ||
        model.toLowerCase().includes("smallthinker");

      const requestData = {
        model: model,
        messages: ollamaMessages,
        options: {
          temperature: temperature,
          num_predict: max_tokens,
        },
        stream: stream,
      };

      // 為支援思考模式的模型添加 think 參數
      if (isThinkingModel && enable_thinking) {
        requestData.think = true;
        console.log("=== 啟用思考模式 ===");
        console.log("模型支援思考模式:", model);
        console.log("思考模式已啟用");
      }

      logger.debug("調用 Ollama 模型", {
        model,
        messageCount: messages.length,
        temperature,
        max_tokens,
        hasMultimodal,
      });

      const startTime = Date.now();
      const response = await axios.post(
        `${ollamaEndpoint}/api/chat`,
        requestData,
        {
          timeout: 300000, // 5分鐘超時
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const processingTime = Date.now() - startTime;

      const messageContent = response.data.message?.content || "";
      const thinkingContent = response.data.message?.thinking || null;

      const result = {
        content: messageContent,
        thinking_content: thinkingContent, // 新增：思考內容
        model: model,
        tokens_used: this.estimateTokens(messageContent),
        cost: 0, // Ollama 本地模型無費用
        processing_time: processingTime,
        provider: "ollama",
        model_info: {
          model: model,
          created_at: response.data.created_at,
          done: response.data.done,
          total_duration: response.data.total_duration,
          load_duration: response.data.load_duration,
          prompt_eval_duration: response.data.prompt_eval_duration,
          eval_duration: response.data.eval_duration,
          prompt_eval_count: response.data.prompt_eval_count,
          eval_count: response.data.eval_count,
        },
      };

      // 調試：打印完整的 AI 回應信息
      console.log("=== OLLAMA AI 回應調試信息 ===");
      console.log("多模態請求:", hasMultimodal ? "是" : "否");
      console.log(
        "思考模式啟用:",
        isThinkingModel && enable_thinking ? "是" : "否"
      );
      console.log("原始回應數據:", JSON.stringify(response.data, null, 2));
      console.log("解析後的回應內容:", result.content);
      console.log("回應內容長度:", result.content.length);
      if (result.thinking_content) {
        console.log("=== 思考內容 ===");
        console.log("思考內容長度:", result.thinking_content.length);
        console.log(
          "思考內容預覽:",
          result.thinking_content.substring(0, 200) + "..."
        );
      }
      console.log("估算 tokens:", result.tokens_used);
      console.log("處理時間:", processingTime, "ms");

      if (hasMultimodal) {
        console.log("=== 多模態處理結果 ===");
        if (
          result.content.includes("圖") ||
          result.content.includes("image") ||
          result.content.includes("看到")
        ) {
          console.log("✅ AI 回應似乎包含對圖片的描述");
        } else {
          console.log("⚠️  AI 回應可能沒有處理圖片內容");
        }
      }

      console.log("=== AI 回應調試信息結束 ===\n");

      logger.info("Ollama 調用成功", {
        model,
        tokens: result.tokens_used,
        time: processingTime,
        contentLength: result.content.length,
        hasMultimodal,
      });

      return result;
    } catch (error) {
      logger.error("Ollama 調用失敗", {
        model,
        error: error.message,
        endpoint: process.env.OLLAMA_ENDPOINT,
      });

      console.error("=== OLLAMA 調用失敗詳情 ===");
      console.error("錯誤消息:", error.message);
      if (error.response) {
        console.error("HTTP 狀態:", error.response.status);
        console.error("響應數據:", error.response.data);
      }
      console.error("=== 錯誤詳情結束 ===");

      throw new Error(`Ollama 調用失敗: ${error.message}`);
    }
  }

  /**
   * 調用 Google Gemini 模型
   * @param {Object} options - 調用選項
   * @returns {Promise<Object>} AI回應結果
   */
  static async callGemini(options) {
    const {
      model = "gemini-2.0-flash",
      messages = [],
      temperature = 0.7,
      max_tokens = 8192,
      api_key,
    } = options;

    try {
      const apiKey = api_key || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Gemini API Key 未配置");
      }

      // 轉換訊息格式為 Gemini 格式
      const geminiMessages = this.convertToGeminiFormat(messages);

      const requestData = {
        contents: geminiMessages,
        generationConfig: {
          temperature: temperature,
          maxOutputTokens: max_tokens,
          topP: 0.9,
          topK: 40,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
        ],
      };

      console.log("=== GEMINI 調用開始 ===");
      console.log("模型:", model);
      console.log("API密鑰來源:", api_key ? "資料庫" : "環境變數");
      console.log("消息數量:", messages.length);
      console.log("溫度:", temperature);
      console.log("最大tokens:", max_tokens);

      logger.debug("調用 Gemini 模型", {
        model,
        messageCount: messages.length,
        temperature,
        max_tokens,
      });

      const startTime = Date.now();
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        requestData,
        {
          timeout: 60000, // 1分鐘超時
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const processingTime = Date.now() - startTime;
      const candidate = response.data.candidates?.[0];
      const content = candidate?.content?.parts?.[0]?.text || "";

      // 計算費用（基於 token 數量的估算）
      const inputTokens = this.estimateTokens(
        messages.map((m) => m.content).join(" ")
      );
      const outputTokens = this.estimateTokens(content);
      const cost = this.calculateGeminiCost(inputTokens, outputTokens, model);

      const result = {
        content: content,
        model: model,
        tokens_used: inputTokens + outputTokens,
        cost: cost,
        processing_time: processingTime,
        provider: "gemini",
        model_info: {
          model: model,
          finish_reason: candidate?.finishReason,
          safety_ratings: candidate?.safetyRatings,
          usage_metadata: response.data.usageMetadata,
        },
      };

      // 調試：打印完整的 AI 回應信息
      console.log("=== GEMINI AI 回應調試信息 ===");
      console.log("原始回應數據:", JSON.stringify(response.data, null, 2));
      console.log("解析後的回應內容:", result.content);
      console.log("回應內容長度:", result.content.length);
      console.log("輸入 tokens:", inputTokens);
      console.log("輸出 tokens:", outputTokens);
      console.log("總費用:", cost);
      console.log("處理時間:", processingTime, "ms");
      console.log("=== AI 回應調試信息結束 ===\n");

      logger.info("Gemini 調用成功", {
        model,
        inputTokens,
        outputTokens,
        cost,
        time: processingTime,
        contentLength: content.length,
      });

      return result;
    } catch (error) {
      logger.error("Gemini 調用失敗", {
        model,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      throw new Error(`Gemini 調用失敗: ${error.message}`);
    }
  }

  /**
   * 調用AI模型（支援串流模式）
   * @param {Object} options - AI調用選項
   * @param {string} options.provider - AI提供商 (ollama, gemini)
   * @param {string} options.model - 模型名稱
   * @param {Array} options.messages - 消息陣列
   * @param {number} [options.temperature=0.7] - 溫度參數
   * @param {number} [options.max_tokens=4096] - 最大token數
   * @param {boolean} [options.stream=false] - 是否使用串流模式
   * @param {string} [options.endpoint_url] - 自定義端點URL
   * @param {string} [options.api_key] - 自定義API密鑰
   * @returns {Promise<Object|AsyncGenerator>} AI回應或串流生成器
   */
  static async callModel(options) {
    const {
      provider,
      model,
      messages,
      temperature = 0.7,
      max_tokens = 4096,
      stream = false,
      endpoint_url,
      api_key,
    } = options;

    logger.info("AI模型調用開始", {
      provider,
      model,
      messageCount: messages.length,
      temperature,
      max_tokens,
      stream,
    });

    const startTime = Date.now();

    try {
      switch (provider) {
        case "ollama":
          if (stream) {
            return await this.callOllamaStream(
              model,
              messages,
              temperature,
              max_tokens,
              endpoint_url
            );
          } else {
            return await this.callOllama({
              model,
              messages,
              temperature,
              max_tokens,
              stream,
              endpoint_url,
            });
          }

        case "gemini":
          if (stream) {
            return await this.callGeminiStream(
              model,
              messages,
              temperature,
              max_tokens,
              api_key
            );
          } else {
            return await this.callGemini({
              model,
              messages,
              temperature,
              max_tokens,
              api_key,
            });
          }

        default:
          throw new Error(`不支持的AI提供商: ${provider}`);
      }
    } catch (error) {
      logger.error("AI模型調用失敗", {
        provider,
        model,
        error: error.message,
        processingTime: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * 調用Ollama模型（串流模式）
   */
  static async callOllamaStream(
    model,
    messages,
    temperature,
    max_tokens,
    endpoint_url
  ) {
    const startTime = Date.now();

    try {
      const ollamaUrl =
        endpoint_url || process.env.OLLAMA_ENDPOINT || "http://localhost:11434";

      // 檢查是否有多模態內容
      const hasMultimodal = messages.some((msg) => Array.isArray(msg.content));

      // 檢查是否為支持思考模式的模型
      const isThinkingModel = this.isThinkingCapableModel(model);

      console.log("=== OLLAMA 串流調用開始 ===");
      console.log("URL:", `${ollamaUrl}/api/chat`);
      console.log("模型:", model);
      console.log("端點URL:", ollamaUrl);
      console.log("消息數量:", messages.length);
      console.log("多模態內容:", hasMultimodal ? "是" : "否");
      console.log("思考模式:", isThinkingModel ? "啟用" : "不支持");
      console.log("串流模式: 啟用");
      console.log("使用資料庫配置的端點:", endpoint_url ? "是" : "否");

      if (hasMultimodal) {
        console.log("=== 串流多模態消息詳情 ===");
        messages.forEach((msg, index) => {
          if (Array.isArray(msg.content)) {
            console.log(`消息 ${index + 1} (${msg.role}):`);
            msg.content.forEach((part, partIndex) => {
              if (part.type === "text") {
                console.log(
                  `  文字部分 ${partIndex + 1}: "${(part.text || "").substring(0, 50)}..."`
                );
              } else if (part.type === "image_url") {
                console.log(
                  `  圖片部分 ${partIndex + 1}: "${(part.image_url?.url || "").substring(0, 50)}..."`
                );
              }
            });
          } else {
            console.log(`消息 ${index + 1} (${msg.role}): 純文字`);
          }
        });
      }

      // 構建請求數據
      const requestData = {
        model: model,
        messages: hasMultimodal
          ? this.convertToOllamaFormat(messages)
          : messages,
        stream: true, // 啟用串流
        options: {
          temperature: temperature,
          num_predict: max_tokens,
        },
      };

      // 為支持思考模式的模型添加 think 參數
      if (isThinkingModel) {
        requestData.think = true;
        console.log("=== 思考模式已啟用 ===");
      }

      const response = await fetch(`${ollamaUrl}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error(
          `Ollama API錯誤: ${response.status} ${response.statusText}`
        );
      }

      console.log("=== OLLAMA 串流回應準備就緒 ===");
      if (hasMultimodal) {
        console.log("準備接收多模態串流回應...");
      }
      if (isThinkingModel) {
        console.log("準備接收思考內容...");
      }

      // 返回串流生成器
      return this.createOllamaStreamGenerator(
        response,
        startTime,
        hasMultimodal,
        isThinkingModel
      );
    } catch (error) {
      console.error("=== OLLAMA 串流調用失敗 ===");
      console.error("錯誤:", error.message);
      throw new Error(`Ollama串流調用失敗: ${error.message}`);
    }
  }

  /**
   * 創建Ollama串流生成器
   */
  static async *createOllamaStreamGenerator(
    response,
    startTime,
    hasMultimodal,
    isThinkingModel
  ) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let totalTokens = 0;
    let fullContent = "";
    let thinkingContent = "";
    let isInThinkingMode = false;
    let currentThinkingBuffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");

        // 保留最後一個可能不完整的行
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);

              // 處理 DeepSeek-R1 的思考內容（直接從 message.thinking）
              if (isThinkingModel && data.message && data.message.thinking) {
                thinkingContent += data.message.thinking;
                console.log(
                  "=== 串流思考內容 ===",
                  data.message.thinking.substring(0, 100) + "..."
                );
              }

              if (data.message && data.message.content) {
                const content = data.message.content;
                let processedContent = content;
                let currentThinking = "";

                // 處理 Qwen3 的 <think> 標籤
                if (isThinkingModel) {
                  const thinkStart = content.indexOf("<think>");
                  const thinkEnd = content.indexOf("</think>");

                  if (thinkStart !== -1 && !isInThinkingMode) {
                    // 發現思考開始標籤
                    isInThinkingMode = true;
                    console.log("🧠 開始 Qwen3 思考模式");

                    // 提取 <think> 之前的內容作為正常回應
                    processedContent = content.substring(0, thinkStart);

                    // 如果同一塊中有結束標籤
                    if (thinkEnd !== -1) {
                      // 完整的思考塊
                      const thinkContent = content.substring(
                        thinkStart + 7,
                        thinkEnd
                      );
                      thinkingContent += thinkContent;
                      processedContent += content.substring(thinkEnd + 8);
                      isInThinkingMode = false;
                      console.log(
                        "🧠 完整思考塊:",
                        thinkContent.substring(0, 50) + "..."
                      );
                    } else {
                      // 只有開始標籤，開始收集
                      currentThinkingBuffer = content.substring(thinkStart + 7);
                    }
                  } else if (isInThinkingMode) {
                    // 在思考模式中
                    if (thinkEnd !== -1) {
                      // 找到結束標籤
                      currentThinkingBuffer += content.substring(0, thinkEnd);
                      thinkingContent += currentThinkingBuffer;
                      processedContent = content.substring(thinkEnd + 8);
                      isInThinkingMode = false;
                      currentThinkingBuffer = "";
                      console.log(
                        "🧠 思考內容完成:",
                        thinkingContent.substring(thinkingContent.length - 50)
                      );
                    } else {
                      // 仍在思考中，繼續收集
                      currentThinkingBuffer += content;
                      thinkingContent += content;
                      processedContent = "";
                      console.log(
                        "🧠 收集思考內容:",
                        content.substring(0, 20) + "..."
                      );
                    }
                  }
                }

                // 只有非思考內容才添加到 fullContent
                if (processedContent) {
                  fullContent += processedContent;
                }
                totalTokens++;

                // 產出串流數據塊
                yield {
                  type: "content",
                  content: processedContent, // 發送處理後的內容（不包含 <think> 標籤）
                  full_content: fullContent,
                  thinking_content: thinkingContent, // 發送累積的思考內容
                  tokens_used: totalTokens,
                  done: data.done || false,
                  model: data.model,
                  provider: "ollama",
                };
              }

              if (data.done) {
                const processingTime = Date.now() - startTime;

                console.log("=== OLLAMA 串流完成 ===");
                console.log("多模態請求:", hasMultimodal ? "是" : "否");
                console.log("思考模式:", isThinkingModel ? "是" : "否");
                console.log("總內容長度:", fullContent.length);
                console.log("思考內容長度:", thinkingContent.length);
                console.log("處理時間:", processingTime, "ms");
                console.log("總 tokens:", totalTokens);

                if (isThinkingModel && thinkingContent) {
                  console.log("=== 串流思考內容提取完成 ===");
                  console.log(
                    "思考內容預覽:",
                    thinkingContent.substring(0, 200) + "..."
                  );
                }

                if (hasMultimodal) {
                  console.log("=== 串流多模態處理結果 ===");
                  if (
                    fullContent.includes("圖") ||
                    fullContent.includes("image") ||
                    fullContent.includes("看到")
                  ) {
                    console.log("✅ 串流AI 回應似乎包含對圖片的描述");
                  } else {
                    console.log("⚠️  串流AI 回應可能沒有處理圖片內容");
                  }
                }

                // 產出最終統計數據
                yield {
                  type: "done",
                  full_content: fullContent,
                  thinking_content: thinkingContent,
                  tokens_used: totalTokens,
                  processing_time: processingTime,
                  cost: this.calculateCost("ollama", totalTokens),
                  model_info: data.model,
                  provider: "ollama",
                };
                break;
              }
            } catch (parseError) {
              console.warn(
                "Ollama串流數據解析錯誤:",
                parseError.message,
                "行:",
                line
              );
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * 調用Gemini模型（串流模式）
   */
  static async callGeminiStream(
    model,
    messages,
    temperature,
    max_tokens,
    api_key
  ) {
    const startTime = Date.now();

    try {
      const geminiApiKey = api_key || process.env.GEMINI_API_KEY;
      if (!geminiApiKey) {
        throw new Error("未配置Gemini API Key");
      }

      console.log("=== GEMINI 串流調用開始 ===");
      console.log("模型:", model);
      console.log("API密鑰來源:", api_key ? "資料庫" : "環境變數");
      console.log("消息數量:", messages.length);
      console.log("串流模式: 啟用");

      // 轉換消息格式為Gemini格式
      const geminiMessages = this.convertToGeminiFormat(messages);

      const requestBody = {
        contents: geminiMessages,
        generationConfig: {
          temperature: temperature,
          maxOutputTokens: max_tokens,
        },
      };

      console.log("Gemini請求體:", JSON.stringify(requestBody, null, 2));

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${geminiApiKey}&alt=sse`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Gemini API錯誤: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      console.log("=== GEMINI 串流回應準備就緒 ===");

      // 返回串流生成器
      return this.createGeminiStreamGenerator(response, startTime, model);
    } catch (error) {
      console.error("=== GEMINI 串流調用失敗 ===");
      console.error("錯誤:", error.message);
      throw new Error(`Gemini串流調用失敗: ${error.message}`);
    }
  }

  /**
   * 創建Gemini串流生成器
   */
  static async *createGeminiStreamGenerator(response, startTime, model) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let totalTokens = 0;
    let fullContent = "";

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");

        // 保留最後一個可能不完整的行
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonStr = line.slice(6).trim();

            if (jsonStr === "[DONE]") {
              const processingTime = Date.now() - startTime;

              console.log("=== GEMINI 串流完成 ===");
              console.log("總內容長度:", fullContent.length);
              console.log("處理時間:", processingTime, "ms");
              console.log("總 tokens:", totalTokens);

              // 產出最終統計數據
              yield {
                type: "done",
                full_content: fullContent,
                tokens_used: totalTokens,
                processing_time: processingTime,
                cost: this.calculateCost("gemini", totalTokens),
                model_info: model,
                provider: "gemini",
              };
              return;
            }

            try {
              const data = JSON.parse(jsonStr);

              if (
                data.candidates &&
                data.candidates[0] &&
                data.candidates[0].content
              ) {
                const parts = data.candidates[0].content.parts;
                if (parts && parts[0] && parts[0].text) {
                  const content = parts[0].text;
                  fullContent += content;
                  totalTokens++;

                  // 產出串流數據塊
                  yield {
                    type: "content",
                    content: content,
                    full_content: fullContent,
                    tokens_used: totalTokens,
                    done: false,
                    model: model,
                    provider: "gemini",
                  };
                }
              }

              // 檢查是否有使用統計信息
              if (data.usageMetadata) {
                totalTokens = data.usageMetadata.totalTokenCount || totalTokens;
              }

              // 檢查是否完成（Gemini可能通過finishReason標示完成）
              if (
                data.candidates &&
                data.candidates[0] &&
                data.candidates[0].finishReason
              ) {
                const processingTime = Date.now() - startTime;

                console.log("=== GEMINI 串流完成（通過finishReason） ===");
                console.log("完成原因:", data.candidates[0].finishReason);
                console.log("總內容長度:", fullContent.length);
                console.log("處理時間:", processingTime, "ms");
                console.log("總 tokens:", totalTokens);

                // 產出最終統計數據
                yield {
                  type: "done",
                  full_content: fullContent,
                  tokens_used: totalTokens,
                  processing_time: processingTime,
                  cost: this.calculateCost("gemini", totalTokens),
                  model_info: model,
                  provider: "gemini",
                };
                return;
              }
            } catch (parseError) {
              console.warn(
                "Gemini串流數據解析錯誤:",
                parseError.message,
                "數據:",
                jsonStr
              );
            }
          }
        }
      }

      // 如果循環結束但沒有發送完成信號，手動發送
      if (fullContent) {
        const processingTime = Date.now() - startTime;

        console.log("=== GEMINI 串流完成（循環結束） ===");
        console.log("總內容長度:", fullContent.length);
        console.log("處理時間:", processingTime, "ms");
        console.log("總 tokens:", totalTokens);

        // 產出最終統計數據
        yield {
          type: "done",
          full_content: fullContent,
          tokens_used: totalTokens,
          processing_time: processingTime,
          cost: this.calculateCost("gemini", totalTokens),
          model_info: model,
          provider: "gemini",
        };
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * 轉換多模態消息為 Ollama 原生格式
   * @param {Array} messages - 標準訊息格式
   * @returns {Array} Ollama 格式的訊息
   */
  static convertToOllamaFormat(messages) {
    console.log("=== 轉換訊息為 Ollama 格式 ===");
    console.log("輸入訊息數量:", messages.length);

    const result = messages.map((msg, index) => {
      if (Array.isArray(msg.content)) {
        // 處理多模態內容
        let textContent = "";
        const images = [];

        console.log(
          `處理多模態訊息 ${index + 1}，部分數量:`,
          msg.content.length
        );

        msg.content.forEach((part, partIndex) => {
          console.log(`  部分 ${partIndex + 1}:`, part.type);
          if (part.type === "text") {
            textContent += part.text || "";
          } else if (part.type === "image_url") {
            // 提取 base64 圖片數據
            // part.image_url 可能是字符串或物件
            let imageUrl = "";
            if (typeof part.image_url === "string") {
              imageUrl = part.image_url;
            } else if (part.image_url?.url) {
              imageUrl = part.image_url.url;
            }

            const base64Data = imageUrl.replace(
              /^data:image\/[^;]+;base64,/,
              ""
            );
            images.push(base64Data);
            console.log(`  添加圖片，base64長度: ${base64Data.length}`);
          }
        });

        const ollamaMessage = {
          role: msg.role,
          content: textContent,
        };

        if (images.length > 0) {
          ollamaMessage.images = images;
        }

        console.log(
          `Ollama訊息 ${index + 1}: 文字長度=${textContent.length}, 圖片數量=${images.length}`
        );
        return ollamaMessage;
      } else {
        // 純文字消息保持不變
        console.log(
          `純文字訊息 ${index + 1}: ${(msg.content || "").substring(0, 50)}...`
        );
        return msg;
      }
    });

    console.log("轉換完成，Ollama訊息數量:", result.length);
    return result;
  }

  /**
   * 轉換訊息格式為 Gemini 格式
   * @param {Array} messages - 標準訊息格式
   * @returns {Array} Gemini 格式的訊息
   */
  static convertToGeminiFormat(messages) {
    console.log("=== 轉換訊息為 Gemini 格式 ===");
    console.log("輸入訊息數量:", messages.length);

    const result = messages
      .filter((msg) => msg.role !== "system") // Gemini 不支援 system 角色
      .map((msg, index) => {
        console.log(`處理訊息 ${index + 1}:`, {
          role: msg.role,
          contentType: Array.isArray(msg.content) ? "multimodal" : "text",
          contentLength: Array.isArray(msg.content)
            ? msg.content.length
            : msg.content?.length,
        });

        const geminiMessage = {
          role: msg.role === "assistant" ? "model" : "user",
          parts: [],
        };

        // 處理多模態內容
        if (Array.isArray(msg.content)) {
          // 如果內容是數組，說明包含多種類型的內容（文字+圖片）
          console.log("處理多模態內容，部分數量:", msg.content.length);
          msg.content.forEach((part, partIndex) => {
            console.log(`  部分 ${partIndex + 1}:`, part.type);
            if (part.type === "text") {
              geminiMessage.parts.push({ text: part.text });
            } else if (part.type === "image") {
              geminiMessage.parts.push({
                inline_data: {
                  mime_type: part.source.media_type,
                  data: part.source.data,
                },
              });
              console.log("  添加圖片，MIME類型:", part.source.media_type);
            }
          });
        } else {
          // 普通文字內容
          geminiMessage.parts.push({ text: msg.content });
        }

        console.log(
          `Gemini訊息 ${index + 1} 部分數量:`,
          geminiMessage.parts.length
        );
        return geminiMessage;
      });

    console.log("轉換完成，Gemini訊息數量:", result.length);
    return result;
  }

  /**
   * 估算文本的 token 數量
   * @param {string} text - 文本內容
   * @returns {number} 估算的 token 數量
   */
  static estimateTokens(text) {
    if (!text) return 0;
    // 簡單的 token 估算：繁體中文約 1.2 token/字，英文約 0.75 token/word
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const englishWords = text
      .replace(/[\u4e00-\u9fff]/g, "")
      .trim()
      .split(/\s+/)
      .filter((w) => w).length;
    return Math.ceil(chineseChars * 1.2 + englishWords * 0.75);
  }

  /**
   * 計算 Gemini 模型的費用
   * @param {number} inputTokens - 輸入 token 數量
   * @param {number} outputTokens - 輸出 token 數量
   * @param {string} model - 模型名稱
   * @returns {number} 費用（美元）
   */
  static calculateGeminiCost(inputTokens, outputTokens, model) {
    // Gemini 2.0 Flash 的定價（2024年12月）
    const pricing = {
      "gemini-2.0-flash": {
        input: 0.000075, // $0.075 per 1K tokens
        output: 0.0003, // $0.30 per 1K tokens
      },
      "gemini-1.5-pro": {
        input: 0.0035, // $3.50 per 1K tokens
        output: 0.0105, // $10.50 per 1K tokens
      },
    };

    const modelPricing = pricing[model] || pricing["gemini-2.0-flash"];
    const inputCost = (inputTokens / 1000) * modelPricing.input;
    const outputCost = (outputTokens / 1000) * modelPricing.output;

    return inputCost + outputCost;
  }

  /**
   * 檢查模型是否支持思考模式
   * @param {string} model - 模型名稱
   * @returns {boolean} 是否支持思考模式
   */
  static isThinkingCapableModel(model) {
    if (!model) return false;

    const modelLower = model.toLowerCase();
    const thinkingModels = ["qwen3", "deepseek-r1", "smallthinker"];

    return thinkingModels.some((thinkingModel) =>
      modelLower.includes(thinkingModel)
    );
  }

  /**
   * 計算費用
   * @param {string} provider - 模型提供者
   * @param {number} tokens_used - 使用的 token 數量
   * @returns {number} 費用（美元）
   */
  static calculateCost(provider, tokens_used) {
    // 實現費用計算邏輯
    // 這裡需要根據實際的費用計算邏輯來實現
    return 0; // 暫時返回0，實際應該根據實際的費用計算邏輯來實現
  }

  /**
   * 檢查模型可用性
   * @param {string} provider - 模型提供者
   * @param {string} model - 模型名稱
   * @returns {Promise<boolean>} 是否可用
   */
  static async checkModelAvailability(provider, model) {
    try {
      switch (provider.toLowerCase()) {
        case "ollama":
          const ollamaEndpoint =
            process.env.OLLAMA_ENDPOINT || "http://localhost:11434";
          const response = await axios.get(`${ollamaEndpoint}/api/tags`, {
            timeout: 5000,
          });
          const availableModels =
            response.data.models?.map((m) => m.name) || [];
          return availableModels.includes(model);

        case "gemini":
          const apiKey = process.env.GEMINI_API_KEY;
          if (!apiKey) return false;

          // 嘗試一個簡單的調用來檢查可用性
          await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
              contents: [{ role: "user", parts: [{ text: "test" }] }],
              generationConfig: { maxOutputTokens: 1 },
            },
            { timeout: 10000 }
          );
          return true;

        default:
          return false;
      }
    } catch (error) {
      logger.debug("模型可用性檢查失敗", {
        provider,
        model,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * 獲取可用的模型列表
   * @returns {Promise<Object>} 可用模型列表
   */
  static async getAvailableModels() {
    const models = {
      ollama: [],
      gemini: [],
    };

    try {
      // 獲取 Ollama 模型
      try {
        const ollamaEndpoint =
          process.env.OLLAMA_ENDPOINT || "http://localhost:11434";
        const response = await axios.get(`${ollamaEndpoint}/api/tags`, {
          timeout: 5000,
        });
        models.ollama =
          response.data.models?.map((m) => ({
            name: m.name,
            size: m.size,
            modified_at: m.modified_at,
          })) || [];
      } catch (error) {
        logger.debug("無法獲取 Ollama 模型列表", { error: error.message });
      }

      // 獲取 Gemini 模型（固定列表）
      if (process.env.GEMINI_API_KEY) {
        models.gemini = [
          {
            name: "gemini-2.0-flash",
            display_name: "Gemini 2.0 Flash",
            description: "最新的多模態模型，快速且高效",
          },
          {
            name: "gemini-1.5-pro",
            display_name: "Gemini 1.5 Pro",
            description: "強大的大型語言模型",
          },
        ];
      }

      return models;
    } catch (error) {
      logger.error("獲取可用模型失敗", { error: error.message });
      return models;
    }
  }
}

export default AIService;
