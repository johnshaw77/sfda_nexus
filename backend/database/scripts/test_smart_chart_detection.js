/**
 * 測試智能圖表檢測服務
 */

import smartChartDetectionService from "../../src/services/smartChartDetection.service.js";

async function testChartDetection() {
  console.log("🎯 開始測試智能圖表檢測服務...\n");

  const testCases = [
    {
      name: "百分比數據測試",
      userInput: "台部:50%、港澳:30%、台積電:20%，請幫我繪製圓餅圖",
      aiResponse:
        "根據您提供的數據，我為您分析各部門的比例分布：台部佔50%、港澳佔30%、台積電佔20%。",
    },
    {
      name: "營收數據測試",
      userInput: "請分析一下我們的季度營收",
      aiResponse:
        "根據數據顯示：Q1營收100萬、Q2營收150萬、Q3營收120萬、Q4營收180萬，整體呈現上升趨勢。",
    },
    {
      name: "無圖表數據測試",
      userInput: "今天天氣如何？",
      aiResponse: "今天天氣晴朗，溫度適中，是個出門的好日子。",
    },
    {
      name: "複雜數據測試",
      userInput: "幫我分析銷售數據",
      aiResponse:
        "銷售分析結果：產品A銷售額200萬元，產品B銷售額150萬元，產品C銷售額100萬元。建議重點推廣產品A。",
    },
  ];

  for (const testCase of testCases) {
    console.log(`📊 測試案例：${testCase.name}`);
    console.log(`用戶輸入：${testCase.userInput}`);
    console.log(`AI回應：${testCase.aiResponse}`);

    try {
      const result = await smartChartDetectionService.detectChartIntent(
        testCase.userInput,
        testCase.aiResponse
      );

      console.log("檢測結果：", {
        hasChartData: result.hasChartData,
        chartType: result.chartType,
        confidence: result.confidence,
        dataCount: result.data?.length || 0,
        title: result.title,
        reasoning: result.reasoning,
      });

      if (result.hasChartData && result.data) {
        console.log("提取的數據：", result.data);
      }
    } catch (error) {
      console.error("檢測失敗：", error.message);
    }

    console.log("─".repeat(60));
  }
}

// 執行測試
testChartDetection().catch(console.error);
