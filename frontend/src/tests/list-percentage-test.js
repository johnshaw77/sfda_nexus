// 列表式百分比提取測試腳本
import { ConversationDataExtractor } from "../utils/conversationDataExtractor.js";

const extractor = new ConversationDataExtractor();

// 測試數據
const testCases = [
  "您提供的數據顯示 A、B、C 三類別的佔比為 50%、30%、20%。",
  "A、B、C 類別的佔比為 40%、35%、25%",
  "銷售部、行政部、技術部 三類別的佔比為 45%、25%、30%",
  "產品A、產品B、產品C的佔比為60%、25%、15%",
];

console.log("🧪 開始測試列表式百分比提取...\n");

testCases.forEach((testText, index) => {
  console.log(`📝 測試案例 ${index + 1}:`, testText);

  const result = extractor.extractData(testText);

  console.log("✅ 提取結果:");
  console.log("Success:", result.success);
  console.log("Chart Type:", result.chartType);
  console.log("Data:", result.data);

  if (result.success && result.data) {
    const dataKeys = Object.keys(result.data);
    console.log("數據項目:", dataKeys);
    console.log("數據值:", Object.values(result.data));

    // 檢查是否有 A、B、C 三個項目
    const hasCorrectItems = dataKeys.length >= 3;
    console.log(
      hasCorrectItems ? "✅ 包含正確數量的項目!" : "❌ 項目數量不正確!"
    );
  }

  console.log("─".repeat(50));
});
