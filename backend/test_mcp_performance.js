/**
 * MCP 性能對比測試
 * 對比直接 MCP 調用 vs AI 對話中的工具調用
 */

import axios from "axios";
import mcpClient from "./src/services/mcp.service.js";

const API_BASE = "http://localhost:3000/api";
const TEST_USER = {
  identifier: "admin",
  password: "admin123",
};

async function testMcpPerformance() {
  console.log("🧪 === MCP 性能對比測試 ===");

  try {
    // 1. 登入獲取 token
    console.log("🔑 正在登入...");
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, TEST_USER);
    const token = loginResponse.data.data.access_token;
    console.log("✅ 登入成功");

    // 測試數據
    const chartParams = {
      data: [
        { quarter: "Q1", sales: 1200 },
        { quarter: "Q2", sales: 1500 },
        { quarter: "Q3", sales: 1800 },
        { quarter: "Q4", sales: 2100 },
      ],
      title: "四季度銷售額趨勢",
      chart_type: "bar",
      description: "測試圖表創建性能",
    };

    // ===== 測試 1: 直接 MCP 調用 =====
    console.log("\n📊 === 測試 1: 直接 MCP 調用 ===");

    const directStart = Date.now();

    try {
      // 假設 create_chart 工具的 ID 是 10（需要根據實際情況調整）
      const directResult = await mcpClient.invokeTool(10, chartParams, {
        user_id: 1,
        conversation_id: 1,
      });

      const directTime = Date.now() - directStart;
      console.log(`⚡ 直接 MCP 調用時間: ${directTime}ms`);
      console.log("✅ 直接調用結果:", {
        success: directResult.success,
        dataSize: JSON.stringify(directResult.data || {}).length,
      });
    } catch (error) {
      console.error("❌ 直接 MCP 調用失敗:", error.message);
    }

    // ===== 測試 2: AI 對話中的工具調用 =====
    console.log("\n🤖 === 測試 2: AI 對話中的工具調用 ===");

    // 創建對話
    const conversationResponse = await axios.post(
      `${API_BASE}/chat/conversations`,
      { title: "性能測試對話", model_id: 1 },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const conversationId = conversationResponse.data.data.id;
    console.log(`✅ 對話創建成功，ID: ${conversationId}`);

    const aiStart = Date.now();

    try {
      // 發送 AI 消息請求圖表創建
      const aiResponse = await axios.post(
        `${API_BASE}/chat/conversations/${conversationId}/messages`,
        {
          content:
            "請用 create_chart 工具創建一個圖表，數據：Q1:1200, Q2:1500, Q3:1800, Q4:2100，標題：四季度銷售額趨勢，類型：bar",
          temperature: 0.1, // 降低隨機性
          max_tokens: 1000,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const aiTime = Date.now() - aiStart;
      console.log(`🤖 AI 對話調用時間: ${aiTime}ms`);
      console.log("✅ AI 調用結果:", {
        success: aiResponse.status === 200,
        hasContent: !!aiResponse.data?.data?.content,
        contentLength: aiResponse.data?.data?.content?.length || 0,
      });
    } catch (error) {
      console.error("❌ AI 對話調用失敗:", error.message);
    }

    // ===== 測試 3: 檢查 MCP 服務狀態 =====
    console.log("\n🔍 === 測試 3: MCP 服務狀態檢查 ===");

    const statusStart = Date.now();
    const mcpStatuses = mcpClient.getConnectionStatuses();
    const statusTime = Date.now() - statusStart;

    console.log(`📊 MCP 狀態檢查時間: ${statusTime}ms`);
    console.log("MCP 服務狀態:");
    mcpStatuses.forEach((status) => {
      console.log(
        `  - ${status.service_name}: ${status.connected ? "✅" : "❌"} 連接`
      );
    });

    // ===== 測試 4: 網絡延遲測試 =====
    console.log("\n🌐 === 測試 4: 網絡延遲測試 ===");

    const pingStart = Date.now();
    try {
      await axios.get("http://localhost:8000/health", { timeout: 5000 });
      const pingTime = Date.now() - pingStart;
      console.log(`🏓 統計服務 ping 時間: ${pingTime}ms`);
    } catch (error) {
      console.error("❌ 統計服務 ping 失敗:", error.message);
    }
  } catch (error) {
    console.error("❌ 測試失敗:", error.message);
    if (error.response) {
      console.error("錯誤詳情:", error.response.data);
    }
  }
}

testMcpPerformance();
