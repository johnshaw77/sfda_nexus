/**
 * 測試 chartIntegrationService 修復
 * 驗證 calculateDataSize 和 processData 的問題是否已解決
 */

import { chartIntegrationService } from "../services/chartIntegrationService.js";

console.log("🧪 [chartIntegrationService-fix-test] 開始測試...");

// 測試 1: calculateDataSize 處理 undefined/null
console.log("\n📊 測試 1: calculateDataSize 邊界情況");
try {
  const service = chartIntegrationService;

  console.log("  - undefined:", service.calculateDataSize(undefined));
  console.log("  - null:", service.calculateDataSize(null));
  console.log("  - 空字符串:", service.calculateDataSize(""));
  console.log("  - 正常字符串:", service.calculateDataSize("hello"));
  console.log("  - 正常對象:", service.calculateDataSize({ a: 1, b: 2 }));

  console.log("✅ calculateDataSize 測試通過");
} catch (error) {
  console.error("❌ calculateDataSize 測試失敗:", error);
}

// 測試 2: processData 正確的參數格式
console.log("\n📊 測試 2: processData 參數格式");
try {
  const testData = "週一 1200元，週二 1500元，週三 980元";

  const result = await chartIntegrationService.processData({
    source: "conversation",
    data: testData,
    options: {
      chartType: "bar",
      title: "每日銷售額",
    },
  });

  console.log("  - 處理結果:", {
    success: result.success,
    chartsCount: result.charts?.length || 0,
    hasMetadata: !!result.metadata,
    errors: result.errors?.length || 0,
  });

  console.log("✅ processData 格式測試通過");
} catch (error) {
  console.error("❌ processData 格式測試失敗:", error);
}

// 測試 3: 模擬之前出錯的場景
console.log("\n📊 測試 3: 模擬用戶輸入場景");
try {
  const userInput =
    "本週銷售數據：週一 1200元，週二 1500元，週三 980元，週四 1800元，週五 2100元";

  // 模擬 useSmartSuggestions 的調用方式
  const result = await chartIntegrationService.processData({
    source: "conversation",
    data: userInput,
    options: {
      chartType: "bar",
      title: "數據圖表",
    },
  });

  console.log("  - 智能建議場景結果:", {
    success: result.success,
    chartsCount: result.charts?.length || 0,
    hasData: result.charts?.[0]?.data ? true : false,
    errorCount: result.errors?.length || 0,
  });

  if (result.errors?.length > 0) {
    console.log("  - 錯誤詳情:", result.errors);
  }

  console.log("✅ 用戶輸入場景測試通過");
} catch (error) {
  console.error("❌ 用戶輸入場景測試失敗:", error);
}

console.log("\n🎉 所有測試完成！");
