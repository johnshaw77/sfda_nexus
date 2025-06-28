/**
 * 簡化散點圖測試腳本
 * 只測試直接工具調用，驗證圖片生成功能
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

// 簡單測試案例 - 員工年資與薪資
const TEST_CASE = {
  name: "員工年資與薪資關係分析",
  toolCall: {
    serviceId: 49,
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
      image_format: "png",
    },
  },
};

/**
 * 保存並驗證 base64 圖片
 */
function saveAndValidateImage(base64Data, testName) {
  console.log(`🔍 驗證圖片數據...`);

  if (!base64Data) {
    console.log(`❌ 沒有圖片數據`);
    return false;
  }

  try {
    // 清理 base64 數據
    const cleanBase64 = base64Data.replace(/^data:image\/[a-z]+;base64,/, "");

    // 驗證 base64 格式
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(cleanBase64)) {
      console.log(`❌ base64 格式無效`);
      return false;
    }

    // 轉換為 Buffer
    const imageBuffer = Buffer.from(cleanBase64, "base64");
    const sizeKB = imageBuffer.length / 1024;

    console.log(`✅ base64 格式有效`);
    console.log(`📊 圖片大小: ${sizeKB.toFixed(2)} KB`);

    // 保存檔案
    const outputDir = path.join(process.cwd(), "test_outputs");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filename = `scatter_simple_test_${Date.now()}.png`;
    const filePath = path.join(outputDir, filename);
    fs.writeFileSync(filePath, imageBuffer);

    console.log(`✅ 圖片已保存: ${filePath}`);

    // 檢查檔案是否真的存在且有內容
    if (fs.existsSync(filePath)) {
      const fileSize = fs.statSync(filePath).size;
      console.log(`✅ 檔案驗證成功，大小: ${(fileSize / 1024).toFixed(2)} KB`);
      return true;
    } else {
      console.log(`❌ 檔案保存失敗`);
      return false;
    }
  } catch (error) {
    console.error(`❌ 圖片處理失敗: ${error.message}`);
    return false;
  }
}

async function runSimpleScatterTest() {
  let authToken = null;
  let scatterTool = null;

  try {
    console.log("🚀 開始簡化散點圖測試...");

    // 步驟 1: 登入
    console.log("\n📝 步驟 1: 用戶登入...");
    const loginResponse = await axios.post(
      `${BACKEND_URL}/api/auth/login`,
      TEST_CREDENTIALS
    );

    if (loginResponse.data.success) {
      authToken = loginResponse.data.data.access_token;
      console.log("✅ 登入成功");
    } else {
      throw new Error("登入失敗：" + loginResponse.data.message);
    }

    // 步驟 2: 查詢工具
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

    // 步驟 3: 直接測試工具調用
    console.log("\n🔧 步驟 3: 測試工具調用...");

    const toolCallData = {
      ...TEST_CASE.toolCall,
      toolId: scatterTool.id,
    };

    console.log("📊 發送數據點:", TEST_CASE.toolCall.parameters.x.length, "個");
    console.log(
      "🖼️ 圖片生成:",
      TEST_CASE.toolCall.parameters.generate_image ? "啟用" : "停用"
    );

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

      // 檢查基本回應
      if (result.data && result.data.content) {
        const content = result.data.content[0];
        console.log(`📄 回應類型: ${content.type}`);
        console.log(`📊 回應長度: ${content.text?.length || 0} 字符`);
      }

      // 重點檢查元數據和圖片
      if (result.data && result.data._meta) {
        const meta = result.data._meta;
        console.log(`\n📊 統計分析結果:`);
        console.log(`🏷️ 工具類型: ${meta.tool_type}`);
        console.log(`📈 圖表類型: ${meta.chart_type}`);

        // 相關性分析
        if (meta.correlation_analysis) {
          const corr = meta.correlation_analysis;
          console.log(`📊 Pearson 相關係數: ${corr.pearson_r?.toFixed(4)}`);
          console.log(`📊 相關性強度: ${corr.strength}`);
          console.log(`📊 相關性方向: ${corr.direction}`);
        }

        // 迴歸分析
        if (meta.regression_analysis) {
          const reg = meta.regression_analysis;
          console.log(`📉 迴歸方程式: ${reg.equation}`);
          console.log(`📉 R²: ${reg.r_squared?.toFixed(4)}`);
        }

        // 🎯 重點：圖片數據驗證
        console.log(`\n🖼️ 圖片生成測試:`);
        if (meta.image_data) {
          console.log(`✅ 發現圖片數據`);
          console.log(`🖼️ 格式: ${meta.image_data.format}`);
          console.log(`🖼️ Base64 長度: ${meta.image_data.size} 字符`);

          // 驗證並保存圖片
          const imageValid = saveAndValidateImage(
            meta.image_data.base64,
            TEST_CASE.name
          );

          if (imageValid) {
            console.log(`\n🎉 ✅ 散點圖圖片生成驗證成功！`);
            console.log(`📁 請檢查 test_outputs 目錄中的圖片檔案`);

            // 輸出完整的數據結構供調試
            console.log(`\n🔧 調試信息:`);
            console.log(`- 圖片數據路徑: result.data._meta.image_data`);
            console.log(
              `- Base64 開頭: ${meta.image_data.base64.substring(0, 50)}...`
            );
            console.log(`- 前端顯示路徑: ToolCallDisplay 組件會自動檢測並顯示`);
          } else {
            console.log(`\n❌ 圖片驗證失敗`);
          }
        } else {
          console.log(`❌ 沒有圖片數據`);
          console.log(`⚠️ 檢查 generate_image 參數是否設置為 true`);
          console.log(`🔧 調試: meta 結構:`, Object.keys(meta));
        }
      } else {
        console.log(`❌ 缺少元數據`);
        console.log(
          `🔧 調試: result.data 結構:`,
          Object.keys(result.data || {})
        );
      }
    } else {
      console.log(`❌ 工具調用失敗: ${toolCallResponse.data.message}`);
    }

    console.log("\n🎯 測試總結:");
    console.log("- 如果看到 '圖片生成驗證成功'，表示 base64 圖片生成正常");
    console.log("- 檢查 test_outputs 目錄中是否有實際的 PNG 圖片檔案");
    console.log("- 前端 ToolCallDisplay 組件應該會自動顯示圖片");
    console.log("- 統計分析數據（相關係數、迴歸分析）應該正確顯示");
  } catch (error) {
    console.error("❌ 測試過程中發生錯誤:", error.message);
    if (error.response) {
      console.error("詳細錯誤:", error.response.data);
    }
    process.exit(1);
  }
}

// 執行測試
runSimpleScatterTest();
