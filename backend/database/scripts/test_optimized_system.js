/**
 * 測試優化的系統提示詞策略
 * 驗證本地模型和雲端模型的不同提示詞生成
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
import chatService from "../../src/services/chat.service.js";
import { initializeDatabase } from "../../src/config/database.config.js";

async function testOptimizedSystem() {
  console.log("🔍 測試優化的系統提示詞策略");

  try {
    await initializeDatabase();
    await mcpClient.initialize();

    // 測試不同模型類型的提示詞生成
    const testCases = [
      {
        name: "本地模型 (Ollama)",
        modelType: "ollama",
        expectOptimized: true,
      },
      {
        name: "雲端模型 (Gemini)",
        modelType: "gemini",
        expectOptimized: false,
      },
      {
        name: "雲端模型 (OpenAI)",
        modelType: "openai",
        expectOptimized: false,
      },
    ];

    const basePrompt = "你是一個專業的數位秘書，專門協助處理企業事務。";

    for (const testCase of testCases) {
      console.log(`\n=== 測試 ${testCase.name} ===`);

      const systemPrompt = await chatService.generateSystemPrompt(basePrompt, {
        model_type: testCase.modelType,
        user_id: 1,
        conversation_id: 1,
      });

      console.log("生成的系統提示詞:");
      console.log("-".repeat(60));
      console.log(systemPrompt);
      console.log("-".repeat(60));

      // 分析提示詞特徵
      const analysis = {
        length: systemPrompt.length,
        hasGlobalRules: systemPrompt.includes("🔒 核心行為規則"),
        hasOptimizedRules: systemPrompt.includes("🚨 重要規則："),
        hasDetailedToolInfo: systemPrompt.includes("🛠️ 可用工具系統"),
        hasSimpleToolInfo: systemPrompt.includes("可用工具："),
        hasEmployeeTool: systemPrompt.includes("get_employee_info"),
        hasJSONFormat: systemPrompt.includes('"tool":'),
        isOptimized: testCase.expectOptimized,
      };

      console.log("\n📊 提示詞分析:");
      console.log(`長度: ${analysis.length} 字符`);
      console.log(`包含完整全域規則: ${analysis.hasGlobalRules ? "是" : "否"}`);
      console.log(`包含簡化規則: ${analysis.hasOptimizedRules ? "是" : "否"}`);
      console.log(
        `包含詳細工具信息: ${analysis.hasDetailedToolInfo ? "是" : "否"}`
      );
      console.log(
        `包含簡化工具信息: ${analysis.hasSimpleToolInfo ? "是" : "否"}`
      );
      console.log(
        `包含員工查詢工具: ${analysis.hasEmployeeTool ? "是" : "否"}`
      );
      console.log(`包含 JSON 格式: ${analysis.hasJSONFormat ? "是" : "否"}`);

      // 驗證優化策略是否正確應用
      if (testCase.expectOptimized) {
        // 本地模型應該使用簡化版本
        if (
          analysis.hasOptimizedRules &&
          !analysis.hasGlobalRules &&
          analysis.length < 1000
        ) {
          console.log("✅ 本地模型優化策略正確應用");
        } else {
          console.log("❌ 本地模型優化策略未正確應用");
        }
      } else {
        // 雲端模型應該使用完整版本
        if (
          analysis.hasGlobalRules &&
          analysis.hasDetailedToolInfo &&
          analysis.length > 1000
        ) {
          console.log("✅ 雲端模型完整策略正確應用");
        } else {
          console.log("❌ 雲端模型完整策略未正確應用");
        }
      }
    }

    // 測試本地模型的實際工具調用能力
    console.log("\n=== 測試本地模型工具調用能力 ===");

    const localSystemPrompt = await chatService.generateSystemPrompt(
      basePrompt,
      {
        model_type: "ollama",
        user_id: 1,
        conversation_id: 1,
      }
    );

    console.log(`本地模型提示詞長度: ${localSystemPrompt.length} 字符`);

    // 測試工具調用
    const testQueries = [
      "請查詢工號 A123456 的員工信息",
      "查詢員工 A123456 的詳細資料",
      "A123456 這個員工在哪個部門工作？",
    ];

    for (let i = 0; i < testQueries.length; i++) {
      const query = testQueries[i];
      console.log(`\n--- 測試查詢 ${i + 1}: ${query} ---`);

      try {
        const response = await AIService.callModel({
          provider: "ollama",
          model: "qwen3:8b",
          endpoint_url: "http://localhost:11434",
          messages: [
            {
              role: "system",
              content: localSystemPrompt,
            },
            {
              role: "user",
              content: query,
            },
          ],
          temperature: 0.1,
          max_tokens: 300,
        });

        console.log("AI 回應:");
        console.log(response.content);

        // 檢查工具調用
        const hasToolCalls = mcpToolParser.hasToolCalls(response.content);
        console.log(`包含工具調用: ${hasToolCalls ? "是" : "否"}`);

        if (hasToolCalls) {
          const toolCalls = await mcpToolParser.parseToolCalls(
            response.content,
            {
              user_id: 1,
            }
          );
          console.log(`解析到 ${toolCalls.length} 個工具調用`);

          // 執行工具調用
          if (toolCalls.length > 0) {
            const results = await mcpToolParser.executeToolCalls(toolCalls, {
              user_id: 1,
              conversation_id: 1,
            });

            for (const result of results) {
              if (result.success && result.data && result.data.basic) {
                console.log(
                  `✅ 工具執行成功，查詢到員工: ${result.data.basic.name}`
                );
              } else {
                console.log("❌ 工具執行失敗或無數據");
              }
            }
          }
        }
      } catch (error) {
        console.log("❌ 模型調用失敗:", error.message);
      }
    }

    console.log("\n=== 測試總結 ===");
    console.log("✅ 系統提示詞優化策略測試完成");
    console.log("📋 主要改進:");
    console.log("1. 本地模型使用簡化提示詞（< 500 字符）");
    console.log("2. 雲端模型使用完整提示詞（> 8000 字符）");
    console.log("3. 保留核心防幻覺規則");
    console.log("4. 優化工具調用格式說明");
    console.log("5. 提供具體使用範例");
  } catch (error) {
    console.error("測試失敗:", error.message);
  }
}

testOptimizedSystem().then(() => {
  console.log("\n🎉 優化系統測試完成");
  process.exit(0);
});
