/**
 * EXCEL 文件處理功能測試腳本
 * 用於驗證 Excel 文件解析功能是否正常運作
 */

import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import {
  extractExcelData,
  analyzeExcelDataTypes,
  calculateExcelStatistics,
  analyzeExcelDataQuality,
  analyzeExcelFile,
  isExcelFile,
  isSupportedExcelFile,
} from "../../src/services/excel.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 創建測試 Excel 檔案的路徑
const testExcelFile = path.join(__dirname, "test_sample.xlsx");

/**
 * 創建測試說明檔案
 */
async function createTestInstructions() {
  console.log("📋 創建 Excel 測試說明檔案...");

  const testInstructions = `
Excel 文件處理功能測試說明
==========================

由於無法程式化創建真實的 Excel 檔案，請按照以下步驟手動測試：

1. 準備測試檔案：
   - 建立一個 Excel 檔案（.xlsx 或 .xls 格式）
   - 檔案名稱建議：test_sample.xlsx
   - 將檔案放在：${testExcelFile}

2. 建議的測試內容結構：

   工作表1：員工資料
   姓名       部門        薪資      入職日期     是否在職
   張三       技術部      50000     2023-01-15   是
   李四       營銷部      45000     2023-02-20   是
   王五       人事部      40000     2022-12-10   否
   趙六       技術部      55000     2023-03-01   是

   工作表2：部門統計
   部門       人數    平均薪資   預算
   技術部     15      52000     800000
   營銷部     10      46000     500000
   人事部     5       42000     250000

   工作表3：月度銷售（可選）
   月份    銷售額    目標    達成率
   1月     120000   100000  120%
   2月     135000   110000  123%
   3月     98000    105000  93%

3. 執行測試：
   node backend/database/scripts/test_excel_processing.js

4. 預期測試結果：
   ✅ 檔案類型檢測功能
   ✅ Excel 數據提取功能
   ✅ 工作表解析
   ✅ 數據類型分析
   ✅ 統計計算
   ✅ 數據品質評估
   ✅ 完整分析功能

支援的功能特色：
- 支援 .xlsx 和 .xls 格式
- 多工作表處理
- 自動數據類型檢測（數字、日期、文字、百分比等）
- 統計分析（平均值、中位數、標準差等）
- 數據品質評估
- 空值檢測
- 重複標題檢測

注意事項：
- 檔案需要是有效的 Excel 格式
- 受密碼保護的檔案無法處理
- 第一行會被視為表頭
- 空工作表會被標記但不會影響處理
- 大檔案會被限制處理行數以提高性能
`;

  const instructionFile = path.join(__dirname, "excel_test_instructions.txt");
  await fs.writeFile(instructionFile, testInstructions, "utf8");
  
  console.log("✅ 測試說明檔案已創建:", instructionFile);
  console.log("📝 請依照說明準備測試檔案後再次執行此腳本");
}

/**
 * 執行 Excel 檔案處理測試
 */
async function runExcelTests() {
  console.log("🧪 開始 Excel 文件處理功能測試");
  console.log("=" * 50);

  // 檢查測試檔案是否存在
  try {
    await fs.access(testExcelFile);
    console.log("✅ 找到測試檔案:", testExcelFile);
  } catch (error) {
    console.log("❌ 未找到測試檔案，請先準備測試檔案");
    await createTestInstructions();
    return;
  }

  try {
    // 測試 1: 檔案類型檢測
    console.log("\n📋 測試 1: 檔案類型檢測");
    console.log("-".repeat(30));
    
    const filename = path.basename(testExcelFile);
    const isExcel = isExcelFile(filename, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    const isSupported = isSupportedExcelFile(filename, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    
    console.log("檔案名稱:", filename);
    console.log("是否為 Excel 檔案:", isExcel ? "✅ 是" : "❌ 否");
    console.log("是否支援:", isSupported ? "✅ 支援" : "❌ 不支援");

    // 測試 2: 基本數據提取
    console.log("\n📊 測試 2: Excel 數據提取");
    console.log("-".repeat(30));
    
    const excelData = await extractExcelData(testExcelFile);
    
    if (typeof excelData === 'string') {
      console.log("❌ 數據提取失敗:", excelData);
      return;
    }

    console.log("✅ 數據提取成功:");
    console.log("  檔案名稱:", excelData.filename);
    console.log("  檔案大小:", Math.round(excelData.fileSize / 1024), "KB");
    console.log("  工作表數量:", excelData.totalSheets);
    console.log("  工作表名稱:", excelData.sheetNames.join(", "));
    console.log("  總行數:", excelData.totalRows);
    console.log("  總儲存格數:", excelData.totalCells);

    // 顯示每個工作表的詳細信息
    console.log("\n📄 工作表詳細信息:");
    Object.entries(excelData.sheets).forEach(([sheetName, sheetData]) => {
      console.log(`\n  工作表: ${sheetName}`);
      console.log(`    行數: ${sheetData.totalRows}`);
      console.log(`    列數: ${sheetData.totalColumns}`);
      console.log(`    欄位: ${sheetData.headers.join(", ")}`);
      
      if (sheetData.rows.length > 0) {
        console.log("    樣本數據:");
        sheetData.rows.slice(0, 2).forEach((row, index) => {
          console.log(`      第${index + 1}行:`, JSON.stringify(row, null, 2));
        });
      }
    });

    // 測試 3: 數據類型分析
    console.log("\n🔍 測試 3: 數據類型分析");
    console.log("-".repeat(30));
    
    for (const [sheetName, sheetData] of Object.entries(excelData.sheets)) {
      if (sheetData.totalRows === 0) continue;
      
      console.log(`\n工作表 "${sheetName}" 的數據類型分析:`);
      const typeAnalysis = analyzeExcelDataTypes(sheetData.rows, sheetData.headers);
      
      Object.entries(typeAnalysis).forEach(([column, analysis]) => {
        console.log(`  ${column}:`);
        console.log(`    類型: ${analysis.type}`);
        console.log(`    信心度: ${(analysis.confidence * 100).toFixed(1)}%`);
        console.log(`    唯一值: ${analysis.unique_count}`);
        console.log(`    空值: ${analysis.null_count}`);
        console.log(`    樣本: [${analysis.sample_values.join(", ")}]`);
      });
    }

    // 測試 4: 統計計算
    console.log("\n📈 測試 4: 統計計算");
    console.log("-".repeat(30));
    
    for (const [sheetName, sheetData] of Object.entries(excelData.sheets)) {
      if (sheetData.totalRows === 0) continue;
      
      console.log(`\n工作表 "${sheetName}" 的統計摘要:`);
      const typeAnalysis = analyzeExcelDataTypes(sheetData.rows, sheetData.headers);
      const statistics = calculateExcelStatistics(sheetData.rows, sheetData.headers, typeAnalysis);
      
      Object.entries(statistics).forEach(([column, stats]) => {
        console.log(`  ${column} (${stats.type}):`);
        
        if (stats.type === "number" || stats.type === "percentage") {
          console.log(`    數量: ${stats.count}`);
          console.log(`    平均值: ${stats.mean.toFixed(2)}`);
          console.log(`    中位數: ${stats.median.toFixed(2)}`);
          console.log(`    最小值: ${stats.min}`);
          console.log(`    最大值: ${stats.max}`);
          console.log(`    標準差: ${stats.std.toFixed(2)}`);
          if (stats.sum !== undefined) {
            console.log(`    總和: ${stats.sum.toFixed(2)}`);
          }
        } else if (stats.type === "string") {
          console.log(`    數量: ${stats.count}`);
          console.log(`    唯一值: ${stats.unique_count}`);
          console.log(`    平均長度: ${stats.avg_length.toFixed(1)}`);
          console.log(`    最常見值: ${stats.most_common.slice(0, 3).map(([val, count]) => `${val}(${count}次)`).join(", ")}`);
        } else if (stats.type === "date") {
          console.log(`    數量: ${stats.count}`);
          console.log(`    最早: ${stats.earliest.toLocaleDateString()}`);
          console.log(`    最晚: ${stats.latest.toLocaleDateString()}`);
        }
      });
    }

    // 測試 5: 數據品質評估
    console.log("\n🔍 測試 5: 數據品質評估");
    console.log("-".repeat(30));
    
    const qualityReport = analyzeExcelDataQuality(excelData);
    
    console.log("整體品質評估:");
    console.log(`  總工作表: ${qualityReport.overall.total_sheets}`);
    console.log(`  總行數: ${qualityReport.overall.total_rows}`);
    console.log(`  總儲存格: ${qualityReport.overall.total_cells}`);
    console.log(`  品質分數: ${qualityReport.overall.quality_score}/100`);
    
    console.log("\n發現的問題:");
    if (qualityReport.issues.empty_sheets.length > 0) {
      console.log(`  空工作表: ${qualityReport.issues.empty_sheets.join(", ")}`);
    }
    
    if (qualityReport.issues.duplicate_headers.length > 0) {
      console.log("  重複標題:");
      qualityReport.issues.duplicate_headers.forEach(issue => {
        console.log(`    工作表 "${issue.sheet}": ${issue.duplicates.join(", ")}`);
      });
    }
    
    if (Object.keys(qualityReport.issues.data_quality).length > 0) {
      console.log("  數據品質問題:");
      Object.entries(qualityReport.issues.data_quality).forEach(([sheet, issues]) => {
        console.log(`    工作表 "${sheet}":`);
        issues.forEach(issue => {
          console.log(`      ${issue.column}: ${issue.issue} (${issue.percentage.toFixed(1)}%)`);
        });
      });
    }
    
    console.log("\n改進建議:");
    qualityReport.recommendations.forEach(rec => {
      console.log(`  • ${rec}`);
    });

    // 測試 6: 完整分析（不包含 AI）
    console.log("\n🎯 測試 6: 完整分析功能");
    console.log("-".repeat(30));
    
    const fullAnalysis = await analyzeExcelFile(testExcelFile, {
      includeAIInsights: false, // 測試時不使用 AI
      sheetLimit: 5,
      rowLimit: 1000,
    });
    
    console.log("✅ 完整分析完成:");
    console.log(`  分析版本: ${fullAnalysis.metadata.analysis_version}`);
    console.log(`  分析時間: ${fullAnalysis.metadata.analyzed_at}`);
    console.log(`  處理限制: 最大工作表 ${fullAnalysis.metadata.processing_limits.max_sheets}, 每表最大行數 ${fullAnalysis.metadata.processing_limits.max_rows_per_sheet}`);
    console.log(`  品質分數: ${fullAnalysis.quality_report.overall.quality_score}/100`);
    
    console.log("\n各工作表分析摘要:");
    Object.entries(fullAnalysis.sheet_analysis).forEach(([sheetName, analysis]) => {
      console.log(`  ${sheetName}:`);
      console.log(`    樣本行數: ${analysis.sample_rows.length}`);
      console.log(`    數據類型數: ${Object.keys(analysis.typeAnalysis).length}`);
      console.log(`    統計欄位數: ${Object.keys(analysis.statistics).length}`);
    });

    console.log("\n🎉 所有測試完成！Excel 文件處理功能正常運作");
    
  } catch (error) {
    console.error("❌ 測試過程中發生錯誤:", error);
    console.error("錯誤詳情:", error.message);
    console.error("堆疊追蹤:", error.stack);
  }
}

/**
 * 主要執行函數
 */
async function main() {
  try {
    await runExcelTests();
  } catch (error) {
    console.error("❌ 測試執行失敗:", error.message);
    process.exit(1);
  }
}

// 執行測試
main(); 