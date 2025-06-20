/**
 * Excel 聊天整合測試腳本
 * 驗證聊天控制器是否能正確處理 Excel 檔案
 */

import { extractExcelData } from "../../src/services/excel.service.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 模擬聊天控制器中的 Excel 處理邏輯
 */
async function simulateExcelProcessing(filePath) {
  console.log("🧪 模擬聊天控制器中的 Excel 處理...");
  
  try {
    // 檢測 Excel 檔案類型
    const filename = path.basename(filePath);
    const isExcelFile = 
      filename.toLowerCase().endsWith(".xls") ||
      filename.toLowerCase().endsWith(".xlsx");
    
    if (!isExcelFile) {
      throw new Error("不是 Excel 檔案");
    }
    
    console.log("✅ Excel 檔案類型檢測通過");
    
    // 使用 extractExcelData 解析
    console.log("📊 開始解析 Excel 數據...");
    const excelData = await extractExcelData(filePath);
    
    if (typeof excelData === 'string') {
      console.log("❌ Excel 解析失敗:", excelData);
      return false;
    }
    
    // 格式化為聊天可用的文本格式（模擬聊天控制器的邏輯）
    let formattedContent = `Excel 檔案資訊：
檔案名稱：${excelData.filename}
檔案大小：${Math.round(excelData.fileSize / 1024)} KB
工作表數量：${excelData.totalSheets}
工作表名稱：${excelData.sheetNames.join(", ")}
總行數：${excelData.totalRows}
總儲存格數：${excelData.totalCells}

`;

    // 為每個工作表添加詳細數據
    Object.entries(excelData.sheets).forEach(([sheetName, sheetData]) => {
      formattedContent += `\n=== 工作表：${sheetName} ===\n`;
      formattedContent += `行數：${sheetData.totalRows}，列數：${sheetData.totalColumns}\n`;
      
      if (sheetData.headers && sheetData.headers.length > 0) {
        formattedContent += `列標題：${sheetData.headers.join(", ")}\n`;
        
        // 添加前幾行數據作為樣本
        if (sheetData.rows && sheetData.rows.length > 0) {
          formattedContent += `\n數據樣本（前5行）：\n`;
          const sampleRows = sheetData.rows.slice(0, 5);
          sampleRows.forEach((row, index) => {
            const rowData = sheetData.headers.map(header => row[header] || "").join(" | ");
            formattedContent += `第${index + 1}行：${rowData}\n`;
          });
        }
      } else {
        formattedContent += `此工作表沒有數據\n`;
      }
    });

    console.log("✅ Excel 數據格式化完成");
    console.log("📝 格式化結果預覽:");
    console.log(formattedContent.substring(0, 500) + "...");
    
    return {
      success: true,
      formattedContent,
      originalData: excelData
    };
    
  } catch (error) {
    console.error("❌ Excel 處理失敗:", error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 執行測試
 */
async function runTest() {
  console.log("🚀 開始 Excel 聊天整合測試");
  console.log("=" * 50);
  
  // 測試檔案路徑
  const testFile = path.join(__dirname, "test_sample.xlsx");
  
  console.log("測試檔案:", testFile);
  
  const result = await simulateExcelProcessing(testFile);
  
  if (result.success) {
    console.log("\n🎉 測試成功！");
    console.log("✅ Excel 檔案可以被聊天控制器正確處理");
    console.log("✅ 數據已格式化為 AI 可理解的文本格式");
    console.log("✅ 包含工作表結構和數據樣本");
    
    if (result.originalData) {
      console.log("\n📊 處理統計:");
      console.log(`- 工作表數量: ${result.originalData.totalSheets}`);
      console.log(`- 總數據行數: ${result.originalData.totalRows}`);
      console.log(`- 總儲存格數: ${result.originalData.totalCells}`);
    }
  } else {
    console.log("\n❌ 測試失敗!");
    console.log("錯誤:", result.error);
    
    if (result.error.includes("找不到指定的 Excel 檔案")) {
      console.log("\n💡 解決方案:");
      console.log("請在以下位置創建一個測試 Excel 檔案:");
      console.log(testFile);
      console.log("\n建議內容:");
      console.log("- 工作表1: 包含一些測試數據（如員工資料）");
      console.log("- 第一行為標題行");
      console.log("- 包含不同數據類型（文字、數字、日期）");
    }
  }
}

// 執行測試
runTest().catch(console.error); 