#!/usr/bin/env node

import smartChartDetectionService from "../../src/services/smartChartDetection.service.js";

async function testModelConsistency() {
  console.log("🧪 測試智能圖表檢測模型一致性");

  // 測試輕量模型
  console.log("\n=== 測試 1: 輕量模型 qwen2.5:1.5b ===");
  const lightweightResult = await smartChartDetectionService.detectChartIntent(
    "請幫我畫一個銷售圖表",
    "我為您製作季度銷售圖表...",
    { model_id: "qwen2.5:1.5b" }
  );

  console.log("輕量模型結果:", {
    hasChartData: lightweightResult.hasChartData,
    confidence: lightweightResult.confidence,
    reasoning: lightweightResult.reasoning,
  });

  // 測試重量級模型
  console.log("\n=== 測試 2: 重量級模型 qwen3:8b ===");
  const heavyweightResult = await smartChartDetectionService.detectChartIntent(
    "請幫我畫一個銷售圖表",
    "我為您製作季度銷售圖表...",
    { model_id: "qwen3:8b" }
  );

  console.log("重量級模型結果:", {
    hasChartData: heavyweightResult.hasChartData,
    confidence: heavyweightResult.confidence,
    reasoning: heavyweightResult.reasoning,
  });

  // 測試無圖表意圖
  console.log("\n=== 測試 3: 無圖表意圖 ===");
  const noChartResult = await smartChartDetectionService.detectChartIntent(
    "今天天氣怎麼樣？",
    "今天天氣晴朗，溫度適中。",
    { model_id: "qwen2.5:1.5b" }
  );

  console.log("無圖表意圖結果:", {
    hasChartData: noChartResult.hasChartData,
    confidence: noChartResult.confidence,
    reasoning: noChartResult.reasoning,
  });
}

testModelConsistency()
  .then(() => {
    console.log("\n✅ 模型一致性測試完成");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ 測試失敗:", error);
    process.exit(1);
  });
