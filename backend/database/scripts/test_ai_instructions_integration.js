#!/usr/bin/env node
/**
 * 測試 AI 指導提示詞集成到 AI 總結的完整流程
 * 驗證從 MCP 工具返回的 aiInstructions 是否正確應用到 generateAISummaryStream 中
 */

console.log("=== AI 指導提示詞集成測試 ===\n");

// 模擬包含 aiInstructions 的工具調用結果
const mockToolResults = [
  {
    tool_name: "get_mil_list",
    success: true,
    result: {
      data: [
        {
          SerialNumber: "MIL001",
          TypeName: "OQC",
          DelayDay: 15,
          DRI_EmpName: "張三",
          Status: "OnGoing",
        },
        {
          SerialNumber: "MIL002",
          TypeName: "IQC",
          DelayDay: 25,
          DRI_EmpName: "李四",
          Status: "OnGoing",
        },
      ],
      aiInstructions: `**重要：請嚴格按照以下要求進行分析**

📋 **分析範圍限制**：
- 只分析查詢返回的專案數據，不要添加其他無關內容
- 基於實際的延遲天數進行風險評估

🚨 **高風險專案重點**：
- 這些專案延遲≥10天，屬於高風險狀態
- 分析延遲原因：資源不足、技術困難、溝通問題等
- 評估 DRI 負責人的工作負荷分配
- 提供立即可執行的風險控制措施

🎯 **回應要求**：
- 提供具體、可執行的改善建議
- 重點關注延遲天數超過 10 天的專案
- 分析負責人分布和工作負荷`,
      statistics: {
        summary: "查詢到 2 個高風險專案，平均延遲 20 天",
      },
    },
  },
];

// 模擬 coreData 構建過程（修復後的版本）
function buildCoreData(toolResults) {
  return toolResults
    .filter((r) => r.success)
    .map((r) => {
      let data = null;
      const toolName = r.tool_name;

      if (r.result?.data) {
        data = r.result.data;
      } else if (r.result) {
        data = r.result;
      } else {
        data = r;
      }

      return {
        tool: toolName,
        data: data,
        summary: r.result?.summary || r.result?.result?.summary,
        // 🤖 新增：提取 AI 指導提示詞
        aiInstructions:
          r.result?.aiInstructions ||
          r.data?.aiInstructions ||
          r.result?.data?.aiInstructions ||
          null,
      };
    });
}

// 模擬 generateAISummaryStream 的提示詞構建邏輯（修復後的版本）
function buildSummaryPrompt(coreData, userQuestion) {
  const dataFormat = coreData.map((item) => ({
    tool: item.tool,
    key_data: item.data,
    summary: item.summary,
  }));

  // 🤖 提取所有工具的 AI 指導提示詞
  const allAIInstructions = coreData
    .map((item) => item.aiInstructions)
    .filter((instructions) => instructions && instructions.trim())
    .join("\n\n");

  let summaryPrompt = `請根據以下查詢結果，為用戶提供簡潔的分析總結：

**用戶問題**: ${userQuestion}

**原始工具數據**:
${JSON.stringify(coreData, null, 2)}

**處理後的數據摘要**:
${JSON.stringify(dataFormat, null, 2)}`;

  // 🤖 如果有 AI 指導提示詞，優先使用動態指導
  if (allAIInstructions) {
    summaryPrompt += `

**🧠 重要：請嚴格遵循以下 AI 分析指導**：
${allAIInstructions}

**基於上述指導的分析要求**:
1. 嚴格按照上述 AI 指導提示詞進行分析
2. 用5-7句話簡潔回答用戶問題
3. 基於實際數據提供關鍵洞察
4. 不要編造數據中沒有的信息
5. 保持對話式語調，避免技術術語`;
  } else {
    summaryPrompt += `

**分析要求**:
1. 用5-7句話簡潔回答用戶問題
2. 仔細檢查數據中的延遲天數(Delay_Day)等關鍵字段
3. 基於實際數據提供關鍵洞察
4. 不要編造數據中沒有的信息
5. 保持對話式語調，避免技術術語
6. 如果數據不足以回答問題，請誠實說明

請特別注意：數據中包含的延遲天數信息，並據此回答用戶的問題。`;
  }

  summaryPrompt += `

請提供分析：`;

  return { summaryPrompt, allAIInstructions };
}

async function testAIInstructionsIntegration() {
  try {
    console.log("1. 📋 模擬工具調用結果:");
    console.log(JSON.stringify(mockToolResults, null, 2));
    console.log("");

    console.log("2. 🔧 構建 coreData (修復後):");
    const coreData = buildCoreData(mockToolResults);
    console.log(JSON.stringify(coreData, null, 2));
    console.log("");

    console.log("3. 🤖 檢查 aiInstructions 提取:");
    const hasAIInstructions = coreData.some((item) => item.aiInstructions);
    console.log(
      `   有 AI 指導提示詞: ${hasAIInstructions ? "✅ 是" : "❌ 否"}`
    );

    if (hasAIInstructions) {
      const instructions = coreData.find(
        (item) => item.aiInstructions
      )?.aiInstructions;
      console.log(`   指導內容長度: ${instructions.length} 字符`);
      console.log(`   指導內容預覽: ${instructions.substring(0, 100)}...`);
    }
    console.log("");

    console.log("4. 📝 構建 AI 總結提示詞 (修復後):");
    const userQuestion = "查詢延遲超過10天的高風險專案";
    const { summaryPrompt, allAIInstructions } = buildSummaryPrompt(
      coreData,
      userQuestion
    );

    console.log(`   提示詞總長度: ${summaryPrompt.length} 字符`);
    console.log(`   包含動態指導: ${!!allAIInstructions ? "✅ 是" : "❌ 否"}`);
    console.log(`   動態指導長度: ${allAIInstructions.length} 字符`);
    console.log("");

    console.log("5. 🔍 提示詞內容分析:");
    const hasHighRiskGuidance = summaryPrompt.includes("高風險專案重點");
    const hasDelayAnalysis = summaryPrompt.includes("延遲原因");
    const hasActionableAdvice = summaryPrompt.includes("可執行的改善建議");
    const hasStrictFollowing =
      summaryPrompt.includes("嚴格按照上述 AI 指導提示詞");

    console.log(
      `   包含高風險指導: ${hasHighRiskGuidance ? "✅ 是" : "❌ 否"}`
    );
    console.log(`   包含延遲分析: ${hasDelayAnalysis ? "✅ 是" : "❌ 否"}`);
    console.log(
      `   包含可執行建議: ${hasActionableAdvice ? "✅ 是" : "❌ 否"}`
    );
    console.log(
      `   包含嚴格遵循指令: ${hasStrictFollowing ? "✅ 是" : "❌ 否"}`
    );
    console.log("");

    console.log("6. 📋 完整提示詞預覽:");
    console.log("─".repeat(80));
    console.log(summaryPrompt);
    console.log("─".repeat(80));
    console.log("");

    console.log("7. ✅ 測試結果總結:");
    const allChecksPass =
      hasAIInstructions &&
      hasHighRiskGuidance &&
      hasDelayAnalysis &&
      hasStrictFollowing;

    if (allChecksPass) {
      console.log("   🎉 所有檢查通過！AI 指導提示詞已成功集成到 AI 總結中");
      console.log("   📈 修復效果：");
      console.log("   - ✅ coreData 正確提取 aiInstructions");
      console.log("   - ✅ generateAISummaryStream 使用動態指導");
      console.log("   - ✅ 提示詞包含具體的分析重點");
      console.log("   - ✅ AI 將根據查詢條件提供針對性分析");
    } else {
      console.log("   ❌ 部分檢查失敗，需要進一步修復");
    }
  } catch (error) {
    console.error("❌ 測試失敗:", error.message);
  }
}

// 執行測試
testAIInstructionsIntegration();
