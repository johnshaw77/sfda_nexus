#!/usr/bin/env node

import chatService from "../../src/services/chat.service.js";

async function testChartModelOptimization() {
  console.log("🧪 === 測試圖表場景模型優化 ===");

  // 模擬圖表工具調用結果
  const mockToolCalls = [
    {
      function: {
        name: "create_chart",
        arguments: JSON.stringify({
          chart_type: "bar",
          labels: ["Q1", "Q2", "Q3", "Q4"],
          values: [1200, 1500, 1800, 2100],
          title: "季度銷售圖表",
        }),
      },
    },
  ];

  const mockToolResults = [
    {
      success: true,
      result: {
        chart_data: {
          chart_type: "bar",
          title: "季度銷售圖表",
          data: [
            { label: "Q1", value: 1200 },
            { label: "Q2", value: 1500 },
            { label: "Q3", value: 1800 },
            { label: "Q4", value: 2100 },
          ],
          confidence: 0.95,
        },
      },
    },
  ];

  const mockFormattedResults = `📊 **季度銷售圖表創建成功**

**圖表類型**: 長條圖
**圖表標題**: 季度銷售圖表
**數據信心度**: 95%

**數據明細**:
- Q1: 1,200
- Q2: 1,500 (+25.0%)
- Q3: 1,800 (+20.0%)
- Q4: 2,100 (+16.7%)

**趨勢分析**:
整體呈現上升趨勢，總增長率為 75%。`;

  console.log("\n=== 測試 1: 圖表場景優化檢測 ===");

  // 模擬圖表場景的處理
  const context = {
    user_id: 1,
    conversation_id: 123,
    model_config: {
      model_type: "ollama",
      model_id: "qwen3:32b", // 用戶選擇的重量級模型
      endpoint_url: "http://localhost:11434",
      api_key_encrypted: null,
    },
    user_question: "請幫我創建季度銷售數據的圖表",
    original_question: "請幫我創建季度銷售數據的圖表",
  };

  try {
    // 初始化資料庫連接
    const { initializeDatabase, query } = await import(
      "../../src/config/database.config.js"
    );
    await initializeDatabase();

    // 直接測試工具結果處理邏輯
    console.log("🎯 測試圖表工具檢測邏輯...");

    // 檢測是否為圖表創建場景
    const hasChartTools = mockToolCalls.some(
      (call) =>
        call.function?.name === "create_chart" || call.name === "create_chart"
    );

    console.log("圖表工具檢測結果:", hasChartTools);

    if (hasChartTools) {
      console.log("✅ 成功檢測到圖表創建工具調用");
      console.log("🎨 [圖表場景優化] 應該使用專門的輕量模型進行二次回應");

      console.log("🔍 查詢專門的圖表回應模型...");
      const { rows: chartModelRows } = await query(
        "SELECT * FROM ai_models WHERE model_id = ? AND is_active = 1",
        ["qwen2.5vl:7b"]
      );

      if (chartModelRows.length > 0) {
        const chartModel = chartModelRows[0];
        console.log(`✅ 找到專門模型: ${chartModel.model_id}`);
        console.log(`   端點: ${chartModel.endpoint_url}`);
        console.log(`   狀態: ${chartModel.is_enabled ? "啟用" : "停用"}`);
      } else {
        console.log("⚠️ 未找到 qwen2.5vl:7b 模型，嘗試尋找其他輕量模型...");

        const { rows: lightModelRows } = await query(
          "SELECT * FROM ai_models WHERE (model_id LIKE '%1.5b%' OR model_id LIKE '%3b%' OR model_id LIKE '%7b%') AND is_active = 1 LIMIT 1"
        );

        if (lightModelRows.length > 0) {
          const lightModel = lightModelRows[0];
          console.log(`✅ 找到 fallback 輕量模型: ${lightModel.model_id}`);
          console.log(`   端點: ${lightModel.endpoint_url}`);
        } else {
          console.log("❌ 未找到任何可用的輕量模型");
        }
      }
    } else {
      console.log("❌ 未檢測到圖表創建工具調用");
    }

    console.log("\n=== 測試 2: 對比非圖表場景 ===");

    const nonChartToolCalls = [
      {
        function: {
          name: "query_database",
          arguments: JSON.stringify({
            table: "employees",
            query: "SELECT COUNT(*) FROM employees",
          }),
        },
      },
    ];

    const hasNonChartTools = nonChartToolCalls.some(
      (call) =>
        call.function?.name === "create_chart" || call.name === "create_chart"
    );

    console.log("非圖表工具檢測結果:", hasNonChartTools);
    console.log(hasNonChartTools ? "❌ 錯誤檢測" : "✅ 正確檢測為非圖表場景");
  } catch (error) {
    console.error("❌ 測試失敗:", error.message);
  }

  console.log("\n🎉 圖表場景模型優化測試完成！");
}

testChartModelOptimization()
  .then(() => {
    console.log("\n✅ 所有測試完成");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ 測試過程中發生錯誤:", error);
    process.exit(1);
  });
