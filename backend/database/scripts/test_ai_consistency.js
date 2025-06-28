// 🧪 測試 AI 指導詞一致性

async function testAIConsistency() {
  try {
    console.log("🧪 測試 AI 指導詞一致性...\n");

    // 模擬不同情境下的指導詞
    const scenarios = [
      {
        name: "情境一：用戶指定3個欄位",
        userRequest: "只要 SerialNumber, ProposalFactory, Solution 這3個欄位",
        expectedBehavior: "僅顯示這3個欄位",
      },
      {
        name: "情境二：用戶要求5筆資料",
        userRequest: "給我5筆 MIL 資料",
        expectedBehavior: "顯示5筆資料（除非實際不足）",
      },
      {
        name: "情境三：用戶未指定欄位",
        userRequest: "查詢 MIL 列表",
        expectedBehavior:
          "顯示預設欄位（SerialNumber, ProposalFactory, Solution）",
      },
      {
        name: "情境四：用戶指定不同欄位",
        userRequest: "只要 SerialNumber 和 Status",
        expectedBehavior: "僅顯示 SerialNumber 和 Status",
      },
    ];

    console.log("📋 AI 一致性問題分析");
    console.log("=".repeat(60));

    console.log("🔍 **可能導致不一致的因素**：");
    console.log("1. **AI 模型的隨機性** - 相同指導詞可能產生不同回應");
    console.log("2. **指導詞優先級不明確** - AI 不知道哪個指示更重要");
    console.log("3. **上下文過載** - 太多指導詞導致 AI 選擇性遵循");
    console.log("4. **指導詞措辭模糊** - 「建議」vs「要求」的差異");
    console.log("5. **動態指導詞干擾** - 基礎指導被動態內容稀釋");
    console.log("");

    console.log("📊 **情境測試分析**：");
    scenarios.forEach((scenario, index) => {
      console.log(`\n${index + 1}. ${scenario.name}`);
      console.log(`   用戶請求: "${scenario.userRequest}"`);
      console.log(`   期望行為: ${scenario.expectedBehavior}`);
      console.log(`   一致性風險: ${getConsistencyRisk(scenario)}`);
    });

    console.log("\n💡 **提升一致性的策略**");
    console.log("=".repeat(60));

    console.log("🎯 **策略一：分層指導系統**");
    console.log("- **第1層**：用戶明確指示（最高優先級）");
    console.log("- **第2層**：工具預設規則（中等優先級）");
    console.log("- **第3層**：動態建議（最低優先級）");
    console.log("");

    console.log("🎯 **策略二：指導詞強化措辭**");
    console.log("- 使用「必須」、「僅」、「只」等強制性詞語");
    console.log("- 避免「建議」、「可以」、「盡量」等彈性詞語");
    console.log("- 明確標示「不要」、「禁止」的行為");
    console.log("");

    console.log("🎯 **策略三：上下文優化**");
    console.log("- 將關鍵指導詞放在指導詞開頭");
    console.log("- 使用顯眼的格式（如 **重要**、🚨 等）");
    console.log("- 減少不必要的動態指導內容");
    console.log("");

    console.log("🎯 **策略四：測試驗證機制**");
    console.log("- 同一指導詞多次測試確保一致性");
    console.log("- 記錄 AI 不遵循指導詞的情況");
    console.log("- 根據測試結果調整指導詞措辭");

    console.log("\n📝 **建議的優化指導詞格式**");
    console.log("=".repeat(60));

    const optimizedInstructions = `🚨 **最高優先級指示**：
- 如果用戶明確指定欄位，必須僅顯示用戶指定的欄位，不要添加其他欄位
- 如果用戶明確要求 N 筆資料，必須盡力提供 N 筆資料

📋 **預設行為**：
- 當用戶未指定欄位時，預設顯示：SerialNumber, ProposalFactory, Solution
- 當用戶未指定筆數時，根據實際資料情況合理顯示

🎨 **回應格式**：
- 使用清晰的表格格式
- 欄位標籤使用中文說明
- 重要資訊使用 emoji 標示`;

    console.log(optimizedInstructions);

    console.log("\n🔬 **具體改善建議**");
    console.log("=".repeat(60));

    console.log("📌 **立即行動**：");
    console.log("1. 重新排列指導詞優先級（用戶指示 > 預設規則 > 動態建議）");
    console.log("2. 強化關鍵指導詞的措辭（建議 → 必須）");
    console.log("3. 添加優先級標示（🚨 最高優先級）");
    console.log("4. 簡化動態指導內容，避免干擾基礎規則");
    console.log("");

    console.log("📌 **測試驗證**：");
    console.log("1. 多次測試相同指導詞的一致性");
    console.log("2. 記錄不一致的情況和模式");
    console.log("3. 根據測試結果持續優化指導詞");
    console.log("4. 考慮使用更確定性的 AI 參數（降低 temperature）");

    console.log("\n🎉 一致性分析完成");
    console.log("建議：優先實施分層指導系統和指導詞強化措辭");
  } catch (error) {
    console.error("❌ 測試失敗:", error.message || error);
  }
}

function getConsistencyRisk(scenario) {
  const risks = {
    "情境一：用戶指定3個欄位": "中等（AI 可能自行添加其他欄位）",
    "情境二：用戶要求5筆資料": "低（數量要求通常被遵循）",
    "情境三：用戶未指定欄位": "低（有明確預設規則）",
    "情境四：用戶指定不同欄位": "高（AI 可能忽略特定欄位要求）",
  };

  return risks[scenario.name] || "未知";
}

// 執行測試
testAIConsistency();
