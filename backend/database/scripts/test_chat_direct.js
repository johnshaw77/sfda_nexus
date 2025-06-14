import axios from "axios";

// 直接測試聊天功能
async function testChatDirect() {
  console.log("🧪 開始直接測試聊天功能...\n");

  try {
    // 測試聊天 API（假設已有對話 ID）
    console.log("💬 測試聊天 API");

    const chatData = {
      conversation_id: 1, // 假設的對話 ID
      content: "請查詢工號 A123456 的員工資訊",
      model_id: "qwen3:8b",
      agent_id: 1,
    };

    console.log("發送的聊天數據:", JSON.stringify(chatData, null, 2));

    // 直接調用聊天處理邏輯
    const { default: chatService } = await import(
      "../../src/services/chat.service.js"
    );

    console.log("🔄 開始處理聊天請求...");

    // 模擬用戶和對話數據
    const mockUser = { id: 1, username: "test_user" };
    const mockConversation = { id: 1, agent_id: 1 };

    const result = await chatService.processChatMessage(chatData.content, {
      user_id: mockUser.id,
      conversation_id: mockConversation.id,
      model_id: chatData.model_id,
    });

    console.log("✅ 聊天處理完成");
    console.log("📋 處理結果:", JSON.stringify(result, null, 2));

    // 檢查工具調用
    if (result.has_tool_calls) {
      console.log("\n🔧 工具調用成功:");
      console.log("- 工具調用:", result.tool_calls);
      console.log("- 工具結果:", result.tool_results);
    }

    console.log("\n📝 最終回應:");
    console.log(result.content);
  } catch (error) {
    console.error("❌ 測試失敗:", error.message);
    console.error("錯誤堆疊:", error.stack);
  }
}

// 執行測試
testChatDirect();
