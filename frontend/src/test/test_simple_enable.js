const axios = require("axios");

async function testSimpleEnable() {
  try {
    console.log("🔍 簡單啟用測試...");

    // 1. 登錄
    const loginResponse = await axios.post(
      "http://localhost:3000/api/auth/login",
      { identifier: "admin", password: "admin123" }
    );

    const token = loginResponse.data.data?.access_token;
    console.log("✅ 登錄成功");

    // 2. 構建一個簡單的 Hr 服務對象
    const hrService = {
      name: "Hr 服務",
      endpoint: "http://localhost:8080/api/hr",
      description: "Hr 模組提供的 MCP 服務",
      tools: [
        { name: "get_employee_info", description: "獲取員工信息", schema: {} },
      ],
    };

    console.log("🔄 啟用 Hr 服務...");

    // 3. 啟用服務
    const enableResponse = await axios.post(
      "http://localhost:3000/api/mcp/services/enable",
      { services: [hrService] },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log("📊 啟用響應:", JSON.stringify(enableResponse.data, null, 2));
  } catch (error) {
    console.error("❌ 測試失敗:", error.message);
    if (error.response) {
      console.error("響應錯誤:", error.response.data);
    }
  }
}

testSimpleEnable();
