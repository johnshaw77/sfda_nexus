import fetch from "node-fetch";
import { exec } from "child_process";
import { promisify } from "util";

// 測試思考模式的完整流程
// 檢查前端實際發送的 model_id 和思考內容顯示

const execAsync = promisify(exec);

async function testThinkingMode() {
  console.log("🧪 開始測試思考模式...");

  try {
    // 1. 首先檢查數據庫中的模型
    console.log("\n📊 檢查數據庫中的模型...");

    try {
      const { stdout } = await execAsync(
        "docker exec -i mysql-server mysql -u root -pMyPwd@1234 sfda_nexus -e \"SELECT id, model_id, display_name, model_type FROM ai_models WHERE model_id LIKE '%qwen%' OR display_name LIKE '%qwen%' ORDER BY id;\""
      );
      console.log("🔍 Qwen 模型列表:");
      console.log(stdout);
    } catch (error) {
      console.error("❌ 查詢數據庫失敗:", error.message);
    }

    // 2. 測試前端 API 獲取模型列表
    console.log("\n📡 測試前端 API 獲取模型列表...");

    const modelsResponse = await fetch("http://localhost:3000/api/models", {
      headers: {
        Authorization:
          "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJyb2xlIjoiYWRtaW4iLCJ0eXBlIjoiYWNjZXNzIiwiaWF0IjoxNzQ5OTgyMzE2LCJleHAiOjE3NTAwNjg3MTYsImF1ZCI6InNmZGEtbmV4dXMtdXNlcnMiLCJpc3MiOiJzZmRhLW5leHVzIn0.QSU8LdNi9a1oFJAu2wOn-Z80Ft-zVHnmEXdWo88PZG8",
      },
    });

    if (modelsResponse.ok) {
      const modelsData = await modelsResponse.json();
      console.log("✅ 模型 API 響應成功");

      // 查找 qwen 模型
      const qwenModels = [];
      if (modelsData.data && typeof modelsData.data === "object") {
        Object.keys(modelsData.data).forEach((provider) => {
          if (modelsData.data[provider]) {
            modelsData.data[provider].forEach((model) => {
              if (
                model.model_id &&
                model.model_id.toLowerCase().includes("qwen")
              ) {
                qwenModels.push(model);
              }
            });
          }
        });
      }

      console.log("🔍 找到的 Qwen 模型:");
      qwenModels.forEach((model) => {
        console.log(
          `  - ID: ${model.id}, 模型: ${model.model_id}, 顯示名: ${model.display_name}`
        );
      });

      if (qwenModels.length === 0) {
        console.log("⚠️ 沒有找到 Qwen 模型！");
      }
    } else {
      console.error("❌ 獲取模型列表失敗:", modelsResponse.status);
    }

    // 3. 測試使用正確的 qwen3 模型發送消息
    console.log("\n🚀 測試使用 qwen3:8b 模型 (ID: 42) 發送消息...");

    const testMessage = "請簡單回答：3+3等於多少？";

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
          content: testMessage,
          agent_id: 1,
          model_id: 42, // 明確使用 qwen3:8b 模型
          max_tokens: 4096,
          temperature: 0.7,
        }),
      }
    );

    console.log("📡 響應狀態:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ 請求失敗:", errorText);
      return;
    }

    // 讀取 SSE 流並檢查思考內容
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let eventCount = 0;
    let hasThinkingContent = false;
    let thinkingContentLength = 0;

    console.log("📖 開始讀取 SSE 流...");

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        console.log("✅ SSE 流結束");
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
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

            try {
              const data = JSON.parse(jsonStr);

              // 檢查思考內容
              if (
                currentEventType === "stream_content" &&
                data.thinking_content
              ) {
                hasThinkingContent = true;
                thinkingContentLength = data.thinking_content.length;
                console.log(
                  `🧠 事件 ${eventCount}: 收到思考內容 (長度: ${thinkingContentLength})`
                );
                console.log(
                  `   預覽: ${data.thinking_content.substring(0, 100)}...`
                );
              } else if (currentEventType === "thinking_content_processed") {
                console.log(`🧠 事件 ${eventCount}: 思考內容處理完成`);
                if (data.thinking_content) {
                  console.log(`   長度: ${data.thinking_content.length}`);
                  console.log(
                    `   預覽: ${data.thinking_content.substring(0, 100)}...`
                  );
                }
              } else {
                console.log(`📨 事件 ${eventCount}: ${currentEventType}`);
              }
            } catch (parseError) {
              console.warn("⚠️ JSON 解析錯誤:", parseError.message);
            }

            currentEventType = null;
          }
        }
      }

      // 限制測試時間
      if (eventCount > 30) {
        console.log("⏰ 達到事件數量限制，停止測試");
        break;
      }
    }

    // 4. 總結測試結果
    console.log("\n📊 測試結果總結:");
    console.log(`   總事件數: ${eventCount}`);
    console.log(`   是否有思考內容: ${hasThinkingContent ? "✅ 是" : "❌ 否"}`);
    console.log(`   思考內容長度: ${thinkingContentLength}`);

    if (hasThinkingContent) {
      console.log("🎉 思考模式測試成功！後端正確發送了思考內容。");
      console.log("💡 如果前端沒有顯示，問題可能在前端的處理邏輯。");
    } else {
      console.log("❌ 思考模式測試失敗！沒有收到思考內容。");
      console.log("💡 請檢查模型配置和後端邏輯。");
    }
  } catch (error) {
    console.error("❌ 測試失敗:", error.message);
  }
}

// 執行測試
testThinkingMode();
