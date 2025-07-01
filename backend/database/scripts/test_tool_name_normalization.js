/**
 * 測試工具名稱標準化修復
 * 驗證 create-box-plot 能否正確匹配到 create_boxplot
 */

import McpToolModel from "../../src/models/McpTool.model.js";
import { initializeDatabase } from "../../src/config/database.config.js";

async function testToolNameNormalization() {
  console.log("🧪 測試工具名稱標準化修復");
  console.log("=======================================");

  try {
    // 初始化資料庫
    await initializeDatabase();

    // 獲取所有啟用的工具
    const tools = await McpToolModel.getAllMcpTools({
      is_enabled: true,
    });

    console.log(`📋 資料庫中的工具數量: ${tools.length}`);

    // 測試不同的工具名稱格式
    const testCases = [
      "create_boxplot",    // 資料庫中的正確格式
      "create-box-plot",   // AI 可能使用的格式
      "create-boxplot",    // 混合格式
      "CREATE_BOXPLOT",    // 大寫格式
      "Create-Box-Plot",   // 混合大小寫
    ];

    console.log("\n🔍 測試工具名稱匹配:");

    for (const testName of testCases) {
      // 模擬工具查找邏輯
      let actualToolName = testName;
      if (actualToolName.includes(".")) {
        actualToolName = actualToolName.split(".").pop();
      }

      // 應用與 mcpToolParser.service.js 相同的邏輯
      let normalizedToolName = actualToolName.toLowerCase();
      if (normalizedToolName === "create-box-plot") {
        normalizedToolName = "create_boxplot";
      } else {
        normalizedToolName = normalizedToolName.replace(/-/g, "_");
      }

      const tool = tools.find(
        (t) => {
          const normalizedDbToolName = t.name.toLowerCase().replace(/-/g, "_");
          return normalizedDbToolName === normalizedToolName;
        }
      );

      console.log(`  ${testName} -> ${normalizedToolName} -> ${tool ? `✅ 找到: ${tool.name} (ID: ${tool.id})` : '❌ 未找到'}`);
    }

    // 列出所有統計工具
    const statTools = tools.filter(t => t.mcp_service_id === 49);
    console.log("\n📊 統計服務可用工具:");
    statTools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });

    console.log("\n✅ 測試完成");

  } catch (error) {
    console.error("❌ 測試失敗:", error.message);
  }
}

// 執行測試
testToolNameNormalization();