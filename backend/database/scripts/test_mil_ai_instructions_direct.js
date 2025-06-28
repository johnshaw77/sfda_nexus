/**
 * 直接測試 MIL AI 指導和欄位要求
 */

import dotenv from "dotenv";
dotenv.config();

console.log("🧠 測試 MIL AI 指導和欄位要求");
console.log("===============================");

// 模擬 MIL 工具返回的完整結果
const mockMILToolResult = {
  success: true,
  tool_name: "get-mil-list",
  service_name: "MIL專案管理",
  execution_time: 150,
  data: {
    success: true,
    count: 2,
    totalRecords: 74,
    data: [
      {
        SerialNumber: "I250613014",
        TypeName: "OQC/IPQC/LAB Issue",
        MidTypeName: "品質問題", // 包含 MidTypeName
        DelayDay: 12,
        DRI_EmpName: "張東勝",
        DRI_Dept: "品保部",
        IssueDiscription: "產品品質檢測發現異常，需要進行根因分析和改善措施", // 包含 IssueDiscription
        Status: "OnGoing",
      },
      {
        SerialNumber: "I250613013",
        TypeName: "OQC/IPQC/LAB Issue",
        MidTypeName: "檢測設備", // 包含 MidTypeName
        DelayDay: 12,
        DRI_EmpName: "張東勝",
        DRI_Dept: "品保部",
        IssueDiscription: "檢測設備校準異常，影響產品檢測準確性", // 包含 IssueDiscription
        Status: "OnGoing",
      },
    ],
    statistics: {
      summary:
        "延遲天數 ≥ 10 天的專案共 74 筆，平均延遲 29.9 天，高風險專案 73 筆（延遲>10天），延遲專案 74 筆，涉及 30 位負責人，橫跨 28 個部門。",
      details: {
        totalCount: 74,
        avgDelayDays: 29.9,
        highRiskCount: 73,
        delayedCount: 74,
      },
    },
    aiInstructions: `**重要：只能基於統計摘要進行分析，不能編造具體專案**
- 如果用戶未表明欄位，則至少列出 SerialNumber, TypeName, MidTypeName, DRI_EmpName, DRI_Dept, DelayDay,IssueDiscription 欄位

🚨 **高風險專案重點**：
- 這些專案延遲≥10天，屬於高風險狀態
- 分析延遲原因：資源不足、技術困難、溝通問題等
- 評估 DRI 負責人的工作負荷分配
- 提供立即可執行的風險控制措施

分析重點：基於統計數據的風險評估和改善建議`,
  },
};

// 測試格式化邏輯
import McpToolParser from "../../src/services/mcpToolParser.service.js";

const parser = new McpToolParser();

console.log("📊 測試工具結果格式化...");
const formattedResults = parser.formatToolResults([mockMILToolResult]);

console.log("✅ 格式化結果:");
console.log(formattedResults);
console.log("");

// 檢查關鍵要素
console.log("🔍 檢查結果:");

// 1. 檢查是否包含 AI 指導
if (formattedResults.includes("🧠 AI 分析指導")) {
  console.log("✅ 包含 AI 分析指導");
} else {
  console.log("❌ 缺少 AI 分析指導");
}

// 2. 檢查是否包含欄位要求
if (formattedResults.includes("SerialNumber, TypeName, MidTypeName")) {
  console.log("✅ 包含欄位要求說明");
} else {
  console.log("❌ 缺少欄位要求說明");
}

// 3. 檢查樣本數據是否包含所有必要欄位
const requiredFields = [
  "SerialNumber",
  "TypeName",
  "MidTypeName",
  "DelayDay",
  "DRI_EmpName",
  "DRI_Dept",
  "IssueDiscription",
];
let missingFields = [];

requiredFields.forEach((field) => {
  if (!formattedResults.includes(field)) {
    missingFields.push(field);
  }
});

if (missingFields.length === 0) {
  console.log("✅ 樣本數據包含所有必要欄位");
} else {
  console.log("❌ 樣本數據缺少欄位:", missingFields.join(", "));
}

// 4. 檢查是否有"資料未提供"標註
if (formattedResults.includes("資料未提供")) {
  console.log("✅ 包含資料未提供標註機制");
} else {
  console.log("⚠️ 未發現資料未提供標註（可能所有欄位都有資料）");
}

console.log("");
console.log("🎯 測試完成！");
console.log("");

// 顯示格式化結果的關鍵部分
console.log("📋 關鍵部分預覽:");
const lines = formattedResults.split("\n");
let inSampleSection = false;
let sampleLines = [];

for (let line of lines) {
  if (line.includes("📝 專案樣本")) {
    inSampleSection = true;
  }
  if (inSampleSection) {
    sampleLines.push(line);
    if (line.trim() === "" && sampleLines.length > 10) {
      break;
    }
  }
}

console.log(sampleLines.slice(0, 15).join("\n"));
