import Papa from "papaparse";
import { dataProcessor } from "./dataProcessor";

/**
 * 文件數據解析器
 * 支援 CSV、Excel、JSON等多種格式的文件解析
 */
export class FileDataParser {
  constructor() {
    this.supportedFormats = [".csv", ".txt", ".json", ".xlsx", ".xls"];
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
  }

  /**
   * 檢測文件格式
   * @param {File} file - 文件對象
   * @returns {string} 文件格式
   */
  detectFileFormat(file) {
    const fileName = file.name.toLowerCase();
    const extension = fileName.substring(fileName.lastIndexOf("."));

    // MIME type 檢測
    const mimeTypes = {
      "text/csv": ".csv",
      "application/json": ".json",
      "text/plain": ".txt",
      "application/vnd.ms-excel": ".xls",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
        ".xlsx",
    };

    return mimeTypes[file.type] || extension;
  }

  /**
   * 驗證文件
   * @param {File} file - 文件對象
   * @returns {Object} 驗證結果
   */
  validateFile(file) {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
    };

    // 檢查文件大小
    if (file.size > this.maxFileSize) {
      result.valid = false;
      result.errors.push(
        `文件過大，最大支援 ${this.maxFileSize / 1024 / 1024}MB`
      );
    }

    // 檢查文件格式
    const format = this.detectFileFormat(file);
    if (!this.supportedFormats.includes(format)) {
      result.valid = false;
      result.errors.push(`不支援的文件格式：${format}`);
    }

    // 檢查文件是否為空
    if (file.size === 0) {
      result.valid = false;
      result.errors.push("文件為空");
    }

    return result;
  }

  /**
   * 解析 CSV 文件
   * @param {File} file - CSV 文件
   * @param {Object} options - 解析選項
   * @returns {Promise<Object>} 解析結果
   */
  async parseCsvFile(file, options = {}) {
    return new Promise((resolve, reject) => {
      const defaultOptions = {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
        transform: (value) => {
          // 去除前後空格
          value = value.trim();

          // 嘗試轉換為數字
          if (!isNaN(value) && value !== "") {
            return parseFloat(value);
          }

          // 處理百分比
          if (value.endsWith("%")) {
            const num = parseFloat(value.slice(0, -1));
            if (!isNaN(num)) {
              return num / 100;
            }
          }

          return value;
        },
        error: (error) => {
          reject(new Error(`CSV 解析錯誤：${error.message}`));
        },
        complete: (results) => {
          try {
            const processed = this.processCsvResults(results);
            resolve(processed);
          } catch (error) {
            reject(error);
          }
        },
      };

      const mergedOptions = { ...defaultOptions, ...options };
      Papa.parse(file, mergedOptions);
    });
  }

  /**
   * 處理 CSV 解析結果
   * @param {Object} results - Papa Parse 結果
   * @returns {Object} 處理後的結果
   */
  processCsvResults(results) {
    const { data, errors, meta } = results;

    if (errors.length > 0) {
      console.warn("CSV 解析警告：", errors);
    }

    // 過濾空行
    const validData = data.filter((row) => {
      return Object.values(row).some((value) => value !== "" && value != null);
    });

    // 檢測數據類型
    const columns = meta.fields || Object.keys(validData[0] || {});
    const columnTypes = this.detectColumnTypes(validData, columns);

    // 數據統計
    const statistics = this.generateDataStatistics(validData, columnTypes);

    return {
      success: true,
      data: validData,
      meta: {
        columns,
        columnTypes,
        rowCount: validData.length,
        originalRowCount: data.length,
        errors: errors.length,
        statistics,
      },
      suggestions: this.generateDataSuggestions(validData, columnTypes),
    };
  }

  /**
   * 解析 JSON 文件
   * @param {File} file - JSON 文件
   * @returns {Promise<Object>} 解析結果
   */
  async parseJsonFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const jsonData = JSON.parse(e.target.result);
          const processed = this.processJsonData(jsonData);
          resolve(processed);
        } catch (error) {
          reject(new Error(`JSON 解析錯誤：${error.message}`));
        }
      };

      reader.onerror = () => {
        reject(new Error("文件讀取失敗"));
      };

      reader.readAsText(file, "UTF-8");
    });
  }

  /**
   * 處理 JSON 數據
   * @param {any} jsonData - JSON 數據
   * @returns {Object} 處理後的結果
   */
  processJsonData(jsonData) {
    let processedData;
    let dataType;

    if (Array.isArray(jsonData)) {
      dataType = "array";
      processedData = jsonData;
    } else if (typeof jsonData === "object" && jsonData !== null) {
      dataType = "object";

      // 嘗試轉換為數組格式
      if (this.isKeyValueObject(jsonData)) {
        processedData = Object.entries(jsonData).map(([key, value]) => ({
          name: key,
          value: value,
        }));
      } else {
        processedData = [jsonData];
      }
    } else {
      throw new Error("不支援的 JSON 數據格式");
    }

    // 檢測數據結構
    const structure = this.analyzeDataStructure(processedData);

    return {
      success: true,
      data: processedData,
      meta: {
        originalType: dataType,
        structure,
        rowCount: Array.isArray(processedData) ? processedData.length : 1,
      },
      suggestions: this.generateJsonSuggestions(processedData, structure),
    };
  }

  /**
   * 檢測欄位類型
   * @param {Array} data - 數據陣列
   * @param {Array} columns - 欄位名稱陣列
   * @returns {Object} 欄位類型映射
   */
  detectColumnTypes(data, columns) {
    const types = {};

    columns.forEach((column) => {
      const values = data
        .map((row) => row[column])
        .filter((v) => v != null && v !== "");

      if (values.length === 0) {
        types[column] = "empty";
        return;
      }

      // 檢測數字類型
      const numericValues = values.filter(
        (v) => !isNaN(v) && typeof v === "number"
      );
      if (numericValues.length / values.length > 0.8) {
        types[column] = "numeric";
        return;
      }

      // 檢測日期類型
      const dateValues = values.filter((v) => {
        const date = new Date(v);
        return !isNaN(date.getTime());
      });
      if (dateValues.length / values.length > 0.8) {
        types[column] = "date";
        return;
      }

      // 檢測分類類型
      const uniqueValues = new Set(values);
      if (uniqueValues.size <= Math.max(10, values.length * 0.1)) {
        types[column] = "categorical";
        return;
      }

      // 默認為文字類型
      types[column] = "text";
    });

    return types;
  }

  /**
   * 生成數據統計信息
   * @param {Array} data - 數據陣列
   * @param {Object} columnTypes - 欄位類型
   * @returns {Object} 統計信息
   */
  generateDataStatistics(data, columnTypes) {
    const stats = {};

    Object.entries(columnTypes).forEach(([column, type]) => {
      const values = data
        .map((row) => row[column])
        .filter((v) => v != null && v !== "");

      stats[column] = {
        type,
        count: values.length,
        uniqueCount: new Set(values).size,
        nullCount: data.length - values.length,
      };

      if (type === "numeric") {
        const numericValues = values.filter((v) => !isNaN(v));
        if (numericValues.length > 0) {
          stats[column].min = Math.min(...numericValues);
          stats[column].max = Math.max(...numericValues);
          stats[column].mean =
            numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
        }
      }

      if (type === "categorical") {
        const frequency = {};
        values.forEach((v) => {
          frequency[v] = (frequency[v] || 0) + 1;
        });
        stats[column].frequency = frequency;
      }
    });

    return stats;
  }

  /**
   * 生成數據建議
   * @param {Array} data - 數據陣列
   * @param {Object} columnTypes - 欄位類型
   * @returns {Array} 建議陣列
   */
  generateDataSuggestions(data, columnTypes) {
    const suggestions = [];

    const numericColumns = Object.entries(columnTypes)
      .filter(([, type]) => type === "numeric")
      .map(([column]) => column);

    const categoricalColumns = Object.entries(columnTypes)
      .filter(([, type]) => type === "categorical")
      .map(([column]) => column);

    const dateColumns = Object.entries(columnTypes)
      .filter(([, type]) => type === "date")
      .map(([column]) => column);

    // 圖表類型建議
    if (numericColumns.length >= 2) {
      suggestions.push({
        type: "chart",
        chartType: "scatter",
        title: "散點圖分析",
        description: `使用 ${numericColumns[0]} 和 ${numericColumns[1]} 進行相關性分析`,
      });
    }

    if (categoricalColumns.length >= 1 && numericColumns.length >= 1) {
      suggestions.push({
        type: "chart",
        chartType: "bar",
        title: "分類數據比較",
        description: `比較不同 ${categoricalColumns[0]} 的 ${numericColumns[0]} 值`,
      });
    }

    if (dateColumns.length >= 1 && numericColumns.length >= 1) {
      suggestions.push({
        type: "chart",
        chartType: "line",
        title: "時間趨勢分析",
        description: `分析 ${numericColumns[0]} 隨時間的變化趨勢`,
      });
    }

    if (categoricalColumns.length >= 1) {
      suggestions.push({
        type: "chart",
        chartType: "pie",
        title: "分布分析",
        description: `顯示 ${categoricalColumns[0]} 的分布情況`,
      });
    }

    return suggestions;
  }

  /**
   * 生成 JSON 數據建議
   * @param {Array} data - 處理後的數據
   * @param {Object} structure - 數據結構
   * @returns {Array} 建議陣列
   */
  generateJsonSuggestions(data, structure) {
    const suggestions = [];

    if (structure.hasNumericValues && structure.hasCategories) {
      suggestions.push({
        type: "chart",
        chartType: "bar",
        title: "數值比較",
        description: "使用柱狀圖比較各項數值",
      });

      suggestions.push({
        type: "chart",
        chartType: "pie",
        title: "比例分析",
        description: "使用餅圖顯示各項佔比",
      });
    }

    if (structure.isHierarchical) {
      suggestions.push({
        type: "chart",
        chartType: "tree",
        title: "層次結構",
        description: "使用樹狀圖展示層次關係",
      });
    }

    return suggestions;
  }

  /**
   * 判斷是否為鍵值對象
   * @param {Object} obj - 對象
   * @returns {boolean} 是否為鍵值對象
   */
  isKeyValueObject(obj) {
    return Object.values(obj).every(
      (value) =>
        typeof value === "number" ||
        (typeof value === "string" && !isNaN(Number(value)))
    );
  }

  /**
   * 分析數據結構
   * @param {Array} data - 數據陣列
   * @returns {Object} 結構分析結果
   */
  analyzeDataStructure(data) {
    if (!Array.isArray(data) || data.length === 0) {
      return { isEmpty: true };
    }

    const firstItem = data[0];
    const structure = {
      hasNumericValues: false,
      hasCategories: false,
      isHierarchical: false,
      isTimeSeries: false,
      columnCount: 0,
    };

    if (typeof firstItem === "object") {
      const keys = Object.keys(firstItem);
      structure.columnCount = keys.length;

      // 檢測數值和分類
      keys.forEach((key) => {
        const values = data.map((item) => item[key]).filter((v) => v != null);

        if (values.some((v) => typeof v === "number" || !isNaN(Number(v)))) {
          structure.hasNumericValues = true;
        }

        if (values.some((v) => typeof v === "string")) {
          structure.hasCategories = true;
        }

        // 檢測時間序列
        if (values.some((v) => !isNaN(Date.parse(v)))) {
          structure.isTimeSeries = true;
        }

        // 檢測層次結構
        if (typeof firstItem[key] === "object") {
          structure.isHierarchical = true;
        }
      });
    }

    return structure;
  }

  /**
   * 統一文件解析入口
   * @param {File} file - 文件對象
   * @param {Object} options - 解析選項
   * @returns {Promise<Object>} 解析結果
   */
  async parseFile(file, options = {}) {
    // 驗證文件
    const validation = this.validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.errors.join(", "));
    }

    const format = this.detectFileFormat(file);

    try {
      let result;

      switch (format) {
        case ".csv":
        case ".txt":
          result = await this.parseCsvFile(file, options);
          break;

        case ".json":
          result = await this.parseJsonFile(file);
          break;

        case ".xlsx":
        case ".xls":
          // Excel 解析 (可以後續擴展)
          throw new Error("Excel 文件解析功能開發中，請先轉換為 CSV 格式");

        default:
          throw new Error(`不支援的文件格式：${format}`);
      }

      return {
        ...result,
        format,
        fileName: file.name,
        fileSize: file.size,
        timestamp: Date.now(),
      };
    } catch (error) {
      throw new Error(`文件解析失敗：${error.message}`);
    }
  }
}

// 創建單例實例
export const fileDataParser = new FileDataParser();

// 便捷方法
export const parseFile = (file, options) =>
  fileDataParser.parseFile(file, options);
export const validateFile = (file) => fileDataParser.validateFile(file);
export const detectFileFormat = (file) => fileDataParser.detectFileFormat(file);
