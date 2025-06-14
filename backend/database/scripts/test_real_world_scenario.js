/**
 * 真實場景測試腳本
 * 模擬用戶在前端發送消息的完整流程，專門測試工具調用問題
 */

import axios from "axios";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";

// 載入環境變數
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "../../.env") });

const BACKEND_URL = "http://localhost:3000";

console.log("🎯 真實場景工具調用測試");
console.log("=".repeat(50));

/**
 * 測試真實場景
 */
async function testRealWorldScenario() {
  try {
    // 1. 登入獲取 token
    console.log("\n1️⃣ 登入獲取認證 token...");
    const loginResponse = await axios.post(`${BACKEND_URL}/api/auth/login`, {
      identifier: "admin",
      password: "admin123",
    });

    const authToken = loginResponse.data.data.access_token;
    console.log("   ✅ 登入成功");

    // 2. 創建新對話
    console.log("\n2️⃣ 創建新對話...");
    const conversationResponse = await axios.post(
      `${BACKEND_URL}/api/chat/conversations`,
      {
        title: "測試工具調用 - 員工查詢",
        agent_id: 1, // 數位秘書
        model_id: 42, // qwen3:8b 模型
      },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const conversationId = conversationResponse.data.data.id;
    console.log(`   ✅ 對話創建成功，ID: ${conversationId}`);

    // 3. 發送包含工具調用需求的消息
    console.log("\n3️⃣ 發送員工查詢消息...");
    const testMessage = "幫我查詢員工編號 A123456 的基本資料";

    console.log(`   📝 發送消息: "${testMessage}"`);
    console.log("   🤖 使用模型: qwen3:8b (本地模型)");
    console.log("   👤 使用智能體: 數位秘書");

    const messageResponse = await axios.post(
      `${BACKEND_URL}/api/chat/conversations/${conversationId}/messages`,
      {
        content: testMessage,
        content_type: "text",
        model_id: 42, // qwen3:8b 模型 ID
      },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("   ✅ 消息發送成功");

    // 4. 分析回應
    console.log("\n4️⃣ 分析 AI 回應...");
    const responseData = messageResponse.data.data;

    console.log("   📊 回應統計:");
    console.log(`      - 用戶消息 ID: ${responseData.user_message?.id}`);
    console.log(`      - AI 消息 ID: ${responseData.assistant_message?.id}`);
    console.log(
      `      - AI 回應長度: ${responseData.assistant_message?.content?.length || 0} 字符`
    );

    // 檢查工具調用元數據
    const metadata = responseData.assistant_message?.metadata;
    console.log("\n   🔧 工具調用分析:");

    if (metadata) {
      console.log(
        `      - has_tool_calls: ${metadata.has_tool_calls || false}`
      );
      console.log(
        `      - tool_calls 數量: ${metadata.tool_calls?.length || 0}`
      );
      console.log(
        `      - tool_results 數量: ${metadata.tool_results?.length || 0}`
      );
      console.log(
        `      - used_secondary_ai: ${metadata.used_secondary_ai || false}`
      );

      if (metadata.tool_calls && metadata.tool_calls.length > 0) {
        console.log("\n   📋 工具調用詳情:");
        metadata.tool_calls.forEach((call, index) => {
          console.log(`      ${index + 1}. 工具: ${call.name}`);
          console.log(`         格式: ${call.format}`);
          console.log(`         參數: ${JSON.stringify(call.parameters)}`);
        });
      }

      if (metadata.tool_results && metadata.tool_results.length > 0) {
        console.log("\n   📊 工具執行結果:");
        metadata.tool_results.forEach((result, index) => {
          console.log(`      ${index + 1}. 成功: ${result.success}`);
          if (result.success) {
            console.log(`         工具: ${result.tool_name}`);
            console.log(`         服務: ${result.service_name}`);
            console.log(`         執行時間: ${result.execution_time}ms`);
          } else {
            console.log(`         錯誤: ${result.error}`);
          }
        });
      }

      if (metadata.original_response) {
        console.log("\n   📝 原始 AI 回應預覽:");
        console.log(`      ${metadata.original_response.substring(0, 200)}...`);
      }
    } else {
      console.log("      ❌ 沒有工具調用元數據");
    }

    // 5. 檢查最終回應內容
    console.log("\n5️⃣ 最終回應內容分析...");
    const finalContent = responseData.assistant_message?.content || "";

    console.log(`   📝 回應長度: ${finalContent.length} 字符`);
    console.log("   📄 回應內容預覽:");
    console.log(
      "   " +
        finalContent.substring(0, 500) +
        (finalContent.length > 500 ? "..." : "")
    );

    // 檢查是否包含員工信息
    const hasEmployeeInfo =
      finalContent.includes("白勝宇") ||
      finalContent.includes("A123456") ||
      finalContent.includes("數據分析部") ||
      finalContent.includes("專案工程師");

    console.log(
      `\n   🎯 員工信息檢測: ${hasEmployeeInfo ? "✅ 包含員工信息" : "❌ 未包含員工信息"}`
    );

    // 6. 總結測試結果
    console.log("\n6️⃣ 測試結果總結...");

    const hasToolCalls = metadata?.has_tool_calls || false;
    const toolCallsCount = metadata?.tool_calls?.length || 0;
    const toolResultsCount = metadata?.tool_results?.length || 0;
    const hasSuccessfulTools =
      metadata?.tool_results?.some((r) => r.success) || false;

    console.log("   📊 測試統計:");
    console.log(`      - 檢測到工具調用: ${hasToolCalls ? "✅ 是" : "❌ 否"}`);
    console.log(`      - 工具調用數量: ${toolCallsCount}`);
    console.log(`      - 工具執行數量: ${toolResultsCount}`);
    console.log(
      `      - 工具執行成功: ${hasSuccessfulTools ? "✅ 是" : "❌ 否"}`
    );
    console.log(`      - 包含員工信息: ${hasEmployeeInfo ? "✅ 是" : "❌ 否"}`);

    // 判斷測試結果
    if (hasToolCalls && hasSuccessfulTools && hasEmployeeInfo) {
      console.log("\n   🎉 ✅ 測試成功！工具調用正常工作");
    } else if (hasToolCalls && !hasSuccessfulTools) {
      console.log("\n   ⚠️ 工具調用檢測成功，但執行失敗");
    } else if (!hasToolCalls) {
      console.log("\n   ❌ 工具調用檢測失敗 - 這是主要問題！");
    } else {
      console.log("\n   ⚠️ 測試結果不明確，需要進一步調查");
    }
  } catch (error) {
    console.error("\n❌ 測試失敗:", error.message);
    if (error.response) {
      console.error("   HTTP 狀態:", error.response.status);
      console.error(
        "   錯誤回應:",
        JSON.stringify(error.response.data, null, 2)
      );
    }
    console.error("   錯誤堆疊:", error.stack);
  }
}

// 執行測試
testRealWorldScenario()
  .then(() => {
    console.log("\n✅ 測試完成");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ 測試失敗:", error.message);
    process.exit(1);
  });
