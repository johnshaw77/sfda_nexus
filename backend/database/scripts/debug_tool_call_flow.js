/**
 * 端到端工具調用流程調試腳本
 * 模擬前端發送消息的完整流程，詳細記錄每個步驟
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// 設置環境變數
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../../.env") });

import { query, initializeDatabase } from "../../src/config/database.config.js";
import mcpClient from "../../src/services/mcp.service.js";
import chatService from "../../src/services/chat.service.js";
import AIService from "../../src/services/ai.service.js";
import mcpToolParser from "../../src/services/mcpToolParser.service.js";

async function debugToolCallFlow() {
  console.log("🔍 開始端到端工具調用流程調試");
  console.log("=".repeat(80));

  try {
    // 1. 初始化所有服務
    console.log("\n=== 步驟 1: 初始化服務 ===");
    await initializeDatabase();
    console.log("✅ 數據庫已初始化");

    await mcpClient.initialize();
    console.log("✅ MCP 客戶端已初始化");

    // 2. 檢查 MCP 連接狀態
    console.log("\n=== 步驟 2: 檢查 MCP 連接狀態 ===");
    const connectionStatuses = mcpClient.getConnectionStatuses();
    console.log(`MCP 連接數量: ${connectionStatuses.length}`);

    connectionStatuses.forEach((status) => {
      console.log(
        `  - ${status.service_name}: ${status.connected ? "✅ 已連接" : "❌ 未連接"}`
      );
    });

    if (connectionStatuses.length === 0) {
      console.log("❌ 沒有可用的 MCP 連接，無法進行工具調用測試");
      return;
    }

    // 3. 檢查可用工具
    console.log("\n=== 步驟 3: 檢查可用工具 ===");
    const { rows: tools } = await query(
      "SELECT id, name, description, mcp_service_id FROM mcp_tools WHERE is_enabled = TRUE LIMIT 5"
    );

    console.log(`可用工具數量: ${tools.length}`);
    tools.forEach((tool) => {
      console.log(`  - ${tool.name} (ID: ${tool.id}): ${tool.description}`);
    });

    // 4. 創建測試對話
    console.log("\n=== 步驟 4: 創建測試對話 ===");
    const testUserId = 1;
    const testMessage = "請幫我查詢員工編號 A123456 的基本資訊";

    // 獲取一個可用的模型 ID
    const { rows: availableModels } = await query(
      "SELECT id FROM ai_models WHERE is_active = TRUE LIMIT 1"
    );

    if (availableModels.length === 0) {
      console.log("❌ 沒有可用的 AI 模型");
      return;
    }

    const modelId = availableModels[0].id;

    // 創建對話
    const { rows: conversations } = await query(
      "INSERT INTO conversations (user_id, model_id, title, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())",
      [testUserId, modelId, "工具調用測試對話"]
    );

    const conversationId = conversations.insertId;
    console.log(`✅ 創建測試對話 ID: ${conversationId}`);

    // 5. 生成系統提示詞
    console.log("\n=== 步驟 5: 生成系統提示詞 ===");
    const systemPrompt = await chatService.generateSystemPrompt(testUserId);

    console.log("系統提示詞長度:", systemPrompt.length);
    console.log("系統提示詞預覽 (前 500 字符):");
    console.log(systemPrompt.substring(0, 500) + "...");

    // 檢查是否包含工具資訊
    const hasToolInfo =
      systemPrompt.includes("mcp_") || systemPrompt.includes("tool");
    console.log(`包含工具資訊: ${hasToolInfo ? "✅ 是" : "❌ 否"}`);

    // 6. 準備 AI 模型請求
    console.log("\n=== 步驟 6: 準備 AI 模型請求 ===");

    // 獲取可用模型
    const { rows: models } = await query(
      "SELECT id, name, display_name, model_type, model_id FROM ai_models WHERE is_active = TRUE LIMIT 1"
    );

    if (models.length === 0) {
      console.log("❌ 沒有可用的 AI 模型");
      return;
    }

    const model = models[0];
    console.log(
      `使用模型: ${model.display_name} (${model.model_type}/${model.model_id})`
    );

    // 7. 調用 AI 模型
    console.log("\n=== 步驟 7: 調用 AI 模型 ===");

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: testMessage },
    ];

    console.log("發送給 AI 的消息數量:", messages.length);
    console.log("用戶消息:", testMessage);

    try {
      // 獲取模型提供商和類型
      const { rows: modelDetails } = await query(
        "SELECT model_type FROM ai_models WHERE id = ?",
        [model.id]
      );

      if (modelDetails.length === 0) {
        console.log("❌ 無法獲取模型詳細信息");
        return;
      }

      const provider = modelDetails[0].model_type;

      // 使用正確的參數格式調用 AI 模型
      const aiResponse = await AIService.callModel({
        provider,
        model: model.model_id,
        messages,
        temperature: 0.7,
        max_tokens: 2000,
      });

      console.log("✅ AI 模型調用成功");
      console.log(
        "AI 回應長度:",
        aiResponse.content ? aiResponse.content.length : "未知"
      );
      console.log("AI 回應內容:");
      console.log("-".repeat(60));
      console.log(aiResponse);
      console.log("-".repeat(60));

      // 提取實際的回應內容
      const responseText = aiResponse.content || "";

      // 8. 檢測工具調用
      console.log("\n=== 步驟 8: 檢測工具調用 ===");

      const hasToolCalls = mcpToolParser.hasToolCalls(responseText);
      console.log(`檢測到工具調用: ${hasToolCalls ? "✅ 是" : "❌ 否"}`);

      if (hasToolCalls) {
        // 9. 解析工具調用
        console.log("\n=== 步驟 9: 解析工具調用 ===");

        const toolCalls = mcpToolParser.parseToolCalls(responseText);
        console.log(`解析到的工具調用數量: ${toolCalls.length}`);

        toolCalls.forEach((call, index) => {
          console.log(`工具調用 ${index + 1}:`);
          console.log(`  - 工具名稱: ${call.name}`);
          console.log(`  - 參數:`, JSON.stringify(call.arguments, null, 2));
        });

        // 10. 執行工具調用
        console.log("\n=== 步驟 10: 執行工具調用 ===");

        for (let i = 0; i < toolCalls.length; i++) {
          const call = toolCalls[i];
          console.log(`\n執行工具調用 ${i + 1}: ${call.name}`);

          try {
            const result = await mcpToolParser.executeToolCalls(
              [call],
              testUserId
            );
            console.log("✅ 工具執行成功");
            console.log("執行結果:", JSON.stringify(result, null, 2));
          } catch (error) {
            console.log("❌ 工具執行失敗:", error.message);
            console.error(error);
          }
        }
      } else {
        // 分析為什麼沒有檢測到工具調用
        console.log("\n=== 分析: 為什麼沒有檢測到工具調用 ===");

        // 檢查回應中是否包含相關關鍵字
        const keywords = ["mcp_", "tool", "function", "invoke", "call"];
        const foundKeywords = keywords.filter((keyword) =>
          responseText.toLowerCase().includes(keyword.toLowerCase())
        );

        console.log("回應中包含的相關關鍵字:", foundKeywords);

        // 檢查是否包含 JSON 格式
        const hasJson =
          responseText.includes("{") && responseText.includes("}");
        console.log(`包含 JSON 格式: ${hasJson ? "是" : "否"}`);

        // 檢查是否包含函數調用格式
        const hasFunctionCall =
          responseText.includes("(") && responseText.includes(")");
        console.log(`包含函數調用格式: ${hasFunctionCall ? "是" : "否"}`);
      }
    } catch (error) {
      console.log("❌ AI 模型調用失敗:", error.message);
      console.error(error);
    }

    // 11. 清理測試數據
    console.log("\n=== 步驟 11: 清理測試數據 ===");
    await query("DELETE FROM conversations WHERE id = ?", [conversationId]);
    console.log("✅ 測試數據已清理");

    console.log("\n✅ 端到端調試完成");
  } catch (error) {
    console.error("❌ 調試過程中發生錯誤:", error.message);
    console.error(error);
  }
}

// 執行調試
debugToolCallFlow()
  .then(() => {
    console.log("\n🏁 調試結束");
    process.exit(0);
  })
  .catch((error) => {
    console.error("調試失敗:", error);
    process.exit(1);
  });
