import { GetCountByTool } from "./sfda_mcpserver/mcp-server/src/tools/mil/get-count-by.js";

async function testTool() {
  try {
    console.log("🔧 測試修正後的 get-count-by 工具...");

    const tool = new GetCountByTool();
    console.log("✅ 工具實例化成功");
    console.log("- 工具名稱:", tool.name);
    console.log("- 工具描述:", tool.description);

    // 簡單檢查工具結構
    console.log("- 是否有 _execute 方法:", typeof tool._execute === "function");
    console.log("- inputSchema:", tool.inputSchema);
  } catch (error) {
    console.error("❌ 工具實例化失敗:", error.message);
    console.error("錯誤詳情:", error.stack);
  }
}

testTool();
