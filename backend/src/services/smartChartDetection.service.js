/**
 * 智能圖表檢測服務
 * 使用AI來檢測和提取圖表數據，減少對正則表達式的依賴
 */

import AIService from "./ai.service.js";
import logger from "../utils/logger.util.js";

export class SmartChartDetectionService {
  constructor() {
    // 🔧 從環境變數讀取配置
    this.chartDetectionEnabled = process.env.ENABLE_CHART_DETECTION !== "false";

    // 🚀 新增：檢測模式配置
    this.detectionMode = process.env.CHART_DETECTION_MODE || "smart_ask";
    this.confidenceThreshold = parseFloat(
      process.env.CHART_DETECTION_CONFIDENCE_THRESHOLD || "0.8"
    );

    console.log("🎯 [SmartChartDetection] 初始化配置:", {
      enabled: this.chartDetectionEnabled,
      mode: this.detectionMode,
      confidenceThreshold: this.confidenceThreshold,
    });

    this.chartDetectionPrompt = `你是一個專業的數據分析助手。請分析用戶的輸入，判斷是否包含可以製作圖表的數據。

# 圖表生成規則（重要）
- 用戶明確要求「畫圖」、「製作圖表」、「視覺化」、「圓餅圖」、「柱狀圖」、「折線圖」等關鍵詞 → 高信心度 (0.8-1.0)
- 包含結構化數據（如銷售數據、統計數據、業績數據）但未明確要求圖表 → 中等信心度 (0.4-0.7)
- 公司介紹、概念解釋、技術說明等信息性內容 → 低信心度 (0.0-0.2)

重要原則：
1. **明確圖表請求** → 高信心度 (0.8-1.0)，直接生成
2. **數據展示但無明確意圖** → 中等信心度 (0.4-0.7)，建議詢問用戶
3. **純信息查詢** → 低信心度 (0.0-0.2)，不製作圖表

特別注意：
- 如果內容包含「季度」、「月份」、「年度」等時間維度的數值數據，信心度應在 0.5-0.7
- 如果包含「銷售」、「營收」、「業績」、「統計」等業務數據詞彙，信心度應在 0.4-0.6
- 如果只是概念介紹或公司簡介，信心度應為 0.0-0.2

絕對排除的情況（信心度必須為 0.0）：
- 圖像描述：顏色、外觀、造型、背景、場景、角色、服裝等視覺描述
- 影視內容：電影、遊戲、動畫角色的外觀或劇情描述
- 產品介紹：功能特點、技術規格、使用說明等非數據內容

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

嚴格判斷規則：
1. 明確圖表意圖：必須包含"製作圖表"、"生成圓餅圖"、"畫折線圖"、"顯示圖表"等明確詞彙
2. 有結構化數據：包含多個可量化的數據點（營收、百分比、統計數據等）
3. 非技術查詢：不是SQL查詢、條件邏輯、技術問題解答
4. 非列表展示：不是查詢結果列表、專案列表、表格數據等
5. 非信息查詢：不是公司介紹、產品說明、技術資料等

絕對排除情況：
- 查詢結果的表格展示
- 專案列表或清單
- 工具執行結果
- 條件查詢回應
- 狀態報告
- 技術問題解答
- 公司介紹
- 產品說明
- 業務特點描述
- 市場定位分析
- 任何信息性內容

圖表類型選擇：
- pie: 百分比、比例、部分與整體關係
- bar: 類別比較、排名
- line: 時間序列、趨勢
- scatter: 兩個變量關係

只回應JSON，不要其他內容。

用戶輸入：`;
  }

  /**
   * 檢測用戶輸入是否包含圖表意圖
   * @param {string} userInput - 用戶輸入
   * @param {string} aiResponse - AI回應
   * @param {Object} modelConfig - 模型配置，包含 model_id 等
   * @returns {Promise<Object>}
   */
  async detectChartIntent(userInput, aiResponse = "", modelConfig = {}) {
    // 🔧 如果圖表檢測被禁用，直接返回false
    if (!this.chartDetectionEnabled) {
      console.log("🎯 [SmartChartDetection] 圖表檢測已禁用，跳過檢測");
      return {
        needsChart: false,
        confidence: 0,
        chartData: null,
        reason: "圖表檢測功能已禁用",
      };
    }

    try {
      console.log("🎯 [SmartChartDetection] 開始三級智能檢測");

      // 🚀 輕量模型優化：對於輕量模型，直接使用快速檢測結果，避免二次 AI 調用
      const modelId = modelConfig.model_id || "";
      const isLightweightModel =
        modelId.includes("1.5b") ||
        modelId.includes("0.5b") ||
        modelId.includes("3b");

      if (isLightweightModel) {
        console.log(
          `🎯 [SmartChartDetection] 檢測到輕量模型 ${modelId}，使用快速檢測模式`
        );

        const quickCheck = this.quickKeywordCheck(userInput, aiResponse);
        if (quickCheck.hasKeywords) {
          // 對於輕量模型，如果有關鍵詞就返回中等信心度
          return {
            hasChartData: true,
            confidence: 0.6, // 中等信心度
            chartType: "auto",
            reasoning: `輕量模型 ${modelId} 快速檢測：檢測到圖表相關關鍵詞`,
            data: [], // 空數據，讓後續流程處理
          };
        } else {
          return {
            hasChartData: false,
            confidence: 0,
            reasoning: `輕量模型 ${modelId} 快速檢測：未檢測到圖表相關關鍵詞`,
          };
        }
      }

      // 🚀 Level 1: 快速意圖檢測
      const quickCheck = this.quickKeywordCheck(userInput, aiResponse);

      console.log(
        `🎯 [模式: ${this.detectionMode}] Level 1 快速檢測結果:`,
        quickCheck
      );

      // === explicit_only 模式 ===
      if (this.detectionMode === "explicit_only") {
        if (quickCheck.hasExplicitChart) {
          console.log("✅ [explicit_only] 檢測到明確圖表請求");
          return {
            hasChartData: true,
            confidence: 0.9,
            chartType: "auto",
            reasoning: "明確的圖表生成請求",
            level: 1,
          };
        } else {
          console.log("❌ [explicit_only] 未檢測到明確圖表請求，拒絕");
          return {
            hasChartData: false,
            confidence: 0,
            reasoning: "僅處理明確的圖表請求（如：畫圖表、製作圖表）",
            level: 1,
          };
        }
      }

      // === smart_ask 模式 ===
      if (this.detectionMode === "smart_ask") {
        // Level 1: 明確請求直接通過
        if (quickCheck.hasExplicitChart) {
          console.log("✅ [smart_ask] 明確圖表請求，直接生成");
          return {
            hasChartData: true,
            confidence: 0.9,
            chartType: "auto",
            reasoning: "明確的圖表生成請求",
            level: 1,
          };
        }

        // Level 1: 無數據意圖直接拒絕
        if (!quickCheck.hasDataAnalysis && !quickCheck.hasSignificantData) {
          console.log("❌ [smart_ask] 無數據分析意圖，拒絕");
          return {
            hasChartData: false,
            confidence: 0,
            reasoning: "未檢測到數據分析意圖或數值數據",
            level: 1,
          };
        }

        // Level 2: 有數據+分析意圖，觸發智能詢問
        if (quickCheck.hasDataAnalysis && quickCheck.hasSignificantData) {
          console.log("🤔 [smart_ask] 檢測到數據+分析意圖，觸發詢問");
          return {
            hasChartData: true,
            needsConfirmation: true,
            confidence: 0.6,
            chartType: "auto",
            reasoning: "檢測到數據分析內容，建議詢問用戶是否需要圖表",
            confirmationMessage:
              "我發現這裡包含數據分析內容，是否需要製作圖表來視覺化？",
            level: 2,
          };
        }
      }

      // === full_auto 模式 ===
      if (this.detectionMode === "full_auto") {
        // Level 1: 明確請求
        if (quickCheck.hasExplicitChart) {
          console.log("✅ [full_auto] 明確圖表請求");
          return {
            hasChartData: true,
            confidence: 0.9,
            chartType: "auto",
            reasoning: "明確的圖表生成請求",
            level: 1,
          };
        }

        // Level 1: 明確排除
        if (!quickCheck.hasDataAnalysis && !quickCheck.hasSignificantData) {
          console.log("❌ [full_auto] 無數據內容，拒絕");
          return {
            hasChartData: false,
            confidence: 0,
            reasoning: "未檢測到數據分析意圖或數值數據",
            level: 1,
          };
        }

        // Level 3: AI深度分析
        console.log("🧠 [full_auto] 進入AI深度分析");
        const combinedText = `用戶輸入: ${userInput}\n\nAI回應: ${aiResponse}`;
        const aiResult = await this.analyzeWithAI(combinedText, modelConfig);

        console.log("🎯 [full_auto] AI分析結果:", aiResult);
        return { ...aiResult, level: 3 };
      }

      // 默認行為（應該不會到達這裡）
      console.log("⚠️ 未知檢測模式，使用默認行為");
      return {
        hasChartData: false,
        confidence: 0,
        reasoning: `未知檢測模式: ${this.detectionMode}`,
        level: 0,
      };
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
    console.log("🎯 [SmartChartDetection] 開始快速檢測");

    // 🚀 新策略：使用正則表達式檢測明確圖表意圖
    const explicitChartPatterns = [
      // 明確圖表請求模式
      /製作.*?圖表?/,
      /生成.*?圖表?/,
      /創建.*?圖表?/,
      /繪製.*?圖表?/,
      /畫.*?圖表?/,
      /做.*?圖表?/,
      /視覺化/,
      /可視化/,
      /圖形化/,
      /柱狀圖|條形圖|折線圖|圓餅圖|散點圖|長條圖/,
      /bar chart|line chart|pie chart|scatter plot/i,
      /\bchart\b|\bgraph\b|\bplot\b|\bvisualization\b/i,
    ];

    // 🎯 數據分析意圖關鍵詞
    const dataAnalysisKeywords = [
      "統計",
      "分析",
      "比較",
      "趨勢",
      "增長",
      "變化",
      "百分比",
      "比例",
      "分布",
      "correlation",
      "analysis",
    ];

    // 🔧 簡化排除規則：只排除明顯的非數據場景
    const simpleExclusions = [
      // 圖像描述場景
      (text) => {
        const imagePatterns = [
          /這張(圖|照片|圖片|影像)/,
          /圖中|畫中|照片中/,
          /外觀|造型|服裝|穿著/,
          /(角色|人物).*?(設計|外觀|造型)/,
          /顏色.*?(搭配|設計|風格)/,
          /背景.*?(場景|環境|建築)/,
        ];
        return imagePatterns.some((pattern) => pattern.test(text));
      },

      // 公司介紹場景
      (text) => {
        const companyPatterns = [
          /(你知道|介紹.*?)(公司|企業)/,
          /公司(簡介|介紹|概況)/,
          /什麼是.*?(公司|企業)/,
        ];
        return companyPatterns.some((pattern) => pattern.test(text));
      },

      // 純文字查詢場景
      (text) => {
        const textQueryPatterns = [
          /^(什麼是|介紹|說明)/,
          /(功能|特點|優勢|用途)(?!.*?(數據|統計|分析))/,
        ];
        return textQueryPatterns.some((pattern) => pattern.test(text));
      },
    ];

    const fullText = `${userInput} ${aiResponse}`;

    // 🚀 Step 1: 檢查是否被排除
    const isExcluded = simpleExclusions.some((excludeFunc) =>
      excludeFunc(fullText)
    );
    if (isExcluded) {
      console.log("🎯 [SmartChartDetection] 檢測到排除場景，跳過圖表生成");
      return { hasKeywords: false, hasChartIntent: false };
    }

    // 🚀 Step 2: 檢查明確圖表意圖
    const hasExplicitChart = explicitChartPatterns.some((pattern) =>
      pattern.test(fullText)
    );

    // 🚀 Step 3: 檢查數據分析意圖 + 數值數據
    const hasDataAnalysis = dataAnalysisKeywords.some((keyword) =>
      fullText.includes(keyword)
    );

    // 🔧 數值檢測：只要有3個以上的數字就算有數據
    const numberPattern = /\d+([.,]\d+)?[%％萬千百億元台幣美金]?/g;
    const numbers = fullText.match(numberPattern) || [];
    const hasSignificantData = numbers.length >= 3;

    console.log("🎯 [SmartChartDetection] 快速檢測結果:", {
      hasExplicitChart,
      hasDataAnalysis,
      numbersCount: numbers.length,
      hasSignificantData,
      numbers: numbers.slice(0, 5), // 只顯示前5個數字
    });

    // 🎯 Step 4: 判斷是否有圖表意圖
    const hasChartIntent =
      hasExplicitChart || (hasDataAnalysis && hasSignificantData);

    return {
      hasKeywords: hasChartIntent,
      hasChartIntent,
      hasExplicitChart,
      hasDataAnalysis,
      hasSignificantData,
      numbersCount: numbers.length,
    };
  }

  /**
   * 使用AI分析文本意圖
   * @param {string} text
   * @param {Object} modelConfig - 模型配置，包含 model_id 等
   * @returns {Promise<Object>}
   */
  async analyzeWithAI(text, modelConfig = {}) {
    try {
      const messages = [
        {
          role: "system",
          content: this.chartDetectionPrompt,
        },
        {
          role: "user",
          content: this.chartDetectionPrompt + text,
        },
      ];

      // 🚀 使用動態模型配置，而不是固定的 qwen3:14b
      const modelToUse = modelConfig.model_id || "qwen3:14b";
      console.log(`🎯 [SmartChartDetection] 使用模型: ${modelToUse}`);

      const aiResult = await AIService.callOllama({
        model: modelToUse, // 🔧 使用動態模型
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

    // 🚀 改進數據格式驗證，支持多種數據結構
    if (result.data && Array.isArray(result.data)) {
      validated.data = result.data.filter((item) => {
        if (!item || typeof item !== "object") return false;

        // 🔧 支持標準格式：{label, value}
        if (
          item.label &&
          typeof item.value === "number" &&
          !isNaN(item.value)
        ) {
          return true;
        }

        // 🔧 支持季度格式：{quarter, sales}
        if (
          item.quarter &&
          typeof item.sales === "number" &&
          !isNaN(item.sales)
        ) {
          // 轉換為標準格式
          item.label = item.quarter;
          item.value = item.sales;
          return true;
        }

        // 🔧 支持月份格式：{month, amount}
        if (
          item.month &&
          typeof item.amount === "number" &&
          !isNaN(item.amount)
        ) {
          item.label = item.month;
          item.value = item.amount;
          return true;
        }

        // 🔧 支持年份格式：{year, revenue}
        if (
          item.year &&
          typeof item.revenue === "number" &&
          !isNaN(item.revenue)
        ) {
          item.label = item.year.toString();
          item.value = item.revenue;
          return true;
        }

        // 🔧 支持類別格式：{category, count}
        if (
          item.category &&
          typeof item.count === "number" &&
          !isNaN(item.count)
        ) {
          item.label = item.category;
          item.value = item.count;
          return true;
        }

        // 🔧 支持名稱格式：{name, value}
        if (item.name && typeof item.value === "number" && !isNaN(item.value)) {
          item.label = item.name;
          return true;
        }

        // 🔧 嘗試自動檢測：找到第一個字符串字段作為label，第一個數字字段作為value
        const keys = Object.keys(item);
        let labelKey = null;
        let valueKey = null;

        for (const key of keys) {
          if (!labelKey && typeof item[key] === "string") {
            labelKey = key;
          }
          if (!valueKey && typeof item[key] === "number" && !isNaN(item[key])) {
            valueKey = key;
          }
          if (labelKey && valueKey) break;
        }

        if (labelKey && valueKey) {
          item.label = item[labelKey];
          item.value = item[valueKey];
          return true;
        }

        return false;
      });
    }

    // 🚀 修改信心度邏輯：有數據就保持原信心度，沒數據才降低
    if (validated.data.length === 0) {
      validated.hasChartData = false;
      // 🔧 只有在原本信心度很高時才降低，避免誤判
      if (validated.confidence > 0.5) {
        validated.confidence = Math.min(validated.confidence, 0.3);
        validated.reasoning += " (數據格式驗證失敗)";
      }
    } else {
      // 🚀 有有效數據時，提高信心度
      validated.confidence = Math.max(validated.confidence, 0.7);
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
