/**
 * API 數據適配器
 * 處理來自後端 API 的數據格式標準化和實時數據更新
 */
export class ApiDataAdapter {
  constructor() {
    this.cache = new Map();
    this.retryConfig = {
      maxRetries: 3,
      retryDelay: 1000,
      backoffFactor: 2,
    };
    this.refreshIntervals = new Map();
  }

  /**
   * 獲取並適配 API 數據
   * @param {string} endpoint - API 端點
   * @param {Object} options - 請求選項
   * @returns {Promise<Object>} 適配後的數據
   */
  async fetchAndAdaptData(endpoint, options = {}) {
    const {
      method = "GET",
      params = {},
      headers = {},
      useCache = true,
      cacheTime = 5 * 60 * 1000, // 5分鐘
      retries = this.retryConfig.maxRetries,
    } = options;

    // 生成快取鍵
    const cacheKey = this.generateCacheKey(endpoint, method, params);

    // 檢查快取
    if (useCache && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < cacheTime) {
        return cached.data;
      }
    }

    try {
      const data = await this.fetchWithRetry(
        endpoint,
        {
          method,
          params,
          headers,
        },
        retries
      );

      const adaptedData = this.adaptApiResponse(data, endpoint);

      // 更新快取
      if (useCache) {
        this.cache.set(cacheKey, {
          data: adaptedData,
          timestamp: Date.now(),
        });
      }

      return adaptedData;
    } catch (error) {
      throw new Error(`API 數據獲取失敗：${error.message}`);
    }
  }

  /**
   * 帶重試機制的網絡請求
   * @param {string} endpoint - API 端點
   * @param {Object} options - 請求選項
   * @param {number} retries - 剩餘重試次數
   * @returns {Promise<any>} API 響應數據
   */
  async fetchWithRetry(endpoint, options, retries) {
    try {
      const response = await this.makeRequest(endpoint, options);
      return response;
    } catch (error) {
      if (retries > 0) {
        const delay =
          this.retryConfig.retryDelay *
          Math.pow(
            this.retryConfig.backoffFactor,
            this.retryConfig.maxRetries - retries
          );

        await this.sleep(delay);
        return this.fetchWithRetry(endpoint, options, retries - 1);
      }
      throw error;
    }
  }

  /**
   * 執行實際的網絡請求
   * @param {string} endpoint - API 端點
   * @param {Object} options - 請求選項
   * @returns {Promise<any>} API 響應
   */
  async makeRequest(endpoint, options) {
    const { method, params, headers } = options;

    // 構建 URL
    let url = endpoint;
    if (method === "GET" && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams(params);
      url += (url.includes("?") ? "&" : "?") + searchParams.toString();
    }

    // 構建請求配置
    const fetchOptions = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    };

    // 添加請求體（非 GET 請求）
    if (method !== "GET" && Object.keys(params).length > 0) {
      fetchOptions.body = JSON.stringify(params);
    }

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * 適配 API 響應數據
   * @param {any} responseData - API 響應數據
   * @param {string} endpoint - API 端點（用於推斷數據類型）
   * @returns {Object} 適配後的數據結構
   */
  adaptApiResponse(responseData, endpoint) {
    const result = {
      success: false,
      data: null,
      meta: {
        source: "api",
        endpoint,
        adaptedAt: Date.now(),
        originalFormat: this.detectResponseFormat(responseData),
      },
      suggestions: [],
    };

    try {
      // 檢測並適配不同的響應格式
      if (this.isStatisticalResponse(responseData)) {
        result.data = this.adaptStatisticalData(responseData);
        result.suggestions = this.generateStatisticalSuggestions(result.data);
      } else if (this.isTimeSeriesResponse(responseData)) {
        result.data = this.adaptTimeSeriesData(responseData);
        result.suggestions = this.generateTimeSeriesSuggestions(result.data);
      } else if (this.isCategoricalResponse(responseData)) {
        result.data = this.adaptCategoricalData(responseData);
        result.suggestions = this.generateCategoricalSuggestions(result.data);
      } else if (this.isTableResponse(responseData)) {
        result.data = this.adaptTableData(responseData);
        result.suggestions = this.generateTableSuggestions(result.data);
      } else {
        // 通用適配
        result.data = this.adaptGenericData(responseData);
        result.suggestions = this.generateGenericSuggestions(result.data);
      }

      result.success = result.data !== null;
      result.meta.dataType = this.inferDataType(result.data);
      result.meta.recordCount = this.getRecordCount(result.data);
    } catch (error) {
      result.error = `數據適配失敗：${error.message}`;
    }

    return result;
  }

  /**
   * 檢測響應數據格式
   * @param {any} data - 響應數據
   * @returns {string} 數據格式類型
   */
  detectResponseFormat(data) {
    if (Array.isArray(data)) {
      return "array";
    }

    if (typeof data === "object" && data !== null) {
      if (data.hasOwnProperty("data") || data.hasOwnProperty("result")) {
        return "wrapped_object";
      }

      if (data.hasOwnProperty("rows") || data.hasOwnProperty("records")) {
        return "table_object";
      }

      return "plain_object";
    }

    return "primitive";
  }

  /**
   * 判斷是否為統計分析響應
   * @param {any} data - 響應數據
   * @returns {boolean} 是否為統計響應
   */
  isStatisticalResponse(data) {
    const statisticalKeys = [
      "mean",
      "median",
      "std",
      "variance",
      "min",
      "max",
      "t_statistic",
      "p_value",
      "confidence_interval",
      "correlation",
      "regression",
      "anova",
    ];

    if (typeof data === "object" && data !== null) {
      return statisticalKeys.some((key) => data.hasOwnProperty(key));
    }

    return false;
  }

  /**
   * 判斷是否為時間序列響應
   * @param {any} data - 響應數據
   * @returns {boolean} 是否為時間序列
   */
  isTimeSeriesResponse(data) {
    if (Array.isArray(data) && data.length > 0) {
      const firstItem = data[0];
      if (typeof firstItem === "object") {
        const keys = Object.keys(firstItem);
        return keys.some(
          (key) =>
            key.includes("time") ||
            key.includes("date") ||
            key.includes("timestamp") ||
            /\d{4}-\d{2}-\d{2}/.test(String(firstItem[key]))
        );
      }
    }

    return false;
  }

  /**
   * 判斷是否為分類響應
   * @param {any} data - 響應數據
   * @returns {boolean} 是否為分類響應
   */
  isCategoricalResponse(data) {
    if (typeof data === "object" && data !== null && !Array.isArray(data)) {
      const values = Object.values(data);
      return values.every((v) => typeof v === "number" || !isNaN(Number(v)));
    }

    return false;
  }

  /**
   * 判斷是否為表格響應
   * @param {any} data - 響應數據
   * @returns {boolean} 是否為表格響應
   */
  isTableResponse(data) {
    if (Array.isArray(data) && data.length > 0) {
      const firstItem = data[0];
      return (
        typeof firstItem === "object" &&
        Object.keys(firstItem).length > 1 &&
        !this.isTimeSeriesResponse(data)
      );
    }

    return false;
  }

  /**
   * 適配統計數據
   * @param {Object} data - 統計響應數據
   * @returns {Object} 適配後的數據
   */
  adaptStatisticalData(data) {
    const adapted = {};

    // 基本統計量
    if (data.mean !== undefined) adapted["平均值"] = data.mean;
    if (data.median !== undefined) adapted["中位數"] = data.median;
    if (data.std !== undefined) adapted["標準差"] = data.std;
    if (data.min !== undefined) adapted["最小值"] = data.min;
    if (data.max !== undefined) adapted["最大值"] = data.max;

    // T 檢定結果
    if (data.t_statistic !== undefined) adapted["T 統計量"] = data.t_statistic;
    if (data.p_value !== undefined) adapted["P 值"] = data.p_value;

    // 信賴區間
    if (data.confidence_interval && Array.isArray(data.confidence_interval)) {
      adapted["信賴區間下限"] = data.confidence_interval[0];
      adapted["信賴區間上限"] = data.confidence_interval[1];
    }

    return Object.keys(adapted).length > 0 ? adapted : data;
  }

  /**
   * 適配時間序列數據
   * @param {Array} data - 時間序列響應數據
   * @returns {Array} 適配後的數據
   */
  adaptTimeSeriesData(data) {
    return data.map((item) => {
      const adapted = {};

      // 查找時間欄位
      const timeKeys = Object.keys(item).filter(
        (key) =>
          key.includes("time") ||
          key.includes("date") ||
          key.includes("timestamp")
      );

      if (timeKeys.length > 0) {
        adapted.time = item[timeKeys[0]];
      }

      // 查找數值欄位
      Object.entries(item).forEach(([key, value]) => {
        if (
          !timeKeys.includes(key) &&
          (typeof value === "number" || !isNaN(Number(value)))
        ) {
          adapted[key] = Number(value);
        }
      });

      return adapted;
    });
  }

  /**
   * 適配分類數據
   * @param {Object} data - 分類響應數據
   * @returns {Object} 適配後的數據
   */
  adaptCategoricalData(data) {
    const adapted = {};

    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === "number" || !isNaN(Number(value))) {
        adapted[key] = Number(value);
      }
    });

    return adapted;
  }

  /**
   * 適配表格數據
   * @param {Array} data - 表格響應數據
   * @returns {Array} 適配後的數據
   */
  adaptTableData(data) {
    return data.map((row) => {
      const adapted = {};

      Object.entries(row).forEach(([key, value]) => {
        if (typeof value === "number" || !isNaN(Number(value))) {
          adapted[key] = Number(value);
        } else {
          adapted[key] = String(value);
        }
      });

      return adapted;
    });
  }

  /**
   * 通用數據適配
   * @param {any} data - 通用響應數據
   * @returns {any} 適配後的數據
   */
  adaptGenericData(data) {
    // 如果數據被包裝在特定結構中，提取實際數據
    if (typeof data === "object" && data !== null) {
      if (data.hasOwnProperty("data")) {
        return this.adaptGenericData(data.data);
      }

      if (data.hasOwnProperty("result")) {
        return this.adaptGenericData(data.result);
      }

      if (data.hasOwnProperty("rows")) {
        return data.rows;
      }

      if (data.hasOwnProperty("records")) {
        return data.records;
      }
    }

    return data;
  }

  /**
   * 生成統計建議
   * @param {Object} data - 統計數據
   * @returns {Array} 建議陣列
   */
  generateStatisticalSuggestions(data) {
    const suggestions = [];

    if (data["P 值"] !== undefined) {
      suggestions.push({
        type: "chart",
        chartType: "gauge",
        title: "P 值顯著性",
        description: "使用儀表盤顯示統計顯著性",
      });
    }

    if (
      data["信賴區間下限"] !== undefined &&
      data["信賴區間上限"] !== undefined
    ) {
      suggestions.push({
        type: "chart",
        chartType: "bar",
        title: "信賴區間",
        description: "使用誤差條顯示信賴區間",
      });
    }

    suggestions.push({
      type: "chart",
      chartType: "bar",
      title: "統計量比較",
      description: "比較各種統計指標",
    });

    return suggestions;
  }

  /**
   * 生成時間序列建議
   * @param {Array} data - 時間序列數據
   * @returns {Array} 建議陣列
   */
  generateTimeSeriesSuggestions(data) {
    return [
      {
        type: "chart",
        chartType: "line",
        title: "時間趨勢",
        description: "使用折線圖展示時間趨勢",
      },
      {
        type: "chart",
        chartType: "area",
        title: "趨勢填充",
        description: "使用面積圖展示趨勢變化",
      },
    ];
  }

  /**
   * 生成分類建議
   * @param {Object} data - 分類數據
   * @returns {Array} 建議陣列
   */
  generateCategoricalSuggestions(data) {
    return [
      {
        type: "chart",
        chartType: "pie",
        title: "分布分析",
        description: "使用餅圖顯示各類別分布",
      },
      {
        type: "chart",
        chartType: "bar",
        title: "數值比較",
        description: "使用柱狀圖比較各類別數值",
      },
    ];
  }

  /**
   * 生成表格建議
   * @param {Array} data - 表格數據
   * @returns {Array} 建議陣列
   */
  generateTableSuggestions(data) {
    const suggestions = [];

    if (data.length > 0) {
      const keys = Object.keys(data[0]);
      const numericKeys = keys.filter((key) =>
        data.every(
          (row) => typeof row[key] === "number" || !isNaN(Number(row[key]))
        )
      );

      if (numericKeys.length >= 2) {
        suggestions.push({
          type: "chart",
          chartType: "scatter",
          title: "相關性分析",
          description: "使用散點圖分析數據間的相關性",
        });
      }

      suggestions.push({
        type: "chart",
        chartType: "table",
        title: "數據表格",
        description: "以表格形式展示數據",
      });
    }

    return suggestions;
  }

  /**
   * 生成通用建議
   * @param {any} data - 通用數據
   * @returns {Array} 建議陣列
   */
  generateGenericSuggestions(data) {
    return [
      {
        type: "chart",
        chartType: "auto",
        title: "智能推薦",
        description: "根據數據特徵自動選擇最適合的圖表類型",
      },
    ];
  }

  /**
   * 推斷數據類型
   * @param {any} data - 數據
   * @returns {string} 數據類型
   */
  inferDataType(data) {
    if (Array.isArray(data)) {
      return "array";
    } else if (typeof data === "object" && data !== null) {
      return "object";
    } else {
      return typeof data;
    }
  }

  /**
   * 獲取記錄數量
   * @param {any} data - 數據
   * @returns {number} 記錄數量
   */
  getRecordCount(data) {
    if (Array.isArray(data)) {
      return data.length;
    } else if (typeof data === "object" && data !== null) {
      return Object.keys(data).length;
    } else {
      return 1;
    }
  }

  /**
   * 生成快取鍵
   * @param {string} endpoint - API 端點
   * @param {string} method - HTTP 方法
   * @param {Object} params - 參數
   * @returns {string} 快取鍵
   */
  generateCacheKey(endpoint, method, params) {
    const paramString = JSON.stringify(params, Object.keys(params).sort());
    return `${method}:${endpoint}:${btoa(paramString)}`;
  }

  /**
   * 清理快取
   * @param {string} pattern - 快取鍵模式（可選）
   */
  clearCache(pattern = null) {
    if (pattern) {
      const keysToDelete = [];
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach((key) => this.cache.delete(key));
    } else {
      this.cache.clear();
    }
  }

  /**
   * 設置實時數據更新
   * @param {string} endpoint - API 端點
   * @param {Function} callback - 更新回調
   * @param {number} interval - 更新間隔（毫秒）
   * @param {Object} options - 請求選項
   */
  startRealTimeUpdates(endpoint, callback, interval = 30000, options = {}) {
    const updateFunction = async () => {
      try {
        const data = await this.fetchAndAdaptData(endpoint, {
          ...options,
          useCache: false,
        });
        callback(data);
      } catch (error) {
        console.error("實時更新失敗:", error);
      }
    };

    // 立即執行一次
    updateFunction();

    // 設置定時更新
    const intervalId = setInterval(updateFunction, interval);
    this.refreshIntervals.set(endpoint, intervalId);

    return intervalId;
  }

  /**
   * 停止實時數據更新
   * @param {string} endpoint - API 端點
   */
  stopRealTimeUpdates(endpoint) {
    const intervalId = this.refreshIntervals.get(endpoint);
    if (intervalId) {
      clearInterval(intervalId);
      this.refreshIntervals.delete(endpoint);
    }
  }

  /**
   * 延遲函數
   * @param {number} ms - 延遲毫秒數
   * @returns {Promise} 延遲 Promise
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 銷毀適配器，清理資源
   */
  destroy() {
    this.clearCache();

    // 清理所有定時器
    for (const intervalId of this.refreshIntervals.values()) {
      clearInterval(intervalId);
    }
    this.refreshIntervals.clear();
  }
}

// 創建單例實例
export const apiDataAdapter = new ApiDataAdapter();

// 便捷方法
export const fetchApiData = (endpoint, options) =>
  apiDataAdapter.fetchAndAdaptData(endpoint, options);

export const startRealTimeChart = (endpoint, callback, interval, options) =>
  apiDataAdapter.startRealTimeUpdates(endpoint, callback, interval, options);

export const stopRealTimeChart = (endpoint) =>
  apiDataAdapter.stopRealTimeUpdates(endpoint);
