import axios from "axios";

// 🧪 測試新增欄位的 MIL 列表查詢
async function testEnhancedFields() {
  try {
    console.log("🧪 測試新增欄位的 MIL 列表查詢...\n");

    // 首先獲取有效的 JWT token
    console.log("🔐 正在獲取認證 token...");
    const loginResponse = await axios.post(
      "http://localhost:3000/api/auth/login",
      {
        identifier: "admin",
        password: "admin123",
      }
    );

    if (!loginResponse.data.success) {
      throw new Error("登入失敗");
    }

    const token = loginResponse.data.data.access_token;
    console.log("✅ 認證成功，token:", token ? "已獲取" : "未獲取");

    // 模擬聊天請求，觸發 MIL 工具調用
    console.log("💬 發送聊天請求...");
    const chatResponse = await axios.post(
      "http://localhost:3000/api/qwen-agent/chat",
      {
        message: "請查詢 MIL 專案列表，顯示前 3 筆資料的詳細欄位資訊",
        conversationId: "test-enhanced-fields",
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ 聊天回應狀態:", chatResponse.status);

    if (chatResponse.data && chatResponse.data.response) {
      console.log("\n📋 AI 回應內容:");
      console.log("=".repeat(80));
      console.log(chatResponse.data.response);
      console.log("=".repeat(80));

      // 檢查是否包含新增的欄位
      const response = chatResponse.data.response;
      const newFields = [
        "is_APPLY",
        "Importance",
        "RecordDate",
        "Proposer_Name",
        "Location",
        "PlanFinishDate",
        "ActualFinishDate",
      ];

      console.log("\n🔍 檢查新增欄位是否出現:");
      newFields.forEach((field) => {
        const found = response.includes(field);
        console.log(`- ${field}: ${found ? "✅ 找到" : "❌ 未找到"}`);
      });

      // 檢查是否有「資料未提供」的標註
      const hasDataNotProvided = response.includes("資料未提供");
      console.log(
        `\n📝 是否有「資料未提供」標註: ${hasDataNotProvided ? "✅ 有" : "❌ 無"}`
      );
    } else {
      console.log("❌ 沒有收到有效的回應");
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
    console.error("完整錯誤:", error);
  }
}

// 執行測試
testEnhancedFields();
