#!/usr/bin/env node

/**
 * 測試工具調用解析功能
 * 驗證 mcpToolParser 能否正確解析各種格式的工具調用
 */

// 模擬 McpToolParser 類（避免複雜的依賴）
class McpToolParser {
  constructor() {
    // 工具調用的正則模式，支援多種格式
    this.toolCallPatterns = [
      // JSON 格式: {"tool": "tool_name", "parameters": {...}}
      /```json\s*(\{[\s\S]*?\})\s*```/gi,
      // 函數調用格式: tool_name(param1="value1", param2="value2")
      /(\w+)\s*\(\s*([^)]*)\s*\)/gi,
      // 標籤格式: <tool_call name="tool_name" params="...">
      /<tool_call\s+name="([^"]+)"\s*(?:params="([^"]*)")?\s*\/?>/gi,
      // XML 格式: <tool_call><name>tool_name</name><parameters>...</parameters></tool_call>
      /<tool_call>\s*<name>([^<]+)<\/name>\s*<parameters>([\s\S]*?)<\/parameters>\s*<\/tool_call>/gi,
      // 簡單格式: <tool_call>tool_name\nparameters_json</tool_call>
      /<tool_call>\s*([^\n<]+)(?:\s*\n\s*(\{[\s\S]*?\}))?\s*<\/tool_call>/gi,
    ];
  }

  async parseToolCalls(aiResponse, context = {}) {
    const toolCalls = [];

    try {
      // 使用各種模式解析工具調用
      for (const pattern of this.toolCallPatterns) {
        let match;
        const patternMatches = [];

        while ((match = pattern.exec(aiResponse)) !== null) {
          patternMatches.push(match);
        }

        // 處理匹配結果
        for (const match of patternMatches) {
          const parsedCall = await this.parseIndividualCall(match, pattern);
          if (parsedCall) {
            toolCalls.push(parsedCall);
          }
        }
      }

      return toolCalls;
    } catch (error) {
      console.error("工具調用解析失敗", error.message);
      return [];
    }
  }

  async parseIndividualCall(match, pattern) {
    try {
      // JSON 格式
      if (pattern.source.includes("json")) {
        const jsonStr = match[1];
        const parsed = JSON.parse(jsonStr);

        if (parsed.tool && typeof parsed.tool === "string") {
          return {
            name: parsed.tool,
            parameters: parsed.parameters || parsed.params || {},
            format: "json",
          };
        }
      }

      // 標籤格式
      if (
        pattern.source.includes("tool_call") &&
        pattern.source.includes("name=")
      ) {
        const toolName = match[1];
        const paramsStr = match[2] || "{}";

        let parameters = {};
        try {
          parameters = JSON.parse(paramsStr);
        } catch {
          // 簡單解析
          parameters = {};
        }

        return {
          name: toolName,
          parameters,
          format: "tag",
        };
      }

      // 簡單格式: <tool_call>tool_name\nparameters_json</tool_call>
      if (
        pattern.source.includes("tool_call") &&
        pattern.source.includes("[^\\n<]")
      ) {
        const toolName = match[1]?.trim();
        const paramsStr = match[2] || "{}";

        let parameters = {};
        try {
          parameters = JSON.parse(paramsStr);
        } catch {
          parameters = {};
        }

        return {
          name: toolName,
          parameters,
          format: "simple",
        };
      }

      return null;
    } catch (error) {
      console.warn("解析單個工具調用失敗", error.message);
      return null;
    }
  }
}

const parser = new McpToolParser();

async function testToolParsing() {
  console.log("🧪 測試工具調用解析功能...\n");

  // 測試用例
  const testCases = [
    {
      name: "簡單格式（用戶看到的）",
      input: `<tool_call>
get_department_list
{"sortBy": "code", "sortOrder": "asc"}
</tool_call>`,
      expected: {
        name: "get_department_list",
        parameters: { sortBy: "code", sortOrder: "asc" },
      },
    },
    {
      name: "簡單格式無參數",
      input: `<tool_call>
get_department_list
</tool_call>`,
      expected: {
        name: "get_department_list",
        parameters: {},
      },
    },
    {
      name: "JSON 格式",
      input: `\`\`\`json
{"tool": "get_department_list", "parameters": {"sortBy": "name"}}
\`\`\``,
      expected: {
        name: "get_department_list",
        parameters: { sortBy: "name" },
      },
    },
    {
      name: "標籤格式",
      input: `<tool_call name="get_department_list" params='{"sortBy": "name"}'>`,
      expected: {
        name: "get_department_list",
        parameters: { sortBy: "name" },
      },
    },
  ];

  for (const testCase of testCases) {
    console.log(`📋 測試：${testCase.name}`);
    console.log(`輸入：${testCase.input.replace(/\n/g, "\\n")}`);

    try {
      const result = await parser.parseToolCalls(testCase.input, {
        user_id: 1,
      });

      if (result.length > 0) {
        const parsed = result[0];
        console.log(`✅ 解析成功：${parsed.name}`);
        console.log(`   參數：${JSON.stringify(parsed.parameters)}`);
        console.log(`   格式：${parsed.format}`);

        // 驗證結果
        const isCorrect =
          parsed.name === testCase.expected.name &&
          JSON.stringify(parsed.parameters) ===
            JSON.stringify(testCase.expected.parameters);

        if (isCorrect) {
          console.log("✅ 結果正確");
        } else {
          console.log("❌ 結果不符合預期");
          console.log(
            `   預期：name=${testCase.expected.name}, params=${JSON.stringify(testCase.expected.parameters)}`
          );
        }
      } else {
        console.log("❌ 解析失敗：沒有匹配到工具調用");
      }
    } catch (error) {
      console.log(`❌ 解析錯誤：${error.message}`);
    }

    console.log("");
  }

  // 測試完整的 AI 回應
  console.log("📋 測試：完整 AI 回應");
  const fullResponse = `根據您的需求，我將幫您查詢公司的部門列表。

<tool_call>
get_department_list
{"sortBy": "code", "sortOrder": "asc"}
</tool_call>

查詢結果將包含所有部門的詳細資訊。`;

  try {
    const result = await parser.parseToolCalls(fullResponse, { user_id: 1 });

    if (result.length > 0) {
      console.log(`✅ 完整回應解析成功，找到 ${result.length} 個工具調用`);
      result.forEach((call, index) => {
        console.log(`   ${index + 1}. ${call.name} (${call.format})`);
        console.log(`      參數：${JSON.stringify(call.parameters)}`);
      });
    } else {
      console.log("❌ 完整回應解析失敗");
    }
  } catch (error) {
    console.log(`❌ 完整回應解析錯誤：${error.message}`);
  }

  console.log("\n🏁 工具調用解析測試完成");
}

// 執行測試
testToolParsing().catch(console.error);
