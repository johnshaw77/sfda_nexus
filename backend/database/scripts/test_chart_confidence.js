/**
 * 測試圖表檢測信心度修復
 */

import smartChartDetectionService from "../../src/services/smartChartDetection.service.js";

async function testChartConfidence() {
  console.log("🧪 === 測試圖表檢測信心度修復 ===");

  // 測試案例1：季度銷售數據（您的實際案例）
  const testCase1 = {
    userInput: "好的，我會為你創建一個長條圖來顯示四個季度的銷售額數據。",
    aiResponse: `{
      "tool": "create_chart",
      "parameters": {
        "data": [
          {"quarter": "Q1", "sales": 1200},
          {"quarter": "Q2", "sales": 1500},
          {"quarter": "Q3", "sales": 1800},
          {"quarter": "Q4", "sales": 2100}
        ],
        "title": "四季度銷售額趨勢",
        "chart_type": "bar",
        "description": "這張圖表顯示了Q1到Q4的銷售額變化情況。"
      }
    }`,
  };

  console.log("📊 測試案例1：季度銷售數據");
  const result1 = await smartChartDetectionService.detectChartIntent(
    testCase1.userInput,
    testCase1.aiResponse
  );
  console.log("結果1:", JSON.stringify(result1, null, 2));

  // 測試案例2：標準格式數據
  const testCase2 = {
    userInput: "請創建圖表",
    aiResponse: `數據如下：
    {
      "hasChartData": true,
      "data": [
        {"label": "產品A", "value": 100},
        {"label": "產品B", "value": 200},
        {"label": "產品C", "value": 150}
      ],
      "chartType": "pie",
      "confidence": 0.9
    }`,
  };

  console.log("\n📊 測試案例2：標準格式數據");
  const result2 = await smartChartDetectionService.detectChartIntent(
    testCase2.userInput,
    testCase2.aiResponse
  );
  console.log("結果2:", JSON.stringify(result2, null, 2));

  // 測試案例3：無效數據格式
  const testCase3 = {
    userInput: "請創建圖表",
    aiResponse: `{
      "hasChartData": true,
      "data": [
        {"invalid": "data", "format": "test"}
      ],
      "confidence": 0.8
    }`,
  };

  console.log("\n📊 測試案例3：無效數據格式");
  const result3 = await smartChartDetectionService.detectChartIntent(
    testCase3.userInput,
    testCase3.aiResponse
  );
  console.log("結果3:", JSON.stringify(result3, null, 2));

  console.log("\n✅ 測試完成");
}

testChartConfidence().catch(console.error);
