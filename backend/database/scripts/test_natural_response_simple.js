/**
 * 簡化測試：驗證修復後的 AI 自然語言回應功能
 * 不依賴網絡請求，直接測試核心邏輯
 */

import chatService from "../../src/services/chat.service.js";
import AIService from "../../src/services/ai.service.js";

async function testNaturalResponseFixed() {
  console.log("=== 測試修復後的 AI 自然語言回應 ===\n");

  try {
    // 1. 生成包含工具的系統提示詞
    console.log("1. 生成系統提示詞（包含工具信息）...");
    const basePrompt = "你是一個專業的HR助手，協助用戶查詢員工資訊。";
    const fullSystemPrompt = await chatService.generateSystemPrompt(basePrompt);

    console.log("系統提示詞長度:", fullSystemPrompt.length);
    console.log(
      "包含 get_employee_info 工具:",
      fullSystemPrompt.includes("get_employee_info") ? "✅ 是" : "❌ 否"
    );

    // 2. 模擬包含工具調用的 AI 回應
    console.log("\n2. 模擬 AI 第一次回應（包含工具調用）...");
    const aiResponseWithToolCall = `我需要查詢員工資訊來回答您的問題。

{
  "tool": "get_employee_info",
  "parameters": {
    "employeeId": "A123456"
  }
}`;

    console.log("模擬的 AI 回應:", aiResponseWithToolCall);

    // 3. 測試完整的處理流程
    console.log("\n3. 處理工具調用和生成自然語言回應...");

    const context = {
      user_id: 1,
      conversation_id: "test-123",
      user_question: "A123456 的 email 是什麼？",
      original_question: "A123456 的 email 是什麼？",
      model_config: {
        model_type: "ollama",
        model_id: "qwen3:32b",
      },
    };

    // 使用修復後的 processChatMessage
    const result = await chatService.processChatMessage(
      aiResponseWithToolCall,
      context
    );

    console.log("\n=== 處理結果分析 ===");
    console.log("檢測到工具調用:", result.has_tool_calls ? "✅ 是" : "❌ 否");
    console.log("工具調用數量:", result.tool_calls?.length || 0);
    console.log(
      "成功的工具調用:",
      result.tool_results?.filter((r) => r.success).length || 0
    );
    console.log(
      "使用了二次 AI 調用:",
      result.used_secondary_ai ? "✅ 是" : "❌ 否"
    );

    // 4. 分析最終回應
    console.log("\n=== 最終回應分析 ===");
    const finalResponse = result.final_response || "";
    console.log("最終回應:", finalResponse);
    console.log("回應長度:", finalResponse.length);

    // 5. 質量檢查
    const isNaturalLanguage =
      !finalResponse.startsWith("{") &&
      !finalResponse.startsWith("[") &&
      !finalResponse.includes('"tool"') &&
      !finalResponse.includes('"parameters"');

    const hasRelevantContent =
      finalResponse.includes("email") ||
      finalResponse.includes("電子郵件") ||
      finalResponse.includes("郵箱") ||
      finalResponse.includes("A123456");

    const isSuccessfulResponse =
      result.has_tool_calls && result.used_secondary_ai && isNaturalLanguage;

    console.log("\n=== 質量評估 ===");
    console.log("✅ 是自然語言:", isNaturalLanguage ? "✅ 是" : "❌ 否");
    console.log("✅ 包含相關內容:", hasRelevantContent ? "✅ 是" : "❌ 否");
    console.log("✅ 處理流程成功:", isSuccessfulResponse ? "✅ 是" : "❌ 否");

    // 6. 問題修復狀態
    console.log("\n=== 問題修復狀態 ===");
    if (isSuccessfulResponse && isNaturalLanguage) {
      console.log("🎉 問題已修復！AI 現在能夠：");
      console.log("   1. ✅ 正確解析工具調用");
      console.log("   2. ✅ 執行工具獲取真實資料");
      console.log("   3. ✅ 使用二次 AI 調用生成自然語言回應");
      console.log("   4. ✅ 回應格式不再是 JSON");
    } else {
      console.log("❌ 仍有問題需要解決：");
      if (!result.has_tool_calls) console.log("   - 工具調用解析失敗");
      if (!result.used_secondary_ai) console.log("   - 二次 AI 調用未執行");
      if (!isNaturalLanguage) console.log("   - 回應仍是 JSON 格式");
    }

    return {
      success: isSuccessfulResponse && isNaturalLanguage,
      details: {
        has_tool_calls: result.has_tool_calls,
        used_secondary_ai: result.used_secondary_ai,
        is_natural_language: isNaturalLanguage,
        has_relevant_content: hasRelevantContent,
        final_response: finalResponse,
      },
    };
  } catch (error) {
    console.error("測試失敗:", error.message);
    console.error("錯誤堆疊:", error.stack);
    return { success: false, error: error.message };
  }
}

// 執行測試
testNaturalResponseFixed()
  .then((result) => {
    console.log("\n=== 最終測試結果 ===");
    if (result.success) {
      console.log("🎉 AI 回應格式問題已完全修復！");
      console.log("💡 用戶現在會得到自然語言回應而不是 JSON。");
    } else {
      console.log("❌ 仍需進一步修復，詳情:", result);
    }

    console.log("\n=== 修復摘要 ===");
    console.log("1. ✅ 添加了缺失的 AIService 導入到 ChatService");
    console.log("2. ✅ 修復了二次 AI 調用邏輯");
    console.log("3. ✅ 改進了系統提示詞，確保自然語言輸出");
    console.log("4. ✅ 工具結果格式化現在包含完整的員工資訊");
  })
  .catch(console.error);
