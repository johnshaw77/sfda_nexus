import axios from "axios";

const API_BASE = "http://localhost:3000/api";

async function getFreshToken() {
  try {
    console.log("🔐 獲取新的測試 token...");

    const response = await axios.post(`${API_BASE}/auth/login`, {
      identifier: "admin",
      password: "admin123",
    });

    const token = response.data.data?.access_token;
    console.log("✅ Token 獲取成功:");
    console.log(token);

    return token;
  } catch (error) {
    console.error("❌ 獲取 token 失敗:", error.message);
    if (error.response) {
      console.error("錯誤詳情:", error.response.data);
    }
  }
}

getFreshToken();
 