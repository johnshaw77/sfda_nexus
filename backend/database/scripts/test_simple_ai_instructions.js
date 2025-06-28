/**
 * 簡單測試 AI 指導功能
 */

console.log("🧠 簡單 AI 指導測試");
console.log("==================");

// 模擬 MIL 服務返回的結果（包含 aiInstructions）
const mockMILResult = {
  success: true,
  count: 3,
  totalRecords: 15,
  data: [
    {
      SerialNumber: "MIL-2024-001",
      TypeName: "設備維護",
      DelayDay: 8,
      DRI_EmpName: "張三",
      Status: "OnGoing",
    },
    {
      SerialNumber: "MIL-2024-002",
      TypeName: "軟體升級",
      DelayDay: 12,
      DRI_EmpName: "李四",
      Status: "OnGoing",
    },
  ],
  statistics: {
    summary: "查詢到 3 筆進行中專案，平均延遲 9.5 天，涉及 2 位負責人",
    details: {
      totalCount: 3,
      avgDelayDays: 9.5,
      highRiskCount: 1,
      delayedCount: 3,
    },
  },
  aiInstructions: `**重要：只能基於統計摘要進行分析，不能編造具體專案**，如果用戶未表明欄位，則至少返回SerialNumber, TypeName, MidTypeName, DelayDay,IssueDiscription

🚨 **高風險專案重點**：
- 這些專案延遲≥5天，屬於高風險狀態
- 分析延遲原因：資源不足、技術困難、溝通問題等
- 評估 DRI 負責人的工作負荷分配
- 提供立即可執行的風險控制措施

分析重點：基於統計數據的風險評估和改善建議`,
};

// 測試格式化邏輯
import McpToolParser from "../../src/services/mcpToolParser.service.js";

const parser = new McpToolParser();

// 模擬工具執行結果
const mockToolResults = [
  {
    success: true,
    tool_name: "get-mil-list",
    service_name: "MIL專案管理",
    execution_time: 150,
    data: mockMILResult,
  },
];

console.log("📊 測試工具結果格式化...");
const formattedResults = parser.formatToolResults(mockToolResults);

console.log("✅ 格式化結果:");
console.log(formattedResults);
console.log("");

// 檢查是否包含 AI 指導
if (formattedResults.includes("🧠 AI 分析指導")) {
  console.log("✅ 成功檢測到 AI 分析指導");
} else {
  console.log("❌ 未檢測到 AI 分析指導");
}

// 檢查關鍵提示詞
if (formattedResults.includes("不能編造具體專案")) {
  console.log("✅ 包含防止編造的指導");
} else {
  console.log("❌ 缺少防止編造的指導");
}

console.log("");
console.log("🎯 測試完成！");
