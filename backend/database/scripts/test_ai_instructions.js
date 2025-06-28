/**
 * 測試 MIL 工具的 AI 指導提示詞功能
 *
 * 測試場景：
 * 1. 查詢延遲超過10天的專案，驗證高風險指導
 * 2. 查詢特定地點的專案，驗證地點相關指導
 * 3. 查詢一般專案，驗證基礎指導
 */

import fetch from "node-fetch";

const BASE_URL = "http://localhost:3001";

// 測試用的JWT token
const TEST_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoidGVzdF91c2VyIiwiaWF0IjoxNzM0OTI3NDI5LCJleHAiOjE3MzQ5MzEwMjl9.4QGsxpQFCUOEGq7MgOPMYqz36JW5uJSTqJGqKJXk3kY";

/**
 * 測試 MCP 工具調用
 */
async function testMCPToolCall(toolName, args, description) {
  console.log(`\n🧪 測試：${description}`);
  console.log(`🔧 工具：${toolName}`);
  console.log(`📝 參數：`, JSON.stringify(args, null, 2));

  try {
    const response = await fetch(`${BASE_URL}/api/mcp/call-tool`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TEST_TOKEN}`,
      },
      body: JSON.stringify({
        name: toolName,
        arguments: args,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.success) {
      console.log("✅ 工具調用成功");

      // 檢查是否包含 aiInstructions
      if (result.content && result.content.aiInstructions) {
        console.log("\n🤖 AI 指導提示詞：");
        console.log(result.content.aiInstructions);
      } else {
        console.log("⚠️ 未找到 AI 指導提示詞");
      }

      // 顯示統計摘要
      if (result.content && result.content.statistics) {
        console.log("\n📊 統計摘要：");
        console.log(result.content.statistics.summary);
      }

      return result;
    } else {
      console.log("❌ 工具調用失敗:", result.error);
      return null;
    }
  } catch (error) {
    console.error("❌ 請求失敗:", error.message);
    return null;
  }
}

/**
 * 測試完整的 AI 對話流程（包含二次調用）
 */
async function testAIConversation(question, description) {
  console.log(`\n\n💬 測試對話：${description}`);
  console.log(`❓ 問題：${question}`);

  try {
    const response = await fetch(`${BASE_URL}/api/chat/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TEST_TOKEN}`,
      },
      body: JSON.stringify({
        message: question,
        conversation_id: "test_ai_instructions",
        model: "qwen3:32b",
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.success) {
      console.log("✅ 對話成功");
      console.log("\n📝 AI 回應：");
      console.log(result.final_response || result.response);

      // 檢查是否有工具調用
      if (result.has_tool_calls) {
        console.log("\n🔧 工具調用數量：", result.tool_calls?.length || 0);
        console.log("🤖 使用二次 AI：", result.used_secondary_ai);
      }

      return result;
    } else {
      console.log("❌ 對話失敗:", result.error);
      return null;
    }
  } catch (error) {
    console.error("❌ 對話請求失敗:", error.message);
    return null;
  }
}

/**
 * 主測試函數
 */
async function runTests() {
  console.log("🚀 開始測試 AI 指導提示詞功能\n");

  // 測試 1：高風險專案查詢（延遲 > 10 天）
  await testMCPToolCall(
    "get_mil_list",
    {
      filters: {
        delayDayMin: 10,
      },
      limit: 5,
    },
    "查詢延遲超過10天的高風險專案"
  );

  // 測試 2：特定地點查詢
  await testMCPToolCall(
    "get_mil_list",
    {
      filters: {
        location: "C#3FOQC",
      },
      limit: 5,
    },
    "查詢C#3FOQC地點的專案"
  );

  // 測試 3：一般專案查詢
  await testMCPToolCall(
    "get_mil_list",
    {
      limit: 3,
    },
    "查詢一般專案列表"
  );

  console.log("\n" + "=".repeat(60));
  console.log("測試完整的 AI 對話流程（含二次調用）");
  console.log("=".repeat(60));

  // 測試 4：完整對話流程 - 高風險專案分析
  await testAIConversation(
    "延遲超過10天的專案有哪些？請分析風險和建議",
    "高風險專案分析對話"
  );

  // 測試 5：完整對話流程 - 地點相關分析
  await testAIConversation(
    "C#3FOQC地點的專案執行情況如何？",
    "地點專案分析對話"
  );

  console.log("\n🎯 測試完成！");
  console.log("\n📋 驗證要點：");
  console.log("1. ✅ 檢查 MCP 工具是否返回 aiInstructions 欄位");
  console.log("2. ✅ 檢查 AI 指導提示詞是否根據查詢條件動態生成");
  console.log("3. ✅ 檢查二次 AI 調用是否遵循 AI 指導提示詞");
  console.log("4. ✅ 檢查 AI 回應是否聚焦於指導提示詞的要求");
}

// 執行測試
runTests().catch(console.error);
