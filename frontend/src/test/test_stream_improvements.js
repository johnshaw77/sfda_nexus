#!/usr/bin/env node

/**
 * 測試串流功能改進 v1.8.3
 * 包括：停止功能、長內容處理、用戶消息展開、AI思考狀態、新對話創建
 */

const fetch = require("node-fetch");

const API_BASE = "http://localhost:3000";
const TEST_TOKEN = "your_test_token_here"; // 需要替換為實際的測試token

async function testStreamImprovements() {
  console.log("🧪 開始測試串流功能改進 v1.8.3...\n");

  // 測試1: 長內容串流
  console.log("📝 測試1: 長內容串流處理");
  await testLongContentStream();

  // 測試2: 停止串流功能
  console.log("\n🛑 測試2: 停止串流功能");
  await testStreamStop();

  // 測試3: 新對話創建
  console.log("\n➕ 測試3: 新對話創建功能");
  await testNewConversationCreation();

  // 測試4: AI思考狀態
  console.log("\n🤔 測試4: AI思考狀態邏輯");
  await testAIThinkingState();

  console.log("\n✅ 所有測試完成！");
}

async function testLongContentStream() {
  try {
    const response = await fetch(
      `${API_BASE}/api/chat/conversations/1/messages/stream`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TEST_TOKEN}`,
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          conversation_id: 1,
          content:
            "請寫一篇關於人工智能發展歷史的詳細文章，包括重要里程碑、關鍵人物和技術突破，至少2000字。",
          model_id: 1,
          temperature: 0.7,
          max_tokens: 8192, // 測試高token限制
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    console.log("✅ 長內容串流請求發送成功");

    let contentLength = 0;
    let chunkCount = 0;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const jsonStr = line.slice(6).trim();
          if (jsonStr) {
            try {
              const data = JSON.parse(jsonStr);
              if (data.full_content) {
                contentLength = data.full_content.length;
                chunkCount++;

                if (chunkCount % 10 === 0) {
                  console.log(
                    `📊 已接收 ${chunkCount} 個數據塊，內容長度: ${contentLength} 字符`
                  );
                }
              }
            } catch (e) {
              // 忽略解析錯誤
            }
          }
        }
      }
    }

    console.log(
      `✅ 長內容串流完成，總長度: ${contentLength} 字符，數據塊: ${chunkCount} 個`
    );
  } catch (error) {
    console.error("❌ 長內容串流測試失敗:", error.message);
  }
}

async function testStreamStop() {
  try {
    // 創建一個AbortController來測試停止功能
    const controller = new AbortController();

    const response = await fetch(
      `${API_BASE}/api/chat/conversations/1/messages/stream`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TEST_TOKEN}`,
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          conversation_id: 1,
          content:
            "請詳細解釋量子計算的原理和應用，包括量子比特、量子糾纏、量子算法等概念。",
          model_id: 1,
          temperature: 0.7,
          max_tokens: 4096,
        }),
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    console.log("✅ 串流請求發送成功，準備測試停止功能");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let chunkCount = 0;

    // 模擬用戶在接收到一些數據後停止串流
    setTimeout(() => {
      console.log("🛑 模擬用戶停止串流...");
      controller.abort();
    }, 2000); // 2秒後停止

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            chunkCount++;
            if (chunkCount <= 5) {
              console.log(`📦 接收數據塊 ${chunkCount}`);
            }
          }
        }
      }
    } catch (error) {
      if (error.name === "AbortError") {
        console.log("✅ 串流成功停止，接收了", chunkCount, "個數據塊");
      } else {
        throw error;
      }
    }
  } catch (error) {
    if (error.name === "AbortError") {
      console.log("✅ 串流停止功能正常工作");
    } else {
      console.error("❌ 串流停止測試失敗:", error.message);
    }
  }
}

async function testNewConversationCreation() {
  try {
    const response = await fetch(`${API_BASE}/api/chat/conversations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "測試新對話",
        model_id: 1,
        agent_id: null,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("✅ 新對話創建成功");
    console.log(`📊 對話ID: ${data.data.id}`);
    console.log(`📊 對話標題: ${data.data.title}`);

    // 清理測試對話
    await fetch(`${API_BASE}/api/chat/conversations/${data.data.id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`,
      },
    });
    console.log("🧹 測試對話已清理");
  } catch (error) {
    console.error("❌ 新對話創建測試失敗:", error.message);
  }
}

async function testAIThinkingState() {
  try {
    console.log("✅ AI思考狀態測試需要在前端UI中進行驗證");
    console.log("📋 驗證要點:");
    console.log("   - 發送消息後立即顯示「思考中」狀態");
    console.log("   - 收到第一個AI回應內容時隱藏「思考中」狀態");
    console.log("   - 停止按鈕在整個AI回應過程中保持可見");
    console.log("   - AI回應卡片右下方顯示工具欄");
  } catch (error) {
    console.error("❌ AI思考狀態測試失敗:", error.message);
  }
}

// 運行測試
if (require.main === module) {
  testStreamImprovements().catch(console.error);
}

module.exports = { testStreamImprovements };
