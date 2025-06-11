#!/usr/bin/env node

/**
 * 測試工具調用 URL 修正
 * 驗證 Qwen-Agent 能否正確調用 MCP 工具
 */

import axios from "axios";

const MCP_SERVER_URL = "http://localhost:8080";
const BACKEND_URL = "http://localhost:3000";

async function testToolUrls() {
  console.log("🧪 測試工具調用 URL 修正...\n");

  // 1. 測試 MCP Server 端點
  console.log("1️⃣ 測試 MCP Server 端點...");
  try {
    // 正確的端點
    const mcpResponse = await axios.post(
      `${MCP_SERVER_URL}/api/hr/get_department_list`,
      { includeStats: true, includeInactive: false },
      { timeout: 5000 }
    );

    if (mcpResponse.data.success) {
      console.log("✅ MCP Server HR 工具調用成功");
      console.log(
        `   部門數量: ${mcpResponse.data.result?.departments?.length || 0}`
      );
    } else {
      console.log("❌ MCP Server HR 工具調用失敗");
    }
  } catch (error) {
    console.log(`❌ MCP Server 連接失敗: ${error.message}`);
  }

  // 2. 測試錯誤的端點（舊版本）
  console.log("\n2️⃣ 測試錯誤端點（應該失敗）...");
  try {
    const wrongResponse = await axios.post(
      `${MCP_SERVER_URL}/api/hr/tools/get_department_list`, // 錯誤路徑
      { includeStats: true, includeInactive: false },
      { timeout: 5000 }
    );
    console.log("⚠️  錯誤端點竟然成功了？這不應該發生");
  } catch (error) {
    console.log("✅ 錯誤端點正確失敗（符合預期）");
  }

  // 3. 測試後端 Qwen-Agent 服務
  console.log("\n3️⃣ 測試後端 Qwen-Agent 工具調用...");
  try {
    const agentResponse = await axios.post(
      `${BACKEND_URL}/api/qwen-agent/tools/hr.get_department_list/call`,
      { includeStats: true, includeInactive: false },
      {
        timeout: 10000,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (agentResponse.data.success) {
      console.log("✅ Qwen-Agent 工具調用成功");
      console.log(
        `   返回數據: ${JSON.stringify(agentResponse.data, null, 2).substring(0, 200)}...`
      );
    } else {
      console.log("❌ Qwen-Agent 工具調用失敗");
      console.log(
        `   錯誤: ${agentResponse.data.error || agentResponse.data.message}`
      );
    }
  } catch (error) {
    console.log(`❌ Qwen-Agent 調用失敗: ${error.message}`);
    if (error.response?.data) {
      console.log(
        `   詳細錯誤: ${JSON.stringify(error.response.data, null, 2)}`
      );
    }
  }

  console.log("\n🏁 測試完成");
}

// 執行測試
testToolUrls().catch(console.error);
