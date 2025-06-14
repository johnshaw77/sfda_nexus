/**
 * 工具調用解析診斷腳本
 * 專門測試 AI 回應中的工具調用解析功能
 */

import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";

// 載入環境變數
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "../../.env") });

// 動態導入服務
const { default: mcpToolParser } = await import(
  "../../src/services/mcpToolParser.service.js"
);
const { initializeDatabase } = await import(
  "../../src/config/database.config.js"
);

console.log("🔍 工具調用解析診斷");
console.log("=".repeat(50));

/**
 * 測試工具調用解析
 */
async function testToolCallParsing() {
  try {
    await initializeDatabase();

    // 從用戶截圖中提取的實際 AI 回應
    const actualAIResponse = `好的，用戶已我會幫您查詢工號 A123456的基本資料。首先，我需要確定使用哪個工具。根據提供的工具列表，HR服務下的get_employee_info是用於查詢工具基本信息的。參數方面，用戶已經提供了employeeId，也就是A123456，這符合工具要求的格式。另外，參數中的includeDetails默認為true，所以不需要特別指定，除非用戶有其他需求。這裡用戶只需要基本資料，所以可能不需要詳細信息，但工具默認包含詳細信息，可能需要確認是否需要調整。不過根據工具說明，includeDetails是可選的，默認為true，所以直接調用get_employee_info並傳入employeeId即可，不需要其他參數，因為用戶沒有提到其他篩選條件。接下來，確保參數格式正確，employeeId是A123456，符合^[A-Z]\\d{6}$的要求。然後調用工具，返回結果。如果調用成功，就將工具信息整理後告訴用戶；如果失敗，需要告知用戶無法獲取數據並建議聯繫查詢ID或聯繫管理員。

{
  "tool": "get_employee_info",
  "parameters": {
    "employeeId": "A123456"
  }
}`;

    console.log("\n1️⃣ 測試實際 AI 回應解析...");
    console.log("AI 回應長度:", actualAIResponse.length);
    console.log("AI 回應內容預覽:", actualAIResponse.substring(0, 200) + "...");

    // 測試是否檢測到工具調用
    const hasToolCalls = mcpToolParser.hasToolCalls(actualAIResponse);
    console.log("✅ 檢測到工具調用:", hasToolCalls);

    if (hasToolCalls) {
      // 解析工具調用
      const toolCalls = await mcpToolParser.parseToolCalls(actualAIResponse, {
        user_id: 1,
        conversation_id: 1,
      });

      console.log("✅ 解析到的工具調用數量:", toolCalls.length);

      if (toolCalls.length > 0) {
        console.log("\n📋 工具調用詳情:");
        toolCalls.forEach((call, index) => {
          console.log(`  ${index + 1}. 工具名稱: ${call.name}`);
          console.log(`     格式: ${call.format}`);
          console.log(`     參數:`, JSON.stringify(call.parameters, null, 6));
        });
      } else {
        console.log("❌ 沒有解析到任何工具調用");
      }
    } else {
      console.log("❌ 沒有檢測到工具調用");
    }

    console.log("\n2️⃣ 測試各種工具調用格式...");

    const testCases = [
      {
        name: "標準 JSON 格式",
        content: `{
  "tool": "get_employee_info",
  "parameters": {
    "employeeId": "A123456"
  }
}`,
      },
      {
        name: "JSON 代碼塊格式",
        content: `\`\`\`json
{
  "tool": "get_employee_info",
  "parameters": {
    "employeeId": "A123456"
  }
}
\`\`\``,
      },
      {
        name: "混合文本格式",
        content: `我需要查詢員工信息。

{
  "tool": "get_employee_info",
  "parameters": {
    "employeeId": "A123456"
  }
}

正在執行查詢...`,
      },
    ];

    for (const testCase of testCases) {
      console.log(`\n📝 測試: ${testCase.name}`);

      const detected = mcpToolParser.hasToolCalls(testCase.content);
      console.log(`   檢測結果: ${detected ? "✅ 檢測到" : "❌ 未檢測到"}`);

      if (detected) {
        const parsed = await mcpToolParser.parseToolCalls(testCase.content, {
          user_id: 1,
          conversation_id: 1,
        });
        console.log(`   解析結果: ${parsed.length} 個工具調用`);

        if (parsed.length > 0) {
          console.log(`   工具名稱: ${parsed[0].name}`);
          console.log(`   參數: ${JSON.stringify(parsed[0].parameters)}`);
        }
      }
    }

    console.log("\n3️⃣ 測試正則表達式模式...");

    // 測試每個正則表達式模式
    const patterns = mcpToolParser.toolCallPatterns;
    const testText = actualAIResponse;

    patterns.forEach((pattern, index) => {
      pattern.lastIndex = 0; // 重置正則表達式
      const matches = pattern.exec(testText);
      console.log(`   模式 ${index + 1}: ${matches ? "✅ 匹配" : "❌ 不匹配"}`);
      if (matches) {
        console.log(`     匹配內容: ${matches[0].substring(0, 100)}...`);
      }
    });
  } catch (error) {
    console.error("❌ 診斷失敗:", error.message);
    console.error("錯誤堆疊:", error.stack);
  }
}

// 執行診斷
testToolCallParsing()
  .then(() => {
    console.log("\n✅ 診斷完成");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ 診斷失敗:", error.message);
    process.exit(1);
  });
