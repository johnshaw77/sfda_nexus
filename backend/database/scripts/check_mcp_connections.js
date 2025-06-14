/**
 * 檢查 MCP 客戶端連接狀態的腳本
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// 設置環境變數
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../../.env") });

import mcpClient from "../../src/services/mcp.service.js";
import { query, initializeDatabase } from "../../src/config/database.config.js";

async function checkMcpConnections() {
  console.log("🔍 檢查 MCP 客戶端連接狀態");
  console.log("=".repeat(60));

  try {
    // 初始化數據庫連接
    await initializeDatabase();

    // 檢查數據庫中的服務配置
    console.log("\n=== 數據庫中的 MCP 服務 ===");
    const { rows: services } = await query(
      "SELECT id, name, endpoint_url, is_active FROM mcp_services ORDER BY id"
    );

    console.log(`找到 ${services.length} 個 MCP 服務:`);
    services.forEach((service) => {
      console.log(
        `  ID: ${service.id}, 名稱: ${service.name}, 端點: ${service.endpoint_url}, 啟用: ${service.is_active}`
      );
    });

    // 初始化 MCP 客戶端
    console.log("\n=== 初始化 MCP 客戶端 ===");
    await mcpClient.initialize();

    // 檢查連接狀態
    console.log("\n=== MCP 客戶端連接狀態 ===");
    const connectionStatuses = mcpClient.getConnectionStatuses();

    if (connectionStatuses.length === 0) {
      console.log("❌ 沒有已連接的 MCP 服務");
    } else {
      console.log(`找到 ${connectionStatuses.length} 個已連接的服務:`);
      connectionStatuses.forEach((status) => {
        console.log(`  服務 ID: ${status.service_id}`);
        console.log(`  服務名稱: ${status.service_name}`);
        console.log(`  端點: ${status.endpoint_url}`);
        console.log(
          `  連接狀態: ${status.connected ? "✅ 已連接" : "❌ 未連接"}`
        );
        console.log(`  最後測試: ${status.last_test}`);
        console.log("");
      });
    }

    // 進行健康檢查
    console.log("\n=== 進行健康檢查 ===");
    const healthResults = await mcpClient.healthCheck();

    if (healthResults.length === 0) {
      console.log("沒有服務需要檢查");
    } else {
      healthResults.forEach((result) => {
        console.log(`服務 ${result.service_id} (${result.service_name}):`);
        console.log(`  端點: ${result.endpoint_url}`);
        console.log(`  狀態: ${result.success ? "✅ 正常" : "❌ 異常"}`);
        console.log(`  響應時間: ${result.response_time || "N/A"}ms`);
        if (result.error) {
          console.log(`  錯誤: ${result.error}`);
        }
        console.log("");
      });
    }

    // 測試工具調用
    console.log("\n=== 測試工具調用 ===");
    const { rows: tools } = await query(
      "SELECT id, name, mcp_service_id FROM mcp_tools WHERE name = 'get_employee_info' AND is_enabled = TRUE LIMIT 1"
    );

    if (tools.length > 0) {
      const tool = tools[0];
      console.log(
        `測試工具: ${tool.name} (ID: ${tool.id}, 服務 ID: ${tool.mcp_service_id})`
      );

      try {
        const result = await mcpClient.invokeTool(
          tool.id,
          { employeeId: "A123456" },
          { user_id: 1 }
        );

        if (result.success) {
          console.log("✅ 工具調用成功");
          console.log("執行時間:", result.execution_time + "ms");
          console.log("員工姓名:", result.data?.basic?.name || "未知");
        } else {
          console.log("❌ 工具調用失敗:", result.error);
        }
      } catch (error) {
        console.log("❌ 工具調用異常:", error.message);
      }
    } else {
      console.log("未找到可測試的工具");
    }

    console.log("\n✅ 檢查完成");
  } catch (error) {
    console.error("❌ 檢查失敗:", error.message);
    console.error(error);
  }
}

// 執行檢查
checkMcpConnections()
  .then(() => {
    console.log("\n🏁 檢查結束");
    process.exit(0);
  })
  .catch((error) => {
    console.error("檢查失敗:", error);
    process.exit(1);
  });
