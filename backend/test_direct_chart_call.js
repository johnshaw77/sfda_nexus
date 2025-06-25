/**
 * 直接圖表調用測試
 * 跳過 AI 處理，直接調用圖表創建工具
 */

import mcpClient from "./src/services/mcp.service.js";
import axios from "axios";

async function testDirectChartCall() {
  console.log("🎯 === 直接圖表調用測試 ===");

  try {
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

    // ===== 測試 1: 直接 HTTP 調用 MCP 服務 =====
    console.log("\n🌐 === 測試 1: 直接 HTTP 調用 MCP 服務 ===");

    const httpStart = Date.now();

    try {
      const response = await axios.post(
        "http://localhost:8000/api/stat/create_chart",
        chartParams,
        {
          timeout: 10000,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const httpTime = Date.now() - httpStart;
      console.log(`⚡ 直接 HTTP 調用時間: ${httpTime}ms`);
      console.log("✅ 直接 HTTP 調用結果:", {
        status: response.status,
        hasData: !!response.data,
        dataKeys: Object.keys(response.data || {}),
      });
    } catch (error) {
      console.error("❌ 直接 HTTP 調用失敗:", error.message);
    }

    // ===== 測試 2: 通過 MCP 客戶端調用 =====
    console.log("\n🔧 === 測試 2: 通過 MCP 客戶端調用 ===");

    const mcpStart = Date.now();

    try {
      // create_chart 工具的 ID 是 217
      const mcpResult = await mcpClient.invokeTool(217, chartParams, {
        user_id: 1,
        conversation_id: 1,
      });

      const mcpTime = Date.now() - mcpStart;
      console.log(`🔧 MCP 客戶端調用時間: ${mcpTime}ms`);
      console.log("✅ MCP 客戶端調用結果:", {
        success: mcpResult.success,
        hasData: !!mcpResult.data,
        executionTime: mcpResult.execution_time,
        fromCache: mcpResult.from_cache,
      });
    } catch (error) {
      console.error("❌ MCP 客戶端調用失敗:", error.message);
    }

    // ===== 測試 3: 檢查服務狀態 =====
    console.log("\n📊 === 測試 3: 檢查 MCP 服務狀態 ===");

    const statusStart = Date.now();
    const mcpStatuses = mcpClient.getConnectionStatuses();
    const statusTime = Date.now() - statusStart;

    console.log(`📊 狀態檢查時間: ${statusTime}ms`);
    console.log("MCP 服務狀態:");
    mcpStatuses.forEach((status) => {
      console.log(
        `  - ${status.service_name}: ${status.connected ? "✅" : "❌"} (${status.endpoint_url})`
      );
    });

    // ===== 測試 4: 網絡連通性測試 =====
    console.log("\n🏓 === 測試 4: 網絡連通性測試 ===");

    const services = [
      { name: "MCP 服務", url: "http://localhost:8080/api/tools" },
      { name: "統計服務", url: "http://localhost:8000/health" },
    ];

    for (const service of services) {
      try {
        const pingStart = Date.now();
        await axios.get(service.url, { timeout: 5000 });
        const pingTime = Date.now() - pingStart;
        console.log(`🏓 ${service.name} ping 時間: ${pingTime}ms`);
      } catch (error) {
        console.error(`❌ ${service.name} ping 失敗:`, error.message);
      }
    }
  } catch (error) {
    console.error("❌ 測試失敗:", error.message);
  }
}

testDirectChartCall();
