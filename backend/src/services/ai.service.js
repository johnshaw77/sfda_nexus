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
    } = options;

    try {
      const ollamaEndpoint =
        process.env.OLLAMA_ENDPOINT || "http://localhost:11434";

      const requestData = {
        model: model,
        messages: messages,
        options: {
          temperature: temperature,
          num_predict: max_tokens,
        },
        stream: stream,
      };

      logger.debug("調用 Ollama 模型", {
        model,
        messageCount: messages.length,
        temperature,
        max_tokens,
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

      const result = {
        content: response.data.message?.content || "",
        model: model,
        tokens_used: this.estimateTokens(response.data.message?.content || ""),
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

      logger.info("Ollama 調用成功", {
        model,
        tokens: result.tokens_used,
        time: processingTime,
      });

      return result;
    } catch (error) {
      logger.error("Ollama 調用失敗", {
        model,
        error: error.message,
        endpoint: process.env.OLLAMA_ENDPOINT,
      });
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
    } = options;

    try {
      const apiKey = process.env.GEMINI_API_KEY;
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

      logger.info("Gemini 調用成功", {
        model,
        inputTokens,
        outputTokens,
        cost,
        time: processingTime,
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
   * 統一的 AI 模型調用介面
   * @param {Object} options - 調用選項
   * @returns {Promise<Object>} AI回應結果
   */
  static async callModel(options) {
    const {
      provider,
      model,
      messages,
      temperature = 0.7,
      max_tokens = 4096,
      stream = false,
    } = options;

    try {
      switch (provider.toLowerCase()) {
        case "ollama":
          return await this.callOllama({
            model,
            messages,
            temperature,
            max_tokens,
            stream,
          });

        case "gemini":
          return await this.callGemini({
            model,
            messages,
            temperature,
            max_tokens,
          });

        default:
          throw new Error(`不支援的模型提供者: ${provider}`);
      }
    } catch (error) {
      logger.error("AI模型調用失敗", {
        provider,
        model,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 轉換訊息格式為 Gemini 格式
   * @param {Array} messages - 標準訊息格式
   * @returns {Array} Gemini 格式的訊息
   */
  static convertToGeminiFormat(messages) {
    return messages
      .filter((msg) => msg.role !== "system") // Gemini 不支援 system 角色
      .map((msg) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      }));
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
