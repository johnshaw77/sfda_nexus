/**
 * 測試聊天API的圖表檢測功能
 */

import fetch from "node-fetch";

async function testChatAPI() {
  console.log("🎯 開始測試聊天API的圖表檢測功能...\n");

  // 首先登入獲取token
  try {
    const loginResponse = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        identifier: "admin",
        password: "admin123",
      }),
    });

    const loginData = await loginResponse.json();
    if (!loginData.success) {
      console.error("❌ 登入失敗:", loginData.message);
      return;
    }

    const token = loginData.data.access_token;
    console.log("✅ 登入成功，獲得token");

    // 創建對話
    const createConversationResponse = await fetch(
      "http://localhost:3000/api/chat/conversations",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: "圖表檢測測試",
          model_id: 1, // 假設使用第一個模型
        }),
      }
    );

    const conversationData = await createConversationResponse.json();
    if (!conversationData.success) {
      console.error("❌ 創建對話失敗:", conversationData.message);
      return;
    }

    const conversationId = conversationData.data.id;
    console.log("✅ 創建對話成功，ID:", conversationId);

    // 發送包含圖表數據的消息
    const testMessage = "台部:50%、港澳:30%、台積電:20%，請幫我繪製圓餅圖";
    const sendMessageResponse = await fetch(
      `http://localhost:3000/api/chat/conversations/${conversationId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: testMessage,
          model_id: 1,
        }),
      }
    );

    const messageData = await sendMessageResponse.json();
    if (!messageData.success) {
      console.error("❌ 發送消息失敗:", messageData.message);
      return;
    }

    console.log("✅ 發送消息成功");
    console.log("\n📊 AI回應分析:");
    console.log(
      "回應內容:",
      messageData.data.assistant_message.content.substring(0, 200) + "..."
    );

    console.log("\n🎯 圖表檢測結果:");
    const chartDetection =
      messageData.data.assistant_message.metadata?.chart_detection;
    if (chartDetection) {
      console.log("✅ 檢測到圖表數據!");
      console.log("圖表類型:", chartDetection.chartType);
      console.log("可信度:", chartDetection.confidence);
      console.log("標題:", chartDetection.title);
      console.log("數據:", JSON.stringify(chartDetection.data, null, 2));
      console.log("推理:", chartDetection.reasoning);

      if (chartDetection.hasChartData && chartDetection.confidence > 0.5) {
        console.log("\n🎉 智能圖表檢測成功！前端應該能自動顯示圖表");
      } else {
        console.log("\n⚠️ 圖表檢測可信度不足或無數據");
      }
    } else {
      console.log("❌ 未檢測到圖表數據或檢測結果缺失");
    }
  } catch (error) {
    console.error("❌ 測試失敗:", error.message);
  }
}

testChatAPI();
