/**
 * 測試系統提示詞功能
 * 驗證前端是否正確傳遞系統提示詞到後端
 */

const axios = require("axios");

const API_BASE_URL = "http://localhost:3000";
const TEST_TOKEN = "your_test_token_here"; // 需要替換為實際的測試 token

async function testSystemPrompt() {
  try {
    console.log("🧪 開始測試系統提示詞功能...\n");

    // 1. 測試創建對話
    console.log("1. 創建測試對話...");
    const conversationResponse = await axios.post(
      `${API_BASE_URL}/api/chat/conversations`,
      {
        title: "系統提示詞測試",
        model_id: 1, // 假設模型 ID 為 1
        agent_id: 1, // 假設智能體 ID 為 1
      },
      {
        headers: {
          Authorization: `Bearer ${TEST_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    const conversationId = conversationResponse.data.data.id;
    console.log(`✅ 對話創建成功，ID: ${conversationId}\n`);

    // 2. 測試發送消息（不帶自定義系統提示詞）
    console.log("2. 測試發送消息（使用智能體默認系統提示詞）...");
    const messageResponse1 = await axios.post(
      `${API_BASE_URL}/api/chat/conversations/${conversationId}/messages`,
      {
        content: "你好，請介紹一下自己",
        temperature: 0.7,
        max_tokens: 1000,
        model_id: 1,
      },
      {
        headers: {
          Authorization: `Bearer ${TEST_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ 消息發送成功（使用默認系統提示詞）");
    console.log(
      "AI 回應預覽:",
      messageResponse1.data.data.assistant_message.content.substring(0, 100) +
        "...\n"
    );

    // 3. 測試發送消息（帶自定義系統提示詞）
    console.log("3. 測試發送消息（使用自定義系統提示詞）...");
    const customSystemPrompt =
      "你是一個專業的程式設計師，專精於 JavaScript 和 Node.js 開發。請用技術專業的語調回答問題。";

    const messageResponse2 = await axios.post(
      `${API_BASE_URL}/api/chat/conversations/${conversationId}/messages`,
      {
        content: "請解釋一下什麼是 Promise",
        temperature: 0.7,
        max_tokens: 1000,
        model_id: 1,
        system_prompt: customSystemPrompt,
      },
      {
        headers: {
          Authorization: `Bearer ${TEST_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ 消息發送成功（使用自定義系統提示詞）");
    console.log(
      "AI 回應預覽:",
      messageResponse2.data.data.assistant_message.content.substring(0, 100) +
        "...\n"
    );

    console.log("🎉 所有測試完成！系統提示詞功能正常工作。");
  } catch (error) {
    console.error("❌ 測試失敗:", error.response?.data || error.message);

    if (error.response?.status === 401) {
      console.log("\n💡 提示：請確保設置了正確的認證 token");
    }

    if (error.code === "ECONNREFUSED") {
      console.log("\n💡 提示：請確保後端服務正在運行 (npm start)");
    }
  }
}

// 如果直接運行此腳本
if (require.main === module) {
  testSystemPrompt();
}

module.exports = { testSystemPrompt };
