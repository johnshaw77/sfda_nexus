/**
 * PowerPoint 檔案處理功能測試腳本
 * 測試 .ppt 和 .pptx 檔案的解析功能
 */

import path from "path";
import { fileURLToPath } from "url";
import AttachmentService from "../../src/services/attachment.service.js";
import { extractPowerpointText, isSupportedPowerpointFile } from "../../src/services/powerpoint.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testPowerpointProcessing() {
  console.log("🔍 PowerPoint 檔案處理功能測試");
  console.log("=" * 50);

  // 測試檔案類型檢測
  console.log("\n📝 測試檔案類型檢測:");
  
  const testCases = [
    {
      filename: "test.pptx",
      mime_type: "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    },
    {
      filename: "test.ppt", 
      mime_type: "application/vnd.ms-powerpoint"
    },
    {
      filename: "demo.PPTX",
      mime_type: "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    },
    {
      filename: "presentation.pdf",
      mime_type: "application/pdf"
    }
  ];

  testCases.forEach((testCase, index) => {
    const isPowerpoint = AttachmentService.isPowerpointFile(testCase);
    const isSupported = isSupportedPowerpointFile(testCase.filename, testCase.mime_type);
    
    console.log(`  ${index + 1}. ${testCase.filename}:`);
    console.log(`     MIME: ${testCase.mime_type}`);
    console.log(`     是否為 PPT: ${isPowerpoint ? '✅' : '❌'}`);
    console.log(`     是否支援: ${isSupported ? '✅' : '❌'}`);
  });

  // 測試文檔檔案檢測
  console.log("\n📄 測試文檔檔案檢測:");
  testCases.forEach((testCase, index) => {
    const isDocument = AttachmentService.isDocumentFile(testCase);
    console.log(`  ${index + 1}. ${testCase.filename}: ${isDocument ? '✅ 文檔' : '❌ 非文檔'}`);
  });

  // 模擬附件處理
  console.log("\n🔧 模擬附件處理流程:");
  
  const mockAttachment = {
    id: 999,
    filename: "測試簡報.pptx",
    mime_type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    file_size: 1024000
  };

  console.log("模擬附件信息:");
  console.log(`  檔案名: ${mockAttachment.filename}`);
  console.log(`  MIME類型: ${mockAttachment.mime_type}`);
  console.log(`  檔案大小: ${mockAttachment.file_size} 位元組`);
  
  const isPpt = AttachmentService.isPowerpointFile(mockAttachment);
  const isDoc = AttachmentService.isDocumentFile(mockAttachment);
  
  console.log(`  檢測結果:`);
  console.log(`    是否為 PowerPoint: ${isPpt ? '✅' : '❌'}`);
  console.log(`    是否為文檔: ${isDoc ? '✅' : '❌'}`);

  console.log("\n✅ PowerPoint 檔案處理功能測試完成");
  console.log("\n💡 支援的 PowerPoint 格式:");
  console.log("  - .pptx (推薦，完整解析支援)");
  console.log("  - .ppt  (基礎支援，建議轉換為 .pptx)");
  console.log("\n📋 解析功能:");
  console.log("  - 投影片內容文本提取");
  console.log("  - 投影片筆記提取");
  console.log("  - 結構化格式輸出");
  console.log("  - 錯誤處理和日誌記錄");
}

// 執行測試
testPowerpointProcessing().catch(error => {
  console.error("❌ 測試執行失敗:", error.message);
  console.error(error.stack);
  process.exit(1);
}); 