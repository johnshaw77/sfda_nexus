#!/usr/bin/env node

/**
 * 聊天調試測試
 * 測試完整的聊天流程，包含工具調用
 */

import axios from "axios";

const BACKEND_URL = "http://localhost:3000";

// 測試用戶憑據（admin 用戶）
const TEST_USER = {
  identifier: "admin@sfda-nexus.com",
  password: "admin123",
};

async function testChatWithDebug() {
  console.log("🧪 測試聊天流程（帶調試）...\\n");

  let authToken = null;

  try {
    // 1. 登錄獲取 token
    console.log("1️⃣ 嘗試登錄...");
    try {
      const loginResponse = await axios.post(
        `${BACKEND_URL}/api/auth/login`,
        TEST_USER
      );

      if (loginResponse.data.success) {
        authToken = loginResponse.data.data.access_token;
        console.log("✅ 登錄成功");
        console.log(`   用戶: ${loginResponse.data.data.user.username}`);
      } else {
        console.log("❌ 登錄失敗:", loginResponse.data.message);
        return;
      }
    } catch (loginError) {
      console.log(
        "❌ 登錄請求失敗:",
        loginError.response?.data || loginError.message
      );
      return;
    }

    // 2. 測試聊天請求（包含工具調用）
    console.log("\\n2️⃣ 發送聊天請求...");
    const chatMessage = "現在有哪些部門？";

    try {
      const chatResponse = await axios.post(
        `${BACKEND_URL}/api/qwen-agent/chat`,
        {
          message: chatMessage,
          agent_id: "27", // Qwen-Agent ID
          conversation_id: null, // 新對話
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("✅ 聊天請求成功");
      console.log("   回應狀態:", chatResponse.status);
      console.log("   回應數據:", JSON.stringify(chatResponse.data, null, 2));

      // 檢查工具調用（適配實際數據結構）
      const responseData = chatResponse.data.data;
      console.log("\\n🔧 工具調用信息:");
      console.log("   hasToolCalls:", responseData.hasToolCalls);
      console.log("   toolCalls 數量:", responseData.toolCalls?.length || 0);
      console.log(
        "   toolResults 數量:",
        responseData.toolResults?.length || 0
      );

      if (responseData.metadata) {
        console.log(
          "   metadata.has_tool_calls:",
          responseData.metadata.has_tool_calls
        );
        console.log(
          "   metadata.tool_calls 數量:",
          responseData.metadata.tool_calls?.length || 0
        );
        console.log(
          "   metadata.tool_results 數量:",
          responseData.metadata.tool_results?.length || 0
        );

        if (responseData.metadata.tool_calls?.length > 0) {
          console.log(
            "   工具調用詳情:",
            JSON.stringify(responseData.metadata.tool_calls, null, 2)
          );
        }

        if (responseData.metadata.tool_results?.length > 0) {
          console.log(
            "   工具結果詳情:",
            JSON.stringify(responseData.metadata.tool_results, null, 2)
          );
        }
      }

      // 檢查 AI 回應內容是否包含工具調用
      console.log("\\n📝 AI 回應分析:");
      console.log("   回應長度:", responseData.response?.length || 0);
      console.log(
        "   回應預覽:",
        responseData.response?.substring(0, 200) + "..."
      );

      if (responseData.response) {
        const hasToolCallTags = responseData.response.includes("<tool_call>");
        console.log("   包含 <tool_call> 標籤:", hasToolCallTags);

        if (hasToolCallTags) {
          const toolCallMatches = responseData.response.match(
            /<tool_call>([\\s\\S]*?)<\/tool_call>/gi
          );
          console.log("   工具調用標籤數量:", toolCallMatches?.length || 0);

          if (toolCallMatches) {
            toolCallMatches.forEach((match, index) => {
              console.log(`   工具調用 ${index + 1}:`, match);
            });
          }
        }
      }
    } catch (chatError) {
      console.log(
        "❌ 聊天請求失敗:",
        chatError.response?.data || chatError.message
      );
      console.log("   錯誤狀態:", chatError.response?.status);
    }
  } catch (error) {
    console.log("❌ 測試失敗:", error.message);
  }

  console.log("\\n🏁 聊天調試測試完成");
}

// 執行測試
testChatWithDebug();
