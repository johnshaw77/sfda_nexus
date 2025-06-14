/**
 * 測試 HTTP 響應中的調試信息
 * 驗證前端能否收到完整的調試信息
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

console.log("🔍 測試 HTTP 響應中的調試信息");
console.log("=".repeat(50));

/**
 * 測試調試信息響應
 */
async function testDebugInfoResponse() {
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
        title: "測試調試信息響應 - 員工查詢",
        agent_id: 1, // 通用助手
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

    // 3. 發送消息並檢查響應中的調試信息
    console.log("\n3️⃣ 發送消息並檢查調試信息...");
    const testMessage = "幫我查詢員工編號 A123456 的基本資料";

    console.log(`   📝 發送消息: "${testMessage}"`);

    const messageResponse = await axios.post(
      `${BACKEND_URL}/api/chat/conversations/${conversationId}/messages`,
      {
        content: testMessage,
        content_type: "text",
        model_id: 42,
        temperature: 0.7,
        max_tokens: 8192,
      },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        timeout: 60000, // 60 秒超時
      }
    );

    console.log("   ✅ 消息發送成功");

    // 4. 分析響應中的調試信息
    console.log("\n4️⃣ 分析響應中的調試信息...");

    const responseData = messageResponse.data.data;
    const debugInfo = responseData.debug_info;

    console.log(`   📊 響應數據結構:`);
    console.log(`      - 用戶消息: ${responseData.user_message ? "✅" : "❌"}`);
    console.log(
      `      - AI 消息: ${responseData.assistant_message ? "✅" : "❌"}`
    );
    console.log(`      - 對話信息: ${responseData.conversation ? "✅" : "❌"}`);
    console.log(`      - 調試信息: ${debugInfo ? "✅" : "❌"}`);

    if (debugInfo) {
      console.log(`\n   🔍 調試信息詳情:`);
      console.log(`      - 會話 ID: ${debugInfo.sessionId}`);
      console.log(`      - 總處理時間: ${debugInfo.totalTime}ms`);
      console.log(`      - 調試階段數量: ${debugInfo.stages?.length || 0}`);

      if (debugInfo.stages && debugInfo.stages.length > 0) {
        console.log(`\n   📋 調試階段列表:`);
        debugInfo.stages.forEach((stage, index) => {
          console.log(
            `      ${index + 1}. ${stage.stage} - ${stage.data.message || "無描述"}`
          );

          // 顯示重要階段的詳細信息
          if (stage.stage === "system_prompt_generated") {
            console.log(
              `         - 提示詞長度: ${stage.data.promptLength || 0} 字符`
            );
            console.log(
              `         - 包含工具信息: ${stage.data.hasToolInfo ? "是" : "否"}`
            );
            console.log(
              `         - 包含員工工具: ${stage.data.hasEmployeeTools ? "是" : "否"}`
            );
          }

          if (stage.stage === "tool_processing_complete") {
            console.log(
              `         - 工具調用數量: ${stage.data.toolCallsCount || 0}`
            );
            console.log(
              `         - 工具結果數量: ${stage.data.toolResultsCount || 0}`
            );
            console.log(
              `         - 有工具調用: ${stage.data.hasToolCalls ? "是" : "否"}`
            );
          }
        });
      }
    } else {
      console.log("   ❌ 響應中沒有調試信息");
    }

    // 5. 檢查 AI 回應內容
    console.log("\n5️⃣ 檢查 AI 回應內容...");
    const assistantMessage = responseData.assistant_message;

    if (assistantMessage) {
      console.log(
        `   📝 AI 回應長度: ${assistantMessage.content?.length || 0} 字符`
      );

      // 檢查是否包含員工信息
      const hasEmployeeInfo =
        assistantMessage.content?.includes("白勝宇") ||
        assistantMessage.content?.includes("A123456") ||
        assistantMessage.content?.includes("數據分析部");

      console.log(
        `   🎯 員工信息檢測: ${hasEmployeeInfo ? "✅ 包含員工信息" : "❌ 未包含員工信息"}`
      );

      // 檢查工具調用元數據
      const metadata = assistantMessage.metadata;
      if (metadata) {
        console.log(`   🔧 工具調用元數據:`);
        console.log(
          `      - 有工具調用: ${metadata.has_tool_calls ? "是" : "否"}`
        );
        console.log(`      - 工具調用數量: ${metadata.tool_calls_count || 0}`);
        console.log(
          `      - 工具結果數量: ${metadata.tool_results_count || 0}`
        );
      }
    } else {
      console.log("   ❌ 沒有 AI 回應");
    }

    // 6. 總結測試結果
    console.log("\n6️⃣ 測試結果總結...");

    const hasDebugInfo = !!debugInfo;
    const hasStages = debugInfo?.stages?.length > 0;
    const hasToolProcessing = debugInfo?.stages?.some(
      (s) => s.stage === "tool_processing_complete"
    );
    const hasEmployeeInfo = assistantMessage?.content?.includes("白勝宇");

    console.log(`   📊 測試結果:`);
    console.log(`      - 調試信息存在: ${hasDebugInfo ? "✅" : "❌"}`);
    console.log(`      - 調試階段完整: ${hasStages ? "✅" : "❌"}`);
    console.log(`      - 工具處理記錄: ${hasToolProcessing ? "✅" : "❌"}`);
    console.log(`      - 員工信息正確: ${hasEmployeeInfo ? "✅" : "❌"}`);

    const allTestsPassed =
      hasDebugInfo && hasStages && hasToolProcessing && hasEmployeeInfo;

    if (allTestsPassed) {
      console.log("\n   🎉 ✅ 所有測試通過！調試信息響應正常");
      console.log("   💡 前端現在應該能夠接收到完整的調試信息");
    } else {
      console.log("\n   ❌ 部分測試失敗，需要進一步調試");
    }

    return {
      success: allTestsPassed,
      debugInfo,
      assistantMessage,
    };
  } catch (error) {
    console.error("\n❌ 測試失敗:", error.message);
    if (error.response) {
      console.error("   HTTP 狀態:", error.response.status);
      console.error("   錯誤回應:", error.response.data);
    }
    throw error;
  }
}

// 執行測試
async function runTest() {
  try {
    console.log("\n🚀 開始測試調試信息響應...");

    const result = await testDebugInfoResponse();

    if (result.success) {
      console.log("\n✅ 測試完成 - 調試信息響應正常");
    } else {
      console.log("\n❌ 測試完成 - 發現問題需要修復");
    }
  } catch (error) {
    console.error("\n❌ 測試執行失敗:", error.message);
    process.exit(1);
  }
}

// 等待服務啟動後執行測試
setTimeout(() => {
  runTest()
    .then(() => {
      console.log("\n🏁 測試結束");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 測試失敗:", error.message);
      process.exit(1);
    });
}, 5000); // 等待 5 秒讓服務完全啟動
