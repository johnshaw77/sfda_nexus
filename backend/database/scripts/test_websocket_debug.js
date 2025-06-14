/**
 * 測試 WebSocket 調試信息發送
 * 驗證前端調試面板能否接收到後端發送的調試信息
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../../.env") });

import axios from "axios";
import WebSocket from "ws";

const BACKEND_URL = "http://localhost:3000";
const WS_URL = "ws://localhost:3001";

// 測試用戶憑據
const TEST_USER = {
  identifier: "admin@sfda-nexus.com",
  password: "admin123",
};

async function testWebSocketDebug() {
  console.log("🧪 測試 WebSocket 調試信息發送...\n");

  let authToken = null;
  let ws = null;

  try {
    // 1. 登錄獲取 token
    console.log("1️⃣ 嘗試登錄...");
    const loginResponse = await axios.post(
      `${BACKEND_URL}/api/auth/login`,
      TEST_USER
    );

    if (loginResponse.data.success) {
      authToken = loginResponse.data.data.access_token;
      console.log("✅ 登錄成功");
      console.log(`   用戶: ${loginResponse.data.data.user.username}`);
    } else {
      console.log("❌ 登錄失敗:", loginResponse.data.message);
      return;
    }

    // 2. 建立 WebSocket 連接
    console.log("\n2️⃣ 建立 WebSocket 連接...");
    ws = new WebSocket(WS_URL);

    await new Promise((resolve, reject) => {
      ws.on("open", () => {
        console.log("✅ WebSocket 連接成功");
        resolve();
      });

      ws.on("error", (error) => {
        console.log("❌ WebSocket 連接失敗:", error.message);
        reject(error);
      });

      setTimeout(() => {
        reject(new Error("WebSocket 連接超時"));
      }, 5000);
    });

    // 3. 發送認證消息
    console.log("\n3️⃣ 發送認證消息...");
    ws.send(
      JSON.stringify({
        type: "auth",
        data: {
          token: authToken,
        },
      })
    );

    // 監聽 WebSocket 消息
    let authSuccess = false;
    let debugMessages = [];

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log(`📨 收到 WebSocket 消息: ${message.type}`);

        if (message.type === "auth_success") {
          authSuccess = true;
          console.log("✅ WebSocket 認證成功");
        } else if (message.type === "debug_info") {
          debugMessages.push(message.data);
          console.log(`🐛 收到調試信息: ${message.data.stage}`);
          console.log(`   消息: ${message.data.message}`);
        }
      } catch (error) {
        console.error("解析 WebSocket 消息失敗:", error);
      }
    });

    // 等待認證完成
    await new Promise((resolve) => {
      const checkAuth = () => {
        if (authSuccess) {
          resolve();
        } else {
          setTimeout(checkAuth, 100);
        }
      };
      checkAuth();
    });

    // 4. 發送聊天請求觸發調試信息
    console.log("\n4️⃣ 發送聊天請求...");
    const chatMessage = "請查詢工號 A123456 的員工信息";

    // 獲取對話列表
    const conversationsResponse = await axios.get(
      `${BACKEND_URL}/api/chat/conversations`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    let conversationId;
    if (conversationsResponse.data.data.length > 0) {
      conversationId = conversationsResponse.data.data[0].id;
      console.log(`   使用現有對話: ${conversationId}`);
    } else {
      // 創建新對話
      const newConvResponse = await axios.post(
        `${BACKEND_URL}/api/chat/conversations`,
        {
          title: "WebSocket 調試測試",
          agent_id: 1, // 使用數位秘書
          model_id: 1, // 添加模型 ID
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );
      conversationId = newConvResponse.data.data.id;
      console.log(`   創建新對話: ${conversationId}`);
    }

    // 發送聊天消息
    console.log(`   發送消息: "${chatMessage}"`);
    const chatResponse = await axios.post(
      `${BACKEND_URL}/api/chat/conversations/${conversationId}/messages`,
      {
        content: chatMessage,
        content_type: "text",
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    console.log("✅ 聊天請求發送成功");

    // 5. 等待並收集調試信息
    console.log("\n5️⃣ 等待調試信息...");
    await new Promise((resolve) => {
      setTimeout(resolve, 10000); // 等待 10 秒收集調試信息
    });

    // 6. 分析調試信息
    console.log("\n6️⃣ 調試信息分析:");
    console.log(`   總共收到 ${debugMessages.length} 條調試信息`);

    if (debugMessages.length > 0) {
      console.log("\n   調試信息詳情:");
      debugMessages.forEach((msg, index) => {
        console.log(`   ${index + 1}. [${msg.stage}] ${msg.message}`);
        if (msg.model) {
          console.log(`      模型: ${msg.model.name} (${msg.model.provider})`);
        }
        if (msg.hasToolCalls) {
          console.log(`      工具調用: ${msg.toolCallsCount} 個`);
        }
        if (msg.totalTime) {
          console.log(`      總耗時: ${msg.totalTime}ms`);
        }
      });

      console.log("\n✅ WebSocket 調試信息測試成功！");
      console.log("   前端調試面板應該能夠顯示這些信息");
    } else {
      console.log("\n❌ 未收到任何調試信息");
      console.log("   可能的問題:");
      console.log("   1. WebSocket 連接問題");
      console.log("   2. 用戶認證問題");
      console.log("   3. 調試信息發送邏輯問題");
    }
  } catch (error) {
    console.error("\n❌ 測試失敗:", error.message);
    if (error.response) {
      console.error("   響應狀態:", error.response.status);
      console.error("   響應數據:", error.response.data);
    }
  } finally {
    if (ws) {
      ws.close();
      console.log("\n🔌 WebSocket 連接已關閉");
    }
  }
}

// 運行測試
testWebSocketDebug().catch(console.error);
