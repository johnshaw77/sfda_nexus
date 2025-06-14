import axios from "axios";

// 模擬前端完整聊天流程測試
async function testFrontendFlow() {
  console.log("🧪 開始測試前端聊天流程...\n");

  try {
    // 1. 測試創建新對話
    console.log("📝 步驟 1: 創建新對話");
    const createResponse = await axios.post(
      "http://localhost:3000/api/chat/conversations",
      {
        title: "測試對話 - 查詢員工資訊",
        agent_id: 1, // 通用助手
      },
      {
        headers: {
          Authorization: "Bearer test-token",
          "Content-Type": "application/json",
        },
      }
    );

    const conversationId = createResponse.data.conversation.id;
    console.log(`✅ 對話創建成功，ID: ${conversationId}\n`);

    // 2. 測試發送消息
    console.log("💬 步驟 2: 發送查詢消息");
    const messageData = {
      conversation_id: conversationId,
      content: "請查詢工號 A123456 的員工資訊",
      model_id: "qwen3:8b", // 使用本地模型
    };

    console.log("發送的消息數據:", JSON.stringify(messageData, null, 2));

    const messageResponse = await axios.post(
      "http://localhost:3000/api/chat/messages",
      messageData,
      {
        headers: {
          Authorization: "Bearer test-token",
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ 消息發送成功");
    console.log("📋 回應內容:", JSON.stringify(messageResponse.data, null, 2));

    // 3. 檢查消息是否包含工具調用
    const response = messageResponse.data;
    if (response.message && response.message.has_tool_calls) {
      console.log("\n🔧 工具調用檢測:");
      console.log("- 包含工具調用:", response.message.has_tool_calls);
      console.log("- 工具調用數據:", response.message.tool_calls);
      console.log("- 工具結果:", response.message.tool_results);
    }

    // 4. 檢查最終回應
    console.log("\n📝 最終回應:");
    console.log(response.message.content);
  } catch (error) {
    console.error("❌ 測試失敗:", error.message);
    if (error.response) {
      console.error("錯誤詳情:", error.response.data);
    }
  }
}

// 執行測試
testFrontendFlow();
