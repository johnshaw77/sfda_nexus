const axios = require("axios");

async function testDuplicateFix() {
  try {
    console.log("🔍 測試重複插入修復...\n");

    // 1. 登錄獲取 token
    const loginResponse = await axios.post(
      "http://localhost:3000/api/auth/login",
      {
        identifier: "admin",
        password: "admin123",
      }
    );

    const token = loginResponse.data.data?.access_token;
    if (!token) {
      console.error("❌ 登錄失敗");
      return;
    }

    console.log("✅ 登錄成功");

    // 2. 檢查當前服務狀態
    console.log("\n📊 檢查當前服務狀態...");
    const beforeResponse = await axios.get(
      "http://localhost:3000/api/mcp/services/synced",
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const beforeServices = beforeResponse.data.data;
    console.log(`當前已同步服務數量: ${beforeServices.length}`);
    beforeServices.forEach((service) => {
      console.log(
        `  - ${service.name} (ID: ${service.id}, 工具: ${service.tools.length})`
      );
    });

    // 3. 發現服務
    console.log("\n🔍 發現服務...");
    const discoverResponse = await axios.get(
      "http://localhost:3000/api/mcp/services/discover",
      {
        params: { endpoint: "http://localhost:8080" },
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const discoveredServices = discoverResponse.data.data.services;
    const hrService = discoveredServices.find((s) => s.name.includes("Hr"));

    if (!hrService) {
      console.error("❌ 未找到 Hr 服務");
      return;
    }

    console.log(`✅ 發現 Hr 服務，工具數量: ${hrService.tools.length}`);

    // 4. 第一次啟用 Hr 服務
    console.log("\n🔄 第一次啟用 Hr 服務...");
    const firstEnableResponse = await axios.post(
      "http://localhost:3000/api/mcp/services/enable",
      { services: [hrService] },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (firstEnableResponse.data.success) {
      console.log("✅ 第一次啟用成功");
      console.log(
        `   - 服務動作: ${firstEnableResponse.data.data.enabledServices[0]?.action}`
      );
      console.log(
        `   - 服務ID: ${firstEnableResponse.data.data.enabledServices[0]?.id}`
      );
    }

    // 5. 第二次啟用同一個 Hr 服務（測試重複檢查）
    console.log("\n🔄 第二次啟用同一個 Hr 服務（測試重複檢查）...");
    const secondEnableResponse = await axios.post(
      "http://localhost:3000/api/mcp/services/enable",
      { services: [hrService] },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (secondEnableResponse.data.success) {
      console.log("✅ 第二次啟用成功");
      console.log(
        `   - 服務動作: ${secondEnableResponse.data.data.enabledServices[0]?.action}`
      );
      console.log(
        `   - 服務ID: ${secondEnableResponse.data.data.enabledServices[0]?.id}`
      );
    }

    // 6. 檢查最終狀態
    console.log("\n📊 檢查最終服務狀態...");
    const afterResponse = await axios.get(
      "http://localhost:3000/api/mcp/services/synced",
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const afterServices = afterResponse.data.data;
    console.log(`最終已同步服務數量: ${afterServices.length}`);

    const hrServices = afterServices.filter((s) => s.name.includes("Hr"));
    console.log(`Hr 服務數量: ${hrServices.length}`);

    if (hrServices.length === 1) {
      console.log("✅ 重複檢查成功！只有一個 Hr 服務");
      console.log(`   - Hr 服務 ID: ${hrServices[0].id}`);
      console.log(`   - 工具數量: ${hrServices[0].tools.length}`);
    } else {
      console.log("❌ 重複檢查失敗！存在多個 Hr 服務");
      hrServices.forEach((service, index) => {
        console.log(
          `   - Hr 服務 ${index + 1}: ID ${service.id}, 工具 ${
            service.tools.length
          }`
        );
      });
    }

    // 7. 檢查資料庫中的重複記錄
    console.log("\n🗄️ 檢查資料庫中的 Hr 服務記錄...");
  } catch (error) {
    console.error("❌ 測試失敗:", error.message);
    if (error.response) {
      console.error("響應錯誤:", error.response.data);
    }
  }
}

testDuplicateFix();
