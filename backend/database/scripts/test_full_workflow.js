#!/usr/bin/env node

/**
 * 完整工作流程測試腳本
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../../.env") });

import AIService from "../../src/services/ai.service.js";
import mcpToolParser from "../../src/services/mcpToolParser.service.js";
import mcpClient from "../../src/services/mcp.service.js";
import { initializeDatabase } from "../../src/config/database.config.js";

async function testFullWorkflow() {
  console.log("🔍 測試完整工作流程");

  try {
    await initializeDatabase();
    await mcpClient.initialize();

    // 使用簡化的系統提示詞
    const simplePrompt = `你是一個AI助手，可以使用工具來查詢資料。

可用工具：
- get_employee_info: 查詢員工資訊，參數：employeeId（員工編號，如A123456）

工具調用格式：
{"tool": "get_employee_info", "parameters": {"employeeId": "A123456"}}

當用戶要求查詢員工資訊時，請使用工具調用格式回應。`;

    console.log("=== 第一步：AI 生成工具調用 ===");

    const response = await AIService.callModel({
      provider: "ollama",
      model: "qwen3:8b",
      endpoint_url: "http://localhost:11434",
      messages: [
        {
          role: "system",
          content: simplePrompt,
        },
        {
          role: "user",
          content: "請查詢工號 A123456 的員工信息",
        },
      ],
      temperature: 0.1,
      max_tokens: 200,
    });

    console.log("AI 回應:", response.content);

    console.log("\n=== 第二步：解析工具調用 ===");

    const hasToolCalls = mcpToolParser.hasToolCalls(response.content);
    console.log("包含工具調用:", hasToolCalls);

    if (!hasToolCalls) {
      console.log("❌ 未檢測到工具調用，測試結束");
      return;
    }

    const toolCalls = await mcpToolParser.parseToolCalls(response.content, {
      user_id: 1,
    });

    console.log("解析到工具調用數量:", toolCalls.length);
    toolCalls.forEach((call, idx) => {
      console.log(`${idx + 1}. 工具: ${call.name}, 參數:`, call.parameters);
    });

    console.log("\n=== 第三步：執行工具調用 ===");

    // 使用 mcpToolParser 的 executeToolCalls 方法，它會自動查找工具 ID
    const results = await mcpToolParser.executeToolCalls(toolCalls, {
      user_id: 1,
      conversation_id: 1,
    });

    console.log("工具執行結果數量:", results.length);

    for (const result of results) {
      if (result.success) {
        console.log("✅ 工具執行成功!");
        console.log("工具名稱:", result.tool_name);
        console.log("服務名稱:", result.service_name);
        console.log("執行時間:", result.execution_time + "ms");

        if (result.data) {
          console.log("\n📊 員工資訊:");
          if (result.data.basic) {
            console.log("姓名:", result.data.basic.name || "未提供");
            console.log("員工編號:", result.data.basic.employeeId || "未提供");
            console.log("入職日期:", result.data.basic.hireDate || "未提供");
          }
          if (result.data.department) {
            console.log(
              "部門:",
              result.data.department.departmentName || "未提供"
            );
            console.log(
              "部門代碼:",
              result.data.department.departmentCode || "未提供"
            );
          }
          if (result.data.position) {
            console.log("職位:", result.data.position.jobTitle || "未提供");
            console.log("職級:", result.data.position.jobLevel || "未提供");
          }
        }
      } else {
        console.log("❌ 工具執行失敗:", result.error);
      }
    }

    console.log("\n=== 第四步：生成最終回應 ===");

    // 模擬第二次 AI 調用，整合工具結果
    const finalPrompt = `基於以下工具執行結果，為用戶提供友好的回應：

工具調用結果：員工 A123456 的資訊已成功查詢。

請用中文回應用戶。`;

    const finalResponse = await AIService.callModel({
      provider: "ollama",
      model: "qwen3:8b",
      endpoint_url: "http://localhost:11434",
      messages: [
        {
          role: "system",
          content:
            "你是一個友好的AI助手，請根據工具執行結果為用戶提供清晰的回應。",
        },
        {
          role: "user",
          content: finalPrompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 300,
    });

    console.log("最終回應:", finalResponse.content);
  } catch (error) {
    console.error("測試失敗:", error.message);
  }
}

testFullWorkflow().then(() => {
  console.log("\n🎉 完整工作流程測試完成");
  process.exit(0);
});
