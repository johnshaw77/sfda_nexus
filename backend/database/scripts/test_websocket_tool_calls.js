/**
 * 測試 WebSocket 工具調用功能
 * 驗證實時聊天中的 MCP 工具調用是否正常工作
 */

import WebSocket from "ws";
import axios from "axios";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";

// 載入環境變數
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "../../.env") });

const BACKEND_URL = "http://localhost:3000";
const WS_URL = `ws://localhost:${process.env.WS_PORT || 3001}`;

console.log("🔧 WebSocket 工具調用測試");
console.log("=".repeat(50));
console.log(`後端 URL: ${BACKEND_URL}`);
console.log(`WebSocket URL: ${WS_URL}`);
console.log("=".repeat(50));

/**
 * 測試 WebSocket 工具調用
 */
async function testWebSocketToolCalls() {
  try {
    // 1. 登入獲取 token
    console.log("\n1️⃣ 登入獲取認證 token...");
    const loginResponse = await axios.post(`${BACKEND_URL}/api/auth/login`, {
      identifier: "admin", // 後端期望 identifier 而不是 username
      password: "admin123",
    });

    if (!loginResponse.data.success) {
      throw new Error("登入失敗");
    }

    console.log("   登入回應:", JSON.stringify(loginResponse.data, null, 2));
    const authToken = loginResponse.data.data.access_token; // 修正 token 字段名
    console.log("   ✅ 登入成功，Token:", authToken ? "已獲取" : "未獲取");

    // 2. 獲取本地模型
    console.log("\n2️⃣ 獲取本地模型...");
    const modelsResponse = await axios.get(`${BACKEND_URL}/api/models`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const localModel = modelsResponse.data.data.find(
      (model) =>
        model.provider === "ollama" &&
        (model.model_id.includes("qwen") || model.model_id.includes("llama"))
    );

    if (!localModel) {
      console.log("   ❌ 未找到可用的本地模型");
      return;
    }

    console.log(
      `   ✅ 使用本地模型: ${localModel.display_name} (ID: ${localModel.id})`
    );

    // 3. 創建對話
    console.log("\n3️⃣ 創建對話...");
    const createConvResponse = await axios.post(
      `${BACKEND_URL}/api/chat/conversations`,
      {
        title: "WebSocket 工具調用測試",
        agent_id: 1, // 數位秘書
        model_id: localModel.id,
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    const conversationId = createConvResponse.data.data.id;
    console.log(`   ✅ 對話創建成功，ID: ${conversationId}`);

    // 4. 建立 WebSocket 連接
    console.log("\n4️⃣ 建立 WebSocket 連接...");

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(WS_URL);
      let isAuthenticated = false;
      let messagesSent = 0;
      const testMessages = [
        "請查詢工號 A123456 的員工信息",
        "查詢員工 A123456",
        "我想知道 A123456 這個員工的資料",
      ];

      ws.on("open", () => {
        console.log("   ✅ WebSocket 連接成功");

        // 發送認證消息
        ws.send(
          JSON.stringify({
            type: "auth",
            data: { token: authToken },
          })
        );
      });

      ws.on("message", async (data) => {
        try {
          const message = JSON.parse(data.toString());
          console.log(`📥 收到消息: ${message.type}`);

          switch (message.type) {
            case "auth_success":
              console.log("   ✅ WebSocket 認證成功");
              isAuthenticated = true;

              // 加入對話房間
              ws.send(
                JSON.stringify({
                  type: "join_room",
                  data: { roomId: `conversation_${conversationId}` },
                })
              );
              break;

            case "room_joined":
              console.log("   ✅ 成功加入對話房間");

              // 開始發送測試消息
              if (messagesSent < testMessages.length) {
                const testMessage = testMessages[messagesSent];
                console.log(
                  `\n5️⃣.${messagesSent + 1} 發送測試消息: "${testMessage}"`
                );

                ws.send(
                  JSON.stringify({
                    type: "realtime_chat",
                    data: {
                      conversationId: conversationId,
                      content: testMessage,
                      contentType: "text",
                    },
                  })
                );

                messagesSent++;
              }
              break;

            case "message_sent":
              console.log("   ✅ 用戶消息發送確認");
              break;

            case "ai_typing":
              if (message.data.isTyping) {
                console.log("   🤖 AI 正在思考...");
              } else {
                console.log("   🤖 AI 思考完成");
              }
              break;

            case "ai_response":
              const { message: aiMessage, toolInfo } = message.data;
              console.log("   ✅ 收到 AI 回應");
              console.log(`   📝 回應長度: ${aiMessage.content.length} 字符`);

              // 檢查工具調用信息
              if (toolInfo) {
                console.log("   🔧 工具調用信息:");
                console.log(
                  `      - 包含工具調用: ${toolInfo.hasToolCalls ? "是" : "否"}`
                );
                console.log(`      - 工具調用數量: ${toolInfo.toolCallsCount}`);
                console.log(
                  `      - 工具結果數量: ${toolInfo.toolResultsCount}`
                );
                console.log(
                  `      - 使用二次 AI: ${toolInfo.usedSecondaryAI ? "是" : "否"}`
                );

                if (toolInfo.hasToolCalls) {
                  console.log("   🎯 ✅ 檢測到工具調用！");

                  // 檢查是否包含員工信息
                  const hasEmployeeInfo =
                    aiMessage.content.includes("白勝宇") ||
                    aiMessage.content.includes("A123456") ||
                    aiMessage.content.includes("資訊技術部") ||
                    aiMessage.content.includes("軟體工程師");

                  if (hasEmployeeInfo) {
                    console.log("   📄 ✅ 檢測到員工信息！");
                    console.log("   📄 回應內容預覽:");
                    console.log(
                      "   " + aiMessage.content.substring(0, 300) + "..."
                    );
                  } else {
                    console.log("   ⚠️ 未檢測到明顯的員工信息");
                  }
                } else {
                  console.log("   ❌ 未檢測到工具調用");
                }
              }

              console.log("   📄 完整回應:");
              console.log("   " + aiMessage.content);

              // 繼續發送下一個測試消息
              if (messagesSent < testMessages.length) {
                setTimeout(() => {
                  const testMessage = testMessages[messagesSent];
                  console.log(
                    `\n5️⃣.${messagesSent + 1} 發送測試消息: "${testMessage}"`
                  );

                  ws.send(
                    JSON.stringify({
                      type: "realtime_chat",
                      data: {
                        conversationId: conversationId,
                        content: testMessage,
                        contentType: "text",
                      },
                    })
                  );

                  messagesSent++;
                }, 2000);
              } else {
                // 所有測試完成
                console.log("\n🎉 所有測試完成！");
                ws.close();
                resolve();
              }
              break;

            case "error":
              console.log(`   ❌ 錯誤: ${message.data.message}`);
              break;

            default:
              console.log(`   📨 其他消息: ${message.type}`);
          }
        } catch (error) {
          console.error("❌ 解析消息失敗:", error.message);
        }
      });

      ws.on("error", (error) => {
        console.error("❌ WebSocket 錯誤:", error.message);
        reject(error);
      });

      ws.on("close", (code, reason) => {
        console.log(`🔌 WebSocket 連接關閉: ${code} - ${reason}`);
        if (!isAuthenticated) {
          reject(new Error("WebSocket 認證失敗"));
        }
      });

      // 設置超時
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
        reject(new Error("測試超時"));
      }, 120000); // 2分鐘超時
    });
  } catch (error) {
    console.error("❌ 測試失敗:", error.message);
    if (error.response) {
      console.error("   回應狀態:", error.response.status);
      console.error("   回應數據:", error.response.data);
    }
  }
}

// 執行測試
testWebSocketToolCalls()
  .then(() => {
    console.log("\n✅ WebSocket 工具調用測試完成");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ 測試失敗:", error.message);
    process.exit(1);
  });
