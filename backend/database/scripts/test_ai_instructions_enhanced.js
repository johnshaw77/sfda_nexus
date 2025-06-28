/**
 * 測試強化後的 AI 指導提示詞功能
 * 驗證二次 AI 調用是否嚴格遵循 aiInstructions
 */

import dotenv from "dotenv";
dotenv.config();

import ChatService from "../../src/services/chat.service.js";

console.log("🧠 測試強化 AI 指導提示詞功能");
console.log("=====================================");

const chatService = new ChatService();

// 模擬一個包含 MIL 工具調用的 AI 回應
const mockAIResponse = `根據您的查詢，我需要使用 MIL 工具來獲取專案資訊。

<tool_call>
<name>get-mil-list</name>
<parameters>
{
  "limit": 5,
  "status": "OnGoing",
  "delayDayMin": 5
}
</parameters>
</tool_call>

我將為您查詢延遲超過5天的進行中專案。`;

const testContext = {
  user_id: "test_user",
  user_question:
    "請分析一下延遲超過5天的專案狀況，並提供具體的專案名稱和改善建議",
  model: "qwen3:32b",
  endpoint_url: "http://localhost:11434",
  stream: false,
  enableSecondaryAI: true,
};

async function testEnhancedAIInstructions() {
  try {
    console.log("📝 模擬用戶問題:", testContext.user_question);
    console.log("🤖 模擬 AI 回應:", mockAIResponse.substring(0, 100) + "...");
    console.log("");

    // 處理聊天消息
    const result = await chatService.processChatMessage(
      mockAIResponse,
      testContext
    );

    console.log("✅ 處理結果:");
    console.log("- 是否有工具調用:", result.has_tool_calls);
    console.log("- 工具調用數量:", result.tool_calls?.length || 0);
    console.log("- 工具執行結果數量:", result.tool_results?.length || 0);
    console.log("- 是否使用二次 AI:", result.used_secondary_ai);
    console.log("");

    if (result.formatted_results) {
      console.log("📊 格式化結果預覽:");
      console.log(result.formatted_results.substring(0, 500) + "...");
      console.log("");

      // 檢查是否包含 AI 指導
      if (result.formatted_results.includes("🧠 AI 分析指導")) {
        console.log("✅ 檢測到 AI 分析指導");
      } else {
        console.log("❌ 未檢測到 AI 分析指導");
      }
      console.log("");
    }

    if (result.final_response) {
      console.log("🎯 最終 AI 回應:");
      console.log(result.final_response);
      console.log("");

      // 分析回應內容
      console.log("🔍 回應內容分析:");

      // 檢查是否包含具體專案名稱（這是我們要避免的）
      const hasSpecificProjectNames =
        /專案[A-Z0-9\-]{3,}|項目[A-Z0-9\-]{3,}|MIL-[A-Z0-9]+/.test(
          result.final_response
        );
      console.log(
        "- 是否包含具體專案名稱:",
        hasSpecificProjectNames ? "❌ 是（需要改善）" : "✅ 否（符合要求）"
      );

      // 檢查是否基於統計數據
      const hasStatisticalAnalysis = /統計|摘要|平均|總計|分析/.test(
        result.final_response
      );
      console.log(
        "- 是否包含統計分析:",
        hasStatisticalAnalysis ? "✅ 是" : "❌ 否"
      );

      // 檢查是否有改善建議
      const hasRecommendations = /建議|改善|優化|措施/.test(
        result.final_response
      );
      console.log(
        "- 是否包含改善建議:",
        hasRecommendations ? "✅ 是" : "❌ 否"
      );

      // 檢查回應長度
      console.log("- 回應長度:", result.final_response.length, "字符");
    }

    if (result.debug_info) {
      console.log("");
      console.log("🔧 調試信息:");
      console.log("- 二次 AI 系統提示詞預覽:");
      console.log(
        result.debug_info.secondaryAI.systemPrompt.substring(0, 300) + "..."
      );
      console.log("");
      console.log("- 二次 AI 用戶提示詞預覽:");
      console.log(
        result.debug_info.secondaryAI.userPrompt.substring(0, 300) + "..."
      );
    }
  } catch (error) {
    console.error("❌ 測試失敗:", error.message);
    console.error("錯誤詳情:", error.stack);
  }
}

// 執行測試
testEnhancedAIInstructions();
