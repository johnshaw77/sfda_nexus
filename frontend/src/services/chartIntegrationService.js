/**
 * 圖表整合服務
 * 統一管理多種數據來源的圖表生成流程
 *
 * 支援的數據來源：
 * 1. MCP 統計分析結果
 * 2. 文件上傳 (CSV, Excel, JSON)
 * 3. 對話數據提取
 * 4. API 數據源
 * 5. 直接數據輸入
 */

import { chartService } from "./chartService";
import { dataProcessor } from "@/utils/dataProcessor";
import { FileDataParser } from "@/utils/fileDataParser";
import { ConversationDataExtractor } from "@/utils/conversationDataExtractor";
import { ApiDataAdapter } from "@/utils/apiDataAdapter";
import { mcpStatisticalAdapter } from "@/utils/mcpStatisticalAdapter";

export class ChartIntegrationService {
  constructor() {
    // 初始化各種數據處理器
    this.fileParser = new FileDataParser();
    this.conversationExtractor = new ConversationDataExtractor();
    this.apiAdapter = new ApiDataAdapter();

    // 數據來源配置
    this.dataSourceConfigs = {
      mcp_statistical: {
        name: "MCP 統計分析",
        icon: "📊",
        color: "#1890ff",
        description: "統計工具產生的專業分析結果",
      },
      file_upload: {
        name: "文件上傳",
        icon: "📁",
        color: "#52c41a",
        description: "CSV、Excel、JSON 等文件格式",
      },
      conversation: {
        name: "對話提取",
        icon: "💬",
        color: "#722ed1",
        description: "從自然語言對話中提取數據",
      },
      api_data: {
        name: "API 數據源",
        icon: "🌐",
        color: "#13c2c2",
        description: "來自後端 API 的實時數據",
      },
      direct_input: {
        name: "直接輸入",
        icon: "✏️",
        color: "#eb2f96",
        description: "JSON、CSV 字符串或簡單數據",
      },
    };
  }

  /**
   * 統一處理入口
   * @param {Object} input - 輸入配置
   * @param {string} input.source - 數據來源類型
   * @param {*} input.data - 原始數據
   * @param {Object} input.options - 處理選項
   * @returns {Promise<Object>} 處理結果
   */
  async processData(input) {
    console.log("🔍 [chartIntegrationService] processData 開始:", {
      input,
      inputType: typeof input,
      hasSource: !!input?.source,
      hasData: !!input?.data,
      source: input?.source,
    });

    const { source, data, options = {} } = input;

    console.log("🔍 [chartIntegrationService] 解構後的參數:", {
      source,
      data: data?.substring ? data.substring(0, 100) + "..." : data,
      dataType: typeof data,
      options,
    });

    const result = {
      success: false,
      charts: [],
      metadata: {
        source,
        processedAt: Date.now(),
        originalDataSize: this.calculateDataSize(data),
      },
      suggestions: [],
      errors: [],
    };

    try {
      console.log(`🔍 [chartIntegrationService] 進入 switch case: ${source}`);
      switch (source) {
        case "mcp_statistical":
          return await this.processMcpStatistical(data, options);

        case "file_upload":
          return await this.processFileUpload(data, options);

        case "conversation":
          console.log("🔍 [chartIntegrationService] 調用 processConversation");
          return await this.processConversation(data, options);

        case "api_data":
          return await this.processApiData(data, options);

        case "direct_input":
          return await this.processDirectInput(data, options);

        default:
          console.log("🔍 [chartIntegrationService] 進入 autoDetectAndProcess");
          return await this.autoDetectAndProcess(data, options);
      }
    } catch (error) {
      console.error("🔍 [chartIntegrationService] processData 錯誤:", error);
      result.errors.push({
        type: "processing_error",
        message: error.message,
        source,
      });
      return result;
    }
  }

  /**
   * 處理 MCP 統計分析結果
   */
  async processMcpStatistical(data, options) {
    const result = mcpStatisticalAdapter.adaptMcpResult(data);

    if (result.success) {
      // 為每個圖表生成完整配置
      const enhancedCharts = await Promise.all(
        result.charts.map(async (chart) => {
          const chartConfig = await chartService.generateChart({
            data: chart.data,
            chartType: chart.type,
            config: {
              title: chart.title,
              description: chart.description || result.summary?.title,
              ...chart.options,
            },
          });

          return {
            ...chartConfig,
            metadata: {
              ...chartConfig.metadata,
              statisticalSummary: result.summary,
              tool: result.metadata.tool,
            },
          };
        })
      );

      return {
        success: true,
        charts: enhancedCharts,
        metadata: {
          source: "mcp_statistical",
          tool: result.metadata.tool,
          processedAt: Date.now(),
        },
        summary: result.summary,
        suggestions: this.generateStatisticalSuggestions(result),
      };
    }

    return result;
  }

  /**
   * 處理文件上傳
   */
  async processFileUpload(file, options) {
    const result = {
      success: false,
      charts: [],
      metadata: { source: "file_upload", processedAt: Date.now() },
    };

    try {
      // 解析文件
      const parseResult = await this.fileParser.parseFile(file, {
        detectTypes: true,
        cleanData: true,
        ...options,
      });

      if (!parseResult.success) {
        throw new Error(parseResult.error);
      }

      // 生成圖表
      const chartConfig = await chartService.generateChart({
        data: parseResult.data,
        chartType: options.chartType || "auto",
        config: {
          title: options.title || `${file.name} 數據圖表`,
          description: `來自文件 ${file.name} 的數據分析`,
          ...options,
        },
      });

      result.success = true;
      result.charts = [chartConfig];
      result.metadata.fileName = file.name;
      result.metadata.fileSize = file.size;
      result.metadata.recordCount = Array.isArray(parseResult.data)
        ? parseResult.data.length
        : Object.keys(parseResult.data).length;

      return result;
    } catch (error) {
      result.errors = [{ type: "file_parsing_error", message: error.message }];
      return result;
    }
  }

  /**
   * 處理對話數據提取
   */
  async processConversation(text, options) {
    console.log("🔍 [chartIntegrationService] processConversation 開始:", {
      textLength: text?.length,
      textPreview: text?.substring(0, 100) + "...",
      options,
    });

    const result = {
      success: false,
      charts: [],
      metadata: { source: "conversation", processedAt: Date.now() },
    };

    try {
      console.log(
        "🔍 [chartIntegrationService] 調用 extractMultipleDataSets..."
      );
      // 提取多個數據集
      const extractResult =
        this.conversationExtractor.extractMultipleDataSets(text);

      console.log(
        "🔍 [chartIntegrationService] extractMultipleDataSets 結果:",
        {
          success: extractResult.success,
          datasetsLength: extractResult.datasets?.length,
          confidence: extractResult.confidence,
          error: extractResult.error,
          datasets: extractResult.datasets,
        }
      );

      if (!extractResult.success || !extractResult.datasets.length) {
        throw new Error(extractResult.error || "無法從對話中提取有效數據");
      }

      console.log("🔍 [chartIntegrationService] 開始為每個數據集生成圖表...");
      // 為每個數據集生成圖表
      const charts = await Promise.all(
        extractResult.datasets.map(async (dataset, index) => {
          console.log(`🔍 [processConversation] 處理數據集 ${index + 1}:`, {
            hasData: !!dataset.data,
            dataType: typeof dataset.data,
            dataContent: dataset.data,
            isArray: Array.isArray(dataset.data),
            isObject: dataset.data && typeof dataset.data === "object",
            keys:
              dataset.data && typeof dataset.data === "object"
                ? Object.keys(dataset.data)
                : null,
          });

          const chartResult = await chartService.generateChart({
            data: dataset.data,
            chartType: options.chartType || "auto",
            config: {
              title: dataset.title || `對話數據 ${index + 1}`,
              description: dataset.description || "從對話中提取的數據",
              ...options,
            },
          });

          // 🎯 將原始數據添加到結果中
          chartResult.data = dataset.data;
          chartResult.title =
            chartResult.title || dataset.title || `對話數據 ${index + 1}`;
          chartResult.description =
            chartResult.description ||
            dataset.description ||
            "從對話中提取的數據";
          chartResult.type =
            chartResult.chartType || chartResult.type || "auto";

          console.log(`🔍 [processConversation] 圖表生成結果 ${index + 1}:`, {
            success: !!chartResult,
            hasData: !!chartResult?.data,
            type: chartResult?.type,
            title: chartResult?.title,
            dataKeys: chartResult.data ? Object.keys(chartResult.data) : null,
          });

          return chartResult;
        })
      );

      console.log("🔍 [chartIntegrationService] 所有圖表生成完成:", {
        chartsLength: charts.length,
        charts: charts.map((c) => ({
          type: c.type,
          title: c.title,
          hasData: !!c.data,
        })),
      });

      result.success = true;
      result.charts = charts;
      result.metadata.extractedDatasets = extractResult.datasets.length;
      result.metadata.confidence = extractResult.confidence;
      result.suggestions = this.generateConversationSuggestions(extractResult);

      return result;
    } catch (error) {
      console.error(
        "🔍 [chartIntegrationService] processConversation 錯誤:",
        error
      );
      result.errors = [
        { type: "conversation_extraction_error", message: error.message },
      ];
      return result;
    }
  }

  /**
   * 處理 API 數據源
   */
  async processApiData(endpoint, options) {
    const result = {
      success: false,
      charts: [],
      metadata: { source: "api_data", processedAt: Date.now() },
    };

    try {
      // 獲取 API 數據
      const apiResult = await this.apiAdapter.fetchAndAdaptData(endpoint, {
        useCache: options.useCache !== false,
        retries: options.retries || 3,
        ...options,
      });

      if (!apiResult.success) {
        throw new Error(apiResult.error || "API 數據獲取失敗");
      }

      // 生成圖表
      const chartConfig = await chartService.generateChart({
        data: apiResult.data,
        chartType: options.chartType || "auto",
        config: {
          title: options.title || "API 數據圖表",
          description: `來自 ${endpoint} 的實時數據`,
          ...options,
        },
      });

      result.success = true;
      result.charts = [chartConfig];
      result.metadata.endpoint = endpoint;
      result.metadata.cacheUsed = apiResult.fromCache;
      result.metadata.dataFreshness = apiResult.timestamp;

      return result;
    } catch (error) {
      result.errors = [{ type: "api_data_error", message: error.message }];
      return result;
    }
  }

  /**
   * 處理直接輸入數據
   */
  async processDirectInput(inputData, options) {
    const result = {
      success: false,
      charts: [],
      metadata: { source: "direct_input", processedAt: Date.now() },
    };

    try {
      let processedData;

      // 根據數據類型處理
      if (typeof inputData === "string") {
        // 嘗試解析 JSON
        if (
          inputData.trim().startsWith("{") ||
          inputData.trim().startsWith("[")
        ) {
          processedData = JSON.parse(inputData);
        }
        // CSV 格式
        else if (inputData.includes(",") && inputData.includes("\n")) {
          processedData = await dataProcessor.processCsvString(inputData);
        }
        // 自然語言
        else {
          processedData = dataProcessor.extractFromNaturalLanguage(inputData);
        }
      } else {
        processedData = inputData;
      }

      // 生成圖表
      const chartConfig = await chartService.generateChart({
        data: processedData,
        chartType: options.chartType || "auto",
        config: {
          title: options.title || "數據圖表",
          description: options.description || "直接輸入的數據分析",
          ...options,
        },
      });

      result.success = true;
      result.charts = [chartConfig];
      result.metadata.inputType = typeof inputData;
      result.metadata.inputSize = this.calculateDataSize(inputData);

      return result;
    } catch (error) {
      result.errors = [{ type: "direct_input_error", message: error.message }];
      return result;
    }
  }

  /**
   * 自動檢測數據類型並處理
   */
  async autoDetectAndProcess(data, options) {
    // 檢測邏輯
    if (mcpStatisticalAdapter.isStatisticalData(data)) {
      return await this.processMcpStatistical(data, options);
    }

    if (data instanceof File || data instanceof Blob) {
      return await this.processFileUpload(data, options);
    }

    if (typeof data === "string" && data.length > 100) {
      // 可能是對話數據
      const conversationResult = await this.processConversation(data, options);
      if (conversationResult.success) {
        return conversationResult;
      }
    }

    // 默認作為直接輸入處理
    return await this.processDirectInput(data, options);
  }

  /**
   * 生成統計建議
   */
  generateStatisticalSuggestions(result) {
    const suggestions = [];

    if (result.summary) {
      suggestions.push({
        type: "interpretation",
        title: "統計解釋",
        content: result.summary.interpretation || result.summary.conclusion,
      });

      if (result.summary.keyResults?.length) {
        suggestions.push({
          type: "key_findings",
          title: "關鍵發現",
          content: result.summary.keyResults.join(", "),
        });
      }
    }

    return suggestions;
  }

  /**
   * 生成對話建議
   */
  generateConversationSuggestions(result) {
    const suggestions = [];

    suggestions.push({
      type: "data_quality",
      title: "數據質量",
      content: `提取信心度: ${(result.confidence * 100).toFixed(1)}%`,
    });

    if (result.datasets.length > 1) {
      suggestions.push({
        type: "multiple_datasets",
        title: "多數據集",
        content: `檢測到 ${result.datasets.length} 個數據集，可分別分析`,
      });
    }

    return suggestions;
  }

  /**
   * 計算數據大小
   */
  calculateDataSize(data) {
    if (!data) {
      return 0;
    }
    if (typeof data === "string") {
      return data.length;
    }
    if (data instanceof File) {
      return data.size;
    }
    try {
      return JSON.stringify(data).length;
    } catch (error) {
      console.warn("計算數據大小失敗:", error);
      return 0;
    }
  }

  /**
   * 獲取數據來源配置
   */
  getDataSourceConfig(source) {
    return (
      this.dataSourceConfigs[source] || {
        name: "未知來源",
        icon: "❓",
        color: "#999",
        description: "未識別的數據來源",
      }
    );
  }

  /**
   * 獲取所有支援的數據來源
   */
  getSupportedDataSources() {
    return Object.entries(this.dataSourceConfigs).map(([key, config]) => ({
      key,
      ...config,
    }));
  }
}

// 創建單例
export const chartIntegrationService = new ChartIntegrationService();

// 便捷方法
export const processChartData = (input) =>
  chartIntegrationService.processData(input);
export const getSupportedDataSources = () =>
  chartIntegrationService.getSupportedDataSources();
