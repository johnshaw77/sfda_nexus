/**
 * 測試圖表創建進度提示功能
 * 驗證新的進度回調和心跳機制
 */

import axios from "axios";

const API_BASE = "http://localhost:3000/api";

// 測試用戶認證
const TEST_USER = {
  identifier: "admin",
  password: "admin123",
};

async function testChartProgress() {
  console.log("🧪 === 開始測試圖表創建進度提示 ===");

  try {
    // 1. 登入獲取 token
    console.log("🔑 正在登入...");
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, TEST_USER);
    const token = loginResponse.data.data.access_token;
    console.log("✅ 登入成功");

    // 2. 創建測試對話
    console.log("💬 正在創建測試對話...");
    const conversationResponse = await axios.post(
      `${API_BASE}/chat/conversations`,
      {
        title: "圖表進度測試",
        model_id: 1,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    console.log(
      "對話創建響應:",
      JSON.stringify(conversationResponse.data, null, 2)
    );

    if (!conversationResponse.data?.data?.id) {
      throw new Error("對話創建失敗：未獲得對話 ID");
    }

    const conversationId = conversationResponse.data.data.id;
    console.log(`✅ 對話創建成功，ID: ${conversationId}`);

    // 3. 發送需要圖表創建的消息
    console.log("📊 正在發送圖表創建請求...");
    const testMessage = `請幫我創建一個圖表，顯示以下數據的趨勢：
Q1銷售額: 1200萬
Q2銷售額: 1500萬  
Q3銷售額: 1800萬
Q4銷售額: 2100萬

請用create_chart工具創建一個折線圖。`;

    // 使用 SSE 串流方式發送消息
    const sseUrl = `${API_BASE}/chat/conversations/${conversationId}/messages/stream`;

    console.log("🔄 開始 SSE 串流連接...");
    console.log("📡 SSE URL:", sseUrl);

    // 發送消息並監聽 SSE 事件
    const messageResponse = await axios.post(
      sseUrl,
      {
        content: testMessage,
        temperature: 0.7,
        max_tokens: 2000,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "text/event-stream",
          "Cache-Control": "no-cache",
        },
        responseType: "stream",
      }
    );

    console.log("📨 消息發送成功，開始監聽進度事件...");

    let eventCount = 0;
    let toolProcessingStarted = false;
    let toolProgressReceived = false;

    // 處理 SSE 流
    messageResponse.data.on("data", (chunk) => {
      const lines = chunk.toString().split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));
            eventCount++;

            console.log(`\n📡 [事件 ${eventCount}] ${data.type}:`, {
              timestamp: new Date().toISOString(),
              messageId: data.assistant_message_id,
              message: data.message,
              progress: data.progress,
            });

            // 檢查關鍵進度事件
            if (data.type === "tool_processing_start") {
              toolProcessingStarted = true;
              console.log("✅ 工具處理開始事件已收到");
            }

            if (data.type === "tool_processing_heartbeat") {
              console.log(`💓 心跳事件: ${data.message}`);
              if (data.progress !== undefined) {
                toolProgressReceived = true;
                console.log(`📊 進度: ${data.progress}%`);
              }
            }

            if (data.type === "tool_calls_processed") {
              console.log("🔧 工具調用處理完成");
              console.log("工具調用數量:", data.tool_calls?.length || 0);
              console.log("工具結果數量:", data.tool_results?.length || 0);
            }

            if (data.type === "stream_done") {
              console.log("🏁 串流完成");
              console.log("最終內容長度:", data.full_content?.length || 0);
              console.log("處理時間:", data.processing_time + "ms");

              // 檢查是否包含圖表檢測結果
              if (data.metadata?.chart_detection) {
                console.log("📊 圖表檢測結果:", data.metadata.chart_detection);
              }
            }
          } catch (parseError) {
            // 忽略解析錯誤（可能是非 JSON 數據）
          }
        }
      }
    });

    // 等待流結束
    await new Promise((resolve, reject) => {
      messageResponse.data.on("end", () => {
        console.log("\n🏁 SSE 流結束");
        resolve();
      });

      messageResponse.data.on("error", (error) => {
        console.error("❌ SSE 流錯誤:", error.message);
        reject(error);
      });

      // 30秒超時
      setTimeout(() => {
        console.log("⏰ 測試超時");
        resolve();
      }, 30000);
    });

    // 測試結果驗證
    console.log("\n📋 === 測試結果驗證 ===");
    console.log(`📡 總事件數: ${eventCount}`);
    console.log(`🔧 工具處理開始: ${toolProcessingStarted ? "✅" : "❌"}`);
    console.log(`📊 進度信息接收: ${toolProgressReceived ? "✅" : "❌"}`);

    if (toolProcessingStarted && toolProgressReceived) {
      console.log("🎉 進度提示功能測試通過！");
    } else {
      console.log("⚠️ 進度提示功能可能需要進一步優化");
    }
  } catch (error) {
    console.error("❌ 測試失敗:", error.message);
    if (error.response) {
      console.error("錯誤響應:", error.response.data);
    }
  }
}

// 運行測試
testChartProgress().catch(console.error);
