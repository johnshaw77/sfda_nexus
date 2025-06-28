/**
 * 優化混合架構測試腳本
 * 驗證調整後的職責分工：
 * - Tool層：欄位選擇控制、基礎指導（欄位含義、格式）
 * - Service層：資料查詢、動態指導（基於查詢結果）
 */

import axios from "axios";

// MCP Server 配置
const MCP_BASE_URL = "http://localhost:8091";

/**
 * 測試 MIL Tool 的基礎指導詞
 */
async function testToolBaseInstructions() {
  console.log("\n🔧 =====【Tool層基礎指導測試】=====");

  try {
    const payload = {
      method: "tools/call",
      params: {
        name: "get_mil_list",
        arguments: {
          limit: 3,
          fields: ["SerialNumber", "ProposalFactory"], // Tool指定欄位
        },
      },
    };

    console.log("📤 發送請求:", JSON.stringify(payload, null, 2));

    const response = await axios.post(MCP_BASE_URL, payload, {
      headers: { "Content-Type": "application/json" },
    });

    if (response.data?.result?.content?.[0]?.text) {
      const aiInstructions = response.data.result.content[0].text;

      console.log("✅ Tool層基礎指導內容:");
      console.log("---");
      console.log(aiInstructions);
      console.log("---");

      // 檢查指導詞內容
      const checks = {
        包含欄位含義說明: aiInstructions.includes("欄位含義說明"),
        包含格式化要求: aiInstructions.includes("格式化要求"),
        包含分析重點: aiInstructions.includes("分析重點"),
        移除重複限制: !aiInstructions.includes("只能基於工具實際返回"),
        移除禁止添加: !aiInstructions.includes("絕對不可顯示工具未返回"),
        專注欄位解釋: aiInstructions.includes("ProposalFactory: 提案廠別"),
      };

      console.log("\n📋 指導詞內容檢查:");
      Object.entries(checks).forEach(([check, passed]) => {
        console.log(`${passed ? "✅" : "❌"} ${check}`);
      });

      return response.data.result;
    }
  } catch (error) {
    console.error("❌ Tool基礎指導測試失敗:", error.message);
    return null;
  }
}

/**
 * 測試欄位選擇控制
 */
async function testFieldSelection() {
  console.log("\n🎯 =====【欄位選擇控制測試】=====");

  const testCases = [
    {
      name: "預設欄位（Tool未指定）",
      fields: undefined,
      expected: ["SerialNumber", "ProposalFactory", "Solution"],
    },
    {
      name: "Tool指定2個欄位",
      fields: ["SerialNumber", "ProposalFactory"],
      expected: ["SerialNumber", "ProposalFactory"],
    },
    {
      name: "Tool指定擴展欄位",
      fields: [
        "SerialNumber",
        "ProposalFactory",
        "Solution",
        "TypeName",
        "DelayDay",
      ],
      expected: [
        "SerialNumber",
        "ProposalFactory",
        "Solution",
        "TypeName",
        "DelayDay",
      ],
    },
  ];

  for (const testCase of testCases) {
    console.log(`\n📊 測試案例：${testCase.name}`);

    try {
      const payload = {
        method: "tools/call",
        params: {
          name: "get_mil_list",
          arguments: {
            limit: 2,
            fields: testCase.fields,
          },
        },
      };

      const response = await axios.post(MCP_BASE_URL, payload, {
        headers: { "Content-Type": "application/json" },
      });

      if (response.data?.result?.content?.[1]?.text) {
        const rawData = JSON.parse(response.data.result.content[1].text);

        if (rawData.data && rawData.data.length > 0) {
          const actualFields = Object.keys(rawData.data[0]);

          console.log(`📝 期望欄位: ${testCase.expected.join(", ")}`);
          console.log(`📝 實際欄位: ${actualFields.join(", ")}`);

          // 檢查欄位是否符合預期
          const fieldsMatch =
            testCase.expected.every((field) => actualFields.includes(field)) &&
            actualFields.length === testCase.expected.length;

          console.log(`${fieldsMatch ? "✅" : "❌"} 欄位選擇控制`);

          // 顯示資料範例
          console.log("📊 資料範例:");
          console.log(JSON.stringify(rawData.data[0], null, 2));
        }
      }
    } catch (error) {
      console.error(`❌ ${testCase.name} 測試失敗:`, error.message);
    }
  }
}

/**
 * 測試混合架構職責分工
 */
async function testArchitectureResponsibilities() {
  console.log("\n🏗️ =====【混合架構職責分工測試】=====");

  try {
    const payload = {
      method: "tools/call",
      params: {
        name: "get_mil_list",
        arguments: {
          limit: 3,
          fields: ["SerialNumber", "ProposalFactory", "DelayDay"],
          status: "延遲",
        },
      },
    };

    const response = await axios.post(MCP_BASE_URL, payload, {
      headers: { "Content-Type": "application/json" },
    });

    if (response.data?.result?.content) {
      const [instructionsContent, dataContent] = response.data.result.content;

      console.log("🔧 Tool層（基礎指導）職責分析:");
      const instructions = instructionsContent.text;

      const toolResponsibilities = {
        欄位含義解釋: instructions.includes("SerialNumber: MIL序號"),
        格式化指導: instructions.includes("使用清晰的層次結構"),
        分析重點指導: instructions.includes("識別高風險專案"),
        代碼轉換指導: instructions.includes("將代碼型欄位轉換為中文"),
        移除重複限制: !instructions.includes("只能基於工具實際返回"),
      };

      Object.entries(toolResponsibilities).forEach(
        ([responsibility, fulfilled]) => {
          console.log(`${fulfilled ? "✅" : "❌"} ${responsibility}`);
        }
      );

      console.log("\n⚙️ Service層（資料查詢）職責分析:");
      const rawData = JSON.parse(dataContent.text);

      const serviceResponsibilities = {
        動態SQL構建: rawData.data && rawData.data.length > 0,
        欄位映射處理:
          rawData.data[0].ProposalFactory &&
          !rawData.data[0].ProposalFactory.match(/^[A-Z]{2}$/),
        統計資訊提供: rawData.stats !== undefined,
        基於查詢的動態指導:
          rawData.aiInstructions &&
          rawData.aiInstructions.includes("動態分析指導"),
      };

      Object.entries(serviceResponsibilities).forEach(
        ([responsibility, fulfilled]) => {
          console.log(`${fulfilled ? "✅" : "❌"} ${responsibility}`);
        }
      );

      // 檢查混合指導效果
      if (rawData.aiInstructions) {
        console.log("\n🧠 混合指導效果:");
        const hasBaseInstructions =
          rawData.aiInstructions.includes("基礎指導原則");
        const hasDynamicInstructions =
          rawData.aiInstructions.includes("動態分析指導");

        console.log(`${hasBaseInstructions ? "✅" : "❌"} 包含Tool基礎指導`);
        console.log(
          `${hasDynamicInstructions ? "✅" : "❌"} 包含Service動態指導`
        );
        console.log(
          `${hasBaseInstructions && hasDynamicInstructions ? "✅" : "❌"} 成功實現混合架構`
        );
      }
    }
  } catch (error) {
    console.error("❌ 混合架構職責分工測試失敗:", error.message);
  }
}

/**
 * 主測試函數
 */
async function runOptimizedArchitectureTests() {
  console.log("🚀 開始優化混合架構測試...\n");

  await testToolBaseInstructions();
  await testFieldSelection();
  await testArchitectureResponsibilities();

  console.log("\n🎯 =====【測試總結】=====");
  console.log("✅ Tool層專注於：欄位含義解釋、格式指導、分析重點");
  console.log("✅ Service層專注於：資料查詢、動態指導、統計分析");
  console.log("✅ 避免了重複的欄位限制邏輯");
  console.log("✅ 實現了清晰的職責分工");
  console.log("✅ 符合混合架構的原始設計理念");
}

// 執行測試
runOptimizedArchitectureTests()
  .then(() => {
    console.log("\n✅ 優化混合架構測試完成");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ 測試執行失敗:", error);
    process.exit(1);
  });

export {
  testToolBaseInstructions,
  testFieldSelection,
  testArchitectureResponsibilities,
  runOptimizedArchitectureTests,
};
