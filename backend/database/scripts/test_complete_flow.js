import chatService from "../../src/services/chat.service.js";
import AIService from "../../src/services/ai.service.js";

// 完整聊天流程測試
async function testCompleteFlow() {
  console.log("🧪 開始完整聊天流程測試...\n");

  try {
    const userMessage = "請查詢工號 A123456 的員工資訊";
    console.log("👤 用戶消息:", userMessage);

    // 1. 生成系統提示詞
    console.log("\n📝 步驟 1: 生成系統提示詞");
    const systemPrompt = await chatService.generateSystemPrompt(
      "你是一個專業的數位秘書。",
      {
        user_id: 1,
        conversation_id: 1,
        model_type: "ollama",
      }
    );

    console.log("✅ 系統提示詞生成完成");
    console.log("長度:", systemPrompt.length);
    console.log("預覽:", systemPrompt.substring(0, 300) + "...");

    // 2. 準備 AI 調用參數
    console.log("\n🤖 步驟 2: 調用 AI 模型");
    const aiOptions = {
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
          content: userMessage,
        },
      ],
      temperature: 0.7,
      max_tokens: 2048,
    };

    console.log("AI 調用參數:", {
      provider: aiOptions.provider,
      model: aiOptions.model,
      messagesCount: aiOptions.messages.length,
      systemPromptLength: aiOptions.messages[0].content.length,
    });

    // 3. 調用 AI 模型
    const aiResponse = await AIService.callModel(aiOptions);

    console.log("✅ AI 模型調用完成");
    console.log("AI 回應:", {
      provider: aiResponse.provider,
      model: aiResponse.model,
      contentLength: aiResponse.content.length,
      tokensUsed: aiResponse.tokens_used,
      processingTime: aiResponse.processing_time,
    });
    console.log("AI 回應內容:", aiResponse.content);

    // 4. 處理工具調用
    console.log("\n🔧 步驟 3: 處理工具調用");
    const chatResult = await chatService.processChatMessage(
      aiResponse.content,
      {
        user_id: 1,
        conversation_id: 1,
        model_id: "qwen3:8b",
      }
    );

    console.log("✅ 工具調用處理完成");
    console.log("處理結果:", {
      hasToolCalls: chatResult.has_tool_calls,
      toolCallsCount: chatResult.tool_calls?.length || 0,
      toolResultsCount: chatResult.tool_results?.length || 0,
      usedSecondaryAI: chatResult.used_secondary_ai || false,
    });

    // 5. 顯示詳細結果
    if (chatResult.has_tool_calls) {
      console.log("\n🔧 工具調用詳情:");
      chatResult.tool_calls?.forEach((call, index) => {
        console.log(`工具 ${index + 1}:`, {
          name: call.name,
          format: call.format,
          parameters: call.parameters,
        });
      });

      console.log("\n📊 工具執行結果:");
      chatResult.tool_results?.forEach((result, index) => {
        console.log(`結果 ${index + 1}:`, {
          toolName: result.tool_name,
          success: result.success,
          executionTime: result.execution_time,
          dataPreview:
            typeof result.data === "object"
              ? JSON.stringify(result.data).substring(0, 200) + "..."
              : String(result.data).substring(0, 200),
        });
      });
    }

    console.log("\n📝 最終回應:");
    console.log(chatResult.final_response || aiResponse.content);

    // 6. 測試結果總結
    console.log("\n🎯 測試結果總結:");
    console.log("- 系統提示詞生成: ✅");
    console.log("- AI 模型調用: ✅");
    console.log("- 工具調用檢測:", chatResult.has_tool_calls ? "✅" : "❌");
    console.log(
      "- 工具執行:",
      chatResult.tool_results?.some((r) => r.success) ? "✅" : "❌"
    );
    console.log("- 最終回應生成: ✅");
  } catch (error) {
    console.error("❌ 測試失敗:", error.message);
    console.error("錯誤堆疊:", error.stack);
  }
}

// 執行測試
testCompleteFlow();
