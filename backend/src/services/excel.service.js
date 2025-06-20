/**
 * EXCEL 文件處理服務
 * 負責從 Excel 檔案（.xlsx, .xls）中提取數據和進行分析
 */

import XLSX from "xlsx";
import fs from "fs/promises";
import logger from "../utils/logger.util.js";
import { AIService } from "./ai.service.js";

/**
 * 從 Excel 檔案提取數據
 * @param {string} filePath - Excel 檔案路徑
 * @param {Object} options - 解析選項
 * @returns {Promise<Object>} 提取的數據
 */
export async function extractExcelData(filePath, options = {}) {
  try {
    console.log("🔍 開始解析 Excel 檔案:", filePath);

    // 檢查檔案是否存在
    await fs.access(filePath);

    // 獲取檔案統計信息
    const stats = await fs.stat(filePath);
    console.log("📊 Excel 檔案讀取完成，大小:", stats.size, "位元組");

    // 讀取 Excel 檔案
    const workbook = XLSX.readFile(filePath, {
      cellText: false,
      cellDates: true,
      ...options,
    });

    console.log("✅ Excel 解析成功:");
    console.log("  - 工作表數量:", workbook.SheetNames.length);
    console.log("  - 工作表名稱:", workbook.SheetNames.join(", "));

    // 提取所有工作表數據
    const sheetsData = {};
    let totalRows = 0;
    let totalCells = 0;

    workbook.SheetNames.forEach((sheetName) => {
      const worksheet = workbook.Sheets[sheetName];
      
      // 轉換為 JSON 格式
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1, // 使用數字索引作為鍵
        defval: "", // 空單元格的默認值
        blankrows: false, // 忽略空行
      });

      // 處理表頭和數據
      let headers = [];
      let rows = [];

      if (jsonData.length > 0) {
        // 第一行作為表頭
        headers = jsonData[0].map((header, index) => 
          header !== "" ? String(header) : `Column_${index + 1}`
        );

        // 其餘行作為數據
        rows = jsonData.slice(1).map(row => {
          const rowObject = {};
          headers.forEach((header, index) => {
            rowObject[header] = row[index] !== undefined ? String(row[index]) : "";
          });
          return rowObject;
        });
      }

      sheetsData[sheetName] = {
        headers,
        rows,
        totalRows: rows.length,
        totalColumns: headers.length,
        range: worksheet['!ref'] || "A1",
      };

      totalRows += rows.length;
      totalCells += headers.length * rows.length;

      console.log(`  - 工作表 "${sheetName}": ${rows.length} 行, ${headers.length} 列`);
    });

    const result = {
      filename: filePath.split('/').pop(),
      fileSize: stats.size,
      totalSheets: workbook.SheetNames.length,
      sheetNames: workbook.SheetNames,
      totalRows,
      totalCells,
      sheets: sheetsData,
      extractedAt: new Date().toISOString(),
    };

    console.log("🎯 Excel 數據提取完成，總計:", totalRows, "行數據");

    return result;
  } catch (error) {
    console.error("❌ Excel 解析失敗:", error);
    logger.error("Excel 數據提取失敗", {
      filePath,
      error: error.message,
      stack: error.stack,
    });

    // 根據錯誤類型提供友好的錯誤訊息
    if (error.code === "ENOENT") {
      return "找不到指定的 Excel 檔案。";
    } else if (error.message.includes("Unsupported file")) {
      return "此檔案不是有效的 Excel 格式或已損壞。";
    } else if (error.message.includes("password")) {
      return "此 Excel 檔案受密碼保護，無法提取內容。";
    } else {
      return `Excel 檔案處理失敗：${error.message}`;
    }
  }
}

/**
 * 分析 Excel 數據類型
 * @param {Array} rows - 數據行
 * @param {Array} headers - 標題行
 * @returns {Object} 數據類型分析結果
 */
export function analyzeExcelDataTypes(rows, headers) {
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
    const numericValues = values.filter((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && isFinite(num);
    });
    const numericRatio = numericValues.length / values.length;

    // 檢測日期類型
    const dateValues = values.filter((val) => {
      const date = new Date(val);
      return !isNaN(date.getTime()) && val.toString().length > 4;
    });
    const dateRatio = dateValues.length / values.length;

    // 檢測布林類型
    const booleanValues = values.filter((val) =>
      ["true", "false", "1", "0", "yes", "no", "是", "否"].includes(
        val.toString().toLowerCase()
      )
    );
    const booleanRatio = booleanValues.length / values.length;

    // 檢測百分比
    const percentageValues = values.filter((val) => 
      val.toString().includes("%") || (numericValues.includes(val) && parseFloat(val) <= 1)
    );
    const percentageRatio = percentageValues.length / values.length;

    let detectedType = "string";
    let confidence = 0.5;

    if (numericRatio > 0.8) {
      detectedType = "number";
      confidence = numericRatio;
    } else if (percentageRatio > 0.6) {
      detectedType = "percentage";
      confidence = percentageRatio;
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
 * 計算 Excel 統計摘要
 * @param {Array} rows - 數據行
 * @param {Array} headers - 標題行
 * @param {Object} typeAnalysis - 數據類型分析
 * @returns {Object} 統計摘要
 */
export function calculateExcelStatistics(rows, headers, typeAnalysis) {
  const statistics = {};

  headers.forEach((header) => {
    const values = rows.map((row) => row[header]).filter((val) => val !== "");
    const type = typeAnalysis[header].type;

    if (type === "number" || type === "percentage") {
      const numericValues = values
        .map((val) => {
          // 處理百分比
          if (val.toString().includes("%")) {
            return parseFloat(val.replace("%", "")) / 100;
          }
          return parseFloat(val);
        })
        .filter((val) => !isNaN(val));

      if (numericValues.length > 0) {
        const sorted = numericValues.sort((a, b) => a - b);
        const sum = numericValues.reduce((acc, val) => acc + val, 0);
        const mean = sum / numericValues.length;

        statistics[header] = {
          count: numericValues.length,
          mean: mean,
          median: calculateMedian(sorted),
          min: Math.min(...numericValues),
          max: Math.max(...numericValues),
          std: calculateStandardDeviation(numericValues, mean),
          sum: sum,
          type: type,
        };
      }
    } else if (type === "date") {
      const dateValues = values
        .map((val) => new Date(val))
        .filter((date) => !isNaN(date.getTime()));

      if (dateValues.length > 0) {
        const timestamps = dateValues.map((date) => date.getTime());
        const sortedTimestamps = timestamps.sort((a, b) => a - b);

        statistics[header] = {
          count: dateValues.length,
          earliest: new Date(Math.min(...timestamps)),
          latest: new Date(Math.max(...timestamps)),
          median: new Date(calculateMedian(sortedTimestamps)),
          type: type,
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
        avg_length: values.reduce((acc, val) => acc + val.length, 0) / values.length,
        type: type,
      };
    }
  });

  return statistics;
}

/**
 * 檢測 Excel 數據品質問題
 * @param {Object} excelData - Excel 數據
 * @returns {Object} 數據品質報告
 */
export function analyzeExcelDataQuality(excelData) {
  const qualityReport = {
    overall: {
      total_sheets: excelData.totalSheets,
      total_rows: excelData.totalRows,
      total_cells: excelData.totalCells,
      quality_score: 0,
    },
    issues: {
      empty_sheets: [],
      missing_headers: [],
      inconsistent_columns: [],
      duplicate_headers: [],
      data_quality: {},
    },
    recommendations: [],
  };

  // 檢查每個工作表
  Object.entries(excelData.sheets).forEach(([sheetName, sheetData]) => {
    // 檢查空工作表
    if (sheetData.totalRows === 0) {
      qualityReport.issues.empty_sheets.push(sheetName);
    }

    // 檢查是否有重複的表頭
    const headerCounts = {};
    sheetData.headers.forEach((header) => {
      headerCounts[header] = (headerCounts[header] || 0) + 1;
    });

    const duplicateHeaders = Object.entries(headerCounts)
      .filter(([, count]) => count > 1)
      .map(([header]) => header);

    if (duplicateHeaders.length > 0) {
      qualityReport.issues.duplicate_headers.push({
        sheet: sheetName,
        duplicates: duplicateHeaders,
      });
    }

    // 分析數據品質
    if (sheetData.totalRows > 0) {
      const typeAnalysis = analyzeExcelDataTypes(sheetData.rows, sheetData.headers);
      
      sheetData.headers.forEach((header) => {
        const analysis = typeAnalysis[header];
        const nullPercentage = (analysis.null_count / sheetData.totalRows) * 100;
        
        if (nullPercentage > 20) {
          if (!qualityReport.issues.data_quality[sheetName]) {
            qualityReport.issues.data_quality[sheetName] = [];
          }
          qualityReport.issues.data_quality[sheetName].push({
            column: header,
            issue: "high_null_rate",
            percentage: nullPercentage,
          });
        }
      });
    }
  });

  // 計算整體品質分數
  let score = 100;
  
  // 扣分項目
  score -= qualityReport.issues.empty_sheets.length * 10;
  score -= qualityReport.issues.duplicate_headers.length * 15;
  score -= Object.keys(qualityReport.issues.data_quality).length * 5;

  qualityReport.overall.quality_score = Math.max(0, score);

  // 生成建議
  if (qualityReport.issues.empty_sheets.length > 0) {
    qualityReport.recommendations.push("建議移除空的工作表以提高檔案效率");
  }
  
  if (qualityReport.issues.duplicate_headers.length > 0) {
    qualityReport.recommendations.push("建議重新命名重複的欄位標題");
  }

  if (Object.keys(qualityReport.issues.data_quality).length > 0) {
    qualityReport.recommendations.push("建議檢查並補充缺失的數據");
  }

  return qualityReport;
}

/**
 * 使用 AI 生成 Excel 洞察
 * @param {Object} excelData - Excel 數據
 * @param {string} model - AI 模型名稱
 * @returns {Promise<Object>} AI 洞察結果
 */
export async function generateExcelAIInsights(excelData, model = "qwen3:8b") {
  try {
    const qualityReport = analyzeExcelDataQuality(excelData);
    
    // 準備每個工作表的統計摘要
    const sheetSummaries = Object.entries(excelData.sheets).map(([sheetName, sheetData]) => {
      if (sheetData.totalRows === 0) {
        return `- ${sheetName}: 空工作表`;
      }

      const typeAnalysis = analyzeExcelDataTypes(sheetData.rows, sheetData.headers);
      const statistics = calculateExcelStatistics(sheetData.rows, sheetData.headers, typeAnalysis);
      
      return `- ${sheetName}: ${sheetData.totalRows} 行, ${sheetData.totalColumns} 列
  欄位: ${sheetData.headers.join(", ")}
  數據類型: ${Object.entries(typeAnalysis).map(([field, info]) => 
    `${field}(${info.type})`).join(", ")}`;
    }).join("\n");

    // 構建 AI 分析提示
    const prompt = `作為一名專業的數據分析師，請分析以下 Excel 檔案並提供深入的洞察：

## 檔案概覽
- 檔案名稱：${excelData.filename}
- 檔案大小：${Math.round(excelData.fileSize / 1024)} KB
- 工作表數量：${excelData.totalSheets}
- 總行數：${excelData.totalRows}
- 總儲存格數：${excelData.totalCells}

## 工作表結構
${sheetSummaries}

## 數據品質評估
- 品質分數：${qualityReport.overall.quality_score}/100
- 空工作表：${qualityReport.issues.empty_sheets.length} 個
- 重複標題問題：${qualityReport.issues.duplicate_headers.length} 個
- 數據品質問題：${Object.keys(qualityReport.issues.data_quality).length} 個工作表

## 建議改進
${qualityReport.recommendations.map(rec => `- ${rec}`).join("\n")}

請提供以下分析：
1. 數據結構和完整性評估
2. 潛在的數據品質問題
3. 數據關係和模式識別
4. 業務洞察和建議
5. 進一步分析的方向

請以專業、實用的角度提供分析，重點關注數據的價值和潛在用途。`;

    console.log("🤖 開始 AI 分析 Excel 數據...");

    const insights = await AIService.generateResponse(prompt, {
      model: model,
      temperature: 0.3,
      max_tokens: 2000,
    });

    console.log("✅ Excel AI 洞察生成完成");

    return {
      insights: insights,
      model_used: model,
      analysis_timestamp: new Date().toISOString(),
      quality_score: qualityReport.overall.quality_score,
      recommendations: qualityReport.recommendations,
    };
  } catch (error) {
    logger.error("Excel AI 洞察生成失敗", { error: error.message });
    throw error;
  }
}

/**
 * 完整的 Excel 分析
 * @param {string} filePath - Excel 檔案路徑
 * @param {Object} options - 分析選項
 * @returns {Promise<Object>} 完整分析結果
 */
export async function analyzeExcelFile(filePath, options = {}) {
  const {
    includeAIInsights = true,
    model = "qwen3:8b",
    sheetLimit = 10, // 限制處理的工作表數量
    rowLimit = 5000, // 限制每個工作表的行數
  } = options;

  try {
    console.log("📊 開始完整 Excel 分析:", filePath);

    // 提取 Excel 數據
    const excelData = await extractExcelData(filePath);

    // 限制數據量以提高性能
    Object.keys(excelData.sheets).forEach((sheetName) => {
      const sheet = excelData.sheets[sheetName];
      if (sheet.rows.length > rowLimit) {
        console.log(`工作表 "${sheetName}" 行數過多 (${sheet.rows.length})，將取樣前 ${rowLimit} 行`);
        sheet.rows = sheet.rows.slice(0, rowLimit);
        sheet.totalRows = sheet.rows.length;
      }
    });

    // 如果工作表太多，只取前幾個
    if (excelData.totalSheets > sheetLimit) {
      const limitedSheets = {};
      const sheetNames = Object.keys(excelData.sheets).slice(0, sheetLimit);
      sheetNames.forEach((name) => {
        limitedSheets[name] = excelData.sheets[name];
      });
      excelData.sheets = limitedSheets;
      excelData.sheetNames = sheetNames;
      excelData.totalSheets = sheetNames.length;
    }

    // 分析數據品質
    const qualityReport = analyzeExcelDataQuality(excelData);

    // 為每個工作表生成統計摘要
    const sheetAnalysis = {};
    Object.entries(excelData.sheets).forEach(([sheetName, sheetData]) => {
      if (sheetData.totalRows > 0) {
        const typeAnalysis = analyzeExcelDataTypes(sheetData.rows, sheetData.headers);
        const statistics = calculateExcelStatistics(sheetData.rows, sheetData.headers, typeAnalysis);
        
        sheetAnalysis[sheetName] = {
          typeAnalysis,
          statistics,
          sample_rows: sheetData.rows.slice(0, 3),
        };
      }
    });

    const analysisResult = {
      excel_data: {
        ...excelData,
        // 為了節省空間，只保留每個工作表的前3行作為樣本
        sheets: Object.fromEntries(
          Object.entries(excelData.sheets).map(([name, sheet]) => [
            name,
            {
              ...sheet,
              rows: sheet.rows.slice(0, 3),
            },
          ])
        ),
      },
      sheet_analysis: sheetAnalysis,
      quality_report: qualityReport,
      metadata: {
        analyzed_at: new Date().toISOString(),
        analysis_version: "1.0.0",
        processing_limits: {
          max_sheets: sheetLimit,
          max_rows_per_sheet: rowLimit,
        },
      },
    };

    // 生成 AI 洞察（如果啟用）
    if (includeAIInsights) {
      const aiInsights = await generateExcelAIInsights(excelData, model);
      analysisResult.ai_insights = aiInsights;
    }

    logger.info("Excel 分析完成", {
      filename: excelData.filename,
      sheets: excelData.totalSheets,
      total_rows: excelData.totalRows,
      quality_score: qualityReport.overall.quality_score,
      ai_insights: includeAIInsights,
    });

    console.log("🎯 Excel 完整分析完成");

    return analysisResult;
  } catch (error) {
    logger.error("Excel 分析失敗", {
      filePath,
      error: error.message,
    });
    throw error;
  }
}

/**
 * 檢查檔案是否為 Excel 檔案
 * @param {string} filename - 檔案名稱
 * @param {string} mimeType - MIME 類型
 * @returns {boolean} 是否為 Excel 檔案
 */
export function isExcelFile(filename, mimeType) {
  const excelMimeTypes = [
    "application/vnd.ms-excel", // .xls
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  ];

  const excelExtensions = [".xls", ".xlsx"];

  return (
    excelMimeTypes.includes(mimeType) ||
    excelExtensions.some((ext) => filename.toLowerCase().endsWith(ext))
  );
}

/**
 * 檢查檔案是否為支援的 Excel 檔案格式
 * @param {string} filename - 檔案名稱
 * @param {string} mimeType - MIME 類型
 * @returns {boolean} 是否為支援的 Excel 檔案格式
 */
export function isSupportedExcelFile(filename, mimeType) {
  // xlsx 庫支援 .xls 和 .xlsx 格式
  return isExcelFile(filename, mimeType);
}

// 輔助函數
function calculateMedian(sortedArray) {
  const mid = Math.floor(sortedArray.length / 2);
  return sortedArray.length % 2 !== 0
    ? sortedArray[mid]
    : (sortedArray[mid - 1] + sortedArray[mid]) / 2;
}

function calculateStandardDeviation(values, mean) {
  const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

export default {
  extractExcelData,
  analyzeExcelDataTypes,
  calculateExcelStatistics,
  analyzeExcelDataQuality,
  generateExcelAIInsights,
  analyzeExcelFile,
  isExcelFile,
  isSupportedExcelFile,
}; 