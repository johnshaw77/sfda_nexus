import chatService from "../../src/services/chat.service.js";

// 調試系統提示詞生成
async function debugSystemPromptGeneration() {
  console.log("🧪 開始調試系統提示詞生成...\n");

  try {
    console.log("📝 測試本地模型系統提示詞生成");

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
    console.log("內容:");
    console.log("=".repeat(50));
    console.log(systemPrompt);
    console.log("=".repeat(50));

    // 檢查是否包含工具信息
    const hasToolInfo =
      systemPrompt.includes("工具") || systemPrompt.includes("tool");
    const hasEmployeeInfo = systemPrompt.includes("get_employee_info");
    const hasJsonFormat = systemPrompt.includes('{"tool"');

    console.log("\n🔍 內容分析:");
    console.log("- 包含工具信息:", hasToolInfo);
    console.log("- 包含員工查詢工具:", hasEmployeeInfo);
    console.log("- 包含 JSON 格式範例:", hasJsonFormat);

    if (!hasToolInfo) {
      console.log("\n❌ 問題：系統提示詞中沒有工具信息");
      console.log("這解釋了為什麼 AI 無法生成工具調用");
    } else {
      console.log("\n✅ 系統提示詞包含工具信息，應該能正常工作");
    }
  } catch (error) {
    console.error("❌ 測試失敗:", error.message);
    console.error("錯誤堆疊:", error.stack);
  }
}

// 執行測試
debugSystemPromptGeneration();
