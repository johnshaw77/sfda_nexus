/**
 * 測試 AI 串流功能的腳本
 * 使用 Server-Sent Events (SSE) 測試串流回應
 */

import fetch from "node-fetch";

async function testStreamingChat() {
  console.log("=== 開始測試 AI 串流功能 ===");

  try {
    // 測試用的請求數據
    const testData = {
      conversation_id: 1, // 假設已有對話 ID
      content: "你好，請簡單介紹一下自己",
      content_type: "text",
      model_id: 1, // 假設模型 ID
      temperature: 0.7,
      max_tokens: 100,
    };

    console.log("測試數據:", testData);

    // 發送 POST 請求到串流端點
    const response = await fetch(
      "http://localhost:5001/api/chat/conversations/1/messages/stream",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          "Cache-Control": "no-cache",
          // 注意：實際測試時需要有效的認證 token
          Authorization: "Bearer test-token",
        },
        body: JSON.stringify(testData),
      }
    );

    console.log("回應狀態:", response.status);
    console.log("回應標頭:", response.headers.raw());

    if (!response.ok) {
      const errorText = await response.text();
      console.error("請求失敗:", errorText);
      return;
    }

    // 處理串流數據
    const decoder = new TextDecoder();
    let buffer = "";

    for await (const chunk of response.body) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split("\n");

      // 保留最後一個可能不完整的行
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("event: ")) {
          const eventType = line.slice(7).trim();
          console.log("📡 事件類型:", eventType);
        } else if (line.startsWith("data: ")) {
          const jsonStr = line.slice(6).trim();
          if (jsonStr) {
            try {
              const data = JSON.parse(jsonStr);
              console.log("📦 事件數據:", JSON.stringify(data, null, 2));
            } catch (error) {
              console.warn(
                "數據解析錯誤:",
                error.message,
                "原始數據:",
                jsonStr
              );
            }
          }
        }
      }
    }

    console.log("=== 串流測試完成 ===");
  } catch (error) {
    console.error("=== 串流測試失敗 ===");
    console.error("錯誤:", error.message);
    console.error("堆疊:", error.stack);
  }
}

// 測試 Ollama 串流功能
async function testOllamaStream() {
  console.log("\n=== 測試 Ollama 串流功能 ===");

  try {
    const testData = {
      model: "qwen3:30b",
      messages: [
        { role: "user", content: "你好，請介紹一下自己，限制在50字以內" },
      ],
      stream: true,
      options: {
        temperature: 0.7,
        num_predict: 100,
      },
    };

    console.log("Ollama 測試數據:", testData);

    const response = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testData),
    });

    console.log("Ollama 回應狀態:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Ollama 請求失敗:", errorText);
      return;
    }

    // 處理 Ollama 串流數據
    const decoder = new TextDecoder();
    let buffer = "";
    let fullContent = "";

    console.log("🤖 Ollama 回應:");
    for await (const chunk of response.body) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split("\n");

      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.trim()) {
          try {
            const data = JSON.parse(line);
            if (data.message && data.message.content) {
              process.stdout.write(data.message.content);
              fullContent += data.message.content;
            }
            if (data.done) {
              console.log("\n✅ Ollama 串流完成");
              console.log("📝 完整內容長度:", fullContent.length, "字元");
              return;
            }
          } catch (parseError) {
            console.warn("Ollama 數據解析錯誤:", parseError.message);
          }
        }
      }
    }
  } catch (error) {
    console.error("=== Ollama 串流測試失敗 ===");
    console.error("錯誤:", error.message);
  }
}

// 運行測試
async function runTests() {
  console.log("🧪 AI 串流功能測試開始\n");

  // 測試 Ollama 是否可用
  await testOllamaStream();

  // 測試後端串流端點（需要先設置好資料庫和認證）
  // await testStreamingChat();

  console.log("\n🏁 所有測試完成");
  process.exit(0);
}

// 只有在直接執行時才運行測試
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export { testStreamingChat, testOllamaStream };
