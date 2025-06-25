/**
 * 簡單的進度提示測試
 */

import axios from "axios";

const API_BASE = "http://localhost:3000/api";

const TEST_USER = {
  identifier: "admin",
  password: "admin123",
};

async function testProgress() {
  try {
    // 登入
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, TEST_USER);
    const token = loginResponse.data.data.access_token;
    console.log("✅ 登入成功");

    // 創建對話
    const conversationResponse = await axios.post(
      `${API_BASE}/chat/conversations`,
      { title: "進度測試", model_id: 1 },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const conversationId = conversationResponse.data.data.id;
    console.log(`✅ 對話創建成功，ID: ${conversationId}`);

    // 發送簡單的圖表請求
    const testMessage =
      "請用create_chart工具創建一個圖表，數據：Q1:100, Q2:200, Q3:300";

    console.log("📊 發送消息:", testMessage);

    // 使用普通的 POST 請求（非 SSE）來測試
    const response = await axios.post(
      `${API_BASE}/chat/conversations/${conversationId}/messages`,
      {
        content: testMessage,
        temperature: 0.7,
        max_tokens: 2000,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    console.log("📨 消息發送成功");
    console.log("回應:", response.data);
  } catch (error) {
    console.error("❌ 測試失敗:", error.message);
    if (error.response) {
      console.error("錯誤詳情:", error.response.data);
    }
  }
}

testProgress();
