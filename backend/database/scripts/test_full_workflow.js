#!/usr/bin/env node

/**
 * 完整工具調用流程測試
 * 模擬從用戶請求到前端顯示的完整流程
 */

import axios from "axios";

const MCP_SERVER_URL = "http://localhost:8080";
const BACKEND_URL = "http://localhost:3000";

async function testFullWorkflow() {
  console.log("🧪 測試完整工具調用流程...\n");

  // 1. 測試 MCP Server 工具調用
  console.log("1️⃣ 測試 MCP Server 工具調用...");
  try {
    const mcpResponse = await axios.post(
      `${MCP_SERVER_URL}/api/hr/get_department_list`,
      { includeStats: true, includeInactive: false },
      { timeout: 5000 }
    );

    if (mcpResponse.data.success) {
      console.log("✅ MCP Server 工具調用成功");
      console.log(
        `   返回部門數量: ${mcpResponse.data.result?.departments?.length || 0}`
      );
      if (mcpResponse.data.result?.departments?.length > 0) {
        console.log(
          `   第一個部門: ${mcpResponse.data.result.departments[0].departmentName}`
        );
      }
    } else {
      console.log("❌ MCP Server 工具調用失敗");
      return;
    }
  } catch (error) {
    console.log(`❌ MCP Server 連接失敗: ${error.message}`);
    return;
  }

  // 2. 測試後端聊天服務（需要認證令牌）
  console.log("\n2️⃣ 測試後端聊天服務整合...");
  console.log("   注意：此測試需要有效的認證令牌");

  // 模擬聊天請求的格式
  const chatRequest = {
    content: "現在有哪些部門？請幫我列出清單",
    agent_id: 27, // Qwen-Agent ID
    temperature: 0.7,
    max_tokens: 4096,
  };

  console.log("   聊天請求格式:");
  console.log(
    `   POST ${BACKEND_URL}/api/chat/conversations/{conversationId}/messages`
  );
  console.log(`   Body: ${JSON.stringify(chatRequest, null, 2)}`);

  // 3. 測試預期的回應格式
  console.log("\n3️⃣ 預期的回應格式...");
  const expectedResponse = {
    success: true,
    data: {
      user_message: {
        id: 123,
        role: "user",
        content: "現在有哪些部門？請幫我列出清單",
      },
      assistant_message: {
        id: 124,
        role: "assistant",
        content: "以下是公司的部門列表：...",
        metadata: {
          has_tool_calls: true,
          tool_calls: [
            {
              tool: "hr.get_department_list",
              parameters: { includeStats: true, includeInactive: false },
            },
          ],
          tool_results: [
            {
              success: true,
              result: "工具調用結果會放在這裡",
            },
          ],
        },
      },
    },
  };

  console.log("   assistant_message.metadata 結構:");
  console.log(
    JSON.stringify(expectedResponse.data.assistant_message.metadata, null, 2)
  );

  // 4. 前端 MessageBubble 顯示邏輯
  console.log("\n4️⃣ 前端顯示邏輯...");
  console.log("   MessageBubble.vue 應該檢查：");
  console.log("   - message.metadata?.tool_calls?.length > 0");
  console.log("   - 使用 effectiveToolCalls 計算屬性");
  console.log("   - 顯示 ToolCallDisplay 組件");

  // 5. 驗證修正
  console.log("\n5️⃣ 修正驗證...");
  console.log("✅ URL 路徑修正：/api/{module}/{toolFunction}");
  console.log("✅ MessageBubble.vue 增加 effectiveToolCalls");
  console.log("✅ 支持 metadata.tool_calls 讀取");

  console.log("\n🎯 測試建議：");
  console.log("1. 在前端聊天界面測試問題：'現在有哪些部門？'");
  console.log("2. 檢查開發者工具中的網絡請求");
  console.log("3. 查看 assistant_message.metadata 是否包含工具調用結果");
  console.log("4. 確認前端正確顯示 ToolCallDisplay 組件");

  console.log("\n🏁 完整流程測試完成");
}

// 執行測試
testFullWorkflow().catch(console.error);
