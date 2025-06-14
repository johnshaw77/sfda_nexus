import mysql from "mysql2/promise";
import { initializeDatabase } from "../../src/config/database.config.js";
import mcpClient from "../../src/services/mcp.service.js";
import chatService from "../../src/services/chat.service.js";

async function debugSystemPrompt() {
  console.log("🔍 調試系統提示詞內容");

  try {
    // 初始化資料庫
    await initializeDatabase();

    // 初始化 MCP 服務
    await mcpClient.initialize();

    // 生成系統提示詞
    const systemPrompt = await chatService.generateSystemPrompt();

    console.log("=== 系統提示詞完整內容 ===");
    console.log(systemPrompt);
    console.log("=== 系統提示詞結束 ===");

    // 檢查關鍵部分
    console.log("\n=== 關鍵內容檢查 ===");
    console.log("總長度:", systemPrompt.length);
    console.log("包含工具信息:", systemPrompt.includes("工具"));
    console.log(
      "包含 get_employee_info:",
      systemPrompt.includes("get_employee_info")
    );
    console.log("包含 JSON 格式:", systemPrompt.includes("JSON"));
    console.log("包含工具調用範例:", systemPrompt.includes("tool"));

    // 搜尋工具相關段落
    const toolSections = [];
    const lines = systemPrompt.split("\n");
    let inToolSection = false;
    let currentSection = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (
        line.includes("工具") ||
        line.includes("tool") ||
        line.includes("get_employee_info")
      ) {
        if (!inToolSection) {
          inToolSection = true;
          currentSection = [];
        }
        currentSection.push(`${i + 1}: ${line}`);
      } else if (inToolSection && line.trim() === "") {
        toolSections.push(currentSection.join("\n"));
        inToolSection = false;
        currentSection = [];
      } else if (inToolSection) {
        currentSection.push(`${i + 1}: ${line}`);
      }
    }

    if (currentSection.length > 0) {
      toolSections.push(currentSection.join("\n"));
    }

    console.log("\n=== 工具相關段落 ===");
    toolSections.forEach((section, index) => {
      console.log(`\n--- 段落 ${index + 1} ---`);
      console.log(section);
    });
  } catch (error) {
    console.error("❌ 調試失敗:", error);
  }

  process.exit(0);
}

debugSystemPrompt();
