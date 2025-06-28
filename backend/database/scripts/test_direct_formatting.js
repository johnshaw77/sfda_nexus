import mcpToolParser from "../../src/services/mcpToolParser.service.js";

// 🧪 直接測試 MIL 格式化函數的新增欄位
console.log("🧪 測試 MIL 格式化函數的新增欄位...\n");

try {
  // 模擬 MIL 服務返回的數據
  const mockMILData = {
    success: true,
    count: 3,
    totalRecords: 15,
    currentPage: 1,
    totalPages: 5,
    limit: 3,
    status: "OnGoing",
    timestamp: "2025-06-27T01:15:00.000Z",
    filters: {
      status: "OnGoing",
      delayDayMin: 5,
    },
    data: [
      {
        SerialNumber: "MIL-2024-001",
        TypeName: "設備維護",
        MidTypeName: "機械維護",
        is_APPLY: 1,
        Importance: "高",
        Status: "OnGoing",
        RecordDate: "2025-01-15",
        Proposer_Name: "張三",
        DRI_EmpName: "李四",
        DRI_Dept: "製造部",
        DelayDay: 8,
        IssueDiscription: "主要設備需要定期維護檢查",
        Location: "廠區A",
        PlanFinishDate: "2025-02-01",
        ActualFinishDate: null,
      },
      {
        SerialNumber: "MIL-2024-002",
        TypeName: "軟體升級",
        MidTypeName: null,
        is_APPLY: 0,
        Importance: "中",
        Status: "OnGoing",
        RecordDate: "2025-01-20",
        Proposer_Name: null,
        DRI_EmpName: "王五",
        DRI_Dept: "IT部",
        DelayDay: 12,
        IssueDiscription: null,
        Location: "辦公室B",
        PlanFinishDate: "2025-02-15",
        ActualFinishDate: null,
      },
      {
        SerialNumber: "MIL-2024-003",
        TypeName: "品質改善",
        MidTypeName: "製程改善",
        is_APPLY: 1,
        Importance: null,
        Status: "OnGoing",
        RecordDate: null,
        Proposer_Name: "趙六",
        DRI_EmpName: "錢七",
        DRI_Dept: "品保部",
        DelayDay: 3,
        IssueDiscription: "提升產品品質標準",
        Location: null,
        PlanFinishDate: null,
        ActualFinishDate: "2025-01-25",
      },
    ],
    statistics: {
      summary: "查詢到 3 筆進行中專案，平均延遲 7.7 天，涉及 3 位負責人",
      details: {
        totalCount: 3,
        avgDelayDays: 7.7,
        delayRange: { min: 3, max: 12 },
        riskAnalysis: {
          highRisk: 1,
          delayed: 3,
          onTimeOrEarly: 0,
        },
        responsibility: {
          uniqueDRICount: 3,
          uniqueDeptCount: 3,
        },
      },
    },
    aiInstructions: `**重要：只能基於統計摘要進行分析，不能編造具體專案**
- 如果用戶未表明欄位，則至少列出 SerialNumber, TypeName, MidTypeName, is_APPLY, Importance, Status, RecordDate, Proposer_Name, DRI_EmpName, DRI_Dept, DelayDay, IssueDiscription, Location, PlanFinishDate, ActualFinishDate 欄位

🚨 **高風險專案重點**：
- 這些專案延遲≥5天，屬於高風險狀態
- 分析延遲原因：資源不足、技術困難、溝通問題等
- 評估 DRI 負責人的工作負荷分配
- 提供立即可執行的風險控制措施

分析重點：基於統計數據的風險評估和改善建議`,
  };

  // 使用解析器實例
  const parser = mcpToolParser;

  // 測試格式化函數
  console.log("📊 測試 MIL 列表格式化函數...");
  const formattedResult = parser.formatMILListResult(mockMILData);

  console.log("✅ 格式化結果:");
  console.log("=".repeat(80));
  console.log(formattedResult);
  console.log("=".repeat(80));

  // 檢查新增的欄位是否都出現
  const newFields = [
    "is_APPLY",
    "Importance",
    "RecordDate",
    "Proposer_Name",
    "Location",
    "PlanFinishDate",
    "ActualFinishDate",
  ];

  console.log("\n🔍 檢查新增欄位是否出現:");
  let allFieldsFound = true;
  newFields.forEach((field) => {
    const found = formattedResult.includes(field);
    console.log(`- ${field}: ${found ? "✅ 找到" : "❌ 未找到"}`);
    if (!found) allFieldsFound = false;
  });

  // 檢查是否有「資料未提供」的標註
  const hasDataNotProvided = formattedResult.includes("資料未提供");
  console.log(
    `\n📝 是否有「資料未提供」標註: ${hasDataNotProvided ? "✅ 有" : "❌ 無"}`
  );

  // 檢查 AI 指導是否包含新欄位
  const aiInstructionsIncludesNewFields =
    mockMILData.aiInstructions.includes("Location") &&
    mockMILData.aiInstructions.includes("PlanFinishDate") &&
    mockMILData.aiInstructions.includes("ActualFinishDate");
  console.log(
    `\n🧠 AI 指導是否包含新欄位: ${aiInstructionsIncludesNewFields ? "✅ 有" : "❌ 無"}`
  );

  // 總結
  console.log(`\n🎯 測試總結:`);
  console.log(`- 所有新欄位都出現: ${allFieldsFound ? "✅ 是" : "❌ 否"}`);
  console.log(`- 有缺失資料標註: ${hasDataNotProvided ? "✅ 是" : "❌ 否"}`);
  console.log(
    `- AI 指導包含新欄位: ${aiInstructionsIncludesNewFields ? "✅ 是" : "❌ 否"}`
  );

  if (allFieldsFound && hasDataNotProvided && aiInstructionsIncludesNewFields) {
    console.log(`\n🎉 測試通過！新增欄位功能正常運作！`);
  } else {
    console.log(`\n⚠️ 測試未完全通過，請檢查上述項目。`);
  }
} catch (error) {
  console.error("❌ 測試執行失敗:", error.message);
  console.error("完整錯誤:", error);
}
