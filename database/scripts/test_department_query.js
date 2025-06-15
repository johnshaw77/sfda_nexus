#!/usr/bin/env node

/**
 * 測試部門查詢功能
 */

import axios from "axios";
import { config } from "dotenv";

// 載入環境變數
config();

const API_BASE_URL = "http://localhost:3000/api";

async function testDepartmentQuery() {
  console.log("🏢 測試部門查詢功能");
  console.log("==================================================");

  try {
    // 1. 登入獲取 token
    console.log("\n1️⃣ 登入獲取認證 token...");
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      identifier: "admin",
      password: "admin123",
    });

    const token = loginResponse.data.token;
    console.log("   ✅ 登入成功");

    // 2. 創建新對話
    console.log("\n2️⃣ 創建新對話...");
    const conversationResponse = await axios.post(
      `${API_BASE_URL}/conversations`,
      {
        title: "部門查詢測試",
        agent_id: 1, // 數位秘書
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const conversationId = conversationResponse.data.conversation.id;
    console.log(`   ✅ 對話創建成功，ID: ${conversationId}`);

    // 3. 發送部門查詢消息
    console.log("\n3️⃣ 發送部門查詢消息...");
    const message = "現在有哪些部門？";
    console.log(`   📝 發送消息: "${message}"`);

    const chatResponse = await axios.post(
      `${API_BASE_URL}/chat`,
      {
        message: message,
        conversation_id: conversationId,
        model_id: 2, // qwen3:8b
        agent_id: 1, // 數位秘書
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    console.log("   ✅ 消息發送成功");

    // 4. 分析回應
    console.log("\n4️⃣ 分析 AI 回應...");
    const aiResponse = chatResponse.data;

    console.log("   📊 回應統計:");
    console.log(
      `      - AI 回應長度: ${aiResponse.response?.length || 0} 字符`
    );

    if (aiResponse.debug_info) {
      console.log(`      - 調試信息階段: ${aiResponse.debug_info.length} 個`);
      console.log(
        `      - 工具調用: ${
          aiResponse.debug_info.some((d) => d.stage === "tool_calls")
            ? "✅ 是"
            : "❌ 否"
        }`
      );
    }

    if (aiResponse.tool_calls_processed) {
      console.log("\n   🔧 工具調用分析:");
      console.log(
        `      - has_tool_calls: ${aiResponse.tool_calls_processed.has_tool_calls}`
      );
      console.log(
        `      - tool_calls 數量: ${
          aiResponse.tool_calls_processed.tool_calls?.length || 0
        }`
      );
      console.log(
        `      - tool_results 數量: ${
          aiResponse.tool_calls_processed.tool_results?.length || 0
        }`
      );
    }

    // 5. 檢查回應內容
    console.log("\n5️⃣ 回應內容分析...");
    const responseText = aiResponse.response || "";

    // 檢查是否包含部門信息
    const departmentKeywords = [
      "執行長辦公室",
      "資訊技術部",
      "人力資源部",
      "財務部",
      "行銷部",
      "業務部",
    ];
    const foundDepartments = departmentKeywords.filter((dept) =>
      responseText.includes(dept)
    );

    console.log(`   📋 檢測到部門: ${foundDepartments.length} 個`);
    if (foundDepartments.length > 0) {
      console.log(`      - ${foundDepartments.join(", ")}`);
    }

    console.log(`   📝 回應內容預覽:`);
    console.log(
      responseText.substring(0, 500) + (responseText.length > 500 ? "..." : "")
    );

    // 6. 測試結果
    console.log("\n6️⃣ 測試結果總結...");
    const hasToolCalls =
      aiResponse.tool_calls_processed?.has_tool_calls || false;
    const hasDepartmentInfo = foundDepartments.length > 0;

    console.log("   📊 測試統計:");
    console.log(`      - 檢測到工具調用: ${hasToolCalls ? "✅ 是" : "❌ 否"}`);
    console.log(
      `      - 包含部門信息: ${hasDepartmentInfo ? "✅ 是" : "❌ 否"}`
    );
    console.log(`      - 檢測到部門數量: ${foundDepartments.length}`);

    if (hasToolCalls && hasDepartmentInfo) {
      console.log("\n   🎉 ✅ 測試成功！部門查詢功能正常工作");
    } else {
      console.log("\n   ❌ 測試失敗！部門查詢功能有問題");
    }
  } catch (error) {
    console.error("\n❌ 測試過程中發生錯誤:", error.message);
    if (error.response) {
      console.error("   響應狀態:", error.response.status);
      console.error(
        "   響應數據:",
        JSON.stringify(error.response.data, null, 2)
      );
    }
  }

  console.log("\n✅ 測試完成");
}

// 執行測試
testDepartmentQuery().catch(console.error);
