/**
 * MCP 工具調用基本顯示測試
 * 測試目標：確保工具調用後有正確的格式化輸出顯示
 */

import axios from "axios";

const API_BASE = "http://localhost:3000"; // HTTP API 在 3000 端口

// 簡單的聊天測試
async function testBasicMCPDisplay() {
  console.log("🧪 開始測試 MCP 工具調用基本顯示功能");

  try {
    // 1. 登入獲取 token
    console.log("🔐 正在登入...");
    const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
      identifier: "admin",
      password: "admin123",
    });

    const token = loginResponse.data.data.access_token;
    console.log("✅ 登入成功");

    // 2. 創建新對話
    console.log("💬 正在創建新對話...");
    const conversationResponse = await axios.post(
      `${API_BASE}/api/chat/conversations`,
      {
        title: "MCP 工具測試對話",
        model_id: 1, // 使用默認模型 ID
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const conversationId = conversationResponse.data.data.id;
    console.log("✅ 對話創建成功，ID:", conversationId);

    // 3. 發送需要工具調用的消息（使用明確的 MCP 工具調用請求）
    console.log("🔧 發送工具調用請求...");
    const message = "請使用 read_file 工具查看 package.json 文件";

    const chatResponse = await axios.post(
      `${API_BASE}/api/chat/conversations/${conversationId}/messages/stream`,
      {
        content: message, // 修正：使用 content 而不是 message
        stream: false, // 使用非流式模式進行測試
      },
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 30000, // 30秒超時
      }
    );

    console.log("📨 聊天回應狀態:", chatResponse.status);
    console.log("📊 回應數據:", JSON.stringify(chatResponse.data, null, 2));

    // 4. 檢查回應中是否包含格式化的工具結果
    const responseData = chatResponse.data;

    if (responseData.has_tool_calls) {
      console.log("✅ 檢測到工具調用");
      console.log("🔧 工具調用數量:", responseData.tool_calls?.length || 0);
      console.log("📋 工具結果數量:", responseData.tool_results?.length || 0);

      if (responseData.final_response) {
        console.log("✅ 檢測到格式化的最終回應");
        console.log("📝 最終回應長度:", responseData.final_response.length);
        console.log(
          "📄 最終回應預覽:",
          responseData.final_response.substring(0, 500) + "..."
        );

        // 檢查是否包含格式化標記
        const hasFormatting =
          responseData.final_response.includes("✅") ||
          responseData.final_response.includes("📋") ||
          responseData.final_response.includes("##");

        if (hasFormatting) {
          console.log("🎯 ✅ 測試成功：檢測到格式化內容！");
        } else {
          console.log("⚠️ 警告：回應缺少格式化標記");
        }
      } else {
        console.log("❌ 錯誤：沒有檢測到最終回應");
      }
    } else {
      console.log("⚠️ 警告：沒有檢測到工具調用");
      console.log("📄 原始回應:", responseData);
    }
  } catch (error) {
    console.error("❌ 測試失敗:", error.message);

    if (error.response) {
      console.error("錯誤狀態:", error.response.status);
      console.error("錯誤數據:", error.response.data);
    }
  }
}

// 執行測試
testBasicMCPDisplay()
  .then(() => {
    console.log("🏁 測試完成");
    process.exit(0);
  })
  .catch((error) => {
    console.error("🚨 測試異常:", error);
    process.exit(1);
  });
