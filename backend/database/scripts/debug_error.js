/**
 * 調試錯誤腳本 - 專門用於調試 aiOptions 初始化錯誤
 */

import axios from "axios";

const BACKEND_URL = "http://localhost:3000";

// 測試用戶憑據
const TEST_USER = {
  identifier: "admin@sfda-nexus.com",
  password: "admin123",
};

async function debugError() {
  console.log("🔍 調試 aiOptions 初始化錯誤...\n");

  try {
    // 1. 登錄
    console.log("1️⃣ 登錄...");
    const loginResponse = await axios.post(
      `${BACKEND_URL}/api/auth/login`,
      TEST_USER
    );

    const authToken = loginResponse.data.data.access_token;
    console.log("   ✅ 登錄成功");

    // 2. 創建對話
    console.log("\n2️⃣ 創建對話...");
    const createConvResponse = await axios.post(
      `${BACKEND_URL}/api/chat/conversations`,
      {
        title: "錯誤調試對話",
        agent_id: 1,
        model_id: 1,
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    const conversationId = createConvResponse.data.data.id;
    console.log(`   ✅ 對話創建成功，ID: ${conversationId}`);

    // 3. 發送消息並捕獲詳細錯誤
    console.log("\n3️⃣ 發送消息（捕獲詳細錯誤）...");
    try {
      const sendMessageResponse = await axios.post(
        `${BACKEND_URL}/api/chat/conversations/${conversationId}/messages`,
        {
          content: "測試消息",
          content_type: "text",
          temperature: 0.7,
          max_tokens: 1000,
          model_id: 1,
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
          timeout: 30000,
        }
      );

      console.log("   ✅ 消息發送成功");
      console.log("   📝 回應:", sendMessageResponse.data);
    } catch (error) {
      console.log("   ❌ 消息發送失敗");
      console.log("   🔍 錯誤類型:", error.constructor.name);
      console.log("   📄 錯誤消息:", error.message);

      if (error.response) {
        console.log("   📊 HTTP 狀態:", error.response.status);
        console.log(
          "   📋 響應數據:",
          JSON.stringify(error.response.data, null, 2)
        );

        if (error.response.data.stack) {
          console.log("   📚 完整堆棧:");
          console.log(error.response.data.stack);
        }
      }

      if (error.request) {
        console.log("   🌐 請求信息:", {
          method: error.request.method,
          url: error.request.url,
          timeout: error.request.timeout,
        });
      }
    }
  } catch (error) {
    console.error("❌ 調試過程中發生錯誤:", error.message);
  }

  console.log("\n🎯 錯誤調試完成");
}

// 運行調試
debugError().catch(console.error);
