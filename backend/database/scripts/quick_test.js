/**
 * 快速測試腳本 - 診斷前端 API 問題
 */

import axios from "axios";

const BACKEND_URL = "http://localhost:3000";

// 測試用戶憑據
const TEST_USER = {
  identifier: "admin@sfda-nexus.com",
  password: "admin123",
};

async function quickTest() {
  console.log("🔍 快速診斷測試...\n");

  try {
    // 1. 測試後端健康檢查
    console.log("1️⃣ 測試後端連接...");
    try {
      const healthResponse = await axios.get(`${BACKEND_URL}/api/health`, {
        timeout: 5000,
      });
      console.log("   ✅ 後端連接正常");
    } catch (error) {
      console.log("   ❌ 後端連接失敗:", error.message);
      return;
    }

    // 2. 測試登錄
    console.log("\n2️⃣ 測試登錄...");
    let authToken = null;
    try {
      const loginResponse = await axios.post(
        `${BACKEND_URL}/api/auth/login`,
        TEST_USER,
        { timeout: 10000 }
      );

      if (loginResponse.data.success) {
        authToken = loginResponse.data.data.access_token;
        console.log("   ✅ 登錄成功");
      } else {
        console.log("   ❌ 登錄失敗:", loginResponse.data.message);
        return;
      }
    } catch (error) {
      console.log("   ❌ 登錄請求失敗:", error.message);
      if (error.response) {
        console.log("   📄 錯誤詳情:", error.response.data);
      }
      return;
    }

    // 3. 測試創建對話
    console.log("\n3️⃣ 測試創建對話...");
    let conversationId = null;
    try {
      const createConvResponse = await axios.post(
        `${BACKEND_URL}/api/chat/conversations`,
        {
          title: "快速測試對話",
          agent_id: 1,
          model_id: 1,
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
          timeout: 10000,
        }
      );

      if (createConvResponse.data.success) {
        conversationId = createConvResponse.data.data.id;
        console.log(`   ✅ 對話創建成功，ID: ${conversationId}`);
      } else {
        console.log("   ❌ 創建對話失敗:", createConvResponse.data.message);
        return;
      }
    } catch (error) {
      console.log("   ❌ 創建對話請求失敗:", error.message);
      if (error.response) {
        console.log("   📄 錯誤詳情:", error.response.data);
      }
      return;
    }

    // 4. 測試發送簡單消息
    console.log("\n4️⃣ 測試發送消息...");
    try {
      const sendMessageResponse = await axios.post(
        `${BACKEND_URL}/api/chat/conversations/${conversationId}/messages`,
        {
          content: "請查詢工號 A123456 的員工信息",
          content_type: "text",
          temperature: 0.7,
          max_tokens: 4096,
          model_id: 1,
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
            `   📝 AI 回應內容: ${assistant_message.content.substring(0, 200)}...`
          );

          // 檢查是否包含工具調用結果
          if (
            assistant_message.content.includes("白勝宇") ||
            assistant_message.content.includes("A123456")
          ) {
            console.log("   🎯 ✅ 檢測到工具調用結果！");
          } else {
            console.log("   ⚠️ 未檢測到明顯的工具調用結果");
            console.log("   📄 完整回應:", assistant_message.content);
          }
        } else {
          console.log("   ❌ 沒有收到 AI 回應");
        }
      } else {
        console.log("   ❌ 消息發送失敗:", sendMessageResponse.data.message);
      }
    } catch (error) {
      console.log("   ❌ 消息發送失敗:", error.message);
      if (error.response) {
        console.log("   📄 錯誤詳情:", error.response.data);
      }
    }
  } catch (error) {
    console.error("❌ 測試過程中發生錯誤:", error.message);
  }

  console.log("\n🎯 快速測試完成");
}

// 運行測試
quickTest().catch(console.error);
