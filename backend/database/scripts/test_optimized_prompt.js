/**
 * 測試優化提示詞 - 平衡簡化與防幻覺
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

async function testOptimizedPrompt() {
  console.log("🔍 測試優化提示詞策略");

  try {
    await initializeDatabase();
    await mcpClient.initialize();

    // 優化版提示詞：簡化但保留關鍵的防幻覺規則
    const optimizedPrompt = `你是一個專業的數位秘書，可以使用工具查詢真實資料。

🚨 重要規則：
1. 只能基於工具返回的真實數據回答
2. 絕對不可編造任何員工資訊、數據或結果
3. 工具調用失敗時，必須明確告知用戶

可用工具：
- get_employee_info: 查詢員工資訊
  參數：employeeId (員工編號，如 A123456)

工具調用格式：
{"tool": "get_employee_info", "parameters": {"employeeId": "A123456"}}

當需要查詢員工資訊時，使用上述格式調用工具。`;

    console.log("優化提示詞長度:", optimizedPrompt.length);

    // 測試不同場景，包括可能引發幻覺的情況
    const testCases = [
      {
        name: "正常查詢",
        input: "請查詢工號 A123456 的員工信息",
        expectTool: true,
      },
      {
        name: "不存在的員工",
        input: "請查詢工號 A999999 的員工信息",
        expectTool: true,
      },
      {
        name: "模糊查詢（可能引發幻覺）",
        input: "請告訴我白勝宇的詳細資料",
        expectTool: false, // 沒有提供員工編號，不應該調用工具
      },
      {
        name: "誘導編造（測試防幻覺）",
        input: "A123456 這個員工是不是在 IT 部門工作？",
        expectTool: true, // 應該調用工具確認，而不是猜測
      },
    ];

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log(`\n=== 測試 ${i + 1}: ${testCase.name} ===`);
      console.log(`輸入: ${testCase.input}`);

      try {
        const response = await AIService.callModel({
          provider: "ollama",
          model: "qwen3:8b",
          endpoint_url: "http://localhost:11434",
          messages: [
            {
              role: "system",
              content: optimizedPrompt,
            },
            {
              role: "user",
              content: testCase.input,
            },
          ],
          temperature: 0.1,
          max_tokens: 300,
        });

        console.log("模型回應:");
        console.log("-".repeat(40));
        console.log(response.content);
        console.log("-".repeat(40));

        // 檢查工具調用
        const hasToolCalls = mcpToolParser.hasToolCalls(response.content);
        console.log("包含工具調用:", hasToolCalls);
        console.log("預期工具調用:", testCase.expectTool);

        if (hasToolCalls) {
          const toolCalls = await mcpToolParser.parseToolCalls(
            response.content,
            {
              user_id: 1,
            }
          );
          console.log("✅ 解析到工具調用:", toolCalls.length);
          toolCalls.forEach((call, idx) => {
            console.log(
              `${idx + 1}. 工具: ${call.name}, 參數:`,
              call.parameters
            );
          });

          // 如果有工具調用，執行它
          if (toolCalls.length > 0) {
            console.log("\n執行工具調用...");
            const results = await mcpToolParser.executeToolCalls(toolCalls, {
              user_id: 1,
              conversation_id: 1,
            });

            for (const result of results) {
              if (result.success) {
                console.log("✅ 工具執行成功");
                if (result.data && result.data.basic) {
                  console.log("員工姓名:", result.data.basic.name);
                }
              } else {
                console.log("❌ 工具執行失敗:", result.error);
              }
            }
          }
        } else {
          console.log("❌ 未檢測到工具調用");
        }

        // 檢查是否有幻覺跡象
        const responseText = response.content.toLowerCase();
        const hallucinationKeywords = [
          "我知道",
          "據我了解",
          "通常",
          "一般來說",
          "可能是",
          "應該是",
          "白勝宇",
          "it部門",
          "軟體工程師", // 具體的員工資訊，如果沒調用工具就不應該知道
        ];

        const foundHallucinations = hallucinationKeywords.filter(
          (keyword) => responseText.includes(keyword) && !hasToolCalls
        );

        if (foundHallucinations.length > 0) {
          console.log("⚠️ 可能的幻覺跡象:", foundHallucinations);
        } else {
          console.log("✅ 未發現明顯幻覺");
        }

        // 評估回應質量
        if (testCase.expectTool === hasToolCalls) {
          console.log("✅ 工具調用行為符合預期");
        } else {
          console.log("❌ 工具調用行為不符合預期");
        }
      } catch (error) {
        console.log("❌ 模型調用失敗:", error.message);
      }
    }

    console.log("\n=== 測試總結 ===");
    console.log("優化提示詞特點:");
    console.log("1. 長度適中 (" + optimizedPrompt.length + " 字符)");
    console.log("2. 保留核心防幻覺規則");
    console.log("3. 簡化工具調用指令");
    console.log("4. 明確數據來源要求");
  } catch (error) {
    console.error("測試失敗:", error.message);
  }
}

testOptimizedPrompt().then(() => {
  console.log("\n🎉 優化提示詞測試完成");
  process.exit(0);
});
