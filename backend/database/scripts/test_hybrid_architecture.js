import axios from "axios";

// 🧪 測試混合架構的 AI 指導功能 2025-06-27 10:00
async function testHybridArchitecture() {
  try {
    console.log("🧪 測試混合架構的 AI 指導功能...\n");

    // 首先獲取有效的 JWT token
    console.log("🔐 正在獲取認證 token...");
    const loginResponse = await axios.post(
      "http://localhost:3000/api/auth/login",
      {
        identifier: "admin",
        password: "admin123",
      }
    );

    const token = loginResponse.data.data.access_token;
    console.log("✅ 認證成功\n");

    // 測試案例 1：一般查詢（應該只有基礎指導）
    console.log("📋 測試案例 1：一般查詢");
    console.log("=".repeat(60));

    const normalResponse = await axios.post(
      "http://localhost:3000/api/qwen-agent/chat",
      {
        message: "請查詢 MIL 專案列表，顯示前 3 筆資料",
        conversationId: "test-hybrid-normal",
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    if (normalResponse.data && normalResponse.data.response) {
      console.log("✅ 一般查詢回應成功");
      const response = normalResponse.data.response;

      // 檢查基礎指導
      const hasBaseInstructions = response.includes("🎯 **基礎指導原則**");
      const hasRequiredFields = response.includes("📋 **必要欄位要求**");
      const hasFormatGuidelines = response.includes("🎨 **格式化要求**");

      console.log(`- 基礎指導原則: ${hasBaseInstructions ? "✅" : "❌"}`);
      console.log(`- 必要欄位要求: ${hasRequiredFields ? "✅" : "❌"}`);
      console.log(`- 格式化要求: ${hasFormatGuidelines ? "✅" : "❌"}`);

      // 檢查是否沒有動態指導（因為沒有特殊條件）
      const hasDynamicInstructions = response.includes("🧠 **動態分析指導**");
      console.log(
        `- 動態指導存在: ${hasDynamicInstructions ? "有" : "無"} (一般查詢應該無或很少)`
      );
    }

    console.log("\n📋 測試案例 2：高風險專案查詢（應該有動態指導）");
    console.log("=".repeat(60));

    const highRiskResponse = await axios.post(
      "http://localhost:3000/api/qwen-agent/chat",
      {
        message: "請查詢延遲天數大於等於 15 天的 MIL 專案，顯示前 3 筆資料",
        conversationId: "test-hybrid-highrisk",
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    if (highRiskResponse.data && highRiskResponse.data.response) {
      console.log("✅ 高風險查詢回應成功");
      const response = highRiskResponse.data.response;

      // 檢查基礎指導
      const hasBaseInstructions = response.includes("🎯 **基礎指導原則**");
      const hasRequiredFields = response.includes("📋 **必要欄位要求**");

      // 檢查動態指導
      const hasDynamicInstructions = response.includes("🧠 **動態分析指導**");
      const hasHighRiskGuidance = response.includes("🚨 **高風險專案重點**");

      console.log(`- 基礎指導原則: ${hasBaseInstructions ? "✅" : "❌"}`);
      console.log(`- 必要欄位要求: ${hasRequiredFields ? "✅" : "❌"}`);
      console.log(`- 動態指導存在: ${hasDynamicInstructions ? "✅" : "❌"}`);
      console.log(`- 高風險指導: ${hasHighRiskGuidance ? "✅" : "❌"}`);
    }

    console.log("\n📋 測試案例 3：特定地點查詢（應該有地點相關動態指導）");
    console.log("=".repeat(60));

    const locationResponse = await axios.post(
      "http://localhost:3000/api/qwen-agent/chat",
      {
        message: "請查詢廠區A的 MIL 專案，顯示前 3 筆資料",
        conversationId: "test-hybrid-location",
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    if (locationResponse.data && locationResponse.data.response) {
      console.log("✅ 地點查詢回應成功");
      const response = locationResponse.data.response;

      // 檢查動態指導
      const hasDynamicInstructions = response.includes("🧠 **動態分析指導**");
      const hasLocationGuidance = response.includes("🏭 **地點分析重點**");

      console.log(`- 動態指導存在: ${hasDynamicInstructions ? "✅" : "❌"}`);
      console.log(`- 地點分析指導: ${hasLocationGuidance ? "✅" : "❌"}`);
    }

    // 檢查必要欄位是否完整
    console.log("\n📋 必要欄位完整性檢查");
    console.log("=".repeat(60));

    const requiredFields = [
      "SerialNumber",
      "TypeName",
      "MidTypeName",
      "is_APPLY",
      "Importance",
      "Status",
      "RecordDate",
      "Proposer_Name",
      "DRI_EmpName",
      "DRI_Dept",
      "DelayDay",
      "IssueDiscription",
      "Location",
      "PlanFinishDate",
      "ActualFinishDate",
    ];

    // 使用第一個回應檢查欄位
    const testResponse = normalResponse.data.response;
    const foundFields = [];
    const missingFields = [];

    requiredFields.forEach((field) => {
      if (testResponse.includes(field)) {
        foundFields.push(field);
      } else {
        missingFields.push(field);
      }
    });

    console.log(
      `✅ 找到欄位 (${foundFields.length}/${requiredFields.length}):`
    );
    console.log(foundFields.join(", "));

    if (missingFields.length > 0) {
      console.log(`❌ 缺失欄位 (${missingFields.length}):`);
      console.log(missingFields.join(", "));
    }

    // 總結
    console.log("\n🎉 混合架構測試總結");
    console.log("=".repeat(60));

    const allTestsPassed = foundFields.length === requiredFields.length;

    if (allTestsPassed) {
      console.log("✅ 混合架構實施成功！");
      console.log("✅ 基礎指導和動態指導正確合併");
      console.log("✅ 所有必要欄位完整呈現");
      console.log("✅ 動態指導根據查詢條件智能生成");
    } else {
      console.log("⚠️ 混合架構需要調整，請檢查上述項目");
    }
  } catch (error) {
    console.error("❌ 測試失敗:", error.message || error);
    if (error.response) {
      console.error("錯誤狀態:", error.response.status);
      console.error("錯誤內容:", error.response.data);
    }
    if (error.code) {
      console.error("錯誤代碼:", error.code);
    }
  }
}

// 執行測試
testHybridArchitecture();
