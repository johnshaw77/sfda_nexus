/**
 * 完整測試 AI 指導提示詞功能
 * 測試從 mil-service.js 到前端顯示的完整流程
 */

import axios from "axios";

const BASE_URL = "http://localhost:3001";
const MCP_BASE_URL = "http://localhost:3002";

// 測試用例配置
const testCases = [
  {
    name: "高風險專案測試（延遲≥10天）",
    mcpPayload: {
      tool: "get_mil_list",
      parameters: {
        filters: {
          delayDayMin: 10,
          location: "C#3FOQC",
        },
        page: 1,
        limit: 5,
        sort: "DelayDay",
        status: "OnGoing",
      },
    },
  },
  {
    name: "地點特定分析測試",
    mcpPayload: {
      tool: "get_mil_list",
      parameters: {
        filters: {
          location: "C#3FOQC",
          typeName: "OQC",
        },
        page: 1,
        limit: 10,
        status: "OnGoing",
      },
    },
  },
  {
    name: "一般專案狀況測試",
    mcpPayload: {
      tool: "get_mil_list",
      parameters: {
        filters: {
          delayDayMin: 5,
        },
        page: 1,
        limit: 8,
        status: "OnGoing",
      },
    },
  },
];

/**
 * 測試 MCP 服務原始回應
 */
async function testMCPService(testCase) {
  console.log(`\n🧪 測試案例: ${testCase.name}`);
  console.log("=".repeat(50));

  try {
    const response = await axios.post(
      `${MCP_BASE_URL}/mcp/call`,
      testCase.mcpPayload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (response.data.success) {
      const data = response.data.result || response.data.data;

      console.log("✅ MCP 調用成功");
      console.log(`📊 查詢到 ${data.count} 筆專案`);

      // 檢查統計摘要
      if (data.statistics) {
        console.log("\n📈 統計摘要:");
        console.log(`   ${data.statistics.summary}`);

        if (data.statistics.details) {
          const stats = data.statistics.details;
          console.log(`   - 總專案數: ${stats.totalCount}`);
          console.log(`   - 平均延遲: ${stats.avgDelayDays} 天`);
          console.log(`   - 高風險專案: ${stats.riskAnalysis.highRisk} 筆`);
          console.log(
            `   - 涉及負責人: ${stats.responsibility.uniqueDRICount} 位`
          );
        }
      }

      // 🤖 檢查 AI 指導提示詞
      if (data.aiInstructions) {
        console.log("\n🧠 AI 指導提示詞存在:");
        console.log("   長度:", data.aiInstructions.length, "字符");
        console.log("   前 200 字符:");
        console.log("   ", data.aiInstructions.substring(0, 200) + "...");

        // 檢查關鍵指導內容
        const keyChecks = {
          分析範圍限制: data.aiInstructions.includes("分析範圍限制"),
          高風險專案重點: data.aiInstructions.includes("高風險專案重點"),
          地點分析重點: data.aiInstructions.includes("地點分析重點"),
          回應要求: data.aiInstructions.includes("回應要求"),
        };

        console.log("\n   🔍 關鍵指導內容檢查:");
        Object.entries(keyChecks).forEach(([key, found]) => {
          console.log(
            `     ${found ? "✅" : "❌"} ${key}: ${found ? "已包含" : "未包含"}`
          );
        });
      } else {
        console.log("\n❌ AI 指導提示詞缺失");
      }

      return data;
    } else {
      console.log("❌ MCP 調用失敗:", response.data.error);
      return null;
    }
  } catch (error) {
    console.error("❌ 測試失敗:", error.message);
    return null;
  }
}

/**
 * 測試聊天 API 的 MCP 工具解析
 */
async function testChatAPIWithMCP(testCase) {
  console.log(`\n💬 測試聊天 API 整合: ${testCase.name}`);
  console.log("=".repeat(50));

  try {
    // 模擬 AI 回應，包含 MCP 工具調用
    const mockAIResponse = `我來查詢一下相關的 MIL 專案資料。

\`\`\`xml
<mcp_call>
<tool_name>${testCase.mcpPayload.tool}</tool_name>
<parameters>
${Object.entries(testCase.mcpPayload.parameters)
  .map(
    ([key, value]) =>
      `<${key}>${typeof value === "object" ? JSON.stringify(value) : value}</${key}>`
  )
  .join("\n")}
</parameters>
</mcp_call>
\`\`\`

讓我為您分析專案狀況。`;

    const response = await axios.post(
      `${BASE_URL}/api/chat/process`,
      {
        message: mockAIResponse,
        conversation_id: "test-conversation",
        user_question: `請分析 ${testCase.name} 的專案狀況`,
        enable_secondary_ai: true,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (response.data.success) {
      console.log("✅ 聊天 API 處理成功");

      const result = response.data.data;

      if (result.has_tool_calls) {
        console.log(`🔧 工具調用成功: ${result.tool_calls.length} 個工具`);

        // 檢查格式化結果中的 AI 指導提示詞
        if (result.formatted_results) {
          const hasAIInstructions =
            result.formatted_results.includes("🧠 AI 分析指導");
          console.log(
            `🧠 AI 指導提示詞在格式化結果中: ${hasAIInstructions ? "✅ 存在" : "❌ 缺失"}`
          );

          if (hasAIInstructions) {
            // 提取 AI 指導提示詞段落
            const instructionsMatch = result.formatted_results.match(
              /### 🧠 AI 分析指導\n([\s\S]*?)\n---/
            );
            if (instructionsMatch) {
              console.log(
                "   指導內容長度:",
                instructionsMatch[1].length,
                "字符"
              );
              console.log(
                "   前 150 字符:",
                instructionsMatch[1].substring(0, 150) + "..."
              );
            }
          }
        }

        if (result.used_secondary_ai) {
          console.log("🤖 二次 AI 調用已執行");
          console.log(
            "   最終回應長度:",
            result.final_response?.length || 0,
            "字符"
          );

          // 檢查二次 AI 是否遵循了指導提示詞
          if (result.final_response) {
            const responseContent = result.final_response.toLowerCase();
            const guidanceChecks = {
              提供風險分析:
                responseContent.includes("風險") ||
                responseContent.includes("延遲"),
              專注於專案管理:
                responseContent.includes("專案") ||
                responseContent.includes("負責人"),
              避免無關內容:
                !responseContent.includes("技術細節") &&
                !responseContent.includes("sql"),
            };

            console.log("   🎯 AI 回應質量檢查:");
            Object.entries(guidanceChecks).forEach(([key, passed]) => {
              console.log(
                `     ${passed ? "✅" : "❌"} ${key}: ${passed ? "通過" : "未通過"}`
              );
            });
          }
        }
      } else {
        console.log("❌ 沒有檢測到工具調用");
      }

      return result;
    } else {
      console.log("❌ 聊天 API 處理失敗:", response.data.error);
      return null;
    }
  } catch (error) {
    console.error("❌ 聊天 API 測試失敗:", error.message);
    return null;
  }
}

/**
 * 測試前端數據結構
 */
function testFrontendDataStructure(mcpData) {
  console.log("\n🖥️  測試前端數據結構相容性");
  console.log("=".repeat(50));

  // 模擬前端 getAIInstructions 函數的深度搜索邏輯
  function deepSearch(obj, key) {
    if (!obj || typeof obj !== "object") return null;

    if (obj[key]) {
      return obj[key];
    }

    for (const prop in obj) {
      if (typeof obj[prop] === "object") {
        const result = deepSearch(obj[prop], key);
        if (result) return result;
      }
    }

    return null;
  }

  const mockToolCall = {
    tool_name: "get_mil_list",
    success: true,
    result: mcpData,
    data: mcpData,
  };

  // 測試深度搜索
  const foundInstructions = deepSearch(mockToolCall, "aiInstructions");

  if (foundInstructions) {
    console.log("✅ 前端深度搜索成功找到 aiInstructions");
    console.log(`   指導內容長度: ${foundInstructions.length} 字符`);
    console.log("   前端顯示測試: 🧠 AI 分析指導區塊應該顯示");
  } else {
    console.log("❌ 前端深度搜索未找到 aiInstructions");
    console.log("   需要檢查數據結構或搜索邏輯");
  }

  // 測試條件判斷
  const shouldDisplay = !!foundInstructions;
  console.log(`   v-if="getAIInstructions()" 結果: ${shouldDisplay}`);

  return foundInstructions;
}

/**
 * 主測試函數
 */
async function runCompleteTest() {
  console.log("🚀 開始完整的 AI 指導提示詞功能測試");
  console.log("測試範圍: MCP 服務 → 聊天 API → 前端顯示");
  console.log("=".repeat(80));

  const results = {
    mcpTests: [],
    chatApiTests: [],
    frontendTests: [],
  };

  for (const testCase of testCases) {
    // 1. 測試 MCP 服務
    const mcpData = await testMCPService(testCase);
    results.mcpTests.push({
      name: testCase.name,
      success: !!mcpData,
      hasInstructions: !!(mcpData && mcpData.aiInstructions),
    });

    if (mcpData) {
      // 2. 測試聊天 API 整合
      const chatResult = await testChatAPIWithMCP(testCase);
      results.chatApiTests.push({
        name: testCase.name,
        success: !!chatResult,
        hasToolCalls: !!(chatResult && chatResult.has_tool_calls),
        usedSecondaryAI: !!(chatResult && chatResult.used_secondary_ai),
      });

      // 3. 測試前端數據結構
      const frontendInstructions = testFrontendDataStructure(mcpData);
      results.frontendTests.push({
        name: testCase.name,
        success: !!frontendInstructions,
      });
    }

    console.log("\n" + "─".repeat(80));
  }

  // 總結報告
  console.log("\n📋 測試結果總結");
  console.log("=".repeat(80));

  console.log("\n🔧 MCP 服務測試:");
  results.mcpTests.forEach((test) => {
    console.log(`   ${test.success ? "✅" : "❌"} ${test.name}`);
    if (test.success) {
      console.log(
        `      AI 指導提示詞: ${test.hasInstructions ? "✅ 存在" : "❌ 缺失"}`
      );
    }
  });

  console.log("\n💬 聊天 API 測試:");
  results.chatApiTests.forEach((test) => {
    console.log(`   ${test.success ? "✅" : "❌"} ${test.name}`);
    if (test.success) {
      console.log(`      工具調用: ${test.hasToolCalls ? "✅" : "❌"}`);
      console.log(`      二次 AI: ${test.usedSecondaryAI ? "✅" : "❌"}`);
    }
  });

  console.log("\n🖥️  前端相容性測試:");
  results.frontendTests.forEach((test) => {
    console.log(
      `   ${test.success ? "✅" : "❌"} ${test.name} - 深度搜索${test.success ? "成功" : "失敗"}`
    );
  });

  // 整體狀態評估
  const allMcpPassed = results.mcpTests.every(
    (t) => t.success && t.hasInstructions
  );
  const allChatPassed = results.chatApiTests.every(
    (t) => t.success && t.hasToolCalls && t.usedSecondaryAI
  );
  const allFrontendPassed = results.frontendTests.every((t) => t.success);

  console.log("\n🎯 整體功能狀態:");
  console.log(`   MCP 服務: ${allMcpPassed ? "✅ 完全正常" : "❌ 需要修復"}`);
  console.log(`   聊天 API: ${allChatPassed ? "✅ 完全正常" : "❌ 需要修復"}`);
  console.log(
    `   前端相容: ${allFrontendPassed ? "✅ 完全正常" : "❌ 需要修復"}`
  );

  const overallStatus = allMcpPassed && allChatPassed && allFrontendPassed;
  console.log(
    `\n🏁 總體結果: ${overallStatus ? "✅ AI 指導提示詞功能完全正常" : "❌ 需要進一步修復"}`
  );
}

// 執行測試
runCompleteTest().catch(console.error);

export {
  runCompleteTest,
  testMCPService,
  testChatAPIWithMCP,
  testFrontendDataStructure,
};
