import McpToolModel from "../../src/models/McpTool.model.js";
import { initializeDatabase } from "../../src/config/database.config.js";

// 測試 MCP 工具獲取功能
async function testMcpTools() {
  console.log("🧪 開始測試 MCP 工具獲取功能...\n");

  // 初始化數據庫連接
  await initializeDatabase();

  try {
    // 1. 測試獲取所有啟用的工具
    console.log("📝 步驟 1: 獲取所有啟用的 MCP 工具");
    const enabledTools = await McpToolModel.getEnabledMcpTools();

    console.log("✅ 啟用工具獲取完成");
    console.log("工具數量:", enabledTools.length);

    if (enabledTools.length > 0) {
      console.log("\n🔧 工具詳情:");
      enabledTools.forEach((tool, index) => {
        console.log(`工具 ${index + 1}:`, {
          id: tool.id,
          name: tool.name,
          service_name: tool.service_name,
          description: tool.description?.substring(0, 100) + "...",
          has_schema: !!tool.input_schema,
        });
      });

      // 2. 測試 HR 工具
      const hrTools = enabledTools.filter(
        (tool) =>
          tool.service_name?.toLowerCase().includes("hr") ||
          tool.name === "get_employee_info"
      );

      console.log("\n👥 HR 相關工具:");
      hrTools.forEach((tool) => {
        console.log(`- ${tool.name}: ${tool.description?.substring(0, 50)}...`);
      });

      // 3. 測試工具 schema
      const employeeTool = enabledTools.find(
        (tool) => tool.name === "get_employee_info"
      );
      if (employeeTool) {
        console.log("\n📋 get_employee_info 工具詳情:");
        console.log("- ID:", employeeTool.id);
        console.log("- 服務:", employeeTool.service_name);
        console.log("- 描述:", employeeTool.description);
        console.log("- Schema:", employeeTool.input_schema);

        try {
          const schema = JSON.parse(employeeTool.input_schema);
          console.log("- 解析後的 Schema:", JSON.stringify(schema, null, 2));
        } catch (e) {
          console.log("- Schema 解析失敗:", e.message);
        }
      } else {
        console.log("\n❌ 未找到 get_employee_info 工具");
      }
    } else {
      console.log("❌ 沒有找到任何啟用的工具");
    }
  } catch (error) {
    console.error("❌ 測試失敗:", error.message);
    console.error("錯誤堆疊:", error.stack);
  }
}

// 執行測試
testMcpTools();
