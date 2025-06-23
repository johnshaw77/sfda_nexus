/**
 * 智能圖表檢測服務
 * 使用AI來檢測和提取圖表數據，減少對正則表達式的依賴
 */

import AIService from "./ai.service.js";
import logger from "../utils/logger.util.js";

export class SmartChartDetectionService {
  constructor() {
    this.chartDetectionPrompt = `你是一個專業的數據分析助手。請分析用戶的輸入，判斷是否包含可以製作圖表的數據。

請按照以下JSON格式回應：
{
  "hasChartData": boolean,
  "chartType": "pie|bar|line|scatter|auto",
  "data": [
    {"label": "標籤", "value": 數值},
    ...
  ],
  "title": "圖表標題",
  "confidence": 0.0-1.0,
  "reasoning": "判斷理由"
}

規則：
1. 只有當數據明確且可量化時，hasChartData才為true
2. 推薦最適合的圖表類型：
   - pie: 百分比、比例、部分與整體關係
   - bar: 類別比較、排名
   - line: 時間序列、趨勢
   - scatter: 兩個變量關係
3. data數組中的value必須是數字
4. confidence表示檢測的可信度
5. 只回應JSON，不要其他內容

用戶輸入：`;
  }

  /**
   * 檢測用戶輸入中的圖表意圖和數據
   * @param {string} userInput - 用戶輸入
   * @param {string} aiResponse - AI回應（可選）
   * @returns {Promise<Object>} 檢測結果
   */
  async detectChartIntent(userInput, aiResponse = "") {
    try {
      console.log("🎯 [SmartChartDetection] 開始檢測圖表意圖");
      console.log("用戶輸入:", userInput);
      console.log("AI回應預覽:", aiResponse.substring(0, 200));

      // 先進行快速關鍵詞檢測
      const quickCheck = this.quickKeywordCheck(userInput, aiResponse);
      if (!quickCheck.hasChartIntent) {
        console.log("🎯 [SmartChartDetection] 快速檢測：無圖表意圖");
        return {
          hasChartData: false,
          confidence: 0,
          reasoning: "未檢測到圖表相關關鍵詞",
        };
      }

      // 使用AI進行深度分析
      const analysisText = `${userInput}\n\n${aiResponse}`.trim();
      const aiResult = await this.analyzeWithAI(analysisText);

      console.log("🎯 [SmartChartDetection] AI分析結果:", aiResult);

      return aiResult;
    } catch (error) {
      console.error("🎯 [SmartChartDetection] 檢測失敗:", error);
      return {
        hasChartData: false,
        confidence: 0,
        reasoning: `檢測失敗: ${error.message}`,
      };
    }
  }

  /**
   * 快速關鍵詞檢測
   * @param {string} userInput
   * @param {string} aiResponse
   * @returns {Object}
   */
  quickKeywordCheck(userInput, aiResponse) {
    const chartKeywords = [
      "圖表",
      "圓餅圖",
      "餅圖",
      "柱狀圖",
      "條形圖",
      "折線圖",
      "曲線圖",
      "散點圖",
      "雷達圖",
      "繪製",
      "畫圖",
      "視覺化",
      "可視化",
      "圖形",
      "chart",
      "graph",
      "plot",
      "visualize",
    ];

    const dataKeywords = [
      "%",
      "百分比",
      "比例",
      "營收",
      "銷售",
      "數據",
      "統計",
      "分析",
      "報告",
      "趨勢",
      "增長",
      "下降",
      "對比",
      "比較",
    ];

    const numberPattern = /\d+([.,]\d+)?[%％萬千百億]?/g;

    const fullText = `${userInput} ${aiResponse}`;

    const hasChartKeywords = chartKeywords.some((keyword) =>
      fullText.includes(keyword)
    );

    const hasDataKeywords = dataKeywords.some((keyword) =>
      fullText.includes(keyword)
    );

    const numbers = fullText.match(numberPattern) || [];
    const hasNumbers = numbers.length >= 2;

    const hasChartIntent = hasChartKeywords || (hasDataKeywords && hasNumbers);

    console.log("🎯 [SmartChartDetection] 快速檢測結果:", {
      hasChartKeywords,
      hasDataKeywords,
      numbersCount: numbers.length,
      hasChartIntent,
    });

    return { hasChartIntent };
  }

  /**
   * 使用AI分析文本
   * @param {string} text
   * @returns {Promise<Object>}
   */
  async analyzeWithAI(text) {
    try {
      const messages = [
        {
          role: "user",
          content: this.chartDetectionPrompt + text,
        },
      ];

      const aiResult = await AIService.callOllama({
        model: "qwen3:14b", // 使用較快的模型進行檢測
        messages,
        temperature: 0.1, // 低溫度確保穩定輸出
        max_tokens: 1500, // 增加token限制
        stream: false,
        enable_thinking: false, // 關閉思考模式，提高穩定性
      });

      const responseText = aiResult.content.trim();
      console.log("🎯 [SmartChartDetection] AI原始回應:", responseText);

      // 嘗試解析JSON
      let jsonResult;
      try {
        // 提取JSON部分（可能包含在其他文字中）
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonResult = JSON.parse(jsonMatch[0]);
        } else {
          jsonResult = JSON.parse(responseText);
        }
      } catch (parseError) {
        console.error("🎯 [SmartChartDetection] JSON解析失敗:", parseError);
        return {
          hasChartData: false,
          confidence: 0,
          reasoning: "AI回應格式錯誤",
        };
      }

      // 驗證結果格式
      const validatedResult = this.validateAIResult(jsonResult);
      console.log("🎯 [SmartChartDetection] 驗證後結果:", validatedResult);

      return validatedResult;
    } catch (error) {
      console.error("🎯 [SmartChartDetection] AI分析失敗:", error);
      return {
        hasChartData: false,
        confidence: 0,
        reasoning: `AI分析失敗: ${error.message}`,
      };
    }
  }

  /**
   * 驗證AI結果格式
   * @param {Object} result
   * @returns {Object}
   */
  validateAIResult(result) {
    const validated = {
      hasChartData: Boolean(result.hasChartData),
      chartType: result.chartType || "auto",
      data: [],
      title: result.title || "數據圖表",
      confidence: Math.max(0, Math.min(1, result.confidence || 0)),
      reasoning: result.reasoning || "無說明",
    };

    // 驗證數據格式
    if (result.data && Array.isArray(result.data)) {
      validated.data = result.data.filter(
        (item) =>
          item &&
          typeof item === "object" &&
          item.label &&
          typeof item.value === "number" &&
          !isNaN(item.value)
      );
    }

    // 如果沒有有效數據，設置為無圖表數據
    if (validated.data.length === 0) {
      validated.hasChartData = false;
      validated.confidence = Math.min(validated.confidence, 0.3);
    }

    return validated;
  }

  /**
   * 檢測AI回應中是否包含圖表指令
   * @param {string} aiResponse
   * @returns {boolean}
   */
  containsChartCommand(aiResponse) {
    const chartCommands = [
      "為您繪製",
      "生成圖表",
      "製作圖表",
      "創建圖表",
      "圖表如下",
      "可視化結果",
      "數據圖表",
    ];

    return chartCommands.some((command) => aiResponse.includes(command));
  }

  /**
   * 從AI回應中提取圖表配置
   * @param {string} aiResponse
   * @returns {Object|null}
   */
  extractChartConfigFromResponse(aiResponse) {
    // 這裡可以進一步解析AI回應中的圖表配置
    // 例如標題、類型等
    const config = {
      title: null,
      type: null,
      description: null,
    };

    // 提取標題
    const titleMatch = aiResponse.match(/標題[:：]\s*([^\n\r。，]+)/);
    if (titleMatch) {
      config.title = titleMatch[1].trim();
    }

    // 提取圖表類型
    const typePatterns = [
      { pattern: /餅圖|圓餅圖|pie/i, type: "pie" },
      { pattern: /柱狀圖|條形圖|bar/i, type: "bar" },
      { pattern: /折線圖|曲線圖|line/i, type: "line" },
      { pattern: /散點圖|scatter/i, type: "scatter" },
    ];

    for (const { pattern, type } of typePatterns) {
      if (pattern.test(aiResponse)) {
        config.type = type;
        break;
      }
    }

    return config;
  }
}

// 創建單例實例
const smartChartDetectionService = new SmartChartDetectionService();
export default smartChartDetectionService;
