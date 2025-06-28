/**
 * create_chart 集成測試腳本
 *
 * 測試從後端管理系統到 MCP 服務器的完整圖表創建流程
 */

import axios from "axios";

// 配置
const BACKEND_URL = "http://localhost:3000";
const TEST_CREDENTIALS = {
  identifier: "admin",
  password: "admin123",
};

// 測試數據
const TEST_DATA = {
  serviceId: 49, // 統計分析服務 ID
  toolId: 217, // create_chart 工具 ID
  toolName: "create_chart",
  parameters: {
    chart_type: "pie",
    labels: ["台部", "港澳", "台積電"],
    values: [50, 30, 20],
    title: "MCP 集成測試圓餅圖",
  },
};

async function runCreateChartTest() {
  let authToken = null;

  try {
    console.log("🚀 開始 create_chart 集成測試...");

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

    // 步驟 2: 查詢 create_chart 工具的實際 ID
    console.log("\n🔍 步驟 2: 查詢 create_chart 工具 ID...");
    const toolsResponse = await axios.get(`${BACKEND_URL}/api/mcp/tools`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const createChartTool = toolsResponse.data.data.find(
      (tool) => tool.name === "create_chart" && tool.mcp_service_id === 49
    );

    if (!createChartTool) {
      throw new Error("找不到 create_chart 工具");
    }

    console.log(
      `✅ 找到工具: ${createChartTool.name} (ID: ${createChartTool.id})`
    );
    console.log(`   服務: ${createChartTool.service_name}`);
    console.log(`   描述: ${createChartTool.description}`);

    // 更新測試數據中的 toolId
    TEST_DATA.toolId = createChartTool.id;

    // 步驟 3: 調用 MCP 工具
    console.log("\n🔧 步驟 3: 調用 create_chart 工具...");
    console.log("請求參數:", JSON.stringify(TEST_DATA, null, 2));

    const toolCallResponse = await axios.post(
      `${BACKEND_URL}/api/mcp/tools/call`,
      TEST_DATA,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (toolCallResponse.data.success) {
      console.log("✅ 工具調用成功！");
      console.log("\n📊 圖表創建結果:");

      const result = toolCallResponse.data.data;
      console.log("- 成功狀態:", result.success);
      console.log("- 工具名稱:", result.tool_name);
      console.log("- 服務名稱:", result.service_name);
      console.log("- 執行時間:", result.execution_time + "ms");

      // 檢查是否有圖表數據
      if (result.data && result.data._meta && result.data._meta.chart_data) {
        const chartData = result.data._meta.chart_data;
        console.log("\n📈 圖表數據:");
        console.log("- 圖表類型:", chartData.chart_type);
        console.log("- 圖表標題:", chartData.title);
        console.log("- 可信度:", chartData.confidence);
        console.log("- 數據點數量:", chartData.data.length);
        console.log("- 推理說明:", chartData.reasoning);

        console.log("\n📋 詳細數據:");
        chartData.data.forEach((item, index) => {
          console.log(`  ${index + 1}. ${item.label}: ${item.value}`);
        });

        // 檢查工具類型標識
        if (result.data._meta.tool_type === "chart_creation") {
          console.log("\n✅ 工具類型標識正確: chart_creation");
        } else {
          console.log("\n⚠️ 工具類型標識異常:", result.data._meta.tool_type);
        }
      } else {
        console.log("\n⚠️ 未找到圖表數據，完整回應結構:");
        console.log(JSON.stringify(result, null, 2));
      }

      console.log("\n🎉 集成測試完成 - 圖表創建成功！");
      console.log("✅ 前端可以使用此數據格式進行圖表檢測和顯示");
    } else {
      throw new Error("工具調用失敗：" + toolCallResponse.data.message);
    }
  } catch (error) {
    console.error("\n❌ 測試失敗:", error.message);

    if (error.response) {
      console.error("HTTP 狀態碼:", error.response.status);
      console.error("回應數據:", JSON.stringify(error.response.data, null, 2));
    }

    process.exit(1);
  }
}

// 執行測試
runCreateChartTest();
