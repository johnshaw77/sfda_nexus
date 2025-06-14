/**
 * 簡化的本地模型工具調用測試腳本
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// 設置環境變數
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../../.env") });

import AIService from "../../src/services/ai.service.js";
import mcpToolParser from "../../src/services/mcpToolParser.service.js";
import chatService from "../../src/services/chat.service.js";
import { query, initializeDatabase } from "../../src/config/database.config.js";

async function testLocalModelToolCalls() {
  console.log("🔍 開始本地模型工具調用測試");
  console.log("=".repeat(60));

  try {
    // 初始化數據庫連接
    await initializeDatabase();
    // 1. 檢查服務配置
    console.log("\n=== 檢查 MCP 服務配置 ===");
    const { rows: services } = await query(
      "SELECT * FROM mcp_services WHERE is_active = TRUE ORDER BY id"
    );

    console.log(`找到 ${services.length} 個啟用的 MCP 服務:`);
    services.forEach((service) => {
      console.log(
        `  ID: ${service.id}, 名稱: ${service.name}, 端點: ${service.endpoint_url}`
      );
    });

    // 檢查重複服務
    const hrServices = services.filter((s) =>
      s.endpoint_url.includes("localhost:8080")
    );
    if (hrServices.length > 1) {
      console.log("⚠️ 發現重複的 HR 服務配置:");
      hrServices.forEach((s) =>
        console.log(`  ID: ${s.id}, 端點: ${s.endpoint_url}`)
      );
    }

    // 2. 測試工具調用解析器
    console.log("\n=== 測試工具調用解析器 ===");
    const parser = mcpToolParser;

    const testResponse = `我來幫您查詢工號 A123456 的員工信息。

\`\`\`json
{
  "tool": "get_employee_info",
  "parameters": {
    "employeeId": "A123456"
  }
}
\`\`\`

正在查詢中...`;

    console.log("測試回應:");
    console.log(testResponse);

    const hasToolCalls = parser.hasToolCalls(testResponse);
    console.log("包含工具調用:", hasToolCalls);

    if (hasToolCalls) {
      const toolCalls = await parser.parseToolCalls(testResponse, {
        user_id: 1,
      });
      console.log("解析到的工具調用數量:", toolCalls.length);

      if (toolCalls.length > 0) {
        console.log("工具調用詳情:");
        toolCalls.forEach((call, index) => {
          console.log(
            `  ${index + 1}. 工具: ${call.name}, 格式: ${call.format}`
          );
          console.log(`     參數:`, JSON.stringify(call.parameters, null, 2));
        });
      }
    }

    // 3. 測試完整流程
    console.log("\n=== 測試完整工具調用流程 ===");

    const result = await chatService.processChatMessage(testResponse, {
      user_id: 1,
      conversation_id: 1,
      model_id: 1,
    });

    console.log("處理結果:");
    console.log("- 包含工具調用:", result.has_tool_calls);
    console.log("- 工具調用數量:", result.tool_calls?.length || 0);
    console.log("- 工具結果數量:", result.tool_results?.length || 0);
    console.log("- 使用二次 AI:", result.used_secondary_ai);

    if (result.tool_results && result.tool_results.length > 0) {
      console.log("工具執行結果:");
      result.tool_results.forEach((toolResult, index) => {
        console.log(
          `  ${index + 1}. ${toolResult.tool_name}: ${toolResult.success ? "成功" : "失敗"}`
        );
        if (toolResult.success) {
          console.log(`     數據:`, JSON.stringify(toolResult.data, null, 2));
        } else {
          console.log(`     錯誤: ${toolResult.error}`);
        }
      });
    }

    // 4. 測試本地模型回應（如果 Ollama 可用）
    console.log("\n=== 測試本地模型回應 ===");

    try {
      // 獲取系統提示詞
      const systemPrompt = await chatService.generateSystemPrompt("", {
        user_id: 1,
        conversation_id: 1,
        model_type: "ollama",
      });

      console.log("系統提示詞長度:", systemPrompt.length);
      console.log("包含工具信息:", systemPrompt.includes("可用工具系統"));
      console.log("包含員工工具:", systemPrompt.includes("get_employee_info"));

      // 測試 qwen3:32b 模型
      const response = await AIService.callModel({
        provider: "ollama",
        model: "qwen3:32b",
        endpoint_url: "http://localhost:11434/api/chat",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: "請查詢工號 A123456 的員工信息",
          },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      });

      console.log("✅ 本地模型回應成功");
      console.log("回應長度:", response.content.length);
      console.log("回應內容:");
      console.log("-".repeat(50));
      console.log(response.content);
      console.log("-".repeat(50));

      // 檢查回應中是否包含工具調用
      const localHasToolCalls = parser.hasToolCalls(response.content);
      console.log("本地模型回應包含工具調用:", localHasToolCalls);

      if (localHasToolCalls) {
        const localToolCalls = await parser.parseToolCalls(response.content, {
          user_id: 1,
        });
        console.log("本地模型工具調用數量:", localToolCalls.length);

        if (localToolCalls.length > 0) {
          console.log("本地模型工具調用詳情:");
          localToolCalls.forEach((call, index) => {
            console.log(
              `  ${index + 1}. 工具: ${call.name}, 格式: ${call.format}`
            );
            console.log(`     參數:`, JSON.stringify(call.parameters, null, 2));
          });
        }
      } else {
        console.log("❌ 本地模型未生成工具調用");
        console.log("分析:");
        console.log("- 包含 'tool' 關鍵字:", response.content.includes("tool"));
        console.log("- 包含 JSON 格式:", response.content.includes("{"));
        console.log(
          "- 包含工具名稱:",
          response.content.includes("get_employee_info")
        );
      }
    } catch (modelError) {
      console.log("❌ 本地模型測試失敗:", modelError.message);
      console.log("可能原因: Ollama 服務未啟動或模型不可用");
    }

    console.log("\n✅ 測試完成");
  } catch (error) {
    console.error("❌ 測試失敗:", error.message);
    console.error(error);
  }
}

// 執行測試
testLocalModelToolCalls()
  .then(() => {
    console.log("\n🏁 測試結束");
    process.exit(0);
  })
  .catch((error) => {
    console.error("測試失敗:", error);
    process.exit(1);
  });
