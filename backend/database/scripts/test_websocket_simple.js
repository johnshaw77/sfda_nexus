/**
 * 簡化的 WebSocket 工具調用測試
 * 快速驗證實時聊天中的 MCP 工具調用是否正常工作
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

console.log("🔧 簡化 WebSocket 工具調用測試");
console.log("=".repeat(40));

/**
 * 簡化測試
 */
async function simpleTest() {
  try {
    // 1. 登入
    console.log("\n1️⃣ 登入...");
    const loginResponse = await axios.post(`${BACKEND_URL}/api/auth/login`, {
      identifier: "admin",
      password: "admin123",
    });

    const authToken = loginResponse.data.data.access_token;
    console.log("   ✅ 登入成功");

    // 2. 獲取模型
    console.log("\n2️⃣ 獲取模型...");
    const modelsResponse = await axios.get(`${BACKEND_URL}/api/models`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const localModel = modelsResponse.data.data.find(
      (model) => model.provider === "ollama" && model.model_id.includes("qwen")
    );

    if (!localModel) {
      console.log("   ❌ 未找到 qwen 模型");
      return;
    }

    console.log(`   ✅ 使用模型: ${localModel.display_name}`);

    // 3. 創建對話
    console.log("\n3️⃣ 創建對話...");
    const createConvResponse = await axios.post(
      `${BACKEND_URL}/api/chat/conversations`,
      {
        title: "工具調用測試",
        agent_id: 1,
        model_id: localModel.id,
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    const conversationId = createConvResponse.data.data.id;
    console.log(`   ✅ 對話 ID: ${conversationId}`);

    // 4. WebSocket 測試
    console.log("\n4️⃣ WebSocket 測試...");

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(WS_URL);
      let testComplete = false;

      const timeout = setTimeout(() => {
        if (!testComplete) {
          console.log("   ⏰ 測試超時");
          ws.close();
          resolve();
        }
      }, 60000); // 1分鐘超時

      ws.on("open", () => {
        console.log("   🔗 WebSocket 連接成功");

        // 認證
        ws.send(
          JSON.stringify({
            type: "auth",
            data: { token: authToken },
          })
        );
      });

      ws.on("message", (data) => {
        try {
          const message = JSON.parse(data.toString());

          switch (message.type) {
            case "auth_success":
              console.log("   🔐 認證成功");

              // 加入房間
              ws.send(
                JSON.stringify({
                  type: "join_room",
                  data: { roomId: `conversation_${conversationId}` },
                })
              );
              break;

            case "room_joined":
              console.log("   🏠 加入房間成功");

              // 發送測試消息
              console.log(
                '   📤 發送測試消息: "請查詢工號 A123456 的員工信息"'
              );
              ws.send(
                JSON.stringify({
                  type: "realtime_chat",
                  data: {
                    conversationId: conversationId,
                    content: "請查詢工號 A123456 的員工信息",
                    contentType: "text",
                  },
                })
              );
              break;

            case "message_sent":
              console.log("   ✅ 消息發送確認");
              break;

            case "ai_typing":
              if (message.data.isTyping) {
                console.log("   🤖 AI 思考中...");
              }
              break;

            case "ai_response":
              const { message: aiMessage, toolInfo } = message.data;
              console.log("   📨 收到 AI 回應");

              // 檢查工具調用
              if (toolInfo && toolInfo.hasToolCalls) {
                console.log("   🎯 ✅ 檢測到工具調用！");
                console.log(`   🔧 工具調用數量: ${toolInfo.toolCallsCount}`);
                console.log(`   📊 工具結果數量: ${toolInfo.toolResultsCount}`);
                console.log(
                  `   🔄 使用二次 AI: ${toolInfo.usedSecondaryAI ? "是" : "否"}`
                );

                // 檢查是否包含員工信息
                const hasEmployeeInfo =
                  aiMessage.content.includes("白勝宇") ||
                  aiMessage.content.includes("A123456") ||
                  aiMessage.content.includes("資訊技術部");

                if (hasEmployeeInfo) {
                  console.log("   📄 ✅ 檢測到員工信息！");
                  console.log("   🎉 工具調用測試成功！");
                } else {
                  console.log("   ⚠️ 未檢測到明顯的員工信息");
                }
              } else {
                console.log("   ❌ 未檢測到工具調用");
              }

              console.log("   📝 回應內容:");
              console.log("   " + aiMessage.content.substring(0, 200) + "...");

              // 測試完成
              testComplete = true;
              clearTimeout(timeout);
              ws.close();
              resolve();
              break;

            case "error":
              console.log(`   ❌ 錯誤: ${message.data.message}`);
              break;
          }
        } catch (error) {
          console.error("   ❌ 解析消息失敗:", error.message);
        }
      });

      ws.on("error", (error) => {
        console.error("   ❌ WebSocket 錯誤:", error.message);
        clearTimeout(timeout);
        reject(error);
      });

      ws.on("close", () => {
        console.log("   🔌 WebSocket 連接關閉");
        if (!testComplete) {
          clearTimeout(timeout);
          resolve();
        }
      });
    });
  } catch (error) {
    console.error("❌ 測試失敗:", error.message);
    if (error.response) {
      console.error("   狀態:", error.response.status);
      console.error("   數據:", error.response.data);
    }
  }
}

// 執行測試
simpleTest()
  .then(() => {
    console.log("\n✅ 測試完成");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ 測試失敗:", error.message);
    process.exit(1);
  });
