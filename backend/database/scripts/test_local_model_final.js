/**
 * 最終的本地模型工具調用測試腳本
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../../.env") });

import AIService from "../../src/services/ai.service.js";
import mcpToolParser from "../../src/services/mcpToolParser.service.js";
import chatService from "../../src/services/chat.service.js";
import mcpClient from "../../src/services/mcp.service.js";
import { initializeDatabase } from "../../src/config/database.config.js";

async function testLocalModel() {
  console.log("🔍 測試本地模型工具調用");

  try {
    await initializeDatabase();
    await mcpClient.initialize();

    // 獲取系統提示詞
    const systemPrompt = await chatService.generateSystemPrompt(
      "你是一個專業的數位秘書。",
      {
        user_id: 1,
        conversation_id: 1,
        model_type: "ollama",
      }
    );

    console.log("系統提示詞長度:", systemPrompt.length);
    console.log("包含工具信息:", systemPrompt.includes("可用工具系統"));

    // 測試 qwen3:8b 模型（較小，響應更快）
    try {
      const response = await AIService.callModel({
        provider: "ollama",
        model: "qwen3:8b",
        endpoint_url: "http://localhost:11434",
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
        temperature: 0.1,
        max_tokens: 500,
      });

      console.log("✅ 模型回應成功");
      console.log("回應內容:");
      console.log("-".repeat(50));
      console.log(response.content);
      console.log("-".repeat(50));

      // 檢查工具調用
      const hasToolCalls = mcpToolParser.hasToolCalls(response.content);
      console.log("包含工具調用:", hasToolCalls);

      if (hasToolCalls) {
        const toolCalls = await mcpToolParser.parseToolCalls(response.content, {
          user_id: 1,
        });
        console.log("解析到工具調用數量:", toolCalls.length);

        if (toolCalls.length > 0) {
          console.log("✅ 本地模型成功生成工具調用！");
          toolCalls.forEach((call, idx) => {
            console.log(
              `${idx + 1}. 工具: ${call.name}, 參數:`,
              call.parameters
            );
          });
        }
      } else {
        console.log("❌ 本地模型未生成工具調用");
      }
    } catch (error) {
      console.log("❌ 模型調用失敗:", error.message);
    }
  } catch (error) {
    console.error("測試失敗:", error.message);
  }
}

testLocalModel().then(() => {
  console.log("測試完成");
  process.exit(0);
});
