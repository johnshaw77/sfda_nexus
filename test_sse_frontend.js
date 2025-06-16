// 測試前端 SSE 連接
// 使用 Node.js 18+ 內建的 fetch

async function testSSEConnection() {
  console.log("🔍 測試前端 SSE 連接...");

  try {
    // 模擬前端的 SSE 請求
    const response = await fetch(
      "http://localhost:3000/api/chat/conversations/21/messages/stream",
      {
        method: "POST",
        headers: {
          Authorization:
            "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJyb2xlIjoiYWRtaW4iLCJ0eXBlIjoiYWNjZXNzIiwiaWF0IjoxNzQ5OTgyMzE2LCJleHAiOjE3NTAwNjg3MTYsImF1ZCI6InNmZGEtbmV4dXMtdXNlcnMiLCJpc3MiOiJzZmRhLW5leHVzIn0.QSU8LdNi9a1oFJAu2wOn-Z80Ft-zVHnmEXdWo88PZG8",
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          "Cache-Control": "no-cache",
        },
        body: JSON.stringify({
          content: "3+3等於多少？如何學習編程？",
          agent_id: 1,
          model_id: 42, // 使用正確的 qwen3:8b 模型
          max_tokens: 4096,
          temperature: 0.7,
        }),
      }
    );

    console.log("📡 響應狀態:", response.status);
    console.log("📡 響應頭:", Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ 請求失敗:", errorText);
      return;
    }

    // 檢查是否是 SSE 響應
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("text/event-stream")) {
      console.error("❌ 不是 SSE 響應，Content-Type:", contentType);
      return;
    }

    console.log("✅ SSE 連接建立成功");

    // 讀取 SSE 流
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let eventCount = 0;
    let thinkingContentReceived = "";
    let responseContentReceived = "";

    console.log("📖 開始讀取 SSE 流...");

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        console.log("✅ SSE 流結束");
        console.log("📊 最終統計:", {
          totalEvents: eventCount,
          thinkingContentLength: thinkingContentReceived.length,
          responseContentLength: responseContentReceived.length,
          hasThinking: thinkingContentReceived.length > 0,
        });
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");

      // 保留最後一個可能不完整的行
      buffer = lines.pop() || "";

      let currentEventType = null;

      for (const line of lines) {
        if (line.startsWith("event: ")) {
          currentEventType = line.slice(7).trim();
          continue;
        }

        if (line.startsWith("data: ")) {
          const jsonStr = line.slice(6).trim();

          if (jsonStr && currentEventType) {
            eventCount++;
            console.log(`📨 事件 ${eventCount}: ${currentEventType}`);

            try {
              const data = JSON.parse(jsonStr);

              // 根據事件類型顯示不同信息
              switch (currentEventType) {
                case "assistant_message_created":
                  console.log("  ✅ AI 消息創建:", data.assistant_message_id);
                  break;
                case "stream_content":
                  console.log("  📝 流式內容:", {
                    contentLength: data.content?.length || 0,
                    fullContentLength: data.full_content?.length || 0,
                    tokens: data.tokens_used || 0,
                    hasThinking: !!data.thinking_content,
                    thinkingLength: data.thinking_content?.length || 0,
                  });

                  // 累積思考內容
                  if (data.thinking_content) {
                    thinkingContentReceived = data.thinking_content;
                    console.log(
                      "  🧠 思考內容更新 (長度: " +
                        data.thinking_content.length +
                        "):",
                      data.thinking_content.substring(0, 150) + "..."
                    );
                  }

                  // 累積回應內容
                  if (data.full_content) {
                    responseContentReceived = data.full_content;
                    console.log(
                      "  💬 回應內容更新 (長度: " +
                        data.full_content.length +
                        "):",
                      data.full_content.substring(0, 100) + "..."
                    );
                  }
                  break;
                case "thinking_content_processed":
                  console.log("  🧠 思考內容處理完成:", {
                    hasThinking: !!data.thinking_content,
                    thinkingLength: data.thinking_content?.length || 0,
                    messageId: data.assistant_message_id,
                  });
                  if (data.thinking_content) {
                    console.log(
                      "  🧠 最終思考內容預覽:",
                      data.thinking_content.substring(0, 200) + "..."
                    );
                  }
                  break;
                case "stream_done":
                  console.log("  ✅ 流式完成:", {
                    finalLength: data.full_content?.length || 0,
                    totalTokens: data.tokens_used || 0,
                    cost: data.cost || 0,
                    processingTime: data.processing_time || 0,
                  });
                  break;
                case "error":
                  console.log("  ❌ 錯誤:", data.error);
                  break;
                default:
                  console.log("  📋 數據:", JSON.stringify(data, null, 2));
              }
            } catch (parseError) {
              console.warn("  ⚠️ JSON 解析錯誤:", parseError.message);
              console.warn("  📄 原始數據:", jsonStr);
            }

            currentEventType = null;
          }
        }
      }

      // 限制測試時間，避免無限等待
      if (eventCount > 50) {
        console.log("⏰ 達到事件數量限制，停止測試");
        break;
      }
    }

    console.log("🎯 測試完成");
  } catch (error) {
    console.error("❌ 測試失敗:", error.message);
  }
}

// 執行測試
testSSEConnection();
