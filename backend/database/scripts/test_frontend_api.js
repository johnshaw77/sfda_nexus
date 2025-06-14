/**
 * 測試前端 HTTP API 調用
 * 模擬前端聊天界面的實際 API 調用流程
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../../.env") });

import axios from "axios";
import { initializeDatabase } from "../../src/config/database.config.js";

const BACKEND_URL = "http://localhost:3000";

// 測試用戶憑據
const TEST_USER = {
  identifier: "admin@sfda-nexus.com",
  password: "admin123",
};

async function testFrontendAPI() {
  console.log("🧪 測試前端 HTTP API 調用流程...\n");

  let authToken = null;
  let conversationId = null;

  try {
    await initializeDatabase();

    // 1. 登錄獲取 token
    console.log("1️⃣ 嘗試登錄...");
    const loginResponse = await axios.post(
      `${BACKEND_URL}/api/auth/login`,
      TEST_USER
    );

    if (loginResponse.data.success) {
      authToken = loginResponse.data.data.access_token;
      console.log("   ✅ 登錄成功");
    } else {
      throw new Error("登錄失敗");
    }

    // 2. 創建新對話
    console.log("\n2️⃣ 創建新對話...");
    const createConvResponse = await axios.post(
      `${BACKEND_URL}/api/chat/conversations`,
      {
        title: "API 測試對話",
        agent_id: 1, // 數位秘書
        model_id: 1, // 本地模型
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    if (createConvResponse.data.success) {
      conversationId = createConvResponse.data.data.id;
      console.log(`   ✅ 對話創建成功，ID: ${conversationId}`);
    } else {
      throw new Error("創建對話失敗");
    }

    // 3. 發送測試消息
    console.log("\n3️⃣ 發送測試消息...");
    const testMessages = [
      "請查詢工號 A123456 的員工信息",
      "這個員工在哪個部門工作？",
      "他的職位是什麼？",
    ];

    for (let i = 0; i < testMessages.length; i++) {
      const testMessage = testMessages[i];
      console.log(`\n📤 發送消息 ${i + 1}: "${testMessage}"`);

      try {
        const sendMessageResponse = await axios.post(
          `${BACKEND_URL}/api/chat/conversations/${conversationId}/messages`,
          {
            content: testMessage,
            content_type: "text",
            temperature: 0.7,
            max_tokens: 4096,
            model_id: 1, // 確保使用本地模型
          },
          {
            headers: { Authorization: `Bearer ${authToken}` },
            timeout: 60000, // 60秒超時
          }
        );

        if (sendMessageResponse.data.success) {
          const { user_message, assistant_message } =
            sendMessageResponse.data.data;

          console.log("   ✅ 消息發送成功");
          console.log(`   👤 用戶消息 ID: ${user_message.id}`);

          if (assistant_message) {
            console.log(`   🤖 AI 回應 ID: ${assistant_message.id}`);
            console.log(
              `   📝 AI 回應內容: ${assistant_message.content.substring(0, 100)}...`
            );

            // 檢查是否包含工具調用結果
            if (
              assistant_message.content.includes("白勝宇") ||
              assistant_message.content.includes("資訊技術部") ||
              assistant_message.content.includes("軟體工程師")
            ) {
              console.log("   🎯 ✅ 檢測到工具調用結果！");
            } else {
              console.log("   ⚠️ 未檢測到明顯的工具調用結果");
            }
          } else {
            console.log("   ❌ 沒有收到 AI 回應");
          }
        } else {
          console.log("   ❌ 消息發送失敗:", sendMessageResponse.data.message);
        }

        // 等待一下再發送下一條消息
        if (i < testMessages.length - 1) {
          console.log("   ⏳ 等待 3 秒...");
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      } catch (error) {
        console.log("   ❌ 消息發送失敗:", error.message);
        if (error.response) {
          console.log("   📄 錯誤詳情:", error.response.data);
        }
      }
    }

    // 4. 獲取對話消息歷史
    console.log("\n4️⃣ 獲取對話消息歷史...");
    try {
      const messagesResponse = await axios.get(
        `${BACKEND_URL}/api/chat/conversations/${conversationId}/messages`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      if (messagesResponse.data.success) {
        const messages = messagesResponse.data.data.messages;
        console.log(`   ✅ 獲取到 ${messages.length} 條消息`);

        messages.forEach((msg, index) => {
          console.log(
            `   ${index + 1}. [${msg.role}] ${msg.content.substring(0, 50)}...`
          );
        });
      }
    } catch (error) {
      console.log("   ❌ 獲取消息歷史失敗:", error.message);
    }
  } catch (error) {
    console.error("❌ 測試過程中發生錯誤:", error.message);
    if (error.response) {
      console.error("錯誤詳情:", error.response.data);
    }
  }

  console.log("\n🎯 前端 API 測試完成");
}

// 運行測試
testFrontendAPI().catch(console.error);
