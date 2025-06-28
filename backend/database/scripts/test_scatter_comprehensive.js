/**
 * 散點圖全面測試腳本
 *
 * 測試散點圖工具的完整功能，包括：
 * - 通過 MCP 工具調用 create_scatter
 * - 驗證 base64 圖片生成
 * - 測試不同場景的數據分析
 * - 自然語言詢問測試
 */

import axios from "axios";
import fs from "fs";
import path from "path";

// 配置
const BACKEND_URL = "http://localhost:3000";
const TEST_CREDENTIALS = {
  identifier: "admin",
  password: "admin123",
};

// 測試場景數據 - 來自測試案例文檔
const SCATTER_TEST_CASES = [
  {
    name: "員工年資與薪資關係分析",
    naturalLanguage: "請幫我分析員工年資和薪資的關係，我想看看薪資制度是否合理",
    toolCall: {
      serviceId: 49, // SFDA MCP Server
      toolName: "create_scatter",
      parameters: {
        x: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        y: [
          35000, 38000, 41000, 44000, 47000, 50000, 53000, 56000, 59000, 62000,
          65000, 68000, 71000, 74000, 77000,
        ],
        title: "員工年資與薪資關係",
        x_axis_label: "工作年資 (年)",
        y_axis_label: "月薪 (元)",
        show_regression_line: true,
        generate_image: true,
        context: {
          scenario: "general",
          x_variable_name: "工作年資",
          y_variable_name: "員工薪資",
          relationship_hypothesis: "positive_correlation",
          analysis_purpose: "薪資制度合理性分析",
        },
      },
    },
  },
  {
    name: "廣告投入與銷售額關係",
    naturalLanguage: "我想了解廣告預算和銷售業績的關係，幫我生成散點圖分析",
    toolCall: {
      serviceId: 49,
      toolName: "create_scatter",
      parameters: {
        x: [
          50, 75, 100, 125, 150, 175, 200, 225, 250, 275, 300, 325, 350, 375,
          400,
        ],
        y: [
          280, 320, 360, 400, 440, 480, 520, 560, 595, 625, 650, 670, 685, 695,
          700,
        ],
        title: "廣告投入與銷售額關係分析",
        x_axis_label: "月廣告預算 (萬元)",
        y_axis_label: "月銷售額 (萬元)",
        show_regression_line: true,
        generate_image: true,
        context: {
          scenario: "general",
          x_variable_name: "廣告預算",
          y_variable_name: "銷售額",
          relationship_hypothesis: "positive_correlation",
          analysis_purpose: "廣告投資效益評估",
        },
      },
    },
  },
  {
    name: "製程溫度與產品強度關係",
    naturalLanguage: "幫我分析製程溫度對產品強度的影響，我需要優化生產參數",
    toolCall: {
      serviceId: 49,
      toolName: "create_scatter",
      parameters: {
        x: [
          180, 185, 190, 195, 200, 205, 210, 215, 220, 225, 230, 235, 240, 245,
          250,
        ],
        y: [
          425, 445, 465, 485, 505, 525, 545, 565, 580, 590, 595, 585, 570, 550,
          520,
        ],
        title: "製程溫度與產品強度關係",
        x_axis_label: "製程溫度 (°C)",
        y_axis_label: "產品強度 (MPa)",
        show_regression_line: true,
        generate_image: true,
        context: {
          scenario: "quality",
          x_variable_name: "製程溫度",
          y_variable_name: "產品強度",
          relationship_hypothesis: "非線性關係",
          analysis_purpose: "製程最佳化與品質控制",
        },
      },
    },
  },
];

/**
 * 保存 base64 圖片到檔案
 */
function saveBase64Image(base64Data, filename, format = "png") {
  try {
    // 移除 data:image/png;base64, 前綴（如果存在）
    const cleanBase64 = base64Data.replace(/^data:image\/[a-z]+;base64,/, "");

    // 轉換為 Buffer
    const imageBuffer = Buffer.from(cleanBase64, "base64");

    // 建立檔案路徑
    const outputDir = path.join(process.cwd(), "test_outputs");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filePath = path.join(outputDir, `${filename}.${format}`);

    // 寫入檔案
    fs.writeFileSync(filePath, imageBuffer);

    console.log(`   📁 圖片已保存: ${filePath}`);
    console.log(`   📏 檔案大小: ${(imageBuffer.length / 1024).toFixed(2)} KB`);

    return filePath;
  } catch (error) {
    console.error(`   ❌ 圖片保存失敗: ${error.message}`);
    return null;
  }
}

/**
 * 驗證圖片 base64 數據
 */
function validateBase64Image(base64Data, testName) {
  console.log(`   🔍 驗證 ${testName} 的圖片數據...`);

  if (!base64Data) {
    console.log(`   ❌ 沒有圖片數據`);
    return false;
  }

  // 檢查 base64 格式
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  const cleanBase64 = base64Data.replace(/^data:image\/[a-z]+;base64,/, "");

  if (!base64Regex.test(cleanBase64)) {
    console.log(`   ❌ base64 格式無效`);
    return false;
  }

  // 檢查圖片大小
  const sizeBytes = (cleanBase64.length * 3) / 4;
  const sizeKB = sizeBytes / 1024;

  console.log(`   ✅ base64 格式有效`);
  console.log(`   📊 估計圖片大小: ${sizeKB.toFixed(2)} KB`);

  // 合理的圖片大小範圍檢查
  if (sizeKB < 10) {
    console.log(`   ⚠️ 圖片可能太小 (< 10KB)`);
  } else if (sizeKB > 1000) {
    console.log(`   ⚠️ 圖片可能太大 (> 1MB)`);
  } else {
    console.log(`   ✅ 圖片大小正常`);
  }

  return true;
}

/**
 * 測試自然語言對話
 */
async function testNaturalLanguageChat(authToken, testCase) {
  console.log(`\n🗣️ 測試自然語言對話: ${testCase.name}`);
  console.log(`💬 用戶輸入: "${testCase.naturalLanguage}"`);

  try {
    const chatResponse = await axios.post(
      `${BACKEND_URL}/api/chat/send`,
      {
        message: testCase.naturalLanguage,
        conversation_id: null, // 新對話
      },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (chatResponse.data.success) {
      const response = chatResponse.data.data;
      console.log(`✅ AI 回應成功`);
      console.log(`📝 回應長度: ${response.response?.length || 0} 字符`);

      // 檢查是否包含工具調用
      if (response.tool_calls && response.tool_calls.length > 0) {
        console.log(`🔧 包含 ${response.tool_calls.length} 個工具調用`);
        const scatterCalls = response.tool_calls.filter(
          (call) => call.tool_name === "create_scatter"
        );
        console.log(`📈 其中散點圖調用: ${scatterCalls.length} 個`);

        return {
          success: true,
          hasToolCalls: true,
          scatterCalls: scatterCalls.length,
          response: response.response,
        };
      } else {
        console.log(`ℹ️ 無工具調用，純文字回應`);
        return {
          success: true,
          hasToolCalls: false,
          response: response.response,
        };
      }
    } else {
      console.log(`❌ 對話失敗: ${chatResponse.data.message}`);
      return { success: false, error: chatResponse.data.message };
    }
  } catch (error) {
    console.log(`❌ 對話異常: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 直接測試工具調用
 */
async function testDirectToolCall(authToken, toolId, testCase) {
  console.log(`\n🔧 測試直接工具調用: ${testCase.name}`);

  try {
    const toolCallData = {
      ...testCase.toolCall,
      toolId: toolId,
    };

    const toolCallResponse = await axios.post(
      `${BACKEND_URL}/api/mcp/tools/call`,
      toolCallData,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (toolCallResponse.data.success) {
      const result = toolCallResponse.data.data;
      console.log(`✅ 工具調用成功！`);
      console.log(`⏱️ 執行時間: ${result.execution_time || "N/A"}ms`);

      // 檢查回應內容
      if (result.data && result.data.content) {
        const content = result.data.content[0];
        console.log(`📄 回應類型: ${content.type}`);
        console.log(`📊 回應長度: ${content.text?.length || 0} 字符`);
      }

      // 檢查元數據
      if (result.data && result.data._meta) {
        const meta = result.data._meta;
        console.log(`🏷️ 工具類型: ${meta.tool_type}`);
        console.log(`📈 圖表類型: ${meta.chart_type}`);

        // 檢查相關性分析
        if (meta.correlation_analysis) {
          const corr = meta.correlation_analysis;
          console.log(`📊 Pearson 相關係數: ${corr.pearson_r?.toFixed(4)}`);
          console.log(`📊 相關性強度: ${corr.strength}`);
          console.log(`📊 相關性方向: ${corr.direction}`);
        }

        // 檢查迴歸分析
        if (meta.regression_analysis) {
          const reg = meta.regression_analysis;
          console.log(`📉 迴歸方程式: ${reg.equation}`);
          console.log(`📉 R²: ${reg.r_squared?.toFixed(4)}`);
        }

        // 檢查圖片數據
        if (meta.image_data) {
          console.log(`🖼️ 圖片格式: ${meta.image_data.format}`);
          console.log(`🖼️ Base64 大小: ${meta.image_data.size} 字符`);

          // 驗證並保存圖片
          const isValid = validateBase64Image(
            meta.image_data.base64,
            testCase.name
          );
          if (isValid) {
            const filename = `scatter_${testCase.name.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}`;
            saveBase64Image(
              meta.image_data.base64,
              filename,
              meta.image_data.format
            );
          }

          return {
            success: true,
            hasImage: true,
            imageValid: isValid,
            correlation: meta.correlation_analysis,
            regression: meta.regression_analysis,
          };
        } else {
          console.log(`⚠️ 沒有圖片數據`);
          return {
            success: true,
            hasImage: false,
            correlation: meta.correlation_analysis,
            regression: meta.regression_analysis,
          };
        }
      } else {
        console.log(`⚠️ 缺少元數據`);
        return { success: true, hasImage: false };
      }
    } else {
      console.log(`❌ 工具調用失敗: ${toolCallResponse.data.message}`);
      return { success: false, error: toolCallResponse.data.message };
    }
  } catch (error) {
    console.log(`❌ 工具調用異常: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runScatterComprehensiveTest() {
  let authToken = null;
  let scatterTool = null;

  try {
    console.log("🚀 開始散點圖全面測試...");
    console.log(`📊 測試案例數量: ${SCATTER_TEST_CASES.length}`);

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

    // 步驟 2: 查詢 create_scatter 工具
    console.log("\n🔍 步驟 2: 查詢 create_scatter 工具...");
    const toolsResponse = await axios.get(`${BACKEND_URL}/api/mcp/tools`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    scatterTool = toolsResponse.data.data.find(
      (tool) => tool.name === "create_scatter" && tool.mcp_service_id === 49
    );

    if (!scatterTool) {
      throw new Error("找不到 create_scatter 工具");
    }

    console.log(`✅ 找到工具: ${scatterTool.name} (ID: ${scatterTool.id})`);
    console.log(`📋 工具描述: ${scatterTool.description}`);

    // 步驟 3: 測試所有場景
    const results = [];

    for (let i = 0; i < SCATTER_TEST_CASES.length; i++) {
      const testCase = SCATTER_TEST_CASES[i];
      console.log(`\n═══ 測試案例 ${i + 1}: ${testCase.name} ═══`);

      // 3A: 測試自然語言對話
      const chatResult = await testNaturalLanguageChat(authToken, testCase);

      // 3B: 測試直接工具調用
      const toolResult = await testDirectToolCall(
        authToken,
        scatterTool.id,
        testCase
      );

      results.push({
        name: testCase.name,
        chatTest: chatResult,
        toolTest: toolResult,
        overallSuccess: chatResult.success && toolResult.success,
      });

      // 測試間隔
      if (i < SCATTER_TEST_CASES.length - 1) {
        console.log(`\n⏳ 等待 2 秒後進行下一個測試...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    // 總結報告
    console.log("\n🎯 ======= 散點圖測試總結報告 =======");
    console.log(`📊 總測試案例: ${results.length}`);
    console.log(
      `✅ 成功案例: ${results.filter((r) => r.overallSuccess).length}`
    );
    console.log(
      `❌ 失敗案例: ${results.filter((r) => !r.overallSuccess).length}`
    );

    const successfulImages = results.filter(
      (r) => r.toolTest.success && r.toolTest.hasImage && r.toolTest.imageValid
    ).length;
    console.log(`🖼️ 成功生成圖片: ${successfulImages}`);

    console.log("\n📋 詳細結果:");
    results.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.name}`);
      console.log(
        `   🗣️ 自然語言對話: ${result.chatTest.success ? "✅" : "❌"}`
      );
      if (result.chatTest.hasToolCalls) {
        console.log(`   🔧 包含散點圖調用: ${result.chatTest.scatterCalls} 個`);
      }
      console.log(
        `   🔧 直接工具調用: ${result.toolTest.success ? "✅" : "❌"}`
      );
      console.log(`   🖼️ 圖片生成: ${result.toolTest.hasImage ? "✅" : "❌"}`);
      if (result.toolTest.hasImage) {
        console.log(
          `   📊 圖片驗證: ${result.toolTest.imageValid ? "✅" : "❌"}`
        );
      }
      if (result.toolTest.correlation) {
        console.log(
          `   📈 相關係數: ${result.toolTest.correlation.pearson_r?.toFixed(4)}`
        );
      }
    });

    console.log("\n🎉 測試完成！檢查 test_outputs 目錄查看生成的圖片。");
  } catch (error) {
    console.error("❌ 測試過程中發生錯誤:", error.message);
    process.exit(1);
  }
}

// 執行測試
runScatterComprehensiveTest();
