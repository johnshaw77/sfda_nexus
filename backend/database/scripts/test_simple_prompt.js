/**
 * 簡化提示詞測試腳本
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

async function testSimplePrompt() {
  console.log("🔍 測試簡化提示詞");

  try {
    await initializeDatabase();
    await mcpClient.initialize();

    // 使用非常簡化的系統提示詞
    const simplePrompt = `你是一個AI助手，可以使用工具來查詢資料。

可用工具：
- get_employee_info: 查詢員工資訊，參數：employeeId（員工編號，如A123456）

工具調用格式：
{"tool": "get_employee_info", "parameters": {"employeeId": "A123456"}}

當用戶要求查詢員工資訊時，請使用工具調用格式回應。`;

    console.log("簡化提示詞長度:", simplePrompt.length);

    // 測試不同的用戶請求
    const testCases = [
      "請查詢工號 A123456 的員工信息",
      "查詢員工 A123456",
      "我想知道 A123456 這個員工的資料",
      "幫我查一下 A123456",
    ];

    for (let i = 0; i < testCases.length; i++) {
      const userMessage = testCases[i];
      console.log(`\n=== 測試案例 ${i + 1}: ${userMessage} ===`);

      try {
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
              content: userMessage,
            },
          ],
          temperature: 0.1,
          max_tokens: 200,
        });

        console.log("模型回應:");
        console.log("-".repeat(40));
        console.log(response.content);
        console.log("-".repeat(40));

        // 檢查工具調用
        const hasToolCalls = mcpToolParser.hasToolCalls(response.content);
        console.log("包含工具調用:", hasToolCalls);

        if (hasToolCalls) {
          const toolCalls = await mcpToolParser.parseToolCalls(
            response.content,
            {
              user_id: 1,
            }
          );
          console.log("✅ 成功解析工具調用:", toolCalls.length);
          toolCalls.forEach((call, idx) => {
            console.log(
              `${idx + 1}. 工具: ${call.name}, 參數:`,
              call.parameters
            );
          });
        } else {
          console.log("❌ 未檢測到工具調用");
        }
      } catch (error) {
        console.log("❌ 模型調用失敗:", error.message);
      }
    }
  } catch (error) {
    console.error("測試失敗:", error.message);
  }
}

testSimplePrompt().then(() => {
  console.log("\n測試完成");
  process.exit(0);
});
