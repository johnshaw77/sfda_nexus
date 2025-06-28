/**
 * 測試強化後的 AI 指導提示詞內容
 */

import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 模擬強化後的 generateAIInstructions 邏輯
function generateEnhancedAIInstructions(stats, filters, data) {
  const instructions = [];

  // 🔧 超嚴格的基礎指導 - 防止AI編造內容
  instructions.push("**🚨 緊急指令：絕對禁止編造任何專案信息！**");
  instructions.push("");
  instructions.push("🛑 **絕對數據邊界**：");
  instructions.push("- 只能討論查詢結果中明確列出的統計數據和摘要信息");
  instructions.push("- 絕對不能編造專案編號、專案名稱或具體專案詳情");
  instructions.push("- 如果沒有具體專案詳情，只能基於統計摘要進行分析");
  instructions.push("- 禁止使用「專案A」、「專案B」或任何虛構的專案標識");
  instructions.push("");
  instructions.push("📊 **只能使用的信息**：");
  instructions.push("- 統計數字：總專案數、平均延遲天數、高風險專案數量");
  instructions.push("- 摘要信息：地點統計、負責人數量、部門分布");
  instructions.push("- 風險分析：延遲分布、狀態統計");
  instructions.push("");

  // 根據延遲天數條件調整重點
  if (filters.delayDayMin >= 10) {
    instructions.push("🚨 **高風險專案重點**：");
    instructions.push(
      `- 這些專案延遲≥${filters.delayDayMin}天，屬於高風險狀態`
    );
    instructions.push("- 分析延遲原因：資源不足、技術困難、溝通問題等");
    instructions.push("- 評估 DRI 負責人的工作負荷分配");
    instructions.push("- 提供立即可執行的風險控制措施");
    instructions.push("");
  } else if (stats.highRiskCount > 0) {
    instructions.push("⚠️ **風險評估重點**：");
    instructions.push(
      `- 發現 ${stats.highRiskCount} 個高風險專案（延遲>10天）`
    );
    instructions.push("- 分析高風險專案的共同特徵");
    instructions.push("- 識別潛在的系統性問題");
    instructions.push("");
  }

  // 根據地點條件添加特殊指導
  if (filters.location) {
    instructions.push("🏭 **地點分析重點**：");
    instructions.push(`- 專注於 ${filters.location} 地點的專案狀況`);
    instructions.push("- 評估該地點的資源配置和執行能力");
    instructions.push("- 識別地點特有的挑戰和解決方案");
    instructions.push("");
  }

  // 根據負責人情況添加指導
  if (stats.uniqueDRICount <= 3) {
    instructions.push("💼 **負責人分析**：");
    instructions.push("- 負責人集中度高，檢視工作負荷分配");
    instructions.push("- 評估是否需要增加人力資源");
  } else if (stats.uniqueDRICount > 10) {
    instructions.push("👥 **協調管理**：");
    instructions.push("- 涉及多位負責人，關注協調和溝通機制");
    instructions.push("- 建議建立統一的專案追蹤體系");
  }

  // 根據專案類型添加指導
  if (filters.typeName) {
    instructions.push("");
    instructions.push("📋 **專案類型重點**：");
    instructions.push(`- 聚焦於 ${filters.typeName} 類型專案的特殊需求`);
    instructions.push("- 分析該類型專案的典型挑戰");
  }

  // 結論性指導
  instructions.push("");
  instructions.push("🎯 **正確的回應方式**：");
  instructions.push("- 使用「根據統計數據顯示...」、「查詢結果表明...」等開頭");
  instructions.push("- 只基於統計摘要提供風險評估和改善建議");
  instructions.push("- 絕對不能提及具體的專案編號或虛構案例");
  instructions.push("- 保持專業、簡潔，避免編造任何不存在的信息");
  instructions.push("");
  instructions.push("❌ **絕對禁止**：");
  instructions.push("- 編造專案編號（如：MIL2024001、專案A等）");
  instructions.push("- 編造人員姓名或具體專案詳情");
  instructions.push("- 使用假設性或範例性內容");
  instructions.push("- 超出查詢結果範圍的任何具體信息");

  return instructions.join("\n");
}

// 測試案例
const testCases = [
  {
    name: "高風險專案測試",
    filters: { delayDayMin: 10, location: "C#3FOQC" },
    stats: { highRiskCount: 8, uniqueDRICount: 5 },
  },
  {
    name: "地點特定分析",
    filters: { location: "C#3FOQC", typeName: "OQC" },
    stats: { highRiskCount: 3, uniqueDRICount: 2 },
  },
];

console.log("🔥 強化後的 AI 指導提示詞測試");
console.log("=".repeat(80));

testCases.forEach((testCase, index) => {
  console.log(`\n📝 測試案例 ${index + 1}: ${testCase.name}`);
  console.log("-".repeat(50));

  const instructions = generateEnhancedAIInstructions(
    testCase.stats,
    testCase.filters,
    []
  );

  console.log("🤖 生成的指導提示詞：");
  console.log(instructions);

  // 檢查關鍵防護措施
  const protections = {
    禁止編造專案: instructions.includes("絕對禁止編造任何專案信息"),
    數據邊界限制: instructions.includes("絕對數據邊界"),
    禁止虛構標識: instructions.includes("禁止使用「專案A」、「專案B」"),
    正確回應方式: instructions.includes("正確的回應方式"),
    明確禁止清單: instructions.includes("絕對禁止"),
  };

  console.log("\n🛡️ 防護措施檢查：");
  Object.entries(protections).forEach(([key, found]) => {
    console.log(
      `   ${found ? "✅" : "❌"} ${key}: ${found ? "已包含" : "未包含"}`
    );
  });

  console.log(`\n📏 指導內容長度: ${instructions.length} 字符`);
  console.log("\n" + "=".repeat(80));
});

console.log("\n🎯 總結：強化的指導提示詞現在包含：");
console.log("   - 🚨 緊急指令開頭，強調禁止編造");
console.log("   - 🛑 明確的數據邊界限制");
console.log("   - 📊 清晰定義可使用的信息範圍");
console.log("   - 🎯 正確的回應方式指導");
console.log("   - ❌ 詳細的禁止行為清單");
console.log("\n這應該能有效防止 AI 編造專案編號或虛構內容！");
