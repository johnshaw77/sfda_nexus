/**
 * CSV 處理服務
 * 提供 CSV 檔案解析、統計分析和 AI 增強的數據洞察
 */

import fs from "fs/promises";
import { AIService } from "./ai.service.js";
import logger from "../utils/logger.util.js";

export class CSVService {
  /**
   * 解析 CSV 內容
   * @param {string} csvContent - CSV 文件內容
   * @returns {Object} 解析結果
   */
  static parseCSV(csvContent) {
    try {
      const lines = csvContent.trim().split("\n");
      if (lines.length === 0) {
        throw new Error("CSV 檔案為空");
      }

      // 解析標題行
      const headers = this.parseCSVLine(lines[0]);

      // 解析數據行
      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = this.parseCSVLine(lines[i]);
          const row = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || "";
          });
          rows.push(row);
        }
      }

      return {
        headers,
        rows,
        totalRows: rows.length,
        totalColumns: headers.length,
      };
    } catch (error) {
      logger.error("CSV 解析失敗", { error: error.message });
      throw new Error(`CSV 解析失敗: ${error.message}`);
    }
  }

  /**
   * 解析 CSV 行（處理引號和逗號）
   * @param {string} line - CSV 行
   * @returns {Array} 解析後的值陣列
   */
  static parseCSVLine(line) {
    const result = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // 處理雙引號轉義
          current += '"';
          i++; // 跳過下一個引號
        } else {
          // 切換引號狀態
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        // 欄位分隔符
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    // 添加最後一個欄位
    result.push(current.trim());

    return result;
  }

  /**
   * 分析數據類型
   * @param {Array} rows - 數據行
   * @param {Array} headers - 標題行
   * @returns {Object} 數據類型分析結果
   */
  static analyzeDataTypes(rows, headers) {
    const typeAnalysis = {};

    headers.forEach((header) => {
      const values = rows.map((row) => row[header]).filter((val) => val !== "");

      if (values.length === 0) {
        typeAnalysis[header] = {
          type: "empty",
          confidence: 1.0,
          sample_values: [],
          null_count: rows.length,
        };
        return;
      }

      // 檢測數字類型
      const numericValues = values.filter(
        (val) => !isNaN(parseFloat(val)) && isFinite(val)
      );
      const numericRatio = numericValues.length / values.length;

      // 檢測日期類型
      const dateValues = values.filter((val) => !isNaN(Date.parse(val)));
      const dateRatio = dateValues.length / values.length;

      // 檢測布林類型
      const booleanValues = values.filter((val) =>
        ["true", "false", "1", "0", "yes", "no", "y", "n"].includes(
          val.toLowerCase()
        )
      );
      const booleanRatio = booleanValues.length / values.length;

      let detectedType = "string";
      let confidence = 0.5;

      if (numericRatio > 0.8) {
        detectedType = "number";
        confidence = numericRatio;
      } else if (dateRatio > 0.8) {
        detectedType = "date";
        confidence = dateRatio;
      } else if (booleanRatio > 0.8) {
        detectedType = "boolean";
        confidence = booleanRatio;
      } else {
        detectedType = "string";
        confidence = 1.0 - Math.max(numericRatio, dateRatio, booleanRatio);
      }

      typeAnalysis[header] = {
        type: detectedType,
        confidence: confidence,
        sample_values: values.slice(0, 5),
        null_count: rows.length - values.length,
        unique_count: new Set(values).size,
      };
    });

    return typeAnalysis;
  }

  /**
   * 計算統計摘要
   * @param {Array} rows - 數據行
   * @param {Array} headers - 標題行
   * @param {Object} typeAnalysis - 數據類型分析
   * @returns {Object} 統計摘要
   */
  static calculateStatistics(rows, headers, typeAnalysis) {
    const statistics = {};

    headers.forEach((header) => {
      const values = rows.map((row) => row[header]).filter((val) => val !== "");
      const type = typeAnalysis[header].type;

      if (type === "number") {
        const numericValues = values
          .map((val) => parseFloat(val))
          .filter((val) => !isNaN(val));

        if (numericValues.length > 0) {
          const sorted = numericValues.sort((a, b) => a - b);
          const sum = numericValues.reduce((acc, val) => acc + val, 0);
          const mean = sum / numericValues.length;

          statistics[header] = {
            count: numericValues.length,
            mean: mean,
            median: this.calculateMedian(sorted),
            min: Math.min(...numericValues),
            max: Math.max(...numericValues),
            std: this.calculateStandardDeviation(numericValues, mean),
            quartiles: this.calculateQuartiles(sorted),
          };
        }
      } else if (type === "string") {
        const valueCounts = {};
        values.forEach((val) => {
          valueCounts[val] = (valueCounts[val] || 0) + 1;
        });

        const sortedCounts = Object.entries(valueCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10);

        statistics[header] = {
          count: values.length,
          unique_count: Object.keys(valueCounts).length,
          most_common: sortedCounts,
          avg_length:
            values.reduce((acc, val) => acc + val.length, 0) / values.length,
        };
      }
    });

    return statistics;
  }

  /**
   * 計算中位數
   */
  static calculateMedian(sortedArray) {
    const mid = Math.floor(sortedArray.length / 2);
    return sortedArray.length % 2 !== 0
      ? sortedArray[mid]
      : (sortedArray[mid - 1] + sortedArray[mid]) / 2;
  }

  /**
   * 計算標準差
   */
  static calculateStandardDeviation(values, mean) {
    const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
    const avgSquaredDiff =
      squaredDiffs.reduce((acc, val) => acc + val, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
  }

  /**
   * 計算四分位數
   */
  static calculateQuartiles(sortedArray) {
    const q1Index = Math.floor(sortedArray.length * 0.25);
    const q3Index = Math.floor(sortedArray.length * 0.75);

    return {
      q1: sortedArray[q1Index],
      q3: sortedArray[q3Index],
      iqr: sortedArray[q3Index] - sortedArray[q1Index],
    };
  }

  /**
   * 檢測數據品質問題
   * @param {Array} rows - 數據行
   * @param {Array} headers - 標題行
   * @param {Object} typeAnalysis - 數據類型分析
   * @returns {Object} 數據品質報告
   */
  static analyzeDataQuality(rows, headers, typeAnalysis) {
    const qualityIssues = {
      missing_values: {},
      duplicates: [],
      outliers: {},
      inconsistent_formats: {},
      summary: {
        total_issues: 0,
        quality_score: 0,
      },
    };

    // 檢查缺失值
    headers.forEach((header) => {
      const nullCount = typeAnalysis[header].null_count;
      const nullPercentage = (nullCount / rows.length) * 100;

      if (nullPercentage > 0) {
        qualityIssues.missing_values[header] = {
          count: nullCount,
          percentage: nullPercentage,
        };
        qualityIssues.summary.total_issues++;
      }
    });

    // 檢查重複行
    const rowStrings = rows.map((row) => JSON.stringify(row));
    const uniqueRows = new Set(rowStrings);
    const duplicateCount = rowStrings.length - uniqueRows.size;

    if (duplicateCount > 0) {
      qualityIssues.duplicates = {
        count: duplicateCount,
        percentage: (duplicateCount / rows.length) * 100,
      };
      qualityIssues.summary.total_issues++;
    }

    // 檢查數值欄位的異常值（使用 IQR 方法）
    headers.forEach((header) => {
      if (typeAnalysis[header].type === "number") {
        const values = rows
          .map((row) => row[header])
          .filter((val) => val !== "")
          .map((val) => parseFloat(val))
          .filter((val) => !isNaN(val));

        if (values.length > 4) {
          const sorted = values.sort((a, b) => a - b);
          const q1 = sorted[Math.floor(sorted.length * 0.25)];
          const q3 = sorted[Math.floor(sorted.length * 0.75)];
          const iqr = q3 - q1;
          const lowerBound = q1 - 1.5 * iqr;
          const upperBound = q3 + 1.5 * iqr;

          const outliers = values.filter(
            (val) => val < lowerBound || val > upperBound
          );

          if (outliers.length > 0) {
            qualityIssues.outliers[header] = {
              count: outliers.length,
              percentage: (outliers.length / values.length) * 100,
              examples: outliers.slice(0, 5),
            };
            qualityIssues.summary.total_issues++;
          }
        }
      }
    });

    // 計算品質分數
    const maxPossibleIssues = headers.length * 3; // 每個欄位最多3種問題
    qualityIssues.summary.quality_score = Math.max(
      0,
      100 - (qualityIssues.summary.total_issues / maxPossibleIssues) * 100
    );

    return qualityIssues;
  }

  /**
   * 使用 AI 生成數據洞察
   * @param {Object} analysisResult - 基本分析結果
   * @param {string} model - AI 模型名稱
   * @returns {Promise<Object>} AI 洞察結果
   */
  static async generateAIInsights(analysisResult, model = "qwen3:8b") {
    try {
      const { basicStats, typeAnalysis, qualityReport, csvData } =
        analysisResult;

      // 構建 AI 分析提示
      const prompt = `作為一名專業的數據分析師，請分析以下 CSV 數據並提供深入的洞察：

## 數據概覽
- 總行數：${csvData.totalRows}
- 總欄位數：${csvData.totalColumns}
- 欄位名稱：${csvData.headers.join(", ")}

## 數據類型分析
${Object.entries(typeAnalysis)
  .map(
    ([field, info]) =>
      `- ${field}: ${info.type} (信心度: ${(info.confidence * 100).toFixed(1)}%, 唯一值: ${info.unique_count}, 空值: ${info.null_count})`
  )
  .join("\n")}

## 數據品質評估
- 品質分數：${qualityReport.summary.quality_score.toFixed(1)}/100
- 發現問題數：${qualityReport.summary.total_issues}
- 缺失值問題：${Object.keys(qualityReport.missing_values).length} 個欄位
- 重複行：${qualityReport.duplicates?.count || 0} 行
- 異常值問題：${Object.keys(qualityReport.outliers).length} 個欄位

## 統計摘要
${Object.entries(basicStats)
  .map(([field, stats]) => {
    if (stats.mean !== undefined) {
      return `- ${field} (數值): 平均值=${stats.mean.toFixed(2)}, 中位數=${stats.median.toFixed(2)}, 標準差=${stats.std.toFixed(2)}`;
    } else if (stats.unique_count !== undefined) {
      return `- ${field} (文字): 唯一值=${stats.unique_count}, 平均長度=${stats.avg_length.toFixed(1)}`;
    }
    return "";
  })
  .filter(Boolean)
  .join("\n")}

## 數據樣本（前3行）
${csvData.rows
  .slice(0, 3)
  .map((row, index) => `行${index + 1}: ${JSON.stringify(row)}`)
  .join("\n")}

請提供以下分析：

1. **數據概況總結**：簡要描述這個數據集的特徵和用途

2. **關鍵發現**：
   - 數據分佈特徵
   - 重要的統計指標
   - 數據間的潛在關聯

3. **數據品質評估**：
   - 主要的數據品質問題
   - 對分析結果的影響
   - 改善建議

4. **業務洞察**：
   - 從數據中發現的趨勢或模式
   - 潛在的商業價值
   - 值得進一步探索的方向

5. **數據處理建議**：
   - 清理和預處理步驟
   - 特徵工程建議
   - 分析方法推薦

請用繁體中文回答，提供具體且可操作的建議。`;

      // 調用 AI 模型
      const aiResponse = await AIService.callOllama({
        model: model,
        messages: [
          {
            role: "system",
            content:
              "你是一位資深的數據科學家和商業分析師，擅長從數據中發現有價值的洞察和商業機會。請提供專業、深入且實用的分析。",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 4096,
        enable_thinking: true,
      });

      return {
        insights: aiResponse.content,
        thinking_process: aiResponse.thinking_content,
        model_used: model,
        processing_time: aiResponse.processing_time,
        generated_at: new Date().toISOString(),
      };
    } catch (error) {
      logger.error("AI 洞察生成失敗", { error: error.message });

      // 返回基本洞察作為降級方案
      return {
        insights: `數據集基本洞察：\n\n這個 CSV 檔案包含 ${analysisResult.csvData.totalRows} 行數據和 ${analysisResult.csvData.totalColumns} 個欄位。\n\n數據品質分數：${analysisResult.qualityReport.summary.quality_score.toFixed(1)}/100\n\n建議：\n1. 檢查並處理缺失值\n2. 驗證數據類型的正確性\n3. 處理發現的異常值\n\n注意：AI 分析服務暫時不可用，這是基本的統計洞察。`,
        error: "AI 服務不可用",
        model_used: model,
        generated_at: new Date().toISOString(),
      };
    }
  }

  /**
   * 完整的 CSV 分析
   * @param {string} filePath - CSV 檔案路徑
   * @param {Object} options - 分析選項
   * @returns {Promise<Object>} 完整分析結果
   */
  static async analyzeCSVFile(filePath, options = {}) {
    const {
      includeAIInsights = true,
      model = "qwen3:8b",
      maxRows = 10000, // 限制處理的最大行數
    } = options;

    try {
      // 讀取檔案內容
      const csvContent = await fs.readFile(filePath, "utf8");

      // 解析 CSV
      const csvData = this.parseCSV(csvContent);

      // 如果數據量太大，取樣分析
      if (csvData.totalRows > maxRows) {
        logger.warn(
          `CSV 檔案行數過多 (${csvData.totalRows})，將取樣前 ${maxRows} 行進行分析`
        );
        csvData.rows = csvData.rows.slice(0, maxRows);
        csvData.totalRows = csvData.rows.length;
      }

      // 分析數據類型
      const typeAnalysis = this.analyzeDataTypes(csvData.rows, csvData.headers);

      // 計算統計摘要
      const basicStats = this.calculateStatistics(
        csvData.rows,
        csvData.headers,
        typeAnalysis
      );

      // 分析數據品質
      const qualityReport = this.analyzeDataQuality(
        csvData.rows,
        csvData.headers,
        typeAnalysis
      );

      const analysisResult = {
        csvData: {
          ...csvData,
          sample_rows: csvData.rows.slice(0, 5), // 只保留前5行作為樣本
        },
        typeAnalysis,
        basicStats,
        qualityReport,
        metadata: {
          analyzed_at: new Date().toISOString(),
          analysis_version: "1.0.0",
          sample_size: csvData.totalRows,
        },
      };

      // 生成 AI 洞察（如果啟用）
      if (includeAIInsights) {
        const aiInsights = await this.generateAIInsights(analysisResult, model);
        analysisResult.aiInsights = aiInsights;
      }

      logger.info("CSV 分析完成", {
        rows: csvData.totalRows,
        columns: csvData.totalColumns,
        quality_score: qualityReport.summary.quality_score,
        ai_insights: includeAIInsights,
      });

      return analysisResult;
    } catch (error) {
      logger.error("CSV 分析失敗", {
        filePath,
        error: error.message,
      });
      throw error;
    }
  }
}

export default CSVService;
