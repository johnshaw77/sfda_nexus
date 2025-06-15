/**
 * 完整測試：AI 工具調用 + 自然語言回應
 * 模擬完整的聊天流程，驗證 AI 是否能夠正確調用工具並返回自然語言
 */

import chatService from "../../src/services/chat.service.js";
import AIService from "../../src/services/ai.service.js";

// 登入獲取 token
async function getAuthToken() {
  try {
    const response = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        identifier: "admin",
        password: "admin123",
      }),
    });

    const data = await response.json();
    if (data.success) {
      return data.access_token;
    } else {
      throw new Error("登入失敗: " + data.message);
    }
  } catch (error) {
    console.error("獲取 token 失敗:", error.message);
    return null;
  }
}

async function testCompleteFlow() {
  console.log("=== 完整測試：AI 工具調用 + 自然語言回應 ===\n");

  try {
    // 1. 獲取認證 token
    console.log("1. 獲取認證 token...");
    const token = await getAuthToken();
    if (!token) {
      throw new Error("無法獲取認證 token");
    }
    console.log("✅ 認證成功");

    // 2. 生成完整的系統提示詞（包含工具信息）
    console.log("\n2. 生成系統提示詞...");
    const basePrompt = "你是一個專業的HR助手，協助用戶查詢員工資訊。";
    const fullSystemPrompt = await chatService.generateSystemPrompt(basePrompt);
    console.log("系統提示詞長度:", fullSystemPrompt.length);
    console.log(
      "包含工具信息:",
      fullSystemPrompt.includes("get_employee_info") ? "✅ 是" : "❌ 否"
    );

    // 3. 模擬用戶問題和 AI 的第一次回應（包含工具調用）
    console.log("\n3. 模擬第一次 AI 調用（應該包含工具調用）...");
    const userQuestion = "A123456 的 email 是什麼？";

    const firstAIMessages = [
      {
        role: "system",
        content: fullSystemPrompt,
      },
      {
        role: "user",
        content: userQuestion,
      },
    ];

    const firstAIResponse = await AIService.callModel({
      provider: "ollama",
      model: "qwen3:32b",
      messages: firstAIMessages,
      temperature: 0.7,
      max_tokens: 2048,
    });

    console.log(
      "第一次 AI 回應:",
      firstAIResponse.content.substring(0, 200) + "..."
    );
    console.log(
      "回應是否包含工具調用:",
      firstAIResponse.content.includes("get_employee_info") ? "✅ 是" : "❌ 否"
    );

    // 4. 處理完整的聊天消息（包含工具調用和二次 AI 調用）
    console.log("\n4. 處理完整聊天消息（工具調用 + 二次 AI 調用）...");

    const context = {
      user_id: 1,
      conversation_id: "test-conv-123",
      user_question: userQuestion,
      original_question: userQuestion,
      model_config: {
        model_type: "ollama",
        model_id: "qwen3:32b",
      },
    };

    const finalResult = await chatService.processChatMessage(
      firstAIResponse.content,
      context
    );

    console.log("\n=== 最終結果分析 ===");
    console.log("有工具調用:", finalResult.has_tool_calls ? "✅ 是" : "❌ 否");
    console.log("工具調用數量:", finalResult.tool_calls?.length || 0);
    console.log(
      "成功工具調用:",
      finalResult.tool_results?.filter((r) => r.success).length || 0
    );
    console.log(
      "使用二次 AI 調用:",
      finalResult.used_secondary_ai ? "✅ 是" : "❌ 否"
    );

    console.log("\n=== 最終回應 ===");
    console.log("最終回應:", finalResult.final_response);

    // 5. 驗證回應品質
    console.log("\n=== 回應品質驗證 ===");
    const finalResponse = finalResult.final_response || "";

    const isNaturalLanguage =
      !finalResponse.startsWith("{") &&
      !finalResponse.startsWith("[") &&
      !finalResponse.includes("tool_call") &&
      !finalResponse.includes("parameters");

    const hasCorrectInfo =
      finalResponse.includes("email") ||
      finalResponse.includes("電子郵件") ||
      finalResponse.includes("郵箱");

    const isHelpful =
      finalResponse.includes("A123456") &&
      finalResponse.length > 10 &&
      finalResponse.length < 200;

    console.log("✅ 回應分析:");
    console.log("  - 是自然語言:", isNaturalLanguage ? "✅ 是" : "❌ 否");
    console.log("  - 包含正確信息:", hasCorrectInfo ? "✅ 是" : "❌ 否");
    console.log("  - 回應有用性:", isHelpful ? "✅ 是" : "❌ 否");
    console.log("  - 回應長度:", finalResponse.length, "字符");

    // 6. 整體成功評估
    const overallSuccess =
      finalResult.has_tool_calls &&
      finalResult.used_secondary_ai &&
      isNaturalLanguage &&
      hasCorrectInfo;

    console.log("\n=== 整體測試結果 ===");
    console.log(
      overallSuccess
        ? "✅ 測試完全成功！AI 成功調用工具並返回自然語言回應。"
        : "❌ 測試部分失敗，需要進一步優化。"
    );

    return {
      success: overallSuccess,
      details: {
        has_tool_calls: finalResult.has_tool_calls,
        used_secondary_ai: finalResult.used_secondary_ai,
        is_natural_language: isNaturalLanguage,
        has_correct_info: hasCorrectInfo,
        final_response: finalResponse,
      },
    };
  } catch (error) {
    console.error("測試失敗:", error.message);
    console.error("錯誤詳情:", error);
    return { success: false, error: error.message };
  }
}

// 執行測試
testCompleteFlow()
  .then((result) => {
    console.log("\n=== 測試摘要 ===");
    if (result.success) {
      console.log("🎉 所有測試通過！AI 回應格式問題已解決。");
    } else {
      console.log("❌ 測試未完全通過，詳情:", result);
    }
  })
  .catch(console.error);
