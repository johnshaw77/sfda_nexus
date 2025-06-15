/**
 * 測試審計日誌 API 端點
 * 模擬前端調用後端 API
 */

import fetch from "node-fetch";

const API_BASE = "http://localhost:3000";

// 模擬登入獲取 token
async function login() {
  try {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        identifier: "admin",
        password: "admin123",
      }),
    });

    const data = await response.json();
    if (data.success) {
      console.log("✅ 登入成功");
      return data.data.access_token;
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error("❌ 登入失敗:", error.message);
    return null;
  }
}

// 測試獲取審計日誌
async function testGetAuditLogs(token) {
  try {
    console.log("\n📊 測試獲取審計日誌 API...");

    // 1. 基本查詢
    const response1 = await fetch(
      `${API_BASE}/api/system/audit-logs?page=1&limit=10`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data1 = await response1.json();
    if (data1.success) {
      console.log(`✅ 基本查詢成功: 找到 ${data1.data.data.length} 條記錄`);
      console.log(`   總記錄數: ${data1.data.pagination.total}`);
      console.log(
        `   當前頁: ${data1.data.pagination.page}/${data1.data.pagination.pages}`
      );
    } else {
      console.error("❌ 基本查詢失敗:", data1.message);
    }

    // 2. 按操作類型篩選
    const response2 = await fetch(
      `${API_BASE}/api/system/audit-logs?action=login&page=1&limit=5`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data2 = await response2.json();
    if (data2.success) {
      console.log(
        `✅ 按操作類型篩選成功: 找到 ${data2.data.data.length} 條登入記錄`
      );
    } else {
      console.error("❌ 按操作類型篩選失敗:", data2.message);
    }

    // 3. 按用戶篩選
    const response3 = await fetch(
      `${API_BASE}/api/system/audit-logs?user_id=1&page=1&limit=5`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data3 = await response3.json();
    if (data3.success) {
      console.log(
        `✅ 按用戶篩選成功: 找到 ${data3.data.data.length} 條用戶記錄`
      );
    } else {
      console.error("❌ 按用戶篩選失敗:", data3.message);
    }

    // 4. 按時間範圍篩選
    const today = new Date().toISOString().split("T")[0];
    const response4 = await fetch(
      `${API_BASE}/api/system/audit-logs?start_date=${today}&end_date=${today}&page=1&limit=5`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data4 = await response4.json();
    if (data4.success) {
      console.log(
        `✅ 按時間範圍篩選成功: 找到 ${data4.data.data.length} 條今日記錄`
      );
    } else {
      console.error("❌ 按時間範圍篩選失敗:", data4.message);
    }

    // 5. 測試排序
    const response5 = await fetch(
      `${API_BASE}/api/system/audit-logs?sortOrder=ASC&page=1&limit=3`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data5 = await response5.json();
    if (data5.success) {
      console.log(
        `✅ 排序測試成功: 找到 ${data5.data.data.length} 條記錄（升序）`
      );
      if (data5.data.data.length > 0) {
        console.log(`   最早記錄: ${data5.data.data[0].created_at}`);
      }
    } else {
      console.error("❌ 排序測試失敗:", data5.message);
    }

    // 6. 顯示詳細記錄示例
    if (data1.success && data1.data.data.length > 0) {
      console.log("\n📋 記錄詳情示例:");
      const log = data1.data.data[0];
      console.log(`   ID: ${log.id}`);
      console.log(`   用戶: ${log.username || "系統"} (${log.email || "N/A"})`);
      console.log(`   操作: ${log.action}`);
      console.log(`   IP: ${log.ip_address || "N/A"}`);
      console.log(`   時間: ${log.created_at}`);
      if (log.details) {
        try {
          const details = JSON.parse(log.details);
          console.log(`   詳情: ${JSON.stringify(details, null, 2)}`);
        } catch (e) {
          console.log(`   詳情: ${log.details}`);
        }
      }
    }
  } catch (error) {
    console.error("❌ API 測試失敗:", error.message);
  }
}

// 測試權限控制
async function testPermissions() {
  try {
    console.log("\n🔒 測試權限控制...");

    // 不帶 token 的請求
    const response = await fetch(`${API_BASE}/api/system/audit-logs`);
    const data = await response.json();

    if (response.status === 401) {
      console.log("✅ 權限控制正常: 未授權請求被拒絕");
    } else {
      console.log("⚠️  權限控制異常: 未授權請求未被拒絕");
    }
  } catch (error) {
    console.error("❌ 權限測試失敗:", error.message);
  }
}

// 主測試函數
async function runTests() {
  console.log("🚀 開始測試審計日誌 API...");

  // 測試權限控制
  await testPermissions();

  // 登入獲取 token
  const token = await login();
  if (!token) {
    console.error("❌ 無法獲取 token，測試終止");
    return;
  }

  // 測試 API 功能
  await testGetAuditLogs(token);

  console.log("\n✅ 審計日誌 API 測試完成！");
}

// 執行測試
runTests().catch(console.error);
 