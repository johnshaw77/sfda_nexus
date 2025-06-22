/**
 * 數據處理器 - 通用數據處理工具
 * 負責各種數據格式的檢測、清洗和標準化轉換
 */

import { isArray, isObject, isString, isNumber, trim, isEmpty } from "lodash";
import Papa from "papaparse";

class DataProcessor {
  constructor() {
    this.supportedFormats = [
      "array",
      "object",
      "csv-string",
      "json-string",
      "key-value-pairs",
    ];
  }

  /**
   * 主要數據處理方法
   * @param {*} rawData 原始數據
   * @returns {Promise<Array|Object>} 處理後的數據
   */
  async process(rawData) {
    try {
      // 1. 檢測數據格式
      const format = this.detectFormat(rawData);

      // 2. 根據格式進行相應處理
      let processedData;

      switch (format) {
        case "array":
          processedData = this.processArray(rawData);
          break;
        case "object":
          processedData = this.processObject(rawData);
          break;
        case "csv-string":
          processedData = await this.processCsvString(rawData);
          break;
        case "json-string":
          processedData = this.processJsonString(rawData);
          break;
        case "key-value-pairs":
          processedData = this.processKeyValuePairs(rawData);
          break;
        default:
          throw new Error(`不支援的數據格式: ${format}`);
      }

      // 3. 數據清洗和驗證
      return this.cleanData(processedData);
    } catch (error) {
      console.error("數據處理錯誤:", error);
      throw new Error(`數據處理失敗: ${error.message}`);
    }
  }

  /**
   * 檢測數據格式
   * @param {*} data 原始數據
   * @returns {string} 數據格式類型
   */
  detectFormat(data) {
    // 空數據檢查
    if (data == null || data === "") {
      throw new Error("數據不能為空");
    }

    // 數組格式
    if (isArray(data)) {
      return "array";
    }

    // 對象格式
    if (isObject(data) && !isArray(data)) {
      return "object";
    }

    // 字符串格式需要進一步檢測
    if (isString(data)) {
      const trimmed = trim(data);

      // JSON 字符串檢測
      if (
        (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
        (trimmed.startsWith("[") && trimmed.endsWith("]"))
      ) {
        try {
          JSON.parse(trimmed);
          return "json-string";
        } catch (e) {
          // 不是有效的 JSON，繼續檢測其他格式
        }
      }

      // CSV 字符串檢測
      if (this.looksLikeCsv(trimmed)) {
        return "csv-string";
      }

      // 鍵值對格式檢測
      if (this.looksLikeKeyValuePairs(trimmed)) {
        return "key-value-pairs";
      }
    }

    // 數字格式
    if (isNumber(data)) {
      return "single-value";
    }

    throw new Error("無法識別的數據格式");
  }

  /**
   * 檢測是否像 CSV 格式
   */
  looksLikeCsv(str) {
    const lines = str.split("\n").filter((line) => trim(line));
    if (lines.length < 2) return false;

    // 檢查是否有逗號分隔
    const firstLine = lines[0];
    const commaCount = (firstLine.match(/,/g) || []).length;

    if (commaCount === 0) return false;

    // 檢查第二行是否有相同數量的逗號
    const secondLine = lines[1];
    const secondCommaCount = (secondLine.match(/,/g) || []).length;

    return commaCount === secondCommaCount;
  }

  /**
   * 檢測是否像鍵值對格式
   */
  looksLikeKeyValuePairs(str) {
    const patterns = [
      /^\s*\w+[:：]\s*[\d\w\s]+/m, // key: value
      /^\s*\w+\s*[\d\w\s]+/m, // key value
      /(\w+)[：:](\d+)/g, // 產品:數量
      /([^,，]+)[,，]([^,，]+)/g, // 逗號分隔的鍵值對
    ];

    return patterns.some((pattern) => pattern.test(str));
  }

  /**
   * 處理數組數據
   */
  processArray(data) {
    if (!isArray(data) || data.length === 0) {
      throw new Error("數組數據不能為空");
    }

    // 如果是對象數組，直接返回
    if (isObject(data[0])) {
      return data;
    }

    // 如果是簡單數組，轉換為標準格式
    return data.map((value, index) => ({
      index: index + 1,
      value: value,
    }));
  }

  /**
   * 處理對象數據
   */
  processObject(data) {
    if (!isObject(data) || isArray(data)) {
      throw new Error("無效的對象數據");
    }

    // 如果對象的值都是數字或可轉換為數字，保持鍵值對格式
    const entries = Object.entries(data);
    if (entries.every(([key, value]) => !isNaN(Number(value)))) {
      return data;
    }

    // 否則轉換為數組格式
    return entries.map(([key, value]) => ({
      key,
      value,
    }));
  }

  /**
   * 處理 CSV 字符串
   */
  async processCsvString(csvString) {
    return new Promise((resolve, reject) => {
      Papa.parse(csvString, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            reject(new Error(`CSV 解析錯誤: ${results.errors[0].message}`));
            return;
          }

          if (!results.data || results.data.length === 0) {
            reject(new Error("CSV 數據為空"));
            return;
          }

          resolve(results.data);
        },
        error: (error) => {
          reject(new Error(`CSV 解析失敗: ${error.message}`));
        },
      });
    });
  }

  /**
   * 處理 JSON 字符串
   */
  processJsonString(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);

      if (isArray(parsed)) {
        return this.processArray(parsed);
      } else if (isObject(parsed)) {
        return this.processObject(parsed);
      } else {
        throw new Error("JSON 數據格式不正確");
      }
    } catch (error) {
      throw new Error(`JSON 解析失敗: ${error.message}`);
    }
  }

  /**
   * 處理鍵值對字符串
   */
  processKeyValuePairs(str) {
    const result = {};
    const lines = str.split(/[\n,，]/).filter((line) => trim(line));

    for (const line of lines) {
      const trimmed = trim(line);

      // 嘗試不同的分隔符模式
      const patterns = [
        /^([^:：]+)[:：]\s*(.+)$/, // key: value 或 key：value
        /^([^0-9]+)\s*(\d+(?:\.\d+)?)/, // key number
        /^([^0-9]+)\s+(.+)$/, // key value (空格分隔)
      ];

      let matched = false;
      for (const pattern of patterns) {
        const match = trimmed.match(pattern);
        if (match) {
          const key = trim(match[1]);
          const value = trim(match[2]);

          // 嘗試轉換為數字
          const numValue = Number(value);
          result[key] = isNaN(numValue) ? value : numValue;
          matched = true;
          break;
        }
      }

      if (!matched && trimmed) {
        console.warn(`無法解析的行: ${trimmed}`);
      }
    }

    if (Object.keys(result).length === 0) {
      throw new Error("無法從文本中提取有效的鍵值對");
    }

    return result;
  }

  /**
   * 數據清洗
   */
  cleanData(data) {
    if (isArray(data)) {
      return data
        .map((item) => this.cleanItem(item))
        .filter((item) => !this.isEmpty(item));
    } else if (isObject(data)) {
      const cleaned = {};
      Object.entries(data).forEach(([key, value]) => {
        const cleanKey = this.cleanString(key);
        const cleanValue = this.cleanValue(value);
        if (cleanKey && cleanValue != null) {
          cleaned[cleanKey] = cleanValue;
        }
      });
      return cleaned;
    }

    return data;
  }

  /**
   * 清洗單個數據項
   */
  cleanItem(item) {
    if (isObject(item)) {
      const cleaned = {};
      Object.entries(item).forEach(([key, value]) => {
        const cleanKey = this.cleanString(key);
        const cleanValue = this.cleanValue(value);
        if (cleanKey && cleanValue != null) {
          cleaned[cleanKey] = cleanValue;
        }
      });
      return cleaned;
    }

    return this.cleanValue(item);
  }

  /**
   * 清洗字符串
   */
  cleanString(str) {
    if (!isString(str)) return str;

    return trim(str)
      .replace(/\s+/g, " ") // 合併多個空格
      .replace(/[""]/g, '"') // 統一引號
      .replace(/['']/g, "'"); // 統一單引號
  }

  /**
   * 清洗值
   */
  cleanValue(value) {
    if (value == null) return null;

    if (isString(value)) {
      const cleaned = this.cleanString(value);

      // 嘗試轉換為數字
      if (cleaned && !isNaN(Number(cleaned)) && cleaned !== "") {
        return Number(cleaned);
      }

      return cleaned || null;
    }

    if (isNumber(value)) {
      // 檢查是否為有效數字
      return isFinite(value) ? value : null;
    }

    return value;
  }

  /**
   * 檢查是否為空項目
   */
  isEmpty(item) {
    if (item == null) return true;

    if (isObject(item)) {
      return Object.keys(item).length === 0;
    }

    if (isString(item)) {
      return trim(item) === "";
    }

    return false;
  }

  /**
   * 從自然語言文本中提取數據
   * @param {string} text 包含數據的自然語言文本
   * @returns {Object|Array} 提取的數據
   */
  extractFromNaturalLanguage(text) {
    const patterns = [
      // 百分比模式: "男性40%，女性60%"
      {
        pattern: /([^0-9%，,]+)(\d+(?:\.\d+)?)%/g,
        type: "percentage",
      },
      // 數量模式: "A產品200萬，B產品150萬"
      {
        pattern: /([^0-9，,]+?)(\d+(?:\.\d+)?)[萬千百十]?[台個件張份]/g,
        type: "quantity",
      },
      // 簡單數字模式: "產品A:100, 產品B:200"
      {
        pattern: /([^:：\d]+)[:：]\s*(\d+(?:\.\d+)?)/g,
        type: "simple",
      },
    ];

    for (const { pattern, type } of patterns) {
      const matches = [...text.matchAll(pattern)];
      if (matches.length > 0) {
        const result = {};
        matches.forEach((match) => {
          const key = trim(match[1]);
          let value = Number(match[2]);

          // 處理中文數量單位
          if (type === "quantity" && text.includes("萬")) {
            value *= 10000;
          }

          result[key] = value;
        });

        if (Object.keys(result).length > 0) {
          return result;
        }
      }
    }

    throw new Error("無法從文本中提取有效數據");
  }
}

// 創建並導出實例
export const dataProcessor = new DataProcessor();
export default dataProcessor;
