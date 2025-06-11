#!/usr/bin/env node

/**
 * 測試真實的 McpToolParser 服務
 */

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 動態導入解析器
const mcpToolParserPath = path.resolve(
  __dirname,
  "../../src/services/mcpToolParser.service.js"
);

async function testRealParser() {
  console.log("🧪 測試真實的 McpToolParser...\n");

  try {
    // 動態導入
    const { default: parser } = await import(mcpToolParserPath);

    // 測試用例
    const testResponse = `我來幫您查詢公司的部門資訊。

<tool_call>
get_department_list
{"sortBy": "code", "sortOrder": "asc"}
</tool_call>

查詢完成後，我會為您整理部門列表。`;

    console.log("📝 測試 AI 回應:");
    console.log(testResponse);
    console.log("\n" + "=".repeat(50) + "\n");

    // 測試工具調用檢測
    console.log("1️⃣ 檢測工具調用...");
    const hasTools = parser.hasToolCalls(testResponse);
    console.log(`   有工具調用: ${hasTools}`);

    if (!hasTools) {
      console.log("❌ 未檢測到工具調用");
      return;
    }

    // 測試工具調用解析
    console.log("\n2️⃣ 解析工具調用...");
    const toolCalls = await parser.parseToolCalls(testResponse, {
      user_id: 1,
      conversation_id: 123,
    });

    console.log(`   解析結果: ${toolCalls.length} 個工具調用`);

    if (toolCalls.length > 0) {
      toolCalls.forEach((call, index) => {
        console.log(`   工具 ${index + 1}:`);
        console.log(`     名稱: ${call.name}`);
        console.log(`     格式: ${call.format}`);
        console.log(`     參數: ${JSON.stringify(call.parameters)}`);
      });

      console.log("\n✅ 解析器測試成功!");
    } else {
      console.log("\n❌ 解析器測試失敗：沒有解析到工具調用");
    }
  } catch (error) {
    console.log("❌ 測試失敗:", error.message);
    console.log("   錯誤詳情:", error.stack);
  }

  console.log("\n🏁 真實解析器測試完成");
}

testRealParser();
