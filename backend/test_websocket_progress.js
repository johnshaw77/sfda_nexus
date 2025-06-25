/**
 * 測試 WebSocket 進度提示功能
 */

import WebSocket from "ws";
import axios from "axios";

const API_BASE = "http://localhost:3000/api";
const WS_URL = "ws://localhost:3000";

const TEST_USER = {
  identifier: "admin",
  password: "admin123",
};

async function testWebSocketProgress() {
  console.log("🧪 === 測試 WebSocket 進度提示功能 ===");

  try {
    // 1. 登入獲取 token
    console.log("🔑 正在登入...");
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, TEST_USER);
    const token = loginResponse.data.data.access_token;
    console.log("✅ 登入成功");

    // 2. 創建 WebSocket 連接
    console.log("🔗 建立 WebSocket 連接...");
    const ws = new WebSocket(WS_URL);

    ws.on("open", () => {
      console.log("✅ WebSocket 連接已建立");

      // 發送認證
      ws.send(
        JSON.stringify({
          type: "auth",
          data: { token },
        })
      );
    });

    ws.on("message", (data) => {
      const message = JSON.parse(data.toString());
      console.log("📨 收到 WebSocket 消息:", {
        type: message.type,
        data: message.data,
      });

      // 特別關注進度提示
      if (message.type === "tool_processing_progress") {
        console.log("🔧 進度提示:", message.data.message);
        if (message.data.progress !== undefined) {
          console.log(`📊 進度: ${message.data.progress}%`);
        }
      }

      // 認證成功後，發送測試消息
      if (message.type === "auth_success") {
        console.log("✅ WebSocket 認證成功");

        // 發送圖表創建請求
        setTimeout(() => {
          console.log("📊 發送圖表創建請求...");
          ws.send(
            JSON.stringify({
              type: "realtime_chat",
              data: {
                conversationId: 1, // 使用已存在的對話 ID
                content:
                  "請用 create_chart 工具創建一個圖表，數據：Q1:1200, Q2:1500, Q3:1800, Q4:2100",
                contentType: "text",
              },
            })
          );
        }, 1000);
      }
    });

    ws.on("error", (error) => {
      console.error("❌ WebSocket 錯誤:", error);
    });

    ws.on("close", () => {
      console.log("🔌 WebSocket 連接已關閉");
    });

    // 保持連接 30 秒來觀察進度
    setTimeout(() => {
      console.log("⏰ 測試時間結束，關閉連接");
      ws.close();
    }, 30000);
  } catch (error) {
    console.error("❌ 測試失敗:", error.message);
    if (error.response) {
      console.error("錯誤詳情:", error.response.data);
    }
  }
}

testWebSocketProgress();
