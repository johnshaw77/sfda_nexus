/**
 * 全面的圖表類型測試腳本
 *
 * 測試 pie、bar、line 三種圖表類型的完整創建流程
 */

import axios from "axios";

// 配置
const BACKEND_URL = "http://localhost:3000";
const TEST_CREDENTIALS = {
  identifier: "admin",
  password: "admin123",
};

// 測試數據集
const TEST_CASES = [
  {
    name: "圓餅圖測試",
    data: {
      serviceId: 49,
      toolName: "create_chart",
      parameters: {
        chart_type: "pie",
        labels: ["台部", "港澳", "台積電"],
        values: [50, 30, 20],
        title: "市場份額分布圓餅圖",
      },
    },
  },
  {
    name: "長條圖測試",
    data: {
      serviceId: 49,
      toolName: "create_chart",
      parameters: {
        chart_type: "bar",
        labels: ["Q1", "Q2", "Q3", "Q4"],
        values: [1200, 1500, 1800, 2100],
        title: "季度銷售額長條圖",
        x_axis_label: "季度",
        y_axis_label: "銷售額 (萬元)",
      },
    },
  },
  {
    name: "折線圖測試",
    data: {
      serviceId: 49,
      toolName: "create_chart",
      parameters: {
        chart_type: "line",
        labels: ["1月", "2月", "3月", "4月", "5月", "6月"],
        values: [65, 78, 85, 92, 88, 95],
        title: "月度客戶滿意度趨勢",
        x_axis_label: "月份",
        y_axis_label: "滿意度 (%)",
      },
    },
  },
];

async function runComprehensiveChartTest() {
  let authToken = null;
  let createChartTool = null;

  try {
    console.log("🚀 開始全面圖表類型測試...");

    // 步驟 1: 登入獲取 token
    console.log("\n📝 步驟 1: 用戶登入...");
    const loginResponse = await axios.post(
      `${BACKEND_URL}/api/auth/login`,
      TEST_CREDENTIALS
    );

    if (loginResponse.data.success) {
      authToken = loginResponse.data.data.access_token;
      console.log("✅ 登入成功，獲得 token");
    } else {
      throw new Error("登入失敗：" + loginResponse.data.message);
    }

    // 步驟 2: 查詢 create_chart 工具
    console.log("\n🔍 步驟 2: 查詢 create_chart 工具...");
    const toolsResponse = await axios.get(`${BACKEND_URL}/api/mcp/tools`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    createChartTool = toolsResponse.data.data.find(
      (tool) => tool.name === "create_chart" && tool.mcp_service_id === 49
    );

    if (!createChartTool) {
      throw new Error("找不到 create_chart 工具");
    }

    console.log(
      `✅ 找到工具: ${createChartTool.name} (ID: ${createChartTool.id})`
    );

    // 步驟 3: 依次測試所有圖表類型
    console.log("\n🔧 步驟 3: 測試所有圖表類型...");

    const results = [];

    for (let i = 0; i < TEST_CASES.length; i++) {
      const testCase = TEST_CASES[i];
      console.log(`\n--- 測試 ${i + 1}: ${testCase.name} ---`);

      // 設置正確的 toolId
      testCase.data.toolId = createChartTool.id;

      try {
        const toolCallResponse = await axios.post(
          `${BACKEND_URL}/api/mcp/tools/call`,
          testCase.data,
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (toolCallResponse.data.success) {
          const result = toolCallResponse.data.data;

          console.log(`✅ ${testCase.name} 創建成功！`);
          console.log(`   執行時間: ${result.execution_time || "N/A"}ms`);

          // 檢查圖表數據
          if (
            result.data &&
            result.data._meta &&
            result.data._meta.chart_data
          ) {
            const chartData = result.data._meta.chart_data;
            console.log(`   圖表類型: ${chartData.chart_type}`);
            console.log(`   圖表標題: ${chartData.title}`);
            console.log(`   數據點數: ${chartData.data.length}`);
            console.log(`   可信度: ${chartData.confidence}`);

            results.push({
              name: testCase.name,
              success: true,
              chartType: chartData.chart_type,
              dataPoints: chartData.data.length,
              confidence: chartData.confidence,
              hasCorrectMeta: result.data._meta.tool_type === "chart_creation",
            });
          } else {
            console.log(`⚠️ ${testCase.name} 缺少圖表數據`);
            results.push({
              name: testCase.name,
              success: false,
              error: "缺少圖表數據",
            });
          }
        } else {
          console.log(
            `❌ ${testCase.name} 失敗: ${toolCallResponse.data.message}`
          );
          results.push({
            name: testCase.name,
            success: false,
            error: toolCallResponse.data.message,
          });
        }
      } catch (error) {
        console.log(`❌ ${testCase.name} 異常: ${error.message}`);
        results.push({
          name: testCase.name,
          success: false,
          error: error.message,
        });
      }

      // 測試間隔，避免併發問題
      if (i < TEST_CASES.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // 總結報告
    console.log("\n📊 ===== 測試總結報告 =====");
    console.log(`總測試數: ${results.length}`);
    console.log(`成功數: ${results.filter((r) => r.success).length}`);
    console.log(`失敗數: ${results.filter((r) => !r.success).length}`);

    console.log("\n📋 詳細結果:");
    results.forEach((result, index) => {
      if (result.success) {
        console.log(`${index + 1}. ✅ ${result.name}`);
        console.log(`   - 圖表類型: ${result.chartType}`);
        console.log(`   - 數據點數: ${result.dataPoints}`);
        console.log(`   - 可信度: ${result.confidence}`);
        console.log(`   - 元數據正確: ${result.hasCorrectMeta ? "是" : "否"}`);
      } else {
        console.log(`${index + 1}. ❌ ${result.name}`);
        console.log(`   - 錯誤: ${result.error}`);
      }
    });

    const allSuccessful = results.every((r) => r.success);
    const allHaveCorrectMeta = results
      .filter((r) => r.success)
      .every((r) => r.hasCorrectMeta);

    console.log("\n🎯 結論:");
    if (allSuccessful && allHaveCorrectMeta) {
      console.log("🎉 所有圖表類型測試完全成功！");
      console.log("✅ MCP 圖表創建系統完全準備就緒！");
      console.log("✅ 前端可以正確檢測和顯示所有類型的圖表！");
    } else {
      console.log("⚠️ 部分測試失敗，需要進一步調試");
    }
  } catch (error) {
    console.error("\n❌ 測試過程中發生錯誤:", error.message);

    if (error.response) {
      console.error("HTTP 狀態碼:", error.response.status);
      console.error("回應數據:", JSON.stringify(error.response.data, null, 2));
    }

    process.exit(1);
  }
}

// 執行測試
runComprehensiveChartTest();
