/**
 * 前端實際流程測試腳本
 * 完全模擬前端實際使用的聊天流程，包括智能體判斷邏輯
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

console.log("🎯 前端實際流程測試");
console.log("=".repeat(50));

/**
 * 檢測是否是 Qwen Agent（模擬前端邏輯）
 */
const isQwenAgent = (agent) => {
  if (!agent) return false;
  return (
    agent.name === "qwen-enterprise-agent" ||
    (agent.tools &&
      agent.tools.mcp_tools &&
      Array.isArray(agent.tools.mcp_tools))
  );
};

/**
 * 測試前端實際流程
 */
async function testFrontendActualFlow() {
  try {
    // 1. 登入獲取 token
    console.log("\n1️⃣ 登入獲取認證 token...");
    const loginResponse = await axios.post(`${BACKEND_URL}/api/auth/login`, {
      identifier: "admin",
      password: "admin123",
    });

    const authToken = loginResponse.data.data.access_token;
    console.log("   ✅ 登入成功");

    // 2. 獲取智能體信息
    console.log("\n2️⃣ 獲取智能體信息...");
    const agentsResponse = await axios.get(`${BACKEND_URL}/api/chat/agents`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    const agents = agentsResponse.data.data;
    const generalAssistant = agents.find((agent) => agent.id === 1); // 通用助手

    console.log(`   📋 找到智能體: ${generalAssistant.name}`);
    console.log(
      `   🤖 是否為 Qwen Agent: ${isQwenAgent(generalAssistant) ? "是" : "否"}`
    );

    // 3. 創建新對話
    console.log("\n3️⃣ 創建新對話...");
    const conversationResponse = await axios.post(
      `${BACKEND_URL}/api/chat/conversations`,
      {
        title: "測試實際流程 - 員工查詢",
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

    // 4. 模擬前端發送消息邏輯
    console.log("\n4️⃣ 模擬前端發送消息邏輯...");
    const testMessage = "幫我查詢員工編號 A123456 的基本資料";

    console.log(`   📝 發送消息: "${testMessage}"`);
    console.log(`   🤖 使用智能體: ${generalAssistant.name}`);
    console.log(
      `   🔄 智能體類型判斷: ${isQwenAgent(generalAssistant) ? "Qwen Agent 路徑" : "普通聊天路徑"}`
    );

    let response;

    if (isQwenAgent(generalAssistant)) {
      // Qwen Agent 路徑
      console.log("   🚀 使用 Qwen Agent API...");
      response = await axios.post(
        `${BACKEND_URL}/api/qwen-agent/chat`,
        {
          message: testMessage,
          agentId: generalAssistant.id,
          conversationId: conversationId,
          context: {
            temperature: 0.7,
            max_tokens: 8192,
            system_prompt: "",
          },
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("   ✅ Qwen Agent 回應成功");

      // 分析 Qwen Agent 回應
      const responseData = response.data.data;
      console.log("\n   🔧 Qwen Agent 工具調用分析:");
      console.log(
        `      - hasToolCalls: ${responseData.hasToolCalls || false}`
      );
      console.log(
        `      - toolCalls 數量: ${responseData.toolCalls?.length || 0}`
      );
      console.log(
        `      - toolResults 數量: ${responseData.toolResults?.length || 0}`
      );
    } else {
      // 普通聊天路徑
      console.log("   🚀 使用普通聊天 API...");
      response = await axios.post(
        `${BACKEND_URL}/api/chat/conversations/${conversationId}/messages`,
        {
          content: testMessage,
          content_type: "text",
          model_id: 42, // qwen3:8b 模型 ID
          temperature: 0.7,
          max_tokens: 8192,
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("   ✅ 普通聊天回應成功");

      // 分析普通聊天回應
      const responseData = response.data.data;
      console.log("\n   🔧 普通聊天工具調用分析:");

      const metadata = responseData.assistant_message?.metadata;
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
          console.log("\n      📋 工具調用詳情:");
          metadata.tool_calls.forEach((call, index) => {
            console.log(`         ${index + 1}. 工具: ${call.name}`);
            console.log(`            格式: ${call.format}`);
            console.log(`            參數: ${JSON.stringify(call.parameters)}`);
          });
        }

        if (metadata.tool_results && metadata.tool_results.length > 0) {
          console.log("\n      📊 工具執行結果:");
          metadata.tool_results.forEach((result, index) => {
            console.log(`         ${index + 1}. 成功: ${result.success}`);
            if (result.success) {
              console.log(`            工具: ${result.tool_name}`);
              console.log(`            服務: ${result.service_name}`);
              console.log(`            執行時間: ${result.execution_time}ms`);
            } else {
              console.log(`            錯誤: ${result.error}`);
            }
          });
        }
      } else {
        console.log("      ❌ 沒有工具調用元數據");
      }
    }

    // 5. 檢查最終回應內容
    console.log("\n5️⃣ 最終回應內容分析...");

    let finalContent = "";
    let hasToolCalls = false;
    let hasSuccessfulTools = false;

    if (isQwenAgent(generalAssistant)) {
      const responseData = response.data.data;
      finalContent = responseData.response || "";
      hasToolCalls = responseData.hasToolCalls || false;
      hasSuccessfulTools =
        responseData.toolResults?.some((r) => r.success) || false;
    } else {
      const responseData = response.data.data;
      finalContent = responseData.assistant_message?.content || "";
      const metadata = responseData.assistant_message?.metadata;
      hasToolCalls = metadata?.has_tool_calls || false;
      hasSuccessfulTools =
        metadata?.tool_results?.some((r) => r.success) || false;
    }

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

    console.log("   📊 測試統計:");
    console.log(
      `      - 使用的路徑: ${isQwenAgent(generalAssistant) ? "Qwen Agent API" : "普通聊天 API"}`
    );
    console.log(`      - 檢測到工具調用: ${hasToolCalls ? "✅ 是" : "❌ 否"}`);
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
      console.log("   💡 可能的原因:");
      console.log("      1. 系統提示詞沒有包含工具信息");
      console.log("      2. AI 模型沒有生成正確的工具調用格式");
      console.log("      3. 工具調用解析器沒有正確識別");
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
testFrontendActualFlow()
  .then(() => {
    console.log("\n✅ 測試完成");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ 測試失敗:", error.message);
    process.exit(1);
  });
