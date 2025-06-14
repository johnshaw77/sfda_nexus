/**
 * 測試最終優化的系統提示詞策略
 * 驗證本地模型的簡化提示詞效果
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

async function testFinalOptimization() {
  console.log("🔍 測試最終優化的系統提示詞策略");

  try {
    await initializeDatabase();
    await mcpClient.initialize();

    const basePrompt = "你是一個專業的數位秘書，專門協助處理企業事務。";

    // 生成本地模型的優化提示詞
    const localSystemPrompt = await chatService.generateSystemPrompt(
      basePrompt,
      {
        model_type: "ollama",
        user_id: 1,
        conversation_id: 1,
      }
    );

    console.log("=== 本地模型優化提示詞 ===");
    console.log(localSystemPrompt);
    console.log("=== 提示詞結束 ===");

    console.log(`\n📊 提示詞分析:`);
    console.log(`長度: ${localSystemPrompt.length} 字符`);
    console.log(
      `包含簡化規則: ${localSystemPrompt.includes("🚨 重要規則：") ? "是" : "否"}`
    );
    console.log(
      `包含工具列表: ${localSystemPrompt.includes("可用工具：") ? "是" : "否"}`
    );
    console.log(
      `包含範例: ${localSystemPrompt.includes("範例：") ? "是" : "否"}`
    );

    // 測試工具調用能力
    console.log("\n=== 測試工具調用能力 ===");

    const testQueries = [
      "請查詢工號 A123456 的員工信息",
      "A123456 這個員工在哪個部門？",
      "查詢員工 A999999 的資料",
    ];

    let successCount = 0;
    let totalTests = testQueries.length;

    for (let i = 0; i < testQueries.length; i++) {
      const query = testQueries[i];
      console.log(`\n--- 測試 ${i + 1}: ${query} ---`);

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
          max_tokens: 200,
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

          if (toolCalls.length > 0) {
            console.log(`✅ 成功生成工具調用: ${toolCalls[0].name}`);
            successCount++;

            // 執行工具調用驗證
            const results = await mcpToolParser.executeToolCalls(toolCalls, {
              user_id: 1,
              conversation_id: 1,
            });

            for (const result of results) {
              if (result.success && result.data && result.data.basic) {
                console.log(
                  `✅ 工具執行成功，查詢到員工: ${result.data.basic.name}`
                );
              } else if (!result.success) {
                console.log(`❌ 工具執行失敗: ${result.error}`);
              } else {
                console.log("❌ 工具執行成功但無數據");
              }
            }
          }
        } else {
          console.log("❌ 未生成工具調用");
        }

        // 檢查是否有幻覺
        const responseText = response.content.toLowerCase();
        const hallucinationKeywords = [
          "白勝宇",
          "it部門",
          "軟體工程師",
          "資訊技術部",
        ];

        const foundHallucinations = hallucinationKeywords.filter(
          (keyword) => responseText.includes(keyword) && !hasToolCalls
        );

        if (foundHallucinations.length > 0) {
          console.log("⚠️ 可能的幻覺跡象:", foundHallucinations);
        } else {
          console.log("✅ 未發現明顯幻覺");
        }
      } catch (error) {
        console.log("❌ 模型調用失敗:", error.message);
      }
    }

    // 計算成功率
    const successRate = ((successCount / totalTests) * 100).toFixed(1);
    console.log(`\n=== 測試結果總結 ===`);
    console.log(
      `工具調用成功率: ${successRate}% (${successCount}/${totalTests})`
    );
    console.log(`提示詞長度: ${localSystemPrompt.length} 字符`);

    if (successRate >= 80 && localSystemPrompt.length < 1000) {
      console.log("🎉 優化策略成功！本地模型工具調用能力良好且提示詞簡潔");
    } else if (successRate >= 80) {
      console.log("⚠️ 工具調用成功但提示詞仍可進一步簡化");
    } else {
      console.log("❌ 需要進一步優化提示詞策略");
    }

    // 比較與雲端模型的差異
    console.log("\n=== 與雲端模型的比較 ===");
    const cloudSystemPrompt = await chatService.generateSystemPrompt(
      basePrompt,
      {
        model_type: "gemini",
        user_id: 1,
        conversation_id: 1,
      }
    );

    console.log(`本地模型提示詞長度: ${localSystemPrompt.length} 字符`);
    console.log(`雲端模型提示詞長度: ${cloudSystemPrompt.length} 字符`);
    console.log(
      `長度差異: ${(((cloudSystemPrompt.length - localSystemPrompt.length) / cloudSystemPrompt.length) * 100).toFixed(1)}% 減少`
    );
  } catch (error) {
    console.error("測試失敗:", error.message);
  }
}

testFinalOptimization().then(() => {
  console.log("\n🎉 最終優化測試完成");
  process.exit(0);
});
