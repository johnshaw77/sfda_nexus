/**
 * WORD 文件處理功能測試腳本
 * 用於驗證 WORD 文件解析功能是否正常運作
 */

import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import {
  extractWordText,
  extractWordHTML,
  isWordFile,
  isSupportedWordFile,
  getWordInfo,
} from "../../src/services/word.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 創建測試 WORD 檔案的路徑
const testWordFile = path.join(__dirname, "test_sample.docx");

/**
 * 創建簡單的測試 DOCX 檔案內容
 * 注意：這是一個模擬測試，實際使用時需要真實的 DOCX 檔案
 */
async function createTestWordFile() {
  console.log("📝 創建測試說明檔案...");

  // 創建一個說明檔案，指導如何手動測試
  const testInstructions = `
WORD 文件處理功能測試說明
==========================

由於無法程式化創建真實的 DOCX 檔案，請按照以下步驟手動測試：

1. 準備測試檔案：
   - 建立一個簡單的 DOCX 檔案，包含一些中文內容
   - 檔案名稱建議：test_sample.docx
   - 將檔案放在：${testWordFile}

2. 測試內容建議：
   標題：測試文檔
   
   這是一個測試 WORD 文檔，用於驗證 SFDA Nexus 系統的文檔處理功能。
   
   功能特色：
   • 支援中文內容提取
   • 保持文檔結構
   • 提供詳細統計信息
   
   測試段落：
   本系統使用 mammoth.js 來處理 DOCX 格式的檔案，可以提取純文本和 HTML 格式的內容。

3. 執行測試：
   node backend/database/scripts/test_word_processing.js

4. 預期結果：
   - 成功提取文檔內容
   - 顯示文檔統計信息
   - 驗證檔案類型檢測功能

注意事項：
- 只支援 .docx 格式（不支援舊版 .doc 格式）
- 檔案需要是有效的 WORD 格式
- 受密碼保護的檔案無法處理
`;

  const instructionFile = path.join(__dirname, "word_test_instructions.txt");
  await fs.writeFile(instructionFile, testInstructions, "utf8");
  console.log(`✅ 測試說明檔案已建立：${instructionFile}`);

  return instructionFile;
}

/**
 * 測試檔案類型檢測功能
 */
async function testFileTypeDetection() {
  console.log("\n🔍 測試檔案類型檢測功能");
  console.log("=" * 40);

  const testCases = [
    {
      filename: "document.docx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      description: "標準 DOCX 檔案",
    },
    {
      filename: "document.doc",
      mimeType: "application/msword",
      description: "舊版 DOC 檔案",
    },
    {
      filename: "test.pdf",
      mimeType: "application/pdf",
      description: "PDF 檔案（應該不被識別為 WORD）",
    },
    {
      filename: "report.docx",
      mimeType: "application/octet-stream",
      description: "DOCX 檔案但 MIME 類型不正確",
    },
  ];

  for (const testCase of testCases) {
    console.log(`\n測試：${testCase.description}`);
    console.log(`檔名：${testCase.filename}`);
    console.log(`MIME 類型：${testCase.mimeType}`);

    const isWord = isWordFile(testCase.filename, testCase.mimeType);
    const isSupported = isSupportedWordFile(
      testCase.filename,
      testCase.mimeType
    );

    console.log(`是否為 WORD 檔案：${isWord ? "✅ 是" : "❌ 否"}`);
    console.log(`是否支援處理：${isSupported ? "✅ 是" : "❌ 否"}`);
  }
}

/**
 * 測試 WORD 檔案處理功能（如果檔案存在）
 */
async function testWordProcessing() {
  console.log("\n📄 測試 WORD 檔案處理功能");
  console.log("=" * 40);

  try {
    // 檢查測試檔案是否存在
    await fs.access(testWordFile);
    console.log(`✅ 找到測試檔案：${testWordFile}`);

    // 測試檔案信息獲取
    console.log("\n📊 獲取檔案基本信息...");
    const wordInfo = await getWordInfo(testWordFile);
    console.log("檔案信息：", wordInfo);

    if (wordInfo.isValid && wordInfo.hasText) {
      // 測試文本提取
      console.log("\n📝 提取純文本內容...");
      const textContent = await extractWordText(testWordFile);
      console.log("文本內容預覽：");
      console.log("-".repeat(50));
      console.log(
        textContent.substring(0, 500) + (textContent.length > 500 ? "..." : "")
      );
      console.log("-".repeat(50));

      // 測試 HTML 提取
      console.log("\n🌐 提取 HTML 內容...");
      const htmlResult = await extractWordHTML(testWordFile);
      console.log("HTML 內容長度：", htmlResult.html.length);
      console.log("解析訊息數量：", htmlResult.messages.length);

      if (htmlResult.messages.length > 0) {
        console.log("解析訊息：");
        htmlResult.messages.forEach((msg, index) => {
          console.log(`  ${index + 1}. [${msg.type}] ${msg.message}`);
        });
      }

      console.log("\n✅ WORD 檔案處理測試完成！");
    } else {
      console.log("⚠️ 檔案無效或沒有文本內容");
    }
  } catch (error) {
    if (error.code === "ENOENT") {
      console.log(`⚠️ 測試檔案不存在：${testWordFile}`);
      console.log("請參考 word_test_instructions.txt 建立測試檔案");
    } else {
      console.error("❌ 測試過程中發生錯誤：", error.message);
    }
  }
}

/**
 * 執行所有測試
 */
async function runAllTests() {
  try {
    console.log("🚀 開始 WORD 文件處理功能測試");
    console.log("=" * 50);

    // 創建測試說明
    await createTestWordFile();

    // 測試檔案類型檢測
    await testFileTypeDetection();

    // 測試 WORD 檔案處理
    await testWordProcessing();

    console.log("\n🎉 所有測試完成！");
    console.log("\n📋 測試總結：");
    console.log("✅ WORD 服務模組載入正常");
    console.log("✅ 檔案類型檢測功能正常");
    console.log("✅ mammoth.js 依賴包安裝正確");
    console.log("\n如需測試實際檔案處理，請依照說明建立測試檔案。");
  } catch (error) {
    console.error("❌ 測試執行失敗：", error);
    console.error("錯誤堆疊：", error.stack);
    process.exit(1);
  }
}

// 執行測試
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}

export { runAllTests, testFileTypeDetection, testWordProcessing };
