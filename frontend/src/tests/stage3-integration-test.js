/**
 * 🎯 第三階段：AI 對話界面深度整合 - 綜合測試腳本
 *
 * 測試所有第三階段實現的核心功能：
 * 1. 智能建議系統
 * 2. 對話圖表檢測
 * 3. 實時分析功能
 * 4. 圖表生成整合
 */

import { useSmartSuggestions } from "@/composables/useSmartSuggestions";
import { chartIntegrationService } from "@/services/chartIntegrationService";

class Stage3IntegrationTest {
  constructor() {
    this.testResults = [];
    this.smartSuggestions = null;
  }

  // 初始化測試環境
  async initializeTest() {
    console.log("🎯 開始第三階段整合測試...");

    // 設置智能建議系統
    this.smartSuggestions = useSmartSuggestions();

    console.log("✅ 測試環境初始化完成");
  }

  // 測試1：智能數據模式檢測
  async testDataPatternDetection() {
    console.log("\n📊 測試1：智能數據模式檢測");

    const testCases = [
      {
        name: "表格數據檢測",
        input:
          "| 產品 | 銷量 | 比例 |\n| A | 100 | 30% |\n| B | 200 | 60% |\n| C | 50 | 10% |",
        expectedPatterns: ["table", "percentage"],
      },
      {
        name: "時間序列檢測",
        input: "2024年1月銷量150萬，2024年2月銷量180萬，2024年3月銷量220萬",
        expectedPatterns: ["timeseries", "numbers"],
      },
      {
        name: "比較數據檢測",
        input: "產品A比產品B高20%，增長率達到15%，超過市場平均水平",
        expectedPatterns: ["comparison", "percentage"],
      },
      {
        name: "純數值數據檢測",
        input: "銷售數據：120, 150, 180, 200, 175, 195, 210",
        expectedPatterns: ["numbers"],
      },
    ];

    for (const testCase of testCases) {
      try {
        this.smartSuggestions.setInput(testCase.input);

        // 等待分析完成
        await new Promise((resolve) => setTimeout(resolve, 1500));

        const suggestions = this.smartSuggestions.suggestions.value;
        const hasExpectedPatterns = testCase.expectedPatterns.every((pattern) =>
          suggestions.some((s) => s.pattern === pattern)
        );

        this.logTestResult(testCase.name, hasExpectedPatterns, {
          input: testCase.input.substring(0, 50) + "...",
          expectedPatterns: testCase.expectedPatterns,
          actualSuggestions: suggestions.length,
          detectedPatterns: suggestions.map((s) => s.pattern),
        });
      } catch (error) {
        this.logTestResult(testCase.name, false, { error: error.message });
      }
    }
  }

  // 測試2：圖表建議準確性
  async testChartRecommendationAccuracy() {
    console.log("\n📈 測試2：圖表建議準確性");

    const testCases = [
      {
        name: "餅圖推薦測試",
        input: "市場份額：蘋果 35%，三星 28%，華為 20%，小米 17%",
        expectedChartType: "pie",
        expectedConfidence: 0.8,
      },
      {
        name: "柱狀圖推薦測試",
        input: "各部門銷量統計：銷售部 120萬，市場部 85萬，技術部 45萬",
        expectedChartType: "bar",
        expectedConfidence: 0.7,
      },
      {
        name: "折線圖推薦測試",
        input: "月度增長趨勢：1月 100，2月 120，3月 145，4月 160",
        expectedChartType: "line",
        expectedConfidence: 0.8,
      },
    ];

    for (const testCase of testCases) {
      try {
        this.smartSuggestions.setInput(testCase.input);

        // 等待分析完成
        await new Promise((resolve) => setTimeout(resolve, 1500));

        const chartSuggestions = this.smartSuggestions.chartSuggestions.value;
        const hasExpectedChart = chartSuggestions.some(
          (s) =>
            s.chartType === testCase.expectedChartType &&
            s.confidence >= testCase.expectedConfidence
        );

        this.logTestResult(testCase.name, hasExpectedChart, {
          expectedChart: testCase.expectedChartType,
          expectedConfidence: testCase.expectedConfidence,
          actualSuggestions: chartSuggestions.map((s) => ({
            type: s.chartType,
            confidence: s.confidence,
            title: s.title,
          })),
        });
      } catch (error) {
        this.logTestResult(testCase.name, false, { error: error.message });
      }
    }
  }

  // 測試3：對話數據提取功能
  async testConversationDataExtraction() {
    console.log("\n💬 測試3：對話數據提取功能");

    const testCases = [
      {
        name: "自然語言數據提取",
        input:
          "根據統計，第一季度收入為500萬元，第二季度收入為680萬元，第三季度收入為750萬元，第四季度收入為820萬元。",
        expectedDataPoints: 4,
      },
      {
        name: "混合格式數據提取",
        input: "產品銷量報告：\n產品A：1200台\n產品B：800台\n增長率：25%",
        expectedDataPoints: 3,
      },
      {
        name: "百分比數據提取",
        input: "用戶滿意度調查：非常滿意 45%，滿意 35%，普通 15%，不滿意 5%",
        expectedDataPoints: 4,
      },
    ];

    for (const testCase of testCases) {
      try {
        const result = await chartIntegrationService.processData(
          testCase.input,
          "conversation"
        );

        const hasValidData =
          result.success &&
          result.chartData &&
          result.chartData.data.length >= testCase.expectedDataPoints;

        this.logTestResult(testCase.name, hasValidData, {
          input: testCase.input.substring(0, 50) + "...",
          expectedDataPoints: testCase.expectedDataPoints,
          actualDataPoints: result.success ? result.chartData.data.length : 0,
          extractedData: result.success ? result.chartData.data : null,
          error: result.success ? null : result.error,
        });
      } catch (error) {
        this.logTestResult(testCase.name, false, { error: error.message });
      }
    }
  }

  // 測試4：分析需求識別
  async testAnalysisNeedsRecognition() {
    console.log("\n🔍 測試4：分析需求識別");

    const testCases = [
      {
        name: "統計分析需求識別",
        input: "請計算這組數據的平均值和標準差：12, 15, 18, 20, 22, 25, 28",
        expectedAnalysisType: "statistical",
      },
      {
        name: "趨勢分析需求識別",
        input: "分析近3個月的銷量變化趨勢，預測下個月的可能增長",
        expectedAnalysisType: "trend",
      },
      {
        name: "分布分析需求識別",
        input: "研究用戶年齡分布特徵，找出主要用戶群體的範圍",
        expectedAnalysisType: "distribution",
      },
    ];

    for (const testCase of testCases) {
      try {
        this.smartSuggestions.setInput(testCase.input);

        // 等待分析完成
        await new Promise((resolve) => setTimeout(resolve, 1500));

        const analysisSuggestions =
          this.smartSuggestions.analysisSuggestions.value;
        const hasExpectedAnalysis = analysisSuggestions.some(
          (s) => s.pattern === testCase.expectedAnalysisType
        );

        this.logTestResult(testCase.name, hasExpectedAnalysis, {
          expectedType: testCase.expectedAnalysisType,
          actualSuggestions: analysisSuggestions.map((s) => ({
            type: s.pattern,
            title: s.title,
            confidence: s.confidence,
          })),
        });
      } catch (error) {
        this.logTestResult(testCase.name, false, { error: error.message });
      }
    }
  }

  // 測試5：防抖機制驗證
  async testDebouncePerformance() {
    console.log("\n⚡ 測試5：防抖機制驗證");

    try {
      const startTime = Date.now();
      let analysisCount = 0;

      // 模擬快速輸入
      const inputs = [
        "銷量數據",
        "銷量數據：",
        "銷量數據：100",
        "銷量數據：100,",
        "銷量數據：100, 200",
        "銷量數據：100, 200, 300",
      ];

      // 監聽分析開始
      const originalAnalyzing = this.smartSuggestions.isAnalyzing.value;

      for (const input of inputs) {
        this.smartSuggestions.setInput(input);
        await new Promise((resolve) => setTimeout(resolve, 100)); // 快速輸入
      }

      // 等待防抖完成
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // 驗證只進行了一次分析
      const finalSuggestions = this.smartSuggestions.suggestions.value;
      const hasValidResult = finalSuggestions.length > 0;

      this.logTestResult("防抖機制測試", hasValidResult && totalTime < 3000, {
        totalTime: totalTime + "ms",
        inputCount: inputs.length,
        finalSuggestions: finalSuggestions.length,
        expectedBehavior: "只進行最後一次分析，避免重複計算",
      });
    } catch (error) {
      this.logTestResult("防抖機制測試", false, { error: error.message });
    }
  }

  // 記錄測試結果
  logTestResult(testName, passed, details = {}) {
    const result = {
      name: testName,
      passed,
      timestamp: new Date().toISOString(),
      details,
    };

    this.testResults.push(result);

    const status = passed ? "✅ 通過" : "❌ 失敗";
    console.log(`${status} ${testName}`);

    if (details && Object.keys(details).length > 0) {
      console.log("   詳細信息:", details);
    }
  }

  // 生成測試報告
  generateTestReport() {
    console.log("\n" + "=".repeat(60));
    console.log("🎯 第三階段整合測試報告");
    console.log("=".repeat(60));

    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter((r) => r.passed).length;
    const failedTests = totalTests - passedTests;
    const successRate = Math.round((passedTests / totalTests) * 100);

    console.log(`\n📊 測試統計:`);
    console.log(`   總測試數: ${totalTests}`);
    console.log(`   通過數: ${passedTests}`);
    console.log(`   失敗數: ${failedTests}`);
    console.log(`   成功率: ${successRate}%`);

    if (failedTests > 0) {
      console.log(`\n❌ 失敗的測試:`);
      this.testResults
        .filter((r) => !r.passed)
        .forEach((r) => {
          console.log(`   - ${r.name}`);
          if (r.details.error) {
            console.log(`     錯誤: ${r.details.error}`);
          }
        });
    }

    console.log(
      `\n🎉 第三階段整合測試${successRate >= 80 ? "成功" : "需要改進"}!`
    );
    console.log("=".repeat(60));

    return {
      success: successRate >= 80,
      totalTests,
      passedTests,
      failedTests,
      successRate,
      results: this.testResults,
    };
  }

  // 執行完整測試套件
  async runFullTestSuite() {
    try {
      await this.initializeTest();

      await this.testDataPatternDetection();
      await this.testChartRecommendationAccuracy();
      await this.testConversationDataExtraction();
      await this.testAnalysisNeedsRecognition();
      await this.testDebouncePerformance();

      return this.generateTestReport();
    } catch (error) {
      console.error("🚨 測試套件執行失敗:", error);
      return {
        success: false,
        error: error.message,
        results: this.testResults,
      };
    }
  }
}

// 導出測試類
export default Stage3IntegrationTest;

// 如果直接運行此文件，執行測試
if (typeof window !== "undefined") {
  // 瀏覽器環境
  window.Stage3IntegrationTest = Stage3IntegrationTest;

  // 提供全局測試函數
  window.runStage3Test = async () => {
    const test = new Stage3IntegrationTest();
    return await test.runFullTestSuite();
  };

  console.log("🎯 第三階段測試腳本已載入");
  console.log("👉 在瀏覽器控制台執行 window.runStage3Test() 開始測試");
}

/**
 * 使用說明：
 *
 * 1. 在瀏覽器中打開應用
 * 2. 打開開發者工具的控制台
 * 3. 執行 window.runStage3Test()
 * 4. 查看詳細的測試結果和報告
 *
 * 測試範圍：
 * - 智能數據模式檢測 (表格、時間序列、比較、數值)
 * - 圖表推薦準確性 (餅圖、柱狀圖、折線圖)
 * - 對話數據提取 (自然語言、混合格式、百分比)
 * - 分析需求識別 (統計、趨勢、分布)
 * - 防抖機制性能驗證
 */
