/**
 * MCP 服務和工具同步腳本 (輕量執行腳本)
 * 調用 service 層進行實際的同步操作
 */

import path from "path";
import { fileURLToPath } from "url";

// 設定模組路徑
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 動態導入 service 層和資料庫配置
const mcpSyncService = await import("../../src/services/mcpSync.service.js");
const { initializeDatabase } = await import(
  "../../src/config/database.config.js"
);

/**
 * 主程式
 */
async function main() {
  console.log("🔄 MCP 服務和工具同步腳本");
  console.log("================================\n");

  try {
    // 初始化資料庫連接池
    await initializeDatabase();

    // 支援自定義端點參數
    const customEndpoint = process.argv[2]; // 從命令行參數獲取自定義端點

    if (customEndpoint) {
      console.log(`🌐 使用自定義端點: ${customEndpoint}`);
    } else {
      console.log(
        `🌐 使用預設端點: ${process.env.MCP_SERVER_URL || "http://localhost:8080"}`
      );
    }

    // 調用 service 層進行同步（支援自定義端點）
    const result = await mcpSyncService.default.syncAll(customEndpoint);

    if (result.success) {
      console.log("🎉 同步成功！");
      console.log(`✅ 同步了 ${result.data.services.length} 個服務`);
      console.log(`✅ 同步了 ${result.data.tools.length} 個工具`);

      if (result.data.services.length > 0) {
        console.log("\n📋 同步的服務：");
        result.data.services.forEach((service) => {
          console.log(
            `  - ${service.name} (${service.tools} 個工具) [${service.action}]`
          );
        });
      }

      if (result.data.tools.length > 0) {
        console.log("\n🔧 同步的工具：");
        result.data.tools.forEach((tool) => {
          console.log(`  - ${tool.service}/${tool.name} [${tool.action}]`);
        });
      }

      console.log("\n💡 使用方式：");
      console.log("  預設端點: node sync_mcp_services.js");
      console.log(
        "  自定義端點: node sync_mcp_services.js http://custom-server:8080"
      );
    } else {
      console.log("❌ 同步失敗：", result.message);

      if (result.error.includes("無法連接到 MCP Server")) {
        console.log("\n💡 解決建議：");
        console.log("1. 確認 MCP Server 是否在指定端點運行");
        console.log("2. 檢查網路連接");
        console.log("3. 確認 MCP Server 配置正確");
        console.log(
          "4. 嘗試使用自定義端點: node sync_mcp_services.js http://your-server:port"
        );
      }

      process.exit(1);
    }
  } catch (error) {
    console.error("💥 程式執行失敗:", error.message);
    process.exit(1);
  }

  console.log("\n================================");
  console.log("✨ 同步腳本執行完成！");
}

// 執行主程式
main().catch((error) => {
  console.error("💥 程式執行失敗:", error);
  process.exit(1);
});
