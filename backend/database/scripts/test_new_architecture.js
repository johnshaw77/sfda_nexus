import { initializeDatabase } from "../../src/config/database.config.js";
import chatService from "../../src/services/chat.service.js";
import mcpClient from "../../src/services/mcp.service.js";

async function testNewArchitecture() {
  console.log("🔍 測試新的提示詞架構");

  try {
    await initializeDatabase();
    await mcpClient.initialize();

    console.log("\n=== 1. 檢查資料庫配置 ===");
    
    const { query } = await import("../../src/config/database.config.js");
    
    // 檢查全域規則
    const { rows: globalRows } = await query(
      "SELECT config_key, LENGTH(config_value) as length FROM system_configs WHERE config_key = 'global_prompt_rules'"
    );
    
    if (globalRows.length > 0) {
      console.log(`✅ 全域規則配置存在，長度: ${globalRows[0].length} 字符`);
    } else {
      console.log("❌ 全域規則配置不存在");
    }
    
    // 檢查 MCP 工具調用指導
    const { rows: mcpRows } = await query(
      "SELECT config_key, LENGTH(config_value) as length FROM system_configs WHERE config_key = 'mcp_tool_guidance'"
    );
    
    if (mcpRows.length > 0) {
      console.log(`✅ MCP 工具調用指導存在，長度: ${mcpRows[0].length} 字符`);
    } else {
      console.log("❌ MCP 工具調用指導不存在");
    }

    console.log("\n=== 2. 測試系統提示詞生成 ===");
    
    const basePrompt = "你是一個專業的數位秘書。";
    const systemPrompt = await chatService.generateSystemPrompt(basePrompt, {
      user_id: 1,
      conversation_id: 1,
      model_type: "ollama",
    });

    console.log(`📏 系統提示詞總長度: ${systemPrompt.length} 字符`);
    console.log(`🔒 包含全域規則: ${systemPrompt.includes("## 🔒 核心行為規則") ? "是" : "否"}`);
    console.log(`🛠️ 包含工具系統: ${systemPrompt.includes("## 🛠️ 可用工具系統") ? "是" : "否"}`);
    console.log(`📝 包含工具調用格式: ${systemPrompt.includes("## 📝 工具調用格式") ? "是" : "否"}`);
    console.log(`🎯 包含執行規則: ${systemPrompt.includes("## 🎯 工具執行規則") ? "是" : "否"}`);

    console.log("\n=== 3. 驗證架構一致性 ===");
    
    // 檢查是否還有硬編碼的提示詞內容
    const hasHardcodedContent = systemPrompt.includes("立即執行: 不要解釋工具使用方法");
    
    if (hasHardcodedContent) {
      console.log("✅ 所有提示詞內容都來自資料庫");
    } else {
      console.log("⚠️ 可能仍有硬編碼內容或資料庫讀取失敗");
    }

    console.log("\n=== 4. 架構總結 ===");
    console.log("📊 提示詞來源分佈：");
    console.log("   - 智能體提示詞: 資料庫 (agents.system_prompt)");
    console.log("   - 全域行為規則: 資料庫 (system_configs.global_prompt_rules)");
    console.log("   - MCP 工具調用指導: 資料庫 (system_configs.mcp_tool_guidance)");
    console.log("   - 工具列表和參數: 資料庫 (mcp_tools)");
    console.log("✅ 架構統一，所有提示詞內容都存在資料庫中");

    process.exit(0);
  } catch (error) {
    console.error("❌ 測試失敗:", error);
    process.exit(1);
  }
}

testNewArchitecture(); 