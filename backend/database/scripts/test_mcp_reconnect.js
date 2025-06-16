/**
 * 測試 MCP 重連機制
 *
 * 測試場景：
 * 1. 後端先啟動（mcp-server 未啟動）
 * 2. 嘗試調用工具（應該失敗）
 * 3. 啟動 mcp-server
 * 4. 再次嘗試調用工具（應該自動重連並成功）
 */

import mcpClient from "../src/services/mcp.service.js";
import { initializeDatabase } from "../src/config/database.config.js";
import logger from "../src/utils/logger.util.js";

async function testMcpReconnect() {
  try {
    console.log("🔧 ===== MCP 重連機制測試 =====");

    // 初始化資料庫
    await initializeDatabase();
    console.log("✅ 資料庫初始化完成");

    // 初始化 MCP 客戶端（此時 mcp-server 可能未啟動）
    await mcpClient.initialize();
    console.log("✅ MCP 客戶端初始化完成");

    // 等待一段時間讓重連機制運行
    console.log("⏳ 等待 5 秒...");
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 測試工具調用
    console.log("🔧 測試工具調用...");

    try {
      const result = await mcpClient.invokeTool(1, {}, { user_id: 1 });
      console.log("✅ 工具調用成功:", result);
    } catch (error) {
      console.log("❌ 工具調用失敗:", error.message);
    }

    // 檢查連接狀態
    const statuses = mcpClient.getConnectionStatuses();
    console.log("📊 連接狀態:", statuses);

    // 等待更長時間測試定期重連
    console.log("⏳ 等待 35 秒測試定期重連...");
    await new Promise((resolve) => setTimeout(resolve, 35000));

    // 再次測試工具調用
    console.log("🔧 再次測試工具調用...");
    try {
      const result = await mcpClient.invokeTool(1, {}, { user_id: 1 });
      console.log("✅ 工具調用成功:", result);
    } catch (error) {
      console.log("❌ 工具調用失敗:", error.message);
    }

    // 最終狀態檢查
    const finalStatuses = mcpClient.getConnectionStatuses();
    console.log("📊 最終連接狀態:", finalStatuses);
  } catch (error) {
    console.error("❌ 測試失敗:", error);
  } finally {
    // 清理
    await mcpClient.disconnectAll();
    process.exit(0);
  }
}

// 運行測試
testMcpReconnect();
