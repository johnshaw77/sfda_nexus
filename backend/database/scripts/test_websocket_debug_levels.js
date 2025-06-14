/**
 * 測試 WebSocket 調試級別配置
 * 驗證不同調試模式下的日誌輸出
 */

import WebSocket from "ws";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";

// 載入環境變數
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "../../.env") });

const WS_URL = `ws://localhost:${process.env.WS_PORT || 3001}`;

console.log("🔧 WebSocket 調試級別測試");
console.log("=".repeat(50));
console.log(`WebSocket URL: ${WS_URL}`);
console.log(`當前 WS_DEBUG 設置: ${process.env.WS_DEBUG}`);
console.log(`當前 NODE_ENV: ${process.env.NODE_ENV}`);
console.log("=".repeat(50));

/**
 * 測試不同類型的 WebSocket 消息
 */
const testWebSocketMessages = () => {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    let messageCount = 0;
    const testMessages = [
      // 重要消息類型（應該總是記錄）
      { type: "auth", data: { token: "test_token" } },
      {
        type: "realtime_chat",
        data: { conversationId: 1, content: "測試消息" },
      },

      // 安靜消息類型（只在詳細模式下記錄）
      { type: "ping", data: {} },
      { type: "typing_status", data: { conversationId: 1, isTyping: true } },
      {
        type: "conversation_status",
        data: { conversationId: 1, status: "active" },
      },

      // 其他消息類型
      { type: "join_room", data: { roomId: "test_room" } },
      { type: "leave_room", data: { roomId: "test_room" } },
    ];

    ws.on("open", () => {
      console.log("✅ WebSocket 連接成功");

      // 發送測試消息
      const sendNextMessage = () => {
        if (messageCount < testMessages.length) {
          const message = testMessages[messageCount];
          console.log(
            `📤 發送消息 ${messageCount + 1}/${testMessages.length}: ${message.type}`
          );
          ws.send(JSON.stringify(message));
          messageCount++;

          // 延遲發送下一個消息
          setTimeout(sendNextMessage, 500);
        } else {
          // 所有消息發送完畢，等待一下然後關閉連接
          setTimeout(() => {
            ws.close();
          }, 1000);
        }
      };

      sendNextMessage();
    });

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log(
          `📥 收到回應: ${message.type}`,
          message.data?.message || ""
        );
      } catch (error) {
        console.error("❌ 解析回應失敗:", error.message);
      }
    });

    ws.on("close", (code, reason) => {
      console.log(`🔌 WebSocket 連接關閉: ${code} ${reason}`);
      resolve();
    });

    ws.on("error", (error) => {
      console.error("❌ WebSocket 錯誤:", error.message);
      reject(error);
    });

    // 設置超時
    setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      reject(new Error("測試超時"));
    }, 15000);
  });
};

/**
 * 主測試函數
 */
const runTest = async () => {
  try {
    console.log("\n🚀 開始測試 WebSocket 調試級別...\n");

    await testWebSocketMessages();

    console.log("\n✅ 測試完成！");
    console.log("\n📋 測試結果說明:");
    console.log(
      "- 如果 WS_DEBUG=false 且 NODE_ENV=production，只會看到重要消息的日誌"
    );
    console.log(
      "- 如果 WS_DEBUG=true 或 NODE_ENV=development，會看到所有消息的日誌"
    );
    console.log("- 檢查後端控制台輸出來確認日誌過濾是否正常工作");
  } catch (error) {
    console.error("❌ 測試失敗:", error.message);
    process.exit(1);
  }
};

// 執行測試
runTest();
