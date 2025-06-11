#!/usr/bin/env node

/**
 * 完整聊天測試腳本
 * 模擬真實用戶詢問部門列表的完整流程
 */

import axios from "axios";

const BACKEND_URL = "http://localhost:3000";

// 測試用戶憑據 (密碼: test123)
const TEST_USER = {
  identifier: "test@test.com",
  password: "test123",
};

async function testFullChatFlow() {
  console.log("🧪 測試完整聊天流程...\n");

  let authToken = null;

  try {
    // 1. 登錄獲取 token
    console.log("1️⃣ 登錄測試...");
    const loginResponse = await axios.post(
      `${BACKEND_URL}/api/auth/login`,
      TEST_USER
    );

    if (loginResponse.data.success) {
      authToken = loginResponse.data.data.access_token;
      console.log("✅ 登錄成功");
      console.log(`   用戶: ${loginResponse.data.data.user.name}`);
      console.log(`   Token: ${authToken.substring(0, 20)}...`);
    } else {
      console.log("❌ 登錄失敗");
      return;
    }

    // 2. 創建對話
    console.log("\n2️⃣ 創建對話...");
    const conversationResponse = await axios.post(
      `${BACKEND_URL}/api/chat/conversations`,
      {
        agent_id: 27, // Qwen-Agent ID
        model_id: 2, // qwen3:32b
      },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (conversationResponse.data.success) {
      const conversation = conversationResponse.data.data;
      console.log("✅ 對話創建成功");
      console.log(`   對話 ID: ${conversation.id}`);
      console.log(`   智能體 ID: ${conversation.agent_id}`);
      console.log(`   模型 ID: ${conversation.model_id}`);

      // 3. 發送測試消息
      console.log("\n3️⃣ 發送測試消息...");
      const messageResponse = await axios.post(
        `${BACKEND_URL}/api/chat/conversations/${conversation.id}/messages`,
        {
          content: "現在有哪些部門？請幫我列出詳細資訊",
          temperature: 0.7,
          max_tokens: 4096,
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
          timeout: 30000, // 30秒超時
        }
      );

      if (messageResponse.data.success) {
        const messageData = messageResponse.data.data;
        console.log("✅ 消息發送成功");

        // 用戶消息
        console.log("\n📝 用戶消息:");
        console.log(`   ID: ${messageData.user_message.id}`);
        console.log(`   內容: ${messageData.user_message.content}`);

        // AI 回應
        console.log("\n🤖 AI 回應:");
        console.log(`   ID: ${messageData.assistant_message.id}`);
        console.log(
          `   內容長度: ${messageData.assistant_message.content.length}`
        );
        console.log(
          `   內容預覽: ${messageData.assistant_message.content.substring(0, 200)}...`
        );

        // 工具調用資訊
        const metadata = messageData.assistant_message.metadata;
        console.log("\n🔧 工具調用資訊:");
        console.log(`   有工具調用: ${metadata.has_tool_calls}`);
        console.log(`   工具調用數量: ${metadata.tool_calls?.length || 0}`);

        if (metadata.tool_calls && metadata.tool_calls.length > 0) {
          metadata.tool_calls.forEach((call, index) => {
            console.log(`   工具 ${index + 1}: ${call.name}`);
            console.log(`     參數: ${JSON.stringify(call.parameters)}`);
            console.log(`     格式: ${call.format}`);
          });
        }

        console.log(`   工具結果數量: ${metadata.tool_results?.length || 0}`);

        if (metadata.tool_results && metadata.tool_results.length > 0) {
          metadata.tool_results.forEach((result, index) => {
            console.log(
              `   結果 ${index + 1}: ${result.success ? "成功" : "失敗"}`
            );
            if (result.success && result.result?.result?.departments) {
              console.log(
                `     部門數量: ${result.result.result.departments.length}`
              );
            }
            if (result.error) {
              console.log(`     錯誤: ${result.error}`);
            }
          });
        }

        // 4. 檢查前端預期數據格式
        console.log("\n4️⃣ 前端數據格式檢查:");
        console.log("   MessageBubble.vue 會檢查:");
        console.log(
          `   - message.metadata.tool_calls: ${metadata.tool_calls ? "✅" : "❌"}`
        );
        console.log(
          `   - message.metadata.tool_results: ${metadata.tool_results ? "✅" : "❌"}`
        );

        // 模擬前端 effectiveToolCalls
        const effectiveToolCalls = metadata.tool_calls || [];
        console.log(
          `   - effectiveToolCalls 長度: ${effectiveToolCalls.length}`
        );

        if (effectiveToolCalls.length > 0) {
          console.log("   ✅ 前端應該會顯示 ToolCallDisplay 組件");
        } else {
          console.log("   ❌ 前端不會顯示工具調用結果");
        }
      } else {
        console.log("❌ 消息發送失敗");
        console.log(`   錯誤: ${messageResponse.data.message}`);
      }
    } else {
      console.log("❌ 對話創建失敗");
      console.log(`   錯誤: ${conversationResponse.data.message}`);
    }
  } catch (error) {
    console.log("❌ 測試失敗:");
    if (error.response) {
      console.log(
        `   HTTP ${error.response.status}: ${error.response.statusText}`
      );
      console.log(
        `   錯誤詳情: ${JSON.stringify(error.response.data, null, 2)}`
      );
    } else {
      console.log(`   錯誤: ${error.message}`);
    }
  }

  console.log("\n🏁 完整聊天流程測試完成");
}

// 執行測試
testFullChatFlow().catch(console.error);
