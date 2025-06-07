import axios from "axios";

const API_BASE = "http://localhost:3000";

// 測試用戶管理 API
console.log("🧪 測試用戶管理 API...\n");

async function testUsersAPI() {
  try {
    // 1. 先登入獲取有效的 token
    console.log("1. 登入獲取 token...");
    const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
      identifier: "admin",
      password: "admin123",
    });

    const { access_token } = loginResponse.data.data;
    console.log("✅ 登入成功");

    // 設置 headers
    const headers = {
      Authorization: `Bearer ${access_token}`,
      "Content-Type": "application/json",
    };

    // 2. 測試獲取用戶列表
    console.log("\n2. 測試獲取用戶列表...");
    const usersResponse = await axios.get(
      `${API_BASE}/api/users?page=1&limit=5`,
      { headers }
    );
    console.log("✅ 用戶列表獲取成功");
    console.log("用戶數量:", usersResponse.data.data?.data?.length || 0);
    console.log("總數:", usersResponse.data.data?.pagination?.total || 0);

    // 3. 顯示第一個用戶的信息（如果有的話）
    if (usersResponse.data.data?.data?.length > 0) {
      const firstUser = usersResponse.data.data.data[0];
      console.log("第一個用戶:", {
        id: firstUser.id,
        username: firstUser.username,
        email: firstUser.email,
        role: firstUser.role,
        is_active: firstUser.is_active,
      });
    }

    console.log(
      "\n🎯 用戶管理 API 測試完成！前端現在可以正確串接後端用戶數據。"
    );
  } catch (error) {
    console.error("❌ 測試失敗:", error.response?.data || error.message);
  }
}

testUsersAPI();
