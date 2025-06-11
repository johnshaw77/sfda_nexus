#!/usr/bin/env node

/**
 * 工具調用管道測試
 * 直接測試從 AI 回應到工具調用執行的完整流程
 */

// 模擬聊天服務的關鍵部分
class MockChatService {
  constructor() {
    // 模擬工具調用解析器
    this.toolCallPatterns = [
      // 簡單格式: <tool_call>tool_name\nparameters_json</tool_call>
      /<tool_call>([\s\S]*?)<\/tool_call>/gi,
    ];
  }

  // 檢查是否包含工具調用
  hasToolCalls(text) {
    return this.toolCallPatterns.some((pattern) => pattern.test(text));
  }

  // 解析工具調用
  async parseToolCalls(aiResponse, context = {}) {
    const toolCalls = [];

    console.log("🔍 解析工具調用...");
    console.log(`   回應長度: ${aiResponse.length}`);

    for (const pattern of this.toolCallPatterns) {
      // 重置正規表達式的 lastIndex
      pattern.lastIndex = 0;

      let match;
      const patternMatches = [];

      while ((match = pattern.exec(aiResponse)) !== null) {
        patternMatches.push(match);
      }

      for (const match of patternMatches) {
        // 使用簡化模式解析
        const content = match[1]?.trim();

        if (!content) continue;

        const lines = content
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line);

        if (lines.length === 0) continue;

        const toolName = lines[0];
        const paramsStr = lines.length > 1 ? lines[1] : "{}";

        let parameters = {};
        try {
          parameters = JSON.parse(paramsStr);
        } catch {
          parameters = {};
        }

        const parsedCall = {
          name: toolName,
          parameters,
          format: "simple",
        };

        toolCalls.push(parsedCall);
        console.log(`   ✅ 解析到工具調用: ${toolName}`);
        console.log(`      參數: ${JSON.stringify(parameters)}`);
      }
    }

    return toolCalls;
  }

  // 模擬工具執行
  async executeToolCall(toolCall) {
    console.log(`🔧 執行工具: ${toolCall.name}`);

    if (toolCall.name === "get_department_list") {
      // 模擬成功的部門查詢結果
      return {
        success: true,
        result: {
          success: true,
          result: {
            departments: [
              { departmentCode: "CEO", departmentName: "執行長辦公室" },
              { departmentCode: "IT", departmentName: "資訊技術部" },
              { departmentCode: "HR", departmentName: "人力資源部" },
              { departmentCode: "FIN", departmentName: "財務部" },
              { departmentCode: "MKT", departmentName: "行銷部" },
              { departmentCode: "SALES", departmentName: "業務部" },
              { departmentCode: "DEV", departmentName: "軟體開發組" },
            ],
            totalCount: 7,
          },
        },
        executionTime: 123,
        toolName: "get_department_list",
      };
    }

    return {
      success: false,
      error: "未知工具",
    };
  }

  // 處理完整的聊天消息
  async processChatMessage(aiResponse, context = {}) {
    console.log("🚀 開始處理聊天消息...\n");

    // 檢查是否包含工具調用
    if (!this.hasToolCalls(aiResponse)) {
      console.log("❌ 未檢測到工具調用");
      return {
        original_response: aiResponse,
        has_tool_calls: false,
        final_response: aiResponse,
      };
    }

    console.log("✅ 檢測到工具調用\n");

    // 解析工具調用
    const toolCalls = await this.parseToolCalls(aiResponse, context);

    if (toolCalls.length === 0) {
      console.log("❌ 工具調用解析失敗");
      return {
        original_response: aiResponse,
        has_tool_calls: false,
        final_response: aiResponse,
        tool_calls: [],
      };
    }

    console.log(`\n✅ 解析到 ${toolCalls.length} 個工具調用\n`);

    // 執行工具調用
    const toolResults = [];
    for (const toolCall of toolCalls) {
      try {
        const result = await this.executeToolCall(toolCall);
        toolResults.push(result);

        if (result.success) {
          console.log(`   ✅ ${toolCall.name} 執行成功`);
        } else {
          console.log(`   ❌ ${toolCall.name} 執行失敗: ${result.error}`);
        }
      } catch (error) {
        console.log(`   ❌ ${toolCall.name} 執行錯誤: ${error.message}`);
        toolResults.push({
          success: false,
          error: error.message,
        });
      }
    }

    // 組合最終回應
    let finalResponse = aiResponse;

    // 移除工具調用標籤
    finalResponse = finalResponse.replace(
      /<tool_call[\s\S]*?<\/tool_call>/gi,
      ""
    );
    finalResponse = finalResponse.trim();

    // 添加工具執行結果
    const successfulResults = toolResults.filter((r) => r.success);
    if (successfulResults.length > 0) {
      finalResponse += "\n\n## 🔧 工具執行結果\n\n";

      successfulResults.forEach((result, index) => {
        if (result.result?.result?.departments) {
          finalResponse += `**部門列表查詢結果**:\n`;
          finalResponse += `找到 ${result.result.result.departments.length} 個部門:\n\n`;

          result.result.result.departments.forEach((dept, i) => {
            finalResponse += `${i + 1}. **${dept.departmentName}** (${dept.departmentCode})\n`;
          });
        }
      });
    }

    return {
      original_response: aiResponse,
      has_tool_calls: true,
      tool_calls: toolCalls,
      tool_results: toolResults,
      final_response: finalResponse,
    };
  }
}

async function testToolCallPipeline() {
  console.log("🧪 測試工具調用管道...\n");

  const chatService = new MockChatService();

  // 測試用例：模擬用戶看到的 AI 回應
  const testResponse = `我來幫您查詢公司的部門資訊。

<tool_call>
get_department_list
{"sortBy": "code", "sortOrder": "asc"}
</tool_call>

查詢完成後，我會為您整理部門列表。`;

  console.log("📝 測試 AI 回應:");
  console.log(testResponse);
  console.log("\n" + "=".repeat(50) + "\n");

  try {
    const result = await chatService.processChatMessage(testResponse, {
      user_id: 1,
      conversation_id: 123,
    });

    console.log("\n" + "=".repeat(50));
    console.log("📋 處理結果摘要:");
    console.log(`   有工具調用: ${result.has_tool_calls}`);
    console.log(`   工具調用數量: ${result.tool_calls?.length || 0}`);
    console.log(`   工具結果數量: ${result.tool_results?.length || 0}`);
    console.log(`   最終回應長度: ${result.final_response?.length || 0}`);

    if (result.tool_calls && result.tool_calls.length > 0) {
      console.log("\n🔧 工具調用詳情:");
      result.tool_calls.forEach((call, index) => {
        console.log(`   ${index + 1}. ${call.name} (${call.format})`);
        console.log(`      參數: ${JSON.stringify(call.parameters)}`);
      });
    }

    if (result.tool_results && result.tool_results.length > 0) {
      console.log("\n📊 工具執行結果:");
      result.tool_results.forEach((result, index) => {
        console.log(`   ${index + 1}. ${result.success ? "成功" : "失敗"}`);
        if (result.success && result.result?.result?.departments) {
          console.log(
            `      找到 ${result.result.result.departments.length} 個部門`
          );
        }
      });
    }

    console.log("\n📄 最終回應預覽:");
    console.log(result.final_response?.substring(0, 300) + "...");

    // 模擬前端接收數據格式
    console.log("\n🖥️ 前端接收數據格式:");
    const frontendData = {
      assistant_message: {
        id: 999,
        role: "assistant",
        content: result.final_response,
        metadata: {
          has_tool_calls: result.has_tool_calls,
          tool_calls: result.tool_calls || [],
          tool_results: result.tool_results || [],
          original_response: result.original_response,
        },
      },
    };

    console.log(
      "   metadata.has_tool_calls:",
      frontendData.assistant_message.metadata.has_tool_calls
    );
    console.log(
      "   metadata.tool_calls.length:",
      frontendData.assistant_message.metadata.tool_calls.length
    );
    console.log(
      "   metadata.tool_results.length:",
      frontendData.assistant_message.metadata.tool_results.length
    );

    // 模擬前端 effectiveToolCalls 邏輯
    const effectiveToolCalls =
      frontendData.assistant_message.metadata?.tool_calls || [];
    console.log("   effectiveToolCalls.length:", effectiveToolCalls.length);

    if (effectiveToolCalls.length > 0) {
      console.log("   ✅ 前端會顯示 ToolCallDisplay 組件");
    } else {
      console.log("   ❌ 前端不會顯示工具調用結果");
    }
  } catch (error) {
    console.log("❌ 測試失敗:", error.message);
  }

  console.log("\n🏁 工具調用管道測試完成");
}

// 執行測試
testToolCallPipeline().catch(console.error);
