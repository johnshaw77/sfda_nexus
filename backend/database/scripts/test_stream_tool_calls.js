/**
 * 串流模式工具調用測試腳本
 * 測試修復後的串流模式是否正確處理工具調用
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

console.log("🌊 串流模式工具調用測試");
console.log("=".repeat(50));

/**
 * 測試串流模式工具調用
 */
async function testStreamToolCalls() {
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
        title: "測試串流工具調用 - 員工查詢",
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

    // 3. 發送串流消息
    console.log("\n3️⃣ 發送串流消息...");
    const testMessage = "幫我查詢員工編號 A123456 的基本資料";

    console.log(`   📝 發送消息: "${testMessage}"`);
    console.log("   🌊 使用串流模式");

    // 使用 EventSource 來接收 SSE
    const streamUrl = `${BACKEND_URL}/api/chat/conversations/${conversationId}/messages/stream`;

    console.log("   🚀 開始串流請求...");

    // 由於 Node.js 沒有內建 EventSource，我們使用 axios 發送 POST 請求
    const streamResponse = await axios.post(
      streamUrl,
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
          Accept: "text/event-stream",
        },
        responseType: "stream",
        timeout: 60000, // 60 秒超時
      }
    );

    console.log("   ✅ 串流請求已發送");

    // 解析 SSE 數據
    let fullContent = "";
    let toolCallsDetected = false;
    let toolCallsProcessed = false;
    let streamDone = false;
    let toolInfo = null;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("串流測試超時"));
      }, 60000);

      streamResponse.data.on("data", (chunk) => {
        const lines = chunk.toString().split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              switch (data.type) {
                case "stream_content":
                  fullContent =
                    data.data.full_content || fullContent + data.data.content;
                  process.stdout.write(".");
                  break;

                case "tool_calls_processed":
                  toolCallsProcessed = true;
                  console.log("\n   🔧 檢測到工具調用處理:");
                  console.log(
                    `      - 工具調用數量: ${data.data.tool_calls?.length || 0}`
                  );
                  console.log(
                    `      - 工具結果數量: ${data.data.tool_results?.length || 0}`
                  );
                  console.log(
                    `      - 有工具調用: ${data.data.has_tool_calls ? "是" : "否"}`
                  );

                  if (data.data.tool_calls && data.data.tool_calls.length > 0) {
                    console.log("      📋 工具調用詳情:");
                    data.data.tool_calls.forEach((call, index) => {
                      console.log(`         ${index + 1}. 工具: ${call.name}`);
                      console.log(
                        `            參數: ${JSON.stringify(call.parameters)}`
                      );
                    });
                  }

                  if (
                    data.data.tool_results &&
                    data.data.tool_results.length > 0
                  ) {
                    console.log("      📊 工具執行結果:");
                    data.data.tool_results.forEach((result, index) => {
                      console.log(
                        `         ${index + 1}. 成功: ${result.success}`
                      );
                      if (result.success) {
                        console.log(`            工具: ${result.tool_name}`);
                        console.log(
                          `            執行時間: ${result.execution_time}ms`
                        );
                      }
                    });
                  }
                  break;

                case "stream_done":
                  streamDone = true;
                  toolInfo = data.data.tool_info;
                  console.log("\n   ✅ 串流完成");
                  console.log(
                    `   📝 最終內容長度: ${data.data.full_content?.length || 0} 字符`
                  );

                  if (toolInfo) {
                    console.log("   🔧 工具調用總結:");
                    console.log(
                      `      - 有工具調用: ${toolInfo.has_tool_calls ? "是" : "否"}`
                    );
                    console.log(
                      `      - 工具調用數量: ${toolInfo.tool_calls_count}`
                    );
                    console.log(
                      `      - 工具結果數量: ${toolInfo.tool_results_count}`
                    );
                    console.log(
                      `      - 使用二次 AI: ${toolInfo.used_secondary_ai ? "是" : "否"}`
                    );
                  }

                  clearTimeout(timeout);
                  resolve({
                    fullContent: data.data.full_content,
                    toolCallsProcessed,
                    toolInfo,
                  });
                  break;

                case "error":
                  console.log(`\n   ❌ 串流錯誤: ${data.data.error}`);
                  clearTimeout(timeout);
                  reject(new Error(data.data.error));
                  break;
              }
            } catch (parseError) {
              // 忽略解析錯誤，可能是不完整的數據
            }
          }
        }
      });

      streamResponse.data.on("end", () => {
        if (!streamDone) {
          clearTimeout(timeout);
          resolve({
            fullContent,
            toolCallsProcessed,
            toolInfo,
          });
        }
      });

      streamResponse.data.on("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
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
    console.log("\n🚀 開始測試串流模式工具調用...");

    const result = await testStreamToolCalls();

    console.log("\n4️⃣ 測試結果分析...");
    console.log(`   📝 最終內容長度: ${result.fullContent?.length || 0} 字符`);
    console.log(
      `   🔧 工具調用處理: ${result.toolCallsProcessed ? "✅ 是" : "❌ 否"}`
    );

    if (result.toolInfo) {
      console.log(`   📊 工具調用統計:`);
      console.log(
        `      - 檢測到工具調用: ${result.toolInfo.has_tool_calls ? "✅ 是" : "❌ 否"}`
      );
      console.log(`      - 工具調用數量: ${result.toolInfo.tool_calls_count}`);
      console.log(
        `      - 工具結果數量: ${result.toolInfo.tool_results_count}`
      );
    }

    // 檢查是否包含員工信息
    const hasEmployeeInfo =
      result.fullContent?.includes("白勝宇") ||
      result.fullContent?.includes("A123456") ||
      result.fullContent?.includes("數據分析部");

    console.log(
      `   🎯 員工信息檢測: ${hasEmployeeInfo ? "✅ 包含員工信息" : "❌ 未包含員工信息"}`
    );

    // 總結
    const success =
      result.toolCallsProcessed &&
      result.toolInfo?.has_tool_calls &&
      hasEmployeeInfo;

    console.log("\n5️⃣ 測試總結...");
    if (success) {
      console.log("   🎉 ✅ 串流模式工具調用測試成功！");
      console.log("   💡 修復已生效，串流模式現在支持工具調用");
    } else {
      console.log("   ❌ 串流模式工具調用測試失敗");
      console.log("   💡 需要進一步調試");
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
      console.log("\n✅ 測試完成");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ 測試失敗:", error.message);
      process.exit(1);
    });
}, 5000); // 等待 5 秒讓服務完全啟動
