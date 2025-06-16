/**
 * 測試思考內容修復效果
 * 驗證串流完成後消息內容和思考內容是否正確保存和顯示
 */

const axios = require("axios");

const API_BASE_URL = "http://localhost:3000/api";
const TEST_USER = {
  identifier: "admin",
  password: "admin123",
};

let authToken = "";
let testConversationId = null;

// 登入獲取 token
async function login() {
  try {
    console.log("🔐 正在登入...");
    const response = await axios.post(`${API_BASE_URL}/auth/login`, TEST_USER);
    authToken = response.data.data.token;
    console.log("✅ 登入成功");
    return true;
  } catch (error) {
    console.error("❌ 登入失敗:", error.response?.data || error.message);
    return false;
  }
}

// 創建測試對話
async function createTestConversation() {
  try {
    console.log("📝 正在創建測試對話...");
    const response = await axios.post(
      `${API_BASE_URL}/chat/conversations`,
      {
        model_id: 1, // 假設使用第一個模型
        title: "思考內容測試對話",
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    testConversationId = response.data.data.id;
    console.log("✅ 測試對話創建成功，ID:", testConversationId);
    return true;
  } catch (error) {
    console.error("❌ 創建對話失敗:", error.response?.data || error.message);
    return false;
  }
}

// 發送測試消息
async function sendTestMessage() {
  try {
    console.log("💬 正在發送測試消息...");
    const response = await axios.post(
      `${API_BASE_URL}/chat/conversations/${testConversationId}/messages`,
      {
        content: "請詳細分析一下量子計算的原理，並解釋其與傳統計算的區別",
        temperature: 0.7,
        max_tokens: 4096,
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    console.log("✅ 消息發送成功");
    console.log("📋 回應數據結構:", {
      hasUserMessage: !!response.data.data.user_message,
      hasAssistantMessage: !!response.data.data.assistant_message,
      assistantContent:
        response.data.data.assistant_message?.content?.substring(0, 100) +
        "...",
      hasThinkingInMetadata:
        !!response.data.data.assistant_message?.metadata?.thinking_content,
      thinkingLength:
        response.data.data.assistant_message?.metadata?.thinking_content
          ?.length || 0,
    });

    return response.data.data.assistant_message;
  } catch (error) {
    console.error("❌ 發送消息失敗:", error.response?.data || error.message);
    return null;
  }
}

// 獲取對話消息列表
async function getMessages() {
  try {
    console.log("📋 正在獲取對話消息...");
    const response = await axios.get(
      `${API_BASE_URL}/chat/conversations/${testConversationId}/messages`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    const messages = response.data.data.data;
    console.log("✅ 獲取消息成功，總數:", messages.length);

    // 檢查 AI 消息
    const aiMessages = messages.filter((msg) => msg.role === "assistant");
    console.log("🤖 AI 消息數量:", aiMessages.length);

    aiMessages.forEach((msg, index) => {
      console.log(`\n🧠 AI 消息 ${index + 1}:`);
      console.log("  - 消息 ID:", msg.id);
      console.log("  - 內容長度:", msg.content?.length || 0);
      console.log(
        "  - 內容預覽:",
        (msg.content || "").substring(0, 100) + "..."
      );
      console.log("  - 有 metadata:", !!msg.metadata);
      console.log(
        "  - metadata 中有思考內容:",
        !!msg.metadata?.thinking_content
      );
      console.log(
        "  - 思考內容長度:",
        msg.metadata?.thinking_content?.length || 0
      );

      if (msg.metadata?.thinking_content) {
        console.log(
          "  - 思考內容預覽:",
          msg.metadata.thinking_content.substring(0, 200) + "..."
        );
      }

      // 檢查是否有工具調用信息
      if (msg.metadata?.has_tool_calls) {
        console.log("  - 有工具調用:", msg.metadata.has_tool_calls);
        console.log("  - 工具調用數量:", msg.metadata.tool_calls?.length || 0);
      }
    });

    return messages;
  } catch (error) {
    console.error("❌ 獲取消息失敗:", error.response?.data || error.message);
    return [];
  }
}

// 主測試函數
async function runTest() {
  console.log("🧪 開始思考內容修復測試\n");

  // 1. 登入
  if (!(await login())) {
    return;
  }

  // 2. 創建測試對話
  if (!(await createTestConversation())) {
    return;
  }

  // 3. 發送測試消息
  const assistantMessage = await sendTestMessage();
  if (!assistantMessage) {
    return;
  }

  // 4. 等待一段時間確保處理完成
  console.log("⏳ 等待 3 秒確保處理完成...");
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // 5. 獲取消息列表驗證
  const messages = await getMessages();

  // 6. 驗證結果
  console.log("\n📊 測試結果分析:");

  const aiMessage = messages.find((msg) => msg.role === "assistant");
  if (aiMessage) {
    const hasContent = !!(aiMessage.content && aiMessage.content.trim());
    const hasThinking = !!aiMessage.metadata?.thinking_content;

    console.log("✅ 測試結果:");
    console.log("  - 消息內容存在:", hasContent ? "✅" : "❌");
    console.log("  - 思考內容存在:", hasThinking ? "✅" : "❌");
    console.log("  - 消息內容長度:", aiMessage.content?.length || 0);
    console.log(
      "  - 思考內容長度:",
      aiMessage.metadata?.thinking_content?.length || 0
    );

    if (hasContent && hasThinking) {
      console.log("\n🎉 修復成功！消息內容和思考內容都正確保存");
    } else if (hasContent && !hasThinking) {
      console.log("\n⚠️  部分成功：消息內容正確，但思考內容缺失");
    } else if (!hasContent && hasThinking) {
      console.log("\n⚠️  部分成功：思考內容正確，但消息內容缺失");
    } else {
      console.log("\n❌ 修復失敗：消息內容和思考內容都缺失");
    }
  } else {
    console.log("❌ 未找到 AI 回應消息");
  }

  console.log("\n🧪 測試完成");
}

// 運行測試
runTest().catch((error) => {
  console.error("💥 測試執行失敗:", error);
});
