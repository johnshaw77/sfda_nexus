// 數據提取測試腳本
import { ConversationDataExtractor } from "../utils/conversationDataExtractor.js";

const extractor = new ConversationDataExtractor();

// 測試數據
const testText =
  "您提供的數據是 A:50%、B:30%、C:20%，總和為 100%。請問您需要進行什麼樣的分析或處理？";

console.log("🧪 開始測試數據提取...");
console.log("📝 測試文本:", testText);

const result = extractor.extractData(testText);

console.log("\n✅ 提取結果:");
console.log("Success:", result.success);
console.log("Chart Type:", result.chartType);
console.log("Data:", result.data);
console.log("Suggestions:", result.suggestions);

// 預期結果應該是：{A: 50, B: 30, C: 20}
// 不應該包含：總和為、A:50%、B:3、、C:2 等錯誤項目

if (result.success && result.data) {
  const dataKeys = Object.keys(result.data);
  console.log("\n🔍 數據分析:");
  console.log("數據項目數量:", dataKeys.length);
  console.log("數據項目:", dataKeys);

  // 檢查是否包含錯誤項目
  const hasInvalidItems = dataKeys.some(
    (key) =>
      key.includes("、") ||
      key.includes("：") ||
      key.includes("%") ||
      key.includes("總和") ||
      result.data[key] === 0
  );

  if (hasInvalidItems) {
    console.log("❌ 發現無效項目!");
  } else {
    console.log("✅ 數據清理成功!");
  }

  // 檢查預期的正確項目
  const expectedKeys = ["A", "B", "C"];
  const hasAllExpected = expectedKeys.every(
    (key) => dataKeys.includes(key) && result.data[key] > 0
  );

  if (hasAllExpected) {
    console.log("✅ 包含所有預期項目!");
  } else {
    console.log("❌ 缺少預期項目!");
  }
}
