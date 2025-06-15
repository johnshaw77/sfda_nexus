import chatService from "../../src/services/chat.service.js";

async function testFullPipeline() {
  console.log("=== 測試完整工具調用管道 ===\n");

  try {
    // 模擬 AI 回應（包含工具調用）
    const mockAIResponse = `<think>
好的，用户问的是A123456的电话号码。我需要调用HR服务中的get_employee_info工具来获取这个信息。
</think>

\`\`\`json
{"tool": "get_employee_info", "parameters": {"employeeId": "A123456", "includeDetails": true}}
\`\`\``;

    // 模擬上下文
    const context = {
      user_id: 1,
      conversation_id: 367,
      model_id: 2,
      model_config: {
        id: 2,
        model_id: "qwen3:32b",
        model_type: "ollama",
        endpoint_url: "http://localhost:11434",
      },
      endpoint_url: "http://localhost:11434",
      user_question: "A123456 的電話號碼是多少？",
      original_question: "A123456 的電話號碼是多少？",
    };

    console.log("1. 開始處理聊天消息...");
    console.log("AI 回應內容:", mockAIResponse);
    console.log("上下文:", JSON.stringify(context, null, 2));
    console.log("");

    const result = await chatService.processChatMessage(
      mockAIResponse,
      context
    );

    console.log("=== 處理結果 ===");
    console.log("有工具調用:", result.has_tool_calls);
    console.log("工具調用數量:", result.tool_calls?.length || 0);
    console.log("工具結果數量:", result.tool_results?.length || 0);
    console.log("使用二次 AI:", result.used_secondary_ai);
    console.log("最終回應長度:", result.final_response?.length || 0);
    console.log("");

    console.log("=== 最終回應內容 ===");
    console.log(result.final_response);
    console.log("");

    // 分析回應質量
    const isNaturalResponse =
      result.final_response &&
      !result.final_response.includes("**執行成功**") &&
      !result.final_response.includes("📋 **服務**");

    console.log("=== 回應質量分析 ===");
    console.log("是否為自然語言回應:", isNaturalResponse ? "✅ 是" : "❌ 否");
    console.log(
      "是否包含電話信息:",
      result.final_response?.includes("0912-345-678") ? "✅ 是" : "❌ 否"
    );
    console.log(
      "是否避免技術細節:",
      !result.final_response?.includes("**執行成功**") ? "✅ 是" : "❌ 否"
    );

    if (result.tool_results && result.tool_results.length > 0) {
      console.log("\n=== 工具結果詳情 ===");
      result.tool_results.forEach((toolResult, index) => {
        console.log(`工具 ${index + 1}:`, toolResult.tool_name);
        console.log("成功:", toolResult.success);
        console.log("執行時間:", toolResult.execution_time, "ms");
        if (toolResult.data && typeof toolResult.data === "object") {
          console.log(
            "數據預覽:",
            JSON.stringify(toolResult.data).substring(0, 200) + "..."
          );
        }
      });
    }
  } catch (error) {
    console.error("❌ 測試失敗:", error.message);
    console.error("錯誤詳情:", error);
  }
}

testFullPipeline();
 